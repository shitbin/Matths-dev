#!/usr/bin/env node

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { loadCurriculum } = require("../services/curriculumService");
const {
  compileStudioScript,
  normalizeWhitespace,
  stripStudioTags,
  validateStory,
  validateStoryCurriculumAuthority,
} = require("../services/curriculumStoryService");
const {
  assertExactCurriculumStoryReleaseCount,
} = require("../services/curriculumStoryReleaseGate");

const root = path.resolve(__dirname, "..");
const contentRoot = path.join(root, "content_folder");
const policy = JSON.parse(fs.readFileSync(
  path.join(contentRoot, "curriculum-story-policy.json"),
  "utf8",
));
const requireComplete = process.argv.includes("--require-complete");
const outputArgument = process.argv.find((value) => value.startsWith("--output="));
const outputPath = outputArgument
  ? path.resolve(root, outputArgument.slice("--output=".length))
  : path.join(root, "dist", "curriculum-voice-studio", "eleven-v3-prompts.json");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fail(message) {
  throw new Error(`Curriculum voice studio: ${message}`);
}

function main() {
  if (policy.providerPolicy?.studioProvider !== "eleven_v3") {
    fail("studioProvider는 eleven_v3여야 합니다.");
  }

  const curriculum = loadCurriculum();
  const authority = new Map();
  for (const course of curriculum.courses || []) {
    for (const unit of course.units || []) {
      for (const concept of unit.concepts || []) {
        authority.set(`${course.id}/${unit.id}/${concept.id}`, concept);
      }
    }
  }

  const entries = [];
  const shardDigests = [];
  const seenStoryKeys = new Set();
  for (const courseId of policy.courseIds) {
    const relative = `curriculum-stories/${courseId}.json`;
    const filePath = path.join(contentRoot, relative);
    const raw = fs.readFileSync(filePath, "utf8");
    const shard = JSON.parse(raw);
    if (
      shard.schemaVersion !== policy.schemaVersion
      || shard.curriculumId !== policy.curriculumId
      || shard.courseId !== courseId
      || !Array.isArray(shard.stories)
    ) {
      fail(`${relative} 메타데이터가 policy와 다릅니다.`);
    }
    shardDigests.push({ courseId, sha256: sha256(raw) });

    for (const story of shard.stories) {
      const key = `${story.courseId}/${story.unitId}/${story.conceptId}`;
      if (seenStoryKeys.has(key)) fail(`${key}: story key가 중복입니다.`);
      seenStoryKeys.add(key);
      const issues = [
        ...validateStory(story, courseId, policy).issues,
        ...validateStoryCurriculumAuthority(story, authority.get(key)),
      ];
      if (story.status !== "published") issues.push("published 원고가 아닙니다.");
      if (issues.length) fail(`${key}: ${[...new Set(issues)].join(" | ")}`);

      const compiledScenes = story.scenes.map((scene) => ({
        id: scene.id,
        kind: scene.kind,
        text: compileStudioScript(scene.studioScript, policy),
      }));
      const studioText = compiledScenes.map((scene) => scene.text).join("\n\n");
      const narrationText = story.scenes.map((scene) => normalizeWhitespace(scene.narration)).join("\n\n");
      if (stripStudioTags(studioText) !== normalizeWhitespace(narrationText)) {
        fail(`${key}: compiled studio text와 narration이 다릅니다.`);
      }

      entries.push({
        id: story.conceptId,
        courseId: story.courseId,
        unitId: story.unitId,
        conceptId: story.conceptId,
        revision: story.revision,
        locale: policy.providerPolicy.defaultLocale,
        modelId: policy.providerPolicy.studioProvider,
        estimatedSeconds: story.estimatedSeconds,
        text: studioText,
        textSha256: sha256(studioText),
        narrationSha256: sha256(narrationText),
        scenes: compiledScenes.map(({ id, kind }) => ({ id, kind })),
      });
    }
  }

  entries.sort((left, right) => left.conceptId.localeCompare(right.conceptId, "en"));
  const missingStoryKeys = [...authority.keys()].filter((key) => !seenStoryKeys.has(key));
  const isComplete = missingStoryKeys.length === 0
    && entries.length === curriculum.catalogStats.totalConcepts;
  if (requireComplete) {
    try {
      assertExactCurriculumStoryReleaseCount({
        authorityCount: curriculum.catalogStats.totalConcepts,
        completedCount: entries.length,
        completedLabel: "Eleven v3 export story",
      });
    } catch (error) {
      fail(error.message);
    }
  }
  if (requireComplete && !isComplete) {
    fail(
      `검수 원고가 ${entries.length}/${curriculum.catalogStats.totalConcepts}개입니다. `
      + `누락 ${missingStoryKeys.length}개.`,
    );
  }

  const manifest = {
    schemaVersion: "MATTHS_CURRICULUM_VOICE_STUDIO_V1",
    curriculumId: policy.curriculumId,
    provider: {
      name: "ElevenLabs",
      modelId: policy.providerPolicy.studioProvider,
      voiceIdSource: "server-environment-or-approved-provider-configuration",
      apiCredentialIncluded: false,
    },
    studentProjectionIncludesStudioTags: false,
    totalCurriculumConcepts: curriculum.catalogStats.totalConcepts,
    exportedStories: entries.length,
    complete: isComplete,
    shardDigests,
    entries,
  };
  manifest.contentSha256 = sha256(JSON.stringify(manifest));

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(
    `Curriculum voice studio manifest: ${entries.length}/${curriculum.catalogStats.totalConcepts} -> ${outputPath}`,
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
