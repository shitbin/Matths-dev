const mongoose = require("mongoose");

const { Schema } = mongoose;

const timeOfDayPattern =
  /^([01]\d|2[0-3]):[0-5]\d$/;

function nullableSafeIntegerField({
  min = 0,
  max,
} = {}) {
  const field = {
    type: Number,
    min,
    default: null,
    validate: {
      validator(value) {
        return (
          value === null ||
          value === undefined ||
          Number.isSafeInteger(value)
        );
      },
      message:
        "{PATH} must be a safe integer",
    },
  };
  if (max !== undefined) {
    field.max = max;
  }
  return field;
}

const completionPassSchema =
  new Schema(
    {
      cycleDay: {
        type: Number,
        min: 30,
        max: 30,
        default: 30,
      },
      opensAtKst: {
        type: String,
        match: timeOfDayPattern,
        default: null,
      },
      deadlineAtKst: {
        type: String,
        match: timeOfDayPattern,
        default: null,
      },
      allowedActivityTypes: {
        type: [
          {
            type: String,
            enum: [
              "PRACTICE",
              "QUICK_PRACTICE",
              "ASSESSMENT",
              "PLACEMENT",
              "OFFICIAL_MOCK",
              "WRONG_NOTE_REVIEW",
            ],
          },
        ],
        default: undefined,
      },
    },
    {
      _id: false,
    }
  );

const stakeByRangeSchema =
  new Schema(
    {
      oneStep: {
        type: Number,
        min: 1,
        required: true,
      },
      twoSteps: {
        type: Number,
        min: 1,
        required: true,
      },
      threeOrMoreSteps: {
        type: Number,
        min: 1,
        required: true,
      },
    },
    {
      _id: false,
    }
  );

const policyVersionSchema =
  new Schema(
    {
      key: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 80,
        default: "GOAT_ARENA",
        required: true,
      },
      version: {
        type: String,
        trim: true,
        maxlength: 40,
        required: true,
      },
      effectiveFrom: {
        type: Date,
        required: true,
      },
      effectiveTo: {
        type: Date,
        default: null,
      },

      timezone: {
        type: String,
        enum: ["Asia/Seoul"],
        default: "Asia/Seoul",
      },
      cycleLengthDays: {
        type: Number,
        min: 30,
        max: 30,
        default: 30,
      },
      paidAccessDays: {
        type: Number,
        min: 29,
        max: 29,
        default: 29,
      },
      startingRefundChallengeDays: {
        type: Number,
        min: 29,
        max: 29,
        default: 29,
      },
      subNormalTakeoverCostDays: {
        type: Number,
        min: 1,
        max: 1,
        default: 1,
      },
      subRevengeCostDays: {
        type: Number,
        min: 2,
        max: 2,
        default: 2,
      },
      minCompletedSubChallenges: {
        type: Number,
        min: 2,
        default: 2,
      },
      subChallengeRequestLimit: {
        // null은 주기·시즌 총량 상한 없음이다. API rate limit과는 별개다.
        type: Number,
        min: 1,
        default: null,
      },
      newChallengeCutoffCycleDay: {
        type: Number,
        min: 28,
        max: 28,
        default: 28,
      },
      maxConcurrentMatchesPerUser: {
        type: Number,
        min: 1,
        max: 1,
        default: 1,
      },
      defenseAssignmentCapOffset: {
        type: Number,
        min: 0,
        default: 2,
      },
      maxDefenseAssignmentsPerDay: {
        type: Number,
        min: 1,
        default: 1,
      },
      postMatchProtectionHours: {
        type: Number,
        min: 0,
        default: null,
      },
      postMatchProtectionScope: {
        // 보호 대상은 상품 정책에 따라 달라질 수 있다. 문서가 대상을
        // 확정하지 않았으므로 게시 전에는 null로 두고 정산을 막는다.
        type: String,
        enum: [
          "BOTH_PARTICIPANTS",
          "CHALLENGER_ONLY",
          "DEFENDER_ONLY",
          "WINNER_ONLY",
          "LOSER_ONLY",
          null,
        ],
        default: null,
      },
      sameOpponentCooldownDays: {
        type: Number,
        min: 0,
        default: 7,
      },
      revengeRightHours: {
        type: Number,
        min: 1,
        default: 24,
      },

      mainNormalStakeDaysByRange: {
        type: stakeByRangeSchema,
        default: () => ({
          oneStep: 2,
          twoSteps: 4,
          threeOrMoreSteps: 6,
        }),
      },
      mainRevengeStakeDaysByRange: {
        type: stakeByRangeSchema,
        default: () => ({
          oneStep: 3,
          twoSteps: 5,
          threeOrMoreSteps: 7,
        }),
      },
      revengeFeeBurnDays: {
        type: Number,
        min: 1,
        max: 1,
        default: 1,
      },
      shopSettlementAccount: {
        type: String,
        enum: ["OPERATOR_VAULT"],
        default: "OPERATOR_VAULT",
      },

      completionPass: {
        type: completionPassSchema,
        default: () => ({
          cycleDay: 30,
        }),
      },
      minRecognizedProblemsPerDay: {
        // 상품·법무 결정 전에는 null이며 실제 출석 판정을 열지 않는다.
        type: Number,
        min: 1,
        default: null,
      },
      minValidStudySecondsPerDay: {
        type: Number,
        min: 1,
        default: null,
      },
      noShowCountsAsCompletedChallenge: {
        type: Boolean,
        default: null,
      },
      noShowCountsAsDefenseWin: {
        type: Boolean,
        default: null,
      },
      arenaTierStepMappingVersion: {
        type: String,
        trim: true,
        maxlength: 80,
        default: null,
      },
      arenaTierStepPositionCeilings: {
        type: [
          {
            type: Number,
            min: 1,
            validate: {
              validator:
                Number.isSafeInteger,
              message:
                "arena tier position ceiling must be a safe integer",
            },
          },
        ],
        default: null,
        validate: {
          validator(value) {
            return (
              value === null ||
              value === undefined ||
              (Array.isArray(value) &&
                value.length === 9 &&
                value.every(
                  (
                    ceiling,
                    index
                  ) =>
                    Number.isSafeInteger(
                      ceiling
                    ) &&
                    ceiling > 0 &&
                    (index === 0 ||
                      ceiling >
                        value[
                          index - 1
                        ])
                ))
            );
          },
          message:
            "arenaTierStepPositionCeilings must contain exactly nine strictly increasing positive integer ceilings",
        },
      },
      revengeBypassesProtection: {
        type: Boolean,
        default: null,
      },
      revengeBypassesShield: {
        type: Boolean,
        default: null,
      },
      suddenDeathSecondsPerProblem: {
        type: Number,
        min: 1,
        default: null,
      },

      defenseAssignmentAlpha: {
        type: Number,
        min: 0,
        default: null,
      },
      targetDefenseGapHours: {
        type: Number,
        min: 1,
        default: null,
      },
      deterministicAuditJitterMin: {
        type: Number,
        min: 0,
        default: null,
      },
      deterministicAuditJitterMax: {
        type: Number,
        min: 0,
        default: null,
      },

      subDefenderMinHigherPositionGap:
        nullableSafeIntegerField({
          min: 1,
        }),
      subDefenderMaxHigherPositionGap:
        nullableSafeIntegerField({
          min: 1,
        }),
      subRankRangePolicyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },
      recentActivityLookbackMinutes:
        nullableSafeIntegerField({
          min: 1,
        }),
      recentActivityMinEventCount:
        nullableSafeIntegerField({
          min: 1,
        }),
      recentActivityWeightVersion: {
        type: String,
        enum: [
          "EVENT_COUNT_RATIO_V1",
          null,
        ],
        default: null,
      },
      settlementPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },
      deadlinePolicyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },
      startDeadlineMinutes:
        nullableSafeIntegerField({
          min: 0,
        }),
      submissionDeadlineMinutes:
        nullableSafeIntegerField({
          min: 1,
        }),
      questionPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },
      strongRelationPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },
      integrityPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },
      attemptHeartbeatPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        default: null,
      },
      activeSolveTimePolicyVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        default: null,
      },
      maxRecognizedHeartbeatIntervalMs:
        nullableSafeIntegerField({
          min: 1,
        }),
      networkReconnectGraceMs:
        nullableSafeIntegerField({
          min: 0,
        }),

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      publishedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: "documentVersion",
      optimisticConcurrency: true,
    }
  );

policyVersionSchema.index(
  {
    key: 1,
    version: 1,
  },
  {
    unique: true,
  }
);
policyVersionSchema.index({
  key: 1,
  effectiveFrom: -1,
});

policyVersionSchema.pre(
  "validate",
  function validatePolicyDates() {
    if (
      this.effectiveTo &&
      this.effectiveFrom &&
      this.effectiveTo <=
        this.effectiveFrom
    ) {
      this.invalidate(
        "effectiveTo",
        "effectiveTo must be after effectiveFrom"
      );
    }
    if (
      this.deterministicAuditJitterMin !==
        null &&
      this.deterministicAuditJitterMax !==
        null &&
      this.deterministicAuditJitterMin >
        this.deterministicAuditJitterMax
    ) {
      this.invalidate(
        "deterministicAuditJitterMax",
        "jitter max must be greater than or equal to min"
      );
    }
    if (
      this
        .subDefenderMinHigherPositionGap !==
        null &&
      this
        .subDefenderMaxHigherPositionGap !==
        null &&
      this
        .subDefenderMaxHigherPositionGap <
        this
          .subDefenderMinHigherPositionGap
    ) {
      this.invalidate(
        "subDefenderMaxHigherPositionGap",
        "Sub defender maximum higher-position gap must be greater than or equal to the minimum"
      );
    }
    if (
      this.startDeadlineMinutes !==
        null &&
      this.submissionDeadlineMinutes !==
        null &&
      this.startDeadlineMinutes >
        this.submissionDeadlineMinutes
    ) {
      this.invalidate(
        "submissionDeadlineMinutes",
        "submission deadline must not precede the start deadline"
      );
    }
  }
);

const PolicyVersion =
  mongoose.models.PolicyVersion ||
  mongoose.model(
    "PolicyVersion",
    policyVersionSchema
  );

module.exports = {
  PolicyVersion,
};
