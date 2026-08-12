const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const {
  PolicyVersion,
} = require(
  "../models/policyVersionModel"
);
const {
  PAYMENT_ORDER_STATUSES,
  PaymentOrder,
} = require(
  "../models/paymentOrderModel"
);
const {
  ACTIVE_CYCLE_STATUSES,
  AccessCycle,
} = require(
  "../models/accessCycleModel"
);
const {
  DAY_LEDGER_ACCOUNTS,
  DayBalanceTransaction,
} = require(
  "../models/dayBalanceTransactionModel"
);
const {
  OUTBOX_EVENT_TYPES,
} = require(
  "../models/outboxEventModel"
);
const {
  accessRightsAt,
  createAccessCycleState,
} = require(
  "../services/accessCycleService"
);
const {
  assertBalancedEntries,
  assertCycleCacheMatches,
  buildPackageIssueTransaction,
  deriveUserBalances,
} = require(
  "../services/dayBalanceLedgerService"
);
const {
  policyReadiness,
} = require(
  "../services/policyVersionService"
);

const checks = [];
async function check(label, run) {
  try {
    await run();
    checks.push({
      label,
      passed: true,
    });
    console.log(`  ✓ ${label}`);
  } catch (error) {
    checks.push({
      label,
      passed: false,
      error,
    });
    console.log(
      `  ✗ ${label} — ${error.message}`
    );
  }
}

function objectId() {
  return new mongoose.Types.ObjectId();
}

async function run() {
  const adminId = objectId();
  const policy =
    new PolicyVersion({
      version: "2026-07-30-draft",
      effectiveFrom:
        new Date(
          "2026-07-30T00:00:00+09:00"
        ),
      createdBy: adminId,
    });
  await policy.validate();

  await check(
    "정책 기본값은 Sub 일반 1일·Revenge 2일·최소 완료 2회",
    () => {
      assert.equal(
        policy
          .subNormalTakeoverCostDays,
        1
      );
      assert.equal(
        policy
          .subRevengeCostDays,
        2
      );
      assert.equal(
        policy
          .minCompletedSubChallenges,
        2
      );
      assert.equal(
        policy
          .subChallengeRequestLimit,
        null
      );
    }
  );

  await check(
    "미확정 Day 30·No-show 값은 실제 페이백 공개를 막음",
    () => {
      const readiness =
        policyReadiness(policy);
      assert.equal(
        readiness
          .canCreateSandboxCycle,
        true
      );
      assert.equal(
        readiness
          .canExposePayback,
        false
      );
      assert.ok(
        readiness.paybackBlockers
          .includes(
            "minRecognizedProblemsPerDay"
          )
      );
      assert.ok(
        readiness.paybackBlockers
          .includes(
            "noShowCountsAsCompletedChallenge"
          )
      );
    }
  );

  const readyPolicy = {
    ...policy.toObject(),
    completionPass: {
      cycleDay: 30,
      opensAtKst: "00:00",
      deadlineAtKst: "23:00",
      allowedActivityTypes: [
        "PRACTICE",
        "WRONG_NOTE_REVIEW",
      ],
    },
    minRecognizedProblemsPerDay:
      5,
    minValidStudySecondsPerDay:
      900,
    noShowCountsAsCompletedChallenge:
      false,
    arenaTierStepMappingVersion:
      "arena-tier-v1",
    revengeBypassesShield: false,
  };

  await check(
    "정책값을 모두 고정해야 페이백·Main 공개 가능",
    () => {
      const readiness =
        policyReadiness(
          readyPolicy
        );
      assert.equal(
        readiness
          .canExposePayback,
        true
      );
      assert.equal(
        readiness
          .canExposeMainArena,
        true
      );
    }
  );

  const userId = objectId();
  const orderId = objectId();
  const cycleState =
    createAccessCycleState({
      userId,
      paymentOrderId: orderId,
      policyVersion:
        readyPolicy,
      paidAt:
        new Date(
          "2026-06-30T15:00:00.000Z"
        ),
      autoRenewEnabled: true,
    });

  await check(
    "7월 1일 결제는 KST 7월 29일까지 권리·7월 30일 심사",
    () => {
      assert.equal(
        cycleState
          .paidAccessStartsOn,
        "2026-07-01"
      );
      assert.equal(
        cycleState
          .paidAccessEndsOn,
        "2026-07-29"
      );
      assert.equal(
        cycleState.day30ReviewOn,
        "2026-07-30"
      );
      assert.equal(
        cycleState
          .refundChallengeDays,
        29
      );
      assert.equal(
        cycleState.activeRanking,
        "SUB"
      );
    }
  );

  await check(
    "유료 권리는 KST 날짜에서 계산하고 Day 30 Pass와 분리",
    () => {
      const day29 =
        accessRightsAt(
          cycleState,
          new Date(
            "2026-07-29T12:00:00+09:00"
          )
        );
      assert.equal(
        day29.cycleDay,
        29
      );
      assert.equal(
        day29.paidAccessActive,
        true
      );
      assert.equal(
        day29
          .completionPassActive,
        false
      );

      const closing = {
        ...cycleState,
        status: "SUB_CLOSING",
      };
      const day30 =
        accessRightsAt(
          closing,
          new Date(
            "2026-07-30T12:00:00+09:00"
          )
        );
      assert.equal(
        day30.paidAccessActive,
        false
      );
      assert.equal(
        day30
          .completionPassActive,
        true
      );
      assert.equal(
        day30
          .learningAccessActive,
        true
      );

      const expired =
        accessRightsAt(
          closing,
          new Date(
            "2026-07-30T23:00:00+09:00"
          )
        );
      assert.equal(
        expired
          .completionPassActive,
        false
      );

      const beforeStart =
        accessRightsAt(
          cycleState,
          new Date(
            "2026-06-30T12:00:00+09:00"
          )
        );
      assert.equal(
        beforeStart
          .paidAccessActive,
        false
      );
      assert.equal(
        beforeStart
          .paidAccessDaysRemaining,
        29
      );

      for (const status of [
        "SUSPENDED",
        "PAYMENT_DISPUTED",
        "CANCELLED",
        "CLOSED",
      ]) {
        const blocked =
          accessRightsAt(
            {
              ...cycleState,
              status,
            },
            new Date(
              "2026-07-15T12:00:00+09:00"
            )
          );
        assert.equal(
          blocked
            .paidAccessActive,
          false,
          status
        );
        assert.equal(
          blocked
            .learningAccessActive,
          false,
          status
        );
        assert.equal(
          blocked
            .paidAccessDaysRemaining,
          0,
          status
        );
      }
    }
  );

  const issue =
    buildPackageIssueTransaction({
      cycleId: objectId(),
      userId,
      orderId,
      policyVersion:
        readyPolicy,
      occurredAt:
        cycleState.startedAt,
      idempotencyKey:
        "payment:test:tx-001",
    });

  await check(
    "결제 원장은 paid access가 아니라 Sub 도전 일수 29만 발행",
    () => {
      assert.equal(
        issue.type,
        "PACKAGE_ISSUE"
      );
      assert.deepEqual(
        issue.entries.map(
          (entry) =>
            entry.account
        ),
        [
          "SYSTEM_ISSUE",
          "USER_REFUND_AVAILABLE",
        ]
      );
      assert.equal(
        issue.entries[0].debitDays,
        29
      );
      assert.equal(
        issue.entries[1]
          .creditDays,
        29
      );
      assert.ok(
        issue.entries.every(
          (entry) =>
            !entry.account.includes(
              "PAID_ACCESS"
            )
        )
      );
    }
  );

  await check(
    "불균형 원장은 즉시 거부",
    () => {
      assert.throws(
        () =>
          assertBalancedEntries([
            {
              account:
                "SYSTEM_ISSUE",
              debitDays: 29,
              creditDays: 0,
            },
            {
              account:
                "USER_REFUND_AVAILABLE",
              userId,
              cycleId:
                issue.cycleId,
              debitDays: 0,
              creditDays: 28,
            },
          ]),
        /must balance/
      );
    }
  );

  await check(
    "원장 합계와 AccessCycle 캐시 4종이 일치",
    () => {
      const balances =
        deriveUserBalances(
          [issue],
          {
            cycleId:
              issue.cycleId,
            userId,
          }
        );
      assert.equal(
        balances
          .USER_REFUND_AVAILABLE,
        29
      );
      assert.equal(
        assertCycleCacheMatches(
          {
            refundChallengeDays:
              29,
            lockedRefundDays: 0,
            bonusAccessDays: 0,
            lockedBonusDays: 0,
          },
          balances
        ),
        true
      );
      assert.throws(
        () =>
          assertCycleCacheMatches(
            {
              refundChallengeDays:
                28,
              lockedRefundDays: 0,
              bonusAccessDays: 0,
              lockedBonusDays: 0,
            },
            balances
          ),
        (error) =>
          error.code ===
          "LEDGER_CACHE_MISMATCH"
      );
    }
  );

  await check(
    "PaymentOrder는 결제 확정에 거래 ID·시각·양수 금액 요구",
    async () => {
      const captured =
        new PaymentOrder({
          userId,
          policyVersionId:
            policy._id,
          provider: "sandbox",
          providerOrderId:
            "order-001",
          providerTransactionId:
            "tx-001",
          webhookEventIds: [
            "event-001",
          ],
          listPriceMinor: 99000,
          discountMinor: 0,
          actualPaidMinor: 99000,
          status: "CAPTURED",
          paidAt:
            new Date(
              "2026-07-30T08:00:00Z"
            ),
        });
      await captured.validate();

      const invalid =
        new PaymentOrder({
          userId,
          policyVersionId:
            policy._id,
          provider: "sandbox",
          providerOrderId:
            "order-002",
          listPriceMinor: 99000,
          actualPaidMinor: 0,
          status: "CAPTURED",
        });
      await assert.rejects(
        invalid.validate(),
        /captured payment requires/
      );
      assert.ok(
        PAYMENT_ORDER_STATUSES.includes(
          "CAPTURED"
        )
      );
    }
  );

  await check(
    "AccessCycle은 사용자당 활성 주기 하나를 unique partial index로 강제",
    () => {
      const index =
        AccessCycle.schema
          .indexes()
          .find(
            ([, options]) =>
              options.name ===
              "one_active_cycle_per_user"
          );
      assert.ok(index);
      assert.equal(
        index[1].unique,
        true
      );
      assert.deepEqual(
        index[1]
          .partialFilterExpression
          .status.$in,
        ACTIVE_CYCLE_STATUSES
      );
    }
  );

  await check(
    "주기 완료 도전 합계는 일반+Revenge와 반드시 일치",
    async () => {
      const invalidCycle =
        new AccessCycle({
          ...cycleState,
          paymentOrderId:
            objectId(),
          completedSubNormalChallenges:
            1,
          completedSubRevengeChallenges:
            1,
          completedSubChallenges:
            1,
        });
      await assert.rejects(
        invalidCycle.validate(),
        /completed challenge total/
      );
    }
  );

  await check(
    "DayBalanceTransaction 모델도 차변=대변을 검증",
    async () => {
      const document =
        new DayBalanceTransaction(
          issue
        );
      await document.validate();

      const invalid =
        new DayBalanceTransaction({
          ...issue,
          transactionId:
            "bad-ledger",
          idempotencyKey:
            "bad-ledger",
          entries: [
            {
              account:
                "SYSTEM_ISSUE",
              debitDays: 29,
            },
            {
              account:
                "USER_REFUND_AVAILABLE",
              userId,
              cycleId:
                issue.cycleId,
              creditDays: 28,
            },
          ],
        });
      await assert.rejects(
        invalid.validate(),
        /debits and credits/
      );
      for (const account of [
        "SYSTEM_BURN",
        "SYSTEM_EXPIRY",
        "OPERATOR_VAULT",
      ]) {
        assert.ok(
          DAY_LEDGER_ACCOUNTS.includes(
            account
          )
        );
      }
    }
  );

  await check(
    "Outbox 계약에 결제·주기·정산·페이백 이벤트가 존재",
    () => {
      for (const eventType of [
        "PACKAGE_PURCHASED",
        "CYCLE_STARTED",
        "TAKEOVER_SETTLED",
        "REFUND_COMPLETED",
      ]) {
        assert.ok(
          OUTBOX_EVENT_TYPES.includes(
            eventType
          )
        );
      }
    }
  );

  const failed = checks.filter(
    (item) => !item.passed
  );
  console.log(
    failed.length
      ? `\n실패 ${failed.length}건`
      : `\n전부 통과 (${checks.length}건)`
  );
  process.exitCode =
    failed.length ? 1 : 0;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
