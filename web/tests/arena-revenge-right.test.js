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
  RankTakeoverRevengeRight:
    ArenaRevengeRight,
} = require(
  "../models/arenaRevengeRightModel"
);
const {
  ArenaSeason,
} = require(
  "../models/arenaSeasonModel"
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
  RankingProfile,
  User,
} = require(
  "../models/matthsModel"
);
const {
  ArenaRevengeRightError,
  createArenaRevengeRightService,
} = require(
  "../services/arenaRevengeRightService"
);

const TEST_NOW =
  new Date(
    "2026-07-10T12:00:00.000Z"
  );
const HOUR_MS =
  60 * 60 * 1000;
let sequence = 1;
const checks = [];

function objectId() {
  return new mongoose
    .Types.ObjectId();
}

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
  ArenaRevengeRight,
  RankTakeoverMatch,
  ArenaProfile,
  ArenaSeason,
  AccessCycle,
  PolicyVersion,
  RankingProfile,
  User,
];

async function clearData() {
  for (const model of models) {
    await model.deleteMany({});
  }
}

async function syncIndexes() {
  for (const model of models) {
    await model.syncIndexes();
  }
}

async function createUser(
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
      isActive: true,
      termsAcceptedAt:
        TEST_NOW,
      school: {
        region: "서울",
        code:
          `school-${sequence}`,
        name:
          "리벤지테스트고",
      },
    });
  const rankingProfile =
    await RankingProfile.create({
      userId: user._id,
      placementAttemptId:
        objectId(),
      placementScore: 85,
      mmr,
      tier: "GOLD",
      status: "CONFIRMED",
    });
  sequence += 1;
  return {
    rankingProfile,
    user,
  };
}

async function createParticipant({
  label,
  mmr,
  position,
  ranking,
  policy,
  season,
}) {
  const identity =
    await createUser(
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
          ? 29
          : 0,
      lockedRefundDays: 0,
      bonusAccessDays:
        ranking === "MAIN"
          ? 20
          : 0,
      lockedBonusDays: 0,
      integrityState:
        "CLEAR",
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
      lastTakeoverSettledAt:
        new Date(
          TEST_NOW.getTime() -
            HOUR_MS
        ),
    });
  return {
    ...identity,
    arenaProfile,
    cycle,
  };
}

function mainStakeTable(
  matchType
) {
  return matchType ===
    "REVENGE"
    ? {
        matchType,
        oneStep: 3,
        twoSteps: 5,
        threeOrMoreSteps:
          7,
      }
    : {
        matchType,
        oneStep: 2,
        twoSteps: 4,
        threeOrMoreSteps:
          6,
      };
}

async function createSourceMatch({
  ranking,
  matchType,
  policy,
  season,
  target,
  entitled,
  settledAt,
  mainGap = 2,
}) {
  const normalStake =
    ranking === "SUB"
      ? 1
      : mainGap === 1
        ? 2
        : mainGap === 2
          ? 4
          : 6;
  const stake =
    matchType ===
    "REVENGE"
      ? normalStake + 1
      : normalStake;
  const matchedAt =
    new Date(
      settledAt.getTime() -
        4 * HOUR_MS
    );
  return RankTakeoverMatch.create({
    matchId:
      `source-match-${sequence++}`,
    seasonId: season._id,
    policyVersionId:
      policy._id,
    activeRanking:
      ranking,
    challengerUserId:
      target.user._id,
    challengerCycleId:
      target.cycle._id,
    defenderUserId:
      entitled.user._id,
    defenderCycleId:
      entitled.cycle._id,
    challengerPositionBefore:
      20,
    defenderPositionBefore:
      10,
    matchType,
    challengeCostSnapshot: {
      assetType:
        ranking === "SUB"
          ? "REFUND_CHALLENGE_DAY"
          : "BONUS_ACCESS_DAY",
      availableAccount:
        ranking === "SUB"
          ? "USER_REFUND_AVAILABLE"
          : "USER_BONUS_AVAILABLE",
      lockedAccount:
        ranking === "SUB"
          ? "USER_REFUND_LOCKED"
          : "USER_BONUS_LOCKED",
      stakeDays: stake,
      challengerWinBurnDays:
        stake,
      challengerLossDefenderPayoutDays:
        normalStake,
      challengerLossFeeBurnDays:
        matchType ===
          "REVENGE"
          ? 1
          : 0,
      challengeTierStepGap:
        ranking === "MAIN"
          ? mainGap
          : null,
      mainTierStepStakeDays:
        ranking === "MAIN"
          ? mainStakeTable(
              matchType
            )
          : null,
    },
    deadlinePolicySnapshot: {
      startDeadlineMinutes:
        60,
      submissionDeadlineMinutes:
        180,
    },
    challengeLockTransactionId:
      objectId(),
    challengeLockIdempotencyKey:
      `source-lock-${sequence}`,
    status: "SETTLED",
    matchedAt,
    startsBy:
      new Date(
        matchedAt.getTime() +
          HOUR_MS
      ),
    startedAt:
      new Date(
        matchedAt.getTime() +
          30 * 60 * 1000
      ),
    submitsBy:
      new Date(
        matchedAt.getTime() +
          3 * HOUR_MS
      ),
    resolvedAt: settledAt,
    settledAt,
    winner: "CHALLENGER",
    tieBreakStage:
      "CALIBRATED_SCORE",
    settlementVersion: 1,
    settlementReason:
      "SCORED_RESULT",
    settlementResult: {
      toDefenderAvailableDays:
        0,
      toSystemBurnDays:
        stake,
      toChallengerAvailableDays:
        0,
    },
    settlementTransactionIds:
      [objectId()],
    arenaPositionSettlement: {
      outcome: "SWAPPED",
      referenceKey:
        `seat-swap-${sequence}`,
      challengerPositionAfter:
        10,
      defenderPositionAfter:
        20,
    },
    // 하드닝 스키마(assignmentAuditSchema)는 필수 필드를 요구한다 —
    // 예전의 자리표시자({source: …})는 StrictModeError 로 거부된다.
    // 운영에서도 모든 매치가 완전한 감사를 갖는 것이 계약이므로
    // 픽스처도 유효한 감사를 채운다.
    assignmentAudit: {
      requestFingerprint:
        "ab".repeat(32),
      requestId:
        `revenge-right-test-${sequence}`,
      assignmentType:
        "WEIGHTED_SERVER_ASSIGNMENT",
      skillMmrSnapshots: {
        challenger: 1200,
        defender: 1180,
      },
      assignedAt: matchedAt,
    },
    integrityState:
      "CLEAR",
  });
}

async function createFixture({
  ranking = "SUB",
  matchType = "NORMAL",
  settledAt = new Date(
    TEST_NOW.getTime() -
      HOUR_MS
  ),
  policyOverrides = {},
} = {}) {
  const policy =
    await PolicyVersion.create({
      version:
        `revenge-policy-${sequence++}`,
      effectiveFrom:
        new Date(
          "2026-07-01T00:00:00.000Z"
        ),
      revengeRightHours:
        24,
      revengeBypassesProtection:
        false,
      revengeBypassesShield:
        false,
      completionPass: {
        cycleDay: 30,
        opensAtKst: "00:00",
        deadlineAtKst:
          "23:59",
        allowedActivityTypes:
          ["PRACTICE"],
      },
      ...policyOverrides,
    });
  const season =
    await ArenaSeason.create({
      seasonId:
        `revenge-season-${sequence++}`,
      title:
        "RevengeRight Test",
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
  const target =
    await createParticipant({
      label:
        `source-winner-${sequence}`,
      mmr: 1610,
      position: 10,
      ranking,
      policy,
      season,
    });
  const entitled =
    await createParticipant({
      label:
        `seat-loser-${sequence}`,
      mmr: 1510,
      position: 20,
      ranking,
      policy,
      season,
    });
  const sourceMatch =
    await createSourceMatch({
      ranking,
      matchType,
      policy,
      season,
      target,
      entitled,
      settledAt,
    });
  const clock = {
    value: TEST_NOW,
  };
  const service =
    createArenaRevengeRightService({
      now: () =>
        new Date(
          clock.value
        ),
    });
  return {
    clock,
    entitled,
    policy,
    season,
    service,
    sourceMatch,
    target,
  };
}

function resolveInput(
  fixture,
  overrides = {}
) {
  return {
    sourceMatchId:
      fixture.sourceMatch
        .matchId,
    entitledUserId:
      fixture.entitled
        .user._id,
    season:
      fixture.season,
    activeRanking:
      fixture.sourceMatch
        .activeRanking,
    now:
      fixture.clock.value,
    ...overrides,
  };
}

function consumingMatch(
  fixture,
  right,
  label
) {
  return {
    _id: objectId(),
    matchId:
      `revenge-consumer-${label}-${sequence++}`,
    seasonId:
      fixture.season._id,
    policyVersionId:
      fixture.policy._id,
    activeRanking:
      fixture.sourceMatch
        .activeRanking,
    challengerUserId:
      fixture.entitled
        .user._id,
    defenderUserId:
      fixture.target
        .user._id,
    matchType: "REVENGE",
    status: "MATCHED",
    assignmentAudit: {
      requestFingerprint:
        "cd".repeat(32),
      requestId:
        `revenge-consume-${right.rightId}`,
      assignmentType:
        "REVENGE_RIGHT",
      skillMmrSnapshots: {
        challenger: 1200,
        defender: 1180,
      },
      assignedAt: TEST_NOW,
      sourceMatchId:
        fixture.sourceMatch
          .matchId,
      revengeRightId:
        right.rightId,
    },
  };
}

async function consumeInTransaction({
  service,
  right,
  match,
  now = TEST_NOW,
}) {
  const session =
    await mongoose
      .startSession();
  let consumed;
  try {
    await session.withTransaction(
      async () => {
        consumed =
          await service
            .consumeRevengeRight({
              right,
              consumedByMatch:
                match,
              now,
              session,
            });
      }
    );
    return consumed;
  } finally {
    await session.endSession();
  }
}

async function run() {
  const memory =
    await MongoMemoryReplSet
      .create({
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
          "arena-revenge-right-test",
      }
    );
    await syncIndexes();

    await clearData();
    await check(
      "좌석을 잃은 방어자에게만 24시간 권리를 source match 기준으로 멱등 발급",
      async () => {
        const fixture =
          await createFixture();
        const [
          first,
          concurrent,
        ] = await Promise.all([
          fixture.service
            .issueFromSettledMatch({
              sourceMatchId:
                fixture
                  .sourceMatch
                  .matchId,
            }),
          fixture.service
            .issueFromSettledMatch({
              sourceMatchId:
                fixture
                  .sourceMatch
                  .matchId,
            }),
        ]);
        assert.equal(
          first.rightId,
          concurrent.rightId
        );
        assert.equal(
          String(
            first
              .entitledUserId
          ),
          String(
            fixture.entitled
              .user._id
          )
        );
        assert.equal(
          String(
            first.targetUserId
          ),
          String(
            fixture.target
              .user._id
          )
        );
        assert.equal(
          first.status,
          "AVAILABLE"
        );
        assert.equal(
          first
            .sourceNormalStakeDays,
          1
        );
        assert.equal(
          first
            .revengeStakeDays,
          2
        );
        assert.equal(
          first.expiresAt.getTime(),
          fixture
            .sourceMatch
            .settledAt
            .getTime() +
            24 * HOUR_MS
        );
        assert.equal(
          first
            .stateHistory
            .length,
          1
        );
        assert.equal(
          await ArenaRevengeRight
            .countDocuments(),
          1
        );

        const replay =
          await fixture.service
            .handleTakeoverSettledOutboxEvent({
              event: {
                eventType:
                  "TAKEOVER_SETTLED",
                aggregateType:
                  "RankTakeoverMatch",
                aggregateId:
                  fixture
                    .sourceMatch
                    .matchId,
                payload: {
                  matchId:
                    fixture
                      .sourceMatch
                      .matchId,
                },
              },
            });
        assert.equal(
          replay.rightId,
          first.rightId
        );
        assert.equal(
          await ArenaRevengeRight
            .countDocuments(),
          1
        );
      }
    );

    await clearData();
    await check(
      "Main 2-Step 좌석 패배 권리는 일반 4일·Revenge 5일 snapshot을 보존",
      async () => {
        const fixture =
          await createFixture({
            ranking: "MAIN",
          });
        const right =
          await fixture.service
            .issueFromSettledMatch({
              sourceMatchId:
                fixture
                  .sourceMatch
                  .matchId,
            });
        assert.equal(
          right.rankingType,
          "MAIN"
        );
        assert.equal(
          right
            .sourceNormalStakeDays,
          4
        );
        assert.equal(
          right
            .revengeStakeDays,
          5
        );
        const resolved =
          await fixture.service
            .resolveRevengeRight(
              resolveInput(
                fixture
              )
            );
        assert.equal(
          resolved.rightId,
          right.rightId
        );
      }
    );

    await clearData();
    await check(
      "다른 사용자의 권리 도용과 클라이언트 임의 target 입력을 모두 거절",
      async () => {
        const fixture =
          await createFixture();
        await fixture.service
          .issueFromSettledMatch({
            sourceMatchId:
              fixture
                .sourceMatch
                .matchId,
          });
        const thief =
          await createUser(
            `thief-${sequence}`,
            1400
          );
        const theftError =
          await captureError(
            () =>
              fixture.service
                .resolveRevengeRight(
                  resolveInput(
                    fixture,
                    {
                      entitledUserId:
                        thief
                          .user._id,
                    }
                  )
                )
          );
        assert.ok(
          theftError instanceof
            ArenaRevengeRightError
        );
        assert.equal(
          theftError.code,
          "REVENGE_RIGHT_NOT_ENTITLED"
        );

        const targetError =
          await captureError(
            () =>
              fixture.service
                .resolveRevengeRight(
                  resolveInput(
                    fixture,
                    {
                      targetUserId:
                        thief
                          .user._id,
                    }
                  )
                )
          );
        assert.equal(
          targetError.code,
          "REVENGE_TARGET_INPUT_FORBIDDEN"
        );
        assert.equal(
          targetError
            .details.field,
          "targetUserId"
        );
      }
    );

    await clearData();
    await check(
      "24시간 경계가 지나면 resolve를 막고 EXPIRED 이력을 한 번만 append",
      async () => {
        const fixture =
          await createFixture();
        const right =
          await fixture.service
            .issueFromSettledMatch({
              sourceMatchId:
                fixture
                  .sourceMatch
                  .matchId,
            });
        fixture.clock.value =
          new Date(
            right.expiresAt
              .getTime()
          );
        const firstError =
          await captureError(
            () =>
              fixture.service
                .resolveRevengeRight(
                  resolveInput(
                    fixture
                  )
                )
          );
        assert.equal(
          firstError.code,
          "REVENGE_RIGHT_EXPIRED"
        );
        const secondError =
          await captureError(
            () =>
              fixture.service
                .resolveRevengeRight(
                  resolveInput(
                    fixture
                  )
                )
          );
        assert.equal(
          secondError.code,
          "REVENGE_RIGHT_EXPIRED"
        );
        const expired =
          await ArenaRevengeRight
            .findById(
              right._id
            );
        assert.equal(
          expired.status,
          "EXPIRED"
        );
        assert.equal(
          expired
            .stateHistory
            .filter(
              (entry) =>
                entry.status ===
                "EXPIRED"
            ).length,
          1
        );
      }
    );

    await clearData();
    await check(
      "resolve와 challenge 생성이 공유한 transaction에서 권리를 1회 CAS 소비하고 재전송은 수렴",
      async () => {
        const fixture =
          await createFixture();
        await fixture.service
          .issueFromSettledMatch({
            sourceMatchId:
              fixture
                .sourceMatch
                .matchId,
          });
        const session =
          await mongoose
            .startSession();
        let consumed;
        let match;
        try {
          await session.withTransaction(
            async () => {
              const right =
                await fixture
                  .service
                  .resolveRevengeRight({
                    ...resolveInput(
                      fixture
                    ),
                    session,
                  });
              match =
                consumingMatch(
                  fixture,
                  right,
                  "same-tx"
                );
              consumed =
                await fixture
                  .service
                  .consumeRevengeRight({
                    right,
                    consumedByMatch:
                      match,
                    now:
                      fixture.clock
                        .value,
                    session,
                  });
            }
          );
        } finally {
          await session.endSession();
        }
        assert.equal(
          consumed.status,
          "CONSUMED"
        );
        assert.equal(
          consumed
            .consumedByMatchId,
          match.matchId
        );
        const replay =
          await consumeInTransaction({
            service:
              fixture.service,
            right: consumed,
            match,
          });
        assert.equal(
          replay
            .consumedByMatchId,
          match.matchId
        );
        assert.equal(
          replay
            .stateHistory
            .filter(
              (entry) =>
                entry.status ===
                "CONSUMED"
            ).length,
          1
        );
      }
    );

    await clearData();
    await check(
      "서로 다른 두 매치의 동시 소비는 정확히 하나만 성공",
      async () => {
        const fixture =
          await createFixture();
        const right =
          await fixture.service
            .issueFromSettledMatch({
              sourceMatchId:
                fixture
                  .sourceMatch
                  .matchId,
            });
        const firstMatch =
          consumingMatch(
            fixture,
            right,
            "race-a"
          );
        const secondMatch =
          consumingMatch(
            fixture,
            right,
            "race-b"
          );
        const results =
          await Promise.allSettled([
            consumeInTransaction({
              service:
                fixture.service,
              right,
              match:
                firstMatch,
            }),
            consumeInTransaction({
              service:
                fixture.service,
              right,
              match:
                secondMatch,
            }),
          ]);
        assert.equal(
          results.filter(
            (result) =>
              result.status ===
              "fulfilled"
          ).length,
          1
        );
        assert.equal(
          results.filter(
            (result) =>
              result.status ===
              "rejected"
          ).length,
          1
        );
        const rejected =
          results.find(
            (result) =>
              result.status ===
              "rejected"
          );
        assert.equal(
          rejected.reason.code,
          "REVENGE_RIGHT_ALREADY_CONSUMED"
        );
        const persisted =
          await ArenaRevengeRight
            .findById(
              right._id
            );
        assert.equal(
          persisted.status,
          "CONSUMED"
        );
        assert.ok(
          [
            firstMatch.matchId,
            secondMatch.matchId,
          ].includes(
            persisted
              .consumedByMatchId
          )
        );
        assert.equal(
          persisted
            .stateHistory
            .filter(
              (entry) =>
                entry.status ===
                "CONSUMED"
            ).length,
          1
        );
      }
    );

    await clearData();
    await check(
      "HELD·INVALID source match에서는 권리를 발급하지 않음",
      async () => {
        const fixture =
          await createFixture();
        await RankTakeoverMatch
          .collection
          .updateOne(
            {
              _id:
                fixture
                  .sourceMatch
                  ._id,
            },
            {
              $set: {
                status: "HELD",
                integrityState:
                  "HELD",
                holdReason:
                  "integrity review",
              },
            }
          );
        const heldError =
          await captureError(
            () =>
              fixture.service
                .issueFromSettledMatch({
                  sourceMatchId:
                    fixture
                      .sourceMatch
                      .matchId,
                })
          );
        assert.equal(
          heldError.code,
          "REVENGE_SOURCE_HELD"
        );
        assert.equal(
          await ArenaRevengeRight
            .countDocuments(),
          0
        );

        await RankTakeoverMatch
          .collection
          .updateOne(
            {
              _id:
                fixture
                  .sourceMatch
                  ._id,
            },
            {
              $set: {
                status:
                  "INVALID",
                integrityState:
                  "INVALID",
              },
            }
          );
        const invalidError =
          await captureError(
            () =>
              fixture.service
                .issueFromSettledMatch({
                  sourceMatchId:
                    fixture
                      .sourceMatch
                      .matchId,
                })
          );
        assert.equal(
          invalidError.code,
          "REVENGE_SOURCE_INVALID"
        );
        assert.equal(
          await ArenaRevengeRight
            .countDocuments(),
          0
        );
      }
    );

    await clearData();
    await check(
      "발급 후 source가 HELD로 정정되면 resolve를 막고 INVALID revoke audit을 남김",
      async () => {
        const fixture =
          await createFixture();
        const right =
          await fixture.service
            .issueFromSettledMatch({
              sourceMatchId:
                fixture
                  .sourceMatch
                  .matchId,
            });
        await RankTakeoverMatch
          .collection
          .updateOne(
            {
              _id:
                fixture
                  .sourceMatch
                  ._id,
            },
            {
              $set: {
                status: "HELD",
                integrityState:
                  "HELD",
                holdReason:
                  "late integrity hold",
              },
            }
          );
        const error =
          await captureError(
            () =>
              fixture.service
                .resolveRevengeRight(
                  resolveInput(
                    fixture
                  )
                )
          );
        assert.equal(
          error.code,
          "REVENGE_SOURCE_HELD"
        );
        const invalid =
          await ArenaRevengeRight
            .findById(
              right._id
            );
        assert.equal(
          invalid.status,
          "INVALID"
        );
        assert.equal(
          invalid
            .invalidationReasonCode,
          "SOURCE_MATCH_HELD"
        );
        assert.equal(
          invalid
            .stateHistory[
              invalid
                .stateHistory
                .length - 1
            ].reasonCode,
          "SOURCE_MATCH_HELD"
        );
      }
    );

    await clearData();
    await check(
      "계정·cycle 무결성 제한을 RevengeRight가 우회하지 않음",
      async () => {
        const fixture =
          await createFixture();
        await fixture.service
          .issueFromSettledMatch({
            sourceMatchId:
              fixture
                .sourceMatch
                .matchId,
          });
        fixture.target
          .user.accountStatus =
          "suspended";
        await fixture.target
          .user.save();
        const accountError =
          await captureError(
            () =>
              fixture.service
                .resolveRevengeRight(
                  resolveInput(
                    fixture
                  )
                )
          );
        assert.equal(
          accountError.code,
          "ACCOUNT_NOT_ACTIVE"
        );

        fixture.target
          .user.accountStatus =
          "active";
        await fixture.target
          .user.save();
        fixture.entitled
          .cycle.integrityState =
          "HELD";
        await fixture.entitled
          .cycle.save();
        const integrityError =
          await captureError(
            () =>
              fixture.service
                .resolveRevengeRight(
                  resolveInput(
                    fixture
                  )
                )
          );
        assert.equal(
          integrityError.code,
          "CYCLE_INTEGRITY_HELD"
        );
      }
    );

    await clearData();
    await check(
      "Revenge 유효기간 정책이 없으면 추정하지 않고 POLICY_PENDING",
      async () => {
        const fixture =
          await createFixture();
        await PolicyVersion
          .collection
          .updateOne(
            {
              _id:
                fixture
                  .policy._id,
            },
            {
              $set: {
                revengeRightHours:
                  null,
              },
            }
          );
        const error =
          await captureError(
            () =>
              fixture.service
                .issueFromSettledMatch({
                  sourceMatchId:
                    fixture
                      .sourceMatch
                      .matchId,
                })
          );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
        assert.equal(
          error
            .details.blocker,
          "REVENGE_RIGHT_WINDOW_UNSET"
        );
        assert.equal(
          await ArenaRevengeRight
            .countDocuments(),
          0
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
    `\n${checks.length - failed.length}/${checks.length} Arena RevengeRight checks passed.`
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

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
