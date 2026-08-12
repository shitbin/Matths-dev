const crypto = require("node:crypto");

const USER_ACCOUNTS =
  Object.freeze([
    "USER_REFUND_AVAILABLE",
    "USER_REFUND_LOCKED",
    "USER_BONUS_AVAILABLE",
    "USER_BONUS_LOCKED",
  ]);

function positiveInteger(
  value,
  label
) {
  const number =
    Number(value);
  if (
    !Number.isSafeInteger(
      number
    ) ||
    number <= 0
  ) {
    throw new TypeError(
      `${label} must be a positive integer`
    );
  }
  return number;
}

function assertBalancedEntries(
  entries
) {
  if (
    !Array.isArray(entries) ||
    entries.length < 2
  ) {
    throw new TypeError(
      "ledger transaction needs at least two entries"
    );
  }

  let debitTotal = 0;
  let creditTotal = 0;
  for (const entry of entries) {
    const debit =
      Number(
        entry.debitDays || 0
      );
    const credit =
      Number(
        entry.creditDays || 0
      );
    if (
      !Number.isSafeInteger(
        debit
      ) ||
      !Number.isSafeInteger(
        credit
      ) ||
      debit < 0 ||
      credit < 0 ||
      (debit > 0) ===
        (credit > 0)
    ) {
      throw new TypeError(
        "each ledger entry needs exactly one positive integer debit or credit"
      );
    }
    if (
      USER_ACCOUNTS.includes(
        entry.account
      ) &&
      (!entry.userId ||
        !entry.cycleId)
    ) {
      throw new TypeError(
        "user ledger account needs userId and cycleId"
      );
    }
    debitTotal += debit;
    creditTotal += credit;
  }
  if (
    debitTotal !== creditTotal
  ) {
    throw new TypeError(
      "ledger debits and credits must balance"
    );
  }
  return debitTotal;
}

function deterministicId(
  namespace,
  source
) {
  const digest = crypto
    .createHash("sha256")
    .update(
      `${namespace}\u0000${source}`
    )
    .digest("hex")
    .slice(0, 32);
  return `${namespace}:${digest}`;
}

function ledgerError(
  code,
  message
) {
  const error =
    new Error(message);
  error.code = code;
  return error;
}

function requiredLedgerText(
  value,
  label,
  maxLength
) {
  const normalized =
    String(value || "")
      .trim();
  if (
    !normalized ||
    normalized.length >
      maxLength
  ) {
    throw new TypeError(
      `${label} is required and must be at most ${maxLength} characters`
    );
  }
  return normalized;
}

function exactInverseEntries(
  entries
) {
  assertBalancedEntries(
    entries
  );
  return entries.map(
    (entry) => ({
      account:
        entry.account,
      ...(entry.userId
        ? {
            userId:
              entry.userId,
          }
        : {}),
      ...(entry.cycleId
        ? {
            cycleId:
              entry.cycleId,
          }
        : {}),
      debitDays:
        Number(
          entry.creditDays ||
            0
        ),
      creditDays:
        Number(
          entry.debitDays ||
            0
        ),
    })
  );
}

function buildReversalTransaction({
  originalTransaction,
  idempotencyKey,
  reasonCode,
  actorType,
  actorId = null,
  occurredAt = new Date(),
}) {
  if (
    !originalTransaction ||
    !originalTransaction._id
  ) {
    throw new TypeError(
      "persisted originalTransaction is required"
    );
  }
  if (
    originalTransaction.type ===
      "REVERSAL" ||
    originalTransaction
      .reversalOf
  ) {
    throw ledgerError(
      "LEDGER_REVERSAL_CHAIN_FORBIDDEN",
      "a reversal transaction cannot itself be reversed"
    );
  }
  if (
    originalTransaction.status !==
    "POSTED"
  ) {
    throw ledgerError(
      "LEDGER_ORIGINAL_NOT_POSTED",
      "only a posted transaction can be reversed"
    );
  }
  const normalizedKey =
    requiredLedgerText(
      idempotencyKey,
      "idempotencyKey",
      240
    );
  const normalizedReason =
    requiredLedgerText(
      reasonCode,
      "reasonCode",
      120
    );
  const normalizedActorType =
    requiredLedgerText(
      actorType,
      "actorType",
      20
    ).toUpperCase();
  if (
    ![
      "SYSTEM",
      "ADMIN",
      "JOB",
    ].includes(
      normalizedActorType
    )
  ) {
    throw new TypeError(
      "reversal actorType must be SYSTEM, ADMIN, or JOB"
    );
  }
  const reversalOccurredAt =
    occurredAt instanceof Date
      ? new Date(
          occurredAt.getTime()
        )
      : new Date(
          occurredAt
        );
  if (
    !Number.isFinite(
      reversalOccurredAt
        .getTime()
    )
  ) {
    throw new TypeError(
      "occurredAt must be a valid date"
    );
  }
  const entries =
    exactInverseEntries(
      originalTransaction
        .entries
    );
  assertBalancedEntries(
    entries
  );
  return {
    transactionId:
      deterministicId(
        "ledger-reversal",
        `${originalTransaction._id}:${normalizedKey}`
      ),
    idempotencyKey:
      normalizedKey,
    cycleId:
      originalTransaction
        .cycleId,
    ...(originalTransaction
      .matchId
      ? {
          matchId:
            originalTransaction
              .matchId,
        }
      : {}),
    ...(originalTransaction
      .orderId
      ? {
          orderId:
            originalTransaction
              .orderId,
        }
      : {}),
    type: "REVERSAL",
    status: "POSTED",
    entries,
    reasonCode:
      normalizedReason,
    actorType:
      normalizedActorType,
    actorId:
      actorId
        ? requiredLedgerText(
            actorId,
            "actorId",
            160
          )
        : null,
    reversalOf:
      originalTransaction._id,
    metadata: {
      originalTransactionId:
        originalTransaction
          .transactionId,
      originalType:
        originalTransaction
          .type,
    },
    occurredAt:
      reversalOccurredAt,
  };
}

async function postReversalTransaction(
  input,
  {
    TransactionModel,
    session = null,
  } = {}
) {
  const Model =
    TransactionModel ||
    require(
      "../models/dayBalanceTransactionModel"
    ).DayBalanceTransaction;
  const originalId =
    input
      ?.originalTransactionId;
  if (!originalId) {
    throw new TypeError(
      "originalTransactionId is required"
    );
  }
  let originalQuery =
    Model.findById(
      originalId
    );
  if (session) {
    originalQuery =
      originalQuery.session(
        session
      );
  }
  const original =
    await originalQuery;
  if (!original) {
    throw ledgerError(
      "LEDGER_ORIGINAL_NOT_FOUND",
      "original ledger transaction does not exist"
    );
  }
  let existingQuery =
    Model.findOne({
      reversalOf:
        original._id,
    });
  if (session) {
    existingQuery =
      existingQuery.session(
        session
      );
  }
  const existing =
    await existingQuery;
  if (existing) {
    if (
      existing
        .idempotencyKey ===
      input.idempotencyKey
    ) {
      return existing;
    }
    throw ledgerError(
      "LEDGER_ALREADY_REVERSED",
      "posted transaction already has a reversal"
    );
  }
  const reversal =
    new Model(
      buildReversalTransaction({
        originalTransaction:
          original,
        idempotencyKey:
          input
            .idempotencyKey,
        reasonCode:
          input.reasonCode,
        actorType:
          input.actorType,
        actorId:
          input.actorId,
        occurredAt:
          input.occurredAt,
      })
    );
  try {
    await reversal.save({
      session,
    });
    return reversal;
  } catch (error) {
    if (
      ![
        11000,
        11001,
      ].includes(error?.code)
    ) {
      throw error;
    }
    let concurrentQuery =
      Model.findOne({
        reversalOf:
          original._id,
      });
    if (session) {
      concurrentQuery =
        concurrentQuery.session(
          session
        );
    }
    const concurrent =
      await concurrentQuery;
    if (
      concurrent &&
      concurrent
        .idempotencyKey ===
        input.idempotencyKey
    ) {
      return concurrent;
    }
    throw ledgerError(
      "LEDGER_ALREADY_REVERSED",
      "posted transaction already has a reversal"
    );
  }
}

function buildPackageIssueTransaction({
  cycleId,
  userId,
  orderId,
  policyVersion,
  occurredAt,
  idempotencyKey,
}) {
  if (
    !cycleId ||
    !userId ||
    !orderId ||
    !idempotencyKey
  ) {
    throw new TypeError(
      "cycleId, userId, orderId and idempotencyKey are required"
    );
  }
  const issuedDays =
    positiveInteger(
      policyVersion
        ?.startingRefundChallengeDays,
      "startingRefundChallengeDays"
    );
  if (issuedDays !== 29) {
    throw new TypeError(
      "current Sub package must issue 29 challenge days"
    );
  }

  const entries = [
    {
      account: "SYSTEM_ISSUE",
      debitDays: issuedDays,
      creditDays: 0,
    },
    {
      account:
        "USER_REFUND_AVAILABLE",
      userId,
      cycleId,
      debitDays: 0,
      creditDays: issuedDays,
    },
  ];
  assertBalancedEntries(
    entries
  );

  return {
    transactionId:
      deterministicId(
        "package-issue",
        idempotencyKey
      ),
    idempotencyKey,
    cycleId,
    orderId,
    type: "PACKAGE_ISSUE",
    status: "POSTED",
    entries,
    reasonCode:
      "PACKAGE_PURCHASE",
    actorType: "WEBHOOK",
    occurredAt,
    metadata: {
      paidAccessEntitlement:
        {
          grantedDays: 29,
          ledgerDebitTarget:
            false,
        },
    },
  };
}

function deriveUserBalances(
  transactions,
  {
    cycleId,
    userId,
  }
) {
  const balances =
    Object.fromEntries(
      USER_ACCOUNTS.map(
        (account) => [
          account,
          0,
        ]
      )
    );

  for (const transaction of
    transactions || []) {
    if (
      transaction.status !==
        "POSTED"
    ) {
      continue;
    }
    assertBalancedEntries(
      transaction.entries
    );
    for (const entry of
      transaction.entries) {
      if (
        !USER_ACCOUNTS.includes(
          entry.account
        ) ||
        String(entry.userId) !==
          String(userId) ||
        String(entry.cycleId) !==
          String(cycleId)
      ) {
        continue;
      }
      balances[entry.account] +=
        Number(
          entry.creditDays || 0
        ) -
        Number(
          entry.debitDays || 0
        );
    }
  }

  for (const [
    account,
    balance,
  ] of Object.entries(
    balances
  )) {
    if (balance < 0) {
      throw new Error(
        `negative ledger balance: ${account}`
      );
    }
  }
  return balances;
}

function assertCycleCacheMatches(
  cycle,
  balances
) {
  const expected = {
    refundChallengeDays:
      balances
        .USER_REFUND_AVAILABLE,
    lockedRefundDays:
      balances
        .USER_REFUND_LOCKED,
    bonusAccessDays:
      balances
        .USER_BONUS_AVAILABLE,
    lockedBonusDays:
      balances
        .USER_BONUS_LOCKED,
  };
  const mismatches =
    Object.entries(expected)
      .filter(
        ([field, value]) =>
          Number(cycle[field]) !==
          Number(value)
      )
      .map(
        ([field, value]) => ({
          field,
          cached:
            Number(cycle[field]),
          ledger: Number(value),
        })
      );
  if (mismatches.length) {
    const error =
      new Error(
        "cycle cache does not match ledger"
      );
    error.code =
      "LEDGER_CACHE_MISMATCH";
    error.mismatches =
      mismatches;
    throw error;
  }
  return true;
}

module.exports = {
  USER_ACCOUNTS,
  assertBalancedEntries,
  assertCycleCacheMatches,
  buildReversalTransaction,
  buildPackageIssueTransaction,
  deriveUserBalances,
  deterministicId,
  exactInverseEntries,
  postReversalTransaction,
};
