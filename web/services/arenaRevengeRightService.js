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
  RankTakeoverRevengeRight:
    ArenaRevengeRight,
  INVALIDATION_REASON_CODES,
} = require(
  "../models/arenaRevengeRightModel"
);
const {
  ArenaSeason,
} = require(
  "../models/arenaSeasonModel"
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
const {
  RankingProfile,
  User,
} = require(
  "../models/matthsModel"
);
const {
  RankTakeoverError,
} = require(
  "./rankTakeoverService"
);

const HOUR_MS =
  60 * 60 * 1000;

const ACTIVE_CYCLE_STATUS =
  Object.freeze({
    SUB: "SUB_ACTIVE",
    MAIN: "MAIN_ACTIVE",
  });

const AVAILABLE_BALANCE_FIELD =
  Object.freeze({
    SUB:
      "refundChallengeDays",
    MAIN:
      "bonusAccessDays",
  });

class ArenaRevengeRightError
  extends RankTakeoverError {}

function fail(
  code,
  message,
  {
    statusCode = 409,
    details = null,
  } = {}
) {
  throw new ArenaRevengeRightError(
    code,
    message,
    {
      statusCode,
      details,
    }
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

function requiredText(
  value,
  label,
  maxLength = 180
) {
  const normalized =
    String(
      value || ""
    ).trim();
  if (!normalized) {
    fail(
      "INVALID_REVENGE_INPUT",
      `${label} is required`,
      {
        statusCode: 400,
      }
    );
  }
  if (
    normalized.length >
    maxLength
  ) {
    fail(
      "INVALID_REVENGE_INPUT",
      `${label} is too long`,
      {
        statusCode: 400,
      }
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
    fail(
      "INVALID_REVENGE_INPUT",
      `${label} must be a valid ObjectId`,
      {
        statusCode: 400,
      }
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
    fail(
      "INVALID_REVENGE_INPUT",
      `${label} must be a valid date`,
      {
        statusCode: 400,
      }
    );
  }
  return date;
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

function hasOwn(
  value,
  key
) {
  return Object.prototype
    .hasOwnProperty.call(
      value || {},
      key
    );
}

function queryWithSession(
  query,
  session
) {
  return session
    ? query.session(session)
    : query;
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

function deterministicRightId(
  sourceMatch
) {
  const digest =
    crypto
      .createHash("sha256")
      .update(
        [
          sourceMatch._id,
          sourceMatch.matchId,
          sourceMatch
            .settlementVersion,
          sourceMatch
            .policyVersionId,
        ].join(":")
      )
      .digest("hex");
  return `revenge-right-${digest}`;
}

function normalizeRanking(
  value
) {
  const ranking =
    String(
      value || ""
    )
      .trim()
      .toUpperCase();
  if (
    ![
      "SUB",
      "MAIN",
    ].includes(ranking)
  ) {
    fail(
      "INVALID_REVENGE_INPUT",
      "activeRanking must be SUB or MAIN",
      {
        statusCode: 400,
      }
    );
  }
  return ranking;
}

function sourceStateProblem(
  sourceMatch
) {
  if (!sourceMatch) {
    return {
      code:
        "REVENGE_SOURCE_MISSING",
      reasonCode:
        "SOURCE_MATCH_MISSING",
      message:
        "source Rank Takeover match does not exist",
      statusCode: 404,
    };
  }
  if (
    sourceMatch.status ===
      "HELD" ||
    sourceMatch
      .integrityState ===
      "HELD"
  ) {
    return {
      code:
        "REVENGE_SOURCE_HELD",
      reasonCode:
        "SOURCE_MATCH_HELD",
      message:
        "source match is under integrity review",
      statusCode: 423,
    };
  }
  if (
    sourceMatch.status ===
      "INVALID" ||
    sourceMatch
      .integrityState ===
      "INVALID"
  ) {
    return {
      code:
        "REVENGE_SOURCE_INVALID",
      reasonCode:
        "SOURCE_MATCH_INVALID",
      message:
        "invalid source match cannot grant or consume a RevengeRight",
      statusCode: 409,
    };
  }
  if (
    sourceMatch.status !==
    "SETTLED"
  ) {
    return {
      code:
        "REVENGE_SOURCE_NOT_SETTLED",
      reasonCode:
        "SOURCE_RESULT_CORRECTED",
      message:
        "source match must be finally settled before a RevengeRight is available",
      statusCode: 409,
    };
  }
  if (
    sourceMatch
      .integrityState !==
      "CLEAR" ||
    sourceMatch.winner !==
      "CHALLENGER" ||
    sourceMatch
      .settlementReason !==
      "SCORED_RESULT" ||
    sourceMatch
      .arenaPositionSettlement
      ?.outcome !==
      "SWAPPED"
  ) {
    return {
      code:
        "REVENGE_RIGHT_NOT_EARNED",
      reasonCode:
        "SOURCE_RESULT_CORRECTED",
      message:
        "only a clear scored challenger win that took the defender's seat grants a RevengeRight",
      statusCode: 409,
    };
  }
  return null;
}

function throwSourceProblem(
  problem
) {
  fail(
    problem.code,
    problem.message,
    {
      statusCode:
        problem.statusCode,
      details: {
        reasonCode:
          problem.reasonCode,
      },
    }
  );
}

function positivePolicyInteger(
  value,
  blocker,
  label
) {
  const normalized =
    Number(value);
  if (
    !Number.isSafeInteger(
      normalized
    ) ||
    normalized <= 0
  ) {
    policyPending(
      blocker,
      `${label} is not published`
    );
  }
  return normalized;
}

function stakeForGap(
  table,
  gap,
  blocker
) {
  if (
    !table ||
    !Number.isSafeInteger(
      gap
    ) ||
    gap < 1
  ) {
    policyPending(
      blocker,
      "Main Revenge tier-step cost policy is not published"
    );
  }
  const value =
    gap === 1
      ? table.oneStep
      : gap === 2
        ? table.twoSteps
        : table
            .threeOrMoreSteps;
  return positivePolicyInteger(
    value,
    blocker,
    "Main Revenge tier-step cost"
  );
}

function costSnapshotForRight({
  sourceMatch,
  policy,
}) {
  const feeBurnDays =
    positivePolicyInteger(
      policy
        .revengeFeeBurnDays,
      "REVENGE_FEE_POLICY_UNSET",
      "Revenge fee"
    );
  if (
    feeBurnDays !== 1
  ) {
    fail(
      "REVENGE_POLICY_CONFLICT",
      "published Revenge fee must be exactly one day",
      {
        statusCode: 500,
      }
    );
  }

  let normalStakeDays;
  let revengeStakeDays;
  if (
    sourceMatch
      .activeRanking ===
    "SUB"
  ) {
    normalStakeDays =
      positivePolicyInteger(
        policy
          .subNormalTakeoverCostDays,
        "SUB_REVENGE_COST_POLICY_UNSET",
        "Sub normal challenge cost"
      );
    revengeStakeDays =
      positivePolicyInteger(
        policy
          .subRevengeCostDays,
        "SUB_REVENGE_COST_POLICY_UNSET",
        "Sub Revenge challenge cost"
      );
  } else {
    const gap =
      sourceMatch
        .challengeCostSnapshot
        ?.challengeTierStepGap;
    normalStakeDays =
      stakeForGap(
        policy
          .mainNormalStakeDaysByRange,
        gap,
        "MAIN_REVENGE_COST_POLICY_UNSET"
      );
    revengeStakeDays =
      stakeForGap(
        policy
          .mainRevengeStakeDaysByRange,
        gap,
        "MAIN_REVENGE_COST_POLICY_UNSET"
      );
  }
  if (
    normalStakeDays +
      feeBurnDays !==
    revengeStakeDays
  ) {
    fail(
      "REVENGE_POLICY_CONFLICT",
      "Revenge cost must equal the normal challenge cost plus the one-day burn fee",
      {
        statusCode: 500,
      }
    );
  }

  const expectedSourceStake =
    sourceMatch
      .matchType ===
    "REVENGE"
      ? revengeStakeDays
      : normalStakeDays;
  if (
    sourceMatch
      .challengeCostSnapshot
      ?.stakeDays !==
      expectedSourceStake
  ) {
    fail(
      "SOURCE_COST_SNAPSHOT_MISMATCH",
      "source match cost does not match its pinned policy",
      {
        statusCode: 409,
      }
    );
  }
  return {
    feeBurnDays,
    normalStakeDays,
    revengeStakeDays,
  };
}

function assertRightMatchesSource({
  right,
  sourceMatch,
}) {
  const matches =
    sameId(
      right
        .sourceMatchDocumentId,
      sourceMatch._id
    ) &&
    right.sourceMatchId ===
      sourceMatch.matchId &&
    sameId(
      right.seasonId,
      sourceMatch.seasonId
    ) &&
    sameId(
      right
        .policyVersionId,
      sourceMatch
        .policyVersionId
    ) &&
    right.rankingType ===
      sourceMatch
        .activeRanking &&
    right.sourceMatchType ===
      sourceMatch.matchType &&
    sameId(
      right
        .entitledUserId,
      sourceMatch
        .defenderUserId
    ) &&
    sameId(
      right.targetUserId,
      sourceMatch
        .challengerUserId
    ) &&
    sameId(
      right
        .entitledCycleId,
      sourceMatch
        .defenderCycleId
    ) &&
    sameId(
      right.targetCycleId,
      sourceMatch
        .challengerCycleId
    ) &&
    right
      .sourceSettlementVersion ===
      sourceMatch
        .settlementVersion;
  if (!matches) {
    fail(
      "REVENGE_SOURCE_IDENTITY_MISMATCH",
      "RevengeRight identity no longer matches its authoritative source match",
      {
        statusCode: 409,
        details: {
          reasonCode:
            "SOURCE_IDENTITY_MISMATCH",
        },
      }
    );
  }
}

function assertRightSnapshot({
  right,
  sourceMatch,
  policy,
}) {
  assertRightMatchesSource({
    right,
    sourceMatch,
  });
  const cost =
    costSnapshotForRight({
      sourceMatch,
      policy,
    });
  const hours =
    positivePolicyInteger(
      policy.revengeRightHours,
      "REVENGE_RIGHT_WINDOW_UNSET",
      "RevengeRight validity window"
    );
  const expectedExpiry =
    new Date(
      sourceMatch
        .settledAt
        .getTime() +
        hours * HOUR_MS
    );
  if (
    right
      .sourceNormalStakeDays !==
      cost.normalStakeDays ||
    right.revengeStakeDays !==
      cost.revengeStakeDays ||
    right
      .revengeFeeBurnDays !==
      cost.feeBurnDays ||
    right.expiresAt.getTime() !==
      expectedExpiry.getTime()
  ) {
    fail(
      "REVENGE_RIGHT_SNAPSHOT_MISMATCH",
      "RevengeRight snapshot does not match the source match and pinned policy",
      {
        statusCode: 409,
      }
    );
  }
  return {
    cost,
    hours,
  };
}

async function markExpiredDurably({
  rightId,
  observedAt,
}) {
  return ArenaRevengeRight
    .findOneAndUpdate(
      {
        _id: rightId,
        status: "AVAILABLE",
        expiresAt: {
          $lte:
            observedAt,
        },
      },
      {
        $set: {
          status: "EXPIRED",
          expiredAt:
            observedAt,
        },
        $push: {
          stateHistory: {
            status: "EXPIRED",
            reasonCode:
              "RIGHT_WINDOW_ELAPSED",
            occurredAt:
              observedAt,
          },
        },
        $inc: {
          version: 1,
        },
      },
      {
        returnDocument:
          "after",
        runValidators: true,
      }
    );
}

async function invalidateDurably({
  rightId,
  reasonCode,
  observedAt,
  relatedMatchId = null,
}) {
  if (
    !INVALIDATION_REASON_CODES
      .includes(reasonCode)
  ) {
    fail(
      "INVALID_REVENGE_INVALIDATION_REASON",
      "RevengeRight invalidation reason is not allowed",
      {
        statusCode: 500,
      }
    );
  }
  return ArenaRevengeRight
    .findOneAndUpdate(
      {
        _id: rightId,
        status: {
          $ne: "INVALID",
        },
      },
      {
        $set: {
          status: "INVALID",
          invalidatedAt:
            observedAt,
          invalidationReasonCode:
            reasonCode,
        },
        $push: {
          stateHistory: {
            status: "INVALID",
            reasonCode,
            occurredAt:
              observedAt,
            relatedMatchId,
          },
        },
        $inc: {
          version: 1,
        },
      },
      {
        returnDocument:
          "after",
        runValidators: true,
      }
    );
}

async function assertParticipantEligibility({
  userId,
  cycleId,
  seasonId,
  ranking,
  policyVersionId,
  session,
}) {
  const user =
    await queryWithSession(
      User.findById(
        userId
      ),
      session
    );
  if (
    !user ||
    user.accountStatus !==
      "active" ||
    user.isActive === false
  ) {
    fail(
      "ACCOUNT_NOT_ACTIVE",
      "RevengeRight participant account is not active",
      {
        statusCode: 403,
      }
    );
  }
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
  if (
    !rankingProfile ||
    !rankingProfile
      .placementAttemptId
  ) {
    fail(
      "PLACEMENT_REQUIRED",
      "RevengeRight participant needs a completed Placement and RankingProfile",
      {
        statusCode: 403,
      }
    );
  }
  const cycle =
    await queryWithSession(
      AccessCycle.findOne({
        _id: cycleId,
        userId,
        activeRanking:
          ranking,
        status:
          ACTIVE_CYCLE_STATUS[
            ranking
          ],
      }),
      session
    );
  if (!cycle) {
    fail(
      "REVENGE_SOURCE_CYCLE_INACTIVE",
      "RevengeRight cannot move to a different or inactive access cycle",
      {
        statusCode: 403,
      }
    );
  }
  if (
    !sameId(
      cycle.policyVersionId,
      policyVersionId
    )
  ) {
    fail(
      "POLICY_VERSION_MISMATCH",
      "RevengeRight and access cycle must share one pinned policy version",
      {
        statusCode: 409,
      }
    );
  }
  if (
    cycle.integrityState !==
    "CLEAR"
  ) {
    fail(
      "CYCLE_INTEGRITY_HELD",
      "RevengeRight participant cycle has an unresolved integrity hold",
      {
        statusCode: 423,
      }
    );
  }
  const arenaProfile =
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
    !arenaProfile ||
    arenaProfile.status !==
      "ACTIVE" ||
    !Number.isSafeInteger(
      arenaProfile
        .arenaPosition
    )
  ) {
    fail(
      "ACTIVE_ARENA_SEAT_REQUIRED",
      "RevengeRight participant must retain an active Arena seat",
      {
        statusCode: 403,
      }
    );
  }
  return {
    arenaProfile,
    cycle,
    rankingProfile,
    user,
  };
}

function assertTargetProtection({
  targetProfile,
  ranking,
  policy,
  observedAt,
}) {
  const protectedNow =
    Boolean(
      targetProfile
        .protectionUntil &&
      new Date(
        targetProfile
          .protectionUntil
      ) > observedAt
    );
  if (protectedNow) {
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
        "Revenge post-match protection bypass policy is not published"
      );
    }
    if (
      !policy
        .revengeBypassesProtection
    ) {
      fail(
        "DEFENDER_PROTECTED",
        "Revenge target is in post-match protection",
        {
          statusCode: 409,
        }
      );
    }
  }

  const shieldedNow =
    Boolean(
      ranking === "MAIN" &&
      targetProfile
        .rankShieldUntil &&
      new Date(
        targetProfile
          .rankShieldUntil
      ) > observedAt
    );
  if (!shieldedNow) {
    return;
  }
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
    !policy
      .revengeBypassesShield
  ) {
    fail(
      "DEFENDER_SHIELDED",
      "Revenge target has an active Main Rank Shield",
      {
        statusCode: 409,
      }
    );
  }
}

function createArenaRevengeRightService(
  options = {}
) {
  const now =
    typeof options.now ===
    "function"
      ? options.now
      : () => new Date();

  async function issueFromSettledMatch(
    input
  ) {
    const sourceMatchId =
      requiredText(
        input?.sourceMatchId,
        "sourceMatchId",
        160
      );
    const observedAt =
      asDate(
        input?.now || now(),
        "now"
      );
    const suppliedSession =
      input?.session || null;

    try {
      return await runInTransaction(
        async (session) => {
          const sourceMatch =
            await queryWithSession(
              RankTakeoverMatch
                .findOne({
                  matchId:
                    sourceMatchId,
                }),
              session
            );
          const problem =
            sourceStateProblem(
              sourceMatch
            );
          if (problem) {
            const existing =
              await queryWithSession(
                ArenaRevengeRight
                  .findOne({
                    sourceMatchId,
                  }),
                session
              );
            if (existing) {
              await invalidateDurably({
                rightId:
                  existing._id,
                reasonCode:
                  problem
                    .reasonCode,
                observedAt,
                relatedMatchId:
                  sourceMatchId,
              });
            }
            throwSourceProblem(
              problem
            );
          }

          const season =
            await queryWithSession(
              ArenaSeason.findById(
                sourceMatch
                  .seasonId
              ),
              session
            );
          if (
            !season ||
            !sameId(
              season
                .policyVersionId,
              sourceMatch
                .policyVersionId
            )
          ) {
            fail(
              "REVENGE_SOURCE_SEASON_MISMATCH",
              "source match season and policy snapshot are inconsistent",
              {
                statusCode: 409,
              }
            );
          }
          const policy =
            await queryWithSession(
              PolicyVersion.findById(
                sourceMatch
                  .policyVersionId
              ),
              session
            );
          if (!policy) {
            fail(
              "POLICY_VERSION_NOT_FOUND",
              "source match policy snapshot does not exist",
              {
                statusCode: 500,
              }
            );
          }

          const existing =
            await queryWithSession(
              ArenaRevengeRight
                .findOne({
                  sourceMatchId,
                }),
              session
            );
          if (existing) {
            if (
              existing.status ===
              "INVALID"
            ) {
              fail(
                "REVENGE_RIGHT_INVALID",
                "invalidated RevengeRight cannot be reissued",
                {
                  statusCode: 409,
                }
              );
            }
            assertRightSnapshot({
              right: existing,
              sourceMatch,
              policy,
            });
            return existing;
          }

          const hours =
            positivePolicyInteger(
              policy
                .revengeRightHours,
              "REVENGE_RIGHT_WINDOW_UNSET",
              "RevengeRight validity window"
            );
          const cost =
            costSnapshotForRight({
              sourceMatch,
              policy,
            });
          const earnedAt =
            asDate(
              sourceMatch
                .settledAt,
              "sourceMatch.settledAt"
            );
          const expiresAt =
            new Date(
              earnedAt.getTime() +
                hours * HOUR_MS
            );
          const expired =
            observedAt >=
            expiresAt;
          const stateHistory = [
            {
              status:
                "AVAILABLE",
              reasonCode:
                "EARNED_FROM_SEAT_LOSS",
              occurredAt:
                earnedAt,
              relatedMatchId:
                sourceMatch
                  .matchId,
            },
          ];
          if (expired) {
            stateHistory.push({
              status:
                "EXPIRED",
              reasonCode:
                "RIGHT_WINDOW_ELAPSED",
              occurredAt:
                observedAt,
              relatedMatchId:
                sourceMatch
                  .matchId,
            });
          }
          const right =
            new ArenaRevengeRight({
              rightId:
                deterministicRightId(
                  sourceMatch
                ),
              sourceMatchId:
                sourceMatch
                  .matchId,
              sourceMatchDocumentId:
                sourceMatch._id,
              sourceSettlementVersion:
                sourceMatch
                  .settlementVersion,
              sourceMatchType:
                sourceMatch
                  .matchType,
              seasonId:
                sourceMatch
                  .seasonId,
              policyVersionId:
                sourceMatch
                  .policyVersionId,
              rankingType:
                sourceMatch
                  .activeRanking,
              entitledUserId:
                sourceMatch
                  .defenderUserId,
              targetUserId:
                sourceMatch
                  .challengerUserId,
              entitledCycleId:
                sourceMatch
                  .defenderCycleId,
              targetCycleId:
                sourceMatch
                  .challengerCycleId,
              sourceNormalStakeDays:
                cost
                  .normalStakeDays,
              revengeStakeDays:
                cost
                  .revengeStakeDays,
              revengeFeeBurnDays:
                cost
                  .feeBurnDays,
              earnedAt,
              issuedAt:
                observedAt,
              expiresAt,
              status:
                expired
                  ? "EXPIRED"
                  : "AVAILABLE",
              expiredAt:
                expired
                  ? observedAt
                  : null,
              stateHistory,
            });
          await right.save({
            session,
          });
          return right;
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
      const existing =
        await ArenaRevengeRight
          .findOne({
            sourceMatchId,
          });
      if (existing) {
        return existing;
      }
      throw error;
    }
  }

  async function resolveRevengeRight(
    input
  ) {
    for (const field of [
      "targetUserId",
      "defenderUserId",
      "targetArenaPosition",
      "stakeDays",
    ]) {
      if (
        hasOwn(
          input,
          field
        )
      ) {
        fail(
          "REVENGE_TARGET_INPUT_FORBIDDEN",
          "Revenge target and cost are derived only from the source match",
          {
            statusCode: 400,
            details: {
              field,
            },
          }
        );
      }
    }
    const sourceMatchId =
      requiredText(
        input?.sourceMatchId,
        "sourceMatchId",
        160
      );
    const entitledUserId =
      objectId(
        input?.entitledUserId,
        "entitledUserId"
      );
    const activeRanking =
      normalizeRanking(
        input?.activeRanking
      );
    const observedAt =
      asDate(
        input?.now || now(),
        "now"
      );
    const session =
      input?.session || null;
    const season =
      input?.season;
    if (!season?._id) {
      fail(
        "ACTIVE_ARENA_SEASON_REQUIRED",
        "active Arena season is required",
        {
          statusCode: 409,
        }
      );
    }

    const right =
      await queryWithSession(
        ArenaRevengeRight
          .findOne({
            sourceMatchId,
          }),
        session
      );
    if (!right) {
      fail(
        "REVENGE_RIGHT_INVALID",
        "an unused RevengeRight for the source match is required",
        {
          statusCode: 409,
        }
      );
    }
    if (
      !sameId(
        right
          .entitledUserId,
        entitledUserId
      )
    ) {
      fail(
        "REVENGE_RIGHT_NOT_ENTITLED",
        "RevengeRight belongs only to the user who lost the source seat",
        {
          statusCode: 403,
        }
      );
    }
    if (
      right.status ===
      "CONSUMED"
    ) {
      fail(
        "REVENGE_RIGHT_ALREADY_CONSUMED",
        "RevengeRight has already been used",
        {
          statusCode: 409,
        }
      );
    }
    if (
      right.status ===
      "INVALID"
    ) {
      fail(
        "REVENGE_RIGHT_INVALID",
        "RevengeRight was invalidated",
        {
          statusCode: 409,
          details: {
            reasonCode:
              right
                .invalidationReasonCode,
          },
        }
      );
    }
    if (
      right.status ===
        "EXPIRED" ||
      observedAt >=
        right.expiresAt
    ) {
      if (
        right.status ===
        "AVAILABLE"
      ) {
        await markExpiredDurably({
          rightId:
            right._id,
          observedAt,
        });
      }
      fail(
        "REVENGE_RIGHT_EXPIRED",
        "RevengeRight validity window has elapsed",
        {
          statusCode: 409,
        }
      );
    }

    if (
      !sameId(
        right.seasonId,
        season._id
      ) ||
      right.rankingType !==
        activeRanking
    ) {
      fail(
        "REVENGE_RIGHT_SCOPE_MISMATCH",
        "RevengeRight cannot cross Arena season or ranking",
        {
          statusCode: 409,
        }
      );
    }
    if (
      season.status !==
        "ACTIVE" ||
      observedAt <
        new Date(
          season.startsAt
        ) ||
      observedAt >=
        new Date(
          season.endsAt
        )
    ) {
      fail(
        "ACTIVE_ARENA_SEASON_REQUIRED",
        "RevengeRight requires its active Arena season",
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
        "RevengeRight cannot be used during Arena reseed",
        {
          statusCode: 409,
        }
      );
    }
    if (
      !sameId(
        right
          .policyVersionId,
        season
          .policyVersionId
      )
    ) {
      fail(
        "POLICY_VERSION_MISMATCH",
        "RevengeRight and Arena season must share one pinned policy version",
        {
          statusCode: 409,
        }
      );
    }

    const policy =
      await queryWithSession(
        PolicyVersion.findById(
          right
            .policyVersionId
        ),
        session
      );
    if (!policy) {
      fail(
        "POLICY_VERSION_NOT_FOUND",
        "RevengeRight policy snapshot does not exist",
        {
          statusCode: 500,
        }
      );
    }
    const sourceMatch =
      await queryWithSession(
        RankTakeoverMatch
          .findOne({
            matchId:
              sourceMatchId,
          }),
        session
      );
    const sourceProblem =
      sourceStateProblem(
        sourceMatch
      );
    if (sourceProblem) {
      await invalidateDurably({
        rightId:
          right._id,
        reasonCode:
          sourceProblem
            .reasonCode,
        observedAt,
        relatedMatchId:
          sourceMatchId,
      });
      throwSourceProblem(
        sourceProblem
      );
    }
    try {
      assertRightSnapshot({
        right,
        sourceMatch,
        policy,
      });
    } catch (error) {
      if (
        [
          "REVENGE_SOURCE_IDENTITY_MISMATCH",
          "REVENGE_RIGHT_SNAPSHOT_MISMATCH",
        ].includes(
          error.code
        )
      ) {
        await invalidateDurably({
          rightId:
            right._id,
          reasonCode:
            "SOURCE_IDENTITY_MISMATCH",
          observedAt,
          relatedMatchId:
            sourceMatchId,
        });
      }
      throw error;
    }

    const entitled =
      await assertParticipantEligibility({
        userId:
          right
            .entitledUserId,
        cycleId:
          right
            .entitledCycleId,
        seasonId:
          right.seasonId,
        ranking:
          right.rankingType,
        policyVersionId:
          right
            .policyVersionId,
        session,
      });
    const target =
      await assertParticipantEligibility({
        userId:
          right.targetUserId,
        cycleId:
          right.targetCycleId,
        seasonId:
          right.seasonId,
        ranking:
          right.rankingType,
        policyVersionId:
          right
            .policyVersionId,
        session,
      });
    assertTargetProtection({
      targetProfile:
        target.arenaProfile,
      ranking:
        right.rankingType,
      policy,
      observedAt,
    });

    const activeMatch =
      await queryWithSession(
        RankTakeoverMatch
          .findOne({
            participantUserIds: {
              $in: [
                right
                  .entitledUserId,
                right
                  .targetUserId,
              ],
            },
            status: {
              $in:
                ACTIVE_TAKEOVER_MATCH_STATUSES,
            },
          }),
        session
      );
    if (activeMatch) {
      fail(
        "ACTIVE_MATCH_EXISTS",
        "RevengeRight cannot bypass the one-active-match limit",
        {
          statusCode: 409,
        }
      );
    }
    const balanceField =
      AVAILABLE_BALANCE_FIELD[
        right.rankingType
      ];
    if (
      entitled.cycle[
        balanceField
      ] <
      right.revengeStakeDays
    ) {
      fail(
        "INSUFFICIENT_CHALLENGE_DAYS",
        "available challenge-day balance is insufficient for Revenge",
        {
          statusCode: 409,
        }
      );
    }
    return right;
  }

  async function consumeRevengeRight(
    input
  ) {
    const session =
      input?.session;
    if (
      !session ||
      typeof session
        .inTransaction !==
        "function" ||
      !session.inTransaction()
    ) {
      fail(
        "REVENGE_CONSUME_SESSION_REQUIRED",
        "RevengeRight must be consumed in the same transaction as challenge creation",
        {
          statusCode: 500,
        }
      );
    }
    const observedAt =
      asDate(
        input?.now || now(),
        "now"
      );
    const suppliedRight =
      input?.right;
    const consumedByMatch =
      input?.consumedByMatch;
    const rightDocumentId =
      objectId(
        suppliedRight?._id,
        "right._id"
      );
    const consumingMatchId =
      requiredText(
        consumedByMatch
          ?.matchId,
        "consumedByMatch.matchId",
        160
      );
    const consumingMatchDocumentId =
      objectId(
        consumedByMatch?._id,
        "consumedByMatch._id"
      );
    const canonical =
      await queryWithSession(
        ArenaRevengeRight
          .findById(
            rightDocumentId
          ),
        session
      );
    if (!canonical) {
      fail(
        "REVENGE_RIGHT_INVALID",
        "RevengeRight no longer exists",
        {
          statusCode: 409,
        }
      );
    }

    if (
      canonical.status ===
        "CONSUMED" &&
      canonical
        .consumedByMatchId ===
        consumingMatchId &&
      sameId(
        canonical
          .consumedByMatchDocumentId,
        consumingMatchDocumentId
      )
    ) {
      return canonical;
    }
    if (
      canonical.status ===
      "CONSUMED"
    ) {
      fail(
        "REVENGE_RIGHT_ALREADY_CONSUMED",
        "RevengeRight was consumed by another match",
        {
          statusCode: 409,
        }
      );
    }
    if (
      canonical.status ===
        "INVALID" ||
      canonical.status ===
        "EXPIRED" ||
      observedAt >=
        canonical.expiresAt
    ) {
      fail(
        canonical.status ===
            "INVALID"
          ? "REVENGE_RIGHT_INVALID"
          : "REVENGE_RIGHT_EXPIRED",
        "RevengeRight is no longer consumable",
        {
          statusCode: 409,
        }
      );
    }

    if (
      consumedByMatch
        .matchType !==
        "REVENGE" ||
      consumedByMatch.status !==
        "MATCHED" ||
      !sameId(
        consumedByMatch
          .seasonId,
        canonical.seasonId
      ) ||
      !sameId(
        consumedByMatch
          .policyVersionId,
        canonical
          .policyVersionId
      ) ||
      consumedByMatch
        .activeRanking !==
        canonical.rankingType ||
      !sameId(
        consumedByMatch
          .challengerUserId,
        canonical
          .entitledUserId
      ) ||
      !sameId(
        consumedByMatch
          .defenderUserId,
        canonical.targetUserId
      ) ||
      consumedByMatch
        .assignmentAudit
        ?.sourceMatchId !==
        canonical
          .sourceMatchId ||
      ![
        canonical.rightId,
        String(
          canonical._id
        ),
      ].includes(
        String(
          consumedByMatch
            .assignmentAudit
            ?.revengeRightId ||
            ""
        )
      )
    ) {
      fail(
        "REVENGE_CONSUMING_MATCH_MISMATCH",
        "consuming match does not match the server-issued RevengeRight",
        {
          statusCode: 409,
        }
      );
    }

    const sourceMatch =
      await queryWithSession(
        RankTakeoverMatch
          .findById(
            canonical
              .sourceMatchDocumentId
          ),
        session
      );
    const sourceProblem =
      sourceStateProblem(
        sourceMatch
      );
    if (sourceProblem) {
      throwSourceProblem(
        sourceProblem
      );
    }
    assertRightMatchesSource({
      right: canonical,
      sourceMatch,
    });

    const consumed =
      await ArenaRevengeRight
        .findOneAndUpdate(
          {
            _id:
              canonical._id,
            status:
              "AVAILABLE",
            expiresAt: {
              $gt:
                observedAt,
            },
            consumedByMatchId:
              null,
          },
          {
            $set: {
              status:
                "CONSUMED",
              consumedByMatchId:
                consumingMatchId,
              consumedByMatchDocumentId:
                consumingMatchDocumentId,
              consumedAt:
                observedAt,
            },
            $push: {
              stateHistory: {
                status:
                  "CONSUMED",
                reasonCode:
                  "CONSUMED_BY_REVENGE_MATCH",
                occurredAt:
                  observedAt,
                relatedMatchId:
                  consumingMatchId,
              },
            },
            $inc: {
              version: 1,
            },
          },
          {
            returnDocument:
              "after",
            runValidators: true,
            session,
          }
        );
    if (consumed) {
      return consumed;
    }
    const afterConflict =
      await queryWithSession(
        ArenaRevengeRight
          .findById(
            canonical._id
          ),
        session
      );
    if (
      afterConflict
        ?.status ===
        "CONSUMED" &&
      afterConflict
        .consumedByMatchId ===
        consumingMatchId &&
      sameId(
        afterConflict
          .consumedByMatchDocumentId,
        consumingMatchDocumentId
      )
    ) {
      return afterConflict;
    }
    fail(
      "REVENGE_RIGHT_ALREADY_CONSUMED",
      "RevengeRight was consumed concurrently by another match",
      {
        statusCode: 409,
      }
    );
  }

  async function reconcileSourceMatch(
    input
  ) {
    const sourceMatchId =
      requiredText(
        input?.sourceMatchId,
        "sourceMatchId",
        160
      );
    const observedAt =
      asDate(
        input?.now || now(),
        "now"
      );
    const manualReason =
      input
        ?.reasonCode ||
      null;
    if (
      manualReason &&
      manualReason !==
        "MANUAL_INTEGRITY_REVOCATION"
    ) {
      fail(
        "INVALID_REVENGE_INVALIDATION_REASON",
        "manual source reconciliation can use only the explicit integrity revocation reason",
        {
          statusCode: 400,
        }
      );
    }
    return runInTransaction(
      async (session) => {
        const right =
          await queryWithSession(
            ArenaRevengeRight
              .findOne({
                sourceMatchId,
              }),
            session
          );
        if (!right) {
          return null;
        }
        if (
          right.status ===
          "INVALID"
        ) {
          return right;
        }
        const sourceMatch =
          await queryWithSession(
            RankTakeoverMatch
              .findOne({
                matchId:
                  sourceMatchId,
              }),
            session
          );
        const problem =
          sourceStateProblem(
            sourceMatch
          );
        if (
          !problem &&
          !manualReason
        ) {
          return right;
        }
        const reasonCode =
          manualReason ||
          problem.reasonCode;
        const invalidated =
          await ArenaRevengeRight
            .findOneAndUpdate(
              {
                _id:
                  right._id,
                status: {
                  $ne:
                    "INVALID",
                },
              },
              {
                $set: {
                  status:
                    "INVALID",
                  invalidatedAt:
                    observedAt,
                  invalidationReasonCode:
                    reasonCode,
                },
                $push: {
                  stateHistory: {
                    status:
                      "INVALID",
                    reasonCode,
                    occurredAt:
                      observedAt,
                    relatedMatchId:
                      sourceMatchId,
                  },
                },
                $inc: {
                  version: 1,
                },
              },
              {
                returnDocument:
                  "after",
                runValidators:
                  true,
                session,
              }
            );
        return (
          invalidated ||
          queryWithSession(
            ArenaRevengeRight
              .findById(
                right._id
              ),
            session
          )
        );
      },
      input?.session || null
    );
  }

  async function handleTakeoverSettledOutboxEvent(
    input
  ) {
    const event =
      input?.event;
    if (
      !event ||
      event.eventType !==
        "TAKEOVER_SETTLED" ||
      event.aggregateType !==
        "RankTakeoverMatch"
    ) {
      fail(
        "INVALID_REVENGE_OUTBOX_EVENT",
        "only a RankTakeoverMatch TAKEOVER_SETTLED event can issue a RevengeRight",
        {
          statusCode: 400,
        }
      );
    }
    const aggregateMatchId =
      requiredText(
        event.aggregateId,
        "event.aggregateId",
        160
      );
    const payloadMatchId =
      event.payload
        ?.matchId
        ? requiredText(
            event.payload
              .matchId,
            "event.payload.matchId",
            160
          )
        : aggregateMatchId;
    if (
      aggregateMatchId !==
      payloadMatchId
    ) {
      fail(
        "INVALID_REVENGE_OUTBOX_EVENT",
        "outbox aggregate and payload match IDs differ",
        {
          statusCode: 409,
        }
      );
    }
    try {
      return await issueFromSettledMatch({
        sourceMatchId:
          aggregateMatchId,
        now:
          input?.now ||
          now(),
        session:
          input?.session ||
          null,
      });
    } catch (error) {
      if (
        error.code ===
        "REVENGE_RIGHT_NOT_EARNED"
      ) {
        return null;
      }
      throw error;
    }
  }

  return Object.freeze({
    consumeRevengeRight,
    handleTakeoverSettledOutboxEvent,
    issueFromSettledMatch,
    reconcileSourceMatch,
    resolveRevengeRight,
  });
}

const defaultService =
  createArenaRevengeRightService();

module.exports = {
  ArenaRevengeRightError,
  consumeRevengeRight:
    defaultService
      .consumeRevengeRight,
  createArenaRevengeRightService,
  handleTakeoverSettledOutboxEvent:
    defaultService
      .handleTakeoverSettledOutboxEvent,
  issueFromSettledMatch:
    defaultService
      .issueFromSettledMatch,
  reconcileSourceMatch:
    defaultService
      .reconcileSourceMatch,
  resolveRevengeRight:
    defaultService
      .resolveRevengeRight,
};
