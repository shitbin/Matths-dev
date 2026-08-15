#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const template = fs.readFileSync(
  path.join(
    root,
    "views/partials/concept-experience.ejs",
  ),
  "utf8",
);
const script = fs.readFileSync(
  path.join(root, "public/js/concept-experience.js"),
  "utf8",
);
const stylesheet = fs.readFileSync(
  path.join(root, "public/css/concept-experience.css"),
  "utf8",
);

const panelIds = [
  "concept-explanation",
  "concept-motion",
  "concept-playground",
  "concept-practice",
];

assert.match(template, /role="tablist"/u);
assert.equal(
  (template.match(/role="tab"/gu) || []).length,
  4,
);
assert.equal(
  (template.match(/data-experience-panel/gu) || []).length,
  4,
);
for (const panelId of panelIds) {
  assert.match(template, new RegExp(`aria-controls="${panelId}"`, "u"));
  assert.match(template, new RegExp(`id="${panelId}"`, "u"));
}

assert.match(script, /panel\.hidden = !active/u);
assert.match(script, /: "concept-motion"/u);
assert.match(script, /aria-selected/u);
assert.match(script, /button\.tabIndex = active \? 0 : -1/u);
assert.match(script, /prefers-reduced-motion: reduce/u);
assert.match(script, /initPractice\(\);\s*\/\/ 모든 시각화[\s\S]*initNavigation\(\);/u);
assert.match(stylesheet, /\.experience-section\[hidden\][\s\S]*display: none !important/u);
assert.match(stylesheet, /repeat\(4, minmax\(0, 1fr\)\)/u);
assert.match(template, /aria-controls="concept-motion"[\s\S]*aria-selected="true"/u);

const basicTemplate = fs.readFileSync(
  path.join(
    root,
    "views/partials/basic-concept-experience.ejs",
  ),
  "utf8",
);
assert.match(basicTemplate, /<details class="basic-reference-notes">/u);
assert.doesNotMatch(basicTemplate, /<details class="basic-reference-notes" open>/u);

console.log("Concept learning exposes one progressive stage at a time.");
