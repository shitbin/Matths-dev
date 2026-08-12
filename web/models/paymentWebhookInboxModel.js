const mongoose = require("mongoose");

const { Schema } = mongoose;

const PAYMENT_WEBHOOK_INBOX_STATUSES =
  Object.freeze([
    "RECEIVED",
    "PROCESSING",
    "PROCESSED",
    "FAILED",
    "IGNORED",
  ]);

const SIGNATURE_VERIFICATION_STATUSES =
  Object.freeze([
    "VERIFIED",
    "INVALID",
    "NOT_CHECKED",
    "ERROR",
  ]);

const signatureVerificationSchema =
  new Schema(
    {
      status: {
        type: String,
        enum:
          SIGNATURE_VERIFICATION_STATUSES,
        required: true,
      },
      checkedAt: {
        type: Date,
        required: true,
      },
      reasonCode: {
        type: String,
        trim: true,
        maxlength: 120,
        default: "",
      },
    },
    {
      _id: false,
    }
  );

const lastErrorSchema =
  new Schema(
    {
      code: {
        type: String,
        trim: true,
        maxlength: 120,
        default: "",
      },
      message: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },
      occurredAt: {
        type: Date,
        default: null,
      },
    },
    {
      _id: false,
    }
  );

const paymentWebhookInboxSchema =
  new Schema(
    {
      provider: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 60,
        required: true,
      },
      webhookEventId: {
        type: String,
        trim: true,
        maxlength: 200,
        required: true,
      },
      eventType: {
        type: String,
        trim: true,
        maxlength: 120,
        default: "",
      },
      // 원문 payload와 서명 헤더는 저장하지 않는다. 재수신 동일성 확인에 필요한
      // 해시와 크기만 보존해 결제·인증 비밀정보가 운영 조회에 노출되지 않게 한다.
      // INVALID/NOT_CHECKED preplay 뒤 정상 VERIFIED 요청이 오면 수신 서비스가
      // 같은 문서를 승격하므로 아래 세 필드는 그 전환에서만 교체될 수 있다.
      payloadHash: {
        type: String,
        lowercase: true,
        match: /^[a-f0-9]{64}$/,
        required: true,
      },
      payloadSizeBytes: {
        type: Number,
        min: 0,
        required: true,
      },
      signatureVerification: {
        type:
          signatureVerificationSchema,
        required: true,
      },
      status: {
        type: String,
        enum:
          PAYMENT_WEBHOOK_INBOX_STATUSES,
        default: "RECEIVED",
        index: true,
      },
      retryCount: {
        type: Number,
        min: 0,
        default: 0,
      },
      nextRetryAt: {
        type: Date,
        default: null,
        index: true,
      },
      lastAttemptAt: {
        type: Date,
        default: null,
      },
      lastError: {
        type: lastErrorSchema,
        default: () => ({}),
      },
      ignoreReasonCode: {
        type: String,
        trim: true,
        maxlength: 120,
        default: "",
      },
      receivedAt: {
        type: Date,
        default: Date.now,
        required: true,
      },
      processingStartedAt: {
        type: Date,
        default: null,
      },
      processedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

paymentWebhookInboxSchema.index(
  {
    provider: 1,
    webhookEventId: 1,
  },
  {
    unique: true,
    name:
      "one_payment_webhook_inbox_per_provider_event",
  }
);
paymentWebhookInboxSchema.index({
  status: 1,
  nextRetryAt: 1,
});
paymentWebhookInboxSchema.index({
  provider: 1,
  receivedAt: 1,
});

paymentWebhookInboxSchema.pre(
  "validate",
  function validateInboxState() {
    if (
      !Number.isSafeInteger(
        this.payloadSizeBytes
      )
    ) {
      this.invalidate(
        "payloadSizeBytes",
        "payloadSizeBytes must be an integer"
      );
    }
    if (
      !Number.isSafeInteger(
        this.retryCount
      )
    ) {
      this.invalidate(
        "retryCount",
        "retryCount must be an integer"
      );
    }
    if (
      this.status ===
        "PROCESSING" &&
      !this.processingStartedAt
    ) {
      this.invalidate(
        "processingStartedAt",
        "processing inbox requires processingStartedAt"
      );
    }
    if (
      [
        "PROCESSED",
        "IGNORED",
      ].includes(this.status) &&
      !this.processedAt
    ) {
      this.invalidate(
        "processedAt",
        "terminal inbox requires processedAt"
      );
    }
    if (
      this.status !==
        "IGNORED" &&
      this
        .signatureVerification
        ?.status !== "VERIFIED"
    ) {
      this.invalidate(
        "signatureVerification",
        "only verified webhooks may enter processing states"
      );
    }
  }
);

const PaymentWebhookInbox =
  mongoose.models
    .PaymentWebhookInbox ||
  mongoose.model(
    "PaymentWebhookInbox",
    paymentWebhookInboxSchema
  );

module.exports = {
  PAYMENT_WEBHOOK_INBOX_STATUSES,
  SIGNATURE_VERIFICATION_STATUSES,
  PaymentWebhookInbox,
};
