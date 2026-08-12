"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  releaseFingerprint,
} = require("../services/releaseIdentityService");
const {
  createDeploymentReceipt,
  normalizeBaseURL,
  verifyDeployment,
} = require("../scripts/verifyCafe24Deployment");

const logo = fs.readFileSync(
  path.resolve(__dirname, "../public/images/brand/matths-logo.svg"),
);
const home = '<img src="/images/brand/matths-logo.svg"><strong>220개념</strong><span>13과목 학습 경로</span>';

function response(body, type = "text") {
  return {
    ok: true,
    status: 200,
    async json() { return body; },
    async text() { return String(body); },
    async arrayBuffer() {
      const value = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
      return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    },
    type,
  };
}

function redirectResponse(location, status = 302) {
  return {
    ok: false,
    status,
    headers: {
      get(name) {
        return String(name).toLowerCase() === "location" ? location : null;
      },
    },
  };
}

function fetchFor({
  fingerprint = releaseFingerprint,
  homepage = home,
  logoBody = logo,
  googleStatus = 302,
  googleRedirectUri = "https://matths.kr/auth/google/callback",
  googleHost = "accounts.google.com",
} = {}) {
  return async (url) => {
    if (url.endsWith("/api/v1/health")) {
      return response({ service: "Matths API", status: "ok", releaseFingerprint: fingerprint }, "json");
    }
    if (url.endsWith("/images/brand/matths-logo.svg")) return response(logoBody, "svg");
    if (url.includes("/auth/google/app?code_challenge=")) {
      const start = new URL(url);
      assert.match(start.searchParams.get("code_challenge") || "", /^[A-Za-z0-9_-]{43}$/);
      const authorization = new URL(`https://${googleHost}/o/oauth2/v2/auth`);
      authorization.searchParams.set("client_id", "public-client.apps.googleusercontent.com");
      authorization.searchParams.set("redirect_uri", googleRedirectUri);
      authorization.searchParams.set("response_type", "code");
      authorization.searchParams.set("state", "0123456789abcdefghijklmnopqrstuv");
      return redirectResponse(authorization.toString(), googleStatus);
    }
    return response(homepage, "html");
  };
}

async function main() {
  assert.equal(normalizeBaseURL("https://matths.kr/"), "https://matths.kr");
  assert.throws(() => normalizeBaseURL("http://matths.kr"), /HTTPS/);

  const result = await verifyDeployment("https://matths.kr", fetchFor());
  assert.equal(result.result, "PASS");
  assert.equal(result.releaseFingerprint, releaseFingerprint);
  assert.equal(result.googleMobile.authorizationHost, "accounts.google.com");
  assert.equal(result.googleMobile.appStartPath, "/auth/google/app");
  assert.ok(result.checks.includes("ipad-google-start-public-redirect"));
  const receipt = createDeploymentReceipt(result, {
    commit: "a".repeat(40),
    provenance: "release-archive",
  });
  assert.equal(receipt.schemaVersion, "MATTHS_CAFE24_DEPLOYMENT_RECEIPT_V1");
  assert.equal(receipt.result, "PASS");
  assert.equal(receipt.provider, "Cafe24");
  assert.equal(receipt.environment, "production");
  assert.equal(receipt.baseURL, "https://matths.kr");
  assert.equal(receipt.deployedCommit, "a".repeat(40));
  assert.equal(receipt.verification.releaseFingerprint, releaseFingerprint);
  assert.throws(
    () => createDeploymentReceipt({ result: "PENDING" }, { commit: "a".repeat(40) }),
    /PASS 운영 검증 없이/,
  );

  await assert.rejects(
    () => verifyDeployment("https://matths.kr", fetchFor({ fingerprint: "old" })),
    /fingerprint/,
  );
  await assert.rejects(
    () => verifyDeployment("https://matths.kr", fetchFor({ homepage: "39개 개념" })),
    /최신 표식|구버전/,
  );
  await assert.rejects(
    () => verifyDeployment("https://matths.kr", fetchFor({ logoBody: Buffer.from("not-the-logo") })),
    /공식 로고/,
  );
  await assert.rejects(
    () => verifyDeployment("https://matths.kr", fetchFor({ googleStatus: 401 })),
    /인증 없이 Google로 이동하지 않습니다/,
  );
  await assert.rejects(
    () => verifyDeployment("https://matths.kr", fetchFor({ googleHost: "example.test" })),
    /Google 공식 인증 주소/,
  );
  await assert.rejects(
    () => verifyDeployment("https://matths.kr", fetchFor({ googleRedirectUri: "https://old.example/callback" })),
    /callback 주소/,
  );

  console.log("Cafe24 read-only deployment verification contracts passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
