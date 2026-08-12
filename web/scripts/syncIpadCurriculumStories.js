#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { resolveIpadSourceRoot } = require("./resolveIpadWorkspace");

const webRoot = path.resolve(__dirname, "..");
const contentRoot = path.join(webRoot, "content_folder");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalEntries() {
  const policyPath = path.join(contentRoot, "curriculum-story-policy.json");
  const indexPath = path.join(contentRoot, "curriculum-stories-index.json");
  const policyRaw = fs.readFileSync(policyPath);
  const indexRaw = fs.readFileSync(indexPath);
  const policy = JSON.parse(policyRaw);
  const index = JSON.parse(indexRaw);

  assert.equal(index.schemaVersion, policy.schemaVersion, "story index schema가 policy와 다릅니다.");
  assert.equal(index.curriculumId, policy.curriculumId, "story index curriculumId가 policy와 다릅니다.");
  assert.deepEqual(index.providerPolicy, policy.providerPolicy, "story provider policy가 index와 다릅니다.");
  assert.deepEqual(
    index.shards.map((shard) => shard.courseId),
    policy.courseIds,
    "story index의 13과목 순서가 policy와 다릅니다.",
  );

  const entries = [
    { relative: "curriculum-story-policy.json", raw: policyRaw },
    { relative: "curriculum-stories-index.json", raw: indexRaw },
  ];
  for (const shard of index.shards) {
    assert.match(shard.file, /^curriculum-stories\/[a-z0-9-]+\.json$/u);
    const raw = fs.readFileSync(path.join(contentRoot, shard.file));
    assert.equal(
      sha256(raw),
      shard.sha256,
      `${shard.courseId} shard가 generated index와 다릅니다. 먼저 curriculum:story:index를 실행하세요.`,
    );
    entries.push({ relative: shard.file, raw });
  }
  return entries;
}

function syncIpadCurriculumStories({ mode = "--check", targetRoot } = {}) {
  if (!["--check", "--write"].includes(mode)) {
    throw new Error(
      "사용법: node scripts/syncIpadCurriculumStories.js [--check|--write] [iPad-Matths-source-root]",
    );
  }
  const ipadSourceRoot = path.resolve(targetRoot || resolveIpadSourceRoot(webRoot));
  const entries = canonicalEntries();

  for (const entry of entries) {
    const target = path.join(ipadSourceRoot, entry.relative);
    assert.ok(
      target.startsWith(`${ipadSourceRoot}${path.sep}`),
      `iPad story target이 workspace 밖을 가리킵니다: ${target}`,
    );
    if (mode === "--write") {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, entry.raw);
      continue;
    }
    assert.ok(fs.existsSync(target), `iPad story resource가 없습니다: ${entry.relative}`);
    assert.equal(
      sha256(fs.readFileSync(target)),
      sha256(entry.raw),
      `iPad story resource가 웹 정본과 다릅니다: ${entry.relative}`,
    );
  }

  console.log(
    `iPad curriculum story ${mode === "--write" ? "sync" : "parity"} OK: ${entries.length} files`,
  );
  return { files: entries.length, ipadSourceRoot };
}

if (require.main === module) {
  syncIpadCurriculumStories({
    mode: process.argv[2] || "--check",
    targetRoot: process.argv[3],
  });
}

module.exports = { canonicalEntries, syncIpadCurriculumStories };
