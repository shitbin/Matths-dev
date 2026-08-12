#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { syncIpadCurriculumStories } = require("../scripts/syncIpadCurriculumStories");

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "matths-curriculum-story-sync-"));
try {
  const written = syncIpadCurriculumStories({ mode: "--write", targetRoot: temporaryRoot });
  assert.equal(written.files, 15);
  syncIpadCurriculumStories({ mode: "--check", targetRoot: temporaryRoot });

  const mutated = path.join(temporaryRoot, "curriculum-stories", "common-math-1.json");
  fs.appendFileSync(mutated, "\n");
  assert.throws(
    () => syncIpadCurriculumStories({ mode: "--check", targetRoot: temporaryRoot }),
    /웹 정본과 다릅니다/u,
  );
  syncIpadCurriculumStories({ mode: "--write", targetRoot: temporaryRoot });
  syncIpadCurriculumStories({ mode: "--check", targetRoot: temporaryRoot });
  console.log("Curriculum story web/iPad byte parity contract passed.");
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
