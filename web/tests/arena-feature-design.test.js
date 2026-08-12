"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const controller = read("controllers/goatArenaController.js");
const view = read("views/goat-arena-feature.ejs");
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

console.log("Arena feature design contract: ok");
