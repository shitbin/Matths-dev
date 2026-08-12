"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

function expressRoutes(source) {
  return [...source.matchAll(
    /router\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/g,
  )].map((match) => ({
    method: match[1].toUpperCase(),
    path: match[2],
  }));
}

function productionJavaScriptFiles(relativeDirectory) {
  const directory = path.join(repoRoot, relativeDirectory);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      return productionJavaScriptFiles(relativePath);
    }
    return entry.isFile() && entry.name.endsWith(".js") ? [relativePath] : [];
  });
}

// FINAL LOGIC names ArenaMatch/ArenaMatchAttempt and the three ArenaMatch
// services as the production authority. RankTakeover is an iPad legacy
// compatibility path, not a second match-creation authority.
const sourceMapping = read("docs/logic/07_SOURCE_MAPPING.md");
const technicalDesign = read("docs/logic/05_SHARED_TECHNICAL_DESIGN.md");
const storageBoundaries = read(
  "docs/logic/11_DATA_STORAGE_AND_CACHE_BOUNDARIES.md",
);

assert.match(
  sourceMapping,
  /경기 생성\s*\|\s*`services\/arenaMatchService\.js`\s*\|/,
  "FINAL LOGIC의 경기 생성 정본은 arenaMatchService여야 합니다.",
);
assert.match(
  sourceMapping,
  /단일 정산\s*\|\s*`services\/arenaMatchSettlementService\.js`\s*\|/,
  "FINAL LOGIC의 경기 정산 정본은 arenaMatchSettlementService여야 합니다.",
);
assert.match(
  sourceMapping,
  /봉인 팩 배정·개인 타이머·답안\/활동 저장·자동 제출\s*\|\s*`services\/arenaMatchAttemptService\.js`\s*\|/,
  "FINAL LOGIC의 응시 정본은 arenaMatchAttemptService여야 합니다.",
);
assert.match(technicalDesign, /\+ ArenaMatch\(READY\)/);
assert.match(technicalDesign, /\+ challenger ArenaMatchAttempt\(READY\)/);
assert.match(technicalDesign, /\+ defender ArenaMatchAttempt\(READY\)/);
assert.match(
  storageBoundaries,
  /\| Arena \|[^\n]*ArenaMatch[^\n]*ArenaMatchAttempt[^\n]*\|/,
  "MongoDB 공식 경기 복구 원본은 ArenaMatch/ArenaMatchAttempt여야 합니다.",
);

const matchService = read("services/arenaMatchService.js");
const attemptService = read("services/arenaMatchAttemptService.js");
const settlementService = read("services/arenaMatchSettlementService.js");
for (const [name, source] of [
  ["arenaMatchService", matchService],
  ["arenaMatchAttemptService", attemptService],
  ["arenaMatchSettlementService", settlementService],
]) {
  assert.match(
    source.slice(0, 4_000),
    /require\(["']\.\.\/models\/goatArenaModel["']\)/,
    `${name}는 goatArenaModel의 ArenaMatch 계열을 사용해야 합니다.`,
  );
}
assert.match(matchService, /async function createSubNormalChallenge\s*\(/);

// The web creation endpoint reaches the authoritative ArenaMatch service.
const webRoutes = expressRoutes(read("routes/goat-arena-routes.js"));
assert.deepEqual(
  webRoutes.filter(
    (route) =>
      route.method === "POST" && route.path === "/goat-arena/sub/challenges",
  ),
  [{ method: "POST", path: "/goat-arena/sub/challenges" }],
);
const controller = read("controllers/goatArenaController.js");
const createSubHandler = controller.slice(
  controller.indexOf("exports.createSubChallenge"),
  controller.indexOf("exports.arenaMatchPage"),
);
assert.match(createSubHandler, /createSubNormalChallenge\s*\(/);

// iPad's legacy collection is read-only at its root. Member commands may
// finish an already-created RankTakeover match, but no public collection POST
// may revive RankTakeover as a competing production creation authority.
const apiRoutes = expressRoutes(read("routes/api-routes.js"));
assert.deepEqual(
  apiRoutes.filter((route) => route.path === "/goat-arena/matches"),
  [{ method: "GET", path: "/goat-arena/matches" }],
  "iPad 공개 API에 경기 컬렉션 생성 mutation을 추가하면 안 됩니다.",
);

const productionFiles = [
  ...productionJavaScriptFiles("controllers"),
  ...productionJavaScriptFiles("middleware"),
  ...productionJavaScriptFiles("routes"),
  ...productionJavaScriptFiles("services"),
  "server.js",
];
const rankTakeoverCreationCallers = productionFiles.filter(
  (relativePath) =>
    relativePath !== "services/rankTakeoverService.js" &&
    /\.requestChallenge\s*\(/.test(read(relativePath)),
);
const directRankTakeoverWriters = productionFiles.filter(
  (relativePath) =>
    relativePath !== "services/rankTakeoverService.js" &&
    /(?:new\s+RankTakeoverMatch\s*\(|RankTakeoverMatch\s*\.\s*(?:create|insert\w*)\s*\()/.test(
      read(relativePath),
    ),
);
assert.deepEqual(
  rankTakeoverCreationCallers,
  [],
  "RankTakeover 신규 경기 생성 호출자가 production 경로에 생기면 안 됩니다.",
);
assert.deepEqual(
  directRankTakeoverWriters,
  [],
  "RankTakeoverMatch를 legacy service 밖에서 직접 생성하면 안 됩니다.",
);

const commandSource = read("services/goatArenaCommandService.js");
const frozenFacades = [...commandSource.matchAll(
  /return Object\.freeze\(\{([\s\S]*?)\}\);/g,
)];
const participantFacade = frozenFacades
  .map((match) => match[1])
  .find((body) => body.includes("acceptParticipantChallenge"));
assert.ok(participantFacade, "iPad participant command facade를 찾을 수 없습니다.");
assert.doesNotMatch(
  participantFacade,
  /\brequestChallenge\b/,
  "legacy participant facade가 RankTakeover 신규 생성 명령을 노출하면 안 됩니다.",
);
assert.doesNotMatch(
  participantFacade,
  /\bsubmitResult\b/,
  "legacy participant facade가 내부 정산 명령을 노출하면 안 됩니다.",
);

function modelAuthoritySnapshot(order) {
  const modulePaths = {
    goat: path.join(repoRoot, "models/goatArenaModel.js"),
    legacyAttempt: path.join(repoRoot, "models/arenaMatchAttemptModel.js"),
    legacyRevenge: path.join(repoRoot, "models/arenaRevengeRightModel.js"),
  };
  const program = `
    const mongoose = require("mongoose");
    const paths = ${JSON.stringify(modulePaths)};
    const loaded = {};
    for (const key of ${JSON.stringify(order)}) loaded[key] = require(paths[key]);
    const goat = loaded.goat;
    const legacyAttempt = loaded.legacyAttempt;
    const legacyRevenge = loaded.legacyRevenge;
    const describe = (model, distinguishingPaths) => ({
      modelName: model.modelName,
      collection: model.collection.collectionName,
      distinguishingPaths: Object.fromEntries(
        distinguishingPaths.map((name) => [name, Boolean(model.schema.path(name))]),
      ),
    });
    process.stdout.write(JSON.stringify({
      goatAttempt: describe(goat.ArenaMatchAttempt, ["userId", "participantUserId"]),
      goatAttemptEvent: describe(goat.ArenaMatchAttemptEvent, ["userId", "participantUserId"]),
      goatRevenge: describe(goat.ArenaRevengeRight, ["eligibleUserId", "entitledUserId"]),
      legacyAttempt: describe(legacyAttempt.RankTakeoverAttempt, ["userId", "participantUserId"]),
      legacyAttemptEvent: describe(legacyAttempt.RankTakeoverAttemptEvent, ["userId", "participantUserId"]),
      legacySubmission: describe(legacyAttempt.RankTakeoverAttemptSubmission, ["userId", "participantUserId"]),
      legacyRevenge: describe(legacyRevenge.RankTakeoverRevengeRight, ["eligibleUserId", "entitledUserId"]),
      registeredNames: Object.keys(mongoose.models)
        .filter((name) => /(?:ArenaMatchAttempt|ArenaRevengeRight|RankTakeoverAttempt|RankTakeoverRevengeRight)/.test(name))
        .sort(),
    }));
  `;
  const result = spawnSync(process.execPath, ["-e", program], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    0,
    `모델 require-order 검증 프로세스 실패: ${result.stderr}`,
  );
  return JSON.parse(result.stdout);
}

const standaloneFirst = modelAuthoritySnapshot([
  "legacyAttempt",
  "legacyRevenge",
  "goat",
]);
const authorityFirst = modelAuthoritySnapshot([
  "goat",
  "legacyAttempt",
  "legacyRevenge",
]);
assert.deepEqual(
  standaloneFirst,
  authorityFirst,
  "모듈 require 순서가 공식/legacy Arena 스키마를 바꾸면 안 됩니다.",
);
assert.deepEqual(authorityFirst, {
  goatAttempt: {
    modelName: "ArenaMatchAttempt",
    collection: "arenamatchattempts",
    distinguishingPaths: { userId: true, participantUserId: false },
  },
  goatAttemptEvent: {
    modelName: "ArenaMatchAttemptEvent",
    collection: "arenamatchattemptevents",
    distinguishingPaths: { userId: true, participantUserId: false },
  },
  goatRevenge: {
    modelName: "ArenaRevengeRight",
    collection: "arenarevengerights",
    distinguishingPaths: { eligibleUserId: true, entitledUserId: false },
  },
  legacyAttempt: {
    modelName: "RankTakeoverAttempt",
    collection: "ranktakeoverattempts",
    distinguishingPaths: { userId: false, participantUserId: true },
  },
  legacyAttemptEvent: {
    modelName: "RankTakeoverAttemptEvent",
    collection: "ranktakeoverattemptevents",
    distinguishingPaths: { userId: false, participantUserId: true },
  },
  legacySubmission: {
    modelName: "RankTakeoverAttemptSubmission",
    collection: "ranktakeoverattemptsubmissions",
    distinguishingPaths: { userId: false, participantUserId: true },
  },
  legacyRevenge: {
    modelName: "RankTakeoverRevengeRight",
    collection: "ranktakeoverrevengerights",
    distinguishingPaths: { eligibleUserId: false, entitledUserId: true },
  },
  registeredNames: [
    "ArenaMatchAttempt",
    "ArenaMatchAttemptEvent",
    "ArenaRevengeRight",
    "RankTakeoverAttempt",
    "RankTakeoverAttemptEvent",
    "RankTakeoverAttemptSubmission",
    "RankTakeoverRevengeRight",
  ],
});

console.log(
  "ArenaMatch production authority and RankTakeover no-public-creation boundary passed",
);
