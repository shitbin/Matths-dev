#!/usr/bin/env node

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const webRoot = path.resolve(__dirname, "..");
const ipadRoot = path.resolve(webRoot, "../ipad-app");
const evidenceRoot = path.resolve(webRoot, "../evidence");
const currentIpadEvidenceRoot = path.resolve(evidenceRoot, "ipad-current-208-simulator");

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} failed`);
  return String(result.stdout || "").trim();
}

function sha256(filename) {
  return crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : entry.isFile() ? [absolute] : [];
  });
}

function copyRequiredEvidence(packageRoot) {
  const required = [
    "ipad-install-215/device-install.json",
    "ipad-release-215/release-build.json",
    "ipad-170-screen-protection/screen-protection-device-qa.json",
    "ipad-182-screen-integrity/screen-protection-device-qa.json",
    "ipad-182-screen-integrity/linked-report.json",
    "ipad-177-rank-promotion/after-audio-prewarm.json",
    "placement-180-promotion-authority/test-report.json",
    "accessibility-195-simulator/accessibility-device-selftest.json",
    "window-environment-197-simulator/window-environment-selftest.json",
    "window-environment-197-simulator/window-environment.png",
    "model-download-184-device/model-download-device-qa.json",
    "model-download-184-device/model-download-resume-device-qa.json",
    "local-ai-recovery-185-device/local-ai-recovery-device-qa.json",
    "local-ai-background-186-device/local-ai-background-device-qa-delayed.json",
    "ipad-172-vision3b/vision-evidence-1024tokens.json",
    "ipad-173-deepseek7b/reasoning-evidence.json",
  ];
  const inventory = [];
  for (const relative of required) {
    const source = path.resolve(evidenceRoot, relative);
    if (!source.startsWith(`${evidenceRoot}${path.sep}`) || !fs.existsSync(source)) {
      throw new Error(`필수 iPad 증거가 없습니다: ${relative}`);
    }
    const destination = path.join(packageRoot, "ipad-evidence", relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    inventory.push({ file: `ipad-evidence/${relative}`, sha256: sha256(source) });
  }
  return inventory;
}

function copyCurrentIpadEvidence(packageRoot, ipadCommit) {
  const manifestFile = path.join(currentIpadEvidenceRoot, "capture-manifest.json");
  if (!fs.existsSync(manifestFile)) {
    throw new Error(`현재 iPad 화면 증거 manifest가 없습니다: ${manifestFile}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  if (manifest.schemaVersion !== "MATTHS_IPAD_CURRENT_SIMULATOR_CAPTURE_V1") {
    throw new Error("현재 iPad 화면 증거 schema가 올바르지 않습니다.");
  }
  if (manifest.sourceCommit !== ipadCommit || manifest.sourceTreeClean !== true) {
    throw new Error("현재 iPad 화면 증거가 현재의 깨끗한 iPad 커밋과 일치하지 않습니다.");
  }
  const records = [...(manifest.reviewScreens || []), ...(manifest.failureEvidence || [])];
  if (records.length < 1 || (manifest.reviewScreens || []).length < 1) {
    throw new Error("현재 iPad 화면 증거 목록이 비어 있습니다.");
  }
  const seen = new Set();
  for (const record of records) {
    if (!record || typeof record.file !== "string" || !/^[0-9A-Za-z._-]+\.png$/.test(record.file)) {
      throw new Error("현재 iPad 화면 증거에 안전하지 않은 파일명이 있습니다.");
    }
    if (seen.has(record.file)) throw new Error(`중복 iPad 화면 증거: ${record.file}`);
    seen.add(record.file);
    const source = path.join(currentIpadEvidenceRoot, record.file);
    if (!fs.existsSync(source) || sha256(source) !== record.sha256) {
      throw new Error(`현재 iPad 화면 증거 해시가 일치하지 않습니다: ${record.file}`);
    }
  }
  const destination = path.join(packageRoot, "ipad-current-simulator-evidence");
  fs.cpSync(currentIpadEvidenceRoot, destination, { recursive: true });
  return manifest;
}

function main() {
  for (const [root, label] of [[webRoot, "웹"], [ipadRoot, "iPad"]]) {
    if (run("git", ["status", "--porcelain"], root)) {
      throw new Error(`${label} 작업트리가 깨끗하지 않습니다.`);
    }
  }
  const webCommit = run("git", ["rev-parse", "HEAD"], webRoot);
  const ipadCommit = run("git", ["rev-parse", "HEAD"], ipadRoot);
  const webReview = path.join(webRoot, "dist", "design-review", `matths-design-review-${webCommit.slice(0, 12)}.tar.gz`);
  if (!fs.existsSync(webReview)) {
    throw new Error(`현재 웹 커밋의 검수 패키지가 없습니다: ${webReview}`);
  }

  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "matths-full-design-review-"));
  const packageName = `matths-web-ipad-design-review-${webCommit.slice(0, 12)}-${ipadCommit.slice(0, 12)}`;
  const packageRoot = path.join(temporary, packageName);
  fs.mkdirSync(packageRoot, { recursive: true });

  fs.copyFileSync(webReview, path.join(packageRoot, "web-review.tar.gz"));
  run("git", ["archive", "--format=tar.gz", `--output=${path.join(packageRoot, "ipad-source.tar.gz")}`, "HEAD"], ipadRoot);
  fs.cpSync(path.join(ipadRoot, "appstore", "screenshots-13inch"), path.join(packageRoot, "ipad-historical-baseline"), {
    recursive: true,
  });
  const evidence = copyRequiredEvidence(packageRoot);
  const currentSimulatorEvidence = copyCurrentIpadEvidence(packageRoot, ipadCommit);
  const screenshots = walk(path.join(packageRoot, "ipad-historical-baseline")).map((filename) => ({
    file: path.relative(packageRoot, filename),
    sha256: sha256(filename),
  }));

  const manifest = {
    schemaVersion: "MATTHS_WEB_IPAD_DESIGN_REVIEW_PACKAGE_V1",
    createdAt: new Date().toISOString(),
    web: { commit: webCommit, reviewFile: "web-review.tar.gz", sha256: sha256(webReview) },
    ipad: {
      commit: ipadCommit,
      sourceFile: "ipad-source.tar.gz",
      sourceSha256: sha256(path.join(packageRoot, "ipad-source.tar.gz")),
      historicalBaselineScreenshotCount: screenshots.length,
      historicalBaselineScreenshots: screenshots,
      currentSimulatorEvidence: {
        directory: "ipad-current-simulator-evidence",
        manifestSha256: sha256(path.join(currentIpadEvidenceRoot, "capture-manifest.json")),
        reviewScreenCount: currentSimulatorEvidence.reviewScreens.length,
        failureEvidenceCount: currentSimulatorEvidence.failureEvidence.length,
        simulator: currentSimulatorEvidence.simulator,
      },
      evidence,
    },
    evidenceLimits: [
      "iPad historical baseline screenshots were captured before the local Git baseline and are reference-only.",
      "The historical baseline screenshots are not current-commit visual approval evidence.",
      "The current iPad screenshots are current-commit simulator evidence, not physical-device approval evidence.",
      "Simulator accessibility/window reports are not physical-device approval evidence.",
      "The latest physical install report records installation while launch remained pending device unlock.",
      "Missing screens must remain NOT REVIEWED; source code must not be treated as visual proof.",
    ],
  };
  fs.writeFileSync(path.join(packageRoot, "01_MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(packageRoot, "00_REVIEW_REQUEST.md"), `# Matths 웹·iPad 전체 코드 기반 디자인 재심사 요청\n\n` +
    `웹 커밋: \`${webCommit}\`\n\niPad 커밋: \`${ipadCommit}\`\n\n` +
    `이 패키지는 완료 자기보고가 아니라 현재 두 저장소의 전체 추적 소스와 증거 해시를 제공합니다. ` +
    `웹은 web-review.tar.gz의 54화면×5폭 270장과 before 33장을 코드와 대조하십시오. ` +
    `iPad는 ipad-source.tar.gz 전체 Swift/에셋, 6개 과거 기준 화면, 현재 커밋 시뮬레이터 화면, 실기 증거를 서로 분리해 판정하십시오. ` +
    `과거 기준 화면은 현재 커밋의 시각 승인 증거로 사용하면 안 되며, 현재 시뮬레이터 화면도 실기 승인으로 대체하면 안 됩니다. ` +
    `failureEvidence로 분류된 화면은 정상 기능 증거가 아니라 실패 상태 증거입니다.\n\n` +
    `필수 출력: (1) 웹/iPad/GOAT Arena 각각 점수와 출시 판정, (2) 코드 근거와 화면 근거 분리, ` +
    `(3) P0/P1/P2 상위 25개, (4) 320pt·Split View·Dynamic Type·VoiceOver·Pencil·수식·` +
    `녹화/미러링·커리큘럼·배치/휘장·Arena를 개별 판정, (5) 유지할 것/버릴 것, ` +
    `(6) 다음 구현 10개. 화면이나 실기 증거가 없는 항목은 통과시키지 말고 NOT REVIEWED로 두십시오. ` +
    `manifest의 evidenceLimits를 무시하지 마십시오.\n`, "utf8");

  const sums = walk(packageRoot).sort().map((filename) =>
    `${sha256(filename)}  ${path.relative(packageRoot, filename)}`);
  fs.writeFileSync(path.join(packageRoot, "SHA256SUMS.txt"), `${sums.join("\n")}\n`);
  const outputDirectory = path.join(webRoot, "dist", "design-review");
  const archive = path.join(outputDirectory, `${packageName}.tar.gz`);
  run("tar", ["-czf", archive, "-C", temporary, packageName], webRoot);
  fs.writeFileSync(`${archive}.sha256`, `${sha256(archive)}  ${path.basename(archive)}\n`);
  process.stdout.write(`${JSON.stringify({ archive, sha256: sha256(archive), webCommit, ipadCommit }, null, 2)}\n`);
}

try { main(); } catch (error) { console.error(error.message); process.exit(1); }
