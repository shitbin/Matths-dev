"use strict";

const {
  RankTakeoverAttempt:
    ArenaMatchAttempt,
} = require(
  "../models/arenaMatchAttemptModel"
);
const {
  createArenaMatchAttemptService,
} = require(
  "./arenaMatchAttemptService"
);

const DEFAULT_BATCH_SIZE =
  25;
const DEFAULT_WORKER_INTERVAL_MS =
  1000;

class ArenaAttemptDeadlineError
  extends Error {
  constructor(
    code,
    message,
    {
      statusCode = 500,
      cause,
    } = {}
  ) {
    super(message, {
      cause,
    });
    this.name =
      "ArenaAttemptDeadlineError";
    this.code = code;
    this.statusCode =
      statusCode;
    this.status =
      statusCode;
  }
}

function fail(
  code,
  message,
  options
) {
  throw new ArenaAttemptDeadlineError(
    code,
    message,
    options
  );
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
    fail(
      "ARENA_ATTEMPT_DEADLINE_TIME_INVALID",
      `${label} must be a valid date`
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
    fail(
      "ARENA_ATTEMPT_DEADLINE_CONFIG_INVALID",
      `${label} must be a positive integer`
    );
  }
  return value;
}

function isConfiguredCapability(
  capability
) {
  return (
    typeof capability ===
      "symbol" ||
    (capability !== null &&
      capability !==
        undefined &&
      (typeof capability ===
        "object" ||
        typeof capability ===
          "function"))
  );
}

function asPlain(value) {
  if (
    value &&
    typeof value.toObject ===
      "function"
  ) {
    return value.toObject({
      depopulate: true,
      getters: false,
      virtuals: false,
    });
  }
  return value || {};
}

async function resolveQuery(
  query
) {
  if (
    query &&
    typeof query.lean ===
      "function"
  ) {
    return query.lean();
  }
  return query;
}

function safeFailure(
  attempt,
  error
) {
  return Object.freeze({
    attemptId:
      String(
        attempt?._id ||
          ""
      ),
    code:
      typeof error?.code ===
        "string"
        ? error.code
        : "ARENA_ATTEMPT_DEADLINE_FAILED",
  });
}

function createArenaAttemptDeadlineService(
  options = {}
) {
  const now =
    typeof options.now ===
    "function"
      ? options.now
      : () => new Date();
  const AttemptModel =
    options.AttemptModel ||
    ArenaMatchAttempt;
  const deadlineCapability =
    options
      .deadlineCapability ||
    Symbol(
      "arena-attempt-deadline"
    );
  if (
    !isConfiguredCapability(
      deadlineCapability
    )
  ) {
    throw new TypeError(
      "Arena attempt deadline service requires an in-process capability"
    );
  }
  const attemptServiceFactory =
    typeof options
      .attemptServiceFactory ===
    "function"
      ? options
          .attemptServiceFactory
      : createArenaMatchAttemptService;
  const attemptService =
    options.attemptService ||
    attemptServiceFactory({
      now,
      deadlineCapability,
      serverCapability:
        deadlineCapability,
    });
  if (
    !attemptService ||
    typeof attemptService
      .submitExpiredAttempt !==
      "function"
  ) {
    throw new TypeError(
      "Arena attempt deadline service requires submitExpiredAttempt"
    );
  }
  const batchSize =
    positiveInteger(
      options.batchSize ??
        DEFAULT_BATCH_SIZE,
      "batchSize"
    );
  const workerIntervalMs =
    positiveInteger(
      options
        .workerIntervalMs ??
        DEFAULT_WORKER_INTERVAL_MS,
      "workerIntervalMs"
    );
  const onError =
    typeof options.onError ===
    "function"
      ? options.onError
      : (error) =>
          console.error(
            "Arena attempt deadline worker failed:",
            error
          );

  async function findExpiredAttempts(
    observedAt,
    afterCursor = null
  ) {
    const filter = {
      status:
        "IN_PROGRESS",
      submissionRecordId:
        null,
      endsAt: {
        $lt:
          observedAt,
      },
    };
    if (afterCursor) {
      const cursorEndsAt =
        requiredDate(
          afterCursor.endsAt,
          "afterCursor.endsAt"
        );
      if (!afterCursor.attemptId) {
        fail(
          "ARENA_ATTEMPT_DEADLINE_CURSOR_INVALID",
          "afterCursor.attemptId is required",
          {
            statusCode: 500,
          }
        );
      }
      filter.$or = [
        {
          endsAt: {
            $gt:
              cursorEndsAt,
          },
        },
        {
          endsAt:
            cursorEndsAt,
          _id: {
            $gt:
              afterCursor
                .attemptId,
          },
        },
      ];
    }
    return resolveQuery(
      AttemptModel
        .find(filter)
        .select(
          [
            "_id",
            "matchId",
            "participantRole",
            "participantUserId",
            "questionPackId",
            "endsAt",
          ].join(" ")
        )
        .sort({
          endsAt: 1,
          _id: 1,
        })
        .limit(
          batchSize
        )
    );
  }

  async function submitCandidate(
    candidate
  ) {
    const attempt =
      asPlain(candidate);
    if (
      !attempt._id ||
      !attempt.matchId ||
      !attempt
        .participantRole ||
      !attempt
        .participantUserId ||
      !attempt
        .questionPackId
    ) {
      fail(
        "ARENA_ATTEMPT_DEADLINE_SOURCE_INVALID",
        "expired attempt source is missing its immutable participant identity",
        {
          statusCode: 409,
        }
      );
    }
    return attemptService
      .submitExpiredAttempt({
        attemptId:
          attempt._id,
        matchId:
          attempt.matchId,
        participantRole:
          attempt
            .participantRole,
        participantUserId:
          attempt
            .participantUserId,
        questionPackId:
          attempt
            .questionPackId,
        deadlineCapability,
      });
  }

  // A permanently broken oldest row must not monopolize every tick. The
  // seek cursor advances even across failed candidates and wraps after the
  // tail, so later healthy deadlines are eventually processed without an
  // unbounded single worker cycle.
  let scanCursor =
    null;

  async function runOnce() {
    const observedAt =
      requiredDate(
        now(),
        "now"
      );
    const candidates =
      await findExpiredAttempts(
        observedAt,
        scanCursor
      );
    if (
      candidates.length >=
      batchSize
    ) {
      const last =
        asPlain(
          candidates[
            candidates.length -
              1
          ]
        );
      scanCursor = {
        endsAt:
          requiredDate(
            last.endsAt,
            "candidate.endsAt"
          ),
        attemptId:
          last._id,
      };
    } else {
      scanCursor =
        null;
    }
    const settled =
      await Promise.allSettled(
        candidates.map(
          submitCandidate
        )
      );
    const submissions = [];
    const failures = [];
    for (
      let index = 0;
      index <
      settled.length;
      index += 1
    ) {
      const outcome =
        settled[index];
      if (
        outcome.status ===
        "fulfilled"
      ) {
        submissions.push(
          outcome.value
        );
      } else {
        const failure =
          safeFailure(
            candidates[
              index
            ],
            outcome.reason
          );
        failures.push(
          failure
        );
        onError(
          outcome.reason
        );
      }
    }
    return Object.freeze({
      observedAt,
      scannedCount:
        candidates.length,
      submittedCount:
        submissions.length,
      failedCount:
        failures.length,
      submissions:
        Object.freeze(
          submissions
        ),
      failures:
        Object.freeze(
          failures
        ),
    });
  }

  function startWorker() {
    let stopped = false;
    let activeTick =
      null;

    function tick() {
      if (
        stopped ||
        activeTick
      ) {
        return (
          activeTick ||
          Promise.resolve([])
        );
      }
      const currentTick =
        (async () => {
          try {
            return await runOnce();
          } catch (error) {
            onError(error);
            return null;
          }
        })();
      activeTick =
        currentTick;
      void currentTick
        .finally(() => {
          if (
            activeTick ===
            currentTick
          ) {
            activeTick =
              null;
          }
        });
      return currentTick;
    }

    void tick();
    const timer =
      setInterval(
        tick,
        workerIntervalMs
      );
    if (
      typeof timer.unref ===
      "function"
    ) {
      timer.unref();
    }

    function stop() {
      if (stopped) {
        return;
      }
      stopped = true;
      clearInterval(
        timer
      );
    }

    async function stopAndDrain() {
      stop();
      if (activeTick) {
        await activeTick;
      }
    }

    return Object.freeze({
      runOnce,
      stop,
      stopAndDrain,
    });
  }

  return Object.freeze({
    findExpiredAttempts,
    runOnce,
    startArenaAttemptDeadlineWorker:
      startWorker,
  });
}

function startArenaAttemptDeadlineWorker(
  options = {}
) {
  return createArenaAttemptDeadlineService(
    options
  )
    .startArenaAttemptDeadlineWorker();
}

module.exports = {
  ArenaAttemptDeadlineError,
  DEFAULT_BATCH_SIZE,
  DEFAULT_WORKER_INTERVAL_MS,
  createArenaAttemptDeadlineService,
  startArenaAttemptDeadlineWorker,
};
