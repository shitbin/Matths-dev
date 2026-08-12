"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const lessonSeeds = [
  ...require("../scripts/seeds/ipadGenerated"),
  ...require("../scripts/seeds/algebra"),
  ...require("../scripts/seeds/calculus1"),
  ...require("../scripts/seeds/probabilityStatistics"),
];

assert.equal(lessonSeeds.length, 220, "220개 개념 모두 학습 콘텐츠가 있어야 합니다.");
assert.equal(new Set(lessonSeeds.map((seed) => seed.conceptId)).size, 220);

for (const seed of lessonSeeds) {
  const lesson = seed.content || seed.lesson || {};
  assert.ok(String(lesson.summary || "").trim(), `${seed.conceptId}: 요약 누락`);
  assert.ok(String(lesson.keyTakeaway || "").trim(), `${seed.conceptId}: 핵심 정리 누락`);
  assert.ok(Array.isArray(lesson.steps) && lesson.steps.length >= 3, `${seed.conceptId}: 학습 단계 누락`);
}

const secondary = fs.readFileSync(
  path.join(root, "views/partials/concept-secondary-playground.ejs"),
  "utf8",
);
const basic = fs.readFileSync(
  path.join(root, "views/partials/basic-concept-experience.ejs"),
  "utf8",
);
const unitLearning = fs.readFileSync(path.join(root, "views/unit-learning.ejs"), "utf8");
const stylesheet = fs.readFileSync(
  path.join(root, "public/css/concept-experience.css"),
  "utf8",
);

assert.doesNotMatch(secondary, /놀이터를 준비하고 있습니다/);
assert.match(secondary, /class="secondary-concept-board"/);
assert.match(secondary, /lesson\.steps[\s\S]*slice\(0, 4\)/);
assert.match(secondary, /lesson\.keyTakeaway/);
assert.doesNotMatch(basic, /전용 애니메이션은 준비/);
assert.doesNotMatch(basic, /ConceptLesson의 steps/);
assert.doesNotMatch(unitLearning, /상세 학습 콘텐츠를 준비하고 있습니다/);
assert.match(stylesheet, /\.secondary-concept-board ol\s*\{/);
assert.match(stylesheet, /@media\s*\(max-width:\s*700px\)[\s\S]*grid-template-columns:\s*1fr/);

console.log("220 concept learning content and generic exploration contract passed");
