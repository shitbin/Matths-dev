"use strict";

const {
  LEGACY_ACCESS_CYCLE_LIFECYCLE_SELECTOR,
  inspectAccessCycleLifecycleMigration,
} = require("./accessCycleModelAuthorityService");

/*
 * 과거에 서로 다른 스키마가 production collection 이름을 공유하면서 남긴
 * 인덱스만 다룬다. 이름만 맞는 인덱스를 제거하지 않도록 key 순서와 MongoDB
 * semantic options까지 고정된 allowlist로 비교한다.
 */

const APPLY_CONFIRMATION =
  "DROP_EXACT_STALE_AUTHORITY_INDEXES_ONLY";

const ACTIVE_LIFECYCLE_STATUSES = Object.freeze([
  "PAYMENT_PENDING",
  "SUB_ACTIVE",
  "SUB_CLOSING",
  "REFUND_REVIEW",
  "REFUND_HELD",
  "PAYBACK_COMPLETED",
  "MAIN_ACTIVE",
  "MAIN_SETTLING",
  "PAYMENT_DISPUTED",
  "SUSPENDED",
]);

function staleIndex(name, key, options = {}, impact = "STALE") {
  return Object.freeze({
    name,
    key: Object.freeze({ ...key }),
    options: Object.freeze({ ...options }),
    impact,
  });
}

const AUTHORITY_INDEX_RULES = Object.freeze([
  Object.freeze({
    collectionName: "accesscycles",
    legacyModel: "AccessCycleLifecycle",
    // paymentOrderId and two status values overlap the official wallet. Reuse
    // the lifecycle migration's conservative selector instead of inventing a
    // broader row-shape test here.
    legacyShapeQuery: LEGACY_ACCESS_CYCLE_LIFECYCLE_SELECTOR,
    // The lifecycle migration intentionally keeps its source row for
    // provenance. A source row may pass only after every candidate has a
    // matching target digest marker; missing/conflicting/unstamped rows block.
    legacyRowPolicy: "VERIFIED_ACCESS_CYCLE_MIGRATION",
    staleIndexes: Object.freeze([
      staleIndex(
        "paymentOrderId_1",
        { paymentOrderId: 1 },
        { unique: true },
        "BLOCKING",
      ),
      staleIndex("refundStatus_1", { refundStatus: 1 }),
      staleIndex("activeRanking_1", { activeRanking: 1 }),
      staleIndex(
        "one_active_cycle_per_user",
        { userId: 1 },
        {
          unique: true,
          partialFilterExpression: {
            status: { $in: ACTIVE_LIFECYCLE_STATUSES },
          },
        },
      ),
      staleIndex(
        "status_1_day30ReviewOn_1",
        { status: 1, day30ReviewOn: 1 },
      ),
      staleIndex(
        "refundStatus_1_day30ReviewOn_1",
        { refundStatus: 1, day30ReviewOn: 1 },
      ),
      staleIndex(
        "activeRanking_1_status_1",
        { activeRanking: 1, status: 1 },
      ),
    ]),
  }),
  Object.freeze({
    collectionName: "arenamatchattempts",
    legacyModel: "RankTakeoverAttempt",
    legacyShapeQuery: Object.freeze({
      $or: Object.freeze([
        Object.freeze({ participantUserId: Object.freeze({ $exists: true }) }),
        Object.freeze({ participantRole: Object.freeze({ $exists: true }) }),
        Object.freeze({ questionPackId: Object.freeze({ $exists: true }) }),
        Object.freeze({ timingPolicySnapshot: Object.freeze({ $exists: true }) }),
      ]),
    }),
    staleIndexes: Object.freeze([
      staleIndex("participantUserId_1", { participantUserId: 1 }),
      staleIndex("endsAt_1", { endsAt: 1 }),
      staleIndex(
        "one_arena_attempt_per_match_role",
        { matchId: 1, participantRole: 1 },
        { unique: true },
      ),
      staleIndex(
        "one_arena_attempt_per_match_participant",
        { matchId: 1, participantUserId: 1 },
        { unique: true },
      ),
      staleIndex(
        "one_arena_attempt_per_sealed_pack",
        { questionPackId: 1 },
        { unique: true },
      ),
      staleIndex(
        "arena_attempt_deadline_scan",
        { status: 1, endsAt: 1 },
      ),
    ]),
  }),
  Object.freeze({
    collectionName: "arenamatchattemptevents",
    legacyModel: "RankTakeoverAttemptEvent",
    legacyShapeQuery: Object.freeze({
      $or: Object.freeze([
        Object.freeze({ clientEventId: Object.freeze({ $exists: true }) }),
        Object.freeze({ serverSequence: Object.freeze({ $exists: true }) }),
        Object.freeze({ participantUserId: Object.freeze({ $exists: true }) }),
      ]),
    }),
    staleIndexes: Object.freeze([
      staleIndex(
        "one_client_event_per_arena_attempt",
        { attemptId: 1, clientEventId: 1 },
        { unique: true },
      ),
      staleIndex(
        "monotonic_server_sequence_per_arena_attempt",
        { attemptId: 1, serverSequence: 1 },
        { unique: true },
      ),
    ]),
  }),
  Object.freeze({
    collectionName: "arenarevengerights",
    legacyModel: "RankTakeoverRevengeRight",
    legacyShapeQuery: Object.freeze({
      $or: Object.freeze([
        Object.freeze({ rightId: Object.freeze({ $exists: true }) }),
        Object.freeze({ entitledUserId: Object.freeze({ $exists: true }) }),
        Object.freeze({ targetUserId: Object.freeze({ $exists: true }) }),
        Object.freeze({ sourceMatchDocumentId: Object.freeze({ $exists: true }) }),
      ]),
    }),
    staleIndexes: Object.freeze([
      staleIndex("seasonId_1", { seasonId: 1 }),
      staleIndex("policyVersionId_1", { policyVersionId: 1 }),
      staleIndex("rankingType_1", { rankingType: 1 }),
      staleIndex("entitledUserId_1", { entitledUserId: 1 }),
      staleIndex("targetUserId_1", { targetUserId: 1 }),
      staleIndex("expiresAt_1", { expiresAt: 1 }),
      staleIndex(
        "one_revenge_right_per_public_id",
        { rightId: 1 },
        { unique: true },
      ),
      staleIndex(
        "one_revenge_right_per_source_document",
        { sourceMatchDocumentId: 1 },
        { unique: true },
      ),
      staleIndex(
        "one_revenge_right_per_source_and_loser",
        { sourceMatchId: 1, entitledUserId: 1 },
        { unique: true },
      ),
      staleIndex(
        "one_revenge_right_per_consuming_match",
        { consumedByMatchId: 1 },
        {
          unique: true,
          partialFilterExpression: {
            consumedByMatchId: { $type: "string" },
          },
        },
      ),
      staleIndex(
        "entitledUserId_1_seasonId_1_rankingType_1_status_1_expiresAt_1",
        {
          entitledUserId: 1,
          seasonId: 1,
          rankingType: 1,
          status: 1,
          expiresAt: 1,
        },
      ),
    ]),
  }),
]);

const INDEX_METADATA_FIELDS = new Set(["key", "name", "ns", "v"]);

function canonicalValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right, "en"))
        .map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
}

function semanticOptions(index) {
  return canonicalValue(
    Object.fromEntries(
      Object.entries(index || {}).filter(
        ([key, value]) =>
          !INDEX_METADATA_FIELDS.has(key) && value !== undefined && value !== false,
      ),
    ),
  );
}

function indexFingerprint(index) {
  return JSON.stringify({
    name: String(index?.name || ""),
    // MongoDB compound index order is significant, so do not sort key entries.
    key: Object.entries(index?.key || {}),
    options: semanticOptions(index),
  });
}

function expectedIndex(rule) {
  return {
    name: rule.name,
    key: rule.key,
    ...rule.options,
  };
}

function exactIndexMatch(actual, rule) {
  return indexFingerprint(actual) === indexFingerprint(expectedIndex(rule));
}

function isNamespaceMissing(error) {
  return error?.code === 26 || error?.codeName === "NamespaceNotFound";
}

function isIndexMissing(error) {
  return error?.code === 27 || error?.codeName === "IndexNotFound";
}

async function collectionNames(db) {
  return new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      ({ name }) => name,
    ),
  );
}

async function indexesFor(collection) {
  try {
    return await collection.listIndexes().toArray();
  } catch (error) {
    if (isNamespaceMissing(error)) return [];
    throw error;
  }
}

async function hasLegacyRows(collection, query) {
  return Boolean(
    await collection.findOne(query, {
      projection: { _id: 1 },
    }),
  );
}

async function inspectLegacyRowSafety({ db, collection, rule }) {
  const legacyRowsPresent = await hasLegacyRows(
    collection,
    rule.legacyShapeQuery,
  );
  if (!legacyRowsPresent) {
    return {
      legacyRowsPresent: false,
      legacyRowsVerifiedMigrated: false,
      legacyRowsBlockApply: false,
      legacyVerification: null,
    };
  }

  if (rule.legacyRowPolicy === "VERIFIED_ACCESS_CYCLE_MIGRATION") {
    const migration = await inspectAccessCycleLifecycleMigration({ db });
    const verified =
      migration.sourceCandidateCount > 0 &&
      migration.missingCount === 0 &&
      migration.conflictCount === 0 &&
      migration.unstampedCount === 0 &&
      migration.readyCount === migration.sourceCandidateCount;
    return {
      legacyRowsPresent: true,
      legacyRowsVerifiedMigrated: verified,
      legacyRowsBlockApply: !verified,
      // Never expose document IDs from the migration inspector in this audit.
      legacyVerification: {
        sourceCandidateCount: migration.sourceCandidateCount,
        targetMatchedCount: migration.targetMatchedCount,
        readyCount: migration.readyCount,
        missingCount: migration.missingCount,
        conflictCount: migration.conflictCount,
        unstampedCount: migration.unstampedCount,
      },
    };
  }

  return {
    legacyRowsPresent: true,
    legacyRowsVerifiedMigrated: false,
    legacyRowsBlockApply: true,
    legacyVerification: null,
  };
}

async function inspectAuthorityIndexes({
  db,
  rules = AUTHORITY_INDEX_RULES,
} = {}) {
  if (!db) throw new TypeError("db is required");
  const existingCollections = await collectionNames(db);
  const collections = [];

  for (const rule of rules) {
    const exists = existingCollections.has(rule.collectionName);
    if (!exists) {
      collections.push({
        collectionName: rule.collectionName,
        legacyModel: rule.legacyModel,
        exists: false,
        legacyRowsPresent: false,
        legacyRowsVerifiedMigrated: false,
        legacyRowsBlockApply: false,
        legacyVerification: null,
        removable: [],
        fingerprintMismatches: [],
      });
      continue;
    }

    const collection = db.collection(rule.collectionName);
    const [indexes, legacyRowSafety] = await Promise.all([
      indexesFor(collection),
      inspectLegacyRowSafety({ db, collection, rule }),
    ]);
    const indexesByName = new Map(indexes.map((index) => [index.name, index]));
    const removable = [];
    const fingerprintMismatches = [];

    for (const stale of rule.staleIndexes) {
      const actual = indexesByName.get(stale.name);
      if (!actual) continue;
      if (exactIndexMatch(actual, stale)) {
        removable.push({
          name: stale.name,
          key: stale.key,
          options: stale.options,
          impact: stale.impact,
          fingerprint: indexFingerprint(actual),
        });
      } else {
        fingerprintMismatches.push({
          name: stale.name,
          expectedFingerprint: indexFingerprint(expectedIndex(stale)),
          actualFingerprint: indexFingerprint(actual),
        });
      }
    }

    collections.push({
      collectionName: rule.collectionName,
      legacyModel: rule.legacyModel,
      exists: true,
      ...legacyRowSafety,
      removable,
      fingerprintMismatches,
    });
  }

  const removableCount = collections.reduce(
    (sum, collection) => sum + collection.removable.length,
    0,
  );
  const blockingIndexCount = collections.reduce(
    (sum, collection) =>
      sum + collection.removable.filter((index) => index.impact === "BLOCKING").length,
    0,
  );
  const fingerprintMismatchCount = collections.reduce(
    (sum, collection) => sum + collection.fingerprintMismatches.length,
    0,
  );
  const legacyBlockedCollections = collections
    .filter(
      (collection) =>
        collection.legacyRowsBlockApply && collection.removable.length > 0,
    )
    .map((collection) => collection.collectionName);

  return {
    safeToApply:
      fingerprintMismatchCount === 0 && legacyBlockedCollections.length === 0,
    removableCount,
    blockingIndexCount,
    fingerprintMismatchCount,
    legacyBlockedCollections,
    collections,
  };
}

function assertApplyAuthorized({ apply, confirmation }) {
  if (!apply) {
    if (confirmation) {
      const error = new Error("--confirm cannot be used without --apply");
      error.code = "CONFIRM_WITHOUT_APPLY";
      throw error;
    }
    return;
  }
  if (confirmation !== APPLY_CONFIRMATION) {
    const error = new Error(
      `apply requires --confirm=${APPLY_CONFIRMATION}`,
    );
    error.code = "APPLY_CONFIRMATION_REQUIRED";
    throw error;
  }
}

function assertSafePlan(plan) {
  if (plan.fingerprintMismatchCount > 0) {
    const error = new Error(
      "an allowlisted index name has a non-allowlisted key/options fingerprint",
    );
    error.code = "INDEX_FINGERPRINT_MISMATCH";
    error.report = plan;
    throw error;
  }
  if (plan.legacyBlockedCollections.length > 0) {
    const error = new Error(
      `legacy-shaped rows remain in: ${plan.legacyBlockedCollections.join(", ")}`,
    );
    error.code = "LEGACY_ROWS_PRESENT";
    error.report = plan;
    throw error;
  }
}

async function applyAuthorityIndexCleanup({
  db,
  confirmation,
  rules = AUTHORITY_INDEX_RULES,
} = {}) {
  assertApplyAuthorized({ apply: true, confirmation });
  const before = await inspectAuthorityIndexes({ db, rules });
  assertSafePlan(before);
  const dropped = [];

  for (const collectionPlan of before.collections) {
    if (collectionPlan.removable.length === 0) continue;
    const rule = rules.find(
      (candidate) => candidate.collectionName === collectionPlan.collectionName,
    );
    const collection = db.collection(collectionPlan.collectionName);

    // DDL is not transactional. Recheck row shape before every collection and
    // exact fingerprint immediately before every drop to fail closed if state
    // changed after the initial plan.
    const legacyRowSafety = await inspectLegacyRowSafety({
      db,
      collection,
      rule,
    });
    if (legacyRowSafety.legacyRowsBlockApply) {
      const error = new Error(
        `unmigrated or conflicting legacy-shaped rows remain in ${rule.collectionName}`,
      );
      error.code = "LEGACY_ROWS_PRESENT";
      throw error;
    }

    for (const planned of collectionPlan.removable) {
      const stale = rule.staleIndexes.find((index) => index.name === planned.name);
      const current = (await indexesFor(collection)).find(
        (index) => index.name === planned.name,
      );
      if (!current) continue;
      if (!exactIndexMatch(current, stale)) {
        const error = new Error(
          `${rule.collectionName}.${planned.name} changed after inspection`,
        );
        error.code = "INDEX_FINGERPRINT_CHANGED";
        throw error;
      }
      try {
        await collection.dropIndex(planned.name);
        dropped.push({
          collectionName: rule.collectionName,
          indexName: planned.name,
        });
      } catch (error) {
        if (!isIndexMissing(error)) throw error;
      }
    }
  }

  const after = await inspectAuthorityIndexes({ db, rules });
  assertSafePlan(after);
  if (after.removableCount > 0) {
    const error = new Error("authority index cleanup did not converge");
    error.code = "INDEX_CLEANUP_INCOMPLETE";
    error.report = after;
    throw error;
  }

  return { before, after, dropped };
}

async function assertAuthorityIndexStartupReady({
  db,
  isProduction = false,
  rules = AUTHORITY_INDEX_RULES,
} = {}) {
  const report = await inspectAuthorityIndexes({ db, rules });
  const startupBlocked =
    report.blockingIndexCount > 0 ||
    report.fingerprintMismatchCount > 0 ||
    report.legacyBlockedCollections.length > 0;
  if (isProduction && startupBlocked) {
    const error = new Error(
      "production DB authority index audit failed; run the read-only audit and the explicit maintenance cleanup before startup",
    );
    error.code = "AUTHORITY_INDEX_STARTUP_BLOCKED";
    error.report = report;
    throw error;
  }
  return report;
}

module.exports = {
  ACTIVE_LIFECYCLE_STATUSES,
  APPLY_CONFIRMATION,
  AUTHORITY_INDEX_RULES,
  applyAuthorityIndexCleanup,
  assertAuthorityIndexStartupReady,
  assertApplyAuthorized,
  exactIndexMatch,
  indexFingerprint,
  inspectAuthorityIndexes,
};
