#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const {
  assertOutputAvailable,
  assertAtlasProductionTarget,
  cleanSourceCommit,
  writeExclusiveJson,
} = require("../services/atlasOperationEvidenceService");
const {
  ACCESS_CYCLE_LIFECYCLE_COLLECTION,
  LEGACY_ACCESS_CYCLE_COLLECTION,
  LEGACY_ACCESS_CYCLE_LIFECYCLE_SELECTOR,
  accessCycleLifecycleMigrationMarker,
  accessCycleLifecycleSourceDigest,
  hasMatchingMigrationMarker,
  inspectAccessCycleLifecycleMigration,
  projectAccessCycleLifecycleAuthority,
} = require("../services/accessCycleModelAuthorityService");

const APPLY_CONFIRMATION =
  "MIGRATE_ACCESS_CYCLE_LIFECYCLES";
function parseArguments(argv) {
  const options = {
    apply: false,
    confirmation: "",
    environment: process.env.NODE_ENV === "production" ? "production" : "local",
    reportOutput: "",
  };
  for (const argument of argv) {
    if (argument === "--apply") options.apply = true;
    else if (argument.startsWith("--confirm=")) options.confirmation = argument.slice("--confirm=".length);
    else if (argument.startsWith("--environment=")) options.environment = argument.slice("--environment=".length);
    else if (argument.startsWith("--report-output=")) options.reportOutput = argument.slice("--report-output=".length);
    else throw new Error(`알 수 없는 인자입니다: ${argument}`);
  }
  if (!new Set(["local", "test", "production"]).has(options.environment)) {
    throw new Error("--environment는 local, test, production 중 하나여야 합니다.");
  }
  if (options.environment === "production" && options.apply && !options.reportOutput) {
    throw new Error("production apply에는 --report-output이 필요합니다.");
  }
  if (options.reportOutput && (!options.apply || options.environment !== "production")) {
    throw new Error("--report-output은 production apply에서만 사용할 수 있습니다.");
  }
  return options;
}

const envPath = path.join(
  __dirname,
  "..",
  "config.env"
);
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function migrationPlan(
  db,
  { session = null } = {}
) {
  const source = db.collection(
    LEGACY_ACCESS_CYCLE_COLLECTION
  );
  const target = db.collection(
    ACCESS_CYCLE_LIFECYCLE_COLLECTION
  );
  const sourceDocuments = await source
    .find(
      LEGACY_ACCESS_CYCLE_LIFECYCLE_SELECTOR,
      { session }
    )
    .sort({ _id: 1 })
    .toArray();
  const targetDocuments = sourceDocuments.length
    ? await target
        .find({
          _id: {
            $in: sourceDocuments.map(
              (document) => document._id
            ),
          },
        }, { session })
        .toArray()
    : [];
  const targetById = new Map(
    targetDocuments.map((document) => [
      String(document._id),
      document,
    ])
  );
  const pending = [];
  const pendingMarkerUpdates = [];
  const conflicts = [];
  let alreadyCopiedCount = 0;
  for (const document of sourceDocuments) {
    const existing = targetById.get(
      String(document._id)
    );
    if (!existing) {
      pending.push(
        projectAccessCycleLifecycleAuthority(
          document
        )
      );
      continue;
    }
    if (
      hasMatchingMigrationMarker({
        sourceDocument: document,
        targetDocument: existing,
      })
    ) {
      alreadyCopiedCount += 1;
      continue;
    }
    if (
      accessCycleLifecycleSourceDigest(
        document
      ) ===
      accessCycleLifecycleSourceDigest(
        existing
      )
    ) {
      pendingMarkerUpdates.push(
        projectAccessCycleLifecycleAuthority(
          document
        )
      );
      continue;
    }
    conflicts.push(String(document._id));
  }
  return {
    alreadyCopiedCount,
    conflicts,
    pending,
    pendingMarkerUpdates,
    sourceCandidateCount:
      sourceDocuments.length,
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const { apply, confirmation } = options;
  if (!process.env.DB) {
    throw new Error(
      "DB 환경변수가 필요합니다."
    );
  }
  if (
    apply &&
    confirmation !== APPLY_CONFIRMATION
  ) {
    throw new Error(
      `실제 복사는 --apply --confirm=${APPLY_CONFIRMATION}를 함께 지정해야 합니다.`
    );
  }
  const reportIdentity = options.reportOutput
    ? {
        output: assertOutputAvailable(options.reportOutput),
        sourceCommit: cleanSourceCommit(),
        targetFingerprint: assertAtlasProductionTarget(process.env.DB),
      }
    : null;

  await mongoose.connect(process.env.DB);
  const db = mongoose.connection.db;
  const plan = await migrationPlan(db);
  const summary = {
    mode: apply ? "apply" : "dry-run",
    sourceCollection:
      LEGACY_ACCESS_CYCLE_COLLECTION,
    targetCollection:
      ACCESS_CYCLE_LIFECYCLE_COLLECTION,
    sourceCandidateCount:
      plan.sourceCandidateCount,
    alreadyCopiedCount:
      plan.alreadyCopiedCount,
    pendingCopyCount:
      plan.pending.length,
    pendingMarkerCount:
      plan.pendingMarkerUpdates.length,
    conflictCount:
      plan.conflicts.length,
    conflictIds:
      plan.conflicts.slice(0, 20),
  };
  console.log(JSON.stringify(summary, null, 2));

  if (plan.conflicts.length) {
    throw new Error(
      "대상 컬렉션에 내용이 다른 동일 _id 문서가 있습니다. 자동으로 덮어쓰지 않습니다."
    );
  }
  if (!apply) {
    console.log(
      `dry-run 완료. 실제 복사가 필요하면 --apply --confirm=${APPLY_CONFIRMATION}를 명시하세요.`
    );
    return;
  }
  const session =
    await mongoose.startSession();
  let appliedPlan = null;
  let verification = null;
  try {
    await session.withTransaction(
      async () => {
        appliedPlan =
          await migrationPlan(db, {
            session,
          });
        if (appliedPlan.conflicts.length) {
          throw new Error(
            "대상 컬렉션에 내용이 다른 동일 _id 문서가 있습니다. 자동으로 덮어쓰지 않습니다."
          );
        }
        const migratedAt = new Date();
        const operations = [
          ...appliedPlan.pending.map(
            (document) => {
              const { _id, ...fields } =
                document;
              return {
                updateOne: {
                  filter: { _id },
                  update: {
                    $setOnInsert: {
                      ...fields,
                      legacyAccessCycleMigration:
                        accessCycleLifecycleMigrationMarker(
                          document,
                          migratedAt
                        ),
                    },
                  },
                  upsert: true,
                },
              };
            }
          ),
          ...appliedPlan.pendingMarkerUpdates.map(
            (document) => ({
              updateOne: {
                filter: { _id: document._id },
                update: {
                  $set: {
                    legacyAccessCycleMigration:
                      accessCycleLifecycleMigrationMarker(
                        document,
                        migratedAt
                      ),
                  },
                },
              },
            })
          ),
        ];
        if (operations.length) {
          await db
            .collection(
              ACCESS_CYCLE_LIFECYCLE_COLLECTION
            )
            .bulkWrite(operations, {
              ordered: true,
              session,
            });
        }
        verification =
          await inspectAccessCycleLifecycleMigration({
            db,
            session,
          });
        if (
          verification.missingCount ||
          verification.conflictCount ||
          verification.unstampedCount
        ) {
          throw new Error(
            "복사 검증 실패: 누락·충돌 또는 이전 증명 없는 문서가 남았습니다."
          );
        }
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      }
    );
  } finally {
    await session.endSession();
  }
  console.log(
    JSON.stringify(
      {
        copiedCount:
          appliedPlan.pending.length,
        stampedExistingCount:
          appliedPlan
            .pendingMarkerUpdates.length,
        verifiedTargetCount:
          verification.targetMatchedCount,
      },
      null,
      2
    )
  );
  if (options.reportOutput) {
    const report = {
      schemaVersion: "MATTHS_ACCESS_CYCLE_MIGRATION_RUN_V1",
      result: "PASS",
      environment: "production",
      mode: "apply",
      sourceCommit: reportIdentity.sourceCommit,
      targetFingerprint: reportIdentity.targetFingerprint,
      sourceCandidateCount: appliedPlan.sourceCandidateCount,
      migratedRecords: appliedPlan.pending.length + appliedPlan.pendingMarkerUpdates.length,
      copiedRecords: appliedPlan.pending.length,
      stampedExistingRecords: appliedPlan.pendingMarkerUpdates.length,
      alreadyCopiedRecords: appliedPlan.alreadyCopiedCount,
      verifiedTargetCount: verification.targetMatchedCount,
      conflictCount: verification.conflictCount,
      missingCount: verification.missingCount,
      unstampedCount: verification.unstampedCount,
      observedAt: new Date().toISOString(),
    };
    console.log(JSON.stringify({ reportOutput: writeExclusiveJson(reportIdentity.output, report) }, null, 2));
  }
}

main()
  .catch((error) => {
    console.error(
      error.code ||
        error.message ||
        error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(
      () => {}
    );
  });
