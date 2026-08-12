"use strict";

const os = require(
  "node:os"
);
const {
  randomUUID,
} = require(
  "node:crypto"
);

const {
  OutboxEvent,
} = require(
  "../models/outboxEventModel"
);
const {
  handleTakeoverSettledOutboxEvent,
} = require(
  "./arenaRevengeRightService"
);

const TAKEOVER_SETTLED_EVENT_TYPE =
  "TAKEOVER_SETTLED";
const DEFAULT_LEASE_MS =
  60 * 1000;
const DEFAULT_BASE_RETRY_MS =
  1000;
const DEFAULT_MAX_RETRY_MS =
  5 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS =
  25;
const DEFAULT_BATCH_SIZE =
  25;
const DEFAULT_WORKER_INTERVAL_MS =
  1000;
const MAX_LAST_ERROR_LENGTH =
  1000;

const DEFAULT_HANDLERS =
  Object.freeze([
    Object.freeze({
      name:
        "REVENGE_RIGHT",
      required: true,
      handle:
        handleTakeoverSettledOutboxEvent,
    }),
  ]);

class ArenaTakeoverOutboxError
  extends Error {
  constructor(
    code,
    message,
    {
      retryable = true,
      statusCode = 500,
      handlerCode = null,
      handlerName = null,
    } = {}
  ) {
    super(message);
    this.name =
      "ArenaTakeoverOutboxError";
    this.code = code;
    this.retryable =
      Boolean(retryable);
    this.statusCode =
      statusCode;
    this.handlerCode =
      handlerCode;
    this.handlerName =
      handlerName;
  }
}

function requiredDate(
  value,
  label
) {
  const date =
    value instanceof Date
      ? new Date(
          value.getTime()
        )
      : new Date(value);
  if (
    !Number.isFinite(
      date.getTime()
    )
  ) {
    throw new ArenaTakeoverOutboxError(
      "INVALID_TAKEOVER_OUTBOX_INPUT",
      `${label} must be a valid date`,
      {
        retryable: false,
        statusCode: 400,
      }
    );
  }
  return date;
}

function positiveInteger(
  value,
  label
) {
  if (
    !Number.isSafeInteger(
      value
    ) ||
    value < 1
  ) {
    throw new ArenaTakeoverOutboxError(
      "INVALID_TAKEOVER_OUTBOX_INPUT",
      `${label} must be a positive integer`,
      {
        retryable: false,
        statusCode: 400,
      }
    );
  }
  return value;
}

function workerIdentity(
  value
) {
  const workerId =
    String(
      value || ""
    ).trim();
  if (
    !workerId ||
    workerId.length > 120
  ) {
    throw new ArenaTakeoverOutboxError(
      "INVALID_TAKEOVER_OUTBOX_WORKER",
      "workerId is required and must be at most 120 characters",
      {
        retryable: false,
        statusCode: 400,
      }
    );
  }
  return workerId;
}

function safeIdentifier(
  value,
  fallback
) {
  const normalized =
    String(
      value || ""
    )
      .trim()
      .toUpperCase()
      .replace(
        /[^A-Z0-9_.:-]+/g,
        "_"
      )
      .slice(0, 120);
  return normalized ||
    fallback;
}

function safeErrorText(
  error
) {
  const code =
    safeIdentifier(
      error?.code,
      "TAKEOVER_OUTBOX_FAILURE"
    );
  const handlerName =
    error?.handlerName
      ? safeIdentifier(
          error.handlerName,
          "HANDLER"
        )
      : null;
  const handlerCode =
    error?.handlerCode
      ? safeIdentifier(
          error.handlerCode,
          "HANDLER_FAILURE"
        )
      : null;
  const parts = [
    code,
  ];
  if (handlerName) {
    parts.push(
      handlerName
    );
  }
  if (handlerCode) {
    parts.push(
      handlerCode
    );
  }
  return parts
    .join(":")
    .slice(
      0,
      MAX_LAST_ERROR_LENGTH
    );
}

function normalizeHandlers(
  handlers
) {
  if (
    !Array.isArray(
      handlers
    ) ||
    handlers.length === 0
  ) {
    throw new ArenaTakeoverOutboxError(
      "TAKEOVER_OUTBOX_HANDLER_REQUIRED",
      "at least one TAKEOVER_SETTLED handler is required",
      {
        retryable: false,
        statusCode: 500,
      }
    );
  }

  const names =
    new Set();
  const normalized =
    handlers.map(
      (
        definition,
        index
      ) => {
        const rawDefinition =
          typeof definition ===
          "function"
            ? {
                name:
                  definition
                    .name ||
                  `HANDLER_${index + 1}`,
                handle:
                  definition,
                required: true,
              }
            : definition;
        const name =
          safeIdentifier(
            rawDefinition
              ?.name,
            ""
          );
        if (
          !name ||
          typeof rawDefinition
            ?.handle !==
            "function"
        ) {
          throw new ArenaTakeoverOutboxError(
            "INVALID_TAKEOVER_OUTBOX_HANDLER",
            "each handler requires a stable name and a handle function",
            {
              retryable: false,
              statusCode: 500,
            }
          );
        }
        if (
          names.has(name)
        ) {
          throw new ArenaTakeoverOutboxError(
            "DUPLICATE_TAKEOVER_OUTBOX_HANDLER",
            "handler names must be unique",
            {
              retryable: false,
              statusCode: 500,
            }
          );
        }
        names.add(name);
        return Object.freeze({
          name,
          required:
            rawDefinition
              .required !==
            false,
          handle:
            rawDefinition
              .handle,
        });
      }
    );

  if (
    !normalized.some(
      (handler) =>
        handler.required
    )
  ) {
    throw new ArenaTakeoverOutboxError(
      "TAKEOVER_OUTBOX_REQUIRED_HANDLER_MISSING",
      "at least one required TAKEOVER_SETTLED handler is required",
      {
        retryable: false,
        statusCode: 500,
      }
    );
  }
  return Object.freeze(
    normalized
  );
}

function retryDelayMs(
  attemptCount,
  {
    baseRetryMs =
      DEFAULT_BASE_RETRY_MS,
    maxRetryMs =
      DEFAULT_MAX_RETRY_MS,
  } = {}
) {
  positiveInteger(
    baseRetryMs,
    "baseRetryMs"
  );
  positiveInteger(
    maxRetryMs,
    "maxRetryMs"
  );
  const exponent =
    Math.min(
      Math.max(
        Number(
          attemptCount
        ) - 1,
        0
      ),
      20
    );
  return Math.min(
    maxRetryMs,
    baseRetryMs *
      2 ** exponent
  );
}

function hasTransientLabel(
  error
) {
  if (
    typeof error
      ?.hasErrorLabel !==
    "function"
  ) {
    return false;
  }
  return [
    "TransientTransactionError",
    "UnknownTransactionCommitResult",
    "RetryableWriteError",
  ].some(
    (label) =>
      error.hasErrorLabel(
        label
      )
  );
}

function errorIsRetryable(
  error
) {
  if (
    typeof error
      ?.retryable ===
    "boolean"
  ) {
    return error.retryable;
  }
  if (
    hasTransientLabel(
      error
    )
  ) {
    return true;
  }
  const statusCode =
    Number(
      error?.statusCode ||
      error?.status
    );
  if (
    Number.isFinite(
      statusCode
    )
  ) {
    return statusCode >=
      500;
  }
  return true;
}

function handlerFailure(
  error,
  handler
) {
  return new ArenaTakeoverOutboxError(
    "TAKEOVER_SETTLED_HANDLER_FAILED",
    `required handler ${handler.name} failed`,
    {
      retryable:
        errorIsRetryable(
          error
        ),
      statusCode:
        Number(
          error
            ?.statusCode ||
          error?.status
        ) || 500,
      handlerCode:
        safeIdentifier(
          error?.code,
          "HANDLER_FAILURE"
        ),
      handlerName:
        handler.name,
    }
  );
}

function leaseFilter(
  event,
  workerId
) {
  return {
    _id: event._id,
    eventType:
      TAKEOVER_SETTLED_EVENT_TYPE,
    status: "PROCESSING",
    lockedBy:
      workerIdentity(
        workerId
      ),
    lockedAt:
      requiredDate(
        event.lockedAt,
        "event.lockedAt"
      ),
  };
}

async function claimNextTakeoverSettledEvent(
  {
    workerId,
    now = new Date(),
    leaseMs =
      DEFAULT_LEASE_MS,
  },
  dependencies = {}
) {
  const OutboxModel =
    dependencies.OutboxModel ||
    OutboxEvent;
  const owner =
    workerIdentity(
      workerId
    );
  const observedAt =
    requiredDate(
      now,
      "now"
    );
  positiveInteger(
    leaseMs,
    "leaseMs"
  );
  const staleBefore =
    new Date(
      observedAt.getTime() -
        leaseMs
    );

  return OutboxModel
    .findOneAndUpdate(
      {
        eventType:
          TAKEOVER_SETTLED_EVENT_TYPE,
        $or: [
          {
            status: {
              $in: [
                "PENDING",
                "FAILED",
              ],
            },
            nextAttemptAt: {
              $lte:
                observedAt,
            },
          },
          {
            status:
              "PROCESSING",
            $or: [
              {
                lockedAt: {
                  $lte:
                    staleBefore,
                },
              },
              {
                lockedAt:
                  null,
              },
            ],
          },
        ],
      },
      {
        $set: {
          status:
            "PROCESSING",
          lockedAt:
            observedAt,
          lockedBy:
            owner,
        },
        $inc: {
          attemptCount: 1,
        },
      },
      {
        sort: {
          nextAttemptAt: 1,
          createdAt: 1,
          _id: 1,
        },
        returnDocument:
          "after",
        runValidators: true,
      }
    );
}

async function assertLeaseOwned(
  event,
  {
    workerId,
  },
  dependencies = {}
) {
  const OutboxModel =
    dependencies.OutboxModel ||
    OutboxEvent;
  const owned =
    await OutboxModel.exists(
      leaseFilter(
        event,
        workerId
      )
    );
  if (!owned) {
    throw new ArenaTakeoverOutboxError(
      "TAKEOVER_OUTBOX_LEASE_LOST",
      "the TAKEOVER_SETTLED outbox lease was lost",
      {
        retryable: true,
        statusCode: 409,
      }
    );
  }
}

async function markTakeoverEventPublished(
  event,
  {
    workerId,
    now = new Date(),
  },
  dependencies = {}
) {
  const OutboxModel =
    dependencies.OutboxModel ||
    OutboxEvent;
  const observedAt =
    requiredDate(
      now,
      "now"
    );
  return OutboxModel
    .findOneAndUpdate(
      leaseFilter(
        event,
        workerId
      ),
      {
        $set: {
          status:
            "PUBLISHED",
          publishedAt:
            observedAt,
          lockedAt: null,
          lockedBy: null,
          nextAttemptAt:
            null,
          lastError: "",
        },
      },
      {
        returnDocument:
          "after",
        runValidators: true,
      }
    );
}

async function markTakeoverEventFailed(
  event,
  error,
  {
    workerId,
    now = new Date(),
    maxAttempts =
      DEFAULT_MAX_ATTEMPTS,
    baseRetryMs =
      DEFAULT_BASE_RETRY_MS,
    maxRetryMs =
      DEFAULT_MAX_RETRY_MS,
  },
  dependencies = {}
) {
  const OutboxModel =
    dependencies.OutboxModel ||
    OutboxEvent;
  const observedAt =
    requiredDate(
      now,
      "now"
    );
  positiveInteger(
    maxAttempts,
    "maxAttempts"
  );
  const attemptCount =
    Number(
      event.attemptCount
    ) || 0;
  const dead =
    error?.retryable ===
      false ||
    attemptCount >=
      maxAttempts;
  const nextAttemptAt =
    dead
      ? null
      : new Date(
          observedAt
            .getTime() +
            retryDelayMs(
              attemptCount,
              {
                baseRetryMs,
                maxRetryMs,
              }
            )
        );

  return OutboxModel
    .findOneAndUpdate(
      leaseFilter(
        event,
        workerId
      ),
      {
        $set: {
          status:
            dead
              ? "DEAD"
              : "FAILED",
          nextAttemptAt,
          lockedAt: null,
          lockedBy: null,
          lastError:
            safeErrorText(
              error
            ),
        },
      },
      {
        returnDocument:
          "after",
        runValidators: true,
      }
    );
}

async function deliverClaimedTakeoverSettledEvent(
  event,
  {
    workerId,
    now = new Date(),
  },
  dependencies = {}
) {
  const handlers =
    normalizeHandlers(
      dependencies.handlers ||
      DEFAULT_HANDLERS
    );
  const observedAt =
    requiredDate(
      now,
      "now"
    );
  const outcomes = [];

  for (
    const handler of handlers
  ) {
    await assertLeaseOwned(
      event,
      {
        workerId,
      },
      dependencies
    );
    try {
      await handler.handle({
        event,
        now:
          observedAt,
      });
      outcomes.push({
        name:
          handler.name,
        status:
          "SUCCEEDED",
      });
    } catch (error) {
      const failure =
        handlerFailure(
          error,
          handler
        );
      outcomes.push({
        name:
          handler.name,
        status:
          "FAILED",
        errorCode:
          failure
            .handlerCode,
      });
      if (
        handler.required
      ) {
        throw failure;
      }
    }
  }

  const published =
    await markTakeoverEventPublished(
      event,
      {
        workerId,
        now:
          observedAt,
      },
      dependencies
    );
  if (!published) {
    throw new ArenaTakeoverOutboxError(
      "TAKEOVER_OUTBOX_LEASE_LOST",
      "the TAKEOVER_SETTLED outbox lease was lost before publication",
      {
        retryable: true,
        statusCode: 409,
      }
    );
  }
  return {
    status: "PUBLISHED",
    event: published,
    handlerOutcomes:
      outcomes,
  };
}

async function processNextTakeoverSettledEvent(
  {
    workerId,
    now = new Date(),
    leaseMs =
      DEFAULT_LEASE_MS,
    maxAttempts =
      DEFAULT_MAX_ATTEMPTS,
    baseRetryMs =
      DEFAULT_BASE_RETRY_MS,
    maxRetryMs =
      DEFAULT_MAX_RETRY_MS,
  },
  dependencies = {}
) {
  positiveInteger(
    maxAttempts,
    "maxAttempts"
  );
  const observedAt =
    requiredDate(
      now,
      "now"
    );
  const event =
    await claimNextTakeoverSettledEvent(
      {
        workerId,
        now:
          observedAt,
        leaseMs,
      },
      dependencies
    );
  if (!event) {
    return null;
  }

  let failure = null;
  try {
    if (
      event.attemptCount >
      maxAttempts
    ) {
      throw new ArenaTakeoverOutboxError(
        "TAKEOVER_OUTBOX_ATTEMPTS_EXHAUSTED",
        "TAKEOVER_SETTLED delivery attempts are exhausted",
        {
          retryable: true,
          statusCode: 503,
        }
      );
    }
    return await deliverClaimedTakeoverSettledEvent(
      event,
      {
        workerId,
        now:
          observedAt,
      },
      dependencies
    );
  } catch (error) {
    failure =
      error instanceof
      ArenaTakeoverOutboxError
        ? error
        : new ArenaTakeoverOutboxError(
            "TAKEOVER_OUTBOX_DELIVERY_FAILED",
            "TAKEOVER_SETTLED delivery failed",
            {
              retryable:
                errorIsRetryable(
                  error
                ),
              statusCode:
                Number(
                  error
                    ?.statusCode ||
                  error?.status
                ) || 500,
            }
          );
  }

  const failed =
    await markTakeoverEventFailed(
      event,
      failure,
      {
        workerId,
        now:
          observedAt,
        maxAttempts,
        baseRetryMs,
        maxRetryMs,
      },
      dependencies
    );
  return {
    status:
      failed?.status ||
      "LEASE_LOST",
    event: failed,
    errorCode:
      safeIdentifier(
        failure
          .handlerCode ||
        failure.code,
        "TAKEOVER_OUTBOX_FAILURE"
      ),
    retryable:
      failure.retryable,
  };
}

async function drainArenaTakeoverOutbox(
  {
    workerId,
    now =
      () => new Date(),
    batchSize =
      DEFAULT_BATCH_SIZE,
    ...workerOptions
  },
  dependencies = {}
) {
  positiveInteger(
    batchSize,
    "batchSize"
  );
  const results = [];
  for (
    let index = 0;
    index < batchSize;
    index += 1
  ) {
    const currentNow =
      typeof now ===
      "function"
        ? now()
        : now;
    const result =
      await processNextTakeoverSettledEvent(
        {
          workerId,
          now:
            currentNow,
          ...workerOptions,
        },
        dependencies
      );
    if (!result) {
      break;
    }
    results.push(
      result
    );
  }
  return results;
}

function defaultWorkerId() {
  return [
    os.hostname(),
    process.pid,
    randomUUID(),
  ]
    .join(":")
    .slice(0, 120);
}

function startArenaTakeoverOutboxWorker(
  {
    workerId =
      defaultWorkerId(),
    intervalMs =
      DEFAULT_WORKER_INTERVAL_MS,
    batchSize =
      DEFAULT_BATCH_SIZE,
    logger = console,
    ...workerOptions
  } = {},
  dependencies = {}
) {
  positiveInteger(
    intervalMs,
    "intervalMs"
  );
  let running = false;
  let stopped = false;

  const runNow =
    async () => {
      if (
        running ||
        stopped
      ) {
        return [];
      }
      running = true;
      try {
        return await drainArenaTakeoverOutbox(
          {
            workerId,
            batchSize,
            ...workerOptions,
          },
          dependencies
        );
      } catch (error) {
        logger.error(
          "Arena takeover outbox worker failed:",
          safeErrorText(
            error
          )
        );
        return [];
      } finally {
        running = false;
      }
    };

  const timer =
    setInterval(
      runNow,
      intervalMs
    );
  if (
    typeof timer.unref ===
      "function"
  ) {
    timer.unref();
  }
  void runNow();

  return {
    workerId,
    runNow,
    stop() {
      stopped = true;
      clearInterval(
        timer
      );
    },
  };
}

function createArenaTakeoverOutboxService(
  options = {}
) {
  const dependencies = {
    OutboxModel:
      options.OutboxModel ||
      OutboxEvent,
    handlers:
      normalizeHandlers(
        options.handlers ||
        DEFAULT_HANDLERS
      ),
  };
  const clock =
    typeof options.now ===
    "function"
      ? options.now
      : () => new Date();

  function withNow(
    input = {}
  ) {
    return {
      ...input,
      now:
        input.now ||
        clock(),
    };
  }

  return Object.freeze({
    claimNextTakeoverSettledEvent:
      (input) =>
        claimNextTakeoverSettledEvent(
          withNow(input),
          dependencies
        ),
    deliverClaimedTakeoverSettledEvent:
      (event, input) =>
        deliverClaimedTakeoverSettledEvent(
          event,
          withNow(input),
          dependencies
        ),
    drainArenaTakeoverOutbox:
      (input = {}) =>
        drainArenaTakeoverOutbox(
          {
            ...input,
            now:
              input.now ||
              clock,
          },
          dependencies
        ),
    markTakeoverEventFailed:
      (
        event,
        error,
        input
      ) =>
        markTakeoverEventFailed(
          event,
          error,
          withNow(input),
          dependencies
        ),
    markTakeoverEventPublished:
      (event, input) =>
        markTakeoverEventPublished(
          event,
          withNow(input),
          dependencies
        ),
    processNextTakeoverSettledEvent:
      (input) =>
        processNextTakeoverSettledEvent(
          withNow(input),
          dependencies
        ),
    startArenaTakeoverOutboxWorker:
      (input = {}) =>
        startArenaTakeoverOutboxWorker(
          input,
          dependencies
        ),
  });
}

module.exports = {
  ArenaTakeoverOutboxError,
  DEFAULT_BASE_RETRY_MS,
  DEFAULT_LEASE_MS,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_MAX_RETRY_MS,
  TAKEOVER_SETTLED_EVENT_TYPE,
  claimNextTakeoverSettledEvent,
  createArenaTakeoverOutboxService,
  deliverClaimedTakeoverSettledEvent,
  drainArenaTakeoverOutbox,
  markTakeoverEventFailed,
  markTakeoverEventPublished,
  processNextTakeoverSettledEvent,
  retryDelayMs,
  startArenaTakeoverOutboxWorker,
};
