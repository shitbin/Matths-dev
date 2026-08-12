"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const cssRoot = path.resolve(__dirname, "..", "public", "css");
const cssFiles = fs.readdirSync(cssRoot).filter((name) => name.endsWith(".css"));
const invalid = [];

for (const filename of cssFiles) {
  const source = fs.readFileSync(path.join(cssRoot, filename), "utf8");
  for (const match of source.matchAll(/font-weight:\s*(\d+)/g)) {
    const value = Number(match[1]);
    if (value > 920) invalid.push(`${filename}:${value}`);
  }
}

assert.deepEqual(
  invalid,
  [],
  "동봉된 Pretendard Variable의 최대 weight 920을 넘는 선언은 허용하지 않는다",
);

console.log("웹 폰트 weight 범위 계약 통과");
