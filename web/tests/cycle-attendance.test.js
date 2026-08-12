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
  PolicyVersion,
} = require(
  "../models/policyVersionModel"
);
const {
  addKstCalendarDays,
} = require(
  "../services/accessCycleService"
);
const {
  CycleAttendanceError,
  deriveCycleAttendanceStreak,
  normalizeLearningEvent,
  recordCycleAttendanceActivity,
} = require(
  "../services/cycleAttendanceService"
);

const checks = [];
let policySequence = 1;

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

async function createPolicy({
  ready = false,
  allowedActivityTypes = [
    "PRACTICE",
    "WRONG_NOTE_REVIEW",
  ],
} = {}) {
  const input = {
    version:
      `attendance-policy-${policySequence}`,
    effectiveFrom:
      new Date(
        "2026-07-01T00:00:00+09:00"
      ),
  };
  policySequence += 1;

  if (ready) {
    input.minRecognizedProblemsPerDay =
      2;
    input.minValidStudySecondsPerDay =
      60;
    input.completionPass = {
      cycleDay: 30,
      opensAtKst: "00:00",
      deadlineAtKst: "23:00",
      allowedActivityTypes,
    };
  }

  return PolicyVersion.create(
    input
  );
}

async function createCycle(
  policy,
  {
    status = "SUB_ACTIVE",
    opensAt = null,
    deadlineAt = null,
  } = {}
) {
  return AccessCycle.create({
    userId: objectId(),
    paymentOrderId:
      objectId(),
    policyVersionId:
      policy._id,
    status,
    refundStatus: "PENDING",
    activeRanking: "SUB",
    startedAt:
      new Date(
        "2026-07-01T00:00:00+09:00"
      ),
    paidAccessStartsOn:
      "2026-07-01",
    paidAccessEndsOn:
      "2026-07-29",
    day30ReviewOn:
      "2026-07-30",
    day30CompletionOpensAt:
      opensAt,
    day30CompletionDeadlineAt:
      deadlineAt,
    paidAccessDaysGranted: 29,
    refundChallengeDays: 29,
  });
}

function eventFor(
  cycle,
  overrides = {}
) {
  return {
    userId:
      String(cycle.userId),
    cycleId:
      String(cycle._id),
    sourceType: "PRACTICE",
    sourceId:
      `practice-${objectId()}`,
    eventType:
      "ATTEMPT_COMPLETED",
    problemIds: [
      "problem-1",
      "problem-2",
    ],
    durationMs: 60_000,
    occurredAt:
      new Date(
        "2026-07-01T12:00:00+09:00"
      ),
    allRequiredSubmissionsPersisted:
      true,
    integrityState: "CLEAR",
    ...overrides,
  };
}

function record(
  event,
  now,
  options = {}
) {
  return recordCycleAttendanceActivity(
    event,
    {
      now,
      ...options,
    }
  );
}

async function run() {
  const memory =
    await MongoMemoryServer.create();

  try {
    await mongoose.connect(
      memory.getUri(),
      {
        dbName:
          "cycle-attendance-test",
      }
    );
    await Promise.all([
      PolicyVersion.syncIndexes(),
      AccessCycle.syncIndexes(),
      CycleAttendanceDay.syncIndexes(),
    ]);

    await check(
      "하루 문서와 원천 이벤트 멱등 인덱스가 모두 고유함",
      () => {
        const indexes =
          CycleAttendanceDay.schema
            .indexes();
        const dayIndex =
          indexes.find(
            ([fields]) =>
              fields.cycleId ===
                1 &&
              fields
                .dateKeyKst ===
                1
          );
        assert.equal(
          dayIndex?.[1].unique,
          true
        );
        const eventIndex =
          indexes.find(
            ([fields]) =>
              fields[
                "sourceEvents.idempotencyKey"
              ] === 1
          );
        assert.equal(
          eventIndex?.[1].unique,
          true
        );
      }
    );

    await check(
      "학습 이벤트는 허용 출처·영속화 여부·정수 시간·문제 식별자를 검증함",
      () => {
        const base = {
          userId:
            String(objectId()),
          cycleId:
            String(objectId()),
          sourceType:
            "PRACTICE",
          sourceId:
            "practice-1",
          eventType:
            "COMPLETED",
          problemIds: [
            "p-1",
          ],
          durationMs: 1000,
          occurredAt:
            new Date(),
          allRequiredSubmissionsPersisted:
            true,
          integrityState:
            "CLEAR",
        };
        assert.throws(
          () =>
            normalizeLearningEvent({
              ...base,
              sourceType:
                "PAGE_VIEW",
            }),
          /sourceType/
        );
        assert.throws(
          () =>
            normalizeLearningEvent({
              ...base,
              problemIds: null,
            }),
          /problemIds/
        );
        assert.throws(
          () =>
            normalizeLearningEvent({
              ...base,
              durationMs: 1.5,
            }),
          /durationMs/
        );
        assert.throws(
          () =>
            normalizeLearningEvent({
              ...base,
              allRequiredSubmissionsPersisted:
                "true",
            }),
          /boolean/
        );
        assert.throws(
          () =>
            normalizeLearningEvent({
              ...base,
              occurredAt: null,
            }),
          /occurredAt/
        );
      }
    );

    const draftPolicy =
      await createPolicy();
    const draftCycle =
      await createCycle(
        draftPolicy
      );
    const initialEvent =
      eventFor(draftCycle, {
        sourceId:
          "draft-practice-1",
        problemIds: [
          "p-1",
          "p-2",
        ],
        durationMs: 600_000,
      });
    const recordedAt =
      new Date(
        "2026-07-01T13:00:00+09:00"
      );

    await check(
      "미확정 최소 문제·시간은 학습을 기록하되 출석을 열지 않음",
      async () => {
        const result =
          await record(
            initialEvent,
            recordedAt
          );
        assert.equal(
          result.status,
          "RECORDED_POLICY_PENDING"
        );
        assert.equal(
          result.recordOnly,
          true
        );
        assert.equal(
          result.recognized,
          false
        );
        assert.equal(
          result
            .day
            .distinctProblemCount,
          2
        );
        assert.equal(
          result.day
            .validStudySeconds,
          600
        );
        assert.ok(
          result
            .recognitionBlockers
            .includes(
              "POLICY_MIN_PROBLEMS_UNSET"
            )
        );
        assert.ok(
          result
            .recognitionBlockers
            .includes(
              "POLICY_MIN_STUDY_SECONDS_UNSET"
            )
        );
      }
    );

    await check(
      "같은 최초 이벤트가 동시에 도착해도 하루와 원천 이벤트는 각각 하나만 생김",
      async () => {
        const cycle =
          await createCycle(
            draftPolicy
          );
        const first =
          eventFor(cycle, {
            sourceId:
              "concurrent-first-event",
          });
        const results =
          await Promise.all(
            Array.from(
              {
                length: 6,
              },
              () =>
                record(
                  first,
                  recordedAt,
                  {
                    updateCycleProgress:
                      false,
                  }
                )
            )
          );
        assert.equal(
          results.filter(
            (result) =>
              result.status ===
              "RECORDED_POLICY_PENDING"
          ).length,
          1
        );
        assert.equal(
          results.filter(
            (result) =>
              result.status ===
              "IDEMPOTENT_REPLAY"
          ).length,
          5
        );
        const days =
          await CycleAttendanceDay.find(
            {
              cycleId:
                cycle._id,
            }
          ).lean();
        assert.equal(
          days.length,
          1
        );
        assert.equal(
          days[0]
            .sourceEvents.length,
          1
        );
      }
    );

    await check(
      "같은 완료 이벤트 재처리는 문서·문제·시간을 늘리지 않음",
      async () => {
        const replayResults =
          await Promise.all(
            Array.from(
              {
                length: 6,
              },
              () =>
                record(
                  initialEvent,
                  recordedAt,
                  {
                    updateCycleProgress:
                      false,
                  }
                )
            )
          );
        assert.ok(
          replayResults.every(
            (result) =>
              result.status ===
              "IDEMPOTENT_REPLAY"
          )
        );
        const days =
          await CycleAttendanceDay.find(
            {
              cycleId:
                draftCycle._id,
            }
          ).lean();
        assert.equal(
          days.length,
          1
        );
        assert.equal(
          days[0]
            .sourceEvents.length,
          1
        );
        assert.equal(
          days[0]
            .distinctProblemCount,
          2
        );
        assert.equal(
          days[0]
            .validStudySeconds,
          600
        );
      }
    );

    await check(
      "같은 원천 키의 내용이 바뀌면 멱등 재처리가 아니라 충돌임",
      async () => {
        const error =
          await captureError(
            () =>
              record(
                {
                  ...initialEvent,
                  durationMs:
                    601_000,
                },
                recordedAt,
                {
                  updateCycleProgress:
                    false,
                }
              )
          );
        assert.ok(
          error instanceof
            CycleAttendanceError
        );
        assert.equal(
          error.code,
          "ATTENDANCE_EVENT_CONFLICT"
        );
      }
    );

    await check(
      "동시 입력도 날짜 문서 하나에 합쳐지고 겹친 문제는 한 번만 셈",
      async () => {
        const second =
          eventFor(draftCycle, {
            sourceType:
              "QUICK_PRACTICE",
            sourceId:
              "draft-quick-2",
            problemIds: [
              "p-2",
              "p-3",
            ],
            durationMs:
              300_000,
          });
        const third =
          eventFor(draftCycle, {
            sourceType:
              "ASSESSMENT",
            sourceId:
              "draft-assessment-3",
            problemIds: [
              "p-4",
            ],
            durationMs:
              300_000,
          });
        await Promise.all([
          record(
            second,
            recordedAt,
            {
              updateCycleProgress:
                false,
            }
          ),
          record(
            third,
            recordedAt,
            {
              updateCycleProgress:
                false,
            }
          ),
        ]);
        const day =
          await CycleAttendanceDay.findOne(
            {
              cycleId:
                draftCycle._id,
              dateKeyKst:
                "2026-07-01",
            }
          ).lean();
        assert.equal(
          day.sourceEvents.length,
          3
        );
        assert.equal(
          day.distinctProblemCount,
          4
        );
        assert.equal(
          day.validStudySeconds,
          1200
        );
      }
    );

    const readyPolicy =
      await createPolicy({
        ready: true,
      });
    const readyCycle =
      await createCycle(
        readyPolicy
      );

    await check(
      "Day 1~29는 Day 30 Pass와 분리되어 주입된 일일 기준만 충족하면 인정됨",
      async () => {
        const result =
          await record(
            eventFor(readyCycle, {
              sourceId:
                "ready-day-1",
            }),
            recordedAt
          );
        assert.equal(
          result.status,
          "RECORDED_RECOGNIZED"
        );
        assert.equal(
          result.day
            .sourceEvents[0]
            .accessState,
          "PAID_ACCESS"
        );
        assert.equal(
          result.recognized,
          true
        );
        assert.equal(
          result
            .recognitionBlockers
            .length,
          0
        );

        const refreshed =
          await AccessCycle
            .findById(
              readyCycle._id
            )
            .lean();
        assert.equal(
          refreshed
            .cycleStreakDays,
          1
        );
        assert.equal(
          refreshed
            .lastRecognizedAttendanceDate,
          "2026-07-01"
        );
        assert.equal(
          refreshed
            .refundAttendanceConditionMet,
          false
        );
      }
    );

    await check(
      "무결성 보류 이벤트는 출석을 막고 유효 문제·시간에 더하지 않음",
      async () => {
        const cycle =
          await createCycle(
            readyPolicy
          );
        const result =
          await record(
            eventFor(cycle, {
              sourceId:
                "held-day-1",
              integrityState:
                "HELD",
            }),
            recordedAt,
            {
              updateCycleProgress:
                false,
            }
          );
        assert.equal(
          result.eventOutcome,
          "INTEGRITY_HELD"
        );
        assert.equal(
          result
            .recognitionState,
          "INTEGRITY_HELD"
        );
        assert.equal(
          result.day
            .distinctProblemCount,
          0
        );
        assert.equal(
          result.day
            .validStudySeconds,
          0
        );
      }
    );

    await check(
      "영속화되지 않은 제출은 감사 이벤트만 남고 출석 합계에 들지 않음",
      async () => {
        const cycle =
          await createCycle(
            readyPolicy
          );
        const result =
          await record(
            eventFor(cycle, {
              sourceId:
                "not-persisted-day-1",
              allRequiredSubmissionsPersisted:
                false,
            }),
            recordedAt,
            {
              updateCycleProgress:
                false,
            }
          );
        assert.equal(
          result.eventOutcome,
          "SUBMISSION_NOT_PERSISTED"
        );
        assert.equal(
          result.recognized,
          false
        );
        assert.equal(
          result.day
            .distinctProblemCount,
          0
        );
      }
    );

    const pendingDay30Cycle =
      await createCycle(
        draftPolicy,
        {
          status:
            "SUB_CLOSING",
        }
      );
    const day30Time =
      new Date(
        "2026-07-30T12:00:00+09:00"
      );
    const afterDay30Time =
      new Date(
        "2026-07-30T13:00:00+09:00"
      );

    await check(
      "Day 30 허용 목록·시간이 없으면 Completion Pass를 추정하지 않고 기록 전용임",
      async () => {
        const result =
          await record(
            eventFor(
              pendingDay30Cycle,
              {
                sourceId:
                  "pending-day-30",
                occurredAt:
                  day30Time,
              }
            ),
            afterDay30Time,
            {
              updateCycleProgress:
                false,
            }
          );
        assert.equal(
          result.status,
          "RECORDED_POLICY_PENDING"
        );
        assert.equal(
          result.eventOutcome,
          "POLICY_PENDING"
        );
        assert.equal(
          result.cycleDay,
          30
        );
        assert.equal(
          result.day
            .distinctProblemCount,
          0
        );
        assert.ok(
          result
            .recognitionBlockers
            .includes(
              "POLICY_DAY30_WINDOW_UNSET"
            )
        );
        assert.ok(
          result
            .recognitionBlockers
            .includes(
              "POLICY_DAY30_ALLOWLIST_UNSET"
            )
        );
      }
    );

    const passOpens =
      new Date(
        "2026-07-30T00:00:00+09:00"
      );
    const passDeadline =
      new Date(
        "2026-07-30T23:00:00+09:00"
      );
    const day30Cycle =
      await createCycle(
        readyPolicy,
        {
          status:
            "SUB_CLOSING",
          opensAt: passOpens,
          deadlineAt:
            passDeadline,
        }
      );

    await check(
      "Day 30은 활성 Pass 안의 허용 학습과 같은 일일 기준을 충족해야 인정됨",
      async () => {
        const result =
          await record(
            eventFor(day30Cycle, {
              sourceId:
                "allowed-day-30",
              occurredAt:
                day30Time,
            }),
            afterDay30Time,
            {
              updateCycleProgress:
                false,
            }
          );
        assert.equal(
          result.status,
          "RECORDED_RECOGNIZED"
        );
        assert.equal(
          result.eventOutcome,
          "VALID_ACTIVITY"
        );
        assert.equal(
          result.day
            .sourceEvents[0]
            .accessState,
          "COMPLETION_PASS"
        );
      }
    );

    await check(
      "Completion Pass 마감 후 제출은 저장해도 인정 결과와 합계를 바꾸지 않음",
      async () => {
        const result =
          await record(
            eventFor(day30Cycle, {
              sourceId:
                "late-day-30",
              problemIds: [
                "late-1",
                "late-2",
                "late-3",
              ],
              durationMs:
                300_000,
              occurredAt:
                new Date(
                  "2026-07-30T23:30:00+09:00"
                ),
            }),
            new Date(
              "2026-07-30T23:40:00+09:00"
            ),
            {
              updateCycleProgress:
                false,
            }
          );
        assert.equal(
          result.eventOutcome,
          "COMPLETION_PASS_INACTIVE"
        );
        assert.equal(
          result.recognized,
          true
        );
        assert.equal(
          result.day
            .distinctProblemCount,
          2
        );
        assert.equal(
          result.day
            .validStudySeconds,
          60
        );
      }
    );

    await check(
      "주기 밖 학습은 출석 문서를 만들지 않음",
      async () => {
        const beforeCount =
          await CycleAttendanceDay.countDocuments(
            {
              cycleId:
                readyCycle._id,
            }
          );
        const result =
          await record(
            eventFor(readyCycle, {
              sourceId:
                "outside-day-31",
              occurredAt:
                new Date(
                  "2026-07-31T12:00:00+09:00"
                ),
            }),
            new Date(
              "2026-07-31T13:00:00+09:00"
            )
          );
        const afterCount =
          await CycleAttendanceDay.countDocuments(
            {
              cycleId:
                readyCycle._id,
            }
          );
        assert.equal(
          result.status,
          "OUTSIDE_CYCLE_WINDOW"
        );
        assert.equal(
          result.recorded,
          false
        );
        assert.equal(
          afterCount,
          beforeCount
        );
      }
    );

    await check(
      "출석 스트릭은 다른 주기를 보지 않고 최신 연속 KST 날짜만 계산함",
      () => {
        const gap =
          deriveCycleAttendanceStreak([
            {
              dateKeyKst:
                "2026-07-01",
              recognized: true,
            },
            {
              dateKeyKst:
                "2026-07-02",
              recognized: true,
            },
            {
              dateKeyKst:
                "2026-07-04",
              recognized: true,
            },
          ]);
        assert.deepEqual(
          gap,
          {
            cycleStreakDays: 1,
            lastRecognizedAttendanceDate:
              "2026-07-04",
          }
        );

        const thirty =
          deriveCycleAttendanceStreak(
            Array.from(
              {
                length: 30,
              },
              (_, index) => ({
                dateKeyKst:
                  addKstCalendarDays(
                    "2026-07-01",
                    index
                  ),
                recognized: true,
              })
            )
          );
        assert.equal(
          thirty.cycleStreakDays,
          30
        );
        assert.equal(
          thirty
            .lastRecognizedAttendanceDate,
          "2026-07-30"
        );
      }
    );

    await check(
      "다른 주기가 같은 sourceType·sourceId·eventType를 재사용하면 충돌함",
      async () => {
        const anotherCycle =
          await createCycle(
            readyPolicy
          );
        const error =
          await captureError(
            () =>
              record(
                eventFor(
                  anotherCycle,
                  {
                    sourceType:
                      initialEvent
                        .sourceType,
                    sourceId:
                      initialEvent
                        .sourceId,
                    eventType:
                      initialEvent
                        .eventType,
                  }
                ),
                recordedAt,
                {
                  updateCycleProgress:
                    false,
                }
              )
          );
        assert.equal(
          error.code,
          "ATTENDANCE_EVENT_CONFLICT"
        );
      }
    );
  } finally {
    await mongoose.disconnect();
    await memory.stop();
  }

  const failed =
    checks.filter(
      (item) => !item.passed
    );
  if (failed.length) {
    console.error(
      `\n${failed.length} cycle attendance check(s) failed.`
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `\n${checks.length} cycle attendance checks passed.`
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
