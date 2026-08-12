"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const mongoose = require("mongoose");
const {
  MongoMemoryReplSet,
} = require("mongodb-memory-server");
const {
  ACCESS_CYCLE_LIFECYCLE_COLLECTION,
  LEGACY_ACCESS_CYCLE_COLLECTION,
  assertAccessCycleLifecycleMigrationReady,
} = require("../services/accessCycleModelAuthorityService");

async function main() {
  const replicaSet =
    await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        storageEngine: "wiredTiger",
      },
    });
  const databaseName =
    "access-cycle-migration-apply";
  const databaseUri =
    replicaSet.getUri(databaseName);
  try {
    await mongoose.connect(databaseUri);
    const db = mongoose.connection.db;
    const ids = [
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
    ];
    const sourceDocuments = [
      {
        _id: ids[0],
        refundStatus: "COMPLETED",
        status: "PAYBACK_COMPLETED",
        paidAccessDaysGranted: 29,
      },
      {
        _id: ids[1],
        refundStatus: "NOT_STARTED",
        status: "CANCELLED",
        paidAccessDaysGranted: 29,
      },
      {
        _id: ids[2],
        refundStatus: "PENDING",
        status: "REFUND_REVIEW",
        paidAccessDaysGranted: 29,
      },
    ];
    await db
      .collection(
        LEGACY_ACCESS_CYCLE_COLLECTION
      )
      .insertMany(sourceDocuments);
    // 과거 수동 복사처럼 내용은 같지만 provenance marker만 없는 문서도
    // 명시적 apply에서 같은 트랜잭션으로 stamp되어야 한다.
    await db
      .collection(
        ACCESS_CYCLE_LIFECYCLE_COLLECTION
      )
      .insertOne(sourceDocuments[2]);
    await mongoose.disconnect();

    const script = path.join(
      __dirname,
      "..",
      "scripts",
      "migrateAccessCycleLifecycleCollection.js"
    );
    const runMigration = () =>
      spawnSync(
        process.execPath,
        [
          script,
          "--apply",
          "--confirm=MIGRATE_ACCESS_CYCLE_LIFECYCLES",
        ],
        {
          cwd: path.join(__dirname, ".."),
          env: {
            ...process.env,
            DB: databaseUri,
          },
          encoding: "utf8",
        }
      );

    const first = runMigration();
    assert.equal(
      first.status,
      0,
      `${first.stdout}\n${first.stderr}`
    );
    assert.match(
      first.stdout,
      /"stampedExistingCount": 1/,
      "동일 target의 pendingMarkerUpdates 분기도 실제 apply되어야 합니다."
    );
    await mongoose.connect(databaseUri);
    const migrated = await mongoose
      .connection.db
      .collection(
        ACCESS_CYCLE_LIFECYCLE_COLLECTION
      )
      .find({ _id: { $in: ids } })
      .sort({ _id: 1 })
      .toArray();
    assert.deepEqual(
      migrated
        .map((document) => document.status)
        .sort(),
      [
        "CANCELLED",
        "PAYBACK_COMPLETED",
        "REFUND_REVIEW",
      ],
      "겹치는 합법 lifecycle terminal status도 그대로 이전해야 합니다."
    );
    assert.equal(
      migrated.every(
        (document) =>
          document
            .legacyAccessCycleMigration
            ?.sourceCollection ===
            LEGACY_ACCESS_CYCLE_COLLECTION &&
          /^[a-f0-9]{64}$/.test(
            document
              .legacyAccessCycleMigration
              ?.sourceDigest || ""
          )
      ),
      true,
      "모든 legacy 복사본은 source digest provenance를 가져야 합니다."
    );
    await assertAccessCycleLifecycleMigrationReady({
      db: mongoose.connection.db,
    });
    await mongoose.disconnect();

    const replay = runMigration();
    assert.equal(
      replay.status,
      0,
      `${replay.stdout}\n${replay.stderr}`
    );
    assert.match(
      replay.stdout,
      /"pendingCopyCount": 0/
    );
    assert.match(
      replay.stdout,
      /"pendingMarkerCount": 0/
    );

    console.log(
      "AccessCycle lifecycle migration applies atomically, preserves terminal states, and replays idempotently"
    );
  } finally {
    await mongoose.disconnect().catch(
      () => {}
    );
    await replicaSet.stop().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
