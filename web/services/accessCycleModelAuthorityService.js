"use strict";

const { createHash } = require("node:crypto");
const { isDeepStrictEqual } = require("node:util");

const LEGACY_ACCESS_CYCLE_COLLECTION =
  "accesscycles";
const ACCESS_CYCLE_LIFECYCLE_COLLECTION =
  "accesscyclelifecycles";
const ACCESS_CYCLE_LIFECYCLE_MIGRATION_MARKER =
  "legacyAccessCycleMigration";
const ACCESS_CYCLE_LIFECYCLE_STATUSES =
  Object.freeze([
    "PAYMENT_PENDING",
    "SUB_ACTIVE",
    "SUB_CLOSING",
    "REFUND_REVIEW",
    "REFUND_HELD",
    "PAYBACK_COMPLETED",
    "PAYBACK_FAILED",
    "MAIN_ACTIVE",
    "MAIN_SETTLING",
    "CLOSED",
    "PAYMENT_DISPUTED",
    "SUSPENDED",
    "CANCELLED",
  ]);
const ACCESS_CYCLE_LIFECYCLE_ONLY_STATUSES =
  Object.freeze([
    "PAYMENT_PENDING",
    "SUB_ACTIVE",
    "SUB_CLOSING",
    "REFUND_REVIEW",
    "REFUND_HELD",
    "PAYBACK_FAILED",
    "MAIN_ACTIVE",
    "MAIN_SETTLING",
    "CLOSED",
    "PAYMENT_DISPUTED",
    "SUSPENDED",
  ]);

// GOAT Arena 지갑 문서와 겹치지 않는 결제·환불 생명주기 전용 필드만 사용한다.
// paymentOrderId는 GOAT 지갑에도 남을 수 있고 PAYBACK_COMPLETED·CANCELLED는
// 양쪽 status 계약에 존재하므로 단독 탐지 조건으로 사용하지 않는다.
const LEGACY_ACCESS_CYCLE_LIFECYCLE_SELECTOR =
  Object.freeze({
    $or: [
      {
        status: {
          $in:
            ACCESS_CYCLE_LIFECYCLE_ONLY_STATUSES,
        },
      },
      {
        refundStatus: {
          $exists: true,
        },
      },
      {
        activeRanking: {
          $exists: true,
        },
      },
      {
        paidAccessDaysGranted: {
          $exists: true,
        },
      },
      {
        cycleStreakDays: {
          $exists: true,
        },
      },
      {
        day30ReviewOn: {
          $exists: true,
        },
      },
    ],
  });

// 같은 accesscycles 문서에 과거 GOAT 지갑 필드가 섞였을 수 있다.
// 따라서 이전 증명은 지갑에서 바뀔 수 있는 status/division/잔액이나
// MongoDB timestamps/version이 아니라 생명주기 전용 권위 필드만 해시한다.
const ACCESS_CYCLE_LIFECYCLE_AUTHORITY_FIELDS =
  Object.freeze([
    "_id",
    "userId",
    "paymentOrderId",
    "policyVersionId",
    "previousCycleId",
    "refundStatus",
    "activeRanking",
    "startedAt",
    "paidAccessStartsOn",
    "paidAccessEndsOn",
    "day30ReviewOn",
    "day30CompletionOpensAt",
    "day30CompletionDeadlineAt",
    "day30ReviewAt",
    "completionPassUsedAt",
    "closedAt",
    "paidAccessDaysGranted",
    "refundChallengeDays",
    "lockedRefundDays",
    "bonusAccessDays",
    "lockedBonusDays",
    "cycleStreakDays",
    "lastRecognizedAttendanceDate",
    "completedSubNormalChallenges",
    "completedSubRevengeChallenges",
    "completedSubChallenges",
    "challengeRequestCount",
    "defenseAssignmentsInCycle",
    "defenseWinsInCycle",
    "lastDefenseAssignedAt",
    "refundAttendanceConditionMet",
    "refundBalanceConditionMet",
    "refundMinimumChallengeConditionMet",
    "refundEligible",
    "refundCompletedAt",
    "autoRenewEnabled",
    "integrityState",
  ]);

const ACCESS_CYCLE_LIFECYCLE_PROJECTION =
  Object.freeze(
    Object.fromEntries([
      ...ACCESS_CYCLE_LIFECYCLE_AUTHORITY_FIELDS,
      ACCESS_CYCLE_LIFECYCLE_MIGRATION_MARKER,
      "status",
    ].map((field) => [field, 1]))
  );

function canonicalValue(value) {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (value instanceof Date) {
    return { $date: value.toISOString() };
  }
  if (Buffer.isBuffer(value)) {
    return { $binary: value.toString("base64") };
  }
  if (
    value._bsontype === "ObjectId" &&
    typeof value.toHexString === "function"
  ) {
    return { $oid: value.toHexString() };
  }
  if (value._bsontype) {
    return {
      $bsonType: String(value._bsontype),
      value: String(value),
    };
  }
  if (Array.isArray(value)) {
    return value.map(canonicalValue);
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort((left, right) =>
        left.localeCompare(right, "en")
      )
      .map((key) => [
        key,
        canonicalValue(value[key]),
      ])
  );
}

function projectAccessCycleLifecycleAuthority(
  document
) {
  if (!document) return null;
  const projected = {};
  for (const field of
    ACCESS_CYCLE_LIFECYCLE_AUTHORITY_FIELDS) {
    if (
      Object.prototype.hasOwnProperty.call(
        document,
        field
      )
    ) {
      projected[field] = document[field];
    }
  }
  // 겹치는 status는 후보 탐지에는 쓰지 않지만, 다른 전용 필드로 생명주기
  // 문서임이 확정된 뒤에는 PAYBACK_COMPLETED·CANCELLED도 보존해야 한다.
  if (
    ACCESS_CYCLE_LIFECYCLE_STATUSES.includes(
      document.status
    )
  ) {
    projected.status = document.status;
  }
  return projected;
}

function accessCycleLifecycleSourceDigest(
  document
) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        canonicalValue(
          projectAccessCycleLifecycleAuthority(
            document
          )
        )
      )
    )
    .digest("hex");
}

function accessCycleLifecycleMigrationMarker(
  document,
  migratedAt = new Date()
) {
  return {
    sourceCollection:
      LEGACY_ACCESS_CYCLE_COLLECTION,
    sourceDigest:
      accessCycleLifecycleSourceDigest(
        document
      ),
    migratedAt,
  };
}

function hasMatchingMigrationMarker({
  sourceDocument,
  targetDocument,
}) {
  const marker =
    targetDocument?.[
      ACCESS_CYCLE_LIFECYCLE_MIGRATION_MARKER
    ];
  return Boolean(
    marker &&
      marker.sourceCollection ===
        LEGACY_ACCESS_CYCLE_COLLECTION &&
      marker.sourceDigest ===
        accessCycleLifecycleSourceDigest(
          sourceDocument
        )
  );
}

async function inspectAccessCycleLifecycleMigration({
  db,
  batchSize = 500,
  includeMissingIds = false,
  session = null,
} = {}) {
  if (!db) {
    throw new TypeError(
      "MongoDB db handle is required"
    );
  }
  const source = db.collection(
    LEGACY_ACCESS_CYCLE_COLLECTION
  );
  const target = db.collection(
    ACCESS_CYCLE_LIFECYCLE_COLLECTION
  );
  const cursor = source.find(
    LEGACY_ACCESS_CYCLE_LIFECYCLE_SELECTOR,
    {
      projection:
        ACCESS_CYCLE_LIFECYCLE_PROJECTION,
      sort: { _id: 1 },
      session,
    }
  );
  let sourceCandidateCount = 0;
  let targetMatchedCount = 0;
  let readyCount = 0;
  let conflictCount = 0;
  let unstampedCount = 0;
  const missingIds = [];
  const conflictIds = [];
  const unstampedIds = [];
  let batch = [];

  async function inspectBatch() {
    if (!batch.length) return;
    const existing = await target
      .find(
        {
          _id: {
            $in: batch.map(
              (document) => document._id
            ),
          },
        },
        {
          projection:
            ACCESS_CYCLE_LIFECYCLE_PROJECTION,
          session,
        }
      )
      .toArray();
    const existingById = new Map(
      existing.map((row) => [
        String(row._id),
        row,
      ])
    );
    targetMatchedCount += existing.length;
    for (const sourceDocument of batch) {
      const id = sourceDocument._id;
      const targetDocument =
        existingById.get(String(id));
      if (!targetDocument) {
        if (
          includeMissingIds ||
          missingIds.length < 20
        ) {
          missingIds.push(id);
        }
        continue;
      }
      if (
        hasMatchingMigrationMarker({
          sourceDocument,
          targetDocument,
        })
      ) {
        readyCount += 1;
        continue;
      }
      if (
        isDeepStrictEqual(
          canonicalValue(
            projectAccessCycleLifecycleAuthority(
              sourceDocument
            )
          ),
          canonicalValue(
            projectAccessCycleLifecycleAuthority(
              targetDocument
            )
          )
        )
      ) {
        unstampedCount += 1;
        if (unstampedIds.length < 20) {
          unstampedIds.push(id);
        }
        continue;
      }
      conflictCount += 1;
      if (conflictIds.length < 20) {
        conflictIds.push(id);
      }
    }
    batch = [];
  }

  for await (const row of cursor) {
    sourceCandidateCount += 1;
    batch.push(row);
    if (batch.length >= batchSize) {
      await inspectBatch();
    }
  }
  await inspectBatch();

  return {
    missingCount:
      sourceCandidateCount -
      targetMatchedCount,
    missingIds,
    conflictCount,
    conflictIds,
    unstampedCount,
    unstampedIds,
    readyCount,
    sourceCandidateCount,
    targetMatchedCount,
  };
}

async function assertAccessCycleLifecycleMigrationReady({
  db,
} = {}) {
  const report =
    await inspectAccessCycleLifecycleMigration({
      db,
    });
  if (
    report.missingCount === 0 &&
    report.conflictCount === 0 &&
    report.unstampedCount === 0
  ) {
    return report;
  }
  const error = new Error(
    "AccessCycle 생명주기 문서 이전이 필요합니다. 서버 쓰기를 시작하기 전에 dry-run 결과를 확인하고 명시적으로 이전하세요."
  );
  error.code =
    "ACCESS_CYCLE_LIFECYCLE_MIGRATION_REQUIRED";
  error.report = report;
  throw error;
}

module.exports = {
  ACCESS_CYCLE_LIFECYCLE_AUTHORITY_FIELDS,
  ACCESS_CYCLE_LIFECYCLE_COLLECTION,
  ACCESS_CYCLE_LIFECYCLE_MIGRATION_MARKER,
  ACCESS_CYCLE_LIFECYCLE_ONLY_STATUSES,
  ACCESS_CYCLE_LIFECYCLE_STATUSES,
  LEGACY_ACCESS_CYCLE_COLLECTION,
  LEGACY_ACCESS_CYCLE_LIFECYCLE_SELECTOR,
  accessCycleLifecycleMigrationMarker,
  accessCycleLifecycleSourceDigest,
  assertAccessCycleLifecycleMigrationReady,
  hasMatchingMigrationMarker,
  inspectAccessCycleLifecycleMigration,
  projectAccessCycleLifecycleAuthority,
};
