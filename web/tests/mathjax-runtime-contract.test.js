"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const formulaViews = [
  "views/unit-learning.ejs",
  "views/wrong-notes.ejs",
  "views/wrong-note-review.ejs",
  "views/assessment-attempt.ejs",
  "views/admin-private-mock-exam-detail.ejs",
  "views/admin-user-activity.ejs",
  "views/private-mock-exam.ejs",
  "views/quick-practice.ejs",
  "views/admin-assessment-detail.ejs",
  "views/goat-arena-main-shop-analysis.ejs",
  "views/goat-arena-match.ejs",
  "views/admin-arena-matches.ejs",
];

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.dependencies.mathjax, "4.1.3");

const runtimePartial = read("views/partials/mathjax-runtime.ejs");
assert.match(runtimePartial, /\/vendor\/mathjax\/tex-mml-svg-mathjax-newcm\.js/);
assert.doesNotMatch(runtimePartial, /https?:\/\//);

for (const relative of formulaViews) {
  const source = read(relative);
  assert.match(
    source,
    /include\(["']partials\/mathjax-runtime["']\)/,
    `${relative}는 외부 CDN 대신 공통 로컬 MathJax 런타임을 사용해야 합니다.`,
  );
  assert.doesNotMatch(source, /cdn\.jsdelivr\.net\/npm\/mathjax/i);
}

const browserBundle = require.resolve(
  "@mathjax/mathjax-newcm-font/tex-mml-svg-mathjax-newcm.js",
);
const fontRoot = path.dirname(browserBundle);
assert.ok(fs.statSync(browserBundle).size > 1_000_000);
assert.ok(
  fs.existsSync(path.join(fontRoot, "svg/dynamic/latin.js")),
  "SVG 수식이 추가 글리프를 같은 로컬 패키지 경로에서 읽을 수 있어야 합니다.",
);

const serverSource = read("server.js");
assert.match(
  serverSource,
  /server\.use\([\s\S]*?["']\/vendor\/mathjax["'][\s\S]*?express\.static\(mathJaxBrowserRoot/,
);
assert.doesNotMatch(serverSource, /express\.static\(["']node_modules["']/);

console.log("self-hosted MathJax runtime contract passed");
