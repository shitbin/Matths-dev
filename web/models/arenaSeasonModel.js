const mongoose = require("mongoose");

const { Schema } = mongoose;

const ARENA_SEASON_STATUSES = Object.freeze([
  "DRAFT",
  "SCHEDULED",
  "ACTIVE",
  "SETTLING",
  "CLOSED",
  "CANCELLED",
]);

const ARENA_RESEED_STATUSES = Object.freeze([
  "NOT_STARTED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
]);

const arenaSeasonSchema = new Schema(
  {
    seasonId: {
      type: String,
      trim: true,
      maxlength: 100,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 160,
      required: true,
    },
    startsAt: {
      type: Date,
      required: true,
      index: true,
    },
    endsAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ARENA_SEASON_STATUSES,
      default: "DRAFT",
      index: true,
    },
    currentWeekKey: {
      // 주차 계산법과 재시드 시각은 PolicyVersion/scheduler가 주입한다.
      type: String,
      trim: true,
      maxlength: 80,
      default: null,
    },
    reseedStatus: {
      type: String,
      enum: ARENA_RESEED_STATUSES,
      default: "NOT_STARTED",
      index: true,
    },
    lastSeededAt: {
      type: Date,
      default: null,
    },
    policyVersionId: {
      type: Schema.Types.ObjectId,
      ref: "PolicyVersion",
      required: true,
      immutable: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: "version",
    optimisticConcurrency: true,
  }
);

arenaSeasonSchema.index({
  status: 1,
  startsAt: 1,
  endsAt: 1,
});
arenaSeasonSchema.index({
  reseedStatus: 1,
  status: 1,
});
arenaSeasonSchema.index(
  {
    status: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "ACTIVE",
    },
    name: "one_active_arena_season",
  }
);

arenaSeasonSchema.pre(
  "validate",
  function validateArenaSeason() {
    if (
      this.startsAt &&
      this.endsAt &&
      this.endsAt <= this.startsAt
    ) {
      this.invalidate(
        "endsAt",
        "season endsAt must be after startsAt"
      );
    }

    if (this.reseedStatus === "COMPLETED") {
      if (!this.currentWeekKey) {
        this.invalidate(
          "currentWeekKey",
          "completed reseed requires its week key"
        );
      }
      if (!this.lastSeededAt) {
        this.invalidate(
          "lastSeededAt",
          "completed reseed requires lastSeededAt"
        );
      }
    }

    if (
      ["CLOSED", "CANCELLED"].includes(this.status) &&
      this.reseedStatus === "RUNNING"
    ) {
      this.invalidate(
        "reseedStatus",
        "closed season cannot keep a running reseed"
      );
    }
  }
);

const ArenaSeason =
  mongoose.models.ArenaSeason ||
  mongoose.model(
    "ArenaSeason",
    arenaSeasonSchema
  );

module.exports = {
  ARENA_RESEED_STATUSES,
  ARENA_SEASON_STATUSES,
  ArenaSeason,
};
