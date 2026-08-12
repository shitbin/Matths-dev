#!/usr/bin/env node

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const expectedBaseURL = "https://matths.kr";
const expectedProvider = {
  environment: "live",
  successURL: `${expectedBaseURL}/payments/toss/success`,
  failURL: `${expectedBaseURL}/payments/toss/fail`,
  webhookURL: `${expectedBaseURL}/webhooks/toss-payments`,
  webhookEvent: "PAYMENT_STATUS_CHANGED",
};
const requiredCases = [
  "student-minor-notice-required",
  "student-minor-consent-recorded",
  "parent-linked-child-order",
  "parent-guardian-consent-required",
  "toss-success-exact-amount",
  "toss-cancel-or-failure",
  "toss-amount-tamper-rejected",
  "toss-webhook-requery",
  "toss-webhook-replay-idempotent",
  "entitlement-granted-once",
  "checkout-disabled-fail-closed",
];
const artifactRequirements = new Map([
  ["student-minor-notice-required", ["video"]],
  ["student-minor-consent-recorded", ["video", "db-audit"]],
  ["parent-linked-child-order", ["video", "db-audit"]],
  ["parent-guardian-consent-required", ["video", "db-audit"]],
  ["toss-success-exact-amount", ["video", "provider-receipt"]],
  ["toss-cancel-or-failure", ["video", "provider-receipt"]],
  ["toss-amount-tamper-rejected", ["video", "test-report"]],
  ["toss-webhook-requery", ["provider-receipt", "db-audit"]],
  ["toss-webhook-replay-idempotent", ["provider-receipt", "db-audit"]],
  ["entitlement-granted-once", ["provider-receipt", "db-audit"]],
  ["checkout-disabled-fail-closed", ["video", "test-report"]],
]);
const allowedArtifactTypes = new Set([
  "db-audit", "provider-receipt", "screenshot", "test-report", "video",
]);
const forbiddenKeys = new Set([
  "accountnumber", "authorization", "cardnumber", "cookie", "customeremail",
  "customeridentitynumber", "customerkey", "customername", "email", "orderid",
  "paymentkey", "secretkey", "session", "token",
]);
const forbiddenValuePatterns = [
  /(?:live|test)_sk_[A-Za-z0-9_-]+/i,
  /\bBearer\s+[A-Za-z0-9._~-]+/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:\d[ -]*?){13,19}\b/,
];

function option(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  if (!process.argv[index + 1]) throw new Error(`${name} 값이 필요합니다.`);
  return process.argv[index + 1];
}

function sha256(filename) {
  return crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
}

function safeFile(root, relative) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, String(relative || ""));
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`증거 폴더 밖 파일은 허용하지 않습니다: ${relative}`);
  }
  return resolved;
}

function assertNoSensitiveData(value, pointer = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSensitiveData(item, `${pointer}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenKeys.has(key.toLowerCase())) {
        throw new Error(`${pointer}.${key}: 결제 비밀정보 또는 개인정보 필드는 허용하지 않습니다.`);
      }
      assertNoSensitiveData(child, `${pointer}.${key}`);
    }
    return;
  }
  if (typeof value !== "string") return;
  if (forbiddenValuePatterns.some((pattern) => pattern.test(value))) {
    throw new Error(`${pointer}: 결제 비밀정보 또는 개인정보로 보이는 값은 허용하지 않습니다.`);
  }
}

function assertArtifactShape(type, filename, label) {
  const header = fs.readFileSync(filename).subarray(0, 16);
  const extension = path.extname(filename).toLowerCase();
  if (type === "video" && header.toString("ascii", 4, 8) !== "ftyp") {
    throw new Error(`${label}: MP4/MOV video 파일이 아닙니다.`);
  }
  if (type === "screenshot") {
    const png = header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const jpeg = header[0] === 0xff && header[1] === 0xd8;
    if (!png && !jpeg) throw new Error(`${label}: PNG/JPEG screenshot이 아닙니다.`);
  }
  if (type === "provider-receipt") {
    const pdf = header.toString("ascii", 0, 4) === "%PDF";
    const png = header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const jpeg = header[0] === 0xff && header[1] === 0xd8;
    if (!pdf && !png && !jpeg) {
      throw new Error(`${label}: provider-receipt는 비식별 PDF/PNG/JPEG여야 합니다.`);
    }
  }
  if (["db-audit", "test-report"].includes(type)) {
    if (extension !== ".json") throw new Error(`${label}: ${type}는 JSON이어야 합니다.`);
    let document;
    try { document = JSON.parse(fs.readFileSync(filename, "utf8")); }
    catch { throw new Error(`${label}: 올바른 JSON이 아닙니다.`); }
    if (document.result !== "PASS") throw new Error(`${label}: ${type} 결과가 PASS가 아닙니다.`);
    assertNoSensitiveData(document, `${label}.document`);
  }
}

function validateArtifact(root, artifact, label) {
  if (!allowedArtifactTypes.has(artifact?.type)) {
    throw new Error(`${label}: 허용하지 않는 증거 종류입니다.`);
  }
  if (!/^[a-f0-9]{64}$/i.test(String(artifact.sha256 || ""))) {
    throw new Error(`${label}: SHA-256이 없습니다.`);
  }
  const filename = safeFile(root, artifact.file);
  if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
    throw new Error(`${label}: 증거 파일이 없습니다: ${artifact.file}`);
  }
  const actual = sha256(filename);
  if (actual !== artifact.sha256.toLowerCase()) {
    throw new Error(`${label}: 증거 파일이 변경됐습니다: ${artifact.file}`);
  }
  assertArtifactShape(artifact.type, filename, label);
  return { type: artifact.type, file: artifact.file, sha256: actual };
}

function validate(input, root) {
  if (input.schemaVersion !== "MATTHS_PAYMENT_PRODUCTION_QA_SESSION_V1") {
    throw new Error(`지원하지 않는 결제 검증 세션입니다: ${input.schemaVersion}`);
  }
  assertNoSensitiveData(input);
  if (input.baseURL !== expectedBaseURL) throw new Error(`운영 주소는 ${expectedBaseURL}로 고정해야 합니다.`);
  if (input.synthetic === true) throw new Error("합성 증거는 운영 결제 증거가 아닙니다.");
  for (const key of ["observedAt", "reviewer", "webReleaseCommit"]) {
    if (!String(input[key] || "").trim()) throw new Error(`${key}가 없습니다.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}T/.test(input.observedAt)) throw new Error("observedAt 형식이 올바르지 않습니다.");
  if (!/^[a-f0-9]{40}$/i.test(input.webReleaseCommit)) throw new Error("webReleaseCommit은 40자리 Git SHA여야 합니다.");

  const provider = input.provider || {};
  for (const [key, expected] of Object.entries(expectedProvider)) {
    if (provider[key] !== expected) throw new Error(`Toss ${key}는 ${expected}여야 합니다.`);
  }
  if (!String(provider.publicClientKey || "").startsWith("live_ck_")) {
    throw new Error("운영 증거에는 Toss live client key가 필요합니다.");
  }
  const configurationArtifact = validateArtifact(root, provider.configurationArtifact, "provider.configurationArtifact");
  if (configurationArtifact.type !== "screenshot") {
    throw new Error("Toss 운영 URL 설정은 screenshot 증거가 필요합니다.");
  }

  const cases = Array.isArray(input.cases) ? input.cases : [];
  const byId = new Map();
  for (const row of cases) {
    if (byId.has(row.id)) throw new Error(`결제 검증 ID가 중복됩니다: ${row.id}`);
    byId.set(row.id, row);
  }
  const verified = requiredCases.map((id) => {
    const row = byId.get(id);
    if (!row) throw new Error(`필수 결제 검증이 없습니다: ${id}`);
    if (row.result !== "PASS") throw new Error(`${id}: PASS가 아닙니다.`);
    if (!String(row.notes || "").trim()) throw new Error(`${id}: 관찰 기록이 없습니다.`);
    const artifacts = (row.artifacts || []).map((artifact, index) =>
      validateArtifact(root, artifact, `${id}.artifacts[${index}]`));
    const types = new Set(artifacts.map((artifact) => artifact.type));
    for (const type of artifactRequirements.get(id) || []) {
      if (!types.has(type)) throw new Error(`${id}: ${type} 증거가 없습니다.`);
    }
    return { id, result: "PASS", artifacts };
  });

  return {
    schemaVersion: "MATTHS_PAYMENT_PRODUCTION_EVIDENCE_V1",
    result: "PASS",
    generatedAt: new Date().toISOString(),
    baseURL: expectedBaseURL,
    provider: {
      name: "Toss Payments",
      environment: "live",
      publicClientKeySha256: crypto.createHash("sha256").update(provider.publicClientKey).digest("hex"),
      successURL: expectedProvider.successURL,
      failURL: expectedProvider.failURL,
      webhookURL: expectedProvider.webhookURL,
      webhookEvent: expectedProvider.webhookEvent,
      configurationArtifact,
    },
    observedAt: input.observedAt,
    reviewer: input.reviewer,
    webReleaseCommit: input.webReleaseCommit,
    cases: verified,
  };
}

function template() {
  return {
    schemaVersion: "MATTHS_PAYMENT_PRODUCTION_QA_SESSION_V1",
    baseURL: expectedBaseURL,
    observedAt: "",
    reviewer: "",
    webReleaseCommit: "",
    synthetic: false,
    provider: {
      environment: expectedProvider.environment,
      publicClientKey: "live_ck_REPLACE_PUBLIC_CLIENT_KEY",
      successURL: expectedProvider.successURL,
      failURL: expectedProvider.failURL,
      webhookURL: expectedProvider.webhookURL,
      webhookEvent: expectedProvider.webhookEvent,
      configurationArtifact: { type: "screenshot", file: "", sha256: "" },
    },
    cases: requiredCases.map((id) => ({
      id,
      result: "PENDING",
      notes: "",
      artifacts: (artifactRequirements.get(id) || []).map((type) => ({ type, file: "", sha256: "" })),
    })),
  };
}

if (require.main === module) {
  try {
    const templateOutput = option("--write-template");
    if (templateOutput) {
      const output = path.resolve(templateOutput);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, `${JSON.stringify(template(), null, 2)}\n`, "utf8");
      console.log(`Toss·학부모 동의 운영 검증 템플릿: ${output}`);
      process.exit(0);
    }
    const inputPath = process.argv.slice(2).find((value, index, all) =>
      !value.startsWith("--") && all[index - 1] !== "--output");
    if (!inputPath) throw new Error("결제 QA session.json 경로가 필요합니다.");
    const source = path.resolve(inputPath);
    const output = path.resolve(option("--output", path.join(path.dirname(source), "payment-production-evidence.json")));
    const result = validate(JSON.parse(fs.readFileSync(source, "utf8")), path.dirname(source));
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(`Toss·학부모 동의 운영 증거 검증 통과: ${output}`);
  } catch (error) {
    console.error(`Toss·학부모 동의 운영 증거 검증 실패: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  artifactRequirements,
  expectedProvider,
  requiredCases,
  sha256,
  template,
  validate,
};
