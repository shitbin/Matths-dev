#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  buildCurriculumMotionLesson,
} = require("../services/curriculumMotionLessonService");
const {
  getCurriculumStoryCatalog,
  toStudentCurriculumStory,
} = require("../services/curriculumStoryService");

const root = path.resolve(__dirname, "..");
const serviceSource = fs.readFileSync(
  path.join(root, "services", "curriculumMotionLessonService.js"),
  "utf8",
);
const clientSource = fs.readFileSync(
  path.join(root, "public", "js", "curriculum-motion-lesson.js"),
  "utf8",
);
const partialSource = fs.readFileSync(
  path.join(root, "views", "partials", "curriculum-story-timeline.ejs"),
  "utf8",
);
const cssSource = fs.readFileSync(
  path.join(root, "public", "css", "curriculum-story.css"),
  "utf8",
);
const unitLearningClientSource = fs.readFileSync(
  path.join(root, "public", "js", "unit-learning.js"),
  "utf8",
);

assert.match(clientSource, /const expression = String\(beat\?\.expression \|\| ""\)\.trim\(\)/u);
assert.match(clientSource, /expression\.length <= 16/u);

const catalog = getCurriculumStoryCatalog();
let lessonCount = 0;
let authoredSceneCount = 0;
let authoredStoryCount = 0;
const fullyAuthoredUnits = new Map();
for (const rawStory of catalog.publishedStoryByKey.values()) {
  const story = toStudentCurriculumStory(rawStory);
  const lesson = buildCurriculumMotionLesson(story, [
    `${story.title}의 수학적 대상을 단계별로 조립`,
  ]);
  lessonCount += 1;

  assert.equal(lesson.schemaVersion, "MATTHS_CURRICULUM_MOTION_V1");
  assert.equal(lesson.storyId, story.id);
  assert.equal(lesson.scenes.length, 5);
  assert.deepEqual(
    lesson.scenes.map((scene) => scene.id),
    story.scenes.map((scene) => scene.id),
  );

  let storyHasAuthoredMotion = false;
  for (const [index, scene] of lesson.scenes.entries()) {
    assert.ok(["equation", "blocks", "graph", "geometry", "plot"].includes(scene.visualMode));
    assert.ok(scene.focusToken.length >= 2 && scene.focusToken.length <= 48);
    assert.ok(scene.mildExplanation.length > story.scenes[index].subtitle.length);
    assert.match(scene.spicyExplanation, /핵심 대상은/u);
    assert.equal(scene.check.choices.length, 3);
    assert.ok(scene.check.answerIndex >= 0 && scene.check.answerIndex < 3);
    assert.ok(scene.beats.length >= 3 && scene.beats.length <= 5);
    if (scene.authored) {
      storyHasAuthoredMotion = true;
      authoredSceneCount += 1;
      assert.ok(scene.beats.length >= 3, "authored scene은 실제 키프레임 3개 이상이어야 합니다.");
      assert.ok(scene.beats.every((beat) => beat.target && beat.expression && beat.caption));
      assert.ok(scene.check.correctFeedback.length >= 12);
      assert.ok(scene.check.retryFeedback.length >= 12);
    } else {
      assert.deepEqual(
        scene.beats.map((beat) => beat.id),
        ["guided-focus", "guided-connect", "guided-verify"],
      );
      assert.deepEqual(
        scene.beats.map((beat) => beat.action),
        ["highlight", "transform", "verify"],
      );
      assert.ok(scene.beats.every((beat) => beat.target && beat.expression && beat.result && beat.caption));
      assert.equal(
        scene.check.choices[scene.check.answerIndex],
        story.scenes[index].subtitle,
      );
    }
    assert.doesNotMatch(JSON.stringify(scene), /studioScript/u);
  }
  if (storyHasAuthoredMotion) {
    authoredStoryCount += 1;
    const unitKey = `${rawStory.courseId}/${rawStory.unitId}`;
    fullyAuthoredUnits.set(unitKey, (fullyAuthoredUnits.get(unitKey) || 0) + 1);
  }
}

assert.equal(lessonCount, 220, "220개 정본 모두 모션 수업 projection을 가져야 합니다.");
assert.equal(authoredStoryCount, 220, "220개념 전체가 bespoke motion 정본이어야 합니다.");
assert.equal(authoredSceneCount, 1100, "1,100개 장면 전체가 authored motion이어야 합니다.");
assert.equal(authoredStoryCount, lessonCount, "semantic guided fallback으로 남은 개념이 없어야 합니다.");
assert.equal(fullyAuthoredUnits.get("common-math-1/polynomials"), 3);
assert.equal(fullyAuthoredUnits.get("common-math-1/equations-and-inequalities"), 11);
assert.equal(fullyAuthoredUnits.get("common-math-1/counting"), 3);
assert.equal(fullyAuthoredUnits.get("common-math-1/matrices"), 2);
assert.equal(fullyAuthoredUnits.get("common-math-2/coordinate-geometry"), 7);
assert.equal(fullyAuthoredUnits.get("common-math-2/sets-and-propositions"), 8);
assert.equal(fullyAuthoredUnits.get("common-math-2/functions-and-graphs"), 5);
assert.equal(fullyAuthoredUnits.get("algebra/exponential-logarithmic-functions"), 8);
assert.equal(fullyAuthoredUnits.get("algebra/trigonometric-functions"), 3);
assert.equal(fullyAuthoredUnits.get("algebra/sequences"), 7);
assert.equal(fullyAuthoredUnits.get("calculus-1/limits-and-continuity"), 4);
assert.equal(fullyAuthoredUnits.get("calculus-1/differentiation"), 10);
assert.equal(fullyAuthoredUnits.get("calculus-1/integration"), 6);
assert.equal(fullyAuthoredUnits.get("probability-statistics/counting"), 3);
assert.equal(fullyAuthoredUnits.get("probability-statistics/probability"), 6);
assert.equal(fullyAuthoredUnits.get("probability-statistics/statistics"), 7);
const geometryLesson = buildCurriculumMotionLesson(
  toStudentCurriculumStory(
    [...catalog.publishedStoryByKey.values()].find(
      (story) => story.conceptId === "geometry-01-01",
    ),
  ),
  ["초점과 준선의 거리 관계를 움직이는 점으로 추적"],
);
assert.deepEqual(
  geometryLesson.scenes.map((scene) => scene.focusToken),
  [
    "초점 F·준선·점 P의 동거리",
    "거리식에서 y²=4px가 생기는 과정",
    "방향·꼭짓점·초점·준선",
    "p=2와 꼭짓점 O",
    "제곱되지 않은 변수와 열린 방향",
  ],
  "기하 저작 연출은 장면마다 학생이 실제로 가리킬 수학 대상을 고정해야 합니다.",
);
assert.ok(geometryLesson.scenes.every((scene) => scene.authored === true));
const generatedGeometryCopy = geometryLesson.scenes.flatMap((scene) => [
  scene.focusToken,
  scene.visualIdea,
  scene.mildExplanation,
  ...scene.beats.map((beat) => beat.caption),
  scene.check.correctFeedback,
  scene.check.retryFeedback,
]).join('\n');
assert.doesNotMatch(generatedGeometryCopy, /점과을|모양이면을|같은을|”을 가리키/u);
assert.doesNotMatch(generatedGeometryCopy, /“거리”과|“거리”을/u);
assert.match(geometryLesson.scenes[0].visualIdea, /초점 F.*준선/u);
assert.match(geometryLesson.scenes[2].visualIdea, /거리.*준선/u);
assert.doesNotMatch(geometryLesson.scenes[2].visualIdea, /접선|판별식/u);
const geometrySceneIDs = [...catalog.publishedStoryByKey.values()]
  .filter((story) => story.courseId === "geometry")
  .flatMap((story) => story.scenes.map((scene) => scene.id));
assert.equal(geometrySceneIDs.length, 70, "기하 14개념의 70장면을 모두 검사해야 합니다.");
for (const story of [...catalog.publishedStoryByKey.values()].filter((item) => item.courseId === "geometry")) {
  for (const scene of story.scenes) {
    assert.equal(scene.motion?.version, 1, `기하 장면 ${scene.id}에 authored motion이 있어야 합니다.`);
    assert.equal(scene.motion.beats.length, 3, `기하 장면 ${scene.id}는 3단계 교사 동작이어야 합니다.`);
    assert.equal(scene.motion.check.choices.length, 3, `기하 장면 ${scene.id}는 3지 이해 확인이어야 합니다.`);
  }
}
for (const sceneID of geometrySceneIDs) {
  assert.match(
    clientSource,
    new RegExp(`"${sceneID}"`, "u"),
    `기하 장면 ${sceneID}가 전용 teacher-board 라우팅에 포함되어야 합니다.`,
  );
}
assert.match(clientSource, /GEOMETRY_COURSE_SCENES\.has\(scene\.id\)/u);
assert.match(clientSource, /drawGeometryCourseConic/u);
assert.match(clientSource, /drawGeometryCourseSpace/u);
assert.match(clientSource, /drawGeometryCourseVector/u);
const practicalStatisticsSceneIDs = [...catalog.publishedStoryByKey.values()]
  .filter((story) => story.courseId === "practical-statistics")
  .flatMap((story) => story.scenes.map((scene) => scene.id));
assert.equal(practicalStatisticsSceneIDs.length, 65, "실용 통계 13개념의 65장면을 모두 검사해야 합니다.");
for (const story of [...catalog.publishedStoryByKey.values()].filter((item) => item.courseId === "practical-statistics")) {
  for (const scene of story.scenes) {
    assert.equal(scene.motion?.version, 1, `실용통계 장면 ${scene.id}에 authored motion이 있어야 합니다.`);
    assert.equal(scene.motion.beats.length, 3, `실용통계 장면 ${scene.id}는 3단계 교사 동작이어야 합니다.`);
    assert.equal(scene.motion.check.choices.length, 3, `실용통계 장면 ${scene.id}는 3지 이해 확인이어야 합니다.`);
  }
}
for (const sceneID of practicalStatisticsSceneIDs) {
  assert.match(
    clientSource,
    new RegExp(`"${sceneID}"`, "u"),
    `실용 통계 장면 ${sceneID}가 전용 teacher-board 라우팅에 포함되어야 합니다.`,
  );
}
assert.match(clientSource, /PRACTICAL_STATISTICS_SCENES\.has\(scene\.id\)/u);
assert.match(clientSource, /drawPracticalInquiry/u);
assert.match(clientSource, /drawPracticalDataDesign/u);
assert.match(clientSource, /drawPracticalDescriptive/u);
assert.match(clientSource, /drawPracticalDistribution/u);
assert.match(clientSource, /drawPracticalInterval/u);
assert.match(clientSource, /drawPracticalHypothesis/u);
const economicsMathSceneIDs = [...catalog.publishedStoryByKey.values()]
  .filter((story) => story.courseId === "economics-math")
  .flatMap((story) => story.scenes.map((scene) => scene.id));
assert.equal(economicsMathSceneIDs.length, 90, "경제 수학 18개념의 90장면을 모두 검사해야 합니다.");
for (const story of [...catalog.publishedStoryByKey.values()].filter((item) => item.courseId === "economics-math")) {
  for (const scene of story.scenes) {
    assert.equal(scene.motion?.version, 1, `경제수학 장면 ${scene.id}에 authored motion이 있어야 합니다.`);
    assert.equal(scene.motion.beats.length, 3, `경제수학 장면 ${scene.id}는 3단계 교사 동작이어야 합니다.`);
    assert.equal(scene.motion.check.choices.length, 3, `경제수학 장면 ${scene.id}는 3지 이해 확인이어야 합니다.`);
  }
}
for (const sceneID of economicsMathSceneIDs) {
  assert.match(
    clientSource,
    new RegExp(`"${sceneID}"`, "u"),
    `경제 수학 장면 ${sceneID}가 전용 teacher-board 라우팅에 포함되어야 합니다.`,
  );
}
assert.match(clientSource, /ECONOMICS_MATH_SCENES\.has\(scene\.id\)/u);
assert.match(clientSource, /drawEconomicsFinance/u);
assert.match(clientSource, /drawEconomicsMarket/u);
assert.match(clientSource, /drawEconomicsLinearMatrix/u);
assert.match(clientSource, /drawEconomicsMarginal/u);
const aiMathSceneIDs = [...catalog.publishedStoryByKey.values()]
  .filter((story) => story.courseId === "ai-math")
  .flatMap((story) => story.scenes.map((scene) => scene.id));
assert.equal(aiMathSceneIDs.length, 75, "AI 수학 15개념의 75장면을 모두 검사해야 합니다.");
for (const story of [...catalog.publishedStoryByKey.values()].filter((item) => item.courseId === "ai-math")) {
  for (const scene of story.scenes) {
    assert.equal(scene.motion?.version, 1, `AI수학 장면 ${scene.id}에 authored motion이 있어야 합니다.`);
    assert.equal(scene.motion.beats.length, 3, `AI수학 장면 ${scene.id}는 3단계 교사 동작이어야 합니다.`);
    assert.equal(scene.motion.check.choices.length, 3, `AI수학 장면 ${scene.id}는 3지 이해 확인이어야 합니다.`);
  }
}
for (const sceneID of aiMathSceneIDs) {
  assert.match(
    clientSource,
    new RegExp(`"${sceneID}"`, "u"),
    `AI 수학 장면 ${sceneID}가 전용 teacher-board 라우팅에 포함되어야 합니다.`,
  );
}
assert.match(clientSource, /AI_MATH_SCENES\.has\(scene\.id\)/u);
assert.match(clientSource, /drawAiLearning/u);
assert.match(clientSource, /drawAiText/u);
assert.match(clientSource, /drawAiImage/u);
assert.match(clientSource, /drawAiPrediction/u);
assert.match(clientSource, /drawAiInquiry/u);
const mathCultureSceneIDs = [...catalog.publishedStoryByKey.values()]
  .filter((story) => story.courseId === "math-and-culture")
  .flatMap((story) => story.scenes.map((scene) => scene.id));
assert.equal(mathCultureSceneIDs.length, 80, "수학과 문화 16개념의 80장면을 모두 검사해야 합니다.");
for (const story of [...catalog.publishedStoryByKey.values()].filter((item) => item.courseId === "math-and-culture")) {
  for (const scene of story.scenes) {
    assert.equal(scene.motion?.version, 1, `수학과 문화 장면 ${scene.id}에 authored motion이 있어야 합니다.`);
    assert.equal(scene.motion.beats.length, 3, `수학과 문화 장면 ${scene.id}는 3단계 교사 동작이어야 합니다.`);
    assert.equal(scene.motion.check.choices.length, 3, `수학과 문화 장면 ${scene.id}는 3지 이해 확인이어야 합니다.`);
  }
}
for (const sceneID of mathCultureSceneIDs) {
  assert.match(
    clientSource,
    new RegExp(`"${sceneID}"`, "u"),
    `수학과 문화 장면 ${sceneID}가 전용 teacher-board 라우팅에 포함되어야 합니다.`,
  );
}
assert.match(clientSource, /MATH_CULTURE_SCENES\.has\(scene\.id\)/u);
assert.match(clientSource, /drawCultureArt/u);
assert.match(clientSource, /drawCultureLeisure/u);
assert.match(clientSource, /drawCultureSociety/u);
assert.match(clientSource, /drawCultureEnvironment/u);
const mathResearchSceneIDs = [...catalog.publishedStoryByKey.values()]
  .filter((story) => story.courseId === "math-research-project")
  .flatMap((story) => story.scenes.map((scene) => scene.id));
assert.equal(mathResearchSceneIDs.length, 50, "수학과제 탐구 10개념의 50장면을 모두 검사해야 합니다.");
for (const story of [...catalog.publishedStoryByKey.values()].filter((item) => item.courseId === "math-research-project")) {
  for (const scene of story.scenes) {
    assert.equal(scene.motion?.version, 1, `수학과제 탐구 장면 ${scene.id}에 authored motion이 있어야 합니다.`);
    assert.equal(scene.motion.beats.length, 3, `수학과제 탐구 장면 ${scene.id}는 3단계 교사 동작이어야 합니다.`);
    assert.equal(scene.motion.check.choices.length, 3, `수학과제 탐구 장면 ${scene.id}는 3지 이해 확인이어야 합니다.`);
  }
}
for (const sceneID of mathResearchSceneIDs) {
  assert.match(clientSource, new RegExp(`"${sceneID}"`, "u"), `수학과제 탐구 장면 ${sceneID}가 전용 teacher-board 라우팅에 포함되어야 합니다.`);
}
assert.match(clientSource, /MATH_RESEARCH_SCENES\.has\(scene\.id\)/u);
assert.match(clientSource, /drawResearchFoundation/u);
assert.match(clientSource, /drawResearchMethod/u);
assert.match(clientSource, /drawResearchExecution/u);
const vocationalMathSceneIDs = [...catalog.publishedStoryByKey.values()]
  .filter((story) => story.courseId === "vocational-math")
  .flatMap((story) => story.scenes.map((scene) => scene.id));
assert.equal(vocationalMathSceneIDs.length, 90, "직업 수학 18개념의 90장면을 모두 검사해야 합니다.");
for (const story of [...catalog.publishedStoryByKey.values()].filter((item) => item.courseId === "vocational-math")) {
  for (const scene of story.scenes) {
    assert.equal(scene.motion?.version, 1, `직업수학 장면 ${scene.id}에 authored motion이 있어야 합니다.`);
    assert.equal(scene.motion.beats.length, 3, `직업수학 장면 ${scene.id}는 3단계 교사 동작이어야 합니다.`);
    assert.equal(scene.motion.check.choices.length, 3, `직업수학 장면 ${scene.id}는 3지 이해 확인이어야 합니다.`);
  }
}
for (const sceneID of vocationalMathSceneIDs) {
  assert.match(clientSource, new RegExp(`"${sceneID}"`, "u"), `직업 수학 장면 ${sceneID}가 전용 teacher-board 라우팅에 포함되어야 합니다.`);
}
assert.match(clientSource, /VOCATIONAL_MATH_SCENES\.has\(scene\.id\)/u);
assert.match(clientSource, /drawVocationalNumber/u);
assert.match(clientSource, /drawVocationalRelation/u);
assert.match(clientSource, /drawVocationalGeometry/u);
assert.match(clientSource, /drawVocationalData/u);
assert.match(serviceSource, /visualizationIdeas/u);
assert.match(partialSource, /한 번에 한 장면만 봅니다/u);
assert.match(partialSource, /data-motion-understood/u);
assert.match(partialSource, /data-motion-explain="mild"/u);
assert.match(partialSource, /data-motion-explain="spicy"/u);
assert.match(clientSource, /misses >= 2/u);
assert.match(clientSource, /renderBeat/u);
assert.match(clientSource, /setTimeout/u);
assert.doesNotMatch(
  clientSource,
  /schedule\s*&&\s*scene\.authored/u,
  "개별 연출 전 개념도 3동작을 자동 재생해야 합니다.",
);
assert.match(clientSource, /동작 \$\{beatIndex \+ 1\}/u);
assert.match(clientSource, /drawComplexPlane/u);
assert.match(clientSource, /drawIntersectionPlot/u);
assert.match(clientSource, /drawNumberLine/u);
assert.match(clientSource, /drawCountingTree/u);
assert.match(clientSource, /drawPermutationSlots/u);
assert.match(clientSource, /drawCombinationGroups/u);
assert.match(clientSource, /drawMatrixGrid/u);
assert.match(clientSource, /drawCoordinateGeometryScene/u);
assert.match(clientSource, /COORDINATE_GEOMETRY_SCENES/u);
assert.match(clientSource, /drawSetsPropositionsScene/u);
assert.match(clientSource, /SETS_PROPOSITIONS_SCENES/u);
assert.match(clientSource, /drawFunctionsGraphsScene/u);
assert.match(clientSource, /FUNCTIONS_GRAPHS_SCENES/u);
assert.match(clientSource, /drawAlgebraPowerExponentScene/u);
assert.match(clientSource, /ALGEBRA_POWER_EXPONENT_SCENES/u);
assert.match(clientSource, /drawAlgebraLogFunctionScene/u);
assert.match(clientSource, /ALGEBRA_LOG_FUNCTION_SCENES/u);
assert.match(clientSource, /drawAlgebraTrigonometryScene/u);
assert.match(clientSource, /ALGEBRA_TRIGONOMETRY_SCENES/u);
assert.match(clientSource, /drawAlgebraSequenceScene/u);
assert.match(clientSource, /ALGEBRA_SEQUENCE_SCENES/u);
assert.match(clientSource, /drawCalculusOneScene/u);
assert.match(clientSource, /CALCULUS_ONE_SCENES/u);
assert.match(clientSource, /drawCalculusLimitApproach/u);
assert.match(clientSource, /drawCalculusDerivativeDefinition/u);
assert.match(clientSource, /drawCalculusDerivativeGraph/u);
assert.match(clientSource, /drawCalculusAntiderivative/u);
assert.match(clientSource, /drawCalculusAccumulation/u);
assert.match(clientSource, /drawCalculusAreaMotion/u);
assert.match(clientSource, /drawProbabilityStatisticsScene/u);
assert.match(clientSource, /PROBABILITY_STATISTICS_SCENES/u);
assert.match(clientSource, /drawProbabilityCounting/u);
assert.match(clientSource, /drawProbabilitySets/u);
assert.match(clientSource, /drawProbabilityConditional/u);
assert.match(clientSource, /drawProbabilityDistribution/u);
assert.match(clientSource, /drawProbabilityNormal/u);
assert.match(clientSource, /drawProbabilityInference/u);
assert.match(clientSource, /scene\.id\.startsWith\("complex-"\)/u);
assert.match(clientSource, /scene\.id\.startsWith\("simlinear-"\)/u);
assert.match(clientSource, /scene\.id\.startsWith\("counting-"\)/u);
assert.match(clientSource, /scene\.id\.startsWith\("permutation-"\)/u);
assert.match(clientSource, /scene\.id\.startsWith\("combination-"\)/u);
assert.match(clientSource, /scene\.id\.startsWith\("matrix-"\)/u);
assert.match(clientSource, /matths:curriculum-narration-state/u);
assert.match(clientSource, /speechSynthesis/u);
assert.doesNotMatch(clientSource, /\.innerHTML\s*=/u);
assert.match(cssSource, /\.curriculum-stage-focus > strong::before/u);
assert.match(cssSource, /background: var\(--motion-yellow\)/u);
assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/u);
assert.match(cssSource, /container-type:\s*inline-size/u);
assert.match(cssSource, /@container \(max-width:\s*700px\)/u);
assert.match(cssSource, /min-height: 46px/u);
assert.doesNotMatch(
  unitLearningClientSource,
  /activeConcept\.scrollIntoView/u,
  "selected concept must not move the whole document to the secondary concept list",
);
assert.match(unitLearningClientSource, /conceptNav\.scrollTop/u);

console.log(`Curriculum motion lesson contract passed for ${lessonCount} stories.`);
