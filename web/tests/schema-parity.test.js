// 실행:  node webrepo-applied/tests/schema-parity.test.js
//
// **작업본 스키마가 레포와 어긋나지 않는지** 본다.
//
// Mongoose 는 strict 모드라 스키마에 없는 경로에 대한 대입을 **조용히 버린다.**
// 그래서 필드가 빠져 있으면 오류 없이 기능만 죽는다. 실제로 두 번 그랬다:
//   · accountStatus 계열이 없어 **정지된 계정이 API 를 계속 썼다**
//   · placementResult / scopeType "placement" 가 없어 배치고사를 저장할 수 없었고,
//     그 결과 RankingProfile 이 생기지 않아 랭킹전이 영구 잠금이었다
// 조용히 죽는 종류라 테스트로만 잡힌다.
const path = require("path");
const REPO = path.resolve(__dirname, "..");
const M = require(path.join(REPO, "models/matthsModel.js"));

const fails = [];
const ok = (c, label, got) =>
  c ? console.log(`  ✓ ${label}`)
    : (fails.push(label), console.log(`  ✗ ${label} — 실제: ${JSON.stringify(got)}`));

const has = (model, field) => Boolean(M[model]?.schema?.paths?.[field]);

// ── 계정 상태 (정지·경고) ──────────────────────────────────────────
for (const f of ["accountStatus", "accountStatusReason", "suspendedUntil",
                 "accountStatusChangedAt", "warningCount", "isActive", "tokenVersion"]) {
  ok(has("User", f), `User.${f} 존재`, null);
}
ok(M.User.schema.paths.accountStatus.enumValues.join(",") ===
   "active,inactive,suspended,withdrawn",
   "accountStatus enum 이 레포와 같다", M.User.schema.paths.accountStatus.enumValues);

// ── 배치고사 ──────────────────────────────────────────────────────
ok(has("AssessmentAttempt", "placementResult"), "AssessmentAttempt.placementResult 존재", null);
ok(has("AssessmentAttempt", "generationVersion"), "AssessmentAttempt.generationVersion 존재", null);
ok(M.AssessmentAttempt.schema.paths.scopeType.enumValues.includes("placement"),
   'scopeType 에 "placement" 가 있다 — 없으면 배치고사를 저장할 수 없다',
   M.AssessmentAttempt.schema.paths.scopeType.enumValues);

// ── 랭킹 ──────────────────────────────────────────────────────────
for (const f of ["mmr", "tier", "rankPoint", "overallRank", "percentile",
                 "status", "datasetOnly", "reachedCurrentMmrAt"]) {
  ok(has("RankingProfile", f), `RankingProfile.${f} 존재`, null);
}
ok(M.RankingProfile.schema.paths.tier.enumValues.length === 9,
   "티어 enum 9종", M.RankingProfile.schema.paths.tier.enumValues.length);

// ── 모델 자체가 등록돼 있는가 ────────────────────────────────────
for (const m of ["User", "AssessmentAttempt", "ConceptProgress", "ProblemAttempt",
                 "LearningEvent", "RankingProfile", "PrivateMockExamAttempt",
                 "PrivateMockWeeklyResult"]) {
  ok(Boolean(M[m]), `${m} export`, null);
}

// ── 오프라인 이벤트 멱등성 ─────────────────────────────────────────
ok(has("LearningEvent", "clientEventId"),
   "LearningEvent.clientEventId 존재", null);
ok(M.LearningEvent.schema.paths.clientEventId.isRequired === true,
   "LearningEvent.clientEventId 필수", M.LearningEvent.schema.paths.clientEventId);
const eventIndexes = M.LearningEvent.schema.indexes();
ok(eventIndexes.some(([fields, options]) =>
     fields.userId === 1 &&
     fields.clientEventId === 1 &&
     options.unique === true),
   "userId + clientEventId 유니크 인덱스",
   eventIndexes);

console.log(fails.length ? `\n실패 ${fails.length}건` : "\n전부 통과");
process.exit(fails.length ? 1 : 0);
