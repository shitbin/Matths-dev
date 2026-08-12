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
  OutboxEvent,
} = require(
  "../models/outboxEventModel"
);
const {
  ARENA_ATTEMPT_SUBMITTED_EVENT_TYPE,
  ARENA_SCORING_OUTBOX_SCHEMA_VERSION,
  createArenaMatchScoringOutboxService,
  createRankSubmissionVerifier,
  enqueueArenaMatchScoringIntent,
} = require(
  "../services/arenaMatchScoringOutboxService"
);

const BASE_TIME =
  new Date(
    "2026-07-30T10:00:00.000Z"
  );
const checks = [];

async function check(
  label,
  work
) {
  try {
    await OutboxEvent
      .collection
      .deleteMany({});
    await work();
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
  work
) {
  try {
    await work();
  } catch (error) {
    return error;
  }
  throw new Error(
    "expected an error"
  );
}

function objectId() {
  return new mongoose.Types
    .ObjectId();
}

async function inTransaction(
  work
) {
  const session =
    await mongoose
      .startSession();
  let result;
  try {
    await session.withTransaction(
      async () => {
        result =
          await work(
            session
          );
      }
    );
    return result;
  } finally {
    await session.endSession();
  }
}

async function queuedIntent({
  attemptId = objectId(),
  submissionRecordId =
    objectId(),
  now = BASE_TIME,
} = {}) {
  const event =
    await inTransaction(
      (session) =>
        enqueueArenaMatchScoringIntent({
          attemptId,
          submissionRecordId,
          session,
          now,
        })
    );
  return {
    event,
    attemptId,
    submissionRecordId,
  };
}

function scoreResult(
  suffix
) {
  return {
    submissionId:
      `ARENA_SCORE_V1_${suffix}`,
    calibratedScore: 91.25,
    advancedCorrectCount: 4,
    correctAnswerActiveSolveTimeMs:
      42_000,
    integrityState:
      "CLEAR",
    gradingAuthority:
      "SERVER",
    questionVersion:
      "QUESTION_V1",
    answerKeyVersion:
      "ANSWER_V1",
    calibrationVersion:
      "CALIBRATION_V1",
    questionPackVersion:
      "PACK_V1",
    scoringPolicyVersion:
      "ARENA_SCORING_V2",
    calibratedScoreMethodVersion:
      "CAL_SCORE_V3",
    activeSolveTimePolicyVersion:
      "ACTIVE_TIME_V2",
    answerComparisonPolicyVersion:
      "MATH_EQUIVALENCE_V4",
    submittedAt:
      new Date(
        BASE_TIME.getTime() +
          10_000
      ).toISOString(),
  };
}

function dependencies({
  attemptId,
  submissionRecordId,
  rankStatus =
    "IN_PROGRESS",
  resolveStatus =
    "RESOLVED",
  settleStatus =
    "SETTLED",
  onScore,
  onSubmit,
  onResolve,
  onSettle,
}) {
  const serverCapability =
    Symbol(
      "test-private-scorer"
    );
  const participantUserId =
    objectId();
  const questionPackId =
    objectId();
  const source = {
    attemptId:
      String(attemptId),
    submissionRecordId:
      String(
        submissionRecordId
      ),
    matchId:
      `match-${attemptId}`,
    participantRole:
      "CHALLENGER",
    participantUserId:
      String(
        participantUserId
      ),
    questionPackId:
      String(
        questionPackId
      ),
    participantSubmissionId:
      "client-submit-id",
    submittedAt:
      new Date(
        BASE_TIME.getTime() +
          10_000
      ),
  };
  return {
    OutboxModel:
      OutboxEvent,
    serverCapability,
    loadSubmittedAttemptSource:
      async (payload) => {
        assert.equal(
          payload.attemptId,
          String(attemptId)
        );
        assert.equal(
          payload
            .submissionRecordId,
          String(
            submissionRecordId
          )
        );
        return source;
      },
    scoreSubmittedAttempt:
      async (input) => {
        assert.equal(
          input
            .serverCapability,
          serverCapability
        );
        assert.deepEqual(
          {
            matchId:
              input.matchId,
            participantRole:
              input
                .participantRole,
            participantUserId:
              input
                .participantUserId,
            questionPackId:
              input
                .questionPackId,
          },
          {
            matchId:
              source.matchId,
            participantRole:
              source
                .participantRole,
            participantUserId:
              source
                .participantUserId,
            questionPackId:
              source
                .questionPackId,
          }
        );
        if (onScore) {
          await onScore(
            input
          );
        }
        return scoreResult(
          String(
            attemptId
          )
        );
      },
    submitResult:
      async (input) => {
        assert.equal(
          input.matchId,
          source.matchId
        );
        assert.equal(
          String(
            input
              .participantUserId
          ),
          String(
            participantUserId
          )
        );
        assert.equal(
          input.submissionId,
          scoreResult(
            String(
              attemptId
            )
          ).submissionId
        );
        assert.deepEqual(
          Object.keys(input)
            .sort(),
          [
            "matchId",
            "participantUserId",
            "submissionId",
          ]
        );
        if (onSubmit) {
          await onSubmit(
            input
          );
        }
        return {
          status:
            typeof rankStatus ===
              "function"
              ? rankStatus()
              : rankStatus,
        };
      },
    resolveScoredMatch:
      async (input) => {
        assert.equal(
          input.matchId,
          source.matchId
        );
        assert.equal(
          input
            .idempotencyKey,
          `arena-score-resolve:${source.matchId}`
        );
        if (onResolve) {
          await onResolve(
            input
          );
        }
        return {
          status:
            resolveStatus,
        };
      },
    settleResolvedMatch:
      async (input) => {
        assert.equal(
          input.matchId,
          source.matchId
        );
        assert.deepEqual(
          Object.keys(input),
          ["matchId"]
        );
        if (onSettle) {
          await onSettle(
            input
          );
        }
        return {
          status:
            settleStatus,
        };
      },
  };
}

(async () => {
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
          "arena-scoring-outbox-test",
      }
    );
    await OutboxEvent
      .syncIndexes();

    await check(
      "injected verifier는 sealed pack을 다시 채점하고 authoritative submittedAt만 신뢰 결과에 포함",
      async () => {
        const serverCapability =
          Symbol(
            "rank-verifier-capability"
          );
        const participantUserId =
          objectId();
        const challengerQuestionPackId =
          objectId();
        const expected =
          scoreResult(
            "rank-verifier"
          );
        let scoringCalls = 0;
        const verifier =
          createRankSubmissionVerifier({
            serverCapability,
            scoreSubmittedAttempt:
              async (input) => {
                scoringCalls += 1;
                assert.equal(
                  input
                    .serverCapability,
                  serverCapability
                );
                assert.equal(
                  input
                    .participantRole,
                  "CHALLENGER"
                );
                assert.equal(
                  input.questionPackId,
                  String(
                    challengerQuestionPackId
                  )
                );
                return expected;
              },
          });
        const verified =
          await verifier({
            match: {
              matchId:
                "match-rank-verifier",
              challengerQuestionPackId,
              defenderQuestionPackId:
                objectId(),
            },
            role: "CHALLENGER",
            participantUserId,
            submissionId:
              expected
                .submissionId,
          });
        assert.equal(
          scoringCalls,
          1
        );
        assert.equal(
          verified
            .submittedAt
            .toISOString(),
          expected.submittedAt
        );
        assert.deepEqual(
          Object.keys(verified)
            .sort(),
          [
            "advancedCorrectCount",
            "answerKeyVersion",
            "calibratedScore",
            "calibrationVersion",
            "correctAnswerActiveSolveTimeMs",
            "integrityState",
            "questionVersion",
            "submissionId",
            "submittedAt",
          ]
        );
        const mismatch =
          await captureError(
            () =>
              verifier({
                match: {
                  matchId:
                    "match-rank-verifier",
                  challengerQuestionPackId,
                },
                role:
                  "CHALLENGER",
                participantUserId,
                submissionId:
                  "different-score-id",
              })
          );
        assert.equal(
          mismatch.code,
          "ARENA_SCORING_SUBMISSION_MISMATCH"
        );
      }
    );

    await check(
      "scoring worker는 TAKEOVER_SETTLED 같은 다른 outbox event를 claim하지 않음",
      async () => {
        const event =
          await OutboxEvent.create({
            eventId:
              "takeover-event-isolation",
            idempotencyKey:
              "takeover-event-isolation",
            aggregateType:
              "RankTakeoverMatch",
            aggregateId:
              "match-event-isolation",
            eventType:
              "TAKEOVER_SETTLED",
            payload: {
              matchId:
                "match-event-isolation",
            },
            status: "PENDING",
            nextAttemptAt:
              BASE_TIME,
          });
        const attemptId =
          objectId();
        const submissionRecordId =
          objectId();
        const subject =
          createArenaMatchScoringOutboxService({
            ...dependencies({
              attemptId,
              submissionRecordId,
            }),
            now: () =>
              BASE_TIME,
          });
        const result =
          await subject
            .processNextArenaScoringIntent({
              workerId:
                "scoring-event-isolation",
            });
        assert.equal(
          result,
          null
        );
        const stored =
          await OutboxEvent
            .findById(
              event._id
            )
            .lean();
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

    await check(
      "frozen submission과 채점 intent는 같은 transaction에서 commit·rollback",
      async () => {
        const abortedAttemptId =
          objectId();
        const marker =
          new Error(
            "abort-scoring-intent"
          );
        const aborted =
          await captureError(
            () =>
              inTransaction(
                async (
                  session
                ) => {
                  await enqueueArenaMatchScoringIntent({
                    attemptId:
                      abortedAttemptId,
                    submissionRecordId:
                      objectId(),
                    session,
                    now:
                      BASE_TIME,
                  });
                  throw marker;
                }
              )
          );
        assert.equal(
          aborted,
          marker
        );
        assert.equal(
          await OutboxEvent
            .countDocuments(),
          0
        );

        const attemptId =
          objectId();
        const submissionRecordId =
          objectId();
        await inTransaction(
          async (session) => {
            const first =
              await enqueueArenaMatchScoringIntent({
                attemptId,
                submissionRecordId,
                session,
                now:
                  BASE_TIME,
              });
            const replay =
              await enqueueArenaMatchScoringIntent({
                attemptId,
                submissionRecordId,
                session,
                now:
                  BASE_TIME,
              });
            assert.equal(
              String(first._id),
              String(replay._id)
            );
          }
        );
        const stored =
          await OutboxEvent
            .findOne()
            .lean();
        assert.equal(
          await OutboxEvent
            .countDocuments(),
          1
        );
        assert.equal(
          stored.eventType,
          ARENA_ATTEMPT_SUBMITTED_EVENT_TYPE
        );
        assert.equal(
          stored.payload
            .schemaVersion,
          ARENA_SCORING_OUTBOX_SCHEMA_VERSION
        );
        assert.deepEqual(
          Object.keys(
            stored.payload
          ).sort(),
          [
            "attemptId",
            "schemaVersion",
            "submissionRecordId",
          ]
        );
        const serialized =
          JSON.stringify(
            stored
          ).toLowerCase();
        for (const forbidden of [
          "answer",
          "email",
          "participantuserid",
          "questionpackid",
          "matths-ipad",
        ]) {
          assert.equal(
            serialized.includes(
              forbidden
            ),
            false
          );
        }
      }
    );

    await check(
      "transaction 없는 intent와 기존 key의 다른 payload를 fail-closed",
      async () => {
        const missingSession =
          await captureError(
            () =>
              enqueueArenaMatchScoringIntent({
                attemptId:
                  objectId(),
                submissionRecordId:
                  objectId(),
                now:
                  BASE_TIME,
              })
          );
        assert.equal(
          missingSession.code,
          "ARENA_SCORING_OUTBOX_TRANSACTION_REQUIRED"
        );

        const queued =
          await queuedIntent();
        await OutboxEvent
          .collection
          .updateOne(
            {
              _id:
                queued.event._id,
            },
            {
              $set: {
                "payload.submissionRecordId":
                  String(
                    objectId()
                  ),
              },
            }
          );
        const conflict =
          await captureError(
            () =>
              inTransaction(
                (session) =>
                  enqueueArenaMatchScoringIntent({
                    attemptId:
                      queued
                        .attemptId,
                    submissionRecordId:
                      queued
                        .submissionRecordId,
                    session,
                    now:
                      BASE_TIME,
                  })
              )
          );
        assert.equal(
          conflict.code,
          "ARENA_SCORING_OUTBOX_CONFLICT"
        );
      }
    );

    await check(
      "worker는 private capability로 채점하고 Rank에는 세 식별자만 전달",
      async () => {
        const queued =
          await queuedIntent();
        let scoreCalls = 0;
        let submitCalls = 0;
        let resolveCalls = 0;
        let settleCalls = 0;
        const subject =
          createArenaMatchScoringOutboxService({
            ...dependencies({
              ...queued,
              onScore: () => {
                scoreCalls += 1;
              },
              onSubmit: () => {
                submitCalls +=
                  1;
              },
              onResolve: () => {
                resolveCalls +=
                  1;
              },
              onSettle: () => {
                settleCalls +=
                  1;
              },
            }),
            now: () =>
              new Date(
                BASE_TIME
                  .getTime() +
                  120_000
              ),
          });
        const result =
          await subject
            .processNextArenaScoringIntent({
              workerId:
                "scoring-worker-a",
            });
        assert.equal(
          result.status,
          "PUBLISHED"
        );
        assert.equal(
          result.rankStatus,
          "IN_PROGRESS"
        );
        assert.equal(
          scoreCalls,
          1
        );
        assert.equal(
          submitCalls,
          1
        );
        assert.equal(
          resolveCalls,
          0
        );
        assert.equal(
          settleCalls,
          0
        );
        const stored =
          await OutboxEvent
            .findById(
              queued.event._id
            )
            .lean();
        assert.equal(
          stored.status,
          "PUBLISHED"
        );
      }
    );

    await check(
      "두 번째 결과가 SUBMITTED를 만들면 resolve와 settle을 마친 뒤 publish",
      async () => {
        const queued =
          await queuedIntent();
        let resolveCalls = 0;
        let settleCalls = 0;
        const subject =
          createArenaMatchScoringOutboxService({
            ...dependencies({
              ...queued,
              rankStatus:
                "SUBMITTED",
              resolveStatus:
                "RESOLVED",
              onResolve: () => {
                resolveCalls +=
                  1;
              },
              onSettle: () => {
                settleCalls +=
                  1;
              },
            }),
            now: () =>
              new Date(
                BASE_TIME
                  .getTime() +
                  20_000
              ),
          });
        const result =
          await subject
            .processNextArenaScoringIntent({
              workerId:
                "scoring-worker-b",
            });
        assert.equal(
          result.status,
          "PUBLISHED"
        );
        assert.equal(
          result.rankStatus,
          "SETTLED"
        );
        assert.equal(
          resolveCalls,
          1
        );
        assert.equal(
          settleCalls,
          1
        );
      }
    );

    await check(
      "Rank 저장 뒤 일시 장애가 나도 재시도는 같은 결과로 수렴",
      async () => {
        const queued =
          await queuedIntent();
        let submitCalls = 0;
        let resolveCalls = 0;
        const transient =
          Object.assign(
            new Error(
              "student@example.com answer=SECRET"
            ),
            {
              code:
                "POLICY_PENDING",
              statusCode: 503,
            }
          );
        const subject =
          createArenaMatchScoringOutboxService({
            ...dependencies({
              ...queued,
              rankStatus:
                "SUBMITTED",
              onSubmit: () => {
                submitCalls +=
                  1;
              },
              onResolve: () => {
                resolveCalls +=
                  1;
                if (
                  resolveCalls ===
                  1
                ) {
                  throw transient;
                }
              },
            }),
          });
        const first =
          await subject
            .processNextArenaScoringIntent({
              workerId:
                "scoring-worker-c",
              now:
                new Date(
                  BASE_TIME
                    .getTime() +
                    30_000
                ),
              baseRetryMs: 1,
            });
        assert.equal(
          first.status,
          "FAILED"
        );
        assert.equal(
          first.retryable,
          true
        );
        assert.equal(
          first.event
            .lastError,
          "ARENA_SCORING_DISPATCH_FAILED:POLICY_PENDING"
        );
        assert.equal(
          first.event
            .lastError
            .includes(
              "SECRET"
            ),
          false
        );

        const second =
          await subject
            .processNextArenaScoringIntent({
              workerId:
                "scoring-worker-c",
              now:
                new Date(
                  BASE_TIME
                    .getTime() +
                    30_010
                ),
              baseRetryMs: 1,
            });
        assert.equal(
          second.status,
          "PUBLISHED"
        );
        assert.equal(
          submitCalls,
          2
        );
        assert.equal(
          resolveCalls,
          2
        );
      }
    );

    await check(
      "이미 RESOLVED인 재시도도 settle 전에는 publish하지 않음",
      async () => {
        const queued =
          await queuedIntent();
        let settleCalls = 0;
        const transient =
          Object.assign(
            new Error(
              "temporary settlement dependency failure"
            ),
            {
              code:
                "SETTLEMENT_TEMPORARILY_UNAVAILABLE",
              statusCode: 503,
            }
          );
        const subject =
          createArenaMatchScoringOutboxService({
            ...dependencies({
              ...queued,
              rankStatus:
                "RESOLVED",
              onSettle: () => {
                settleCalls +=
                  1;
                if (
                  settleCalls ===
                  1
                ) {
                  throw transient;
                }
              },
            }),
          });
        const first =
          await subject
            .processNextArenaScoringIntent({
              workerId:
                "scoring-worker-resolved-retry",
              now:
                new Date(
                  BASE_TIME
                    .getTime() +
                    35_000
                ),
              baseRetryMs: 1,
            });
        assert.equal(
          first.status,
          "FAILED"
        );
        const firstStored =
          await OutboxEvent
            .findById(
              queued.event._id
            )
            .lean();
        assert.equal(
          firstStored.status,
          "FAILED"
        );

        const second =
          await subject
            .processNextArenaScoringIntent({
              workerId:
                "scoring-worker-resolved-retry",
              now:
                new Date(
                  BASE_TIME
                    .getTime() +
                    35_010
                ),
              baseRetryMs: 1,
            });
        assert.equal(
          second.status,
          "PUBLISHED"
        );
        assert.equal(
          second.rankStatus,
          "SETTLED"
        );
        assert.equal(
          settleCalls,
          2
        );
      }
    );

    await check(
      "settle 완료 직후 publish 전에 장애가 나도 재시도는 SETTLED를 재정산하지 않고 publish",
      async () => {
        const queued =
          await queuedIntent();
        let rankState =
          "RESOLVED";
        let settleCalls = 0;
        let leaseChecks = 0;
        const transient =
          Object.assign(
            new Error(
              "crash-after-settle"
            ),
            {
              code:
                "POLICY_PENDING",
              statusCode: 503,
            }
          );
        const OutboxModel = {
          findOneAndUpdate:
            (...args) =>
              OutboxEvent
                .findOneAndUpdate(
                  ...args
                ),
          exists:
            (...args) => {
              leaseChecks += 1;
              if (
                leaseChecks ===
                2
              ) {
                throw transient;
              }
              return OutboxEvent
                .exists(
                  ...args
                );
            },
        };
        const subject =
          createArenaMatchScoringOutboxService({
            ...dependencies({
              ...queued,
              rankStatus: () =>
                rankState,
              onSettle: () => {
                settleCalls +=
                  1;
                rankState =
                  "SETTLED";
              },
            }),
            OutboxModel,
          });
        const first =
          await subject
            .processNextArenaScoringIntent({
              workerId:
                "scoring-worker-post-settle",
              now:
                new Date(
                  BASE_TIME
                    .getTime() +
                    36_000
                ),
              baseRetryMs: 1,
            });
        assert.equal(
          first.status,
          "FAILED"
        );
        assert.equal(
          settleCalls,
          1
        );
        const second =
          await subject
            .processNextArenaScoringIntent({
              workerId:
                "scoring-worker-post-settle",
              now:
                new Date(
                  BASE_TIME
                    .getTime() +
                    36_010
                ),
              baseRetryMs: 1,
            });
        assert.equal(
          second.status,
          "PUBLISHED"
        );
        assert.equal(
          second.rankStatus,
          "SETTLED"
        );
        assert.equal(
          settleCalls,
          1
        );
      }
    );

    await check(
      "settle 완료 직후 publish 전에 장애가 나도 재시도는 SETTLED를 재정산하지 않고 publish",
      async () => {
        const queued =
          await queuedIntent();
        let rankState =
          "RESOLVED";
        let settleCalls = 0;
        let leaseChecks = 0;
        const transient =
          Object.assign(
            new Error(
              "crash-after-settle"
            ),
            {
              code:
                "POLICY_PENDING",
              statusCode: 503,
            }
          );
        const OutboxModel = {
          findOneAndUpdate:
            (...args) =>
              OutboxEvent
                .findOneAndUpdate(
                  ...args
                ),
          exists:
            (...args) => {
              leaseChecks += 1;
              if (
                leaseChecks ===
                2
              ) {
                throw transient;
              }
              return OutboxEvent
                .exists(
                  ...args
                );
            },
        };
        const subject =
          createArenaMatchScoringOutboxService({
            ...dependencies({
              ...queued,
              rankStatus: () =>
                rankState,
              onSettle: () => {
                settleCalls +=
                  1;
                rankState =
                  "SETTLED";
              },
            }),
            OutboxModel,
          });
        const first =
          await subject
            .processNextArenaScoringIntent({
              workerId:
                "scoring-worker-post-settle",
              now:
                new Date(
                  BASE_TIME
                    .getTime() +
                    36_000
                ),
              baseRetryMs: 1,
            });
        assert.equal(
          first.status,
          "FAILED"
        );
        assert.equal(
          settleCalls,
          1
        );
        const second =
          await subject
            .processNextArenaScoringIntent({
              workerId:
                "scoring-worker-post-settle",
              now:
                new Date(
                  BASE_TIME
                    .getTime() +
                    36_010
                ),
              baseRetryMs: 1,
            });
        assert.equal(
          second.status,
          "PUBLISHED"
        );
        assert.equal(
          second.rankStatus,
          "SETTLED"
        );
        assert.equal(
          settleCalls,
          1
        );
      }
    );

    await check(
      "payload 오염 같은 terminal blocker는 즉시 DEAD이고 오류문에 비밀을 남기지 않음",
      async () => {
        const queued =
          await queuedIntent();
        await OutboxEvent
          .collection
          .updateOne(
            {
              _id:
                queued.event._id,
            },
            {
              $set: {
                "payload.answer":
                  "SECRET_ANSWER",
                "payload.email":
                  "student@example.com",
              },
            }
          );
        let called = false;
        const subject =
          createArenaMatchScoringOutboxService({
            ...dependencies({
              ...queued,
              onScore: () => {
                called = true;
              },
            }),
            now: () =>
              new Date(
                BASE_TIME
                  .getTime() +
                  40_000
              ),
          });
        const result =
          await subject
            .processNextArenaScoringIntent({
              workerId:
                "scoring-worker-d",
            });
        assert.equal(
          result.status,
          "DEAD"
        );
        assert.equal(
          result.retryable,
          false
        );
        assert.equal(
          called,
          false
        );
        assert.equal(
          result.event
            .lastError,
          "ARENA_SCORING_DISPATCH_FAILED:ARENA_SCORING_OUTBOX_INVALID"
        );
        assert.equal(
          /SECRET|student|example/i
            .test(
              result.event
                .lastError
            ),
          false
        );
      }
    );
  } finally {
    await mongoose
      .disconnect();
    await memory.stop();
  }

  const failed =
    checks.filter(
      (entry) =>
        !entry.passed
    );
  if (failed.length) {
    for (const entry of
      failed) {
      console.error(
        entry.error
      );
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `\n${checks.length}/${checks.length} Arena scoring outbox checks passed.`
  );
})();
