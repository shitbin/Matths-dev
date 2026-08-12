#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { resolveIpadSourceRoot } = require("../scripts/resolveIpadWorkspace");
const { syncIpadCurriculumStories } = require("../scripts/syncIpadCurriculumStories");

const root = path.resolve(__dirname, "..");
const expectedIpadSourceRoot = resolveIpadSourceRoot(root);
const result = syncIpadCurriculumStories({ mode: "--check" });

assert.equal(result.files, 15);
assert.equal(
  result.ipadSourceRoot,
  expectedIpadSourceRoot,
  "검사가 실제 sibling iPad source root를 대상으로 실행되어야 합니다.",
);

console.log(`Actual web/iPad curriculum story parity passed: ${result.files} files.`);
