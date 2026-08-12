"use strict";

const assert = require("node:assert/strict");
const {
  REVENGE_OUTCOMES,
  resolveRevengeSettlement,
} = require("../services/arenaDivisionRuleService");

function assertSettlement({
  division,
  outcome,
  stakeDays,
  feeDays,
  expected,
}) {
  const actual = resolveRevengeSettlement({
    division,
    outcome,
    revengeStakeDays: stakeDays,
    feeDays,
  });
  assert.deepEqual(actual, {
    division,
    outcome,
    revengeStakeDays: stakeDays,
    ...expected,
  });
  assert.equal(
    actual.returnToAttackerDays +
      actual.transferToDefenderDays +
      actual.burnDays,
    stakeDays,
    `${division} ${outcome} 정산은 실제 예치 총액과 일치해야 합니다.`,
  );
}

const cases = [
  {
    division: "SUB",
    outcome: REVENGE_OUTCOMES.ATTACKER_WIN,
    stakeDays: 2,
    feeDays: 1,
    expected: {
      tupleAction: "SWAP",
      returnToAttackerDays: 0,
      transferToDefenderDays: 0,
      burnDays: 2,
    },
  },
  {
    division: "SUB",
    outcome: REVENGE_OUTCOMES.DEFENDER_WIN,
    stakeDays: 2,
    feeDays: 1,
    expected: {
      tupleAction: "KEEP",
      returnToAttackerDays: 0,
      transferToDefenderDays: 1,
      burnDays: 1,
    },
  },
  {
    division: "SUB",
    outcome: REVENGE_OUTCOMES.DEFENDER_NO_SHOW,
    stakeDays: 2,
    feeDays: 1,
    expected: {
      tupleAction: "SWAP",
      returnToAttackerDays: 1,
      transferToDefenderDays: 0,
      burnDays: 1,
    },
  },
  {
    division: "SUB",
    outcome: REVENGE_OUTCOMES.ATTACKER_NO_SHOW,
    stakeDays: 2,
    feeDays: 1,
    expected: {
      tupleAction: "KEEP",
      returnToAttackerDays: 0,
      transferToDefenderDays: 1,
      burnDays: 1,
    },
  },
  {
    division: "SUB",
    outcome: REVENGE_OUTCOMES.BOTH_NO_SHOW,
    stakeDays: 2,
    feeDays: 1,
    expected: {
      tupleAction: "KEEP",
      returnToAttackerDays: 0,
      transferToDefenderDays: 0,
      burnDays: 2,
    },
  },
  {
    division: "MAIN",
    outcome: REVENGE_OUTCOMES.ATTACKER_WIN,
    stakeDays: 6,
    feeDays: 1,
    expected: {
      tupleAction: "SWAP",
      returnToAttackerDays: 5,
      transferToDefenderDays: 0,
      burnDays: 1,
    },
  },
  {
    division: "MAIN",
    outcome: REVENGE_OUTCOMES.DEFENDER_WIN,
    stakeDays: 6,
    feeDays: 1,
    expected: {
      tupleAction: "KEEP",
      returnToAttackerDays: 0,
      transferToDefenderDays: 5,
      burnDays: 1,
    },
  },
  {
    division: "MAIN",
    outcome: REVENGE_OUTCOMES.DEFENDER_NO_SHOW,
    stakeDays: 6,
    feeDays: 1,
    expected: {
      tupleAction: "SWAP",
      returnToAttackerDays: 5,
      transferToDefenderDays: 0,
      burnDays: 1,
    },
  },
  {
    division: "MAIN",
    outcome: REVENGE_OUTCOMES.ATTACKER_NO_SHOW,
    stakeDays: 6,
    feeDays: 1,
    expected: {
      tupleAction: "KEEP",
      returnToAttackerDays: 0,
      transferToDefenderDays: 5,
      burnDays: 1,
    },
  },
  {
    division: "MAIN",
    outcome: REVENGE_OUTCOMES.BOTH_NO_SHOW,
    stakeDays: 6,
    feeDays: 1,
    expected: {
      tupleAction: "KEEP",
      returnToAttackerDays: 0,
      transferToDefenderDays: 0,
      burnDays: 6,
    },
  },
];

for (const testCase of cases) {
  assertSettlement(testCase);
}

console.log(
  "Unranked and Ranked revenge settlement tables match final logic",
);
