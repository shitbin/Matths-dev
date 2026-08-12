"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const root = path.resolve(__dirname, "..");
const templatePath = path.join(root, "views/profile.ejs");
const stylesheetPath = path.join(root, "public/css/profile-v2.css");
const tokenPath = path.join(root, "public/css/matths-brand-tokens.css");

async function run() {
  const html = await ejs.renderFile(templatePath, {
    profileUser: {
      name: "테스트학생",
      email: "student@example.com",
      school: { region: "서울", code: "S1", name: "서울고등학교" },
      schoolGrade: 10,
      educationStatus: "enrolled",
      totalConnectedSeconds: 18_000,
      preferences: { coachMode: "mild" },
      role: "student",
    },
    formValues: {},
    feedback: null,
    schoolRegions: {
      서울: [{ code: "S1", name: "서울고등학교" }],
    },
  });
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
  const tokens = fs.readFileSync(tokenPath, "utf8");

  assert.match(html, /href="\/css\/profile-v2\.css"/);
  assert.match(html, /학습 화면의 표시 정보와 로그인 보안을 구분해 관리합니다/);
  assert.match(html, /테스트학생님/);
  assert.match(html, /student@example\.com/);
  assert.match(html, /서울고등학교/);
  assert.match(html, /학습 화면 설정/);
  assert.match(html, /로그인과 데이터/);
  assert.match(html, /현재 비밀번호 표시/);
  assert.match(html, /개인정보 제거 후 계정 탈퇴/);
  assert.doesNotMatch(html, /settings-icon/);
  assert.doesNotMatch(html, />\s*(?:Aa|校|●)\s*</);
  assert.doesNotMatch(html, /관리할 수 있어요/);

  assert.doesNotMatch(stylesheet, /(?:linear|radial|conic)-gradient\s*\(/);
  assert.match(stylesheet, /\.save-button\s*\{[\s\S]*var\(--matths-action-primary\)/);
  assert.match(stylesheet, /\.identity-choice-grid input:checked \+ span\s*\{[\s\S]*var\(--matths-progress-blue\)/);
  assert.match(stylesheet, /\.password-field button\s*\{[\s\S]*min-height:\s*44px/);
  assert.match(stylesheet, /\.form-field input,[\s\S]*min-height:\s*48px/);
  assert.match(stylesheet, /\.withdrawal-card\s*\{[\s\S]*var\(--matths-danger\)/);
  assert.match(
    stylesheet,
    /@media\s*\(max-width:\s*620px\)[\s\S]*\.profile-section-nav > div\s*\{[\s\S]*flex-wrap:\s*wrap/,
  );
  assert.match(tokens, /--matths-danger:\s*#e0344a/);
  assert.match(tokens, /--matths-danger-soft:\s*#fde8eb/);

  console.log("profile settings hierarchy and danger boundary contract passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
