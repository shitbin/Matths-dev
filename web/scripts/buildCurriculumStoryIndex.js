#!/usr/bin/env node

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { loadCurriculum } = require("../services/curriculumService");

const root = path.resolve(__dirname, "..");
const contentDirectory = path.join(root, "content_folder");
const policyPath = path.join(contentDirectory, "curriculum-story-policy.json");
const indexPath = path.join(contentDirectory, "curriculum-stories-index.json");
const checkOnly = process.argv.includes("--check");

function fail(message) {
  console.error(`Curriculum story index: ${message}`);
  process.exit(1);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const curriculum = loadCurriculum();
const canonicalConceptIdsByCourse = new Map(
  curriculum.courses.map((course) => [
    course.id,
    course.units.flatMap((unit) => unit.concepts.map((concept) => concept.id)),
  ]),
);
const seenConceptIds = new Set();
const shards = policy.courseIds.map((courseId) => {
  const file = `curriculum-stories/${courseId}.json`;
  const filePath = path.join(contentDirectory, file);
  if (!fs.existsSync(filePath)) fail(`${file}이 없습니다.`);

  const raw = fs.readFileSync(filePath, "utf8");
  let document;
  try {
    document = JSON.parse(raw);
  } catch (error) {
    fail(`${file} JSON을 읽지 못했습니다: ${error.message}`);
  }

  if (
    document.schemaVersion !== policy.schemaVersion
    || document.curriculumId !== policy.curriculumId
    || document.courseId !== courseId
    || !Array.isArray(document.stories)
  ) {
    fail(`${file} 메타데이터가 policy와 다릅니다.`);
  }

  const conceptIds = document.stories.map((story) => String(story.conceptId || "").trim());
  const canonicalConceptIds = canonicalConceptIdsByCourse.get(courseId);
  if (!canonicalConceptIds) fail(`${courseId}가 2022 개정 커리큘럼 정본에 없습니다.`);
  const canonicalConceptIdSet = new Set(canonicalConceptIds);
  const unknownConceptIds = conceptIds.filter((conceptId) => !canonicalConceptIdSet.has(conceptId));
  if (unknownConceptIds.length) {
    fail(`${file}에 정본 밖 conceptId가 있습니다: ${unknownConceptIds.join(", ")}`);
  }
  const expectedPublishedOrder = canonicalConceptIds.filter((conceptId) => conceptIds.includes(conceptId));
  if (JSON.stringify(conceptIds) !== JSON.stringify(expectedPublishedOrder)) {
    fail(`${file} story 순서가 2022 개정 커리큘럼 정본과 다릅니다.`);
  }
  for (const conceptId of conceptIds) {
    if (!conceptId) fail(`${file}에 conceptId가 빈 story가 있습니다.`);
    if (seenConceptIds.has(conceptId)) fail(`conceptId ${conceptId}가 shard 사이에 중복됩니다.`);
    seenConceptIds.add(conceptId);
  }

  return {
    courseId,
    file,
    storyCount: document.stories.length,
    conceptIds,
    sha256: sha256(raw),
  };
});

const expected = `${JSON.stringify({
  schemaVersion: policy.schemaVersion,
  curriculumId: policy.curriculumId,
  providerPolicy: policy.providerPolicy,
  shards,
}, null, 2)}\n`;

if (checkOnly) {
  if (!fs.existsSync(indexPath) || fs.readFileSync(indexPath, "utf8") !== expected) {
    fail("generated index가 shard와 다릅니다. npm run curriculum:story:index를 실행하세요.");
  }
  console.log(`Curriculum story index OK: ${shards.length} shards, ${seenConceptIds.size} stories.`);
  process.exit(0);
}

fs.writeFileSync(indexPath, expected);
console.log(`Wrote ${path.relative(root, indexPath)}: ${shards.length} shards, ${seenConceptIds.size} stories.`);
