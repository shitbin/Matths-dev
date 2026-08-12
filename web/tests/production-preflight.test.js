"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const script = path.join(root, "scripts/preflight.js");
const baseEnvironment = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  NODE_ENV: "production",
  MATTHS_PREFLIGHT_SKIP_ENV_FILE: "1",
  DB: "mongodb+srv://user:password@example.mongodb.net/matths",
  SECRET: "session-secret-that-is-long-and-random-1234",
  API_TOKEN_SECRET: "api-token-secret-that-is-different-5678",
  ARENA_QUESTION_PACK_SEED_SECRET: "question-pack-secret-at-least-32-bytes-long",
  ARENA_DEFENDER_ASSIGNMENT_SEED_SECRET: "defender-seed-secret-at-least-32-bytes-long",
  PUBLIC_BASE_URL: "https://www.matths.kr",
  GOOGLE_OAUTH_CLIENT_ID: "client.apps.googleusercontent.com",
  GOOGLE_OAUTH_CLIENT_SECRET: "google-client-secret",
  GOOGLE_OAUTH_REDIRECT_URI: "https://www.matths.kr/auth/google/callback",
  GMAIL_USER: "mailer@matths.kr",
  GMAIL_APP_PASSWORD: "abcdefghijklmnop",
  PAYMENT_CHECKOUT_ENABLED: "0",
};

function run(overrides = {}) {
  return spawnSync(process.execPath, [script], {
    cwd: root,
    env: { ...baseEnvironment, ...overrides },
    encoding: "utf8",
  });
}

let result = run();
assert.equal(result.status, 0, result.stdout + result.stderr);
assert.match(result.stdout, /통과 — 띄워도 된다/);
assert.match(result.stdout, /결제 화면은 준비 중 상태/);

result = run({ GOOGLE_OAUTH_REDIRECT_URI: "https://wrong.example/callback" });
assert.equal(result.status, 1);
assert.match(result.stdout, /GOOGLE_OAUTH_REDIRECT_URI/);

result = run({
  PUBLIC_BASE_URL: "https://matths.kr",
  GOOGLE_OAUTH_REDIRECT_URI: "https://matths.kr/auth/google/callback",
});
assert.equal(result.status, 1);
assert.match(result.stdout, /PUBLIC_BASE_URL.*https:\/\/www\.matths\.kr/);

result = run({ APP_BASE_URL: "https://old.example" });
assert.equal(result.status, 1);
assert.match(result.stdout, /APP_BASE_URL.*폐기/);

result = run({ GMAIL_APP_PASSWORD: "short" });
assert.equal(result.status, 1);
assert.match(result.stdout, /16자리/);

result = run({ PAYMENT_CHECKOUT_ENABLED: "true", TOSS_CLIENT_KEY: "", TOSS_SECRET_KEY: "" });
assert.equal(result.status, 1);
assert.match(result.stdout, /TOSS_CLIENT_KEY/);
assert.match(result.stdout, /TOSS_SECRET_KEY/);

result = run({
  PAYMENT_CHECKOUT_ENABLED: "true",
  TOSS_CLIENT_KEY: "live-client-key",
  TOSS_SECRET_KEY: "live-secret-key",
});
assert.equal(result.status, 0, result.stdout + result.stderr);

console.log("Production Cafe24 preflight contracts passed");
