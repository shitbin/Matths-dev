"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { resolveIpadSourceRoot } = require("../scripts/resolveIpadWorkspace");

const root = path.resolve(__dirname, "..");
const ipadRoot = resolveIpadSourceRoot(root);
const read = (file) => fs.readFileSync(file, "utf8");
const sha256 = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const service = read(path.join(root, "services/goatArenaProductionCommandService.js"));
assert.match(service, /visualizationJSON = question\.visualization/);
assert.match(service, /JSON\.stringify\(question\.visualization\)/);
assert.doesNotMatch(
  service.match(/function serializeQuestion[\s\S]*?\n  }/)?.[0] || "",
  /answer:|solution:/,
  "iPad 공개 문항 직렬화기에 정답·풀이가 들어가면 안 됩니다."
);

const serverRenderer = path.join(root, "public/js/arena-problem-visualization.js");
const ipadRenderer = path.join(ipadRoot, "LessonWeb/arena-problem-visualization.js");
assert.equal(
  sha256(serverRenderer),
  sha256(ipadRenderer),
  "웹과 iPad의 Arena 시각자료 작도 엔진이 달라졌습니다."
);

const html = read(path.join(ipadRoot, "LessonWeb/arena-problem.html"));
const view = read(path.join(ipadRoot, "ArenaProblemVisualizationView.swift"));
const screen = read(path.join(ipadRoot, "GoatArenaMatchPlayScreen.swift"));
const api = read(path.join(ipadRoot, "ServerAPI.swift"));
assert.match(html, /arena-problem-visualization\.js/);
assert.match(html, /ArenaProblemVisualization\?\.renderInto/);
assert.match(view, /JSONSerialization\.isValidJSONObject/);
assert.match(view, /allowsContentJavaScript = true/);
assert.match(screen, /ArenaProblemVisualizationView/);
assert.match(api, /visualizationJSON: String\?/);

console.log("Arena 200-question visual payload web/iPad contract passed");
