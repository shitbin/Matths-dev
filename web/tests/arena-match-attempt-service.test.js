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
  RankTakeoverMatch,
} = require(
  "../models/rankTakeoverMatchModel"
);
const {
  OutboxEvent,
} = require(
  "../models/outboxEventModel"
);
const {
  createArenaMatchAttemptService,
} = require(
  "../services/arenaMatchAttemptService"
);

const BASE_TIME =
  new Date(
    "2026-07-30T09:00:00.000Z"
  );
const BUILD_VERSION =
  "matths-ipad-1.8.0";
const SERVER_CAPABILITY =
  Symbol(
    "arena-scorer-test"
  );
const START_CAPABILITY =
  Symbol(
    "arena-rank-command-test"
  );

const checks = [];
let clock =
  new Date(
    BASE_TIME
  );
let serial = 0;

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

function service({
  heartbeatCapMs = 3000,
  policyResolver = true,
  activeSolveTimePolicyVersion =
    "ACTIVE_TIME_V2",
  heartbeatPolicyVersion =
    "ATTEMPT_HEARTBEAT_V1",
  serverCapability =
    SERVER_CAPABILITY,
  enqueueScoringIntent,
} = {}) {
  return createArenaMatchAttemptService({
    now: () =>
      new Date(
        clock
      ),
    serverCapability,
    startCapability:
      START_CAPABILITY,
    ...(enqueueScoringIntent
      ? {
          enqueueScoringIntent,
        }
      : {}),
    resolveHeartbeatPolicy:
      policyResolver
        ? async ({
            policyVersionId,
          }) => ({
            status:
              "PUBLISHED",
            version:
              activeSolveTimePolicyVersion,
            heartbeatPolicyVersion:
              heartbeatPolicyVersion,
            policyVersionId,
            maxRecognizedHeartbeatIntervalMs:
              heartbeatCapMs,
            networkReconnectGraceMs:
              30_000,
          })
        : undefined,
  });
}

async function fixture({
  matchStatus = "READY",
  packTimeLimitSeconds = 30,
  commonDeadlineMs = 60_000,
  startDeadlineMs = 45_000,
  suffix,
} = {}) {
  serial += 1;
  const label =
    suffix ||
    `attempt-${serial}`;
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
  const sharedStartedAt =
    new Date(
      BASE_TIME.getTime() -
        500_000
    );
  const startsBy =
    new Date(
      BASE_TIME.getTime() +
        startDeadlineMs
    );
  const submitsBy =
    new Date(
      BASE_TIME.getTime() +
        commonDeadlineMs
    );
  const matchId =
    `match-${label}`;

  await RankTakeoverMatch
    .collection
    .insertOne({
      _id: matchRecordId,
      matchId,
      policyVersionId,
      status: matchStatus,
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
      // A legacy shared value must never control either participant timer.
      startedAt:
        sharedStartedAt,
    });

  const pack = (
    role,
    userId,
    packId,
    sealCharacter
  ) => ({
    _id: packId,
    matchId,
    matchRecordId,
    participantRole: role,
    participantUserId:
      userId,
    packVersion:
      `PACK_${label}_${role}`,
    sealedContentHash:
      sealCharacter.repeat(
        64
      ),
    questionCount: 5,
    timeLimitSeconds:
      packTimeLimitSeconds,
    scoringPolicyVersion:
      "ARENA_SCORING_V4",
    answerKeyVersion:
      "PRIVATE_ANSWER_KEY_V9",
    answerVersionIds: [
      "PRIVATE_A1",
    ],
    privateMaterial: {
      answerKeys: [
        {
          correctAnswer:
            "MUST_NEVER_LEAK",
        },
      ],
    },
  });

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
    policyVersionId,
    challengerUserId,
    defenderUserId,
    challengerPackId,
    defenderPackId,
    sharedStartedAt,
    startsBy,
    submitsBy,
  };
}

function participantInput(
  value,
  role,
  extra = {}
) {
  const challenger =
    role ===
    "CHALLENGER";
  return {
    matchId:
      value.matchId,
    participantRole:
      role,
    participantUserId:
      challenger
        ? value
            .challengerUserId
        : value
            .defenderUserId,
    questionPackId:
      challenger
        ? value
            .challengerPackId
        : value
            .defenderPackId,
    clientBuildVersion:
      BUILD_VERSION,
    ...extra,
  };
}

function eventInput(
  value,
  role,
  clientEventId,
  eventType,
  payload
) {
  return participantInput(
    value,
    role,
    {
      clientEventId,
      eventType,
      payload,
    }
  );
}

async function startParticipant(
  subject,
  data,
  role,
  extra = {}
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
                data,
                role,
                extra
              ),
              observedAt:
                extra
                  .observedAt ??
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

async function publicPack(
  packId
) {
  return ArenaQuestionPack
    .findById(packId)
    .lean();
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

function collectKeys(
  value,
  result = []
) {
  if (
    value === null ||
    value === undefined
  ) {
    return result;
  }
  if (Array.isArray(value)) {
    value.forEach(
      (entry) =>
        collectKeys(
          entry,
          result
        )
    );
    return result;
  }
  if (
    typeof value !==
      "object" ||
    value instanceof Date ||
    value instanceof
      mongoose.Types.ObjectId
  ) {
    return result;
  }
  for (const [
    key,
    child,
  ] of Object.entries(value)) {
    result.push(
      key
        .replace(
          /[^a-zA-Z0-9]/g,
          ""
        )
        .toLowerCase()
    );
    collectKeys(
      child,
      result
    );
  }
  return result;
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
      "Attempt 시작은 Rank 명령 capability와 공유 Mongo transaction 없이는 fail-closed",
      async () => {
        const data =
          await fixture();
        const subject =
          service();
        const baseInput =
          participantInput(
            data,
            "CHALLENGER",
            {
              observedAt:
                new Date(
                  clock
                ),
            }
          );

        const missingCapability =
          await captureError(
            () =>
              subject
                .startAttempt(
                  baseInput
                )
          );
        assert.equal(
          missingCapability.code,
          "ARENA_ATTEMPT_SERVER_ONLY"
        );

        const wrongCapability =
          await captureError(
            () =>
              subject
                .startAttempt({
                  ...baseInput,
                  startCapability:
                    Symbol(
                      "wrong"
                    ),
                })
          );
        assert.equal(
          wrongCapability.code,
          "ARENA_ATTEMPT_SERVER_ONLY"
        );

        const missingSession =
          await captureError(
            () =>
              subject
                .startAttempt({
                  ...baseInput,
                  startCapability:
                    START_CAPABILITY,
                })
          );
        assert.equal(
          missingSession.code,
          "ARENA_ATTEMPT_TRANSACTION_REQUIRED"
        );
        const inactiveSession =
          await mongoose
            .startSession();
        try {
          const inactiveTransaction =
            await captureError(
              () =>
                subject
                  .startAttempt({
                    ...baseInput,
                    startCapability:
                      START_CAPABILITY,
                    session:
                      inactiveSession,
                  })
            );
          assert.equal(
            inactiveTransaction.code,
            "ARENA_ATTEMPT_TRANSACTION_REQUIRED"
          );
        } finally {
          await inactiveSession
            .endSession();
        }
        assert.equal(
          await ArenaMatchAttempt
            .countDocuments(),
          0
        );

        setClock(8000);
        const rankObservedAt =
          new Date(
            BASE_TIME.getTime() +
              1234
          );
        const started =
          await startParticipant(
            subject,
            data,
            "CHALLENGER",
            {
              observedAt:
                rankObservedAt,
            }
          );
        assert.ok(
          started.attemptId
        );
        assert.equal(
          started
            .startedAt
            .getTime(),
          rankObservedAt
            .getTime()
        );
      }
    );

    await check(
      "각 참가자의 첫 입장이 독립 타이머를 만들고 본인 Attempt만 본인 팩을 공개",
      async () => {
        const data =
          await fixture({
            packTimeLimitSeconds:
              10,
            commonDeadlineMs:
              20_000,
          });
        const subject =
          service();

        const challenger =
          await startParticipant(
            subject,
            data,
            "CHALLENGER"
          );
        assert.equal(
          challenger
            .startedAt
            .getTime(),
          BASE_TIME.getTime()
        );
        assert.equal(
          challenger
            .endsAt
            .getTime(),
          BASE_TIME.getTime() +
            10_000
        );
        assert.equal(
          challenger
            .networkReconnectGraceMs,
          30_000
        );
        assert.equal(
          challenger
            .activeSolveTimePolicyVersion,
          "ACTIVE_TIME_V2"
        );
        assert.equal(
          challenger
            .timingPolicyVersion,
          "ACTIVE_TIME_V2"
        );
        assert.equal(
          challenger
            .heartbeatPolicyVersion,
          "ATTEMPT_HEARTBEAT_V1"
        );

        const challengerPack =
          await publicPack(
            data
              .challengerPackId
          );
        const defenderPack =
          await publicPack(
            data
              .defenderPackId
          );
        assert.equal(
          challengerPack
            .privateMaterial,
          undefined
        );
        assert.equal(
          (
            await subject
              .assertPublicReleaseAllowed({
                pack:
                  challengerPack,
                participantUserId:
                  data
                    .challengerUserId,
              })
          ).allowed,
          false
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
                  "IN_PROGRESS",
                integrityState:
                  "CLEAR",
              },
            }
          );
        assert.equal(
          (
            await subject
              .assertPublicReleaseAllowed({
                pack:
                  challengerPack,
                participantUserId:
                  data
                    .challengerUserId,
              })
          ).allowed,
          true
        );
        assert.equal(
          (
            await subject
              .assertPublicReleaseAllowed({
                pack:
                  defenderPack,
                participantUserId:
                  data
                    .challengerUserId,
              })
          ).allowed,
          false
        );
        assert.equal(
          (
            await subject
              .assertPublicReleaseAllowed({
                pack:
                  defenderPack,
                participantUserId:
                  data
                    .defenderUserId,
              })
          ).allowed,
          false
        );

        setClock(7000);
        const defender =
          await startParticipant(
            subject,
            data,
            "DEFENDER"
          );
        assert.equal(
          defender
            .startedAt
            .getTime(),
          BASE_TIME.getTime() +
            7000
        );
        assert.equal(
          defender
            .endsAt
            .getTime(),
          BASE_TIME.getTime() +
            17_000
        );
        assert.notEqual(
          challenger
            .startedAt
            .getTime(),
          defender
            .startedAt
            .getTime()
        );
        assert.equal(
          (
            await subject
              .assertPublicReleaseAllowed({
                pack:
                  defenderPack,
                participantUserId:
                  data
                    .defenderUserId,
              })
          ).allowed,
          true
        );

        const storedMatch =
          await RankTakeoverMatch
            .collection
            .findOne({
              _id:
                data
                  .matchRecordId,
            });
        assert.equal(
          storedMatch.status,
          "IN_PROGRESS"
        );
        assert.equal(
          storedMatch
            .startedAt
            .getTime(),
          data
            .sharedStartedAt
            .getTime()
        );
      }
    );

    await check(
      "문제 공개는 IN_PROGRESS·CLEAR인 정확한 Match와 live own Attempt에만 허용",
      async () => {
        const data =
          await fixture();
        const subject =
          service();
        await startParticipant(
          subject,
          data,
          "CHALLENGER"
        );
        const pack =
          await publicPack(
            data
              .challengerPackId
          );
        const releaseAllowed =
          () =>
            subject
              .assertPublicReleaseAllowed({
                pack,
                participantUserId:
                  data
                    .challengerUserId,
              });

        for (const status of [
          "READY",
          "HELD",
          "RESOLVED",
          "SETTLED",
          "INVALID",
        ]) {
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
                  status,
                  integrityState:
                    status ===
                    "INVALID"
                      ? "INVALID"
                      : status ===
                          "HELD"
                        ? "HELD"
                        : "CLEAR",
                },
              }
            );
          assert.equal(
            (
              await releaseAllowed()
            ).allowed,
            false,
            `${status} must not release questions`
          );
        }

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
                  "IN_PROGRESS",
                integrityState:
                  "HELD",
              },
            }
          );
        assert.equal(
          (
            await releaseAllowed()
          ).allowed,
          false
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
                integrityState:
                  "CLEAR",
              },
            }
          );
        assert.equal(
          (
            await releaseAllowed()
          ).allowed,
          true
        );

        assert.equal(
          (
            await subject
              .assertPublicReleaseAllowed({
                pack: {
                  ...pack,
                  matchRecordId:
                    objectId(),
                },
                participantUserId:
                  data
                    .challengerUserId,
              })
          ).allowed,
          false
        );
      }
    );

    await check(
      "동시·반복 첫 입장은 역할당 하나의 동일한 서버 시작 기록으로 수렴",
      async () => {
        const data =
          await fixture();
        const subject =
          service();
        const results =
          await Promise.all(
            Array.from(
              {
                length: 6,
              },
              () =>
                startParticipant(
                  subject,
                  data,
                  "CHALLENGER"
                )
            )
          );
        assert.equal(
          new Set(
            results.map(
              (result) =>
                String(
                  result
                    .attemptId
                )
            )
          ).size,
          1
        );
        assert.equal(
          await ArenaMatchAttempt
            .countDocuments(),
          1
        );
      }
    );

    await check(
      "역할·사용자·봉인 팩·매치 상태가 다르면 Attempt를 만들지 않음",
      async () => {
        const data =
          await fixture();
        const subject =
          service();

        const wrongRole =
          await captureError(
            () =>
              startParticipant(
                subject,
                data,
                "DEFENDER",
                {
                  participantUserId:
                    data
                      .challengerUserId,
                  questionPackId:
                    data
                      .defenderPackId,
                }
              )
          );
        assert.equal(
          wrongRole.code,
          "ARENA_ATTEMPT_PARTICIPANT_MISMATCH"
        );

        const wrongPack =
          await captureError(
            () =>
              startParticipant(
                subject,
                data,
                "CHALLENGER",
                {
                  questionPackId:
                    data
                      .defenderPackId,
                }
              )
          );
        assert.equal(
          wrongPack.code,
          "ARENA_ATTEMPT_PACK_MISMATCH"
        );

        const closed =
          await fixture({
            matchStatus:
              "MATCHED",
            suffix:
              "not-ready",
          });
        const closedError =
          await captureError(
            () =>
              startParticipant(
                subject,
                closed,
                "CHALLENGER"
              )
          );
        assert.equal(
          closedError.code,
          "ARENA_MATCH_NOT_OPEN_FOR_ATTEMPT"
        );
        assert.equal(
          await ArenaMatchAttempt
            .countDocuments(),
          0
        );
      }
    );

    await check(
      "미게시 heartbeat 정책은 POLICY_PENDING이고 외부 트랜잭션 abort도 Attempt를 남기지 않음",
      async () => {
        const pendingData =
          await fixture({
            suffix:
              "policy-pending",
          });
        const pending =
          await captureError(
            () =>
              startParticipant(
                service({
                  policyResolver:
                    false,
                }),
                pendingData,
                "CHALLENGER"
              )
          );
        assert.equal(
          pending.code,
          "POLICY_PENDING"
        );
        assert.equal(
          pending.reasonCode,
          "HEARTBEAT_POLICY_RESOLVER_UNAVAILABLE"
        );

        for (const options of [
          {
            activeSolveTimePolicyVersion:
              "",
          },
          {
            heartbeatPolicyVersion:
              "",
          },
        ]) {
          const unpublished =
            await captureError(
              () =>
                startParticipant(
                  service(options),
                  pendingData,
                  "CHALLENGER"
                )
            );
          assert.equal(
            unpublished.code,
            "POLICY_PENDING"
          );
          assert.equal(
            unpublished.reasonCode,
            "HEARTBEAT_POLICY_UNPUBLISHED"
          );
        }

        const rollbackData =
          await fixture({
            suffix:
              "rollback",
          });
        const subject =
          service();
        const session =
          await mongoose
            .startSession();
        const marker =
          new Error(
            "abort-attempt"
          );
        const aborted =
          await captureError(
            () =>
              session
                .withTransaction(
                  async () => {
                    await subject
                      .startAttempt({
                        ...participantInput(
                          rollbackData,
                          "CHALLENGER"
                        ),
                        observedAt:
                          new Date(
                            clock
                          ),
                        startCapability:
                          START_CAPABILITY,
                        session,
                      });
                    throw marker;
                  }
                )
          );
        await session.endSession();
        assert.equal(
          aborted,
          marker
        );
        assert.equal(
          await ArenaMatchAttempt
            .countDocuments(),
          0
        );
      }
    );

    await check(
      "답 변경 이벤트는 정규화 저장되고 clientEventId 멱등·충돌과 서버 sequence를 강제",
      async () => {
        const data =
          await fixture();
        const subject =
          service();
        await startParticipant(
          subject,
          data,
          "CHALLENGER"
        );

        setClock(1000);
        await subject
          .recordEvent(
            eventInput(
              data,
              "CHALLENGER",
              "focus-1",
              "QUESTION_FOCUS",
              {
                questionSlot:
                  1,
              }
            )
          );

        setClock(2000);
        const answerInput =
          eventInput(
            data,
            "CHALLENGER",
            "answer-1",
            "ANSWER_CHANGED",
            {
              questionSlot:
                1,
              answer:
                "  Ａ   +   1  ",
            }
          );
        const repeated =
          await Promise.all(
            Array.from(
              {
                length: 5,
              },
              () =>
                subject
                  .recordEvent(
                    answerInput
                  )
            )
          );
        assert.equal(
          new Set(
            repeated.map(
              (event) =>
                String(
                  event.eventId
                )
            )
          ).size,
          1
        );
        assert.equal(
          repeated[0]
            .answerStored,
          true
        );
        assert.equal(
          JSON.stringify(
            repeated[0]
          ).includes(
            "A + 1"
          ),
          false
        );

        const conflict =
          await captureError(
            () =>
              subject
                .recordEvent({
                  ...answerInput,
                  payload: {
                    questionSlot:
                      1,
                    answer:
                      "DIFFERENT",
                  },
                })
          );
        assert.equal(
          conflict.code,
          "ARENA_ATTEMPT_EVENT_ID_CONFLICT"
        );

        setClock(10_000);
        await Promise.all(
          [
            "heartbeat-a",
            "heartbeat-b",
            "heartbeat-c",
          ].map(
            (clientEventId) =>
              subject
                .recordEvent(
                  eventInput(
                    data,
                    "CHALLENGER",
                    clientEventId,
                    "HEARTBEAT",
                    {}
                  )
                )
          )
        );
        const events =
          await ArenaMatchAttemptEvent
            .find({})
            .sort({
              serverSequence: 1,
            })
            .lean();
        assert.deepEqual(
          events.map(
            (event) =>
              event
                .serverSequence
          ),
          [
            1,
            2,
            3,
            4,
            5,
          ]
        );
        assert.equal(
          events[1]
            .normalizedAnswer,
          undefined
        );
        const privateAnswer =
          await ArenaMatchAttemptEvent
            .findOne({
              clientEventId:
                "answer-1",
            })
            .select(
              "+normalizedAnswer"
            )
            .lean();
        assert.equal(
          privateAnswer
            .normalizedAnswer
            .value,
          "A + 1"
        );
      }
    );

    await check(
      "heartbeat 유효 시간은 서버 간격과 게시된 cap만 사용하고 background 구간을 제외",
      async () => {
        const data =
          await fixture();
        const subject =
          service({
            heartbeatCapMs:
              2000,
          });
        await startParticipant(
          subject,
          data,
          "CHALLENGER"
        );

        setClock(10_000);
        const first =
          await subject
            .recordEvent(
              eventInput(
                data,
                "CHALLENGER",
                "heartbeat-first",
                "HEARTBEAT",
                {}
              )
            );
        assert.equal(
          first
            .recognizedActiveIntervalMs,
          2000
        );

        setClock(11_000);
        await subject
          .recordEvent(
            eventInput(
              data,
              "CHALLENGER",
              "background",
              "NETWORK_STATE",
              {
                networkState:
                  "BACKGROUND",
              }
            )
          );
        setClock(20_000);
        const inactive =
          await subject
            .recordEvent(
              eventInput(
                data,
                "CHALLENGER",
                "heartbeat-inactive",
                "HEARTBEAT",
                {}
              )
            );
        assert.equal(
          inactive
            .recognizedActiveIntervalMs,
          0
        );

        setClock(21_000);
        await subject
          .recordEvent(
            eventInput(
              data,
              "CHALLENGER",
              "foreground",
              "NETWORK_STATE",
              {
                networkState:
                  "FOREGROUND",
              }
            )
          );
        setClock(26_000);
        const active =
          await subject
            .recordEvent(
              eventInput(
                data,
                "CHALLENGER",
                "heartbeat-active",
                "HEARTBEAT",
                {}
              )
            );
        assert.equal(
          active
            .recognizedActiveIntervalMs,
          2000
        );
        const attempt =
          await ArenaMatchAttempt
            .findOne()
            .lean();
        assert.equal(
          attempt
            .recognizedHeartbeatActiveMs,
          4000
        );
      }
    );

    await check(
      "점수·정오·클라이언트 시간·IP·기기·결제 필드는 저장 전에 거부",
      async () => {
        const data =
          await fixture();
        const subject =
          service();
        const startError =
          await captureError(
            () =>
              subject
                .startAttempt({
                  ...participantInput(
                    data,
                    "CHALLENGER"
                  ),
                  startedAt:
                    BASE_TIME,
                })
          );
        assert.equal(
          startError.code,
          "ARENA_ATTEMPT_CLIENT_FIELD_FORBIDDEN"
        );
        await startParticipant(
          subject,
          data,
          "CHALLENGER"
        );

        const forbidden = [
          {
            calibratedScore:
              100,
          },
          {
            isCorrect: true,
          },
          {
            durationMs:
              999_999,
          },
          {
            ipAddress:
              "203.0.113.10",
          },
          {
            deviceId:
              "raw-device",
          },
          {
            paymentId:
              "raw-payment",
          },
          {
            answerKey:
              "secret",
          },
        ];
        for (
          let index = 0;
          index <
          forbidden.length;
          index += 1
        ) {
          const error =
            await captureError(
              () =>
                subject
                  .recordEvent(
                    eventInput(
                      data,
                      "CHALLENGER",
                      `forbidden-${index}`,
                      "HEARTBEAT",
                      forbidden[
                        index
                      ]
                    )
                  )
            );
          assert.equal(
            error.code,
            "ARENA_ATTEMPT_CLIENT_FIELD_FORBIDDEN"
          );
        }
        assert.equal(
          await ArenaMatchAttemptEvent
            .countDocuments(),
          0
        );
      }
    );

    await check(
      "개인 endsAt 이후 이벤트·공개는 차단하고 늦은 제출은 서버 마감 시각으로 봉인",
      async () => {
        const packLimited =
          await fixture({
            suffix:
              "pack-deadline",
            packTimeLimitSeconds:
              5,
            commonDeadlineMs:
              20_000,
          });
        const subject =
          service();
        const attempt =
          await startParticipant(
            subject,
            packLimited,
            "CHALLENGER"
          );
        assert.equal(
          attempt
            .endsAt
            .getTime(),
          BASE_TIME.getTime() +
            5000
        );

        setClock(5001);
        const eventError =
          await captureError(
            () =>
              subject
                .recordEvent(
                  eventInput(
                    packLimited,
                    "CHALLENGER",
                    "late-event",
                    "HEARTBEAT",
                    {}
                  )
                )
          );
        assert.equal(
          eventError.code,
          "ARENA_ATTEMPT_DEADLINE_PASSED"
        );
        const lateSubmission =
          await subject
            .submitAttempt(
              participantInput(
                packLimited,
                "CHALLENGER",
                {
                  submissionId:
                    "late-submission",
                }
              )
            );
        assert.equal(
          lateSubmission
            .submissionSource,
          "SERVER_DEADLINE"
        );
        assert.equal(
          lateSubmission
            .effectiveSubmittedAt
            .getTime(),
          attempt
            .endsAt
            .getTime()
        );
        const pack =
          await publicPack(
            packLimited
              .challengerPackId
          );
        assert.equal(
          (
            await subject
              .assertPublicReleaseAllowed({
                pack,
                participantUserId:
                  packLimited
                    .challengerUserId,
              })
          ).allowed,
          false
        );

        setClock(0);
        const commonLimited =
          await fixture({
            suffix:
              "common-deadline",
            packTimeLimitSeconds:
              50,
            commonDeadlineMs:
              3000,
            startDeadlineMs:
              2000,
          });
        const commonAttempt =
          await startParticipant(
            subject,
            commonLimited,
            "CHALLENGER"
          );
        assert.equal(
          commonAttempt
            .endsAt
            .getTime(),
          BASE_TIME.getTime() +
            3000
        );
      }
    );

    await check(
      "최종 제출은 최신 답만 불변 봉인하고 동일 submissionId 동시 재시도에 한 번만 반영",
      async () => {
        const data =
          await fixture();
        const subject =
          service();
        await startParticipant(
          subject,
          data,
          "CHALLENGER"
        );
        setClock(1000);
        await subject
          .recordEvent(
            eventInput(
              data,
              "CHALLENGER",
              "answer-old",
              "ANSWER_CHANGED",
              {
                questionSlot:
                  1,
                answer: "1",
              }
            )
          );
        setClock(2000);
        await subject
          .recordEvent(
            eventInput(
              data,
              "CHALLENGER",
              "answer-latest",
              "ANSWER_CHANGED",
              {
                questionSlot:
                  1,
                answer:
                  "  Ａ   +   2 ",
              }
            )
          );
        setClock(3000);
        await subject
          .recordEvent(
            eventInput(
              data,
              "CHALLENGER",
              "answer-clear",
              "ANSWER_CHANGED",
              {
                questionSlot:
                  2,
                answer: " ",
              }
            )
          );

        setClock(4000);
        const input =
          participantInput(
            data,
            "CHALLENGER",
            {
              submissionId:
                "submission-one",
            }
          );
        const submissions =
          await Promise.all(
            Array.from(
              {
                length: 5,
              },
              () =>
                subject
                  .submitAttempt(
                    input
                  )
            )
          );
        assert.equal(
          new Set(
            submissions.map(
              (submission) =>
                String(
                  submission
                    .submissionRecordId
                )
            )
          ).size,
          1
        );
        assert.equal(
          submissions.every(
            (submission) =>
              submission
                .answerCount ===
              2
          ),
          true
        );
        assert.equal(
          submissions[0]
            .submissionSource,
          "CLIENT"
        );
        assert.equal(
          submissions[0]
            .nonBlankAnswerCount,
          1
        );
        assert.equal(
          submissions[0]
            .effectiveSubmittedAt
            .getTime(),
          submissions[0]
            .submittedAt
            .getTime()
        );
        assert.equal(
          await ArenaMatchAttemptSubmission
            .countDocuments(),
          1
        );
        const scoringIntent =
          await OutboxEvent
            .findOne({
              eventType:
                "ARENA_ATTEMPT_SUBMITTED",
            })
            .lean();
        assert.ok(
          scoringIntent
        );
        assert.equal(
          await OutboxEvent
            .countDocuments({
              eventType:
                "ARENA_ATTEMPT_SUBMITTED",
            }),
          1
        );
        assert.deepEqual(
          Object.keys(
            scoringIntent
              .payload
          ).sort(),
          [
            "attemptId",
            "schemaVersion",
            "submissionRecordId",
          ]
        );
        assert.equal(
          JSON.stringify(
            scoringIntent
          ).includes(
            "A + 2"
          ),
          false
        );

        const conflict =
          await captureError(
            () =>
              subject
                .submitAttempt({
                  ...input,
                  submissionId:
                    "submission-two",
                })
          );
        assert.equal(
          conflict.code,
          "ARENA_ATTEMPT_SUBMISSION_ID_CONFLICT"
        );
        const postSubmitEvent =
          await captureError(
            () =>
              subject
                .recordEvent(
                  eventInput(
                    data,
                    "CHALLENGER",
                    "after-submit",
                    "HEARTBEAT",
                    {}
                  )
                )
          );
        assert.equal(
          postSubmitEvent.code,
          "ARENA_ATTEMPT_ALREADY_SUBMITTED"
        );
      }
    );

    await check(
      "채점 intent 저장이 실패하면 frozen Submission과 Attempt 상태도 함께 롤백",
      async () => {
        const data =
          await fixture();
        const marker =
          new Error(
            "scoring-intent-write-failed"
          );
        const subject =
          service({
            enqueueScoringIntent:
              async ({
                session,
              }) => {
                assert.equal(
                  session
                    .inTransaction(),
                  true
                );
                throw marker;
              },
          });
        await startParticipant(
          subject,
          data,
          "CHALLENGER"
        );
        setClock(1000);
        const failed =
          await captureError(
            () =>
              subject
                .submitAttempt(
                  participantInput(
                    data,
                    "CHALLENGER",
                    {
                      submissionId:
                        "atomic-outbox-submit",
                    }
                  )
                )
          );
        assert.equal(
          failed,
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

    await check(
      "최종 답·이벤트는 capability가 일치하는 in-process scorer에만 보이고 점수·정답키는 계산하지 않음",
      async () => {
        const data =
          await fixture();
        const subject =
          service();
        await startParticipant(
          subject,
          data,
          "CHALLENGER"
        );
        setClock(1000);
        await subject
          .recordEvent(
            eventInput(
              data,
              "CHALLENGER",
              "private-answer",
              "ANSWER_CHANGED",
              {
                questionSlot:
                  1,
                answer:
                  "  Ａ   +   2 ",
              }
            )
          );
        setClock(2000);
        const publicResult =
          await subject
            .submitAttempt(
              participantInput(
                data,
                "CHALLENGER",
                {
                  submissionId:
                    "private-submit",
                }
              )
            );
        assert.equal(
          JSON.stringify(
            publicResult
          ).includes(
            "A + 2"
          ),
          false
        );
        const storedPublic =
          await ArenaMatchAttemptSubmission
            .findOne()
            .lean();
        assert.equal(
          storedPublic
            .finalAnswers,
          undefined
        );
        const {
          clientBuildVersion:
            ignoredBuildVersion,
          ...scoringIdentity
        } =
          participantInput(
            data,
            "CHALLENGER"
          );
        assert.equal(
          ignoredBuildVersion,
          BUILD_VERSION
        );

        const denied =
          await captureError(
            () =>
              subject
                .getPrivateScoringProjection({
                  ...scoringIdentity,
                  serverCapability:
                    Symbol(
                      "wrong"
                    ),
                })
          );
        assert.equal(
          denied.code,
          "ARENA_ATTEMPT_SERVER_ONLY"
        );

        const projection =
          await subject
            .getPrivateScoringProjection({
              ...scoringIdentity,
              serverCapability:
                SERVER_CAPABILITY,
            });
        assert.deepEqual(
          projection
            .timingPolicySnapshot,
          {
            version:
              "ACTIVE_TIME_V2",
            heartbeatPolicyVersion:
              "ATTEMPT_HEARTBEAT_V1",
            maxRecognizedHeartbeatIntervalMs:
              3000,
            networkReconnectGraceMs:
              30_000,
          }
        );
        assert.equal(
          projection
            .finalAnswers[0]
            .normalizedAnswer
            .value,
          "A + 2"
        );
        assert.equal(
          projection
            .eventTimeline[0]
            .normalizedAnswer
            .value,
          "A + 2"
        );
        const keys =
          new Set(
            collectKeys(
              projection
            )
          );
        for (const key of [
          "answerkey",
          "answerkeyversion",
          "correctanswer",
          "correctness",
          "iscorrect",
          "score",
          "calibratedscore",
        ]) {
          assert.equal(
            keys.has(key),
            false,
            `${key} must not be present`
          );
        }
      }
    );

    await check(
      "Attempt/Event/Submission 감사 기록은 임의 삭제·교체·수정을 거부",
      async () => {
        const data =
          await fixture();
        const subject =
          service();
        await startParticipant(
          subject,
          data,
          "CHALLENGER"
        );
        setClock(1000);
        await subject
          .recordEvent(
            eventInput(
              data,
              "CHALLENGER",
              "immutable-answer",
              "ANSWER_CHANGED",
              {
                questionSlot:
                  1,
                answer: "42",
              }
            )
          );
        setClock(2000);
        await subject
          .submitAttempt(
            participantInput(
              data,
              "CHALLENGER",
              {
                submissionId:
                  "immutable-submit",
              }
            )
          );

        const mutations = [
          () =>
            ArenaMatchAttempt
              .updateOne(
                {},
                {
                  $set: {
                    status:
                      "IN_PROGRESS",
                  },
                }
              ),
          () =>
            ArenaMatchAttempt
              .replaceOne(
                {},
                {}
              ),
          () =>
            ArenaMatchAttempt
              .deleteOne({}),
          () =>
            ArenaMatchAttemptEvent
              .updateOne(
                {},
                {
                  $set: {
                    clientBuildVersion:
                      "tampered",
                  },
                }
              ),
          () =>
            ArenaMatchAttemptEvent
              .deleteOne({}),
          () =>
            ArenaMatchAttemptSubmission
              .updateOne(
                {},
                {
                  $set: {
                    answerCount:
                      0,
                  },
                }
              ),
          () =>
            ArenaMatchAttemptSubmission
              .deleteOne({}),
        ];
        for (const mutate of
          mutations) {
          const error =
            await captureError(
              mutate
            );
          assert.equal(
            error.code,
            "ARENA_ATTEMPT_RECORD_IMMUTABLE"
          );
        }
      }
    );

    await check(
      "외부 트랜잭션에서 이벤트 append가 abort되면 event와 sequence가 함께 롤백",
      async () => {
        const data =
          await fixture();
        const subject =
          service();
        await startParticipant(
          subject,
          data,
          "CHALLENGER"
        );
        setClock(1000);
        const session =
          await mongoose
            .startSession();
        const marker =
          new Error(
            "abort-event"
          );
        const aborted =
          await captureError(
            () =>
              session
                .withTransaction(
                  async () => {
                    await subject
                      .recordEvent({
                        ...eventInput(
                          data,
                          "CHALLENGER",
                          "rollback-event",
                          "HEARTBEAT",
                          {}
                        ),
                        session,
                      });
                    throw marker;
                  }
                )
          );
        await session.endSession();
        assert.equal(
          aborted,
          marker
        );
        assert.equal(
          await ArenaMatchAttemptEvent
            .countDocuments(),
          0
        );
        const attempt =
          await ArenaMatchAttempt
            .findOne()
            .lean();
        assert.equal(
          attempt
            .nextServerSequence,
          1
        );
        assert.equal(
          attempt
            .recognizedHeartbeatActiveMs,
          0
        );
      }
    );
  } finally {
    await mongoose.disconnect();
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
    `\n${checks.length}/${checks.length} Arena match attempt checks passed.`
  );
})();
