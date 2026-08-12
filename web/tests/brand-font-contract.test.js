"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const tokensPath = path.join(repoRoot, "public/css/matths-brand-tokens.css");
const fontPath = path.join(repoRoot, "public/fonts/PretendardVariable.woff2");
const tokens = fs.readFileSync(tokensPath, "utf8");

assert.match(
  tokens,
  /@font-face\s*\{[\s\S]*font-family:\s*"Pretendard Variable"[\s\S]*url\("\/fonts\/PretendardVariable\.woff2"\)[\s\S]*font-display:\s*swap/,
  "브랜드 본문 서체는 외부 CDN이 아닌 로컬 WOFF2 정본으로 제공해야 합니다.",
);

assert.ok(fs.existsSync(fontPath), "Pretendard Variable WOFF2 파일이 없습니다.");
const font = fs.readFileSync(fontPath);
assert.equal(font.subarray(0, 4).toString("ascii"), "wOF2", "서체 파일이 유효한 WOFF2가 아닙니다.");
assert.ok(font.length > 100_000, "서체 파일이 비정상적으로 작습니다.");

assert.match(
  tokens,
  /:where\(a, button, input, select, textarea, summary, \[tabindex\]\):focus-visible\s*\{[\s\S]*outline:\s*3px solid var\(--matths-violet\)\s*!important/,
  "키보드 포커스 링은 반투명 색이 아닌 3:1 이상 불투명 브랜드 색을 사용해야 합니다.",
);

console.log("brand font loading contract passed");
