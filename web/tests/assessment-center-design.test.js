"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const root = path.resolve(__dirname, "..");
const templatePath = path.join(root, "views/assessment-center.ejs");
const stylesheetPath = path.join(root, "public/css/assessment-center-v2.css");

function state(overrides = {}) {
  return {
    passed: false,
    unlocked: false,
    bestScore: 0,
    attempts: 0,
    activeAttemptId: null,
    hasEmptyAttempt: false,
    lockReason: "앞선 평가를 통과하면 열립니다.",
    ...overrides,
  };
}

async function run() {
  const html = await ejs.renderFile(templatePath, {
    user: { name: "테스트학생", schoolGrade: 10 },
    assessmentData: {
      passScore: 80,
      courses: [
        {
          id: "common-math-1",
          title: "공통수학1",
          available: true,
          unlockedAssessmentCount: 2,
          courseFinal: state(),
          units: [
            {
              id: "polynomial",
              title: "다항식",
              subunits: [
                {
                  id: "polynomial-operation",
                  title: "다항식의 연산",
                  concepts: [{ title: "다항식의 덧셈과 뺄셈" }],
                  ...state({
                    unlocked: true,
                    activeAttemptId: "attempt-active-1",
                  }),
                },
                {
                  id: "remainder",
                  title: "나머지정리",
                  concepts: [{ title: "나머지정리" }],
                  ...state({ unlocked: true }),
                },
              ],
              final: state(),
            },
          ],
        },
        {
          id: "common-math-2",
          title: "공통수학2",
          available: false,
          unlockedAssessmentCount: 0,
          lockReason: "개념 학습을 완료하면 열립니다.",
          courseFinal: state(),
          units: [],
        },
      ],
    },
  });
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");

  assert.match(html, /class="assessment-command-center"/);
  assert.match(html, /통과 기준[\s\S]*80[\s\S]*열린 평가[\s\S]*2[\s\S]*열린 과목[\s\S]*1/);
  assert.match(html, /진행 중인 평가/);
  assert.match(html, /다항식의 연산/);
  assert.match(html, /href="\/assessments\/attempt-active-1"/);
  assert.match(html, />이어서 응시</);
  assert.doesNotMatch(html, /class="assessment-hero"/);
  assert.match(html, /현재 응시 불가/);

  assert.doesNotMatch(
    stylesheet,
    /(?:linear|radial|conic)-gradient\s*\(/,
    "평가 선택 화면에 장식용 그라디언트를 추가하면 안 됩니다.",
  );
  assert.match(stylesheet, /var\(--matths-action-primary\)/);
  assert.match(
    stylesheet,
    /\.subassessment-card button,[\s\S]*min-height:\s*44px/,
    "평가 CTA는 최소 44px이어야 합니다.",
  );
  assert.match(
    stylesheet,
    /@media\s*\(max-width:\s*620px\)[\s\S]*\.assessment-command-metrics\s*\{[\s\S]*grid-template-columns:\s*1fr/,
    "좁은 폭에서는 평가 요약을 한 열로 접어야 합니다.",
  );

  console.log("assessment center action hierarchy contract passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
