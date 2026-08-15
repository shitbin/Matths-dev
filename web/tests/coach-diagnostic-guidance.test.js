#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  buildPracticeCoachGuidance,
} = require("../services/practiceService");

const root = path.resolve(__dirname, "..");

for (const mode of ["mild", "spicy"]) {
  const incorrect = buildPracticeCoachGuidance({
    mode,
    situation: "incorrect",
    seed: "fixed-seed",
    typeId: "alg-log-equation",
    typeLabel: "로그방정식",
    submittedAnswer: "-2",
  });
  assert.equal(incorrect.mode, mode);
  assert.match(incorrect.observation, /^관찰 · 로그방정식/u);
  assert.match(incorrect.reason, /^점검 순서 · ①/u);
  assert.match(incorrect.reason, /밑 조건과 진수가 양수/u);
  assert.match(incorrect.observation, /음수 부호를 포함한 답/u);
  assert.match(incorrect.nextAction, /^다음 행동 ·/u);
  assert.doesNotMatch(
    `${incorrect.observation} ${incorrect.reason} ${incorrect.nextAction}`,
    /구덩이|뇌가 제 기능|떠먹여/u,
  );
}

const hints = [
  ["prob-conditional", /조건이 주어진 표본공간/u],
  ["stat-binomial", /시행 횟수·성공 확률/u],
  ["stat-confidence", /표본통계량과 모집단 모수/u],
  ["geo-circle-dist", /기준점·방향·거리/u],
  ["calc-limit", /0\/0 꼴/u],
  ["calc-integral", /적분 구간과 위·아래 함수/u],
  ["seq-block-sum", /한 주기의 길이/u],
];
for (const [typeId, pattern] of hints) {
  const result = buildPracticeCoachGuidance({
    mode: "mild",
    situation: "incorrect",
    seed: typeId,
    typeId,
    typeLabel: "대표 유형",
  });
  assert.match(result.reason, pattern);
}

const correct = buildPracticeCoachGuidance({
  mode: "spicy",
  situation: "correct",
  seed: "correct",
  typeId: "alg-vieta",
  typeLabel: "근과 계수",
});
assert.match(correct.observation, /최종 답이 성립했습니다/u);
assert.match(correct.nextAction, /핵심 조건 하나/u);

const unanswered = buildPracticeCoachGuidance({
  mode: "mild",
  situation: "unanswered",
  seed: "unanswered",
  typeId: "stat-variance",
  typeLabel: "분산",
});
assert.match(unanswered.observation, /아직 답이 입력되지 않았습니다/u);
assert.match(unanswered.reason, /^먼저 볼 곳 ·/u);
assert.match(unanswered.nextAction, /^첫 행동 ·/u);

const fraction = buildPracticeCoachGuidance({
  mode: "mild",
  situation: "incorrect",
  seed: "fraction",
  typeId: "prob-conditional",
  typeLabel: "조건부확률",
  submittedAnswer: "2/5",
});
assert.match(fraction.observation, /분수 형태로 쓴 답/u);
assert.match(fraction.reason, /①.+②/u);
assert.doesNotMatch(
  `${fraction.observation} ${fraction.reason}`,
  /실수했다|틀린 원인|때문에 틀/u,
);

const silent = buildPracticeCoachGuidance({
  mode: "silent",
  situation: "incorrect",
  seed: "silent",
  typeId: "alg-vieta",
  typeLabel: "근과 계수",
});
assert.equal(silent.message, "");
assert.equal(silent.observation, "");
assert.equal(silent.reason, "");
assert.equal(silent.nextAction, "");

for (const relativePath of [
  "public/js/concept-experience.js",
  "public/js/wrong-note-review.js",
]) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  assert.match(source, /\.observation/u);
  assert.match(source, /\.reason/u);
  assert.match(source, /\.nextAction/u);
  assert.doesNotMatch(source, /coachFeedback\s*\?\.message/u);
  assert.doesNotMatch(source, /coachPrompt\s*\?\.message/u);
}

console.log("Structured diagnostic coach guidance contract passed.");
