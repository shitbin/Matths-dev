"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const controller = read("controllers/goatArenaController.js");
const view = read("views/goat-arena-feature.ejs");
const rankedBattle = read("views/goat-arena-main-battle.ejs");
const analysisView = read("views/goat-arena-main-shop-analysis.ejs");
const css = read("public/css/goat-arena.css");

assert.doesNotMatch(controller, /eyebrow:\s*"LIVE DATA"/);
for (const label of ["경기 진행", "경기 권리", "정산 기록", "이용 주기", "학습일수 장부", "경기 검토", "Ranked 상태", "이용 종료"]) {
  assert.match(controller, new RegExp(`eyebrow: "${label}"`));
}
assert.match(controller, /function ledgerEventLabel/);
assert.doesNotMatch(controller, /title:\s*entry\.eventType/);
assert.match(controller, /showEmpty:\s*false/);

assert.doesNotMatch(view, />◇</);
assert.match(view, /arena-live-empty-track/);
assert.match(view, /featureData\?\.emptyDetail/);
assert.match(view, /featureData\?\.showEmpty !== false/);
assert.match(view, /featureData\?\.items\?\.length \|\| featureData\?\.showEmpty === false/);

assert.match(css, /\.arena-live-list::before[\s\S]*?background:\s*rgba\(12, 220, 241, 0\.28\)/);
assert.match(css, /\.arena-live-item-meta a,[\s\S]*?background:\s*var\(--matths-violet\)/);
assert.match(css, /\.arena-live-empty-track[\s\S]*?grid-template-columns:\s*repeat\(5, 1fr\)/);

assert.match(analysisView, /window\.MathJax\s*=\s*\{/);
assert.match(analysisView, /include\("partials\/mathjax-runtime"\)/);
assert.ok(
  analysisView.indexOf("window.MathJax") < analysisView.indexOf('include("partials/mathjax-runtime")'),
  "분석 화면의 TeX 설정은 MathJax 본체보다 먼저 선언해야 합니다.",
);

assert.match(rankedBattle, /class="arena-v2-primary arena-v2-battle-jump"/);
assert.doesNotMatch(
  rankedBattle,
  /class="main-battle-status/,
  "헤더 지표와 같은 내용을 반복해 모바일 신청 폼을 밀어내면 안 됩니다.",
);
assert.match(
  css,
  /\.arena-v2-battle-header \.arena-v2-metrics,[\s\S]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/,
);
assert.match(
  css,
  /@media \(max-width: 800px\)[\s\S]*\.arena-v2-mode-header \.arena-v2-metrics\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
);

console.log("Arena feature design contract: ok");
