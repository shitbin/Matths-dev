"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const root = path.resolve(__dirname, "..");

async function run() {
  const html = await ejs.renderFile(path.join(root, "views/intro.ejs"), {
    user: null,
  });
  const stylesheet = fs.readFileSync(path.join(root, "public/css/intro.css"), "utf8");
  const script = fs.readFileSync(path.join(root, "public/js/intro.js"), "utf8");

  assert.match(html, /class="intro-playback-button"/);
  assert.match(html, /aria-label="시각화 자동 진행 멈추기"/);
  assert.match(html, /<p>GOAT Arena<\/p>/);
  assert.match(html, /이해하고 직접 풀 수 있도록 설계했습니다/);
  assert.doesNotMatch(html, /WAR OF GOAT|\bStep\b|\bSTEP\b|Made for students/);
  assert.doesNotMatch(html, /공식만 외운 거, 숫자 바뀌자마자 들켰네/);

  assert.match(stylesheet, /\.intro-step-button\.active::before\s*\{\s*content:\s*"단계 "/);
  assert.match(stylesheet, /\.intro-playback-button\s*\{[\s\S]*?height:\s*44px/);
  assert.match(stylesheet, /@media \(max-width: 640px\)[\s\S]*?\.demo-progress\s*\{\s*flex-wrap:\s*wrap/);

  assert.match(script, /manuallyPaused/);
  assert.match(script, /motionPreference\.addEventListener/);
  assert.match(script, /시각화 자동 진행 시작하기/);
  assert.doesNotMatch(script, /\bStep\b/);

  console.log("intro playback, language, and coach-tone contract passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
