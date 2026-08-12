"use strict";

const assert = require("node:assert/strict");
const {
  auditCurriculumEditorialQuality,
} = require("../scripts/auditCurriculumEditorialQuality");

const result = auditCurriculumEditorialQuality();
assert.equal(result.result, "PASS", JSON.stringify(result.issues.slice(0, 20), null, 2));
assert.deepEqual(result.catalog, { courses: 13, units: 46, concepts: 220 });
assert.equal(result.issues.length, 0);

console.log("curriculum editorial audit passed: 13 courses, 46 units, 220 concepts");
