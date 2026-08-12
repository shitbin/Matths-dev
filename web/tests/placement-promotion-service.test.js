"use strict";

// 실제 Mongo transaction에서 제출 완료된 배치고사가 MMR 프로필과 Arena
// standing/access/outbox로 한 번만 수렴하는지 검증한다. 운영 DB는 사용하지 않는다.
const assert = require("node:assert/strict");
const path = require("node:path");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const repoRoot = path.resolve(__dirname, "..");
const finalRankingPath = require.resolve(
  path.join(repoRoot, "services/finalRankingService.js"),
);
let finalRankingRecalculations = 0;
require.cache[finalRankingPath] = {
  id: finalRankingPath,
  filename: finalRankingPath,
  loaded: true,
  exports: {
    async recalculateFinalRanking() {
      finalRankingRecalculations += 1;
      return { updated: 0 };
    },
  },
};

const {
  AssessmentAttempt,
  RankingProfile,
  User,
} = require("../models/matthsModel");
const {
  ArenaAccessState,
  ArenaOutboxEvent,
  ArenaStanding,
} = require("../models/goatArenaModel");
const { submitPlacementAttempt } = require("../services/placementExamService");
const {
  processArenaOutboxEvents,
} = require("../services/arenaOutboxService");
const {
  registerFinalRankingOutboxHandlers,
} = require("../services/finalRankingOutboxService");

async function run() {
  const replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  try {
    await mongoose.connect(replicaSet.getUri(), {
      dbName: "placement-promotion-service-test",
    });

    const now = new Date();
    const user = await User.create({
      name: "배치 통합 테스트",
      email: `placement-${Date.now()}@example.test`,
      passwordHash: "test-only-not-a-real-password-hash",
      role: "test",
      isTestAccount: true,
      testBatchKey: "PLACEMENT_PROMOTION_MEMORY_ONLY",
      accountStatus: "active",
      isActive: true,
      schoolGrade: 11,
    });
    const attempt = await AssessmentAttempt.create({
      userId: user._id,
      paperId: `placement-e2e-${Date.now()}`,
      generationVersion: "PLACEMENT-E2E-TEST-V1",
      scopeType: "placement",
      placementPurpose: "INITIAL",
      placementContextKey: "INITIAL",
      courseId: "placement",
      title: "GOAT Arena 배치고사",
      subtitle: "메모리 복제셋 통합 검증",
      totalPoints: 100,
      earnedPoints: 87.5,
      scorePercent: 87.5,
      passed: true,
      status: "submitted",
      startedAt: new Date(now.getTime() - 4_200_000),
      submittedAt: now,
      elapsedTimeMs: 4_200_000,
      placementResult: {
        threePoint: { correct: 18, total: 20 },
        fourPoint: { correct: 7, total: 10 },
        answeredCount: 30,
        unansweredCount: 0,
        totalScore: 87.5,
        totalPercentile: 0.91,
        placementScore: 87.5,
        initialMmr: 1320,
        initialRating: 1320,
        initialTier: "다이아몬드",
        tier: "다이아몬드",
        rankingStatus: "provisional",
        percentile: 91,
        verification: {
          required: false,
          result: "confirmed",
        },
      },
    });

    const first = await submitPlacementAttempt({
      userId: user._id,
      attemptId: attempt._id,
    });
    assert.equal(first.status, "submitted");

    const [profile, standing, accessState, outbox] = await Promise.all([
      RankingProfile.findOne({ userId: user._id }).lean(),
      ArenaStanding.findOne({ userId: user._id }).lean(),
      ArenaAccessState.findOne({ userId: user._id }).lean(),
      ArenaOutboxEvent.findOne({
        idempotencyKey: `${attempt._id}:ArenaPlacementCompleted`,
      }).lean(),
    ]);

    assert.ok(profile, "배치 완료 뒤 RankingProfile이 생성되어야 합니다.");
    assert.equal(profile.mmr, 1320);
    assert.equal(profile.tier, "DIAMOND");
    assert.equal(profile.status, "PROVISIONAL");
    assert.equal(String(profile.placementAttemptId), String(attempt._id));

    assert.ok(standing, "같은 배치 기록으로 ArenaStanding이 생성되어야 합니다.");
    assert.equal(String(standing.sourcePlacementAttemptId), String(attempt._id));
    assert.equal(standing.division, "SUB");
    assert.equal(standing.status, "LOCKED");
    assert.equal(standing.seedPlacementMmr, 1320);

    assert.ok(accessState);
    assert.equal(accessState.state, "PAYMENT_REQUIRED");
    assert.equal(accessState.currentCompetitiveDivision, "SUB");
    assert.equal(accessState.currentSeasonPlacementCompleted, true);
    assert.equal(String(accessState.standingId), String(standing._id));

    assert.ok(outbox);
    assert.equal(outbox.eventType, "ArenaPlacementCompleted");
    assert.equal(String(outbox.payload.attemptId), String(attempt._id));
    assert.equal(
      finalRankingRecalculations,
      0,
      "배치 제출 HTTP는 플랫폼 전체 최종 랭킹 계산을 기다리면 안 됩니다.",
    );

    // 같은 worker 주기 전에 다른 학생도 배치를 끝낸 상황을 재현한다. 앞선 이벤트는
    // 게시 완료하되 전체 랭킹은 가장 최신 trigger에서 한 번만 다시 계산해야 한다.
    const newerPlacementEvent = await ArenaOutboxEvent.create({
      eventType: "ArenaPlacementCompleted",
      aggregateType: "ArenaStanding",
      aggregateId: new mongoose.Types.ObjectId(),
      idempotencyKey: `placement-burst-${Date.now()}:ArenaPlacementCompleted`,
      payload: { userId: new mongoose.Types.ObjectId() },
      createdAt: new Date(now.getTime() + 1_000),
      updatedAt: new Date(now.getTime() + 1_000),
    });

    registerFinalRankingOutboxHandlers();
    const delivery = await processArenaOutboxEvents({
      filter: { eventType: "ArenaPlacementCompleted" },
    });
    assert.equal(delivery.published, 2);
    assert.equal(
      finalRankingRecalculations,
      1,
      "영속 배치 완료 이벤트가 최종 랭킹을 한 번 갱신해야 합니다.",
    );
    assert.ok(
      await ArenaOutboxEvent.exists({
        _id: outbox._id,
        publishedAt: { $ne: null },
      }),
      "랭킹 갱신 뒤 배치 완료 이벤트를 발행 완료로 표시해야 합니다.",
    );
    assert.ok(
      await ArenaOutboxEvent.exists({
        _id: newerPlacementEvent._id,
        publishedAt: { $ne: null },
      }),
      "동시 제출 묶음의 최신 이벤트도 랭킹 갱신 뒤 게시 완료여야 합니다.",
    );

    // 네트워크 재시도/결과 화면 재진입도 경제·순위 문서를 복제하면 안 된다.
    await submitPlacementAttempt({ userId: user._id, attemptId: attempt._id });
    assert.equal(await RankingProfile.countDocuments({ userId: user._id }), 1);
    assert.equal(await ArenaStanding.countDocuments({ userId: user._id }), 1);
    assert.equal(await ArenaAccessState.countDocuments({ userId: user._id }), 1);
    assert.equal(
      await ArenaOutboxEvent.countDocuments({
        idempotencyKey: `${attempt._id}:ArenaPlacementCompleted`,
      }),
      1,
    );
    const replayDelivery = await processArenaOutboxEvents({
      filter: { eventType: "ArenaPlacementCompleted" },
    });
    assert.equal(replayDelivery.claimed, 0);
    assert.equal(finalRankingRecalculations, 1, "멱등 replay는 전체 랭킹 재계산도 반복하면 안 됩니다.");

    console.log("placement completion creates one ranking profile, Arena standing/access state, and presentation authority");
  } finally {
    await mongoose.disconnect();
    await replicaSet.stop();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
