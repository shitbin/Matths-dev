#!/usr/bin/env node

"use strict";

const { loadCurriculum } = require("../services/curriculumService");
const {
  getCurriculumStoryCatalog,
  storyKey,
} = require("../services/curriculumStoryService");

const conceptId = String(process.argv[2] || "").trim();
if (!conceptId) {
  console.error("Usage: node scripts/printCurriculumStoryTemplate.js <conceptId>");
  process.exit(2);
}

const curriculum = loadCurriculum();
let target;
for (const course of curriculum.courses) {
  for (const unit of course.units) {
    const concept = unit.concepts.find((item) => item.id === conceptId);
    if (concept) target = { course, unit, concept };
  }
}
if (!target) {
  console.error(`Unknown conceptId: ${conceptId}`);
  process.exit(2);
}

const key = storyKey(target.course.id, target.unit.id, target.concept.id);
if (getCurriculumStoryCatalog().rawStoryByKey.has(key)) {
  console.error(`Story already exists: ${key}`);
  process.exit(2);
}

const kinds = ["intuition", "question", "misconception", "solution", "recall"];
const template = {
  courseId: target.course.id,
  unitId: target.unit.id,
  conceptId: target.concept.id,
  status: "draft",
  revision: 1,
  estimatedSeconds: 300,
  title: "",
  openingQuestion: "",
  source: {
    standardCode: target.concept.standardCode || "",
    basis: target.concept.achievementStandard || "",
  },
  authoringContext: {
    conceptTitle: target.concept.title,
    topics: target.concept.topics || [],
    visualizationIdeas: target.concept.visualizationIdeas || [],
    existingSummary: target.concept.lesson?.summary || "",
    existingKeyTakeaway: target.concept.lesson?.keyTakeaway || "",
  },
  scenes: kinds.map((kind) => ({
    id: "",
    kind,
    title: "",
    subtitle: "",
    narration: "",
    studioScript: "",
  })),
};

console.log(JSON.stringify(template, null, 2));
