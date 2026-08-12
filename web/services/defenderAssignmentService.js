const crypto = require("crypto");
const mongoose = require("mongoose");

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
  DefenderAssignmentAudit,
} = require(
  "../models/defenderAssignmentAuditModel"
);
const {
  RankingProfile,
  User,
} = require(
  "../models/matthsModel"
);
const {
  PolicyVersion,
} = require(
  "../models/policyVersionModel"
);
const {
  ACTIVE_TAKEOVER_MATCH_STATUSES,
  RankTakeoverMatch,
} = require(
  "../models/rankTakeoverMatchModel"
);

const DAY_MS = 86_400_000;
const MAX_REQUEST_ID_LENGTH = 160;
const AUDIT_SCHEMA_VERSION = 1;

const SUB_DEFENDER_ASSIGNMENT_POLICY_FIELDS =
  Object.freeze({
    minHigherPositionGap:
      "subDefenderMinHigherPositionGap",
    maxHigherPositionGap:
      "subDefenderMaxHigherPositionGap",
    rankRangePolicyVersion:
      "subRankRangePolicyVersion",
    activityPolicyVersion:
      "recentActivityWeightVersion",
    settlementPolicyVersion:
      "settlementPolicyVersion",
    strongRelationPolicyVersion:
      "strongRelationPolicyVersion",
    integrityPolicyVersion:
      "integrityPolicyVersion",
  });

const FORBIDDEN_CLIENT_FIELDS =
  Object.freeze([
    "defenderUserId",
    "defenderId",
    "defenderPosition",
    "selectedDefenderUserId",
    "candidateUserIds",
    "candidatePositions",
    "stakeDays",
    "weight",
    "rawWeight",
    "probability",
    "selectionSeed",
    "randomSeed",
    "auditJitter",
  ]);

const ELIGIBILITY_CODE_BY_FIELD =
  Object.freeze({
    sameSeason:
      "DIFFERENT_SEASON",
    subRanking:
      "NOT_SUB_RANKING",
    activeSeat:
      "ARENA_SEAT_NOT_ACTIVE",
    higherPosition:
      "NOT_HIGHER_POSITION",
    inAllowedRankRange:
      "OUTSIDE_ALLOWED_RANK_RANGE",
    accountActive:
      "ACCOUNT_NOT_ACTIVE",
    placementComplete:
      "PLACEMENT_NOT_COMPLETE",
    activeSubCycle:
      "SUB_CYCLE_NOT_ACTIVE",
    samePolicyVersion:
      "POLICY_VERSION_MISMATCH",
    noActiveMatch:
      "ACTIVE_MATCH_EXISTS",
    notProtected:
      "POST_MATCH_PROTECTION_ACTIVE",
    notShielded:
      "RANK_SHIELD_ACTIVE",
    pairCooldownClear:
      "PAIR_COOLDOWN_ACTIVE",
    strongRelationClear:
      "STRONG_RELATION_BLOCKED",
    recentlyActive:
      "RECENT_ACTIVITY_REQUIRED",
    integrityClear:
      "INTEGRITY_HOLD",
    defenseRestClear:
      "DEFENSE_REST_ACTIVE",
    belowAssignmentCap:
      "ASSIGNMENT_CAP_REACHED",
    dailyAssignmentSlotOpen:
      "DAILY_ASSIGNMENT_CAP_REACHED",
    canSettleBeforeDeadline:
      "CANNOT_SETTLE_BEFORE_DEADLINE",
  });

class DefenderAssignmentError extends Error {
  constructor(
    code,
    message,
    {
      statusCode = 409,
      details = {},
      cause,
    } = {}
  ) {
    super(message, {
      cause,
    });
    this.name =
      "DefenderAssignmentError";
    this.code = code;
    this.statusCode =
      statusCode;
    this.details = details;
  }
}

function fail(
  code,
  message,
  options
) {
  throw new DefenderAssignmentError(
    code,
    message,
    options
  );
}

function policyPending(
  reasonCode,
  message,
  details = {}
) {
  fail(
    "POLICY_PENDING",
    message,
    {
      statusCode: 409,
      details: {
        reasonCode,
        ...details,
      },
    }
  );
}

function owns(object, key) {
  return Object.prototype
    .hasOwnProperty.call(
      object || {},
      key
    );
}

function objectId(
  value,
  fieldName
) {
  if (
    value instanceof
    mongoose.Types.ObjectId
  ) {
    return value;
  }
  if (
    typeof value !==
      "string" ||
    !mongoose.Types.ObjectId
      .isValid(value)
  ) {
    throw new TypeError(
      `${fieldName} must be a valid ObjectId`
    );
  }
  return new mongoose
    .Types.ObjectId(value);
}

function sameId(left, right) {
  return Boolean(
    left &&
      right &&
      String(left) ===
        String(right)
  );
}

function requiredText(
  value,
  fieldName,
  maxLength
) {
  const text = String(
    value || ""
  ).trim();
  if (
    !text ||
    text.length > maxLength
  ) {
    throw new TypeError(
      `${fieldName} is required and must be at most ${maxLength} characters`
    );
  }
  return text;
}

function requiredPolicyText(
  value,
  fieldName
) {
  const text = String(
    value || ""
  ).trim();
  if (
    !text ||
    text.length > 100
  ) {
    policyPending(
      `${fieldName
        .replace(
          /([a-z])([A-Z])/g,
          "$1_$2"
        )
        .toUpperCase()}_UNSET`,
      `${fieldName} is not published in the assignment policy`
    );
  }
  return text;
}

function asDate(
  value,
  fieldName
) {
  const date =
    value instanceof Date
      ? new Date(
          value.getTime()
        )
      : new Date(value);
  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new TypeError(
      `${fieldName} must be a valid date`
    );
  }
  return date;
}

function finiteNumber(
  value,
  fieldName,
  {
    min = null,
    max = null,
  } = {}
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    policyPending(
      `${fieldName
        .replace(
          /([a-z])([A-Z])/g,
          "$1_$2"
        )
        .toUpperCase()}_UNSET`,
      `${fieldName} is not published in the cycle policy`
    );
  }
  const number = Number(value);
  if (
    !Number.isFinite(number) ||
    (min !== null &&
      number < min) ||
    (max !== null &&
      number > max)
  ) {
    policyPending(
      `${fieldName
        .replace(
          /([a-z])([A-Z])/g,
          "$1_$2"
        )
        .toUpperCase()}_UNSET`,
      `${fieldName} is not published in the cycle policy`
    );
  }
  return number;
}

function nonNegativeInteger(
  value,
  fieldName
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    policyPending(
      `${fieldName
        .replace(
          /([a-z])([A-Z])/g,
          "$1_$2"
        )
        .toUpperCase()}_UNSET`,
      `${fieldName} is not published in the cycle policy`
    );
  }
  const number = Number(value);
  if (
    !Number.isSafeInteger(
      number
    ) ||
    number < 0
  ) {
    policyPending(
      `${fieldName
        .replace(
          /([a-z])([A-Z])/g,
          "$1_$2"
        )
        .toUpperCase()}_UNSET`,
      `${fieldName} is not published in the cycle policy`
    );
  }
  return number;
}

function positiveInteger(
  value,
  fieldName
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    policyPending(
      `${fieldName
        .replace(
          /([a-z])([A-Z])/g,
          "$1_$2"
        )
        .toUpperCase()}_UNSET`,
      `${fieldName} is not published in the cycle policy`
    );
  }
  const number = Number(value);
  if (
    !Number.isSafeInteger(
      number
    ) ||
    number < 1
  ) {
    policyPending(
      `${fieldName
        .replace(
          /([a-z])([A-Z])/g,
          "$1_$2"
        )
        .toUpperCase()}_UNSET`,
      `${fieldName} is not published in the cycle policy`
    );
  }
  return number;
}

function stableJson(value) {
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
      .map((item) =>
        stableJson(item)
      )
      .join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
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

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

function hmacHex(
  secret,
  value
) {
  return crypto
    .createHmac(
      "sha256",
      secret
    )
    .update(String(value))
    .digest("hex");
}

function uniformFromHex(hex) {
  // 13 hex digits are 52 bits and can be represented exactly by a JS Number.
  const numerator =
    Number.parseInt(
      hex.slice(0, 13),
      16
    );
  return (
    numerator /
    0x10000000000000
  );
}

function dateKeyKst(date) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);
  const values =
    Object.fromEntries(
      parts.map(
        ({ type, value }) => [
          type,
          value,
        ]
      )
    );
  return [
    values.year,
    values.month,
    values.day,
  ].join("-");
}

function queryWithSession(
  query,
  session
) {
  return query.session(session);
}

function assertTransaction(
  session
) {
  if (
    !session ||
    typeof session.inTransaction !==
      "function" ||
    !session.inTransaction()
  ) {
    fail(
      "ASSIGNMENT_TRANSACTION_REQUIRED",
      "defender assignment must run inside the challenge transaction",
      {
        statusCode: 500,
      }
    );
  }
}

function assertNoClientSelection(
  input
) {
  const forbidden =
    FORBIDDEN_CLIENT_FIELDS.filter(
      (field) =>
        owns(input, field)
    );
  if (forbidden.length > 0) {
    fail(
      "SUB_DEFENDER_SELECTION_FORBIDDEN",
      "Sub defender, position, stake, and weight are server-authoritative",
      {
        statusCode: 400,
        details: {
          forbiddenFields:
            forbidden,
        },
      }
    );
  }
}

function normalizeResolverPolicy(
  value,
  policy
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    policyPending(
      "ASSIGNMENT_POLICY_RESOLVER_INVALID",
      "Sub defender rank range and resolver policy versions are not published"
    );
  }
  if (
    !sameId(
      value.policyVersionId,
      policy._id
    )
  ) {
    policyPending(
      "ASSIGNMENT_POLICY_VERSION_MISMATCH",
      "assignment resolver policy does not match the cycle policy snapshot"
    );
  }

  const authoritativePolicy = {
    minHigherPositionGap:
      positiveInteger(
        policy[
          SUB_DEFENDER_ASSIGNMENT_POLICY_FIELDS
            .minHigherPositionGap
        ],
        SUB_DEFENDER_ASSIGNMENT_POLICY_FIELDS
          .minHigherPositionGap
      ),
    maxHigherPositionGap:
      positiveInteger(
        policy[
          SUB_DEFENDER_ASSIGNMENT_POLICY_FIELDS
            .maxHigherPositionGap
        ],
        SUB_DEFENDER_ASSIGNMENT_POLICY_FIELDS
          .maxHigherPositionGap
      ),
    rankRangePolicyVersion:
      requiredPolicyText(
        policy[
          SUB_DEFENDER_ASSIGNMENT_POLICY_FIELDS
            .rankRangePolicyVersion
        ],
        SUB_DEFENDER_ASSIGNMENT_POLICY_FIELDS
          .rankRangePolicyVersion
      ),
    activityPolicyVersion:
      requiredPolicyText(
        policy[
          SUB_DEFENDER_ASSIGNMENT_POLICY_FIELDS
            .activityPolicyVersion
        ],
        SUB_DEFENDER_ASSIGNMENT_POLICY_FIELDS
          .activityPolicyVersion
      ),
    settlementPolicyVersion:
      requiredPolicyText(
        policy[
          SUB_DEFENDER_ASSIGNMENT_POLICY_FIELDS
            .settlementPolicyVersion
        ],
        SUB_DEFENDER_ASSIGNMENT_POLICY_FIELDS
          .settlementPolicyVersion
      ),
    strongRelationPolicyVersion:
      requiredPolicyText(
        policy[
          SUB_DEFENDER_ASSIGNMENT_POLICY_FIELDS
            .strongRelationPolicyVersion
        ],
        SUB_DEFENDER_ASSIGNMENT_POLICY_FIELDS
          .strongRelationPolicyVersion
      ),
    integrityPolicyVersion:
      requiredPolicyText(
        policy[
          SUB_DEFENDER_ASSIGNMENT_POLICY_FIELDS
            .integrityPolicyVersion
        ],
        SUB_DEFENDER_ASSIGNMENT_POLICY_FIELDS
          .integrityPolicyVersion
      ),
  };
  if (
    authoritativePolicy
      .maxHigherPositionGap <
    authoritativePolicy
      .minHigherPositionGap
  ) {
    policyPending(
      "SUB_RANK_RANGE_INVALID",
      "Sub defender rank range is invalid"
    );
  }

  const resolverPolicy = {
    minHigherPositionGap:
      positiveInteger(
        value.minHigherPositionGap,
        "minHigherPositionGap"
      ),
    maxHigherPositionGap:
      positiveInteger(
        value.maxHigherPositionGap,
        "maxHigherPositionGap"
      ),
    rankRangePolicyVersion:
      requiredPolicyText(
        value
          .rankRangePolicyVersion,
        "rankRangePolicyVersion"
      ),
    activityPolicyVersion:
      requiredPolicyText(
        value
          .activityPolicyVersion,
        "activityPolicyVersion"
      ),
    settlementPolicyVersion:
      requiredPolicyText(
        value
          .settlementPolicyVersion,
        "settlementPolicyVersion"
      ),
    strongRelationPolicyVersion:
      requiredPolicyText(
        value
          .strongRelationPolicyVersion,
        "strongRelationPolicyVersion"
      ),
    integrityPolicyVersion:
      requiredPolicyText(
        value
          .integrityPolicyVersion,
        "integrityPolicyVersion"
      ),
  };
  const mismatchedField =
    Object.keys(
      authoritativePolicy
    ).find(
      (field) =>
        resolverPolicy[field] !==
        authoritativePolicy[field]
    );
  if (mismatchedField) {
    policyPending(
      "ASSIGNMENT_POLICY_FACT_MISMATCH",
      "assignment resolver facts do not match the published cycle policy snapshot",
      {
        field:
          mismatchedField,
      }
    );
  }

  return authoritativePolicy;
}

function normalizeActivity(
  value
) {
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.recentlyActive !==
      "boolean" ||
    !Number.isFinite(
      Number(
        value.multiplier
      )
    ) ||
    Number(
      value.multiplier
    ) < 0 ||
    Number(
      value.multiplier
    ) > 1
  ) {
    policyPending(
      "ACTIVITY_RESOLVER_INVALID",
      "defender activity eligibility and multiplier could not be resolved"
    );
  }
  return {
    recentlyActive:
      value.recentlyActive,
    multiplier: Number(
      value.multiplier
    ),
  };
}

function normalizeBooleanResult(
  value,
  fieldName,
  reasonCode
) {
  if (
    !value ||
    typeof value !== "object" ||
    typeof value[fieldName] !==
      "boolean"
  ) {
    policyPending(
      reasonCode,
      `${fieldName} resolver did not return an authoritative decision`
    );
  }
  return value[fieldName];
}

function assignmentPolicyFrom({
  policy,
  resolverPolicy,
}) {
  const alpha =
    finiteNumber(
      policy
        .defenseAssignmentAlpha,
      "defenseAssignmentAlpha",
      {
        min: 0,
      }
    );
  const targetDefenseGapHours =
    finiteNumber(
      policy
        .targetDefenseGapHours,
      "targetDefenseGapHours",
      {
        min:
          Number.MIN_VALUE,
      }
    );
  const auditJitterMin =
    finiteNumber(
      policy
        .deterministicAuditJitterMin,
      "deterministicAuditJitterMin",
      {
        min:
          Number.MIN_VALUE,
      }
    );
  const auditJitterMax =
    finiteNumber(
      policy
        .deterministicAuditJitterMax,
      "deterministicAuditJitterMax",
      {
        min:
          Number.MIN_VALUE,
      }
    );
  if (
    auditJitterMax <
    auditJitterMin
  ) {
    policyPending(
      "DETERMINISTIC_AUDIT_JITTER_RANGE_INVALID",
      "defender assignment jitter range is invalid"
    );
  }
  const defenseAssignmentCapOffset =
    nonNegativeInteger(
      policy
        .defenseAssignmentCapOffset,
      "defenseAssignmentCapOffset"
    );
  const maxDefenseAssignmentsPerDay =
    positiveInteger(
      policy
        .maxDefenseAssignmentsPerDay,
      "maxDefenseAssignmentsPerDay"
    );
  if (
    maxDefenseAssignmentsPerDay !==
    1
  ) {
    policyPending(
      "MAX_DAILY_DEFENSE_ASSIGNMENTS_UNSUPPORTED",
      "the authoritative Sub v1 daily defense assignment cap must be one"
    );
  }
  const sameOpponentCooldownDays =
    nonNegativeInteger(
      policy
        .sameOpponentCooldownDays,
      "sameOpponentCooldownDays"
    );

  return {
    alpha,
    targetDefenseGapHours,
    auditJitterMin,
    auditJitterMax,
    defenseAssignmentCapOffset,
    maxDefenseAssignmentsPerDay,
    sameOpponentCooldownDays,
    ...resolverPolicy,
  };
}

function exclusionCodesFor(
  eligibility
) {
  return Object.entries(
    eligibility
  )
    .filter(
      ([, passed]) =>
        !passed
    )
    .map(
      ([field]) =>
        ELIGIBILITY_CODE_BY_FIELD[
          field
        ]
    );
}

function buildAuditSnapshot(
  source
) {
  return {
    auditId: String(source._id),
    auditSchemaVersion:
      source.auditSchemaVersion,
    requestId:
      source.requestId,
    requestFingerprint:
      source.requestFingerprint,
    policyVersionId:
      String(
        source.policyVersionId
      ),
    policyVersion:
      source.policyVersion,
    seasonId:
      String(source.seasonId),
    status: source.status,
    assignmentDateKeyKst:
      source
        .assignmentDateKeyKst,
    selectionSeedHash:
      source
        .selectionSeedHash,
    candidateSnapshotHash:
      source
        .candidateSnapshotHash,
    selectionDraw:
      source.selectionDraw,
    selectedDefenderUserId:
      source
        .selectedDefenderUserId
        ? String(
            source
              .selectedDefenderUserId
          )
        : null,
    selectedDefenderCycleId:
      source
        .selectedDefenderCycleId
        ? String(
            source
              .selectedDefenderCycleId
          )
        : null,
    selectedDefenderPosition:
      source
        .selectedDefenderPosition ??
      null,
    selectedAt:
      new Date(
        source.selectedAt
      ).toISOString(),
  };
}

function returnValueFromAudit(
  source
) {
  return {
    userId:
      source
        .selectedDefenderUserId ||
      null,
    auditId: String(source._id),
    auditSnapshot:
      buildAuditSnapshot(source),
  };
}

/**
 * Creates the server-authoritative Sub NORMAL defender resolver.
 *
 * Every callback is mandatory and read-only. It receives the same MongoDB
 * transaction session as the Rank Takeover request:
 * - resolveAssignmentPolicy -> policyVersionId, min/max higher-position gap,
 *   and version labels for the rank, activity, settlement, relationship, and
 *   integrity policies.
 * - resolveStrongRelation -> { blocked: boolean }. It must evaluate device,
 *   network, payment, and other collusion links without returning raw signals.
 * - resolveActivity -> { recentlyActive: boolean, multiplier: 0..1 }.
 * - resolveIntegrity -> { clear: boolean } for every participant.
 * - resolveSettlementEligibility -> { canSettle: boolean } using both cycle
 *   deadlines, the season end, and the published match-duration policy.
 *
 * This resolver deliberately does not increment defense counters. The caller
 * (`rankTakeoverService`) revalidates the selected user, locks the stake,
 * increments the defender cycle, saves the match and outbox event, and commits
 * this audit in one transaction.
 */
function createDefenderAssignmentService(
  options = {}
) {
  const seedSecret =
    typeof options.seedSecret ===
      "string"
      ? options.seedSecret
      : "";
  const resolveAssignmentPolicy =
    options
      .resolveAssignmentPolicy;
  const resolveStrongRelation =
    options
      .resolveStrongRelation;
  const resolveActivity =
    options.resolveActivity;
  const resolveIntegrity =
    options.resolveIntegrity;
  const resolveSettlementEligibility =
    options
      .resolveSettlementEligibility;
  // Main Shop 방어 휴식권 (docs/logic/12_SHOP.md §5.2·§5.3): 효과가 살아
  // 있는 사용자는 앞으로의 의무 방어 후보 풀에서만 제외한다. 이미 성립한
  // 경기·예치에는 소급하지 않는다. 기본 구현은 상점 서비스의 벌크 조회다.
  const resolveDefenseRestUserIds =
    typeof options.resolveDefenseRestUserIds ===
    "function"
      ? options
          .resolveDefenseRestUserIds
      : ({
          userIds,
          now,
          session,
        }) =>
          require("./arenaShopPolicyService")
            .listActiveMainDefenseRestUserIds(
              {
                userIds,
                now,
                session,
              }
            );

  async function selectSubDefender(
    input = {}
  ) {
    assertNoClientSelection(
      input
    );
    const session =
      input.session;
    assertTransaction(session);

    const requestId =
      requiredText(
        input.requestId,
        "requestId",
        MAX_REQUEST_ID_LENGTH
      );
    const challengerUserId =
      objectId(
        input
          .challengerUserId,
        "challengerUserId"
      );
    const challengerCycleId =
      objectId(
        input
          .challengerCycle?._id ||
          input
            .challengerCycleId,
        "challengerCycleId"
      );
    const challengerProfileId =
      objectId(
        input
          .challengerProfile?._id ||
          input
            .challengerProfileId,
        "challengerProfileId"
      );
    const seasonId =
      objectId(
        input.season?._id ||
          input.seasonId,
        "seasonId"
      );
    const suppliedPolicyId =
      objectId(
        input.policy?._id ||
          input.policyVersionId,
        "policyVersionId"
      );
    const observedAt =
      asDate(
        input.now ||
          new Date(),
        "now"
      );

    if (!seedSecret) {
      policyPending(
        "ASSIGNMENT_SEED_SECRET_UNAVAILABLE",
        "server-side defender assignment seed is not configured"
      );
    }
    if (
      Buffer.byteLength(
        seedSecret,
        "utf8"
      ) < 32
    ) {
      policyPending(
        "ASSIGNMENT_SEED_SECRET_WEAK",
        "server-side defender assignment seed secret must be at least 32 bytes"
      );
    }
    for (const [
      resolver,
      reasonCode,
      message,
    ] of [
      [
        resolveAssignmentPolicy,
        "ASSIGNMENT_POLICY_RESOLVER_UNAVAILABLE",
        "Sub rank range and assignment resolver versions are not published",
      ],
      [
        resolveStrongRelation,
        "STRONG_RELATION_RESOLVER_UNAVAILABLE",
        "device, IP, and payment relation screening is not available",
      ],
      [
        resolveActivity,
        "ACTIVITY_RESOLVER_UNAVAILABLE",
        "recent activity eligibility is not available",
      ],
      [
        resolveIntegrity,
        "INTEGRITY_RESOLVER_UNAVAILABLE",
        "unresolved integrity hold screening is not available",
      ],
      [
        resolveSettlementEligibility,
        "SETTLEMENT_ELIGIBILITY_RESOLVER_UNAVAILABLE",
        "cycle and season settlement deadline screening is not available",
      ],
    ]) {
      if (
        typeof resolver !==
        "function"
      ) {
        policyPending(
          reasonCode,
          message
        );
      }
    }

    // MongoDB transactions do not support parallel operations on one session.
    const season =
      await queryWithSession(
        ArenaSeason.findById(
          seasonId
        ),
        session
      );
    const policy =
      await queryWithSession(
        PolicyVersion.findById(
          suppliedPolicyId
        ),
        session
      );
    const challengerCycle =
      await queryWithSession(
        AccessCycle.findById(
          challengerCycleId
        ),
        session
      );
    const challengerProfile =
      await queryWithSession(
        ArenaProfile.findById(
          challengerProfileId
        ),
        session
      );
    const challengerUser =
      await queryWithSession(
        User.findById(
          challengerUserId
        ),
        session
      );
    const challengerSkill =
      await queryWithSession(
        RankingProfile.findOne({
          userId:
            challengerUserId,
          datasetOnly: {
            $ne: true,
          },
        }),
        session
      );

    if (
      !season ||
      season.status !== "ACTIVE" ||
      season.reseedStatus ===
        "RUNNING" ||
      season.startsAt >
        observedAt ||
      season.endsAt <=
        observedAt
    ) {
      fail(
        "ACTIVE_ARENA_SEASON_REQUIRED",
        "an active, non-reseeding Arena season is required"
      );
    }
    if (!policy) {
      fail(
        "POLICY_VERSION_NOT_FOUND",
        "Arena assignment policy snapshot does not exist",
        {
          statusCode: 500,
        }
      );
    }
    if (
      !sameId(
        season.policyVersionId,
        policy._id
      ) ||
      !sameId(
        challengerCycle
          ?.policyVersionId,
        policy._id
      )
    ) {
      fail(
        "POLICY_VERSION_MISMATCH",
        "season and challenger cycle must share one fixed policy version"
      );
    }
    if (
      !challengerUser ||
      challengerUser
        .accountStatus !==
        "active" ||
      challengerUser.isActive ===
        false
    ) {
      fail(
        "CHALLENGER_ACCOUNT_NOT_ACTIVE",
        "challenger account is not active",
        {
          statusCode: 403,
        }
      );
    }
    if (
      !challengerSkill ||
      !challengerSkill
        .placementAttemptId
    ) {
      fail(
        "CHALLENGER_PLACEMENT_REQUIRED",
        "challenger needs a completed Placement and RankingProfile",
        {
          statusCode: 403,
        }
      );
    }
    if (
      !challengerCycle ||
      !sameId(
        challengerCycle.userId,
        challengerUserId
      ) ||
      challengerCycle.status !==
        "SUB_ACTIVE" ||
      challengerCycle
        .activeRanking !== "SUB" ||
      challengerCycle
        .integrityState !== "CLEAR"
    ) {
      fail(
        "CHALLENGER_SUB_CYCLE_NOT_ELIGIBLE",
        "challenger needs a clear, active Sub cycle",
        {
          statusCode: 403,
        }
      );
    }
    if (
      !challengerProfile ||
      !sameId(
        challengerProfile.userId,
        challengerUserId
      ) ||
      !sameId(
        challengerProfile
          .seasonId,
        season._id
      ) ||
      challengerProfile
        .activeRanking !== "SUB" ||
      challengerProfile.status !==
        "ACTIVE" ||
      !Number.isSafeInteger(
        challengerProfile
          .arenaPosition
      )
    ) {
      fail(
        "CHALLENGER_ACTIVE_SUB_SEAT_REQUIRED",
        "challenger needs an active Sub Arena seat",
        {
          statusCode: 403,
        }
      );
    }

    const activeChallengerMatch =
      await queryWithSession(
        RankTakeoverMatch.findOne({
          participantUserIds:
            challengerUserId,
          status: {
            $in:
              ACTIVE_TAKEOVER_MATCH_STATUSES,
          },
        })
          .select("_id")
          .lean(),
        session
      );
    if (
      activeChallengerMatch
    ) {
      fail(
        "CHALLENGER_ACTIVE_MATCH_EXISTS",
        "challenger already has an active match"
      );
    }
    const challengerIntegrityClear =
      normalizeBooleanResult(
        await resolveIntegrity({
          candidateUserId:
            challengerUserId,
          candidateCycle:
            challengerCycle,
          candidateProfile:
            challengerProfile,
          policy,
          season,
          now: observedAt,
          session,
          participantRole:
            "CHALLENGER",
        }),
        "clear",
        "INTEGRITY_RESOLVER_INVALID"
      );
    if (
      !challengerIntegrityClear
    ) {
      fail(
        "CHALLENGER_INTEGRITY_HELD",
        "challenger has an unresolved Arena integrity hold",
        {
          statusCode: 423,
        }
      );
    }

    const requestFingerprint =
      sha256(
        stableJson({
          requestId,
          challengerUserId:
            String(
              challengerUserId
            ),
          challengerCycleId:
            String(
              challengerCycle._id
            ),
          challengerProfileId:
            String(
              challengerProfile._id
            ),
          seasonId:
            String(season._id),
          policyVersionId:
            String(policy._id),
          assignmentType:
            "SUB_NORMAL_WEIGHTED",
        })
      );
    // 멱등 범위는 **{challengerUserId, requestId}** 다 — 저장 unique 인덱스와
    // 같은 스코프(신형 계약: 서로 다른 도전자는 같은 requestId 를 독립적으로
    // 쓸 수 있다). 같은 도전자의 입력 변조는 아래 지문(requestFingerprint)
    // 대조가 IDEMPOTENCY_KEY_CONFLICT 로 잡는다.
    const existingAudit =
      await queryWithSession(
        DefenderAssignmentAudit
          .findOne({
            challengerUserId,
            requestId,
          })
          .lean(),
        session
      );
    if (existingAudit) {
      if (
        existingAudit
          .requestFingerprint !==
        requestFingerprint
      ) {
        fail(
          "IDEMPOTENCY_KEY_CONFLICT",
          "assignment request id was used for different inputs",
          {
            statusCode: 409,
          }
        );
      }
      return returnValueFromAudit(
        existingAudit
      );
    }

    const resolverPolicy =
      normalizeResolverPolicy(
        await resolveAssignmentPolicy({
          policy,
          season,
          challengerCycle,
          challengerProfile,
          now: observedAt,
          session,
        }),
        policy
      );
    const assignmentPolicy =
      assignmentPolicyFrom({
        policy,
        resolverPolicy,
      });
    const minimumPosition =
      Math.max(
        1,
        challengerProfile
          .arenaPosition -
          assignmentPolicy
            .maxHigherPositionGap
      );
    const maximumPosition =
      challengerProfile
        .arenaPosition -
      assignmentPolicy
        .minHigherPositionGap;

    const candidateProfiles =
      maximumPosition <
      minimumPosition
        ? []
        : await queryWithSession(
            ArenaProfile.find({
              seasonId:
                season._id,
              activeRanking: "SUB",
              arenaPosition: {
                $gte:
                  minimumPosition,
                $lte:
                  maximumPosition,
              },
              userId: {
                $ne:
                  challengerUserId,
              },
            })
              .sort({
                arenaPosition: 1,
                userId: 1,
              })
              .lean(),
            session
          );
    const candidateUserIds =
      candidateProfiles.map(
        (profile) =>
          profile.userId
      );

    let users = [];
    let skills = [];
    let cycles = [];
    let activeMatches = [];
    let recentPairMatches = [];
    let dailyDefenseMatches =
      [];
    let usersInDefenseRest =
      new Set();
    if (
      candidateUserIds.length >
      0
    ) {
      users =
        await queryWithSession(
          User.find({
            _id: {
              $in:
                candidateUserIds,
            },
          }).lean(),
          session
        );
      skills =
        await queryWithSession(
          RankingProfile.find({
            userId: {
              $in:
                candidateUserIds,
            },
            datasetOnly: {
              $ne: true,
            },
          }).lean(),
          session
        );
      cycles =
        await queryWithSession(
          AccessCycle.find({
            userId: {
              $in:
                candidateUserIds,
            },
            activeRanking:
              "SUB",
          }).lean(),
          session
        );
      activeMatches =
        await queryWithSession(
          RankTakeoverMatch.find({
            participantUserIds: {
              $in:
                candidateUserIds,
            },
            status: {
              $in:
                ACTIVE_TAKEOVER_MATCH_STATUSES,
            },
          })
            .select(
              "participantUserIds"
            )
            .lean(),
          session
        );
      const todayKst =
        dateKeyKst(
          observedAt
        );
      const todayStart =
        new Date(
          `${todayKst}T00:00:00+09:00`
        );
      const todayEnd =
        new Date(
          todayStart.getTime() +
            DAY_MS
        );
      dailyDefenseMatches =
        await queryWithSession(
          RankTakeoverMatch.find({
            defenderUserId: {
              $in:
                candidateUserIds,
            },
            matchedAt: {
              $gte:
                todayStart,
              $lt:
                todayEnd,
            },
          })
            .select(
              "defenderUserId"
            )
            .lean(),
          session
        );
      // 방어 휴식권 효과가 살아 있는 후보를 벌크로 판별한다 (§5.2).
      const restingUserIds =
        await resolveDefenseRestUserIds(
          {
            userIds:
              candidateUserIds,
            now: observedAt,
            session,
          }
        );
      usersInDefenseRest =
        restingUserIds instanceof
        Set
          ? new Set(
              [
                ...restingUserIds,
              ].map((value) =>
                String(value)
              )
            )
          : new Set(
              [
                ...(restingUserIds ||
                  []),
              ].map((value) =>
                String(value)
              )
            );
      if (
        assignmentPolicy
          .sameOpponentCooldownDays >
        0
      ) {
        recentPairMatches =
          await queryWithSession(
            RankTakeoverMatch.find({
              seasonId:
                season._id,
              participantUserIds:
                challengerUserId,
              status: {
                $ne:
                  "CANCELLED",
              },
              matchedAt: {
                $gte:
                  new Date(
                    observedAt.getTime() -
                      assignmentPolicy
                        .sameOpponentCooldownDays *
                        DAY_MS
                  ),
              },
            })
              .select(
                "participantUserIds"
              )
              .lean(),
            session
          );
      }
    }

    const userById = new Map(
      users.map((user) => [
        String(user._id),
        user,
      ])
    );
    const skillByUserId =
      new Map(
        skills.map((skill) => [
          String(skill.userId),
          skill,
        ])
      );
    const activeCycleByUserId =
      new Map();
    for (const cycle of cycles) {
      const key = String(
        cycle.userId
      );
      const current =
        activeCycleByUserId.get(
          key
        );
      if (
        !current ||
        (cycle.status ===
          "SUB_ACTIVE" &&
          current.status !==
            "SUB_ACTIVE")
      ) {
        activeCycleByUserId.set(
          key,
          cycle
        );
      }
    }
    const usersWithActiveMatch =
      new Set();
    for (const match of activeMatches) {
      for (const userId of
        match.participantUserIds ||
        []) {
        usersWithActiveMatch.add(
          String(userId)
        );
      }
    }
    const usersInPairCooldown =
      new Set();
    for (const match of
      recentPairMatches) {
      for (const userId of
        match.participantUserIds ||
        []) {
        if (
          !sameId(
            userId,
            challengerUserId
          )
        ) {
          usersInPairCooldown.add(
            String(userId)
          );
        }
      }
    }
    const usersAssignedToday =
      new Set(
        dailyDefenseMatches.map(
          (match) =>
            String(
              match
                .defenderUserId
            )
        )
      );

    const selectionSeed =
      hmacHex(
        seedSecret,
        stableJson({
          purpose:
            "SUB_DEFENDER_ASSIGNMENT_V1",
          requestId,
          policyVersionId:
            String(policy._id),
          policyVersion:
            policy.version,
          seasonId:
            String(season._id),
          challengerUserId:
            String(
              challengerUserId
            ),
          challengerCycleId:
            String(
              challengerCycle._id
            ),
        })
      );
    const selectionSeedHash =
      sha256(selectionSeed);
    const todayKst =
      dateKeyKst(observedAt);
    const candidates = [];

    // MongoDB sessions do not support parallel operations in one transaction.
    for (const profile of
      candidateProfiles) {
      const candidateUserId =
        profile.userId;
      const candidateKey =
        String(
          candidateUserId
        );
      const user =
        userById.get(
          candidateKey
        );
      const skill =
        skillByUserId.get(
          candidateKey
        );
      const cycle =
        activeCycleByUserId.get(
          candidateKey
        );
      const positionGap =
        challengerProfile
          .arenaPosition -
        profile.arenaPosition;

      const relation =
        await resolveStrongRelation({
          challengerUserId,
          candidateUserId,
          policy,
          season,
          challengerCycle,
          candidateCycle:
            cycle || null,
          now: observedAt,
          session,
        });
      const relationBlocked =
        normalizeBooleanResult(
          relation,
          "blocked",
          "STRONG_RELATION_RESOLVER_INVALID"
        );
      const activity =
        normalizeActivity(
          await resolveActivity({
            candidateUserId,
            candidateUser:
              user || null,
            candidateCycle:
              cycle || null,
            candidateProfile:
              profile,
            policy,
            season,
            now: observedAt,
            session,
          })
        );
      const integrityClear =
        cycle &&
        cycle.integrityState ===
          "CLEAR"
          ? normalizeBooleanResult(
              await resolveIntegrity({
                candidateUserId,
                candidateCycle:
                  cycle,
                candidateProfile:
                  profile,
                policy,
                season,
                now:
                  observedAt,
                session,
              }),
              "clear",
              "INTEGRITY_RESOLVER_INVALID"
            )
          : false;
      const canSettle =
        cycle
          ? normalizeBooleanResult(
              await resolveSettlementEligibility(
                {
                  challengerCycle,
                  candidateCycle:
                    cycle,
                  candidateUserId,
                  candidateProfile:
                    profile,
                  policy,
                  season,
                  now:
                    observedAt,
                  session,
                }
              ),
              "canSettle",
              "SETTLEMENT_ELIGIBILITY_RESOLVER_INVALID"
            )
          : false;

      const completedSubChallenges =
        Number.isSafeInteger(
          cycle
            ?.completedSubChallenges
        )
          ? cycle
              .completedSubChallenges
          : 0;
      const defenseAssignmentsInCycle =
        Number.isSafeInteger(
          cycle
            ?.defenseAssignmentsInCycle
        )
          ? cycle
              .defenseAssignmentsInCycle
          : 0;
      const assignmentCap =
        completedSubChallenges +
        assignmentPolicy
          .defenseAssignmentCapOffset;
      const lastDefenseAssignedAt =
        cycle
          ?.lastDefenseAssignedAt
          ? new Date(
              cycle
                .lastDefenseAssignedAt
            )
          : null;
      const assignedToday =
        Boolean(
          usersAssignedToday.has(
            candidateKey
          ) ||
            (lastDefenseAssignedAt &&
              dateKeyKst(
                lastDefenseAssignedAt
              ) === todayKst)
        );
      const protectionActive =
        Boolean(
          profile
            .protectionUntil &&
            new Date(
              profile
                .protectionUntil
            ) > observedAt
        );
      const shieldActive =
        Boolean(
          profile
            .rankShieldUntil &&
            new Date(
              profile
                .rankShieldUntil
            ) > observedAt
        );
      const eligibility = {
        sameSeason:
          sameId(
            profile.seasonId,
            season._id
          ),
        subRanking:
          profile
            .activeRanking ===
          "SUB",
        activeSeat:
          profile.status ===
            "ACTIVE" &&
          Number.isSafeInteger(
            profile
              .arenaPosition
          ),
        higherPosition:
          profile
            .arenaPosition <
          challengerProfile
            .arenaPosition,
        inAllowedRankRange:
          positionGap >=
            assignmentPolicy
              .minHigherPositionGap &&
          positionGap <=
            assignmentPolicy
              .maxHigherPositionGap,
        accountActive:
          Boolean(
            user &&
              user.accountStatus ===
                "active" &&
              user.isActive !==
                false
          ),
        placementComplete:
          Boolean(
            skill &&
              skill
                .placementAttemptId
          ),
        activeSubCycle:
          Boolean(
            cycle &&
              cycle.status ===
                "SUB_ACTIVE" &&
              cycle
                .activeRanking ===
                "SUB"
          ),
        samePolicyVersion:
          Boolean(
            cycle &&
              sameId(
                cycle
                  .policyVersionId,
                policy._id
              )
          ),
        noActiveMatch:
          !usersWithActiveMatch.has(
            candidateKey
          ),
        notProtected:
          !protectionActive,
        notShielded:
          !shieldActive,
        pairCooldownClear:
          !usersInPairCooldown.has(
            candidateKey
          ),
        strongRelationClear:
          !relationBlocked,
        recentlyActive:
          activity
            .recentlyActive,
        integrityClear:
          Boolean(
            cycle &&
              cycle
                .integrityState ===
                "CLEAR" &&
              integrityClear
          ),
        // 방어 휴식권 (docs/logic/12_SHOP.md §5.2) — 효과 시간 동안
        // 새 의무 방어 후보에서 제외.
        defenseRestClear:
          !usersInDefenseRest.has(
            candidateKey
          ),
        belowAssignmentCap:
          Boolean(
            cycle &&
              defenseAssignmentsInCycle <
                assignmentCap
          ),
        dailyAssignmentSlotOpen:
          !assignedToday,
        canSettleBeforeDeadline:
          Boolean(canSettle),
      };
      const eligible =
        Object.values(
          eligibility
        ).every(Boolean);
      const hoursSinceLastDefense =
        lastDefenseAssignedAt
          ? Math.max(
              0,
              observedAt.getTime() -
                lastDefenseAssignedAt.getTime()
            ) /
            3_600_000
          : Number.POSITIVE_INFINITY;
      const assignmentBalance =
        1 /
        Math.pow(
          1 +
            defenseAssignmentsInCycle,
          assignmentPolicy.alpha
        );
      const recency =
        Number.isFinite(
          hoursSinceLastDefense
        )
          ? Math.min(
              1,
              hoursSinceLastDefense /
                assignmentPolicy
                  .targetDefenseGapHours
            )
          : 1;
      const jitterUnit =
        uniformFromHex(
          hmacHex(
            selectionSeed,
            [
              requestId,
              candidateKey,
              policy.version,
              "AUDIT_JITTER",
            ].join("|")
          )
        );
      const auditJitter =
        assignmentPolicy
          .auditJitterMin +
        (assignmentPolicy
          .auditJitterMax -
          assignmentPolicy
            .auditJitterMin) *
          jitterUnit;
      const rawWeight =
        eligible
          ? assignmentBalance *
            recency *
            activity.multiplier *
            auditJitter
          : 0;
      const exclusionCodes =
        exclusionCodesFor(
          eligibility
        );
      if (
        eligible &&
        rawWeight === 0
      ) {
        exclusionCodes.push(
          "ZERO_RAW_WEIGHT"
        );
      }

      candidates.push({
        userId:
          candidateUserId,
        cycleId:
          cycle?._id || null,
        arenaPosition:
          profile
            .arenaPosition,
        eligible,
        eligibility,
        exclusionCodes,
        activityPolicyVersion:
          assignmentPolicy
            .activityPolicyVersion,
        metrics: {
          defenseAssignmentsInCycle,
          completedSubChallenges,
          assignmentCap,
          lastDefenseAssignedAt,
          assignmentBalance,
          recency,
          activityMultiplier:
            activity.multiplier,
          auditJitter,
          rawWeight,
          probability: 0,
        },
      });
    }

    const totalRawWeight =
      candidates.reduce(
        (sum, candidate) =>
          sum +
          candidate.metrics
            .rawWeight,
        0
      );
    if (
      totalRawWeight > 0
    ) {
      for (const candidate of
        candidates) {
        candidate.metrics
          .probability =
          candidate.metrics
            .rawWeight /
          totalRawWeight;
      }
    }

    const selectionDraw =
      uniformFromHex(
        hmacHex(
          selectionSeed,
          "DEFENDER_SELECTION"
        )
      );
    let selected = null;
    if (
      totalRawWeight > 0
    ) {
      let cumulative = 0;
      const selectable =
        candidates.filter(
          (candidate) =>
            candidate.metrics
              .probability > 0
        );
      for (const candidate of
        selectable) {
        cumulative +=
          candidate.metrics
            .probability;
        if (
          selectionDraw <
          cumulative
        ) {
          selected =
            candidate;
          break;
        }
      }
      selected =
        selected ||
        selectable[
          selectable.length - 1
        ];
    }

    const canonicalCandidates =
      candidates.map(
        (candidate) => ({
          userId: String(
            candidate.userId
          ),
          cycleId:
            candidate.cycleId
              ? String(
                  candidate
                    .cycleId
                )
              : null,
          arenaPosition:
            candidate
              .arenaPosition,
          eligible:
            candidate.eligible,
          eligibility:
            candidate
              .eligibility,
          exclusionCodes:
            candidate
              .exclusionCodes,
          activityPolicyVersion:
            candidate
              .activityPolicyVersion,
          metrics: {
            ...candidate.metrics,
            lastDefenseAssignedAt:
              candidate.metrics
                .lastDefenseAssignedAt
                ? candidate
                    .metrics
                    .lastDefenseAssignedAt
                    .toISOString()
                : null,
          },
        })
      );
    const candidateSnapshotHash =
      sha256(
        stableJson(
          canonicalCandidates
        )
      );
    const audit =
      new DefenderAssignmentAudit({
        requestId,
        requestFingerprint,
        policyVersionId:
          policy._id,
        policyVersion:
          policy.version,
        seasonId:
          season._id,
        challengerUserId,
        challengerCycleId:
          challengerCycle._id,
        challengerPosition:
          challengerProfile
            .arenaPosition,
        status: selected
          ? "SELECTED"
          : "NO_CANDIDATE",
        assignmentDateKeyKst:
          todayKst,
        selectionSeed,
        selectionSeedHash,
        candidateSnapshotHash,
        selectionDraw,
        policySnapshot:
          assignmentPolicy,
        candidates,
        selectedDefenderUserId:
          selected?.userId ||
          null,
        selectedDefenderCycleId:
          selected?.cycleId ||
          null,
        selectedDefenderPosition:
          selected
            ?.arenaPosition ??
          null,
        selectedAt:
          observedAt,
        auditSchemaVersion:
          AUDIT_SCHEMA_VERSION,
      });
    await audit.save({
      session,
    });

    return returnValueFromAudit({
      ...audit.toObject({
        versionKey: false,
      }),
      selectionSeed,
    });
  }

  return {
    selectSubDefender,
  };
}

module.exports = {
  AUDIT_SCHEMA_VERSION,
  DefenderAssignmentError,
  FORBIDDEN_CLIENT_FIELDS,
  createDefenderAssignmentService,
  dateKeyKst,
  stableJson,
  uniformFromHex,
};
