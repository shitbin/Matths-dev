const mongoose = require("mongoose");

const { Schema } = mongoose;

// 이 파일의 결제·환불 생명주기 모델은 GOAT Arena의 학습일수 지갑
// `AccessCycle`과 필드·상태 계약이 다르다. 두 스키마가 같은 Mongoose 모델명으로
// 등록되면 서버 require 순서에 따라 먼저 등록된 스키마가 다른 쪽까지 가로챈다.
// 저장소와 모델명을 명시적으로 분리해 로드 순서가 데이터 계약을 바꾸지 못하게 한다.
const ACCESS_CYCLE_LIFECYCLE_MODEL_NAME =
  "AccessCycleLifecycle";
const ACCESS_CYCLE_LIFECYCLE_COLLECTION =
  "accesscyclelifecycles";

const ACCESS_CYCLE_STATUSES =
  Object.freeze([
    "PAYMENT_PENDING",
    "SUB_ACTIVE",
    "SUB_CLOSING",
    "REFUND_REVIEW",
    "REFUND_HELD",
    "PAYBACK_COMPLETED",
    "PAYBACK_FAILED",
    "MAIN_ACTIVE",
    "MAIN_SETTLING",
    "CLOSED",
    "PAYMENT_DISPUTED",
    "SUSPENDED",
    "CANCELLED",
  ]);

const ACTIVE_CYCLE_STATUSES =
  Object.freeze([
    "PAYMENT_PENDING",
    "SUB_ACTIVE",
    "SUB_CLOSING",
    "REFUND_REVIEW",
    "REFUND_HELD",
    "PAYBACK_COMPLETED",
    "MAIN_ACTIVE",
    "MAIN_SETTLING",
    "PAYMENT_DISPUTED",
    "SUSPENDED",
  ]);

const REFUND_STATUSES =
  Object.freeze([
    "NOT_STARTED",
    "PENDING",
    "ELIGIBLE",
    "INELIGIBLE",
    "PAYOUT_REQUESTED",
    "PAYOUT_PROCESSING",
    "COMPLETED",
    "HELD",
    "FAILED",
  ]);

const dateKeyPattern =
  /^\d{4}-\d{2}-\d{2}$/;

function nonNegativeIntegerField(
  defaultValue = 0
) {
  return {
    type: Number,
    min: 0,
    default: defaultValue,
    validate: {
      validator:
        Number.isSafeInteger,
      message:
        "{PATH} must be an integer",
    },
  };
}

const accessCycleSchema =
  new Schema(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      paymentOrderId: {
        type: Schema.Types.ObjectId,
        ref: "PaymentOrder",
        required: true,
        unique: true,
      },
      policyVersionId: {
        type: Schema.Types.ObjectId,
        ref: "PolicyVersion",
        required: true,
        index: true,
      },
      previousCycleId: {
        type: Schema.Types.ObjectId,
        ref:
          ACCESS_CYCLE_LIFECYCLE_MODEL_NAME,
        default: null,
      },

      status: {
        type: String,
        enum:
          ACCESS_CYCLE_STATUSES,
        default: "PAYMENT_PENDING",
        index: true,
      },
      refundStatus: {
        type: String,
        enum: REFUND_STATUSES,
        default: "NOT_STARTED",
        index: true,
      },
      activeRanking: {
        type: String,
        enum: ["SUB", "MAIN", null],
        default: null,
        index: true,
      },

      startedAt: {
        type: Date,
        default: null,
      },
      paidAccessStartsOn: {
        type: String,
        match: dateKeyPattern,
        default: null,
      },
      paidAccessEndsOn: {
        type: String,
        match: dateKeyPattern,
        default: null,
      },
      day30ReviewOn: {
        type: String,
        match: dateKeyPattern,
        default: null,
      },
      day30CompletionOpensAt: {
        type: Date,
        default: null,
      },
      day30CompletionDeadlineAt: {
        type: Date,
        default: null,
      },
      day30ReviewAt: {
        type: Date,
        default: null,
      },
      completionPassUsedAt: {
        type: Date,
        default: null,
      },
      closedAt: {
        type: Date,
        default: null,
      },

      paidAccessDaysGranted:
        nonNegativeIntegerField(
          29
        ),
      refundChallengeDays:
        nonNegativeIntegerField(),
      lockedRefundDays:
        nonNegativeIntegerField(),
      bonusAccessDays:
        nonNegativeIntegerField(),
      lockedBonusDays:
        nonNegativeIntegerField(),

      cycleStreakDays:
        nonNegativeIntegerField(),
      lastRecognizedAttendanceDate: {
        type: String,
        match: dateKeyPattern,
        default: null,
      },

      completedSubNormalChallenges:
        nonNegativeIntegerField(),
      completedSubRevengeChallenges:
        nonNegativeIntegerField(),
      completedSubChallenges:
        nonNegativeIntegerField(),
      challengeRequestCount:
        nonNegativeIntegerField(),
      defenseAssignmentsInCycle:
        nonNegativeIntegerField(),
      defenseWinsInCycle:
        nonNegativeIntegerField(),
      lastDefenseAssignedAt: {
        type: Date,
        default: null,
      },

      refundAttendanceConditionMet: {
        type: Boolean,
        default: false,
      },
      refundBalanceConditionMet: {
        type: Boolean,
        default: false,
      },
      refundMinimumChallengeConditionMet: {
        type: Boolean,
        default: false,
      },
      refundEligible: {
        type: Boolean,
        default: false,
      },
      refundCompletedAt: {
        type: Date,
        default: null,
      },

      autoRenewEnabled: {
        type: Boolean,
        default: false,
      },
      integrityState: {
        type: String,
        enum: [
          "CLEAR",
          "HELD",
          "INVALID",
        ],
        default: "CLEAR",
      },
      legacyAccessCycleMigration: {
        sourceCollection: {
          type: String,
          immutable: true,
          enum: ["accesscycles"],
        },
        sourceDigest: {
          type: String,
          immutable: true,
          match: /^[a-f0-9]{64}$/,
        },
        migratedAt: {
          type: Date,
          immutable: true,
        },
      },
    },
    {
      timestamps: true,
      versionKey: "version",
      optimisticConcurrency: true,
    }
  );

accessCycleSchema.index(
  {
    userId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in:
          ACTIVE_CYCLE_STATUSES,
      },
    },
    name: "one_active_cycle_per_user",
  }
);
accessCycleSchema.index({
  status: 1,
  day30ReviewOn: 1,
});
accessCycleSchema.index({
  refundStatus: 1,
  day30ReviewOn: 1,
});
accessCycleSchema.index({
  activeRanking: 1,
  status: 1,
});

accessCycleSchema.pre(
  "validate",
  function validateCycleState() {
    if (
      this.paidAccessDaysGranted !==
      29
    ) {
      this.invalidate(
        "paidAccessDaysGranted",
        "paid access grant must be 29 days"
      );
    }
    if (
      this.completedSubChallenges !==
      this
        .completedSubNormalChallenges +
        this
          .completedSubRevengeChallenges
    ) {
      this.invalidate(
        "completedSubChallenges",
        "completed challenge total must equal normal plus revenge"
      );
    }
    if (
      this.status === "SUB_ACTIVE" &&
      this.activeRanking !== "SUB"
    ) {
      this.invalidate(
        "activeRanking",
        "SUB_ACTIVE cycle must use SUB ranking"
      );
    }
    if (
      this.status === "MAIN_ACTIVE" &&
      this.activeRanking !== "MAIN"
    ) {
      this.invalidate(
        "activeRanking",
        "MAIN_ACTIVE cycle must use MAIN ranking"
      );
    }
    if (
      this.day30ReviewAt &&
      this
        .day30CompletionDeadlineAt &&
      this.day30ReviewAt <
        this
          .day30CompletionDeadlineAt
    ) {
      this.invalidate(
        "day30ReviewAt",
        "Day 30 review cannot run before the completion deadline"
      );
    }
  }
);

const AccessCycle =
  mongoose.models[
    ACCESS_CYCLE_LIFECYCLE_MODEL_NAME
  ] ||
  mongoose.model(
    ACCESS_CYCLE_LIFECYCLE_MODEL_NAME,
    accessCycleSchema,
    ACCESS_CYCLE_LIFECYCLE_COLLECTION
  );

module.exports = {
  ACCESS_CYCLE_LIFECYCLE_COLLECTION,
  ACCESS_CYCLE_LIFECYCLE_MODEL_NAME,
  ACCESS_CYCLE_STATUSES,
  ACTIVE_CYCLE_STATUSES,
  AccessCycle,
  REFUND_STATUSES,
};
