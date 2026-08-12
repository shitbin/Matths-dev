#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const contentRoot = path.join(root, "content_folder");
const policy = JSON.parse(fs.readFileSync(
  path.join(contentRoot, "curriculum-story-policy.json"),
  "utf8",
));
const ngramSize = 14;
const maximumJaccard = 0.12;

function normalizeScreenCopy(value) {
  return String(value || "").replace(/\s+/gu, " ").trim().toLocaleLowerCase("ko");
}

function narrationNgrams(value) {
  const normalized = String(value || "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]/gu, "");
  const grams = new Set();
  for (let index = 0; index + ngramSize <= normalized.length; index += 1) {
    grams.add(normalized.slice(index, index + ngramSize));
  }
  return grams;
}

const scenes = [];
const seenScreenCopy = new Map();
for (const courseId of policy.courseIds) {
  const shard = JSON.parse(fs.readFileSync(
    path.join(contentRoot, "curriculum-stories", `${courseId}.json`),
    "utf8",
  ));
  for (const story of shard.stories || []) {
    if (story.status !== "published") continue;
    for (const scene of story.scenes || []) {
      const sceneKey = `${courseId}/${story.conceptId}/${scene.kind}`;
      for (const field of ["title", "subtitle"]) {
        const fingerprint = `${field}:${normalizeScreenCopy(scene[field])}`;
        assert.ok(
          !seenScreenCopy.has(fingerprint),
          `${sceneKey}와 ${seenScreenCopy.get(fingerprint)}의 ${field} 문구가 같습니다.`,
        );
        seenScreenCopy.set(fingerprint, sceneKey);
      }
      scenes.push({
        key: sceneKey,
        grams: narrationNgrams(scene.narration),
      });
    }
  }
}

assert.ok(scenes.length > 0, "검수할 published curriculum story scene이 없습니다.");

// 모든 쌍의 본문 전체를 다시 훑지 않고, 실제로 공유하는 14자 구간만 역색인한다.
const ownersByGram = new Map();
for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex += 1) {
  for (const gram of scenes[sceneIndex].grams) {
    if (!ownersByGram.has(gram)) ownersByGram.set(gram, []);
    ownersByGram.get(gram).push(sceneIndex);
  }
}

const intersections = new Map();
for (const owners of ownersByGram.values()) {
  for (let left = 0; left < owners.length; left += 1) {
    for (let right = left + 1; right < owners.length; right += 1) {
      const pairKey = `${owners[left]}:${owners[right]}`;
      intersections.set(pairKey, (intersections.get(pairKey) || 0) + 1);
    }
  }
}

let closest = { score: 0, left: "—", right: "—" };
for (const [pairKey, intersection] of intersections) {
  const [leftIndex, rightIndex] = pairKey.split(":").map(Number);
  const left = scenes[leftIndex];
  const right = scenes[rightIndex];
  const union = left.grams.size + right.grams.size - intersection;
  const score = union > 0 ? intersection / union : 1;
  if (score > closest.score) closest = { score, left: left.key, right: right.key };
  assert.ok(
    score < maximumJaccard,
    `${left.key}와 ${right.key} narration이 지나치게 비슷합니다 `
      + `(14자 Jaccard ${score.toFixed(4)} >= ${maximumJaccard}).`,
  );
}

console.log(
  `Curriculum story originality passed: ${scenes.length} scenes, `
    + `closest=${closest.score.toFixed(4)} (${closest.left} <> ${closest.right}).`,
);
