const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
  MongoMemoryReplSet,
} = require("mongodb-memory-server");

const {
  AccessCycle,
} = require("../models/accessCycleModel");
const {
  ArenaSeason,
} = require("../models/arenaSeasonModel");
const {
  LearningEvent,
} = require("../models/matthsModel");
const {
  PolicyVersion,
} = require("../models/policyVersionModel");
const {
  RankTakeoverMatch,
} = require(
  "../models/rankTakeoverMatchModel"
);
const {
  createArenaOperationalPolicyService,
} = require(
  "../services/arenaOperationalPolicyService"
);
const {
  policyReadiness,
} = require(
  "../services/policyVersionService"
);

const NOW = new Date(
  "2026-07-10T03:00:00.000Z"
);
const MINUTE_MS = 60_000;
const checks = [];
let sequence = 1;

function objectId() {
  return new mongoose.Types.ObjectId();
}

async function check(label, run) {
  try {
    await run();
    checks.push({ label, passed: true });
    console.log(`  ✓ ${label}`);
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

async function captureError(run) {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error("expected an error");
}

function assertPending(
  error,
  blocker
) {
  assert.equal(
    error.code,
    "POLICY_PENDING"
  );
  if (blocker) {
    assert.equal(
      error.details?.blocker,
      blocker
    );
  }
  assert.deepEqual(
    Object.keys(
      error.details || {}
    ),
    ["blocker"]
  );
}

function publishedPolicyFacts(
  overrides = {}
) {
  return {
    version:
      `operational-v${sequence++}`,
    effectiveFrom: new Date(
      "2026-07-01T00:00:00.000Z"
    ),
    effectiveTo: new Date(
      "2026-08-01T00:00:00.000Z"
    ),
    publishedAt: new Date(
      "2026-06-30T00:00:00.000Z"
    ),
    defenseAssignmentAlpha: 1,
    targetDefenseGapHours: 24,
    deterministicAuditJitterMin:
      0.9,
    deterministicAuditJitterMax:
      1.1,
    subDefenderMinHigherPositionGap:
      1,
    subDefenderMaxHigherPositionGap:
      20,
    subRankRangePolicyVersion:
      "SUB_RANGE_V1",
    recentActivityLookbackMinutes:
      60,
    recentActivityMinEventCount: 2,
    recentActivityWeightVersion:
      "EVENT_COUNT_RATIO_V1",
    settlementPolicyVersion:
      "SETTLEMENT_V1",
    deadlinePolicyVersion:
      "DEADLINE_V1",
    startDeadlineMinutes: 10,
    submissionDeadlineMinutes: 60,
    questionPolicyVersion:
      "QUESTION_PACK_V1",
    strongRelationPolicyVersion:
      "PAIR_INTEGRITY_V1",
    integrityPolicyVersion:
      "INTEGRITY_HOLD_V1",
    arenaTierStepMappingVersion:
      "MAIN_NINE_STEP_V1",
    arenaTierStepPositionCeilings:
      [
        10,
        20,
        30,
        40,
        50,
        60,
        70,
        80,
        90,
      ],
    attemptHeartbeatPolicyVersion:
      "ATTEMPT_HEARTBEAT_V1",
    activeSolveTimePolicyVersion:
      "ACTIVE_TIME_V2",
    maxRecognizedHeartbeatIntervalMs:
      15_000,
    networkReconnectGraceMs:
      30_000,
    ...overrides,
  };
}

async function clearData() {
  await LearningEvent.deleteMany(
    {}
  );
  await AccessCycle.deleteMany({});
  await RankTakeoverMatch
    .collection.deleteMany({});
  await ArenaSeason.deleteMany({});
  await PolicyVersion.deleteMany(
    {}
  );
}

async function createWorld(
  policyOverrides = {}
) {
  const policy =
    await PolicyVersion.create(
      publishedPolicyFacts(
        policyOverrides
      )
    );
  const season =
    await ArenaSeason.create({
      seasonId:
        `operational-season-${sequence++}`,
      title:
        "Operational policy test season",
      startsAt: new Date(
        "2026-07-01T00:00:00.000Z"
      ),
      endsAt: new Date(
        NOW.getTime() +
          4 * 60 * MINUTE_MS
      ),
      status: "SCHEDULED",
      policyVersionId: policy._id,
    });
  const challengerUserId =
    objectId();
  const candidateUserId =
    objectId();
  const deadline =
    new Date(
      NOW.getTime() +
        2 * 60 * MINUTE_MS
    );
  const challengerCycle =
    await AccessCycle.create({
      userId:
        challengerUserId,
      paymentOrderId:
        objectId(),
      policyVersionId:
        policy._id,
      status: "SUB_ACTIVE",
      activeRanking: "SUB",
      startedAt: new Date(
        "2026-07-01T00:00:00.000Z"
      ),
      day30CompletionDeadlineAt:
        deadline,
    });
  const candidateCycle =
    await AccessCycle.create({
      userId:
        candidateUserId,
      paymentOrderId:
        objectId(),
      policyVersionId:
        policy._id,
      status: "SUB_ACTIVE",
      activeRanking: "SUB",
      startedAt: new Date(
        "2026-07-01T00:00:00.000Z"
      ),
      day30CompletionDeadlineAt:
        deadline,
      integrityState: "CLEAR",
    });
  return {
    policy,
    season,
    challengerUserId,
    candidateUserId,
    challengerCycle,
    candidateCycle,
    heartbeatMatch: {
      id: objectId(),
      matchId:
        `operational-match-${sequence++}`,
      status: "READY",
      submitsBy: new Date(
        NOW.getTime() +
          60 * MINUTE_MS
      ),
    },
    challengerProfile: {
      _id: objectId(),
      userId:
        challengerUserId,
      seasonId: season._id,
      activeRanking: "MAIN",
      arenaPosition: 65,
    },
    defenderProfile: {
      _id: objectId(),
      userId:
        candidateUserId,
      seasonId: season._id,
      activeRanking: "MAIN",
      arenaPosition: 25,
    },
  };
}

function policyWith(
  policy,
  overrides
) {
  return {
    ...policy.toObject(),
    ...overrides,
  };
}

function commonInput(
  world,
  overrides = {}
) {
  return {
    policy: world.policy,
    season: world.season,
    now: new Date(NOW),
    ...overrides,
  };
}

function assignmentInput(
  world,
  overrides = {}
) {
  return commonInput(world, {
    challengerCycle:
      world.challengerCycle,
    ...overrides,
  });
}

function activityInput(
  world,
  overrides = {}
) {
  return commonInput(world, {
    candidateUserId:
      world.candidateUserId,
    candidateCycle:
      world.candidateCycle,
    ...overrides,
  });
}

function integrityInput(
  world,
  overrides = {}
) {
  return activityInput(
    world,
    overrides
  );
}

function settlementInput(
  world,
  overrides = {}
) {
  return commonInput(world, {
    challengerCycle:
      world.challengerCycle,
    candidateCycle:
      world.candidateCycle,
    candidateUserId:
      world.candidateUserId,
    ...overrides,
  });
}

function deadlineInput(
  world,
  overrides = {}
) {
  return commonInput(world, {
    activeRanking: "SUB",
    matchType: "NORMAL",
    challengerCycle:
      world.challengerCycle,
    defenderCycle:
      world.candidateCycle,
    ...overrides,
  });
}

function mainInput(
  world,
  overrides = {}
) {
  return commonInput(world, {
    challengerProfile:
      world.challengerProfile,
    defenderProfile:
      world.defenderProfile,
    ...overrides,
  });
}

function heartbeatInput(
  world,
  overrides = {}
) {
  return {
    policyVersionId:
      world.policy._id,
    match: {
      ...world.heartbeatMatch,
      policyVersionId:
        world.policy._id,
    },
    questionPack: {
      id: objectId(),
      packVersion:
        "pack-v1",
      timeLimitSeconds: 900,
      scoringPolicyVersion:
        "score-v1",
    },
    ...overrides,
  };
}

async function insertHeartbeatMatch(
  world,
  overrides = {}
) {
  return RankTakeoverMatch
    .collection.insertOne({
      _id:
        world.heartbeatMatch.id,
      matchId:
        world.heartbeatMatch
          .matchId,
      seasonId:
        world.season._id,
      policyVersionId:
        world.policy._id,
      status:
        world.heartbeatMatch
          .status,
      submitsBy:
        world.heartbeatMatch
          .submitsBy,
      ...overrides,
    });
}

async function addEvent(
  userId,
  occurredAt,
  overrides = {}
) {
  return LearningEvent.create({
    userId,
    clientEventId:
      `operational-event-${sequence++}`,
    sessionId:
      `operational-session-${sequence}`,
    eventType:
      "problem-attempted",
    durationMs: 0,
    occurredAt,
    ...overrides,
  });
}

async function run() {
  console.log(
    "\nArena operational policy adapters"
  );
  const replSet =
    await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        storageEngine:
          "wiredTiger",
      },
    });

  try {
    await mongoose.connect(
      replSet.getUri()
    );
    await Promise.all([
      PolicyVersion.syncIndexes(),
      ArenaSeason.syncIndexes(),
      AccessCycle.syncIndexes(),
      LearningEvent.syncIndexes(),
      RankTakeoverMatch
        .syncIndexes(),
    ]);

    await check(
      "게시 정책 happy path는 기존 여섯 resolver 계약과 정확히 같은 shape",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createArenaOperationalPolicyService({
            now: () =>
              new Date(NOW),
          });
        world.season.status =
          "ACTIVE";
        await world.season.save();
        await insertHeartbeatMatch(
          world
        );
        await addEvent(
          world.candidateUserId,
          new Date(
            NOW.getTime() -
              60 * MINUTE_MS
          ),
          {
            durationMs:
              99_999_999,
          }
        );
        await addEvent(
          world.candidateUserId,
          new Date(NOW),
          {
            durationMs: null,
          }
        );
        await addEvent(
          world.candidateUserId,
          new Date(
            NOW.getTime() + 1
          )
        );

        const session =
          await mongoose
            .startSession();
        let activity;
        let heartbeat;
        try {
          await session.withTransaction(
            async () => {
              activity =
                await service
                  .resolveActivity(
                    activityInput(
                      world,
                      { session }
                    )
                  );
              heartbeat =
                await service
                  .resolveHeartbeatPolicy(
                    heartbeatInput(
                      world,
                      { session }
                    )
                  );
            }
          );
        } finally {
          await session
            .endSession();
        }

        assert.deepEqual(
          await service
            .resolveAssignmentPolicy(
              assignmentInput(
                world
              )
            ),
          {
            policyVersionId:
              String(
                world.policy._id
              ),
            minHigherPositionGap:
              1,
            maxHigherPositionGap:
              20,
            rankRangePolicyVersion:
              "SUB_RANGE_V1",
            activityPolicyVersion:
              "EVENT_COUNT_RATIO_V1",
            settlementPolicyVersion:
              "SETTLEMENT_V1",
            strongRelationPolicyVersion:
              "PAIR_INTEGRITY_V1",
            integrityPolicyVersion:
              "INTEGRITY_HOLD_V1",
          }
        );
        assert.deepEqual(
          activity,
          {
            recentlyActive: true,
            multiplier: 1,
          }
        );
        assert.deepEqual(
          await service
            .resolveIntegrity(
              integrityInput(
                world
              )
            ),
          { clear: true }
        );
        assert.deepEqual(
          await service
            .resolveSettlementEligibility(
              settlementInput(
                world
              )
            ),
          { canSettle: true }
        );
        assert.deepEqual(
          await service
            .resolveDeadlinePolicy(
              deadlineInput(
                world
              )
            ),
          {
            startDeadlineMinutes:
              10,
            submissionDeadlineMinutes:
              60,
            questionPolicyVersion:
              "QUESTION_PACK_V1",
          }
        );
        assert.equal(
          await service
            .resolveMainTierStepGap(
              mainInput(world)
            ),
          4
        );
        assert.deepEqual(
          heartbeat,
          {
            status: "PUBLISHED",
            published: true,
            policyVersionId:
              String(
                world.policy._id
              ),
            version:
              "ACTIVE_TIME_V2",
            heartbeatPolicyVersion:
              "ATTEMPT_HEARTBEAT_V1",
            maxRecognizedHeartbeatIntervalMs:
              15_000,
            networkReconnectGraceMs:
              30_000,
          }
        );

        const serialized =
          JSON.stringify({
            activity,
            integrity:
              await service
                .resolveIntegrity(
                  integrityInput(
                    world
                  )
                ),
          });
        assert.doesNotMatch(
          serialized,
          /duration|eventId|occurredAt|device|network|payment|answer|metadata/i
        );
      }
    );

    await check(
      "heartbeat adapter는 DB의 published PolicyVersion과 현재 ACTIVE season을 일치시켜 fail-closed",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createArenaOperationalPolicyService({
            now: () =>
              new Date(NOW),
          });
        await insertHeartbeatMatch(
          world
        );
        const inactive =
          await captureError(() =>
            service
              .resolveHeartbeatPolicy(
                heartbeatInput(
                  world
                )
              )
          );
        assertPending(
          inactive,
          "ACTIVE_ARENA_SEASON_UNAVAILABLE"
        );

        world.season.status =
          "ACTIVE";
        await world.season.save();
        const matchMismatch =
          await captureError(() =>
            service
              .resolveHeartbeatPolicy(
                heartbeatInput(
                  world,
                  {
                    match: {
                      ...heartbeatInput(
                        world
                      ).match,
                      policyVersionId:
                        objectId(),
                    },
                  }
                )
              )
          );
        assertPending(
          matchMismatch,
          "MATCH_POLICY_VERSION_MISMATCH"
        );

        const authoritativeMatchMismatch =
          await captureError(() =>
            service
              .resolveHeartbeatPolicy(
                heartbeatInput(world, {
                  match: {
                    ...heartbeatInput(
                      world
                    ).match,
                    status:
                      "IN_PROGRESS",
                  },
                })
              )
          );
        assertPending(
          authoritativeMatchMismatch,
          "MATCH_POLICY_CONTEXT_MISMATCH"
        );

        for (const [
          field,
          publishedValue,
        ] of [
          [
            "activeSolveTimePolicyVersion",
            "ACTIVE_TIME_V2",
          ],
          [
            "attemptHeartbeatPolicyVersion",
            "ATTEMPT_HEARTBEAT_V1",
          ],
          [
            "maxRecognizedHeartbeatIntervalMs",
            15_000,
          ],
          [
            "networkReconnectGraceMs",
            30_000,
          ],
        ]) {
          world.policy[field] =
            null;
          await world.policy.save();
          const unpublished =
            await captureError(() =>
              service
                .resolveHeartbeatPolicy(
                  heartbeatInput(
                    world
                  )
                )
            );
          assertPending(
            unpublished,
            field
          );
          world.policy[field] =
            publishedValue;
          await world.policy.save();
        }

        world.season.endsAt =
          new Date(NOW);
        await world.season.save();
        const expiredSeason =
          await captureError(() =>
            service
              .resolveHeartbeatPolicy(
                heartbeatInput(
                  world
                )
              )
          );
        assertPending(
          expiredSeason,
          "ACTIVE_ARENA_SEASON_UNAVAILABLE"
        );
      }
    );

    await check(
      "activity는 LearningEvent 수와 occurredAt 경계만 사용하고 빈 기록/부분 충족을 결정론적으로 계산",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createArenaOperationalPolicyService({
            now: () =>
              new Date(NOW),
          });
        assert.deepEqual(
          await service
            .resolveActivity(
              activityInput(
                world,
                {
                  durationMs:
                    99_999_999,
                }
              )
            ),
          {
            recentlyActive: false,
            multiplier: 0,
          }
        );
        await addEvent(
          world.candidateUserId,
          new Date(
            NOW.getTime() -
              60 * MINUTE_MS -
              1
          ),
          {
            durationMs:
              99_999_999,
          }
        );
        assert.deepEqual(
          await service
            .resolveActivity(
              activityInput(world)
            ),
          {
            recentlyActive: false,
            multiplier: 0,
          }
        );
        await addEvent(
          world.candidateUserId,
          new Date(
            NOW.getTime() -
              60 * MINUTE_MS
          ),
          { durationMs: 1 }
        );
        assert.deepEqual(
          await service
            .resolveActivity(
              activityInput(world)
            ),
          {
            recentlyActive: false,
            multiplier: 0.5,
          }
        );
        await addEvent(
          world.candidateUserId,
          new Date(NOW),
          { durationMs: null }
        );
        assert.deepEqual(
          await service
            .resolveActivity(
              activityInput(world)
            ),
          {
            recentlyActive: true,
            multiplier: 1,
          }
        );
      }
    );

    await check(
      "settlement은 season end와 양쪽 Day 30 중 가장 이른 경계까지 제출 가능해야 함",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createArenaOperationalPolicyService({
            now: () =>
              new Date(NOW),
          });
        const exactDeadline =
          new Date(
            NOW.getTime() +
              60 * MINUTE_MS
          );
        const exactChallenger = {
          ...world.challengerCycle
            .toObject(),
          day30CompletionDeadlineAt:
            exactDeadline,
        };
        const exactCandidate = {
          ...world.candidateCycle
            .toObject(),
          day30CompletionDeadlineAt:
            exactDeadline,
        };
        assert.deepEqual(
          await service
            .resolveSettlementEligibility(
              settlementInput(
                world,
                {
                  challengerCycle:
                    exactChallenger,
                  candidateCycle:
                    exactCandidate,
                }
              )
            ),
          { canSettle: true }
        );
        assert.deepEqual(
          await service
            .resolveSettlementEligibility(
              settlementInput(
                world,
                {
                  candidateCycle: {
                    ...exactCandidate,
                    day30CompletionDeadlineAt:
                      new Date(
                        exactDeadline
                          .getTime() -
                          1
                      ),
                  },
                }
              )
          ),
          { canSettle: false }
        );
        assert.deepEqual(
          await service
            .resolveSettlementEligibility(
              settlementInput(
                world,
                {
                  challengerCycle: {
                    ...exactChallenger,
                    day30CompletionDeadlineAt:
                      new Date(
                        exactDeadline
                          .getTime() -
                          1
                      ),
                  },
                }
              )
            ),
          { canSettle: false }
        );
        assert.deepEqual(
          await service
            .resolveSettlementEligibility(
              settlementInput(
                world,
                {
                  season: {
                    ...world.season
                      .toObject(),
                    endsAt: new Date(
                      exactDeadline
                        .getTime() -
                        1
                    ),
                  },
                }
              )
            ),
          { canSettle: false }
        );
      }
    );

    await check(
      "Main gap은 pinned 9-step mapping만 사용하고 같은/낮은 step target을 거절",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createArenaOperationalPolicyService({
            now: () =>
              new Date(NOW),
          });
        assert.equal(
          await service
            .resolveMainTierStepGap(
              mainInput(world)
            ),
          4
        );
        for (const position of [
          61,
          75,
        ]) {
          const error =
            await captureError(() =>
              service
                .resolveMainTierStepGap(
                  mainInput(
                    world,
                    {
                      defenderProfile: {
                        ...world
                          .defenderProfile,
                        arenaPosition:
                          position,
                      },
                    }
                  )
                )
            );
          assert.equal(
            error.code,
            "MAIN_TARGET_NOT_STRICTLY_HIGHER_STEP"
          );
        }
        const unmapped =
          await captureError(() =>
            service
              .resolveMainTierStepGap(
                mainInput(world, {
                  challengerProfile:
                    {
                      ...world
                        .challengerProfile,
                      arenaPosition:
                        91,
                    },
                })
              )
          );
        assertPending(
          unmapped,
          "MAIN_ARENA_POSITION_UNMAPPED"
        );
      }
    );

    await check(
      "각 운영 정책 그룹 누락과 지원하지 않는 activity 공식은 추정 없이 POLICY_PENDING",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createArenaOperationalPolicyService({
            now: () =>
              new Date(NOW),
          });
        const cases = [
          [
            "subDefenderMinHigherPositionGap",
            (policy) =>
              service
                .resolveAssignmentPolicy(
                  assignmentInput(
                    world,
                    { policy }
                  )
                ),
          ],
          [
            "subRankRangePolicyVersion",
            (policy) =>
              service
                .resolveAssignmentPolicy(
                  assignmentInput(
                    world,
                    { policy }
                  )
                ),
          ],
          [
            "subDefenderMaxHigherPositionGap",
            (policy) =>
              service
                .resolveAssignmentPolicy(
                  assignmentInput(
                    world,
                    { policy }
                  )
                ),
          ],
          [
            "recentActivityWeightVersion",
            (policy) =>
              service
                .resolveActivity(
                  activityInput(
                    world,
                    { policy }
                  )
                ),
          ],
          [
            "strongRelationPolicyVersion",
            (policy) =>
              service
                .resolveAssignmentPolicy(
                  assignmentInput(
                    world,
                    { policy }
                  )
                ),
          ],
          [
            "recentActivityLookbackMinutes",
            (policy) =>
              service
                .resolveActivity(
                  activityInput(
                    world,
                    { policy }
                  )
                ),
          ],
          [
            "recentActivityMinEventCount",
            (policy) =>
              service
                .resolveActivity(
                  activityInput(
                    world,
                    { policy }
                  )
                ),
          ],
          [
            "settlementPolicyVersion",
            (policy) =>
              service
                .resolveSettlementEligibility(
                  settlementInput(
                    world,
                    { policy }
                  )
                ),
          ],
          [
            "deadlinePolicyVersion",
            (policy) =>
              service
                .resolveDeadlinePolicy(
                  deadlineInput(
                    world,
                    { policy }
                  )
                ),
          ],
          [
            "startDeadlineMinutes",
            (policy) =>
              service
                .resolveDeadlinePolicy(
                  deadlineInput(
                    world,
                    { policy }
                  )
                ),
          ],
          [
            "submissionDeadlineMinutes",
            (policy) =>
              service
                .resolveDeadlinePolicy(
                  deadlineInput(
                    world,
                    { policy }
                  )
                ),
          ],
          [
            "questionPolicyVersion",
            (policy) =>
              service
                .resolveDeadlinePolicy(
                  deadlineInput(
                    world,
                    { policy }
                  )
                ),
          ],
          [
            "integrityPolicyVersion",
            (policy) =>
              service
                .resolveIntegrity(
                  integrityInput(
                    world,
                    { policy }
                  )
                ),
          ],
          [
            "arenaTierStepMappingVersion",
            (policy) =>
              service
                .resolveMainTierStepGap(
                  mainInput(
                    world,
                    { policy }
                  )
                ),
          ],
          [
            "arenaTierStepPositionCeilings",
            (policy) =>
              service
                .resolveMainTierStepGap(
                  mainInput(
                    world,
                    { policy }
                  )
                ),
          ],
        ];
        for (const [
          field,
          invoke,
        ] of cases) {
          const error =
            await captureError(() =>
              invoke(
                policyWith(
                  world.policy,
                  {
                    [field]:
                      null,
                  }
                )
              )
            );
          assertPending(
            error,
            field
          );
        }

        const unknownFormula =
          await captureError(() =>
            service
              .resolveActivity(
                activityInput(
                  world,
                  {
                    policy:
                      policyWith(
                        world.policy,
                        {
                          recentActivityWeightVersion:
                            "UNKNOWN_FORMULA",
                        }
                      ),
                  }
                )
              )
          );
        assertPending(
          unknownFormula,
          "RECENT_ACTIVITY_WEIGHT_VERSION_UNSUPPORTED"
        );

        const missingDay30 =
          await captureError(() =>
            service
              .resolveSettlementEligibility(
                settlementInput(
                  world,
                  {
                    candidateCycle: {
                      ...world
                        .candidateCycle
                        .toObject(),
                      day30CompletionDeadlineAt:
                        null,
                    },
                  }
                )
              )
          );
        assertPending(
          missingDay30,
          "day30CompletionDeadlineAt_INVALID"
        );
      }
    );

    await check(
      "미게시·미발효·만료 policy는 모든 계산 전에 차단",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createArenaOperationalPolicyService({
            now: () =>
              new Date(NOW),
          });
        for (const [
          overrides,
          blocker,
        ] of [
          [
            { publishedAt: null },
            "publishedAt",
          ],
          [
            {
              publishedAt:
                new Date(
                  NOW.getTime() + 1
                ),
            },
            "POLICY_NOT_YET_PUBLISHED",
          ],
          [
            {
              effectiveFrom:
                new Date(
                  NOW.getTime() + 1
                ),
            },
            "POLICY_NOT_YET_EFFECTIVE",
          ],
          [
            {
              effectiveTo:
                new Date(NOW),
            },
            "POLICY_EXPIRED",
          ],
        ]) {
          const error =
            await captureError(() =>
              service
                .resolveAssignmentPolicy(
                  assignmentInput(
                    world,
                    {
                      policy:
                        policyWith(
                          world.policy,
                          overrides
                        ),
                    }
                  )
                )
            );
          assertPending(
            error,
            blocker
          );
        }
      }
    );

    await check(
      "season/cycle/user/profile policy context 불일치는 fail-closed",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createArenaOperationalPolicyService({
            now: () =>
              new Date(NOW),
          });
        const wrongId =
          objectId();
        const seasonMismatch =
          await captureError(() =>
            service
              .resolveAssignmentPolicy(
                assignmentInput(
                  world,
                  {
                    season: {
                      ...world.season
                        .toObject(),
                      policyVersionId:
                        wrongId,
                    },
                  }
                )
              )
          );
        assertPending(
          seasonMismatch,
          "ARENA_SEASON_POLICY_VERSION_MISMATCH"
        );

        const cycleMismatch =
          await captureError(() =>
            service
              .resolveActivity(
                activityInput(
                  world,
                  {
                    candidateCycle:
                      {
                        ...world
                          .candidateCycle
                          .toObject(),
                        policyVersionId:
                          wrongId,
                      },
                  }
                )
              )
          );
        assertPending(
          cycleMismatch,
          "candidateCycle_POLICY_VERSION_MISMATCH"
        );

        const userMismatch =
          await captureError(() =>
            service
              .resolveIntegrity(
                integrityInput(
                  world,
                  {
                    candidateCycle:
                      {
                        ...world
                          .candidateCycle
                          .toObject(),
                        userId:
                          wrongId,
                      },
                  }
                )
              )
          );
        assertPending(
          userMismatch,
          "candidateCycle_USER_MISMATCH"
        );

        const profileMismatch =
          await captureError(() =>
            service
              .resolveMainTierStepGap(
                mainInput(world, {
                  defenderProfile:
                    {
                      ...world
                        .defenderProfile,
                      seasonId:
                        wrongId,
                    },
                })
              )
          );
        assertPending(
          profileMismatch,
          "defenderProfile_SEASON_MISMATCH"
        );
      }
    );

    await check(
      "schema는 9-step·Sub range·deadline·activity enum의 malformed 게시값을 거절",
      async () => {
        await clearData();
        for (const overrides of [
          {
            arenaTierStepPositionCeilings:
              [
                10,
                20,
                30,
                40,
                50,
                60,
                70,
                80,
              ],
          },
          {
            arenaTierStepPositionCeilings:
              [
                10,
                20,
                30,
                40,
                50,
                60,
                70,
                70,
                90,
              ],
          },
          {
            subDefenderMinHigherPositionGap:
              5,
            subDefenderMaxHigherPositionGap:
              4,
          },
          {
            startDeadlineMinutes:
              61,
            submissionDeadlineMinutes:
              60,
          },
          {
            recentActivityMinEventCount:
              1.5,
          },
          {
            recentActivityWeightVersion:
              "UNKNOWN_FORMULA",
          },
        ]) {
          const error =
            await captureError(() =>
              PolicyVersion.create(
                publishedPolicyFacts(
                  overrides
                )
              )
            );
          assert.equal(
            error.name,
            "ValidationError"
          );
        }
      }
    );

    await check(
      "policyReadiness는 새 운영·Main mapping·attempt timing blocker를 별도 노출",
      async () => {
        await clearData();
        const ready =
          await PolicyVersion.create(
            publishedPolicyFacts()
          );
        const readyState =
          policyReadiness(ready);
        assert.equal(
          readyState
            .canOperateArena,
          true
        );
        assert.deepEqual(
          readyState
            .arenaOperationalBlockers,
          []
        );

        const incomplete =
          policyReadiness({
            ...ready.toObject(),
            arenaTierStepPositionCeilings:
              null,
            attemptHeartbeatPolicyVersion:
              null,
            activeSolveTimePolicyVersion:
              null,
            networkReconnectGraceMs:
              null,
          });
        assert.equal(
          incomplete
            .canOperateArena,
          false
        );
        assert.ok(
          incomplete
            .mainArenaOperationalBlockers
            .includes(
              "arenaTierStepPositionCeilings"
            )
        );
        assert.ok(
          incomplete
            .attemptTimingBlockers
            .includes(
              "attemptHeartbeatPolicyVersion"
            )
        );
        assert.ok(
          incomplete
            .attemptTimingBlockers
            .includes(
              "activeSolveTimePolicyVersion"
            )
        );
        assert.ok(
          incomplete
            .attemptTimingBlockers
            .includes(
              "networkReconnectGraceMs"
            )
        );
      }
    );
  } finally {
    await mongoose.disconnect();
    await replSet.stop();
  }

  const failed =
    checks.filter(
      ({ passed }) => !passed
    );
  if (failed.length) {
    for (const {
      label,
      error,
    } of failed) {
      console.error(
        `\n[FAIL] ${label}`
      );
      console.error(
        error?.stack || error
      );
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `\n${checks.length}/${checks.length} checks passed`
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
