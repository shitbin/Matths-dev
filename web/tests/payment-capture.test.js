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
  DayBalanceTransaction,
} = require(
  "../models/dayBalanceTransactionModel"
);
const {
  User,
  RankingProfile,
} = require(
  "../models/matthsModel"
);
const {
  OutboxEvent,
} = require(
  "../models/outboxEventModel"
);
const {
  PaymentOrder,
} = require(
  "../models/paymentOrderModel"
);
const {
  PaymentWebhookInbox,
} = require(
  "../models/paymentWebhookInboxModel"
);
const {
  PolicyVersion,
} = require(
  "../models/policyVersionModel"
);
const {
  processCapturedPayment,
} = require(
  "../services/paymentCaptureService"
);

const PAID_AT =
  new Date(
    "2026-07-30T03:00:00.000Z"
  );
const PROCESSED_AT =
  new Date(
    "2026-07-30T03:00:01.000Z"
  );

const checks = [];

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

let serial = 0;

async function createUser(
  label
) {
  serial += 1;
  return User.create({
    name: `${label}${serial}`,
    realName:
      "결제 검증 학생",
    email:
      `capture-${label}-${serial}@example.com`,
    passwordHash:
      "not-a-real-password-hash",
    schoolGrade: 12,
    accountStatus:
      "active",
    isActive: true,
    school: {
      region: "경기도",
      code: "7530909",
      name:
        "경기외국어고등학교",
    },
  });
}

async function createPolicy({
  version,
  ready = true,
}) {
  return PolicyVersion.create({
    version,
    effectiveFrom:
      new Date(
        "2026-07-01T00:00:00.000Z"
      ),
    publishedAt:
      new Date(
        "2026-06-30T00:00:00.000Z"
      ),
    completionPass:
      ready
        ? {
            cycleDay: 30,
            opensAtKst:
              "06:00",
            deadlineAtKst:
              "23:30",
            allowedActivityTypes:
              [
                "PRACTICE",
                "QUICK_PRACTICE",
                "ASSESSMENT",
              ],
          }
        : {
            cycleDay: 30,
          },
    minRecognizedProblemsPerDay:
      ready ? 3 : null,
    minValidStudySecondsPerDay:
      ready ? 300 : null,
    noShowCountsAsCompletedChallenge:
      ready ? false : null,
    noShowCountsAsDefenseWin:
      ready ? false : null,
    arenaTierStepMappingVersion:
      ready
        ? "ARENA_STEP_V1"
        : null,
    revengeBypassesProtection:
      ready ? false : null,
    revengeBypassesShield:
      ready ? false : null,
    suddenDeathSecondsPerProblem:
      ready ? 90 : null,
  });
}

async function createOrderAndInbox({
  user,
  policy,
  suffix,
  amountMinor = 29000,
}) {
  const providerOrderId =
    `order-${suffix}`;
  const webhookEventId =
    `event-${suffix}`;
  const order =
    await PaymentOrder.create({
      userId: user._id,
      policyVersionId:
        policy._id,
      provider:
        "testpay",
      providerOrderId,
      listPriceMinor: 30000,
      discountMinor: 1000,
      status: "AUTHORIZED",
    });
  const inbox =
    await PaymentWebhookInbox.create({
      provider:
        "testpay",
      webhookEventId,
      eventType:
        "PAYMENT_CAPTURED",
      payloadHash:
        "a".repeat(64),
      payloadSizeBytes: 120,
      signatureVerification:
        {
          status:
            "VERIFIED",
          checkedAt:
            PAID_AT,
          reasonCode: "",
        },
      status: "RECEIVED",
      receivedAt:
        PAID_AT,
      nextRetryAt:
        PAID_AT,
    });
  return {
    order,
    inbox,
    capture: {
      inboxId:
        String(inbox._id),
      provider:
        "testpay",
      providerOrderId,
      providerTransactionId:
        `transaction-${suffix}`,
      webhookEventId,
      amountMinor,
      currency: "KRW",
      paidAt:
        PAID_AT,
    },
  };
}

async function run() {
  const replicaSet =
    await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        storageEngine:
          "wiredTiger",
      },
    });

  try {
    await mongoose.connect(
      replicaSet.getUri(
        "payment-capture"
      )
    );
    await Promise.all(
      [
        AccessCycle,
        ArenaProfile,
        ArenaSeason,
        DayBalanceTransaction,
        OutboxEvent,
        PaymentOrder,
        PaymentWebhookInbox,
        PolicyVersion,
        RankingProfile,
        User,
      ].map((model) =>
        model.syncIndexes()
      )
    );

    const policy =
      await createPolicy({
        version:
          "CAPTURE-READY-V1",
      });
    const season =
      await ArenaSeason.create({
        seasonId:
          "capture-season",
        title:
          "결제 승인 검증 시즌",
        startsAt:
          new Date(
            "2026-07-01T00:00:00.000Z"
          ),
        endsAt:
          new Date(
            "2026-09-01T00:00:00.000Z"
          ),
        status: "ACTIVE",
        currentWeekKey:
          "2026-W31",
        reseedStatus:
          "COMPLETED",
        lastSeededAt:
          new Date(
            "2026-07-27T00:00:00.000Z"
          ),
        policyVersionId:
          policy._id,
      });
    assert.ok(season);

    const firstUser =
      await createUser(
        "first"
      );
    await RankingProfile.create({
      userId:
        firstUser._id,
      mmr: 1475,
      status:
        "CONFIRMED",
      datasetOnly: false,
    });
    const first =
      await createOrderAndInbox({
        user: firstUser,
        policy,
        suffix: "first",
      });

    let firstResult;
    await check(
      "검증된 결제 승인은 주문·주기·원장·Sub 좌석·Outbox를 한 트랜잭션으로 만든다",
      async () => {
        firstResult =
          await processCapturedPayment(
            first.capture,
            {
              connection:
                mongoose.connection,
              now:
                PROCESSED_AT,
            }
          );
        assert.equal(
          firstResult.duplicate,
          false
        );

        const [
          order,
          cycle,
          ledger,
          profile,
          inbox,
          events,
        ] = await Promise.all([
          PaymentOrder.findById(
            first.order._id
          ),
          AccessCycle.findOne({
            paymentOrderId:
              first.order._id,
          }),
          DayBalanceTransaction.findOne({
            orderId:
              first.order._id,
          }),
          ArenaProfile.findOne({
            userId:
              firstUser._id,
            status: "ACTIVE",
          }),
          PaymentWebhookInbox.findById(
            first.inbox._id
          ),
          OutboxEvent.find({
            aggregateId: {
              $in: [
                String(
                  first.order._id
                ),
                String(
                  firstResult
                    .cycle._id
                ),
              ],
            },
          }),
        ]);

        assert.equal(
          order.status,
          "CAPTURED"
        );
        assert.equal(
          order
            .actualPaidMinor,
          29000
        );
        assert.equal(
          cycle.status,
          "SUB_ACTIVE"
        );
        assert.equal(
          cycle
            .refundChallengeDays,
          29
        );
        assert.equal(
          ledger.type,
          "PACKAGE_ISSUE"
        );
        assert.equal(
          profile.activeRanking,
          "SUB"
        );
        assert.equal(
          profile.arenaPosition,
          1
        );
        assert.equal(
          profile.mmrAtLastSeed,
          1475
        );
        assert.equal(
          inbox.status,
          "PROCESSED"
        );
        assert.deepEqual(
          new Set(
            events.map(
              (event) =>
                event.eventType
            )
          ),
          new Set([
            "PACKAGE_PURCHASED",
            "CYCLE_STARTED",
          ])
        );
      }
    );

    await check(
      "같은 webhook 재처리는 경제 결과를 한 번만 남긴다",
      async () => {
        const duplicate =
          await processCapturedPayment(
            first.capture,
            {
              connection:
                mongoose.connection,
              now:
                new Date(
                  PROCESSED_AT.getTime() +
                    1000
                ),
            }
          );
        assert.equal(
          duplicate.duplicate,
          true
        );
        assert.equal(
          await AccessCycle.countDocuments({
            paymentOrderId:
              first.order._id,
          }),
          1
        );
        assert.equal(
          await DayBalanceTransaction.countDocuments({
            orderId:
              first.order._id,
          }),
          1
        );
        assert.equal(
          await OutboxEvent.countDocuments({
            $or: [
              {
                aggregateId:
                  String(
                    first
                      .order._id
                  ),
              },
              {
                aggregateId:
                  String(
                    firstResult
                      .cycle._id
                  ),
              },
            ],
          }),
          2
        );
      }
    );

    await check(
      "같은 주문의 다른 거래번호 replay는 멱등 성공으로 위장하지 않는다",
      async () => {
        const conflictEventId =
          "event-first-conflict";
        const conflictInbox =
          await PaymentWebhookInbox.create({
            provider:
              "testpay",
            webhookEventId:
              conflictEventId,
            eventType:
              "PAYMENT_CAPTURED",
            payloadHash:
              "b".repeat(64),
            payloadSizeBytes:
              121,
            signatureVerification:
              {
                status:
                  "VERIFIED",
                checkedAt:
                  PAID_AT,
                reasonCode: "",
              },
            status:
              "RECEIVED",
            receivedAt:
              PAID_AT,
            nextRetryAt:
              PAID_AT,
          });
        const error =
          await captureError(
            () =>
              processCapturedPayment(
                {
                  ...first.capture,
                  inboxId:
                    String(
                      conflictInbox
                        ._id
                    ),
                  webhookEventId:
                    conflictEventId,
                  providerTransactionId:
                    "transaction-first-tampered",
                },
                {
                  connection:
                    mongoose
                      .connection,
                  now:
                    PROCESSED_AT,
                }
              )
          );
        assert.equal(
          error.code,
          "CAPTURE_REPLAY_CONFLICT"
        );
        assert.equal(
          await AccessCycle.countDocuments({
            paymentOrderId:
              first.order._id,
          }),
          1
        );
      }
    );

    await check(
      "서명 미검증 Inbox는 결제 권한을 만들 수 없다",
      async () => {
        const eventId =
          "event-unverified";
        const inbox =
          await PaymentWebhookInbox.create({
            provider:
              "testpay",
            webhookEventId:
              eventId,
            eventType:
              "PAYMENT_CAPTURED",
            payloadHash:
              "c".repeat(64),
            payloadSizeBytes:
              90,
            signatureVerification:
              {
                status:
                  "INVALID",
                checkedAt:
                  PAID_AT,
                reasonCode:
                  "BAD_SIGNATURE",
              },
            status: "IGNORED",
            ignoreReasonCode:
              "BAD_SIGNATURE",
            receivedAt:
              PAID_AT,
            processedAt:
              PAID_AT,
          });
        const error =
          await captureError(
            () =>
              processCapturedPayment(
                {
                  ...first.capture,
                  inboxId:
                    String(
                      inbox._id
                    ),
                  webhookEventId:
                    eventId,
                },
                {
                  connection:
                    mongoose
                      .connection,
                  now:
                    PROCESSED_AT,
                }
              )
          );
        assert.equal(
          error.code,
          "WEBHOOK_NOT_VERIFIED"
        );
      }
    );

    const pendingUser =
      await createUser(
        "pending"
      );
    const pending =
      await createOrderAndInbox({
        user: pendingUser,
        policy,
        suffix: "pending",
      });
    await check(
      "Placement가 없으면 좌석을 지어내지 않고 PLACEMENT_PENDING으로 둔다",
      async () => {
        const result =
          await processCapturedPayment(
            pending.capture,
            {
              connection:
                mongoose.connection,
              now:
                PROCESSED_AT,
            }
          );
        assert.equal(
          result
            .arenaProfile
            .status,
          "PLACEMENT_PENDING"
        );
        assert.equal(
          result
            .arenaProfile
            .arenaPosition,
          null
        );
        assert.equal(
          result
            .arenaProfile
            .mmrAtLastSeed,
          null
        );
      }
    );

    const concurrentUser =
      await createUser(
        "concurrent"
      );
    await RankingProfile.create({
      userId:
        concurrentUser._id,
      mmr: 1390,
      status:
        "CONFIRMED",
      datasetOnly: false,
    });
    const concurrent =
      await createOrderAndInbox({
        user:
          concurrentUser,
        policy,
        suffix:
          "concurrent",
      });
    await check(
      "동시에 도착한 같은 승인도 주기와 좌석을 각각 한 번만 만든다",
      async () => {
        const settled =
          await Promise.allSettled(
            [
              processCapturedPayment(
                concurrent.capture,
                {
                  connection:
                    mongoose
                      .connection,
                  now:
                    PROCESSED_AT,
                }
              ),
              processCapturedPayment(
                concurrent.capture,
                {
                  connection:
                    mongoose
                      .connection,
                  now:
                    PROCESSED_AT,
                }
              ),
            ]
          );
        assert.equal(
          settled.every(
            (result) =>
              result.status ===
              "fulfilled"
          ),
          true
        );
        assert.deepEqual(
          settled
            .map(
              (result) =>
                result.value
                  .duplicate
            )
            .sort(),
          [false, true]
        );
        assert.equal(
          await AccessCycle.countDocuments({
            paymentOrderId:
              concurrent
                .order._id,
          }),
          1
        );
        assert.equal(
          await ArenaProfile.countDocuments({
            userId:
              concurrentUser._id,
            activeRanking:
              "SUB",
            status: "ACTIVE",
          }),
          1
        );
      }
    );

    const mismatchUser =
      await createUser(
        "mismatch"
      );
    const mismatch =
      await createOrderAndInbox({
        user: mismatchUser,
        policy,
        suffix: "mismatch",
        amountMinor: 28000,
      });
    await check(
      "금액 불일치는 부분 발행 없이 실패 Inbox만 남긴다",
      async () => {
        const error =
          await captureError(
            () =>
              processCapturedPayment(
                mismatch.capture,
                {
                  connection:
                    mongoose
                      .connection,
                  now:
                    PROCESSED_AT,
                }
              )
          );
        assert.equal(
          error.code,
          "PAYMENT_AMOUNT_MISMATCH"
        );
        const [
          order,
          cycleCount,
          ledgerCount,
          inbox,
        ] = await Promise.all([
          PaymentOrder.findById(
            mismatch
              .order._id
          ),
          AccessCycle.countDocuments({
            paymentOrderId:
              mismatch
                .order._id,
          }),
          DayBalanceTransaction.countDocuments({
            orderId:
              mismatch
                .order._id,
          }),
          PaymentWebhookInbox.findById(
            mismatch
              .inbox._id
          ),
        ]);
        assert.equal(
          order.status,
          "AUTHORIZED"
        );
        assert.equal(
          cycleCount,
          0
        );
        assert.equal(
          ledgerCount,
          0
        );
        assert.equal(
          inbox.status,
          "FAILED"
        );
        assert.equal(
          inbox.nextRetryAt,
          null
        );
      }
    );

    const blockedPolicy =
      await createPolicy({
        version:
          "CAPTURE-BLOCKED-V1",
        ready: false,
      });
    const policyUser =
      await createUser(
        "policy"
      );
    const blocked =
      await createOrderAndInbox({
        user: policyUser,
        policy:
          blockedPolicy,
        suffix: "policy",
      });
    await check(
      "미정 정책은 결제가 들어와도 유료 주기를 발행하지 않는다",
      async () => {
        const error =
          await captureError(
            () =>
              processCapturedPayment(
                blocked.capture,
                {
                  connection:
                    mongoose
                      .connection,
                  now:
                    PROCESSED_AT,
                }
              )
          );
        assert.equal(
          error.code,
          "POLICY_NOT_PUBLISHABLE"
        );
        assert.equal(
          await AccessCycle.countDocuments({
            paymentOrderId:
              blocked
                .order._id,
          }),
          0
        );
      }
    );

    const second =
      await createOrderAndInbox({
        user: firstUser,
        policy,
        suffix: "second",
      });
    await check(
      "활성 주기가 있으면 두 번째 패키지를 중복 발행하지 않는다",
      async () => {
        const error =
          await captureError(
            () =>
              processCapturedPayment(
                second.capture,
                {
                  connection:
                    mongoose
                      .connection,
                  now:
                    PROCESSED_AT,
                }
              )
          );
        assert.equal(
          error.code,
          "ACTIVE_CYCLE_EXISTS"
        );
        assert.equal(
          await AccessCycle.countDocuments({
            userId:
              firstUser._id,
          }),
          1
        );
      }
    );

    const invalidUser =
      await createUser(
        "inactive"
      );
    invalidUser.accountStatus =
      "suspended";
    invalidUser.isActive =
      false;
    await invalidUser.save();
    const invalid =
      await createOrderAndInbox({
        user: invalidUser,
        policy,
        suffix: "inactive",
      });
    await check(
      "정지 계정에는 결제 권리를 발행하지 않는다",
      async () => {
        const error =
          await captureError(
            () =>
              processCapturedPayment(
                invalid.capture,
                {
                  connection:
                    mongoose
                      .connection,
                  now:
                    PROCESSED_AT,
                }
              )
          );
        assert.equal(
          error.code,
          "ACCOUNT_NOT_ACTIVE"
        );
        assert.equal(
          await AccessCycle.countDocuments({
            paymentOrderId:
              invalid
                .order._id,
          }),
          0
        );
      }
    );
  } finally {
    await mongoose.disconnect();
    await replicaSet.stop();
  }

  const failed =
    checks.filter(
      (result) =>
        !result.passed
    );
  if (failed.length) {
    process.exitCode = 1;
    throw failed[0].error;
  }
  console.log(
    `\n${checks.length}/${checks.length} payment capture checks passed`
  );
}

run().catch((error) => {
  console.error(
    error.stack ||
      error
  );
  process.exitCode = 1;
});
