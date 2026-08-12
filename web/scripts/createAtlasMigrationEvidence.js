#!/usr/bin/env node

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const REQUIRED_RUNS = Object.freeze({
  migration: "MATTHS_ACCESS_CYCLE_MIGRATION_RUN_V1",
  indexCleanup: "MATTHS_AUTHORITY_INDEX_CLEANUP_RUN_V1",
  backup: "MATTHS_ATLAS_BACKUP_RECEIPT_V1",
  rollback: "MATTHS_ATLAS_ROLLBACK_DRILL_V1",
});

function readJson(filename, label) {
  const resolved = path.resolve(filename);
  if (!fs.existsSync(resolved)) throw new Error(`${label} 파일이 없습니다: ${resolved}`);
  let document;
  try {
    document = JSON.parse(fs.readFileSync(resolved, "utf8"));
  } catch (error) {
    throw new Error(`${label} JSON을 읽을 수 없습니다: ${error.message}`);
  }
  return { resolved, document };
}

function sha256File(filename) {
  return crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
}

function requireTimestamp(value, label) {
  const parsed = Date.parse(String(value || ""));
  if (!Number.isFinite(parsed)) throw new Error(`${label} observedAt이 올바르지 않습니다.`);
  return new Date(parsed).toISOString();
}

function requireRun(entry, schemaVersion, label, environment = "production") {
  const { document } = entry;
  if (document.schemaVersion !== schemaVersion || document.result !== "PASS") {
    throw new Error(`${label}가 ${schemaVersion} PASS가 아닙니다.`);
  }
  if (document.environment !== environment) {
    throw new Error(`${label} environment가 ${environment}가 아닙니다.`);
  }
  if (!String(document.targetFingerprint || "").match(/^[a-f0-9]{64}$/i)) {
    throw new Error(`${label}에 운영 DB 대상 fingerprint가 없습니다.`);
  }
  requireTimestamp(document.observedAt, label);
  return document;
}

function sourceArtifact(entry, outputDirectory, label) {
  const relative = path.relative(outputDirectory, entry.resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} 원본은 최종 증거 출력 폴더 안에 있어야 합니다.`);
  }
  return { file: relative, sha256: sha256File(entry.resolved) };
}

function validateAndCreate({ migration, indexCleanup, backup, rollback }, outputDirectory) {
  const migrationRun = requireRun(migration, REQUIRED_RUNS.migration, "migration run");
  const indexRun = requireRun(indexCleanup, REQUIRED_RUNS.indexCleanup, "index cleanup run");
  const backupRun = requireRun(backup, REQUIRED_RUNS.backup, "Atlas backup receipt");
  const rollbackRun = requireRun(
    rollback,
    REQUIRED_RUNS.rollback,
    "Atlas rollback drill",
    "isolated-recovery",
  );

  const targetFingerprints = new Set([
    migrationRun.targetFingerprint,
    indexRun.targetFingerprint,
    backupRun.targetFingerprint,
    rollbackRun.targetFingerprint,
  ]);
  if (targetFingerprints.size !== 1) {
    throw new Error("migration·index·backup·rollback 증거의 DB 대상이 서로 다릅니다.");
  }
  if (migrationRun.mode !== "apply" || indexRun.mode !== "apply") {
    throw new Error("migration과 index cleanup은 실제 apply 보고서여야 합니다.");
  }
  if (!/^[a-f0-9]{40}$/i.test(String(migrationRun.sourceCommit || "")) ||
      migrationRun.sourceCommit !== indexRun.sourceCommit) {
    throw new Error("migration과 index cleanup의 최종 웹 커밋이 서로 다릅니다.");
  }
  if (!(Number(migrationRun.migratedRecords) >= 0) ||
      !(Number(migrationRun.verifiedTargetCount) >= Number(migrationRun.migratedRecords))) {
    throw new Error("migration 이전·검증 건수가 올바르지 않습니다.");
  }
  if (Number(migrationRun.conflictCount) !== 0 || Number(migrationRun.missingCount) !== 0 ||
      Number(migrationRun.unstampedCount) !== 0) {
    throw new Error("migration 검증에 누락·충돌·marker 누락이 남아 있습니다.");
  }
  if (Number(indexRun.remainingRemovableCount) !== 0 ||
      Number(indexRun.fingerprintMismatchCount) !== 0 ||
      Number(indexRun.legacyBlockedCollectionCount) !== 0) {
    throw new Error("index cleanup 이후 권위 인덱스 검증이 수렴하지 않았습니다.");
  }
  if (!String(backupRun.backupReference || "").trim()) {
    throw new Error("Atlas backup reference가 없습니다.");
  }
  if (backupRun.provider !== "MongoDB Atlas" || rollbackRun.provider !== "MongoDB Atlas" ||
      rollbackRun.sourceEnvironment !== "production") {
    throw new Error("Atlas provider 또는 격리 복구의 원본 환경 증거가 올바르지 않습니다.");
  }
  if (rollbackRun.rollbackVerified !== true ||
      rollbackRun.backupReference !== backupRun.backupReference ||
      !String(rollbackRun.restoreTarget || "").trim()) {
    throw new Error("동일 백업을 사용한 격리 복구 리허설 증거가 없습니다.");
  }

  const timestamps = {
    backup: Date.parse(backupRun.observedAt),
    migration: Date.parse(migrationRun.observedAt),
    indexCleanup: Date.parse(indexRun.observedAt),
    rollback: Date.parse(rollbackRun.observedAt),
  };
  if (timestamps.backup > timestamps.migration || timestamps.migration > timestamps.indexCleanup ||
      timestamps.backup > timestamps.rollback) {
    throw new Error("Atlas 백업·migration·index cleanup·복구 리허설의 시간 순서가 올바르지 않습니다.");
  }

  const observedAt = new Date(Math.max(
    Date.parse(migrationRun.observedAt),
    Date.parse(indexRun.observedAt),
    Date.parse(backupRun.observedAt),
    Date.parse(rollbackRun.observedAt),
  )).toISOString();

  return {
    schemaVersion: "MATTHS_ATLAS_MIGRATION_EVIDENCE_V1",
    result: "PASS",
    environment: "production",
    mode: "apply",
    sourceCommit: migrationRun.sourceCommit,
    targetFingerprint: migrationRun.targetFingerprint,
    migratedRecords: Number(migrationRun.migratedRecords),
    stampedExistingRecords: Number(migrationRun.stampedExistingRecords || 0),
    verifiedTargetCount: Number(migrationRun.verifiedTargetCount),
    droppedStaleIndexes: Number(indexRun.droppedIndexCount || 0),
    rollbackVerified: true,
    backupReference: backupRun.backupReference,
    restoreTarget: rollbackRun.restoreTarget,
    observedAt,
    sources: {
      migration: sourceArtifact(migration, outputDirectory, "migration run"),
      indexCleanup: sourceArtifact(indexCleanup, outputDirectory, "index cleanup run"),
      backup: sourceArtifact(backup, outputDirectory, "Atlas backup receipt"),
      rollback: sourceArtifact(rollback, outputDirectory, "Atlas rollback drill"),
    },
  };
}

function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) throw new Error(`인자가 올바르지 않습니다: ${key || "없음"}`);
    result[key.slice(2)] = value;
  }
  for (const required of ["migration-run", "index-run", "backup-receipt", "rollback-drill", "output"]) {
    if (!result[required]) throw new Error(`--${required} 값이 필요합니다.`);
  }
  return result;
}

function run(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  const output = path.resolve(args.output);
  if (fs.existsSync(output)) throw new Error(`기존 증거를 덮어쓰지 않습니다: ${output}`);
  const evidence = validateAndCreate({
    migration: readJson(args["migration-run"], "migration run"),
    indexCleanup: readJson(args["index-run"], "index cleanup run"),
    backup: readJson(args["backup-receipt"], "Atlas backup receipt"),
    rollback: readJson(args["rollback-drill"], "Atlas rollback drill"),
  }, path.dirname(output));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { output, evidence };
}

if (require.main === module) {
  try {
    const result = run();
    process.stdout.write(`${JSON.stringify({ output: result.output, result: result.evidence.result }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { REQUIRED_RUNS, parseArguments, run, validateAndCreate };
