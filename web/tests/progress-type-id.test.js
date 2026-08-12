"use strict";

const assert = require("node:assert/strict");
const {
  canonicalProgressTypeId,
  canonicalProgressTypeIds,
  canonicalProgressView,
} = require("../services/progressTypeIdService");
const {
  ConceptProgress,
} = require("../models/matthsModel");

assert.equal(canonicalProgressTypeId("web-algebra-log"), "algebra-log");
assert.equal(canonicalProgressTypeId("algebra-log"), "algebra-log");
assert.equal(canonicalProgressTypeId(" web-algebra-log "), "algebra-log");
assert.deepEqual(
  canonicalProgressTypeIds([
    "web-algebra-log",
    "algebra-log",
    "curriculum-summary",
  ]),
  ["algebra-log", "curriculum-summary"]
);

const staleCompleted = canonicalProgressView({
  topicCount: 1,
  completedTopicIndexes: [0],
  completionPercent: 100,
  status: "completed",
  masteryGate: {
    requiredDistinctTypes: 2,
    correctTypeIds: ["web-algebra-log", "algebra-log"],
    userCompleted: true,
  },
});
assert.equal(staleCompleted.correctTypeIds.length, 1);
assert.equal(staleCompleted.masteryUnlocked, false);
assert.equal(staleCompleted.userCompleted, false);
assert.equal(staleCompleted.completionPercent, 60);
assert.equal(staleCompleted.status, "in-progress");

async function run() {
  const progress = new ConceptProgress({
    userId: "507f1f77bcf86cd799439011",
    curriculumId: "kr-2022",
    courseId: "algebra",
    unitId: "logarithm",
    conceptId: "log-definition",
    topicCount: 1,
    completedTopicIndexes: [0],
    masteryGate: {
      requiredDistinctTypes: 2,
      correctTypeIds: [
        "web-algebra-log",
        "algebra-log",
        "curriculum-summary",
      ],
    },
  });

  await progress.validate();
  assert.deepEqual(
    [...progress.masteryGate.correctTypeIds],
    ["algebra-log", "curriculum-summary"]
  );
  assert.equal(progress.masteryGate.unlockedAt instanceof Date, true);
  assert.equal(progress.completionPercent, 90);
  console.log("web/iPad progress type IDs share one canonical mastery key");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
