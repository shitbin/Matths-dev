const assert = require(
  "node:assert/strict"
);
const mongoose = require(
  "mongoose"
);
const {
  MongoMemoryServer,
} = require(
  "mongodb-memory-server"
);

const {
  AccessCycle,
} = require(
  "../models/accessCycleModel"
);
const {
  CycleAttendanceDay,
} = require(
  "../models/cycleAttendanceDayModel"
);
const {
  OutboxEvent,
  OUTBOX_EVENT_TYPES,
} = require(
  "../models/outboxEventModel"
);
const {
  PolicyVersion,
} = require(
  "../models/policyVersionModel"
);
const {
  QuickPracticeAttempt,
  User,
} = require(
  "../models/matthsModel"
);
const {
  addKstCalendarDays,
  kstDateKey,
} = require(
  "../services/accessCycleService"
);
const {
  ATTENDANCE_OUTBOX_EVENT_TYPE,
  ATTENDANCE_SOURCE_MODELS,
  claimNextAttendanceIntent,
  deliverClaimedAttendanceIntent,
  deriveAttendanceEventFromSource,
  drainCycleAttendanceOutbox,
  enqueueCycleAttendanceIntent,
  persistLearningSourceWithAttendance,
  processNextAttendanceIntent,
} = require(
  "../services/cycleAttendanceOutboxService"
);
const {
  submitQuickPracticeAttempt,
} = require(
  "../services/quickPracticeService"
);

const checks = [];
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

async function resetDatabase() {
  await Promise.all([
    AccessCycle.deleteMany({}),
    CycleAttendanceDay
      .deleteMany({}),
    OutboxEvent.deleteMany({}),
    PolicyVersion.deleteMany({}),
    QuickPracticeAttempt
      .deleteMany({}),
    User.deleteMany({}),
  ]);
}

async function createContext({
  cycleStatus =
    "SUB_ACTIVE",
  policyReady = false,
  now = new Date(),
  userId:
    providedUserId = null,
} = {}) {
  const userId =
    providedUserId ||
    objectId();
  const dateKey =
    kstDateKey(now);
  const policyInput = {
    version:
      `attendance-outbox-${sequence}`,
    effectiveFrom:
      new Date(
        now.getTime() -
          60_000
      ),
  };
  sequence += 1;
  if (policyReady) {
    policyInput
      .minRecognizedProblemsPerDay =
      1;
    policyInput
      .minValidStudySecondsPerDay =
      1;
  }
  const policy =
    await PolicyVersion.create(
      policyInput
    );
  const cycle =
    await AccessCycle.create({
      userId,
      paymentOrderId:
        objectId(),
      policyVersionId:
        policy._id,
      status:
        cycleStatus,
      refundStatus:
        "PENDING",
      activeRanking:
        cycleStatus ===
        "MAIN_ACTIVE"
          ? "MAIN"
          : "SUB",
      startedAt:
        new Date(
          now.getTime() -
            60_000
        ),
      paidAccessStartsOn:
        dateKey,
      paidAccessEndsOn:
        addKstCalendarDays(
          dateKey,
          28
        ),
      day30ReviewOn:
        addKstCalendarDays(
          dateKey,
          29
        ),
      paidAccessDaysGranted:
        29,
      refundChallengeDays:
        29,
    });
  return {
    cycle,
    policy,
    userId,
  };
}

function quickAttemptDocument({
  userId,
  now,
  status = "correct",
  instanceId =
    `quick-${sequence}`,
  sourceDocumentId = null,
} = {}) {
  sequence += 1;
  return new QuickPracticeAttempt({
    ...(sourceDocumentId
      ? {
          _id:
            sourceDocumentId,
        }
      : {}),
    userId,
    instanceId,
    pointValue: 2,
    topicKey:
      "quadratic-roots",
    topicLabel:
      "이차방정식",
    prompt:
      "민감한 문제 본문",
    answer:
      "민감한 정답",
    solution:
      "민감한 풀이",
    status,
    startedAt:
      new Date(
        now.getTime() -
          12_000
      ),
    deadlineAt:
      new Date(
        now.getTime() +
          30_000
      ),
    submittedAnswer:
      status === "expired"
        ? null
        : "학생 답안",
    responseTimeMs:
      status === "expired"
        ? 40_000
        : 12_000,
    submittedAt:
      status === "active"
        ? null
        : now,
  });
}

async function persistQuickWithIntent({
  userId,
  now,
  status = "correct",
} = {}) {
  const source =
    quickAttemptDocument({
      userId,
      now,
      status,
    });
  const result =
    await persistLearningSourceWithAttendance({
      userId,
      sourceModel:
        ATTENDANCE_SOURCE_MODELS
          .QUICK_PRACTICE_ATTEMPT,
      sourceDocumentId:
        source._id,
      occurredAt: now,
      persistSource: () =>
        source.save(),
    });
  return {
    result,
    source,
  };
}

async function run() {
  const memory =
    await MongoMemoryServer.create();

  try {
    await mongoose.connect(
      memory.getUri(),
      {
        dbName:
          "cycle-attendance-outbox-test",
      }
    );
    await Promise.all([
      AccessCycle.syncIndexes(),
      CycleAttendanceDay
        .syncIndexes(),
      OutboxEvent.syncIndexes(),
      PolicyVersion.syncIndexes(),
      QuickPracticeAttempt
        .syncIndexes(),
    ]);

    await check(
      "Outbox 계약에 출석 원천 이벤트가 명시됨",
      () => {
        assert.ok(
          OUTBOX_EVENT_TYPES
            .includes(
              ATTENDANCE_OUTBOX_EVENT_TYPE
            )
        );
      }
    );

    await check(
      "Outbox 저장 실패 시 학습 원천 저장을 시작하지 않음",
      async () => {
        await resetDatabase();
        const now =
          new Date();
        const {
          userId,
        } =
          await createContext({
            now,
          });
        let persisted = false;
        const expected =
          new Error(
            "outbox unavailable"
          );
        await assert.rejects(
          persistLearningSourceWithAttendance(
            {
              userId,
              sourceModel:
                ATTENDANCE_SOURCE_MODELS
                  .PROBLEM_ATTEMPT,
              sourceDocumentId:
                objectId(),
              occurredAt:
                now,
              persistSource:
                async () => {
                  persisted =
                    true;
                },
            },
            {
              OutboxModel: {
                async create() {
                  throw expected;
                },
              },
            }
          ),
          (error) =>
            error ===
            expected
        );
        assert.equal(
          persisted,
          false
        );
      }
    );

    await check(
      "학습 원천 저장 성공 시 동일 키 Outbox가 이미 존재함",
      async () => {
        await resetDatabase();
        const now =
          new Date();
        const {
          userId,
        } =
          await createContext({
            now,
          });
        const {
          source,
        } =
          await persistQuickWithIntent({
            userId,
            now,
          });
        const [
          persistedSource,
          events,
        ] =
          await Promise.all([
            QuickPracticeAttempt
              .findById(
                source._id
              )
              .lean(),
            OutboxEvent.find({})
              .lean(),
          ]);
        assert.ok(
          persistedSource
        );
        assert.equal(
          events.length,
          1
        );
        assert.equal(
          events[0]
            .aggregateId,
          String(
            source._id
          )
        );
        assert.equal(
          events[0].status,
          "PENDING"
        );
      }
    );

    await check(
      "실제 Quick Practice 제출 경로가 원천 저장 전에 Outbox를 보장함",
      async () => {
        await resetDatabase();
        const now =
          new Date();
        const user =
          await User.create({
            name:
              "출석테스트",
            email:
              `attendance-${sequence}@example.com`,
            passwordHash:
              "not-a-real-password-hash",
            school: {
              region: "서울",
              code:
                "attendance-test",
              name:
                "테스트고",
            },
          });
        sequence += 1;
        const {
          cycle,
        } =
          await createContext({
            now,
            userId:
              user._id,
          });
        const instanceId =
          `actual-quick-${sequence}`;
        sequence += 1;
        await QuickPracticeAttempt
          .create({
            userId:
              user._id,
            instanceId,
            pointValue: 2,
            topicKey:
              "actual-path",
            topicLabel:
              "실제 경로",
            prompt: "1+1",
            answer: "2",
            solution: "2",
            status: "active",
            startedAt:
              new Date(
                now.getTime() -
                  1000
              ),
            deadlineAt:
              new Date(
                now.getTime() +
                  30_000
              ),
          });

        const result =
          await submitQuickPracticeAttempt({
            userId:
              user._id,
            instanceId,
            submittedAnswer:
              "2",
          });
        assert.equal(
          result.correct,
          true
        );
        const [
          source,
          event,
        ] =
          await Promise.all([
            QuickPracticeAttempt
              .findOne({
                instanceId,
              })
              .lean(),
            OutboxEvent
              .findOne({})
              .lean(),
          ]);
        assert.equal(
          source.status,
          "correct"
        );
        assert.equal(
          event
            .payload
            .sourceDocumentId,
          String(
            source._id
          )
        );
        assert.equal(
          event.status,
          "PENDING"
        );
        await drainCycleAttendanceOutbox({
          workerId:
            "actual-path-worker",
          now: () =>
            new Date(
              Date.now() +
                1000
            ),
        });
        assert.equal(
          await CycleAttendanceDay
            .countDocuments({
              cycleId:
                cycle._id,
            }),
          1
        );
      }
    );

    await check(
      "원천 저장이 실패해도 선행 의도는 남고 잘못된 출석 없이 DEAD로 감사됨",
      async () => {
        await resetDatabase();
        const sourceTime =
          new Date();
        const {
          userId,
        } =
          await createContext({
            now:
              sourceTime,
          });
        const sourceId =
          objectId();
        await assert.rejects(
          persistLearningSourceWithAttendance({
            userId,
            sourceModel:
              ATTENDANCE_SOURCE_MODELS
                .QUICK_PRACTICE_ATTEMPT,
            sourceDocumentId:
              sourceId,
            occurredAt:
              sourceTime,
            persistSource:
              async () => {
                throw new Error(
                  "ambiguous source write"
                );
              },
          }),
          /ambiguous/
        );
        const processed =
          await processNextAttendanceIntent({
            workerId:
              "orphan-auditor",
            now:
              new Date(
                sourceTime.getTime() +
                  2000
              ),
            maxAttempts: 1,
            orphanGraceMs: 0,
          });
        assert.equal(
          processed.status,
          "DEAD"
        );
        assert.match(
          processed.event
            .lastError,
          /ATTENDANCE_SOURCE_MISSING/
        );
        assert.equal(
          await CycleAttendanceDay
            .countDocuments({}),
          0
        );
      }
    );

    await check(
      "DEAD orphan 뒤 동일 원천 저장 재시도는 의도를 되살려 유실 없이 전달함",
      async () => {
        await resetDatabase();
        const sourceTime =
          new Date();
        const {
          cycle,
          userId,
        } =
          await createContext({
            now:
              sourceTime,
          });
        const sourceId =
          objectId();
        await assert.rejects(
          persistLearningSourceWithAttendance({
            userId,
            sourceModel:
              ATTENDANCE_SOURCE_MODELS
                .QUICK_PRACTICE_ATTEMPT,
            sourceDocumentId:
              sourceId,
            occurredAt:
              sourceTime,
            persistSource:
              async () => {
                throw new Error(
                  "first source write failed"
                );
              },
          }),
          /first source write failed/
        );
        await processNextAttendanceIntent({
          workerId:
            "dead-before-retry",
          now:
            new Date(
              sourceTime.getTime() +
                2000
            ),
          maxAttempts: 1,
          orphanGraceMs: 0,
        });
        assert.equal(
          (
            await OutboxEvent
              .findOne({})
              .lean()
          ).status,
          "DEAD"
        );

        const source =
          quickAttemptDocument({
            userId,
            now:
              sourceTime,
            sourceDocumentId:
              sourceId,
          });
        const retry =
          await persistLearningSourceWithAttendance({
            userId,
            sourceModel:
              ATTENDANCE_SOURCE_MODELS
                .QUICK_PRACTICE_ATTEMPT,
            sourceDocumentId:
              sourceId,
            occurredAt:
              sourceTime,
            persistSource:
              () =>
                source.save(),
          });
        assert.equal(
          retry
            .attendanceIntent
            .requeued,
          true
        );
        assert.equal(
          (
            await OutboxEvent
              .findOne({})
              .lean()
          ).status,
          "PENDING"
        );
        const delivered =
          await processNextAttendanceIntent({
            workerId:
              "retry-after-dead",
            now:
              new Date(
                sourceTime.getTime() +
                  3000
              ),
          });
        assert.equal(
          delivered.status,
          "PUBLISHED"
        );
        assert.equal(
          await CycleAttendanceDay
            .countDocuments({
              cycleId:
                cycle._id,
            }),
          1
        );
      }
    );

    await check(
      "다중 worker가 하나의 의도를 원자적으로 한 번만 claim함",
      async () => {
        await resetDatabase();
        const now =
          new Date();
        const {
          userId,
        } =
          await createContext({
            now,
          });
        await persistQuickWithIntent({
          userId,
          now,
        });
        const claims =
          await Promise.all(
            Array.from(
              {
                length: 12,
              },
              (
                _,
                index
              ) =>
                claimNextAttendanceIntent({
                  workerId:
                    `worker-${index}`,
                  now:
                    new Date(
                      now.getTime() +
                        1000
                    ),
                })
            )
          );
        assert.equal(
          claims.filter(
            Boolean
          ).length,
          1
        );
        assert.equal(
          await OutboxEvent
            .countDocuments({
              status:
                "PROCESSING",
            }),
          1
        );
      }
    );

    await check(
      "미영속 원천은 지수 backoff 후 재시도되고 grace 뒤 DEAD가 됨",
      async () => {
        await resetDatabase();
        const sourceTime =
          new Date();
        const {
          userId,
        } =
          await createContext({
            now:
              sourceTime,
          });
        await enqueueCycleAttendanceIntent({
          userId,
          sourceModel:
            ATTENDANCE_SOURCE_MODELS
              .PROBLEM_ATTEMPT,
          sourceDocumentId:
            objectId(),
          occurredAt:
            sourceTime,
        });
        const firstNow =
          new Date(
            sourceTime.getTime() +
              2000
          );
        const first =
          await processNextAttendanceIntent({
            workerId:
              "backoff-worker",
            now: firstNow,
            maxAttempts: 2,
            orphanGraceMs:
              60_000,
            baseRetryMs: 5000,
            maxRetryMs: 5000,
          });
        assert.equal(
          first.status,
          "FAILED"
        );
        assert.equal(
          first.event
            .nextAttemptAt
            .getTime(),
          firstNow.getTime() +
            5000
        );
        const tooEarly =
          await processNextAttendanceIntent({
            workerId:
              "backoff-worker",
            now:
              new Date(
                firstNow.getTime() +
                  4999
              ),
          });
        assert.equal(
          tooEarly,
          null
        );
        const second =
          await processNextAttendanceIntent({
            workerId:
              "backoff-worker",
            now:
              new Date(
                firstNow.getTime() +
                  60_001
              ),
            maxAttempts: 2,
            orphanGraceMs:
              60_000,
            baseRetryMs: 5000,
            maxRetryMs: 5000,
          });
        assert.equal(
          second.status,
          "DEAD"
        );
        assert.equal(
          second.event
            .attemptCount,
          2
        );
      }
    );

    await check(
      "worker 재시작 후 PENDING 원천을 처리하고 미정 정책은 기록 전용으로 유지함",
      async () => {
        await resetDatabase();
        const sourceTime =
          new Date();
        const {
          cycle,
          userId,
        } =
          await createContext({
            now:
              sourceTime,
            policyReady:
              false,
          });
        const {
          source,
        } =
          await persistQuickWithIntent({
            userId,
            now:
              sourceTime,
          });
        const outbox =
          await OutboxEvent
            .findOne({})
            .lean();
        assert.equal(
          outbox.status,
          "PENDING"
        );

        const restarted =
          await drainCycleAttendanceOutbox({
            workerId:
              "restarted-worker",
            now: () =>
              new Date(
                sourceTime.getTime() +
                  2000
              ),
          });
        assert.equal(
          restarted.length,
          1
        );
        assert.equal(
          restarted[0].status,
          "PUBLISHED"
        );
        const [
          delivered,
          day,
        ] =
          await Promise.all([
            OutboxEvent
              .findById(
                outbox._id
              )
              .lean(),
            CycleAttendanceDay
              .findOne({
                cycleId:
                  cycle._id,
              })
              .lean(),
          ]);
        assert.equal(
          delivered.status,
          "PUBLISHED"
        );
        assert.equal(
          day
            .recognitionState,
          "POLICY_PENDING"
        );
        assert.equal(
          day.recognized,
          false
        );
        assert.equal(
          day
            .distinctProblemCount,
          1
        );
        assert.equal(
          day
            .validStudySeconds,
          12
        );
        assert.equal(
          day
            .sourceEvents[0]
            .sourceId,
          source.instanceId
        );

        const replayDrain =
          await drainCycleAttendanceOutbox({
            workerId:
              "second-restart",
            now: () =>
              new Date(
                sourceTime.getTime() +
                  3000
              ),
          });
        assert.equal(
          replayDrain.length,
          0
        );
        const unchanged =
          await CycleAttendanceDay
            .findOne({
              cycleId:
                cycle._id,
            })
            .lean();
        assert.equal(
          unchanged
            .sourceEvents.length,
          1
        );
      }
    );

    await check(
      "worker는 원천의 terminal 영속 상태를 확인한 뒤에만 출석을 반영함",
      async () => {
        await resetDatabase();
        const sourceTime =
          new Date();
        const {
          cycle,
          userId,
        } =
          await createContext({
            now:
              sourceTime,
          });
        const source =
          quickAttemptDocument({
            userId,
            now:
              sourceTime,
            status: "active",
          });
        await source.save();
        await enqueueCycleAttendanceIntent({
          userId,
          sourceModel:
            ATTENDANCE_SOURCE_MODELS
              .QUICK_PRACTICE_ATTEMPT,
          sourceDocumentId:
            source._id,
          occurredAt:
            sourceTime,
        });

        const beforeTerminal =
          await processNextAttendanceIntent({
            workerId:
              "source-verifier",
            now:
              new Date(
                sourceTime.getTime() +
                  1000
              ),
            baseRetryMs: 500,
            maxRetryMs: 500,
          });
        assert.equal(
          beforeTerminal.status,
          "FAILED"
        );
        assert.match(
          beforeTerminal.event
            .lastError,
          /ATTENDANCE_SOURCE_NOT_READY/
        );
        assert.equal(
          await CycleAttendanceDay
            .countDocuments({
              cycleId:
                cycle._id,
            }),
          0
        );

        source.status =
          "correct";
        source.submittedAnswer =
          "1";
        source.submittedAt =
          sourceTime;
        source.responseTimeMs =
          12_000;
        await source.save();
        const afterTerminal =
          await processNextAttendanceIntent({
            workerId:
              "source-verifier-after-restart",
            now:
              new Date(
                sourceTime.getTime() +
                  2000
              ),
          });
        assert.equal(
          afterTerminal.status,
          "PUBLISHED"
        );
        assert.equal(
          await CycleAttendanceDay
            .countDocuments({
              cycleId:
                cycle._id,
            }),
          1
        );
      }
    );

    await check(
      "lease를 인계받은 worker와 이전 worker가 겹쳐도 원장 이벤트는 하나임",
      async () => {
        await resetDatabase();
        const sourceTime =
          new Date();
        const {
          cycle,
          userId,
        } =
          await createContext({
            now:
              sourceTime,
          });
        await persistQuickWithIntent({
          userId,
          now:
            sourceTime,
        });
        const firstClaim =
          await claimNextAttendanceIntent({
            workerId:
              "worker-before-restart",
            now:
              new Date(
                sourceTime.getTime() +
                  1000
              ),
            leaseMs: 1000,
          });
        const secondClaim =
          await claimNextAttendanceIntent({
            workerId:
              "worker-after-restart",
            now:
              new Date(
                sourceTime.getTime() +
                  2001
              ),
            leaseMs: 1000,
          });
        assert.ok(
          firstClaim
        );
        assert.ok(
          secondClaim
        );
        await assert.rejects(
          deliverClaimedAttendanceIntent(
            firstClaim,
            {
              workerId:
                "worker-before-restart",
              now:
                new Date(
                  sourceTime.getTime() +
                    2002
                ),
            }
          ),
          /lease was lost/
        );
        const delivered =
          await deliverClaimedAttendanceIntent(
            secondClaim,
            {
              workerId:
                "worker-after-restart",
              now:
                new Date(
                  sourceTime.getTime() +
                    2003
                ),
            }
          );
        assert.equal(
          delivered.status,
          "PUBLISHED"
        );
        const day =
          await CycleAttendanceDay
            .findOne({
              cycleId:
                cycle._id,
            })
            .lean();
        assert.equal(
          day
            .sourceEvents.length,
          1
        );
        assert.equal(
          day
            .distinctProblemCount,
          1
        );
      }
    );

    await check(
      "Day 30 허용목록·시간 미정은 worker 경로에서도 추정 없이 기록 전용임",
      async () => {
        await resetDatabase();
        const sourceTime =
          new Date();
        const {
          cycle,
          userId,
        } =
          await createContext({
            now:
              sourceTime,
          });
        const today =
          kstDateKey(
            sourceTime
          );
        cycle.status =
          "SUB_CLOSING";
        cycle.paidAccessStartsOn =
          addKstCalendarDays(
            today,
            -29
          );
        cycle.paidAccessEndsOn =
          addKstCalendarDays(
            today,
            -1
          );
        cycle.day30ReviewOn =
          today;
        cycle
          .day30CompletionOpensAt =
          null;
        cycle
          .day30CompletionDeadlineAt =
          null;
        await cycle.save();

        await persistQuickWithIntent({
          userId,
          now:
            sourceTime,
        });
        await drainCycleAttendanceOutbox({
          workerId:
            "day30-policy-worker",
          now: () =>
            new Date(
              sourceTime.getTime() +
                1000
            ),
        });
        const day =
          await CycleAttendanceDay
            .findOne({
              cycleId:
                cycle._id,
            })
            .lean();
        assert.equal(
          day.cycleDay,
          30
        );
        assert.equal(
          day
            .sourceEvents[0]
            .accessState,
          "POLICY_PENDING"
        );
        assert.equal(
          day
            .recognitionState,
          "POLICY_PENDING"
        );
        assert.equal(
          day
            .distinctProblemCount,
          0
        );
        assert.equal(
          day
            .validStudySeconds,
          0
        );
      }
    );

    await check(
      "답 없는 Quick Practice 만료는 감사만 남고 문제·시간 합계에 들지 않음",
      async () => {
        await resetDatabase();
        const sourceTime =
          new Date();
        const {
          cycle,
          userId,
        } =
          await createContext({
            now:
              sourceTime,
            policyReady: true,
          });
        await persistQuickWithIntent({
          userId,
          now:
            sourceTime,
          status: "expired",
        });
        await drainCycleAttendanceOutbox({
          workerId:
            "expiry-worker",
          now: () =>
            new Date(
              sourceTime.getTime() +
                1000
            ),
        });
        const day =
          await CycleAttendanceDay
            .findOne({
              cycleId:
                cycle._id,
            })
            .lean();
        assert.equal(
          day
            .sourceEvents[0]
            .outcome,
          "SUBMISSION_NOT_PERSISTED"
        );
        assert.equal(
          day
            .distinctProblemCount,
          0
        );
        assert.equal(
          day
            .validStudySeconds,
          0
        );
        assert.equal(
          day.recognized,
          false
        );
      }
    );

    await check(
      "Outbox payload에는 식별자만 있고 답안·본문·사용자 정보가 없음",
      async () => {
        await resetDatabase();
        const now =
          new Date();
        const {
          userId,
        } =
          await createContext({
            now,
          });
        await persistQuickWithIntent({
          userId,
          now,
        });
        const event =
          await OutboxEvent
            .findOne({})
            .lean();
        assert.deepEqual(
          Object.keys(
            event.payload
          ).sort(),
          [
            "cycleId",
            "schemaVersion",
            "sourceDocumentId",
            "sourceModel",
          ]
        );
        const serialized =
          JSON.stringify(
            event.payload
          );
        for (const secret of [
          "민감한 문제 본문",
          "민감한 정답",
          "민감한 풀이",
          "학생 답안",
          String(userId),
        ]) {
          assert.equal(
            serialized.includes(
              secret
            ),
            false
          );
        }
      }
    );

    await check(
      "원천 adapter는 복습·Placement와 실제 제출 문항을 구분함",
      () => {
        const userId =
          objectId();
        const problemId =
          objectId();
        const attemptId =
          objectId();
        const occurredAt =
          new Date();
        const review =
          deriveAttendanceEventFromSource(
            ATTENDANCE_SOURCE_MODELS
              .PROBLEM_ATTEMPT,
            {
              _id: attemptId,
              userId,
              problemId,
              reviewSourceAttemptId:
                objectId(),
              responseTimeMs:
                8000,
              submittedAt:
                occurredAt,
            }
          );
        assert.equal(
          review.sourceType,
          "WRONG_NOTE_REVIEW"
        );
        assert.deepEqual(
          review.problemIds,
          [
            String(problemId),
          ]
        );

        const assessmentId =
          objectId();
        const placement =
          deriveAttendanceEventFromSource(
            ATTENDANCE_SOURCE_MODELS
              .ASSESSMENT_ATTEMPT,
            {
              _id:
                assessmentId,
              userId,
              scopeType:
                "placement",
              status:
                "submitted",
              questions: [
                {
                  questionId:
                    "q1",
                  submittedAnswer:
                    "0",
                },
                {
                  questionId:
                    "q2",
                  submittedAnswer:
                    "",
                },
              ],
              elapsedTimeMs:
                60_000,
              submittedAt:
                occurredAt,
            }
          );
        assert.equal(
          placement.sourceType,
          "PLACEMENT"
        );
        assert.deepEqual(
          placement.problemIds,
          [
            `assessment:${assessmentId}:q1`,
          ]
        );
      }
    );

    await check(
      "SUSPENDED 주기는 출석 Outbox를 만들지 않지만 학습 원천은 보존함",
      async () => {
        await resetDatabase();
        const now =
          new Date();
        const {
          userId,
        } =
          await createContext({
            now,
            cycleStatus:
              "SUSPENDED",
          });
        const {
          result,
          source,
        } =
          await persistQuickWithIntent({
            userId,
            now,
          });
        assert.equal(
          result
            .attendanceIntent
            .queued,
          false
        );
        assert.ok(
          await QuickPracticeAttempt
            .findById(
              source._id
            )
        );
        assert.equal(
          await OutboxEvent
            .countDocuments({}),
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
      (item) =>
        !item.passed
    );
  console.log(
    failed.length
      ? `\n실패 ${failed.length}건`
      : `\n전부 통과 (${checks.length}건)`
  );
  if (failed.length) {
    for (const item of failed) {
      console.error(
        `\n[${item.label}]`,
        item.error
      );
    }
  }
  process.exitCode =
    failed.length ? 1 : 0;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
