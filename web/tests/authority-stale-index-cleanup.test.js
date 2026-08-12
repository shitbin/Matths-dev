"use strict";

const assert = require("node:assert/strict");
const { MongoClient, ObjectId } = require("mongodb");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const {
  APPLY_CONFIRMATION,
  AUTHORITY_INDEX_RULES,
  applyAuthorityIndexCleanup,
  assertApplyAuthorized,
  assertAuthorityIndexStartupReady,
  inspectAuthorityIndexes,
} = require("../services/authorityIndexCleanupService");
const {
  accessCycleLifecycleMigrationMarker,
} = require("../services/accessCycleModelAuthorityService");
const { parseArguments } = require("../scripts/cleanupAuthorityStaleIndexes");

const OFFICIAL_INDEXES = Object.freeze({
  accesscycles: Object.freeze([
    ["userId_1", { userId: 1 }, {}],
    ["status_1", { status: 1 }, {}],
    [
      "userId_1_status_1",
      { userId: 1, status: 1 },
      { unique: true, partialFilterExpression: { status: "ACTIVE" } },
    ],
    ["purchaseReference_1", { purchaseReference: 1 }, {
      unique: true,
      partialFilterExpression: { purchaseReference: { $type: "string" } },
    }],
  ]),
  arenamatchattempts: Object.freeze([
    ["matchId_1", { matchId: 1 }, {}],
    ["userId_1", { userId: 1 }, {}],
    ["status_1", { status: 1 }, {}],
    ["deadlineAt_1", { deadlineAt: 1 }, {}],
    ["matchId_1_userId_1", { matchId: 1, userId: 1 }, { unique: true }],
  ]),
  arenamatchattemptevents: Object.freeze([
    ["attemptId_1", { attemptId: 1 }, {}],
    ["matchId_1", { matchId: 1 }, {}],
    ["userId_1", { userId: 1 }, {}],
    ["eventType_1", { eventType: 1 }, {}],
    [
      "attemptId_1_idempotencyKey_1",
      { attemptId: 1, idempotencyKey: 1 },
      { unique: true },
    ],
  ]),
  arenarevengerights: Object.freeze([
    ["sourceMatchId_1", { sourceMatchId: 1 }, { unique: true }],
    ["division_1", { division: 1 }, {}],
    ["eligibleUserId_1", { eligibleUserId: 1 }, {}],
    ["opponentUserId_1", { opponentUserId: 1 }, {}],
    ["status_1", { status: 1 }, {}],
    ["completionDeadlineAt_1", { completionDeadlineAt: 1 }, {}],
  ]),
});

function collectionRule(name) {
  return AUTHORITY_INDEX_RULES.find((rule) => rule.collectionName === name);
}

async function createIndex(collection, name, key, options) {
  await collection.createIndex(key, { name, ...options });
}

async function seedOfficialCollections(db) {
  const ids = {
    accessUser: new ObjectId(),
    attemptUser: new ObjectId(),
    match: new ObjectId(),
    attempt: new ObjectId(),
    revengeUser: new ObjectId(),
  };
  await db.collection("accesscycles").insertOne({
    userId: ids.accessUser,
    paymentOrderId: new ObjectId(),
    status: "ACTIVE",
    division: "MAIN",
  });
  await db.collection("arenamatchattempts").insertOne({
    matchId: ids.match,
    userId: ids.attemptUser,
    status: "READY",
  });
  await db.collection("arenamatchattemptevents").insertOne({
    attemptId: ids.attempt,
    matchId: ids.match,
    userId: ids.attemptUser,
    eventType: "ATTEMPT_STARTED",
    idempotencyKey: "official-event-1",
  });
  await db.collection("arenarevengerights").insertOne({
    sourceMatchId: ids.match,
    division: "SUB",
    eligibleUserId: ids.revengeUser,
    opponentUserId: ids.attemptUser,
    status: "AVAILABLE",
  });

  for (const [collectionName, indexes] of Object.entries(OFFICIAL_INDEXES)) {
    const collection = db.collection(collectionName);
    for (const [name, key, options] of indexes) {
      await createIndex(collection, name, key, options);
    }
  }
}

async function seedExactStaleIndexes(db) {
  for (const rule of AUTHORITY_INDEX_RULES) {
    const collection = db.collection(rule.collectionName);
    for (const index of rule.staleIndexes) {
      await createIndex(collection, index.name, index.key, index.options);
    }
  }
}

async function indexNames(db, collectionName) {
  return new Set(
    (await db.collection(collectionName).listIndexes().toArray()).map(
      (index) => index.name,
    ),
  );
}

async function main() {
  assert.throws(
    () => assertApplyAuthorized({ apply: true, confirmation: "YES" }),
    (error) => error?.code === "APPLY_CONFIRMATION_REQUIRED",
  );
  assert.throws(
    () => assertApplyAuthorized({ apply: false, confirmation: APPLY_CONFIRMATION }),
    (error) => error?.code === "CONFIRM_WITHOUT_APPLY",
  );
  assert.deepEqual(parseArguments([]), {
    apply: false,
    confirmation: "",
    environment: "local",
    reportOutput: "",
  });
  assert.deepEqual(
    parseArguments(["--apply", `--confirm=${APPLY_CONFIRMATION}`]),
    {
      apply: true,
      confirmation: APPLY_CONFIRMATION,
      environment: "local",
      reportOutput: "",
    },
  );
  assert.throws(
    () => parseArguments(["--apply", `--confirm=${APPLY_CONFIRMATION}`, "--environment=production"]),
    /report-output/,
  );

  const replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const client = new MongoClient(replicaSet.getUri("authority-index-cleanup"));
  try {
    await client.connect();
    const db = client.db();
    await seedOfficialCollections(db);
    await seedExactStaleIndexes(db);

    const expectedStaleCount = AUTHORITY_INDEX_RULES.reduce(
      (sum, rule) => sum + rule.staleIndexes.length,
      0,
    );
    const dryRun = await inspectAuthorityIndexes({ db });
    assert.equal(dryRun.safeToApply, true);
    assert.equal(dryRun.removableCount, expectedStaleCount);
    assert.equal(dryRun.blockingIndexCount, 1);
    assert.equal(dryRun.fingerprintMismatchCount, 0);
    assert.equal(
      (await indexNames(db, "accesscycles")).has("paymentOrderId_1"),
      true,
      "dry-run must not remove a blocking stale index",
    );
    const localStartup = await assertAuthorityIndexStartupReady({
      db,
      isProduction: false,
    });
    assert.equal(localStartup.blockingIndexCount, 1);
    await assert.rejects(
      assertAuthorityIndexStartupReady({ db, isProduction: true }),
      (error) => error?.code === "AUTHORITY_INDEX_STARTUP_BLOCKED",
      "production startup must fail closed on the exact blocking index",
    );

    await db.collection("arenamatchattempts").insertOne({
      matchId: "legacy-match-1",
      participantUserId: new ObjectId(),
      participantRole: "CHALLENGER",
      questionPackId: new ObjectId(),
      timingPolicySnapshot: { version: "legacy" },
    });
    const beforeRefusal = await indexNames(db, "accesscycles");
    await assert.rejects(
      applyAuthorityIndexCleanup({ db, confirmation: APPLY_CONFIRMATION }),
      (error) => error?.code === "LEGACY_ROWS_PRESENT",
    );
    assert.deepEqual(
      await indexNames(db, "accesscycles"),
      beforeRefusal,
      "legacy rows must refuse the entire cleanup before any drop",
    );
    await db.collection("arenamatchattempts").deleteOne({
      participantUserId: { $exists: true },
    });

    const lifecycleSource = {
      _id: new ObjectId(),
      userId: new ObjectId(),
      paymentOrderId: new ObjectId(),
      policyVersionId: new ObjectId(),
      status: "SUB_ACTIVE",
      refundStatus: "NOT_STARTED",
      activeRanking: "SUB",
      paidAccessDaysGranted: 29,
    };
    await db.collection("accesscycles").insertOne(lifecycleSource);
    await assert.rejects(
      applyAuthorityIndexCleanup({ db, confirmation: APPLY_CONFIRMATION }),
      (error) => error?.code === "LEGACY_ROWS_PRESENT",
      "an unmigrated AccessCycle lifecycle row must block every drop",
    );
    await db.collection("accesscyclelifecycles").insertOne(lifecycleSource);
    await assert.rejects(
      applyAuthorityIndexCleanup({ db, confirmation: APPLY_CONFIRMATION }),
      (error) => error?.code === "LEGACY_ROWS_PRESENT",
      "a copied but unstamped lifecycle row is not migration proof",
    );
    await db.collection("accesscyclelifecycles").updateOne(
      { _id: lifecycleSource._id },
      {
        $set: {
          legacyAccessCycleMigration:
            accessCycleLifecycleMigrationMarker(lifecycleSource),
        },
      },
    );
    const migratedSourcePlan = await inspectAuthorityIndexes({ db });
    const accessPlan = migratedSourcePlan.collections.find(
      (collection) => collection.collectionName === "accesscycles",
    );
    assert.equal(accessPlan.legacyRowsPresent, true);
    assert.equal(accessPlan.legacyRowsVerifiedMigrated, true);
    assert.equal(accessPlan.legacyRowsBlockApply, false);
    assert.equal(accessPlan.legacyVerification.readyCount, 1);

    const access = db.collection("accesscycles");
    await access.dropIndex("activeRanking_1");
    await createIndex(access, "activeRanking_1", { activeRanking: 1 }, { sparse: true });
    const mismatch = await inspectAuthorityIndexes({ db });
    assert.equal(mismatch.fingerprintMismatchCount, 1);
    assert.equal(mismatch.safeToApply, false);
    await assert.rejects(
      applyAuthorityIndexCleanup({ db, confirmation: APPLY_CONFIRMATION }),
      (error) => error?.code === "INDEX_FINGERPRINT_MISMATCH",
    );
    assert.equal(
      (await indexNames(db, "accesscycles")).has("paymentOrderId_1"),
      true,
      "fingerprint mismatch must refuse all drops",
    );
    await access.dropIndex("activeRanking_1");
    const exactActiveRanking = collectionRule("accesscycles").staleIndexes.find(
      (index) => index.name === "activeRanking_1",
    );
    await createIndex(
      access,
      exactActiveRanking.name,
      exactActiveRanking.key,
      exactActiveRanking.options,
    );

    const applied = await applyAuthorityIndexCleanup({
      db,
      confirmation: APPLY_CONFIRMATION,
    });
    assert.equal(applied.dropped.length, expectedStaleCount);
    assert.equal(applied.after.removableCount, 0);
    assert.equal(
      await db.collection("accesscycles").countDocuments({ _id: lifecycleSource._id }),
      1,
      "cleanup removes indexes only and keeps the provenance source row",
    );
    assert.equal(
      await db
        .collection("accesscyclelifecycles")
        .countDocuments({ _id: lifecycleSource._id }),
      1,
      "cleanup keeps the verified migration target",
    );
    for (const [collectionName, officialIndexes] of Object.entries(OFFICIAL_INDEXES)) {
      const names = await indexNames(db, collectionName);
      for (const [name] of officialIndexes) {
        assert.equal(
          names.has(name),
          true,
          `official index ${collectionName}.${name} must be preserved`,
        );
      }
    }

    const replay = await applyAuthorityIndexCleanup({
      db,
      confirmation: APPLY_CONFIRMATION,
    });
    assert.deepEqual(replay.dropped, []);
    assert.equal(replay.before.removableCount, 0);
    assert.equal(replay.after.removableCount, 0);
    const productionStartup = await assertAuthorityIndexStartupReady({
      db,
      isProduction: true,
    });
    assert.equal(productionStartup.blockingIndexCount, 0);

    const serverSource = require("node:fs").readFileSync(
      require("node:path").join(__dirname, "..", "server.js"),
      "utf8",
    );
    assert.match(serverSource, /assertAuthorityIndexStartupReady\s*\(/);
    assert.match(serverSource, /isProduction\s*,/);

    console.log(
      `Authority stale index cleanup dry-run/refusal/exact apply/replay passed (${expectedStaleCount} allowlisted indexes)`,
    );
  } finally {
    await client.close().catch(() => {});
    await replicaSet.stop().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
