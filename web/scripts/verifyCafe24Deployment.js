#!/usr/bin/env node

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  releaseFingerprint,
} = require("../services/releaseIdentityService");

const expectedLogo = fs.readFileSync(
  path.resolve(__dirname, "../public/images/brand/matths-logo.svg"),
);
const expectedLogoSha256 = crypto.createHash("sha256").update(expectedLogo).digest("hex");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function localSourceIdentity(root = path.resolve(__dirname, "..")) {
  if (fs.existsSync(path.join(root, ".git"))) {
    const run = (args) => {
      const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
      if (result.status !== 0) throw new Error(`Git 소스 확인 실패: ${result.stderr || result.stdout}`);
      return String(result.stdout || "").trim();
    };
    if (run(["status", "--porcelain"])) {
      throw new Error("Cafe24 배포 영수증은 깨끗한 로컬 웹 커밋에서만 만들 수 있습니다.");
    }
    return { commit: run(["rev-parse", "HEAD"]), provenance: "git" };
  }
  const metadataFile = path.join(root, "RELEASE-SOURCE.json");
  if (!fs.existsSync(metadataFile)) {
    throw new Error("Git 또는 RELEASE-SOURCE.json 소스 식별자가 없습니다.");
  }
  const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
  if (metadata.schemaVersion !== "MATTHS_RELEASE_SOURCE_V1" ||
      !/^[a-f0-9]{40}$/i.test(String(metadata.commit || ""))) {
    throw new Error("RELEASE-SOURCE.json이 올바르지 않습니다.");
  }
  return { commit: metadata.commit, provenance: "release-archive" };
}

function createDeploymentReceipt(verification, source) {
  if (verification?.schemaVersion !== "MATTHS_CAFE24_DEPLOYMENT_VERIFICATION_V1" ||
      verification?.result !== "PASS") {
    throw new Error("PASS 운영 검증 없이 Cafe24 배포 영수증을 만들 수 없습니다.");
  }
  if (!/^[a-f0-9]{40}$/i.test(String(source?.commit || ""))) {
    throw new Error("Cafe24 배포 영수증에 최종 웹 커밋이 없습니다.");
  }
  return {
    schemaVersion: "MATTHS_CAFE24_DEPLOYMENT_RECEIPT_V1",
    result: "PASS",
    provider: "Cafe24",
    environment: "production",
    baseURL: verification.baseURL,
    deployedCommit: source.commit,
    deploymentId: `${verification.releaseFingerprint}:${verification.observedAt}`,
    observedAt: verification.observedAt,
    sourceProvenance: source.provenance,
    verification: {
      schemaVersion: verification.schemaVersion,
      releaseFingerprint: verification.releaseFingerprint,
      logoSha256: verification.logoSha256,
      checks: verification.checks,
    },
  };
}

function normalizeBaseURL(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new Error("Cafe24 확인 주소는 HTTPS여야 합니다.");
  if (
    parsed.origin !== "https://www.matths.kr" ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("Cafe24 운영 정본은 https://www.matths.kr 이어야 합니다.");
  }
  return parsed.origin;
}

async function requireResponse(fetchImpl, url, accept) {
  const response = await fetchImpl(url, {
    method: "GET",
    redirect: "follow",
    headers: { Accept: accept },
  });
  if (!response.ok) throw new Error(`${url} 응답이 ${response.status}입니다.`);
  return response;
}

async function verifyMobileGoogleStart(fetchImpl, base) {
  // 실제 iPad와 같은 공개 PKCE 진입점을 검사한다. 구 `/api/v1/.../start`는
  // Bearer router 배포 순서에 따라 401이 될 수 있고, 현재 앱은 사용하지 않는다.
  const codeChallenge = "a".repeat(43);
  const startURL = `${base}/auth/google/app?code_challenge=${codeChallenge}`;
  const response = await fetchImpl(startURL, {
    method: "GET",
    redirect: "manual",
    headers: { Accept: "text/html,application/xhtml+xml" },
  });
  if (![302, 303].includes(Number(response.status))) {
    throw new Error(
      `Cafe24 iPad Google 로그인 시작 경로가 인증 없이 Google로 이동하지 않습니다. status=${response.status}`,
    );
  }
  const location = String(response.headers?.get?.("location") || "").trim();
  let authorizationURL;
  try {
    authorizationURL = new URL(location);
  } catch {
    throw new Error("Cafe24 iPad Google 로그인 시작 응답의 Location이 올바르지 않습니다.");
  }
  if (
    authorizationURL.protocol !== "https:" ||
    authorizationURL.hostname !== "accounts.google.com" ||
    authorizationURL.pathname !== "/o/oauth2/v2/auth"
  ) {
    throw new Error("Cafe24 iPad Google 로그인 시작 응답이 Google 공식 인증 주소가 아닙니다.");
  }
  if (
    authorizationURL.searchParams.get("redirect_uri") !==
    "https://www.matths.kr/auth/google/callback"
  ) {
    throw new Error("Cafe24 Google OAuth 운영 callback 주소가 www.matths.kr 정본과 다릅니다.");
  }
  if (
    !authorizationURL.searchParams.get("client_id") ||
    String(authorizationURL.searchParams.get("state") || "").length < 20 ||
    authorizationURL.searchParams.get("response_type") !== "code"
  ) {
    throw new Error("Cafe24 Google OAuth 공개 client/state/response_type 계약이 불완전합니다.");
  }
  const legacyResponse = await fetchImpl(`${base}/api/v1/auth/google/start`, {
    method: "GET",
    redirect: "manual",
    headers: { Accept: "text/html,application/xhtml+xml" },
  });
  if (![302, 303].includes(Number(legacyResponse.status))) {
    throw new Error(
      `Cafe24 구버전 iPad Google 시작 별칭이 Bearer 인증 없이 Google로 이동하지 않습니다. status=${legacyResponse.status}`,
    );
  }
  const legacyLocation = String(legacyResponse.headers?.get?.("location") || "").trim();
  let legacyAuthorizationURL;
  try {
    legacyAuthorizationURL = new URL(legacyLocation);
  } catch {
    throw new Error("Cafe24 구버전 Google 시작 별칭의 Location이 올바르지 않습니다.");
  }
  if (
    legacyAuthorizationURL.protocol !== "https:" ||
    legacyAuthorizationURL.hostname !== "accounts.google.com" ||
    legacyAuthorizationURL.pathname !== "/o/oauth2/v2/auth" ||
    legacyAuthorizationURL.searchParams.get("redirect_uri") !==
      "https://www.matths.kr/auth/google/callback"
  ) {
    throw new Error("Cafe24 구버전 Google 시작 별칭이 운영 Google 정본으로 이동하지 않습니다.");
  }
  return {
    authorizationHost: authorizationURL.hostname,
    redirectUri: authorizationURL.searchParams.get("redirect_uri"),
    appStartPath: "/auth/google/app",
    legacyAppStartPath: "/api/v1/auth/google/start",
  };
}

async function verifyDeployment(baseURL, fetchImpl = fetch) {
  const base = normalizeBaseURL(baseURL);
  const healthResponse = await requireResponse(fetchImpl, `${base}/api/v1/health`, "application/json");
  const health = await healthResponse.json();
  if (health.status !== "ok" || health.service !== "Matths API") {
    throw new Error("Cafe24 API health 응답이 Matths 운영 계약과 다릅니다.");
  }
  if (health.releaseFingerprint !== releaseFingerprint) {
    throw new Error(
      `Cafe24 배포본 fingerprint가 로컬 후보와 다릅니다. remote=${health.releaseFingerprint || "없음"} local=${releaseFingerprint}`,
    );
  }

  const homeResponse = await requireResponse(fetchImpl, `${base}/`, "text/html");
  const home = await homeResponse.text();
  for (const marker of [
    "/images/brand/matths-logo.svg",
    "220개념",
    "13과목 학습 경로",
  ]) {
    if (!home.includes(marker)) throw new Error(`Cafe24 홈에서 최신 표식 '${marker}'을 찾지 못했습니다.`);
  }
  if (/39개\s*(?:개념|콘텐츠)?/.test(home)) {
    throw new Error("Cafe24 홈에 구버전 39개 콘텐츠 표식이 남아 있습니다.");
  }

  const logoResponse = await requireResponse(
    fetchImpl,
    `${base}/images/brand/matths-logo.svg`,
    "image/svg+xml",
  );
  const logo = Buffer.from(await logoResponse.arrayBuffer());
  const remoteLogoSha256 = sha256(logo);
  if (remoteLogoSha256 !== expectedLogoSha256) {
    throw new Error("Cafe24 공식 로고 파일이 로컬 CI 원본과 다릅니다.");
  }

  const googleMobile = await verifyMobileGoogleStart(fetchImpl, base);

  return {
    schemaVersion: "MATTHS_CAFE24_DEPLOYMENT_VERIFICATION_V1",
    result: "PASS",
    observedAt: new Date().toISOString(),
    baseURL: base,
    releaseFingerprint,
    logoSha256: remoteLogoSha256,
    googleMobile,
    checks: [
      "api-health",
      "release-fingerprint",
      "home-current-markers",
      "official-logo-sha256",
      "ipad-google-start-public-redirect",
      "legacy-ipad-google-start-public-redirect",
    ],
  };
}

function argument(name) {
  return process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
}

async function main() {
  const baseURL = argument("--base-url") || "https://www.matths.kr";
  const output = argument("--output");
  const receiptOutput = argument("--receipt-output");
  const result = await verifyDeployment(baseURL);
  const body = `${JSON.stringify(result, null, 2)}\n`;
  if (output) {
    const target = path.resolve(output);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, body, "utf8");
  }
  if (receiptOutput) {
    const receipt = createDeploymentReceipt(result, localSourceIdentity());
    const target = path.resolve(receiptOutput);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  }
  process.stdout.write(body);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  createDeploymentReceipt,
  localSourceIdentity,
  normalizeBaseURL,
  verifyDeployment,
  verifyMobileGoogleStart,
};
