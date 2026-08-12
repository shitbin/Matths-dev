"use strict";

const assert = require("node:assert/strict");

process.env.DISABLE_ARENA_TIER_CATALOG_WATCHER = "1";

const {
  ARENA_LIVE_GENERATOR_CATEGORY,
  assertArenaExclusiveCatalogVersion,
  isArenaExclusiveCatalogVersion,
  _testing: {
    orderedCatalogBindingEngines,
  },
} = require("../services/arenaTierQuestionCatalogService");
const {
  ARENA_ONE_ON_ONE_PROBLEM_TYPES,
} = require("../services/arenaOneOnOneProblemTypes");
const {
  ArenaTierQuestionCatalogVersion,
} = require("../models/goatArenaModel");
const {
  buildProblemEngineRegistry,
} = require("../services/problemTypeCatalogService");
const {
  ARENA_ONE_ON_ONE_SEMI_KILLER_TYPE_IDS,
  configuredPackSlotForMatch,
  configuredQuestionSlots,
  deterministicPackSlot,
  generateMainOneOnOneQuestions,
  generateSubOneOnOneQuestions,
  getSubTierPair,
  _testing: {
    recentArenaTypeIdsForParticipants,
  },
} = require("../services/arenaOneOnOneProblemBank");
const {
  ARENA_PROBLEM_DIFFICULTY_TIERS,
  weightedTypeIdsForPack,
} = require("../services/arenaProblemDataService");

function catalog(category) {
  return {
    typeDefinitions: [
      {
        typeId: "TYPE-A",
        generatorBindings: [
          { category, engineKey: "engine-a" },
        ],
      },
    ],
  };
}

assert.equal(isArenaExclusiveCatalogVersion(catalog("ASSESSMENT_CENTER")), false);
assert.equal(
  isArenaExclusiveCatalogVersion(catalog(ARENA_LIVE_GENERATOR_CATEGORY)),
  true
);
assert.throws(
  () => assertArenaExclusiveCatalogVersion(catalog("ASSESSMENT_CENTER")),
  (error) => error?.code === "ARENA_CATALOG_LIVE_ENGINE_NOT_ISOLATED"
);

const typeDefinitionsPath = ArenaTierQuestionCatalogVersion.schema.path(
  "typeDefinitions"
);
const generatorBindingsPath = typeDefinitionsPath.schema.path("generatorBindings");
const arenaBindingPath = generatorBindingsPath.schema.path("category");
assert.ok(
  arenaBindingPath?.enumValues?.includes(ARENA_LIVE_GENERATOR_CATEGORY),
  "Arena 카탈로그 스키마가 GOAT_ARENA 전용 바인딩을 저장할 수 있어야 합니다."
);

const engineRegistry = buildProblemEngineRegistry();
const arenaEngines = [...engineRegistry.values()].filter(
  (engine) => engine.category === ARENA_LIVE_GENERATOR_CATEGORY
);
assert.equal(
  arenaEngines.length,
  Object.keys(ARENA_ONE_ON_ONE_PROBLEM_TYPES).length,
  "GOAT Arena 독립 생성기 전부가 전용 범주로 등록되어야 합니다."
);
assert.equal(
  arenaEngines.some((engine) => engine.category === "ASSESSMENT_CENTER"),
  false
);
assert.equal(
  arenaEngines.every(
    (engine) =>
      engine.sourceFile === "services/arenaOneOnOneProblemTypes.js" &&
      typeof engine.generateSample === "function"
  ),
  true
);

function assertArenaOnlyPack(generation) {
  assert.equal(generation.questions.length, 5);
  assert.equal(new Set(generation.questions.map((item) => item.typeId)).size, 5);
  generation.questions.forEach((question) => {
    const definition = ARENA_ONE_ON_ONE_PROBLEM_TYPES[question.typeId];
    assert.ok(definition, `${question.typeId}: GOAT Arena 전용 유형이 아닙니다.`);
    assert.equal(
      definition.courseId,
      question.design.courseId,
      `${question.typeId}: 계획 과목과 실제 생성 과목이 다릅니다.`
    );
    assert.equal(question.validation?.passed, true);
  });
}

assertArenaOnlyPack(generateSubOneOnOneQuestions({
  challengerTier: "BRONZE",
  defenderTier: "BRONZE",
  matchKey: "isolation-sub-u1",
}));
assertArenaOnlyPack(generateMainOneOnOneQuestions({
  lowerTier: "BRONZE",
  upperTier: "SILVER",
  matchKey: "isolation-main-r2",
}));
assertArenaOnlyPack(generateSubOneOnOneQuestions({
  challengerTier: "MASTER",
  defenderTier: "MASTER",
  matchKey: "isolation-sub-u7",
}));

// 운영 문제 데이터가 활성화된 경로도 매치의 실제 packSlot을 유형 회전에
// 사용해야 한다. 과거에는 weighted 후보만 slotIndex로 섞은 뒤, 최종 선택은
// 항상 configuredQuestionSlots(0, ...)으로 되돌려 첫 대수 슬롯 등이 경기마다
// 같은 유형으로 반복됐다.
const rotationVersion = {
  code: "ARENA-ROTATION-CONTRACT-V1",
  tierConfigurations: ARENA_PROBLEM_DIFFICULTY_TIERS.map((difficultyTier) => ({
    difficultyTier,
    typeIds: [...ARENA_ONE_ON_ONE_SEMI_KILLER_TYPE_IDS],
  })),
  typeSettings: ARENA_ONE_ON_ONE_SEMI_KILLER_TYPE_IDS.map((typeId) => ({
    typeId,
    enabled: true,
    selectionWeight: 1,
    answerMin: 1,
    answerMax: 999,
  })),
};
const bronzePair = getSubTierPair("BRONZE", "BRONZE");
function matchKeyForSlot(targetSlot) {
  for (let index = 0; index < 10_000; index += 1) {
    const matchKey = `rotation-slot-${targetSlot}-${index}`;
    if (deterministicPackSlot({ pairKey: bronzePair.key, matchKey }) === targetSlot) {
      return matchKey;
    }
  }
  throw new Error(`pack slot ${targetSlot}에 대응하는 검수 키를 찾지 못했습니다.`);
}
for (const slotIndex of [0, 1, 7, 19]) {
  const matchKey = matchKeyForSlot(slotIndex);
  const eligibleTypeIds = weightedTypeIdsForPack(
    rotationVersion,
    bronzePair.difficultyTier,
    slotIndex
  );
  const expected = configuredQuestionSlots(
    slotIndex,
    bronzePair.challengerTier,
    bronzePair.defenderTier,
    eligibleTypeIds,
    { division: "SUB" }
  ).map((slot) => slot.typeKey);
  const actual = configuredPackSlotForMatch({
    challengerTier: "BRONZE",
    defenderTier: "BRONZE",
    matchKey,
    problemDataVersion: rotationVersion,
  });
  assert.equal(actual.packSlot.slot, slotIndex + 1);
  assert.deepEqual(
    actual.packSlot.questionSlots.map((slot) => slot.typeKey),
    expected,
    `운영 데이터 packSlot ${slotIndex + 1}의 유형 회전이 실제 슬롯과 같아야 합니다.`
  );
}

const firstRotation = configuredQuestionSlots(
  0,
  bronzePair.challengerTier,
  bronzePair.defenderTier,
  ARENA_ONE_ON_ONE_SEMI_KILLER_TYPE_IDS,
  { division: "SUB" }
).map((slot) => slot.typeKey);
const secondRotation = configuredQuestionSlots(
  1,
  bronzePair.challengerTier,
  bronzePair.defenderTier,
  ARENA_ONE_ON_ONE_SEMI_KILLER_TYPE_IDS,
  { division: "SUB" }
).map((slot) => slot.typeKey);
assert.notDeepEqual(
  firstRotation,
  secondRotation,
  "서로 다른 packSlot이 같은 5개 유형 순서를 반복하면 안 됩니다."
);

const recentByCourse = [
  "semi-exponential-root-invariant",
  "semi-absolute-graph-area",
  "semi-repeated-arrangement",
];
const unseenPack = configuredQuestionSlots(
  0,
  bronzePair.challengerTier,
  bronzePair.defenderTier,
  ARENA_ONE_ON_ONE_SEMI_KILLER_TYPE_IDS,
  { division: "SUB", recentTypeIds: recentByCourse }
).map((slot) => slot.typeKey);
for (const recentTypeId of recentByCourse) {
  assert.equal(
    unseenPack.includes(recentTypeId),
    false,
    `같은 과목에 대체 유형이 있으면 최근 풀이 구조 ${recentTypeId}를 다시 내면 안 됩니다.`
  );
}
assert.equal(new Set(unseenPack).size, 5);

const algebraTypeIds = Object.entries(ARENA_ONE_ON_ONE_PROBLEM_TYPES)
  .filter(([, definition]) => definition.courseId === "algebra")
  .map(([typeId]) => typeId);
const exhaustedRecentCoursePack = configuredQuestionSlots(
  0,
  bronzePair.challengerTier,
  bronzePair.defenderTier,
  ARENA_ONE_ON_ONE_SEMI_KILLER_TYPE_IDS,
  { division: "SUB", recentTypeIds: algebraTypeIds }
).map((slot) => slot.typeKey);
assert.equal(
  new Set(exhaustedRecentCoursePack).size,
  5,
  "한 과목의 모든 유형이 최근 이력이더라도 경기 팩 생성은 중단되면 안 됩니다."
);

async function assertRecentStructureAvoidance() {
  const fakeMatchRows = [{ _id: "match-1", problemPackId: "pack-1" }];
  const fakePackRows = [{
    _id: "pack-1",
    questions: [{
      typeId: "U1-01",
      sourceTypeId: "CALC-MOTION-CHANGE",
      generatorEngineKey: "GOAT_ARENA:semi-distance-parameter-reverse",
      referenceFamily: "derivative-limit-motion",
      typeSkeletonId: "T1-CALCULUS-REGULAR",
    }],
  }];
  function queryResult(rows) {
    const query = {
      sort() { return query; },
      limit() { return query; },
      select() { return query; },
      lean: async () => rows,
    };
    return query;
  }
  const recentSignals = await recentArenaTypeIdsForParticipants(
    ["student-1"],
    {
      MatchModel: { find: () => queryResult(fakeMatchRows) },
      PackModel: { find: () => queryResult(fakePackRows) },
    }
  );
  for (const signal of [
    "U1-01",
    "CALC-MOTION-CHANGE",
    "GOAT_ARENA:semi-distance-parameter-reverse",
    "derivative-limit-motion",
    "T1-CALCULUS-REGULAR",
  ]) {
    assert.ok(recentSignals.includes(signal), `최근 구조 신호 ${signal}가 누락됐습니다.`);
  }

  const registry = buildProblemEngineRegistry();
  const repeatedEngine = registry.get(
    "GOAT_ARENA:semi-distance-parameter-reverse"
  );
  const alternativeEngine = registry.get(
    "GOAT_ARENA:semi-tangent-area-parameter-reverse"
  );
  assert.ok(repeatedEngine && alternativeEngine);
  const candidates = orderedCatalogBindingEngines({
    version: { contentHash: "recent-structure-contract" },
    typeDefinition: {
      generatorBindings: [repeatedEngine, alternativeEngine].map((engine) => ({
        category: engine.category,
        engineKey: engine.engineKey,
        sourceHash: engine.sourceHash,
      })),
    },
    difficultyCode: "U1",
    matchKey: "recent-structure-contract",
    publicVariantTypeId: "U1-01",
    excludedEngineKeys: new Set(),
    recentTypeIds: ["GOAT_ARENA:semi-distance-parameter-reverse"],
  });
  assert.equal(
    candidates[0].runtimeKey,
    "GOAT_ARENA:semi-tangent-area-parameter-reverse",
    "같은 풀이 엔진보다 사용하지 않은 엔진을 먼저 선택해야 합니다."
  );
}

assertRecentStructureAvoidance()
  .then(() => console.log("Arena live question-bank isolation contract passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
