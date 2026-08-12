"use strict";

const assert = require("node:assert/strict");
const { buildDivisionAccessView } = require("../services/arenaAccessViewService");

const base = {
  userAccountStatus: "active",
  accessStatus: "PAID_ACTIVE",
  currentSeasonPlacementCompleted: true,
  activeDivision: "SUB",
  availableDays: 21,
  studyDays: 21,
  studyGoal: 29,
  paybackScore: 18,
  paybackGoal: 30,
  mainAchievementStatus: "NOT_ACHIEVED",
};

const missingLearningAccess = buildDivisionAccessView({
  ...base,
  division: "SUB",
  accessStatus: "PAID_EXPIRED",
  availableDays: 0,
});
assert.equal(missingLearningAccess.firstUnmetRequirement.key, "learning-access");
assert.equal(missingLearningAccess.firstUnmetRequirement.actionLabel, "이용권 확인");
assert.equal(missingLearningAccess.firstUnmetRequirement.actionHref, "/store");

const missingPlacement = buildDivisionAccessView({
  ...base,
  division: "SUB",
  currentSeasonPlacementCompleted: false,
});
assert.equal(missingPlacement.firstUnmetRequirement.key, "placement");
assert.equal(missingPlacement.firstUnmetRequirement.actionLabel, "배치고사 확인");

const activeSub = buildDivisionAccessView({ ...base, division: "SUB" });
assert.equal(activeSub.firstUnmetRequirement, null);

const rankedPending = buildDivisionAccessView({ ...base, division: "MAIN" });
assert.equal(rankedPending.firstUnmetRequirement.key, "study-streak");
assert.equal(rankedPending.firstUnmetRequirement.actionLabel, "학습 계속하기");
assert.match(
  rankedPending.requirements.find((item) => item.key === "cycle-review").detail,
  /사이클 종료 후/,
);

// 디자인 승인에서 지정한 경계값. 0/29일 때 다른 미충족 조건보다
// 연속 학습이 먼저 보이고, 첫 행동은 학습 화면으로 돌아가야 한다.
const rankedZeroOfTwentyNine = buildDivisionAccessView({
  ...base,
  division: "MAIN",
  studyDays: 0,
  studyGoal: 29,
  paybackScore: 0,
  paybackGoal: 30,
});
assert.equal(rankedZeroOfTwentyNine.firstUnmetRequirement.key, "study-streak");
assert.equal(rankedZeroOfTwentyNine.firstUnmetRequirement.detail, "0 / 29일");
assert.equal(rankedZeroOfTwentyNine.firstUnmetRequirement.actionLabel, "학습 계속하기");
assert.equal(rankedZeroOfTwentyNine.firstUnmetRequirement.actionHref, "/main");

console.log("arena access presentation requirements passed");
