"use strict";

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
  ArenaQuestionPack,
} = require(
  "../models/arenaQuestionPackModel"
);
const {
  RankTakeoverAttempt:
    ArenaMatchAttempt,
  RankTakeoverAttemptEvent:
    ArenaMatchAttemptEvent,
  RankTakeoverAttemptSubmission:
    ArenaMatchAttemptSubmission,
} = require(
  "../models/arenaMatchAttemptModel"
);
const {
  OutboxEvent,
} = require(
  "../models/outboxEventModel"
);
const {
  RankTakeoverMatch,
} = require(
  "../models/rankTakeoverMatchModel"
);
const {
  createArenaMatchAttemptService,
  serverDeadlineSubmissionId,
} = require(
  "../services/arenaMatchAttemptService"
);
const {
  createArenaAttemptDeadlineService,
} = require(
  "../services/arenaAttemptDeadlineService"
);

const BASE_TIME =
  new Date(
    "2026-07-30T09:00:00.000Z"
  );
const BUILD_VERSION =
  "matths-ipad-1.8.0";
const START_CAPABILITY =
  Symbol(
    "arena-start-test"
  );
const DEADLINE_CAPABILITY =
  Symbol(
    "arena-deadline-test"
  );

let clock =
  new Date(
    BASE_TIME
  );
let serial = 0;
const checks = [];

function objectId() {
  return new mongoose.Types
    .ObjectId();
}

function setClock(
  offsetMs
) {
  clock =
    new Date(
      BASE_TIME.getTime() +
        offsetMs
    );
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

const collections = [
  OutboxEvent,
  ArenaMatchAttemptSubmission,
  ArenaMatchAttemptEvent,
  ArenaMatchAttempt,
  ArenaQuestionPack,
  RankTakeoverMatch,
];

async function clearData() {
  for (const model of
    collections) {
    try {
      await model.collection
        .deleteMany({});
    } catch (error) {
      if (
        error.codeName !==
        "NamespaceNotFound"
      ) {
        throw error;
      }
    }
  }
}

async function check(
  label,
  run
) {
  try {
    await clearData();
    clock =
      new Date(
        BASE_TIME
      );
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

async function fixture({
  timeLimitSeconds = 5,
} = {}) {
  serial += 1;
  const matchRecordId =
    objectId();
  const policyVersionId =
    objectId();
  const challengerUserId =
    objectId();
  const defenderUserId =
    objectId();
  const challengerPackId =
    objectId();
  const defenderPackId =
    objectId();
  const matchId =
    `deadline-match-${serial}`;
  const startsBy =
    new Date(
      BASE_TIME.getTime() +
        30_000
    );
  const submitsBy =
    new Date(
      BASE_TIME.getTime() +
        60_000
    );

  await RankTakeoverMatch
    .collection
    .insertOne({
      _id: matchRecordId,
      matchId,
      policyVersionId,
      status: "READY",
      integrityState:
        "CLEAR",
      challengerUserId,
      defenderUserId,
      participantUserIds: [
        challengerUserId,
        defenderUserId,
      ],
      challengerQuestionPackId:
        challengerPackId,
      defenderQuestionPackId:
        defenderPackId,
      startsBy,
      submitsBy,
    });

  function pack(
    role,
    userId,
    packId,
    seal
  ) {
    return {
      _id: packId,
      matchId,
      matchRecordId,
      participantRole: role,
      participantUserId:
        userId,
      packVersion:
        `PACK_${serial}_${role}`,
      sealedContentHash:
        seal.repeat(
          64
        ),
      questionCount: 5,
      timeLimitSeconds,
      scoringPolicyVersion:
        "ARENA_SCORING_V4",
      answerKeyVersion:
        "PRIVATE_V1",
      answerVersionIds: [
        "PRIVATE_A1",
      ],
      privateMaterial: {
        answerKeys: [],
      },
    };
  }

  await ArenaQuestionPack
    .collection
    .insertMany([
      pack(
        "CHALLENGER",
        challengerUserId,
        challengerPackId,
        "a"
      ),
      pack(
        "DEFENDER",
        defenderUserId,
        defenderPackId,
        "b"
      ),
    ]);

  return {
    matchId,
    matchRecordId,
    challengerUserId,
    challengerPackId,
  };
}

function participantInput(
  data,
  extra = {}
) {
  return {
    matchId:
      data.matchId,
    participantRole:
      "CHALLENGER",
    participantUserId:
      data
        .challengerUserId,
    questionPackId:
      data
        .challengerPackId,
    clientBuildVersion:
      BUILD_VERSION,
    ...extra,
  };
}

function attemptService({
  enqueueScoringIntent,
  now = () =>
    new Date(
      clock
    ),
} = {}) {
  return createArenaMatchAttemptService({
    now,
    serverCapability:
      DEADLINE_CAPABILITY,
    startCapability:
      START_CAPABILITY,
    deadlineCapability:
      DEADLINE_CAPABILITY,
    ...(enqueueScoringIntent
      ? {
          enqueueScoringIntent,
        }
      : {}),
    resolveHeartbeatPolicy:
      async ({
        policyVersionId,
      }) => ({
        status:
          "PUBLISHED",
        version:
          "ACTIVE_TIME_V2",
        heartbeatPolicyVersion:
          "ATTEMPT_HEARTBEAT_V1",
        policyVersionId,
        maxRecognizedHeartbeatIntervalMs:
          3000,
        networkReconnectGraceMs:
          30_000,
      }),
  });
}

function deadlineService(
  subject,
  errors = []
) {
  return createArenaAttemptDeadlineService({
    now: () =>
      new Date(
        clock
      ),
    attemptService:
      subject,
    deadlineCapability:
      DEADLINE_CAPABILITY,
    onError: (error) =>
      errors.push(error),
  });
}

async function startAttempt(
  subject,
  data
) {
  const session =
    await mongoose
      .startSession();
  let result;
  try {
    await session.withTransaction(
      async () => {
        result =
          await subject
            .startAttempt({
              ...participantInput(
                data
              ),
              observedAt:
                new Date(
                  clock
                ),
              startCapability:
                START_CAPABILITY,
              session,
            });
      }
    );
    return result;
  } finally {
    await session.endSession();
  }
}

async function answer(
  subject,
  data,
  clientEventId,
  questionSlot,
  value
) {
  return subject.recordEvent({
    ...participantInput(
      data
    ),
    clientEventId,
    eventType:
      "ANSWER_CHANGED",
    payload: {
      questionSlot,
      answer: value,
    },
  });
}

function deadlineInput(
  data,
  attemptId,
  capability =
    DEADLINE_CAPABILITY
) {
  const {
    clientBuildVersion:
      ignored,
    ...identity
  } =
    participantInput(
      data
    );
  assert.equal(
    ignored,
    BUILD_VERSION
  );
  return {
    ...identity,
    attemptId,
    deadlineCapability:
      capability,
  };
}

(async () => {
  let mongo;
  try {
    mongo =
      await MongoMemoryReplSet
        .create({
          replSet: {
            count: 1,
          },
        });
    await mongoose.connect(
      mongo.getUri()
    );
    await ArenaMatchAttempt
      .syncIndexes();
    await ArenaMatchAttemptEvent
      .syncIndexes();
    await ArenaMatchAttemptSubmission
      .syncIndexes();

    await check(
      "deadline 제출은 in-process capability만 허용하고 endsAt 정각 전에는 실행하지 않음",
      async () => {
        const data =
          await fixture();
        const subject =
          attemptService();
        const attempt =
          await startAttempt(
            subject,
            data
          );

        setClock(5000);
        const exactDeadline =
          await captureError(
            () =>
              subject
                .submitExpiredAttempt(
                  deadlineInput(
                    data,
                    attempt
                      .attemptId
                  )
                )
          );
        assert.equal(
          exactDeadline.code,
          "ARENA_ATTEMPT_DEADLINE_NOT_REACHED"
        );

        setClock(5001);
        const denied =
          await captureError(
            () =>
              subject
                .submitExpiredAttempt(
                  deadlineInput(
                    data,
                    attempt
                      .attemptId,
                    Symbol(
                      "wrong"
                    )
                  )
                )
          );
        assert.equal(
          denied.code,
          "ARENA_ATTEMPT_SERVER_ONLY"
        );
        const wrongIdentity =
          await captureError(
            () =>
              subject
                .submitExpiredAttempt(
                  deadlineInput(
                    data,
                    objectId()
                  )
                )
          );
        assert.equal(
          wrongIdentity.code,
          "ARENA_ATTEMPT_IDENTITY_CONFLICT"
        );
        assert.equal(
          await ArenaMatchAttemptSubmission
            .countDocuments(),
          0
        );
      }
    );

    await check(
      "늦은 client 제출은 endsAt 정각 이벤트까지 포함해 SERVER_DEADLINE으로 한 번 봉인",
      async () => {
        const data =
          await fixture();
        const subject =
          attemptService();
        const attempt =
          await startAttempt(
            subject,
            data
          );

        setClock(1000);
        await answer(
          subject,
          data,
          "blank-answer",
          1,
          " "
        );
        setClock(5000);
        await answer(
          subject,
          data,
          "exact-deadline-answer",
          2,
          "42"
        );
        setClock(5001);
        const lateEvent =
          await captureError(
            () =>
              answer(
                subject,
                data,
                "too-late-answer",
                3,
                "must-not-count"
              )
          );
        assert.equal(
          lateEvent.code,
          "ARENA_ATTEMPT_DEADLINE_PASSED"
        );
        assert.equal(
          await ArenaMatchAttemptSubmission
            .countDocuments(),
          1
        );
        const acceptedReplay =
          await answer(
            subject,
            data,
            "exact-deadline-answer",
            2,
            "42"
          );
        assert.equal(
          acceptedReplay
            .clientEventId,
          "exact-deadline-answer"
        );
        const rejectedAfterFreeze =
          await captureError(
            () =>
              answer(
                subject,
                data,
                "still-too-late",
                4,
                "must-not-count"
              )
          );
        assert.equal(
          rejectedAfterFreeze
            .code,
          "ARENA_ATTEMPT_DEADLINE_PASSED"
        );

        const submission =
          await subject
            .submitAttempt(
              participantInput(
                data,
                {
                  submissionId:
                    "client-too-late",
                }
              )
            );
        assert.equal(
          submission
            .submissionSource,
          "SERVER_DEADLINE"
        );
        assert.equal(
          submission
            .submissionId,
          serverDeadlineSubmissionId(
            attempt
              .attemptId
          )
        );
        assert.equal(
          submission
            .submittedAt
            .getTime(),
          attempt
            .endsAt
            .getTime()
        );
        assert.equal(
          submission
            .effectiveSubmittedAt
            .getTime(),
          attempt
            .endsAt
            .getTime()
        );
        assert.equal(
          submission
            .frozenAt
            .getTime(),
          BASE_TIME.getTime() +
            5001
        );
        assert.equal(
          submission
            .answerCount,
          2
        );
        assert.equal(
          submission
            .nonBlankAnswerCount,
          1
        );

        const stored =
          await ArenaMatchAttemptSubmission
            .findOne()
            .select(
              "+finalAnswers"
            )
            .lean();
        assert.deepEqual(
          stored.finalAnswers
            .map(
              (entry) =>
                entry
                  .questionSlot
            ),
          [1, 2]
        );
        assert.equal(
          await OutboxEvent
            .countDocuments({
              eventType:
                "ARENA_ATTEMPT_SUBMITTED",
            }),
          1
        );

        setClock(9000);
        const replay =
          await subject
            .submitAttempt(
              participantInput(
                data,
                {
                  submissionId:
                    "different-late-client-id",
                }
              )
            );
        assert.equal(
          String(
            replay
              .submissionRecordId
          ),
          String(
            submission
              .submissionRecordId
          )
        );
      }
    );

    await check(
      "두 deadline worker와 늦은 client가 경합해도 Submission·채점 intent가 하나로 수렴",
      async () => {
        const data =
          await fixture();
        const subject =
          attemptService();
        await startAttempt(
          subject,
          data
        );
        setClock(1000);
        await answer(
          subject,
          data,
          "race-answer",
          1,
          "7"
        );
        setClock(5001);

        const workerOne =
          deadlineService(
            subject
          );
        const workerTwo =
          deadlineService(
            subject
          );
        const outcomes =
          await Promise.all([
            workerOne
              .runOnce(),
            workerTwo
              .runOnce(),
            subject
              .submitAttempt(
                participantInput(
                  data,
                  {
                    submissionId:
                      "late-race-client",
                  }
                )
              ),
          ]);

        assert.equal(
          outcomes[0]
            .failedCount,
          0
        );
        assert.equal(
          outcomes[1]
            .failedCount,
          0
        );
        assert.equal(
          await ArenaMatchAttemptSubmission
            .countDocuments(),
          1
        );
        assert.equal(
          await OutboxEvent
            .countDocuments({
              eventType:
                "ARENA_ATTEMPT_SUBMITTED",
            }),
          1
        );
        const stored =
          await ArenaMatchAttemptSubmission
            .findOne()
            .lean();
        assert.equal(
          stored
            .submissionSource,
          "SERVER_DEADLINE"
        );
        assert.equal(
          outcomes[2]
            .submissionId,
          stored.submissionId
        );
      }
    );

    await check(
      "deadline 이후 오염 이벤트는 frozen answers와 채점 projection에서 제외",
      async () => {
        const data =
          await fixture();
        const subject =
          attemptService();
        const started =
          await startAttempt(
            subject,
            data
          );
        setClock(1000);
        await answer(
          subject,
          data,
          "trusted-before-deadline",
          1,
          "3"
        );
        const attempt =
          await ArenaMatchAttempt
            .findById(
              started
                .attemptId
            )
            .lean();
        await ArenaMatchAttemptEvent
          .collection
          .insertOne({
            _id: objectId(),
            attemptId:
              attempt._id,
            matchId:
              attempt.matchId,
            participantRole:
              attempt
                .participantRole,
            participantUserId:
              attempt
                .participantUserId,
            questionPackId:
              attempt
                .questionPackId,
            clientEventId:
              "rogue-after-deadline",
            requestFingerprint:
              "c".repeat(64),
            eventType:
              "ANSWER_CHANGED",
            serverSequence: 2,
            serverOccurredAt:
              new Date(
                BASE_TIME.getTime() +
                  5001
              ),
            clientBuildVersion:
              BUILD_VERSION,
            questionSlot: 2,
            normalizedAnswer: {
              kind: "TEXT",
              value:
                "must-not-freeze",
            },
            networkState: null,
            recognizedActiveIntervalMs:
              0,
            createdAt:
              new Date(
                BASE_TIME.getTime() +
                  5001
              ),
          });
        await ArenaMatchAttempt
          .collection
          .updateOne(
            {
              _id:
                attempt._id,
            },
            {
              $set: {
                nextServerSequence:
                  3,
              },
            }
          );

        setClock(6000);
        await subject
          .submitExpiredAttempt(
            deadlineInput(
              data,
              started
                .attemptId
            )
          );
        const stored =
          await ArenaMatchAttemptSubmission
            .findOne()
            .select(
              "+finalAnswers"
            )
            .lean();
        assert.deepEqual(
          stored.finalAnswers
            .map(
              (entry) =>
                entry
                  .questionSlot
            ),
          [1]
        );
        assert.equal(
          stored
            .lastAcceptedServerSequence,
          1
        );
        const {
          attemptId:
            ignoredAttemptId,
          deadlineCapability:
            ignoredCapability,
          ...identity
        } =
          deadlineInput(
            data,
            started
              .attemptId
          );
        assert.ok(
          ignoredAttemptId
        );
        assert.ok(
          ignoredCapability
        );
        const projection =
          await subject
            .getPrivateScoringProjection({
              ...identity,
              serverCapability:
                DEADLINE_CAPABILITY,
            });
        assert.deepEqual(
          projection
            .eventTimeline
            .map(
              (event) =>
                event
                  .serverSequence
            ),
          [1]
        );
      }
    );

    await check(
      "정각 client 제출과 deadline worker 경합도 동일 Submission으로 수렴",
      async () => {
        const data =
          await fixture();
        const starter =
          attemptService();
        await startAttempt(
          starter,
          data
        );
        setClock(1000);
        await answer(
          starter,
          data,
          "manual-worker-race-answer",
          1,
          "11"
        );

        const manualSubject =
          attemptService({
            now: () =>
              new Date(
                BASE_TIME.getTime() +
                  5000
              ),
          });
        const deadlineSubject =
          attemptService({
            now: () =>
              new Date(
                BASE_TIME.getTime() +
                  5001
              ),
          });
        setClock(5001);
        const worker =
          deadlineService(
            deadlineSubject
          );
        const [
          workerResult,
          manualResult,
        ] =
          await Promise.all([
            worker.runOnce(),
            manualSubject
              .submitAttempt(
                participantInput(
                  data,
                  {
                    submissionId:
                      "manual-at-deadline",
                  }
                )
              ),
          ]);

        assert.equal(
          workerResult
            .failedCount,
          0
        );
        assert.equal(
          await ArenaMatchAttemptSubmission
            .countDocuments(),
          1
        );
        assert.equal(
          await OutboxEvent
            .countDocuments({
              eventType:
                "ARENA_ATTEMPT_SUBMITTED",
            }),
          1
        );
        const stored =
          await ArenaMatchAttemptSubmission
            .findOne()
            .lean();
        assert.equal(
          String(
            manualResult
              .submissionRecordId
          ),
          String(stored._id)
        );
        assert.equal(
          [
            "CLIENT",
            "SERVER_DEADLINE",
          ].includes(
            stored
              .submissionSource
          ),
          true
        );
      }
    );

    await check(
      "participant attempt 조회는 누락된 background 봉인을 lazy finalize",
      async () => {
        const data =
          await fixture();
        const subject =
          attemptService();
        const started =
          await startAttempt(
            subject,
            data
          );
        setClock(1000);
        await answer(
          subject,
          data,
          "lazy-read-answer",
          1,
          "5"
        );
        setClock(5001);
        const {
          attemptId:
            ignoredAttemptId,
          deadlineCapability:
            ignoredCapability,
          ...identity
        } =
          deadlineInput(
            data,
            started
              .attemptId
          );
        assert.ok(
          ignoredAttemptId
        );
        assert.ok(
          ignoredCapability
        );
        const read =
          await subject
            .getParticipantAttempt(
              identity
            );

        assert.equal(
          read.status,
          "SUBMITTED"
        );
        assert.equal(
          await ArenaMatchAttemptSubmission
            .countDocuments(),
          1
        );
        assert.equal(
          await OutboxEvent
            .countDocuments({
              eventType:
                "ARENA_ATTEMPT_SUBMITTED",
            }),
          1
        );
      }
    );

    await check(
      "question-pack read도 만료 attempt를 먼저 봉인하고 공개를 거절",
      async () => {
        const data =
          await fixture();
        const subject =
          attemptService();
        await startAttempt(
          subject,
          data
        );
        setClock(5001);
        const pack =
          await ArenaQuestionPack
            .findById(
              data
                .challengerPackId
            )
            .lean();
        const release =
          await subject
            .assertPublicReleaseAllowed({
              pack,
              participantUserId:
                data
                  .challengerUserId,
            });

        assert.equal(
          release.allowed,
          false
        );
        assert.equal(
          release.reasonCode,
          "MATCH_NOT_PUBLICLY_RELEASABLE"
        );
        assert.equal(
          await ArenaMatchAttemptSubmission
            .countDocuments(),
          1
        );
      }
    );

    await check(
      "이미 시작된 attempt는 match가 terminal이어도 deadline 봉인을 완료",
      async () => {
        const data =
          await fixture();
        const subject =
          attemptService();
        await startAttempt(
          subject,
          data
        );
        await RankTakeoverMatch
          .collection
          .updateOne(
            {
              _id:
                data
                  .matchRecordId,
            },
            {
              $set: {
                status:
                  "RESOLVED",
              },
            }
          );
        setClock(5001);
        const result =
          await deadlineService(
            subject
          )
            .runOnce();

        assert.equal(
          result.failedCount,
          0
        );
        assert.equal(
          result.submittedCount,
          1
        );
        assert.equal(
          await ArenaMatchAttemptSubmission
            .countDocuments(),
          1
        );
      }
    );

    await check(
      "worker는 endsAt이 지난 IN_PROGRESS만 스캔하고 No-show 결과를 임의 생성하지 않음",
      async () => {
        const data =
          await fixture();
        const subject =
          attemptService();
        await startAttempt(
          subject,
          data
        );
        const worker =
          deadlineService(
            subject
          );

        setClock(5000);
        const atDeadline =
          await worker
            .runOnce();
        assert.equal(
          atDeadline
            .scannedCount,
          0
        );

        setClock(5001);
        const expired =
          await worker
            .runOnce();
        assert.equal(
          expired
            .scannedCount,
          1
        );
        assert.equal(
          expired
            .submittedCount,
          1
        );
        const match =
          await RankTakeoverMatch
            .findById(
              data
                .matchRecordId
            )
            .lean();
        assert.equal(
          match.status,
          "READY"
        );
      }
    );

    await check(
      "채점 intent 저장 실패 시 worker deadline 봉인도 같은 transaction에서 롤백",
      async () => {
        const data =
          await fixture();
        const marker =
          new Error(
            "intent-failed"
          );
        const subject =
          attemptService({
            enqueueScoringIntent:
              async () => {
                throw marker;
              },
          });
        await startAttempt(
          subject,
          data
        );
        setClock(5001);
        const errors = [];
        const worker =
          deadlineService(
            subject,
            errors
          );
        const result =
          await worker
            .runOnce();

        assert.equal(
          result.failedCount,
          1
        );
        assert.equal(
          errors[0],
          marker
        );
        assert.equal(
          await ArenaMatchAttemptSubmission
            .countDocuments(),
          0
        );
        assert.equal(
          await OutboxEvent
            .countDocuments(),
          0
        );
        const attempt =
          await ArenaMatchAttempt
            .findOne()
            .lean();
        assert.equal(
          attempt.status,
          "IN_PROGRESS"
        );
        assert.equal(
          attempt
            .submissionRecordId,
          null
        );
      }
    );
  } finally {
    await mongoose
      .disconnect();
    if (mongo) {
      await mongo.stop();
    }
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
    `\n${checks.length}/${checks.length} Arena attempt deadline checks passed.`
  );
})();
