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
} = require(
  "../models/outboxEventModel"
);
const {
  PolicyVersion,
} = require(
  "../models/policyVersionModel"
);
const {
  LearningEvent,
  Problem,
  ProblemAttempt,
} = require(
  "../models/matthsModel"
);
const controller = require(
  "../controllers/ipadSyncController"
);
const {
  ATTENDANCE_SOURCE_MODELS,
  deriveAttendanceEventFromSource,
  drainCycleAttendanceOutbox,
} = require(
  "../services/cycleAttendanceOutboxService"
);
const {
  addKstCalendarDays,
  kstDateKey,
} = require(
  "../services/accessCycleService"
);

const checks = [];

async function check(label, run) {
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

function response() {
  return {
    body: null,
    statusCode: 200,
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function postEvents(
  userId,
  events,
  sessionId = "ipad-test"
) {
  const res = response();
  let forwarded = null;
  await controller.postEvents(
    {
      apiUser: {
        _id: userId,
      },
      body: {
        sessionId,
        events,
      },
    },
    res,
    (error) => {
      forwarded = error;
    }
  );
  if (forwarded) {
    throw forwarded;
  }
  return res.body;
}

async function postWrongNotes(
  userId,
  entries
) {
  const res = response();
  let forwarded = null;
  await controller
    .postWrongNotesBulk(
      {
        apiUser: {
          _id: userId,
        },
        body: {
          entries,
        },
      },
      res,
      (error) => {
        forwarded = error;
      }
    );
  if (forwarded) {
    throw forwarded;
  }
  return res.body;
}

function event(
  id,
  now,
  overrides = {}
) {
  return {
    clientEventId: id,
    eventType:
      "problem-correct",
    courseId:
      "calculus-1",
    unitId: "unit-1",
    conceptId:
      "concept-1",
    durationMs: 12_000,
    correct: true,
    occurredAt:
      new Date(
        now.getTime() -
          1000
      ).toISOString(),
    ...overrides,
  };
}

async function createCycle(
  userId,
  now
) {
  const dateKey =
    kstDateKey(now);
  const policy =
    await PolicyVersion.create({
      version:
        "ipad-attendance-1",
      effectiveFrom:
        new Date(
          now.getTime() -
            60_000
        ),
      minRecognizedProblemsPerDay:
        1,
      minValidStudySecondsPerDay:
        1,
    });
  return AccessCycle.create({
    userId,
    paymentOrderId:
      new mongoose.Types
        .ObjectId(),
    policyVersionId:
      policy._id,
    status: "SUB_ACTIVE",
    refundStatus:
      "PENDING",
    activeRanking:
      "SUB",
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
}

(async () => {
  let mongo = null;
  try {
    mongo =
      await MongoMemoryServer
        .create();
    await mongoose.connect(
      mongo.getUri()
    );
    await Promise.all([
      AccessCycle.syncIndexes(),
      CycleAttendanceDay
        .syncIndexes(),
      LearningEvent.syncIndexes(),
      OutboxEvent.syncIndexes(),
      PolicyVersion.syncIndexes(),
      Problem.syncIndexes(),
      ProblemAttempt.syncIndexes(),
    ]);

    const now =
      new Date();
    const userId =
      new mongoose.Types
        .ObjectId();
    const cycle =
      await createCycle(
        userId,
        now
      );

    await check(
      "명확한 iPad 문제 완료만 식별자-only Outbox로 선행 기록됨",
      async () => {
        const result =
          await postEvents(
            userId,
            [
              event(
                "ipad-event-1",
                now
              ),
            ]
          );
        assert.deepEqual(
          result,
          {
            accepted: 1,
            duplicates: 0,
          }
        );
        const source =
          await LearningEvent
            .findOne({
              userId,
              clientEventId:
                "ipad-event-1",
            })
            .lean();
        assert.equal(
          source.metadata
            .cycleAttendance
            .candidate,
          true
        );
        const intent =
          await OutboxEvent
            .findOne({
              aggregateId:
                String(
                  source._id
                ),
            })
            .lean();
        assert.ok(intent);
        assert.deepEqual(
          Object.keys(
            intent.payload
          ).sort(),
          [
            "cycleId",
            "schemaVersion",
            "sourceDocumentId",
            "sourceModel",
          ]
        );
        assert.equal(
          intent.payload
            .sourceModel,
          ATTENDANCE_SOURCE_MODELS
            .LEARNING_EVENT
        );
      }
    );

    await check(
      "worker는 안정된 clientEventId 문제키를 쓰고 미검증 시간은 0초로 기록함",
      async () => {
        await drainCycleAttendanceOutbox(
          {
            workerId:
              "ipad-worker-1",
            now:
              new Date(),
          }
        );
        const day =
          await CycleAttendanceDay
            .findOne({
              cycleId:
                cycle._id,
            })
            .lean();
        assert.equal(
          day.sourceEvents
            .length,
          1
        );
        assert.deepEqual(
          day.sourceEvents[0]
            .problemKeys,
          [
            "ipad-learning:ipad-event-1",
          ]
        );
        assert.equal(
          day.sourceEvents[0]
            .validStudyMilliseconds,
          0
        );
        assert.equal(
          day.validStudySeconds,
          0
        );
        assert.equal(
          day.recognized,
          false
        );
        assert.ok(
          day.recognitionBlockers
            .includes(
              "STUDY_TIME_THRESHOLD_NOT_MET"
            )
        );
      }
    );

    await check(
      "동일 clientEventId 재전송과 충돌 payload가 원천·출석을 바꾸지 않음",
      async () => {
        const result =
          await postEvents(
            userId,
            [
              event(
                "ipad-event-1",
                now,
                {
                  eventType:
                    "problem-wrong",
                  correct: false,
                  durationMs:
                    800_000,
                }
              ),
            ]
          );
        assert.deepEqual(
          result,
          {
            accepted: 0,
            duplicates: 1,
          }
        );
        const source =
          await LearningEvent
            .findOne({
              userId,
              clientEventId:
                "ipad-event-1",
            })
            .lean();
        assert.equal(
          source.eventType,
          "problem-correct"
        );
        assert.equal(
          source.durationMs,
          12_000
        );
        assert.equal(
          await OutboxEvent
            .countDocuments({}),
          1
        );
        await drainCycleAttendanceOutbox(
          {
            workerId:
              "ipad-worker-2",
            now:
              new Date(),
          }
        );
        const day =
          await CycleAttendanceDay
            .findOne({
              cycleId:
                cycle._id,
            })
            .lean();
        assert.equal(
          day.sourceEvents
            .length,
          1
        );
      }
    );

    await check(
      "한 batch 내부 중복도 하나의 LearningEvent와 하나의 intent로 수렴함",
      async () => {
        const result =
          await postEvents(
            userId,
            [
              event(
                "ipad-event-2",
                now
              ),
              event(
                "ipad-event-2",
                now
              ),
            ]
          );
        assert.deepEqual(
          result,
          {
            accepted: 1,
            duplicates: 1,
          }
        );
        assert.equal(
          await LearningEvent
            .countDocuments({
              userId,
              clientEventId:
                "ipad-event-2",
            }),
          1
        );
        assert.equal(
          await OutboxEvent
            .countDocuments({}),
          2
        );
      }
    );

    await check(
      "source 불명·비완료·비정상 시간·미래 이벤트는 저장만 하고 출석에서 제외함",
      async () => {
        const before =
          await OutboxEvent
            .countDocuments({});
        const excluded = [
          event(
            "missing-concept",
            now,
            {
              conceptId: null,
            }
          ),
          event(
            "grading-batch-no-source",
            now,
            {
              conceptId: null,
              courseId: null,
              unitId: null,
            }
          ),
          event(
            "topic-only",
            now,
            {
              eventType:
                "topic-completed",
              correct: null,
            }
          ),
          event(
            "mismatch-correct",
            now,
            {
              correct: false,
            }
          ),
          event(
            "negative-duration",
            now,
            {
              durationMs: -1,
            }
          ),
          event(
            "fraction-duration",
            now,
            {
              durationMs: 1.5,
            }
          ),
          event(
            "huge-duration",
            now,
            {
              durationMs:
                15 * 60 *
                  1000 +
                1,
            }
          ),
          event(
            "future-event",
            now,
            {
              occurredAt:
                new Date(
                  now.getTime() +
                    10 *
                      60 *
                      1000
                ).toISOString(),
            }
          ),
          event(
            "metadata-injection",
            now,
            {
              eventType:
                "concept-closed",
              correct: null,
              metadata: {
                cycleAttendance: {
                  candidate:
                    true,
                  durationTrust:
                    "SERVER_VERIFIED",
                },
              },
            }
          ),
        ];
        const result =
          await postEvents(
            userId,
            excluded
          );
        assert.equal(
          result.accepted,
          excluded.length
        );
        assert.equal(
          await OutboxEvent
            .countDocuments({}),
          before
        );
        const injected =
          await LearningEvent
            .findOne({
              userId,
              clientEventId:
                "metadata-injection",
            })
            .lean();
        assert.equal(
          injected.metadata
            ?.cycleAttendance,
          undefined
        );
      }
    );

    await check(
      "wrong-notes bulk는 파생 저장소라 corresponding wrong event와 이중 집계되지 않음",
      async () => {
        const learningResult =
          await postEvents(
            userId,
            [
              event(
                "ipad-wrong-1",
                now,
                {
                  eventType:
                    "problem-wrong",
                  correct: false,
                }
              ),
            ]
          );
        assert.equal(
          learningResult
            .accepted,
          1
        );
        const before =
          await OutboxEvent
            .countDocuments({});
        const wrongResult =
          await postWrongNotes(
            userId,
            [
              {
                clientAttemptId:
                  "ipad-attempt-1",
                typeKey:
                  "quadratic-roots",
                seed: "42",
                statement:
                  "x^2-5x+6=0을 푸시오.",
                answer: "2, 3",
                steps: [
                  "인수분해한다.",
                ],
                myAnswer:
                  "1, 6",
                courseId:
                  "calculus-1",
                unitId:
                  "unit-1",
                conceptId:
                  "concept-1",
                createdAt:
                  now.toISOString(),
              },
            ]
          );
        assert.equal(
          wrongResult.synced
            .length,
          1
        );
        assert.equal(
          await OutboxEvent
            .countDocuments({}),
          before
        );
        const attempt =
          await ProblemAttempt
            .findOne({
              userId,
              clientAttemptId:
                "ipad-attempt-1",
            })
            .lean();
        assert.ok(attempt);
        assert.throws(
          () =>
            deriveAttendanceEventFromSource(
              ATTENDANCE_SOURCE_MODELS
                .PROBLEM_ATTEMPT,
              attempt
            ),
          (error) =>
            error.code ===
            "ATTENDANCE_DERIVED_SOURCE"
        );

        await drainCycleAttendanceOutbox(
          {
            workerId:
              "ipad-worker-3",
            now:
              new Date(),
          }
        );
        const day =
          await CycleAttendanceDay
            .findOne({
              cycleId:
                cycle._id,
            })
            .lean();
        const sourceIds =
          day.sourceEvents
            .map(
              (source) =>
                source.sourceId
            );
        assert.ok(
          sourceIds.includes(
            "ipad-learning:ipad-wrong-1"
          )
        );
        assert.equal(
          sourceIds.filter(
            (sourceId) =>
              sourceId ===
              "ipad-learning:ipad-wrong-1"
          ).length,
          1
        );
        assert.equal(
          sourceIds.some(
            (sourceId) =>
              sourceId.includes(
                "ipad-attempt-1"
              )
          ),
          false
        );
      }
    );

    await check(
      "모든 iPad 출석 outbox payload에 문제·답안·사용자 식별정보가 없음",
      async () => {
        const intents =
          await OutboxEvent
            .find({})
            .lean();
        assert.ok(
          intents.length >= 3
        );
        for (
          const intent of
            intents
        ) {
          const serialized =
            JSON.stringify(
              intent.payload
            );
          assert.equal(
            "userId" in
              intent.payload,
            false
          );
          assert.equal(
            /statement|answer|myAnswer|durationMs|conceptId/i
              .test(
                serialized
              ),
            false
          );
        }
      }
    );
  } catch (error) {
    checks.push({
      label:
        "테스트 환경 초기화",
      passed: false,
      error,
    });
    console.error(
      error
    );
  } finally {
    await mongoose
      .disconnect()
      .catch(() => {});
    if (mongo) {
      await mongo
        .stop()
        .catch(() => {});
    }
  }

  const failed =
    checks.filter(
      (item) =>
        !item.passed
    );
  if (failed.length) {
    console.error(
      `\n실패 ${failed.length}건`
    );
    for (
      const failure of
        failed
    ) {
      console.error(
        `- ${failure.label}: ${failure.error?.stack || failure.error}`
      );
    }
    process.exit(1);
  }
  console.log(
    `\n전부 통과 (${checks.length}건)`
  );
})();
