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
  ArenaQuestionTemplateSet,
  SCORING_TIE_BREAK_ORDER,
  computeTemplateContentHash,
} = require(
  "../models/arenaQuestionPackModel"
);
const {
  Problem,
} = require(
  "../models/matthsModel"
);
const {
  RankTakeoverMatch,
} = require(
  "../models/rankTakeoverMatchModel"
);
const {
  createArenaQuestionPackService,
} = require(
  "../services/arenaQuestionPackService"
);

const FIXED_NOW =
  new Date(
    "2026-07-30T09:00:00.000Z"
  );
const SEED_SECRET =
  "arena-question-pack-test-secret-2026-07-30-is-never-a-production-key";

const checks = [];
let serial = 0;

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

function objectId() {
  return new mongoose.Types
    .ObjectId();
}

function nextLabel(prefix) {
  serial += 1;
  return `${prefix}-${serial}`;
}

function scoringContract() {
  return {
    calibratedScoreMethodVersion:
      "CAL_SCORE_V3",
    advancedThresholdVersion:
      "ADVANCED_THRESHOLD_V2",
    activeSolveTimePolicyVersion:
      "ACTIVE_TIME_V2",
    extraTieBreakerPolicyVersion:
      "SUDDEN_DEATH_V2",
    answerComparisonPolicyVersion:
      "MATH_EQUIVALENCE_V4",
    tieBreakOrder: [
      ...SCORING_TIE_BREAK_ORDER,
    ],
  };
}

function equivalenceSlots() {
  return Array.from(
    {
      length: 5,
    },
    (_, index) => ({
      slot: index + 1,
      courseId:
        "mathematics-ii",
      unitId:
        index < 2
          ? "limits"
          : "differentiation",
      conceptIds: [
        index < 2
          ? "limit-application"
          : "derivative-application",
      ],
      scoreWeight:
        index < 3 ? 4 : 5,
      targetDifficulty:
        index < 3 ? 4 : 5,
      calibratedDifficulty:
        index < 3
          ? 4.15
          : 4.75,
      advanced:
        index >= 3,
    })
  );
}

function variant(
  version,
  prefix,
  slots
) {
  return {
    variantVersion: version,
    questions: slots.map(
      (slot) => ({
        slot: slot.slot,
        questionVersionId:
          `${prefix}-Q${slot.slot}-V7`,
        answerVersionId:
          `${prefix}-A${slot.slot}-V3`,
        courseId:
          slot.courseId,
        unitId:
          slot.unitId,
        conceptIds: [
          ...slot.conceptIds,
        ],
        stem:
          `${prefix} 봉인 문항 ${slot.slot}: 함수 조건을 만족하는 값을 구하세요.`,
        choices:
          slot.slot % 2 === 0
            ? [
                {
                  key: "A",
                  text: "1",
                },
                {
                  key: "B",
                  text: "2",
                },
                {
                  key: "C",
                  text: "3",
                },
              ]
            : undefined,
        inputMode:
          slot.slot % 2 === 0
            ? "MULTIPLE_CHOICE"
            : "SHORT_ANSWER",
        scoreWeight:
          slot.scoreWeight,
        targetDifficulty:
          slot.targetDifficulty,
        calibratedDifficulty:
          slot
            .calibratedDifficulty,
        advanced:
          slot.advanced,
        correctAnswer:
          `PRIVATE_ANSWER_${prefix}_${slot.slot}`,
        solution:
          `PRIVATE_SOLUTION_${prefix}_${slot.slot}`,
      })
    ),
  };
}

function templateSource({
  policyVersionId =
    objectId(),
  activeRanking = "SUB",
  matchType = "NORMAL",
  suffix = nextLabel(
    "template"
  ),
} = {}) {
  const slots =
    equivalenceSlots();
  const source = {
    templateSetVersion:
      `ARENA_SET_${suffix}`,
    status: "APPROVED",
    policyVersionId,
    activeRanking,
    matchType,
    curriculumVersion:
      "KR_2022_MATH_V5",
    eligibilityPolicyVersion:
      "COMMON_SCOPE_V2",
    eligibleSchoolGrades: [
      11,
      12,
    ],
    questionVersion:
      `QUESTION_BUNDLE_${suffix}`,
    answerKeyVersion:
      `ANSWER_BUNDLE_${suffix}`,
    difficultyCalibrationVersion:
      "IRT_CALIBRATION_2026_07",
    scoringPolicyVersion:
      "ARENA_SCORING_V2",
    questionCount: 5,
    timeLimitSeconds: 1500,
    scoringContract:
      scoringContract(),
    equivalenceSlots:
      slots,
    variants: [
      variant(
        "VARIANT_ALPHA_V7",
        `${suffix}_ALPHA`,
        slots
      ),
      variant(
        "VARIANT_BETA_V7",
        `${suffix}_BETA`,
        slots
      ),
    ],
    pairings: [
      {
        pairingVersion:
          "PAIR_ALPHA_BETA_V4",
        challengerVariantVersion:
          "VARIANT_ALPHA_V7",
        defenderVariantVersion:
          "VARIANT_BETA_V7",
      },
      {
        pairingVersion:
          "PAIR_BETA_ALPHA_V4",
        challengerVariantVersion:
          "VARIANT_BETA_V7",
        defenderVariantVersion:
          "VARIANT_ALPHA_V7",
      },
    ],
    approval: {
      approvedAt:
        new Date(
          "2026-07-29T09:00:00.000Z"
        ),
      approvedBy:
        "arena-content-review-board",
      reviewReference:
        `REVIEW-${suffix}`,
      contentHash: "",
    },
  };
  source.approval.contentHash =
    computeTemplateContentHash(
      source
    );
  return source;
}

async function createTemplate(
  options = {}
) {
  const source =
    templateSource(options);
  const template =
    await ArenaQuestionTemplateSet
      .create(source);
  return {
    source,
    template,
  };
}

function matchFor(
  template,
  {
    suffix = nextLabel(
      "match"
    ),
    status = "MATCHED",
  } = {}
) {
  return {
    _id: objectId(),
    matchId:
      `rank-takeover-${suffix}`,
    policyVersionId:
      template.policyVersionId,
    activeRanking:
      template.activeRanking,
    matchType:
      template.matchType,
    challengerUserId:
      objectId(),
    defenderUserId:
      objectId(),
    status,
  };
}

function service({
  serverCapability,
  assertPublicReleaseAllowed =
    async () => true,
} = {}) {
  return createArenaQuestionPackService(
    {
      seedSecret:
        SEED_SECRET,
      serverCapability,
      now: () => FIXED_NOW,
      assertParticipantEligibility:
        async () => true,
      assertPublicReleaseAllowed,
    }
  );
}

function sortIds(results) {
  return results.map(
    (result) => [
      String(
        result
          .challengerQuestionPackId
      ),
      String(
        result
          .defenderQuestionPackId
      ),
    ].join(":")
  );
}

async function run() {
  const replSet =
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
      replSet.getUri(),
      {
        dbName:
          "arena-question-pack-test",
      }
    );
    await Promise.all([
      ArenaQuestionPack.init(),
      ArenaQuestionTemplateSet
        .init(),
    ]);

    await check(
      "승인된 동등 Variant Set으로 양측 팩을 한 번에 봉인하고 Rank adapter 계약을 반환",
      async () => {
        const { template } =
          await createTemplate();
        const match =
          matchFor(template);
        const result =
          await service()
            .prepareQuestionPacks({
              match,
              now: FIXED_NOW,
            });

        assert.deepEqual(
          Object.keys(result).sort(),
          [
            "answerKeyVersion",
            "calibrationVersion",
            "challengerQuestionPackId",
            "defenderQuestionPackId",
            "questionVersion",
            "timeLimitSeconds",
          ].sort()
        );
        assert.equal(
          result.questionVersion,
          template.questionVersion
        );
        assert.equal(
          result.answerKeyVersion,
          template.answerKeyVersion
        );
        assert.equal(
          result.calibrationVersion,
          template
            .difficultyCalibrationVersion
        );
        assert.equal(
          result.timeLimitSeconds,
          template.timeLimitSeconds
        );
        assert.equal(
          result.timeLimitSeconds,
          template.timeLimitSeconds
        );

        const packs =
          await ArenaQuestionPack
            .find({
              matchId:
                match.matchId,
            })
            .select(
              "+answerKeyVersion +answerVersionIds +privateMaterial"
            )
            .lean();
        assert.equal(
          packs.length,
          2
        );
        for (const pack of packs) {
          assert.equal(
            pack.questionCount,
            5
          );
          assert.equal(
            pack
              .questionVersionIds
              .length,
            5
          );
          assert.equal(
            pack
              .answerVersionIds
              .length,
            5
          );
          assert.equal(
            pack
              .publicQuestions
              .length,
            5
          );
          assert.match(
            pack.randomSeedHash,
            /^[a-f0-9]{64}$/
          );
          assert.equal(
            pack.scoringPolicyVersion,
            "ARENA_SCORING_V2"
          );
          assert.equal(
            pack
              .difficultyCalibrationVersion,
            "IRT_CALIBRATION_2026_07"
          );
          assert.equal(
            pack.timeLimitSeconds,
            result.timeLimitSeconds
          );
          assert.equal(
            pack.timeLimitSeconds,
            result.timeLimitSeconds
          );
          assert.deepEqual(
            pack
              .scoringContract
              .tieBreakOrder,
            [
              ...SCORING_TIE_BREAK_ORDER,
            ]
          );
        }
        assert.equal(
          packs[0].pairSealHash,
          packs[1].pairSealHash
        );
        assert.equal(
          packs[0].randomSeedHash,
          packs[1].randomSeedHash
        );
        assert.equal(
          packs[0]
            .privateMaterial
            .rawRandomSeed,
          packs[1]
            .privateMaterial
            .rawRandomSeed
        );
        assert.equal(
          packs[0]
            .equivalenceContractHash,
          packs[1]
            .equivalenceContractHash
        );
      }
    );

    await check(
      "같은 matchId·role·version 재요청은 기존 봉인을 그대로 반환하고 재생성하지 않음",
      async () => {
        const { template } =
          await createTemplate();
        const match =
          matchFor(template);
        const api = service();
        const first =
          await api
            .prepareQuestionPacks({
              match,
              now: FIXED_NOW,
            });
        const replay =
          await api
            .prepareQuestionPacks({
              match: {
                ...match,
                status: "READY",
              },
              now: new Date(
                FIXED_NOW.getTime() +
                  10000
              ),
            });

        assert.equal(
          String(
            replay
              .challengerQuestionPackId
          ),
          String(
            first
              .challengerQuestionPackId
          )
        );
        assert.equal(
          String(
            replay
              .defenderQuestionPackId
          ),
          String(
            first
              .defenderQuestionPackId
          )
        );
        assert.equal(
          await ArenaQuestionPack
            .countDocuments({
              matchId:
                match.matchId,
            }),
          2
        );
      }
    );

    await check(
      "동시 봉인 요청도 challenger/defender 각 1개로 수렴",
      async () => {
        const { template } =
          await createTemplate();
        const match =
          matchFor(template);
        const api = service();
        const results =
          await Promise.all(
            Array.from(
              {
                length: 8,
              },
              () =>
                api
                  .prepareQuestionPacks({
                    match,
                    now: FIXED_NOW,
                  })
            )
          );
        assert.equal(
          new Set(
            sortIds(results)
          ).size,
          1
        );
        assert.equal(
          await ArenaQuestionPack
            .countDocuments({
              matchId:
                match.matchId,
            }),
          2
        );
      }
    );

    await check(
      "외부 accept transaction이 중단되면 두 팩 모두 롤백",
      async () => {
        const { template } =
          await createTemplate();
        const match =
          matchFor(template);
        const api = service();
        const session =
          await mongoose
            .startSession();
        const sentinel =
          new Error(
            "abort accept transaction"
          );
        const error =
          await captureError(
            async () => {
              try {
                await session
                  .withTransaction(
                    async () => {
                      await api
                        .prepareQuestionPacks({
                          match,
                          now:
                            FIXED_NOW,
                          session,
                        });
                      throw sentinel;
                    }
                  );
              } finally {
                await session
                  .endSession();
              }
            }
          );
        assert.equal(
          error,
          sentinel
        );
        assert.equal(
          await ArenaQuestionPack
            .countDocuments({
              matchId:
                match.matchId,
            }),
          0
        );
      }
    );

    await check(
      "난이도 보정 분포가 다른 승인 데이터는 hash가 맞아도 봉인 거부",
      async () => {
        const policyVersionId =
          objectId();
        const source =
          templateSource({
            policyVersionId,
          });
        source
          .variants[1]
          .questions[0]
          .calibratedDifficulty =
          3.25;
        source.approval
          .contentHash =
          computeTemplateContentHash(
            source
          );
        await ArenaQuestionTemplateSet
          .collection
          .insertOne(source);
        const invalidMatch =
          matchFor(source);

        const error =
          await captureError(
            () =>
              service()
                .prepareQuestionPacks({
                  match:
                    invalidMatch,
                  now:
                    FIXED_NOW,
                })
          );
        assert.equal(
          error.code,
          "QUESTION_PACK_EQUIVALENCE_MISMATCH"
        );
        assert.equal(
          await ArenaQuestionPack
            .countDocuments({
              matchId:
                invalidMatch
                  .matchId,
            }),
          0
        );
      }
    );

    await check(
      "채점 정책 버전이 미확정이면 임의 기본값 없이 POLICY_PENDING",
      async () => {
        const policyVersionId =
          objectId();
        const source =
          templateSource({
            policyVersionId,
          });
        delete source
          .scoringPolicyVersion;
        source.approval
          .contentHash =
          computeTemplateContentHash(
            source
          );
        await ArenaQuestionTemplateSet
          .collection
          .insertOne(source);

        const error =
          await captureError(
            () =>
              service()
                .prepareQuestionPacks({
                  match:
                    matchFor(
                      source
                    ),
                  now:
                    FIXED_NOW,
                })
          );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
        assert.equal(
          error.reasonCode,
          "QUESTION_PACK_POLICY_VERSION_UNRESOLVED"
        );
        assert.ok(
          error.details.fields
            .includes(
              "scoringPolicyVersion"
            )
        );
      }
    );

    await check(
      "기존 공개 Problem이 있어도 승인·문항·정답·보정 버전 증빙이 없으면 사용하지 않음",
      async () => {
        const policyVersionId =
          objectId();
        await Problem.create({
          externalId:
            nextLabel(
              "legacy-problem"
            ),
          curriculumId:
            "kr-2022",
          courseId:
            "mathematics-ii",
          unitId: "limits",
          conceptIds: [
            "limit-application",
          ],
          primaryConceptId:
            "limit-application",
          source: {
            type: "custom",
          },
          questionType:
            "short-answer",
          stem:
            "기존 공개 문제",
          correctAnswer: 7,
          difficulty: 5,
          score: 5,
          isPublished: true,
        });
        const source = {
          policyVersionId,
          activeRanking: "SUB",
          matchType: "NORMAL",
        };
        const error =
          await captureError(
            () =>
              service()
                .prepareQuestionPacks({
                  match:
                    matchFor(
                      source
                    ),
                  now:
                    FIXED_NOW,
                })
          );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
        assert.equal(
          error.reasonCode,
          "APPROVED_QUESTION_TEMPLATE_UNAVAILABLE"
        );
      }
    );

    await check(
      "사용자 projection은 정답·정답 버전·원시 seed를 제거하고 본인 팩만 공개",
      async () => {
        const capability =
          Symbol(
            "in-process-scorer"
          );
        const { template } =
          await createTemplate();
        const match =
          matchFor(template);
        let releaseGuardInput =
          null;
        const api =
          service({
            serverCapability:
              capability,
            assertPublicReleaseAllowed:
              async (input) => {
                releaseGuardInput =
                  input;
                return true;
              },
          });
        const prepared =
          await api
            .prepareQuestionPacks({
              match,
              now: FIXED_NOW,
            });
        const scoring =
          await api
            .getQuestionPackForScoring({
              questionPackId:
                prepared
                  .challengerQuestionPackId,
              matchId:
                match.matchId,
              serverCapability:
                capability,
            });
        const publicPack =
          await api
            .getPublicQuestionPack({
              questionPackId:
                prepared
                  .challengerQuestionPackId,
              participantUserId:
                match
                  .challengerUserId,
            });
        const serialized =
          JSON.stringify(
            publicPack
          );
        assert.deepEqual(
          Object.keys(
            releaseGuardInput
          ).sort(),
          [
            "pack",
            "participantUserId",
          ]
        );
        assert.deepEqual(
          Object.keys(
            releaseGuardInput
              .pack
          ).sort(),
          [
            "_id",
            "matchId",
            "matchRecordId",
            "participantRole",
            "participantUserId",
          ]
        );
        assert.equal(
          JSON.stringify(
            releaseGuardInput
          ).includes(
            "privateMaterial"
          ),
          false
        );

        assert.equal(
          publicPack
            .answerKeyVersion,
          undefined
        );
        assert.equal(
          publicPack
            .answerVersionIds,
          undefined
        );
        assert.equal(
          publicPack
            .rawRandomSeed,
          undefined
        );
        assert.ok(
          !serialized.includes(
            scoring
              .rawRandomSeed
          )
        );
        assert.ok(
          !serialized.includes(
            "PRIVATE_ANSWER_"
          )
        );
        assert.ok(
          !serialized.includes(
            "PRIVATE_SOLUTION_"
          )
        );
        assert.ok(
          !serialized.includes(
            "correctAnswer"
          )
        );
        assert.equal(
          publicPack
            .randomSeedHash,
          scoring.randomSeedHash
        );
        assert.equal(
          scoring.answerKeys
            .length,
          5
        );

        const opponentError =
          await captureError(
            () =>
              api
                .getPublicQuestionPack({
                  questionPackId:
                    prepared
                      .challengerQuestionPackId,
                  participantUserId:
                    match
                      .defenderUserId,
                })
          );
        assert.equal(
          opponentError.code,
          "QUESTION_PACK_NOT_FOUND"
        );

        const capabilityError =
          await captureError(
            () =>
              api
                .getQuestionPackForScoring({
                  questionPackId:
                    prepared
                      .challengerQuestionPackId,
                  matchId:
                    match.matchId,
                  serverCapability:
                    Symbol(
                      "wrong"
                    ),
                })
          );
        assert.equal(
          capabilityError.code,
          "SERVER_ONLY_QUESTION_PACK_ACCESS"
        );

        const releaseBlocked =
          createArenaQuestionPackService(
            {
              seedSecret:
                SEED_SECRET,
              serverCapability:
                capability,
              assertParticipantEligibility:
                async () =>
                  true,
              assertPublicReleaseAllowed:
                async () =>
                  false,
            }
          );
        const releaseError =
          await captureError(
            () =>
              releaseBlocked
                .getPublicQuestionPack({
                  questionPackId:
                    prepared
                      .challengerQuestionPackId,
                  participantUserId:
                    match
                      .challengerUserId,
                })
          );
        assert.equal(
          releaseError.code,
          "QUESTION_PACK_NOT_RELEASED"
        );

        const unguarded =
          createArenaQuestionPackService(
            {
              seedSecret:
                SEED_SECRET,
              serverCapability:
                capability,
              assertParticipantEligibility:
                async () =>
                  true,
            }
          );
        const unguardedError =
          await captureError(
            () =>
              unguarded
                .getPublicQuestionPack({
                  questionPackId:
                    prepared
                      .challengerQuestionPackId,
                  participantUserId:
                    match
                      .challengerUserId,
                })
          );
        assert.equal(
          unguardedError.code,
          "POLICY_PENDING"
        );
        assert.equal(
          unguardedError
            .reasonCode,
          "PARTICIPANT_ATTEMPT_RELEASE_GUARD_UNAVAILABLE"
        );
      }
    );

    await check(
      "상대만 시작한 매치에서는 내 문제 팩을 공개하지 않고 내 개인 시작 뒤에만 공개",
      async () => {
        const { template } =
          await createTemplate();
        const match =
          matchFor(template, {
            status:
              "IN_PROGRESS",
          });
        const prepared =
          await service()
            .prepareQuestionPacks({
              match,
              now: FIXED_NOW,
            });
        const fallbackApi =
          createArenaQuestionPackService(
            {
              seedSecret:
                SEED_SECRET,
              now: () =>
                FIXED_NOW,
              assertParticipantEligibility:
                async () =>
                  true,
            }
          );

        await RankTakeoverMatch
          .collection
          .insertOne({
            matchId:
              match.matchId,
            status:
              "IN_PROGRESS",
            startedAt:
              FIXED_NOW,
            challengerStartedAt:
              null,
            defenderStartedAt:
              FIXED_NOW,
            challengerUserId:
              match
                .challengerUserId,
            defenderUserId:
              match.defenderUserId,
            challengerQuestionPackId:
              prepared
                .challengerQuestionPackId,
            defenderQuestionPackId:
              prepared
                .defenderQuestionPackId,
          });

        const earlyError =
          await captureError(
            () =>
              fallbackApi
                .getPublicQuestionPack({
                  questionPackId:
                    prepared
                      .challengerQuestionPackId,
                  participantUserId:
                    match
                      .challengerUserId,
                })
          );
        assert.equal(
          earlyError.code,
          "QUESTION_PACK_NOT_RELEASED"
        );

        await RankTakeoverMatch
          .collection
          .updateOne(
            {
              matchId:
                match.matchId,
            },
            {
              $set: {
                challengerStartedAt:
                  FIXED_NOW,
              },
            }
          );
        const publicPack =
          await fallbackApi
            .getPublicQuestionPack({
              questionPackId:
                prepared
                  .challengerQuestionPackId,
              participantUserId:
                match
                  .challengerUserId,
            });
        assert.equal(
          String(
            publicPack
              .questionPackId
          ),
          String(
            prepared
              .challengerQuestionPackId
          )
        );
      }
    );

    await check(
      "봉인 팩과 승인 템플릿의 update/delete/save mutation을 차단",
      async () => {
        const { template } =
          await createTemplate();
        const match =
          matchFor(template);
        const prepared =
          await service()
            .prepareQuestionPacks({
              match,
              now: FIXED_NOW,
            });

        for (const mutation of [
          () =>
            ArenaQuestionPack
              .updateOne(
                {
                  _id:
                    prepared
                      .challengerQuestionPackId,
                },
                {
                  $set: {
                    questionVersion:
                      "TAMPERED",
                  },
                }
              ),
          () =>
            ArenaQuestionPack
              .deleteOne({
                _id:
                  prepared
                    .challengerQuestionPackId,
              }),
          () =>
            ArenaQuestionTemplateSet
              .updateOne(
                {
                  _id:
                    template._id,
                },
                {
                  $set: {
                    questionVersion:
                      "TAMPERED",
                  },
                }
              ),
          () =>
            ArenaQuestionPack
              .findOneAndReplace(
                {
                  _id:
                    prepared
                      .challengerQuestionPackId,
                },
                {
                  matchId:
                    match.matchId,
                }
              ),
          () =>
            ArenaQuestionPack
              .bulkWrite([
                {
                  updateOne: {
                    filter: {
                      _id:
                        prepared
                          .challengerQuestionPackId,
                    },
                    update: {
                      $set: {
                        questionVersion:
                          "TAMPERED",
                      },
                    },
                  },
                },
              ]),
        ]) {
          const error =
            await captureError(
              mutation
            );
          assert.equal(
            error.code,
            "ARENA_QUESTION_PACK_IMMUTABLE"
          );
        }

        const document =
          await ArenaQuestionPack
            .findById(
              prepared
                .challengerQuestionPackId
            );
        const documentDeleteError =
          await captureError(
            () =>
              document.deleteOne()
          );
        assert.equal(
          documentDeleteError.code,
          "ARENA_QUESTION_PACK_IMMUTABLE"
        );
        document.publicQuestions[0]
          .stem = "변조";
        const saveError =
          await captureError(
            () =>
              document.save()
          );
        assert.equal(
          saveError.code,
          "ARENA_QUESTION_PACK_IMMUTABLE"
        );

        const unchanged =
          await ArenaQuestionPack
            .findById(
              prepared
                .challengerQuestionPackId
            )
            .lean();
        assert.notEqual(
          unchanged
            .publicQuestions[0]
            .stem,
          "변조"
        );
      }
    );

    await check(
      "seed secret이 없으면 승인 팩이 있어도 안전하게 POLICY_PENDING",
      async () => {
        const { template } =
          await createTemplate();
        const unsafeService =
          createArenaQuestionPackService(
            {
              seedSecret: "",
              assertParticipantEligibility:
                async () =>
                  true,
            }
          );
        const error =
          await captureError(
            () =>
              unsafeService
                .prepareQuestionPacks({
                  match:
                    matchFor(
                      template
                    ),
                  now:
                    FIXED_NOW,
                })
          );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
        assert.equal(
          error.reasonCode,
          "QUESTION_PACK_SEED_SECRET_UNAVAILABLE"
        );
      }
    );
  } finally {
    await mongoose.disconnect();
    await replSet.stop();
  }

  const failed =
    checks.filter(
      (result) =>
        !result.passed
    );
  if (failed.length) {
    console.error(
      `\n${failed.length}/${checks.length} Arena question-pack checks failed`
    );
    for (const result of failed) {
      console.error(
        result.error?.stack ||
          result.error
      );
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `\n${checks.length}/${checks.length} Arena question-pack checks passed`
  );
}

run().catch((error) => {
  console.error(
    error?.stack || error
  );
  process.exitCode = 1;
});
