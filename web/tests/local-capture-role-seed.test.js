"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const filename = path.join(root, "scripts/seedLocalCaptureRoles.js");
const source = fs.readFileSync(filename, "utf8");

assert.match(source, /MATTHS_CAPTURE_SEED !== "local-only"/);
assert.match(source, /127\\\.0\\\.0\\\.1\|localhost/);
assert.match(source, /test\|dev\|local\|preview/);
assert.match(source, /mongoose\.set\("autoIndex", false\)/);
assert.match(source, /session\.withTransaction/);
assert.match(source, /ParentChildLink\.findOneAndUpdate/);
assert.doesNotMatch(source, /dotenv|config\.env/);

const rejected = spawnSync(process.execPath, [filename], {
  cwd: root,
  encoding: "utf8",
  env: {},
});
assert.notEqual(rejected.status, 0);
assert.match(rejected.stderr, /local-only/);

console.log("local capture role seed is localhost-only and fail-closed");
