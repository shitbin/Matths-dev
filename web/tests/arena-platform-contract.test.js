"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  DEFENSE_SCHEDULE_PROTECTION_PRICE_DAYS,
  MAIN_SHOP_ITEM_PRESENTATION,
  defaultPolicyItems,
  defenseScheduleProtectionCharge,
} = require("../services/arenaShopPolicyService");
const {
  arenaMatchSettlementCopy,
} = require("../services/arenaRulebookViewService");
const {
  REVENGE_OUTCOMES,
  resolveRevengeSettlement,
} = require("../services/arenaDivisionRuleService");
const {
  mainNormalStakeSnapshot,
} = require("../services/mainNormalMatchEconomyService");

const repoRoot = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(repoRoot, file), "utf8");

assert.equal(fs.existsSync(path.join(repoRoot, "services/arenaShopService.js")), false);
assert.equal(fs.existsSync(path.join(repoRoot, "models/arenaShopModel.js")), false);

const expectedCatalog = [
  ["MATCH_ANALYSIS", 1, 1, true],
  ["DEFENSE_REST", 1, 1, true],
  ["DEFENSE_SCHEDULE_PROTECTION", 2, 2, false],
  ["INVITATION_ACCELERATION", 1, 2, false],
  ["MAIN_PROFILE_BORDER", 2, 1, true],
  ["STYLE_ENTRANCE", 1, 1, true],
];

assert.deepEqual(
  defaultPolicyItems().map((item) => [
    item.itemCode,
    item.priceDays,
    item.releasePhase,
    item.enabled,
  ]),
  expectedCatalog,
);
assert.deepEqual(
  Object.keys(MAIN_SHOP_ITEM_PRESENTATION),
  expectedCatalog.map(([itemCode]) => itemCode),
);

const controller = read("controllers/goatArenaController.js");
assert.match(controller, /getMainShopApiData/);
assert.match(controller, /purchaseMainShopApiItem/);
assert.doesNotMatch(controller, /require\(["']\.\.\/services\/arenaShopService["']\)/);

const defenderAssignment = read("services/defenderAssignmentService.js");
assert.match(defenderAssignment, /arenaShopPolicyService/);
assert.doesNotMatch(defenderAssignment, /arenaShopService/);

const shopPolicy = read(
  "services/arenaShopPolicyService.js"
);
assert.match(
  shopPolicy,
  /function isMainShopItemEnabled\(item\)/
);
assert.doesNotMatch(
  shopPolicy,
  /item\.enabled\s*===\s*true\s*&&\s*Number\(item\.releasePhase\)\s*===\s*1/,
  "웹·iPad 판매 게이트가 releasePhase를 서로 다르게 해석하면 안 됩니다."
);
assert.equal(
  DEFENSE_SCHEDULE_PROTECTION_PRICE_DAYS,
  2
);
assert.deepEqual(
  defenseScheduleProtectionCharge(2),
  {
    burnedDays: 1,
    compensationDays: 1,
    priceDays: 2,
  }
);
assert.throws(
  () => defenseScheduleProtectionCharge(4),
  (error) =>
    error?.code ===
    "INVALID_DEFENSE_PROTECTION_PRICE"
);

const matchRead = read(
  "services/arenaMatchAttemptService.js"
);
const matchView = read(
  "views/goat-arena-match.ejs"
);
assert.match(
  matchRead,
  /getMainShopItemOffer\([\s\S]*?DEFENSE_SCHEDULE_PROTECTION[\s\S]*?purchaseOpen/
);
assert.match(
  matchView,
  /defenseScheduleProtectionPriceDays/
);
assert.doesNotMatch(
  matchView,
  /학습일수\s*2일을 사용|>2일 정산/,
  "경기 CTA는 확정 가격 2를 별도 문구로 복제하지 말고 authoritative offer 값을 표시해야 합니다."
);

const routes = read("routes/api-routes.js");
assert.match(routes, /["']\/goat-arena\/rulebook["']/);
assert.match(controller, /schemaVersion:\s*[\r\n\s]*["']GOAT_ARENA_RULEBOOK_V1["']/);
const rulebookHandler = controller.slice(
  controller.indexOf("exports.getGoatArenaRulebook"),
  controller.indexOf("// ── Main Division Shop", controller.indexOf("exports.getGoatArenaRulebook")),
);
assert.match(rulebookHandler, /getActiveMainDivisionPolicy\(now,\s*\{\s*bypassCache:\s*true\s*\}\)/);
assert.match(rulebookHandler, /getUpcomingArenaPolicy\(now\)/);
assert.match(rulebookHandler, /getUpcomingMainDivisionPolicy\(now\)/);
assert.match(rulebookHandler, /upcomingPaybackPolicy/);
assert.match(rulebookHandler, /upcomingMainPolicy/);
assert.match(rulebookHandler, /res\.set\(["']Cache-Control["'],\s*["']no-store["']\)/);

const readModel = read("services/goatArenaReadService.js");
assert.match(readModel, /arenaMatchSettlementCopy/);
assert.match(
  readModel,
  /settlementRule:\s*[\r\n\s]*arenaMatchSettlementCopy\(\s*source\.activeRanking,\s*source\.matchType\s*\)/
);

const rulebookView = read("services/arenaRulebookViewService.js");
assert.match(rulebookView, /function arenaMatchSettlementCopy/);
assert.match(rulebookView, /양측이 같은 학습일수를 예치/);
assert.match(rulebookView, /예치한 페이백 점수 2점을 전부 소각/);
assert.match(rulebookView, /2×S-1일을 공격자에게 반환/);
assert.match(
  arenaMatchSettlementCopy("MAIN", "NORMAL"),
  /상향 쟁탈전은 공격자만 예치[\s\S]*수락형 하위 티어 초대전은 양쪽이 같은 일수를 예치/
);
assert.match(
  arenaMatchSettlementCopy("MAIN", "REVENGE"),
  /공격자가 이기면[\s\S]*2×S-1일을 공격자에게 반환/
);
assert.match(
  arenaMatchSettlementCopy("MAIN", "REVENGE"),
  /정상 완료에서 1일을 수수료로 소각/
);
assert.doesNotMatch(
  arenaMatchSettlementCopy("MAIN", "REVENGE"),
  /2×S일을 전부 소각/
);
assert.match(
  arenaMatchSettlementCopy("MAIN", "REVENGE"),
  /방어자만 24시간 안에 미완료하면[\s\S]*공격자에게 반환/
);
assert.match(
  arenaMatchSettlementCopy("SUB", "REVENGE"),
  /도전자가 이기면[\s\S]*페이백 점수 2점을 전부 소각/
);

// 최신 docs/logic/04 §8: 일반 상향 공격은 공격자만 예치한다.
// 수락형 하위 티어 초대전의 양측 예치와 섞지 않는다.
const upwardStakePlan = mainNormalStakeSnapshot({
  matchOrigin: "MAIN_UPWARD_CHALLENGE",
  stakeDays: 3,
});
assert.equal(upwardStakePlan.challengerStakeDays, 3);
assert.equal(upwardStakePlan.defenderStakeDays, 0);
assert.equal(upwardStakePlan.normalStakeMode, "INITIATOR_ONLY");

// 최신 docs/logic/03 §8 및 04 §13의 정상 승리/No-show 정산표를 실제 plan에
// 대조한다. 정상 공격자 승리의 전액 소각을 방어자 No-show 환불과 섞지 않는다.
const finalLogicRevengePlans = [
  {
    division: "SUB",
    stake: 2,
    fee: 1,
    outcomes: {
      [REVENGE_OUTCOMES.ATTACKER_WIN]: ["SWAP", 0, 0, 2],
      [REVENGE_OUTCOMES.DEFENDER_WIN]: ["KEEP", 0, 1, 1],
      [REVENGE_OUTCOMES.DEFENDER_NO_SHOW]: ["SWAP", 1, 0, 1],
      [REVENGE_OUTCOMES.ATTACKER_NO_SHOW]: ["KEEP", 0, 1, 1],
      [REVENGE_OUTCOMES.BOTH_NO_SHOW]: ["KEEP", 0, 0, 2],
    },
  },
  {
    division: "MAIN",
    stake: 6,
    fee: 1,
    outcomes: {
      [REVENGE_OUTCOMES.ATTACKER_WIN]: ["SWAP", 5, 0, 1],
      [REVENGE_OUTCOMES.DEFENDER_WIN]: ["KEEP", 0, 5, 1],
      [REVENGE_OUTCOMES.DEFENDER_NO_SHOW]: ["SWAP", 5, 0, 1],
      [REVENGE_OUTCOMES.ATTACKER_NO_SHOW]: ["KEEP", 0, 5, 1],
      [REVENGE_OUTCOMES.BOTH_NO_SHOW]: ["KEEP", 0, 0, 6],
    },
  },
];

for (const contract of finalLogicRevengePlans) {
  for (const [outcome, expected] of Object.entries(contract.outcomes)) {
    const actual = resolveRevengeSettlement({
      division: contract.division,
      outcome,
      revengeStakeDays: contract.stake,
      feeDays: contract.fee,
    });
    assert.deepEqual(
      [
        actual.tupleAction,
        actual.returnToAttackerDays,
        actual.transferToDefenderDays,
        actual.burnDays,
      ],
      expected,
      `${contract.division} ${outcome} 정산 plan이 FINAL LOGIC과 달라졌습니다.`
    );
  }
}

console.log("Arena web/iPad production authority and rulebook API contracts passed");
