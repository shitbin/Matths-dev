#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  evaluate,
  requiredExternalChecks,
  structuredEvidenceTemplates,
  template,
} = require("../scripts/finalReleaseReadiness");

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return String(result.stdout || "").trim();
}

function write(root, relative, body) {
  const filename = path.join(root, relative);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, body);
  return {
    file: relative,
    sha256: crypto.createHash("sha256").update(body).digest("hex"),
  };
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "matths-final-gate-"));
const root = path.join(temporary, "source");
const evidenceRoot = path.join(temporary, "evidence");
fs.mkdirSync(root);
fs.mkdirSync(evidenceRoot);
run("git", ["init"], root);
run("git", ["config", "user.email", "gate@example.invalid"], root);
run("git", ["config", "user.name", "Matths Gate"], root);
fs.writeFileSync(path.join(root, "README.md"), "candidate\n");
run("git", ["add", "README.md"], root);
run("git", ["commit", "-m", "candidate"], root);
const commit = run("git", ["rev-parse", "HEAD"], root);
const ipadRoot = path.join(temporary, "ipad-app");
fs.mkdirSync(ipadRoot);
run("git", ["init"], ipadRoot);
run("git", ["config", "user.email", "gate@example.invalid"], ipadRoot);
run("git", ["config", "user.name", "Matths Gate"], ipadRoot);
fs.writeFileSync(path.join(ipadRoot, "README.md"), "ipad candidate\n");
run("git", ["add", "README.md"], ipadRoot);
run("git", ["commit", "-m", "ipad candidate"], ipadRoot);
const ipadCommit = run("git", ["rev-parse", "HEAD"], ipadRoot);

const releaseArchive = write(evidenceRoot, "cafe24/release.tar.gz", Buffer.from("release"));
const releaseManifestBody = `${JSON.stringify({
  schemaVersion: "MATTHS_CAFE24_RELEASE_V1",
  release: { commit, file: "release.tar.gz", sha256: releaseArchive.sha256 },
})}\n`;
write(evidenceRoot, "cafe24/RELEASE-MANIFEST.json", releaseManifestBody);

const proof = write(evidenceRoot, "proof/check.json", Buffer.from('{"result":"PASS"}\n'));
const videoProof = write(evidenceRoot, "proof/check.mp4", Buffer.concat([
  Buffer.alloc(4), Buffer.from("ftypisom"), Buffer.from("video proof"),
]));
const legalProof = write(evidenceRoot, "proof/legal.pdf", Buffer.from("%PDF-1.7\nlegal proof"));
const ipaRoot = path.join(temporary, "ipa");
fs.mkdirSync(path.join(ipaRoot, "Payload", "Matths.app"), { recursive: true });
fs.writeFileSync(path.join(ipaRoot, "Payload", "Matths.app", "Info.plist"), "plist\n");
fs.writeFileSync(path.join(ipaRoot, "Payload", "Matths.app", "embedded.mobileprovision"), "profile\n");
fs.mkdirSync(path.join(evidenceRoot, "proof"), { recursive: true });
run("/usr/bin/zip", ["-qry", path.join(evidenceRoot, "proof", "Matths.ipa"), "Payload"], ipaRoot);
const signedProof = {
  file: "proof/Matths.ipa",
  sha256: crypto.createHash("sha256")
    .update(fs.readFileSync(path.join(evidenceRoot, "proof", "Matths.ipa"))).digest("hex"),
};
const reviewProof = write(evidenceRoot, "proof/review.json", `${JSON.stringify({
  schemaVersion: "MATTHS_DESIGN_INDEPENDENT_REVIEW_V1",
  result: "PASS",
  independentReviewer: true,
  webCommit: commit,
  ipadCommit,
})}\n`);
const cafe24Receipt = write(evidenceRoot, "proof/cafe24-receipt.json", `${JSON.stringify({
  schemaVersion: "MATTHS_CAFE24_DEPLOYMENT_RECEIPT_V1",
  result: "PASS",
  provider: "Cafe24",
  environment: "production",
  baseURL: "https://matths.kr",
  deployedCommit: commit,
})}\n`);
const atlasTargetFingerprint = "a".repeat(64);
const atlasBackupReference = "atlas-test-backup";
const atlasMigrationSource = write(evidenceRoot, "proof/atlas-migration-apply.json", `${JSON.stringify({
  schemaVersion: "MATTHS_ACCESS_CYCLE_MIGRATION_RUN_V1", result: "PASS",
  environment: "production", mode: "apply", sourceCommit: commit,
  targetFingerprint: atlasTargetFingerprint, migratedRecords: 0, stampedExistingRecords: 0,
  verifiedTargetCount: 0, conflictCount: 0, missingCount: 0, unstampedCount: 0,
  observedAt: "2026-08-12T11:00:00.000Z",
})}\n`);
const atlasIndexSource = write(evidenceRoot, "proof/atlas-index-cleanup-apply.json", `${JSON.stringify({
  schemaVersion: "MATTHS_AUTHORITY_INDEX_CLEANUP_RUN_V1", result: "PASS",
  environment: "production", mode: "apply", sourceCommit: commit,
  targetFingerprint: atlasTargetFingerprint, droppedIndexCount: 0,
  remainingRemovableCount: 0, fingerprintMismatchCount: 0, legacyBlockedCollectionCount: 0,
  observedAt: "2026-08-12T11:10:00.000Z",
})}\n`);
const atlasBackupSource = write(evidenceRoot, "proof/atlas-backup-receipt.json", `${JSON.stringify({
  schemaVersion: "MATTHS_ATLAS_BACKUP_RECEIPT_V1", result: "PASS",
  environment: "production", provider: "MongoDB Atlas",
  targetFingerprint: atlasTargetFingerprint, backupReference: atlasBackupReference,
  observedAt: "2026-08-12T10:00:00.000Z",
})}\n`);
const atlasRollbackSource = write(evidenceRoot, "proof/atlas-rollback-drill.json", `${JSON.stringify({
  schemaVersion: "MATTHS_ATLAS_ROLLBACK_DRILL_V1", result: "PASS",
  environment: "isolated-recovery", sourceEnvironment: "production", provider: "MongoDB Atlas",
  targetFingerprint: atlasTargetFingerprint, backupReference: atlasBackupReference,
  restoreTarget: "isolated-test-restore", rollbackVerified: true,
  observedAt: "2026-08-12T11:20:00.000Z",
})}\n`);
const atlasAudit = write(evidenceRoot, "proof/atlas-audit.json", `${JSON.stringify({
  schemaVersion: "MATTHS_ATLAS_MIGRATION_EVIDENCE_V1",
  result: "PASS",
  environment: "production",
  mode: "apply",
  sourceCommit: commit,
  targetFingerprint: atlasTargetFingerprint,
  migratedRecords: 0,
  stampedExistingRecords: 0,
  verifiedTargetCount: 0,
  droppedStaleIndexes: 0,
  rollbackVerified: true,
  backupReference: atlasBackupReference,
  restoreTarget: "isolated-test-restore",
  observedAt: "2026-08-12T11:20:00.000Z",
  sources: {
    migration: { file: path.basename(atlasMigrationSource.file), sha256: atlasMigrationSource.sha256 },
    indexCleanup: { file: path.basename(atlasIndexSource.file), sha256: atlasIndexSource.sha256 },
    backup: { file: path.basename(atlasBackupSource.file), sha256: atlasBackupSource.sha256 },
    rollback: { file: path.basename(atlasRollbackSource.file), sha256: atlasRollbackSource.sha256 },
  },
})}\n`);
const appStoreReceipt = write(evidenceRoot, "proof/app-store-receipt.json", `${JSON.stringify({
  schemaVersion: "MATTHS_APP_STORE_SUBMISSION_RECEIPT_V1",
  result: "PASS",
  provider: "App Store Connect",
  environment: "production",
  ipadCommit,
  uploadId: "test-upload-id",
})}\n`);
const googleProof = write(evidenceRoot, "proof/google.json", `${JSON.stringify({
  schemaVersion: "MATTHS_GOOGLE_OAUTH_PRODUCTION_EVIDENCE_V1",
  result: "PASS",
  cases: [
    "web-existing-account", "web-new-account", "web-cancel", "web-retry",
    "ipad-existing-account", "ipad-new-account", "ipad-cancel", "ipad-retry", "ipad-app-return",
  ].map((id) => ({ id, result: "PASS" })),
})}\n`);
const deviceProof = write(evidenceRoot, "proof/device.json", `${JSON.stringify({
  schemaVersion: "MATTHS_IPAD_DEVICE_QA_EVIDENCE_V1",
  result: "PASS",
  scenarios: [
    "install-launch", "protected-recording-mirroring", "screenshot-watermark-integrity",
    "arena-cross-platform", "placement-rank-badge", "nine-tier-motion-sound",
    "curriculum-long-title-lock-time", "keyboard-pencil-toolbar", "math-typesetting-voiceover",
    "background-jetsam-recovery", "model-download-resume-storage", "voiceover-order",
    "dynamic-type-ax5", "webview-zoom-200", "reduce-motion-runtime", "split-view-320",
    "stage-manager-resize", "stuck-point-cross-device", "account-progress-reset-roundtrip",
  ].map((id) => ({ id, result: "PASS" })),
})}\n`);
const paymentProof = write(evidenceRoot, "proof/payment.json", `${JSON.stringify({
  schemaVersion: "MATTHS_PAYMENT_PRODUCTION_EVIDENCE_V1",
  result: "PASS",
  baseURL: "https://matths.kr",
  provider: { name: "Toss Payments", environment: "live" },
  cases: [
    "student-minor-notice-required", "student-minor-consent-recorded",
    "parent-linked-child-order", "parent-guardian-consent-required",
    "toss-success-exact-amount", "toss-cancel-or-failure",
    "toss-amount-tamper-rejected", "toss-webhook-requery",
    "toss-webhook-replay-idempotent", "entitlement-granted-once",
    "checkout-disabled-fail-closed",
  ].map((id) => ({ id, result: "PASS" })),
})}\n`);
const appStoreAuditProof = write(evidenceRoot, "proof/ipad-release-audit.json", `${JSON.stringify({
  schemaVersion: "MATTHS_IPAD_RELEASE_AUDIT_V1",
  result: "PASS",
  appStoreEligible: true,
  source: { commit: ipadCommit, trackedWorkingTreeClean: true },
  build: { signing: "app-store-distribution" },
  signedArchive: { file: path.basename(signedProof.file), sha256: signedProof.sha256 },
})}\n`);
const ipadIds = new Set([
  "ipad-physical-install", "protected-content-device", "arena-cross-platform",
  "placement-badge-device", "rank-motion-performance", "curriculum-device",
  "math-pencil-device", "background-recovery-device", "accessibility-device",
  "split-stage-keyboard-device",
]);
const typeRequirements = {
  "web-five-width": ["screenshot-manifest"],
  "design-independent-approval": ["review-report"],
  "cafe24-production-deploy": ["provider-receipt"],
  "google-web-roundtrip": ["test-report", "video"],
  "google-ipad-roundtrip": ["test-report", "video"],
  "ipad-physical-install": ["test-report", "device-log"],
  "protected-content-device": ["test-report", "video"],
  "arena-cross-platform": ["test-report", "video", "device-log"],
  "placement-badge-device": ["test-report", "video", "device-log"],
  "rank-motion-performance": ["test-report", "video", "device-log"],
  "curriculum-device": ["test-report", "video"],
  "math-pencil-device": ["test-report", "video"],
  "background-recovery-device": ["test-report", "video", "device-log"],
  "accessibility-device": ["test-report", "video"],
  "split-stage-keyboard-device": ["test-report", "video"],
  "toss-production-transaction": ["provider-receipt", "test-report"],
  "parent-consent-production": ["provider-receipt", "test-report"],
  "kice-rights": ["legal-document"],
  "atlas-migration": ["db-audit"],
  "app-store-submission": ["signed-archive", "provider-receipt", "test-report"],
};
const externalChecks = requiredExternalChecks.map((id) => ({
  id,
  result: "PASS",
  observedAt: "2026-08-11T12:00:00+09:00",
  reviewer: "test reviewer",
  artifacts: (typeRequirements[id] || ["test-report"]).map((type) => {
    let artifact = proof;
    if (type === "video") artifact = videoProof;
    if (type === "legal-document") artifact = legalProof;
    if (type === "signed-archive") artifact = signedProof;
    if (type === "review-report") artifact = reviewProof;
    if (type === "provider-receipt" && id === "cafe24-production-deploy") artifact = cafe24Receipt;
    if (type === "provider-receipt" && id === "app-store-submission") artifact = appStoreReceipt;
    if (type === "db-audit" && id === "atlas-migration") artifact = atlasAudit;
    if (type === "test-report" && id.startsWith("google-")) artifact = googleProof;
    if (type === "test-report" && ipadIds.has(id)) artifact = deviceProof;
    if (type === "test-report" && ["toss-production-transaction", "parent-consent-production"].includes(id)) {
      artifact = paymentProof;
    }
    if (type === "test-report" && id === "app-store-submission") artifact = appStoreAuditProof;
    return { type, ...artifact };
  }),
}));
function localAiDevice(tier) {
  const isVision = tier === "vision3B";
  const sourceBody = `${JSON.stringify({ event: isVision ? "vision-complete" : "reasoning-complete" })}\n`;
  const source = write(evidenceRoot, `ipad/${tier}.jsonl`, sourceBody);
  const body = `${JSON.stringify({
    schema: isVision ? "MATTHS_VISION_DEVICE_EVIDENCE_V1" : "MATTHS_REASONING_DEVICE_EVIDENCE_V1",
    result: "PASS",
    tier,
    model: `${tier}-model`,
    metrics: {
      loadMs: 1000,
      [isVision ? "inferenceMs" : "reasoningMs"]: 2000,
      generatedTokens: 10,
      tokensPerSecond: 5,
    },
    source: { file: path.basename(source.file), sha256: source.sha256 },
  })}\n`;
  return { tier, type: "device-log", ...write(evidenceRoot, `ipad/${tier}.json`, body) };
}
const pilotBody = `${JSON.stringify({
  schemaVersion: "MATTHS_LOCAL_AI_PILOT_GATE_V1",
  result: "PASS",
  checks: [{ pass: true }],
})}\n`;
const pilot = { type: "test-report", ...write(evidenceRoot, "ai/pilot.json", pilotBody) };
const manifest = {
  schemaVersion: "MATTHS_FINAL_RELEASE_EVIDENCE_V1",
  candidate: {
    webCommit: commit,
    ipadCommit,
    cafe24ReleaseManifest: "cafe24/RELEASE-MANIFEST.json",
    cafe24ReleaseArchive: releaseArchive.file,
  },
  externalChecks,
  visionEvidence: [localAiDevice("vision3B"), localAiDevice("deepseek7B")],
  localAiPilotGate: pilot,
};

const result = evaluate(manifest, evidenceRoot, root);
assert.equal(result.result, "PASS");
assert.equal(result.ipad.commit, ipadCommit);
assert.equal(result.externalChecks.length, requiredExternalChecks.length);
assert.deepEqual(result.visionEvidence.map((row) => row.tier).sort(), ["deepseek7B", "vision3B"]);

const missing = structuredClone(manifest);
missing.externalChecks = missing.externalChecks.filter((row) => row.id !== "ipad-physical-install");
assert.throws(() => evaluate(missing, evidenceRoot, root), /필수 외부 검증이 없습니다/);

const tampered = structuredClone(manifest);
tampered.externalChecks[0].artifacts[0].sha256 = "0".repeat(64);
assert.throws(() => evaluate(tampered, evidenceRoot, root), /SHA-256이 다릅니다/);

const pending = structuredClone(manifest);
pending.externalChecks[0].result = "PENDING";
assert.throws(() => evaluate(pending, evidenceRoot, root), /PASS 증거가 아닙니다/);

const wrongIpadCommit = structuredClone(manifest);
wrongIpadCommit.candidate.ipadCommit = "0".repeat(40);
assert.throws(() => evaluate(wrongIpadCommit, evidenceRoot, root), /iPad HEAD/);

const wrongReasoningSchema = structuredClone(manifest);
const deepseekArtifact = wrongReasoningSchema.visionEvidence.find((row) => row.tier === "deepseek7B");
const wrongReasoning = write(evidenceRoot, "ipad/deepseek-wrong.json", `${JSON.stringify({
  schema: "MATTHS_VISION_DEVICE_EVIDENCE_V1",
  result: "PASS",
  tier: "deepseek7B",
  model: "wrong",
  metrics: { loadMs: 1, reasoningMs: 1, generatedTokens: 1, tokensPerSecond: 1 },
  source: { file: "deepseek7B.jsonl", sha256: wrongReasoningSchema.visionEvidence.find((row) => row.tier === "deepseek7B").sha256 },
})}\n`);
Object.assign(deepseekArtifact, wrongReasoning);
assert.throws(() => evaluate(wrongReasoningSchema, evidenceRoot, root), /MATTHS_REASONING_DEVICE_EVIDENCE_V1/);

const wrongDeviceReport = structuredClone(manifest);
wrongDeviceReport.externalChecks.find((row) => row.id === "accessibility-device")
  .artifacts = [{ type: "video", ...videoProof }, { type: "test-report", ...proof }];
assert.throws(
  () => evaluate(wrongDeviceReport, evidenceRoot, root),
  /MATTHS_IPAD_DEVICE_QA_EVIDENCE_V1 PASS 보고서가 없습니다/,
);

const fakeVideo = structuredClone(manifest);
const fakeVideoRow = fakeVideo.externalChecks.find((row) => row.id === "rank-motion-performance");
fakeVideoRow.artifacts = fakeVideoRow.artifacts.map((artifact) =>
  artifact.type === "video" ? { type: "video", ...proof } : artifact);
assert.throws(() => evaluate(fakeVideo, evidenceRoot, root), /MP4\/MOV video 파일이 아닙니다/);

const unrelatedIpaAudit = structuredClone(manifest);
const unrelatedAuditDocument = {
  schemaVersion: "MATTHS_IPAD_RELEASE_AUDIT_V1",
  result: "PASS",
  appStoreEligible: true,
  source: { commit: ipadCommit, trackedWorkingTreeClean: true },
  build: { signing: "app-store-distribution" },
  signedArchive: { file: "Other.ipa", sha256: "0".repeat(64) },
};
const unrelatedAudit = write(evidenceRoot, "proof/unrelated-ipad-release-audit.json",
  `${JSON.stringify(unrelatedAuditDocument)}\n`);
const unrelatedRow = unrelatedIpaAudit.externalChecks.find((row) => row.id === "app-store-submission");
unrelatedRow.artifacts = unrelatedRow.artifacts.map((artifact) =>
  artifact.type === "test-report" ? { type: "test-report", ...unrelatedAudit } : artifact);
assert.throws(() => evaluate(unrelatedIpaAudit, evidenceRoot, root), /Release 감사 보고서와 제출 IPA가 다릅니다/);

const fakeCafe24Receipt = structuredClone(manifest);
const cafe24Row = fakeCafe24Receipt.externalChecks.find((row) => row.id === "cafe24-production-deploy");
cafe24Row.artifacts = [{ type: "provider-receipt", ...proof }];
assert.throws(() => evaluate(fakeCafe24Receipt, evidenceRoot, root), /MATTHS_CAFE24_DEPLOYMENT_RECEIPT_V1/);

const missingPaymentCase = structuredClone(manifest);
const incompletePayment = write(evidenceRoot, "proof/payment-incomplete.json", `${JSON.stringify({
  schemaVersion: "MATTHS_PAYMENT_PRODUCTION_EVIDENCE_V1",
  result: "PASS",
  baseURL: "https://matths.kr",
  provider: { name: "Toss Payments", environment: "live" },
  cases: [{ id: "toss-success-exact-amount", result: "PASS" }],
})}\n`);
const paymentRow = missingPaymentCase.externalChecks.find((row) => row.id === "toss-production-transaction");
paymentRow.artifacts = paymentRow.artifacts.map((artifact) =>
  artifact.type === "test-report" ? { type: "test-report", ...incompletePayment } : artifact);
assert.throws(() => evaluate(missingPaymentCase, evidenceRoot, root), /결제 운영 시나리오가 없습니다/);

const generated = template();
assert.equal(generated.externalChecks.length, requiredExternalChecks.length);
assert.ok(generated.externalChecks.every((row) => row.result === "PENDING"));
const structured = structuredEvidenceTemplates();
assert.deepEqual(Object.keys(structured).sort(), [
  "app-store-submission-receipt.json",
  "atlas-migration-evidence.json",
  "cafe24-deployment-receipt.json",
  "design-independent-review.json",
]);
assert.ok(Object.values(structured).every((document) => document.result === "PENDING"));

console.log("final release readiness gate test passed");
