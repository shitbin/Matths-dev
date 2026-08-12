#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { loadCurriculum } = require("../services/curriculumService");
const {
  buildCurriculumStoryEditorialQueue,
  getCurriculumStoryCatalog,
} = require("../services/curriculumStoryService");
const {
  assertExactCurriculumStoryReleaseCount,
} = require("../services/curriculumStoryReleaseGate");

const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "docs", "CURRICULUM_STORY_EDITORIAL_QUEUE.md");
const checkOnly = process.argv.includes("--check");
const requireComplete = process.argv.includes("--require-complete");
const curriculum = loadCurriculum();
const catalog = getCurriculumStoryCatalog({ reload: true });
const audit = buildCurriculumStoryEditorialQueue(curriculum);
const queuedByCourse = new Map();

for (const item of audit.queue) {
  if (!queuedByCourse.has(item.courseId)) queuedByCourse.set(item.courseId, []);
  queuedByCourse.get(item.courseId).push(item);
}

const lines = [
  "# 커리큘럼 5분 해설 편집 대기열",
  "",
  "> 이 파일은 `node scripts/auditCurriculumStories.js`로 생성합니다. 기존 요약을 자동으로 늘려 쓰지 않고, 검수된 story만 `published`로 엽니다.",
  "",
  `- 전체 개념: ${curriculum.catalogStats.totalConcepts}`,
  `- published: ${catalog.publishedStoryByKey.size}`,
  `- 편집 대기: ${audit.queue.length}`,
  `- orphan: ${audit.orphanedStories.length}`,
  `- shard/index 오류: ${audit.catalogIssues.length}`,
  "",
  "| 과목 | 전체 | published | 대기 concept ID |",
  "|---|---:|---:|---|",
];

for (const course of curriculum.courses) {
  const queued = queuedByCourse.get(course.id) || [];
  const total = course.units.reduce((sum, unit) => sum + unit.concepts.length, 0);
  const published = total - queued.length;
  lines.push(
    `| ${course.officialTitle || course.title} | ${total} | ${published} | ${queued.map((item) => `\`${item.conceptId}\``).join(", ") || "—"} |`,
  );
}

lines.push(
  "",
  "## 출시 게이트",
  "",
  "`published 220/220`, `편집 대기 0`, `orphan 0`, `shard/index 오류 0`이 되기 전에는 5분 해설 전체 완료로 판정하지 않습니다.",
  "",
  "## 편집 규칙",
  "",
  "- 장면은 직관 → 질문 → 오개념 → 풀이 리듬 → 회상의 기억선으로 씁니다. 화면 제목에 단계 번호를 붙이지 않습니다.",
  "- 화면 자막은 짧게, narration은 실제 약 5분 분량으로 씁니다. `studioScript`는 narration을 바꾸지 않고 Eleven v3 태그만 더합니다.",
  "- `node scripts/printCurriculumStoryTemplate.js <conceptId>`는 빈 집필 틀과 기존 근거만 출력하며 문장을 자동 생성하지 않습니다.",
  "- 감정 태그와 studioScript는 학생 DOM·앱 UI에 전달하지 않습니다.",
);

const expected = `${lines.join("\n")}\n`;
if (checkOnly || requireComplete) {
  if (!fs.existsSync(reportPath) || fs.readFileSync(reportPath, "utf8") !== expected) {
    console.error("Curriculum story editorial queue is stale. Run npm run curriculum:story:audit.");
    process.exit(1);
  }
  console.log(
    `Curriculum story audit OK: ${catalog.publishedStoryByKey.size}/${curriculum.catalogStats.totalConcepts} published, ${audit.queue.length} queued.`,
  );
  if (requireComplete) {
    try {
      assertExactCurriculumStoryReleaseCount({
        authorityCount: curriculum.catalogStats.totalConcepts,
        completedCount: catalog.publishedStoryByKey.size,
        completedLabel: "published story",
      });
    } catch (error) {
      console.error(`Curriculum story release gate CLOSED: ${error.message}`);
      process.exit(1);
    }
  }
  if (
    requireComplete
    && (audit.queue.length || audit.orphanedStories.length || audit.catalogIssues.length)
  ) {
    console.error("Curriculum story release gate CLOSED: 220/220 published가 아닙니다.");
    process.exit(1);
  }
  process.exit(0);
}

fs.writeFileSync(reportPath, expected);
console.log(`Wrote ${path.relative(root, reportPath)}.`);
