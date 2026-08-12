#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  EXPECTED_RELEASE_STORY_COUNT,
  assertExactCurriculumStoryReleaseCount,
} = require("../services/curriculumStoryReleaseGate");

assert.equal(EXPECTED_RELEASE_STORY_COUNT, 220);
assert.doesNotThrow(() => assertExactCurriculumStoryReleaseCount({
  authorityCount: 220,
  completedCount: 220,
  completedLabel: "published story",
}));

assert.throws(
  () => assertExactCurriculumStoryReleaseCount({
    authorityCount: 219,
    completedCount: 219,
    completedLabel: "published story",
  }),
  /정본이 219\/220개/u,
);
assert.throws(
  () => assertExactCurriculumStoryReleaseCount({
    authorityCount: 220,
    completedCount: 219,
    completedLabel: "published story",
  }),
  /published story가 219\/220개/u,
);
assert.throws(
  () => assertExactCurriculumStoryReleaseCount({
    authorityCount: 220,
    completedCount: 219,
    completedLabel: "Eleven v3 export story",
  }),
  /Eleven v3 export story가 219\/220개/u,
);
assert.throws(
  () => assertExactCurriculumStoryReleaseCount({
    authorityCount: 221,
    completedCount: 220,
    completedLabel: "published story",
  }),
  /정본이 221\/220개/u,
);

const root = path.resolve(__dirname, "..");
const auditSource = fs.readFileSync(path.join(root, "scripts/auditCurriculumStories.js"), "utf8");
const voiceSource = fs.readFileSync(
  path.join(root, "scripts/buildCurriculumVoiceStudioManifest.js"),
  "utf8",
);
assert.match(auditSource, /assertExactCurriculumStoryReleaseCount\(\{[\s\S]*?published story/u);
assert.match(voiceSource, /assertExactCurriculumStoryReleaseCount\(\{[\s\S]*?Eleven v3 export story/u);

console.log("Curriculum release exact-count gate passed: authority and outputs require 220/220.");
