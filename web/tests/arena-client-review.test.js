"use strict";

const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const { ArenaMatchEvidence } = require("../models/goatArenaModel");
const {
  attachArenaClientReview,
  normalizeArenaClientReview,
} = require("../services/arenaMatchEvidenceService");

const NOW = new Date("2026-08-11T08:00:00.000Z");

function id() {
  return new mongoose.Types.ObjectId();
}

async function main() {
  assert.deepEqual(
    normalizeArenaClientReview({
      reviewId: "review-1",
      model: "Qwen3.5-VL-3B",
      modelVersion: "vision.gguf",
      reviewState: "normal",
      signals: ["visual-paste-artifact"],
      clientBuildVersion: "1.0(1)",
      completedAt: NOW.toISOString(),
    }).signals,
    [],
    "정상 판정에 붙은 의심 신호는 서버 경계에서 제거해야 한다"
  );

  const replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  try {
    await mongoose.connect(replicaSet.getUri(), { dbName: "arena-client-review" });
    const matchId = id();
    const userId = id();
    const evidence = await ArenaMatchEvidence.create({
      attemptId: id(),
      matchId,
      userId,
      files: [{
        originalName: "solution.jpg",
        storedName: "solution.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        sha256: "a".repeat(64),
      }],
      originalEvidenceSubmitted: true,
      deadlineAt: new Date(NOW.getTime() + 60_000),
      submittedAt: NOW,
      status: "ANOMALY_FLAGGED",
      anomalyFlags: ["SERVER_TIMING_SIGNAL"],
      retentionUntil: new Date(NOW.getTime() + 86_400_000),
    });

    const input = {
      reviewId: "review-suspicious-1",
      model: "Qwen3.5-VL-3B",
      modelVersion: "Qwen3.5-VL-3B-Instruct-Q4_K_M.gguf",
      reviewState: "suspicious",
      signals: ["answer-only", "unknown-client-claim", "answer-only"],
      clientBuildVersion: "1.0(1)",
      completedAt: NOW.toISOString(),
    };
    const first = await attachArenaClientReview({
      matchId,
      evidenceId: evidence._id,
      userId,
      review: input,
      now: NOW,
    });
    assert.equal(first.replayed, false);

    const stored = await ArenaMatchEvidence.findById(evidence._id).lean();
    assert.equal(stored.status, "ANOMALY_FLAGGED");
    assert.deepEqual(stored.anomalyFlags, ["SERVER_TIMING_SIGNAL"]);
    assert.equal(stored.clientReviews.length, 1);
    assert.deepEqual(stored.clientReviews[0].signals, ["answer-only"]);

    const replay = await attachArenaClientReview({
      matchId,
      evidenceId: evidence._id,
      userId,
      review: input,
      now: new Date(NOW.getTime() + 30_000),
    });
    assert.equal(replay.replayed, true);

    await assert.rejects(
      () => attachArenaClientReview({
        matchId,
        evidenceId: evidence._id,
        userId,
        review: { ...input, reviewState: "normal" },
        now: NOW,
      }),
      (error) => error.code === "ARENA_CLIENT_REVIEW_CONFLICT"
    );
    await assert.rejects(
      () => attachArenaClientReview({
        matchId,
        evidenceId: evidence._id,
        userId: id(),
        review: { ...input, reviewId: "review-other-user" },
        now: NOW,
      }),
      (error) => error.code === "ARENA_EVIDENCE_NOT_FOUND"
    );
    console.log("arena client review non-authoritative boundary: ok");
  } finally {
    await mongoose.disconnect();
    await replicaSet.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
