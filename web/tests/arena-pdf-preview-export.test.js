"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  DEFINITIONS,
} = require("../services/arenaPdfTranscriptionGenerators");
const {
  main: buildPreview,
  OUTPUT,
  renderCard,
} = require("../scripts/buildArenaPdfAllProblemPreview");

assert.equal(DEFINITIONS.length, 200);
const cards = DEFINITIONS.map(renderCard);
assert.equal(cards.length, 200);
assert.equal(new Set(DEFINITIONS.map((item) => item.sourceReferenceId)).size, 200);
cards.forEach((card, index) => {
  assert.match(card, new RegExp(`id="problem-${index + 1}"`));
  assert.match(card, /data-source-id="[^"]+"/);
  assert.match(card, /data-answer="[^"]+"/);
});

buildPreview();
const html = fs.readFileSync(OUTPUT, "utf8");
assert.equal((html.match(/class="problem-card"/g) || []).length, 200);
assert.equal((html.match(/data-source-id=/g) || []).length, 200);
assert.equal((html.match(/data-answer=/g) || []).length, 200);
assert.match(html, /break-inside:avoid-page/);
assert.match(html, /Page\.printToPDF|검사 후 PDF 인쇄/);
assert.match(html, /\.prompt, \.solution p, \[data-arena-visualization\]/);
assert.match(html, /uniqueSourceIds\.size !== 200/);
assert.match(html, /answers\.some\(\(value\) => !value\)/);
assert.match(html, /contiguousNumbers/);

const exporter = fs.readFileSync(
  path.join(__dirname, "../scripts/exportArenaPdfAllProblemPreview.js"),
  "utf8",
);
assert.match(exporter, /displayHeaderFooter:\s*false/);
assert.match(exporter, /preferCSSPageSize:\s*true/);
assert.match(exporter, /transferMode:\s*"ReturnAsStream"/);
assert.match(exporter, /"IO\.read"/);
assert.match(exporter, /const chunkSize = 25/);
assert.match(exporter, /PDFDocument\.load/);
assert.match(exporter, /merged\.copyPages/);
assert.match(exporter, /missingSourceIds/);
assert.match(exporter, /rawTexBlocks/);
assert.match(exporter, /file:\/\/\/Users\//);
assert.match(exporter, /fs\.rmSync\(output, \{ force: true \}\)/);

console.log("Arena 200-question preview and fail-closed PDF export contract passed");
