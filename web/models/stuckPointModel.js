"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

const stuckPointSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clientStuckPointId: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 120,
    },
    text: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 500,
    },
    source: {
      type: String,
      enum: ["protected-screenshot"],
      default: "protected-screenshot",
      required: true,
    },
    occurredAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

stuckPointSchema.index(
  { userId: 1, clientStuckPointId: 1 },
  { unique: true, name: "userId_1_clientStuckPointId_1" }
);
stuckPointSchema.index({ userId: 1, occurredAt: -1 });

module.exports =
  mongoose.models.StudyStuckPoint ||
  mongoose.model("StudyStuckPoint", stuckPointSchema, "studystuckpoints");
