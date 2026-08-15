// 실행:  node webrepo-applied/tests/mastery-progress.test.js
//
// PATCH /api/v1/learning/:c/:u/:cc/mastery 가 **진도를 실제로 재계산하는지** 본다.
//
// 왜 필요한가: 예전엔 findOneAndUpdate 로 썼다. 쿼리 업데이트는 document 훅
// (conceptProgressSchema.pre("validate"))을 태우지 않아서 completionPercent 가
// 0, status 가 not-started 로 굳었고, 웹 my-learning 은 그 값을 그대로 읽는다.
// 즉 **앱에서 아무리 풀어도 웹 진도가 0** 이었다. 그 회귀를 여기서 막는다.
const path = require("path");
const REPO = path.resolve(__dirname, "..");
const modelPath = require.resolve(path.join(REPO, "models/matthsModel.js"));
const identityPath = require.resolve(path.join(REPO, "services/userIdentityService.js"));

// 실제 스키마의 pre("validate") 훅을 그대로 태우기 위해, 모델 파일을 먼저 읽어
// conceptProgressSchema 를 얻는다. (mongoose 는 연결 없이도 문서 검증이 된다)
const mongoose = require(path.join(REPO, "node_modules/mongoose"));
const real = require(modelPath);
const ConceptProgressModel = real.ConceptProgress;
const curriculumService = require(path.join(REPO, "services/curriculumService.js"));
const { getProblemGenerator } = require(path.join(REPO, "services/problemGenerators"));
const { getCurriculumConceptCheckGenerator } = require(path.join(
  REPO,
  "services/problemGenerators/curriculumConceptCheck"
));

const location = {
  courseId: "common-math-1",
  unitId: "polynomials",
  conceptId: "polynomial-arithmetic",
};
const curriculumItem = curriculumService.findCurriculumConcept(
  curriculumService.loadCurriculum(),
  location.courseId,
  location.unitId,
  location.conceptId
);
const generator =
  getProblemGenerator(location) ||
  getCurriculumConceptCheckGenerator(location);
const validTypeIds = generator.problemTypes.map((problemType) => problemType.id);
const requiredDistinctTypes = generator.requiredDistinctTypes;

const saved = [];
let existing = null;

require.cache[modelPath].exports = {
  ...real,
  ConceptProgress: {
    findOne: async () => existing,
  },
};
require.cache[identityPath] = {
  id: identityPath, filename: identityPath, loaded: true,
  exports: { getRankingDisplayName: (u) => String(u.name || "학생") },
};

const ctrl = require(path.join(REPO, "controllers/ipadSyncController.js"));

const fails = [];
const ok = (c, label, got) =>
  c ? console.log(`  ✓ ${label}`)
    : (fails.push(label), console.log(`  ✗ ${label} — 실제: ${JSON.stringify(got)}`));

(async () => {
  // 실제 스키마 문서를 만들고, 컨트롤러가 save() 를 부르면 검증 훅이 돌게 한다.
  const doc = new ConceptProgressModel({
    userId: new mongoose.Types.ObjectId(),
    curriculumId: "kr-2022",
    ...location,
    topicCount: curriculumItem.concept.topics.length,
    completedTopicIndexes: curriculumItem.concept.topics.map((_, index) => index),
    masteryGate: { requiredDistinctTypes, correctTypeIds: [] },
  });
  doc.save = async function () { await this.validate(); saved.push(this); return this; };
  existing = doc;

  const res = { json(b) { this.body = b; return this; } };
  const callMastery = async ({
    params = location,
    body,
  }) => {
    let forwardedError = null;
    await ctrl.patchMastery({
      apiUser: { _id: doc.userId },
      params,
      body,
    }, res, (error) => { forwardedError = error; });
    return forwardedError;
  };

  let error = await callMastery({
    params: { ...location, conceptId: "not-a-concept" },
    body: { addCorrectTypeIds: [validTypeIds[0]] },
  });
  ok(error?.status === 404 && saved.length === 0,
     "정본에 없는 개념은 저장 전에 404", error?.status);

  error = await callMastery({
    body: { addCorrectTypeIds: ["invented-client-type"] },
  });
  ok(error?.status === 400 && saved.length === 0,
     "생성기에 없는 임의 유형은 저장 전에 400", error?.status);

  error = await callMastery({
    body: { addCorrectTypeIds: [], userCompleted: true },
  });
  ok(error?.status === 409 && saved.length === 0,
     "필수 유형 전에는 클라이언트 완료 플래그를 거부", error?.status);

  error = await callMastery({
    body: {
      addCorrectTypeIds: [
        validTypeIds[0], validTypeIds[1], validTypeIds[2], validTypeIds[0],
      ],
    },
  });
  ok(!error, "정본 유형 적립 요청 성공", error);

  ok(saved.length === 1, "save() 를 태운다(쿼리 업데이트가 아니다)", saved.length);
  ok(doc.masteryGate.correctTypeIds.length === 3,
     "중복을 제거해 유형을 적립한다", doc.masteryGate.correctTypeIds);
  ok(doc.completionPercent === 66,
     "4토픽 완료 + 유형 3/5는 정확히 66%", doc.completionPercent);
  ok(doc.status === "in-progress",
     "유형 적립 중 상태는 in-progress", doc.status);
  ok(res.body.progress.completionPercent === doc.completionPercent,
     "응답이 재계산된 값을 그대로 돌려준다", res.body.progress.completionPercent);

  // 유형을 다 채우면 게이트가 열려야 한다
  error = await callMastery({
    body: { addCorrectTypeIds: validTypeIds.slice(3, requiredDistinctTypes) },
  });
  ok(!error, "남은 정본 유형 적립 요청 성공", error);
  ok(doc.masteryGate.correctTypeIds.length === 5, "5유형 적립", doc.masteryGate.correctTypeIds);
  ok(doc.completionPercent === 90,
     "5유형을 채워도 학생 완료 전에는 90%", doc.completionPercent);
  ok(doc.masteryGate.userCompleted === false,
     "게이트 해금만으로 자동 완료하지 않는다", doc.masteryGate);

  // 학생의 최종 완료 체크는 100%를 만들고, 재전송돼도 최초 완료 시각을 보존한다.
  error = await callMastery({
    body: { addCorrectTypeIds: [], userCompleted: true },
  });
  ok(!error, "게이트 해금 뒤 완료 요청 성공", error);
  ok(doc.completionPercent === 100, "완료 체크 후 100%", doc.completionPercent);
  ok(doc.status === "completed", "완료 상태 재계산", doc.status);
  ok(doc.completedAt instanceof Date &&
     doc.masteryGate.completedAt instanceof Date,
     "상위·게이트 완료 시각을 모두 기록", {
       completedAt: doc.completedAt,
       gateCompletedAt: doc.masteryGate.completedAt,
     });
  const firstCompletedAt = doc.masteryGate.completedAt.getTime();
  await new Promise((resolve) => setTimeout(resolve, 5));
  error = await callMastery({
    body: { addCorrectTypeIds: [], userCompleted: true },
  });
  ok(!error, "완료 요청 재전송 성공", error);
  ok(doc.masteryGate.completedAt.getTime() === firstCompletedAt,
     "같은 완료 요청 재전송에도 최초 완료 시각 불변",
     doc.masteryGate.completedAt);

  console.log(fails.length ? `\n실패 ${fails.length}건` : "\n전부 통과");
  process.exit(fails.length ? 1 : 0);
})();
