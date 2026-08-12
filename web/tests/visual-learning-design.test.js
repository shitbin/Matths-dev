"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const root = path.resolve(__dirname, "..");

async function run() {
  const html = await ejs.renderFile(path.join(root, "views/visual-learning.ejs"), {
    user: null,
  });
  const stylesheet = fs.readFileSync(
    path.join(root, "public/css/visual-learning.css"),
    "utf8",
  );
  const script = fs.readFileSync(
    path.join(root, "public/js/visual-learning.js"),
    "utf8",
  );

  assert.match(html, /aria-label="원의 넓이 시각화 단계 선택"/);
  assert.match(html, /class="demo-playback-button"/);
  assert.match(html, /aria-label="자동 진행 멈추기"/);
  assert.match(html, /<small>넓이 모델<\/small>/);
  assert.match(html, /<small>그래프 이동<\/small>/);
  assert.match(html, /<small>배열 변환<\/small>/);
  assert.doesNotMatch(html, /AREA MODEL|GRAPH MOTION|TRANSFORMATION/);

  assert.match(stylesheet, /\.demo-window\{[^}]*transform:none/);
  assert.match(stylesheet, /\.demo-step-button\.active span::before\{content:"단계 "/);
  assert.match(stylesheet, /\.demo-playback-button\{[^}]*height:44px/);
  assert.match(stylesheet, /@media\(max-width:640px\)\{\.button-small\{min-height:44px/);
  assert.match(stylesheet, /@media\(max-width:900px\)\{\.hero-copy,\.hero-demo\{width:100%;min-width:0/);
  assert.match(stylesheet, /@media\(max-width:640px\)[^{]*\{[^}]*[\s\S]*?\.demo-stage\{grid-template-columns:1fr/);

  assert.match(script, /manuallyPaused/);
  assert.match(script, /motionPreference\.addEventListener/);
  assert.match(script, /자동 진행 시작하기/);
  assert.match(script, /window\.clearTimeout\(timer\)/);

  console.log("visual learning design and playback-control contract passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
