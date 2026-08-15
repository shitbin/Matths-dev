"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const view = fs.readFileSync(path.join(root, "views/unit-learning.ejs"), "utf8");
const unitStyles = fs.readFileSync(path.join(root, "public/css/unit-learning.css"), "utf8");
const conceptStyles = fs.readFileSync(path.join(root, "public/css/concept-experience.css"), "utf8");
const shell = fs.readFileSync(path.join(root, "public/js/main.js"), "utf8");

assert.match(view, /<details class="concept-type-guide-disclosure">/u);
assert.match(view, /필요한 문제 유형만 펼쳐보기/u);
assert.match(view, /<%= conceptGuidesData\.length %>개 유형/u);
assert.doesNotMatch(view, /<details class="concept-type-guide-disclosure"\s+open/u);
assert.match(conceptStyles, /\.concept-type-guide > \.concept-type-guide-disclosure/u);
assert.match(conceptStyles, /min-height:\s*52px/u);

const mobileBlock = unitStyles.slice(unitStyles.indexOf("@media (max-width: 640px)"));
assert.match(mobileBlock, /\.learning-breadcrumb strong[\s\S]{0,80}display:\s*none/u);
assert.match(view, /class="exit-learning learning-home-link learning-home-button"[\s\S]{0,100}>\s*학습 홈\s*<\/a>/u);
assert.doesNotMatch(unitStyles, /\.learning-home-link::after/u);
assert.match(shell, /const drawerMode = window\.innerWidth <= 900/u);

for (const contract of [
  'sidebar.setAttribute("aria-hidden", String(drawerMode && !open))',
  'sidebar.toggleAttribute("inert", drawerMode && !open)',
  'setOpen(false)',
]) {
  assert.ok(shell.includes(contract), `missing mobile drawer contract: ${contract}`);
}

console.log("Curriculum page scan-flow declutter contracts passed");
