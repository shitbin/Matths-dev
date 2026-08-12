const assert = require(
  "node:assert/strict"
);
const mongoose = require(
  "mongoose"
);
const {
  MongoMemoryReplSet,
} = require(
  "mongodb-memory-server"
);

const {
  AccessCycle,
} = require(
  "../models/accessCycleModel"
);
const {
  ArenaProfile,
} = require(
  "../models/arenaProfileModel"
);
const {
  ArenaSeason,
} = require(
  "../models/arenaSeasonModel"
);
const {
  DayBalanceTransaction,
} = require(
  "../models/dayBalanceTransactionModel"
);
const {
  RankingProfile,
  User,
} = require(
  "../models/matthsModel"
);
const {
  OutboxEvent,
} = require(
  "../models/outboxEventModel"
);
const {
  PolicyVersion,
} = require(
  "../models/policyVersionModel"
);
const {
  RankTakeoverMatch,
} = require(
  "../models/rankTakeoverMatchModel"
);
const {
  RankTakeoverCommandReceipt,
} = require(
  "../models/rankTakeoverCommandReceiptModel"
);
const {
  buildPackageIssueTransaction,
  deriveUserBalances,
  deterministicId,
} = require(
  "../services/dayBalanceLedgerService"
);
const {
  RankTakeoverError,
  buildChallengeCostSnapshot,
  compareScoredResults,
  createRankTakeoverService,
} = require(
  "../services/rankTakeoverService"
);

const checks = [];
const TEST_NOW =
  new Date(
    "2026-07-10T03:00:00.000Z"
  );
const DAY_MS =
  86_400_000;
let sequence = 1;

async function check(
  label,
  run
) {
  try {
    await run();
    checks.push({
      label,
      passed: true,
    });
    console.log(
      `  ✓ ${label}`
    );
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
  return new mongoose
    .Types.ObjectId();
}

async function captureError(
  run
) {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error(
    "expected an error"
  );
}

const models = [
  RankTakeoverCommandReceipt,
  RankTakeoverMatch,
  DayBalanceTransaction,
  OutboxEvent,
  ArenaProfile,
  ArenaSeason,
  AccessCycle,
  PolicyVersion,
  RankingProfile,
  User,
];

async function clearData() {
  for (const model of models) {
    // 드라이버 레벨로 지운다. DayBalanceTransaction 은 모델 미들웨어가
    // 모든 수정·삭제를 IMMUTABLE_LEDGER_TRANSACTION 으로 막는 append-only
    // 원장이고, 그 차단 자체가 이 스위트가 검증하는 계약이다 —
    // 테스트 정리는 그 계약 밖(운영자 유지보수 경로)에서 이뤄져야 한다.
    await model.collection.deleteMany(
      {}
    );
  }
}

async function syncIndexes() {
  for (const model of models) {
    await model.syncIndexes();
  }
}

async function createPolicy(
  overrides = {}
) {
  const policy =
    await PolicyVersion.create({
      version:
        `rank-service-${sequence}`,
      effectiveFrom:
        new Date(
          "2026-07-01T00:00:00.000Z"
        ),
      completionPass: {
        cycleDay: 30,
        opensAtKst: "00:00",
        deadlineAtKst:
          "23:59",
        allowedActivityTypes:
          [
            "PRACTICE",
          ],
      },
      // 하드닝: 정산이 매치 보호 정책을 스냅샷에서 읽는다 —
      // 없으면 POST_MATCH_PROTECTION_*_UNSET 으로 정산이 막힌다.
      postMatchProtectionHours: 12,
      postMatchProtectionScope:
        "BOTH_PARTICIPANTS",
      ...overrides,
    });
  sequence += 1;
  return policy;
}

async function createUserWithSkill(
  label,
  mmr
) {
  const user =
    await User.create({
      name: label,
      realName: label,
      email:
        `${label}-${sequence}@example.com`,
      passwordHash:
        "not-a-real-password-hash",
      accountStatus:
        "active",
      termsAcceptedAt:
        TEST_NOW,
      school: {
        region: "경기",
        code:
          `school-${sequence}`,
        name: "테스트고",
      },
    });
  const rankingProfile =
    await RankingProfile.create({
      userId:
        user._id,
      placementAttemptId:
        objectId(),
      placementScore: 80,
      mmr,
      tier: "GOLD",
      status:
        "CONFIRMED",
    });
  sequence += 1;
  return {
    user,
    rankingProfile,
  };
}

async function createInitialLedger({
  cycle,
  ranking,
  days,
  policy,
}) {
  if (ranking === "SUB") {
    const input =
      buildPackageIssueTransaction({
        cycleId:
          cycle._id,
        userId:
          cycle.userId,
        orderId:
          cycle
            .paymentOrderId,
        policyVersion:
          policy,
        occurredAt:
          TEST_NOW,
        idempotencyKey:
          `package-${cycle._id}`,
      });
    await DayBalanceTransaction.create(
      input
    );
    return;
  }
  const key =
    `main-opening-${cycle._id}`;
  await DayBalanceTransaction.create({
    transactionId:
      deterministicId(
        "main-opening",
        key
      ),
    idempotencyKey: key,
    cycleId:
      cycle._id,
    type: "REFUND_CONVERT",
    status: "POSTED",
    reasonCode:
      "PAYBACK_SURPLUS_CONVERSION",
    actorType:
      "SYSTEM",
    occurredAt:
      TEST_NOW,
    entries: [
      {
        account:
          "SYSTEM_REFUND_CONVERSION",
        debitDays: days,
        creditDays: 0,
      },
      {
        account:
          "USER_BONUS_AVAILABLE",
        userId:
          cycle.userId,
        cycleId:
          cycle._id,
        debitDays: 0,
        creditDays: days,
      },
    ],
  });
}

async function createParticipant({
  label,
  mmr,
  position,
  ranking,
  policy,
  season,
  days,
  protectionUntil = null,
  rankShieldUntil = null,
}) {
  const identity =
    await createUserWithSkill(
      label,
      mmr
    );
  const cycle =
    await AccessCycle.create({
      userId:
        identity.user._id,
      paymentOrderId:
        objectId(),
      policyVersionId:
        policy._id,
      status:
        ranking === "SUB"
          ? "SUB_ACTIVE"
          : "MAIN_ACTIVE",
      refundStatus:
        ranking === "SUB"
          ? "PENDING"
          : "COMPLETED",
      activeRanking:
        ranking,
      startedAt:
        new Date(
          "2026-07-01T00:00:00.000Z"
        ),
      paidAccessStartsOn:
        "2026-07-01",
      paidAccessEndsOn:
        "2026-07-29",
      day30ReviewOn:
        "2026-07-30",
      day30CompletionOpensAt:
        new Date(
          "2026-07-29T15:00:00.000Z"
        ),
      day30CompletionDeadlineAt:
        new Date(
          "2026-07-30T14:59:00.000Z"
        ),
      paidAccessDaysGranted:
        29,
      refundChallengeDays:
        ranking === "SUB"
          ? days
          : 0,
      lockedRefundDays: 0,
      bonusAccessDays:
        ranking === "MAIN"
          ? days
          : 0,
      lockedBonusDays: 0,
      integrityState:
        "CLEAR",
    });
  await createInitialLedger({
    cycle,
    ranking,
    days,
    policy,
  });
  const arenaProfile =
    await ArenaProfile.create({
      userId:
        identity.user._id,
      seasonId:
        season._id,
      activeRanking:
        ranking,
      arenaPosition:
        position,
      status: "ACTIVE",
      mmrAtLastSeed: mmr,
      seededAt:
        new Date(
          "2026-07-06T00:00:00.000Z"
        ),
      seedWeekKey:
        "2026-W28",
      protectionUntil,
      rankShieldUntil,
    });
  return {
    ...identity,
    cycle,
    arenaProfile,
  };
}

async function createFixture({
  ranking = "SUB",
  policyOverrides = {},
  challengerDays,
  defenderDays,
  defenderProtectionUntil =
    null,
  defenderShieldUntil =
    null,
} = {}) {
  const policy =
    await createPolicy(
      policyOverrides
    );
  const season =
    await ArenaSeason.create({
      seasonId:
        `season-${sequence}`,
      title:
        "Rank Takeover Test",
      startsAt:
        new Date(
          "2026-07-01T00:00:00.000Z"
        ),
      endsAt:
        new Date(
          "2026-08-31T00:00:00.000Z"
        ),
      status: "ACTIVE",
      reseedStatus:
        "COMPLETED",
      currentWeekKey:
        "2026-W28",
      lastSeededAt:
        new Date(
          "2026-07-06T00:00:00.000Z"
        ),
      policyVersionId:
        policy._id,
    });
  sequence += 1;
  const challenger =
    await createParticipant({
      label:
        `challenger-${sequence}`,
      mmr: 1510,
      position: 20,
      ranking,
      policy,
      season,
      days:
        challengerDays ??
        (ranking === "SUB"
          ? 29
          : 12),
    });
  const defender =
    await createParticipant({
      label:
        `defender-${sequence}`,
      mmr: 1610,
      position: 10,
      ranking,
      policy,
      season,
      days:
        defenderDays ??
        (ranking === "SUB"
          ? 29
          : 12),
      protectionUntil:
        defenderProtectionUntil,
      rankShieldUntil:
        defenderShieldUntil,
    });
  return {
    policy,
    season,
    challenger,
    defender,
  };
}

// 서버 채점 주입용 레지스트리 — submissionId → 서버가 매긴 결과.
// 하드닝 이후 submitResult 는 {matchId, participantUserId, submissionId} 만 받고
// 점수는 신뢰 경로(verifyScoredSubmission)가 공급한다. 클라이언트가 점수를
// 실어 보내는 옛 방식은 UNTRUSTED_SUBMISSION_FIELDS 로 거부된다(그게 계약이다).
const SCORE_REGISTRY = new Map();

function makeService(
  fixture,
  {
    clock = {
      value: TEST_NOW,
    },
    deadline = {
      startDeadlineMinutes:
        60,
      submissionDeadlineMinutes:
        180,
      questionPolicyVersion:
        "arena-pack-v1",
    },
    mainGap = 2,
    revenge = false,
    resolveNoShowState,
    resolveTieBreak,
    assertPairIntegrity =
      async () => true,
    selectSubDefender =
      async ({
        requestId,
      }) => ({
        userId:
          fixture.defender
            .user._id,
        auditId:
          `assignment-${requestId}`,
        auditSnapshot: {
          algorithmVersion:
            "test-weighted-v1",
          candidateCount: 1,
        },
      }),
    prepareQuestionPacks =
      async () => ({
        challengerQuestionPackId:
          objectId(),
        defenderQuestionPackId:
          objectId(),
        questionVersion:
          "arena-question-v1",
        answerKeyVersion:
          "arena-answer-v1",
        calibrationVersion:
          "arena-calibration-v1",
        // 하드닝: 봉인 팩 쌍은 **공통 제한시간 공표**가 필수다 —
        // 없으면 QUESTION_PACK_TIME_LIMIT_UNSET 으로 수락이 막힌다.
        timeLimitSeconds: 1800,
      }),
    ensureParticipantAttemptStarted =
      async ({
        match,
        participantUserId,
        participantRole,
        questionPackId,
        observedAt,
      }) => ({
        attemptId:
          objectId(),
        matchId:
          match.matchId,
        participantUserId,
        participantRole,
        questionPackId,
        // 하드닝: 서비스가 "권위 있는 sealed-pack attempt" 임을 검증한다 —
        // 매치와 같은 제한시간, 시작·종료 시각까지 돌려줘야 통과한다.
        timeLimitSeconds:
          match.timeLimitSeconds,
        startedAt:
          observedAt ?? TEST_NOW,
        // 개인 마감은 매치 제출 마감(submitsBy)을 넘지 못한다 —
        // 서비스가 min(submitsBy, 시작+제한시간)으로 대조한다.
        endsAt:
          new Date(
            Math.min(
              match.submitsBy
                .getTime(),
              (observedAt ??
                TEST_NOW)
                .getTime() +
                match
                  .timeLimitSeconds *
                  1000
            )
          ),
      }),
  } = {}
) {
  let revengeConsumed =
    false;
  const service =
    createRankTakeoverService({
      now: () =>
        new Date(
          clock.value
        ),
      selectSubDefender,
      resolveDeadlinePolicy:
        deadline === null
          ? undefined
          : async () =>
              deadline,
      resolveMainTierStepGap:
        async () =>
          mainGap,
      resolveRevengeRight:
        revenge
          ? async ({
              sourceMatchId,
            }) => ({
              rightId:
                objectId(),
              sourceMatchId,
              targetUserId:
                fixture
                  .defender
                  .user._id,
            })
          : undefined,
      consumeRevengeRight:
        revenge
          ? async () => {
              assert.equal(
                revengeConsumed,
                false
              );
              revengeConsumed =
                true;
            }
          : undefined,
      resolveNoShowState,
      resolveTieBreak,
      assertPairIntegrity,
      prepareQuestionPacks,
      ensureParticipantAttemptStarted,
      verifyScoredSubmission:
        async ({
          submissionId,
        }) => {
          const stored =
            SCORE_REGISTRY.get(
              submissionId
            );
          assert.ok(
            stored,
            `no registered score for ${submissionId}`
          );
          return {
            ...stored,
            submissionId,
          };
        },
    });
  return {
    service,
    clock,
    revengeWasConsumed:
      () =>
        revengeConsumed,
  };
}

async function requestMatch(
  fixture,
  service,
  {
    matchType = "NORMAL",
    key = `request-${sequence}`,
    sourceMatchId =
      "source-match-1",
  } = {}
) {
  sequence += 1;
  const input = {
    challengerUserId:
      fixture.challenger
        .user._id,
    activeRanking:
      fixture.challenger
        .cycle.activeRanking,
    matchType,
    idempotencyKey: key,
  };
  if (
    fixture.challenger
      .cycle.activeRanking ===
    "MAIN"
  ) {
    input.defenderUserId =
      fixture.defender
        .user._id;
  }
  if (
    matchType ===
    "REVENGE"
  ) {
    input.sourceMatchId =
      sourceMatchId;
  }
  return service.requestChallenge(
    input
  );
}

function scoredResult(
  label,
  {
    score,
    advanced = 3,
    timeMs = 100_000,
  }
) {
  return {
    submissionId:
      `submission-${label}`,
    calibratedScore:
      score,
    advancedCorrectCount:
      advanced,
    correctAnswerActiveSolveTimeMs:
      timeMs,
    integrityState:
      "CLEAR",
    // gradingAuthority 는 신뢰 필드 목록에 없다 — 서버 채점 경로 자체가
    // 권위이므로 결과에 다시 적을 이유가 없고, 적으면
    // UNTRUSTED_SCORING_FIELDS 로 거부된다.
    questionVersion:
      "arena-question-v1",
    answerKeyVersion:
      "arena-answer-v1",
    calibrationVersion:
      "arena-calibration-v1",
    submittedAt:
      TEST_NOW.toISOString(),
  };
}

async function playToResolved({
  fixture,
  service,
  match,
  challengerScore,
  defenderScore,
}) {
  await service.acceptChallenge({
    matchId:
      match.matchId,
    defenderUserId:
      fixture.defender
        .user._id,
    idempotencyKey:
      `accept-${match.matchId}`,
  });
  await service.startMatch({
    matchId:
      match.matchId,
    participantUserId:
      fixture.challenger
        .user._id,
    clientBuildVersion:
      "test-ios-1",
    idempotencyKey:
      `start-${match.matchId}`,
  });
  // 하드닝: 제출은 **자기 봉인 팩을 연 사람만** 할 수 있다 —
  // 방어자도 개인 시작을 거쳐야 제출이 통과한다.
  await service.startMatch({
    matchId:
      match.matchId,
    participantUserId:
      fixture.defender
        .user._id,
    clientBuildVersion:
      "test-ios-1",
    idempotencyKey:
      `start-def-${match.matchId}`,
  });
  const challengerSubmissionId =
    `sub-ch-${match.matchId}`;
  const defenderSubmissionId =
    `sub-def-${match.matchId}`;
  SCORE_REGISTRY.set(
    challengerSubmissionId,
    challengerScore
  );
  SCORE_REGISTRY.set(
    defenderSubmissionId,
    defenderScore
  );
  await service.submitResult({
    matchId:
      match.matchId,
    participantUserId:
      fixture.challenger
        .user._id,
    submissionId:
      challengerSubmissionId,
  });
  await service.submitResult({
    matchId:
      match.matchId,
    participantUserId:
      fixture.defender
        .user._id,
    submissionId:
      defenderSubmissionId,
  });
  return service.resolveScoredMatch({
    matchId:
      match.matchId,
    idempotencyKey:
      `resolve-${match.matchId}`,
  });
}

async function run() {
  const memory =
    await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        storageEngine:
          "wiredTiger",
      },
    });
  try {
    await mongoose.connect(
      memory.getUri(),
      {
        dbName:
          "rank-takeover-service-test",
      }
    );
    await syncIndexes();

    await check(
      "비용 계산은 Sub 1·2일과 Main 2·4·6/3·5·7을 서버 정책에서 고정",
      async () => {
        const policy =
          await createPolicy();
        assert.equal(
          buildChallengeCostSnapshot({
            activeRanking:
              "SUB",
            matchType:
              "NORMAL",
            policy,
          }).stakeDays,
          1
        );
        assert.equal(
          buildChallengeCostSnapshot({
            activeRanking:
              "SUB",
            matchType:
              "REVENGE",
            policy,
          }).stakeDays,
          2
        );
        assert.deepEqual(
          [1, 2, 3].map(
            (gap) =>
              buildChallengeCostSnapshot({
                activeRanking:
                  "MAIN",
                matchType:
                  "NORMAL",
                policy,
                tierStepGap:
                  gap,
              }).stakeDays
          ),
          [2, 4, 6]
        );
        assert.deepEqual(
          [1, 2, 3].map(
            (gap) =>
              buildChallengeCostSnapshot({
                activeRanking:
                  "MAIN",
                matchType:
                  "REVENGE",
                policy,
                tierStepGap:
                  gap,
              }).stakeDays
          ),
          [3, 5, 7]
        );
      }
    );

    await check(
      "MATCHED 수락 마감이 지나면 문제팩·stake를 건드리지 않고 거부",
      async () => {
        await clearData();
        const fixture =
          await createFixture();
        const clock = {
          value:
            new Date(
              TEST_NOW
            ),
        };
        const {
          service,
        } =
          makeService(
            fixture,
            {
              clock,
            }
          );
        const match =
          await requestMatch(
            fixture,
            service,
            {
              key:
                "expired-accept-request",
            }
          );
        clock.value =
          new Date(
            TEST_NOW.getTime() +
              61 * 60 * 1000
          );
        const error =
          await captureError(
            () =>
              service
                .acceptChallenge({
                  matchId:
                    match.matchId,
                  defenderUserId:
                    fixture
                      .defender
                      .user._id,
                  idempotencyKey:
                    "expired-accept",
                })
          );
        assert.equal(
          error.code,
          "MATCH_START_DEADLINE_PASSED"
        );
        const persisted =
          await RankTakeoverMatch
            .findOne({
              matchId:
                match.matchId,
            })
            .lean();
        assert.equal(
          persisted.status,
          "MATCHED"
        );
        assert.equal(
          persisted
            .challengerQuestionPackId,
          null
        );
        assert.equal(
          persisted
            .defenderQuestionPackId,
          null
        );
      }
    );

    await check(
      "MATCHED 수락 마감이 지나면 문제팩·stake를 건드리지 않고 거부",
      async () => {
        await clearData();
        const fixture =
          await createFixture();
        const clock = {
          value:
            new Date(
              TEST_NOW
            ),
        };
        const {
          service,
        } =
          makeService(
            fixture,
            {
              clock,
            }
          );
        const match =
          await requestMatch(
            fixture,
            service,
            {
              key:
                "expired-accept-request",
            }
          );
        clock.value =
          new Date(
            TEST_NOW.getTime() +
              61 * 60 * 1000
          );
        const error =
          await captureError(
            () =>
              service
                .acceptChallenge({
                  matchId:
                    match.matchId,
                  defenderUserId:
                    fixture
                      .defender
                      .user._id,
                  idempotencyKey:
                    "expired-accept",
                })
          );
        assert.equal(
          error.code,
          "MATCH_START_DEADLINE_PASSED"
        );
        const persisted =
          await RankTakeoverMatch
            .findOne({
              matchId:
                match.matchId,
            })
            .lean();
        assert.equal(
          persisted.status,
          "MATCHED"
        );
        assert.equal(
          persisted
            .challengerQuestionPackId,
          null
        );
        assert.equal(
          persisted
            .defenderQuestionPackId,
          null
        );
      }
    );

    await check(
      "MATCHED 수락 마감이 지나면 문제팩·stake를 건드리지 않고 거부",
      async () => {
        await clearData();
        const fixture =
          await createFixture();
        const clock = {
          value:
            new Date(
              TEST_NOW
            ),
        };
        const {
          service,
        } =
          makeService(
            fixture,
            {
              clock,
            }
          );
        const match =
          await requestMatch(
            fixture,
            service,
            {
              key:
                "expired-accept-request",
            }
          );
        clock.value =
          new Date(
            TEST_NOW.getTime() +
              61 * 60 * 1000
          );
        const error =
          await captureError(
            () =>
              service
                .acceptChallenge({
                  matchId:
                    match.matchId,
                  defenderUserId:
                    fixture
                      .defender
                      .user._id,
                  idempotencyKey:
                    "expired-accept",
                })
          );
        assert.equal(
          error.code,
          "MATCH_START_DEADLINE_PASSED"
        );
        const persisted =
          await RankTakeoverMatch
            .findOne({
              matchId:
                match.matchId,
            })
            .lean();
        assert.equal(
          persisted.status,
          "MATCHED"
        );
        assert.equal(
          persisted
            .challengerQuestionPackId,
          null
        );
        assert.equal(
          persisted
            .defenderQuestionPackId,
          null
        );
      }
    );

    await check(
      "MATCHED 수락 마감이 지나면 문제팩·stake를 건드리지 않고 거부",
      async () => {
        await clearData();
        const fixture =
          await createFixture();
        const clock = {
          value:
            new Date(
              TEST_NOW
            ),
        };
        const {
          service,
        } =
          makeService(
            fixture,
            {
              clock,
            }
          );
        const match =
          await requestMatch(
            fixture,
            service,
            {
              key:
                "expired-accept-request",
            }
          );
        clock.value =
          new Date(
            TEST_NOW.getTime() +
              61 * 60 * 1000
          );
        const error =
          await captureError(
            () =>
              service
                .acceptChallenge({
                  matchId:
                    match.matchId,
                  defenderUserId:
                    fixture
                      .defender
                      .user._id,
                  idempotencyKey:
                    "expired-accept",
                })
          );
        assert.equal(
          error.code,
          "MATCH_START_DEADLINE_PASSED"
        );
        const persisted =
          await RankTakeoverMatch
            .findOne({
              matchId:
                match.matchId,
            })
            .lean();
        assert.equal(
          persisted.status,
          "MATCHED"
        );
        assert.equal(
          persisted
            .challengerQuestionPackId,
          null
        );
        assert.equal(
          persisted
            .defenderQuestionPackId,
          null
        );
      }
    );

    await check(
      "서버 채점 비교는 보정점수→고난도 정답→유효시간 순이며 완전 동점은 보류",
      () => {
        assert.deepEqual(
          compareScoredResults(
            scoredResult(
              "c1",
              {
                score: 91,
                advanced: 1,
                timeMs:
                  200_000,
              }
            ),
            scoredResult(
              "d1",
              {
                score: 90,
                advanced: 5,
                timeMs:
                  10_000,
              }
            )
          ),
          {
            winner:
              "CHALLENGER",
            tieBreakStage:
              "CALIBRATED_SCORE",
          }
        );
        assert.equal(
          compareScoredResults(
            scoredResult(
              "c2",
              {
                score: 90,
                advanced: 4,
                timeMs:
                  200_000,
              }
            ),
            scoredResult(
              "d2",
              {
                score: 90,
                advanced: 3,
                timeMs:
                  10_000,
              }
            )
          ).tieBreakStage,
          "ADVANCED_CORRECT_COUNT"
        );
        assert.equal(
          compareScoredResults(
            scoredResult(
              "c3",
              {
                score: 90,
                advanced: 3,
                timeMs:
                  9_000,
              }
            ),
            scoredResult(
              "d3",
              {
                score: 90,
                advanced: 3,
                timeMs:
                  10_000,
              }
            )
          ).tieBreakStage,
          "ACTIVE_SOLVE_TIME"
        );
        assert.equal(
          compareScoredResults(
            scoredResult(
              "c4",
              {
                score: 90,
                advanced: 3,
                timeMs:
                  10_000,
              }
            ),
            scoredResult(
              "d4",
              {
                score: 90,
                advanced: 3,
                timeMs:
                  10_000,
              }
            )
          ).winner,
          null
        );
      }
    );

    await clearData();
    await check(
      "Sub 신청은 서버 배정·1일 잠금·양측 활성 매치 guard를 한 트랜잭션으로 확정",
      async () => {
        const fixture =
          await createFixture();
        const {
          service,
        } = makeService(
          fixture
        );
        const key =
          "sub-lock-idempotent";
        const [
          match,
          concurrentReplay,
        ] = await Promise.all([
          requestMatch(
            fixture,
            service,
            {
              key,
            }
          ),
          requestMatch(
            fixture,
            service,
            {
              key,
            }
          ),
        ]);
        assert.equal(
          concurrentReplay
            .matchId,
          match.matchId
        );
        assert.equal(
          match.status,
          "MATCHED"
        );
        assert.equal(
          match
            .challengeCostSnapshot
            .stakeDays,
          1
        );
        assert.equal(
          String(
            match
              .defenderUserId
          ),
          String(
            fixture.defender
              .user._id
          )
        );
        assert.equal(
          match
            .assignmentAudit
            .requestId,
          key
        );
        assert.equal(
          match
            .assignmentAudit
            .defenderSelection
            .auditId,
          `assignment-${key}`
        );
        assert.equal(
          match
            .assignmentAudit
            .defenderSelection
            .auditSnapshot
            .algorithmVersion,
          "test-weighted-v1"
        );
        const [
          challengerCycle,
          defenderCycle,
        ] = await Promise.all([
          AccessCycle.findById(
            fixture.challenger
              .cycle._id
          ),
          AccessCycle.findById(
            fixture.defender
              .cycle._id
          ),
        ]);
        assert.equal(
          challengerCycle
            .refundChallengeDays,
          28
        );
        assert.equal(
          challengerCycle
            .lockedRefundDays,
          1
        );
        assert.equal(
          challengerCycle
            .challengeRequestCount,
          1
        );
        assert.equal(
          defenderCycle
            .defenseAssignmentsInCycle,
          1
        );

        const replay =
          await requestMatch(
            fixture,
            service,
            {
              key,
            }
          );
        assert.equal(
          replay.matchId,
          match.matchId
        );
        assert.equal(
          await DayBalanceTransaction.countDocuments({
            type: "MATCH_LOCK",
          }),
          1
        );
        assert.equal(
          await RankTakeoverCommandReceipt.countDocuments({
            actorKey:
              `USER:${fixture.challenger.user._id}`,
            commandType:
              "REQUEST_CHALLENGE",
            idempotencyKey:
              key,
            status:
              "COMPLETED",
          }),
          1
        );
        const changedPayload =
          await captureError(
            () =>
              service.requestChallenge({
                challengerUserId:
                  fixture
                    .challenger
                    .user._id,
                activeRanking:
                  "SUB",
                matchType:
                  "REVENGE",
                sourceMatchId:
                  "different-source",
                idempotencyKey:
                  key,
              })
          );
        assert.equal(
          changedPayload.code,
          "IDEMPOTENCY_KEY_CONFLICT"
        );
        const competing =
          await captureError(
            () =>
              requestMatch(
                fixture,
                service,
                {
                  key:
                    "another-active-match",
                }
              )
          );
        assert.equal(
          competing.code,
          "ACTIVE_MATCH_EXISTS"
        );
      }
    );

    await clearData();
    await check(
      "양측 START_MATCH는 개인 Attempt만 두 번 만들고 Match 전이·Outbox는 첫 입장 한 번",
      async () => {
        const fixture =
          await createFixture();
        const clock = {
          value:
            new Date(
              TEST_NOW
            ),
        };
        const calls = [];
        const attemptByRole =
          new Map();
        const {
          service,
        } = makeService(
          fixture,
          {
            clock,
            ensureParticipantAttemptStarted:
              async (input) => {
                assert.equal(
                  input.session
                    .inTransaction(),
                  true
                );
                calls.push({
                  role:
                    input
                      .participantRole,
                  observedAt:
                    new Date(
                      input
                        .observedAt
                    ),
                });
                if (
                  !attemptByRole
                    .has(
                      input
                        .participantRole
                    )
                ) {
                  attemptByRole.set(
                    input
                      .participantRole,
                    {
                      attemptId:
                        objectId(),
                      matchId:
                        input
                          .match
                          .matchId,
                      participantUserId:
                        input
                          .participantUserId,
                      participantRole:
                        input
                          .participantRole,
                      questionPackId:
                        input
                          .questionPackId,
                      // 하드닝: 권위 검증이 매치와 같은 제한시간·시각을 요구한다
                      timeLimitSeconds:
                        input.match
                          .timeLimitSeconds,
                      startedAt:
                        new Date(
                          input
                            .observedAt
                        ),
                      endsAt:
                        new Date(
                          Math.min(
                            input.match
                              .submitsBy
                              .getTime(),
                            new Date(
                              input
                                .observedAt
                            ).getTime() +
                              input.match
                                .timeLimitSeconds *
                                1000
                          )
                        ),
                    }
                  );
                }
                return attemptByRole
                  .get(
                    input
                      .participantRole
                  );
              },
          }
        );
        const match =
          await requestMatch(
            fixture,
            service
          );
        await service.acceptChallenge({
          matchId:
            match.matchId,
          defenderUserId:
            fixture.defender
              .user._id,
          idempotencyKey:
            "dual-start-accept",
        });
        const challengerInput = {
          matchId:
            match.matchId,
          participantUserId:
            fixture.challenger
              .user._id,
          clientBuildVersion:
            "test-ios-1",
          idempotencyKey:
            "dual-start-challenger",
        };
        await service.startMatch(
          challengerInput
        );
        clock.value =
          new Date(
            TEST_NOW.getTime() +
              30_000
          );
        await service.startMatch({
          matchId:
            match.matchId,
          participantUserId:
            fixture.defender
              .user._id,
          clientBuildVersion:
            "test-ios-1",
          idempotencyKey:
            "dual-start-defender",
        });
        assert.deepEqual(
          calls.map(
            (call) =>
              call.role
          ),
          [
            "CHALLENGER",
            "DEFENDER",
          ]
        );
        assert.equal(
          calls[0]
            .observedAt
            .toISOString(),
          TEST_NOW.toISOString()
        );
        assert.equal(
          calls[1]
            .observedAt
            .toISOString(),
          clock.value
            .toISOString()
        );
        const stored =
          await RankTakeoverMatch
            .findOne({
              matchId:
                match.matchId,
            });
        assert.equal(
          stored.status,
          "IN_PROGRESS"
        );
        assert.equal(
          stored.startedAt
            .toISOString(),
          TEST_NOW.toISOString()
        );
        assert.equal(
          await OutboxEvent
            .countDocuments({
              aggregateId:
                match.matchId,
              eventType:
                "TAKEOVER_STARTED",
            }),
          1
        );
        assert.equal(
          await RankTakeoverCommandReceipt
            .countDocuments({
              commandType:
                "START_MATCH",
              status:
                "COMPLETED",
              resultMatchId:
                match.matchId,
            }),
          2
        );
        await service.startMatch(
          challengerInput
        );
        assert.equal(
          calls.length,
          2
        );
        const conflict =
          await captureError(
            () =>
              service.startMatch({
                ...challengerInput,
                clientBuildVersion:
                  "different-build",
              })
          );
        assert.equal(
          conflict.code,
          "IDEMPOTENCY_KEY_CONFLICT"
        );
      }
    );

    await clearData();
    await check(
      "서로 다른 사용자의 같은 신청 키는 전역 충돌 없이 각자 한 번만 잠근다",
      async () => {
        const fixture =
          await createFixture();
        const challengerTwo =
          await createParticipant({
            label:
              `challenger-two-${sequence}`,
            mmr: 1410,
            position: 40,
            ranking: "SUB",
            policy:
              fixture.policy,
            season:
              fixture.season,
            days: 29,
          });
        const defenderTwo =
          await createParticipant({
            label:
              `defender-two-${sequence}`,
            mmr: 1460,
            position: 30,
            ranking: "SUB",
            policy:
              fixture.policy,
            season:
              fixture.season,
            days: 29,
          });
        const {
          service,
        } = makeService(
          fixture,
          {
            selectSubDefender:
              async ({
                challengerUserId,
                requestId,
              }) => ({
                userId:
                  String(
                    challengerUserId
                  ) ===
                  String(
                    fixture
                      .challenger
                      .user._id
                  )
                    ? fixture
                        .defender
                        .user._id
                    : defenderTwo
                        .user._id,
                auditId:
                  `assignment-${requestId}-${challengerUserId}`,
                auditSnapshot: {
                  algorithmVersion:
                    "test-weighted-v1",
                  candidateCount:
                    1,
                },
              }),
          }
        );
        const sharedKey =
          "same-client-key";
        const [
          first,
          second,
        ] = await Promise.all([
          service
            .requestChallenge({
              challengerUserId:
                fixture
                  .challenger
                  .user._id,
              activeRanking:
                "SUB",
              matchType:
                "NORMAL",
              idempotencyKey:
                sharedKey,
            }),
          service
            .requestChallenge({
              challengerUserId:
                challengerTwo
                  .user._id,
              activeRanking:
                "SUB",
              matchType:
                "NORMAL",
              idempotencyKey:
                sharedKey,
            }),
        ]);

        assert.notEqual(
          first.matchId,
          second.matchId
        );
        assert.equal(
          await RankTakeoverMatch
            .countDocuments({}),
          2
        );
        assert.equal(
          await DayBalanceTransaction
            .countDocuments({
              type:
                "MATCH_LOCK",
            }),
          2
        );
        assert.equal(
          await RankTakeoverCommandReceipt
            .countDocuments({
              commandType:
                "REQUEST_CHALLENGE",
              idempotencyKey:
                sharedKey,
              status:
                "COMPLETED",
            }),
          2
        );
      }
    );

    await clearData();
    await check(
      "Sub 도전자 승리는 전액 소각·좌석 원자 교환·완료 카운터 +1, MMR 불변",
      async () => {
        const fixture =
          await createFixture();
        const {
          service,
        } = makeService(
          fixture
        );
        const match =
          await requestMatch(
            fixture,
            service
          );
        const challengerMmr =
          fixture.challenger
            .rankingProfile.mmr;
        const defenderMmr =
          fixture.defender
            .rankingProfile.mmr;
        const challengerResult =
          scoredResult(
            "challenger-win",
            {
              score: 95,
            }
          );
        await service.acceptChallenge({
          matchId:
            match.matchId,
          defenderUserId:
            fixture.defender
              .user._id,
          idempotencyKey:
            "accept-win",
        });
        await service.startMatch({
          matchId:
            match.matchId,
          participantUserId:
            fixture.challenger
              .user._id,
          clientBuildVersion:
            "test-ios-1",
          idempotencyKey:
            "start-win",
        });
        // 하드닝 반영 — 점수는 레지스트리(신뢰 채점 경로)로 공급하고
        // 제출은 submissionId 만 보낸다.
        SCORE_REGISTRY.set(
          "submission-win",
          challengerResult
        );
        const first =
          await service.submitResult({
            matchId:
              match.matchId,
            participantUserId:
              fixture.challenger
                .user._id,
            submissionId:
              "submission-win",
          });
        assert.equal(
          first.status,
          "IN_PROGRESS"
        );
        const replay =
          await service.submitResult({
            matchId:
              match.matchId,
            participantUserId:
              fixture.challenger
                .user._id,
            submissionId:
              "submission-win",
          });
        assert.equal(
          replay.status,
          "IN_PROGRESS"
        );
        SCORE_REGISTRY.set(
          "submission-changed",
          scoredResult(
            "changed",
            {
              score: 1,
            }
          )
        );
        const conflict =
          await captureError(
            () =>
              service.submitResult({
                matchId:
                  match.matchId,
                participantUserId:
                  fixture
                    .challenger
                    .user._id,
                submissionId:
                  "submission-changed",
              })
          );
        assert.equal(
          conflict.code,
          "SUBMISSION_ID_CONFLICT"
        );
        await service.startMatch({
          matchId:
            match.matchId,
          participantUserId:
            fixture.defender
              .user._id,
          clientBuildVersion:
            "test-ios-1",
          idempotencyKey:
            "start-win-def",
        });
        SCORE_REGISTRY.set(
          "submission-defender-lose",
          scoredResult(
            "defender-lose",
            {
              score: 80,
            }
          )
        );
        await service.submitResult({
          matchId:
            match.matchId,
          participantUserId:
            fixture.defender
              .user._id,
          submissionId:
            "submission-defender-lose",
        });
        const resolved =
          await service.resolveScoredMatch({
            matchId:
              match.matchId,
            idempotencyKey:
              "resolve-win",
          });
        assert.equal(
          resolved.winner,
          "CHALLENGER"
        );
        const settled =
          await service.settleResolvedMatch({
            matchId:
              match.matchId,
            settlementVersion: 1,
          });
        assert.equal(
          settled.status,
          "SETTLED"
        );
        assert.equal(
          settled
            .arenaPositionSettlement
            .outcome,
          "SWAPPED"
        );
        assert.deepEqual(
          plainSettlement(
            settled
              .settlementResult
          ),
          {
            toDefenderAvailableDays:
              0,
            toSystemBurnDays:
              1,
            toChallengerAvailableDays:
              0,
          }
        );

        const [
          challengerCycle,
          defenderCycle,
          challengerArena,
          defenderArena,
          challengerSkill,
          defenderSkill,
        ] = await Promise.all([
          AccessCycle.findById(
            fixture.challenger
              .cycle._id
          ),
          AccessCycle.findById(
            fixture.defender
              .cycle._id
          ),
          ArenaProfile.findById(
            fixture.challenger
              .arenaProfile._id
          ),
          ArenaProfile.findById(
            fixture.defender
              .arenaProfile._id
          ),
          RankingProfile.findById(
            fixture.challenger
              .rankingProfile._id
          ),
          RankingProfile.findById(
            fixture.defender
              .rankingProfile._id
          ),
        ]);
        assert.equal(
          challengerCycle
            .refundChallengeDays,
          28
        );
        assert.equal(
          challengerCycle
            .lockedRefundDays,
          0
        );
        assert.equal(
          challengerCycle
            .completedSubNormalChallenges,
          1
        );
        assert.equal(
          challengerCycle
            .completedSubChallenges,
          1
        );
        assert.equal(
          defenderCycle
            .refundChallengeDays,
          29
        );
        assert.equal(
          challengerArena
            .arenaPosition,
          10
        );
        assert.equal(
          defenderArena
            .arenaPosition,
          20
        );
        assert.equal(
          challengerSkill.mmr,
          challengerMmr
        );
        assert.equal(
          defenderSkill.mmr,
          defenderMmr
        );
        assert.equal(
          await DayBalanceTransaction.countDocuments({
            matchId:
              match._id,
            type: "MATCH_BURN",
          }),
          1
        );
        const settlementReplay =
          await service.settleResolvedMatch({
            matchId:
              match.matchId,
            settlementVersion: 1,
          });
        assert.equal(
          settlementReplay.status,
          "SETTLED"
        );
        assert.equal(
          await DayBalanceTransaction.countDocuments({
            matchId:
              match._id,
            type: "MATCH_BURN",
          }),
          1
        );
        assert.equal(
          await OutboxEvent.countDocuments({
            aggregateId:
              match.matchId,
            eventType:
              "TAKEOVER_SETTLED",
          }),
          1
        );
        const completedReceipts =
          await RankTakeoverCommandReceipt.find({
            resultMatchId:
              match.matchId,
            status:
              "COMPLETED",
          }).lean();
        const commandTypes =
          completedReceipts.map(
            (receipt) =>
              receipt.commandType
          );
        for (const commandType of [
          "REQUEST_CHALLENGE",
          "ACCEPT_CHALLENGE",
          "START_MATCH",
          "SUBMIT_RESULT",
          "RESOLVE_SCORED_MATCH",
          "SETTLE_MATCH",
        ]) {
          assert.ok(
            commandTypes.includes(
              commandType
            ),
            `${commandType} receipt missing`
          );
        }
        assert.equal(
          commandTypes.filter(
            (type) =>
              type ===
              "SUBMIT_RESULT"
          ).length,
          2
        );
      }
    );

    await clearData();
    await check(
      "Sub 방어자 승리는 교차-cycle credit을 방어자 원장·캐시에 반영하고 좌석 유지",
      async () => {
        const fixture =
          await createFixture();
        const {
          service,
        } = makeService(
          fixture
        );
        const match =
          await requestMatch(
            fixture,
            service
          );
        await playToResolved({
          fixture,
          service,
          match,
          challengerScore:
            scoredResult(
              "challenger-lose",
              {
                score: 70,
              }
            ),
          defenderScore:
            scoredResult(
              "defender-win",
              {
                score: 90,
              }
            ),
        });
        await service.settleResolvedMatch({
          matchId:
            match.matchId,
        });
        const [
          challengerCycle,
          defenderCycle,
          challengerArena,
          defenderArena,
        ] = await Promise.all([
          AccessCycle.findById(
            fixture.challenger
              .cycle._id
          ),
          AccessCycle.findById(
            fixture.defender
              .cycle._id
          ),
          ArenaProfile.findById(
            fixture.challenger
              .arenaProfile._id
          ),
          ArenaProfile.findById(
            fixture.defender
              .arenaProfile._id
          ),
        ]);
        assert.equal(
          challengerCycle
            .refundChallengeDays,
          28
        );
        assert.equal(
          challengerCycle
            .lockedRefundDays,
          0
        );
        assert.equal(
          defenderCycle
            .refundChallengeDays,
          30
        );
        assert.equal(
          defenderCycle
            .defenseWinsInCycle,
          1
        );
        assert.equal(
          challengerArena
            .arenaPosition,
          20
        );
        assert.equal(
          defenderArena
            .arenaPosition,
          10
        );

        const transfer =
          await DayBalanceTransaction.findOne({
            matchId:
              match._id,
            type:
              "MATCH_TRANSFER",
          }).lean();
        assert.equal(
          String(
            transfer.cycleId
          ),
          String(
            fixture.challenger
              .cycle._id
          )
        );
        assert.ok(
          transfer.entries.some(
            (entry) =>
              String(
                entry.cycleId
              ) ===
                String(
                  fixture
                    .defender
                    .cycle._id
                ) &&
              entry.creditDays ===
                1
          )
        );
        const defenderTransactions =
          await DayBalanceTransaction.find({
            status: "POSTED",
            entries: {
              $elemMatch: {
                userId:
                  fixture
                    .defender
                    .user._id,
                cycleId:
                  fixture
                    .defender
                    .cycle._id,
              },
            },
          }).lean();
        const balances =
          deriveUserBalances(
            defenderTransactions,
            {
              userId:
                fixture
                  .defender
                  .user._id,
              cycleId:
                fixture
                  .defender
                  .cycle._id,
            }
          );
        assert.equal(
          balances
            .USER_REFUND_AVAILABLE,
          30
        );
      }
    );

    await clearData();
    await check(
      "Sub Revenge 패배는 1일 방어자 이전+1일 SYSTEM_BURN이며 OPERATOR_VAULT는 0",
      async () => {
        const fixture =
          await createFixture();
        const serviceState =
          makeService(
            fixture,
            {
              revenge: true,
            }
          );
        const match =
          await requestMatch(
            fixture,
            serviceState.service,
            {
              matchType:
                "REVENGE",
            }
          );
        assert.equal(
          serviceState
            .revengeWasConsumed(),
          true
        );
        assert.equal(
          match
            .challengeCostSnapshot
            .stakeDays,
          2
        );
        await playToResolved({
          fixture,
          service:
            serviceState.service,
          match,
          challengerScore:
            scoredResult(
              "revenge-loser",
              {
                score: 60,
              }
            ),
          defenderScore:
            scoredResult(
              "revenge-defender",
              {
                score: 80,
              }
            ),
        });
        const settled =
          await serviceState
            .service
            .settleResolvedMatch({
              matchId:
                match.matchId,
            });
        assert.deepEqual(
          plainSettlement(
            settled
              .settlementResult
          ),
          {
            toDefenderAvailableDays:
              1,
            toSystemBurnDays:
              1,
            toChallengerAvailableDays:
              0,
          }
        );
        const [
          challengerCycle,
          defenderCycle,
          transactions,
        ] = await Promise.all([
          AccessCycle.findById(
            fixture.challenger
              .cycle._id
          ),
          AccessCycle.findById(
            fixture.defender
              .cycle._id
          ),
          DayBalanceTransaction.find({
            matchId:
              match._id,
          }).lean(),
        ]);
        assert.equal(
          challengerCycle
            .refundChallengeDays,
          27
        );
        assert.equal(
          challengerCycle
            .lockedRefundDays,
          0
        );
        assert.equal(
          challengerCycle
            .completedSubRevengeChallenges,
          1
        );
        assert.equal(
          defenderCycle
            .refundChallengeDays,
          30
        );
        assert.ok(
          transactions.some(
            (transaction) =>
              transaction.type ===
              "MATCH_TRANSFER"
          )
        );
        assert.ok(
          transactions.some(
            (transaction) =>
              transaction.type ===
              "REVENGE_FEE_BURN"
          )
        );
        assert.equal(
          transactions
            .flatMap(
              (transaction) =>
                transaction.entries
            )
            .filter(
              (entry) =>
                entry.account ===
                "OPERATOR_VAULT"
            ).length,
          0
        );
      }
    );

    await clearData();
    await check(
      "방어자 거절은 잠금 전액 해제·좌석/완료 카운터 불변이며 재호출 멱등",
      async () => {
        const fixture =
          await createFixture();
        const {
          service,
        } = makeService(
          fixture
        );
        const match =
          await requestMatch(
            fixture,
            service
          );
        const cancelled =
          await service.rejectChallenge({
            matchId:
              match.matchId,
            defenderUserId:
              fixture.defender
                .user._id,
            idempotencyKey:
              "decline-1",
            reason:
              "해당 시간에는 응시할 수 없습니다.",
          });
        assert.equal(
          cancelled.status,
          "CANCELLED"
        );
        const replay =
          await service.rejectChallenge({
            matchId:
              match.matchId,
            defenderUserId:
              fixture.defender
                .user._id,
            idempotencyKey:
              "decline-1",
            reason:
              "해당 시간에는 응시할 수 없습니다.",
          });
        assert.equal(
          replay.status,
          "CANCELLED"
        );
        const cycle =
          await AccessCycle.findById(
            fixture.challenger
              .cycle._id
          );
        assert.equal(
          cycle.refundChallengeDays,
          29
        );
        assert.equal(
          cycle.lockedRefundDays,
          0
        );
        assert.equal(
          cycle.completedSubChallenges,
          0
        );
        assert.equal(
          cycle.challengeRequestCount,
          1
        );
        assert.equal(
          await DayBalanceTransaction.countDocuments({
            matchId:
              match._id,
            type: "MATCH_UNLOCK",
          }),
          1
        );
        assert.equal(
          await RankTakeoverCommandReceipt.countDocuments({
            resultMatchId:
              match.matchId,
            commandType:
              "REJECT_CHALLENGE",
            status:
              "COMPLETED",
          }),
          1
        );
        assert.equal(
          await OutboxEvent.countDocuments({
            aggregateId:
              match.matchId,
            eventType:
              "TAKEOVER_CANCELLED",
          }),
          1
        );
      }
    );

    await clearData();
    await check(
      "미게시 deadline 정책은 POLICY_PENDING이며 Match·잠금·카운터를 부분 생성하지 않음",
      async () => {
        const fixture =
          await createFixture();
        const {
          service,
        } = makeService(
          fixture,
          {
            deadline: null,
          }
        );
        const failedKey =
          "deadline-policy-pending";
        const error =
          await captureError(
            () =>
              requestMatch(
                fixture,
                service,
                {
                  key:
                    failedKey,
                }
              )
          );
        assert.ok(
          error instanceof
            RankTakeoverError
        );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
        assert.equal(
          error.details.blocker,
          "MATCH_DEADLINE_POLICY_UNSET"
        );
        assert.equal(
          await RankTakeoverMatch.countDocuments(),
          0
        );
        assert.equal(
          await DayBalanceTransaction.countDocuments({
            type: "MATCH_LOCK",
          }),
          0
        );
        const cycle =
          await AccessCycle.findById(
            fixture.challenger
              .cycle._id
          );
        assert.equal(
          cycle.refundChallengeDays,
          29
        );
        assert.equal(
          cycle.challengeRequestCount,
          0
        );
        // 최종 계약(final-hardening): **복구 가능한 실패는 캐시하지 않는다.**
        // POLICY_PENDING 은 정책이 게시되면 해소되는 상태라, FAILED 영수증으로
        // 굳히면 같은 멱등키가 게시 후에도 낡은 실패를 영원히 재생한다.
        // 따라서 영수증은 남지 않아야 하고, 재시도는 매번 살아 있는 판정을 받는다.
        const failedReceipt =
          await RankTakeoverCommandReceipt.findOne({
            actorKey:
              `USER:${fixture.challenger.user._id}`,
            commandType:
              "REQUEST_CHALLENGE",
            idempotencyKey:
              failedKey,
          });
        assert.equal(
          failedReceipt,
          null
        );
        const replayError =
          await captureError(
            () =>
              requestMatch(
                fixture,
                service,
                {
                  key:
                    failedKey,
                }
              )
          );
        assert.equal(
          replayError.code,
          "POLICY_PENDING"
        );
        assert.equal(
          replayError
            .details
            .blocker,
          "MATCH_DEADLINE_POLICY_UNSET"
        );
        assert.equal(
          await RankTakeoverCommandReceipt.countDocuments({
            actorKey:
              `USER:${fixture.challenger.user._id}`,
            commandType:
              "REQUEST_CHALLENGE",
            idempotencyKey:
              failedKey,
          }),
          0
        );
      }
    );

    await clearData();
    await check(
      "pair 무결성 검증기가 없으면 POLICY_PENDING이며 매치·잠금이 생성되지 않음",
      async () => {
        const fixture =
          await createFixture();
        const {
          service,
        } = makeService(
          fixture,
          {
            assertPairIntegrity:
              null,
          }
        );
        const error =
          await captureError(
            () =>
              requestMatch(
                fixture,
                service,
                {
                  key:
                    "pair-integrity-pending",
                }
              )
          );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
        assert.equal(
          error.details.blocker,
          "PAIR_INTEGRITY_CHECK_UNAVAILABLE"
        );
        assert.equal(
          await RankTakeoverMatch.countDocuments(),
          0
        );
        assert.equal(
          await DayBalanceTransaction.countDocuments({
            type: "MATCH_LOCK",
          }),
          0
        );
        const cycle =
          await AccessCycle.findById(
            fixture.challenger
              .cycle._id
          );
        assert.equal(
          cycle.refundChallengeDays,
          29
        );
        assert.equal(
          cycle.challengeRequestCount,
          0
        );
      }
    );

    await clearData();
    await check(
      "Sub 후보 없음 audit은 FAILED receipt에 남고 일수는 잠기지 않음",
      async () => {
        const fixture =
          await createFixture();
        const key =
          "no-candidate-audit";
        const {
          service,
        } = makeService(
          fixture,
          {
            selectSubDefender:
              async ({
                requestId,
              }) => ({
                userId: null,
                auditId:
                  `audit-${requestId}`,
                auditSnapshot: {
                  candidateCount:
                    0,
                  seed:
                    requestId,
                },
              }),
          }
        );
        const error =
          await captureError(
            () =>
              requestMatch(
                fixture,
                service,
                {
                  key,
                }
              )
          );
        assert.equal(
          error.code,
          "NO_CANDIDATE"
        );
        const receipt =
          await RankTakeoverCommandReceipt.findOne({
            commandType:
              "REQUEST_CHALLENGE",
            idempotencyKey:
              key,
          }).lean();
        assert.equal(
          receipt.status,
          "FAILED"
        );
        assert.equal(
          receipt
            .errorDetails
            .defenderSelection
            .auditId,
          `audit-${key}`
        );
        assert.equal(
          receipt
            .errorDetails
            .defenderSelection
            .auditSnapshot
            .candidateCount,
          0
        );
        assert.equal(
          await RankTakeoverMatch.countDocuments(),
          0
        );
        assert.equal(
          await DayBalanceTransaction.countDocuments({
            type: "MATCH_LOCK",
          }),
          0
        );
      }
    );

    await clearData();
    await check(
      "문제 세트 준비기가 없으면 수락만 POLICY_PENDING이고 기존 잠금은 유지됨",
      async () => {
        const fixture =
          await createFixture();
        const {
          service,
        } = makeService(
          fixture,
          {
            prepareQuestionPacks:
              null,
          }
        );
        const match =
          await requestMatch(
            fixture,
            service
          );
        const acceptKey =
          "question-pack-pending";
        const error =
          await captureError(
            () =>
              service.acceptChallenge({
                matchId:
                  match.matchId,
                defenderUserId:
                  fixture
                    .defender
                    .user._id,
                idempotencyKey:
                  acceptKey,
              })
          );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
        assert.equal(
          error.details.blocker,
          "QUESTION_PACK_PREPARER_UNAVAILABLE"
        );
        const [
          unchanged,
          cycle,
          receipt,
        ] = await Promise.all([
          RankTakeoverMatch.findById(
            match._id
          ),
          AccessCycle.findById(
            fixture.challenger
              .cycle._id
          ),
          RankTakeoverCommandReceipt.findOne({
            commandType:
              "ACCEPT_CHALLENGE",
            idempotencyKey:
              acceptKey,
          }),
        ]);
        assert.equal(
          unchanged.status,
          "MATCHED"
        );
        assert.equal(
          unchanged
            .challengerQuestionPackId,
          null
        );
        assert.equal(
          unchanged
            .defenderQuestionPackId,
          null
        );
        assert.equal(
          cycle.refundChallengeDays,
          28
        );
        assert.equal(
          cycle.lockedRefundDays,
          1
        );
        // 최종 계약: POLICY_PENDING(준비기 미구성)은 복구 가능한 실패라
        // FAILED 영수증으로 캐시하지 않는다 — 구성이 채워지면 같은 키의
        // 재시도가 정상 수락돼야 한다.
        assert.equal(
          receipt,
          null
        );
        assert.equal(
          await OutboxEvent.countDocuments({
            aggregateId:
              match.matchId,
            eventType:
              "TAKEOVER_ACCEPTED",
          }),
          0
        );
      }
    );

    await clearData();
    await check(
      "Attempt 도메인 실패는 START_MATCH 실패 영수증으로 고정되고 부분 시작은 롤백",
      async () => {
        const fixture =
          await createFixture();
        const attemptFailure =
          new Error(
            "published heartbeat policy is unavailable"
          );
        attemptFailure.name =
          "ArenaMatchAttemptError";
        attemptFailure.code =
          "POLICY_PENDING";
        attemptFailure.statusCode =
          409;
        attemptFailure.reasonCode =
          "HEARTBEAT_POLICY_UNPUBLISHED";
        attemptFailure.details = {
          rawDevice:
            "must-not-persist",
        };
        const {
          service,
        } = makeService(
          fixture,
          {
            ensureParticipantAttemptStarted:
              async () => {
                throw attemptFailure;
              },
          }
        );
        const match =
          await requestMatch(
            fixture,
            service
          );
        await service.acceptChallenge({
          matchId:
            match.matchId,
          defenderUserId:
            fixture.defender
              .user._id,
          idempotencyKey:
            "attempt-failure-accept",
        });
        const startInput = {
          matchId:
            match.matchId,
          participantUserId:
            fixture.challenger
              .user._id,
          clientBuildVersion:
            "test-ios-1",
          idempotencyKey:
            "attempt-failure-start",
        };
        const firstError =
          await captureError(
            () =>
              service.startMatch(
                startInput
              )
          );
        assert.equal(
          firstError.code,
          "POLICY_PENDING"
        );
        // 최종 계약: POLICY_PENDING 은 캐시하지 않는다 — 영수증이 없어야
        // 정책 게시 후 같은 키의 재시도가 정상 시작될 수 있다.
        // (비밀 누출 검사도 자연히 강화된다: 아무것도 저장되지 않는다.)
        const receipt =
          await RankTakeoverCommandReceipt
            .findOne({
              commandType:
                "START_MATCH",
              idempotencyKey:
                startInput
                  .idempotencyKey,
            })
            .lean();
        assert.equal(
          receipt,
          null
        );
        const stored =
          await RankTakeoverMatch
            .findOne({
              matchId:
                match.matchId,
            });
        assert.equal(
          stored.status,
          "READY"
        );
        assert.equal(
          stored.startedAt,
          null
        );
        assert.equal(
          await OutboxEvent
            .countDocuments({
              aggregateId:
                match.matchId,
              eventType:
                "TAKEOVER_STARTED",
            }),
          0
        );
        const replayError =
          await captureError(
            () =>
              service.startMatch(
                startInput
              )
          );
        assert.equal(
          replayError.code,
          "POLICY_PENDING"
        );
      }
    );

    await clearData();
    await check(
      "서버 채점 버전이 sealed 문제 세트와 다르면 결과를 저장하지 않음",
      async () => {
        const fixture =
          await createFixture();
        const {
          service,
        } = makeService(
          fixture
        );
        const match =
          await requestMatch(
            fixture,
            service
          );
        await service.acceptChallenge({
          matchId:
            match.matchId,
          defenderUserId:
            fixture.defender
              .user._id,
          idempotencyKey:
            "version-accept",
        });
        await service.startMatch({
          matchId:
            match.matchId,
          participantUserId:
            fixture.challenger
              .user._id,
          clientBuildVersion:
            "test-ios-1",
          idempotencyKey:
            "version-start",
        });
        const mismatched =
          scoredResult(
            "version-mismatch",
            {
              score: 90,
            }
          );
        mismatched
          .answerKeyVersion =
          "arena-answer-v2";
        SCORE_REGISTRY.set(
          "submission-version-mismatch",
          mismatched
        );
        const error =
          await captureError(
            () =>
              service.submitResult({
                matchId:
                  match.matchId,
                participantUserId:
                  fixture
                    .challenger
                    .user._id,
                submissionId:
                  "submission-version-mismatch",
              })
          );
        assert.equal(
          error.code,
          "SCORING_VERSION_MISMATCH"
        );
        assert.equal(
          error.statusCode,
          409
        );
        const unchanged =
          await RankTakeoverMatch.findById(
            match._id
          );
        assert.equal(
          unchanged.status,
          "IN_PROGRESS"
        );
        assert.equal(
          unchanged
            .challengerResult,
          null
        );
        assert.equal(
          await RankTakeoverCommandReceipt.countDocuments({
            commandType:
              "SUBMIT_RESULT",
            idempotencyKey:
              mismatched
                .submissionId,
            status:
              "FAILED",
          }),
          1
        );
      }
    );

    await clearData();
    await check(
      "마감 전 server Attempt 제출은 worker가 늦게 처리해도 인정하고 실제 마감 후 제출은 차단",
      async () => {
        const fixture =
          await createFixture();
        const clock = {
          value:
            new Date(
              TEST_NOW
            ),
        };
        const {
          service,
        } = makeService(
          fixture,
          {
            clock,
            deadline: {
              startDeadlineMinutes:
                1,
              submissionDeadlineMinutes:
                2,
              questionPolicyVersion:
                "arena-pack-v1",
            },
          }
        );
        const match =
          await requestMatch(
            fixture,
            service,
            {
              key:
                "delayed-worker-match",
            }
          );
        await service.acceptChallenge({
          matchId:
            match.matchId,
          defenderUserId:
            fixture.defender
              .user._id,
          idempotencyKey:
            "delayed-worker-accept",
        });
        await service.startMatch({
          matchId:
            match.matchId,
          participantUserId:
            fixture.challenger
              .user._id,
          clientBuildVersion:
            "test-ios-1",
          idempotencyKey:
            "delayed-worker-start",
        });
        const acceptedAt =
          new Date(
            match.submitsBy
              .getTime() -
              1000
          );
        clock.value =
          new Date(
            match.submitsBy
              .getTime() +
              60_000
          );
        const delayedResult =
          scoredResult(
            "delayed-worker",
            {
              score: 88,
            }
          );
        // 신뢰 채점 계약에서 **submittedAt 이 곧 실제 답안 제출 시각**이다.
        // (attemptSubmittedAt 라는 별도 필드는 신뢰 목록에 없다 —
        //  워커 처리 시각과 무관하게 이 값으로 마감을 판정한다.)
        delayedResult
          .submittedAt =
          acceptedAt
            .toISOString();
        SCORE_REGISTRY.set(
          "submission-delayed-worker",
          delayedResult
        );
        const accepted =
          await service
            .submitResult({
              matchId:
                match.matchId,
              participantUserId:
                fixture
                  .challenger
                  .user._id,
              submissionId:
                "submission-delayed-worker",
            });
        assert.equal(
          accepted.status,
          "IN_PROGRESS"
        );
        assert.equal(
          accepted
            .challengerResult
            .submittedAt
            .getTime(),
          acceptedAt.getTime()
        );


        await clearData();
        const lateFixture =
          await createFixture();
        const lateClock = {
          value:
            new Date(
              TEST_NOW
            ),
        };
        const {
          service:
            lateService,
        } = makeService(
          lateFixture,
          {
            clock:
              lateClock,
            deadline: {
              startDeadlineMinutes:
                1,
              submissionDeadlineMinutes:
                2,
              questionPolicyVersion:
                "arena-pack-v1",
            },
          }
        );
        const lateMatch =
          await requestMatch(
            lateFixture,
            lateService,
            {
              key:
                "actual-late-match",
            }
          );
        await lateService
          .acceptChallenge({
            matchId:
              lateMatch.matchId,
            defenderUserId:
              lateFixture
                .defender
                .user._id,
            idempotencyKey:
              "actual-late-accept",
          });
        await lateService
          .startMatch({
            matchId:
              lateMatch.matchId,
            participantUserId:
              lateFixture
                .challenger
                .user._id,
            clientBuildVersion:
              "test-ios-1",
            idempotencyKey:
              "actual-late-start",
          });
        const actuallyLate =
          new Date(
            lateMatch.submitsBy
              .getTime() +
              1
          );
        lateClock.value =
          new Date(
            lateMatch.submitsBy
              .getTime() +
              60_000
          );
        const lateResult =
          scoredResult(
            "actual-late",
            {
              score: 99,
            }
          );
        lateResult
          .submittedAt =
          actuallyLate
            .toISOString();
        SCORE_REGISTRY.set(
          "submission-actual-late",
          lateResult
        );
        const lateError =
          await captureError(
            () =>
              lateService
                .submitResult({
                  matchId:
                    lateMatch
                      .matchId,
                  participantUserId:
                    lateFixture
                      .challenger
                      .user._id,
                  submissionId:
                    "submission-actual-late",
                })
          );
        assert.equal(
          lateError.code,
          "MATCH_SUBMISSION_DEADLINE_PASSED"
        );
        const unchanged =
          await RankTakeoverMatch
            .findById(
              lateMatch._id
            )
            .lean();
        assert.equal(
          unchanged
            .challengerResult,
          null
        );
      }
    );

    await clearData();
    await check(
      "Main은 tier mapping 미게시 시 차단하고 게시된 2-Step은 BONUS 4일만 이전",
      async () => {
        const pending =
          await createFixture({
            ranking: "MAIN",
          });
        const pendingService =
          makeService(
            pending
          ).service;
        const error =
          await captureError(
            () =>
              requestMatch(
                pending,
                pendingService
              )
          );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
        assert.equal(
          error.details.blocker,
          "ARENA_TIER_MAPPING_UNSET"
        );
        assert.equal(
          await RankTakeoverMatch.countDocuments(),
          0
        );

        await clearData();
        const fixture =
          await createFixture({
            ranking: "MAIN",
            policyOverrides: {
              arenaTierStepMappingVersion:
                "arena-tier-v1",
              // 하드닝: 9단계 좌석 상한이 함께 게시돼야 한다 —
              // 버전 문자열만으로는 ARENA_TIER_POSITION_CEILINGS_UNSET.
              // 픽스처 좌석(방어 10 · 도전 20 / 방어 30 · 도전 40)이
              // 정확히 **2단계 차이**가 되도록 상한을 고른다:
              //   10→9단계, 20→7단계 / 30→6단계, 40→4단계
              arenaTierStepPositionCeilings:
                [
                  10, 15, 25, 32,
                  38, 45, 100,
                  200, 400,
                ],
            },
          });
        const {
          service,
        } = makeService(
          fixture,
          {
            mainGap: 2,
          }
        );
        const match =
          await requestMatch(
            fixture,
            service
          );
        assert.equal(
          match
            .challengeCostSnapshot
            .assetType,
          "BONUS_ACCESS_DAY"
        );
        assert.equal(
          match
            .challengeCostSnapshot
            .stakeDays,
          4
        );
        await playToResolved({
          fixture,
          service,
          match,
          challengerScore:
            scoredResult(
              "main-loser",
              {
                score: 50,
              }
            ),
          defenderScore:
            scoredResult(
              "main-defender",
              {
                score: 90,
              }
            ),
        });
        await service.settleResolvedMatch({
          matchId:
            match.matchId,
        });
        const [
          challengerCycle,
          defenderCycle,
        ] = await Promise.all([
          AccessCycle.findById(
            fixture.challenger
              .cycle._id
          ),
          AccessCycle.findById(
            fixture.defender
              .cycle._id
          ),
        ]);
        assert.equal(
          challengerCycle
            .bonusAccessDays,
          8
        );
        assert.equal(
          challengerCycle
            .lockedBonusDays,
          0
        );
        assert.equal(
          defenderCycle
            .bonusAccessDays,
          16
        );
        assert.equal(
          challengerCycle
            .refundChallengeDays,
          0
        );
        assert.equal(
          defenderCycle
            .refundChallengeDays,
          0
        );
      }
    );

    await clearData();
    await check(
      "활성 보호 중 Revenge 우회 정책 null은 POLICY_PENDING이고 일수를 잠그지 않음",
      async () => {
        const fixture =
          await createFixture({
            defenderProtectionUntil:
              new Date(
                TEST_NOW.getTime() +
                  DAY_MS
              ),
          });
        const serviceState =
          makeService(
            fixture,
            {
              revenge: true,
            }
          );
        const error =
          await captureError(
            () =>
              requestMatch(
                fixture,
                serviceState.service,
                {
                  matchType:
                    "REVENGE",
                }
              )
          );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
        assert.equal(
          error.details.blocker,
          "REVENGE_PROTECTION_POLICY_UNSET"
        );
        assert.equal(
          serviceState
            .revengeWasConsumed(),
          false
        );
        const cycle =
          await AccessCycle.findById(
            fixture.challenger
              .cycle._id
          );
        assert.equal(
          cycle.refundChallengeDays,
          29
        );
        assert.equal(
          cycle.lockedRefundDays,
          0
        );
      }
    );

    await clearData();
    await check(
      "Main Shield 중 Revenge 우회 정책 null도 POLICY_PENDING이며 BONUS를 잠그지 않음",
      async () => {
        const fixture =
          await createFixture({
            ranking: "MAIN",
            policyOverrides: {
              arenaTierStepMappingVersion:
                "arena-tier-v1",
            },
            defenderShieldUntil:
              new Date(
                TEST_NOW.getTime() +
                  DAY_MS
              ),
          });
        const serviceState =
          makeService(
            fixture,
            {
              revenge: true,
            }
          );
        const error =
          await captureError(
            () =>
              requestMatch(
                fixture,
                serviceState.service,
                {
                  matchType:
                    "REVENGE",
                }
              )
          );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
        assert.equal(
          error.details.blocker,
          "REVENGE_SHIELD_POLICY_UNSET"
        );
        const cycle =
          await AccessCycle.findById(
            fixture.challenger
              .cycle._id
          );
        assert.equal(
          cycle.bonusAccessDays,
          12
        );
        assert.equal(
          cycle.lockedBonusDays,
          0
        );
      }
    );

    await clearData();
    await check(
      "완전 동점은 Sudden Death 시간 정책 null이면 POLICY_PENDING 상태로 잠금 유지",
      async () => {
        const fixture =
          await createFixture();
        const {
          service,
        } = makeService(
          fixture
        );
        const match =
          await requestMatch(
            fixture,
            service
          );
        const tied = {
          score: 88,
          advanced: 3,
          timeMs: 90_000,
        };
        await service.acceptChallenge({
          matchId:
            match.matchId,
          defenderUserId:
            fixture.defender
              .user._id,
          idempotencyKey:
            "tie-accept",
        });
        await service.startMatch({
          matchId:
            match.matchId,
          participantUserId:
            fixture.challenger
              .user._id,
          clientBuildVersion:
            "test-ios-1",
          idempotencyKey:
            "tie-start",
        });
        // 하드닝: 방어자도 개인 시작 후에만 제출할 수 있다
        await service.startMatch({
          matchId:
            match.matchId,
          participantUserId:
            fixture.defender
              .user._id,
          clientBuildVersion:
            "test-ios-1",
          idempotencyKey:
            "tie-start-def",
        });
        SCORE_REGISTRY.set(
          "submission-tie-c",
          scoredResult(
            "tie-c",
            tied
          )
        );
        SCORE_REGISTRY.set(
          "submission-tie-d",
          scoredResult(
            "tie-d",
            tied
          )
        );
        await service.submitResult({
          matchId:
            match.matchId,
          participantUserId:
            fixture.challenger
              .user._id,
          submissionId:
            "submission-tie-c",
        });
        await service.submitResult({
          matchId:
            match.matchId,
          participantUserId:
            fixture.defender
              .user._id,
          submissionId:
            "submission-tie-d",
        });
        const error =
          await captureError(
            () =>
              service.resolveScoredMatch({
                matchId:
                  match.matchId,
                idempotencyKey:
                  "tie-resolve",
              })
          );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
        assert.equal(
          error.details.blocker,
          "SUDDEN_DEATH_TIMING_UNSET"
        );
        const unchanged =
          await RankTakeoverMatch.findById(
            match._id
          );
        assert.equal(
          unchanged.status,
          "SUBMITTED"
        );
        const cycle =
          await AccessCycle.findById(
            fixture.challenger
              .cycle._id
          );
        assert.equal(
          cycle.lockedRefundDays,
          1
        );
      }
    );

    await clearData();
    await check(
      "No-show 판정은 timing resolver와 완료·방어승 정책이 모두 게시되기 전 차단",
      async () => {
        const fixture =
          await createFixture({
            policyOverrides: {
              noShowCountsAsCompletedChallenge:
                true,
            },
          });
        const clock = {
          value: TEST_NOW,
        };
        const {
          service,
        } = makeService(
          fixture,
          {
            clock,
            resolveNoShowState:
              async () =>
                "CHALLENGER",
          }
        );
        const match =
          await requestMatch(
            fixture,
            service
          );
        await service.acceptChallenge({
          matchId:
            match.matchId,
          defenderUserId:
            fixture.defender
              .user._id,
          idempotencyKey:
            "no-show-accept",
        });
        await service.startMatch({
          matchId:
            match.matchId,
          participantUserId:
            fixture.defender
              .user._id,
          clientBuildVersion:
            "test-ios-1",
          idempotencyKey:
            "no-show-start",
        });
        clock.value =
          new Date(
            TEST_NOW.getTime() +
              181 * 60_000
          );
        const noTimingService =
          makeService(
            fixture,
            {
              clock,
            }
          ).service;
        const timingError =
          await captureError(
            () =>
              noTimingService
                .resolveNoShowMatch({
                  matchId:
                    match.matchId,
                  idempotencyKey:
                    "no-show-timing-unset",
                })
          );
        assert.equal(
          timingError.code,
          "POLICY_PENDING"
        );
        assert.equal(
          timingError
            .details
            .blocker,
          "NO_SHOW_TIMING_POLICY_UNAVAILABLE"
        );
        const error =
          await captureError(
            () =>
              service.resolveNoShowMatch({
                matchId:
                  match.matchId,
                idempotencyKey:
                  "no-show-resolve",
              })
          );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
        assert.equal(
          error.details.blocker,
          "NO_SHOW_DEFENSE_WIN_POLICY_UNSET"
        );
        const unchanged =
          await RankTakeoverMatch.findById(
            match._id
          );
        assert.equal(
          unchanged.status,
          "IN_PROGRESS"
        );
      }
    );

    await clearData();
    await check(
      "게시된 challenger No-show 정책은 이전 정산하되 카운터별 true/false를 그대로 적용",
      async () => {
        const fixture =
          await createFixture({
            policyOverrides: {
              noShowCountsAsCompletedChallenge:
                false,
              noShowCountsAsDefenseWin:
                true,
            },
          });
        const clock = {
          value: TEST_NOW,
        };
        const {
          service,
        } = makeService(
          fixture,
          {
            clock,
            resolveNoShowState:
              async () =>
                "CHALLENGER",
          }
        );
        const match =
          await requestMatch(
            fixture,
            service
          );
        await service.acceptChallenge({
          matchId:
            match.matchId,
          defenderUserId:
            fixture.defender
              .user._id,
          idempotencyKey:
            "no-show-ready",
        });
        await service.startMatch({
          matchId:
            match.matchId,
          participantUserId:
            fixture.defender
              .user._id,
          clientBuildVersion:
            "test-ios-1",
          idempotencyKey:
            "no-show-running",
        });
        clock.value =
          new Date(
            TEST_NOW.getTime() +
              181 * 60_000
          );
        const resolved =
          await service.resolveNoShowMatch({
            matchId:
              match.matchId,
            idempotencyKey:
              "no-show-policy",
          });
        assert.equal(
          resolved.status,
          "RESOLVED"
        );
        assert.equal(
          resolved
            .settlementReason,
          "CHALLENGER_NO_SHOW"
        );
        await service.settleResolvedMatch({
          matchId:
            match.matchId,
        });
        const [
          challengerCycle,
          defenderCycle,
        ] = await Promise.all([
          AccessCycle.findById(
            fixture.challenger
              .cycle._id
          ),
          AccessCycle.findById(
            fixture.defender
              .cycle._id
          ),
        ]);
        assert.equal(
          challengerCycle
            .completedSubChallenges,
          0
        );
        assert.equal(
          defenderCycle
            .defenseWinsInCycle,
          1
        );
        assert.equal(
          defenderCycle
            .refundChallengeDays,
          30
        );
      }
    );

    await clearData();
    await check(
      "defender No-show는 stake 전액 해제·INVALID·좌석/완료 카운터 불변",
      async () => {
        const fixture =
          await createFixture();
        const clock = {
          value: TEST_NOW,
        };
        const {
          service,
        } = makeService(
          fixture,
          {
            clock,
            resolveNoShowState:
              async () =>
                "DEFENDER",
          }
        );
        const match =
          await requestMatch(
            fixture,
            service
          );
        await service.acceptChallenge({
          matchId:
            match.matchId,
          defenderUserId:
            fixture.defender
              .user._id,
          idempotencyKey:
            "defender-no-show-ready",
        });
        await service.startMatch({
          matchId:
            match.matchId,
          participantUserId:
            fixture.challenger
              .user._id,
          clientBuildVersion:
            "test-ios-1",
          idempotencyKey:
            "defender-no-show-start",
        });
        clock.value =
          new Date(
            TEST_NOW.getTime() +
              181 * 60_000
          );
        const invalid =
          await service.resolveNoShowMatch({
            matchId:
              match.matchId,
            idempotencyKey:
              "defender-no-show-resolve",
          });
        assert.equal(
          invalid.status,
          "INVALID"
        );
        assert.equal(
          invalid
            .settlementReason,
          "DEFENDER_NO_SHOW"
        );
        const [
          cycle,
          challengerArena,
          defenderArena,
        ] = await Promise.all([
          AccessCycle.findById(
            fixture.challenger
              .cycle._id
          ),
          ArenaProfile.findById(
            fixture.challenger
              .arenaProfile._id
          ),
          ArenaProfile.findById(
            fixture.defender
              .arenaProfile._id
          ),
        ]);
        assert.equal(
          cycle.refundChallengeDays,
          29
        );
        assert.equal(
          cycle.lockedRefundDays,
          0
        );
        assert.equal(
          cycle.completedSubChallenges,
          0
        );
        assert.equal(
          challengerArena
            .arenaPosition,
          20
        );
        assert.equal(
          defenderArena
            .arenaPosition,
          10
        );
      }
    );
  } finally {
    await mongoose.disconnect();
    await memory.stop();
  }

  const failed =
    checks.filter(
      (entry) =>
        !entry.passed
    );
  console.log(
    `\n${checks.length - failed.length}/${checks.length} rank takeover service checks passed.`
  );
  if (failed.length) {
    for (const entry of failed) {
      console.error(
        `\n[${entry.label}]`
      );
      console.error(
        entry.error
      );
    }
    process.exitCode = 1;
  }
}

function plainSettlement(
  value
) {
  return {
    toDefenderAvailableDays:
      value
        .toDefenderAvailableDays,
    toSystemBurnDays:
      value
        .toSystemBurnDays,
    toChallengerAvailableDays:
      value
        .toChallengerAvailableDays,
  };
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
