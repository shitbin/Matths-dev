const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const {
  MongoMemoryReplSet,
} = require("mongodb-memory-server");

const {
  ArenaPairIntegrityDecision,
  canonicalPair,
} = require(
  "../models/arenaPairIntegrityDecisionModel"
);
const {
  ArenaSeason,
} = require("../models/arenaSeasonModel");
const {
  PolicyVersion,
} = require("../models/policyVersionModel");
const {
  createArenaPairIntegrityService,
} = require(
  "../services/arenaPairIntegrityService"
);

const NOW = new Date(
  "2026-07-10T03:00:00.000Z"
);
const HOUR_MS = 3_600_000;
const checks = [];
let sequence = 1;

function digest(value) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

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

async function clearData() {
  // The decision model intentionally rejects application-level deletion.
  // Test isolation uses the underlying ephemeral collection only.
  await ArenaPairIntegrityDecision
    .collection.deleteMany({});
  await ArenaSeason.deleteMany({});
  await PolicyVersion.deleteMany({});
}

async function createWorld() {
  const policy =
    await PolicyVersion.create({
      version:
        `pair-integrity-v${sequence}`,
      effectiveFrom: new Date(
        "2026-07-01T00:00:00.000Z"
      ),
      publishedAt: new Date(
        "2026-06-30T00:00:00.000Z"
      ),
    });
  const season =
    await ArenaSeason.create({
      seasonId:
        `pair-integrity-season-${sequence}`,
      title:
        "GOAT Arena Pair Integrity Test",
      startsAt: new Date(
        "2026-07-01T00:00:00.000Z"
      ),
      endsAt: new Date(
        "2026-08-01T00:00:00.000Z"
      ),
      status: "SCHEDULED",
      policyVersionId: policy._id,
    });
  sequence += 1;
  return {
    policy,
    season,
    userAId: objectId(),
    userBId: objectId(),
  };
}

async function verifyTrustedIssuer({
  issuerType,
  issuerId,
  issuerContext,
}) {
  if (
    issuerContext?.token !==
    "trusted-test-issuer"
  ) {
    return { authorized: false };
  }
  return {
    authorized: true,
    issuerType,
    issuerKey:
      `${issuerType}:${issuerId}`,
    verificationMethod:
      issuerType === "ADMIN"
        ? "ADMIN_SESSION"
        : "RISK_ENGINE_SIGNATURE",
  };
}

function createService(overrides = {}) {
  return createArenaPairIntegrityService({
    now: () => new Date(NOW),
    verifyTrustedIssuer,
    ...overrides,
  });
}

function issueInput(
  world,
  overrides = {}
) {
  const key =
    overrides.idempotencyKey ||
    `pair-decision-${sequence++}`;
  return {
    idempotencyKey: key,
    userAId: world.userAId,
    userBId: world.userBId,
    seasonId: world.season._id,
    policyVersionId:
      world.policy._id,
    decision: "ALLOW",
    reasonCodes: [
      "RISK_SCREEN_CLEAR",
    ],
    evidenceFingerprint:
      digest(`evidence-${key}`),
    expiresAt: new Date(
      NOW.getTime() + HOUR_MS
    ),
    issuerType: "RISK_ENGINE",
    issuerId: "risk-engine-test",
    ...overrides,
  };
}

function issuerOptions(overrides = {}) {
  return {
    issuerContext: {
      token:
        "trusted-test-issuer",
    },
    ...overrides,
  };
}

function rankAdapterInput(
  world,
  overrides = {}
) {
  return {
    challengerUser: {
      _id: world.userAId,
    },
    defenderUser: {
      _id: world.userBId,
    },
    challengerCycle: {
      policyVersionId:
        world.policy._id,
    },
    defenderCycle: {
      policyVersionId:
        world.policy._id,
    },
    season: world.season,
    now: new Date(NOW),
    ...overrides,
  };
}

function defenderAdapterInput(
  world,
  overrides = {}
) {
  return {
    challengerUserId:
      world.userAId,
    candidateUserId:
      world.userBId,
    policy: world.policy,
    season: world.season,
    now: new Date(NOW),
    ...overrides,
  };
}

function assertPending(
  error,
  reasonCode
) {
  assert.equal(
    error.code,
    "POLICY_PENDING"
  );
  assert.equal(
    error.details?.reasonCode,
    reasonCode
  );
}

async function run() {
  console.log(
    "\nArena pair integrity service"
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
      ArenaPairIntegrityDecision
        .syncIndexes(),
      ArenaSeason.syncIndexes(),
      PolicyVersion.syncIndexes(),
    ]);

    await check(
      "사용자 순서와 무관하게 canonical pair로 ALLOW를 저장하고 두 adapter가 허용",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createService();
        const input =
          issueInput(world, {
            userAId:
              world.userBId,
            userBId:
              world.userAId,
          });
        const decision =
          await service
            .issuePairIntegrityDecision(
              input,
              issuerOptions()
            );
        const expected =
          canonicalPair(
            world.userAId,
            world.userBId
          );

        assert.equal(
          decision.pairKey,
          expected.pairKey
        );
        assert.equal(
          String(
            decision.lowerUserId
          ),
          String(
            expected.lowerUserId
          )
        );
        assert.equal(
          await service
            .assertPairIntegrity(
              rankAdapterInput(
                world
              )
            ),
          true
        );
        assert.deepEqual(
          await service
            .resolveStrongRelation(
              defenderAdapterInput(
                world
              )
            ),
          { blocked: false }
        );
        const publicDecision =
          await service
            .latestDecisionFor(
              rankAdapterInput(
                world
              )
            );
        assert.equal(
          publicDecision.decision,
          "ALLOW"
        );
        for (const privateField of [
          "evidenceFingerprint",
          "issuerType",
          "issuerKey",
          "issuerVerificationMethod",
          "requestFingerprint",
          "idempotencyKey",
        ]) {
          assert.equal(
            Object.prototype
              .hasOwnProperty.call(
                publicDecision,
                privateField
              ),
            false,
            privateField
          );
        }
      }
    );

    await check(
      "동일 idempotency 동시 발급은 한 결정으로 수렴하고 순서를 뒤집은 replay도 동일",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createService();
        const input =
          issueInput(world, {
            idempotencyKey:
              "concurrent-pair-allow",
          });
        const [first, second] =
          await Promise.all([
            service
              .issuePairIntegrityDecision(
                input,
                issuerOptions()
              ),
            service
              .issuePairIntegrityDecision(
                input,
                issuerOptions()
              ),
          ]);
        const replay =
          await service
            .issuePairIntegrityDecision(
              {
                ...input,
                userAId:
                  world.userBId,
                userBId:
                  world.userAId,
              },
              issuerOptions()
            );

        assert.equal(
          String(first._id),
          String(second._id)
        );
        assert.equal(
          String(first._id),
          String(replay._id)
        );
        assert.equal(
          await ArenaPairIntegrityDecision
            .countDocuments({}),
          1
        );
      }
    );

    await check(
      "서로 다른 동시 successor는 정확히 하나만 같은 predecessor 뒤에 기록",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createService();
        const initial =
          await service
            .issuePairIntegrityDecision(
              issueInput(world),
              issuerOptions()
            );
        const blockInput =
          issueInput(world, {
            decision: "BLOCK",
            reasonCodes: [
              "SAME_DEVICE_PATTERN",
            ],
            transitionType:
              "SUPERSEDES",
            supersedesDecisionId:
              initial._id,
          });
        const reviewInput =
          issueInput(world, {
            decision: "REVIEW",
            reasonCodes: [
              "RISK_THRESHOLD_REVIEW",
            ],
            transitionType:
              "SUPERSEDES",
            supersedesDecisionId:
              initial._id,
          });
        const outcomes =
          await Promise.allSettled([
            service
              .issuePairIntegrityDecision(
                blockInput,
                issuerOptions()
              ),
            service
              .issuePairIntegrityDecision(
                reviewInput,
                issuerOptions()
              ),
          ]);
        assert.equal(
          outcomes.filter(
            ({ status }) =>
              status ===
              "fulfilled"
          ).length,
          1
        );
        assert.equal(
          await ArenaPairIntegrityDecision
            .countDocuments({
              predecessorDecisionId:
                initial._id,
            }),
          1
        );
        assert.equal(
          await ArenaPairIntegrityDecision
            .countDocuments({}),
          2
        );
      }
    );

    await check(
      "서로 다른 동시 successor는 정확히 하나만 같은 predecessor 뒤에 기록",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createService();
        const initial =
          await service
            .issuePairIntegrityDecision(
              issueInput(world),
              issuerOptions()
            );
        const blockInput =
          issueInput(world, {
            decision: "BLOCK",
            reasonCodes: [
              "SAME_DEVICE_PATTERN",
            ],
            transitionType:
              "SUPERSEDES",
            supersedesDecisionId:
              initial._id,
          });
        const reviewInput =
          issueInput(world, {
            decision: "REVIEW",
            reasonCodes: [
              "RISK_THRESHOLD_REVIEW",
            ],
            transitionType:
              "SUPERSEDES",
            supersedesDecisionId:
              initial._id,
          });
        const outcomes =
          await Promise.allSettled([
            service
              .issuePairIntegrityDecision(
                blockInput,
                issuerOptions()
              ),
            service
              .issuePairIntegrityDecision(
                reviewInput,
                issuerOptions()
              ),
          ]);
        assert.equal(
          outcomes.filter(
            ({ status }) =>
              status ===
              "fulfilled"
          ).length,
          1
        );
        assert.equal(
          await ArenaPairIntegrityDecision
            .countDocuments({
              predecessorDecisionId:
                initial._id,
            }),
          1
        );
        assert.equal(
          await ArenaPairIntegrityDecision
            .countDocuments({}),
          2
        );
      }
    );

    await check(
      "같은 idempotency key의 사실 변경 replay는 거절",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createService();
        const input =
          issueInput(world, {
            idempotencyKey:
              "altered-pair-replay",
          });
        await service
          .issuePairIntegrityDecision(
            input,
            issuerOptions()
          );
        const error =
          await captureError(() =>
            service
              .issuePairIntegrityDecision(
                {
                  ...input,
                  decision: "BLOCK",
                  reasonCodes: [
                    "CONFIRMED_COLLUSION",
                  ],
                },
                issuerOptions()
              )
          );
        assert.equal(
          error.code,
          "IDEMPOTENCY_KEY_CONFLICT"
        );
        assert.equal(
          await ArenaPairIntegrityDecision
            .countDocuments({}),
          1
        );
      }
    );

    await check(
      "BLOCK은 rank adapter false, defender adapter blocked true",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createService();
        await service
          .issuePairIntegrityDecision(
            issueInput(world, {
              decision: "BLOCK",
              reasonCodes: [
                "CONFIRMED_COLLUSION",
              ],
            }),
            issuerOptions()
          );
        assert.equal(
          await service
            .assertPairIntegrity(
              rankAdapterInput(
                world
              )
            ),
          false
        );
        assert.deepEqual(
          await service
            .resolveStrongRelation(
              defenderAdapterInput(
                world
              )
            ),
          { blocked: true }
        );
      }
    );

    await check(
      "결정 누락은 POLICY_PENDING, REVIEW는 두 adapter에서 명시적으로 차단",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createService();
        const missing =
          await captureError(() =>
            service
              .assertPairIntegrity(
                rankAdapterInput(
                  world
                )
              )
          );
        assertPending(
          missing,
          "PAIR_INTEGRITY_DECISION_MISSING"
        );

        await service
          .issuePairIntegrityDecision(
            issueInput(world, {
              decision: "REVIEW",
              reasonCodes: [
                "MANUAL_REVIEW_REQUIRED",
              ],
            }),
            issuerOptions()
          );
        assert.equal(
          await service
            .assertPairIntegrity(
              rankAdapterInput(
                world
              )
            ),
          false
        );
        assert.deepEqual(
          await service
            .resolveStrongRelation(
              defenderAdapterInput(
                world
              )
            ),
          { blocked: true }
        );
      }
    );

    await check(
      "만료된 결정과 season/policy version 불일치는 POLICY_PENDING",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createService();
        await service
          .issuePairIntegrityDecision(
            issueInput(world),
            issuerOptions()
          );
        const expired =
          await captureError(() =>
            service
              .assertPairIntegrity(
                rankAdapterInput(
                  world,
                  {
                    now: new Date(
                      NOW.getTime() +
                        2 * HOUR_MS
                    ),
                  }
                )
              )
          );
        assertPending(
          expired,
          "PAIR_INTEGRITY_DECISION_EXPIRED"
        );

        const otherPolicy =
          await PolicyVersion.create({
            version:
              `pair-integrity-v${sequence++}`,
            effectiveFrom: new Date(
              "2026-07-01T00:00:00.000Z"
            ),
          });
        const mismatchSeason = {
          ...world.season
            .toObject(),
          policyVersionId:
            otherPolicy._id,
        };
        const policyMismatch =
          await captureError(() =>
            service
              .resolveStrongRelation(
                defenderAdapterInput(
                  world,
                  {
                    policy:
                      otherPolicy,
                    season:
                      mismatchSeason,
                  }
                )
              )
          );
        assertPending(
          policyMismatch,
          "PAIR_INTEGRITY_POLICY_VERSION_MISMATCH"
        );

        const otherSeason =
          await ArenaSeason.create({
            seasonId:
              `pair-integrity-season-${sequence++}`,
            title:
              "Other pair season",
            startsAt: new Date(
              "2026-08-01T00:00:00.000Z"
            ),
            endsAt: new Date(
              "2026-09-01T00:00:00.000Z"
            ),
            status: "DRAFT",
            policyVersionId:
              world.policy._id,
          });
        const seasonMismatch =
          await captureError(() =>
            service
              .assertPairIntegrity(
                rankAdapterInput(
                  world,
                  {
                    season:
                      otherSeason,
                  }
                )
              )
          );
        assertPending(
          seasonMismatch,
          "PAIR_INTEGRITY_SEASON_MISMATCH"
        );
      }
    );

    await check(
      "SUPERSEDES와 REVOKES는 최신 predecessor에만 순차 추가되고 revoke 후 REVIEW",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createService();
        const allow =
          await service
            .issuePairIntegrityDecision(
              issueInput(world),
              issuerOptions()
            );
        const block =
          await service
            .issuePairIntegrityDecision(
              issueInput(world, {
                decision: "BLOCK",
                reasonCodes: [
                  "CONFIRMED_COLLUSION",
                ],
                transitionType:
                  "SUPERSEDES",
                supersedesDecisionId:
                  allow._id,
              }),
              issuerOptions()
            );
        assert.equal(
          block.chainSequence,
          2
        );
        assert.equal(
          String(
            block
              .predecessorDecisionId
          ),
          String(allow._id)
        );
        assert.equal(
          await service
            .assertPairIntegrity(
              rankAdapterInput(
                world
              )
            ),
          false
        );

        const revoked =
          await service
            .issuePairIntegrityDecision(
              issueInput(world, {
                decision: "REVIEW",
                reasonCodes: [
                  "PRIOR_DECISION_REVOKED",
                ],
                transitionType:
                  "REVOKES",
                revokesDecisionId:
                  block._id,
              }),
              issuerOptions()
            );
        assert.equal(
          revoked.chainSequence,
          3
        );
        assert.deepEqual(
          await service
            .resolveStrongRelation(
              defenderAdapterInput(
                world
              )
            ),
          { blocked: true }
        );

        const stale =
          await captureError(() =>
            service
              .issuePairIntegrityDecision(
                issueInput(world, {
                  decision: "ALLOW",
                  reasonCodes: [
                    "ADMIN_REVIEW_CLEARED",
                  ],
                  transitionType:
                    "SUPERSEDES",
                  supersedesDecisionId:
                    allow._id,
                }),
                issuerOptions()
              )
          );
        assert.equal(
          stale.code,
          "PAIR_INTEGRITY_STALE_PREDECESSOR"
        );
      }
    );

    await check(
      "발급은 trusted issuer verifier와 issuer별 올바른 검증 방식이 필수",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const noVerifier =
          createArenaPairIntegrityService({
            now: () =>
              new Date(NOW),
          });
        const missing =
          await captureError(() =>
            noVerifier
              .issuePairIntegrityDecision(
                issueInput(world),
                issuerOptions()
              )
          );
        assert.equal(
          missing.code,
          "PAIR_INTEGRITY_ISSUER_VERIFIER_REQUIRED"
        );

        const rejecting =
          createService({
            verifyTrustedIssuer:
              async () => ({
                authorized: false,
              }),
          });
        const rejected =
          await captureError(() =>
            rejecting
              .issuePairIntegrityDecision(
                issueInput(world),
                issuerOptions()
              )
          );
        assert.equal(
          rejected.code,
          "PAIR_INTEGRITY_ISSUER_NOT_TRUSTED"
        );

        const wrongMethod =
          createService({
            verifyTrustedIssuer:
              async ({
                issuerType,
                issuerId,
              }) => ({
                authorized: true,
                issuerType,
                issuerKey:
                  `${issuerType}:${issuerId}`,
                verificationMethod:
                  "ADMIN_SESSION",
              }),
          });
        const mismatched =
          await captureError(() =>
            wrongMethod
              .issuePairIntegrityDecision(
                issueInput(world),
                issuerOptions()
              )
          );
        assert.equal(
          mismatched.code,
          "PAIR_INTEGRITY_ISSUER_VERIFICATION_INVALID"
        );
        assert.equal(
          await ArenaPairIntegrityDecision
            .countDocuments({}),
          0
        );
      }
    );

    await check(
      "raw IP/device/payment/evidence 신호 입력은 전부 저장 전에 거절",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createService();
        for (const [
          field,
          value,
        ] of [
          [
            "ipAddress",
            "203.0.113.10",
          ],
          [
            "deviceId",
            "raw-device-id",
          ],
          [
            "paymentMethod",
            "raw-payment-id",
          ],
          [
            "answerPattern",
            "raw-answer-pattern",
          ],
          [
            "rawEvidence",
            { answerPattern: "raw" },
          ],
        ]) {
          const error =
            await captureError(() =>
              service
                .issuePairIntegrityDecision(
                  {
                    ...issueInput(
                      world
                    ),
                    [field]: value,
                  },
                  issuerOptions()
                )
            );
          assert.equal(
            error.code,
            "RAW_PAIR_INTEGRITY_SIGNAL_FORBIDDEN"
          );
        }
        assert.equal(
          await ArenaPairIntegrityDecision
            .countDocuments({}),
          0
        );
      }
    );

    await check(
      "발급 transaction rollback은 결정도 함께 되돌림",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createService();
        const session =
          await mongoose
            .startSession();
        try {
          const sentinel =
            new Error(
              "force outer rollback"
            );
          const error =
            await captureError(
              async () => {
                await session
                  .withTransaction(
                    async () => {
                      await service
                        .issuePairIntegrityDecision(
                          issueInput(
                            world
                          ),
                          issuerOptions({
                            session,
                          })
                        );
                      throw sentinel;
                    }
                  );
              }
            );
          assert.equal(
            error,
            sentinel
          );
        } finally {
          await session
            .endSession();
        }
        assert.equal(
          await ArenaPairIntegrityDecision
            .countDocuments({}),
          0
        );
      }
    );

    await check(
      "결정 문서는 update/replace/delete/bulk/direct insert 모두 거절하는 append-only",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createService();
        const decision =
          await service
            .issuePairIntegrityDecision(
              issueInput(world),
              issuerOptions()
            );
        const mutations = [
          () =>
            ArenaPairIntegrityDecision
              .updateOne(
                { _id: decision._id },
                {
                  $set: {
                    decision: "BLOCK",
                  },
                }
              ),
          () =>
            ArenaPairIntegrityDecision
              .replaceOne(
                { _id: decision._id },
                decision.toObject()
              ),
          () =>
            ArenaPairIntegrityDecision
              .deleteOne({
                _id: decision._id,
              }),
          () =>
            ArenaPairIntegrityDecision
              .bulkWrite([
                {
                  deleteOne: {
                    filter: {
                      _id: decision._id,
                    },
                  },
                },
              ]),
        ];
        for (const mutate of
          mutations) {
          const error =
            await captureError(
              mutate
            );
          assert.equal(
            error.code,
            "ARENA_PAIR_INTEGRITY_DECISION_IMMUTABLE"
          );
        }

        decision.decision =
          "BLOCK";
        const resave =
          await captureError(() =>
            decision.save()
          );
        assert.equal(
          resave.code,
          "ARENA_PAIR_INTEGRITY_DECISION_IMMUTABLE"
        );

        const direct =
          await captureError(() =>
            ArenaPairIntegrityDecision
              .create({
                ...decision
                  .toObject(),
                _id: objectId(),
                decisionId:
                  "direct-create",
                idempotencyKey:
                  "direct-create",
              })
          );
        assert.equal(
          direct.code,
          "ARENA_PAIR_INTEGRITY_TRUSTED_ISSUER_REQUIRED"
        );

        const bulkInsert =
          await captureError(() =>
            ArenaPairIntegrityDecision
              .insertMany([
                {
                  ...decision
                    .toObject(),
                  _id: objectId(),
                  decisionId:
                    "direct-insert-many",
                  idempotencyKey:
                    "direct-insert-many",
                },
              ])
          );
        assert.equal(
          bulkInsert.code,
          "ARENA_PAIR_INTEGRITY_TRUSTED_ISSUER_REQUIRED"
        );
        assert.equal(
          await ArenaPairIntegrityDecision
            .countDocuments({}),
          1
        );
      }
    );

    await check(
      "season과 다른 policy 발급 및 decision/reason 조합은 transaction에서 거절",
      async () => {
        await clearData();
        const world =
          await createWorld();
        const service =
          createService();
        const otherPolicy =
          await PolicyVersion.create({
            version:
              `pair-integrity-v${sequence++}`,
            effectiveFrom: new Date(
              "2026-07-01T00:00:00.000Z"
            ),
          });
        const mismatch =
          await captureError(() =>
            service
              .issuePairIntegrityDecision(
                issueInput(world, {
                  policyVersionId:
                    otherPolicy._id,
                }),
                issuerOptions()
              )
          );
        assert.equal(
          mismatch.code,
          "PAIR_INTEGRITY_POLICY_VERSION_MISMATCH"
        );

        const invalidReason =
          await captureError(() =>
            service
              .issuePairIntegrityDecision(
                issueInput(world, {
                  decision: "ALLOW",
                  reasonCodes: [
                    "CONFIRMED_COLLUSION",
                  ],
                }),
                issuerOptions()
              )
          );
        assert.equal(
          invalidReason.name,
          "ValidationError"
        );
        assert.equal(
          await ArenaPairIntegrityDecision
            .countDocuments({}),
          0
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
