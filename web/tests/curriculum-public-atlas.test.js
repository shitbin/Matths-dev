"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const { loadCurriculum } = require("../services/curriculumService");

const root = path.resolve(__dirname, "..");
const templatePath = path.join(root, "views/curriculum.ejs");
const stylesheetPath = path.join(root, "public/css/curriculum-atlas.css");

async function run() {
  const curriculumData = loadCurriculum();
  const html = await ejs.renderFile(templatePath, {
    curriculumData,
    user: null,
  });
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");

  assert.equal(curriculumData.catalogStats.totalCourses, 13);
  assert.equal(curriculumData.catalogStats.totalUnits, 46);
  assert.equal(curriculumData.catalogStats.totalConcepts, 220);

  assert.match(html, /class="curriculum-atlas-hero"/);
  assert.match(html, /고등학교 수학 전체 지도/);
  assert.match(html, /13과목 · 220개념/);
  assert.match(html, /data-course-category="common"/);
  assert.match(html, /data-course-category="general-elective"/);
  assert.match(html, /data-course-category="career-elective"/);
  assert.match(html, /data-course-category="convergence-elective"/);
  assert.match(html, /약 \d+분/);
  assert.match(html, /앞서 볼 개념 ·/);
  assert.match(html, /이 과목의 시작 개념/);
  assert.equal(
    (html.match(/class="concept-row"/g) || []).length,
    220,
    "공개 교육과정은 220개 개념 진입점을 모두 렌더해야 합니다.",
  );
  assert.doesNotMatch(
    html,
    /class="curriculum-hero"/,
    "구형 거대 히어로가 다시 렌더되면 안 됩니다.",
  );
  assert.doesNotMatch(
    html,
    /course-development-badge[^>]*>개발중/,
    "완성된 과목을 개발중으로 표시하면 안 됩니다.",
  );

  assert.doesNotMatch(
    stylesheet,
    /(?:linear|radial|conic)-gradient\s*\(/,
    "교육과정 표면에 장식용 그라디언트를 추가하면 안 됩니다.",
  );
  assert.match(stylesheet, /var\(--matths-action-primary\)/);
  assert.match(stylesheet, /var\(--matths-progress-blue\)/);
  assert.match(
    stylesheet,
    /@media\s*\(max-width:\s*640px\)[\s\S]*\.curriculum-section \.concept-copy > p\s*\{[\s\S]*display:\s*block/,
    "좁은 화면에서도 개념 설명을 숨기면 안 됩니다.",
  );
  assert.match(
    stylesheet,
    /\.curriculum-category-nav button\s*\{[\s\S]*min-height:\s*58px/,
    "과목군 탭의 터치 높이는 44px 이상이어야 합니다.",
  );

  console.log("public curriculum atlas contract passed: 13 courses, 220 concepts");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
