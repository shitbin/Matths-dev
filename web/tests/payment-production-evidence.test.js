#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  artifactRequirements,
  expectedProvider,
  requiredCases,
  template,
  validate,
} = require("../scripts/verifyPaymentProductionEvidence");

function write(root, relative, body) {
  const filename = path.join(root, relative);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, body);
  return {
    file: relative,
    sha256: crypto.createHash("sha256").update(body).digest("hex"),
  };
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "matths-payment-evidence-"));
const png = write(root, "proof/provider-config.png", Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from("redacted provider config"),
]));
const video = write(root, "proof/roundtrip.mp4", Buffer.concat([
  Buffer.alloc(4), Buffer.from("ftypisom"), Buffer.from("redacted video"),
]));
const receipt = write(root, "proof/provider-receipt.pdf", Buffer.from("%PDF-1.7\nredacted receipt"));
const dbAudit = write(root, "proof/db-audit.json", Buffer.from(JSON.stringify({
  schemaVersion: "MATTHS_PAYMENT_DB_AUDIT_V1",
  result: "PASS",
  assertions: { entitlementCount: 1, duplicateLedgerCount: 0 },
}))); 
const testReport = write(root, "proof/test-report.json", Buffer.from(JSON.stringify({
  schemaVersion: "MATTHS_PAYMENT_BOUNDARY_TEST_V1",
  result: "PASS",
  assertions: { rejectedBeforeProviderCall: true },
})));
const artifactByType = {
  "db-audit": dbAudit,
  "provider-receipt": receipt,
  screenshot: png,
  "test-report": testReport,
  video,
};

function validSession() {
  return {
    schemaVersion: "MATTHS_PAYMENT_PRODUCTION_QA_SESSION_V1",
    baseURL: "https://matths.kr",
    observedAt: "2026-08-11T18:00:00+09:00",
    reviewer: "운영 검증자",
    webReleaseCommit: "a".repeat(40),
    synthetic: false,
    provider: {
      ...expectedProvider,
      publicClientKey: "live_ck_public_fixture_value",
      configurationArtifact: { type: "screenshot", ...png },
    },
    cases: requiredCases.map((id) => ({
      id,
      result: "PASS",
      notes: "비식별 운영 왕복을 확인함",
      artifacts: (artifactRequirements.get(id) || []).map((type) => ({
        type,
        ...artifactByType[type],
      })),
    })),
  };
}

const result = validate(validSession(), root);
assert.equal(result.schemaVersion, "MATTHS_PAYMENT_PRODUCTION_EVIDENCE_V1");
assert.equal(result.result, "PASS");
assert.equal(result.cases.length, requiredCases.length);
assert.equal(result.provider.environment, "live");
assert.equal(result.provider.publicClientKey, undefined);
assert.match(result.provider.publicClientKeySha256, /^[a-f0-9]{64}$/);

const missingCase = validSession();
missingCase.cases.pop();
assert.throws(() => validate(missingCase, root), /필수 결제 검증이 없습니다/);

const testEnvironment = validSession();
testEnvironment.provider.environment = "test";
assert.throws(() => validate(testEnvironment, root), /Toss environment는 live여야 합니다/);

const secret = validSession();
secret.provider.secretKey = "live_sk_must_not_be_recorded";
assert.throws(() => validate(secret, root), /비밀정보 또는 개인정보 필드/);

const emailLeak = validSession();
emailLeak.cases[0].notes = "student@example.com 계정으로 확인";
assert.throws(() => validate(emailLeak, root), /개인정보로 보이는 값/);

const missingDbAudit = validSession();
const consent = missingDbAudit.cases.find((row) => row.id === "student-minor-consent-recorded");
consent.artifacts = consent.artifacts.filter((artifact) => artifact.type !== "db-audit");
assert.throws(() => validate(missingDbAudit, root), /db-audit 증거가 없습니다/);

const forgedReceipt = validSession();
const success = forgedReceipt.cases.find((row) => row.id === "toss-success-exact-amount");
success.artifacts = success.artifacts.map((artifact) =>
  artifact.type === "provider-receipt" ? { type: "provider-receipt", ...testReport } : artifact);
assert.throws(() => validate(forgedReceipt, root), /비식별 PDF\/PNG\/JPEG/);

const generated = template();
assert.equal(generated.cases.length, requiredCases.length);
assert.ok(generated.cases.every((row) => row.result === "PENDING"));

console.log("payment production evidence test passed");
