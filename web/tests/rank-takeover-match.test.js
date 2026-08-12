const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const {
  ACTIVE_TAKEOVER_MATCH_STATUSES,
  ARENA_RANKING_TYPES,
  RankTakeoverMatch,
  TAKEOVER_MATCH_STATUSES,
  canTransitionMatchStatus,
} = require(
  "../models/rankTakeoverMatchModel"
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

function addMinutes(date, minutes) {
  return new Date(
    date.getTime() +
      minutes * 60 * 1000
  );
}

function subNormalMatch(
  overrides = {}
) {
  const matchedAt = new Date(
    "2026-07-30T01:00:00.000Z"
  );
  const deadlinePolicySnapshot = {
    startDeadlineMinutes: 45,
    // 정책에서 주입되는 값이다. 모델에는 24시간 상수가 없다.
    submissionDeadlineMinutes:
      30 * 60,
  };

  return {
    matchId:
      `match-${objectId()}`,
    seasonId: objectId(),
    policyVersionId: objectId(),
    activeRanking: "SUB",
    challengerUserId: objectId(),
    challengerCycleId: objectId(),
    defenderUserId: objectId(),
    defenderCycleId: objectId(),
    challengerPositionBefore: 37,
    defenderPositionBefore: 31,
    matchType: "NORMAL",
    challengeCostSnapshot: {
      assetType:
        "REFUND_CHALLENGE_DAY",
      availableAccount:
        "USER_REFUND_AVAILABLE",
      lockedAccount:
        "USER_REFUND_LOCKED",
      stakeDays: 1,
      challengerWinBurnDays:
        1,
      challengerLossDefenderPayoutDays:
        1,
      challengerLossFeeBurnDays:
        0,
      challengeTierStepGap:
        null,
      mainTierStepStakeDays:
        null,
    },
    deadlinePolicySnapshot,
    challengeLockTransactionId:
      objectId(),
    challengeLockIdempotencyKey:
      `lock-${objectId()}`,
    status: "MATCHED",
    matchedAt,
    startsBy: addMinutes(
      matchedAt,
      deadlinePolicySnapshot
        .startDeadlineMinutes
    ),
    submitsBy: addMinutes(
      matchedAt,
      deadlinePolicySnapshot
        .submissionDeadlineMinutes
    ),
    ...overrides,
  };
}

function subRevengeMatch(
  overrides = {}
) {
  return subNormalMatch({
    matchType: "REVENGE",
    challengeCostSnapshot: {
      assetType:
        "REFUND_CHALLENGE_DAY",
      availableAccount:
        "USER_REFUND_AVAILABLE",
      lockedAccount:
        "USER_REFUND_LOCKED",
      stakeDays: 2,
      challengerWinBurnDays: 2,
      challengerLossDefenderPayoutDays:
        1,
      challengerLossFeeBurnDays:
        1,
      challengeTierStepGap: null,
      mainTierStepStakeDays: null,
    },
    ...overrides,
  });
}

async function run() {
  await check(
    "Sub/Main 및 Normal/Revenge 상태 어휘는 최종 문서와 일치",
    () => {
      assert.deepEqual(
        ARENA_RANKING_TYPES,
        ["SUB", "MAIN"]
      );
      assert.ok(
        TAKEOVER_MATCH_STATUSES.includes(
          "REQUESTED"
        )
      );
      assert.ok(
        TAKEOVER_MATCH_STATUSES.includes(
          "HELD"
        )
      );
      assert.ok(
        TAKEOVER_MATCH_STATUSES.includes(
          "SETTLED"
        )
      );
      assert.ok(
        !TAKEOVER_MATCH_STATUSES.includes(
          "NO_SHOW"
        )
      );
      assert.ok(
        !TAKEOVER_MATCH_STATUSES.includes(
          "DEFENDER_NO_SHOW"
        )
      );
      assert.ok(
        !TAKEOVER_MATCH_STATUSES.includes(
          "BOTH_NO_SHOW"
        )
      );
    }
  );

  await check(
    "정책 snapshot의 임의 마감 시간과 확정 Sub 비용을 보존",
    async () => {
      const match =
        new RankTakeoverMatch(
          subNormalMatch()
        );
      await match.validate();

      assert.equal(
        match
          .deadlinePolicySnapshot
          .submissionDeadlineMinutes,
        1800
      );
      assert.equal(
        match
          .challengeCostSnapshot
          .stakeDays,
        1
      );
      assert.deepEqual(
        match.participantUserIds.map(
          String
        ),
        [
          String(
            match
              .challengerUserId
          ),
          String(
            match.defenderUserId
          ),
        ]
      );
    }
  );

  await check(
    "마감 timestamp가 정책 snapshot과 다르면 거부",
    async () => {
      const source =
        subNormalMatch();
      source.submitsBy =
        addMinutes(
          source.matchedAt,
          source
            .deadlinePolicySnapshot
            .submissionDeadlineMinutes -
            1
        );

      await assert.rejects(
        new RankTakeoverMatch(
          source
        ).validate(),
        /snapshotted deadline policy/
      );
    }
  );

  await check(
    "trusted result의 authoritative submittedAt은 개인 시작~마감 구간 안이어야 함",
    async () => {
      const startedAt =
        new Date(
          "2026-07-30T02:00:00.000Z"
        );
      const result = {
        submissionId:
          "ARENA_SCORE_V1_model-time",
        calibratedScore: 95,
        advancedCorrectCount: 4,
        correctAnswerActiveSolveTimeMs:
          60_000,
        integrityState: "CLEAR",
        questionVersion:
          "QUESTION_V1",
        answerKeyVersion:
          "ANSWER_V1",
        calibrationVersion:
          "CALIBRATION_V1",
        payloadFingerprint:
          "a".repeat(64),
        submittedAt:
          new Date(
            startedAt.getTime() -
              1
          ),
      };
      const source =
        subNormalMatch({
          status:
            "IN_PROGRESS",
          startedAt,
          challengerStartedAt:
            startedAt,
          challengerDeadlineAt:
            addMinutes(
              startedAt,
              5
            ),
          timeLimitSeconds:
            5 * 60,
          challengerResult:
            result,
        });
      await assert.rejects(
        new RankTakeoverMatch(
          source
        ).validate(),
        /before their own start/
      );
      result.submittedAt =
        addMinutes(
          startedAt,
          5
        );
      await new RankTakeoverMatch(
        source
      ).validate();
    }
  );

  await check(
    "trusted result의 authoritative submittedAt은 개인 시작~마감 구간 안이어야 함",
    async () => {
      const startedAt =
        new Date(
          "2026-07-30T02:00:00.000Z"
        );
      const result = {
        submissionId:
          "ARENA_SCORE_V1_model-time",
        calibratedScore: 95,
        advancedCorrectCount: 4,
        correctAnswerActiveSolveTimeMs:
          60_000,
        integrityState: "CLEAR",
        questionVersion:
          "QUESTION_V1",
        answerKeyVersion:
          "ANSWER_V1",
        calibrationVersion:
          "CALIBRATION_V1",
        payloadFingerprint:
          "a".repeat(64),
        submittedAt:
          new Date(
            startedAt.getTime() -
              1
          ),
      };
      const source =
        subNormalMatch({
          status:
            "IN_PROGRESS",
          startedAt,
          challengerStartedAt:
            startedAt,
          challengerDeadlineAt:
            addMinutes(
              startedAt,
              5
            ),
          timeLimitSeconds:
            5 * 60,
          challengerResult:
            result,
        });
      await assert.rejects(
        new RankTakeoverMatch(
          source
        ).validate(),
        /before their own start/
      );
      result.submittedAt =
        addMinutes(
          startedAt,
          5
        );
      await new RankTakeoverMatch(
        source
      ).validate();
    }
  );

  await check(
    "MATCHED부터 USER available→locked 원장 연결 키가 필수",
    async () => {
      const source =
        subNormalMatch({
          challengeLockTransactionId:
            null,
          challengeLockIdempotencyKey:
            null,
        });

      await assert.rejects(
        new RankTakeoverMatch(
          source
        ).validate(),
        /available-to-locked transaction/
      );
    }
  );

  await check(
    "Sub와 Main은 서로 다른 원장 자산·계정 pair만 허용",
    async () => {
      const source =
        subNormalMatch();
      source
        .challengeCostSnapshot = {
        ...source
          .challengeCostSnapshot,
        assetType:
          "BONUS_ACCESS_DAY",
        availableAccount:
          "USER_BONUS_AVAILABLE",
        lockedAccount:
          "USER_BONUS_LOCKED",
      };

      await assert.rejects(
        new RankTakeoverMatch(
          source
        ).validate(),
        /SUB match requires REFUND_CHALLENGE_DAY/
      );

      const main =
        subNormalMatch({
          activeRanking: "MAIN",
          matchType: "REVENGE",
          challengeCostSnapshot:
            {
              assetType:
                "BONUS_ACCESS_DAY",
              availableAccount:
                "USER_BONUS_AVAILABLE",
              lockedAccount:
                "USER_BONUS_LOCKED",
              stakeDays: 5,
              challengerWinBurnDays:
                5,
              challengerLossDefenderPayoutDays:
                4,
              challengerLossFeeBurnDays:
                1,
              challengeTierStepGap:
                2,
              mainTierStepStakeDays:
                {
                  matchType:
                    "REVENGE",
                  oneStep: 3,
                  twoSteps: 5,
                  threeOrMoreSteps:
                    7,
                },
            },
        });
      await new RankTakeoverMatch(
        main
      ).validate();
    }
  );

  await check(
    "비용 정책은 승리 소각과 패배 지급·수수료를 각각 보존",
    async () => {
      const source =
        subNormalMatch();
      source
        .challengeCostSnapshot = {
        ...source
          .challengeCostSnapshot,
        challengerLossDefenderPayoutDays:
          0,
      };

      await assert.rejects(
        new RankTakeoverMatch(
          source
        ).validate(),
        /payout plus fee policy/
      );
    }
  );

  await check(
    "Sub 일반 1일·Revenge 2일 고정비를 모델에서 강제",
    async () => {
      const invalidNormal =
        subNormalMatch();
      invalidNormal
        .challengeCostSnapshot = {
        ...invalidNormal
          .challengeCostSnapshot,
        stakeDays: 3,
        challengerWinBurnDays:
          3,
        challengerLossDefenderPayoutDays:
          3,
      };
      await assert.rejects(
        new RankTakeoverMatch(
          invalidNormal
        ).validate(),
        /Sub NORMAL stake must be 1/
      );

      const validRevenge =
        subRevengeMatch();
      await new RankTakeoverMatch(
        validRevenge
      ).validate();
    }
  );

  await check(
    "Main 2·4·6 및 3·5·7 표는 정책 snapshot을 통해 선택",
    async () => {
      const mainNormal =
        subNormalMatch({
          activeRanking: "MAIN",
          challengeCostSnapshot:
            {
              assetType:
                "BONUS_ACCESS_DAY",
              availableAccount:
                "USER_BONUS_AVAILABLE",
              lockedAccount:
                "USER_BONUS_LOCKED",
              stakeDays: 4,
              challengerWinBurnDays:
                4,
              challengerLossDefenderPayoutDays:
                4,
              challengerLossFeeBurnDays:
                0,
              challengeTierStepGap:
                2,
              mainTierStepStakeDays:
                {
                  matchType:
                    "NORMAL",
                  oneStep: 2,
                  twoSteps: 4,
                  threeOrMoreSteps:
                    6,
                },
            },
        });
      await new RankTakeoverMatch(
        mainNormal
      ).validate();

      mainNormal
        .challengeCostSnapshot = {
        ...mainNormal
          .challengeCostSnapshot,
        stakeDays: 6,
        challengerWinBurnDays:
          6,
        challengerLossDefenderPayoutDays:
          6,
      };
      await assert.rejects(
        new RankTakeoverMatch(
          mainNormal
        ).validate(),
        /injected tier-step policy/
      );

      const wrongPolicyKind =
        subNormalMatch({
          activeRanking: "MAIN",
          challengeCostSnapshot:
            {
              assetType:
                "BONUS_ACCESS_DAY",
              availableAccount:
                "USER_BONUS_AVAILABLE",
              lockedAccount:
                "USER_BONUS_LOCKED",
              stakeDays: 4,
              challengerWinBurnDays:
                4,
              challengerLossDefenderPayoutDays:
                4,
              challengerLossFeeBurnDays:
                0,
              challengeTierStepGap:
                2,
              mainTierStepStakeDays:
                {
                  matchType:
                    "REVENGE",
                  oneStep: 2,
                  twoSteps: 4,
                  threeOrMoreSteps:
                    6,
                },
            },
        });
      await assert.rejects(
        new RankTakeoverMatch(
          wrongPolicyKind
        ).validate(),
        /must match the match type/
      );
    }
  );

  await check(
    "문서 상태기계만 허용하고 최종 상태는 재전이 불가",
    () => {
      assert.equal(
        canTransitionMatchStatus(
          "REQUESTED",
          "MATCHED"
        ),
        true
      );
      assert.equal(
        canTransitionMatchStatus(
          "MATCHED",
          "HELD"
        ),
        true
      );
      assert.equal(
        canTransitionMatchStatus(
          "HELD",
          "INVALID"
        ),
        true
      );
      assert.equal(
        canTransitionMatchStatus(
          "IN_PROGRESS",
          "SETTLED"
        ),
        false
      );
      assert.equal(
        canTransitionMatchStatus(
          "SETTLED",
          "RESOLVED"
        ),
        false
      );

      const match =
        new RankTakeoverMatch({
          ...subNormalMatch(),
          status: "REQUESTED",
          challengeLockTransactionId:
            null,
          challengeLockIdempotencyKey:
            null,
          matchedAt: null,
          startsBy: null,
          submitsBy: null,
        });
      match.transitionTo(
        "MATCHED"
      );
      assert.equal(
        match.status,
        "MATCHED"
      );
      assert.throws(
        () =>
          match.transitionTo(
            "SETTLED"
          ),
        (error) =>
          error.code ===
          "INVALID_MATCH_STATUS_TRANSITION"
      );
    }
  );

  await check(
    "사용자당 활성 매치 1개를 role 횡단 unique multikey index로 강제",
    () => {
      const index =
        RankTakeoverMatch.schema
          .indexes()
          .find(
            ([, options]) =>
              options.name ===
              "one_active_takeover_match_per_user"
          );

      assert.ok(index);
      assert.deepEqual(
        index[0],
        {
          participantUserIds: 1,
        }
      );
      assert.equal(
        index[1].unique,
        true
      );
      assert.deepEqual(
        index[1]
          .partialFilterExpression
          .status.$in,
        ACTIVE_TAKEOVER_MATCH_STATUSES
      );
    }
  );

  await check(
    "lock transaction·멱등 키·좌석 정산 reference는 재사용 불가",
    () => {
      const indexes =
        RankTakeoverMatch.schema
          .indexes();
      for (const name of [
        "one_match_per_lock_transaction",
        "one_match_per_lock_idempotency_key",
        "one_match_per_position_settlement",
      ]) {
        const index =
          indexes.find(
            ([, options]) =>
              options.name ===
              name
          );
        assert.ok(
          index,
          `${name} index missing`
        );
        assert.equal(
          index[1].unique,
          true
        );
      }
    }
  );

  await check(
    "도전자 승리 정산은 좌석 snapshot 교환과 원장 reference를 요구",
    async () => {
      const source =
        subNormalMatch({
          status: "SETTLED",
          startedAt: new Date(
            "2026-07-30T02:00:00.000Z"
          ),
          resolvedAt: new Date(
            "2026-07-30T03:00:00.000Z"
          ),
          settledAt: new Date(
            "2026-07-30T03:01:00.000Z"
          ),
          winner: "CHALLENGER",
          settlementVersion: 1,
          settlementReason:
            "SCORED_RESULT",
          settlementResult: {
            toDefenderAvailableDays:
              0,
            toSystemBurnDays: 1,
            toChallengerAvailableDays:
              0,
          },
          settlementTransactionIds:
            [objectId()],
          arenaPositionSettlement:
            {
              outcome: "SWAPPED",
              referenceKey:
                `seat-transfer-${objectId()}`,
              challengerPositionAfter:
                31,
              defenderPositionAfter:
                37,
            },
        });

      await new RankTakeoverMatch(
        source
      ).validate();

      source
        .arenaPositionSettlement = {
        ...source
          .arenaPositionSettlement,
        outcome: "UNCHANGED",
        challengerPositionAfter:
          37,
        defenderPositionAfter: 31,
      };
      await assert.rejects(
        new RankTakeoverMatch(
          source
        ).validate(),
        /challenger win must swap/
      );

      const wrongFlow =
        subNormalMatch({
          status: "SETTLED",
          resolvedAt: new Date(
            "2026-07-30T03:00:00.000Z"
          ),
          settledAt: new Date(
            "2026-07-30T03:01:00.000Z"
          ),
          winner: "CHALLENGER",
          settlementVersion: 1,
          settlementReason:
            "SCORED_RESULT",
          settlementResult: {
            toDefenderAvailableDays:
              1,
            toSystemBurnDays: 0,
            toChallengerAvailableDays:
              0,
          },
          settlementTransactionIds:
            [objectId()],
          arenaPositionSettlement:
            {
              outcome: "SWAPPED",
              referenceKey:
                `seat-flow-${objectId()}`,
              challengerPositionAfter:
                31,
              defenderPositionAfter:
                37,
            },
        });
      await assert.rejects(
        new RankTakeoverMatch(
          wrongFlow
        ).validate(),
        /challenger-win flow/
      );
    }
  );

  await check(
    "도전자 No-show는 별도 상태가 아닌 방어자 승리 정산 사유",
    async () => {
      const source =
        subNormalMatch({
          status: "SETTLED",
          resolvedAt: new Date(
            "2026-07-30T03:00:00.000Z"
          ),
          settledAt: new Date(
            "2026-07-30T03:01:00.000Z"
          ),
          winner: "DEFENDER",
          settlementVersion: 1,
          settlementReason:
            "CHALLENGER_NO_SHOW",
          settlementResult: {
            toDefenderAvailableDays:
              1,
            toSystemBurnDays: 0,
            toChallengerAvailableDays:
              0,
          },
          settlementTransactionIds:
            [objectId()],
          arenaPositionSettlement:
            {
              outcome:
                "UNCHANGED",
              referenceKey:
                `seat-noop-${objectId()}`,
              challengerPositionAfter:
                37,
              defenderPositionAfter:
                31,
            },
        });

      await new RankTakeoverMatch(
        source
      ).validate();
    }
  );

  await check(
    "Sub Revenge 실제 정산은 승리 전액 소각·패배 1일 지급+1일 소각",
    async () => {
      const common = {
        status: "SETTLED",
        resolvedAt: new Date(
          "2026-07-30T03:00:00.000Z"
        ),
        settledAt: new Date(
          "2026-07-30T03:01:00.000Z"
        ),
        settlementVersion: 1,
        settlementReason:
          "SCORED_RESULT",
        settlementTransactionIds:
          [objectId()],
      };

      const challengerWin =
        subRevengeMatch({
          ...common,
          winner: "CHALLENGER",
          settlementResult: {
            toDefenderAvailableDays:
              0,
            toSystemBurnDays: 2,
            toChallengerAvailableDays:
              0,
          },
          arenaPositionSettlement:
            {
              outcome: "SWAPPED",
              referenceKey:
                `revenge-swap-${objectId()}`,
              challengerPositionAfter:
                31,
              defenderPositionAfter:
                37,
            },
        });
      await new RankTakeoverMatch(
        challengerWin
      ).validate();

      const defenderWin =
        subRevengeMatch({
          ...common,
          settlementTransactionIds:
            [objectId()],
          winner: "DEFENDER",
          settlementResult: {
            toDefenderAvailableDays:
              1,
            toSystemBurnDays: 1,
            toChallengerAvailableDays:
              0,
          },
          arenaPositionSettlement:
            {
              outcome:
                "UNCHANGED",
              referenceKey:
                `revenge-noop-${objectId()}`,
              challengerPositionAfter:
                37,
              defenderPositionAfter:
                31,
            },
        });
      await new RankTakeoverMatch(
        defenderWin
      ).validate();
    }
  );

  await check(
    "방어자·양측 No-show는 INVALID 정산 사유이며 stake 전액 잠금 해제",
    async () => {
      for (const reason of [
        "DEFENDER_NO_SHOW",
        "BOTH_NO_SHOW",
      ]) {
        const source =
          subNormalMatch({
            status: "INVALID",
            resolvedAt: new Date(
              "2026-07-30T03:00:00.000Z"
            ),
            integrityState:
              "INVALID",
            winner: null,
            settlementVersion: 1,
            settlementReason:
              reason,
            settlementResult: {
              toDefenderAvailableDays:
                0,
              toSystemBurnDays: 0,
              toChallengerAvailableDays:
                1,
            },
            settlementTransactionIds:
              [objectId()],
            arenaPositionSettlement:
              {
                outcome:
                  "UNCHANGED",
                referenceKey:
                  `seat-invalid-${objectId()}`,
                challengerPositionAfter:
                  37,
                defenderPositionAfter:
                  31,
              },
          });
        await new RankTakeoverMatch(
          source
        ).validate();
      }

      const wrongUnlock =
        subNormalMatch({
          status: "INVALID",
          resolvedAt: new Date(
            "2026-07-30T03:00:00.000Z"
          ),
          integrityState:
            "INVALID",
          winner: null,
          settlementVersion: 1,
          settlementReason:
            "DEFENDER_NO_SHOW",
          settlementResult: {
            toDefenderAvailableDays:
              1,
            toSystemBurnDays: 0,
            toChallengerAvailableDays:
              0,
          },
          settlementTransactionIds:
            [objectId()],
          arenaPositionSettlement:
            {
              outcome:
                "UNCHANGED",
              referenceKey:
                `seat-invalid-flow-${objectId()}`,
              challengerPositionAfter:
                37,
              defenderPositionAfter:
                31,
            },
        });
      await assert.rejects(
        new RankTakeoverMatch(
          wrongUnlock
        ).validate(),
        /unlock the full stake/
      );
    }
  );

  await check(
    "MMR 변경 필드는 Match 모델에 존재하지 않음",
    () => {
      const paths = [];
      RankTakeoverMatch.schema.eachPath(
        (path) => {
          paths.push(path);
        }
      );
      assert.deepEqual(
        paths.filter((path) =>
          /mmr/i.test(path)
        ),
        []
      );
    }
  );

  const failed =
    checks.filter(
      (item) => !item.passed
    );
  console.log(
    `\n${checks.length - failed.length}/${checks.length} checks passed`
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
