"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

function collect(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collect(absolute);
    return entry.isFile() && entry.name.endsWith(".ejs") ? [absolute] : [];
  });
}

for (const file of collect(path.join(repoRoot, "views"))) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(
    source,
    /<%=[^%]*['"`][^%]*\b(?:aria-[\w-]+|data-[\w-]+)="[^%]*%>/,
    `${path.relative(repoRoot, file)}에서 속성 묶음을 escaped EJS 출력으로 삽입하면 따옴표가 HTML entity로 변합니다. EJS 제어 블록으로 속성을 직접 렌더하세요.`,
  );
}

console.log("EJS conditional attribute contract passed");
