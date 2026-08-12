#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const repoRoot = path.resolve(__dirname, "..");
const defaultCatalogPath = path.resolve(
  repoRoot,
  "../ipad-app/Matths/assessment-catalog.json",
);

function buildIpadAssessmentCatalog(existingCatalog) {
  const {
    ASSESSMENT_CATALOG,
    PAPER_PLANS,
    PASS_SCORE,
  } = require("../services/assessmentService");
  const {
    EXAM_COURSES,
  } = require("../services/examBankSource");

  const bankCourses = new Map(
    EXAM_COURSES.map((course) => [course.id, course]),
  );

  const paperPlans = Object.fromEntries(
    Object.entries(PAPER_PLANS).map(([scope, plan]) => [
      scope,
      {
        count: plan.questionCount,
        mix: {
          midHigh: plan.counts["mid-high"],
          applied: plan.counts.applied,
          advanced: plan.counts.advanced,
        },
      },
    ]),
  );

  const courses = ASSESSMENT_CATALOG.map((assessmentCourse) => {
    const bankCourse = bankCourses.get(assessmentCourse.bankCourseId);
    assert.ok(
      bankCourse,
      `문제은행 과목이 없습니다: ${assessmentCourse.bankCourseId}`,
    );

    const bankUnits = new Map(
      bankCourse.units.map((unit) => [unit.id, unit]),
    );

    return {
      courseId: assessmentCourse.courseId,
      bankCourseId: assessmentCourse.bankCourseId,
      title: bankCourse.label,
      units: assessmentCourse.units.map((assessmentUnit) => {
        const bankUnit = bankUnits.get(assessmentUnit.bankUnitId);
        assert.ok(
          bankUnit,
          `문제은행 대단원이 없습니다: ${assessmentCourse.courseId}/${assessmentUnit.bankUnitId}`,
        );
        const bankSubunits = new Map(
          bankUnit.subs.map((subunit) => [subunit.id, subunit]),
        );

        return {
          unitId: assessmentUnit.unitId,
          bankUnitId: assessmentUnit.bankUnitId,
          title: bankUnit.label,
          numeral: bankUnit.numeral,
          subunits: assessmentUnit.subunits.map((assessmentSubunit) => {
            const bankSubunit = bankSubunits.get(assessmentSubunit.id);
            assert.ok(
              bankSubunit,
              `문제은행 소단원이 없습니다: ${assessmentCourse.courseId}/${assessmentUnit.bankUnitId}/${assessmentSubunit.id}`,
            );
            return {
              id: assessmentSubunit.id,
              title: bankSubunit.label,
              conceptIds: assessmentSubunit.conceptIds,
              gens: bankSubunit.gens.map((generator) => ({
                id: generator.id,
                points: generator.points,
              })),
            };
          }),
        };
      }),
    };
  });

  return {
    version: 2,
    passScore: PASS_SCORE,
    paperPlans,
    advancedApproximation:
      existingCatalog.advancedApproximation || "bank-4pt",
    gradeBands: existingCatalog.gradeBands,
    courses,
  };
}

function readCatalog(catalogPath = defaultCatalogPath) {
  return JSON.parse(fs.readFileSync(catalogPath, "utf8"));
}

function serializedCatalog(catalog) {
  return `${JSON.stringify(catalog, null, 1)}\n`;
}

function main(argv = process.argv.slice(2)) {
  const mode = argv[0] || "--check";
  const catalogPath = path.resolve(argv[1] || defaultCatalogPath);
  const current = readCatalog(catalogPath);
  const expected = buildIpadAssessmentCatalog(current);
  const serialized = serializedCatalog(expected);

  if (mode === "--write") {
    fs.writeFileSync(catalogPath, serialized, "utf8");
    console.log(`iPad 평가 카탈로그 동기화 완료: ${catalogPath}`);
    return;
  }
  if (mode !== "--check") {
    throw new Error("사용법: node scripts/syncIpadAssessmentCatalog.js [--check|--write] [catalog-path]");
  }

  assert.deepStrictEqual(
    current,
    expected,
    "iPad 평가 카탈로그가 웹 평가 정본과 다릅니다. --write로 갱신하세요.",
  );
  console.log(`iPad 평가 카탈로그 정본 일치: ${expected.courses.length}과목`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildIpadAssessmentCatalog,
  defaultCatalogPath,
  readCatalog,
  serializedCatalog,
};
