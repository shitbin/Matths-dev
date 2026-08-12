"use strict";

const assert = require("node:assert/strict");

const {
  loadCurriculum,
} = require("../services/curriculumService");
const {
  getProblemGenerator,
} = require("../services/problemGenerators");
const {
  TYPE_IDS,
  getAuthoredConceptLesson,
  getCurriculumConceptCheckGenerator,
} = require(
  "../services/problemGenerators/curriculumConceptCheck"
);
const {
  validateGeneratedProblem,
} = require("../services/problemGenerators/utils");

const curriculum = loadCurriculum();
let totalConcepts = 0;
let specializedConcepts = 0;
let fallbackConcepts = 0;

for (const course of curriculum.courses) {
  for (const unit of course.units) {
    for (const concept of unit.concepts) {
      totalConcepts += 1;
      const lookup = {
        courseId: course.id,
        unitId: unit.id,
        conceptId: concept.id,
      };
      const specialized = getProblemGenerator(lookup);
      const fallback = getCurriculumConceptCheckGenerator(lookup);
      const lesson = getAuthoredConceptLesson(lookup);

      assert.equal(
        course.developmentLocked,
        false,
        `${course.id}: 완성된 강의와 연습이 있는데 개발중으로 잠겨 있습니다.`,
      );
      assert.ok(lesson?.summary, `${concept.id}: 웹 강의 요약이 없습니다.`);
      assert.ok(lesson?.keyTakeaway, `${concept.id}: 웹 핵심 정리가 없습니다.`);
      assert.ok(lesson?.steps?.length, `${concept.id}: 웹 학습 단계가 없습니다.`);
      assert.equal(lesson.isPublished, true);

      assert.ok(
        specialized || fallback,
        `${course.id}/${unit.id}/${concept.id}: 연습 생성기가 없습니다.`,
      );

      if (specialized) {
        specializedConcepts += 1;
        assert.notEqual(
          specialized.source,
          "authored-curriculum-check",
          "계산형 정본 생성기를 개념 확인 생성기가 덮어쓰면 안 됩니다.",
        );
        continue;
      }

      fallbackConcepts += 1;
      assert.equal(fallback.source, "authored-curriculum-check");
      assert.equal(fallback.requiredDistinctTypes, TYPE_IDS.length);
      assert.deepEqual(
        fallback.problemTypes.map((problemType) => problemType.id),
        TYPE_IDS,
      );

      for (const problemType of fallback.problemTypes) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const problem = problemType.generate();
          assert.equal(problem.inputMode, "multiple-choice");
          assert.equal(problem.choices.length, 4);
          assert.ok(
            problem.choices.some(
              (choice) => choice.key === problem.answer,
            ),
            `${concept.id}/${problemType.id}: 정답 보기가 없습니다.`,
          );
          validateGeneratedProblem(problem, problemType);
        }
      }
    }
  }
}

assert.equal(totalConcepts, 220, "2022 개정 수학 커리큘럼은 220개념이어야 합니다.");
assert.ok(specializedConcepts > 0, "기존 계산형 생성기가 사라졌습니다.");
assert.ok(fallbackConcepts > 0, "콘텐츠 공백용 개념 확인 생성기가 사용되지 않습니다.");
assert.equal(
  specializedConcepts + fallbackConcepts,
  totalConcepts,
  "모든 개념이 정확히 한 연습 경로를 가져야 합니다.",
);

console.log(
  `curriculum practice coverage passed: ${totalConcepts} concepts ` +
  `(${specializedConcepts} specialized, ${fallbackConcepts} authored checks)`,
);
