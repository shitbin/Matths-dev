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
  AccessCycle,
} = require(
  "../models/accessCycleModel"
);
const {
  ArenaProfile,
} = require(
  "../models/arenaProfileModel"
);
const {
  ArenaSeason,
} = require(
  "../models/arenaSeasonModel"
);
const {
  DefenderAssignmentAudit,
} = require(
  "../models/defenderAssignmentAuditModel"
);
const {
  DayBalanceTransaction,
} = require(
  "../models/dayBalanceTransactionModel"
);
const {
  RankingProfile,
  User,
} = require(
  "../models/matthsModel"
);
const {
  PolicyVersion,
} = require(
  "../models/policyVersionModel"
);
const {
  OutboxEvent,
} = require(
  "../models/outboxEventModel"
);
const {
  RankTakeoverCommandReceipt,
} = require(
  "../models/rankTakeoverCommandReceiptModel"
);
const {
  RankTakeoverMatch,
} = require(
  "../models/rankTakeoverMatchModel"
);
const {
  createDefenderAssignmentService,
} = require(
  "../services/defenderAssignmentService"
);
const {
  buildPackageIssueTransaction,
} = require(
  "../services/dayBalanceLedgerService"
);
const {
  createRankTakeoverService,
} = require(
  "../services/rankTakeoverService"
);

const NOW =
  new Date(
    "2026-07-10T03:00:00.000Z"
  );
const HOUR_MS = 3_600_000;
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
  return new mongoose
    .Types.ObjectId();
}

const models = [
  RankTakeoverCommandReceipt,
  DefenderAssignmentAudit,
  RankTakeoverMatch,
  DayBalanceTransaction,
  OutboxEvent,
  ArenaProfile,
  ArenaSeason,
  AccessCycle,
  PolicyVersion,
  RankingProfile,
  User,
];

async function clearData() {
  for (const model of models) {
    // 드라이버 레벨로 지운다. DayBalanceTransaction 은 모델 미들웨어가
    // 모든 수정·삭제를 IMMUTABLE_LEDGER_TRANSACTION 으로 막는 append-only
    // 원장이고, 그 차단 자체가 이 스위트가 검증하는 계약이다 —
    // 테스트 정리는 그 계약 밖(운영자 유지보수 경로)에서 이뤄져야 한다.
    await model.collection.deleteMany(
      {}
    );
  }
}

async function syncIndexes() {
  for (const model of models) {
    await model.syncIndexes();
  }
}

async function createPolicy(
  overrides = {}
) {
  const policy =
    await PolicyVersion.create({
      version:
        `assignment-v${sequence}`,
      effectiveFrom:
        new Date(
          "2026-07-01T00:00:00.000Z"
        ),
      publishedAt:
        new Date(
          "2026-06-30T00:00:00.000Z"
        ),
      defenseAssignmentAlpha:
        1,
      targetDefenseGapHours:
        24,
      deterministicAuditJitterMin:
        0.9,
      deterministicAuditJitterMax:
        1.1,
      defenseAssignmentCapOffset:
        2,
      maxDefenseAssignmentsPerDay:
        1,
      sameOpponentCooldownDays:
        7,
      subDefenderMinHigherPositionGap:
        1,
      subDefenderMaxHigherPositionGap:
        20,
      subRankRangePolicyVersion:
        "SUB_RANGE_V1",
      recentActivityWeightVersion:
        "EVENT_COUNT_RATIO_V1",
      settlementPolicyVersion:
        "ASYNC_24H_V1",
      strongRelationPolicyVersion:
        "ACCOUNT_LINK_V1",
      integrityPolicyVersion:
        "INTEGRITY_V1",
      ...overrides,
    });
  sequence += 1;
  return policy;
}

async function createSeason(
  policy
) {
  const season =
    await ArenaSeason.create({
      seasonId:
        `assignment-season-${sequence}`,
      title:
        "GOAT Arena Assignment Test",
      startsAt:
        new Date(
          "2026-07-01T00:00:00.000Z"
        ),
      endsAt:
        new Date(
          "2026-08-01T00:00:00.000Z"
        ),
      status: "ACTIVE",
      reseedStatus:
        "COMPLETED",
      currentWeekKey:
        "2026-W28",
      lastSeededAt:
        new Date(
          "2026-07-06T12:00:00.000Z"
        ),
      policyVersionId:
        policy._id,
    });
  sequence += 1;
  return season;
}

async function createParticipant({
  label,
  position,
  policy,
  season,
  completedSubChallenges = 0,
  defenseAssignmentsInCycle = 0,
  lastDefenseAssignedAt = null,
  accountStatus = "active",
  placementComplete = true,
  cycleStatus = "SUB_ACTIVE",
  integrityState = "CLEAR",
  profileStatus = "ACTIVE",
  protectionUntil = null,
}) {
  const suffix =
    sequence++;
  const user =
    await User.create({
      name: `${label}${suffix}`,
      realName:
        `${label} 학생`,
      email:
        `assignment-${label}-${suffix}@example.com`,
      passwordHash:
        "not-a-real-password-hash",
      accountStatus,
      isActive:
        accountStatus ===
        "active",
      termsAcceptedAt: NOW,
      school: {
        region: "경기",
        code:
          `school-${suffix}`,
        name: "테스트고",
      },
    });
  const rankingProfile =
    await RankingProfile.create({
      userId: user._id,
      placementAttemptId:
        placementComplete
          ? objectId()
          : null,
      placementScore: 80,
      mmr:
        1200 +
        (100 - position),
      tier: "GOLD",
      status:
        "CONFIRMED",
    });
  const normalCompleted =
    completedSubChallenges;
  const cycle =
    await AccessCycle.create({
      userId: user._id,
      paymentOrderId:
        objectId(),
      policyVersionId:
        policy._id,
      status: cycleStatus,
      activeRanking: "SUB",
      startedAt:
        new Date(
          "2026-07-01T00:00:00.000Z"
        ),
      paidAccessStartsOn:
        "2026-07-01",
      paidAccessEndsOn:
        "2026-07-29",
      day30ReviewOn:
        "2026-07-30",
      day30CompletionOpensAt:
        new Date(
          "2026-07-29T15:00:00.000Z"
        ),
      day30CompletionDeadlineAt:
        new Date(
          "2026-07-30T14:59:00.000Z"
        ),
      refundChallengeDays:
        29,
      completedSubNormalChallenges:
        normalCompleted,
      completedSubRevengeChallenges:
        0,
      completedSubChallenges,
      defenseAssignmentsInCycle,
      lastDefenseAssignedAt,
      integrityState,
    });
  const profile =
    await ArenaProfile.create({
      userId: user._id,
      seasonId:
        season._id,
      activeRanking: "SUB",
      arenaPosition:
        position,
      status: profileStatus,
      mmrAtLastSeed:
        rankingProfile.mmr,
      seededAt:
        new Date(
          "2026-07-06T12:00:00.000Z"
        ),
      seedWeekKey:
        "2026-W28",
      protectionUntil,
    });
  return {
    user,
    rankingProfile,
    cycle,
    profile,
  };
}

function resolverHarness({
  policy,
  maxGap = 20,
  relatedUsers =
    new Set(),
  inactiveUsers =
    new Set(),
  integrityHeldUsers =
    new Set(),
  cannotSettleUsers =
    new Set(),
  activityMultipliers =
    new Map(),
} = {}) {
  return {
    resolveAssignmentPolicy:
      async () => ({
        policyVersionId:
          String(policy._id),
        minHigherPositionGap:
          1,
        maxHigherPositionGap:
          maxGap,
        rankRangePolicyVersion:
          "SUB_RANGE_V1",
        activityPolicyVersion:
          "EVENT_COUNT_RATIO_V1",
        settlementPolicyVersion:
          "ASYNC_24H_V1",
        strongRelationPolicyVersion:
          "ACCOUNT_LINK_V1",
        integrityPolicyVersion:
          "INTEGRITY_V1",
      }),
    resolveStrongRelation:
      async ({
        candidateUserId,
      }) => ({
        blocked:
          relatedUsers.has(
            String(
              candidateUserId
            )
          ),
      }),
    resolveActivity:
      async ({
        candidateUserId,
      }) => {
        const key = String(
          candidateUserId
        );
        return {
          recentlyActive:
            !inactiveUsers.has(
              key
            ),
          multiplier:
            activityMultipliers.has(
              key
            )
              ? activityMultipliers.get(
                  key
                )
              : 1,
        };
      },
    resolveIntegrity:
      async ({
        candidateUserId,
      }) => ({
        clear:
          !integrityHeldUsers.has(
            String(
              candidateUserId
            )
          ),
      }),
    resolveSettlementEligibility:
      async ({
        candidateUserId,
      }) => ({
        canSettle:
          !cannotSettleUsers.has(
            String(
              candidateUserId
            )
          ),
      }),
  };
}

function createService(
  policy,
  resolverOptions = {},
  serviceOverrides = {}
) {
  return createDefenderAssignmentService({
    seedSecret:
      "test-only-server-secret-at-least-32-bytes",
    ...resolverHarness({
      policy,
      ...resolverOptions,
    }),
    ...serviceOverrides,
  });
}

async function selectInTransaction({
  service,
  requestId,
  challenger,
  season,
  policy,
  overrides = {},
  afterSelection = null,
}) {
  const session =
    await mongoose
      .startSession();
  let result;
  try {
    await session.withTransaction(
      async () => {
        result =
          await service
            .selectSubDefender({
              requestId,
              challengerUserId:
                challenger
                  .user._id,
              challengerCycle:
                challenger.cycle,
              challengerProfile:
                challenger.profile,
              season,
              policy,
              now: NOW,
              session,
              ...overrides,
            });
        if (afterSelection) {
          await afterSelection({
            result,
            session,
          });
        }
      }
    );
    return result;
  } finally {
    await session.endSession();
  }
}

async function insertMatch({
  season,
  challengerUserId,
  defenderUserId,
  status,
  matchedAt = NOW,
  matchId,
}) {
  await RankTakeoverMatch
    .collection.insertOne({
      matchId:
        matchId ||
        `assignment-match-${sequence++}`,
      seasonId:
        season._id,
      policyVersionId:
        season.policyVersionId,
      activeRanking: "SUB",
      challengerUserId,
      defenderUserId,
      participantUserIds: [
        challengerUserId,
        defenderUserId,
      ],
      status,
      matchedAt,
      createdAt: matchedAt,
      updatedAt: matchedAt,
  });
}

async function issueStartingDays({
  participant,
  policy,
}) {
  await DayBalanceTransaction.create(
    buildPackageIssueTransaction({
      cycleId:
        participant.cycle._id,
      userId:
        participant.user._id,
      orderId:
        participant
          .cycle
          .paymentOrderId,
      policyVersion: policy,
      occurredAt: NOW,
      idempotencyKey:
        `assignment-package-${participant.cycle._id}`,
    })
  );
}

async function basicWorld({
  policyOverrides = {},
} = {}) {
  const policy =
    await createPolicy(
      policyOverrides
    );
  const season =
    await createSeason(
      policy
    );
  const challenger =
    await createParticipant({
      label: "challenger",
      position: 100,
      policy,
      season,
      completedSubChallenges:
        2,
    });
  return {
    policy,
    season,
    challenger,
  };
}

async function run() {
  const replSet =
    await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        storageEngine:
          "wiredTiger",
      },
    });
  await mongoose.connect(
    replSet.getUri(
      "matths-defender-assignment"
    )
  );

  try {
    await syncIndexes();

    await check(
      "정책이 정한 서버 seed로 가중치·확률을 정규화하고 동일 요청을 재현",
      async () => {
        await clearData();
        const {
          policy,
          season,
          challenger,
        } =
          await basicWorld();
        const first =
          await createParticipant({
            label: "first",
            position: 95,
            policy,
            season,
            completedSubChallenges:
              0,
            defenseAssignmentsInCycle:
              0,
            lastDefenseAssignedAt:
              new Date(
                NOW.getTime() -
                  24 *
                    HOUR_MS
              ),
          });
        const second =
          await createParticipant({
            label: "second",
            position: 94,
            policy,
            season,
            completedSubChallenges:
              2,
            defenseAssignmentsInCycle:
              1,
            lastDefenseAssignedAt:
              new Date(
                NOW.getTime() -
                  20 *
                    HOUR_MS
              ),
          });
        const multipliers =
          new Map([
            [
              String(
                first.user._id
              ),
              1,
            ],
            [
              String(
                second.user._id
              ),
              0.5,
            ],
          ]);
        const service =
          createService(
            policy,
            {
              activityMultipliers:
                multipliers,
            }
          );

        const result =
          await selectInTransaction({
            service,
            requestId:
              "weighted-request",
            challenger,
            season,
            policy,
          });
        assert.ok(
          result.userId
        );
        const snapshot =
          result.auditSnapshot;
        assert.equal(
          snapshot.status,
          "SELECTED"
        );
        assert.equal(
          Object.prototype
            .hasOwnProperty.call(
              snapshot,
              "selectionSeed"
            ),
          false
        );
        assert.equal(
          Object.prototype
            .hasOwnProperty.call(
              snapshot,
              "candidates"
            ),
          false
        );
        assert.equal(
          Object.prototype
            .hasOwnProperty.call(
              snapshot,
              "policySnapshot"
            ),
          false
        );
        assert.equal(
          Object.prototype
            .hasOwnProperty.call(
              snapshot,
              "challengerUserId"
            ),
          false
        );
        const detailedAudit =
          await DefenderAssignmentAudit
            .findById(
              result.auditId
            )
            .select(
              "+selectionSeed"
            )
            .lean();
        assert.equal(
          detailedAudit
            .candidates.length,
          2
        );
        const probabilitySum =
          detailedAudit.candidates
            .reduce(
              (sum, candidate) =>
                sum +
                candidate.metrics
                  .probability,
              0
            );
        assert.ok(
          Math.abs(
            probabilitySum - 1
          ) < 1e-12
        );
        for (const candidate of
          detailedAudit.candidates) {
          const metrics =
            candidate.metrics;
          const expected =
            metrics
              .assignmentBalance *
            metrics.recency *
            metrics
              .activityMultiplier *
            metrics.auditJitter;
          assert.ok(
            Math.abs(
              metrics.rawWeight -
                expected
            ) < 1e-12
          );
          assert.equal(
            metrics.assignmentCap,
            metrics
              .completedSubChallenges +
              2
          );
        }
        assert.equal(
          detailedAudit
            .selectionSeed.length,
          64
        );
        assert.equal(
          snapshot
            .selectionSeedHash,
          detailedAudit
            .selectionSeedHash
        );

        const replay =
          await selectInTransaction({
            service,
            requestId:
              "weighted-request",
            challenger,
            season,
            policy,
          });
        assert.equal(
          String(replay.userId),
          String(result.userId)
        );
        assert.deepEqual(
          replay.auditSnapshot,
          result.auditSnapshot
        );
        assert.equal(
          await DefenderAssignmentAudit.countDocuments(
            {
              requestId:
                "weighted-request",
            }
          ),
          1
        );
      }
    );

    await check(
      "계정·Placement·매치·보호·쿨다운·관계·활동·무결성·cap·마감을 후보별로 차단",
      async () => {
        await clearData();
        const {
          policy,
          season,
          challenger,
        } =
          await basicWorld();
        const valid =
          await createParticipant({
            label: "valid",
            position: 99,
            policy,
            season,
          });
        const inactiveAccount =
          await createParticipant({
            label: "inactive",
            position: 98,
            policy,
            season,
            accountStatus:
              "inactive",
          });
        const noPlacement =
          await createParticipant({
            label: "no-placement",
            position: 97,
            policy,
            season,
            placementComplete:
              false,
          });
        const activeMatch =
          await createParticipant({
            label: "active-match",
            position: 96,
            policy,
            season,
          });
        const protectedUser =
          await createParticipant({
            label: "protected",
            position: 95,
            policy,
            season,
            protectionUntil:
              new Date(
                NOW.getTime() +
                  HOUR_MS
              ),
          });
        const shielded =
          await createParticipant({
            label: "shielded",
            position: 94,
            policy,
            season,
          });
        await ArenaProfile
          .collection.updateOne(
            {
              _id:
                shielded
                  .profile._id,
            },
            {
              $set: {
                rankShieldUntil:
                  new Date(
                    NOW.getTime() +
                      HOUR_MS
                  ),
              },
            }
          );
        const cooldown =
          await createParticipant({
            label: "cooldown",
            position: 93,
            policy,
            season,
          });
        const related =
          await createParticipant({
            label: "related",
            position: 92,
            policy,
            season,
          });
        const inactiveActivity =
          await createParticipant({
            label: "not-recent",
            position: 91,
            policy,
            season,
          });
        const held =
          await createParticipant({
            label: "held",
            position: 90,
            policy,
            season,
            integrityState:
              "HELD",
          });
        const capped =
          await createParticipant({
            label: "capped",
            position: 89,
            policy,
            season,
            completedSubChallenges:
              0,
            defenseAssignmentsInCycle:
              2,
          });
        const dailyCapped =
          await createParticipant({
            label: "daily",
            position: 88,
            policy,
            season,
            lastDefenseAssignedAt:
              NOW,
          });
        const cannotSettle =
          await createParticipant({
            label: "deadline",
            position: 87,
            policy,
            season,
          });
        const outOfRange =
          await createParticipant({
            label: "far-away",
            position: 70,
            policy,
            season,
          });
        await insertMatch({
          season,
          challengerUserId:
            activeMatch
              .user._id,
          defenderUserId:
            objectId(),
          status: "MATCHED",
        });
        await insertMatch({
          season,
          challengerUserId:
            challenger.user._id,
          defenderUserId:
            cooldown.user._id,
          status: "SETTLED",
          matchedAt:
            new Date(
              NOW.getTime() -
                2 * HOUR_MS
            ),
        });

        const service =
          createService(
            policy,
            {
              maxGap: 20,
              relatedUsers:
                new Set([
                  String(
                    related
                      .user._id
                  ),
                ]),
              inactiveUsers:
                new Set([
                  String(
                    inactiveActivity
                      .user._id
                  ),
                ]),
              integrityHeldUsers:
                new Set([
                  String(
                    held.user._id
                  ),
                ]),
              cannotSettleUsers:
                new Set([
                  String(
                    cannotSettle
                      .user._id
                  ),
                ]),
            }
          );
        const result =
          await selectInTransaction({
            service,
            requestId:
              "eligibility-request",
            challenger,
            season,
            policy,
          });
        assert.equal(
          String(result.userId),
          String(valid.user._id)
        );
        const detailedAudit =
          await DefenderAssignmentAudit
            .findById(
              result.auditId
            )
            .lean();
        const byUserId =
          new Map(
            detailedAudit
              .candidates.map(
                (candidate) => [
                  String(
                    candidate.userId
                  ),
                  candidate,
                ]
              )
          );
        assert.equal(
          byUserId.has(
            String(
              outOfRange
                .user._id
            )
          ),
          false
        );
        const expected = [
          [
            inactiveAccount,
            "ACCOUNT_NOT_ACTIVE",
          ],
          [
            noPlacement,
            "PLACEMENT_NOT_COMPLETE",
          ],
          [
            activeMatch,
            "ACTIVE_MATCH_EXISTS",
          ],
          [
            protectedUser,
            "POST_MATCH_PROTECTION_ACTIVE",
          ],
          [
            shielded,
            "RANK_SHIELD_ACTIVE",
          ],
          [
            cooldown,
            "PAIR_COOLDOWN_ACTIVE",
          ],
          [
            related,
            "STRONG_RELATION_BLOCKED",
          ],
          [
            inactiveActivity,
            "RECENT_ACTIVITY_REQUIRED",
          ],
          [
            held,
            "INTEGRITY_HOLD",
          ],
          [
            capped,
            "ASSIGNMENT_CAP_REACHED",
          ],
          [
            dailyCapped,
            "DAILY_ASSIGNMENT_CAP_REACHED",
          ],
          [
            cannotSettle,
            "CANNOT_SETTLE_BEFORE_DEADLINE",
          ],
        ];
        for (const [
          participant,
          code,
        ] of expected) {
          const candidate =
            byUserId.get(
              String(
                participant
                  .user._id
              )
            );
          assert.ok(
            candidate,
            `${code} candidate missing`
          );
          assert.equal(
            candidate.eligible,
            false
          );
          assert.ok(
            candidate
              .exclusionCodes
              .includes(code),
            `${code} was not audited`
          );
          assert.equal(
            candidate.metrics
              .rawWeight,
            0
          );
          assert.equal(
            candidate.metrics
              .probability,
            0
          );
        }
      }
    );

    await check(
      "후보가 없더라도 상세 후보·seed는 내부 감사에만 보존하고 요약만 반환",
      async () => {
        await clearData();
        const {
          policy,
          season,
          challenger,
        } =
          await basicWorld();
        const capped =
          await createParticipant({
            label: "only-capped",
            position: 99,
            policy,
            season,
            completedSubChallenges:
              0,
            defenseAssignmentsInCycle:
              2,
          });
        const service =
          createService(policy);
        const result =
          await selectInTransaction({
            service,
            requestId:
              "no-candidate-request",
            challenger,
            season,
            policy,
          });
        assert.equal(
          result.userId,
          null
        );
        assert.equal(
          result
            .auditSnapshot.status,
          "NO_CANDIDATE"
        );
        const detailedAudit =
          await DefenderAssignmentAudit
            .findById(
              result.auditId
            )
            .select(
              "+selectionSeed"
            )
            .lean();
        assert.equal(
          detailedAudit
            .candidates.length,
          1
        );
        assert.deepEqual(
          detailedAudit
            .candidates[0]
            .exclusionCodes,
          [
            "ASSIGNMENT_CAP_REACHED",
          ]
        );
        assert.equal(
          detailedAudit
            .selectionSeed
            .length,
          64
        );
        assert.equal(
          await DefenderAssignmentAudit.countDocuments(
            {
              requestId:
                "no-candidate-request",
              selectedDefenderUserId:
                null,
            }
          ),
          1
        );
        assert.equal(
          String(
            capped.user._id
          ),
          String(
            detailedAudit
              .candidates[0]
              .userId
          )
        );
        assert.equal(
          "selectionSeed" in
            result.auditSnapshot,
          false
        );
        assert.equal(
          "candidates" in
            result.auditSnapshot,
          false
        );
      }
    );

    await check(
      "alpha·재배정 간격·jitter·좌석 범위가 미정이면 추정하지 않고 POLICY_PENDING",
      async () => {
        await clearData();
        const {
          policy,
          season,
          challenger,
        } =
          await basicWorld({
            policyOverrides: {
              defenseAssignmentAlpha:
                null,
            },
          });
        await createParticipant({
          label: "candidate",
          position: 99,
          policy,
          season,
        });
        const service =
          createService(policy);
        const error =
          await captureError(
            () =>
              selectInTransaction({
                service,
                requestId:
                  "pending-policy",
                challenger,
                season,
                policy,
              })
          );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
        assert.equal(
          error.details
            .reasonCode,
          "DEFENSE_ASSIGNMENT_ALPHA_UNSET"
        );
        assert.equal(
          await DefenderAssignmentAudit.countDocuments(
            {}
          ),
          0
        );

        const missingRangeService =
          createDefenderAssignmentService({
            seedSecret:
              "test-only-server-secret-at-least-32-bytes",
            resolveStrongRelation:
              async () => ({
                blocked: false,
              }),
            resolveActivity:
              async () => ({
                recentlyActive:
                  true,
                multiplier: 1,
              }),
            resolveIntegrity:
              async () => ({
                clear: true,
              }),
            resolveSettlementEligibility:
              async () => ({
                canSettle: true,
              }),
          });
        const rangeError =
          await captureError(
            () =>
              selectInTransaction({
                service:
                  missingRangeService,
                requestId:
                  "missing-range",
                challenger,
                season,
                policy,
              })
          );
        assert.equal(
          rangeError.code,
          "POLICY_PENDING"
        );
        assert.equal(
          rangeError.details
            .reasonCode,
          "ASSIGNMENT_POLICY_RESOLVER_UNAVAILABLE"
        );
      }
    );

    await check(
      "강한 관계·활동·무결성·정산 resolver가 하나라도 없으면 후보를 허용하지 않음",
      async () => {
        await clearData();
        const {
          policy,
          season,
          challenger,
        } =
          await basicWorld();
        await createParticipant({
          label: "candidate",
          position: 99,
          policy,
          season,
        });
        const base =
          resolverHarness({
            policy,
          });
        for (const [
          missing,
          reasonCode,
        ] of [
          [
            "resolveStrongRelation",
            "STRONG_RELATION_RESOLVER_UNAVAILABLE",
          ],
          [
            "resolveActivity",
            "ACTIVITY_RESOLVER_UNAVAILABLE",
          ],
          [
            "resolveIntegrity",
            "INTEGRITY_RESOLVER_UNAVAILABLE",
          ],
          [
            "resolveSettlementEligibility",
            "SETTLEMENT_ELIGIBILITY_RESOLVER_UNAVAILABLE",
          ],
        ]) {
          const options = {
            seedSecret:
              "test-only-server-secret-at-least-32-bytes",
            ...base,
          };
          delete options[missing];
          const service =
            createDefenderAssignmentService(
              options
            );
          const error =
            await captureError(
              () =>
                selectInTransaction({
                  service,
                  requestId:
                    `missing-${missing}`,
                  challenger,
                  season,
                  policy,
                })
            );
          assert.equal(
            error.code,
            "POLICY_PENDING"
          );
          assert.equal(
            error.details
              .reasonCode,
            reasonCode
          );
        }
      }
    );

    await check(
      "클라이언트 defender·position·stake·weight 입력과 트랜잭션 없는 호출을 거절",
      async () => {
        await clearData();
        const {
          policy,
          season,
          challenger,
        } =
          await basicWorld();
        const service =
          createService(policy);
        for (const field of [
          "defenderUserId",
          "defenderPosition",
          "stakeDays",
          "weight",
        ]) {
          const error =
            await captureError(
              () =>
                service
                  .selectSubDefender({
                    requestId:
                      `forbidden-${field}`,
                    challengerUserId:
                      challenger
                        .user._id,
                    challengerCycle:
                      challenger.cycle,
                    challengerProfile:
                      challenger.profile,
                    season,
                    policy,
                    now: NOW,
                    session: null,
                    [field]:
                      field ===
                      "defenderUserId"
                        ? objectId()
                        : 1,
                  })
            );
          assert.equal(
            error.code,
            "SUB_DEFENDER_SELECTION_FORBIDDEN"
          );
        }
        const transactionError =
          await captureError(
            () =>
              service
                .selectSubDefender({
                  requestId:
                    "no-transaction",
                  challengerUserId:
                    challenger
                      .user._id,
                  challengerCycle:
                    challenger.cycle,
                  challengerProfile:
                    challenger.profile,
                  season,
                  policy,
                  now: NOW,
                })
          );
        assert.equal(
          transactionError.code,
          "ASSIGNMENT_TRANSACTION_REQUIRED"
        );
      }
    );

    await check(
      "감사 저장은 외부 매치 트랜잭션과 함께 롤백되어 부분 기록을 남기지 않음",
      async () => {
        await clearData();
        const {
          policy,
          season,
          challenger,
        } =
          await basicWorld();
        await createParticipant({
          label: "candidate",
          position: 99,
          policy,
          season,
        });
        const service =
          createService(policy);
        const error =
          await captureError(
            () =>
              selectInTransaction({
                service,
                requestId:
                  "rollback-request",
                challenger,
                season,
                policy,
                afterSelection:
                  async () => {
                    throw new Error(
                      "simulated match lock failure"
                    );
                  },
              })
          );
        assert.match(
          error.message,
          /simulated match lock failure/
        );
        assert.equal(
          await DefenderAssignmentAudit.countDocuments(
            {
              requestId:
                "rollback-request",
            }
          ),
          0
        );
      }
    );

    await check(
      "실제 Rank Takeover 요청 트랜잭션이 resolver 감사·lock·match·counter를 함께 확정",
      async () => {
        await clearData();
        const {
          policy,
          season,
          challenger,
        } =
          await basicWorld();
        const defender =
          await createParticipant({
            label:
              "integrated-defender",
            position: 99,
            policy,
            season,
            completedSubChallenges:
              0,
          });
        await issueStartingDays({
          participant:
            challenger,
          policy,
        });
        await issueStartingDays({
          participant: defender,
          policy,
        });
        const assignmentService =
          createService(policy);
        const rankService =
          createRankTakeoverService({
            now: () =>
              new Date(NOW),
            selectSubDefender:
              assignmentService
                .selectSubDefender,
            resolveDeadlinePolicy:
              async () => ({
                startDeadlineMinutes:
                  60,
                submissionDeadlineMinutes:
                  180,
                questionPolicyVersion:
                  "ARENA_PACK_V1",
              }),
            assertPairIntegrity:
              async () => true,
          });

        const match =
          await rankService
            .requestChallenge({
              challengerUserId:
                challenger
                  .user._id,
              activeRanking:
                "SUB",
              matchType:
                "NORMAL",
              idempotencyKey:
                "integrated-assignment",
            });
        assert.equal(
          match.status,
          "MATCHED"
        );
        assert.equal(
          String(
            match
              .defenderUserId
          ),
          String(
            defender.user._id
          )
        );
        const defenderSelection =
          match.assignmentAudit
            .defenderSelection;
        assert.ok(
          defenderSelection
            .auditId
        );
        assert.equal(
          defenderSelection
            .auditSnapshot.status,
          "SELECTED"
        );
        assert.equal(
          defenderSelection
            .auditSnapshot
            .requestId,
          "integrated-assignment"
        );
        assert.equal(
          await DefenderAssignmentAudit.countDocuments(
            {
              _id:
                defenderSelection
                  .auditId,
              requestId:
                "integrated-assignment",
            }
          ),
          1
        );
        assert.equal(
          await RankTakeoverMatch.countDocuments(
            {
              matchId:
                match.matchId,
            }
          ),
          1
        );
        assert.equal(
          await DayBalanceTransaction.countDocuments(
            {
              matchId:
                match._id,
              type:
                "MATCH_LOCK",
            }
          ),
          1
        );
        assert.equal(
          await OutboxEvent.countDocuments(
            {
              aggregateId:
                match.matchId,
              eventType:
                "TAKEOVER_MATCHED",
            }
          ),
          1
        );
        const [
          challengerCycle,
          defenderCycle,
        ] = [
          await AccessCycle.findById(
            challenger.cycle._id
          ),
          await AccessCycle.findById(
            defender.cycle._id
          ),
        ];
        assert.equal(
          challengerCycle
            .refundChallengeDays,
          28
        );
        assert.equal(
          challengerCycle
            .lockedRefundDays,
          1
        );
        assert.equal(
          defenderCycle
            .defenseAssignmentsInCycle,
          1
        );
        assert.equal(
          defenderCycle
            .lastDefenseAssignedAt
            .toISOString(),
          NOW.toISOString()
        );
      }
    );

    await check(
      "실제 Rank Takeover NO_CANDIDATE는 rollback 후에도 FAILED receipt에 감사 snapshot을 보존",
      async () => {
        await clearData();
        const {
          policy,
          season,
          challenger,
        } =
          await basicWorld();
        await createParticipant({
          label:
            "integrated-capped",
          position: 99,
          policy,
          season,
          completedSubChallenges:
            0,
          defenseAssignmentsInCycle:
            2,
        });
        await issueStartingDays({
          participant:
            challenger,
          policy,
        });
        const assignmentService =
          createService(policy);
        const rankService =
          createRankTakeoverService({
            now: () =>
              new Date(NOW),
            selectSubDefender:
              assignmentService
                .selectSubDefender,
            resolveDeadlinePolicy:
              async () => ({
                startDeadlineMinutes:
                  60,
                submissionDeadlineMinutes:
                  180,
                questionPolicyVersion:
                  "ARENA_PACK_V1",
              }),
            assertPairIntegrity:
              async () => true,
          });
        const error =
          await captureError(
            () =>
              rankService
                .requestChallenge({
                  challengerUserId:
                    challenger
                      .user._id,
                  activeRanking:
                    "SUB",
                  matchType:
                    "NORMAL",
                  idempotencyKey:
                    "integrated-no-candidate",
                })
          );
        assert.equal(
          error.code,
          "NO_CANDIDATE"
        );
        assert.equal(
          await DefenderAssignmentAudit.countDocuments(
            {
              requestId:
                "integrated-no-candidate",
            }
          ),
          0
        );
        assert.equal(
          await RankTakeoverMatch.countDocuments(
            {}
          ),
          0
        );
        assert.equal(
          await DayBalanceTransaction.countDocuments(
            {
              type:
                "MATCH_LOCK",
            }
          ),
          0
        );
        const receipt =
          await RankTakeoverCommandReceipt.findOne(
            {
              commandType:
                "REQUEST_CHALLENGE",
              idempotencyKey:
                "integrated-no-candidate",
            }
          ).lean();
        assert.equal(
          receipt.status,
          "FAILED"
        );
        assert.equal(
          receipt.errorCode,
          "NO_CANDIDATE"
        );
        assert.equal(
          receipt
            .errorDetails
            .defenderSelection
            .auditSnapshot
            .status,
          "NO_CANDIDATE"
        );
        assert.equal(
          receipt
            .errorDetails
            .defenderSelection
            .auditSnapshot
            .requestId,
          "integrated-no-candidate"
        );
      }
    );

    await check(
      "동일 requestId 동시 트랜잭션은 유일 감사 키로 한 선택만 확정",
      async () => {
        await clearData();
        const {
          policy,
          season,
          challenger,
        } =
          await basicWorld();
        await createParticipant({
          label: "candidate",
          position: 99,
          policy,
          season,
        });
        const service =
          createService(policy);
        const calls = [
          1,
          2,
        ].map(() =>
          selectInTransaction({
            service,
            requestId:
              "concurrent-request",
            challenger,
            season,
            policy,
          })
        );
        const outcomes =
          await Promise.allSettled(
            calls
          );
        assert.ok(
          outcomes.some(
            (outcome) =>
              outcome.status ===
              "fulfilled"
          )
        );
        assert.equal(
          await DefenderAssignmentAudit.countDocuments(
            {
              requestId:
                "concurrent-request",
            }
          ),
          1
        );
        const committed =
          await DefenderAssignmentAudit.findOne(
            {
              requestId:
                "concurrent-request",
            }
          ).lean();
        assert.ok(
          committed
            .selectedDefenderUserId
        );
      }
    );

    await check(
      "서로 다른 challenger는 같은 requestId를 독립 멱등 범위로 사용",
      async () => {
        await clearData();
        const {
          policy,
          season,
          challenger,
        } =
          await basicWorld();
        await createParticipant({
          label: "candidate",
          position: 99,
          policy,
          season,
        });
        const otherChallenger =
          await createParticipant({
            label: "other-challenger",
            position: 80,
            policy,
            season,
          });
        await createParticipant({
          label:
            "other-candidate",
          position: 79,
          policy,
          season,
        });
        const service =
          createService(policy);
        const first =
          await selectInTransaction({
            service,
            requestId:
              "actor-scoped-request",
            challenger,
            season,
            policy,
          });
        const second =
          await selectInTransaction({
            service,
            requestId:
              "actor-scoped-request",
            challenger:
              otherChallenger,
            season,
            policy,
          });
        assert.ok(first.userId);
        assert.ok(second.userId);
        assert.notEqual(
          first.auditId,
          second.auditId
        );
        assert.equal(
          await DefenderAssignmentAudit.countDocuments(
            {
              requestId:
                "actor-scoped-request",
            }
          ),
          2
        );
      }
    );

    await check(
      "미게시 Sub 배정 정책은 resolver가 값을 공급해도 POLICY_PENDING",
      async () => {
        await clearData();
        const {
          policy,
          season,
          challenger,
        } =
          await basicWorld({
            policyOverrides: {
              subDefenderMaxHigherPositionGap:
                null,
            },
          });
        await createParticipant({
          label: "candidate",
          position: 99,
          policy,
          season,
        });
        const error =
          await captureError(
            () =>
              selectInTransaction({
                service:
                  createService(
                    policy
                  ),
                requestId:
                  "unpublished-range",
                challenger,
                season,
                policy,
              })
          );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
        assert.equal(
          error.details
            .reasonCode,
          "SUB_DEFENDER_MAX_HIGHER_POSITION_GAP_UNSET"
        );
      }
    );

    await check(
      "resolver의 policy version 불일치는 POLICY_PENDING",
      async () => {
        await clearData();
        const {
          policy,
          season,
          challenger,
        } =
          await basicWorld();
        await createParticipant({
          label: "candidate",
          position: 99,
          policy,
          season,
        });
        const basePolicyResolver =
          resolverHarness({
            policy,
          })
            .resolveAssignmentPolicy;
        const service =
          createService(
            policy,
            {},
            {
              resolveAssignmentPolicy:
                async (input) => ({
                  ...(await basePolicyResolver(
                    input
                  )),
                  rankRangePolicyVersion:
                    "ATTACKER_RANGE_V9",
                }),
            }
          );
        const error =
          await captureError(
            () =>
              selectInTransaction({
                service,
                requestId:
                  "mismatched-version",
                challenger,
                season,
                policy,
              })
          );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
        assert.equal(
          error.details
            .reasonCode,
          "ASSIGNMENT_POLICY_FACT_MISMATCH"
        );
        assert.equal(
          error.details.field,
          "rankRangePolicyVersion"
        );
      }
    );

    await check(
      "resolver가 임의 max gap을 넓혀 정책 범위를 우회하지 못함",
      async () => {
        await clearData();
        const {
          policy,
          season,
          challenger,
        } =
          await basicWorld({
            policyOverrides: {
              subDefenderMaxHigherPositionGap:
                5,
            },
          });
        await createParticipant({
          label:
            "out-of-policy-candidate",
          position: 90,
          policy,
          season,
        });
        const error =
          await captureError(
            () =>
              selectInTransaction({
                service:
                  createService(
                    policy,
                    {
                      maxGap: 20,
                    }
                  ),
                requestId:
                  "expanded-gap",
                challenger,
                season,
                policy,
              })
          );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
        assert.equal(
          error.details
            .reasonCode,
          "ASSIGNMENT_POLICY_FACT_MISMATCH"
        );
        assert.equal(
          error.details.field,
          "maxHigherPositionGap"
        );
      }
    );

    await check(
      "반환 snapshot은 seed·후보·가중치를 제거하고 상세 판정은 내부 감사에만 보존",
      async () => {
        await clearData();
        const {
          policy,
          season,
          challenger,
        } =
          await basicWorld();
        const related =
          await createParticipant({
            label: "related",
            position: 99,
            policy,
            season,
          });
        const service =
          createService(
            policy,
            {
              relatedUsers:
                new Set([
                  String(
                    related
                      .user._id
                  ),
                ]),
            }
          );
        const result =
          await selectInTransaction({
            service,
            requestId:
              "pii-minimized",
            challenger,
            season,
            policy,
          });
        const serialized =
          JSON.stringify(
            result.auditSnapshot
          );
        for (const key of [
          "selectionSeed",
          "candidates",
          "policySnapshot",
          "challengerUserId",
        ]) {
          assert.equal(
            Object.prototype
              .hasOwnProperty.call(
                result
                  .auditSnapshot,
                key
              ),
            false,
            `${key} leaked into the adapter snapshot`
          );
        }
        assert.doesNotMatch(
          serialized,
          /"rawWeight"|"probability"/i
        );
        assert.doesNotMatch(
          serialized,
          /deviceId|ipAddress|paymentMethod|cardNumber|relationReason|STRONG_RELATION_BLOCKED/i
        );
        const detailedAudit =
          await DefenderAssignmentAudit
            .findById(
              result.auditId
            )
            .lean();
        assert.match(
          JSON.stringify(
            detailedAudit
          ),
          /STRONG_RELATION_BLOCKED/
        );
      }
    );
  } finally {
    await mongoose.disconnect();
    await replSet.stop();
  }

  const failed =
    checks.filter(
      ({ passed }) =>
        !passed
    );
  console.log(
    `\n${checks.length - failed.length}/${checks.length} defender assignment checks passed.`
  );
  if (failed.length > 0) {
    throw failed[0].error;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
