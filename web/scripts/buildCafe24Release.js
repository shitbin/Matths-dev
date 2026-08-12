#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const outputDirectory = path.join(root, "dist", "cafe24");
const rollbackArgument = process.argv.find((value) => value.startsWith("--rollback-ref="));
const rollbackRef = rollbackArgument ? rollbackArgument.slice("--rollback-ref=".length) : "42ae09a";
const archivePathspecs = [
  ".",
  ":(exclude)docs/web-redesign/screenshots",
  ":(exclude)tmp",
  ":(exclude).github",
  ":(exclude)node_modules",
];

function git(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} 실패`);
  }
  return String(result.stdout || "").trim();
}

function safeRef(ref) {
  if (!/^[0-9A-Za-z._/-]+$/.test(ref)) throw new Error("허용되지 않은 rollback ref 형식입니다.");
  return git(["rev-parse", "--verify", `${ref}^{commit}`]);
}

function archiveName(label, commit) {
  return `matths-cafe24-${label}-${commit.slice(0, 12)}.tar.gz`;
}

function createArchive(label, commit) {
  const target = path.join(outputDirectory, archiveName(label, commit));
  const sourceMetadata = JSON.stringify({
    schemaVersion: "MATTHS_RELEASE_SOURCE_V1",
    commit,
    tree: git(["rev-parse", `${commit}^{tree}`]),
  });
  const result = spawnSync(
    "git",
    [
      "archive",
      "--format=tar.gz",
      "--add-virtual-file", `RELEASE-SOURCE.json:${sourceMetadata}`,
      "--output", target,
      commit,
      "--",
      ...archivePathspecs,
    ],
    {
      cwd: root,
      encoding: "utf8",
    },
  );
  if (result.status !== 0) throw new Error(result.stderr || `git archive ${label} 실패`);
  return target;
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const forbiddenTrackedNames = [
  /(^|\/)config\.env$/i,
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)(?:uploads?|tmp|evidence|screenshots?)\//i,
  /\.(?:pem|p12|mobileprovision|gguf)$/i,
  /(^|\/)\.matths-dev-db\//i,
  /(^|\/)node_modules(?:\/|$)/i,
];

function assertSafeTrackedTree(commit) {
  const files = git(["ls-tree", "-r", "--name-only", commit])
    .split("\n")
    .filter(Boolean)
    .filter((file) => ![
      "docs/web-redesign/screenshots/", "tmp/", ".github/", "node_modules",
    ].some((prefix) => file.startsWith(prefix)));
  const forbidden = files.filter((file) => forbiddenTrackedNames.some((pattern) => pattern.test(file)));
  if (forbidden.length) {
    throw new Error(`배포 금지 파일이 Git 트리에 있습니다:\n${forbidden.join("\n")}`);
  }
  for (const required of ["server.js", "package.json", "package-lock.json", "views", "public"]) {
    const present = required.includes(".") ? files.includes(required) : files.some((file) => file.startsWith(`${required}/`));
    if (!present) throw new Error(`${commit.slice(0, 12)}에 필수 배포 경로 ${required}가 없습니다.`);
  }
  return files.length;
}

function runPrePackagingTests() {
  const startedAt = new Date().toISOString();
  const result = spawnSync(
    process.execPath,
    [path.join(root, "scripts", "run-tests.js")],
    {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, MATTHS_RELEASE_PACKAGING: "1" },
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `Cafe24 패키징 전 전체 테스트가 실패했습니다 (exit ${result.status ?? "signal"}).`,
    );
  }
  return {
    command: "node scripts/run-tests.js",
    result: "PASS",
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

function main() {
  const dirty = git(["status", "--porcelain"]);
  if (dirty) {
    throw new Error("웹 작업 트리가 깨끗하지 않습니다. 차수 커밋 뒤에만 배포본을 만드세요.");
  }

  const prePackagingTests = runPrePackagingTests();

  const releaseCommit = safeRef("HEAD");
  const rollbackCommit = safeRef(rollbackRef);
  const releaseFileCount = assertSafeTrackedTree(releaseCommit);
  const rollbackFileCount = assertSafeTrackedTree(rollbackCommit);

  fs.mkdirSync(outputDirectory, { recursive: true });
  const releaseArchive = createArchive("release", releaseCommit);
  const rollbackArchive = createArchive("rollback", rollbackCommit);
  const manifest = {
    schemaVersion: "MATTHS_CAFE24_RELEASE_V1",
    builtAt: new Date().toISOString(),
    publicBaseUrl: "https://matths.kr",
    release: {
      commit: releaseCommit,
      file: path.basename(releaseArchive),
      fileCount: releaseFileCount + 1,
      sha256: sha256(releaseArchive),
    },
    rollback: {
      requestedRef: rollbackRef,
      commit: rollbackCommit,
      file: path.basename(rollbackArchive),
      fileCount: rollbackFileCount + 1,
      sha256: sha256(rollbackArchive),
    },
    excludedByConstruction: [
      "untracked files", "config.env", "node_modules", "local DB", "uploads", "design screenshots", "model files",
    ],
    embeddedSourceMetadata: "RELEASE-SOURCE.json",
    verificationCommands: [
      "npm ci",
      "node scripts/run-tests.js --check",
      "npm run test:deployment",
      "npm run ui:verify",
      "NODE_ENV=production npm run preflight",
    ],
    prePackagingTests,
    crossWorkspaceTestsVerifiedBeforePackaging: [
      "tests/arena-ipad-visualization-contract.test.js",
      "tests/final-release-readiness.test.js",
      "tests/goat-arena-main-native.test.js",
      "tests/goat-arena-production-adapter.test.js",
      "tests/ipad-api-surface-parity.test.js",
      "tests/ipad-assessment-catalog-parity.test.js",
      "tests/ipad-placement-promotion-contract.test.js",
      "tests/social-auth-mobile.test.js",
    ],
    deploymentAuthority: "사람 승인 후 Cafe24에 수동 반영; 이 스크립트는 업로드하지 않음",
  };
  const manifestPath = path.join(outputDirectory, "RELEASE-MANIFEST.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`Cafe24 release: ${releaseArchive}`);
  console.log(`Cafe24 rollback: ${rollbackArchive}`);
  console.log(`Manifest: ${manifestPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
