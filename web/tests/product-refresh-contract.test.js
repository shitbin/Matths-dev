"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const refresh = fs.readFileSync(
  path.join(root, "public/css/product-refresh.css"),
  "utf8",
);

const requiredSurfaceSelectors = [
  ".curriculum-hero",
  ".assessment-main",
  ".wrong-notes-main",
  ".private-mock-main",
  ".community-main",
  ".community-post-main",
  ".profile-page-shell",
  ".parent-page",
  ".admin-page",
  ".pricing-main",
  ".contact-page",
  ".archive-public-main",
  ".my-learning-main",
  ".logged-curriculum-main",
  ".unit-learning-main",
  ".quick-main",
  ".study-hall-main",
  ".store-main",
  ".notification-main",
  ".suggestion-main",
  ".nickname-change-main",
  ".restriction-main",
  ".objection-main",
  ".wrong-review-main",
  ".archive-main",
  ".attempt-main",
  ".auth-page-login",
  ".auth-page-register",
  ".checkout-page",
  ".legal-layout",
  ".matths-error-page",
  ".masters-page",
];

for (const selector of requiredSurfaceSelectors) {
  assert.ok(
    refresh.includes(selector),
    `${selector} 페이지군이 공통 제품 정비층에서 빠졌습니다.`,
  );
}

assert.match(
  refresh,
  /@media\s*\(max-width:\s*768px\)[\s\S]*\.community-post-main[\s\S]*min-width:\s*0/,
  "세부 화면은 iPad 좁은 폭에서 가로 넘침을 해소해야 합니다.",
);
assert.match(
  refresh,
  /:where\([\s\S]*\.attempt-main[\s\S]*\)\s*:where\(button, input, select, textarea\)\s*\{[\s\S]*min-height:\s*44px/,
  "학생 작업 화면의 입력·버튼은 최소 44px이어야 합니다.",
);
assert.match(
  refresh,
  /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.notification-main \*[\s\S]*animation-duration:\s*0\.01ms/,
  "상세 화면도 Reduce Motion 계약에 포함되어야 합니다.",
);

const topLevelViews = fs
  .readdirSync(path.join(root, "views"), { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".ejs"));

for (const entry of topLevelViews) {
  const source = fs.readFileSync(path.join(root, "views", entry.name), "utf8");
  if (!/<!doctype html>/i.test(source) || entry.name.startsWith("goat-arena")) {
    continue;
  }
  assert.match(
    source,
    /\/css\/brand\.css/,
    `${entry.name}가 공통 브랜드·제품 정비층을 불러오지 않습니다.`,
  );
}

console.log("product refresh page-family contract passed");
