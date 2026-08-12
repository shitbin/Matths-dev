const mongoose = require(
  "mongoose"
);

const { Schema } =
  mongoose;

const RANK_TAKEOVER_COMMAND_TYPES =
  Object.freeze([
    "REQUEST_CHALLENGE",
    "ACCEPT_CHALLENGE",
    "REJECT_CHALLENGE",
    "START_MATCH",
    "SUBMIT_RESULT",
    "RESOLVE_SCORED_MATCH",
    "RESOLVE_NO_SHOW",
    "SETTLE_MATCH",
    "HOLD_MATCH",
    "RESOLVE_HELD_MATCH",
    "INVALIDATE_HELD_MATCH",
  ]);

const COMMAND_RECEIPT_STATUSES =
  Object.freeze([
    "REQUESTED",
    "COMPLETED",
    "FAILED",
  ]);

const rankTakeoverCommandReceiptSchema =
  new Schema(
    {
      actorKey: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
        immutable: true,
      },
      actorType: {
        type: String,
        enum: [
          "SYSTEM",
          "USER",
          "AUDITOR",
        ],
        required: true,
        immutable: true,
      },
      actorType: {
        type: String,
        enum: [
          "SYSTEM",
          "USER",
          "AUDITOR",
        ],
        required: true,
        immutable: true,
      },
      actorUserId: {
        type:
          Schema.Types.ObjectId,
        ref: "User",
        default: null,
        immutable: true,
      },
      commandType: {
        type: String,
        enum:
          RANK_TAKEOVER_COMMAND_TYPES,
        required: true,
        immutable: true,
      },
      idempotencyKey: {
        type: String,
        trim: true,
        maxlength: 180,
        required: true,
        immutable: true,
      },
      requestFingerprint: {
        type: String,
        match:
          /^[a-f0-9]{64}$/,
        required: true,
        immutable: true,
      },
      status: {
        type: String,
        enum:
          COMMAND_RECEIPT_STATUSES,
        default: "REQUESTED",
        index: true,
      },
      matchDocumentId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "RankTakeoverMatch",
        default: null,
      },
      resultMatchId: {
        type: String,
        trim: true,
        maxlength: 160,
        default: null,
      },
      resultMatchStatus: {
        type: String,
        trim: true,
        maxlength: 40,
        default: null,
      },
      errorCode: {
        type: String,
        trim: true,
        maxlength: 120,
        default: null,
      },
      errorMessage: {
        type: String,
        trim: true,
        maxlength: 500,
        default: null,
      },
      errorStatusCode: {
        type: Number,
        min: 400,
        max: 599,
        default: null,
      },
      errorDetails: {
        type: Schema.Types.Mixed,
        default: null,
      },
      requestedAt: {
        type: Date,
        required: true,
        immutable: true,
      },
      completedAt: {
        type: Date,
        default: null,
      },
      failedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey:
        "version",
      optimisticConcurrency:
        true,
    }
  );

rankTakeoverCommandReceiptSchema.index(
  {
    actorKey: 1,
    commandType: 1,
    idempotencyKey: 1,
  },
  {
    unique: true,
    name:
      "one_rank_takeover_command_per_actor_key",
  }
);

rankTakeoverCommandReceiptSchema.index({
  resultMatchId: 1,
  commandType: 1,
  createdAt: 1,
});

rankTakeoverCommandReceiptSchema.pre(
  "validate",
  function validateCommandReceipt() {
    if (
      this.actorType ===
        "SYSTEM" &&
      (this.actorKey !==
        "SYSTEM" ||
        this.actorUserId)
    ) {
      this.invalidate(
        "actorKey",
        "SYSTEM command receipt requires the SYSTEM key and no actorUserId"
      );
    }
    if (
      [
        "USER",
        "AUDITOR",
      ].includes(
        this.actorType
      ) &&
      (!this.actorUserId ||
        this.actorKey !==
          `${this.actorType}:${this.actorUserId}`)
    ) {
      this.invalidate(
        "actorKey",
        "user and auditor command keys must match their actorUserId"
      );
    }

    if (
      this.status ===
      "REQUESTED"
    ) {
      if (
        this.completedAt ||
        this.failedAt ||
        this.errorCode ||
        this.resultMatchId
      ) {
        this.invalidate(
          "status",
          "requested command cannot contain a terminal result"
        );
      }
    }
    if (
      this.status ===
      "COMPLETED"
    ) {
      if (
        !this.completedAt ||
        !this.resultMatchId ||
        !this
          .resultMatchStatus ||
        this.failedAt ||
        this.errorCode
      ) {
        this.invalidate(
          "status",
          "completed command requires only its match result"
        );
      }
    }
    if (
      this.status ===
      "FAILED"
    ) {
      if (
        !this.failedAt ||
        !this.errorCode ||
        !Number.isSafeInteger(
          this
            .errorStatusCode
        ) ||
        this.completedAt ||
        this.resultMatchId
      ) {
        this.invalidate(
          "status",
          "failed command requires only its stable error result"
        );
      }
    }
  }
);

const RankTakeoverCommandReceipt =
  mongoose.models
    .RankTakeoverCommandReceipt ||
  mongoose.model(
    "RankTakeoverCommandReceipt",
    rankTakeoverCommandReceiptSchema
  );

module.exports = {
  COMMAND_RECEIPT_STATUSES,
  RANK_TAKEOVER_COMMAND_TYPES,
  RankTakeoverCommandReceipt,
};
