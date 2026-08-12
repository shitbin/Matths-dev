const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

function ruleBody(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `CSS selector missing: ${selector}`);
  return match[1];
}

const assessment = read("public/css/assessment.css");
const community = read("public/css/community.css");
const concept = read("public/css/concept-experience.css");

for (const [source, selector] of [
  [assessment, ".question-review p"],
  [community, ".community-comment-list article p"],
  [concept, ".common-math-step-grid p"],
  [concept, ".concept-step-grid p"],
]) {
  const body = ruleBody(source, selector);
  assert.match(body, /font-size:\s*16px\s*;/, `${selector} 본문은 16px이어야 합니다.`);
  assert.match(body, /line-height:\s*1\.625\s*;/, `${selector} 줄간격을 유지해야 합니다.`);
  assert.doesNotMatch(body, /font-size:\s*1[012]px\s*;/);
}

console.log("Student long-form typography contract passed");
