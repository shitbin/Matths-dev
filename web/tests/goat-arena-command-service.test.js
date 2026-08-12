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
  RankTakeoverMatch,
} = require(
  "../models/rankTakeoverMatchModel"
);
const {
  createGoatArenaCommandService,
} = require(
  "../services/goatArenaCommandService"
);

const BUILD_VERSION =
  "matths-ipad-2.0.0";
const checks = [];
let mongo;
let sequence = 0;

function objectId() {
  return new mongoose.Types
    .ObjectId();
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

async function check(
  label,
  run
) {
  try {
    await RankTakeoverMatch
      .collection
      .deleteMany({});
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

async function fixture() {
  sequence += 1;
  const challengerUserId =
    objectId();
  const defenderUserId =
    objectId();
  const outsiderUserId =
    objectId();
  const challengerQuestionPackId =
    objectId();
  const defenderQuestionPackId =
    objectId();
  const matchId =
    `goat-command-match-${sequence}`;
  await RankTakeoverMatch
    .collection
    .insertOne({
      _id: objectId(),
      matchId,
      status: "READY",
      participantUserIds: [
        challengerUserId,
        defenderUserId,
      ],
      challengerUserId,
      defenderUserId,
      challengerQuestionPackId,
      defenderQuestionPackId,
    });
  return {
    challengerQuestionPackId,
    challengerUserId,
    defenderQuestionPackId,
    defenderUserId,
    matchId,
    outsiderUserId,
  };
}

function auth(
  userId
) {
  return {
    userId,
  };
}

function commonInput(
  matchId,
  key = "goat-command-key"
) {
  return {
    matchId,
    idempotencyKey: key,
    clientBuildVersion:
      BUILD_VERSION,
  };
}

function publicPack(
  input,
  world
) {
  const challenger =
    String(
      input.questionPackId
    ) ===
    String(
      world
        .challengerQuestionPackId
    );
  return {
    questionPackId:
      input.questionPackId,
    matchId:
      world.matchId,
    participantRole:
      challenger
        ? "CHALLENGER"
        : "DEFENDER",
    packVersion:
      "PACK_PUBLIC_V1",
    questionVersion:
      "QUESTION_V1",
    questionVersionIds: [
      challenger
        ? "challenger-q1"
        : "defender-q1",
    ],
    randomSeedHash:
      "hash-only",
    questionCount: 1,
    timeLimitSeconds: 600,
    scoringContract: {
      tieBreakOrder: [
        "calibratedScore",
      ],
    },
    questions: [
      {
        slot: 1,
        stem: "1 + 1 = ?",
        choices: [
          {
            key: "A",
            text: "2",
          },
        ],
        inputMode:
          "MULTIPLE_CHOICE",
      },
    ],
  };
}

function injectedFacade(
  world
) {
  const calls = {
    rankAccept: [],
    rankReject: [],
    getAttempt: [],
    getPack: [],
    rankStart: [],
    recordEvent: [],
    startAttempt: [],
    submitAttempt: [],
    getSavedAnswers: [],
  };
  const attemptService = {
    assertPublicReleaseAllowed:
      async () => ({
        allowed: true,
      }),
    // 재개(resume) 계약 — 커맨드 서비스가 기동 시점에 존재를 검사한다.
    // 실제 서비스는 {questionSlot, answer, serverSequence, savedAt} 의
    // 동결 배열을 준다. 파사드는 빈 저장분(새 시도)으로 충분하다.
    getParticipantSavedAnswers:
      async (input) => {
        calls.getSavedAnswers.push(
          input
        );
        return Object.freeze([]);
      },
    getParticipantAttempt:
      async (input) => {
        calls.getAttempt.push(
          input
        );
        return {
          attemptId:
            objectId(),
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
          status:
            "IN_PROGRESS",
        };
      },
    recordEvent:
      async (input) => {
        calls.recordEvent.push(
          input
        );
        return {
          matchId:
            input.matchId,
          eventType:
            input.eventType,
          clientEventId:
            input.clientEventId,
        };
      },
    startAttempt:
      async (input) => {
        calls.startAttempt.push(
          input
        );
        return {
          attemptId:
            objectId(),
        };
      },
    submitAttempt:
      async (input) => {
        calls.submitAttempt.push(
          input
        );
        return {
          matchId:
            input.matchId,
          submissionId:
            input.submissionId,
        };
      },
  };
  const questionPackService = {
    getPublicQuestionPack:
      async (input) => {
        calls.getPack.push(
          input
        );
        return publicPack(
          input,
          world
        );
      },
    prepareQuestionPacks:
      async () => ({
        prepared: true,
      }),
  };
  const rankTakeoverService = {
    acceptChallenge:
      async (input) => {
        calls.rankAccept.push(
          input
        );
        await RankTakeoverMatch
          .collection
          .updateOne(
            {
              matchId:
                input.matchId,
            },
            {
              $set: {
                status:
                  "READY",
                integrityState:
                  "CLEAR",
              },
            }
          );
        return {
          challengerUserId:
            world
              .challengerUserId,
          defenderUserId:
            world
              .defenderUserId,
          answerKeyVersion:
            "must-not-leak",
          cycleId:
            objectId(),
        };
      },
    rejectChallenge:
      async (input) => {
        calls.rankReject.push(
          input
        );
        await RankTakeoverMatch
          .collection
          .updateOne(
            {
              matchId:
                input.matchId,
            },
            {
              $set: {
                status:
                  "CANCELLED",
                integrityState:
                  "CLEAR",
              },
            }
          );
        return {
          challengerUserId:
            world
              .challengerUserId,
          ledgerEntries: [
            "must-not-leak",
          ],
          policyVersion:
            "must-not-leak",
        };
      },
    startMatch:
      async (input) => {
        calls.rankStart.push(
          input
        );
        // Deliberately sensitive-looking internals prove that the facade
        // discards the Rank service document instead of returning it.
        return {
          matchId:
            input.matchId,
          defenderUserId:
            world.defenderUserId,
          answerKeyVersion:
            "must-not-leak",
          rawRandomSeed:
            "must-not-leak",
        };
      },
    submitResult:
      async () => {
        throw new Error(
          "must not be exposed"
        );
      },
  };
  const service =
    createGoatArenaCommandService({
      services: {
        attemptService,
        questionPackService,
        rankTakeoverService,
      },
    });
  return {
    calls,
    service,
  };
}

function assertDerivedContract(
  actual,
  {
    matchId,
    role,
    userId,
    questionPackId,
  }
) {
  assert.equal(
    actual.matchId,
    matchId
  );
  assert.equal(
    actual.participantRole,
    role
  );
  assert.equal(
    String(
      actual
        .participantUserId
    ),
    String(userId)
  );
  assert.equal(
    String(
      actual
        .questionPackId
    ),
    String(
      questionPackId
    )
  );
}

(async () => {
  try {
    mongo =
      await MongoMemoryReplSet
        .create({
          replSet: {
            count: 1,
            storageEngine:
              "wiredTiger",
          },
        });
    await mongoose.connect(
      mongo.getUri()
    );

    await check(
      "외부 사용자는 존재 여부를 숨긴 404를 받고 Rank 시작 명령도 실행되지 않음",
      async () => {
        const world =
          await fixture();
        const {
          calls,
          service,
        } =
          injectedFacade(
            world
          );
        const error =
          await captureError(
            () =>
              service
                .startParticipantMatch(
                  auth(
                    world
                      .outsiderUserId
                  ),
                  commonInput(
                    world
                      .matchId
                  )
                )
          );
        assert.equal(
          error.code,
          "GOAT_ARENA_MATCH_NOT_FOUND"
        );
        assert.equal(
          error.statusCode,
          404
        );
        assert.equal(
          calls
            .rankStart
            .length,
          0
        );
      }
    );

    await check(
      "시작은 Rank 권한을 거치고 신원·역할·팩을 서버 원장에서 독립 파생함",
      async () => {
        const world =
          await fixture();
        const {
          calls,
          service,
        } =
          injectedFacade(
            world
          );
        const result =
          await service
            .startParticipantMatch(
              auth(
                world
                  .challengerUserId
              ),
              commonInput(
                world.matchId,
                "start-command-1"
              )
            );

        assert.equal(
          calls
            .rankStart
            .length,
          1
        );
        assert.deepEqual(
          Object.keys(
            calls
              .rankStart[0]
          ).sort(),
          [
            "clientBuildVersion",
            "idempotencyKey",
            "matchId",
            "participantUserId",
          ]
        );
        assert.equal(
          String(
            calls
              .rankStart[0]
              .participantUserId
          ),
          String(
            world
              .challengerUserId
          )
        );
        assertDerivedContract(
          calls
            .getAttempt[0],
          {
            matchId:
              world.matchId,
            role:
              "CHALLENGER",
            userId:
              world
                .challengerUserId,
            questionPackId:
              world
                .challengerQuestionPackId,
          }
        );
        assert.equal(
          String(
            calls
              .getPack[0]
              .questionPackId
          ),
          String(
            world
              .challengerQuestionPackId
          )
        );
        const serialized =
          JSON.stringify(
            result
          );
        assert.equal(
          serialized.includes(
            String(
              world
                .defenderUserId
            )
          ),
          false
        );
        for (const secret of [
          "answerKeyVersion",
          "answerVersionIds",
          "rawRandomSeed",
          "answerKeys",
          "must-not-leak",
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
      "같은 경기의 두 역할은 각자에게 봉인된 서로 다른 문제팩으로 파생됨",
      async () => {
        const world =
          await fixture();
        const {
          calls,
          service,
        } =
          injectedFacade(
            world
          );
        const challenger =
          await service
            .getParticipantQuestionPack(
              auth(
                world
                  .challengerUserId
              ),
              commonInput(
                world.matchId,
                "read-challenger"
              )
            );
        const defender =
          await service
            .getParticipantQuestionPack(
              auth(
                world
                  .defenderUserId
              ),
              commonInput(
                world.matchId,
                "read-defender"
              )
            );

        assert.equal(
          challenger
            .participantRole,
          "CHALLENGER"
        );
        assert.equal(
          defender
            .participantRole,
          "DEFENDER"
        );
        assert.notEqual(
          String(
            challenger
              .questionPackId
          ),
          String(
            defender
              .questionPackId
          )
        );
        assert.equal(
          String(
            calls
              .getPack[0]
              .questionPackId
          ),
          String(
            world
              .challengerQuestionPackId
          )
        );
        assert.equal(
          String(
            calls
              .getPack[1]
              .questionPackId
          ),
          String(
            world
              .defenderQuestionPackId
          )
        );
      }
    );

    await check(
      "공개 입력의 사용자·역할·팩·지분·포지션 조작 필드는 모두 거부됨",
      async () => {
        const world =
          await fixture();
        const {
          calls,
          service,
        } =
          injectedFacade(
            world
          );
        for (const [
          field,
          value,
        ] of [
          [
            "userId",
            world
              .defenderUserId,
          ],
          [
            "participantUserId",
            world
              .defenderUserId,
          ],
          [
            "participantRole",
            "DEFENDER",
          ],
          [
            "questionPackId",
            world
              .defenderQuestionPackId,
          ],
          [
            "stakeDays",
            999,
          ],
          [
            "arenaPosition",
            1,
          ],
        ]) {
          const error =
            await captureError(
              () =>
                service
                  .startParticipantMatch(
                    auth(
                      world
                        .challengerUserId
                    ),
                    {
                      ...commonInput(
                        world.matchId,
                        `tamper-${field}`
                      ),
                      [field]:
                        value,
                    }
                  )
            );
          assert.equal(
            error.code,
            "GOAT_ARENA_COMMAND_INPUT_INVALID"
          );
          assert.deepEqual(
            error.details
              .fields,
            [field]
          );
        }
        assert.equal(
          calls
            .rankStart
            .length,
          0
        );
      }
    );

    await check(
      "수락은 인증 방어자만 수행하고 Rank 내부 결과를 버린 안전한 경기 상태만 반환함",
      async () => {
        const world =
          await fixture();
        await RankTakeoverMatch
          .collection
          .updateOne(
            {
              matchId:
                world.matchId,
            },
            {
              $set: {
                status:
                  "MATCHED",
                integrityState:
                  "CLEAR",
              },
            }
          );
        const {
          calls,
          service,
        } =
          injectedFacade(
            world
          );
        const result =
          await service
            .acceptParticipantChallenge(
              auth(
                world
                  .defenderUserId
              ),
              commonInput(
                world.matchId,
                "accept-command-1"
              )
            );

        assert.deepEqual(
          result,
          {
            match: {
              id:
                world.matchId,
              status:
                "READY",
              integrityState:
                "CLEAR",
            },
          }
        );
        assert.equal(
          calls
            .rankAccept
            .length,
          1
        );
        assert.deepEqual(
          Object.keys(
            calls
              .rankAccept[0]
          ).sort(),
          [
            "clientBuildVersion",
            "defenderUserId",
            "idempotencyKey",
            "matchId",
          ]
        );
        assert.equal(
          String(
            calls
              .rankAccept[0]
              .defenderUserId
          ),
          String(
            world
              .defenderUserId
          )
        );
        const serialized =
          JSON.stringify(
            result
          );
        for (const secret of [
          String(
            world
              .challengerUserId
          ),
          String(
            world
              .defenderUserId
          ),
          "answerKeyVersion",
          "cycleId",
          "must-not-leak",
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
      "수락·거절은 도전자·외부인·없는 경기 모두 같은 404로 숨김",
      async () => {
        const world =
          await fixture();
        await RankTakeoverMatch
          .collection
          .updateOne(
            {
              matchId:
                world.matchId,
            },
            {
              $set: {
                status:
                  "MATCHED",
              },
            }
          );
        const {
          calls,
          service,
        } =
          injectedFacade(
            world
          );
        const attempts = [
          () =>
            service
              .acceptParticipantChallenge(
                auth(
                  world
                    .challengerUserId
                ),
                commonInput(
                  world.matchId,
                  "challenger-accept"
                )
              ),
          () =>
            service
              .declineParticipantChallenge(
                auth(
                  world
                    .outsiderUserId
                ),
                {
                  ...commonInput(
                    world.matchId,
                    "outsider-decline"
                  ),
                  reasonCode:
                    "OTHER",
                }
              ),
          () =>
            service
              .acceptParticipantChallenge(
                auth(
                  world
                    .defenderUserId
                ),
                commonInput(
                  "missing-match",
                  "missing-accept"
                )
              ),
        ];
        for (const run of
          attempts) {
          const error =
            await captureError(
              run
            );
          assert.equal(
            error.code,
            "GOAT_ARENA_MATCH_NOT_FOUND"
          );
          assert.equal(
            error.statusCode,
            404
          );
        }
        assert.equal(
          calls
            .rankAccept
            .length,
          0
        );
        assert.equal(
          calls
            .rankReject
            .length,
          0
        );
      }
    );

    await check(
      "거절은 공개 enum을 서버 고정 사유로 매핑하고 임의 문구·상태 조작을 거부함",
      async () => {
        const world =
          await fixture();
        const {
          calls,
          service,
        } =
          injectedFacade(
            world
          );
        const mappings = [
          [
            "SCHEDULE_CONFLICT",
            "DEFENDER_SCHEDULE_CONFLICT",
          ],
          [
            "TECHNICAL_ISSUE",
            "DEFENDER_TECHNICAL_ISSUE",
          ],
          [
            "OTHER",
            "DEFENDER_OTHER",
          ],
        ];
        for (const [
          reasonCode,
          expectedReason,
        ] of mappings) {
          await RankTakeoverMatch
            .collection
            .updateOne(
              {
                matchId:
                  world.matchId,
              },
              {
                $set: {
                  status:
                    "MATCHED",
                  integrityState:
                    "CLEAR",
                },
              }
            );
          const result =
            await service
              .declineParticipantChallenge(
                auth(
                  world
                    .defenderUserId
                ),
                {
                  ...commonInput(
                    world.matchId,
                    `decline-${reasonCode}`
                  ),
                  reasonCode,
                }
              );
          assert.equal(
            calls
              .rankReject
              .at(-1)
              .reason,
            expectedReason
          );
          assert.deepEqual(
            result,
            {
              match: {
                id:
                  world.matchId,
                status:
                  "CANCELLED",
                integrityState:
                  "CLEAR",
              },
            }
          );
        }

        for (const input of [
          {
            ...commonInput(
              world.matchId,
              "free-reason"
            ),
            reason:
              "anything I want",
          },
          {
            ...commonInput(
              world.matchId,
              "bad-code"
            ),
            reasonCode:
              "CUSTOM_TEXT",
          },
          {
            ...commonInput(
              world.matchId,
              "forged-user"
            ),
            reasonCode:
              "OTHER",
            defenderUserId:
              world
                .defenderUserId,
          },
        ]) {
          const error =
            await captureError(
              () =>
                service
                  .declineParticipantChallenge(
                    auth(
                      world
                        .defenderUserId
                    ),
                    input
                  )
            );
          assert.equal(
            error.statusCode,
            400
          );
        }

        await RankTakeoverMatch
          .collection
          .updateOne(
            {
              matchId:
                world.matchId,
            },
            {
              $set: {
                status:
                  "IN_PROGRESS",
              },
            }
          );
        const stateError =
          await captureError(
            () =>
              service
                .acceptParticipantChallenge(
                  auth(
                    world
                      .defenderUserId
                  ),
                  commonInput(
                    world.matchId,
                    "late-accept"
                  )
                )
          );
        assert.equal(
          stateError.code,
          "GOAT_ARENA_MATCH_STATE_INVALID"
        );
        assert.equal(
          stateError.statusCode,
          409
        );
      }
    );

    await check(
      "이벤트와 제출은 공개 idempotency key를 내부 ID로 매핑하고 원장 계약만 전달함",
      async () => {
        const world =
          await fixture();
        const {
          calls,
          service,
        } =
          injectedFacade(
            world
          );
        await service
          .recordParticipantEvent(
            auth(
              world
                .defenderUserId
            ),
            {
              ...commonInput(
                world.matchId,
                "event-command-1"
              ),
              eventType:
                "HEARTBEAT",
              payload: {},
            }
          );
        await service
          .submitParticipantAttempt(
            auth(
              world
                .defenderUserId
            ),
            commonInput(
              world.matchId,
              "submission-command-1"
            )
          );

        assertDerivedContract(
          calls
            .recordEvent[0],
          {
            matchId:
              world.matchId,
            role:
              "DEFENDER",
            userId:
              world
                .defenderUserId,
            questionPackId:
              world
                .defenderQuestionPackId,
          }
        );
        assert.equal(
          calls
            .recordEvent[0]
            .clientEventId,
          "event-command-1"
        );
        assert.equal(
          calls
            .submitAttempt[0]
            .submissionId,
          "submission-command-1"
        );
        assert.equal(
          Object.prototype
            .hasOwnProperty.call(
              calls
                .submitAttempt[0],
              "scoredResult"
            ),
          false
        );
      }
    );

    await check(
      "모든 공개 동작은 문자열 idempotencyKey와 clientBuildVersion을 요구함",
      async () => {
        const world =
          await fixture();
        const {
          service,
        } =
          injectedFacade(
            world
          );
        for (const input of [
          {
            matchId:
              world.matchId,
            clientBuildVersion:
              BUILD_VERSION,
          },
          {
            matchId:
              world.matchId,
            idempotencyKey:
              "key",
          },
          {
            matchId:
              world.matchId,
            idempotencyKey:
              123,
            clientBuildVersion:
              BUILD_VERSION,
          },
        ]) {
          const error =
            await captureError(
              () =>
                service
                  .getParticipantQuestionPack(
                    auth(
                      world
                        .challengerUserId
                    ),
                    input
                  )
            );
          assert.equal(
            error.code,
            "GOAT_ARENA_COMMAND_INPUT_INVALID"
          );
          assert.equal(
            error.statusCode,
            400
          );
        }
      }
    );

    await check(
      "조합 계층은 하나의 비공개 Symbol로 시작·채점 capability를 묶음",
      async () => {
        const captured = {};
        const noOp =
          async () => true;
        const factories = {
          createArenaOperationalPolicyService:
            () => ({
              resolveActivity:
                noOp,
              resolveAssignmentPolicy:
                noOp,
              resolveDeadlinePolicy:
                noOp,
              resolveHeartbeatPolicy:
                noOp,
              resolveIntegrity:
                noOp,
              resolveMainTierStepGap:
                noOp,
              resolveSettlementEligibility:
                noOp,
            }),
          createArenaPairIntegrityService:
            () => ({
              assertPairIntegrity:
                noOp,
              resolveStrongRelation:
                noOp,
            }),
          createArenaRevengeRightService:
            () => ({
              consumeRevengeRight:
                noOp,
              resolveRevengeRight:
                noOp,
            }),
          createDefenderAssignmentService:
            (options) => {
              captured.defender =
                options;
              return {
                selectSubDefender:
                  noOp,
              };
            },
          createArenaMatchAttemptService:
            (options) => {
              captured.attempt =
                options;
              return {
                assertPublicReleaseAllowed:
                  noOp,
                getParticipantAttempt:
                  noOp,
                getParticipantSavedAnswers:
                  noOp,
                recordEvent:
                  noOp,
                startAttempt:
                  async (input) => {
                    captured
                      .attemptStart =
                      input;
                    return {
                      started: true,
                    };
                  },
                submitAttempt:
                  noOp,
              };
            },
          createArenaQuestionPackService:
            (options) => {
              captured.question =
                options;
              return {
                getPublicQuestionPack:
                  noOp,
                prepareQuestionPacks:
                  noOp,
              };
            },
          createRankTakeoverService:
            (options) => {
              captured.rank =
                options;
              return {
                acceptChallenge:
                  noOp,
                rejectChallenge:
                  noOp,
                startMatch:
                  noOp,
                submitResult:
                  noOp,
              };
            },
        };
        const service =
          createGoatArenaCommandService({
            factories,
            questionPackSeedSecret:
              "q".repeat(32),
            defenderAssignmentSeedSecret:
              "d".repeat(32),
          });
        assert.equal(
          typeof captured
            .attempt
            .serverCapability,
          "symbol"
        );
        assert.equal(
          captured
            .attempt
            .startCapability,
          captured
            .attempt
            .serverCapability
        );
        assert.equal(
          captured
            .question
            .serverCapability,
          captured
            .attempt
            .serverCapability
        );

        const participantId =
          objectId();
        const packId =
          objectId();
        const session = {
          inTransaction:
            () => true,
        };
        const observedAt =
          new Date(
            "2026-07-30T12:00:00.000Z"
          );
        await captured.rank
          .ensureParticipantAttemptStarted({
            match: {
              matchId:
                "private-capability-match",
            },
            participantUserId:
              participantId,
            participantRole:
              "DEFENDER",
            questionPackId:
              packId,
            clientBuildVersion:
              BUILD_VERSION,
            observedAt,
            session,
          });
        assert.equal(
          captured
            .attemptStart
            .startCapability,
          captured
            .attempt
            .serverCapability
        );
        assert.equal(
          captured
            .attemptStart
            .session,
          session
        );
        assert.equal(
          captured
            .attemptStart
            .observedAt,
          observedAt
        );
        assert.deepEqual(
          Object.keys(
            service
          ).sort(),
          [
            "acceptParticipantChallenge",
            "declineParticipantChallenge",
            "getParticipantQuestionPack",
            "recordParticipantEvent",
            "startParticipantMatch",
            "submitParticipantAttempt",
          ]
        );
        assert.equal(
          "submitResult" in
            service,
          false
        );
        assert.equal(
          "serverCapability" in
            service,
          false
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
    `\n${checks.length}/${checks.length} GOAT Arena command facade checks passed.`
  );
})();
