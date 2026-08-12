"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

function inspectOrder(firstModule, secondModule) {
  const source = `
    const first = require(${JSON.stringify(path.join(repoRoot, firstModule))});
    const second = require(${JSON.stringify(path.join(repoRoot, secondModule))});
    const lifecycle = require(${JSON.stringify(path.join(repoRoot, "models/accessCycleModel.js"))}).AccessCycle;
    const arena = require(${JSON.stringify(path.join(repoRoot, "models/goatArenaModel.js"))}).AccessCycle;
    process.stdout.write(JSON.stringify({
      lifecycleModel: lifecycle.modelName,
      lifecycleCollection: lifecycle.collection.name,
      lifecyclePaths: ["paymentOrderId", "refundStatus", "activeRanking"].filter((key) => lifecycle.schema.path(key)),
      arenaModel: arena.modelName,
      arenaCollection: arena.collection.name,
      arenaPaths: ["division", "availableLearningDays", "lockedLearningDays"].filter((key) => arena.schema.path(key)),
      sameConstructor: lifecycle === arena,
    }));
  `;
  const result = spawnSync(
    process.execPath,
    ["-e", source],
    {
      cwd: repoRoot,
      encoding: "utf8",
    }
  );
  assert.equal(
    result.status,
    0,
    result.stderr
  );
  return JSON.parse(result.stdout);
}

const lifecycleFirst = inspectOrder(
  "models/accessCycleModel.js",
  "models/goatArenaModel.js"
);
const arenaFirst = inspectOrder(
  "models/goatArenaModel.js",
  "models/accessCycleModel.js"
);

assert.deepEqual(
  lifecycleFirst,
  arenaFirst,
  "AccessCycle 모델 계약은 require 순서와 무관해야 합니다."
);
assert.deepEqual(lifecycleFirst, {
  lifecycleModel:
    "AccessCycleLifecycle",
  lifecycleCollection:
    "accesscyclelifecycles",
  lifecyclePaths: [
    "paymentOrderId",
    "refundStatus",
    "activeRanking",
  ],
  arenaModel: "AccessCycle",
  arenaCollection: "accesscycles",
  arenaPaths: [
    "division",
    "availableLearningDays",
    "lockedLearningDays",
  ],
  sameConstructor: false,
});

const lifecycleModels = [
  "accessCycleModel.js",
  "arenaRevengeRightModel.js",
  "cycleAttendanceDayModel.js",
  "dayBalanceTransactionModel.js",
  "defenderAssignmentAuditModel.js",
  "paybackModel.js",
  "paymentOrderModel.js",
  "rankTakeoverMatchModel.js",
];
for (const relativePath of lifecycleModels) {
  const source = fs.readFileSync(
    path.join(
      repoRoot,
      "models",
      relativePath
    ),
    "utf8"
  );
  assert.doesNotMatch(
    source,
    /ref:\s*["']AccessCycle["']/,
    `${relativePath}의 생명주기 참조가 GOAT Arena 지갑 모델을 가리키면 안 됩니다.`
  );
}

console.log(
  "AccessCycle model and collection authority is load-order invariant"
);
