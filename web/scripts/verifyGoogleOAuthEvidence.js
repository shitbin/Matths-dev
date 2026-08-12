#!/usr/bin/env node

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const expectedBaseURL = "https://www.matths.kr";
const expectedRedirectURI = `${expectedBaseURL}/auth/google/callback`;
const requiredCases = [
  "web-existing-account",
  "web-new-account",
  "web-cancel",
  "web-retry",
  "ipad-existing-account",
  "ipad-new-account",
  "ipad-cancel",
  "ipad-retry",
  "ipad-app-return",
];
const allowedArtifactTypes = new Set(["browser-har", "device-log", "screenshot", "video"]);
const forbiddenKeys = new Set([
  "accessToken", "authorizationCode", "clientSecret", "cookie", "email", "idToken",
  "password", "refreshToken", "sessionCookie", "token",
]);

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

function assertNoSecrets(value, pointer = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecrets(item, `${pointer}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) throw new Error(`${pointer}.${key}: 비밀정보 또는 개인정보 필드는 허용하지 않습니다.`);
    assertNoSecrets(child, `${pointer}.${key}`);
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
  return { type: artifact.type, file: artifact.file, sha256: actual };
}

function validate(input, root) {
  if (input.schemaVersion !== "MATTHS_GOOGLE_OAUTH_QA_SESSION_V1") {
    throw new Error(`지원하지 않는 Google OAuth 세션입니다: ${input.schemaVersion}`);
  }
  assertNoSecrets(input);
  if (input.baseURL !== expectedBaseURL || input.redirectURI !== expectedRedirectURI) {
    throw new Error(`운영 주소는 ${expectedRedirectURI}로 고정해야 합니다.`);
  }
  if (input.consoleConfig?.applicationType !== "web") {
    throw new Error("Google OAuth 애플리케이션 유형은 web이어야 합니다.");
  }
  if (!String(input.consoleConfig?.clientId || "").endsWith(".apps.googleusercontent.com")) {
    throw new Error("공개 Google OAuth client ID 형식이 올바르지 않습니다.");
  }
  const redirectUris = [...new Set(input.consoleConfig?.redirectUris || [])];
  if (!redirectUris.includes(expectedRedirectURI)) {
    throw new Error("Google Console 운영 redirect URI가 없습니다.");
  }
  for (const key of ["observedAt", "reviewer", "deviceModel", "osVersion", "appBuild"]) {
    if (!String(input[key] || "").trim()) throw new Error(`${key}가 없습니다.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}T/.test(input.observedAt)) throw new Error("observedAt 형식이 올바르지 않습니다.");
  if (input.synthetic === true) throw new Error("합성 증거는 운영 Google 로그인 증거가 아닙니다.");
  const consoleArtifact = validateArtifact(root, input.consoleConfig.artifact, "consoleConfig.artifact");
  if (consoleArtifact.type !== "screenshot") throw new Error("Google Console 설정은 screenshot 증거가 필요합니다.");

  const cases = Array.isArray(input.cases) ? input.cases : [];
  const byId = new Map();
  for (const row of cases) {
    if (byId.has(row.id)) throw new Error(`Google OAuth 검증 ID가 중복됩니다: ${row.id}`);
    byId.set(row.id, row);
  }
  const verified = requiredCases.map((id) => {
    const row = byId.get(id);
    if (!row) throw new Error(`필수 Google OAuth 검증이 없습니다: ${id}`);
    if (row.result !== "PASS") throw new Error(`${id}: PASS가 아닙니다.`);
    if (!String(row.notes || "").trim()) throw new Error(`${id}: 관찰 기록이 없습니다.`);
    if (!Array.isArray(row.artifacts) || row.artifacts.length === 0) {
      throw new Error(`${id}: 증거 파일이 없습니다.`);
    }
    const artifacts = row.artifacts.map((artifact, index) =>
      validateArtifact(root, artifact, `${id}.artifacts[${index}]`));
    if (!artifacts.some((artifact) => artifact.type === "video")) {
      throw new Error(`${id}: 전체 왕복 video 증거가 없습니다.`);
    }
    return { id, result: "PASS", artifacts };
  });
  return {
    schemaVersion: "MATTHS_GOOGLE_OAUTH_PRODUCTION_EVIDENCE_V1",
    result: "PASS",
    generatedAt: new Date().toISOString(),
    baseURL: expectedBaseURL,
    redirectURI: expectedRedirectURI,
    consoleConfig: {
      applicationType: "web",
      clientIdSha256: crypto.createHash("sha256").update(input.consoleConfig.clientId).digest("hex"),
      redirectUris,
      artifact: consoleArtifact,
    },
    device: { model: input.deviceModel, osVersion: input.osVersion, appBuild: input.appBuild },
    observedAt: input.observedAt,
    reviewer: input.reviewer,
    cases: verified,
  };
}

function template() {
  return {
    schemaVersion: "MATTHS_GOOGLE_OAUTH_QA_SESSION_V1",
    baseURL: expectedBaseURL,
    redirectURI: expectedRedirectURI,
    observedAt: "",
    reviewer: "",
    deviceModel: "",
    osVersion: "",
    appBuild: "",
    synthetic: false,
    consoleConfig: {
      applicationType: "web",
      clientId: "REPLACE.apps.googleusercontent.com",
      redirectUris: [expectedRedirectURI],
      artifact: { type: "screenshot", file: "", sha256: "" },
    },
    cases: requiredCases.map((id) => ({
      id,
      result: "PENDING",
      notes: "",
      artifacts: [{ type: "video", file: "", sha256: "" }],
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
      console.log(`Google OAuth 운영 검증 템플릿: ${output}`);
      process.exit(0);
    }
    const inputPath = process.argv.slice(2).find((value, index, all) =>
      !value.startsWith("--") && all[index - 1] !== "--output");
    if (!inputPath) throw new Error("Google OAuth session.json 경로가 필요합니다.");
    const source = path.resolve(inputPath);
    const output = path.resolve(option("--output", path.join(path.dirname(source), "google-oauth-evidence.json")));
    const result = validate(JSON.parse(fs.readFileSync(source, "utf8")), path.dirname(source));
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(`Google OAuth 운영 증거 검증 통과: ${output}`);
  } catch (error) {
    console.error(`Google OAuth 운영 증거 검증 실패: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { expectedRedirectURI, requiredCases, sha256, template, validate };
