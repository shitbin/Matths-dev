"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "public/css/unit-learning.css"), "utf8");

assert.match(
  css,
  /\.basic-concept-overview-card p,\s*\.basic-concept-overview-card strong\s*\{[^}]*min-width:\s*0;[^}]*overflow-x:\s*auto;[^}]*overflow-y:\s*hidden;/s,
  "긴 수식은 개념 카드 안에서만 스크롤되어야 합니다.",
);
assert.match(
  css,
  /\.basic-concept-overview-card mjx-container\[display\]\s*\{[^}]*max-width:\s*100%;[^}]*overflow-x:\s*auto;/s,
  "MathJax 수식이 문서 폭을 늘리면 안 됩니다.",
);
assert.match(
  css,
  /@media \(max-width:\s*640px\)[\s\S]*?\.unit-hero-progress\s*\{\s*display:\s*none;/,
  "작은 화면에서는 개념 진도와 중복되는 단원 진도를 감춰야 합니다.",
);

console.log("Concept mobile density contract passed.");
