"use strict";

const assert = require("node:assert/strict");

const {
  generateArenaPdfOneOnOneQuestions,
} = require("../services/arenaPdfOneOnOneQuestionPool");

function recentTokens(questions) {
  return questions.flatMap((question) => [
    question.typeId,
    question.sourceTypeId,
    question.generatorEngineKey,
    question.referenceFamily,
    question.design?.typeSkeletonId,
  ]).filter(Boolean);
}

function repeatedFamilies(questions, tokens) {
  const recent = new Set(tokens);
  return questions.filter((question) =>
    recent.has(question.referenceFamily) ||
    recent.has(question.design?.typeSkeletonId) ||
    recent.has(question.generatorEngineKey)
  );
}

function repeatedExactSources(questions, tokens) {
  const recent = new Set(tokens);
  return questions.filter((question) =>
    recent.has(question.typeId) ||
    recent.has(question.sourceTypeId) ||
    recent.has(question.generatorEngineKey) ||
    recent.has(question.design?.typeSkeletonId)
  );
}

const maximumUnavoidableFamilyRepeats = {
  U6: 1,
  U8: 0,
  R6: 2,
  R8: 1,
};
const maximumUnavoidableExactRepeats = {
  U6: 0,
  U8: 0,
  // R6의 세 번째 슬롯(D6 확률과 통계)은 현재 정본에 생성기가 정확히 1개다.
  // 풀이 구조 반복을 피하려면 난이도·과목 슬롯 자체를 바꿔야 하므로 이 한 건만
  // 명시적으로 허용하고, 다른 네 슬롯은 반복 0을 강제한다.
  R6: 1,
  R8: 0,
};

for (const difficultyCode of ["U6", "U8", "R6", "R8"]) {
  const prior = generateArenaPdfOneOnOneQuestions({
    difficultyCode,
    matchKey: `recent-structure:prior:${difficultyCode}`,
  });
  const tokens = recentTokens(prior);
  const next = generateArenaPdfOneOnOneQuestions({
    difficultyCode,
    matchKey: `recent-structure:next:${difficultyCode}`,
    recentTypeIds: tokens,
  });

  assert.equal(next.length, 5);
  assert.equal(new Set(next.map((item) => item.referenceFamily)).size, 5);
  assert.equal(new Set(next.map((item) => item.design.typeSkeletonId)).size, 5);
  assert.ok(
    repeatedExactSources(next, tokens).length <= maximumUnavoidableExactRepeats[difficultyCode],
    `${difficultyCode}: 피할 수 있는 이전 경기의 원문·생성기·풀이 구조를 다시 사용했습니다.`
  );
  assert.ok(
    repeatedFamilies(next, tokens).length <= maximumUnavoidableFamilyRepeats[difficultyCode],
    `${difficultyCode}: 피할 수 있는 최근 사고 계열까지 다시 사용했습니다.`
  );
}

console.log("Arena PDF recent family and structure avoidance passed");
