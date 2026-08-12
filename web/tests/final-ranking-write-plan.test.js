"use strict";

const assert = require("node:assert/strict");
const {
  _testing: { buildFinalRankingWritePlan },
} = require("../services/finalRankingService");

const currentTime = new Date("2026-08-12T09:30:00.000Z");
const previousPublishedAt = new Date("2026-08-11T09:30:00.000Z");

function row(overrides = {}) {
  return {
    seasonId: "2026-S2",
    userId: "64b000000000000000000001",
    accessState: "PAID_ACTIVE",
    currentCompetitiveDivision: "SUB",
    skillMmr: 1200,
    weeklyMockBonus: 30,
    seasonSubStartPercentile: 0.4,
    seasonSubCurrentPercentile: 0.5,
    seasonSubEndPercentile: null,
    seasonMainStartPercentile: null,
    seasonMainCurrentPercentile: null,
    referenceSubPercentile: null,
    actualRenewalSubPercentile: null,
    frozenSubGrowth: 0,
    seasonSettledNormalAttackCount: 2,
    temporaryAdjustment: 0,
    calculationKey: "2026-S2:64b000000000000000000001",
    finalRating: 1250,
    finalRank: 7,
    ...overrides,
  };
}

function profileSet(plan) {
  return plan.profileOperations[0].updateOne.update.$set;
}

{
  const input = row();
  const existing = {
    userId: input.userId,
    finalRating: 1230,
    finalRank: 8,
    publishedFinalRating: 1230,
    publishedFinalRank: 8,
    previousPublishedFinalRating: 1210,
    previousPublishedFinalRank: 9,
    lastPublishedAt: previousPublishedAt,
  };
  const plan = buildFinalRankingWritePlan({
    rows: [input],
    existingProfiles: [existing],
    frozen: false,
    currentTime,
  });
  const set = profileSet(plan);

  assert.equal(plan.profileOperations.length, 1);
  assert.equal(plan.outboxOperations.length, 1);
  assert.equal(set.status, "ACTIVE");
  assert.equal(set.finalRating, 1250);
  assert.equal(set.finalRank, 7);
  assert.equal(set.publishedFinalRating, 1250);
  assert.equal(set.publishedFinalRank, 7);
  assert.equal(set.previousPublishedFinalRating, 1230);
  assert.equal(set.previousPublishedFinalRank, 8);
  assert.equal(set.lastPublishedAt, currentTime);
  assert.equal(set.stagedFinalRating, null);
  assert.equal(set.stagedFinalRank, null);
  assert.equal(set.stagedWeeklyMockBonus, null);
  assert.equal(set.calculationKey, input.calculationKey);

  const outbox = plan.outboxOperations[0].updateOne;
  assert.equal(outbox.update.$setOnInsert.eventType, "FinalRankingPublished");
  assert.equal(
    outbox.filter.idempotencyKey,
    `final-ranking:published:${input.seasonId}:${input.userId}:1250:7`,
  );
  assert.equal(outbox.update.$setOnInsert.payload.finalRank, 7);
}

{
  const input = row();
  const plan = buildFinalRankingWritePlan({
    rows: [input],
    existingProfiles: [{
      userId: input.userId,
      finalRating: 1250,
      finalRank: 7,
      publishedFinalRating: 1250,
      publishedFinalRank: 7,
      previousPublishedFinalRating: 1230,
      previousPublishedFinalRank: 8,
      lastPublishedAt: previousPublishedAt,
    }],
    frozen: false,
    currentTime,
  });
  const set = profileSet(plan);
  assert.equal(set.previousPublishedFinalRating, 1230);
  assert.equal(set.previousPublishedFinalRank, 8);
  assert.equal(set.lastPublishedAt, previousPublishedAt);
}

{
  const input = row({ finalRating: 1275, finalRank: 5, weeklyMockBonus: 0 });
  const plan = buildFinalRankingWritePlan({
    rows: [input],
    existingProfiles: [{
      userId: input.userId,
      finalRating: 1250,
      finalRank: 7,
      publishedFinalRating: 1240,
      publishedFinalRank: 8,
    }],
    frozen: true,
    currentTime,
  });
  const set = profileSet(plan);
  assert.equal(set.status, "SUNDAY_DISPLAY_FROZEN");
  assert.equal(set.stagedFinalRating, 1275);
  assert.equal(set.stagedFinalRank, 5);
  assert.equal(set.stagedWeeklyMockBonus, 0);
  assert.equal(set.finalRating, 1250);
  assert.equal(set.finalRank, 7);
  assert.equal(set.publishedFinalRating, 1240);
  assert.equal(set.publishedFinalRank, 8);
  assert.equal(
    plan.outboxOperations[0].updateOne.update.$setOnInsert.eventType,
    "FinalRankingFrozen",
  );
}

console.log("Final ranking bulk write preserves publish, history, freeze, and outbox contracts");
