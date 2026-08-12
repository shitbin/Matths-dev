const mongoose = require("mongoose");

const { Schema } = mongoose;

const ARENA_RANKING_TYPES =
  Object.freeze(["SUB", "MAIN"]);

const TAKEOVER_MATCH_TYPES =
  Object.freeze([
    "NORMAL",
    "REVENGE",
  ]);

const TAKEOVER_MATCH_STATUSES =
  Object.freeze([
    "REQUESTED",
    "MATCHED",
    "READY",
    "IN_PROGRESS",
    "SUBMITTED",
    "HELD",
    "RESOLVED",
    "SETTLED",
    "INVALID",
    "CANCELLED",
  ]);

const ACTIVE_TAKEOVER_MATCH_STATUSES =
  Object.freeze([
    "REQUESTED",
    "MATCHED",
    "READY",
    "IN_PROGRESS",
    "SUBMITTED",
    "HELD",
    "RESOLVED",
  ]);

const MATCH_STATUS_TRANSITIONS =
  Object.freeze({
    REQUESTED: Object.freeze([
      "MATCHED",
      "CANCELLED",
    ]),
    MATCHED: Object.freeze([
      "READY",
      "HELD",
      "CANCELLED",
    ]),
    READY: Object.freeze([
      "IN_PROGRESS",
      "HELD",
      "CANCELLED",
    ]),
    IN_PROGRESS: Object.freeze([
      "SUBMITTED",
      "HELD",
    ]),
    SUBMITTED: Object.freeze([
      "RESOLVED",
      "HELD",
    ]),
    HELD: Object.freeze([
      "RESOLVED",
      "INVALID",
    ]),
    RESOLVED: Object.freeze([
      "SETTLED",
    ]),
    SETTLED: Object.freeze([]),
    INVALID: Object.freeze([]),
    CANCELLED: Object.freeze([]),
  });

const STAKE_ASSET_TYPES =
  Object.freeze([
    "REFUND_CHALLENGE_DAY",
    "BONUS_ACCESS_DAY",
  ]);

const SETTLEMENT_REASONS =
  Object.freeze([
    "SCORED_RESULT",
    "CHALLENGER_NO_SHOW",
    "DEFENDER_NO_SHOW",
    "BOTH_NO_SHOW",
    "QUESTION_INVALID",
    "SERVER_FAILURE",
    "SERVER_CANCELLED",
  ]);

const POSITION_OUTCOMES =
  Object.freeze([
    "UNCHANGED",
    "SWAPPED",
  ]);

const MATCHED_OR_LATER_STATUSES =
  new Set([
    "MATCHED",
    "READY",
    "IN_PROGRESS",
    "SUBMITTED",
    "HELD",
    "RESOLVED",
    "SETTLED",
    "INVALID",
  ]);

function isSafeInteger(value) {
  return Number.isSafeInteger(value);
}

function integerField({
  min = 0,
  required = false,
  defaultValue,
} = {}) {
  const field = {
    type: Number,
    min,
    required,
    validate: {
      validator: (value) =>
        value === null
          ? !required
          : isSafeInteger(value),
      message:
        "{PATH} must be an integer",
    },
  };

  if (defaultValue !== undefined) {
    field.default = defaultValue;
  }

  return field;
}

function sameObjectId(left, right) {
  return Boolean(
    left &&
      right &&
      String(left) === String(right)
  );
}

function canTransitionMatchStatus(
  currentStatus,
  nextStatus
) {
  const nextStatuses =
    MATCH_STATUS_TRANSITIONS[
      currentStatus
    ];
  return Boolean(
    nextStatuses &&
      nextStatuses.includes(
        nextStatus
      )
  );
}

function mainStakeDaysForGap(
  stakeDaysByRange,
  tierStepGap
) {
  if (
    !stakeDaysByRange ||
    !isSafeInteger(tierStepGap)
  ) {
    return null;
  }
  if (tierStepGap === 1) {
    return stakeDaysByRange.oneStep;
  }
  if (tierStepGap === 2) {
    return stakeDaysByRange.twoSteps;
  }
  return stakeDaysByRange
    .threeOrMoreSteps;
}

const mainTierStepStakeDaysSchema =
  new Schema(
    {
      matchType: {
        type: String,
        enum:
          TAKEOVER_MATCH_TYPES,
        required: true,
      },
      oneStep: integerField({
        min: 1,
        required: true,
      }),
      twoSteps: integerField({
        min: 1,
        required: true,
      }),
      threeOrMoreSteps:
        integerField({
          min: 1,
          required: true,
        }),
    },
    {
      _id: false,
    }
  );

const challengeCostSnapshotSchema =
  new Schema(
    {
      assetType: {
        type: String,
        enum: STAKE_ASSET_TYPES,
        required: true,
      },
      availableAccount: {
        type: String,
        enum: [
          "USER_REFUND_AVAILABLE",
          "USER_BONUS_AVAILABLE",
        ],
        required: true,
      },
      lockedAccount: {
        type: String,
        enum: [
          "USER_REFUND_LOCKED",
          "USER_BONUS_LOCKED",
        ],
        required: true,
      },
      stakeDays: integerField({
        min: 1,
        required: true,
      }),
      challengerWinBurnDays:
        integerField({
          min: 0,
          required: true,
        }),
      challengerLossDefenderPayoutDays:
        integerField({
          min: 0,
          required: true,
        }),
      challengerLossFeeBurnDays:
        integerField({
          min: 0,
          required: true,
        }),
      challengeTierStepGap:
        integerField({
          min: 1,
          defaultValue: null,
        }),
      mainTierStepStakeDays: {
        type:
          mainTierStepStakeDaysSchema,
        default: null,
      },
    },
    {
      _id: false,
    }
  );

const deadlinePolicySnapshotSchema =
  new Schema(
    {
      startDeadlineMinutes:
        integerField({
          min: 0,
          required: true,
        }),
      submissionDeadlineMinutes:
        integerField({
          min: 1,
          required: true,
        }),
    },
    {
      _id: false,
    }
  );

deadlinePolicySnapshotSchema.pre(
  "validate",
  function validateDeadlinePolicy() {
    if (
      this.startDeadlineMinutes >
      this
        .submissionDeadlineMinutes
    ) {
      this.invalidate(
        "startDeadlineMinutes",
        "start deadline cannot be after submission deadline"
      );
    }
  }
);

const arenaPositionSettlementSchema =
  new Schema(
    {
      outcome: {
        type: String,
        enum: POSITION_OUTCOMES,
        required: true,
      },
      referenceKey: {
        type: String,
        trim: true,
        maxlength: 200,
        required: true,
      },
      challengerPositionAfter:
        integerField({
          min: 1,
          required: true,
        }),
      defenderPositionAfter:
        integerField({
          min: 1,
          required: true,
        }),
    },
    {
      _id: false,
    }
  );

const settlementResultSchema =
  new Schema(
    {
      toDefenderAvailableDays:
        integerField({
          min: 0,
          required: true,
        }),
      toSystemBurnDays:
        integerField({
          min: 0,
          required: true,
        }),
      toChallengerAvailableDays:
        integerField({
          min: 0,
          required: true,
        }),
    },
    {
      _id: false,
    }
  );

const scoredResultSchema =
  new Schema(
    {
      submissionId: {
        type: String,
        trim: true,
        maxlength: 160,
        required: true,
      },
      calibratedScore: {
        type: Number,
        min: 0,
        required: true,
        validate: {
          validator:
            Number.isFinite,
          message:
            "calibratedScore must be finite",
        },
      },
      advancedCorrectCount:
        integerField({
          min: 0,
          required: true,
        }),
      correctAnswerActiveSolveTimeMs:
        integerField({
          min: 0,
          required: true,
        }),
      integrityState: {
        type: String,
        enum: ["CLEAR"],
        required: true,
      },
      questionVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
      },
      answerKeyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
      },
      calibrationVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
      },
      payloadFingerprint: {
        type: String,
        match: /^[a-f0-9]{64}$/,
        required: true,
      },
      submittedAt: {
        type: Date,
        required: true,
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const skillMmrSnapshotSchema =
  new Schema(
    {
      challenger: {
        type: Number,
        min: 0,
        required: true,
      },
      defender: {
        type: Number,
        min: 0,
        required: true,
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const defenderSelectionSnapshotSchema =
  new Schema(
    {
      auditSchemaVersion: {
        type: String,
        trim: true,
        maxlength: 80,
        default: null,
      },
      requestId: {
        type: String,
        trim: true,
        maxlength: 180,
        default: null,
      },
      requestFingerprint: {
        type: String,
        match: /^[a-f0-9]{64}$/,
        default: null,
      },
      status: {
        type: String,
        trim: true,
        maxlength: 40,
        default: null,
      },
      algorithmVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },
      policyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },
      candidateCount:
        integerField({
          min: 0,
          defaultValue: null,
        }),
      selectionSeedHash: {
        type: String,
        trim: true,
        maxlength: 128,
        default: null,
      },
      candidateSnapshotHash: {
        type: String,
        trim: true,
        maxlength: 128,
        default: null,
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const defenderSelectionAuditSchema =
  new Schema(
    {
      auditId: {
        type: String,
        trim: true,
        maxlength: 160,
        default: null,
      },
      auditSnapshot: {
        type:
          defenderSelectionSnapshotSchema,
        default: null,
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const assignmentAuditSchema =
  new Schema(
    {
      requestFingerprint: {
        type: String,
        match: /^[a-f0-9]{64}$/,
        required: true,
      },
      requestId: {
        type: String,
        trim: true,
        maxlength: 180,
        required: true,
      },
      assignmentType: {
        type: String,
        enum: [
          "REVENGE_RIGHT",
          "WEIGHTED_SERVER_ASSIGNMENT",
          "SERVER_VALIDATED_TARGET",
        ],
        required: true,
      },
      sourceMatchId: {
        type: String,
        trim: true,
        maxlength: 160,
        default: null,
      },
      revengeRightId: {
        type: String,
        trim: true,
        maxlength: 160,
        default: null,
      },
      skillMmrSnapshots: {
        type:
          skillMmrSnapshotSchema,
        required: true,
      },
      questionPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },
      assignedAt: {
        type: Date,
        required: true,
      },
      defenderSelection: {
        type:
          defenderSelectionAuditSchema,
        default: null,
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const rankTakeoverMatchSchema =
  new Schema(
    {
      matchId: {
        type: String,
        trim: true,
        maxlength: 160,
        required: true,
        unique: true,
      },
      seasonId: {
        type: Schema.Types.ObjectId,
        ref: "ArenaSeason",
        required: true,
        immutable: true,
        index: true,
      },
      policyVersionId: {
        type: Schema.Types.ObjectId,
        ref: "PolicyVersion",
        required: true,
        immutable: true,
        index: true,
      },
      activeRanking: {
        type: String,
        enum: ARENA_RANKING_TYPES,
        required: true,
        immutable: true,
        index: true,
      },

      challengerUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
        index: true,
      },
      challengerCycleId: {
        type: Schema.Types.ObjectId,
        ref: "AccessCycleLifecycle",
        required: true,
        immutable: true,
        index: true,
      },
      defenderUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
        index: true,
      },
      defenderCycleId: {
        type: Schema.Types.ObjectId,
        ref: "AccessCycleLifecycle",
        required: true,
        immutable: true,
        index: true,
      },
      participantUserIds: {
        type: [
          {
            type:
              Schema.Types.ObjectId,
            ref: "User",
          },
        ],
        required: true,
        immutable: true,
      },

      challengerPositionBefore:
        {
          ...integerField({
            min: 1,
            required: true,
          }),
          immutable: true,
        },
      defenderPositionBefore: {
        ...integerField({
          min: 1,
          required: true,
        }),
        immutable: true,
      },
      matchType: {
        type: String,
        enum: TAKEOVER_MATCH_TYPES,
        required: true,
        immutable: true,
        index: true,
      },
      challengeCostSnapshot: {
        type:
          challengeCostSnapshotSchema,
        required: true,
        immutable: true,
      },
      deadlinePolicySnapshot: {
        type:
          deadlinePolicySnapshotSchema,
        required: true,
        immutable: true,
      },

      challengeLockTransactionId: {
        type: Schema.Types.ObjectId,
        ref: "DayBalanceTransaction",
        default: null,
        immutable: true,
      },
      challengeLockIdempotencyKey: {
        type: String,
        trim: true,
        maxlength: 240,
        default: null,
        immutable: true,
      },

      status: {
        type: String,
        enum:
          TAKEOVER_MATCH_STATUSES,
        default: "REQUESTED",
        index: true,
      },
      matchedAt: {
        type: Date,
        default: null,
        immutable: true,
      },
      startsBy: {
        type: Date,
        default: null,
        immutable: true,
      },
      startedAt: {
        type: Date,
        default: null,
      },
      challengerStartedAt: {
        type: Date,
        default: null,
      },
      defenderStartedAt: {
        type: Date,
        default: null,
      },
      challengerDeadlineAt: {
        type: Date,
        default: null,
      },
      defenderDeadlineAt: {
        type: Date,
        default: null,
      },
      timeLimitSeconds:
        integerField({
          min: 1,
          defaultValue: null,
        }),
      submitsBy: {
        type: Date,
        default: null,
        immutable: true,
        index: true,
      },
      resolvedAt: {
        type: Date,
        default: null,
      },
      settledAt: {
        type: Date,
        default: null,
      },

      challengerQuestionPackId: {
        type: Schema.Types.ObjectId,
        ref: "ArenaQuestionPack",
        default: null,
      },
      defenderQuestionPackId: {
        type: Schema.Types.ObjectId,
        ref: "ArenaQuestionPack",
        default: null,
      },
      questionVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },
      answerKeyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },
      calibrationVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },
      challengerResult: {
        type: scoredResultSchema,
        default: null,
      },
      defenderResult: {
        type: scoredResultSchema,
        default: null,
      },
      winner: {
        type: String,
        enum: [
          "CHALLENGER",
          "DEFENDER",
          null,
        ],
        default: null,
      },
      tieBreakStage: {
        type: String,
        trim: true,
        maxlength: 120,
        default: null,
      },

      settlementVersion:
        integerField({
          min: 1,
          defaultValue: null,
        }),
      settlementReason: {
        type: String,
        enum: [
          ...SETTLEMENT_REASONS,
          null,
        ],
        default: null,
      },
      settlementResult: {
        type:
          settlementResultSchema,
        default: null,
      },
      settlementTransactionIds: {
        type: [
          {
            type:
              Schema.Types.ObjectId,
            ref:
              "DayBalanceTransaction",
          },
        ],
        default: undefined,
      },
      arenaPositionSettlement: {
        type:
          arenaPositionSettlementSchema,
        default: null,
      },

      assignmentAudit: {
        type: assignmentAuditSchema,
        default: null,
        immutable: true,
        select: false,
      },
      integrityState: {
        type: String,
        enum: [
          "CLEAR",
          "HELD",
          "INVALID",
        ],
        default: "CLEAR",
        index: true,
      },
      holdReason: {
        type: String,
        trim: true,
        maxlength: 500,
        default: null,
      },
      holdResolutionType: {
        type: String,
        enum: [
          "RESOLVED",
          "INVALIDATED",
          null,
        ],
        default: null,
      },
      holdResolutionReference: {
        type: String,
        trim: true,
        maxlength: 180,
        default: null,
      },
      holdResolutionReason: {
        type: String,
        trim: true,
        maxlength: 500,
        default: null,
      },
      holdResolvedByType: {
        type: String,
        enum: [
          "SYSTEM",
          "AUDITOR",
          null,
        ],
        default: null,
      },
      holdResolvedByUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      holdResolvedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: "version",
      optimisticConcurrency: true,
    }
  );

rankTakeoverMatchSchema.index(
  {
    participantUserIds: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in:
          ACTIVE_TAKEOVER_MATCH_STATUSES,
      },
    },
    name:
      "one_active_takeover_match_per_user",
  }
);
rankTakeoverMatchSchema.index({
  challengerUserId: 1,
  status: 1,
});
rankTakeoverMatchSchema.index({
  defenderUserId: 1,
  status: 1,
});
rankTakeoverMatchSchema.index(
  {
    participantUserIds: 1,
    updatedAt: -1,
  },
  {
    name:
      "participant_match_history",
  }
);
rankTakeoverMatchSchema.index({
  seasonId: 1,
  activeRanking: 1,
  status: 1,
  submitsBy: 1,
});
rankTakeoverMatchSchema.index(
  {
    challengeLockTransactionId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      challengeLockTransactionId: {
        $type: "objectId",
      },
    },
    name:
      "one_match_per_lock_transaction",
  }
);
rankTakeoverMatchSchema.index(
  {
    challengeLockIdempotencyKey: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      challengeLockIdempotencyKey: {
        $type: "string",
      },
    },
    name:
      "one_match_per_lock_idempotency_key",
  }
);
rankTakeoverMatchSchema.index(
  {
    "arenaPositionSettlement.referenceKey": 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      "arenaPositionSettlement.referenceKey":
        {
          $type: "string",
        },
    },
    name:
      "one_match_per_position_settlement",
  }
);

rankTakeoverMatchSchema.pre(
  "validate",
  function validateTakeoverMatch() {
    if (
      this.challengerUserId &&
      this.defenderUserId
    ) {
      this.participantUserIds = [
        this.challengerUserId,
        this.defenderUserId,
      ];
    }

    if (
      sameObjectId(
        this.challengerUserId,
        this.defenderUserId
      )
    ) {
      this.invalidate(
        "defenderUserId",
        "challenger and defender must be different users"
      );
    }
    if (
      sameObjectId(
        this.challengerCycleId,
        this.defenderCycleId
      )
    ) {
      this.invalidate(
        "defenderCycleId",
        "challenger and defender must use different cycles"
      );
    }
    if (
      this
        .challengerPositionBefore ===
      this
        .defenderPositionBefore
    ) {
      this.invalidate(
        "defenderPositionBefore",
        "challenger and defender positions must be different"
      );
    }

    const cost =
      this.challengeCostSnapshot;
    if (cost) {
      const expectedAccounts =
        this.activeRanking === "SUB"
          ? {
              assetType:
                "REFUND_CHALLENGE_DAY",
              availableAccount:
                "USER_REFUND_AVAILABLE",
              lockedAccount:
                "USER_REFUND_LOCKED",
            }
          : {
              assetType:
                "BONUS_ACCESS_DAY",
              availableAccount:
                "USER_BONUS_AVAILABLE",
              lockedAccount:
                "USER_BONUS_LOCKED",
            };

      for (const field of [
        "assetType",
        "availableAccount",
        "lockedAccount",
      ]) {
        if (
          cost[field] !==
          expectedAccounts[field]
        ) {
          this.invalidate(
            `challengeCostSnapshot.${field}`,
            `${this.activeRanking} match requires ${expectedAccounts[field]}`
          );
        }
      }

      if (
        cost
          .challengerWinBurnDays !==
        cost.stakeDays
      ) {
        this.invalidate(
          "challengeCostSnapshot.challengerWinBurnDays",
          "challenger-win burn policy must consume the full locked stake"
        );
      }
      if (
        cost
          .challengerLossDefenderPayoutDays +
          cost
            .challengerLossFeeBurnDays !==
        cost.stakeDays
      ) {
        this.invalidate(
          "challengeCostSnapshot.challengerLossDefenderPayoutDays",
          "challenger-loss payout plus fee policy must consume the full locked stake"
        );
      }
      if (
        this.matchType ===
          "NORMAL" &&
        cost
          .challengerLossFeeBurnDays !==
          0
      ) {
        this.invalidate(
          "challengeCostSnapshot.challengerLossFeeBurnDays",
          "normal match cannot include a revenge fee"
        );
      }
      if (
        this.matchType ===
          "REVENGE" &&
        cost
          .challengerLossFeeBurnDays !==
          1
      ) {
        this.invalidate(
          "challengeCostSnapshot.challengerLossFeeBurnDays",
          "revenge match fee snapshot must be one day"
        );
      }
      if (
        this.activeRanking ===
        "SUB"
      ) {
        const expectedSubStake =
          this.matchType ===
          "NORMAL"
            ? 1
            : 2;
        if (
          cost.stakeDays !==
          expectedSubStake
        ) {
          this.invalidate(
            "challengeCostSnapshot.stakeDays",
            `Sub ${this.matchType} stake must be ${expectedSubStake} day(s)`
          );
        }
        if (
          cost
            .challengeTierStepGap !==
          null
        ) {
          this.invalidate(
            "challengeCostSnapshot.challengeTierStepGap",
            "Sub match does not use a tier-step gap"
          );
        }
        if (
          cost
            .mainTierStepStakeDays
        ) {
          this.invalidate(
            "challengeCostSnapshot.mainTierStepStakeDays",
            "Sub match cannot include a Main tier-step policy"
          );
        }
      }
      if (
        this.activeRanking ===
        "MAIN"
      ) {
        if (
          !isSafeInteger(
            cost
              .challengeTierStepGap
          )
        ) {
          this.invalidate(
            "challengeCostSnapshot.challengeTierStepGap",
            "Main match requires a snapshotted tier-step gap"
          );
        }
        if (
          !cost
            .mainTierStepStakeDays
        ) {
          this.invalidate(
            "challengeCostSnapshot.mainTierStepStakeDays",
            "Main match requires its policy-provided tier-step costs"
          );
        } else {
          if (
            cost
              .mainTierStepStakeDays
              .matchType !==
            this.matchType
          ) {
            this.invalidate(
              "challengeCostSnapshot.mainTierStepStakeDays.matchType",
              "Main tier-step policy snapshot must match the match type"
            );
          }
          const expectedMainStake =
            mainStakeDaysForGap(
              cost
                .mainTierStepStakeDays,
              cost
                .challengeTierStepGap
            );
          if (
            cost.stakeDays !==
            expectedMainStake
          ) {
            this.invalidate(
              "challengeCostSnapshot.stakeDays",
              "Main stake must match the injected tier-step policy"
            );
          }
        }
      }
    }

    if (
      MATCHED_OR_LATER_STATUSES.has(
        this.status
      )
    ) {
      if (
        !this
          .challengeLockTransactionId
      ) {
        this.invalidate(
          "challengeLockTransactionId",
          "matched match requires its USER available-to-locked transaction"
        );
      }
      if (
        !this
          .challengeLockIdempotencyKey
      ) {
        this.invalidate(
          "challengeLockIdempotencyKey",
          "matched match requires its lock idempotency key"
        );
      }
      if (!this.matchedAt) {
        this.invalidate(
          "matchedAt",
          "matched match requires matchedAt"
        );
      }
      if (!this.startsBy) {
        this.invalidate(
          "startsBy",
          "matched match requires startsBy"
        );
      }
      if (!this.submitsBy) {
        this.invalidate(
          "submitsBy",
          "matched match requires submitsBy"
        );
      }
    }

    const deadline =
      this.deadlinePolicySnapshot;
    if (
      deadline &&
      this.matchedAt &&
      this.startsBy &&
      this.submitsBy
    ) {
      const minuteMs =
        60 * 1000;
      const expectedStartsBy =
        this.matchedAt.getTime() +
        deadline
          .startDeadlineMinutes *
          minuteMs;
      const expectedSubmitsBy =
        this.matchedAt.getTime() +
        deadline
          .submissionDeadlineMinutes *
          minuteMs;

      if (
        this.startsBy.getTime() !==
        expectedStartsBy
      ) {
        this.invalidate(
          "startsBy",
          "startsBy must come from the snapshotted deadline policy"
        );
      }
      if (
        this.submitsBy.getTime() !==
        expectedSubmitsBy
      ) {
        this.invalidate(
          "submitsBy",
          "submitsBy must come from the snapshotted deadline policy"
        );
      }
    }

    if (
      this.startedAt &&
      this.submitsBy &&
      this.startedAt >
        this.submitsBy
    ) {
      this.invalidate(
        "startedAt",
        "match cannot start after its submission deadline"
      );
    }

    const roleTiming = [
      {
        role: "challenger",
        startedAt:
          this.challengerStartedAt,
        deadlineAt:
          this.challengerDeadlineAt,
        result:
          this.challengerResult,
      },
      {
        role: "defender",
        startedAt:
          this.defenderStartedAt,
        deadlineAt:
          this.defenderDeadlineAt,
        result:
          this.defenderResult,
      },
    ];
    const roleStartTimes =
      roleTiming
        .map(
          ({ startedAt }) =>
            startedAt
        )
        .filter(Boolean);
    if (
      roleStartTimes.length > 0
    ) {
      if (
        !isSafeInteger(
          this.timeLimitSeconds
        ) ||
        this.timeLimitSeconds <
          1
      ) {
        this.invalidate(
          "timeLimitSeconds",
          "a started match requires the sealed pack time limit"
        );
      }
      const earliestStart =
        new Date(
          Math.min(
            ...roleStartTimes.map(
              (date) =>
                date.getTime()
            )
          )
        );
      if (
        !this.startedAt ||
        this.startedAt.getTime() !==
          earliestStart.getTime()
      ) {
        this.invalidate(
          "startedAt",
          "startedAt must equal the first participant start"
        );
      }
    }
    for (const timing of
      roleTiming) {
      if (
        Boolean(
          timing.startedAt
        ) !==
        Boolean(
          timing.deadlineAt
        )
      ) {
        this.invalidate(
          `${timing.role}DeadlineAt`,
          "participant start and personal deadline must be recorded together"
        );
        continue;
      }
      if (
        timing.startedAt &&
        timing.deadlineAt &&
        this.submitsBy &&
        isSafeInteger(
          this.timeLimitSeconds
        )
      ) {
        const expectedDeadline =
          Math.min(
            this.submitsBy.getTime(),
            timing.startedAt.getTime() +
              this
                .timeLimitSeconds *
                1000
          );
        if (
          timing
            .deadlineAt
            .getTime() !==
          expectedDeadline
        ) {
          this.invalidate(
            `${timing.role}DeadlineAt`,
            "personal deadline must be min(common deadline, start + sealed time limit)"
          );
        }
      }
      if (
        timing.result &&
        !timing.startedAt
      ) {
        this.invalidate(
          `${timing.role}Result`,
          "participant cannot submit before their own start"
        );
      }
      if (
        timing.result &&
        timing.startedAt &&
        timing.result
          .submittedAt <
          timing.startedAt
      ) {
        this.invalidate(
          `${timing.role}Result.submittedAt`,
          "participant result cannot be submitted before their own start"
        );
      }
      if (
        timing.result &&
        timing.deadlineAt &&
        timing.result
          .submittedAt >
          timing.deadlineAt
      ) {
        this.invalidate(
          `${timing.role}Result.submittedAt`,
          "participant result cannot be submitted after their personal deadline"
        );
      }
    }
    if (
      this.status ===
        "SUBMITTED" &&
      (!this.challengerResult ||
        !this.defenderResult)
    ) {
      this.invalidate(
        "status",
        "submitted match requires both trusted results"
      );
    }
    const hasHoldResolution =
      Boolean(
        this.holdResolutionType ||
          this
            .holdResolutionReference ||
          this
            .holdResolutionReason ||
          this
            .holdResolvedByType ||
          this
            .holdResolvedByUserId ||
          this.holdResolvedAt
      );
    if (hasHoldResolution) {
      if (
        !this
          .holdResolutionType ||
        !this
          .holdResolutionReference ||
        !this
          .holdResolutionReason ||
        !this
          .holdResolvedByType ||
        !this.holdResolvedAt
      ) {
        this.invalidate(
          "holdResolutionType",
          "hold resolution audit fields must be complete"
        );
      }
      if (
        this
          .holdResolvedByType ===
          "AUDITOR" &&
        !this
          .holdResolvedByUserId
      ) {
        this.invalidate(
          "holdResolvedByUserId",
          "auditor resolution requires its actor user"
        );
      }
      if (
        this
          .holdResolvedByType ===
          "SYSTEM" &&
        this
          .holdResolvedByUserId
      ) {
        this.invalidate(
          "holdResolvedByUserId",
          "system resolution cannot include an auditor user"
        );
      }
    }
    if (
      [
        "RESOLVED",
        "SETTLED",
        "INVALID",
      ].includes(this.status) &&
      !this.resolvedAt
    ) {
      this.invalidate(
        "resolvedAt",
        "resolved match requires resolvedAt"
      );
    }
    if (
      this.status === "HELD" &&
      (this.integrityState !==
        "HELD" ||
        !this.holdReason)
    ) {
      this.invalidate(
        "holdReason",
        "held match requires HELD integrity state and a reason"
      );
    }
    if (
      this.status === "INVALID" &&
      this.integrityState !==
        "INVALID"
    ) {
      this.invalidate(
        "integrityState",
        "invalid match requires INVALID integrity state"
      );
    }

    if (
      [
        "SETTLED",
        "INVALID",
      ].includes(this.status)
    ) {
      const position =
        this.arenaPositionSettlement;
      if (
        !this.settlementReason
      ) {
        this.invalidate(
          "settlementReason",
          "finalized match requires a settlement reason"
        );
      }
      if (!this.settlementResult) {
        this.invalidate(
          "settlementResult",
          "finalized match requires its actual asset flow"
        );
      }
      if (
        !isSafeInteger(
          this.settlementVersion
        )
      ) {
        this.invalidate(
          "settlementVersion",
          "finalized match requires a settlement version"
        );
      }
      if (
        !Array.isArray(
          this
            .settlementTransactionIds
        ) ||
        this
          .settlementTransactionIds
          .length === 0
      ) {
        this.invalidate(
          "settlementTransactionIds",
          "finalized match requires ledger settlement references"
        );
      }
      if (!position) {
        this.invalidate(
          "arenaPositionSettlement",
          "finalized match requires an arena position settlement reference"
        );
      } else if (
        position.outcome ===
          "SWAPPED" &&
        (position
          .challengerPositionAfter !==
          this
            .defenderPositionBefore ||
          position
            .defenderPositionAfter !==
            this
              .challengerPositionBefore)
      ) {
        this.invalidate(
          "arenaPositionSettlement",
          "swapped settlement must exchange the snapshotted positions"
        );
      } else if (
        position.outcome ===
          "UNCHANGED" &&
        (position
          .challengerPositionAfter !==
          this
            .challengerPositionBefore ||
          position
            .defenderPositionAfter !==
            this
              .defenderPositionBefore)
      ) {
        this.invalidate(
          "arenaPositionSettlement",
          "unchanged settlement must preserve the snapshotted positions"
        );
      }

      const result =
        this.settlementResult;
      if (result && cost) {
        const flowTotal =
          result
            .toDefenderAvailableDays +
          result
            .toSystemBurnDays +
          result
            .toChallengerAvailableDays;
        if (
          flowTotal !==
          cost.stakeDays
        ) {
          this.invalidate(
            "settlementResult",
            "actual settlement flow must consume the full locked stake"
          );
        }
      }

      if (this.status === "SETTLED") {
        if (!this.settledAt) {
          this.invalidate(
            "settledAt",
            "settled match requires settledAt"
          );
        }
        if (!this.winner) {
          this.invalidate(
            "winner",
            "settled match requires a winner"
          );
        }
        if (
          ![
            "SCORED_RESULT",
            "CHALLENGER_NO_SHOW",
          ].includes(
            this
              .settlementReason
          )
        ) {
          this.invalidate(
            "settlementReason",
            "settled match requires a scored or challenger no-show reason"
          );
        }
        if (
          this
            .settlementReason ===
            "CHALLENGER_NO_SHOW" &&
          this.winner !==
            "DEFENDER"
        ) {
          this.invalidate(
            "winner",
            "challenger no-show must settle as a defender win"
          );
        }

        if (
          this.winner ===
          "CHALLENGER"
        ) {
          if (
            position &&
            position.outcome !==
              "SWAPPED"
          ) {
            this.invalidate(
              "arenaPositionSettlement.outcome",
              "challenger win must swap arena positions"
            );
          }
          if (
            result &&
            cost &&
            (result
              .toDefenderAvailableDays !==
              0 ||
              result
                .toSystemBurnDays !==
                cost
                  .challengerWinBurnDays ||
              result
                .toChallengerAvailableDays !==
                0)
          ) {
            this.invalidate(
              "settlementResult",
              "challenger-win flow must burn the snapshotted locked stake"
            );
          }
        }

        if (
          this.winner ===
          "DEFENDER"
        ) {
          if (
            position &&
            position.outcome !==
              "UNCHANGED"
          ) {
            this.invalidate(
              "arenaPositionSettlement.outcome",
              "defender win must preserve arena positions"
            );
          }
          if (
            result &&
            cost &&
            (result
              .toDefenderAvailableDays !==
              cost
                .challengerLossDefenderPayoutDays ||
              result
                .toSystemBurnDays !==
                cost
                  .challengerLossFeeBurnDays ||
              result
                .toChallengerAvailableDays !==
                0)
          ) {
            this.invalidate(
              "settlementResult",
              "defender-win flow must match the challenger-loss policy snapshot"
            );
          }
        }
      }

      if (this.status === "INVALID") {
        if (this.winner !== null) {
          this.invalidate(
            "winner",
            "invalid match cannot have a winner"
          );
        }
        if (
          ![
            "DEFENDER_NO_SHOW",
            "BOTH_NO_SHOW",
            "QUESTION_INVALID",
            "SERVER_FAILURE",
          ].includes(
            this
              .settlementReason
          )
        ) {
          this.invalidate(
            "settlementReason",
            "invalid match requires an invalidation reason"
          );
        }
        if (
          position &&
          position.outcome !==
            "UNCHANGED"
        ) {
          this.invalidate(
            "arenaPositionSettlement.outcome",
            "invalid match must preserve arena positions"
          );
        }
        if (
          result &&
          cost &&
          (result
            .toDefenderAvailableDays !==
            0 ||
            result
              .toSystemBurnDays !==
              0 ||
            result
              .toChallengerAvailableDays !==
              cost.stakeDays)
        ) {
          this.invalidate(
            "settlementResult",
            "invalid match must unlock the full stake to the challenger"
          );
        }
      }
    }
  }
);

rankTakeoverMatchSchema.methods
  .canTransitionTo =
  function canTransitionTo(
    nextStatus
  ) {
    return canTransitionMatchStatus(
      this.status,
      nextStatus
    );
  };

rankTakeoverMatchSchema.methods
  .transitionTo =
  function transitionTo(nextStatus) {
    if (
      !this.canTransitionTo(
        nextStatus
      )
    ) {
      const error = new Error(
        `invalid takeover match transition: ${this.status} -> ${nextStatus}`
      );
      error.code =
        "INVALID_MATCH_STATUS_TRANSITION";
      throw error;
    }
    this.status = nextStatus;
    return this;
  };

const RankTakeoverMatch =
  mongoose.models
    .RankTakeoverMatch ||
  mongoose.model(
    "RankTakeoverMatch",
    rankTakeoverMatchSchema
  );

module.exports = {
  ACTIVE_TAKEOVER_MATCH_STATUSES,
  ARENA_RANKING_TYPES,
  MATCH_STATUS_TRANSITIONS,
  POSITION_OUTCOMES,
  RankTakeoverMatch,
  SETTLEMENT_REASONS,
  STAKE_ASSET_TYPES,
  TAKEOVER_MATCH_STATUSES,
  TAKEOVER_MATCH_TYPES,
  canTransitionMatchStatus,
};
