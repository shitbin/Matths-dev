#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadCurriculum } = require("../services/curriculumService");

const root = path.resolve(__dirname, "..");
const storiesRoot = path.join(root, "content_folder", "curriculum-stories");
const curriculum = loadCurriculum();
let checkedStories = 0;

for (const course of curriculum.courses) {
  const shard = JSON.parse(fs.readFileSync(
    path.join(storiesRoot, `${course.id}.json`),
    "utf8",
  ));
  const canonical = course.units.flatMap((unit) => unit.concepts.map((concept) => ({
    unitId: unit.id,
    conceptId: concept.id,
    standardCode: concept.standardCode,
  })));
  const canonicalByConcept = new Map(canonical.map((item) => [item.conceptId, item]));
  const actualConceptIds = shard.stories.map((story) => story.conceptId);
  const expectedPartialOrder = canonical
    .map((item) => item.conceptId)
    .filter((conceptId) => actualConceptIds.includes(conceptId));

  assert.deepEqual(
    actualConceptIds,
    expectedPartialOrder,
    `${course.id} story 순서가 2022 개정 교육과정 정본과 다릅니다.`,
  );
  for (const story of shard.stories) {
    const authority = canonicalByConcept.get(story.conceptId);
    assert.ok(authority, `${course.id}/${story.conceptId}는 정본 밖 concept입니다.`);
    assert.equal(story.courseId, course.id);
    assert.equal(story.unitId, authority.unitId);
    assert.equal(story.source?.standardCode, authority.standardCode);
    checkedStories += 1;
  }
}

console.log(`Curriculum story canonical order passed: ${checkedStories}/220 authored stories.`);
