"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const { selectNextReview } = require("../services/wrongNoteService");

const root = path.resolve(__dirname, "..");
const templatePath = path.join(root, "views/wrong-notes.ejs");
const stylesheetPath = path.join(root, "public/css/wrong-notes-v2.css");

async function run() {
  const selected = selectNextReview([
    { id: "future", isDue: false, reviewStatus: "scheduled", submittedAt: "2026-08-11" },
    { id: "scheduled-due", isDue: true, reviewStatus: "scheduled", submittedAt: "2026-08-10" },
    { id: "pending-due", isDue: true, reviewStatus: "pending", submittedAt: "2026-08-09" },
  ]);
  assert.equal(selected.id, "pending-due", "복습 대기 오답을 예정일 도달 오답보다 먼저 선택합니다.");

  const item = {
    id: "completed-1",
    reviewStatus: "completed",
    reviewLabel: "복습 완료",
    sourceLabel: "개념 확인 문제",
    submittedAtLabel: "2026. 8. 10.",
    stem: "\\(x^2-1=0\\)을 푸시오.",
    courseTitle: "공통수학1",
    unitTitle: "방정식",
    conceptTitle: "이차방정식",
    errorLabel: "부호 계산에서 실수",
    difficulty: 3,
    submittedAnswer: "\\(1\\)",
    score: 0,
    maxScore: 2,
    standardCode: "10공수1-02-03",
    retryAvailable: true,
    isQuickPractice: false,
    conceptHref: "/learn/common-math-1/equation/quadratic",
    reviewHref: "/wrong-notes/completed-1/review",
    scheduledAtLabel: "",
  };
  const html = await ejs.renderFile(templatePath, {
    user: { name: "테스트학생", schoolGrade: 10 },
    wrongNoteData: {
      items: [item],
      nextReview: {
        ...item,
        id: "due-1",
        reviewStatus: "pending",
        reviewHref: "/wrong-notes/due-1/review",
      },
      filters: { status: "completed", course: "", search: "", sort: "priority", page: 1 },
      options: { courses: [{ id: "common-math-1", title: "공통수학1" }] },
      stats: { total: 2, pending: 1, scheduled: 0, completed: 1, due: 1, filtered: 1 },
      pagination: { currentPage: 1, totalPages: 1, hasPrevious: false, hasNext: false },
    },
  });
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");

  assert.match(html, /class="review-command-center/);
  assert.match(html, /href="\/wrong-notes\/due-1\/review"[\s\S]*오늘 복습 시작/);
  assert.match(html, /틀린 이유 · 부호 계산에서 실수/);
  assert.match(html, /복습 완료/);
  assert.doesNotMatch(html, /<section class="wrong-hero/);
  assert.doesNotMatch(html, /◈/);

  assert.doesNotMatch(stylesheet, /(?:linear|radial|conic)-gradient\s*\(/);
  assert.match(stylesheet, /var\(--matths-action-primary\)/);
  assert.match(
    stylesheet,
    /\.wrong-item-actions a\s*\{[\s\S]*min-height:\s*44px/,
    "오답 복습 행동은 최소 44px이어야 합니다.",
  );
  assert.match(
    stylesheet,
    /@media\s*\(max-width:\s*640px\)[\s\S]*\.review-command-center \.review-summary\s*\{[\s\S]*grid-template-columns:\s*1fr/,
    "좁은 폭에서는 복습 요약을 한 열로 접어야 합니다.",
  );

  console.log("wrong notes next-review and visual hierarchy contract passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
