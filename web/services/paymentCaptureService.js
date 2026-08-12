const {
  ACTIVE_CYCLE_STATUSES,
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
  createAccessCycleState,
} = require(
  "./accessCycleService"
);
const {
  buildPackageIssueTransaction,
} = require(
  "./dayBalanceLedgerService"
);
const {
  policyReadiness,
} = require(
  "./policyVersionService"
);

const CAPTURABLE_ORDER_STATUSES =
  new Set([
    "CREATED",
    "PENDING",
    "AUTHORIZED",
  ]);

const OPEN_ARENA_PROFILE_STATUSES =
  Object.freeze([
    "PLACEMENT_PENDING",
    "ACTIVE",
    "HIDDEN",
    "SETTLING",
  ]);

class PaymentCaptureError
  extends Error {
  constructor(
    code,
    message,
    {
      statusCode = 409,
      retryable = false,
      cause,
    } = {}
  ) {
    super(message, {
      cause,
    });
    this.name =
      "PaymentCaptureError";
    this.code = code;
    this.statusCode =
      statusCode;
    this.retryable =
      Boolean(retryable);
  }
}

function requiredText(
  value,
  label,
  maxLength = 200
) {
  const normalized =
    String(value || "").trim();
  if (!normalized) {
    throw new PaymentCaptureError(
      "INVALID_CAPTURE_INPUT",
      `${label} is required`,
      {
        statusCode: 400,
      }
    );
  }
  if (
    normalized.length >
    maxLength
  ) {
    throw new PaymentCaptureError(
      "INVALID_CAPTURE_INPUT",
      `${label} is too long`,
      {
        statusCode: 400,
      }
    );
  }
  return normalized;
}

function positiveInteger(
  value,
  label
) {
  const normalized =
    Number(value);
  if (
    !Number.isSafeInteger(
      normalized
    ) ||
    normalized <= 0
  ) {
    throw new PaymentCaptureError(
      "INVALID_CAPTURE_INPUT",
      `${label} must be a positive integer`,
      {
        statusCode: 400,
      }
    );
  }
  return normalized;
}

function validDate(
  value,
  label
) {
  const normalized =
    value instanceof Date
      ? new Date(
          value.getTime()
        )
      : new Date(value);
  if (
    !Number.isFinite(
      normalized.getTime()
    )
  ) {
    throw new PaymentCaptureError(
      "INVALID_CAPTURE_INPUT",
      `${label} must be a valid date`,
      {
        statusCode: 400,
      }
    );
  }
  return normalized;
}

function objectIdText(
  value
) {
  return value
    ? String(value)
    : null;
}

function sameInstant(
  left,
  right
) {
  return (
    left &&
    right &&
    new Date(left).getTime() ===
      new Date(right).getTime()
  );
}

function normalizeCapture(
  input
) {
  const currency =
    requiredText(
      input.currency,
      "currency",
      3
    ).toUpperCase();
  if (currency !== "KRW") {
    throw new PaymentCaptureError(
      "UNSUPPORTED_CURRENCY",
      "only KRW captures are supported",
      {
        statusCode: 400,
      }
    );
  }

  return {
    inboxId:
      requiredText(
        input.inboxId,
        "inboxId",
        100
      ),
    provider:
      requiredText(
        input.provider,
        "provider",
        60
      ).toLowerCase(),
    providerOrderId:
      requiredText(
        input.providerOrderId,
        "providerOrderId"
      ),
    providerTransactionId:
      requiredText(
        input
          .providerTransactionId,
        "providerTransactionId"
      ),
    webhookEventId:
      requiredText(
        input.webhookEventId,
        "webhookEventId"
      ),
    amountMinor:
      positiveInteger(
        input.amountMinor,
        "amountMinor"
      ),
    currency,
    paidAt:
      validDate(
        input.paidAt,
        "paidAt"
      ),
  };
}

function isDuplicateKey(
  error
) {
  return (
    error?.code === 11000 ||
    error?.code === 11001
  );
}

function duplicateSeat(
  error
) {
  return (
    isDuplicateKey(error) &&
    (error?.message || "")
      .includes(
        "one_arena_profile_per_seat"
      )
  );
}

function assertCaptureMatches(
  order,
  capture
) {
  if (
    order.provider !==
      capture.provider ||
    order.providerOrderId !==
      capture.providerOrderId ||
    order.providerTransactionId !==
      capture.providerTransactionId ||
    order.currency !==
      capture.currency ||
    order.actualPaidMinor !==
      capture.amountMinor ||
    !sameInstant(
      order.paidAt,
      capture.paidAt
    )
  ) {
    throw new PaymentCaptureError(
      "CAPTURE_REPLAY_CONFLICT",
      "captured order was replayed with different payment facts",
      {
        statusCode: 409,
      }
    );
  }
}

function expectedAmount(
  order
) {
  return (
    Number(
      order.listPriceMinor
    ) -
    Number(
      order.discountMinor
    )
  );
}

function assertPolicyPublishable(
  policy,
  paidAt
) {
  if (!policy) {
    throw new PaymentCaptureError(
      "POLICY_NOT_FOUND",
      "the payment order policy version does not exist",
      {
        retryable: true,
      }
    );
  }
  const readiness =
    policyReadiness(policy);
  if (
    !policy.publishedAt ||
    !readiness
      .canExposePayback ||
    !readiness
      .canExposeMainArena
  ) {
    throw new PaymentCaptureError(
      "POLICY_NOT_PUBLISHABLE",
      "the frozen policy is not ready for a paid cycle"
    );
  }
  const effectiveFrom =
    new Date(
      policy.effectiveFrom
    );
  const effectiveTo =
    policy.effectiveTo
      ? new Date(
          policy.effectiveTo
        )
      : null;
  if (
    effectiveFrom >
      paidAt ||
    (effectiveTo &&
      effectiveTo <= paidAt) ||
    new Date(
      policy.publishedAt
    ) > paidAt
  ) {
    throw new PaymentCaptureError(
      "POLICY_NOT_EFFECTIVE",
      "the frozen policy was not effective when the payment was captured"
    );
  }
}

async function verifiedInbox(
  capture,
  {
    InboxModel,
    session,
  }
) {
  const inbox =
    await InboxModel
      .findOne({
        _id: capture.inboxId,
        provider:
          capture.provider,
        webhookEventId:
          capture
            .webhookEventId,
      })
      .session(session);
  if (!inbox) {
    throw new PaymentCaptureError(
      "VERIFIED_WEBHOOK_NOT_FOUND",
      "verified webhook inbox was not found",
      {
        statusCode: 404,
      }
    );
  }
  if (
    inbox
      .signatureVerification
      ?.status !== "VERIFIED"
  ) {
    throw new PaymentCaptureError(
      "WEBHOOK_NOT_VERIFIED",
      "only a verified webhook may capture a payment",
      {
        statusCode: 401,
      }
    );
  }
  if (
    ![
      "RECEIVED",
      "FAILED",
      "PROCESSED",
    ].includes(inbox.status)
  ) {
    throw new PaymentCaptureError(
      "WEBHOOK_ALREADY_PROCESSING",
      "the verified webhook is already being processed",
      {
        retryable: true,
      }
    );
  }
  return inbox;
}

async function claimInbox(
  inbox,
  now,
  {
    InboxModel,
    session,
  }
) {
  if (
    inbox.status ===
    "PROCESSED"
  ) {
    return false;
  }
  const claimed =
    await InboxModel
      .findOneAndUpdate(
        {
          _id: inbox._id,
          status: {
            $in: [
              "RECEIVED",
              "FAILED",
            ],
          },
          "signatureVerification.status":
            "VERIFIED",
        },
        {
          $set: {
            status:
              "PROCESSING",
            processingStartedAt:
              now,
            lastAttemptAt:
              now,
            nextRetryAt:
              null,
            lastError: {},
          },
        },
        {
          returnDocument:
            "after",
          runValidators: true,
          session,
        }
      );
  if (!claimed) {
    throw new PaymentCaptureError(
      "WEBHOOK_CLAIM_CONFLICT",
      "another worker claimed the verified webhook",
      {
        retryable: true,
      }
    );
  }
  return true;
}

async function loadCommittedResult(
  order,
  capture,
  {
    AccessCycleModel,
    LedgerModel,
    ArenaProfileModel,
    session,
  }
) {
  assertCaptureMatches(
    order,
    capture
  );
  const cycle =
    await AccessCycleModel
      .findOne({
        paymentOrderId:
          order._id,
      })
      .session(session);
  if (!cycle) {
    throw new PaymentCaptureError(
      "CAPTURED_ORDER_INCOMPLETE",
      "captured payment has no access cycle",
      {
        retryable: true,
      }
    );
  }
  const ledger =
    await LedgerModel
      .findOne({
        orderId: order._id,
        type: "PACKAGE_ISSUE",
      })
      .session(session);
  if (!ledger) {
    throw new PaymentCaptureError(
      "CAPTURED_ORDER_INCOMPLETE",
      "captured payment has no package issue ledger",
      {
        retryable: true,
      }
    );
  }
  const arenaProfile =
    await ArenaProfileModel
      .findOne({
        userId: order.userId,
        activeRanking: "SUB",
        status: {
          $in:
            OPEN_ARENA_PROFILE_STATUSES,
        },
      })
      .sort({
        createdAt: -1,
      })
      .session(session);
  if (!arenaProfile) {
    throw new PaymentCaptureError(
      "CAPTURED_ORDER_INCOMPLETE",
      "captured payment has no Sub arena profile",
      {
        retryable: true,
      }
    );
  }
  return {
    order,
    cycle,
    ledger,
    arenaProfile,
    duplicate: true,
  };
}

async function nextSubSeat(
  seasonId,
  {
    ArenaProfileModel,
    session,
  }
) {
  const last =
    await ArenaProfileModel
      .findOne({
        seasonId,
        activeRanking:
          "SUB",
        arenaPosition: {
          $type: "number",
        },
        status: {
          $in: [
            "ACTIVE",
            "HIDDEN",
            "SETTLING",
          ],
        },
      })
      .sort({
        arenaPosition: -1,
      })
      .session(session);
  return (
    Number(
      last
        ?.arenaPosition ||
        0
    ) + 1
  );
}

async function createSubProfile(
  {
    order,
    season,
    rankingProfile,
    paidAt,
  },
  {
    ArenaProfileModel,
    session,
  }
) {
  const conflicting =
    await ArenaProfileModel
      .findOne({
        userId: order.userId,
        seasonId:
          season._id,
        status: {
          $in:
            OPEN_ARENA_PROFILE_STATUSES,
        },
      })
      .session(session);
  if (conflicting) {
    throw new PaymentCaptureError(
      "ARENA_PROFILE_CONFLICT",
      "user already has an open arena profile in this season"
    );
  }

  const canSeat =
    rankingProfile &&
    rankingProfile
      .datasetOnly !== true &&
    Number.isFinite(
      rankingProfile.mmr
    ) &&
    season.reseedStatus ===
      "COMPLETED" &&
    Boolean(
      season.currentWeekKey
    ) &&
    Boolean(
      season.lastSeededAt
    );

  const profile = {
    userId: order.userId,
    seasonId:
      season._id,
    activeRanking: "SUB",
    status:
      canSeat
        ? "ACTIVE"
        : "PLACEMENT_PENDING",
    arenaPosition: null,
    mmrAtLastSeed: null,
    seededAt: null,
    seedWeekKey: null,
    protectionUntil: null,
    rankShieldUntil: null,
  };

  if (canSeat) {
    profile.arenaPosition =
      await nextSubSeat(
        season._id,
        {
          ArenaProfileModel,
          session,
        }
      );
    profile.mmrAtLastSeed =
      rankingProfile.mmr;
    profile.seededAt =
      paidAt;
    profile.seedWeekKey =
      season.currentWeekKey;
  }

  const [created] =
    await ArenaProfileModel.create(
      [profile],
      {
        session,
      }
    );
  return created;
}

function outboxDocument({
  eventType,
  order,
  cycle,
  paidAt,
}) {
  const suffix =
    `${order._id}:${eventType}`;
  return {
    eventId:
      `PAYMENT:${suffix}`,
    idempotencyKey:
      `PAYMENT:${suffix}`,
    aggregateType:
      eventType ===
        "PACKAGE_PURCHASED"
        ? "PaymentOrder"
        : "AccessCycle",
    aggregateId:
      eventType ===
        "PACKAGE_PURCHASED"
        ? String(order._id)
        : String(cycle._id),
    eventType,
    payload: {
      orderId:
        String(order._id),
      cycleId:
        String(cycle._id),
      policyVersionId:
        String(
          cycle
            .policyVersionId
        ),
      currency:
        order.currency,
      actualPaidMinor:
        order
          .actualPaidMinor,
    },
    status: "PENDING",
    nextAttemptAt:
      paidAt,
  };
}

async function captureWithinTransaction(
  capture,
  now,
  dependencies,
  session
) {
  const {
    AccessCycleModel,
    ArenaProfileModel,
    ArenaSeasonModel,
    InboxModel,
    LedgerModel,
    OrderModel,
    OutboxModel,
    PolicyModel,
    RankingProfileModel,
    UserModel,
  } = dependencies;

  const inbox =
    await verifiedInbox(
      capture,
      {
        InboxModel,
        session,
      }
    );
  const claimed =
    await claimInbox(
      inbox,
      now,
      {
        InboxModel,
        session,
      }
    );

  const order =
    await OrderModel
      .findOne({
        provider:
          capture.provider,
        providerOrderId:
          capture
            .providerOrderId,
      })
      .session(session);
  if (!order) {
    throw new PaymentCaptureError(
      "PAYMENT_ORDER_NOT_FOUND",
      "payment order was not found",
      {
        statusCode: 404,
        retryable: true,
      }
    );
  }

  if (
    order.status ===
    "CAPTURED"
  ) {
    const result =
      await loadCommittedResult(
        order,
        capture,
        {
          AccessCycleModel,
          LedgerModel,
          ArenaProfileModel,
          session,
        }
      );
    if (
      !order.webhookEventIds
        ?.includes(
          capture.webhookEventId
        )
    ) {
      order.webhookEventIds = [
        ...new Set([
          ...(order
            .webhookEventIds ||
            []),
          capture
            .webhookEventId,
        ]),
      ];
      await order.save({
        session,
      });
    }
    if (claimed) {
      await InboxModel.updateOne(
        {
          _id: inbox._id,
          status:
            "PROCESSING",
        },
        {
          $set: {
            status:
              "PROCESSED",
            processedAt: now,
            nextRetryAt:
              null,
            lastError: {},
          },
        },
        {
          session,
          runValidators: true,
        }
      );
    }
    return result;
  }

  if (
    !CAPTURABLE_ORDER_STATUSES
      .has(order.status)
  ) {
    throw new PaymentCaptureError(
      "PAYMENT_ORDER_NOT_CAPTURABLE",
      "payment order is not in a capturable state"
    );
  }
  if (
    capture.amountMinor !==
    expectedAmount(order)
  ) {
    throw new PaymentCaptureError(
      "PAYMENT_AMOUNT_MISMATCH",
      "captured amount does not match the frozen order amount"
    );
  }
  if (
    order.currency !==
    capture.currency
  ) {
    throw new PaymentCaptureError(
      "PAYMENT_CURRENCY_MISMATCH",
      "captured currency does not match the order"
    );
  }

  // MongoDB transaction 안에서는 같은 session을 Promise.all로 병렬 사용하지 않는다.
  // 드라이버가 병렬 트랜잭션 연산을 지원하지 않아 순차 조회가 더 느리더라도 안전하다.
  const user =
    await UserModel
      .findById(
        order.userId
      )
      .session(session);
  const policy =
    await PolicyModel
      .findById(
        order
          .policyVersionId
      )
      .session(session);
  const activeCycle =
    await AccessCycleModel
      .findOne({
        userId:
          order.userId,
        status: {
          $in:
            ACTIVE_CYCLE_STATUSES,
        },
      })
      .session(session);
  const season =
    await ArenaSeasonModel
      .findOne({
        status: "ACTIVE",
        startsAt: {
          $lte:
            capture.paidAt,
        },
        endsAt: {
          $gt:
            capture.paidAt,
        },
      })
      .session(session);
  const rankingProfile =
    await RankingProfileModel
      .findOne({
        userId:
          order.userId,
        datasetOnly: {
          $ne: true,
        },
      })
      .session(session);

  if (
    !user ||
    user.accountStatus !==
      "active" ||
    user.isActive === false
  ) {
    throw new PaymentCaptureError(
      "ACCOUNT_NOT_ACTIVE",
      "only an active account may start a paid cycle"
    );
  }
  assertPolicyPublishable(
    policy,
    capture.paidAt
  );
  if (activeCycle) {
    throw new PaymentCaptureError(
      activeCycle
        .activeRanking ===
        "MAIN"
        ? "MAIN_REPURCHASE_REQUIRES_SETTLEMENT"
        : "ACTIVE_CYCLE_EXISTS",
      "another access cycle must be settled before this payment can start"
    );
  }
  if (!season) {
    throw new PaymentCaptureError(
      "ACTIVE_ARENA_SEASON_NOT_FOUND",
      "an active arena season is required to start the paid cycle",
      {
        retryable: true,
      }
    );
  }

  order.status =
    "CAPTURED";
  order
    .providerTransactionId =
    capture
      .providerTransactionId;
  order.actualPaidMinor =
    capture.amountMinor;
  order.paidAt =
    capture.paidAt;
  order.webhookEventIds = [
    ...new Set([
      ...(order
        .webhookEventIds ||
        []),
      capture.webhookEventId,
    ]),
  ];
  await order.save({
    session,
  });

  const cycleState =
    createAccessCycleState({
      userId:
        order.userId,
      paymentOrderId:
        order._id,
      policyVersion:
        policy,
      paidAt:
        capture.paidAt,
      autoRenewEnabled:
        false,
    });
  const [cycle] =
    await AccessCycleModel.create(
      [cycleState],
      {
        session,
      }
    );

  const issue =
    buildPackageIssueTransaction({
      cycleId:
        cycle._id,
      userId:
        order.userId,
      orderId:
        order._id,
      policyVersion:
        policy,
      occurredAt:
        capture.paidAt,
      idempotencyKey:
        `PAYMENT_CAPTURE:${capture.provider}:${capture.providerTransactionId}`,
    });
  const [ledger] =
    await LedgerModel.create(
      [issue],
      {
        session,
      }
    );

  const arenaProfile =
    await createSubProfile(
      {
        order,
        season,
        rankingProfile,
        paidAt:
          capture.paidAt,
      },
      {
        ArenaProfileModel,
        session,
      }
    );

  await OutboxModel.create(
    [
      outboxDocument({
        eventType:
          "PACKAGE_PURCHASED",
        order,
        cycle,
        paidAt:
          capture.paidAt,
      }),
      outboxDocument({
        eventType:
          "CYCLE_STARTED",
        order,
        cycle,
        paidAt:
          capture.paidAt,
      }),
    ],
    {
      session,
      ordered: true,
    }
  );

  await InboxModel.updateOne(
    {
      _id: inbox._id,
      status: "PROCESSING",
    },
    {
      $set: {
        status: "PROCESSED",
        processedAt: now,
        nextRetryAt: null,
        lastError: {},
      },
    },
    {
      session,
      runValidators: true,
    }
  );

  return {
    order,
    cycle,
    ledger,
    arenaProfile,
    duplicate: false,
  };
}

function retryDelayMs(
  attempt
) {
  return Math.min(
    60 * 60 * 1000,
    30 * 1000 *
      2 **
        Math.min(
          Math.max(
            attempt - 1,
            0
          ),
          7
        )
  );
}

async function markInboxFailed(
  capture,
  error,
  now,
  {
    InboxModel,
  }
) {
  const retryable =
    error
      instanceof
        PaymentCaptureError
      ? error.retryable
      : true;
  const code =
    error?.code &&
    String(error.code)
      .length <= 120
      ? String(
          error.code
        )
      : "PAYMENT_CAPTURE_FAILED";
  const current =
    await InboxModel.findOne({
      _id: capture.inboxId,
      provider:
        capture.provider,
      webhookEventId:
        capture.webhookEventId,
      "signatureVerification.status":
        "VERIFIED",
      status: {
        $ne: "PROCESSED",
      },
    });
  if (!current) {
    return;
  }
  const nextAttempt =
    Number(
      current.retryCount ||
      0
    ) + 1;
  await InboxModel.updateOne(
    {
      _id: current._id,
      status: {
        $ne: "PROCESSED",
      },
    },
    {
      $set: {
        status: "FAILED",
        processingStartedAt:
          null,
        processedAt: null,
        lastAttemptAt: now,
        nextRetryAt:
          retryable
            ? new Date(
                now.getTime() +
                  retryDelayMs(
                    nextAttempt
                  )
              )
            : null,
        lastError: {
          code,
          message:
            "Payment capture processing failed.",
          occurredAt: now,
        },
      },
      $inc: {
        retryCount: 1,
      },
    },
    {
      runValidators: true,
    }
  );
}

/**
 * 검증 완료된 provider webhook을 결제주기 발행으로 바꾼다.
 *
 * 이 함수는 공개 라우트가 아니다. provider adapter가 원문 서명을 검증하고
 * PaymentWebhookInbox를 만든 뒤, provider API로 재확인한 정규화 값만 전달한다.
 */
async function processCapturedPayment(
  input,
  {
    connection,
    now = new Date(),
    models = {},
  } = {}
) {
  const capture =
    normalizeCapture(input);
  const processedAt =
    validDate(
      now,
      "now"
    );
  const dependencies = {
    AccessCycleModel:
      models.AccessCycle ||
      AccessCycle,
    ArenaProfileModel:
      models.ArenaProfile ||
      ArenaProfile,
    ArenaSeasonModel:
      models.ArenaSeason ||
      ArenaSeason,
    InboxModel:
      models
        .PaymentWebhookInbox ||
      PaymentWebhookInbox,
    LedgerModel:
      models
        .DayBalanceTransaction ||
      DayBalanceTransaction,
    OrderModel:
      models.PaymentOrder ||
      PaymentOrder,
    OutboxModel:
      models.OutboxEvent ||
      OutboxEvent,
    PolicyModel:
      models.PolicyVersion ||
      PolicyVersion,
    RankingProfileModel:
      models.RankingProfile ||
      RankingProfile,
    UserModel:
      models.User ||
      User,
  };
  const db =
    connection ||
    PaymentOrder.db;
  if (
    !db ||
    typeof db.startSession !==
      "function"
  ) {
    throw new PaymentCaptureError(
      "TRANSACTION_CONNECTION_REQUIRED",
      "payment capture requires a MongoDB transaction connection",
      {
        statusCode: 500,
        retryable: true,
      }
    );
  }

  let lastError;
  for (
    let attempt = 1;
    attempt <= 3;
    attempt += 1
  ) {
    const session =
      await db.startSession();
    try {
      let result;
      await session.withTransaction(
        async () => {
          result =
            await captureWithinTransaction(
              capture,
              processedAt,
              dependencies,
              session
            );
        }
      );
      return result;
    } catch (error) {
      lastError = error;
      if (
        duplicateSeat(error) &&
        attempt < 3
      ) {
        continue;
      }
      break;
    } finally {
      await session.endSession();
    }
  }

  const normalizedError =
    lastError
      instanceof
        PaymentCaptureError
      ? lastError
      : new PaymentCaptureError(
          "PAYMENT_CAPTURE_FAILED",
          "payment capture transaction failed",
          {
            statusCode: 500,
            retryable: true,
            cause: lastError,
          }
        );
  await markInboxFailed(
    capture,
    normalizedError,
    processedAt,
    dependencies
  );
  throw normalizedError;
}

module.exports = {
  PaymentCaptureError,
  processCapturedPayment,
};
