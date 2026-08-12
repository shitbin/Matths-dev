"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const legal = read("public/css/legal.css");
const admin = read("public/css/admin.css");
const adminV2 = read("public/css/admin-v2.css");
const assessment = read("public/css/assessment.css");
const community = read("public/css/community.css");
const learning = read("public/css/unit-learning.css");

assert.match(
  legal,
  /@media \(max-width: 1100px\)[\s\S]*?\.legal-document table,[\s\S]*?display: block;/,
  "1024px 법적 고지 표는 잘리지 않는 카드 레이아웃으로 전환해야 한다",
);
assert.match(
  admin,
  /@media \(min-width: 761px\) and \(max-width: 980px\)[\s\S]*?\.user-filter-bar[\s\S]*?repeat\(2, minmax\(150px, 1fr\)\)/,
  "태블릿 사용자 필터는 상태값을 읽을 수 있는 최소 폭을 유지해야 한다",
);
assert.match(
  admin,
  /@media \(max-width: 800px\)[\s\S]*?\.admin-panel-heading[\s\S]*?flex-direction: column/,
  "모바일 관리자 패널 제목은 한 열로 읽혀야 한다",
);
assert.match(
  adminV2,
  /\.admin-matchmaking-form button\.danger \{[\s\S]*?width: fit-content;[\s\S]*?color: var\(--matths-danger\);[\s\S]*?background: var\(--matths-surface\);[\s\S]*?border: 1px solid var\(--matths-danger\);/,
  "전체 매칭 중단은 솔리드 주 CTA가 아닌 outline danger여야 한다",
);

for (const [label, source, selector] of [
  ["평가 문항", assessment, ".question-prompt"],
  ["커뮤니티 본문", community, ".community-post-content"],
  ["개념 설명", learning, ".basic-concept-overview-card p"],
  ["학습 단계 설명", learning, ".visual-step-card p"],
]) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(
    source,
    new RegExp(`${escaped}\\s*\\{[\\s\\S]*?font-size:\\s*16px;`),
    `${label}은 16px 읽기 본문 티어를 사용해야 한다`,
  );
}

console.log("v8 법적 고지·관리자 안전 행동·핵심 읽기 본문 계약 통과");
