const assert = require("node:assert/strict");
const {
  RULES,
  buildAccessSummary,
  completeRefundState,
  day30CompletionPassAvailable,
  packagePurchaseBlockers,
  recordQualifiedStudyDayState,
  refundEligibility,
  startPackageCycleState,
} = require(
  "../services/accessEconomyService"
);
const {
  AccessLedgerEntry,
  LearningAccessAccount,
} = require(
  "../models/accessEconomyModel"
);

const checks = [];
function check(label, run) {
  try {
    run();
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

const cycle =
  startPackageCycleState({
    cycleId: "cycle-2026-07",
    paymentReference:
      "payment-001",
    purchaseAmountKRW: 99000,
    startedAt:
      new Date(
        "2026-06-30T15:00:00.000Z"
      ),
  });

check(
  "7월 1일 구매는 7월 29일까지 유료 이용",
  () => {
    assert.equal(
      cycle.paidAccessDays,
      29
    );
    assert.equal(
      cycle.paidAccessEndsAt.toISOString(),
      "2026-07-29T14:59:59.999Z"
    );
  }
);

check(
  "구매 즉시 유료 29일과 도전 29일을 분리 발행",
  () => {
    assert.equal(
      cycle.refundChallengeDays,
      29
    );
    assert.equal(
      cycle.bonusAccessDays,
      0
    );
    assert.equal(
      cycle.lockedDays,
      0
    );
    assert.equal(
      cycle.activeRanking,
      "SUB"
    );
  }
);

let attendanceState = {
  ...cycle,
  refundChallengeDays: 30,
};
for (let day = 1; day <= 29; day += 1) {
  attendanceState =
    recordQualifiedStudyDayState(
      attendanceState,
      {
        occurredAt: new Date(
          Date.UTC(
            2026,
            6,
            day,
            3
          )
        ),
      }
    ).state;
}

check(
  "같은 KST 날짜의 중복 학습은 스트릭을 올리지 않음",
  () => {
    const duplicate =
      recordQualifiedStudyDayState(
        attendanceState,
        {
          occurredAt: new Date(
            "2026-07-29T12:00:00+09:00"
          ),
        }
      );
    assert.equal(
      duplicate.duplicate,
      true
    );
    assert.equal(
      duplicate.state.streakDays,
      29
    );
  }
);

check(
  "하루를 건너뛰면 연속 학습은 1일부터 다시 시작",
  () => {
    const gap =
      recordQualifiedStudyDayState(
        attendanceState,
        {
          occurredAt: new Date(
            "2026-07-31T12:00:00+09:00"
          ),
        }
      );
    assert.equal(
      gap.state.streakDays,
      1
    );
  }
);

check(
  "29일 유료 이용 뒤 Day 30 Completion Pass 개방",
  () => {
    assert.equal(
      day30CompletionPassAvailable(
        attendanceState,
        new Date(
          "2026-07-29T23:59:59+09:00"
        )
      ),
      false
    );
    assert.equal(
      day30CompletionPassAvailable(
        attendanceState,
        new Date(
          "2026-07-30T00:00:00+09:00"
        )
      ),
      true
    );
  }
);

const day30 =
  recordQualifiedStudyDayState(
    attendanceState,
    {
      occurredAt: new Date(
        "2026-07-30T12:00:00+09:00"
      ),
    }
  ).state;

check(
  "30일 연속 학습과 도전 일수 30일을 모두 충족해야 페이백 가능",
  () => {
    assert.equal(
      refundEligibility({
        ...day30,
        streakDays: 29,
      }).eligible,
      false
    );
    assert.equal(
      refundEligibility({
        ...day30,
        refundChallengeDays: 29,
      }).eligible,
      false
    );
    assert.equal(
      refundEligibility(day30)
        .eligible,
      true
    );
  }
);

const richState = {
  ...day30,
  refundChallengeDays: 60,
};
const completed =
  completeRefundState(richState, {
    completedAt: new Date(
      "2026-07-30T04:00:00.000Z"
    ),
  });

check(
  "도전 60일에서 29일 정산 후 추가 학습권 31일 생성",
  () => {
    assert.equal(
      completed.refundChallengeDays,
      0
    );
    assert.equal(
      completed.bonusAccessDays,
      31
    );
    assert.equal(
      completed.activeRanking,
      "MAIN"
    );
    assert.equal(
      completed.paidAccessDays,
      29
    );
  }
);

check(
  "같은 결제 건은 두 번 페이백할 수 없음",
  () => {
    assert.throws(
      () =>
        completeRefundState(
          completed
        ),
      (error) =>
        error.code ===
        "REFUND_ALREADY_COMPLETED"
    );
  }
);

check(
  "잠긴 일수나 진행 중 매치가 있으면 페이백 확정 보류",
  () => {
    assert.throws(
      () =>
        completeRefundState({
          ...richState,
          lockedDays: 2,
        }),
      (error) =>
        error.code ===
        "TAKEOVER_SETTLEMENT_PENDING"
    );
  }
);

check(
  "Main Ranking 잔액·잠금·진행 매치가 재결제를 각각 차단",
  () => {
    const blockers =
      packagePurchaseBlockers({
        activeRanking: "MAIN",
        bonusAccessDays: 2,
        lockedDays: 3,
        activeTakeoverCount: 1,
      });
    assert.deepEqual(
      blockers.map(
        (item) => item.code
      ),
      [
        "BONUS_ACCESS_REMAINS",
        "LOCKED_DAYS_REMAIN",
        "TAKEOVER_IN_PROGRESS",
      ]
    );
  }
);

check(
  "요약은 기존 MMR을 skillMMR로 연결하고 활성 랭킹은 하나만 노출",
  () => {
    const summary =
      buildAccessSummary({
        account: completed,
        rankingProfile: {
          mmr: 1510,
          tier: "GOLD",
          overallRank: 12,
        },
      });
    assert.equal(
      summary.ranking.activeRanking,
      "MAIN"
    );
    assert.equal(
      summary.ranking.skillMMR,
      1510
    );
    assert.equal(
      summary.ranking.ladderPosition,
      12
    );
    assert.equal(
      summary.purchase.allowed,
      false
    );
  }
);

check(
  "DB 스키마가 네 잔액과 단일 활성 랭킹을 강제",
  () => {
    for (const field of [
      "paidAccessDays",
      "refundChallengeDays",
      "bonusAccessDays",
      "lockedDays",
      "streakDays",
      "activeRanking",
      "mainRankingEnteredAt",
      "rankShieldUntil",
      "refundCompletedAt",
    ]) {
      assert.ok(
        LearningAccessAccount
          .schema.paths[field],
        field
      );
    }
    assert.deepEqual(
      LearningAccessAccount.schema
        .paths.activeRanking.enumValues,
      ["SUB", "MAIN"]
    );
    assert.ok(
      AccessLedgerEntry.schema
        .paths.idempotencyKey
    );
    assert.equal(
      RULES.paidPackageDays,
      29
    );
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
process.exit(
  failed.length ? 1 : 0
);
