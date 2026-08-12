"use strict";

// Ranked 상점 production 정본 통합 테스트.
// 웹·iPad가 함께 쓰는 MainShop* 모델/원장/트랜잭션만 검증하며, 과거
// ArenaShop* 복제 엔진을 별도 테스트 세계로 되살리지 않는다.
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const { User } = require("../models/matthsModel");
const {
  AccessCycle,
  ArenaAccessState,
  ArenaLearningDayLedger,
  ArenaOutboxEvent,
  MainShopEffect,
  MainShopPolicyVersion,
  MainShopPurchase,
  ArenaMatch,
  ArenaMatchAttempt,
} = require("../models/goatArenaModel");
const {
  defaultPolicyItems,
  defenseScheduleProtectionCharge,
  getMainShopApiData,
  getMainShopPageData,
  listActiveMainDefenseRestUserIds,
  purchaseMainShopApiItem,
  updateMainShopPolicy,
} = require("../services/arenaShopPolicyService");

const NOW = new Date("2026-08-06T03:00:00.000Z"); // 목요일 12:00 KST
const DAY_MS = 24 * 60 * 60 * 1000;

function objectId() {
  return new mongoose.Types.ObjectId();
}

async function seedRankedUser({ availableLearningDays = 12 } = {}) {
  const user = await User.create({
    name: "ranked-shop-student",
    realName: "상점 테스트 학생",
    email: `ranked-shop-${objectId()}@example.com`,
    passwordHash: "not-a-real-password-hash",
    accountStatus: "active",
    isActive: true,
    termsAcceptedAt: NOW,
    school: { region: "서울", code: "shop-test", name: "테스트고" },
  });
  const cycle = await AccessCycle.create({
    userId: user._id,
    division: "MAIN",
    status: "ACTIVE",
    policyVersionId: objectId(),
    policyVersionCode: "SUBSCRIPTION-TEST-V1",
    policySnapshot: { code: "SUBSCRIPTION-TEST-V1" },
    pricePaid: 100000,
    paidAt: NOW,
    startsAt: NOW,
    baseExpiresAt: new Date(NOW.getTime() + 29 * DAY_MS),
    expiresAt: new Date(NOW.getTime() + 29 * DAY_MS),
    evaluationAt: new Date(NOW.getTime() + 29 * DAY_MS),
    availableLearningDays,
    paybackScoreDays: 0,
    lockedLearningDays: 0,
    reservedLearningDays: 0,
    learningDayBuckets: [{
      sourceType: "MAIN_ENTRY_BONUS",
      availableDays: availableLearningDays,
      reservedDays: 0,
      lockedDays: 0,
    }],
    firstDayMode: "SAME_DAY",
  });
  await ArenaAccessState.create({
    userId: user._id,
    currentCompetitiveDivision: "MAIN",
    accessCycleId: cycle._id,
    state: "PAID_ACTIVE",
    mainAchievementStatus: "ACHIEVED",
    currentSeasonPlacementCompleted: true,
  });
  return { user, cycle };
}

async function main() {
  const replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  try {
    await mongoose.connect(replicaSet.getUri(), { dbName: "arena-shop-authority" });
    const policy = await MainShopPolicyVersion.create({
      code: "MAIN-SHOP-V1",
      displayName: "Ranked 상점 정책 v1",
      status: "ACTIVE",
      effectiveFrom: new Date("2026-08-02T00:00:00+09:00"),
      items: defaultPolicyItems(),
      defenseConvenienceCooldownDays: 7,
      cosmeticRolloverWindowDays: 10,
      analysisTimeoutMs: 5 * 60 * 1000,
      analysisMaximumRetries: 2,
      changeSummary: "확정 규칙 테스트",
    });

    const { user, cycle } = await seedRankedUser();
    const settledMatchId = objectId();
    await ArenaMatch.collection.insertOne({
      _id: settledMatchId,
      division: "SUB",
      matchType: "REVENGE",
      status: "SETTLED",
      challenger: { userId: user._id },
      defender: { userId: objectId() },
      settledAt: NOW,
      createdAt: new Date(NOW.getTime() - DAY_MS),
      updatedAt: NOW,
    });
    const defenseMatchId = objectId();
    await ArenaMatch.collection.insertOne({
      _id: defenseMatchId,
      division: "MAIN",
      matchType: "NORMAL",
      matchOrigin: "MAIN_UPWARD_AUTO_MATCH",
      status: "READY",
      challenger: { userId: objectId() },
      defender: { userId: user._id },
      readyAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
    await ArenaMatchAttempt.collection.insertMany([
      { _id: objectId(), matchId: defenseMatchId, status: "READY", startedAt: null },
      { _id: objectId(), matchId: defenseMatchId, status: "READY", startedAt: null },
    ]);
    const initial = await getMainShopApiData({ userId: user._id, now: NOW });
    assert.equal(initial.wallet.availableLearningDays, 12);
    assert.deepEqual(initial.analysisTargets, [
      {
        id: String(settledMatchId),
        divisionLabel: "Unranked",
        matchTypeLabel: "재대결",
        occurredAt: NOW.toISOString(),
      },
    ]);
    assert.deepEqual(initial.defenseProtectionTargets, [
      {
        id: String(defenseMatchId),
        divisionLabel: "Ranked",
        matchTypeLabel: "공식 경기",
        occurredAt: NOW.toISOString(),
      },
    ]);
    assert.deepEqual(
      initial.items.map((item) => [
        item.itemCode,
        item.priceDays,
        item.releasePhase,
        item.purchasePreview.purchaseEligible,
      ]),
      [
        ["MATCH_ANALYSIS", 1, 1, true],
        ["DEFENSE_REST", 1, 1, true],
        ["DEFENSE_SCHEDULE_PROTECTION", 2, 2, false],
        ["INVITATION_ACCELERATION", 1, 2, false],
        ["MAIN_PROFILE_BORDER", 2, 1, true],
        ["STYLE_ENTRANCE", 1, 1, true],
      ],
    );
    assert.doesNotMatch(JSON.stringify(initial), /Main Division|Sub Division|판돈/);

    const first = await purchaseMainShopApiItem({
      userId: user._id,
      itemCode: "STYLE_ENTRANCE",
      purchaseId: "ipad-operation-style-1",
      now: NOW,
    });
    assert.equal(first.receipt.replayed, false);
    assert.equal(first.receipt.beforeAvailableDays, 12);
    assert.equal(first.receipt.afterAvailableDays, 11);
    assert.equal(first.shop.wallet.availableLearningDays, 11);
    assert.equal(first.receipt.purchase.itemCode, "STYLE_ENTRANCE");
    assert.equal(first.receipt.effect.itemCode, "STYLE_ENTRANCE");

    const replay = await purchaseMainShopApiItem({
      userId: user._id,
      itemCode: "STYLE_ENTRANCE",
      purchaseId: "ipad-operation-style-1",
      now: NOW,
    });
    assert.equal(replay.receipt.replayed, true);
    assert.equal(replay.shop.wallet.availableLearningDays, 11);
    assert.equal(await MainShopPurchase.countDocuments({ userId: user._id }), 1);
    assert.equal(await MainShopEffect.countDocuments({ userId: user._id }), 1);
    assert.equal(await ArenaLearningDayLedger.countDocuments({ userId: user._id }), 1);
    assert.equal(
      await ArenaOutboxEvent.countDocuments({ eventType: "MainShopItemPurchased" }),
      1,
    );

    const page = await getMainShopPageData({ userId: user._id, now: NOW });
    assert.equal(page.availableLearningDays, 11);
    assert.equal(page.purchases.length, 1);
    assert.equal(page.effects.length, 1);
    assert.deepEqual(
      page.items.map((item) => item.itemCode),
      ["MATCH_ANALYSIS", "DEFENSE_REST", "MAIN_PROFILE_BORDER", "STYLE_ENTRANCE"],
    );

    const defensePurchase = await MainShopPurchase.create({
      purchaseKey: `${user._id}:DEFENSE_REST:test`,
      userId: user._id,
      accessCycleId: cycle._id,
      itemCode: "DEFENSE_REST",
      itemDisplayName: "방어 휴식권",
      policyVersionId: policy._id,
      policyVersionCode: "MAIN-SHOP-V1",
      priceDays: 1,
      beforeAvailableDays: 11,
      afterAvailableDays: 10,
      status: "COMPLETED",
      purchasedAt: NOW,
    });
    await MainShopEffect.create({
      purchaseId: defensePurchase._id,
      userId: user._id,
      itemCode: "DEFENSE_REST",
      status: "ACTIVE",
      startsAt: NOW,
      endsAt: new Date(NOW.getTime() + DAY_MS),
      appliedAt: NOW,
    });
    assert.deepEqual(
      await listActiveMainDefenseRestUserIds({ userIds: [user._id], now: NOW }),
      [String(user._id)],
    );

    assert.deepEqual(
      defenseScheduleProtectionCharge(2),
      {
        burnedDays: 1,
        compensationDays: 1,
        priceDays: 2,
      },
      "방어 보호권은 확정 규칙대로 총 2일 중 1일 보상·1일 소각이어야 합니다.",
    );
    assert.throws(
      () =>
        defenseScheduleProtectionCharge(4),
      (error) =>
        error?.code ===
        "INVALID_DEFENSE_PROTECTION_PRICE",
      "방어 보호권 가격을 임의로 바꾸면 경제 규칙을 바꾸므로 실패해야 합니다.",
    );

    await assert.rejects(
      updateMainShopPolicy({
        adminUserId: user._id,
        itemPrices: Object.fromEntries(
          defaultPolicyItems().map((item) => [
            item.itemCode,
            item.itemCode ===
            "DEFENSE_SCHEDULE_PROTECTION"
              ? 4
              : item.priceDays,
          ]),
        ),
        enabledItems: defaultPolicyItems()
          .filter((item) => item.enabled)
          .map((item) => item.itemCode),
        changeSummary:
          "고정 가격 위반 회귀 검증",
        now: NOW,
      }),
      (error) =>
        error?.code ===
        "FIXED_DEFENSE_PROTECTION_PRICE",
      "관리자 정책에서도 방어 보호권 가격은 2일 외 값을 저장할 수 없어야 합니다.",
    );

    const rolloutNow = new Date(
      "2026-08-08T03:00:00.000Z"
    );
    await MainShopPolicyVersion.create({
      code: "MAIN-SHOP-ROLLOUT-TEST",
      displayName:
        "Ranked 상점 판매 게이트 테스트",
      status: "ACTIVE",
      effectiveFrom: new Date(
        "2026-08-08T00:00:00.000Z"
      ),
      items: defaultPolicyItems().map(
        (item) => {
          if (
            item.itemCode ===
            "MAIN_PROFILE_BORDER"
          ) {
            return {
              ...item,
              enabled: true,
              priceDays: 3,
              releasePhase: 2,
            };
          }
          if (
            item.itemCode ===
            "MATCH_ANALYSIS"
          ) {
            return {
              ...item,
              enabled: false,
              releasePhase: 1,
            };
          }
          if (
            item.itemCode ===
            "STYLE_ENTRANCE"
          ) {
            return {
              ...item,
              enabled: false,
            };
          }
          return item;
        }
      ),
      defenseConvenienceCooldownDays: 7,
      cosmeticRolloverWindowDays: 10,
      analysisTimeoutMs:
        5 * 60 * 1000,
      analysisMaximumRetries: 2,
      changeSummary:
        "enabled를 판매 정본으로 쓰는지 검증",
    });

    const rolloutApi =
      await getMainShopApiData({
        userId: user._id,
        now: rolloutNow,
      });
    const rolloutPage =
      await getMainShopPageData({
        userId: user._id,
        now: rolloutNow,
      });
    const borderApi = rolloutApi.items.find(
      (item) =>
        item.itemCode ===
        "MAIN_PROFILE_BORDER"
    );
    const analysisApi = rolloutApi.items.find(
      (item) =>
        item.itemCode ===
        "MATCH_ANALYSIS"
    );
    assert.equal(
      borderApi.releasePhase,
      2
    );
    assert.equal(
      borderApi.purchasePreview
        .purchaseEligible,
      true,
      "활성 정책에서 enabled인 상품은 releasePhase 표시값과 무관하게 웹·iPad에서 같아야 합니다.",
    );
    assert.equal(
      analysisApi.purchasePreview
        .purchaseEligible,
      false,
      "활성 정책에서 disabled인 상품은 phase 1이어도 구매할 수 없어야 합니다.",
    );
    assert.equal(
      rolloutPage.items.some(
        (item) =>
          item.itemCode ===
          "MAIN_PROFILE_BORDER"
      ),
      true
    );
    assert.equal(
      rolloutPage.items.some(
        (item) =>
          item.itemCode ===
          "MATCH_ANALYSIS"
      ),
      false
    );

    const disabledItemReplay =
      await purchaseMainShopApiItem({
        userId: user._id,
        itemCode: "STYLE_ENTRANCE",
        purchaseId:
          "ipad-operation-style-1",
        now: rolloutNow,
      });
    assert.equal(
      disabledItemReplay.receipt.replayed,
      true,
      "정책 교체로 상품이 비활성화돼도 완료된 requestId는 원영수증을 replay해야 합니다."
    );
    await assert.rejects(
      purchaseMainShopApiItem({
        userId: user._id,
        itemCode: "STYLE_ENTRANCE",
        purchaseId:
          "disabled-style-new-request",
        now: rolloutNow,
      }),
      (error) =>
        error?.code ===
        "MAIN_SHOP_ITEM_NOT_AVAILABLE",
      "판매 중단 뒤 새 requestId만 거절해야 합니다."
    );

    const borderPurchase =
      await purchaseMainShopApiItem({
        userId: user._id,
        itemCode:
          "MAIN_PROFILE_BORDER",
        purchaseId:
          "ipad-operation-border-rollout",
        now: rolloutNow,
      });
    assert.equal(
      borderPurchase.receipt.purchase
        .priceDays,
      3
    );
    assert.equal(
      borderPurchase.shop.wallet
        .availableLearningDays,
      8
    );

    const sundayLockedAt = new Date(
      "2026-08-09T06:30:00.000Z"
    ); // 일요일 15:30 KST
    const sundayPage =
      await getMainShopPageData({
        userId: user._id,
        now: sundayLockedAt,
      });
    const sundayApi =
      await getMainShopApiData({
        userId: user._id,
        now: sundayLockedAt,
      });
    assert.equal(sundayPage.sundayLocked, true);
    assert.equal(
      sundayApi.items.every(
        (item) =>
          item.purchasePreview
            .purchaseEligible === false
      ),
      true,
      "일요일 잠금 중에도 상점·잔액·내역은 읽되 새 구매 CTA는 모두 닫혀야 합니다."
    );
    await assert.rejects(
      purchaseMainShopApiItem({
        userId: user._id,
        itemCode: "DEFENSE_REST",
        purchaseId:
          "sunday-new-purchase-blocked",
        now: sundayLockedAt,
      }),
      (error) =>
        error?.code ===
        "SUNDAY_MAIN_SHOP_LOCK",
      "일요일 잠금 중 새 구매는 서비스 경계에서 거절해야 합니다."
    );
    const sundayReplay =
      await purchaseMainShopApiItem({
        userId: user._id,
        itemCode:
          "MAIN_PROFILE_BORDER",
        purchaseId:
          "ipad-operation-border-rollout",
        now: sundayLockedAt,
      });
    assert.equal(
      sundayReplay.receipt.replayed,
      true,
      "잠금 전에 완료된 요청의 idempotent replay는 새 구매가 아닙니다."
    );

    console.log("authoritative Ranked shop web/iPad transaction contracts passed");
  } finally {
    await mongoose.disconnect().catch(() => {});
    await replicaSet.stop().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
