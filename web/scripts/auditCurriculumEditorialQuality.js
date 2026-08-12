#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  loadCurriculum,
} = require("../services/curriculumService");
const {
  getAuthoredConceptLesson,
} = require("../services/problemGenerators/curriculumConceptCheck");

const forbidden = /\b(?:TODO|TBD|FIXME|lorem|dummy|placeholder)\b|준비\s*중|개발\s*중|자동\s*생성|AI가\s*생성/i;

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function duplicateValues(records, field) {
  const groups = new Map();
  for (const record of records) {
    const value = clean(record[field]).replace(/[\s.,!?“”'"`]/g, "");
    if (!value) continue;
    groups.set(value, [...(groups.get(value) || []), record.key]);
  }
  return [...groups.values()].filter((keys) => new Set(keys).size > 1);
}

function auditCurriculumEditorialQuality() {
  const curriculum = loadCurriculum();
  const issues = [];
  const records = [];
  const seenKeys = new Set();

  function issue(key, code, message) {
    issues.push({ key, code, message });
  }

  for (const course of curriculum.courses) {
    for (const unit of course.units) {
      for (const concept of unit.concepts) {
        const key = `${course.id}/${unit.id}/${concept.id}`;
        if (seenKeys.has(key)) issue(key, "DUPLICATE_KEY", "개념 경로가 중복됩니다.");
        seenKeys.add(key);

        const lesson = getAuthoredConceptLesson({
          courseId: course.id,
          unitId: unit.id,
          conceptId: concept.id,
        });
        const summary = clean(lesson?.summary);
        const keyTakeaway = clean(lesson?.keyTakeaway);
        const achievementStandard = clean(concept.achievementStandard);
        const steps = Array.isArray(lesson?.steps) ? lesson.steps : [];
        const topics = Array.isArray(concept.topics) ? concept.topics.map(clean).filter(Boolean) : [];
        const visualizationIdeas = Array.isArray(concept.visualizationIdeas)
          ? concept.visualizationIdeas.map(clean).filter(Boolean)
          : [];

        if (summary.length < 25) issue(key, "SUMMARY_TOO_SHORT", "요약이 25자 미만입니다.");
        if (keyTakeaway.length < 30) issue(key, "TAKEAWAY_TOO_SHORT", "핵심 정리가 30자 미만입니다.");
        if (achievementStandard.length < 12) issue(key, "STANDARD_TOO_SHORT", "성취기준이 지나치게 짧습니다.");
        if (topics.length < 2) issue(key, "TOPICS_MISSING", "학습 토픽이 2개 미만입니다.");
        if (visualizationIdeas.length < 2) issue(key, "VISUAL_IDEAS_MISSING", "시각화 제안이 2개 미만입니다.");
        if (steps.length < 3 || steps.length > 6) issue(key, "STEP_COUNT", "학습 단계는 3~6개여야 합니다.");

        const userText = [
          concept.title,
          summary,
          keyTakeaway,
          achievementStandard,
          ...topics,
          ...visualizationIdeas,
          ...steps.flatMap((step) => [step?.title, step?.description]),
        ].map(clean);
        if (userText.some((value) => forbidden.test(value))) {
          issue(key, "INTERNAL_PLACEHOLDER", "학생 콘텐츠에 내부 임시 문구가 있습니다.");
        }
        if (userText.some((value) => /\b(?:undefined|null|NaN)\b/.test(value))) {
          issue(key, "BROKEN_VALUE", "학생 콘텐츠에 깨진 값이 있습니다.");
        }

        const stepDescriptions = new Set();
        for (const [index, step] of steps.entries()) {
          const title = clean(step?.title);
          const description = clean(step?.description);
          if (title.length < 2) issue(key, "STEP_TITLE", `${index + 1}단계 제목이 비었습니다.`);
          if (description.length < 16) issue(key, "STEP_DESCRIPTION", `${index + 1}단계 설명이 16자 미만입니다.`);
          const normalized = description.replace(/\s+/g, "");
          if (stepDescriptions.has(normalized)) issue(key, "DUPLICATE_STEP", "한 강의 안에 같은 단계 설명이 반복됩니다.");
          stepDescriptions.add(normalized);
        }

        records.push({ key, summary, keyTakeaway });
      }
    }
  }

  for (const keys of duplicateValues(records, "summary")) {
    issue(keys.join(","), "DUPLICATE_SUMMARY", "서로 다른 개념이 같은 요약을 사용합니다.");
  }
  for (const keys of duplicateValues(records, "keyTakeaway")) {
    issue(keys.join(","), "DUPLICATE_TAKEAWAY", "서로 다른 개념이 같은 핵심 정리를 사용합니다.");
  }

  return {
    schemaVersion: "MATTHS_CURRICULUM_EDITORIAL_AUDIT_V1",
    result: issues.length ? "FAIL" : "PASS",
    catalog: {
      courses: curriculum.catalogStats.totalCourses,
      units: curriculum.catalogStats.totalUnits,
      concepts: curriculum.catalogStats.totalConcepts,
    },
    thresholds: {
      summaryCharacters: 25,
      keyTakeawayCharacters: 30,
      achievementStandardCharacters: 12,
      steps: [3, 6],
      stepDescriptionCharacters: 16,
      topics: 2,
      visualizationIdeas: 2,
    },
    issues,
  };
}

function argument(name) {
  return process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
}

function main() {
  const result = auditCurriculumEditorialQuality();
  const body = `${JSON.stringify(result, null, 2)}\n`;
  const output = argument("--output");
  if (output) {
    const target = path.resolve(output);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, body, "utf8");
  }
  process.stdout.write(body);
  if (result.result !== "PASS") process.exit(1);
}

if (require.main === module) main();

module.exports = {
  auditCurriculumEditorialQuality,
};
