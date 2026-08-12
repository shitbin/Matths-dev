"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(
  path.resolve(__dirname, "../public/css/goat-arena.css"),
  "utf8",
);
const gradientLines = css
  .split("\n")
  .map((line, index) => ({ line, number: index + 1 }))
  .filter(({ line }) => /background(?:-image)?:\s*(?:linear|radial)-gradient/.test(line));

assert.equal(
  gradientLines.length,
  2,
  `Arena 일반 UI에 새 그라디언트가 생겼습니다: ${gradientLines.map(({ number }) => number).join(", ")}`,
);
assert.ok(
  gradientLines.every(({ number }) => number <= 27),
  "그라디언트는 최종 단색 정본으로 덮는 압축 legacy 선언 밖에 남으면 안 됩니다.",
);

const authorityStart = css.indexOf("Arena 일반 표면·행동의 최종 색 정본");
assert.notEqual(authorityStart, -1);
const authority = css.slice(authorityStart);
assert.doesNotMatch(authority, /linear-gradient|radial-gradient/);
assert.match(authority, /\.arena-access-error-card[\s\S]*?background:\s*#11172d/);
assert.match(authority, /\.arena-account-form button[\s\S]*?background:\s*var\(--matths-action-primary\)/);

console.log("arena gradient discipline: solid surfaces and actions ok");
