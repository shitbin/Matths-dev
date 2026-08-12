"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(repoRoot, file), "utf8");
const {
  normalizeArenaClientReview,
} = require("../services/arenaMatchEvidenceService");

const reviewBase = {
  model: "Qwen3.5-VL-3B",
  modelVersion: "Qwen3.5-VL-3B-Instruct-Q4_K_M.gguf",
  clientBuildVersion: "1.0(1)",
  completedAt: "2026-08-11T08:00:00.000Z",
};

const normal = normalizeArenaClientReview({
  ...reviewBase,
  reviewId: "review-normal-1",
  reviewState: "normal",
  signals: ["answer-only"],
});
assert.deepEqual(
  normal.signals,
  [],
  "정상·판단 불가 검토에는 의심 신호를 서버에 남기면 안 됩니다.",
);

const suspicious = normalizeArenaClientReview({
  ...reviewBase,
  reviewId: "review-suspicious-1",
  reviewState: "suspicious",
  signals: ["answer-only", "unknown-client-claim", "answer-only"],
});
assert.deepEqual(
  suspicious.signals,
  ["answer-only"],
  "서버가 허용한 강한 시각 신호만 중복 없이 보관해야 합니다.",
);

const routeSource = read("routes/api-routes.js");
const controllerSource = read("controllers/goatArenaCommandController.js");
const commandServiceSource = read("services/goatArenaProductionCommandService.js");
const serviceSource = read("services/arenaMatchEvidenceService.js");
const privacy = read("views/privacy.ejs");
const terms = read("views/terms.ejs");

assert.match(
  routeSource,
  /\/goat-arena\/matches\/:matchId\/evidence\/client-review/,
  "인증된 GOAT 증거 검토 접수 경로가 등록되어야 합니다.",
);
assert.match(controllerSource, /submitParticipantClientReview/);
assert.match(commandServiceSource, /attachArenaClientReview/);
assert.match(
  serviceSource,
  /의도적으로 evidence\.status\/anomalyFlags와 match 상태는 건드리지 않는다/,
  "기기 판독값은 서버 무결성 상태나 경기 결과를 직접 바꾸면 안 됩니다.",
);

assert.match(privacy, /온디바이스 비전 모델명·검토 상태·강한 시각 신호 종류/);
assert.match(privacy, /시험지 채점과 AI 튜터에 고른 사진은 서버로 전송되지 않습니다/);
assert.match(privacy, /GOAT Arena에서 직접 제출한 풀이 증거는 경기 검토를 위해 서버에/);
assert.match(privacy, /그 값만으로 자동 제재·점수·승패·정산을 변경하지 않습니다/);
assert.doesNotMatch(
  privacy,
  /시험지 사진과 손글씨 풀이는 서버로 전송되지 않습니다/,
  "GOAT 증거 제출과 충돌하는 포괄적 비전송 문구를 되살리면 안 됩니다.",
);
assert.match(terms, /기기 로컬 비전 모델이 풀이 과정을 검토할 수 있습니다/);
assert.match(terms, /이 기기 신호만으로 자동 유죄 판정, 점수·승패·정산 또는 이용 제재를 변경하지 않습니다/);

console.log("arena client review disclosure contract: ok");
