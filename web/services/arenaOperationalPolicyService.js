const mongoose = require("mongoose");

const {
  LearningEvent,
} = require("../models/matthsModel");
const {
  ArenaSeason,
} = require("../models/arenaSeasonModel");
const {
  PolicyVersion,
} = require("../models/policyVersionModel");
const {
  RankTakeoverMatch,
} = require("../models/rankTakeoverMatchModel");

const MINUTE_MS = 60_000;
const SUPPORTED_ACTIVITY_WEIGHT_VERSIONS =
  Object.freeze([
    "EVENT_COUNT_RATIO_V1",
  ]);

class ArenaOperationalPolicyError
  extends Error {
  constructor(
    code,
    message,
    {
      statusCode = 503,
      details = {},
      cause,
    } = {}
  ) {
    super(message, { cause });
    this.name =
      "ArenaOperationalPolicyError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function fail(
  code,
  message,
  options
) {
  throw new ArenaOperationalPolicyError(
    code,
    message,
    options
  );
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

function plain(value) {
  if (!value) {
    return value;
  }
  return typeof value.toObject ===
    "function"
    ? value.toObject()
    : value;
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
    typeof value !== "string" ||
    !mongoose.Types.ObjectId
      .isValid(value)
  ) {
    policyPending(
      `${fieldName}_INVALID`,
      `${fieldName} is not an authoritative ObjectId`
    );
  }
  return new mongoose.Types.ObjectId(
    value
  );
}

function sameId(left, right) {
  return Boolean(
    left &&
      right &&
      String(left) ===
        String(right)
  );
}

function dateValue(
  value,
  fieldName
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    policyPending(
      `${fieldName}_INVALID`,
      `${fieldName} is not published as a valid date`
    );
  }
  const date =
    value instanceof Date
      ? new Date(value)
      : new Date(value);
  if (
    Number.isNaN(date.getTime())
  ) {
    policyPending(
      `${fieldName}_INVALID`,
      `${fieldName} is not published as a valid date`
    );
  }
  return date;
}

function policyText(
  value,
  fieldName
) {
  const text =
    typeof value === "string"
      ? value.trim()
      : "";
  if (
    !text ||
    text.length > 180
  ) {
    policyPending(
      fieldName,
      `${fieldName} is not published`
    );
  }
  return text;
}

function positiveInteger(
  value,
  fieldName
) {
  if (
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    policyPending(
      fieldName,
      `${fieldName} is not published as a positive integer`
    );
  }
  return value;
}

function nonNegativeInteger(
  value,
  fieldName
) {
  if (
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    policyPending(
      fieldName,
      `${fieldName} is not published as a non-negative integer`
    );
  }
  return value;
}

function queryWithSession(
  query,
  session
) {
  return session
    ? query.session(session)
    : query;
}

function assertPublishedPolicy(
  source,
  observedAt
) {
  const policy = plain(source);
  if (
    !policy ||
    typeof policy !== "object" ||
    Array.isArray(policy)
  ) {
    policyPending(
      "POLICY_VERSION_UNAVAILABLE",
      "Arena operational policy is unavailable"
    );
  }
  const policyVersionId =
    objectId(
      policy._id,
      "policyVersionId"
    );
  if (!policy.publishedAt) {
    policyPending(
      "publishedAt",
      "Arena operational policy is not published"
    );
  }
  const publishedAt =
    dateValue(
      policy.publishedAt,
      "publishedAt"
    );
  if (publishedAt > observedAt) {
    policyPending(
      "POLICY_NOT_YET_PUBLISHED",
      "Arena operational policy publication is not active yet"
    );
  }
  const effectiveFrom =
    dateValue(
      policy.effectiveFrom,
      "effectiveFrom"
    );
  if (effectiveFrom > observedAt) {
    policyPending(
      "POLICY_NOT_YET_EFFECTIVE",
      "Arena operational policy is not effective yet"
    );
  }
  if (policy.effectiveTo) {
    const effectiveTo =
      dateValue(
        policy.effectiveTo,
        "effectiveTo"
      );
    if (
      effectiveTo <= observedAt
    ) {
      policyPending(
        "POLICY_EXPIRED",
        "Arena operational policy is no longer effective"
      );
    }
  }
  return {
    policy,
    policyVersionId,
  };
}

function assertSeasonPolicy(
  source,
  policyVersionId
) {
  const season = plain(source);
  if (
    !season ||
    typeof season !== "object"
  ) {
    policyPending(
      "ARENA_SEASON_UNAVAILABLE",
      "Arena season is unavailable"
    );
  }
  objectId(
    season._id,
    "seasonId"
  );
  if (
    !sameId(
      season.policyVersionId,
      policyVersionId
    )
  ) {
    policyPending(
      "ARENA_SEASON_POLICY_VERSION_MISMATCH",
      "Arena season and operational policy versions do not match"
    );
  }
  return season;
}

function assertCyclePolicy(
  source,
  policyVersionId,
  fieldName,
  {
    required = true,
    userId = null,
  } = {}
) {
  const cycle = plain(source);
  if (!cycle) {
    if (!required) {
      return null;
    }
    policyPending(
      `${fieldName}_UNAVAILABLE`,
      `${fieldName} is unavailable`
    );
  }
  objectId(
    cycle._id,
    `${fieldName}Id`
  );
  if (
    !sameId(
      cycle.policyVersionId,
      policyVersionId
    )
  ) {
    policyPending(
      `${fieldName}_POLICY_VERSION_MISMATCH`,
      `${fieldName} does not use the operational policy`
    );
  }
  if (
    userId &&
    !sameId(
      cycle.userId,
      userId
    )
  ) {
    policyPending(
      `${fieldName}_USER_MISMATCH`,
      `${fieldName} does not belong to the requested participant`
    );
  }
  return cycle;
}

function assertProfileSeason(
  source,
  season,
  fieldName
) {
  const profile = plain(source);
  if (!profile) {
    policyPending(
      `${fieldName}_UNAVAILABLE`,
      `${fieldName} is unavailable`
    );
  }
  if (
    !sameId(
      profile.seasonId,
      season._id
    )
  ) {
    policyPending(
      `${fieldName}_SEASON_MISMATCH`,
      `${fieldName} does not belong to the Arena season`
    );
  }
  if (
    profile.activeRanking !==
    "MAIN"
  ) {
    fail(
      "MAIN_PROFILE_REQUIRED",
      "Main tier-step resolution requires Main Arena profiles",
      {
        statusCode: 409,
      }
    );
  }
  if (
    !Number.isSafeInteger(
      profile.arenaPosition
    ) ||
    profile.arenaPosition < 1
  ) {
    policyPending(
      `${fieldName}_POSITION_INVALID`,
      `${fieldName} has no authoritative Arena position`
    );
  }
  return profile;
}

function tierPositionCeilings(
  policy
) {
  policyText(
    policy
      .arenaTierStepMappingVersion,
    "arenaTierStepMappingVersion"
  );
  const ceilings =
    policy
      .arenaTierStepPositionCeilings;
  if (
    !Array.isArray(ceilings) ||
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
      "arenaTierStepPositionCeilings",
      "the pinned nine-step Main Arena position mapping is not published"
    );
  }
  return [...ceilings];
}

function activityPolicyFields(
  policy
) {
  const lookbackMinutes =
    positiveInteger(
      policy
        .recentActivityLookbackMinutes,
      "recentActivityLookbackMinutes"
    );
  const minimumEventCount =
    positiveInteger(
      policy
        .recentActivityMinEventCount,
      "recentActivityMinEventCount"
    );
  const weightVersion =
    policyText(
      policy
        .recentActivityWeightVersion,
      "recentActivityWeightVersion"
    );
  if (
    !SUPPORTED_ACTIVITY_WEIGHT_VERSIONS.includes(
      weightVersion
    )
  ) {
    policyPending(
      "RECENT_ACTIVITY_WEIGHT_VERSION_UNSUPPORTED",
      "recent activity weighting version is not supported"
    );
  }
  return {
    lookbackMinutes,
    minimumEventCount,
    weightVersion,
  };
}

function stepForPosition(
  position,
  ceilings
) {
  const index =
    ceilings.findIndex(
      (ceiling) =>
        position <= ceiling
    );
  if (index === -1) {
    policyPending(
      "MAIN_ARENA_POSITION_UNMAPPED",
      "Arena position is outside the pinned nine-step mapping"
    );
  }
  return index + 1;
}

function createArenaOperationalPolicyService(
  options = {}
) {
  const now =
    typeof options.now ===
      "function"
      ? options.now
      : () => new Date();

  function context(
    input,
    {
      cycles = [],
    } = {}
  ) {
    const observedAt =
      dateValue(
        input?.now || now(),
        "now"
      );
    const {
      policy,
      policyVersionId,
    } = assertPublishedPolicy(
      input?.policy,
      observedAt
    );
    const season =
      assertSeasonPolicy(
        input?.season,
        policyVersionId
      );
    const resolvedCycles =
      cycles.map(
        ({
          field,
          source,
          required,
          userId,
        }) =>
          assertCyclePolicy(
            source,
            policyVersionId,
            field,
            {
              required,
              userId,
            }
          )
      );
    return {
      observedAt,
      policy,
      policyVersionId,
      season,
      resolvedCycles,
    };
  }

  async function resolveAssignmentPolicy(
    input
  ) {
    const {
      policy,
      policyVersionId,
    } = context(input, {
      cycles: [
        {
          field:
            "challengerCycle",
          source:
            input
              ?.challengerCycle,
          required: true,
        },
      ],
    });
    const minHigherPositionGap =
      positiveInteger(
        policy
          .subDefenderMinHigherPositionGap,
        "subDefenderMinHigherPositionGap"
      );
    const maxHigherPositionGap =
      positiveInteger(
        policy
          .subDefenderMaxHigherPositionGap,
        "subDefenderMaxHigherPositionGap"
      );
    if (
      maxHigherPositionGap <
      minHigherPositionGap
    ) {
      policyPending(
        "SUB_RANK_RANGE_INVALID",
        "Sub defender higher-position range is invalid"
      );
    }
    const activityPolicy =
      activityPolicyFields(
        policy
      );
    return {
      policyVersionId:
        String(policyVersionId),
      minHigherPositionGap,
      maxHigherPositionGap,
      rankRangePolicyVersion:
        policyText(
          policy
            .subRankRangePolicyVersion,
          "subRankRangePolicyVersion"
        ),
      activityPolicyVersion:
        activityPolicy
          .weightVersion,
      settlementPolicyVersion:
        policyText(
          policy
            .settlementPolicyVersion,
          "settlementPolicyVersion"
        ),
      strongRelationPolicyVersion:
        policyText(
          policy
            .strongRelationPolicyVersion,
          "strongRelationPolicyVersion"
        ),
      integrityPolicyVersion:
        policyText(
          policy
            .integrityPolicyVersion,
          "integrityPolicyVersion"
        ),
    };
  }

  async function resolveActivity(
    input
  ) {
    const candidateUserId =
      objectId(
        input?.candidateUserId,
        "candidateUserId"
      );
    const {
      policy,
      observedAt,
    } = context(input, {
      cycles: [
        {
          field:
            "candidateCycle",
          source:
            input
              ?.candidateCycle,
          required: false,
          userId:
            candidateUserId,
        },
      ],
    });
    const {
      lookbackMinutes,
      minimumEventCount,
    } = activityPolicyFields(
      policy
    );
    const windowStartsAt =
      new Date(
        observedAt.getTime() -
          lookbackMinutes *
            MINUTE_MS
      );
    // Only the count and server-persisted occurredAt are used. Client duration,
    // metadata, device, network, and answer fields are never projected.
    const eventCount =
      await queryWithSession(
        LearningEvent
          .countDocuments({
            userId:
              candidateUserId,
            occurredAt: {
              $gte:
                windowStartsAt,
              $lte: observedAt,
            },
          }),
        input?.session || null
      );
    return {
      recentlyActive:
        eventCount >=
        minimumEventCount,
      multiplier: Math.min(
        1,
        eventCount /
          minimumEventCount
      ),
    };
  }

  async function resolveIntegrity(
    input
  ) {
    const candidateUserId =
      objectId(
        input?.candidateUserId,
        "candidateUserId"
      );
    const {
      policy,
      resolvedCycles,
    } = context(input, {
      cycles: [
        {
          field:
            "candidateCycle",
          source:
            input
              ?.candidateCycle,
          required: true,
          userId:
            candidateUserId,
        },
      ],
    });
    policyText(
      policy
        .integrityPolicyVersion,
      "integrityPolicyVersion"
    );
    const [cycle] =
      resolvedCycles;
    if (
      ![
        "CLEAR",
        "HELD",
        "INVALID",
      ].includes(
        cycle.integrityState
      )
    ) {
      policyPending(
        "PARTICIPANT_INTEGRITY_STATE_INVALID",
        "participant integrity state is not authoritative"
      );
    }
    return {
      clear:
        cycle.integrityState ===
        "CLEAR",
    };
  }

  async function resolveSettlementEligibility(
    input
  ) {
    const candidateUserId =
      objectId(
        input?.candidateUserId,
        "candidateUserId"
      );
    const {
      policy,
      observedAt,
      season,
      resolvedCycles,
    } = context(input, {
      cycles: [
        {
          field:
            "challengerCycle",
          source:
            input
              ?.challengerCycle,
          required: true,
        },
        {
          field:
            "candidateCycle",
          source:
            input
              ?.candidateCycle,
          required: true,
          userId:
            candidateUserId,
        },
      ],
    });
    policyText(
      policy
        .settlementPolicyVersion,
      "settlementPolicyVersion"
    );
    policyText(
      policy
        .deadlinePolicyVersion,
      "deadlinePolicyVersion"
    );
    const submissionDeadlineMinutes =
      positiveInteger(
        policy
          .submissionDeadlineMinutes,
        "submissionDeadlineMinutes"
      );
    const settlementDeadlines =
      [
        dateValue(
          season.endsAt,
          "season.endsAt"
        ),
        ...resolvedCycles.map(
          (cycle) =>
            dateValue(
              cycle
                .day30CompletionDeadlineAt,
              "day30CompletionDeadlineAt"
            )
        ),
      ];
    const mustSettleBy =
      new Date(
        Math.min(
          ...settlementDeadlines.map(
            (deadline) =>
              deadline.getTime()
          )
        )
      );
    const projectedSubmissionAt =
      new Date(
        observedAt.getTime() +
          submissionDeadlineMinutes *
            MINUTE_MS
      );
    return {
      canSettle:
        projectedSubmissionAt <=
        mustSettleBy,
    };
  }

  async function resolveDeadlinePolicy(
    input
  ) {
    const cycles = [];
    for (const [
      field,
      source,
    ] of [
      [
        "challengerCycle",
        input
          ?.challengerCycle,
      ],
      [
        "defenderCycle",
        input?.defenderCycle,
      ],
    ]) {
      if (source) {
        cycles.push({
          field,
          source,
          required: true,
        });
      }
    }
    const {
      policy,
    } = context(input, {
      cycles,
    });
    if (
      ![
        "SUB",
        "MAIN",
      ].includes(
        input?.activeRanking
      ) ||
      ![
        "NORMAL",
        "REVENGE",
      ].includes(
        input?.matchType
      )
    ) {
      fail(
        "INVALID_MATCH_POLICY_CONTEXT",
        "deadline resolution requires a valid ranking and match type",
        {
          statusCode: 409,
        }
      );
    }
    policyText(
      policy
        .deadlinePolicyVersion,
      "deadlinePolicyVersion"
    );
    const startDeadlineMinutes =
      nonNegativeInteger(
        policy
          .startDeadlineMinutes,
        "startDeadlineMinutes"
      );
    const submissionDeadlineMinutes =
      positiveInteger(
        policy
          .submissionDeadlineMinutes,
        "submissionDeadlineMinutes"
      );
    if (
      startDeadlineMinutes >
      submissionDeadlineMinutes
    ) {
      policyPending(
        "MATCH_DEADLINE_RANGE_INVALID",
        "start deadline cannot be after the submission deadline"
      );
    }
    return {
      startDeadlineMinutes,
      submissionDeadlineMinutes,
      questionPolicyVersion:
        policyText(
          policy
            .questionPolicyVersion,
          "questionPolicyVersion"
        ),
    };
  }

  async function resolveMainTierStepGap(
    input
  ) {
    const {
      policy,
      season,
    } = context(input);
    const ceilings =
      tierPositionCeilings(
        policy
      );
    const challenger =
      assertProfileSeason(
        input
          ?.challengerProfile,
        season,
        "challengerProfile"
      );
    const defender =
      assertProfileSeason(
        input
          ?.defenderProfile,
        season,
        "defenderProfile"
      );
    const challengerStep =
      stepForPosition(
        challenger
          .arenaPosition,
        ceilings
      );
    const defenderStep =
      stepForPosition(
        defender.arenaPosition,
        ceilings
      );
    if (
      defenderStep >=
      challengerStep
    ) {
      fail(
        "MAIN_TARGET_NOT_STRICTLY_HIGHER_STEP",
        "Main challenger may target only a strictly higher Arena step",
        {
          statusCode: 409,
        }
      );
    }
    return (
      challengerStep -
      defenderStep
    );
  }

  async function resolveHeartbeatPolicy(
    input
  ) {
    const observedAt =
      dateValue(
        input?.now || now(),
        "now"
      );
    const policyVersionId =
      objectId(
        input?.policyVersionId,
        "policyVersionId"
      );
    if (
      input?.match
        ?.policyVersionId &&
      !sameId(
        input.match
          .policyVersionId,
        policyVersionId
      )
    ) {
      policyPending(
        "MATCH_POLICY_VERSION_MISMATCH",
        "match and requested heartbeat policy versions do not match"
      );
    }
    const session =
      input?.session || null;
    const matchRecordId =
      objectId(
        input?.match?.id,
        "match.id"
      );
    const matchId =
      policyText(
        input?.match?.matchId,
        "match.matchId"
      );
    const suppliedMatchStatus =
      input?.match?.status;
    if (
      ![
        "READY",
        "IN_PROGRESS",
      ].includes(
        suppliedMatchStatus
      )
    ) {
      policyPending(
        "MATCH_NOT_OPEN_FOR_HEARTBEAT_POLICY",
        "heartbeat policy can be resolved only for an open match"
      );
    }
    const suppliedSubmitsBy =
      dateValue(
        input?.match?.submitsBy,
        "match.submitsBy"
      );
    const matchRecord =
      await queryWithSession(
        RankTakeoverMatch
          .findOne({
            _id: matchRecordId,
            matchId,
            policyVersionId,
          })
          .select(
            "_id matchId seasonId policyVersionId status submitsBy"
          )
          .lean(),
        session
      );
    if (
      !matchRecord ||
      matchRecord.status !==
        suppliedMatchStatus ||
      !matchRecord.submitsBy ||
      new Date(
        matchRecord.submitsBy
      ).getTime() !==
        suppliedSubmitsBy
          .getTime()
    ) {
      policyPending(
        "MATCH_POLICY_CONTEXT_MISMATCH",
        "heartbeat policy request does not match the authoritative match"
      );
    }
    const policyDocument =
      await queryWithSession(
        PolicyVersion.findById(
          policyVersionId
        ),
        session
      );
    if (!policyDocument) {
      policyPending(
        "POLICY_VERSION_UNAVAILABLE",
        "heartbeat PolicyVersion is unavailable"
      );
    }
    const {
      policy,
      policyVersionId:
        publishedPolicyId,
    } = assertPublishedPolicy(
      policyDocument,
      observedAt
    );
    if (
      !sameId(
        publishedPolicyId,
        policyVersionId
      )
    ) {
      policyPending(
        "HEARTBEAT_POLICY_VERSION_MISMATCH",
        "published heartbeat policy does not match the match policy"
      );
    }
    const season =
      await queryWithSession(
        ArenaSeason.findOne({
          _id:
            matchRecord.seasonId,
          policyVersionId,
          status: "ACTIVE",
          startsAt: {
            $lte: observedAt,
          },
          endsAt: {
            $gt: observedAt,
          },
        }),
        session
      );
    if (!season) {
      policyPending(
        "ACTIVE_ARENA_SEASON_UNAVAILABLE",
        "no active Arena season is pinned to the heartbeat policy"
      );
    }
    assertSeasonPolicy(
      season,
      policyVersionId
    );
    return {
      status: "PUBLISHED",
      published: true,
      policyVersionId:
        String(policyVersionId),
      version:
        policyText(
          policy
            .activeSolveTimePolicyVersion,
          "activeSolveTimePolicyVersion"
        ),
      heartbeatPolicyVersion:
        policyText(
          policy
            .attemptHeartbeatPolicyVersion,
          "attemptHeartbeatPolicyVersion"
        ),
      maxRecognizedHeartbeatIntervalMs:
        positiveInteger(
          policy
            .maxRecognizedHeartbeatIntervalMs,
          "maxRecognizedHeartbeatIntervalMs"
        ),
      networkReconnectGraceMs:
        nonNegativeInteger(
          policy
            .networkReconnectGraceMs,
          "networkReconnectGraceMs"
        ),
    };
  }

  return {
    resolveActivity,
    resolveAssignmentPolicy,
    resolveDeadlinePolicy,
    resolveHeartbeatPolicy,
    resolveIntegrity,
    resolveMainTierStepGap,
    resolveSettlementEligibility,
  };
}

module.exports = {
  ArenaOperationalPolicyError,
  SUPPORTED_ACTIVITY_WEIGHT_VERSIONS,
  createArenaOperationalPolicyService,
};
