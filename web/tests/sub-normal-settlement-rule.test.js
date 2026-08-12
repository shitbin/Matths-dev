"use strict";

const assert = require("node:assert/strict");
const {
  buildSubNormalSettlementPlan,
} = require("../services/arenaMatchSettlementService");
const {
  buildSubNormalEconomySnapshot,
  subNormalChallengerWinRefundDays,
} = require("../services/arenaMatchService");
const {
  arenaMatchSettlementCopy,
} = require("../services/arenaRulebookViewService");

const bronze = {
  arenaRank: "BRONZE",
  arenaPosition: 9,
  arenaGp: 20,
};
const silver = {
  arenaRank: "실버",
  arenaPosition: 5,
  arenaGp: 30,
};
const gold = {
  arenaRank: "GOLD",
  arenaPosition: 2,
  arenaGp: 70,
};

const bronzeWin = buildSubNormalSettlementPlan({
  winnerRole: "CHALLENGER",
  challengerTuple: bronze,
  defenderTuple: silver,
  stakeDays: 1,
});
assert.equal(bronzeWin.tupleAction, "SWAP");
assert.equal(bronzeWin.returnedPaybackScore, 1);
assert.equal(bronzeWin.burnedPaybackScore, 0);
assert.equal(bronzeWin.transferredPaybackScore, 0);
assert.equal(
  bronzeWin.challengerDelta.paybackScoreDays,
  1
);
assert.equal(
  subNormalChallengerWinRefundDays({
    challengerArenaRank: bronze.arenaRank,
    stakeDays: 1,
  }),
  1,
  "신규 경기의 경제 사본도 Bronze 반환을 기록해야 합니다."
);
assert.deepEqual(
  buildSubNormalEconomySnapshot({
    challengerArenaRank: bronze.arenaRank,
    stakeDays: 1,
  }),
  {
    originalStakeDays: 1,
    normalStakeMode: "INITIATOR_ONLY",
    challengerStakeDays: 1,
    defenderStakeDays: 0,
    revengeStakeMultiplier: 2,
    feeDays: 0,
    recipientNoShowReturnDays: 1,
    recipientNoShowBurnDays: 1,
    challengerWinRefundDays: 1,
    bronzeChallengerWinRefundDays: 0,
  }
);

const silverWin = buildSubNormalSettlementPlan({
  winnerRole: "CHALLENGER",
  challengerTuple: silver,
  defenderTuple: gold,
  stakeDays: 1,
});
assert.equal(silverWin.tupleAction, "SWAP");
assert.equal(silverWin.returnedPaybackScore, 0);
assert.equal(silverWin.burnedPaybackScore, 1);
assert.equal(silverWin.transferredPaybackScore, 0);
assert.equal(
  silverWin.challengerDelta.paybackScoreDays,
  0
);
assert.equal(
  subNormalChallengerWinRefundDays({
    challengerArenaRank: silver.arenaRank,
    stakeDays: 1,
  }),
  0,
  "신규 경기의 경제 사본은 Silver 이상 소각을 기록해야 합니다."
);
assert.equal(
  buildSubNormalEconomySnapshot({
    challengerArenaRank: silver.arenaRank,
    stakeDays: 1,
  }).challengerWinRefundDays,
  0
);

const defenderWin = buildSubNormalSettlementPlan({
  winnerRole: "DEFENDER",
  challengerTuple: silver,
  defenderTuple: gold,
  stakeDays: 1,
});
assert.equal(defenderWin.tupleAction, "KEEP");
assert.equal(defenderWin.returnedPaybackScore, 0);
assert.equal(defenderWin.burnedPaybackScore, 0);
assert.equal(defenderWin.transferredPaybackScore, 1);
assert.equal(
  defenderWin.defenderDelta.paybackScoreDays,
  1
);

assert.throws(
  () =>
    buildSubNormalSettlementPlan({
      winnerRole: "CHALLENGER",
      challengerTuple: {
        arenaRank: "UNKNOWN",
        arenaPosition: 1,
        arenaGp: 0,
      },
      defenderTuple: gold,
      stakeDays: 1,
    }),
  (error) =>
    error?.code ===
    "INVALID_SUB_CHALLENGER_TIER_SNAPSHOT",
  "손상된 시작 티어를 브론즈로 간주해 환불하면 안 됩니다."
);
assert.throws(
  () =>
    subNormalChallengerWinRefundDays({
      challengerArenaRank: "UNKNOWN",
      stakeDays: 1,
    }),
  (error) =>
    error?.code ===
    "INVALID_SUB_CHALLENGER_TIER_SNAPSHOT"
);

const display = arenaMatchSettlementCopy(
  "SUB",
  "NORMAL"
);
assert.match(display, /경기 시작 전 브론즈/);
assert.match(display, /실버 이상[\s\S]*1점을 소각/);
assert.match(display, /방어자가 이기면[\s\S]*방어자에게 이전/);

console.log(
  "Unranked normal Bronze refund, Silver+ burn, and defender transfer match final logic"
);
