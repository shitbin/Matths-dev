#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const fixtureServer = path.join(__dirname, "previewV8EvidenceFixtures.js");
const captureScript = path.join(__dirname, "captureResponsiveEvidence.js");
const extraPlan = path.join(repoRoot, "docs", "web-redesign", "v8-evidence-gap-plan.json");

function option(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  if (!process.argv[index + 1]) throw new Error(`${name} 값이 필요합니다.`);
  return process.argv[index + 1];
}

function gitText(args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} 실패\n${result.stderr || result.stdout}`);
  }
  return String(result.stdout || "").trim();
}

function waitForFixture(child, timeoutMs = 12_000) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      reject(new Error(`v8 evidence fixture 시작 시간 초과: ${output.slice(-1000)}`));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      const text = String(chunk);
      output += text;
      process.stdout.write(text);
      const match = output.match(/MATTHS_V8_EVIDENCE_READY (\{[^\n]+\})/);
      if (!match) return;
      clearTimeout(timer);
      try {
        resolve(JSON.parse(match[1]));
      } catch (error) {
        reject(error);
      }
    });
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      reject(new Error(`v8 evidence fixture가 먼저 종료됐습니다: ${code ?? signal ?? "unknown"}`));
    });
  });
}

function terminate(child) {
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

async function run() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("v8 evidence fixture 캡처는 production에서 실행할 수 없습니다.");
  }
  const trackedStatus = gitText(["status", "--porcelain", "--untracked-files=no"]);
  if (trackedStatus) {
    throw new Error("승인 캡처 전 추적 파일 변경을 커밋하거나 되돌려야 합니다.");
  }

  const sourceCommit = gitText(["rev-parse", "HEAD"]);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const output = path.resolve(option(
    "--output",
    path.join(repoRoot, "evidence", `web-v8-gaps-${stamp}`),
  ));
  const chrome = option("--chrome", process.env.MATTHS_CAPTURE_CHROME || "");

  const fixture = spawn(process.execPath, [fixtureServer], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "test",
      MATTHS_V8_EVIDENCE_PORT: "0",
    },
  });

  try {
    const ready = await waitForFixture(fixture);
    if (
      ready.schema !== "MATTHS_WEB_V8_EVIDENCE_FIXTURES_V1" ||
      ready.fixtureCount !== 18 ||
      !/^http:\/\/127\.0\.0\.1:\d+$/.test(String(ready.origin || ""))
    ) {
      throw new Error("v8 evidence fixture 준비 응답이 계약과 다릅니다.");
    }

    const args = [
      captureScript,
      "--base-url", ready.origin,
      "--roles", "public,student,parent",
      "--extra-plan", extraPlan,
      "--only-extra",
      "--driver", "cdp",
      "--output", output,
    ];
    if (chrome) args.push("--chrome", chrome);

    const capture = spawnSync(process.execPath, args, {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    });
    process.stdout.write(capture.stdout || "");
    process.stderr.write(capture.stderr || "");
    if (capture.error) throw capture.error;
    if (capture.status !== 0) {
      throw new Error(`v8 evidence 캡처가 실패했습니다: exit ${capture.status}`);
    }

    const manifestPath = path.join(output, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const invalidCapture = manifest.captures?.find((row) =>
      row.ok !== true || row.contentVerified !== true || row.driver !== "cdp" ||
      row.viewportVerified !== true || row.documentStatusOk !== true ||
      row.horizontalOverflow === true || row.intrinsicOverflow === true ||
      !String(row.fullPageFile || "").trim()
    );
    if (
      manifest.schema !== "MATTHS_RESPONSIVE_EVIDENCE_V2" ||
      manifest.sourceCommit !== sourceCommit ||
      manifest.trackedWorkingTreeClean !== true ||
      manifest.captureDriver !== "cdp" ||
      manifest.pageCount !== 18 ||
      manifest.captureCount !== 90 ||
      manifest.failureCount !== 0 ||
      manifest.extraPlan?.pageCount !== 18 ||
      !/^[0-9a-f]{64}$/.test(String(manifest.extraPlan?.sha256 || "")) ||
      invalidCapture
    ) {
      throw new Error(`v8 evidence manifest 최종 검증 실패: ${invalidCapture?.slug || "manifest"}`);
    }
    console.log(`v8 S142/S143 증거 완료: ${manifest.captureCount}장`);
    console.log(manifestPath);
  } finally {
    await terminate(fixture);
  }
}

run().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
