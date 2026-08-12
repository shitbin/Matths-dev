"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(root, "scripts/start-server.js"),
  "utf8",
);
const packageJson = require(path.join(root, "package.json"));

assert.equal(packageJson.scripts.start, "node scripts/start-server.js");
assert.equal(packageJson.scripts["start:atlas"], "node server.js");
assert.match(source, /await startLocalMongo\(\)/);
assert.doesNotMatch(source, /if \(await atlasIsReachable\(\)\)/);
assert.match(source, /process\.env\.DISABLE_SCHEDULERS \|\|= "1"/);
assert.match(source, /existingLocalReplicaUri/);
assert.match(source, /isWritablePrimary !== true/);

console.log("Local preview is pinned to a local writable replica set; Atlas remains explicit-only");
