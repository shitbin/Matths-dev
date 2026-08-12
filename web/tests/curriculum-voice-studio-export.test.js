#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { stripStudioTags } = require("../services/curriculumStoryService");

const root = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "matths-curriculum-voice-"));
const output = path.join(temp, "manifest.json");

try {
  const run = spawnSync(
    process.execPath,
    ["scripts/buildCurriculumVoiceStudioManifest.js", `--output=${output}`],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  const manifest = JSON.parse(fs.readFileSync(output, "utf8"));
  assert.equal(manifest.schemaVersion, "MATTHS_CURRICULUM_VOICE_STUDIO_V1");
  assert.equal(manifest.provider.name, "ElevenLabs");
  assert.equal(manifest.provider.modelId, "eleven_v3");
  assert.equal(manifest.provider.apiCredentialIncluded, false);
  assert.equal(manifest.studentProjectionIncludesStudioTags, false);
  assert.equal(manifest.totalCurriculumConcepts, 220);
  assert.ok(manifest.exportedStories > 0 && manifest.exportedStories <= 220);
  assert.equal(manifest.entries.length, manifest.exportedStories);
  assert.equal(manifest.complete, manifest.exportedStories === 220);
  assert.match(manifest.contentSha256, /^[a-f0-9]{64}$/u);
  assert.equal(new Set(manifest.entries.map((entry) => entry.conceptId)).size, manifest.entries.length);

  for (const entry of manifest.entries) {
    assert.equal(entry.modelId, "eleven_v3");
    assert.equal(entry.locale, "ko-KR");
    assert.match(entry.text, /\[(?:warmly|curious|excited|whispers|sighs)\]/u);
    assert.doesNotMatch(entry.text, /\[(?:침착하게|따뜻하게|궁금한 듯|강조해서|낮은 목소리로|아쉬운 듯)\]/u);
    assert.ok(stripStudioTags(entry.text).length >= 1400);
    assert.match(entry.textSha256, /^[a-f0-9]{64}$/u);
    assert.match(entry.narrationSha256, /^[a-f0-9]{64}$/u);
  }
  assert.doesNotMatch(JSON.stringify(manifest), /(?:api[_-]?key|client[_-]?secret|access[_-]?token)\s*["':=]/iu);

  const gatedOutput = path.join(temp, "release-gated.json");
  const gated = spawnSync(
    process.execPath,
    [
      "scripts/buildCurriculumVoiceStudioManifest.js",
      "--require-complete",
      `--output=${gatedOutput}`,
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (manifest.complete) {
    assert.equal(gated.status, 0, `${gated.stdout}\n${gated.stderr}`);
    assert.ok(fs.existsSync(gatedOutput));
  } else {
    assert.notEqual(gated.status, 0);
    assert.match(gated.stderr, /검수 원고가 \d+\/220개입니다/u);
    assert.equal(fs.existsSync(gatedOutput), false);
  }

  console.log(`Curriculum Eleven v3 export contract passed: ${manifest.exportedStories}/220 prompts.`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
