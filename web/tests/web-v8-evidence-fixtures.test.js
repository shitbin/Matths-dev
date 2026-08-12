"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const fixtureScript = path.join(root, "scripts", "previewV8EvidenceFixtures.js");
const captureScript = path.join(root, "scripts", "captureV8EvidenceGaps.js");
const planPath = path.join(root, "docs", "web-redesign", "v8-evidence-gap-plan.json");
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));

assert.equal(plan.length, 18);
assert.equal(new Set(plan.map((row) => row.slug)).size, 18);
assert.equal(plan.filter((row) => row.slug.startsWith("v8-payment-")).length, 5);
assert.deepEqual(
  plan
    .filter((row) => row.slug.startsWith("v8-error-"))
    .map((row) => row.expectedErrorStatus),
  [400, 401, 403, 404, 409, 410, 413, 422, 423, 429, 500, 501],
);
assert.equal(plan.filter((row) => row.slug === "v8-goat-arena-error").length, 1);
for (const row of plan) {
  assert.equal(row.authProfile, "public");
  assert.ok(Array.isArray(row.expectedText) && row.expectedText.length >= 2);
  assert.match(row.evidenceState, /^[A-Z0-9_:-]+$/);
}

const fixtureSource = fs.readFileSync(fixtureScript, "utf8");
const runnerSource = fs.readFileSync(captureScript, "utf8");
const productionServerSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
const paymentResultSource = fs.readFileSync(path.join(root, "views", "payment-result.ejs"), "utf8");
const parentV2CSS = fs.readFileSync(path.join(root, "public", "css", "parent-v2.css"), "utf8");
assert.match(fixtureSource, /process\.env\.NODE_ENV === "production"/);
assert.match(fixtureSource, /const host = "127\.0\.0\.1"/);
assert.match(fixtureSource, /MATTHS_WEB_V8_EVIDENCE_FIXTURES_V1/);
assert.doesNotMatch(productionServerSource, /previewV8EvidenceFixtures|__evidence__/);
assert.match(runnerSource, /"--driver", "cdp"/);
assert.match(runnerSource, /manifest\.sourceCommit !== sourceCommit/);
assert.match(runnerSource, /manifest\.trackedWorkingTreeClean !== true/);
assert.match(runnerSource, /manifest\.pageCount !== 18/);
assert.match(runnerSource, /manifest\.captureCount !== 90/);
assert.match(runnerSource, /row\.contentVerified !== true/);
assert.match(runnerSource, /row\.viewportVerified !== true/);
assert.match(runnerSource, /row\.horizontalOverflow === true/);
assert.match(runnerSource, /row\.intrinsicOverflow === true/);
assert.match(runnerSource, /row\.fullPageFile/);
assert.match(paymentResultSource, /\/css\/parent\.css/);
assert.match(paymentResultSource, /\/css\/parent-v2\.css/);
assert.match(parentV2CSS, /\.payment-result-actions\s*{[\s\S]*?display:\s*grid/);
assert.match(parentV2CSS, /\.payment-result-actions a\s*{[\s\S]*?min-height:\s*48px/);
assert.match(
  parentV2CSS,
  /@media \(max-width: 520px\)[\s\S]*?\.payment-result-actions\s*{[\s\S]*?grid-template-columns:\s*1fr/,
);

const productionAttempt = spawnSync(process.execPath, [fixtureScript], {
  cwd: root,
  encoding: "utf8",
  env: {
    ...process.env,
    NODE_ENV: "production",
  },
});
assert.notEqual(productionAttempt.status, 0);
assert.match(productionAttempt.stderr, /production에서 실행할 수 없습니다/);

function waitForReady(child, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error(`fixture timeout: ${output}`)), timeoutMs);
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
      const match = output.match(/MATTHS_V8_EVIDENCE_READY (\{[^\n]+\})/);
      if (!match) return;
      clearTimeout(timer);
      resolve(JSON.parse(match[1]));
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      reject(new Error(`fixture exited early: ${code ?? signal}`));
    });
  });
}

function stop(child) {
  return new Promise((resolve) => {
    if (child.exitCode != null || child.signalCode) return resolve();
    const timer = setTimeout(() => {
      if (child.exitCode == null && !child.signalCode) child.kill("SIGKILL");
    }, 1500);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

(async () => {
  const child = spawn(process.execPath, [fixtureScript], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "test",
      MATTHS_V8_EVIDENCE_PORT: "0",
    },
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += String(chunk); });
  try {
    const ready = await waitForReady(child);
    assert.equal(ready.schema, "MATTHS_WEB_V8_EVIDENCE_FIXTURES_V1");
    assert.equal(ready.fixtureCount, 18);
    assert.match(ready.origin, /^http:\/\/127\.0\.0\.1:\d+$/);

    const healthResponse = await fetch(`${ready.origin}/__evidence__/health`);
    assert.equal(healthResponse.status, 200);
    const health = await healthResponse.json();
    assert.equal(health.fixtureCount, 18);
    assert.equal(new Set(health.fixtureIds).size, 18);

    for (const row of plan) {
      const response = await fetch(new URL(row.route, ready.origin));
      assert.equal(response.status, 200, row.slug);
      assert.equal(
        response.headers.get("x-matths-evidence-fixture"),
        "MATTHS_WEB_V8_EVIDENCE_FIXTURES_V1",
        row.slug,
      );
      assert.match(response.headers.get("cache-control") || "", /no-store/);
      const html = await response.text();
      for (const expected of row.expectedText) {
        assert.ok(html.includes(expected), `${row.slug} missing: ${expected}`);
      }
    }

    const unknown = await fetch(`${ready.origin}/__evidence__/unknown`);
    assert.equal(unknown.status, 404);
  } finally {
    await stop(child);
  }
  assert.equal(stderr, "");
  console.log("Web v8 payment and error evidence fixtures passed");
})().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
