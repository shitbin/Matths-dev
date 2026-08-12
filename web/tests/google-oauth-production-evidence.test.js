#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { requiredCases, template, validate } = require("../scripts/verifyGoogleOAuthEvidence");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "matths-google-evidence-"));
const proof = Buffer.from("google oauth production evidence fixture");
fs.writeFileSync(path.join(root, "proof.mp4"), proof);
const digest = crypto.createHash("sha256").update(proof).digest("hex");
const input = template();
Object.assign(input, {
  observedAt: "2026-08-11T20:00:00+09:00",
  reviewer: "contract reviewer",
  deviceModel: "iPad Pro 11-inch (4th generation)",
  osVersion: "iPadOS test",
  appBuild: "1",
});
input.consoleConfig.clientId = "123456789.apps.googleusercontent.com";
input.consoleConfig.artifact = { type: "screenshot", file: "proof.mp4", sha256: digest };
input.cases = input.cases.map((row) => ({
  ...row,
  result: "PASS",
  notes: "비식별 계약 fixture",
  artifacts: [{ type: "video", file: "proof.mp4", sha256: digest }],
}));

const result = validate(input, root);
assert.equal(result.result, "PASS");
assert.equal(result.cases.length, requiredCases.length);
assert.equal(result.consoleConfig.clientIdSha256.length, 64);
assert.equal(result.consoleConfig.clientId, undefined, "output must not expose the public client id verbatim");

const missing = structuredClone(input);
missing.cases = missing.cases.filter((row) => row.id !== "ipad-app-return");
assert.throws(() => validate(missing, root), /필수 Google OAuth 검증이 없습니다/);

const secret = structuredClone(input);
secret.clientSecret = "must-not-be-recorded";
assert.throws(() => validate(secret, root), /비밀정보 또는 개인정보/);

const tampered = structuredClone(input);
tampered.cases[0].artifacts[0].sha256 = "0".repeat(64);
assert.throws(() => validate(tampered, root), /변경됐습니다/);

console.log("Google OAuth production evidence test passed");
