"use strict";

const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
  MongoMemoryServer,
} = require("mongodb-memory-server");
const {
  ACCESS_CYCLE_LIFECYCLE_COLLECTION,
  LEGACY_ACCESS_CYCLE_COLLECTION,
  accessCycleLifecycleMigrationMarker,
  assertAccessCycleLifecycleMigrationReady,
  inspectAccessCycleLifecycleMigration,
  projectAccessCycleLifecycleAuthority,
} = require("../services/accessCycleModelAuthorityService");

async function main() {
  const mongo =
    await MongoMemoryServer.create();
  try {
    await mongoose.connect(
      mongo.getUri(),
      {
        dbName:
          "access-cycle-migration-guard",
      }
    );
    const db = mongoose.connection.db;
    const source = db.collection(
      LEGACY_ACCESS_CYCLE_COLLECTION
    );
    const target = db.collection(
      ACCESS_CYCLE_LIFECYCLE_COLLECTION
    );

    for (const status of [
      "PAYBACK_COMPLETED",
      "CANCELLED",
    ]) {
      assert.equal(
        projectAccessCycleLifecycleAuthority({
          _id: new mongoose.Types.ObjectId(),
          refundStatus: "COMPLETED",
          paidAccessDaysGranted: 29,
          status,
        }).status,
        status,
        `${status} 생명주기 상태를 이전 projection에서 버리면 안 됩니다.`
      );
    }

    await source.insertOne({
      _id: new mongoose.Types.ObjectId(),
      division: "MAIN",
      status: "ACTIVE",
      availableLearningDays: 12,
      // 실제 기존 GOAT 지갑에도 결제 추적용 paymentOrderId가 남을 수 있다.
      // 이 필드 하나만으로 생명주기 이전 대상으로 분류하면 안 된다.
      paymentOrderId:
        new mongoose.Types.ObjectId(),
    });
    assert.deepEqual(
      await inspectAccessCycleLifecycleMigration({
        db,
      }),
      {
        conflictCount: 0,
        conflictIds: [],
        missingCount: 0,
        missingIds: [],
        readyCount: 0,
        sourceCandidateCount: 0,
        targetMatchedCount: 0,
        unstampedCount: 0,
        unstampedIds: [],
      },
      "GOAT Arena 지갑 문서를 생명주기 이전 대상으로 오인하면 안 됩니다."
    );

    const staleId =
      new mongoose.Types.ObjectId();
    await source.insertOne({
      _id: staleId,
      refundStatus: "NOT_STARTED",
      status: "SUB_ACTIVE",
      paidAccessDaysGranted: 29,
    });
    await target.insertOne({
      _id: staleId,
      refundStatus: "COMPLETED",
      status: "CLOSED",
      paidAccessDaysGranted: 0,
    });
    const staleTarget =
      await inspectAccessCycleLifecycleMigration({
        db,
      });
    assert.equal(staleTarget.conflictCount, 1);
    await assert.rejects(
      assertAccessCycleLifecycleMigrationReady({
        db,
      }),
      (error) =>
        error?.code ===
          "ACCESS_CYCLE_LIFECYCLE_MIGRATION_REQUIRED" &&
        error?.report?.conflictCount === 1,
      "같은 _id의 다른 환불·결제 상태를 이전 완료로 오인하면 안 됩니다."
    );
    await source.deleteOne({ _id: staleId });
    await target.deleteOne({ _id: staleId });

    const legacyDocument = {
      _id: new mongoose.Types.ObjectId(),
      paymentOrderId:
        new mongoose.Types.ObjectId(),
      refundStatus: "NOT_STARTED",
      status: "SUB_ACTIVE",
      paidAccessDaysGranted: 29,
    };
    await source.insertOne(
      legacyDocument
    );
    const missing =
      await inspectAccessCycleLifecycleMigration({
        db,
      });
    assert.equal(missing.missingCount, 1);
    await assert.rejects(
      assertAccessCycleLifecycleMigrationReady({
        db,
      }),
      (error) =>
        error?.code ===
        "ACCESS_CYCLE_LIFECYCLE_MIGRATION_REQUIRED",
      "미이전 문서가 있으면 production bootstrap이 fail-closed여야 합니다."
    );

    await target.insertOne({
      ...legacyDocument,
    });
    const unstamped =
      await inspectAccessCycleLifecycleMigration({
        db,
      });
    assert.equal(unstamped.unstampedCount, 1);
    await assert.rejects(
      assertAccessCycleLifecycleMigrationReady({
        db,
      }),
      (error) =>
        error?.code ===
        "ACCESS_CYCLE_LIFECYCLE_MIGRATION_REQUIRED",
      "내용만 복사되고 이전 증명이 없는 문서도 production bootstrap을 통과하면 안 됩니다."
    );
    await target.updateOne(
      { _id: legacyDocument._id },
      {
        $set: {
          legacyAccessCycleMigration:
            accessCycleLifecycleMigrationMarker(
              legacyDocument,
              new Date(
                "2026-08-10T00:00:00.000Z"
              )
            ),
        },
      }
    );
    const ready =
      await assertAccessCycleLifecycleMigrationReady({
        db,
      });
    assert.equal(ready.missingCount, 0);
    assert.equal(
      ready.targetMatchedCount,
      1
    );
    assert.equal(ready.readyCount, 1);

    await target.updateOne(
      { _id: legacyDocument._id },
      {
        $set: {
          status: "CLOSED",
          refundStatus: "COMPLETED",
          paidAccessDaysGranted: 0,
        },
      }
    );
    const evolvedTarget =
      await assertAccessCycleLifecycleMigrationReady({
        db,
      });
    assert.equal(
      evolvedTarget.readyCount,
      1,
      "명시 이전된 대상 문서의 정상 후속 상태 변경은 이전 충돌로 오인하면 안 됩니다."
    );

    await source.updateOne(
      { _id: legacyDocument._id },
      {
        $set: {
          refundStatus: "PENDING",
        },
      }
    );
    const sourceChanged =
      await inspectAccessCycleLifecycleMigration({
        db,
      });
    assert.equal(sourceChanged.conflictCount, 1);
    await assert.rejects(
      assertAccessCycleLifecycleMigrationReady({
        db,
      }),
      (error) =>
        error?.code ===
          "ACCESS_CYCLE_LIFECYCLE_MIGRATION_REQUIRED" &&
        error?.report?.conflictCount === 1,
      "이전 증명 뒤 legacy 생명주기 권위 필드가 바뀌면 fail-closed여야 합니다."
    );

    console.log(
      "AccessCycle lifecycle migration guard fails closed without misclassifying GOAT wallets"
    );
  } finally {
    await mongoose.disconnect().catch(
      () => {}
    );
    await mongo.stop().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
