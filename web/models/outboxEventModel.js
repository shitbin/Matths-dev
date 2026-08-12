const mongoose = require("mongoose");

const { Schema } = mongoose;

const OUTBOX_EVENT_TYPES =
  Object.freeze([
    "PACKAGE_PURCHASED",
    "CYCLE_STARTED",
    "CYCLE_ATTENDANCE_ACTIVITY",
    "DAILY_ATTENDANCE_RECOGNIZED",
    "TAKEOVER_MATCHED",
    "TAKEOVER_ACCEPTED",
    "TAKEOVER_CANCELLED",
    "TAKEOVER_STARTED",
    "TAKEOVER_SUBMITTED",
    "TAKEOVER_HELD",
    "TAKEOVER_HOLD_RESOLVED",
    "TAKEOVER_INVALIDATED",
    "TAKEOVER_RESOLVED",
    "TAKEOVER_SETTLED",
    "ARENA_ATTEMPT_SUBMITTED",
    "REFUND_REVIEW_STARTED",
    "REFUND_INELIGIBLE",
    "REFUND_ELIGIBLE",
    "REFUND_COMPLETED",
    "MAIN_ENTERED",
    "BONUS_ACCESS_DEPLETED",
    "REPURCHASE_UNLOCKED",
    "ARENA_RESEEDED",
    "INTEGRITY_CASE_OPENED",
    "INTEGRITY_CASE_RESOLVED",
  ]);

const outboxEventSchema =
  new Schema(
    {
      eventId: {
        type: String,
        trim: true,
        maxlength: 180,
        required: true,
        unique: true,
      },
      idempotencyKey: {
        type: String,
        trim: true,
        maxlength: 240,
        required: true,
        unique: true,
      },
      aggregateType: {
        type: String,
        trim: true,
        maxlength: 80,
        required: true,
      },
      aggregateId: {
        type: String,
        trim: true,
        maxlength: 180,
        required: true,
        index: true,
      },
      eventType: {
        type: String,
        enum: OUTBOX_EVENT_TYPES,
        required: true,
        index: true,
      },
      payload: {
        type: Schema.Types.Mixed,
        default: {},
      },
      status: {
        type: String,
        enum: [
          "PENDING",
          "PROCESSING",
          "PUBLISHED",
          "FAILED",
          "DEAD",
        ],
        default: "PENDING",
        index: true,
      },
      attemptCount: {
        type: Number,
        min: 0,
        default: 0,
      },
      nextAttemptAt: {
        type: Date,
        default: Date.now,
        index: true,
      },
      lockedAt: {
        type: Date,
        default: null,
      },
      lockedBy: {
        type: String,
        trim: true,
        maxlength: 120,
        default: null,
      },
      lastError: {
        type: String,
        maxlength: 1000,
        default: "",
      },
      publishedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

outboxEventSchema.index({
  status: 1,
  nextAttemptAt: 1,
});
outboxEventSchema.index({
  aggregateType: 1,
  aggregateId: 1,
  createdAt: 1,
});

const OutboxEvent =
  mongoose.models.OutboxEvent ||
  mongoose.model(
    "OutboxEvent",
    outboxEventSchema
  );

module.exports = {
  OUTBOX_EVENT_TYPES,
  OutboxEvent,
};
