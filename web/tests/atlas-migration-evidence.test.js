#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { run } = require("../scripts/createAtlasMigrationEvidence");
const {
  assertAtlasProductionTarget,
  databaseTargetFingerprint,
  writeExclusiveJson,
} = require("../services/atlasOperationEvidenceService");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "matths-atlas-evidence-"));
const targetFingerprint = "a".repeat(64);
const sourceCommit = "b".repeat(40);
const observedAt = "2026-08-12T12:10:00.000Z";

assert.equal(
  databaseTargetFingerprint("mongodb+srv://first:secret@example.mongodb.net/matths?retryWrites=true"),
  databaseTargetFingerprint("mongodb+srv://second:other@example.mongodb.net/matths?w=majority"),
  "credential와 연결 옵션은 DB 대상 식별자에 포함하지 않아야 합니다.",
);
assert.notEqual(
  databaseTargetFingerprint("mongodb+srv://first:secret@example.mongodb.net/matths"),
  databaseTargetFingerprint("mongodb+srv://first:secret@example.mongodb.net/other"),
  "database가 다르면 대상 fingerprint도 달라야 합니다.",
);
assert.equal(
  assertAtlasProductionTarget("mongodb+srv://user:secret@cluster.example.mongodb.net/matths"),
  databaseTargetFingerprint("mongodb+srv://user:secret@cluster.example.mongodb.net/matths"),
);
assert.throws(
  () => assertAtlasProductionTarget("mongodb://127.0.0.1:27017/matths"),
  /mongodb\+srv/,
  "로컬 replica는 production Atlas 보고서를 만들 수 없어야 합니다.",
);
assert.throws(
  () => assertAtlasProductionTarget("mongodb+srv://user:secret@example.invalid/matths"),
  /공식 호스트/,
);

function write(name, document) {
  const filename = path.join(root, name);
  fs.writeFileSync(filename, `${JSON.stringify(document)}\n`);
  return filename;
}

const migration = write("migration.json", {
  schemaVersion: "MATTHS_ACCESS_CYCLE_MIGRATION_RUN_V1", result: "PASS",
  environment: "production", mode: "apply", sourceCommit, targetFingerprint,
  migratedRecords: 2, stampedExistingRecords: 1, verifiedTargetCount: 3,
  conflictCount: 0, missingCount: 0, unstampedCount: 0, observedAt,
});
const index = write("indexes.json", {
  schemaVersion: "MATTHS_AUTHORITY_INDEX_CLEANUP_RUN_V1", result: "PASS",
  environment: "production", mode: "apply", sourceCommit, targetFingerprint,
  droppedIndexCount: 4, remainingRemovableCount: 0, fingerprintMismatchCount: 0,
  legacyBlockedCollectionCount: 0, observedAt,
});
const backup = write("backup.json", {
  schemaVersion: "MATTHS_ATLAS_BACKUP_RECEIPT_V1", result: "PASS",
  environment: "production", provider: "MongoDB Atlas", targetFingerprint,
  backupReference: "atlas-snapshot-20260812-1200", observedAt: "2026-08-12T12:00:00.000Z",
});
const rollback = write("rollback.json", {
  schemaVersion: "MATTHS_ATLAS_ROLLBACK_DRILL_V1", result: "PASS",
  environment: "isolated-recovery", sourceEnvironment: "production",
  provider: "MongoDB Atlas", targetFingerprint,
  backupReference: "atlas-snapshot-20260812-1200",
  restoreTarget: "isolated-restore-matths-20260812", rollbackVerified: true, observedAt,
});

const output = path.join(root, "atlas-evidence.json");
const exclusive = path.join(root, "exclusive.json");
writeExclusiveJson(exclusive, { result: "PASS" });
assert.throws(() => writeExclusiveJson(exclusive, { result: "PASS" }), /덮어쓰지 않습니다/);
const args = ["--migration-run", migration, "--index-run", index,
  "--backup-receipt", backup, "--rollback-drill", rollback, "--output", output];
const generated = run(args).evidence;
assert.equal(generated.result, "PASS");
assert.equal(generated.migratedRecords, 2);
assert.equal(generated.droppedStaleIndexes, 4);
assert.equal(generated.sources.migration.sha256.length, 64);
assert.throws(() => run(args), /덮어쓰지 않습니다/);

const mismatchedRollback = write("rollback-mismatch.json", {
  ...JSON.parse(fs.readFileSync(rollback, "utf8")), targetFingerprint: "c".repeat(64),
});
assert.throws(() => run(["--migration-run", migration, "--index-run", index,
  "--backup-receipt", backup, "--rollback-drill", mismatchedRollback,
  "--output", path.join(root, "bad-target.json")]), /DB 대상이 서로 다릅니다/);

const dryRun = write("dry-run.json", {
  ...JSON.parse(fs.readFileSync(migration, "utf8")), mode: "dry-run",
});
assert.throws(() => run(["--migration-run", dryRun, "--index-run", index,
  "--backup-receipt", backup, "--rollback-drill", rollback,
  "--output", path.join(root, "dry-run-output.json")]), /실제 apply/);

console.log("Atlas production evidence requires matching apply, backup, and rollback reports");
