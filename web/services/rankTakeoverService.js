const crypto = require(
  "node:crypto"
);
const mongoose = require(
  "mongoose"
);

const {
  AccessCycle,
} = require(
  "../models/accessCycleModel"
);
const {
  ArenaProfile,
} = require(
  "../models/arenaProfileModel"
);
const {
  ArenaSeason,
} = require(
  "../models/arenaSeasonModel"
);
const {
  DayBalanceTransaction,
} = require(
  "../models/dayBalanceTransactionModel"
);
const {
  User,
  RankingProfile,
} = require(
  "../models/matthsModel"
);
const {
  OutboxEvent,
} = require(
  "../models/outboxEventModel"
);
const {
  PolicyVersion,
} = require(
  "../models/policyVersionModel"
);
const {
  RankTakeoverCommandReceipt,
} = require(
  "../models/rankTakeoverCommandReceiptModel"
);
const {
  ACTIVE_TAKEOVER_MATCH_STATUSES,
  RankTakeoverMatch,
} = require(
  "../models/rankTakeoverMatchModel"
);
const {
  assertCycleCacheMatches,
  deriveUserBalances,
  deterministicId,
} = require(
  "./dayBalanceLedgerService"
);
const {
  cycleDayForDateKey,
  kstDateKey,
} = require(
  "./accessCycleService"
);

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const SETTLEMENT_VERSION = 1;
const MAX_IDEMPOTENCY_KEY_LENGTH =
  180;

const CYCLE_STATUSES_BY_RANKING =
  Object.freeze({
    SUB: Object.freeze([
      "SUB_ACTIVE",
    ]),
    MAIN: Object.freeze([
      "MAIN_ACTIVE",
    ]),
  });

const SETTLEMENT_CYCLE_STATUSES =
  Object.freeze({
    SUB: Object.freeze([
      "SUB_ACTIVE",
      "SUB_CLOSING",
    ]),
    MAIN: Object.freeze([
      "MAIN_ACTIVE",
      "MAIN_SETTLING",
    ]),
  });

const SCORE_FIELDS =
  Object.freeze([
    "calibratedScore",
    "advancedCorrectCount",
    "correctAnswerActiveSolveTimeMs",
  ]);
const TRUSTED_SCORING_FIELDS =
  Object.freeze([
    "submissionId",
    ...SCORE_FIELDS,
    "integrityState",
    "questionVersion",
    "answerKeyVersion",
    "calibrationVersion",
    "submittedAt",
  ]);

class RankTakeoverError
  extends Error {
  constructor(
    code,
    message,
    {
      statusCode = 400,
      details = null,
    } = {}
  ) {
    super(message);
    this.name =
      "RankTakeoverError";
    this.code = code;
    this.statusCode =
      statusCode;
    this.status =
      statusCode;
    this.details =
      details;
  }
}

const TRANSIENT_COMMAND_ERROR_CODES =
  new Set([
    "COMMAND_IN_PROGRESS",
    "MATCH_NOT_READY",
    "MATCH_QUESTION_PACK_NOT_READY",
    "NO_SHOW_DEADLINE_NOT_REACHED",
    "POLICY_PENDING",
  ]);

function shouldPersistCommandFailure(
  error
) {
  if (
    !(
      error instanceof
      RankTakeoverError
    )
  ) {
    return false;
  }
  const statusCode =
    Number(
      error.statusCode
    );
  return (
    Number.isInteger(
      statusCode
    ) &&
    statusCode >= 400 &&
    statusCode < 500 &&
    !TRANSIENT_COMMAND_ERROR_CODES
      .has(error.code)
  );
}

function fail(
  code,
  message,
  options
) {
  throw new RankTakeoverError(
    code,
    message,
    options
  );
}

function requiredText(
  value,
  label,
  maxLength = 180
) {
  const normalized =
    String(value || "").trim();
  if (!normalized) {
    throw new TypeError(
      `${label} is required`
    );
  }
  if (
    normalized.length >
    maxLength
  ) {
    throw new TypeError(
      `${label} is too long`
    );
  }
  return normalized;
}

function objectId(
  value,
  label
) {
  const normalized =
    requiredText(
      value,
      label,
      80
    );
  if (
    !mongoose.Types.ObjectId
      .isValid(normalized)
  ) {
    throw new TypeError(
      `${label} must be a valid ObjectId`
    );
  }
  return new mongoose
    .Types.ObjectId(
      normalized
    );
}

function asDate(
  value,
  label
) {
  const date =
    value instanceof Date
      ? new Date(
          value.getTime()
        )
      : new Date(value);
  if (
    !Number.isFinite(
      date.getTime()
    )
  ) {
    throw new TypeError(
      `${label} must be a valid date`
    );
  }
  return date;
}

function nonNegativeInteger(
  value,
  label
) {
  if (
    !Number.isSafeInteger(
      value
    ) ||
    value < 0
  ) {
    throw new TypeError(
      `${label} must be a non-negative integer`
    );
  }
  return value;
}

function positiveInteger(
  value,
  label
) {
  nonNegativeInteger(
    value,
    label
  );
  if (value === 0) {
    throw new TypeError(
      `${label} must be positive`
    );
  }
  return value;
}

function sameId(
  left,
  right
) {
  return Boolean(
    left &&
      right &&
      String(left) ===
        String(right)
  );
}

function sha256(
  value
) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

function stableJson(
  value
) {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return JSON.stringify(
      value
    );
  }
  if (Array.isArray(value)) {
    return `[${value
      .map(stableJson)
      .join(",")}]`;
  }
  const keys =
    Object.keys(value).sort();
  return `{${keys
    .map(
      (key) =>
        `${JSON.stringify(
          key
        )}:${stableJson(
          value[key]
        )}`
    )
    .join(",")}}`;
}

function assertOnlyKeys(
  value,
  allowedKeys,
  {
    code =
      "UNSUPPORTED_FIELDS",
    label = "input",
  } = {}
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TypeError(
      `${label} must be an object`
    );
  }
  const allowed =
    new Set(allowedKeys);
  const unsupported =
    Object.keys(value)
      .filter(
        (key) =>
          !allowed.has(key)
      );
  if (unsupported.length) {
    fail(
      code,
      `${label} contains unsupported fields`,
      {
        statusCode: 400,
        details: {
          unsupportedFields:
            unsupported.sort(),
        },
      }
    );
  }
}

function idempotencyKey(
  value
) {
  return requiredText(
    value,
    "idempotencyKey",
    MAX_IDEMPOTENCY_KEY_LENGTH
  );
}

function normalizeRanking(
  value
) {
  const normalized =
    requiredText(
      value,
      "activeRanking",
      12
    ).toUpperCase();
  if (
    ![
      "SUB",
      "MAIN",
    ].includes(normalized)
  ) {
    throw new TypeError(
      "activeRanking must be SUB or MAIN"
    );
  }
  return normalized;
}

function normalizeMatchType(
  value
) {
  const normalized =
    requiredText(
      value,
      "matchType",
      12
    ).toUpperCase();
  if (
    ![
      "NORMAL",
      "REVENGE",
    ].includes(normalized)
  ) {
    throw new TypeError(
      "matchType must be NORMAL or REVENGE"
    );
  }
  return normalized;
}

function queryWithSession(
  query,
  session
) {
  return session
    ? query.session(session)
    : query;
}

function plain(
  value
) {
  if (!value) {
    return value;
  }
  return typeof value.toObject ===
    "function"
    ? value.toObject()
    : value;
}

function policyPending(
  blocker,
  message
) {
  fail(
    "POLICY_PENDING",
    message,
    {
      statusCode: 503,
      details: {
        blocker,
      },
    }
  );
}

function rethrowParticipantAttemptError(
  error
) {
  if (
    error?.name !==
      "ArenaMatchAttemptError" ||
    typeof error.code !==
      "string" ||
    !/^[A-Z][A-Z0-9_]{1,99}$/.test(
      error.code
    )
  ) {
    throw error;
  }
  const statusCode =
    Number(
      error.statusCode
    );
  if (
    !Number.isInteger(
      statusCode
    ) ||
    statusCode < 400 ||
    statusCode > 599
  ) {
    throw error;
  }
  const blocker =
    typeof error
      .reasonCode ===
      "string" &&
    /^[A-Z][A-Z0-9_]{1,119}$/.test(
      error.reasonCode
    )
      ? error.reasonCode
      : typeof error
            .details
            ?.blocker ===
          "string" &&
          /^[A-Z][A-Z0-9_]{1,119}$/.test(
            error.details
              .blocker
          )
        ? error.details
            .blocker
        : null;
  fail(
    error.code,
    typeof error.message ===
        "string" &&
      error.message
        .length <= 500
      ? error.message
      : "participant attempt command failed",
    {
      statusCode,
      details: {
        dependency:
          "ARENA_MATCH_ATTEMPT",
        ...(blocker
          ? { blocker }
          : {}),
      },
    }
  );
}

function normalizeDeadlinePolicy(
  value
) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    policyPending(
      "MATCH_DEADLINE_POLICY_UNSET",
      "Rank Takeover deadline policy is not published"
    );
  }
  const startDeadlineMinutes =
    nonNegativeInteger(
      value
        .startDeadlineMinutes,
      "startDeadlineMinutes"
    );
  const submissionDeadlineMinutes =
    positiveInteger(
      value
        .submissionDeadlineMinutes,
      "submissionDeadlineMinutes"
    );
  if (
    startDeadlineMinutes >
    submissionDeadlineMinutes
  ) {
    fail(
      "INVALID_DEADLINE_POLICY",
      "start deadline cannot be after submission deadline",
      {
        statusCode: 500,
      }
    );
  }
  return {
    startDeadlineMinutes,
    submissionDeadlineMinutes,
    questionPolicyVersion:
      value
        .questionPolicyVersion
        ? requiredText(
            value
              .questionPolicyVersion,
            "questionPolicyVersion",
            100
          )
        : null,
  };
}

function stakeTable(
  policy,
  matchType
) {
  const source =
    matchType === "NORMAL"
      ? policy
          .mainNormalStakeDaysByRange
      : policy
          .mainRevengeStakeDaysByRange;
  if (!source) {
    policyPending(
      "MAIN_STAKE_TABLE_UNSET",
      "Main Rank Takeover stake table is not published"
    );
  }
  const table = {
    matchType,
    oneStep:
      positiveInteger(
        Number(
          source.oneStep
        ),
        "oneStep"
      ),
    twoSteps:
      positiveInteger(
        Number(
          source.twoSteps
        ),
        "twoSteps"
      ),
    threeOrMoreSteps:
      positiveInteger(
        Number(
          source
            .threeOrMoreSteps
        ),
        "threeOrMoreSteps"
      ),
  };
  const expected =
    matchType === "NORMAL"
      ? [2, 4, 6]
      : [3, 5, 7];
  if (
    table.oneStep !==
      expected[0] ||
    table.twoSteps !==
      expected[1] ||
    table
      .threeOrMoreSteps !==
      expected[2]
  ) {
    fail(
      "UNSUPPORTED_STAKE_POLICY",
      `Main ${matchType} stake policy must be ${expected.join(
        "/"
      )}`,
      {
        statusCode: 500,
      }
    );
  }
  return table;
}

function stakeForGap(
  table,
  gap
) {
  if (gap === 1) {
    return table.oneStep;
  }
  if (gap === 2) {
    return table.twoSteps;
  }
  return table
    .threeOrMoreSteps;
}

function mainTierStepPolicy(
  policy
) {
  const mappingVersion =
    String(
      policy
        ?.arenaTierStepMappingVersion ||
        ""
    ).trim();
  if (!mappingVersion) {
    policyPending(
      "ARENA_TIER_MAPPING_UNSET",
      "Main Arena tier-step mapping is not published"
    );
  }
  const source =
    policy
      ?.arenaTierStepPositionCeilings;
  const ceilings =
    Array.isArray(source)
      ? Array.from(
          source,
          Number
        )
      : null;
  if (
    !ceilings ||
    ceilings.length !== 9 ||
    !ceilings.every(
      (ceiling, index) =>
        Number.isSafeInteger(
          ceiling
        ) &&
        ceiling > 0 &&
        (index === 0 ||
          ceiling >
            ceilings[index - 1])
    )
  ) {
    policyPending(
      "ARENA_TIER_POSITION_CEILINGS_UNSET",
      "the pinned nine-step Main Arena position mapping is not published"
    );
  }
  return {
    mappingVersion,
    ceilings,
  };
}

function authoritativeMainTierStep({
  position,
  ceilings,
  role,
}) {
  const normalizedPosition =
    Number(position);
  if (
    !Number.isSafeInteger(
      normalizedPosition
    ) ||
    normalizedPosition < 1
  ) {
    policyPending(
      `MAIN_${role}_POSITION_INVALID`,
      `${role.toLowerCase()} has no authoritative Arena position`
    );
  }
  const ceilingIndex =
    ceilings.findIndex(
      (ceiling) =>
        normalizedPosition <=
        ceiling
    );
  if (ceilingIndex < 0) {
    policyPending(
      "MAIN_ARENA_POSITION_UNMAPPED",
      "Arena position is outside the pinned nine-step mapping"
    );
  }
  return {
    position:
      normalizedPosition,
    ruleStep:
      9 - ceilingIndex,
  };
}

function verifyMainTierStepGap({
  policy,
  challengerProfile,
  defenderProfile,
  resolverTierStepGap,
}) {
  const {
    mappingVersion,
    ceilings,
  } =
    mainTierStepPolicy(
      policy
    );
  const challenger =
    authoritativeMainTierStep({
      position:
        challengerProfile
          ?.arenaPosition,
      ceilings,
      role: "CHALLENGER",
    });
  const defender =
    authoritativeMainTierStep({
      position:
        defenderProfile
          ?.arenaPosition,
      ceilings,
      role: "DEFENDER",
    });
  const authoritativeGap =
    defender.ruleStep -
    challenger.ruleStep;
  if (authoritativeGap <= 0) {
    fail(
      "MAIN_TARGET_NOT_STRICTLY_HIGHER_STEP",
      "Main challenger may target only a strictly higher Arena step",
      {
        statusCode: 409,
      }
    );
  }
  const maximumAllowedGap =
    9 - challenger.ruleStep;
  const resolverGap =
    positiveInteger(
      resolverTierStepGap,
      "tierStepGap"
    );
  if (
    resolverGap >
    maximumAllowedGap
  ) {
    fail(
      "MAIN_TARGET_GAP_EXCEEDS_POLICY",
      "Main target exceeds the maximum higher-step range allowed by the pinned policy",
      {
        statusCode: 409,
        details: {
          mappingVersion,
          maximumAllowedGap,
        },
      }
    );
  }
  if (
    resolverGap !==
    authoritativeGap
  ) {
    fail(
      "MAIN_TIER_STEP_GAP_MISMATCH",
      "Main tier-step resolver disagrees with authoritative Arena positions",
      {
        statusCode: 500,
        details: {
          mappingVersion,
          authoritativeGap,
          resolverGap,
        },
      }
    );
  }
  return authoritativeGap;
}

function buildChallengeCostSnapshot({
  activeRanking,
  matchType,
  policy,
  tierStepGap = null,
}) {
  const ranking =
    normalizeRanking(
      activeRanking
    );
  const type =
    normalizeMatchType(
      matchType
    );
  const revengeFee =
    Number(
      policy
        ?.revengeFeeBurnDays
    );
  if (revengeFee !== 1) {
    fail(
      "UNSUPPORTED_REVENGE_FEE_POLICY",
      "Revenge fee policy must burn exactly one day",
      {
        statusCode: 500,
      }
    );
  }

  if (ranking === "SUB") {
    const normalCost =
      Number(
        policy
          ?.subNormalTakeoverCostDays
      );
    const revengeCost =
      Number(
        policy
          ?.subRevengeCostDays
      );
    if (
      normalCost !== 1 ||
      revengeCost !== 2
    ) {
      fail(
        "UNSUPPORTED_SUB_STAKE_POLICY",
        "Sub stake policy must remain NORMAL 1 and REVENGE 2",
        {
          statusCode: 500,
        }
      );
    }
    const stakeDays =
      type === "NORMAL"
        ? normalCost
        : revengeCost;
    const feeBurnDays =
      type === "REVENGE"
        ? revengeFee
        : 0;
    return {
      assetType:
        "REFUND_CHALLENGE_DAY",
      availableAccount:
        "USER_REFUND_AVAILABLE",
      lockedAccount:
        "USER_REFUND_LOCKED",
      stakeDays,
      challengerWinBurnDays:
        stakeDays,
      challengerLossDefenderPayoutDays:
        stakeDays -
        feeBurnDays,
      challengerLossFeeBurnDays:
        feeBurnDays,
      challengeTierStepGap:
        null,
      mainTierStepStakeDays:
        null,
    };
  }

  const gap =
    positiveInteger(
      tierStepGap,
      "tierStepGap"
    );
  const table =
    stakeTable(
      policy,
      type
    );
  const stakeDays =
    stakeForGap(
      table,
      gap
    );
  const feeBurnDays =
    type === "REVENGE"
      ? revengeFee
      : 0;
  return {
    assetType:
      "BONUS_ACCESS_DAY",
    availableAccount:
      "USER_BONUS_AVAILABLE",
    lockedAccount:
      "USER_BONUS_LOCKED",
    stakeDays,
    challengerWinBurnDays:
      stakeDays,
    challengerLossDefenderPayoutDays:
      stakeDays -
      feeBurnDays,
    challengerLossFeeBurnDays:
      feeBurnDays,
    challengeTierStepGap:
      gap,
    mainTierStepStakeDays:
      table,
  };
}

function balanceFieldsFor(
  ranking
) {
  return ranking === "SUB"
    ? {
        available:
          "refundChallengeDays",
        locked:
          "lockedRefundDays",
      }
    : {
        available:
          "bonusAccessDays",
        locked:
          "lockedBonusDays",
      };
}

function ledgerEntry({
  account,
  userId = null,
  cycleId = null,
  debitDays = 0,
  creditDays = 0,
}) {
  return {
    account,
    userId,
    cycleId,
    debitDays,
    creditDays,
  };
}

function buildLockTransaction({
  match,
  occurredAt,
}) {
  const cost =
    match
      .challengeCostSnapshot;
  const key =
    `takeover:lock:${match.challengeLockIdempotencyKey}`;
  return new DayBalanceTransaction({
    _id:
      match
        .challengeLockTransactionId,
    transactionId:
      deterministicId(
        "takeover-lock",
        key
      ),
    idempotencyKey: key,
    cycleId:
      match
        .challengerCycleId,
    matchId: match._id,
    type: "MATCH_LOCK",
    status: "POSTED",
    entries: [
      ledgerEntry({
        account:
          cost
            .availableAccount,
        userId:
          match
            .challengerUserId,
        cycleId:
          match
            .challengerCycleId,
        debitDays:
          cost.stakeDays,
      }),
      ledgerEntry({
        account:
          cost.lockedAccount,
        userId:
          match
            .challengerUserId,
        cycleId:
          match
            .challengerCycleId,
        creditDays:
          cost.stakeDays,
      }),
    ],
    reasonCode:
      "RANK_TAKEOVER_LOCK",
    actorType: "USER",
    actorId:
      String(
        match
          .challengerUserId
      ),
    occurredAt,
    metadata: {
      externalMatchId:
        match.matchId,
      activeRanking:
        match.activeRanking,
      matchType:
        match.matchType,
      paidAccessDebit:
        false,
    },
  });
}

function settlementKey(
  match,
  suffix
) {
  return [
    "takeover",
    "settlement",
    match.matchId,
    `v${SETTLEMENT_VERSION}`,
    suffix,
  ].join(":");
}

function buildUnlockTransaction({
  match,
  occurredAt,
  reasonCode,
}) {
  const cost =
    match
      .challengeCostSnapshot;
  const key =
    settlementKey(
      match,
      "unlock"
    );
  return new DayBalanceTransaction({
    transactionId:
      deterministicId(
        "takeover-unlock",
        key
      ),
    idempotencyKey: key,
    cycleId:
      match
        .challengerCycleId,
    matchId: match._id,
    type: "MATCH_UNLOCK",
    status: "POSTED",
    entries: [
      ledgerEntry({
        account:
          cost.lockedAccount,
        userId:
          match
            .challengerUserId,
        cycleId:
          match
            .challengerCycleId,
        debitDays:
          cost.stakeDays,
      }),
      ledgerEntry({
        account:
          cost
            .availableAccount,
        userId:
          match
            .challengerUserId,
        cycleId:
          match
            .challengerCycleId,
        creditDays:
          cost.stakeDays,
      }),
    ],
    reasonCode,
    actorType: "SYSTEM",
    occurredAt,
    metadata: {
      externalMatchId:
        match.matchId,
      settlementVersion:
        SETTLEMENT_VERSION,
    },
  });
}

function buildSettlementPlan(
  match
) {
  const cost =
    plain(
      match
        .challengeCostSnapshot
    );
  if (
    !cost ||
    ![
      "CHALLENGER",
      "DEFENDER",
    ].includes(
      match.winner
    )
  ) {
    fail(
      "MATCH_RESULT_REQUIRED",
      "resolved match needs a winner and cost snapshot",
      {
        statusCode: 409,
      }
    );
  }
  if (
    match.winner ===
    "CHALLENGER"
  ) {
    return {
      toDefenderAvailableDays:
        0,
      toSystemBurnDays:
        cost
          .challengerWinBurnDays,
      toChallengerAvailableDays:
        0,
      positionOutcome:
        "SWAPPED",
    };
  }
  return {
    toDefenderAvailableDays:
      cost
        .challengerLossDefenderPayoutDays,
    toSystemBurnDays:
      cost
        .challengerLossFeeBurnDays,
    toChallengerAvailableDays:
      0,
    positionOutcome:
      "UNCHANGED",
  };
}

function buildSettlementTransactions({
  match,
  plan,
  occurredAt,
}) {
  const cost =
    match
      .challengeCostSnapshot;
  if (
    plan.positionOutcome ===
    "SWAPPED"
  ) {
    const key =
      settlementKey(
        match,
        "winner-burn"
      );
    return [
      new DayBalanceTransaction({
        transactionId:
          deterministicId(
            "takeover-burn",
            key
          ),
        idempotencyKey: key,
        cycleId:
          match
            .challengerCycleId,
        matchId:
          match._id,
        type: "MATCH_BURN",
        status: "POSTED",
        entries: [
          ledgerEntry({
            account:
              cost
                .lockedAccount,
            userId:
              match
                .challengerUserId,
            cycleId:
              match
                .challengerCycleId,
            debitDays:
              cost.stakeDays,
          }),
          ledgerEntry({
            account:
              "SYSTEM_BURN",
            creditDays:
              cost.stakeDays,
          }),
        ],
        reasonCode:
          "TAKEOVER_CHALLENGER_WIN",
        actorType:
          "SYSTEM",
        occurredAt,
        metadata: {
          externalMatchId:
            match.matchId,
          settlementVersion:
            SETTLEMENT_VERSION,
          operatorVaultCredit:
            false,
        },
      }),
    ];
  }

  const transactions = [];
  if (
    plan
      .toDefenderAvailableDays >
    0
  ) {
    const key =
      settlementKey(
        match,
        "defender-transfer"
      );
    transactions.push(
      new DayBalanceTransaction({
        transactionId:
          deterministicId(
            "takeover-transfer",
            key
          ),
        idempotencyKey: key,
        cycleId:
          match
            .challengerCycleId,
        matchId:
          match._id,
        type:
          "MATCH_TRANSFER",
        status: "POSTED",
        entries: [
          ledgerEntry({
            account:
              cost
                .lockedAccount,
            userId:
              match
                .challengerUserId,
            cycleId:
              match
                .challengerCycleId,
            debitDays:
              plan
                .toDefenderAvailableDays,
          }),
          ledgerEntry({
            account:
              cost
                .availableAccount,
            userId:
              match
                .defenderUserId,
            cycleId:
              match
                .defenderCycleId,
            creditDays:
              plan
                .toDefenderAvailableDays,
          }),
        ],
        reasonCode:
          "TAKEOVER_DEFENDER_WIN",
        actorType:
          "SYSTEM",
        occurredAt,
        metadata: {
          externalMatchId:
            match.matchId,
          settlementVersion:
            SETTLEMENT_VERSION,
        },
      })
    );
  }
  if (
    plan
      .toSystemBurnDays >
    0
  ) {
    const key =
      settlementKey(
        match,
        "revenge-fee-burn"
      );
    transactions.push(
      new DayBalanceTransaction({
        transactionId:
          deterministicId(
            "takeover-revenge-fee",
            key
          ),
        idempotencyKey: key,
        cycleId:
          match
            .challengerCycleId,
        matchId:
          match._id,
        type:
          "REVENGE_FEE_BURN",
        status: "POSTED",
        entries: [
          ledgerEntry({
            account:
              cost
                .lockedAccount,
            userId:
              match
                .challengerUserId,
            cycleId:
              match
                .challengerCycleId,
            debitDays:
              plan
                .toSystemBurnDays,
          }),
          ledgerEntry({
            account:
              "SYSTEM_BURN",
            creditDays:
              plan
                .toSystemBurnDays,
          }),
        ],
        reasonCode:
          "REVENGE_FAILURE_FEE",
        actorType:
          "SYSTEM",
        occurredAt,
        metadata: {
          externalMatchId:
            match.matchId,
          settlementVersion:
            SETTLEMENT_VERSION,
          operatorVaultCredit:
            false,
        },
      })
    );
  }
  return transactions;
}

function normalizeScoredResult(
  value,
  {
    allowStoredFields =
      false,
  } = {}
) {
  const source =
    plain(value);
  if (
    !source ||
    typeof source !== "object" ||
    Array.isArray(source)
  ) {
    throw new TypeError(
      "server-scored result is required"
    );
  }
  assertOnlyKeys(
    source,
    [
      ...TRUSTED_SCORING_FIELDS,
      ...(allowStoredFields
        ? [
            "payloadFingerprint",
          ]
        : []),
    ],
    {
      code:
        "UNTRUSTED_SCORING_FIELDS",
      label:
        "trusted scoring result",
    }
  );
  const submissionId =
    requiredText(
      source.submissionId,
      "submissionId",
      160
    );
  const calibratedScore =
    Number(
      source.calibratedScore
    );
  if (
    !Number.isFinite(
      calibratedScore
    ) ||
    calibratedScore < 0
  ) {
    throw new TypeError(
      "calibratedScore must be a non-negative finite number"
    );
  }
  const advancedCorrectCount =
    nonNegativeInteger(
      source
        .advancedCorrectCount,
      "advancedCorrectCount"
    );
  const correctAnswerActiveSolveTimeMs =
    nonNegativeInteger(
      source
        .correctAnswerActiveSolveTimeMs,
      "correctAnswerActiveSolveTimeMs"
    );
  const submittedAt =
    asDate(
      source.submittedAt,
      "submittedAt"
    );
  const normalized = {
    submissionId,
    calibratedScore,
    advancedCorrectCount,
    correctAnswerActiveSolveTimeMs,
    integrityState:
      String(
        source.integrityState ||
          "CLEAR"
      ).toUpperCase(),
    questionVersion:
      requiredText(
        source.questionVersion,
        "questionVersion",
        100
      ),
    answerKeyVersion:
      requiredText(
        source
          .answerKeyVersion,
        "answerKeyVersion",
        100
      ),
    calibrationVersion:
      requiredText(
        source
          .calibrationVersion,
        "calibrationVersion",
        100
      ),
    submittedAt,
  };
  if (
    normalized
      .integrityState !==
    "CLEAR"
  ) {
    fail(
      "RESULT_INTEGRITY_NOT_CLEAR",
      "held or invalid scoring result cannot be resolved",
      {
        statusCode: 409,
      }
    );
  }
  const payloadFingerprint =
    sha256(
      stableJson(
        {
          ...normalized,
          submittedAt:
            submittedAt
              .toISOString(),
        }
      )
    );
  if (
    allowStoredFields &&
    source
      .payloadFingerprint &&
    source
      .payloadFingerprint !==
      payloadFingerprint
  ) {
    fail(
      "SCORING_RESULT_TAMPERED",
      "persisted scoring fingerprint does not match its trusted fields",
      {
        statusCode: 500,
      }
    );
  }
  normalized
    .payloadFingerprint =
    payloadFingerprint;
  return normalized;
}

function compareScoredResults(
  challengerResult,
  defenderResult
) {
  const challenger =
    normalizeScoredResult(
      challengerResult,
      {
        allowStoredFields:
          true,
      }
    );
  const defender =
    normalizeScoredResult(
      defenderResult,
      {
        allowStoredFields:
          true,
      }
    );
  if (
    challenger.calibratedScore !==
    defender.calibratedScore
  ) {
    return {
      winner:
        challenger
          .calibratedScore >
        defender
          .calibratedScore
          ? "CHALLENGER"
          : "DEFENDER",
      tieBreakStage:
        "CALIBRATED_SCORE",
    };
  }
  if (
    challenger
      .advancedCorrectCount !==
    defender
      .advancedCorrectCount
  ) {
    return {
      winner:
        challenger
          .advancedCorrectCount >
        defender
          .advancedCorrectCount
          ? "CHALLENGER"
          : "DEFENDER",
      tieBreakStage:
        "ADVANCED_CORRECT_COUNT",
    };
  }
  if (
    challenger
      .correctAnswerActiveSolveTimeMs !==
    defender
      .correctAnswerActiveSolveTimeMs
  ) {
    return {
      winner:
        challenger
          .correctAnswerActiveSolveTimeMs <
        defender
          .correctAnswerActiveSolveTimeMs
          ? "CHALLENGER"
          : "DEFENDER",
      tieBreakStage:
        "ACTIVE_SOLVE_TIME",
    };
  }
  return {
    winner: null,
    tieBreakStage:
      "SUDDEN_DEATH_REQUIRED",
  };
}

function optionalText(
  value,
  label,
  maxLength
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }
  return requiredText(
    value,
    label,
    maxLength
  );
}

function normalizeParticipantSubmission(
  input
) {
  assertOnlyKeys(
    input,
    [
      "matchId",
      "participantUserId",
      "submissionId",
    ],
    {
      code:
        "UNTRUSTED_SUBMISSION_FIELDS",
      label:
        "participant submission",
    }
  );
  return {
    matchId:
      requiredText(
        input.matchId,
        "matchId",
        160
      ),
    participantUserId:
      objectId(
        input
          .participantUserId,
        "participantUserId"
      ),
    submissionId:
      requiredText(
        input.submissionId,
        "submissionId",
        160
      ),
  };
}

function participantRole(
  match,
  participantUserId
) {
  if (
    sameId(
      match
        .challengerUserId,
      participantUserId
    )
  ) {
    return "challenger";
  }
  if (
    sameId(
      match
        .defenderUserId,
      participantUserId
    )
  ) {
    return "defender";
  }
  return null;
}

function roleTimingFields(
  role
) {
  if (
    ![
      "challenger",
      "defender",
    ].includes(role)
  ) {
    throw new TypeError(
      "match role is invalid"
    );
  }
  return {
    startedAt:
      `${role}StartedAt`,
    deadlineAt:
      `${role}DeadlineAt`,
    result:
      `${role}Result`,
  };
}

function normalizeAssignmentAudit({
  fingerprint,
  requestKey,
  assignmentType,
  sourceMatchId,
  revengeRightId,
  challengerMmr,
  defenderMmr,
  questionPolicyVersion,
  assignedAt,
  defenderSelection,
}) {
  const selection =
    defenderSelection &&
    typeof defenderSelection ===
      "object"
      ? defenderSelection
      : null;
  const snapshot =
    selection
      ?.auditSnapshot &&
    typeof selection
      .auditSnapshot ===
      "object"
      ? selection
          .auditSnapshot
      : null;
  const candidateCount =
    Number.isSafeInteger(
      snapshot
        ?.candidateCount
    )
      ? snapshot
          .candidateCount
      : Array.isArray(
            snapshot
              ?.candidates
          )
        ? snapshot
            .candidates
            .length
        : null;
  return {
    requestFingerprint:
      fingerprint,
    requestId:
      requestKey,
    assignmentType,
    sourceMatchId:
      optionalText(
        sourceMatchId,
        "sourceMatchId",
        160
      ),
    revengeRightId:
      revengeRightId
        ? requiredText(
            String(
              revengeRightId
            ),
            "revengeRightId",
            160
          )
        : null,
    skillMmrSnapshots: {
      challenger:
        Number(
          challengerMmr
        ),
      defender:
        Number(
          defenderMmr
        ),
    },
    questionPolicyVersion:
      optionalText(
        questionPolicyVersion,
        "questionPolicyVersion",
        100
      ),
    assignedAt,
    defenderSelection:
      selection
        ? {
            auditId:
              optionalText(
                selection
                  .auditId,
                "defenderSelection.auditId",
                160
              ),
            auditSnapshot:
              snapshot
                ? {
                    auditSchemaVersion:
                      optionalText(
                        snapshot
                          .auditSchemaVersion,
                        "auditSchemaVersion",
                        80
                      ),
                    requestId:
                      optionalText(
                        snapshot
                          .requestId,
                        "assignment requestId",
                        180
                      ),
                    requestFingerprint:
                      optionalText(
                        snapshot
                          .requestFingerprint,
                        "assignment requestFingerprint",
                        64
                      ),
                    status:
                      optionalText(
                        snapshot.status,
                        "assignment status",
                        40
                      ),
                    algorithmVersion:
                      optionalText(
                        snapshot
                          .algorithmVersion,
                        "assignment algorithmVersion",
                        100
                      ),
                    policyVersion:
                      optionalText(
                        snapshot
                          .policyVersion,
                        "assignment policyVersion",
                        100
                      ),
                    candidateCount,
                    selectionSeedHash:
                      optionalText(
                        snapshot
                          .selectionSeedHash,
                        "selectionSeedHash",
                        128
                      ),
                    candidateSnapshotHash:
                      optionalText(
                        snapshot
                          .candidateSnapshotHash,
                        "candidateSnapshotHash",
                        128
                      ),
                  }
                : null,
          }
        : null,
  };
}

function normalizeProtectionPolicy(
  policy,
  match
) {
  if (
    !Number.isSafeInteger(
      policy
        ?.postMatchProtectionHours
    ) ||
    policy
      .postMatchProtectionHours <
      0
  ) {
    policyPending(
      "POST_MATCH_PROTECTION_DURATION_UNSET",
      "post-match protection duration is not published"
    );
  }
  const scope =
    policy
      .postMatchProtectionScope;
  if (
    ![
      "BOTH_PARTICIPANTS",
      "CHALLENGER_ONLY",
      "DEFENDER_ONLY",
      "WINNER_ONLY",
      "LOSER_ONLY",
    ].includes(scope)
  ) {
    policyPending(
      "POST_MATCH_PROTECTION_SCOPE_UNSET",
      "post-match protection target scope is not published"
    );
  }
  const protectedRoles =
    new Set();
  if (
    scope ===
    "BOTH_PARTICIPANTS"
  ) {
    protectedRoles.add(
      "CHALLENGER"
    );
    protectedRoles.add(
      "DEFENDER"
    );
  } else if (
    scope ===
    "CHALLENGER_ONLY"
  ) {
    protectedRoles.add(
      "CHALLENGER"
    );
  } else if (
    scope ===
    "DEFENDER_ONLY"
  ) {
    protectedRoles.add(
      "DEFENDER"
    );
  } else if (
    scope ===
    "WINNER_ONLY"
  ) {
    protectedRoles.add(
      match.winner
    );
  } else {
    protectedRoles.add(
      match.winner ===
        "CHALLENGER"
        ? "DEFENDER"
        : "CHALLENGER"
    );
  }
  return {
    hours:
      policy
        .postMatchProtectionHours,
    scope,
    protectedRoles,
  };
}

function maxProtectionUntil(
  existing,
  candidate
) {
  if (!candidate) {
    return existing ||
      null;
  }
  if (!existing) {
    return candidate;
  }
  const existingDate =
    new Date(existing);
  return existingDate >
    candidate
    ? existingDate
    : candidate;
}

function normalizeHeldResolution(
  value,
  resolutionReference
) {
  assertOnlyKeys(
    value,
    [
      "resolutionReference",
      "winner",
      "tieBreakStage",
      "reason",
    ],
    {
      code:
        "INVALID_HELD_RESOLUTION",
      label:
        "trusted held resolution",
    }
  );
  const normalizedReference =
    requiredText(
      value
        .resolutionReference,
      "resolutionReference",
      180
    );
  if (
    normalizedReference !==
    resolutionReference
  ) {
    fail(
      "HELD_RESOLUTION_REFERENCE_MISMATCH",
      "trusted held resolution does not match the requested reference",
      {
        statusCode: 409,
      }
    );
  }
  const winner =
    requiredText(
      value.winner,
      "winner",
      20
    ).toUpperCase();
  if (
    ![
      "CHALLENGER",
      "DEFENDER",
    ].includes(winner)
  ) {
    fail(
      "INVALID_HELD_RESOLUTION",
      "trusted held resolution returned no supported winner",
      {
        statusCode: 500,
      }
    );
  }
  return {
    resolutionReference:
      normalizedReference,
    winner,
    tieBreakStage:
      requiredText(
        value.tieBreakStage,
        "tieBreakStage",
        120
      ),
    reason:
      requiredText(
        value.reason,
        "resolution reason",
        500
      ),
  };
}

function normalizeHeldInvalidation(
  value,
  resolutionReference
) {
  assertOnlyKeys(
    value,
    [
      "resolutionReference",
      "reasonCode",
      "reason",
    ],
    {
      code:
        "INVALID_HELD_INVALIDATION",
      label:
        "trusted held invalidation",
    }
  );
  const normalizedReference =
    requiredText(
      value
        .resolutionReference,
      "resolutionReference",
      180
    );
  if (
    normalizedReference !==
    resolutionReference
  ) {
    fail(
      "HELD_RESOLUTION_REFERENCE_MISMATCH",
      "trusted held invalidation does not match the requested reference",
      {
        statusCode: 409,
      }
    );
  }
  const reasonCode =
    requiredText(
      value.reasonCode,
      "reasonCode",
      120
    ).toUpperCase();
  if (
    ![
      "QUESTION_INVALID",
      "SERVER_FAILURE",
      "SERVER_CANCELLED",
    ].includes(reasonCode)
  ) {
    fail(
      "INVALID_HELD_INVALIDATION",
      "trusted held invalidation returned an unsupported reason",
      {
        statusCode: 500,
      }
    );
  }
  return {
    resolutionReference:
      normalizedReference,
    reasonCode,
    reason:
      requiredText(
        value.reason,
        "invalidation reason",
        500
      ),
  };
}

async function runInTransaction(
  work,
  suppliedSession = null
) {
  if (suppliedSession) {
    return work(
      suppliedSession
    );
  }
  const session =
    await mongoose
      .startSession();
  let result;
  try {
    await session.withTransaction(
      async () => {
        result =
          await work(
            session
          );
      }
    );
    return result;
  } finally {
    await session.endSession();
  }
}

async function createOutboxEvent({
  eventType,
  match,
  occurredAt,
  payload = {},
  idempotencySuffix =
    null,
  session,
}) {
  const key = [
    "rank-takeover",
    match.matchId,
    eventType,
    ...(idempotencySuffix
      ? [
          requiredText(
            idempotencySuffix,
            "outbox idempotency suffix",
            120
          ),
        ]
      : []),
  ].join(":");
  const event =
    new OutboxEvent({
      eventId:
        deterministicId(
          "takeover-event",
          key
        ),
      idempotencyKey: key,
      aggregateType:
        "RankTakeoverMatch",
      aggregateId:
        match.matchId,
      eventType,
      payload: {
        matchId:
          match.matchId,
        activeRanking:
          match.activeRanking,
        matchType:
          match.matchType,
        ...payload,
      },
      occurredAt,
      nextAttemptAt:
        occurredAt,
    });
  await event.save({
    session,
  });
  return event;
}

async function reconcileCycle(
  cycle,
  session
) {
  const transactions =
    await queryWithSession(
      DayBalanceTransaction
        .find({
          status: "POSTED",
          entries: {
            $elemMatch: {
              userId:
                cycle.userId,
              cycleId:
                cycle._id,
            },
          },
        })
        .lean(),
      session
    );
  const balances =
    deriveUserBalances(
      transactions,
      {
        cycleId:
          cycle._id,
        userId:
          cycle.userId,
      }
    );
  assertCycleCacheMatches(
    cycle,
    balances
  );
  return balances;
}

async function assertAccountAndSkill({
  userId,
  session,
}) {
  const user =
    await queryWithSession(
      User.findById(
        userId
      ),
      session
    );
  const rankingProfile =
    await queryWithSession(
      RankingProfile.findOne({
        userId,
        datasetOnly: {
          $ne: true,
        },
      }),
      session
    );
  if (!user) {
    fail(
      "USER_NOT_FOUND",
      "Arena participant does not exist",
      {
        statusCode: 404,
      }
    );
  }
  if (
    user.accountStatus !==
    "active"
  ) {
    fail(
      "ACCOUNT_NOT_ACTIVE",
      "Arena participant account is not active",
      {
        statusCode: 403,
      }
    );
  }
  if (
    !rankingProfile ||
    !rankingProfile
      .placementAttemptId
  ) {
    fail(
      "PLACEMENT_REQUIRED",
      "Placement and RankingProfile are required",
      {
        statusCode: 403,
      }
    );
  }
  return {
    user,
    rankingProfile,
  };
}

async function activeCycleFor({
  userId,
  ranking,
  session,
  forSettlement = false,
}) {
  const statuses =
    forSettlement
      ? SETTLEMENT_CYCLE_STATUSES[
          ranking
        ]
      : CYCLE_STATUSES_BY_RANKING[
          ranking
        ];
  const cycle =
    await queryWithSession(
      AccessCycle.findOne({
        userId,
        activeRanking:
          ranking,
        status: {
          $in: statuses,
        },
      }),
      session
    );
  if (!cycle) {
    fail(
      "ACTIVE_CYCLE_REQUIRED",
      `${ranking} active cycle is required`,
      {
        statusCode: 403,
      }
    );
  }
  if (
    cycle.integrityState !==
    "CLEAR"
  ) {
    fail(
      "CYCLE_INTEGRITY_HELD",
      "Arena cycle has an unresolved integrity hold",
      {
        statusCode: 423,
      }
    );
  }
  return cycle;
}

async function arenaProfileFor({
  userId,
  seasonId,
  ranking,
  session,
}) {
  const profile =
    await queryWithSession(
      ArenaProfile.findOne({
        userId,
        seasonId,
        activeRanking:
          ranking,
      }),
      session
    );
  if (
    !profile ||
    profile.status !==
      "ACTIVE" ||
    !Number.isSafeInteger(
      profile.arenaPosition
    )
  ) {
    fail(
      "ACTIVE_ARENA_SEAT_REQUIRED",
      "participant needs an active Arena seat",
      {
        statusCode: 403,
      }
    );
  }
  return profile;
}

function assertDefenderProtection({
  defenderProfile,
  matchType,
  policy,
  now,
}) {
  const protectionActive =
    Boolean(
      defenderProfile
        .protectionUntil &&
        new Date(
          defenderProfile
            .protectionUntil
        ) > now
    );
  if (protectionActive) {
    if (
      matchType ===
      "REVENGE"
    ) {
      if (
        policy
          .revengeBypassesProtection ===
        null ||
        policy
          .revengeBypassesProtection ===
          undefined
      ) {
        policyPending(
          "REVENGE_PROTECTION_POLICY_UNSET",
          "Revenge protection bypass policy is not published"
        );
      }
      if (
        policy
          .revengeBypassesProtection
      ) {
        // Explicitly published bypass.
      } else {
        fail(
          "DEFENDER_PROTECTED",
          "defender is in post-match protection",
          {
            statusCode: 409,
          }
        );
      }
    } else {
      fail(
        "DEFENDER_PROTECTED",
        "defender is in post-match protection",
        {
          statusCode: 409,
        }
      );
    }
  }

  const shieldActive =
    Boolean(
      defenderProfile
        .rankShieldUntil &&
        new Date(
          defenderProfile
            .rankShieldUntil
        ) > now
    );
  if (!shieldActive) {
    return;
  }
  if (
    matchType ===
    "REVENGE"
  ) {
    if (
      policy
        .revengeBypassesShield ===
      null ||
      policy
        .revengeBypassesShield ===
        undefined
    ) {
      policyPending(
        "REVENGE_SHIELD_POLICY_UNSET",
        "Revenge Rank Shield bypass policy is not published"
      );
    }
    if (
      policy
        .revengeBypassesShield
    ) {
      return;
    }
  }
  fail(
    "DEFENDER_SHIELDED",
    "defender has an active Main Rank Shield",
    {
      statusCode: 409,
    }
  );
}

async function assertNoActiveMatch({
  userIds,
  session,
}) {
  const existing =
    await queryWithSession(
      RankTakeoverMatch.findOne({
        participantUserIds: {
          $in: userIds,
        },
        status: {
          $in:
            ACTIVE_TAKEOVER_MATCH_STATUSES,
        },
      }),
      session
    );
  if (existing) {
    fail(
      "ACTIVE_MATCH_EXISTS",
      "each participant can have only one active match",
      {
        statusCode: 409,
      }
    );
  }
}

async function assertPairCooldown({
  seasonId,
  challengerUserId,
  defenderUserId,
  matchType,
  policy,
  now,
  session,
}) {
  if (
    matchType ===
    "REVENGE"
  ) {
    return;
  }
  const days =
    nonNegativeInteger(
      Number(
        policy
          .sameOpponentCooldownDays
      ),
      "sameOpponentCooldownDays"
    );
  if (days === 0) {
    return;
  }
  const since =
    new Date(
      now.getTime() -
        days * DAY_MS
    );
  const recent =
    await queryWithSession(
      RankTakeoverMatch.findOne({
        seasonId,
        participantUserIds: {
          $all: [
            challengerUserId,
            defenderUserId,
          ],
        },
        status: {
          $ne: "CANCELLED",
        },
        matchedAt: {
          $gte: since,
        },
      }),
      session
    );
  if (recent) {
    fail(
      "SAME_PAIR_COOLDOWN",
      "same opponent cooldown is active",
      {
        statusCode: 409,
        details: {
          previousMatchId:
            recent.matchId,
        },
      }
    );
  }
}

function requestFingerprint(
  value
) {
  return sha256(
    stableJson(value)
  );
}

function commandActor(
  actorUserId,
  actorType = "USER"
) {
  if (!actorUserId) {
    return {
      actorKey: "SYSTEM",
      actorType:
        "SYSTEM",
      actorUserId: null,
    };
  }
  const normalizedType =
    requiredText(
      actorType,
      "actorType",
      20
    ).toUpperCase();
  if (
    ![
      "USER",
      "AUDITOR",
    ].includes(
      normalizedType
    )
  ) {
    throw new TypeError(
      "actorType must be USER or AUDITOR"
    );
  }
  const normalized =
    objectId(
      actorUserId,
      "actorUserId"
    );
  return {
    actorKey:
      `${normalizedType}:${normalized}`,
    actorType:
      normalizedType,
    actorUserId:
      normalized,
  };
}

function receiptFilter({
  actorKey,
  commandType,
  commandKey,
}) {
  return {
    actorKey,
    commandType,
    idempotencyKey:
      commandKey,
  };
}

async function findCommandReceipt(
  filter,
  session = null
) {
  return queryWithSession(
    RankTakeoverCommandReceipt
      .findOne(filter),
    session
  );
}

function assertReceiptFingerprint(
  receipt,
  fingerprint
) {
  if (
    receipt
      .requestFingerprint !==
    fingerprint
  ) {
    fail(
      "IDEMPOTENCY_KEY_CONFLICT",
      "idempotency key was used with a different command payload",
      {
        statusCode: 409,
      }
    );
  }
}

async function replayCommandReceipt({
  receipt,
  fingerprint,
  session = null,
}) {
  assertReceiptFingerprint(
    receipt,
    fingerprint
  );
  if (
    receipt.status ===
    "COMPLETED"
  ) {
    const match =
      await queryWithSession(
        RankTakeoverMatch
          .findOne({
            matchId:
              receipt
                .resultMatchId,
          })
          .select(
            "+assignmentAudit"
          ),
        session
      );
    if (!match) {
      fail(
        "COMMAND_RESULT_MISSING",
        "completed command points to a missing match",
        {
          statusCode: 500,
        }
      );
    }
    return match;
  }
  if (
    receipt.status ===
    "FAILED"
  ) {
    throw new RankTakeoverError(
      receipt.errorCode,
      receipt.errorMessage ||
        "Rank Takeover command failed",
      {
        statusCode:
          receipt
            .errorStatusCode ||
          409,
        details:
          receipt
            .errorDetails ||
          null,
      }
    );
  }
  fail(
    "COMMAND_IN_PROGRESS",
    "same Rank Takeover command is still in progress",
    {
      statusCode: 409,
    }
  );
}

function profileSettlementFields({
  profile,
  role,
  occurredAt,
  protectionPolicy,
}) {
  const fields = {
    lastTakeoverSettledAt:
      occurredAt,
  };
  if (
    protectionPolicy
      .protectedRoles
      .has(role)
  ) {
    const candidate =
      new Date(
        occurredAt.getTime() +
          protectionPolicy
            .hours *
            60 *
            MINUTE_MS
      );
    fields.protectionUntil =
      maxProtectionUntil(
        profile
          .protectionUntil,
        candidate
      );
  }
  return fields;
}

async function swapArenaPositions({
  match,
  challengerProfile,
  defenderProfile,
  occurredAt,
  protectionPolicy,
  session,
}) {
  if (
    challengerProfile
      .arenaPosition !==
      match
        .challengerPositionBefore ||
    defenderProfile
      .arenaPosition !==
      match
        .defenderPositionBefore
  ) {
    fail(
      "ARENA_POSITION_CONFLICT",
      "Arena positions changed after match lock",
      {
        statusCode: 409,
      }
    );
  }
  const temporaryPosition =
    8_000_000_000_000_000 +
    Number.parseInt(
      sha256(
        match.matchId
      ).slice(0, 10),
      16
    );
  if (
    !Number.isSafeInteger(
      temporaryPosition
    )
  ) {
    fail(
      "TEMPORARY_SEAT_OVERFLOW",
      "could not allocate a safe temporary Arena seat",
      {
        statusCode: 500,
      }
    );
  }

  const challengerStage =
    await ArenaProfile.updateOne(
      {
        _id:
          challengerProfile._id,
        version:
          challengerProfile.version,
        status: "ACTIVE",
        activeRanking:
          match.activeRanking,
        arenaPosition:
          match
            .challengerPositionBefore,
      },
      {
        $set: {
          arenaPosition:
            temporaryPosition,
        },
        $inc: {
          version: 1,
        },
      },
      {
        session,
      }
    );
  if (
    challengerStage
      .modifiedCount !== 1
  ) {
    fail(
      "ARENA_POSITION_CONFLICT",
      "challenger Arena seat compare-and-set failed",
      {
        statusCode: 409,
      }
    );
  }

  const defenderSwap =
    await ArenaProfile.updateOne(
      {
        _id:
          defenderProfile._id,
        version:
          defenderProfile.version,
        status: "ACTIVE",
        activeRanking:
          match.activeRanking,
        arenaPosition:
          match
            .defenderPositionBefore,
      },
      {
        $set: {
          arenaPosition:
            match
              .challengerPositionBefore,
          ...profileSettlementFields({
            profile:
              defenderProfile,
            role:
              "DEFENDER",
            occurredAt,
            protectionPolicy,
          }),
        },
        $inc: {
          version: 1,
        },
      },
      {
        session,
      }
    );
  if (
    defenderSwap
      .modifiedCount !== 1
  ) {
    fail(
      "ARENA_POSITION_CONFLICT",
      "defender Arena seat compare-and-set failed",
      {
        statusCode: 409,
      }
    );
  }

  const challengerSwap =
    await ArenaProfile.updateOne(
      {
        _id:
          challengerProfile._id,
        version:
          challengerProfile.version +
          1,
        status: "ACTIVE",
        activeRanking:
          match.activeRanking,
        arenaPosition:
          temporaryPosition,
      },
      {
        $set: {
          arenaPosition:
            match
              .defenderPositionBefore,
          ...profileSettlementFields({
            profile:
              challengerProfile,
            role:
              "CHALLENGER",
            occurredAt,
            protectionPolicy,
          }),
        },
        $inc: {
          version: 1,
        },
      },
      {
        session,
      }
    );
  if (
    challengerSwap
      .modifiedCount !== 1
  ) {
    fail(
      "ARENA_POSITION_CONFLICT",
      "challenger final Arena seat compare-and-set failed",
      {
        statusCode: 409,
      }
    );
  }
}

async function markArenaPositionsUnchanged({
  match,
  challengerProfile,
  defenderProfile,
  occurredAt,
  protectionPolicy,
  session,
}) {
  for (const [
    profile,
    expectedPosition,
  ] of [
    [
      challengerProfile,
      match
        .challengerPositionBefore,
    ],
    [
      defenderProfile,
      match
        .defenderPositionBefore,
    ],
  ]) {
    const result =
      await ArenaProfile.updateOne(
        {
          _id: profile._id,
          version:
            profile.version,
          status: "ACTIVE",
          activeRanking:
            match.activeRanking,
          arenaPosition:
            expectedPosition,
        },
        {
          $set: {
            ...profileSettlementFields({
              profile,
              role:
                sameId(
                  profile._id,
                  challengerProfile._id
                )
                  ? "CHALLENGER"
                  : "DEFENDER",
              occurredAt,
              protectionPolicy,
            }),
          },
          $inc: {
            version: 1,
          },
        },
        {
          session,
        }
      );
    if (
      result.modifiedCount !==
      1
    ) {
      fail(
        "ARENA_POSITION_CONFLICT",
        "Arena seat compare-and-set failed",
        {
          statusCode: 409,
        }
      );
    }
  }
}

function existingRequestMatches(
  match,
  {
    challengerUserId,
    activeRanking,
    matchType,
  }
) {
  return (
    sameId(
      match
        .challengerUserId,
      challengerUserId
    ) &&
    match.activeRanking ===
      activeRanking &&
    match.matchType ===
      matchType
  );
}

function createRankTakeoverService(
  options = {}
) {
  const now =
    typeof options.now ===
    "function"
      ? options.now
      : () => new Date();
  const selectSubDefender =
    options
      .selectSubDefender;
  const resolveRevengeRight =
    options
      .resolveRevengeRight;
  const consumeRevengeRight =
    options
      .consumeRevengeRight;
  const resolveMainTierStepGap =
    options
      .resolveMainTierStepGap;
  const resolveDeadlinePolicy =
    options
      .resolveDeadlinePolicy;
  const assertPairIntegrity =
    options
      .assertPairIntegrity;
  const prepareQuestionPacks =
    options
      .prepareQuestionPacks;
  const ensureParticipantAttemptStarted =
    options
      .ensureParticipantAttemptStarted;
  const verifyScoredSubmission =
    options
      .verifyScoredSubmission;
  const resolveTieBreak =
    options.resolveTieBreak;
  const resolveNoShowState =
    options
      .resolveNoShowState;
  const assertAuditorAuthorized =
    options
      .assertAuditorAuthorized;
  const resolveHeldOutcome =
    options
      .resolveHeldOutcome;
  const resolveHeldInvalidation =
    options
      .resolveHeldInvalidation;
  const suppliedSession =
    options.session ||
    null;
  const skipCommandReceipts =
    options
      .skipCommandReceipts ===
    true;

  function heldCommandActor(
    input
  ) {
    return input
      ?.auditorUserId
      ? commandActor(
          input
            .auditorUserId,
          "AUDITOR"
        )
      : commandActor(null);
  }

  async function authorizeHeldCommand({
    actor,
    action,
    match,
    session,
  }) {
    if (
      actor.actorType ===
      "SYSTEM"
    ) {
      return;
    }
    if (
      typeof assertAuditorAuthorized !==
      "function"
    ) {
      policyPending(
        "ARENA_AUDITOR_AUTHORITY_UNAVAILABLE",
        "Arena auditor authorization is not available"
      );
    }
    const authorized =
      await assertAuditorAuthorized({
        auditorUserId:
          actor.actorUserId,
        action,
        match,
        session,
      });
    if (authorized !== true) {
      fail(
        "ARENA_AUDITOR_FORBIDDEN",
        "auditor is not authorized for this held match",
        {
          statusCode: 403,
        }
      );
    }
  }

  async function requestChallenge(
    input
  ) {
    const challengerUserId =
      objectId(
        input
          ?.challengerUserId,
        "challengerUserId"
      );
    const activeRanking =
      normalizeRanking(
        input
          ?.activeRanking
      );
    const matchType =
      normalizeMatchType(
        input?.matchType
      );
    const requestKey =
      idempotencyKey(
        input
          ?.idempotencyKey
      );
    // Command receipts are namespaced per actor. Keep the economic lock and
    // deterministic match id in the same namespace so another user choosing
    // the same perfectly valid client key cannot reserve it globally.
    const lockKey = [
      "rank-takeover",
      String(
        challengerUserId
      ),
      requestKey,
    ].join(":");
    // 방어자 배정 요청 ID — **클라이언트 멱등키를 그대로 쓴다.**
    // 배정 감사의 멱등 범위가 {challengerUserId, requestId} 라서 도전자 간
    // 충돌이 없고, 원 키를 보존해야 감사에서 요청을 역추적할 수 있다.
    // (한때 lockKey 에서 파생한 해시를 썼는데, 감사 스냅샷의 requestId 가
    //  클라이언트가 보낸 키와 달라져 대사가 불가능해졌다.)
    const assignmentRequestId =
      requestKey;

    const existing =
      await RankTakeoverMatch
        .findOne({
          challengeLockIdempotencyKey:
            lockKey,
        })
        .select(
          "+assignmentAudit"
        );
    if (existing) {
      if (
        !existingRequestMatches(
          existing,
          {
            challengerUserId,
            activeRanking,
            matchType,
          }
        )
      ) {
        fail(
          "IDEMPOTENCY_KEY_CONFLICT",
          "idempotency key was used for a different challenge",
          {
            statusCode: 409,
          }
        );
      }
      return existing;
    }

    try {
      return await runInTransaction(
        async (session) => {
          const observedAt =
            asDate(
              now(),
              "now"
            );
          const season =
            await queryWithSession(
              ArenaSeason.findOne({
                status: "ACTIVE",
                startsAt: {
                  $lte:
                    observedAt,
                },
                endsAt: {
                  $gt:
                    observedAt,
                },
              }),
              session
            );
          if (!season) {
            fail(
              "ACTIVE_ARENA_SEASON_REQUIRED",
              "no active Arena season is available",
              {
                statusCode: 409,
              }
            );
          }
          if (
            season.reseedStatus ===
            "RUNNING"
          ) {
            fail(
              "ARENA_RESEED_RUNNING",
              "new matches are blocked during Arena reseed",
              {
                statusCode: 409,
              }
            );
          }
          const policy =
            await queryWithSession(
              PolicyVersion
                .findById(
                  season
                    .policyVersionId
                ),
              session
            );
          if (!policy) {
            fail(
              "POLICY_VERSION_NOT_FOUND",
              "Arena season policy snapshot does not exist",
              {
                statusCode: 500,
              }
            );
          }

          const challengerIdentity =
            await assertAccountAndSkill({
              userId:
                challengerUserId,
              session,
            });
          const challengerCycle =
            await activeCycleFor({
              userId:
                challengerUserId,
              ranking:
                activeRanking,
              session,
            });
          const challengerProfile =
            await arenaProfileFor({
              userId:
                challengerUserId,
              seasonId:
                season._id,
              ranking:
                activeRanking,
              session,
            });

          if (
            activeRanking ===
            "SUB"
          ) {
            const cycleDay =
              cycleDayForDateKey(
                challengerCycle
                  .paidAccessStartsOn,
                kstDateKey(
                  observedAt
                )
              );
            const cutoff =
              Number(
                policy
                  .newChallengeCutoffCycleDay
              );
            if (
              !Number.isSafeInteger(
                cutoff
              )
            ) {
              policyPending(
                "NEW_CHALLENGE_CUTOFF_UNSET",
                "Sub challenge cutoff policy is not published"
              );
            }
            if (
              cycleDay >
              cutoff
            ) {
              fail(
                "SUB_CHALLENGE_CUTOFF_PASSED",
                "new Sub challenges are closed after Day 28",
                {
                  statusCode: 409,
                  details: {
                    cycleDay,
                    cutoff,
                  },
                }
              );
            }
          }

          let defenderUserId;
          let defenderSelectionAudit =
            null;
          let revengeRight =
            null;
          if (
            matchType ===
            "REVENGE"
          ) {
            if (
              typeof resolveRevengeRight !==
                "function" ||
              typeof consumeRevengeRight !==
                "function"
            ) {
              policyPending(
                "REVENGE_RIGHT_STORE_UNAVAILABLE",
                "RevengeRight verification and consumption are not available"
              );
            }
            revengeRight =
              await resolveRevengeRight({
                sourceMatchId:
                  input
                    ?.sourceMatchId,
                entitledUserId:
                  challengerUserId,
                season,
                activeRanking,
                now:
                  observedAt,
                session,
              });
            if (
              !revengeRight ||
              !revengeRight
                .targetUserId
            ) {
              fail(
                "REVENGE_RIGHT_INVALID",
                "an unused, unexpired RevengeRight is required",
                {
                  statusCode: 409,
                }
              );
            }
            defenderUserId =
              objectId(
                revengeRight
                  .targetUserId,
                "revengeRight.targetUserId"
              );
          } else if (
            activeRanking ===
            "SUB"
          ) {
            if (
              Object.prototype
                .hasOwnProperty.call(
                  input || {},
                  "defenderUserId"
                )
            ) {
              fail(
                "SUB_DEFENDER_SELECTION_FORBIDDEN",
                "Sub defender is assigned by the server",
                {
                  statusCode: 400,
                }
              );
            }
            if (
              typeof selectSubDefender !==
              "function"
            ) {
              policyPending(
                "SUB_DEFENSE_ASSIGNMENT_UNAVAILABLE",
                "weighted Sub defense assignment policy is not available"
              );
            }
            const selected =
              await selectSubDefender({
                requestId:
                  assignmentRequestId,
                challengerUserId,
                challengerCycle,
                challengerProfile,
                season,
                policy,
                now:
                  observedAt,
                session,
              });
            const selectedUserId =
              selected &&
              typeof selected ===
                "object" &&
              Object.prototype
                .hasOwnProperty.call(
                  selected,
                  "userId"
                )
                ? selected.userId
                : selected;
            if (
              selected &&
              typeof selected ===
                "object" &&
              (selected.auditId ||
                selected
                  .auditSnapshot)
            ) {
              defenderSelectionAudit =
                {
                  auditId:
                    selected
                      .auditId ||
                    null,
                  auditSnapshot:
                    selected
                      .auditSnapshot ||
                    null,
                };
            }
            if (!selectedUserId) {
              fail(
                "NO_CANDIDATE",
                "no eligible Sub defender is available",
                {
                  statusCode: 409,
                  details: {
                    defenderSelection:
                      defenderSelectionAudit,
                  },
                }
              );
            }
            defenderUserId =
              objectId(
                selectedUserId,
                "selected defender"
              );
          } else {
            defenderUserId =
              objectId(
                input
                  ?.defenderUserId,
                "defenderUserId"
              );
          }

          if (
            sameId(
              challengerUserId,
              defenderUserId
            )
          ) {
            fail(
              "SELF_CHALLENGE_FORBIDDEN",
              "a user cannot challenge their own Arena seat",
              {
                statusCode: 400,
              }
            );
          }

          const defenderIdentity =
            await assertAccountAndSkill({
              userId:
                defenderUserId,
              session,
            });
          const defenderCycle =
            await activeCycleFor({
              userId:
                defenderUserId,
              ranking:
                activeRanking,
              session,
            });
          if (
            !sameId(
              challengerCycle
                .policyVersionId,
              season
                .policyVersionId
            ) ||
            !sameId(
              defenderCycle
                .policyVersionId,
              season
                .policyVersionId
            )
          ) {
            fail(
              "POLICY_VERSION_MISMATCH",
              "participants and Arena season must share one pinned policy version",
              {
                statusCode: 409,
              }
            );
          }
          const defenderProfile =
            await arenaProfileFor({
              userId:
                defenderUserId,
              seasonId:
                season._id,
              ranking:
                activeRanking,
              session,
            });

          if (
            defenderProfile
              .arenaPosition >=
            challengerProfile
              .arenaPosition
          ) {
            fail(
              "DEFENDER_NOT_ABOVE_CHALLENGER",
              "Rank Takeover target must own a higher Arena seat",
              {
                statusCode: 409,
              }
            );
          }
          if (
            activeRanking ===
              "SUB" &&
            policy
              .subChallengeRequestLimit !==
              null &&
            policy
              .subChallengeRequestLimit !==
              undefined
          ) {
            fail(
              "UNSUPPORTED_SUB_REQUEST_LIMIT",
              "Sub challenge request total cannot be capped",
              {
                statusCode: 500,
              }
            );
          }
          if (
            typeof assertPairIntegrity !==
            "function"
          ) {
            policyPending(
              "PAIR_INTEGRITY_CHECK_UNAVAILABLE",
              "device, network, payment, and collusion pair checks are unavailable"
            );
          }
          const pairIntegrity =
            await assertPairIntegrity({
              challengerUser:
                challengerIdentity
                  .user,
              defenderUser:
                defenderIdentity
                  .user,
              challengerCycle,
              defenderCycle,
              season,
              activeRanking,
              matchType,
              requestId:
                requestKey,
              now:
                observedAt,
              session,
            });
          if (
            pairIntegrity !==
            true
          ) {
            fail(
              "PAIR_INTEGRITY_BLOCKED",
              "participant pair failed Arena integrity checks",
              {
                statusCode: 423,
              }
            );
          }
          assertDefenderProtection({
            defenderProfile,
            matchType,
            policy,
            now:
              observedAt,
          });
          await assertNoActiveMatch({
            userIds: [
              challengerUserId,
              defenderUserId,
            ],
            session,
          });
          if (
            activeRanking ===
            "SUB"
          ) {
            if (
              matchType ===
              "NORMAL"
            ) {
              const cycleCap =
                defenderCycle
                  .completedSubChallenges +
                nonNegativeInteger(
                  Number(
                    policy
                      .defenseAssignmentCapOffset
                  ),
                  "defenseAssignmentCapOffset"
                );
              if (
                defenderCycle
                  .defenseAssignmentsInCycle >=
                cycleCap
              ) {
                fail(
                  "DEFENDER_CYCLE_ASSIGNMENT_CAP",
                  "defender reached the published cycle assignment cap",
                  {
                    statusCode: 409,
                  }
                );
              }
            }
            const dailyCap =
              positiveInteger(
                Number(
                  policy
                    .maxDefenseAssignmentsPerDay
                ),
                "maxDefenseAssignmentsPerDay"
              );
            const dateKey =
              kstDateKey(
                observedAt
              );
            const dayStart =
              new Date(
                `${dateKey}T00:00:00+09:00`
              );
            const dayEnd =
              new Date(
                dayStart.getTime() +
                  DAY_MS
              );
            const assignedToday =
              await queryWithSession(
                RankTakeoverMatch
                  .countDocuments({
                    defenderUserId,
                    matchedAt: {
                      $gte:
                        dayStart,
                      $lt: dayEnd,
                    },
                  }),
                session
              );
            if (
              assignedToday >=
              dailyCap
            ) {
              fail(
                "DEFENDER_DAILY_ASSIGNMENT_CAP",
                "defender reached the published daily assignment cap",
                {
                  statusCode: 409,
                }
              );
            }
          }
          await assertPairCooldown({
            seasonId:
              season._id,
            challengerUserId,
            defenderUserId,
            matchType,
            policy,
            now:
              observedAt,
            session,
          });

          let tierStepGap =
            null;
          if (
            activeRanking ===
            "MAIN"
          ) {
            if (
              typeof resolveMainTierStepGap !==
              "function"
            ) {
              policyPending(
                "ARENA_TIER_MAPPING_RESOLVER_UNAVAILABLE",
                "Main Arena tier-step resolver is not available"
              );
            }
            const resolverTierStepGap =
              await resolveMainTierStepGap({
                  challengerProfile,
                  defenderProfile,
                  policy,
                  season,
                  session,
                });
            tierStepGap =
              verifyMainTierStepGap({
                policy,
                challengerProfile,
                defenderProfile,
                resolverTierStepGap,
              });
          }

          const cost =
            buildChallengeCostSnapshot({
              activeRanking,
              matchType,
              policy,
              tierStepGap,
            });
          const balanceFields =
            balanceFieldsFor(
              activeRanking
            );
          await reconcileCycle(
            challengerCycle,
            session
          );
          if (
            challengerCycle[
              balanceFields
                .available
            ] <
            cost.stakeDays
          ) {
            fail(
              "INSUFFICIENT_CHALLENGE_DAYS",
              "available challenge-day balance is insufficient",
              {
                statusCode: 409,
              }
            );
          }

          if (
            typeof resolveDeadlinePolicy !==
            "function"
          ) {
            policyPending(
              "MATCH_DEADLINE_POLICY_UNSET",
              "Rank Takeover deadline policy is not published"
            );
          }
          const deadline =
            normalizeDeadlinePolicy(
              await resolveDeadlinePolicy({
                activeRanking,
                matchType,
                policy,
                season,
                challengerCycle,
                defenderCycle,
                now:
                  observedAt,
              })
            );
          const startsBy =
            new Date(
              observedAt.getTime() +
                deadline
                  .startDeadlineMinutes *
                  MINUTE_MS
            );
          const submitsBy =
            new Date(
              observedAt.getTime() +
                deadline
                  .submissionDeadlineMinutes *
                  MINUTE_MS
            );
          let mustSettleBy =
            new Date(
              season.endsAt
            );
          if (
            activeRanking ===
            "SUB"
          ) {
            for (const cycle of [
              challengerCycle,
              defenderCycle,
            ]) {
              if (
                !cycle
                  .day30CompletionDeadlineAt
              ) {
                policyPending(
                  "DAY30_SETTLEMENT_DEADLINE_UNSET",
                  "Sub match settlement deadline is not published"
                );
              }
              const deadlineAt =
                new Date(
                  cycle
                    .day30CompletionDeadlineAt
                );
              if (
                deadlineAt <
                mustSettleBy
              ) {
                mustSettleBy =
                  deadlineAt;
              }
            }
          }
          if (
            submitsBy >
            mustSettleBy
          ) {
            fail(
              "MATCH_CANNOT_SETTLE_IN_TIME",
              "match cannot finish before the cycle or season deadline",
              {
                statusCode: 409,
              }
            );
          }

          const externalMatchId =
            deterministicId(
              "rank-takeover",
              lockKey
            );
          const lockTransactionId =
            new mongoose
              .Types.ObjectId();
          const fingerprint =
            requestFingerprint({
              challengerUserId:
                String(
                  challengerUserId
                ),
              defenderUserId:
                String(
                  defenderUserId
                ),
              activeRanking,
              matchType,
              seasonId:
                String(
                  season._id
                ),
              policyVersionId:
                String(
                  policy._id
                ),
              stakeDays:
                cost.stakeDays,
              sourceMatchId:
                revengeRight
                  ?.sourceMatchId ||
                null,
            });
          const match =
            new RankTakeoverMatch({
              matchId:
                externalMatchId,
              seasonId:
                season._id,
              policyVersionId:
                policy._id,
              activeRanking,
              challengerUserId,
              challengerCycleId:
                challengerCycle._id,
              defenderUserId,
              defenderCycleId:
                defenderCycle._id,
              challengerPositionBefore:
                challengerProfile
                  .arenaPosition,
              defenderPositionBefore:
                defenderProfile
                  .arenaPosition,
              matchType,
              challengeCostSnapshot:
                cost,
              deadlinePolicySnapshot:
                {
                  startDeadlineMinutes:
                    deadline
                      .startDeadlineMinutes,
                  submissionDeadlineMinutes:
                    deadline
                      .submissionDeadlineMinutes,
                },
              challengeLockTransactionId:
                lockTransactionId,
              challengeLockIdempotencyKey:
                lockKey,
              status: "MATCHED",
              matchedAt:
                observedAt,
              startsBy,
              submitsBy,
              assignmentAudit:
                normalizeAssignmentAudit({
                  fingerprint,
                  requestKey,
                  assignmentType:
                    matchType ===
                    "REVENGE"
                      ? "REVENGE_RIGHT"
                      : activeRanking ===
                          "SUB"
                        ? "WEIGHTED_SERVER_ASSIGNMENT"
                        : "SERVER_VALIDATED_TARGET",
                  sourceMatchId:
                    revengeRight
                      ?.sourceMatchId ||
                    null,
                  revengeRightId:
                    revengeRight
                      ?.rightId ||
                    revengeRight
                      ?._id ||
                    null,
                  challengerMmr:
                    challengerIdentity
                      .rankingProfile
                      .mmr,
                  defenderMmr:
                    defenderIdentity
                      .rankingProfile
                      .mmr,
                  questionPolicyVersion:
                    deadline
                      .questionPolicyVersion,
                  assignedAt:
                    observedAt,
                  defenderSelection:
                    defenderSelectionAudit,
                }),
            });
          const lockTransaction =
            buildLockTransaction({
              match,
              occurredAt:
                observedAt,
            });

          challengerCycle[
            balanceFields
              .available
          ] -= cost.stakeDays;
          challengerCycle[
            balanceFields
              .locked
          ] += cost.stakeDays;
          challengerCycle
            .challengeRequestCount +=
            1;
          defenderCycle
            .defenseAssignmentsInCycle +=
            1;
          defenderCycle
            .lastDefenseAssignedAt =
            observedAt;

          await lockTransaction.save({
            session,
          });
          await challengerCycle.save({
            session,
          });
          await defenderCycle.save({
            session,
          });
          await match.save({
            session,
          });
          if (revengeRight) {
            await consumeRevengeRight({
              right:
                revengeRight,
              consumedByMatch:
                match,
              now:
                observedAt,
              session,
            });
          }
          await createOutboxEvent({
            eventType:
              "TAKEOVER_MATCHED",
            match,
            occurredAt:
              observedAt,
            session,
          });
          await reconcileCycle(
            challengerCycle,
            session
          );
          return match;
        },
        suppliedSession
      );
    } catch (error) {
      if (
        ![
          11000,
          11001,
        ].includes(error?.code)
      ) {
        throw error;
      }
      const duplicate =
        await RankTakeoverMatch
          .findOne({
            challengeLockIdempotencyKey:
              lockKey,
          })
          .select(
            "+assignmentAudit"
          );
      if (
        duplicate &&
        existingRequestMatches(
          duplicate,
          {
            challengerUserId,
            activeRanking,
            matchType,
          }
        )
      ) {
        return duplicate;
      }
      fail(
        "MATCH_CONCURRENCY_CONFLICT",
        "participant or idempotency key already has an active match",
        {
          statusCode: 409,
        }
      );
    }
  }

  async function acceptChallenge(
    input
  ) {
    const matchId =
      requiredText(
        input?.matchId,
        "matchId",
        160
      );
    const defenderUserId =
      objectId(
        input
          ?.defenderUserId,
        "defenderUserId"
      );
    idempotencyKey(
      input?.idempotencyKey
    );
    return runInTransaction(
      async (session) => {
        const match =
          await queryWithSession(
            RankTakeoverMatch
              .findOne({
                matchId,
              }),
            session
          );
        if (!match) {
          fail(
            "MATCH_NOT_FOUND",
            "Rank Takeover match does not exist",
            {
              statusCode: 404,
            }
          );
        }
        if (
          !sameId(
            match
              .defenderUserId,
            defenderUserId
          )
        ) {
          fail(
            "DEFENDER_ONLY_ACTION",
            "only the assigned defender can accept",
            {
              statusCode: 403,
            }
          );
        }
        if (
          match.status ===
          "READY"
        ) {
          return match;
        }
        if (
          match.status !==
          "MATCHED"
        ) {
          fail(
            "MATCH_NOT_ACCEPTABLE",
            `match cannot be accepted from ${match.status}`,
            {
              statusCode: 409,
            }
          );
        }
        const observedAt =
          asDate(
            now(),
            "now"
            );
        // 수락 창은 startsBy 로 닫힌다 — **MATCHED(수락 전)도 포함**이다.
        // READY 만 검사하면 아직 수락되지 않은 매치는 마감이 아무리 지나도
        // 수락이 통과돼, 죽은 도전이 문제팩 봉인과 stake 잠금을 되살린다.
        if (
          [
            "MATCHED",
            "READY",
          ].includes(
            match.status
          ) &&
          observedAt >
          match.startsBy
        ) {
          fail(
            "MATCH_START_DEADLINE_PASSED",
            "match acceptance window has closed",
            {
              statusCode: 409,
            }
          );
        }
        if (
          typeof prepareQuestionPacks !==
          "function"
        ) {
          policyPending(
            "QUESTION_PACK_PREPARER_UNAVAILABLE",
            "sealed equivalent Arena question packs are not available"
          );
        }
        const prepared =
          await prepareQuestionPacks({
            match,
            now:
              observedAt,
            session,
          });
        if (
          !prepared ||
          typeof prepared !==
            "object"
        ) {
          fail(
            "QUESTION_PACK_PREPARATION_FAILED",
            "question pack preparer returned no sealed pack",
            {
              statusCode: 500,
            }
          );
        }
        assertOnlyKeys(
          plain(prepared),
          [
            "challengerQuestionPackId",
            "defenderQuestionPackId",
            "questionVersion",
            "answerKeyVersion",
            "calibrationVersion",
            "timeLimitSeconds",
          ],
          {
            code:
              "QUESTION_PACK_CONTRACT_INVALID",
            label:
              "sealed question pack result",
          }
        );
        match.challengerQuestionPackId =
          objectId(
            prepared
              .challengerQuestionPackId,
            "challengerQuestionPackId"
          );
        match.defenderQuestionPackId =
          objectId(
            prepared
              .defenderQuestionPackId,
            "defenderQuestionPackId"
          );
        match.questionVersion =
          requiredText(
            prepared
              .questionVersion,
            "questionVersion",
            100
          );
        match.answerKeyVersion =
          requiredText(
            prepared
              .answerKeyVersion,
            "answerKeyVersion",
            100
          );
        match.calibrationVersion =
          requiredText(
            prepared
              .calibrationVersion,
            "calibrationVersion",
            100
          );
        if (
          !Number.isSafeInteger(
            prepared
              .timeLimitSeconds
          ) ||
          prepared
            .timeLimitSeconds <
            1
        ) {
          policyPending(
            "QUESTION_PACK_TIME_LIMIT_UNSET",
            "sealed equivalent question packs must publish one common time limit"
          );
        }
        match.timeLimitSeconds =
          prepared
            .timeLimitSeconds;
        match.transitionTo(
          "READY"
        );
        await match.save({
          session,
        });
        await createOutboxEvent({
          eventType:
            "TAKEOVER_ACCEPTED",
          match,
          occurredAt:
            observedAt,
          session,
        });
        return match;
      },
      suppliedSession
    );
  }

  async function rejectChallenge(
    input
  ) {
    const matchId =
      requiredText(
        input?.matchId,
        "matchId",
        160
      );
    const defenderUserId =
      objectId(
        input
          ?.defenderUserId,
        "defenderUserId"
      );
    idempotencyKey(
      input?.idempotencyKey
    );
    const reason =
      requiredText(
        input?.reason,
        "reason",
        240
      );
    return runInTransaction(
      async (session) => {
        const match =
          await queryWithSession(
            RankTakeoverMatch
              .findOne({
                matchId,
              }),
            session
          );
        if (!match) {
          fail(
            "MATCH_NOT_FOUND",
            "Rank Takeover match does not exist",
            {
              statusCode: 404,
            }
          );
        }
        if (
          !sameId(
            match
              .defenderUserId,
            defenderUserId
          )
        ) {
          fail(
            "DEFENDER_ONLY_ACTION",
            "only the assigned defender can reject",
            {
              statusCode: 403,
            }
          );
        }
        if (
          match.status ===
          "CANCELLED"
        ) {
          return match;
        }
        if (
          match.status !==
          "MATCHED"
        ) {
          fail(
            "MATCH_NOT_REJECTABLE",
            `match cannot be rejected from ${match.status}`,
            {
              statusCode: 409,
            }
          );
        }
        const observedAt =
          asDate(
            now(),
            "now"
          );
        const cycle =
          await queryWithSession(
            AccessCycle.findById(
              match
                .challengerCycleId
            ),
            session
          );
        if (!cycle) {
          fail(
            "CHALLENGER_CYCLE_NOT_FOUND",
            "challenger cycle does not exist",
            {
              statusCode: 500,
            }
          );
        }
        const fields =
          balanceFieldsFor(
            match.activeRanking
          );
        if (
          cycle[
            fields.locked
          ] <
          match
            .challengeCostSnapshot
            .stakeDays
        ) {
          fail(
            "LOCKED_BALANCE_MISMATCH",
            "challenger locked balance is insufficient",
            {
              statusCode: 409,
            }
          );
        }
        const unlock =
          buildUnlockTransaction({
            match,
            occurredAt:
              observedAt,
            reasonCode:
              "DEFENDER_DECLINED",
          });
        cycle[fields.locked] -=
          match
            .challengeCostSnapshot
            .stakeDays;
        cycle[
          fields.available
        ] +=
          match
            .challengeCostSnapshot
            .stakeDays;
        await unlock.save({
          session,
        });
        await cycle.save({
          session,
        });
        match.transitionTo(
          "CANCELLED"
        );
        match.settlementVersion =
          SETTLEMENT_VERSION;
        match.settlementReason =
          "SERVER_CANCELLED";
        match.settlementResult = {
          toDefenderAvailableDays:
            0,
          toSystemBurnDays: 0,
          toChallengerAvailableDays:
            match
              .challengeCostSnapshot
              .stakeDays,
        };
        match.settlementTransactionIds =
          [unlock._id];
        match.arenaPositionSettlement =
          {
            outcome:
              "UNCHANGED",
            referenceKey:
              settlementKey(
                match,
                "declined"
              ),
            challengerPositionAfter:
              match
                .challengerPositionBefore,
            defenderPositionAfter:
              match
                .defenderPositionBefore,
          };
        match.holdReason =
          reason;
        await match.save({
          session,
        });
        await createOutboxEvent({
          eventType:
            "TAKEOVER_CANCELLED",
          match,
          occurredAt:
            observedAt,
          payload: {
            settlementReason:
              "SERVER_CANCELLED",
          },
          session,
        });
        await reconcileCycle(
          cycle,
          session
        );
        return match;
      },
      suppliedSession
    );
  }

  async function startMatch(
    input
  ) {
    const matchId =
      requiredText(
        input?.matchId,
        "matchId",
        160
      );
    const participantUserId =
      objectId(
        input
          ?.participantUserId,
        "participantUserId"
      );
    const clientBuildVersion =
      requiredText(
        input
          ?.clientBuildVersion,
        "clientBuildVersion",
        100
      );
    idempotencyKey(
      input?.idempotencyKey
    );
    return runInTransaction(
      async (session) => {
        const match =
          await queryWithSession(
            RankTakeoverMatch
              .findOne({
                matchId,
              }),
            session
          );
        if (!match) {
          fail(
            "MATCH_NOT_FOUND",
            "Rank Takeover match does not exist",
            {
              statusCode: 404,
            }
          );
        }
        const role =
          participantRole(
            match,
            participantUserId
          );
        if (!role) {
          fail(
            "PARTICIPANT_ONLY_ACTION",
            "only a match participant can start",
            {
              statusCode: 403,
            }
          );
        }
        const timingFields =
          roleTimingFields(role);
        if (
          [
            "IN_PROGRESS",
            "SUBMITTED",
            "RESOLVED",
            "SETTLED",
          ].includes(
            match.status
          ) &&
          match[
            timingFields
              .startedAt
          ]
        ) {
          return match;
        }
        if (
          ![
            "READY",
            "IN_PROGRESS",
          ].includes(
            match.status
          )
        ) {
          fail(
            "MATCH_NOT_READY",
            `match cannot start from ${match.status}`,
            {
              statusCode: 409,
            }
          );
        }
        if (
          !match
            .challengerQuestionPackId ||
          !match
            .defenderQuestionPackId ||
          !match.questionVersion ||
          !match.answerKeyVersion ||
          !match
            .calibrationVersion ||
          !Number.isSafeInteger(
            match
              .timeLimitSeconds
          ) ||
          match
            .timeLimitSeconds <
            1
        ) {
          fail(
            "MATCH_QUESTION_PACK_NOT_READY",
            "match cannot start without sealed equivalent question packs",
            {
              statusCode: 409,
            }
          );
        }
        const observedAt =
          asDate(
            now(),
            "now"
            );
        if (
          observedAt >
          match.startsBy
        ) {
          fail(
            "MATCH_START_DEADLINE_PASSED",
            "match start deadline has passed",
            {
              statusCode: 409,
            }
          );
        }
        if (
          typeof ensureParticipantAttemptStarted !==
          "function"
        ) {
          policyPending(
            "PARTICIPANT_ATTEMPT_STARTER_UNAVAILABLE",
            "participant-specific timed attempt service is unavailable"
          );
        }
        const participantRoleName =
          role.toUpperCase();
        const questionPackId =
          role ===
          "challenger"
            ? match
                .challengerQuestionPackId
            : match
                .defenderQuestionPackId;
        let attempt;
        try {
          attempt =
            await ensureParticipantAttemptStarted({
              match,
              participantUserId,
              participantRole:
                participantRoleName,
              questionPackId,
              clientBuildVersion,
              observedAt,
              session,
            });
        } catch (error) {
          rethrowParticipantAttemptError(
            error
          );
        }
        if (
          !attempt ||
          typeof attempt !==
            "object" ||
          !attempt
            .attemptId ||
          attempt.matchId !==
            match.matchId ||
          attempt
            .participantRole !==
            participantRoleName ||
          !sameId(
            attempt
              .participantUserId,
            participantUserId
          ) ||
          !sameId(
            attempt
              .questionPackId,
            questionPackId
          ) ||
          Number(
            attempt
              .timeLimitSeconds
          ) !==
            match
              .timeLimitSeconds
        ) {
          fail(
            "PARTICIPANT_ATTEMPT_START_FAILED",
            "participant attempt service returned no authoritative sealed-pack attempt",
            {
              statusCode: 500,
            }
          );
        }
        const attemptStartedAt =
          asDate(
            attempt
              .startedAt,
            "attempt.startedAt"
          );
        const attemptEndsAt =
          asDate(
            attempt
              .endsAt,
            "attempt.endsAt"
          );
        const personalDeadline =
          new Date(
            Math.min(
              match.submitsBy
                .getTime(),
              attemptStartedAt
                .getTime() +
                match
                  .timeLimitSeconds *
                  1000
            )
          );
        if (
          attemptEndsAt
            .getTime() !==
          personalDeadline
            .getTime()
        ) {
          fail(
            "PARTICIPANT_ATTEMPT_TIMING_MISMATCH",
            "participant attempt deadline disagrees with the sealed match contract",
            {
              statusCode: 500,
            }
          );
        }
        match[
          timingFields
            .startedAt
        ] = attemptStartedAt;
        match[
          timingFields
            .deadlineAt
        ] = personalDeadline;
        if (
          !match.startedAt ||
          attemptStartedAt <
            match.startedAt
        ) {
          match.startedAt =
            attemptStartedAt;
        }
        // 매치 전이와 아웃박스는 **첫 입장 한 번**이다. 두 번째 참가자의
        // 개인 시작은 자기 타이밍 필드만 적는다 — 예전엔 role 을 멱등
        // 접미사로 써서 참가자마다 TAKEOVER_STARTED 가 발행됐고,
        // 구독자(피드·정산 트리거)가 같은 매치 시작을 두 번 봤다.
        const firstEntry =
          match.status ===
          "READY";
        if (firstEntry) {
          match.transitionTo(
            "IN_PROGRESS"
          );
        }
        await match.save({
          session,
        });
        if (firstEntry) {
          await createOutboxEvent({
            eventType:
              "TAKEOVER_STARTED",
            match,
            occurredAt:
              observedAt,
            payload: {
              role:
                participantRoleName,
              personalDeadlineAt:
                personalDeadline,
            },
            session,
          });
        }
        return match;
      },
      suppliedSession
    );
  }

  async function submitResult(
    input
  ) {
    const submission =
      normalizeParticipantSubmission(
        input
      );
    const {
      matchId,
      participantUserId,
      submissionId,
    } = submission;
    return runInTransaction(
      async (session) => {
        const match =
          await queryWithSession(
            RankTakeoverMatch
              .findOne({
                matchId,
              }),
            session
          );
        if (!match) {
          fail(
            "MATCH_NOT_FOUND",
            "Rank Takeover match does not exist",
            {
              statusCode: 404,
            }
          );
        }
        const role =
          participantRole(
            match,
            participantUserId
          );
        if (!role) {
          fail(
            "PARTICIPANT_ONLY_ACTION",
            "only a match participant can submit",
            {
              statusCode: 403,
            }
          );
        }
        const timingFields =
          roleTimingFields(role);
        const resultField =
          timingFields.result;
        const existingResult =
          match[resultField];
        if (existingResult) {
          if (
            existingResult
              .submissionId ===
            submissionId
          ) {
            return match;
          }
          fail(
            "SUBMISSION_ID_CONFLICT",
            "participant result is already persisted with different data",
            {
              statusCode: 409,
            }
          );
        }
        if (
          match.status !==
          "IN_PROGRESS"
        ) {
          fail(
            "MATCH_NOT_IN_PROGRESS",
            `match cannot accept a result from ${match.status}`,
            {
              statusCode: 409,
            }
          );
        }
        if (
          !match[
            timingFields
              .startedAt
          ] ||
          !match[
            timingFields
              .deadlineAt
          ]
        ) {
          fail(
            "PARTICIPANT_NOT_STARTED",
            "participant must start their own sealed pack before submitting",
            {
              statusCode: 409,
            }
          );
        }
        const observedAt =
          asDate(
            now(),
            "now"
          );
        if (
          typeof verifyScoredSubmission !==
          "function"
        ) {
          policyPending(
            "SCORING_VERIFIER_UNAVAILABLE",
            "trusted Arena submission loader and grader are not available"
          );
        }
        const scoredResult =
          normalizeScoredResult(
            await verifyScoredSubmission({
              match,
              role:
                role.toUpperCase(),
              participantUserId,
              submissionId,
              now:
                observedAt,
              session,
            })
          );
        if (
          scoredResult
            .submissionId !==
          submissionId
        ) {
          fail(
            "SCORING_SUBMISSION_MISMATCH",
            "trusted grader returned a different submission",
            {
              statusCode: 409,
            }
          );
        }
        const participantStartedAt =
          asDate(
            match[
              timingFields
                .startedAt
            ],
            `${role}StartedAt`
          );
        const participantDeadlineAt =
          asDate(
            match[
              timingFields
                .deadlineAt
            ],
            `${role}DeadlineAt`
          );
        if (
          scoredResult
            .submittedAt <
          participantStartedAt
        ) {
          fail(
            "MATCH_SUBMISSION_TIME_INVALID",
            "server-recorded submission precedes the participant start",
            {
              statusCode: 409,
            }
          );
        }
        if (
          scoredResult
            .submittedAt >
          observedAt
        ) {
          fail(
            "MATCH_SUBMISSION_TIME_INVALID",
            "server-recorded submission cannot be in the future",
            {
              statusCode: 409,
            }
          );
        }
        if (
          scoredResult
            .submittedAt >
          participantDeadlineAt
        ) {
          fail(
            "MATCH_SUBMISSION_DEADLINE_PASSED",
            "server-recorded submission is after the participant personal deadline",
            {
              statusCode: 409,
            }
          );
        }
        for (const field of [
          "questionVersion",
          "answerKeyVersion",
          "calibrationVersion",
        ]) {
          if (
            scoredResult[field] !==
            match[field]
          ) {
            fail(
              "SCORING_VERSION_MISMATCH",
              `${field} does not match the sealed match snapshot`,
              {
                statusCode: 409,
              }
            );
          }
        }
        match[resultField] = {
          submissionId:
            scoredResult
              .submissionId,
          calibratedScore:
            scoredResult
              .calibratedScore,
          advancedCorrectCount:
            scoredResult
              .advancedCorrectCount,
          correctAnswerActiveSolveTimeMs:
            scoredResult
              .correctAnswerActiveSolveTimeMs,
          integrityState:
            scoredResult
              .integrityState,
          questionVersion:
            scoredResult
              .questionVersion,
          answerKeyVersion:
            scoredResult
              .answerKeyVersion,
          calibrationVersion:
            scoredResult
              .calibrationVersion,
          payloadFingerprint:
            scoredResult
              .payloadFingerprint,
          submittedAt:
            scoredResult
              .submittedAt,
        };
        if (
          match.challengerResult &&
          match.defenderResult
        ) {
          match.transitionTo(
            "SUBMITTED"
          );
        }
        await match.save({
          session,
        });
        if (
          match.status ===
          "SUBMITTED"
        ) {
          await createOutboxEvent({
            eventType:
              "TAKEOVER_SUBMITTED",
            match,
            occurredAt:
              observedAt,
            session,
          });
        }
        return match;
      },
      suppliedSession
    );
  }

  async function resolveScoredMatch(
    input
  ) {
    const matchId =
      requiredText(
        input?.matchId,
        "matchId",
        160
      );
    idempotencyKey(
      input?.idempotencyKey
    );
    return runInTransaction(
      async (session) => {
        const match =
          await queryWithSession(
            RankTakeoverMatch
              .findOne({
                matchId,
              }),
            session
          );
        if (!match) {
          fail(
            "MATCH_NOT_FOUND",
            "Rank Takeover match does not exist",
            {
              statusCode: 404,
            }
          );
        }
        if (
          [
            "RESOLVED",
            "SETTLED",
          ].includes(
            match.status
          )
        ) {
          return match;
        }
        if (
          match.status !==
          "SUBMITTED"
        ) {
          fail(
            "MATCH_NOT_SUBMITTED",
            `match cannot resolve from ${match.status}`,
            {
              statusCode: 409,
            }
          );
        }
        if (
          match.integrityState !==
          "CLEAR"
        ) {
          fail(
            "MATCH_INTEGRITY_HELD",
            "held match cannot be resolved",
            {
              statusCode: 423,
            }
          );
        }
        let decision =
          compareScoredResults(
            match
              .challengerResult,
            match
              .defenderResult
          );
        if (!decision.winner) {
          const policy =
            await queryWithSession(
              PolicyVersion
                .findById(
                  match
                    .policyVersionId
                ),
              session
            );
          if (
            !policy ||
            !Number.isSafeInteger(
              policy
                .suddenDeathSecondsPerProblem
            )
          ) {
            policyPending(
              "SUDDEN_DEATH_TIMING_UNSET",
              "Sudden Death timing policy is not published"
            );
          }
          if (
            typeof resolveTieBreak !==
            "function"
          ) {
            policyPending(
              "SUDDEN_DEATH_RESOLVER_UNAVAILABLE",
              "Sudden Death result resolver is not available"
            );
          }
          decision =
            await resolveTieBreak({
              match,
              policy,
              session,
            });
          if (
            ![
              "CHALLENGER",
              "DEFENDER",
            ].includes(
              decision?.winner
            )
          ) {
            fail(
              "INVALID_TIEBREAK_RESULT",
              "trusted tie-break resolver returned no winner",
              {
                statusCode: 500,
              }
            );
          }
          decision = {
            winner:
              decision.winner,
            tieBreakStage:
              requiredText(
                decision
                  .tieBreakStage,
                "tieBreakStage",
                120
              ),
          };
        }
        const observedAt =
          asDate(
            now(),
            "now"
          );
        match.winner =
          decision.winner;
        match.tieBreakStage =
          decision
            .tieBreakStage;
        match.resolvedAt =
          observedAt;
        match.transitionTo(
          "RESOLVED"
        );
        await match.save({
          session,
        });
        await createOutboxEvent({
          eventType:
            "TAKEOVER_RESOLVED",
          match,
          occurredAt:
            observedAt,
          payload: {
            winner:
              decision.winner,
            tieBreakStage:
              decision
                .tieBreakStage,
          },
          session,
        });
        return match;
      },
      suppliedSession
    );
  }

  async function resolveNoShowMatch(
    input
  ) {
    const matchId =
      requiredText(
        input?.matchId,
        "matchId",
        160
      );
    idempotencyKey(
      input?.idempotencyKey
    );
    if (
      typeof resolveNoShowState !==
      "function"
    ) {
      policyPending(
        "NO_SHOW_TIMING_POLICY_UNAVAILABLE",
        "No-show timing and evidence policy is not available"
      );
    }
    return runInTransaction(
      async (session) => {
        const match =
          await queryWithSession(
            RankTakeoverMatch
              .findOne({
                matchId,
              }),
            session
          );
        if (!match) {
          fail(
            "MATCH_NOT_FOUND",
            "Rank Takeover match does not exist",
            {
              statusCode: 404,
            }
          );
        }
        if (
          [
            "RESOLVED",
            "SETTLED",
            "INVALID",
          ].includes(
            match.status
          )
        ) {
          return match;
        }
        if (
          ![
            "MATCHED",
            "READY",
            "IN_PROGRESS",
          ].includes(
            match.status
          )
        ) {
          fail(
            "MATCH_NOT_NO_SHOW_RESOLVABLE",
            `no-show cannot resolve from ${match.status}`,
            {
              statusCode: 409,
            }
          );
        }
        const observedAt =
          asDate(
            now(),
            "now"
          );
        if (
          observedAt <=
          match.submitsBy
        ) {
          fail(
            "NO_SHOW_DEADLINE_NOT_REACHED",
            "no-show cannot be resolved before the submission deadline",
            {
              statusCode: 409,
            }
          );
        }
        const policy =
          await queryWithSession(
            PolicyVersion
              .findById(
                match
                  .policyVersionId
              ),
            session
          );
        if (!policy) {
          fail(
            "POLICY_VERSION_NOT_FOUND",
            "match policy snapshot does not exist",
            {
              statusCode: 500,
            }
          );
        }
        const outcome =
          String(
            await resolveNoShowState({
              match,
              policy,
              now:
                observedAt,
              session,
            })
          ).toUpperCase();
        if (
          ![
            "CHALLENGER",
            "DEFENDER",
            "BOTH",
          ].includes(outcome)
        ) {
          fail(
            "INVALID_NO_SHOW_RESULT",
            "trusted no-show resolver returned an unsupported result",
            {
              statusCode: 500,
            }
          );
        }

        if (
          outcome ===
          "CHALLENGER"
        ) {
          if (
            typeof policy
              .noShowCountsAsCompletedChallenge !==
              "boolean"
          ) {
            policyPending(
              "NO_SHOW_COMPLETION_POLICY_UNSET",
              "challenger no-show completion policy is not published"
            );
          }
          if (
            typeof policy
              .noShowCountsAsDefenseWin !==
              "boolean"
          ) {
            policyPending(
              "NO_SHOW_DEFENSE_WIN_POLICY_UNSET",
              "challenger no-show defense-win policy is not published"
            );
          }
          match.transitionTo(
            "HELD"
          );
          match.transitionTo(
            "RESOLVED"
          );
          match.integrityState =
            "CLEAR";
          match.holdReason =
            null;
          match.winner =
            "DEFENDER";
          match.settlementReason =
            "CHALLENGER_NO_SHOW";
          match.resolvedAt =
            observedAt;
          await match.save({
            session,
          });
          await createOutboxEvent({
            eventType:
              "TAKEOVER_RESOLVED",
            match,
            occurredAt:
              observedAt,
            payload: {
              winner:
                "DEFENDER",
              settlementReason:
                "CHALLENGER_NO_SHOW",
            },
            session,
          });
          return match;
        }

        const challengerCycle =
          await queryWithSession(
            AccessCycle.findById(
              match
                .challengerCycleId
            ),
            session
          );
        if (!challengerCycle) {
          fail(
            "CHALLENGER_CYCLE_NOT_FOUND",
            "challenger cycle does not exist",
            {
              statusCode: 500,
            }
          );
        }
        const fields =
          balanceFieldsFor(
            match.activeRanking
          );
        const stakeDays =
          match
            .challengeCostSnapshot
            .stakeDays;
        if (
          challengerCycle[
            fields.locked
          ] <
          stakeDays
        ) {
          fail(
            "LOCKED_BALANCE_MISMATCH",
            "challenger locked balance is insufficient",
            {
              statusCode: 409,
            }
          );
        }
        await reconcileCycle(
          challengerCycle,
          session
        );
        const reason =
          outcome ===
          "DEFENDER"
            ? "DEFENDER_NO_SHOW"
            : "BOTH_NO_SHOW";
        const unlock =
          buildUnlockTransaction({
            match,
            occurredAt:
              observedAt,
            reasonCode:
              reason,
          });
        await unlock.save({
          session,
        });
        challengerCycle[
          fields.locked
        ] -= stakeDays;
        challengerCycle[
          fields.available
        ] += stakeDays;
        await challengerCycle.save({
          session,
        });

        match.transitionTo(
          "HELD"
        );
        match.transitionTo(
          "INVALID"
        );
        match.integrityState =
          "INVALID";
        match.holdReason =
          `${reason} confirmed by server evidence`;
        match.winner =
          null;
        match.resolvedAt =
          observedAt;
        match.settlementVersion =
          SETTLEMENT_VERSION;
        match.settlementReason =
          reason;
        match.settlementResult = {
          toDefenderAvailableDays:
            0,
          toSystemBurnDays: 0,
          toChallengerAvailableDays:
            stakeDays,
        };
        match.settlementTransactionIds =
          [unlock._id];
        match.arenaPositionSettlement =
          {
            outcome:
              "UNCHANGED",
            referenceKey:
              settlementKey(
                match,
                "no-show-invalid"
              ),
            challengerPositionAfter:
              match
                .challengerPositionBefore,
            defenderPositionAfter:
              match
                .defenderPositionBefore,
          };
        await match.save({
          session,
        });
        await createOutboxEvent({
          eventType:
            "TAKEOVER_SETTLED",
          match,
          occurredAt:
            observedAt,
          payload: {
            settlementReason:
              reason,
            finalStatus:
              "INVALID",
          },
          session,
        });
        await reconcileCycle(
          challengerCycle,
          session
        );
        return match;
      },
      suppliedSession
    );
  }

  async function settleResolvedMatch(
    input
  ) {
    const matchId =
      requiredText(
        input?.matchId,
        "matchId",
        160
      );
    const requestedVersion =
      input
        ?.settlementVersion ??
      SETTLEMENT_VERSION;
    if (
      requestedVersion !==
      SETTLEMENT_VERSION
    ) {
      fail(
        "UNSUPPORTED_SETTLEMENT_VERSION",
        `settlementVersion must be ${SETTLEMENT_VERSION}`,
        {
          statusCode: 409,
        }
      );
    }
    return runInTransaction(
      async (session) => {
        const match =
          await queryWithSession(
            RankTakeoverMatch
              .findOne({
                matchId,
              }),
            session
          );
        if (!match) {
          fail(
            "MATCH_NOT_FOUND",
            "Rank Takeover match does not exist",
            {
              statusCode: 404,
            }
          );
        }
        if (
          match.status ===
          "SETTLED"
        ) {
          if (
            match
              .settlementVersion !==
            requestedVersion
          ) {
            fail(
              "SETTLEMENT_VERSION_CONFLICT",
              "match was settled with another version",
              {
                statusCode: 409,
              }
            );
          }
          return match;
        }
        if (
          match.status !==
          "RESOLVED"
        ) {
          fail(
            "MATCH_NOT_RESOLVED",
            `match cannot settle from ${match.status}`,
            {
              statusCode: 409,
            }
          );
        }
        if (
          match.integrityState !==
          "CLEAR"
        ) {
          fail(
            "MATCH_INTEGRITY_HELD",
            "held match cannot settle",
            {
              statusCode: 423,
            }
          );
        }
        const observedAt =
          asDate(
            now(),
              "now"
            );
        const settlementPolicy =
          await queryWithSession(
            PolicyVersion
              .findById(
                match
                  .policyVersionId
              ),
            session
          );
        if (!settlementPolicy) {
          fail(
            "POLICY_VERSION_NOT_FOUND",
            "match policy snapshot does not exist",
            {
              statusCode: 500,
            }
          );
        }
        const protectionPolicy =
          normalizeProtectionPolicy(
            settlementPolicy,
            match
          );
        const settlementReason =
          match.settlementReason ||
          "SCORED_RESULT";
        let noShowPolicy =
          null;
        if (
          settlementReason ===
          "CHALLENGER_NO_SHOW"
        ) {
          noShowPolicy =
            settlementPolicy;
          if (
            !noShowPolicy ||
            typeof noShowPolicy
              .noShowCountsAsCompletedChallenge !==
              "boolean"
          ) {
            policyPending(
              "NO_SHOW_COMPLETION_POLICY_UNSET",
              "challenger no-show completion policy is not published"
            );
          }
          if (
            typeof noShowPolicy
              .noShowCountsAsDefenseWin !==
              "boolean"
          ) {
            policyPending(
              "NO_SHOW_DEFENSE_WIN_POLICY_UNSET",
              "challenger no-show defense-win policy is not published"
            );
          }
        } else if (
          settlementReason !==
          "SCORED_RESULT"
        ) {
          fail(
            "UNSUPPORTED_SETTLEMENT_REASON",
            `resolved match cannot settle with ${settlementReason}`,
            {
              statusCode: 409,
            }
          );
        }
        const challengerCycle =
          await activeCycleFor({
            userId:
              match
                .challengerUserId,
            ranking:
              match
                .activeRanking,
            session,
            forSettlement:
              true,
          });
        const defenderCycle =
          await activeCycleFor({
            userId:
              match
                .defenderUserId,
            ranking:
              match
                .activeRanking,
            session,
            forSettlement:
              true,
          });
        const challengerProfile =
          await arenaProfileFor({
            userId:
              match
                .challengerUserId,
            seasonId:
              match.seasonId,
            ranking:
              match
                .activeRanking,
            session,
          });
        const defenderProfile =
          await arenaProfileFor({
            userId:
              match
                .defenderUserId,
            seasonId:
              match.seasonId,
            ranking:
              match
                .activeRanking,
            session,
          });
        if (
          !sameId(
            challengerCycle._id,
            match
              .challengerCycleId
          ) ||
          !sameId(
            defenderCycle._id,
            match
              .defenderCycleId
          )
        ) {
          fail(
            "MATCH_CYCLE_CONFLICT",
            "participant active cycle changed after match lock",
            {
              statusCode: 409,
            }
          );
        }

        const fields =
          balanceFieldsFor(
            match.activeRanking
          );
        const stakeDays =
          match
            .challengeCostSnapshot
            .stakeDays;
        if (
          challengerCycle[
            fields.locked
          ] <
          stakeDays
        ) {
          fail(
            "LOCKED_BALANCE_MISMATCH",
            "challenger locked balance is insufficient",
            {
              statusCode: 409,
            }
          );
        }
        await reconcileCycle(
          challengerCycle,
          session
        );
        await reconcileCycle(
          defenderCycle,
          session
        );

        const plan =
          buildSettlementPlan(
            match
          );
        const transactions =
          buildSettlementTransactions({
            match,
            plan,
            occurredAt:
              observedAt,
          });
        if (
          transactions.length ===
          0
        ) {
          fail(
            "EMPTY_SETTLEMENT",
            "settlement must consume the locked stake",
            {
              statusCode: 500,
            }
          );
        }
        for (const transaction of
          transactions) {
          await transaction.save({
            session,
          });
        }

        challengerCycle[
          fields.locked
        ] -= stakeDays;
        if (
          plan
            .toDefenderAvailableDays >
          0
        ) {
          defenderCycle[
            fields.available
          ] +=
            plan
              .toDefenderAvailableDays;
        }
        if (
          match.activeRanking ===
          "SUB"
        ) {
          const countsAsCompleted =
            settlementReason ===
              "SCORED_RESULT" ||
            Boolean(
              noShowPolicy
                ?.noShowCountsAsCompletedChallenge
            );
          if (
            countsAsCompleted
          ) {
            if (
              match.matchType ===
              "NORMAL"
            ) {
              challengerCycle
                .completedSubNormalChallenges +=
                1;
            } else {
              challengerCycle
                .completedSubRevengeChallenges +=
                1;
            }
            challengerCycle
              .completedSubChallenges +=
              1;
          }
          if (
            match.winner ===
              "DEFENDER" &&
            (settlementReason ===
              "SCORED_RESULT" ||
              Boolean(
                noShowPolicy
                  ?.noShowCountsAsDefenseWin
              ))
          ) {
            defenderCycle
              .defenseWinsInCycle +=
              1;
          }
        }
        await challengerCycle.save({
          session,
        });
        await defenderCycle.save({
          session,
        });

        if (
          plan.positionOutcome ===
          "SWAPPED"
        ) {
          await swapArenaPositions({
            match,
            challengerProfile,
            defenderProfile,
            occurredAt:
              observedAt,
            protectionPolicy,
            session,
          });
        } else {
          await markArenaPositionsUnchanged({
            match,
            challengerProfile,
            defenderProfile,
            occurredAt:
              observedAt,
            protectionPolicy,
            session,
          });
        }

        match.settlementVersion =
          SETTLEMENT_VERSION;
        match.settlementReason =
          settlementReason;
        match.settlementResult = {
          toDefenderAvailableDays:
            plan
              .toDefenderAvailableDays,
          toSystemBurnDays:
            plan
              .toSystemBurnDays,
          toChallengerAvailableDays:
            0,
        };
        match.settlementTransactionIds =
          transactions.map(
            (transaction) =>
              transaction._id
          );
        match.arenaPositionSettlement =
          {
            outcome:
              plan
                .positionOutcome,
            referenceKey:
              settlementKey(
                match,
                plan
                  .positionOutcome ===
                  "SWAPPED"
                  ? "seat-swap"
                  : "seat-unchanged"
              ),
            challengerPositionAfter:
              plan
                .positionOutcome ===
              "SWAPPED"
                ? match
                    .defenderPositionBefore
                : match
                    .challengerPositionBefore,
            defenderPositionAfter:
              plan
                .positionOutcome ===
              "SWAPPED"
                ? match
                    .challengerPositionBefore
                : match
                    .defenderPositionBefore,
          };
        match.settledAt =
          observedAt;
        match.transitionTo(
          "SETTLED"
        );
        await match.save({
          session,
        });
        await createOutboxEvent({
          eventType:
            "TAKEOVER_SETTLED",
          match,
          occurredAt:
            observedAt,
          payload: {
            winner:
              match.winner,
            settlementVersion:
              SETTLEMENT_VERSION,
            positionOutcome:
              plan
                .positionOutcome,
          },
          session,
        });
        await reconcileCycle(
          challengerCycle,
          session
        );
        await reconcileCycle(
          defenderCycle,
          session
        );
        return match;
      },
      suppliedSession
    );
  }

  async function holdMatch(
    input
  ) {
    const matchId =
      requiredText(
        input?.matchId,
        "matchId",
        160
      );
    const reason =
      requiredText(
        input?.reason,
        "reason",
        500
      );
    idempotencyKey(
      input?.idempotencyKey
    );
    return runInTransaction(
      async (session) => {
        const match =
          await queryWithSession(
            RankTakeoverMatch
              .findOne({
                matchId,
              }),
            session
          );
        if (!match) {
          fail(
            "MATCH_NOT_FOUND",
            "Rank Takeover match does not exist",
            {
              statusCode: 404,
            }
          );
        }
        if (
          match.status ===
          "HELD"
        ) {
          return match;
        }
        if (
          !match.canTransitionTo(
            "HELD"
          )
        ) {
          fail(
            "MATCH_NOT_HOLDABLE",
            `match cannot be held from ${match.status}`,
            {
              statusCode: 409,
            }
          );
        }
        match.integrityState =
          "HELD";
        match.holdReason =
          reason;
        match.transitionTo(
          "HELD"
        );
        await match.save({
          session,
        });
        await createOutboxEvent({
          eventType:
            "TAKEOVER_HELD",
          match,
          occurredAt:
            asDate(
              now(),
              "now"
            ),
          payload: {
            integrityState:
              "HELD",
          },
          session,
        });
        return match;
      },
      suppliedSession
    );
  }

  async function resolveHeldMatch(
    input
  ) {
    const matchId =
      requiredText(
        input?.matchId,
        "matchId",
        160
      );
    const resolutionReference =
      requiredText(
        input
          ?.resolutionReference,
        "resolutionReference",
        180
      );
    idempotencyKey(
      input?.idempotencyKey
    );
    const actor =
      heldCommandActor(input);
    return runInTransaction(
      async (session) => {
        const match =
          await queryWithSession(
            RankTakeoverMatch
              .findOne({
                matchId,
              }),
            session
          );
        if (!match) {
          fail(
            "MATCH_NOT_FOUND",
            "Rank Takeover match does not exist",
            {
              statusCode: 404,
            }
          );
        }
        if (
          [
            "RESOLVED",
            "SETTLED",
          ].includes(
            match.status
          ) &&
          match
            .holdResolutionType ===
            "RESOLVED" &&
          match
            .holdResolutionReference ===
            resolutionReference
        ) {
          return match;
        }
        if (
          match.status !==
          "HELD"
        ) {
          fail(
            "MATCH_NOT_HELD",
            `held match cannot be resolved from ${match.status}`,
            {
              statusCode: 409,
            }
          );
        }
        await authorizeHeldCommand({
          actor,
          action:
            "RESOLVE_HELD_MATCH",
          match,
          session,
        });
        if (
          typeof resolveHeldOutcome !==
          "function"
        ) {
          policyPending(
            "HELD_RESOLUTION_AUTHORITY_UNAVAILABLE",
            "trusted held-match resolution loader is not available"
          );
        }
        const decision =
          normalizeHeldResolution(
            await resolveHeldOutcome({
              resolutionReference,
              match,
              actorType:
                actor.actorType,
              auditorUserId:
                actor
                  .actorUserId,
              session,
            }),
            resolutionReference
          );
        const observedAt =
          asDate(
            now(),
            "now"
          );
        match.winner =
          decision.winner;
        match.tieBreakStage =
          decision
            .tieBreakStage;
        match.settlementReason =
          "SCORED_RESULT";
        match.integrityState =
          "CLEAR";
        match.resolvedAt =
          observedAt;
        match.holdResolutionType =
          "RESOLVED";
        match.holdResolutionReference =
          decision
            .resolutionReference;
        match.holdResolutionReason =
          decision.reason;
        match.holdResolvedByType =
          actor.actorType;
        match.holdResolvedByUserId =
          actor.actorUserId;
        match.holdResolvedAt =
          observedAt;
        match.transitionTo(
          "RESOLVED"
        );
        await match.save({
          session,
        });
        await createOutboxEvent({
          eventType:
            "TAKEOVER_HOLD_RESOLVED",
          match,
          occurredAt:
            observedAt,
          payload: {
            winner:
              decision.winner,
            resolutionReference:
              decision
                .resolutionReference,
          },
          session,
        });
        return match;
      },
      suppliedSession
    );
  }

  async function invalidateHeldMatch(
    input
  ) {
    const matchId =
      requiredText(
        input?.matchId,
        "matchId",
        160
      );
    const resolutionReference =
      requiredText(
        input
          ?.resolutionReference,
        "resolutionReference",
        180
      );
    idempotencyKey(
      input?.idempotencyKey
    );
    const actor =
      heldCommandActor(input);
    return runInTransaction(
      async (session) => {
        const match =
          await queryWithSession(
            RankTakeoverMatch
              .findOne({
                matchId,
              }),
            session
          );
        if (!match) {
          fail(
            "MATCH_NOT_FOUND",
            "Rank Takeover match does not exist",
            {
              statusCode: 404,
            }
          );
        }
        if (
          match.status ===
            "INVALID" &&
          match
            .holdResolutionType ===
            "INVALIDATED" &&
          match
            .holdResolutionReference ===
            resolutionReference
        ) {
          return match;
        }
        if (
          match.status !==
          "HELD"
        ) {
          fail(
            "MATCH_NOT_HELD",
            `held match cannot be invalidated from ${match.status}`,
            {
              statusCode: 409,
            }
          );
        }
        await authorizeHeldCommand({
          actor,
          action:
            "INVALIDATE_HELD_MATCH",
          match,
          session,
        });
        if (
          typeof resolveHeldInvalidation !==
          "function"
        ) {
          policyPending(
            "HELD_INVALIDATION_AUTHORITY_UNAVAILABLE",
            "trusted held-match invalidation loader is not available"
          );
        }
        const invalidation =
          normalizeHeldInvalidation(
            await resolveHeldInvalidation({
              resolutionReference,
              match,
              actorType:
                actor.actorType,
              auditorUserId:
                actor
                  .actorUserId,
              session,
            }),
            resolutionReference
          );
        const observedAt =
          asDate(
            now(),
            "now"
          );
        const challengerCycle =
          await queryWithSession(
            AccessCycle.findById(
              match
                .challengerCycleId
            ),
            session
          );
        if (!challengerCycle) {
          fail(
            "CHALLENGER_CYCLE_NOT_FOUND",
            "challenger cycle does not exist",
            {
              statusCode: 500,
            }
          );
        }
        const fields =
          balanceFieldsFor(
            match.activeRanking
          );
        const stakeDays =
          match
            .challengeCostSnapshot
            .stakeDays;
        await reconcileCycle(
          challengerCycle,
          session
        );
        if (
          challengerCycle[
            fields.locked
          ] < stakeDays
        ) {
          fail(
            "LOCKED_BALANCE_MISMATCH",
            "challenger locked balance is insufficient",
            {
              statusCode: 409,
            }
          );
        }
        const unlock =
          buildUnlockTransaction({
            match,
            occurredAt:
              observedAt,
            reasonCode:
              invalidation
                .reasonCode,
          });
        await unlock.save({
          session,
        });
        challengerCycle[
          fields.locked
        ] -= stakeDays;
        challengerCycle[
          fields.available
        ] += stakeDays;
        await challengerCycle.save({
          session,
        });

        match.integrityState =
          "INVALID";
        match.winner = null;
        match.resolvedAt =
          observedAt;
        match.settlementVersion =
          SETTLEMENT_VERSION;
        match.settlementReason =
          invalidation
            .reasonCode;
        match.settlementResult = {
          toDefenderAvailableDays:
            0,
          toSystemBurnDays: 0,
          toChallengerAvailableDays:
            stakeDays,
        };
        match.settlementTransactionIds =
          [unlock._id];
        match.arenaPositionSettlement =
          {
            outcome:
              "UNCHANGED",
            referenceKey:
              settlementKey(
                match,
                "held-invalid"
              ),
            challengerPositionAfter:
              match
                .challengerPositionBefore,
            defenderPositionAfter:
              match
                .defenderPositionBefore,
          };
        match.holdResolutionType =
          "INVALIDATED";
        match.holdResolutionReference =
          invalidation
            .resolutionReference;
        match.holdResolutionReason =
          invalidation.reason;
        match.holdResolvedByType =
          actor.actorType;
        match.holdResolvedByUserId =
          actor.actorUserId;
        match.holdResolvedAt =
          observedAt;
        match.transitionTo(
          "INVALID"
        );
        await match.save({
          session,
        });
        await createOutboxEvent({
          eventType:
            "TAKEOVER_INVALIDATED",
          match,
          occurredAt:
            observedAt,
          payload: {
            settlementReason:
              invalidation
                .reasonCode,
            resolutionReference:
              invalidation
                .resolutionReference,
          },
          session,
        });
        await reconcileCycle(
          challengerCycle,
          session
        );
        return match;
      },
      suppliedSession
    );
  }

  const rawService =
    Object.freeze({
      acceptChallenge,
      holdMatch,
      invalidateHeldMatch,
      rejectChallenge,
      requestChallenge,
      resolveHeldMatch,
      resolveNoShowMatch,
      resolveScoredMatch,
      settleResolvedMatch,
      startMatch,
      submitResult,
    });

  if (skipCommandReceipts) {
    return rawService;
  }

  async function executeCommand({
    commandType,
    actor,
    commandKey,
    fingerprintPayload,
    work,
  }) {
    const normalizedKey =
      idempotencyKey(
        commandKey
      );
    const fingerprint =
      requestFingerprint(
        fingerprintPayload
      );
    const filter =
      receiptFilter({
        actorKey:
          actor.actorKey,
        commandType,
        commandKey:
          normalizedKey,
      });
    const observed =
      await findCommandReceipt(
        filter
      );
    if (observed) {
      return replayCommandReceipt({
        receipt:
          observed,
        fingerprint,
      });
    }

    try {
      return await runInTransaction(
        async (session) => {
          const concurrent =
            await findCommandReceipt(
              filter,
              session
            );
          if (concurrent) {
            return replayCommandReceipt({
              receipt:
                concurrent,
              fingerprint,
              session,
            });
          }
          const requestedAt =
            asDate(
              now(),
              "now"
            );
          const receipt =
            new RankTakeoverCommandReceipt({
              ...filter,
              actorType:
                actor
                  .actorType,
              actorUserId:
                actor
                  .actorUserId,
              requestFingerprint:
                fingerprint,
              status:
                "REQUESTED",
              requestedAt,
            });
          await receipt.save({
            session,
          });

          const scopedService =
            createRankTakeoverService({
              ...options,
              session,
              skipCommandReceipts:
                true,
            });
          const result =
            await work(
              scopedService
            );
          receipt.status =
            "COMPLETED";
          receipt
            .matchDocumentId =
            result._id;
          receipt.resultMatchId =
            result.matchId;
          receipt
            .resultMatchStatus =
            result.status;
          receipt.completedAt =
            asDate(
              now(),
              "now"
            );
          await receipt.save({
            session,
          });
          return result;
        },
        suppliedSession
      );
    } catch (error) {
      const afterFailure =
        await findCommandReceipt(
          filter
        );
      if (afterFailure) {
        return replayCommandReceipt({
          receipt:
            afterFailure,
          fingerprint,
        });
      }
      if (
        !(
          error instanceof
          RankTakeoverError
        )
      ) {
        throw error;
      }
      // The command transaction has rolled back at this point. Policy
      // publication, sealed-pack readiness and server failures can recover,
      // so caching them as FAILED would make the same durable client key
      // replay a stale failure forever.
      if (
        !shouldPersistCommandFailure(
          error
        )
      ) {
        throw error;
      }

      try {
        await runInTransaction(
          async (session) => {
            const concurrent =
              await findCommandReceipt(
                filter,
                session
              );
            if (concurrent) {
              assertReceiptFingerprint(
                concurrent,
                fingerprint
              );
              return;
            }
            const failedAt =
              asDate(
                now(),
                "now"
              );
            const failed =
              new RankTakeoverCommandReceipt({
                ...filter,
                actorType:
                  actor
                    .actorType,
                actorUserId:
                  actor
                    .actorUserId,
                requestFingerprint:
                  fingerprint,
                status:
                  "FAILED",
                errorCode:
                  error.code,
                errorMessage:
                  error.message,
                errorStatusCode:
                  error
                    .statusCode ||
                  409,
                errorDetails:
                  error.details ||
                  null,
                requestedAt:
                  failedAt,
                failedAt,
              });
            await failed.save({
              session,
            });
          }
        );
      } catch (
        receiptError
      ) {
        if (
          ![
            11000,
            11001,
          ].includes(
            receiptError?.code
          )
        ) {
          throw receiptError;
        }
      }
      const failedReceipt =
        await findCommandReceipt(
          filter
        );
      if (failedReceipt) {
        return replayCommandReceipt({
          receipt:
            failedReceipt,
          fingerprint,
        });
      }
      throw error;
    }
  }

  return Object.freeze({
    requestChallenge:
      (input) => {
        const actor =
          commandActor(
            input
              ?.challengerUserId
          );
        return executeCommand({
          commandType:
            "REQUEST_CHALLENGE",
          actor,
          commandKey:
            input
              ?.idempotencyKey,
          fingerprintPayload:
            {
              challengerUserId:
                String(
                  actor
                    .actorUserId
                ),
              activeRanking:
                normalizeRanking(
                  input
                    ?.activeRanking
                ),
              matchType:
                normalizeMatchType(
                  input
                    ?.matchType
                ),
              defenderUserId:
                input
                  ?.defenderUserId
                  ? String(
                      objectId(
                        input
                          .defenderUserId,
                        "defenderUserId"
                      )
                    )
                  : null,
              sourceMatchId:
                input
                  ?.sourceMatchId
                  ? requiredText(
                      input
                        .sourceMatchId,
                      "sourceMatchId",
                      160
                    )
                  : null,
            },
          work:
            (service) =>
              service
                .requestChallenge(
                  input
                ),
        });
      },
    acceptChallenge:
      (input) => {
        const actor =
          commandActor(
            input
              ?.defenderUserId
          );
        return executeCommand({
          commandType:
            "ACCEPT_CHALLENGE",
          actor,
          commandKey:
            input
              ?.idempotencyKey,
          fingerprintPayload:
            {
              matchId:
                requiredText(
                  input
                    ?.matchId,
                  "matchId",
                  160
                ),
              defenderUserId:
                String(
                  actor
                    .actorUserId
                ),
            },
          work:
            (service) =>
              service
                .acceptChallenge(
                  input
                ),
        });
      },
    rejectChallenge:
      (input) => {
        const actor =
          commandActor(
            input
              ?.defenderUserId
          );
        return executeCommand({
          commandType:
            "REJECT_CHALLENGE",
          actor,
          commandKey:
            input
              ?.idempotencyKey,
          fingerprintPayload:
            {
              matchId:
                requiredText(
                  input
                    ?.matchId,
                  "matchId",
                  160
                ),
              defenderUserId:
                String(
                  actor
                    .actorUserId
                ),
              reason:
                requiredText(
                  input?.reason,
                  "reason",
                  240
                ),
            },
          work:
            (service) =>
              service
                .rejectChallenge(
                  input
                ),
        });
      },
    startMatch:
      (input) => {
        const actor =
          commandActor(
            input
              ?.participantUserId
          );
        return executeCommand({
          commandType:
            "START_MATCH",
          actor,
          commandKey:
            input
              ?.idempotencyKey,
          fingerprintPayload:
            {
              matchId:
                requiredText(
                  input
                    ?.matchId,
                  "matchId",
                  160
                ),
              participantUserId:
                String(
                  actor
                    .actorUserId
                ),
              clientBuildVersion:
                requiredText(
                  input
                    ?.clientBuildVersion,
                  "clientBuildVersion",
                  100
                ),
            },
          work:
            (service) =>
              service
                .startMatch(
                  input
                ),
        });
      },
    submitResult:
      (input) => {
        const submission =
          normalizeParticipantSubmission(
            input
          );
        const actor =
          commandActor(
            submission
              .participantUserId
          );
        return executeCommand({
          commandType:
            "SUBMIT_RESULT",
          actor,
          commandKey:
            submission
              .submissionId,
          fingerprintPayload:
            {
              matchId:
                submission
                  .matchId,
              participantUserId:
                String(
                  actor
                    .actorUserId
                ),
              submissionId:
                submission
                  .submissionId,
            },
          work:
            (service) =>
              service
                .submitResult(
                  input
                ),
        });
      },
    resolveScoredMatch:
      (input) =>
        executeCommand({
          commandType:
            "RESOLVE_SCORED_MATCH",
          actor:
            commandActor(null),
          commandKey:
            input
              ?.idempotencyKey,
          fingerprintPayload:
            {
              matchId:
                requiredText(
                  input
                    ?.matchId,
                  "matchId",
                  160
                ),
            },
          work:
            (service) =>
              service
                .resolveScoredMatch(
                  input
                ),
        }),
    resolveNoShowMatch:
      (input) =>
        executeCommand({
          commandType:
            "RESOLVE_NO_SHOW",
          actor:
            commandActor(null),
          commandKey:
            input
              ?.idempotencyKey,
          fingerprintPayload:
            {
              matchId:
                requiredText(
                  input
                    ?.matchId,
                  "matchId",
                  160
                ),
            },
          work:
            (service) =>
              service
                .resolveNoShowMatch(
                  input
                ),
        }),
    settleResolvedMatch:
      (input) => {
        const version =
          input
            ?.settlementVersion ??
          SETTLEMENT_VERSION;
        const matchId =
          requiredText(
            input?.matchId,
            "matchId",
            160
          );
        return executeCommand({
          commandType:
            "SETTLE_MATCH",
          actor:
            commandActor(null),
          commandKey:
            `settle:${matchId}:v${version}`,
          fingerprintPayload:
            {
              matchId,
              settlementVersion:
                version,
            },
          work:
            (service) =>
              service
                .settleResolvedMatch(
                  input
                ),
        });
      },
    holdMatch:
      (input) =>
        executeCommand({
          commandType:
            "HOLD_MATCH",
          actor:
            commandActor(null),
          commandKey:
            input
              ?.idempotencyKey,
          fingerprintPayload:
            {
              matchId:
                requiredText(
                  input
                    ?.matchId,
                  "matchId",
                  160
                ),
              reason:
                requiredText(
                  input?.reason,
                  "reason",
                  500
                ),
            },
          work:
            (service) =>
              service
                .holdMatch(
                  input
                ),
        }),
    resolveHeldMatch:
      (input) => {
        const actor =
          heldCommandActor(
            input
          );
        return executeCommand({
          commandType:
            "RESOLVE_HELD_MATCH",
          actor,
          commandKey:
            input
              ?.idempotencyKey,
          fingerprintPayload:
            {
              matchId:
                requiredText(
                  input
                    ?.matchId,
                  "matchId",
                  160
                ),
              resolutionReference:
                requiredText(
                  input
                    ?.resolutionReference,
                  "resolutionReference",
                  180
                ),
              auditorUserId:
                actor
                  .actorUserId
                  ? String(
                      actor
                        .actorUserId
                    )
                  : null,
            },
          work:
            (service) =>
              service
                .resolveHeldMatch(
                  input
                ),
        });
      },
    invalidateHeldMatch:
      (input) => {
        const actor =
          heldCommandActor(
            input
          );
        return executeCommand({
          commandType:
            "INVALIDATE_HELD_MATCH",
          actor,
          commandKey:
            input
              ?.idempotencyKey,
          fingerprintPayload:
            {
              matchId:
                requiredText(
                  input
                    ?.matchId,
                  "matchId",
                  160
                ),
              resolutionReference:
                requiredText(
                  input
                    ?.resolutionReference,
                  "resolutionReference",
                  180
                ),
              auditorUserId:
                actor
                  .actorUserId
                  ? String(
                      actor
                        .actorUserId
                    )
                  : null,
            },
          work:
            (service) =>
              service
                .invalidateHeldMatch(
                  input
                ),
        });
      },
  });
}

const defaultService =
  createRankTakeoverService();

module.exports = {
  RankTakeoverError,
  SCORE_FIELDS,
  SETTLEMENT_VERSION,
  buildChallengeCostSnapshot,
  buildSettlementPlan,
  compareScoredResults,
  createRankTakeoverService,
  shouldPersistCommandFailure,
  ...defaultService,
};
