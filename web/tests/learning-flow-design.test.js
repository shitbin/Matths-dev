"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const root = path.resolve(__dirname, "..");

async function run() {
  const html = await ejs.renderFile(path.join(root, "views/learning-flow.ejs"), {
    user: null,
  });
  const stylesheet = fs.readFileSync(
    path.join(root, "public/css/learning-flow.css"),
    "utf8",
  );
  const script = fs.readFileSync(
    path.join(root, "public/js/learning-flow.js"),
    "utf8",
  );

  assert.match(html, /<button class="flow-step active" type="button"/);
  assert.doesNotMatch(html, /role="button"/);
  assert.match(html, /class="flow-playback-button"/);
  assert.match(html, /class="review-playback-button"/);
  assert.match(html, /src="\/images\/brand\/matths-symbol\.svg"/);
  assert.doesNotMatch(html, /<b>M<\/b>|<span>M<\/span>/);
  assert.doesNotMatch(
    html,
    /CONCEPT|PRACTICE|DIAGNOSE|VISUAL REVIEW|RETRY|\bStep\b|\bSTEP\b/,
  );

  assert.match(stylesheet, /\.orbit-flow button\.flow-step\{[^}]*min-height:190px/);
  assert.match(stylesheet, /\.flow-playback-button\{[^}]*min-height:44px/);
  assert.match(stylesheet, /\.review-playback-button\{[^}]*height:44px/);
  assert.match(stylesheet, /\.review-step-button\.active span::before\{content:"단계 "/);

  assert.match(script, /motionPreference\.addEventListener/);
  assert.match(script, /학습 흐름 자동 진행 시작하기/);
  assert.match(script, /오답 풀이 자동 진행 시작하기/);
  assert.doesNotMatch(script, /\bStep\s+2\b/);

  console.log("learning flow controls, language, and coach-brand contract passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
