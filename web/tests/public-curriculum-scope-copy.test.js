"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
function view(name) {
  return fs.readFileSync(path.join(root, "views", name), "utf8");
}

const intro = view("intro.ejs");
const faq = view("faq.ejs");
const landing = view("index.ejs");
const register = view("register.ejs");
const curriculum = view("log-curriculum.ejs");

assert.match(intro, /13과목 220개념을/);
assert.match(intro, /<span class="big-number">220<\/span>/);
assert.doesNotMatch(intro, /<span class="big-number">39<\/span>/);
assert.doesNotMatch(intro, /현재 이용 범위[^<]*고등학교 1학년/);

assert.match(faq, /2022 개정 수학 13과목 220개념/);
assert.doesNotMatch(faq, /현재 이용 범위는[^<]*공통수학1·공통수학2/);
assert.match(landing, /13과목 수학 학습실/);
assert.match(register, /<b>220<\/b>\s*13과목 핵심 개념/);
assert.doesNotMatch(register, /<b>39<\/b>\s*고1 핵심 개념/);

assert.match(curriculum, /개념 지도는 지금 확인할 수 있습니다/);
assert.match(curriculum, /준비된 개념부터 학습 버튼이 열립니다/);
assert.doesNotMatch(curriculum, /공통수학, 대수, 확률과 통계, 미적분Ⅰ부터 먼저 이용/);

console.log("public curriculum scope copy matches the 13-subject, 220-concept catalog");
