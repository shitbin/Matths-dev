#!/usr/bin/env node

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { validateAndCreate: validateAtlasEvidence } = require("./createAtlasMigrationEvidence");
const { resolveIpadRoot } = require("./resolveIpadWorkspace");

const repoRoot = path.resolve(__dirname, "..");
const requiredExternalChecks = [
  "web-five-width",
  "design-independent-approval",
  "cafe24-production-deploy",
  "google-web-roundtrip",
  "google-ipad-roundtrip",
  "ipad-physical-install",
  "protected-content-device",
  "arena-cross-platform",
  "placement-badge-device",
  "rank-motion-performance",
  "curriculum-device",
  "math-pencil-device",
  "background-recovery-device",
  "accessibility-device",
  "split-stage-keyboard-device",
  "toss-production-transaction",
  "parent-consent-production",
  "kice-rights",
  "atlas-migration",
  "app-store-submission",
];
const allowedArtifactTypes = new Set([
  "db-audit",
  "device-log",
  "legal-document",
  "provider-receipt",
  "review-report",
  "screenshot-manifest",
  "signed-archive",
  "test-report",
  "video",
]);
const requiredReportSchemas = new Map([
  ["google-web-roundtrip", "MATTHS_GOOGLE_OAUTH_PRODUCTION_EVIDENCE_V1"],
  ["google-ipad-roundtrip", "MATTHS_GOOGLE_OAUTH_PRODUCTION_EVIDENCE_V1"],
  ["toss-production-transaction", "MATTHS_PAYMENT_PRODUCTION_EVIDENCE_V1"],
  ["parent-consent-production", "MATTHS_PAYMENT_PRODUCTION_EVIDENCE_V1"],
  ["app-store-submission", "MATTHS_IPAD_RELEASE_AUDIT_V1"],
]);
const requiredStructuredEvidence = new Map([
  ["design-independent-approval", "MATTHS_DESIGN_INDEPENDENT_REVIEW_V1"],
  ["cafe24-production-deploy", "MATTHS_CAFE24_DEPLOYMENT_RECEIPT_V1"],
  ["atlas-migration", "MATTHS_ATLAS_MIGRATION_EVIDENCE_V1"],
  ["app-store-submission", "MATTHS_APP_STORE_SUBMISSION_RECEIPT_V1"],
]);
const requiredArtifactTypes = new Map([
  ["web-five-width", ["screenshot-manifest"]],
  ["design-independent-approval", ["review-report"]],
  ["cafe24-production-deploy", ["provider-receipt"]],
  ["google-web-roundtrip", ["test-report", "video"]],
  ["google-ipad-roundtrip", ["test-report", "video"]],
  ["ipad-physical-install", ["test-report", "device-log"]],
  ["protected-content-device", ["test-report", "video"]],
  ["arena-cross-platform", ["test-report", "video", "device-log"]],
  ["placement-badge-device", ["test-report", "video", "device-log"]],
  ["rank-motion-performance", ["test-report", "video", "device-log"]],
  ["curriculum-device", ["test-report", "video"]],
  ["math-pencil-device", ["test-report", "video"]],
  ["background-recovery-device", ["test-report", "video", "device-log"]],
  ["accessibility-device", ["test-report", "video"]],
  ["split-stage-keyboard-device", ["test-report", "video"]],
  ["toss-production-transaction", ["provider-receipt", "test-report"]],
  ["parent-consent-production", ["provider-receipt", "test-report"]],
  ["kice-rights", ["legal-document"]],
  ["atlas-migration", ["db-audit"]],
  ["app-store-submission", ["signed-archive", "provider-receipt", "test-report"]],
]);
const localAiDeviceRequirements = new Map([
  ["vision3B", {
    schema: "MATTHS_VISION_DEVICE_EVIDENCE_V1",
    durationMetric: "inferenceMs",
  }],
  ["deepseek7B", {
    schema: "MATTHS_REASONING_DEVICE_EVIDENCE_V1",
    durationMetric: "reasoningMs",
  }],
]);
const deviceScenarioRequirements = new Map([
  ["ipad-physical-install", ["install-launch"]],
  ["protected-content-device", [
    "protected-recording-mirroring", "screenshot-watermark-integrity", "stuck-point-cross-device",
  ]],
  ["arena-cross-platform", ["arena-cross-platform"]],
  ["placement-badge-device", ["placement-rank-badge"]],
  ["rank-motion-performance", ["nine-tier-motion-sound"]],
  ["curriculum-device", ["curriculum-long-title-lock-time", "account-progress-reset-roundtrip"]],
  ["math-pencil-device", ["keyboard-pencil-toolbar", "math-typesetting-voiceover"]],
  ["background-recovery-device", ["background-jetsam-recovery", "model-download-resume-storage"]],
  ["accessibility-device", ["voiceover-order", "dynamic-type-ax5", "webview-zoom-200", "reduce-motion-runtime"]],
  ["split-stage-keyboard-device", ["split-view-320", "stage-manager-resize", "keyboard-pencil-toolbar"]],
]);
const googleCaseRequirements = new Map([
  ["google-web-roundtrip", ["web-existing-account", "web-new-account", "web-cancel", "web-retry"]],
  ["google-ipad-roundtrip", ["ipad-existing-account", "ipad-new-account", "ipad-cancel", "ipad-retry", "ipad-app-return"]],
]);
const paymentCaseRequirements = new Map([
  ["toss-production-transaction", [
    "toss-success-exact-amount",
    "toss-cancel-or-failure",
    "toss-amount-tamper-rejected",
    "toss-webhook-requery",
    "toss-webhook-replay-idempotent",
    "entitlement-granted-once",
    "checkout-disabled-fail-closed",
  ]],
  ["parent-consent-production", [
    "student-minor-notice-required",
    "student-minor-consent-recorded",
    "parent-linked-child-order",
    "parent-guardian-consent-required",
  ]],
]);

function sha256(filename) {
  return crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
}

function resolveEvidenceFile(evidenceRoot, filename) {
  const root = path.resolve(evidenceRoot);
  const resolved = path.resolve(root, String(filename || ""));
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`증거 폴더 밖의 파일은 허용하지 않습니다: ${filename}`);
  }
  return resolved;
}

function git(args, root = repoRoot) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} 실패\n${result.stderr || result.stdout}`);
  }
  return String(result.stdout || "").trim();
}

function validateArtifactShape(type, filename, label) {
  const header = fs.readFileSync(filename).subarray(0, 16);
  const extension = path.extname(filename).toLowerCase();
  if (type === "video" && header.toString("ascii", 4, 8) !== "ftyp") {
    throw new Error(`${label}: MP4/MOV video 파일이 아닙니다.`);
  }
  if (type === "signed-archive" && !(header[0] === 0x50 && header[1] === 0x4b)) {
    throw new Error(`${label}: ZIP/IPA signed archive가 아닙니다.`);
  }
  if (type === "signed-archive") {
    const result = spawnSync("/usr/bin/unzip", ["-Z1", filename], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(`${label}: 열 수 있는 IPA가 아닙니다.`);
    const entries = String(result.stdout || "").split("\n").filter(Boolean);
    const app = entries.find((entry) => /^Payload\/[^/]+\.app\/$/.test(entry));
    if (!app || !entries.includes(`${app}Info.plist`) || !entries.includes(`${app}embedded.mobileprovision`)) {
      throw new Error(`${label}: IPA Payload의 앱·Info.plist·프로비저닝 파일이 없습니다.`);
    }
  }
  if (type === "legal-document" && header.toString("ascii", 0, 4) !== "%PDF") {
    throw new Error(`${label}: PDF 법적 문서가 아닙니다.`);
  }
  if (type === "screenshot-manifest" || type === "db-audit" || type === "device-log" ||
      type === "test-report") {
    if (![".json", ".jsonl"].includes(extension)) {
      throw new Error(`${label}: ${type}는 JSON/JSONL이어야 합니다.`);
    }
    if (extension === ".json") {
      try { JSON.parse(fs.readFileSync(filename, "utf8")); }
      catch { throw new Error(`${label}: 올바른 JSON이 아닙니다.`); }
    }
  }
  if (type === "review-report" && ![".md", ".pdf", ".json"].includes(extension)) {
    throw new Error(`${label}: review-report는 MD/PDF/JSON이어야 합니다.`);
  }
}

function validateArtifact(artifact, evidenceRoot, label) {
  if (!allowedArtifactTypes.has(artifact?.type)) {
    throw new Error(`${label}: 허용하지 않는 증거 종류입니다: ${artifact?.type || "없음"}`);
  }
  if (!/^[a-f0-9]{64}$/i.test(String(artifact.sha256 || ""))) {
    throw new Error(`${label}: SHA-256이 없거나 올바르지 않습니다.`);
  }
  const filename = resolveEvidenceFile(evidenceRoot, artifact.file);
  if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
    throw new Error(`${label}: 증거 파일이 없습니다: ${artifact.file}`);
  }
  const actual = sha256(filename);
  if (actual !== artifact.sha256.toLowerCase()) {
    throw new Error(`${label}: 증거 파일 SHA-256이 다릅니다: ${artifact.file}`);
  }
  validateArtifactShape(artifact.type, filename, label);
  return { file: artifact.file, type: artifact.type, sha256: actual };
}

function validateResponsiveScreenshotManifest(artifact, evidenceRoot, candidate) {
  const filename = resolveEvidenceFile(evidenceRoot, artifact.file);
  const document = JSON.parse(fs.readFileSync(filename, "utf8"));
  if (document.schema !== "MATTHS_RESPONSIVE_EVIDENCE_V2") {
    throw new Error("web-five-width: MATTHS_RESPONSIVE_EVIDENCE_V2 manifest가 아닙니다.");
  }
  if (document.sourceCommit !== candidate.webCommit || document.trackedWorkingTreeClean !== true) {
    throw new Error("web-five-width: 캡처 소스가 최종 웹 커밋의 깨끗한 작업본이 아닙니다.");
  }
  if (document.captureDriver !== "cdp") {
    throw new Error("web-five-width: 승인 캡처는 CDP driver여야 합니다.");
  }
  const expectedCount = Number(document.pageCount) * (Array.isArray(document.widths)
    ? document.widths.length
    : 0);
  if (!(expectedCount > 0) || document.captureCount !== expectedCount ||
      document.failureCount !== 0 || !Array.isArray(document.captures) ||
      document.captures.length !== expectedCount) {
    throw new Error("web-five-width: 캡처 수 또는 실패 수가 manifest와 맞지 않습니다.");
  }
  const invalid = document.captures.find((capture) =>
    capture.ok !== true || capture.driver !== "cdp" || capture.viewportVerified !== true ||
    capture.documentStatusOk !== true || capture.horizontalOverflow === true ||
    capture.intrinsicOverflow === true || capture.authenticationFailure === true ||
    capture.pageFailure === true || !String(capture.fullPageFile || "").trim());
  if (invalid) {
    throw new Error(`web-five-width: 승인 불가 캡처가 있습니다: ${invalid.slug || "unknown"}`);
  }
  const manifestDirectory = path.dirname(filename);
  for (const capture of document.captures) {
    for (const key of ["file", "fullPageFile"]) {
      const relative = String(capture[key] || "");
      const resolved = path.resolve(manifestDirectory, relative);
      if (!relative || !resolved.startsWith(`${manifestDirectory}${path.sep}`) ||
          !fs.existsSync(resolved) || !fs.statSync(resolved).isFile() ||
          fs.statSync(resolved).size === 0) {
        throw new Error(`web-five-width: ${capture.slug || "unknown"}의 ${key} 증거가 없습니다.`);
      }
    }
  }
}

function validateExternalChecks(manifest, evidenceRoot, candidate) {
  const rows = Array.isArray(manifest.externalChecks) ? manifest.externalChecks : [];
  const byId = new Map();
  for (const row of rows) {
    if (byId.has(row.id)) throw new Error(`외부 검증 ID가 중복됩니다: ${row.id}`);
    byId.set(row.id, row);
  }
  const output = [];
  for (const id of requiredExternalChecks) {
    const row = byId.get(id);
    if (!row) throw new Error(`필수 외부 검증이 없습니다: ${id}`);
    if (row.result !== "PASS") throw new Error(`${id}: PASS 증거가 아닙니다.`);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(String(row.observedAt || ""))) {
      throw new Error(`${id}: observedAt이 없습니다.`);
    }
    if (!String(row.reviewer || "").trim()) throw new Error(`${id}: 검증자 기록이 없습니다.`);
    if (!Array.isArray(row.artifacts) || row.artifacts.length === 0) {
      throw new Error(`${id}: 독립 증거 파일이 없습니다.`);
    }
    const artifacts = row.artifacts.map((artifact, index) =>
      validateArtifact(artifact, evidenceRoot, `${id}.artifacts[${index}]`));
    const artifactTypes = new Set(artifacts.map((artifact) => artifact.type));
    for (const type of requiredArtifactTypes.get(id) || []) {
      if (!artifactTypes.has(type)) throw new Error(`${id}: ${type} 증거가 없습니다.`);
    }
    if (id === "web-five-width") {
      const screenshotManifest = artifacts.find((artifact) => artifact.type === "screenshot-manifest");
      validateResponsiveScreenshotManifest(screenshotManifest, evidenceRoot, candidate);
    }
    const requiredSchema = requiredReportSchemas.get(id);
    if (requiredSchema) {
      const matchingReport = artifacts.find((artifact) => {
        if (artifact.type !== "test-report") return false;
        try {
          const document = JSON.parse(
            fs.readFileSync(resolveEvidenceFile(evidenceRoot, artifact.file), "utf8"),
          );
          return document.schemaVersion === requiredSchema && document.result === "PASS";
        } catch {
          return false;
        }
      });
      if (!matchingReport) throw new Error(`${id}: ${requiredSchema} PASS 보고서가 없습니다.`);
    }
    const reports = artifacts
      .filter((artifact) => artifact.type === "test-report")
      .map((artifact) => {
        try {
          return JSON.parse(fs.readFileSync(resolveEvidenceFile(evidenceRoot, artifact.file), "utf8"));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    const structuredSchema = requiredStructuredEvidence.get(id);
    if (structuredSchema) {
      const structuredArtifact = artifacts
        .filter((artifact) => ["review-report", "provider-receipt", "db-audit"].includes(artifact.type))
        .map((artifact) => {
          try {
            return {
              artifact,
              document: JSON.parse(
                fs.readFileSync(resolveEvidenceFile(evidenceRoot, artifact.file), "utf8"),
              ),
            };
          } catch {
            return null;
          }
        })
        .find((entry) => entry?.document?.schemaVersion === structuredSchema && entry.document.result === "PASS");
      if (!structuredArtifact) throw new Error(`${id}: ${structuredSchema} PASS 증거가 없습니다.`);
      const structured = structuredArtifact.document;
      if (id === "design-independent-approval") {
        if (structured.independentReviewer !== true || structured.webCommit !== candidate.webCommit ||
            structured.ipadCommit !== candidate.ipadCommit) {
          throw new Error(`${id}: 독립 검수자·최종 웹/iPad 커밋 결합이 올바르지 않습니다.`);
        }
      }
      if (id === "cafe24-production-deploy") {
        if (structured.provider !== "Cafe24" || structured.environment !== "production" ||
            structured.baseURL !== "https://matths.kr" || structured.deployedCommit !== candidate.webCommit) {
          throw new Error(`${id}: Cafe24 운영 배포 대상과 최종 웹 커밋이 다릅니다.`);
        }
      }
      if (id === "atlas-migration") {
        if (structured.environment !== "production" || structured.mode !== "apply" ||
            structured.rollbackVerified !== true || !(Number(structured.migratedRecords) >= 0) ||
            structured.sourceCommit !== candidate.webCommit ||
            !/^[a-f0-9]{64}$/i.test(String(structured.targetFingerprint || "")) ||
            !String(structured.backupReference || "").trim() ||
            !String(structured.restoreTarget || "").trim()) {
          throw new Error(`${id}: 운영 apply·롤백·이전 건수 증거가 불완전합니다.`);
        }
        const structuredFile = resolveEvidenceFile(evidenceRoot, structuredArtifact.artifact.file);
        const structuredDirectory = path.dirname(structuredFile);
        const atlasSources = {};
        for (const sourceName of ["migration", "indexCleanup", "backup", "rollback"]) {
          const source = structured.sources?.[sourceName];
          if (!source || !/^[a-f0-9]{64}$/i.test(String(source.sha256 || ""))) {
            throw new Error(`${id}: ${sourceName} 원본 보고서 해시가 없습니다.`);
          }
          const sourceFile = path.resolve(structuredDirectory, String(source.file || ""));
          if (!sourceFile.startsWith(`${structuredDirectory}${path.sep}`) ||
              !fs.existsSync(sourceFile) || sha256(sourceFile) !== source.sha256.toLowerCase()) {
            throw new Error(`${id}: ${sourceName} 원본 보고서가 없거나 해시가 다릅니다.`);
          }
          atlasSources[sourceName] = {
            resolved: sourceFile,
            document: JSON.parse(fs.readFileSync(sourceFile, "utf8")),
          };
        }
        const rebuilt = validateAtlasEvidence(atlasSources, structuredDirectory);
        for (const key of [
          "sourceCommit", "targetFingerprint", "migratedRecords", "stampedExistingRecords",
          "verifiedTargetCount", "droppedStaleIndexes", "backupReference", "restoreTarget", "observedAt",
        ]) {
          if (rebuilt[key] !== structured[key]) {
            throw new Error(`${id}: 원본 보고서에서 다시 계산한 ${key} 값이 다릅니다.`);
          }
        }
      }
      if (id === "app-store-submission") {
        if (structured.provider !== "App Store Connect" || structured.environment !== "production" ||
            structured.ipadCommit !== candidate.ipadCommit || !String(structured.uploadId || "").trim()) {
          throw new Error(`${id}: App Store Connect 제출 영수증이 최종 iPad 커밋과 다릅니다.`);
        }
      }
    }
    const requiredDeviceScenarios = deviceScenarioRequirements.get(id);
    if (requiredDeviceScenarios) {
      const deviceReport = reports.find((document) =>
        document.schemaVersion === "MATTHS_IPAD_DEVICE_QA_EVIDENCE_V1" && document.result === "PASS");
      if (!deviceReport) throw new Error(`${id}: MATTHS_IPAD_DEVICE_QA_EVIDENCE_V1 PASS 보고서가 없습니다.`);
      const passed = new Set((deviceReport.scenarios || [])
        .filter((scenario) => scenario.result === "PASS")
        .map((scenario) => scenario.id));
      const missing = requiredDeviceScenarios.filter((scenario) => !passed.has(scenario));
      if (missing.length) throw new Error(`${id}: 실기 시나리오가 없습니다: ${missing.join(", ")}`);
    }
    const requiredGoogleCases = googleCaseRequirements.get(id);
    if (requiredGoogleCases) {
      const googleReport = reports.find((document) =>
        document.schemaVersion === "MATTHS_GOOGLE_OAUTH_PRODUCTION_EVIDENCE_V1" && document.result === "PASS");
      const passed = new Set((googleReport?.cases || [])
        .filter((item) => item.result === "PASS")
        .map((item) => item.id));
      const missing = requiredGoogleCases.filter((item) => !passed.has(item));
      if (missing.length) throw new Error(`${id}: Google 왕복 시나리오가 없습니다: ${missing.join(", ")}`);
    }
    const requiredPaymentCases = paymentCaseRequirements.get(id);
    if (requiredPaymentCases) {
      const paymentReport = reports.find((document) =>
        document.schemaVersion === "MATTHS_PAYMENT_PRODUCTION_EVIDENCE_V1" &&
        document.result === "PASS" && document.baseURL === "https://matths.kr" &&
        document.provider?.name === "Toss Payments" && document.provider?.environment === "live");
      if (!paymentReport) {
        throw new Error(`${id}: Toss live 운영 결제 PASS 보고서가 없습니다.`);
      }
      const passed = new Set((paymentReport.cases || [])
        .filter((item) => item.result === "PASS")
        .map((item) => item.id));
      const missing = requiredPaymentCases.filter((item) => !passed.has(item));
      if (missing.length) throw new Error(`${id}: 결제 운영 시나리오가 없습니다: ${missing.join(", ")}`);
    }
    if (id === "app-store-submission") {
      const releaseAudit = reports.find((document) =>
        document.schemaVersion === "MATTHS_IPAD_RELEASE_AUDIT_V1" &&
        document.result === "PASS" &&
        document.appStoreEligible === true);
      if (!releaseAudit) {
        throw new Error("app-store-submission: App Store 배포 서명 PASS 감사가 없습니다.");
      }
      if (
        releaseAudit.source?.commit !== candidate.ipadCommit ||
        releaseAudit.source?.trackedWorkingTreeClean !== true
      ) {
        throw new Error("app-store-submission: iPad 감사 소스가 최종 후보 커밋과 다릅니다.");
      }
      if (releaseAudit.build?.signing !== "app-store-distribution") {
        throw new Error("app-store-submission: App Store 배포 프로비저닝이 아닙니다.");
      }
      const signedArchive = artifacts.find((artifact) => artifact.type === "signed-archive");
      if (!signedArchive || releaseAudit.signedArchive?.sha256 !== signedArchive.sha256 ||
          releaseAudit.signedArchive?.file !== path.basename(signedArchive.file)) {
        throw new Error("app-store-submission: Release 감사 보고서와 제출 IPA가 다릅니다.");
      }
    }
    output.push({
      id,
      result: "PASS",
      observedAt: row.observedAt,
      reviewer: row.reviewer,
      artifacts,
    });
  }
  return output;
}

function validateVisionEvidence(manifest, evidenceRoot) {
  const rows = Array.isArray(manifest.visionEvidence) ? manifest.visionEvidence : [];
  const requiredTiers = new Set(localAiDeviceRequirements.keys());
  const output = [];
  for (const entry of rows) {
    const artifact = validateArtifact(entry, evidenceRoot, `visionEvidence.${entry.tier || "unknown"}`);
    const evidenceFile = resolveEvidenceFile(evidenceRoot, entry.file);
    const document = JSON.parse(fs.readFileSync(evidenceFile, "utf8"));
    const requirement = localAiDeviceRequirements.get(entry.tier);
    if (!requirement) throw new Error(`${entry.file}: 지원하지 않는 로컬 AI tier입니다.`);
    if (document.schema !== requirement.schema || document.result !== "PASS") {
      throw new Error(`${entry.file}: ${requirement.schema} 실기 증거가 PASS가 아닙니다.`);
    }
    if (document.tier !== entry.tier) throw new Error(`${entry.file}: tier가 manifest와 다릅니다.`);
    if (!String(document.model || "").trim()) throw new Error(`${entry.file}: 모델 이름이 없습니다.`);
    for (const metric of ["loadMs", requirement.durationMetric, "generatedTokens", "tokensPerSecond"]) {
      if (!(Number(document.metrics?.[metric]) > 0)) {
        throw new Error(`${entry.file}: 양수 실측값 ${metric}가 없습니다.`);
      }
    }
    if (!/^[a-f0-9]{64}$/i.test(String(document.source?.sha256 || ""))) {
      throw new Error(`${entry.file}: 원본 실기 로그 SHA-256이 없습니다.`);
    }
    const sourceFile = path.resolve(path.dirname(evidenceFile), String(document.source?.file || ""));
    const evidenceRootPath = path.resolve(evidenceRoot);
    if (!sourceFile.startsWith(`${evidenceRootPath}${path.sep}`) || !fs.existsSync(sourceFile)) {
      throw new Error(`${entry.file}: 원본 실기 로그가 없습니다: ${document.source?.file || "없음"}`);
    }
    if (sha256(sourceFile) !== document.source.sha256.toLowerCase()) {
      throw new Error(`${entry.file}: 원본 실기 로그 SHA-256이 다릅니다.`);
    }
    requiredTiers.delete(document.tier);
    output.push({ tier: document.tier, model: document.model, ...artifact });
  }
  if (requiredTiers.size > 0) {
    throw new Error(`필수 로컬 비전 실측이 없습니다: ${[...requiredTiers].join(", ")}`);
  }
  return output;
}

function candidateSourceState(root, sourceKey) {
  // macOS exposes /var through /private/var. Git reports the canonical path,
  // so compare real paths or a standalone workspace looks like a monorepo.
  const resolvedRoot = fs.realpathSync(path.resolve(root));
  const workspaceRoot = fs.realpathSync(
    path.resolve(git(["rev-parse", "--show-toplevel"], resolvedRoot)),
  );
  const workspaceCommit = git(["rev-parse", "HEAD"], workspaceRoot);

  if (workspaceRoot === resolvedRoot) {
    return { commit: workspaceCommit, workspaceRoot, workspaceCommit };
  }

  const snapshotFile = path.join(workspaceRoot, "SOURCE-SNAPSHOT.json");
  if (!fs.existsSync(snapshotFile)) {
    throw new Error(
      `${sourceKey} 통합 작업본의 SOURCE-SNAPSHOT.json이 없습니다: ${snapshotFile}`,
    );
  }
  const snapshot = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));
  const source = snapshot?.[sourceKey];
  if (
    snapshot.schemaVersion !== "MATTHS_DEV_SOURCE_SNAPSHOT_V1"
    || !source?.sourceCommit
    || fs.realpathSync(path.resolve(workspaceRoot, String(source.path || ""))) !== resolvedRoot
  ) {
    throw new Error(`${sourceKey} 통합 작업본 provenance가 SOURCE-SNAPSHOT.json과 다릅니다.`);
  }
  return {
    commit: source.sourceCommit,
    workspaceRoot,
    workspaceCommit,
    provenance: "SOURCE-SNAPSHOT.json",
  };
}

function validateIpadCandidate(manifest, root = resolveIpadRoot(repoRoot)) {
  const state = candidateSourceState(root, "ipad");
  const head = state.commit;
  if (manifest.candidate?.ipadCommit !== head) {
    throw new Error(`iPad HEAD(${head})와 최종 후보 커밋이 다릅니다.`);
  }
  if (git(["status", "--porcelain"], state.workspaceRoot)) {
    throw new Error("최종 게이트는 깨끗한 iPad 로컬 커밋에서만 실행할 수 있습니다.");
  }
  return { commit: head, ...(state.provenance ? {
    provenance: state.provenance,
    workspaceCommit: state.workspaceCommit,
  } : {}) };
}

function validatePilotGate(manifest, evidenceRoot) {
  const artifact = validateArtifact(manifest.localAiPilotGate, evidenceRoot, "localAiPilotGate");
  const document = JSON.parse(
    fs.readFileSync(resolveEvidenceFile(evidenceRoot, manifest.localAiPilotGate.file), "utf8"),
  );
  if (document.schemaVersion !== "MATTHS_LOCAL_AI_PILOT_GATE_V1" || document.result !== "PASS") {
    throw new Error("로컬 AI 파일럿 게이트가 PASS가 아닙니다.");
  }
  if (!Array.isArray(document.checks) || document.checks.some((row) => row.pass !== true)) {
    throw new Error("로컬 AI 파일럿 게이트 안에 실패한 세부 조건이 있습니다.");
  }
  return artifact;
}

function validateCafe24Release(manifest, evidenceRoot, root = repoRoot) {
  const releaseManifestFile = resolveEvidenceFile(evidenceRoot, manifest.candidate?.cafe24ReleaseManifest);
  if (!fs.existsSync(releaseManifestFile)) throw new Error("Cafe24 RELEASE-MANIFEST.json이 없습니다.");
  const release = JSON.parse(fs.readFileSync(releaseManifestFile, "utf8"));
  if (release.schemaVersion !== "MATTHS_CAFE24_RELEASE_V1") {
    throw new Error("Cafe24 배포 manifest 스키마가 올바르지 않습니다.");
  }
  const state = candidateSourceState(root, "web");
  const head = state.commit;
  if (manifest.candidate.webCommit !== head || release.release?.commit !== head) {
    throw new Error(`웹 HEAD(${head})와 최종 후보/배포본 커밋이 다릅니다.`);
  }
  if (git(["status", "--porcelain"], state.workspaceRoot)) {
    throw new Error("최종 게이트는 깨끗한 로컬 커밋에서만 실행할 수 있습니다.");
  }
  const archive = resolveEvidenceFile(evidenceRoot, manifest.candidate.cafe24ReleaseArchive);
  if (path.basename(archive) !== release.release.file || sha256(archive) !== release.release.sha256) {
    throw new Error("Cafe24 배포 archive가 RELEASE-MANIFEST.json과 다릅니다.");
  }
  return {
    commit: head,
    archive: manifest.candidate.cafe24ReleaseArchive,
    sha256: release.release.sha256,
    ...(state.provenance ? {
      provenance: state.provenance,
      workspaceCommit: state.workspaceCommit,
    } : {}),
  };
}

function evaluate(
  manifest,
  evidenceRoot,
  root = repoRoot,
  ipadRoot = resolveIpadRoot(root),
) {
  if (manifest.schemaVersion !== "MATTHS_FINAL_RELEASE_EVIDENCE_V1") {
    throw new Error(`지원하지 않는 최종 증거 스키마입니다: ${manifest.schemaVersion}`);
  }
  const web = validateCafe24Release(manifest, evidenceRoot, root);
  const ipad = validateIpadCandidate(manifest, ipadRoot);
  return {
    schemaVersion: "MATTHS_FINAL_RELEASE_READINESS_V1",
    result: "PASS",
    generatedAt: new Date().toISOString(),
    web,
    ipad,
    externalChecks: validateExternalChecks(manifest, evidenceRoot, {
      webCommit: web.commit,
      ipadCommit: ipad.commit,
    }),
    visionEvidence: validateVisionEvidence(manifest, evidenceRoot),
    localAiPilotGate: validatePilotGate(manifest, evidenceRoot),
  };
}

function template() {
  return {
    schemaVersion: "MATTHS_FINAL_RELEASE_EVIDENCE_V1",
    candidate: {
      webCommit: "REPLACE_WITH_40_CHARACTER_GIT_COMMIT",
      ipadCommit: "REPLACE_WITH_40_CHARACTER_GIT_COMMIT",
      cafe24ReleaseManifest: "cafe24/RELEASE-MANIFEST.json",
      cafe24ReleaseArchive: "cafe24/matths-cafe24-release.tar.gz",
    },
    externalChecks: requiredExternalChecks.map((id) => ({
      id,
      result: "PENDING",
      observedAt: "",
      reviewer: "",
      artifacts: [],
    })),
    visionEvidence: [
      { tier: "vision3B", type: "device-log", file: "ipad/vision3B.json", sha256: "" },
      { tier: "deepseek7B", type: "device-log", file: "ipad/deepseek7B.json", sha256: "" },
    ],
    localAiPilotGate: { type: "test-report", file: "ai/pilot-gate.json", sha256: "" },
  };
}

function structuredEvidenceTemplates() {
  return {
    "design-independent-review.json": {
      schemaVersion: "MATTHS_DESIGN_INDEPENDENT_REVIEW_V1",
      result: "PENDING",
      independentReviewer: false,
      reviewer: "",
      observedAt: "",
      webCommit: "REPLACE_WITH_40_CHARACTER_GIT_COMMIT",
      ipadCommit: "REPLACE_WITH_40_CHARACTER_GIT_COMMIT",
      decision: "",
      notes: "",
    },
    "cafe24-deployment-receipt.json": {
      schemaVersion: "MATTHS_CAFE24_DEPLOYMENT_RECEIPT_V1",
      result: "PENDING",
      provider: "Cafe24",
      environment: "production",
      baseURL: "https://matths.kr",
      deployedCommit: "REPLACE_WITH_40_CHARACTER_GIT_COMMIT",
      deploymentId: "",
      observedAt: "",
    },
    "atlas-migration-evidence.json": {
      schemaVersion: "MATTHS_ATLAS_MIGRATION_EVIDENCE_V1",
      result: "PENDING",
      environment: "production",
      mode: "dry-run",
      sourceCommit: "REPLACE_WITH_40_CHARACTER_GIT_COMMIT",
      targetFingerprint: "",
      migratedRecords: null,
      rollbackVerified: false,
      backupReference: "",
      restoreTarget: "",
      observedAt: "",
      sources: {
        migration: { file: "migration-apply.json", sha256: "" },
        indexCleanup: { file: "index-cleanup-apply.json", sha256: "" },
        backup: { file: "backup-receipt.json", sha256: "" },
        rollback: { file: "rollback-drill.json", sha256: "" },
      },
    },
    "app-store-submission-receipt.json": {
      schemaVersion: "MATTHS_APP_STORE_SUBMISSION_RECEIPT_V1",
      result: "PENDING",
      provider: "App Store Connect",
      environment: "production",
      ipadCommit: "REPLACE_WITH_40_CHARACTER_GIT_COMMIT",
      uploadId: "",
      observedAt: "",
    },
  };
}

function writeStructuredEvidenceTemplates(directory) {
  const output = path.resolve(directory);
  fs.mkdirSync(output, { recursive: true });
  for (const [name, document] of Object.entries(structuredEvidenceTemplates())) {
    const filename = path.join(output, name);
    if (fs.existsSync(filename)) throw new Error(`기존 증거 템플릿을 덮어쓰지 않습니다: ${filename}`);
    fs.writeFileSync(filename, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  }
  return output;
}

function option(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  if (!process.argv[index + 1]) throw new Error(`${name} 값이 필요합니다.`);
  return process.argv[index + 1];
}

if (require.main === module) {
  try {
    const structuredOutput = option("--write-structured-templates");
    if (structuredOutput) {
      console.log(`구조화 외부 증거 템플릿: ${writeStructuredEvidenceTemplates(structuredOutput)}`);
      process.exit(0);
    }
    const templateOutput = option("--write-template");
    if (templateOutput) {
      const target = path.resolve(templateOutput);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, `${JSON.stringify(template(), null, 2)}\n`, "utf8");
      console.log(`최종 출시 증거 템플릿: ${target}`);
      process.exit(0);
    }
    const evidenceManifest = option("--evidence");
    if (!evidenceManifest) throw new Error("--evidence <최종 증거 manifest.json>가 필요합니다.");
    const manifestPath = path.resolve(evidenceManifest);
    const evidenceRoot = path.dirname(manifestPath);
    const output = path.resolve(option("--output", path.join(evidenceRoot, "final-readiness.json")));
    const result = evaluate(JSON.parse(fs.readFileSync(manifestPath, "utf8")), evidenceRoot);
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(`최종 출시 게이트 통과: ${output}`);
  } catch (error) {
    console.error(`최종 출시 게이트 실패: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  _testing: { candidateSourceState },
  allowedArtifactTypes,
  evaluate,
  requiredExternalChecks,
  sha256,
  structuredEvidenceTemplates,
  template,
  writeStructuredEvidenceTemplates,
};
