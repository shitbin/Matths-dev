const mongoose = require("mongoose");

const { Schema } = mongoose;

/*
 * 29일 유료 이용권, 페이백 도전 잔액, 페이백 뒤 추가 학습권은 서로 다른
 * 권리다. 한 숫자에 합치면 랭킹 정산이 유료 이용기간을 깎는 사고가 생긴다.
 *
 * 이 모델은 `Matths 서비스 종합 기획서 v1.0` 2절의 분리 원칙을 DB에서도
 * 강제한다. paidAccessDays 는 구매로 보장된 일수이며 Rank Takeover 코드가
 * 변경할 수 있는 필드는 refundChallengeDays / bonusAccessDays / lockedDays뿐이다.
 */
const learningAccessAccountSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    cycleId: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
      index: true,
    },
    paymentReference: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    purchaseAmountKRW: {
      type: Number,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      enum: ["KRW"],
      default: "KRW",
    },
    cycleStartedAt: {
      type: Date,
      default: null,
    },
    paidAccessStartsAt: {
      type: Date,
      default: null,
    },
    paidAccessEndsAt: {
      type: Date,
      default: null,
    },

    // 서로 대체하거나 합산하지 않는 네 개의 잔액
    paidAccessDays: {
      type: Number,
      min: 0,
      default: 0,
    },
    refundChallengeDays: {
      type: Number,
      min: 0,
      default: 0,
    },
    bonusAccessDays: {
      type: Number,
      min: 0,
      default: 0,
    },
    lockedDays: {
      type: Number,
      min: 0,
      default: 0,
    },

    streakDays: {
      type: Number,
      min: 0,
      default: 0,
    },
    lastQualifiedStudyDayKey: {
      type: String,
      match: /^\d{4}-\d{2}-\d{2}$/,
      default: null,
    },

    // 계정 문서는 패키지 구매 시 만들어지므로 활성 랭킹은 둘 중 하나다.
    activeRanking: {
      type: String,
      enum: ["SUB", "MAIN"],
      default: "SUB",
      index: true,
    },
    mainRankingEnteredAt: {
      type: Date,
      default: null,
    },
    rankShieldUntil: {
      type: Date,
      default: null,
    },
    activeTakeoverCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    refundStatus: {
      type: String,
      enum: [
        "CHALLENGING",
        "ELIGIBLE",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
      ],
      default: "CHALLENGING",
      index: true,
    },
    refundEligibleAt: {
      type: Date,
      default: null,
    },
    refundCompletedAt: {
      type: Date,
      default: null,
    },
    refundFailureReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: "version",
    optimisticConcurrency: true,
  }
);

learningAccessAccountSchema.index(
  { paymentReference: 1 },
  {
    unique: true,
    partialFilterExpression: {
      paymentReference: { $type: "string" },
    },
  }
);
learningAccessAccountSchema.index({
  activeRanking: 1,
  refundStatus: 1,
});

/*
 * 잔액을 바꾸는 모든 작업의 감사 로그. API 재시도로 같은 결제가 두 번
 * 반영되지 않도록 accountId + idempotencyKey 를 유일하게 잡는다.
 */
const accessLedgerEntrySchema = new Schema(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "LearningAccessAccount",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    cycleId: {
      type: String,
      trim: true,
      maxlength: 120,
      required: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      maxlength: 200,
      required: true,
    },
    bucket: {
      type: String,
      enum: [
        "PAID_ACCESS",
        "REFUND_CHALLENGE",
        "BONUS_ACCESS",
        "LOCKED",
      ],
      required: true,
    },
    deltaDays: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      min: 0,
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "PACKAGE_PURCHASE",
        "REFUND_SETTLEMENT",
        "TAKEOVER_LOCK",
        "TAKEOVER_UNLOCK",
        "DEFENSE_WIN",
        "CHALLENGER_WIN_BURN",
        "DAILY_ACCESS_USE",
        "RANK_STORE_PURCHASE",
        "EXPIRATION",
        "ADMIN_ADJUSTMENT",
      ],
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    occurredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

accessLedgerEntrySchema.index(
  {
    accountId: 1,
    idempotencyKey: 1,
  },
  {
    unique: true,
  }
);
accessLedgerEntrySchema.index({
  userId: 1,
  occurredAt: -1,
});

const LearningAccessAccount =
  mongoose.models.LearningAccessAccount ||
  mongoose.model(
    "LearningAccessAccount",
    learningAccessAccountSchema
  );

const AccessLedgerEntry =
  mongoose.models.AccessLedgerEntry ||
  mongoose.model(
    "AccessLedgerEntry",
    accessLedgerEntrySchema
  );

module.exports = {
  AccessLedgerEntry,
  LearningAccessAccount,
};
