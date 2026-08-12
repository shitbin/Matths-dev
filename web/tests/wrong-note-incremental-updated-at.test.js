"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const modelPath = require.resolve(path.join(repoRoot, "models/matthsModel.js"));
let observedQuery = null;
let observedSort = null;
const submittedAt = new Date("2026-08-01T00:00:00.000Z");
const updatedAt = new Date("2026-08-12T00:00:00.000Z");

const rows = [{
  _id: "attempt-1",
  userId: "user-1",
  isCorrect: false,
  reviewSourceAttemptId: null,
  submittedAt,
  updatedAt,
  submittedAnswer: "0",
  review: { status: "completed", srsStage: 4, wrongCount: 1 },
  problemSnapshot: { stem: "x=1", choices: [], isTex: false },
  problemId: {
    correctAnswer: "1",
    solutionSteps: [],
    source: { generatorId: "linear", seed: "1" },
  },
}];

const fakeModels = {
  AssessmentAttempt: {}, RankingProfile: {}, ConceptProgress: {}, LearningEvent: {}, Problem: {},
  ProblemAttempt: {
    find(query) {
      observedQuery = query;
      return {
        sort(value) { observedSort = value; return this; },
        limit() { return this; },
        populate() { return this; },
        lean() { return Promise.resolve(rows); },
      };
    },
  },
};
require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: fakeModels };
const controller = require("../controllers/ipadSyncController");

async function main() {
  const res = { json(value) { this.value = value; return value; } };
  await controller.getWrongNotes({
    apiUser: { _id: "user-1" },
    query: { since: "2026-08-10T00:00:00.000Z" },
  }, res, (error) => { if (error) throw error; });

  assert.equal(observedQuery.updatedAt.$gt.toISOString(), "2026-08-10T00:00:00.000Z");
  assert.equal(observedQuery.submittedAt, undefined, "최초 제출 시각을 커서로 쓰지 않음");
  assert.deepEqual(observedSort, { updatedAt: 1, _id: 1 });
  assert.equal(res.value.entries[0].createdAt, submittedAt);
  assert.equal(res.value.entries[0].updatedAt, updatedAt);
  assert.equal(res.value.entries[0].reviewStatus, "completed");
  console.log("Wrong-note updatedAt incremental contract passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
