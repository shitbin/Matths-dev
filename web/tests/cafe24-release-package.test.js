"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "scripts/buildCafe24Release.js"), "utf8");
const runnerSource = fs.readFileSync(path.join(root, "scripts/run-tests.js"), "utf8");

assert.match(source, /spawnSync\([\s\S]*"git",[\s\S]*"archive"/);
assert.doesNotMatch(source, /"\:\(exclude\)docs"/);
assert.doesNotMatch(source, /"\:\(exclude\)tests"/);
assert.match(source, /:\(exclude\)docs\/web-redesign\/screenshots/);
assert.match(source, /:\(exclude\)node_modules/);
assert.match(source, /status", "--porcelain"/);
assert.match(source, /config\\\.env/);
assert.match(source, /mobileprovision\|gguf/);
assert.match(source, /MATTHS_CAFE24_RELEASE_V1/);
assert.match(source, /MATTHS_RELEASE_SOURCE_V1/);
assert.match(source, /--add-virtual-file/);
assert.match(source, /RELEASE-SOURCE\.json/);
assert.match(source, /sha256/);
assert.match(source, /deploymentAuthority/);
assert.match(source, /verificationCommands/);
assert.match(source, /node scripts\/run-tests\.js --check/);
assert.match(source, /npm run test:deployment/);
assert.match(source, /crossWorkspaceTestsVerifiedBeforePackaging/);
assert.match(source, /function runPrePackagingTests\(\)/);
assert.match(source, /\[path\.join\(root, "scripts", "run-tests\.js"\)\]/);
assert.match(source, /const prePackagingTests = runPrePackagingTests\(\)/);
assert.ok(
  source.indexOf("const prePackagingTests = runPrePackagingTests()") <
    source.indexOf('createArchive("release"'),
  "전체 테스트는 archive 생성 전에 실제 실행되어야 합니다.",
);
assert.doesNotMatch(source, /\b(?:scp|rsync|ftp|sftp|curl)\b/);
const expectedCrossWorkspaceTests = [
  "tests/arena-ipad-visualization-contract.test.js",
  "tests/final-release-readiness.test.js",
  "tests/goat-arena-main-native.test.js",
  "tests/goat-arena-production-adapter.test.js",
  "tests/ipad-api-surface-parity.test.js",
  "tests/ipad-assessment-catalog-parity.test.js",
  "tests/ipad-placement-promotion-contract.test.js",
  "tests/social-auth-mobile.test.js",
];
for (const crossWorkspaceTest of expectedCrossWorkspaceTests) {
  assert.match(runnerSource, new RegExp(crossWorkspaceTest.replaceAll(".", "\\.")));
  assert.match(source, new RegExp(crossWorkspaceTest.replaceAll(".", "\\.")));
}
const discoveredCrossWorkspaceTests = fs.readdirSync(path.join(root, "tests"))
  .filter((file) => file.endsWith(".test.js"))
  .filter((file) => /require\(["']\.\.\/scripts\/resolveIpadWorkspace["']\)/.test(
    fs.readFileSync(path.join(root, "tests", file), "utf8"),
  ))
  .map((file) => `tests/${file}`)
  .sort();
assert.deepEqual(discoveredCrossWorkspaceTests, expectedCrossWorkspaceTests);
assert.match(runnerSource, /deploymentExcludedTests\.length/);

const pkg = require(path.join(root, "package.json"));
assert.equal(pkg.scripts["release:cafe24"], "node scripts/buildCafe24Release.js");
assert.equal(pkg.scripts["test:deployment"], "node scripts/run-tests.js --deployment");

console.log("Cafe24 release and rollback package contracts passed");
