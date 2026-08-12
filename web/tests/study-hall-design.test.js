"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const root = path.resolve(__dirname, "..");
const templatePath = path.join(root, "views/store.ejs");
const detailTemplatePath = path.join(root, "views/store-study.ejs");
const baseStylesheetPath = path.join(root, "public/css/store.css");
const stylesheetPath = path.join(root, "public/css/study-hall-v2.css");

async function run() {
  const tabs = [
    { code: "NJE", label: "N제", summary: "단원별 문제 학습" },
    { code: "DAILY_HALF", label: "데일리 하프", summary: "매일 짧은 실전" },
  ];
  const html = await ejs.renderFile(templatePath, {
    user: { name: "테스트학생" },
    storeData: {
      tabs,
      activeTab: "NJE",
      continuing: {
        id: "content-continue",
        title: "공통수학 실전 N제",
        progress: { lastQuestionNumber: 6, percent: 40 },
      },
      items: [
        {
          id: "content-1",
          contentType: "NJE",
          series: "공통수학 N제",
          subject: "공통수학1",
          grade: "고2",
          difficulty: "중상",
          title: "다항식 실전 20제",
          description: "다항식 계산과 나머지정리를 한 회차로 점검합니다.",
          itemCount: 20,
          timeLimitMinutes: 35,
          recommendedStudyDays: 2,
          estimatedMinutes: 35,
          thumbnail: null,
          progress: {
            status: "IN_PROGRESS",
            percent: 35,
            answeredCount: 7,
            correctCount: 0,
            lastQuestionNumber: 7,
          },
        },
      ],
    },
  });
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const baseStylesheet = fs.readFileSync(baseStylesheetPath, "utf8");
  const detailTemplate = fs.readFileSync(detailTemplatePath, "utf8");

  assert.match(html, /class="study-hall-hero"/);
  assert.match(html, /오늘 이어갈 학습과/);
  assert.match(html, /최근 학습 이어서 하기/);
  assert.match(html, /마지막 문항 6번 · 40% 진행/);
  assert.match(html, /src="\/images\/brand\/matths-symbol\.svg"/);
  assert.doesNotMatch(html, /<span>MATTHS<\/span>/);
  assert.match(html, /다항식 실전 20제/);
  assert.match(html, /20문항/);
  assert.match(html, /35분/);

  assert.doesNotMatch(stylesheet, /(?:linear|radial|conic)-gradient\s*\(/);
  assert.doesNotMatch(baseStylesheet, /(?:linear|radial|conic)-gradient\s*\(/);
  assert.doesNotMatch(baseStylesheet, /translateY\(-[2-9][0-9]*px\)/);
  assert.match(detailTemplate, /href="\/css\/study-hall-v2\.css"/);
  assert.match(stylesheet, /\.study-hall-tabs a\.is-active\s*\{[\s\S]*var\(--matths-primary-soft\)/);
  assert.match(stylesheet, /\.study-hall-progress i\s*\{[\s\S]*var\(--matths-progress-blue\)/);
  assert.match(stylesheet, /\.study-hall-card:hover\s*\{[\s\S]*var\(--motion-lift\)/);
  assert.match(stylesheet, /\.study-content-heading aside\s*\{[\s\S]*var\(--matths-canvas\)/);
  assert.match(stylesheet, /\.study-choice-row input:focus-visible \+ span\s*\{/);
  assert.match(
    stylesheet,
    /\.study-hall-continue > b\s*\{[\s\S]*min-height:\s*44px/,
    "이어 학습 CTA는 최소 44px이어야 합니다.",
  );
  assert.match(
    stylesheet,
    /@media\s*\(max-width:\s*760px\)[\s\S]*\.study-hall-tabs small\s*\{[\s\S]*display:\s*block/,
    "좁은 폭에서도 탭 설명을 숨기면 안 됩니다.",
  );

  console.log("study hall brand and learning-action contract passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
