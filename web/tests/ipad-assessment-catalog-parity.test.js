"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  buildIpadAssessmentCatalog,
  defaultCatalogPath,
  readCatalog,
  serializedCatalog,
} = require("../scripts/syncIpadAssessmentCatalog");
const { resolveIpadSourceRoot } = require("../scripts/resolveIpadWorkspace");

const current = readCatalog(defaultCatalogPath);
const expected = buildIpadAssessmentCatalog(current);

assert.deepStrictEqual(current, expected);
assert.equal(current.version, 2);
assert.deepStrictEqual(
  current.courses.map((course) => course.courseId),
  [
    "common-math-1",
    "common-math-2",
    "algebra",
    "calculus-1",
    "probability-statistics",
  ],
);
assert.equal(current.paperPlans.subunit.count, 10);
assert.equal(current.paperPlans.unit.count, 20);
assert.equal(current.paperPlans.course.count, 40);
assert.equal(
  fs.readFileSync(defaultCatalogPath, "utf8"),
  serializedCatalog(expected),
  "평가 카탈로그는 재생성 가능한 정규 포맷이어야 합니다.",
);

for (const course of current.courses) {
  assert.ok(course.title.length > 0);
  assert.ok(course.units.length > 0);
  for (const unit of course.units) {
    assert.ok(unit.title.length > 0);
    assert.ok(unit.subunits.length > 0);
    for (const subunit of unit.subunits) {
      assert.ok(subunit.title.length > 0);
      assert.ok(subunit.conceptIds.length > 0);
    }
  }
}

console.log("iPad assessment catalog parity contract passed");

const bundlePath = path.join(
  resolveIpadSourceRoot(path.resolve(__dirname, "..")),
  "LessonWeb/webgen-bundle.js",
);
delete global.MatthsWebGen;
delete require.cache[require.resolve(bundlePath)];
require(bundlePath);
assert.ok(global.MatthsWebGen, "iPad 문제 생성기 번들이 로드되지 않습니다.");

for (const course of current.courses) {
  for (const unit of course.units) {
    for (const subunit of unit.subunits) {
      for (const conceptId of subunit.conceptIds) {
        const info = global.MatthsWebGen.conceptGeneratorInfo(
          course.courseId,
          unit.unitId,
          conceptId,
        );
        assert.ok(
          info?.types?.length >= 5,
          `iPad 계산형 생성기가 없습니다: ${course.courseId}/${unit.unitId}/${conceptId}`,
        );
        const generated = global.MatthsWebGen.generateLocal(
          course.courseId,
          unit.unitId,
          conceptId,
          null,
          10,
        );
        assert.equal(
          generated.length,
          10,
          `iPad 계산형 출제 풀이 부족합니다: ${course.courseId}/${unit.unitId}/${conceptId}`,
        );
      }
    }
  }
}

console.log("iPad assessment generator coverage contract passed");
