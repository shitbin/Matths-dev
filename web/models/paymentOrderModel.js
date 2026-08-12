const mongoose = require("mongoose");

const { Schema } = mongoose;

const PAYMENT_ORDER_STATUSES =
  Object.freeze([
    "CREATED",
    "PENDING",
    "AUTHORIZED",
    // Part VII의 최종 자격식에 맞춘 결제 확정 상태명.
    "CAPTURED",
    "REFUND_PENDING",
    "PARTIALLY_REFUNDED",
    "REFUNDED",
    "CANCELLED",
    "DISPUTED",
    "FAILED",
  ]);

const paymentOrderSchema =
  new Schema(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      policyVersionId: {
        type: Schema.Types.ObjectId,
        ref: "PolicyVersion",
        required: true,
        index: true,
      },
      provider: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 60,
        required: true,
      },
      providerOrderId: {
        type: String,
        trim: true,
        maxlength: 200,
        required: true,
      },
      providerTransactionId: {
        type: String,
        trim: true,
        maxlength: 200,
        default: null,
      },
      webhookEventIds: {
        type: [
          {
            type: String,
            trim: true,
            maxlength: 200,
          },
        ],
        // 주문 생성 시에는 필드 자체를 두지 않아 unique multikey의 null 충돌을 피한다.
        default: undefined,
      },
      currency: {
        type: String,
        enum: ["KRW"],
        default: "KRW",
      },
      listPriceMinor: {
        type: Number,
        min: 0,
        required: true,
      },
      discountMinor: {
        type: Number,
        min: 0,
        default: 0,
      },
      actualPaidMinor: {
        type: Number,
        min: 0,
        default: 0,
      },
      refundedMinor: {
        type: Number,
        min: 0,
        default: 0,
      },
      status: {
        type: String,
        enum:
          PAYMENT_ORDER_STATUSES,
        default: "CREATED",
        index: true,
      },
      autoRenewSourceCycleId: {
        type: Schema.Types.ObjectId,
        ref: "AccessCycleLifecycle",
        default: null,
      },
      paidAt: {
        type: Date,
        default: null,
      },
      cancelledAt: {
        type: Date,
        default: null,
      },
      disputedAt: {
        type: Date,
        default: null,
      },
      metadata: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },
    {
      timestamps: true,
      versionKey: "version",
      optimisticConcurrency: true,
    }
  );

paymentOrderSchema.index(
  {
    provider: 1,
    providerOrderId: 1,
  },
  {
    unique: true,
  }
);
paymentOrderSchema.index(
  {
    provider: 1,
    providerTransactionId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      providerTransactionId: {
        $type: "string",
      },
    },
  }
);
paymentOrderSchema.index(
  {
    provider: 1,
    webhookEventIds: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      webhookEventIds: {
        $type: "array",
      },
    },
  }
);

paymentOrderSchema.pre(
  "validate",
  function validatePaymentAmounts() {
    for (const field of [
      "listPriceMinor",
      "discountMinor",
      "actualPaidMinor",
      "refundedMinor",
    ]) {
      if (
        !Number.isSafeInteger(
          this[field]
        )
      ) {
        this.invalidate(
          field,
          `${field} must be an integer`
        );
      }
    }
    if (
      this.discountMinor >
      this.listPriceMinor
    ) {
      this.invalidate(
        "discountMinor",
        "discount cannot exceed list price"
      );
    }
    if (
      this.actualPaidMinor >
      this.listPriceMinor
    ) {
      this.invalidate(
        "actualPaidMinor",
        "paid amount cannot exceed list price"
      );
    }
    if (
      this.refundedMinor >
      this.actualPaidMinor
    ) {
      this.invalidate(
        "refundedMinor",
        "refund cannot exceed paid amount"
      );
    }
    if (
      this.status === "CAPTURED" &&
      (!this.providerTransactionId ||
        !this.paidAt ||
        this.actualPaidMinor <= 0)
    ) {
      this.invalidate(
        "status",
        "captured payment requires transaction id, paidAt and positive amount"
      );
    }
  }
);

const PaymentOrder =
  mongoose.models.PaymentOrder ||
  mongoose.model(
    "PaymentOrder",
    paymentOrderSchema
  );

module.exports = {
  PAYMENT_ORDER_STATUSES,
  PaymentOrder,
};
