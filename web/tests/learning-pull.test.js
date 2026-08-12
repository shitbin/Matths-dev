// 실행:  node webrepo-applied/tests/learning-pull.test.js
//
// GET /api/v1/learning (진도 내려받기) 를 DB 없이 실행한다.
// Atlas 화이트리스트가 이 IP 를 막고 있어 실 E2E 가 안 되므로 모델만 가짜로 끼운다.
const path = require("path");
const REPO = path.resolve(__dirname, "..");
const modelPath = require.resolve(path.join(REPO, "models/matthsModel.js"));

// 서버가 저장해 둔 진도 두 건 (하나는 게이트 완료, 하나는 진행 중)
const rows = [
  { courseId: "calculus-1", unitId: "u1", conceptId: "calculus-1-01-01",
    completedTopicIndexes: [0, 1], completionPercent: 100,
    masteryGate: {
      requiredDistinctTypes: 5,
      correctTypeIds: ["a", "b", "c", "d", "e"],
      userCompleted: true,
    },
    lastStudiedAt: new Date("2026-07-29T09:00:00Z") },
  { courseId: "algebra", unitId: "u2", conceptId: "algebra-01-03",
    completedTopicIndexes: [], completionPercent: 30,
    masteryGate: {}, lastStudiedAt: null },
];

require.cache[modelPath] = {
  id: modelPath, filename: modelPath, loaded: true, exports: {
    ConceptProgress: {
      find: () => ({ sort: () => ({ limit: () => ({ lean: async () => rows }) }) }),
    },
    LearningEvent: {}, Problem: {}, ProblemAttempt: {},
  },
};

const ctrl = require(path.join(REPO, "controllers/ipadSyncController.js"));
const res = { json(b) { this.body = b; return this; } };

(async () => {
  const fails = [];
  const ok = (c, label, got) =>
    c ? console.log(`  ✓ ${label}`) : (fails.push(label), console.log(`  ✗ ${label} — 실제: ${JSON.stringify(got)}`));

  await ctrl.getLearning({ apiUser: { _id: "u1" } }, res);
  const p = res.body.progress;
  ok(Array.isArray(p) && p.length === 2, "진도 2건 반환", p && p.length);
  ok(p[0].conceptId === "calculus-1-01-01", "conceptId 전달", p[0].conceptId);
  ok(JSON.stringify(p[0].completedTopicIndexes) === "[0,1]", "완료 토픽 전달", p[0].completedTopicIndexes);
  ok(p[0].masteryGate.userCompleted === true, "게이트 완료 플래그", p[0].masteryGate);
  ok(JSON.stringify(p[0].masteryGate.correctTypeIds) === '["a","b","c","d","e"]',
     "맞힌 유형 전달", p[0].masteryGate.correctTypeIds);
  // 기본값 — 서버에 masteryGate 가 비어 있어도 앱이 파싱할 수 있어야 한다
  ok(p[1].masteryGate.requiredDistinctTypes === 5, "필수 유형 수 기본값 5", p[1].masteryGate);
  ok(p[1].masteryGate.userCompleted === false, "빈 게이트는 미완료", p[1].masteryGate);
  ok(p[1].lastStudiedAt === null, "lastStudiedAt null 허용", p[1].lastStudiedAt);

  console.log(fails.length ? `\n실패 ${fails.length}건` : "\n전부 통과");
  process.exit(fails.length ? 1 : 0);
})();
