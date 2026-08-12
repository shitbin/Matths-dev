#!/usr/bin/env node

"use strict";

const {
  getProblemGenerator,
} = require("../services/problemGenerators");
const {
  generateValidProblem,
  validateGeneratedProblem,
} = require(
  "../services/problemGenerators/utils"
);

const requestedRuns = Number(process.argv[2] || 1000);
const runsPerType =
  Number.isInteger(requestedRuns) && requestedRuns > 0
    ? requestedRuns
    : 1000;

const concepts = [
  "polynomial-arithmetic",
  "identity-remainder-theorem",
  "polynomial-factorization",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertBalancedMath(value, context) {
  const source = String(value || "");
  const openings = source.match(/\\\(/g) || [];
  const closings = source.match(/\\\)/g) || [];

  assert(
    openings.length === closings.length,
    `${context}: 수식 구분자가 닫히지 않았습니다.`
  );
}

let generatedCount = 0;

for (const conceptId of concepts) {
  const generator = getProblemGenerator({
    courseId: "common-math-1",
    unitId: "polynomials",
    conceptId,
  });

  assert(generator, `${conceptId}: 생성기가 없습니다.`);
  assert(
    generator.problemTypes.length === 10,
    `${conceptId}: 문제 유형이 10개가 아닙니다.`
  );
  assert(
    generator.requiredDistinctTypes === 5,
    `${conceptId}: 숙달 조건이 5개 유형이 아닙니다.`
  );

  const typeIds = generator.problemTypes.map(
    ({ id }) => id
  );
  assert(
    new Set(typeIds).size === typeIds.length,
    `${conceptId}: 유형 id가 중복됩니다.`
  );

  for (const problemType of generator.problemTypes) {
    const fingerprints = new Set();

    for (let run = 0; run < runsPerType; run += 1) {
      const problem = generateValidProblem(problemType);
      const context = `${conceptId}/${problemType.id}`;
      const serialized = JSON.stringify(problem);

      validateGeneratedProblem(problem, problemType);
      assert(
        generator.verify(problem),
        `${context}: 독립 검산에 실패했습니다.`
      );
      assert(
        !/NaN|undefined|Infinity/.test(serialized),
        `${context}: 유효하지 않은 값이 포함됐습니다.`
      );
      assert(
        problem.solution.includes("먼저:") &&
          problem.solution.includes("다음으로:"),
        `${context}: 단계별 해설이 빠졌습니다.`
      );
      assertBalancedMath(problem.prompt, `${context}/prompt`);
      assertBalancedMath(problem.solution, `${context}/solution`);
      assertBalancedMath(problem.hintText, `${context}/hint`);

      fingerprints.add(
        JSON.stringify({
          prompt: problem.prompt,
          choices: problem.choices || [],
        })
      );
      generatedCount += 1;
    }

    assert(
      runsPerType < 10 || fingerprints.size >= 5,
      `${conceptId}/${problemType.id}: 실제 변형이 5개 미만입니다.`
    );
  }

  console.log(
    `✓ ${conceptId}: 10개 유형 × ${runsPerType.toLocaleString(
      "ko-KR"
    )}회 검산 통과`
  );
}

console.log(
  `총 ${generatedCount.toLocaleString(
    "ko-KR"
  )}개 공통수학1 다항식 문제를 검증했습니다.`
);
