"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadCurriculum } = require("../services/curriculumService");

const root = path.resolve(__dirname, "..");
const data = loadCurriculum();
assert.equal(data.learningTracks.length, 6);
for (const track of data.learningTracks) {
  assert.ok(track.concepts.length >= 3 && track.concepts.length <= 5);
  assert.ok(track.estimatedMinutes > 0);
  assert.ok(track.concepts.every((concept) => concept.href.startsWith(`/learn/${track.courseId}/`)));
}

const view = fs.readFileSync(path.join(root, "views/curriculum.ejs"), "utf8");
const css = fs.readFileSync(path.join(root, "public/css/curriculum-atlas.css"), "utf8");
assert.match(view, /추천 학습 코스/);
assert.match(view, /track\.concepts\.forEach/);
assert.match(view, /loggedIn \? track\.concepts\[0\]\.href : '\/register'/);
assert.match(css, /\.curriculum-track-grid[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(css, /counter\(curriculum-track, decimal-leading-zero\)/);
assert.match(css, /@media \(max-width: 780px\)[\s\S]*?\.curriculum-track-grid[\s\S]*?grid-template-columns: 1fr/);

console.log("curriculum learning paths: 6 web tracks verified");
