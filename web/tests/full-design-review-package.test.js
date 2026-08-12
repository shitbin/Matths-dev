#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "scripts/buildFullDesignReviewPackage.js"), "utf8");

assert.match(source, /MATTHS_WEB_IPAD_DESIGN_REVIEW_PACKAGE_V1/);
assert.match(source, /web-review\.tar\.gz/);
assert.match(source, /ipad-source\.tar\.gz/);
assert.match(source, /git", \["status", "--porcelain"/);
assert.match(source, /git", \["archive"/);
assert.match(source, /iPad historical baseline screenshots were captured before/);
assert.match(source, /not current-commit visual approval evidence/);
assert.match(source, /MATTHS_IPAD_CURRENT_SIMULATOR_CAPTURE_V1/);
assert.match(source, /currentSimulatorEvidence/);
assert.match(source, /현재 iPad 화면 증거 해시가 일치하지 않습니다/);
assert.match(source, /current-commit simulator evidence, not physical-device/);
assert.match(source, /failureEvidence로 분류된 화면/);
assert.match(source, /ipad-install-215\/device-install\.json/);
assert.match(source, /ipad-release-215\/release-build\.json/);
assert.match(source, /Simulator accessibility\/window reports are not physical-device/);
assert.match(source, /launch remained pending device unlock/);
assert.match(source, /Missing screens must remain NOT REVIEWED/);
assert.match(source, /SHA256SUMS\.txt/);
assert.match(source, /현재 두 저장소의 전체 추적 소스/);
assert.doesNotMatch(source, /\b(?:scp|rsync|ftp|sftp|git push)\b/);

const pkg = require(path.join(root, "package.json"));
assert.equal(pkg.scripts["review:package:full"], "node scripts/buildFullDesignReviewPackage.js");
console.log("Full web+iPad design review package contract passed");
