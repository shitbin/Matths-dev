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
  handleTakeoverSettledOutboxEvent,
} = require(
  "../services/arenaRevengeRightService"
);
const {
  createArenaTakeoverOutboxService,
} = require(
  "../services/arenaTakeoverOutboxService"
);

const TEST_NOW =
  new Date(
    "2026-07-10T12:00:00.000Z"
  );
const SECOND_MS =
  1000;
const HOUR_MS =
  60 * 60 * 1000;
let sequence = 1;
const checks = [];

function objectId() {
  return new mongoose
    .Types.ObjectId();
}

function later(
  date,
  milliseconds
) {
  return new Date(
    date.getTime() +
      milliseconds
  );
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

const models = [
  ArenaRevengeRight,
  RankTakeoverMatch,
  ArenaSeason,
  PolicyVersion,
  OutboxEvent,
];

async function clearData() {
  for (const model of models) {
    await model.deleteMany(
      {}
    );
  }
}

async function syncIndexes() {
  for (const model of models) {
    await model.syncIndexes();
  }
}

async function createPolicyAndSeason() {
  const policy =
    await PolicyVersion.create({
      version:
        `takeover-outbox-policy-${sequence++}`,
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
      },
    });
  const season =
    await ArenaSeason.create({
      seasonId:
        `takeover-outbox-season-${sequence++}`,
      title:
        "Takeover Outbox Test",
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
  return {
    policy,
    season,
  };
}

async function createSettledMatch({
  winner =
    "CHALLENGER",
} = {}) {
  const {
    policy,
    season,
  } =
    await createPolicyAndSeason();
  const matchId =
    `takeover-outbox-match-${sequence++}`;
  const matchedAt =
    later(
      TEST_NOW,
      -4 * HOUR_MS
    );
  const challengerUserId =
    objectId();
  const defenderUserId =
    objectId();
  const challengerWon =
    winner ===
    "CHALLENGER";
  const match =
    await RankTakeoverMatch.create({
      matchId,
      seasonId:
        season._id,
      policyVersionId:
        policy._id,
      activeRanking:
        "SUB",
      challengerUserId,
      challengerCycleId:
        objectId(),
      defenderUserId,
      defenderCycleId:
        objectId(),
      challengerPositionBefore:
        20,
      defenderPositionBefore:
        10,
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
      deadlinePolicySnapshot: {
        startDeadlineMinutes:
          60,
        submissionDeadlineMinutes:
          180,
      },
      challengeLockTransactionId:
        objectId(),
      challengeLockIdempotencyKey:
        `takeover-outbox-lock-${sequence++}`,
      status: "SETTLED",
      matchedAt,
      startsBy:
        later(
          matchedAt,
          HOUR_MS
        ),
      startedAt:
        later(
          matchedAt,
          30 * 60 * 1000
        ),
      submitsBy:
        later(
          matchedAt,
          3 * HOUR_MS
        ),
      resolvedAt:
        later(
          TEST_NOW,
          -HOUR_MS
        ),
      settledAt:
        later(
          TEST_NOW,
          -HOUR_MS
        ),
      winner,
      tieBreakStage:
        "CALIBRATED_SCORE",
      settlementVersion: 1,
      settlementReason:
        "SCORED_RESULT",
      settlementResult:
        challengerWon
          ? {
              toDefenderAvailableDays:
                0,
              toSystemBurnDays:
                1,
              toChallengerAvailableDays:
                0,
            }
          : {
              toDefenderAvailableDays:
                1,
              toSystemBurnDays:
                0,
              toChallengerAvailableDays:
                0,
            },
      settlementTransactionIds:
        [objectId()],
      arenaPositionSettlement:
        challengerWon
          ? {
              outcome:
                "SWAPPED",
              referenceKey:
                `takeover-swap-${sequence++}`,
              challengerPositionAfter:
                10,
              defenderPositionAfter:
                20,
            }
          : {
              outcome:
                "UNCHANGED",
              referenceKey:
                `takeover-unchanged-${sequence++}`,
              challengerPositionAfter:
                20,
              defenderPositionAfter:
                10,
            },
      // 하드닝 스키마의 필수 필드를 채운 유효 감사 —
      // 자리표시자({source})는 StrictModeError 로 거부된다.
      assignmentAudit: {
        requestFingerprint:
          "ef".repeat(32),
        requestId:
          `outbox-test-${String(challengerUserId)}`,
        assignmentType:
          "WEIGHTED_SERVER_ASSIGNMENT",
        skillMmrSnapshots: {
          challenger: 1200,
          defender: 1180,
        },
        assignedAt:
          new Date(),
      },
      integrityState:
        "CLEAR",
    });
  return {
    challengerUserId,
    defenderUserId,
    match,
    policy,
    season,
  };
}

async function createEvent(
  match,
  {
    eventType =
      "TAKEOVER_SETTLED",
    payload = null,
    status = "PENDING",
    nextAttemptAt =
      TEST_NOW,
  } = {}
) {
  return OutboxEvent.create({
    eventId:
      `takeover-outbox-event-${sequence++}`,
    idempotencyKey:
      `takeover-outbox-idempotency-${sequence++}`,
    aggregateType:
      "RankTakeoverMatch",
    aggregateId:
      match.matchId,
    eventType,
    payload:
      payload || {
        matchId:
          match.matchId,
      },
    status,
    nextAttemptAt,
  });
}

function defaultHandlers(
  additional = []
) {
  return [
    {
      name:
        "REVENGE_RIGHT",
      required: true,
      handle:
        handleTakeoverSettledOutboxEvent,
    },
    ...additional,
  ];
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
          "arena-takeover-outbox-test",
      }
    );
    await syncIndexes();

    await clearData();
    await check(
      "TAKEOVER_SETTLED 성공 시 authoritative match 기준으로 권리를 발급하고 PUBLISHED",
      async () => {
        const fixture =
          await createSettledMatch();
        const forgedUserId =
          objectId();
        const event =
          await createEvent(
            fixture.match,
            {
              payload: {
                matchId:
                  fixture
                    .match
                    .matchId,
                entitledUserId:
                  forgedUserId,
                email:
                  "payload-must-not-be-trusted@example.com",
              },
            }
          );
        const service =
          createArenaTakeoverOutboxService();
        const result =
          await service
            .processNextTakeoverSettledEvent({
              workerId:
                "success-worker",
              now:
                TEST_NOW,
            });
        assert.equal(
          result.status,
          "PUBLISHED"
        );
        assert.deepEqual(
          result
            .handlerOutcomes,
          [
            {
              name:
                "REVENGE_RIGHT",
              status:
                "SUCCEEDED",
            },
          ]
        );
        const right =
          await ArenaRevengeRight
            .findOne({
              sourceMatchId:
                fixture
                  .match
                  .matchId,
            });
        assert.ok(right);
        assert.equal(
          String(
            right
              .entitledUserId
          ),
          String(
            fixture
              .defenderUserId
          )
        );
        assert.notEqual(
          String(
            right
              .entitledUserId
          ),
          String(
            forgedUserId
          )
        );
        const stored =
          await OutboxEvent
            .findById(
              event._id
            );
        assert.equal(
          stored.status,
          "PUBLISHED"
        );
        assert.equal(
          stored.attemptCount,
          1
        );
        assert.equal(
          stored.lockedBy,
          null
        );
      }
    );

    await clearData();
    await check(
      "방어자 승리 정산은 권리 없는 정상 no-op으로 PUBLISHED",
      async () => {
        const fixture =
          await createSettledMatch({
            winner:
              "DEFENDER",
          });
        const event =
          await createEvent(
            fixture.match
          );
        const service =
          createArenaTakeoverOutboxService();
        const result =
          await service
            .processNextTakeoverSettledEvent({
              workerId:
                "no-op-worker",
              now:
                TEST_NOW,
            });
        assert.equal(
          result.status,
          "PUBLISHED"
        );
        assert.equal(
          await ArenaRevengeRight
            .countDocuments(
              {}
            ),
          0
        );
        assert.equal(
          (
            await OutboxEvent
              .findById(
                event._id
              )
          ).status,
          "PUBLISHED"
        );
      }
    );

    await clearData();
    await check(
      "핸들러 성공 후 crash 재처리는 결과를 중복 생성하지 않고 최종 PUBLISHED",
      async () => {
        const fixture =
          await createSettledMatch();
        const event =
          await createEvent(
            fixture.match
          );
        const service =
          createArenaTakeoverOutboxService();
        const claimed =
          await service
            .claimNextTakeoverSettledEvent({
              workerId:
                "crashed-worker",
              now:
                TEST_NOW,
              leaseMs:
                SECOND_MS,
            });
        await handleTakeoverSettledOutboxEvent({
          event: claimed,
          now:
            TEST_NOW,
        });
        assert.equal(
          await ArenaRevengeRight
            .countDocuments(
              {}
            ),
          1
        );
        assert.equal(
          (
            await OutboxEvent
              .findById(
                event._id
              )
          ).status,
          "PROCESSING"
        );

        const replay =
          await service
            .processNextTakeoverSettledEvent({
              workerId:
                "recovery-worker",
              now:
                later(
                  TEST_NOW,
                  SECOND_MS
                ),
              leaseMs:
                SECOND_MS,
            });
        assert.equal(
          replay.status,
          "PUBLISHED"
        );
        assert.equal(
          await ArenaRevengeRight
            .countDocuments(
              {}
            ),
          1
        );
        const stored =
          await OutboxEvent
            .findById(
              event._id
            );
        assert.equal(
          stored.attemptCount,
          2
        );
        assert.equal(
          stored.status,
          "PUBLISHED"
        );
      }
    );

    await clearData();
    await check(
      "일시적 required handler 실패는 지수 backoff 후 재시도하며 선행 결과는 멱등",
      async () => {
        const fixture =
          await createSettledMatch();
        const event =
          await createEvent(
            fixture.match
          );
        let calls = 0;
        const service =
          createArenaTakeoverOutboxService({
            handlers:
              defaultHandlers([
                {
                  name:
                    "TRANSIENT_FEED",
                  required: true,
                  async handle() {
                    calls += 1;
                    if (
                      calls === 1
                    ) {
                      const error =
                        new Error(
                          "temporary database outage"
                        );
                      error.code =
                        "TRANSIENT_STORAGE";
                      error.retryable =
                        true;
                      throw error;
                    }
                  },
                },
              ]),
          });
        const first =
          await service
            .processNextTakeoverSettledEvent({
              workerId:
                "retry-worker",
              now:
                TEST_NOW,
              baseRetryMs:
                2000,
              maxRetryMs:
                10000,
            });
        assert.equal(
          first.status,
          "FAILED"
        );
        assert.equal(
          first.errorCode,
          "TRANSIENT_STORAGE"
        );
        assert.equal(
          Object.prototype
            .hasOwnProperty.call(
              first,
              "error"
            ),
          false
        );
        const failed =
          await OutboxEvent
            .findById(
              event._id
            );
        assert.equal(
          failed
            .nextAttemptAt
            .getTime(),
          TEST_NOW.getTime() +
            2000
        );
        assert.equal(
          await ArenaRevengeRight
            .countDocuments(
              {}
            ),
          1
        );

        assert.equal(
          await service
            .processNextTakeoverSettledEvent({
              workerId:
                "retry-worker",
              now:
                later(
                  TEST_NOW,
                  1999
                ),
              baseRetryMs:
                2000,
              maxRetryMs:
                10000,
            }),
          null
        );
        const second =
          await service
            .processNextTakeoverSettledEvent({
              workerId:
                "retry-worker",
              now:
                later(
                  TEST_NOW,
                  2000
                ),
              baseRetryMs:
                2000,
              maxRetryMs:
                10000,
            });
        assert.equal(
          second.status,
          "PUBLISHED"
        );
        assert.equal(
          calls,
          2
        );
        assert.equal(
          await ArenaRevengeRight
            .countDocuments(
              {}
            ),
          1
        );
      }
    );

    await clearData();
    await check(
      "동시 worker 중 하나만 같은 event를 atomic claim",
      async () => {
        const fixture =
          await createSettledMatch();
        const event =
          await createEvent(
            fixture.match
          );
        const service =
          createArenaTakeoverOutboxService();
        const claims =
          await Promise.all([
            service
              .claimNextTakeoverSettledEvent({
                workerId:
                  "atomic-worker-a",
                now:
                  TEST_NOW,
              }),
            service
              .claimNextTakeoverSettledEvent({
                workerId:
                  "atomic-worker-b",
                now:
                  TEST_NOW,
              }),
          ]);
        assert.equal(
          claims.filter(
            Boolean
          ).length,
          1
        );
        const stored =
          await OutboxEvent
            .findById(
              event._id
            );
        assert.equal(
          stored.status,
          "PROCESSING"
        );
        assert.equal(
          stored.attemptCount,
          1
        );
        assert.ok(
          [
            "atomic-worker-a",
            "atomic-worker-b",
          ].includes(
            stored.lockedBy
          )
        );
      }
    );

    await clearData();
    await check(
      "stale PROCESSING lease만 다른 worker가 회수하고 활성 lease는 건드리지 않음",
      async () => {
        const fixture =
          await createSettledMatch({
            winner:
              "DEFENDER",
          });
        const event =
          await createEvent(
            fixture.match
          );
        const service =
          createArenaTakeoverOutboxService();
        await service
          .claimNextTakeoverSettledEvent({
            workerId:
              "lease-owner",
            now:
              TEST_NOW,
            leaseMs:
              SECOND_MS,
          });
        const early =
          await service
            .processNextTakeoverSettledEvent({
              workerId:
                "lease-recovery",
              now:
                later(
                  TEST_NOW,
                  SECOND_MS -
                    1
                ),
              leaseMs:
                SECOND_MS,
            });
        assert.equal(
          early,
          null
        );
        assert.equal(
          (
            await OutboxEvent
              .findById(
                event._id
              )
          ).lockedBy,
          "lease-owner"
        );

        const recovered =
          await service
            .processNextTakeoverSettledEvent({
              workerId:
                "lease-recovery",
              now:
                later(
                  TEST_NOW,
                  SECOND_MS
                ),
              leaseMs:
                SECOND_MS,
            });
        assert.equal(
          recovered.status,
          "PUBLISHED"
        );
        assert.equal(
          (
            await OutboxEvent
              .findById(
                event._id
              )
          ).attemptCount,
          2
        );
      }
    );

    await clearData();
    await check(
      "다른 eventType은 claim하거나 변경하지 않음",
      async () => {
        const fixture =
          await createSettledMatch();
        const event =
          await createEvent(
            fixture.match,
            {
              eventType:
                "TAKEOVER_MATCHED",
            }
          );
        const service =
          createArenaTakeoverOutboxService();
        const result =
          await service
            .processNextTakeoverSettledEvent({
              workerId:
                "wrong-event-worker",
              now:
                TEST_NOW,
            });
        assert.equal(
          result,
          null
        );
        const stored =
          await OutboxEvent
            .findById(
              event._id
            );
        assert.equal(
          stored.status,
          "PENDING"
        );
        assert.equal(
          stored.attemptCount,
          0
        );
      }
    );

    await clearData();
    await check(
      "required handler 실패는 publish를 막고 raw error를 노출하지 않음",
      async () => {
        const fixture =
          await createSettledMatch();
        const event =
          await createEvent(
            fixture.match
          );
        const secret =
          "mongodb://admin:top-secret@private-host";
        const service =
          createArenaTakeoverOutboxService({
            handlers:
              defaultHandlers([
                {
                  name:
                    "REQUIRED_NOTIFICATION",
                  required: true,
                  async handle() {
                    const error =
                      new Error(
                        `${secret} ${"x".repeat(2000)}`
                      );
                    error.code =
                      "NOTIFICATION_REJECTED";
                    error.retryable =
                      false;
                    throw error;
                  },
                },
              ]),
          });
        const result =
          await service
            .processNextTakeoverSettledEvent({
              workerId:
                "failed-handler-worker",
              now:
                TEST_NOW,
            });
        assert.equal(
          result.status,
          "DEAD"
        );
        assert.equal(
          result.errorCode,
          "NOTIFICATION_REJECTED"
        );
        assert.equal(
          JSON.stringify(
            result
          ).includes(
            secret
          ),
          false
        );
        const stored =
          await OutboxEvent
            .findById(
              event._id
            );
        assert.equal(
          stored.status,
          "DEAD"
        );
        assert.equal(
          stored.publishedAt,
          null
        );
        assert.equal(
          stored
            .lastError
            .includes(
              secret
            ),
          false
        );
        assert.ok(
          stored
            .lastError
            .length <= 1000
        );
        assert.equal(
          await ArenaRevengeRight
            .countDocuments(
              {}
            ),
          1
        );
      }
    );

    await clearData();
    await check(
      "bounded attempts를 넘겨 required handler를 추가 호출하지 않고 DEAD",
      async () => {
        const fixture =
          await createSettledMatch();
        const event =
          await createEvent(
            fixture.match
          );
        let calls = 0;
        const service =
          createArenaTakeoverOutboxService({
            handlers: [
              {
                name:
                  "ALWAYS_TRANSIENT",
                required: true,
                async handle() {
                  calls += 1;
                  const error =
                    new Error(
                      "retry later"
                    );
                  error.code =
                    "TEMPORARY_FAILURE";
                  error.retryable =
                    true;
                  throw error;
                },
              },
            ],
          });
        const first =
          await service
            .processNextTakeoverSettledEvent({
              workerId:
                "bounded-worker",
              now:
                TEST_NOW,
              maxAttempts: 2,
              baseRetryMs:
                SECOND_MS,
              maxRetryMs:
                SECOND_MS,
            });
        assert.equal(
          first.status,
          "FAILED"
        );
        const second =
          await service
            .processNextTakeoverSettledEvent({
              workerId:
                "bounded-worker",
              now:
                later(
                  TEST_NOW,
                  SECOND_MS
                ),
              maxAttempts: 2,
              baseRetryMs:
                SECOND_MS,
              maxRetryMs:
                SECOND_MS,
            });
        assert.equal(
          second.status,
          "DEAD"
        );
        assert.equal(
          calls,
          2
        );
        assert.equal(
          await service
            .processNextTakeoverSettledEvent({
              workerId:
                "bounded-worker",
              now:
                later(
                  TEST_NOW,
                  2 * SECOND_MS
                ),
              maxAttempts: 2,
              baseRetryMs:
                SECOND_MS,
              maxRetryMs:
                SECOND_MS,
            }),
          null
        );
        const stored =
          await OutboxEvent
            .findById(
              event._id
            );
        assert.equal(
          stored.attemptCount,
          2
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
    `\n${checks.length - failed.length}/${checks.length} Arena takeover outbox checks passed.`
  );
  if (failed.length) {
    for (
      const entry of failed
    ) {
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

run().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  }
);
