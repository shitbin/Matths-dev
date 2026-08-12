"use strict";

const { ConceptProgress } = require("../models/matthsModel");
const StudyStuckPoint = require("../models/stuckPointModel");

const MAX_STUCK_POINT_LENGTH = 500;
const MAX_CLIENT_ID_LENGTH = 120;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

function publicError(message, status = 400, code = "INVALID_IPAD_LEARNING_STATE") {
  return Object.assign(new Error(message), { status, code });
}

function requiredText(value, maximum, label) {
  const output = String(value || "").trim();
  if (!output) throw publicError(`${label}이 없습니다.`);
  if (output.length > maximum) throw publicError(`${label}은 ${maximum}자 이하여야 합니다.`);
  return output;
}

function safeOccurredAt(value, now = new Date()) {
  if (!value) throw publicError("기록 시각이 없습니다.");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw publicError("기록 시각이 올바르지 않습니다.");
  if (parsed.getTime() > now.getTime() + MAX_FUTURE_SKEW_MS) {
    throw publicError("기록 시각이 현재보다 지나치게 앞서 있습니다.");
  }
  return parsed;
}

async function resetLearningProgress({
  userId,
  clientResetId,
  occurredAt,
  now = new Date(),
  ConceptProgressModel = ConceptProgress,
}) {
  const resetId = requiredText(clientResetId, MAX_CLIENT_ID_LENGTH, "초기화 요청 ID");
  const cutoff = safeOccurredAt(occurredAt, now);
  const result = await ConceptProgressModel.deleteMany({
    userId,
    updatedAt: { $lte: cutoff },
  });
  return {
    clientResetId: resetId,
    cutoff,
    deletedCount: Number(result?.deletedCount || 0),
  };
}

async function saveStuckPoint({
  userId,
  clientStuckPointId,
  text,
  occurredAt,
  now = new Date(),
  StuckPointModel = StudyStuckPoint,
}) {
  const safeId = requiredText(clientStuckPointId, MAX_CLIENT_ID_LENGTH, "막힌 지점 ID");
  const safeText = requiredText(text, MAX_STUCK_POINT_LENGTH, "막힌 지점");
  const safeDate = safeOccurredAt(occurredAt, now);
  const document = await StuckPointModel.findOneAndUpdate(
    { userId, clientStuckPointId: safeId },
    {
      $setOnInsert: {
        userId,
        clientStuckPointId: safeId,
        text: safeText,
        source: "protected-screenshot",
        occurredAt: safeDate,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return document;
}

async function listStuckPoints({
  userId,
  limit = 100,
  StuckPointModel = StudyStuckPoint,
}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
  return StuckPointModel.find({ userId })
    .sort({ occurredAt: -1, _id: -1 })
    .limit(safeLimit)
    .lean();
}

function serializeStuckPoint(document) {
  return {
    id: String(document.clientStuckPointId),
    text: String(document.text),
    createdAt: new Date(document.occurredAt).toISOString(),
  };
}

module.exports = {
  listStuckPoints,
  resetLearningProgress,
  saveStuckPoint,
  serializeStuckPoint,
};
