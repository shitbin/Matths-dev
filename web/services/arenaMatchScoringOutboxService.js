"use strict";

const os = require(
  "node:os"
);
const {
  randomUUID,
} = require(
  "node:crypto"
);
const mongoose = require(
  "mongoose"
);

const {
  RankTakeoverAttempt:
    ArenaMatchAttempt,
} = require(
  "../models/arenaMatchAttemptModel"
);
const {
  OutboxEvent,
} = require(
  "../models/outboxEventModel"
);
const {
  createArenaMatchAttemptService,
} = require(
  "./arenaMatchAttemptService"
);
const {
  createArenaMatchScoringService,
} = require(
  "./arenaMatchScoringService"
);
const {
  createArenaQuestionPackService,
} = require(
  "./arenaQuestionPackService"
);
const {
  createRankTakeoverService,
} = require(
  "./rankTakeoverService"
);

const ARENA_ATTEMPT_SUBMITTED_EVENT_TYPE =
  "ARENA_ATTEMPT_SUBMITTED";
const ARENA_SCORING_OUTBOX_SCHEMA_VERSION =
  1;
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

const RETRYABLE_CODES =
  new Set([
    "POLICY_PENDING",
    "COMMAND_IN_PROGRESS",
    "ARENA_SCORING_SOURCE_NOT_READY",
    "ARENA_SCORING_OUTBOX_LEASE_LOST",
  ]);

class ArenaMatchScoringOutboxError
  extends Error {
  constructor(
    code,
    message,
    {
      retryable = true,
      statusCode = 500,
      cause,
    } = {}
  ) {
    super(message, {
      cause,
    });
    this.name =
      "ArenaMatchScoringOutboxError";
    this.code = code;
    this.retryable =
      Boolean(retryable);
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
  throw new ArenaMatchScoringOutboxError(
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
      "ARENA_SCORING_OUTBOX_INPUT_INVALID",
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
    fail(
      "ARENA_SCORING_OUTBOX_INPUT_INVALID",
      `${label} must be a positive integer`,
      {
        retryable: false,
        statusCode: 400,
      }
    );
  }
  return value;
}

function requiredText(
  value,
  label,
  maxLength = 180
) {
  const normalized =
    String(
      value ?? ""
    ).trim();
  if (
    !normalized ||
    normalized.length >
      maxLength
  ) {
    fail(
      "ARENA_SCORING_OUTBOX_INPUT_INVALID",
      `${label} is required and must be at most ${maxLength} characters`,
      {
        retryable: false,
        statusCode: 400,
      }
    );
  }
  return normalized;
}

function objectIdText(
  value,
  label
) {
  const normalized =
    requiredText(
      value,
      label,
      80
    );
  if (
    !mongoose.Types.ObjectId
      .isValid(normalized)
  ) {
    fail(
      "ARENA_SCORING_OUTBOX_INPUT_INVALID",
      `${label} must be a valid identifier`,
      {
        retryable: false,
        statusCode: 400,
      }
    );
  }
  return normalized;
}

function workerIdentity(
  value
) {
  return requiredText(
    value,
    "workerId",
    120
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

function queryWithSession(
  query,
  session
) {
  return session &&
    typeof query?.session ===
      "function"
    ? query.session(session)
    : query;
}

function outboxIdentity(
  attemptId
) {
  return [
    "arena-attempt-submitted",
    objectIdText(
      attemptId,
      "attemptId"
    ),
  ].join(":");
}

function expectedPayload({
  attemptId,
  submissionRecordId,
}) {
  return {
    schemaVersion:
      ARENA_SCORING_OUTBOX_SCHEMA_VERSION,
    attemptId:
      objectIdText(
        attemptId,
        "attemptId"
      ),
    submissionRecordId:
      objectIdText(
        submissionRecordId,
        "submissionRecordId"
      ),
  };
}

function samePayload(
  left,
  right
) {
  return (
    Number(
      left?.schemaVersion
    ) ===
      Number(
        right?.schemaVersion
      ) &&
    String(
      left?.attemptId || ""
    ) ===
      String(
        right?.attemptId || ""
      ) &&
    String(
      left
        ?.submissionRecordId ||
        ""
    ) ===
      String(
        right
          ?.submissionRecordId ||
          ""
      )
  );
}

function assertActiveTransaction(
  session
) {
  if (
    !session ||
    typeof session
      .inTransaction !==
      "function" ||
    session.inTransaction() !==
      true
  ) {
    fail(
      "ARENA_SCORING_OUTBOX_TRANSACTION_REQUIRED",
      "the scoring intent must share the frozen-submission Mongo transaction",
      {
        retryable: false,
        statusCode: 500,
      }
    );
  }
}

function assertExistingIntent(
  event,
  payload
) {
  const plain =
    asPlain(event);
  const identity =
    outboxIdentity(
      payload.attemptId
    );
  if (
    !plain._id ||
    plain.eventId !==
      identity ||
    plain.idempotencyKey !==
      identity ||
    plain.aggregateType !==
      "ArenaMatchAttempt" ||
    String(
      plain.aggregateId ||
        ""
    ) !==
      payload.attemptId ||
    plain.eventType !==
      ARENA_ATTEMPT_SUBMITTED_EVENT_TYPE ||
    !samePayload(
      plain.payload,
      payload
    )
  ) {
    fail(
      "ARENA_SCORING_OUTBOX_CONFLICT",
      "the participant attempt is already bound to a different scoring intent",
      {
        retryable: false,
        statusCode: 409,
      }
    );
  }
  return event;
}

async function enqueueArenaMatchScoringIntent(
  {
    attemptId,
    submissionRecordId,
    session,
    now = new Date(),
  },
  {
    OutboxModel =
      OutboxEvent,
  } = {}
) {
  assertActiveTransaction(
    session
  );
  const payload =
    expectedPayload({
      attemptId,
      submissionRecordId,
    });
  const identity =
    outboxIdentity(
      payload.attemptId
    );
  const existing =
    await resolveQuery(
      queryWithSession(
        OutboxModel.findOne({
          idempotencyKey:
            identity,
        }),
        session
      )
    );
  if (existing) {
    return assertExistingIntent(
      existing,
      payload
    );
  }

  const documents =
    await OutboxModel.create(
      [
        {
          eventId:
            identity,
          idempotencyKey:
            identity,
          aggregateType:
            "ArenaMatchAttempt",
          aggregateId:
            payload.attemptId,
          eventType:
            ARENA_ATTEMPT_SUBMITTED_EVENT_TYPE,
          // Only immutable record identifiers cross the outbox boundary.
          // Answers, user identifiers, network data and problem content stay
          // in their capability-gated source collections.
          payload,
          status:
            "PENDING",
          attemptCount: 0,
          nextAttemptAt:
            requiredDate(
              now,
              "now"
            ),
        },
      ],
      {
        session,
      }
    );
  return documents[0];
}

function validatedIntentPayload(
  event
) {
  const plain =
    asPlain(event);
  if (
    plain.eventType !==
      ARENA_ATTEMPT_SUBMITTED_EVENT_TYPE
  ) {
    fail(
      "ARENA_SCORING_OUTBOX_INVALID",
      "the outbox event is not a submitted-attempt scoring intent",
      {
        retryable: false,
        statusCode: 409,
      }
    );
  }
  const payload =
    asPlain(
      plain.payload
    );
  const allowedKeys =
    [
      "attemptId",
      "schemaVersion",
      "submissionRecordId",
    ];
  const actualKeys =
    Object.keys(payload)
      .sort();
  if (
    actualKeys.length !==
      allowedKeys.length ||
    actualKeys.some(
      (key, index) =>
        key !==
        allowedKeys[index]
    ) ||
    Number(
      payload.schemaVersion
    ) !==
      ARENA_SCORING_OUTBOX_SCHEMA_VERSION
  ) {
    fail(
      "ARENA_SCORING_OUTBOX_INVALID",
      "the scoring intent payload contract is invalid",
      {
        retryable: false,
        statusCode: 409,
      }
    );
  }
  const normalized =
    expectedPayload(
      payload
    );
  assertExistingIntent(
    plain,
    normalized
  );
  return normalized;
}

async function loadSubmittedAttemptSource(
  {
    attemptId,
    submissionRecordId,
  },
  {
    AttemptModel =
      ArenaMatchAttempt,
  } = {}
) {
  const source =
    await resolveQuery(
      AttemptModel
        .findOne({
          _id:
            objectIdText(
              attemptId,
              "attemptId"
            ),
          submissionRecordId:
            objectIdText(
              submissionRecordId,
              "submissionRecordId"
            ),
          status:
            "SUBMITTED",
        })
        .select(
          [
            "_id",
            "matchId",
            "participantRole",
            "participantUserId",
            "questionPackId",
            "submissionRecordId",
            "submissionId",
            "submittedAt",
          ].join(" ")
        )
    );
  if (!source) {
    fail(
      "ARENA_SCORING_SOURCE_NOT_READY",
      "the immutable submitted-attempt source is not available",
      {
        retryable: true,
        statusCode: 503,
      }
    );
  }
  const plain =
    asPlain(source);
  const role =
    requiredText(
      plain.participantRole,
      "source.participantRole",
      20
    ).toUpperCase();
  if (
    ![
      "CHALLENGER",
      "DEFENDER",
    ].includes(role)
  ) {
    fail(
      "ARENA_SCORING_SOURCE_INVALID",
      "the submitted-attempt participant role is invalid",
      {
        retryable: false,
        statusCode: 409,
      }
    );
  }
  if (
    String(plain._id) !==
      String(attemptId) ||
    String(
      plain
        .submissionRecordId
    ) !==
      String(
        submissionRecordId
      )
  ) {
    fail(
      "ARENA_SCORING_SOURCE_INVALID",
      "the submitted-attempt source identity does not match its outbox intent",
      {
        retryable: false,
        statusCode: 409,
      }
    );
  }
  return Object.freeze({
    attemptId:
      objectIdText(
        plain._id,
        "source.attemptId"
      ),
    submissionRecordId:
      objectIdText(
        plain
          .submissionRecordId,
        "source.submissionRecordId"
      ),
    matchId:
      requiredText(
        plain.matchId,
        "source.matchId"
      ),
    participantRole:
      role,
    participantUserId:
      objectIdText(
        plain
          .participantUserId,
        "source.participantUserId"
      ),
    questionPackId:
      objectIdText(
        plain
          .questionPackId,
        "source.questionPackId"
      ),
    participantSubmissionId:
      requiredText(
        plain.submissionId,
        "source.submissionId"
      ),
    submittedAt:
      requiredDate(
        plain.submittedAt,
        "source.submittedAt"
      ),
  });
}

function rankVerifiedScoredResult(
  value
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    fail(
      "ARENA_SCORING_RESULT_INVALID",
      "the private server scorer returned no result",
      {
        retryable: false,
        statusCode: 500,
      }
    );
  }
  if (
    value
      .gradingAuthority !==
      "SERVER"
  ) {
    fail(
      "ARENA_SCORING_AUTHORITY_INVALID",
      "only the private server scorer may produce a Rank result",
      {
        retryable: false,
        statusCode: 500,
      }
    );
  }
  return Object.freeze({
    submissionId:
      value.submissionId,
    calibratedScore:
      value.calibratedScore,
    advancedCorrectCount:
      value
        .advancedCorrectCount,
    correctAnswerActiveSolveTimeMs:
      value
        .correctAnswerActiveSolveTimeMs,
    integrityState:
      value.integrityState,
    questionVersion:
      value.questionVersion,
    answerKeyVersion:
      value.answerKeyVersion,
    calibrationVersion:
      value.calibrationVersion,
    submittedAt:
      requiredDate(
        value.submittedAt,
        "scored.submittedAt"
      ),
  });
}

function createRankSubmissionVerifier({
  scoreSubmittedAttempt,
  serverCapability,
}) {
  return async ({
    match,
    role,
    participantUserId,
    submissionId,
  }) => {
    const participantRole =
      requiredText(
        role,
        "rank.role",
        20
      ).toUpperCase();
    const questionPackId =
      participantRole ===
        "CHALLENGER"
        ? match
            ?.challengerQuestionPackId
        : participantRole ===
            "DEFENDER"
          ? match
              ?.defenderQuestionPackId
          : null;
    if (!questionPackId) {
      fail(
        "ARENA_SCORING_RANK_SOURCE_INVALID",
        "the Rank match has no sealed pack for the participant role",
        {
          retryable: false,
          statusCode: 409,
        }
      );
    }
    const rescored =
      rankVerifiedScoredResult(
        await scoreSubmittedAttempt({
          matchId:
            requiredText(
              match?.matchId,
              "rank.matchId"
            ),
          participantRole,
          participantUserId:
            String(
              participantUserId
            ),
          questionPackId:
            String(
              questionPackId
            ),
          serverCapability,
        })
      );
    if (
      requiredText(
        rescored.submissionId,
        "scored.submissionId"
      ) !==
      requiredText(
        submissionId,
        "rank.submissionId"
      )
    ) {
      fail(
        "ARENA_SCORING_SUBMISSION_MISMATCH",
        "the immutable server submission does not match the Rank command",
        {
          retryable: false,
          statusCode: 409,
        }
      );
    }
    return rescored;
  };
}

function defaultDispatchDependencies(
  options = {}
) {
  const serverCapability =
    options.serverCapability ||
    Symbol(
      "arena-scoring-outbox-capability"
    );
  let scoringService =
    options.scoringService ||
    null;
  if (
    !options
      .scoreSubmittedAttempt &&
    !scoringService
  ) {
    const attemptService =
      options.attemptService ||
      createArenaMatchAttemptService({
        serverCapability,
      });
    const questionPackService =
      options
        .questionPackService ||
      createArenaQuestionPackService({
        serverCapability,
      });
    scoringService =
      createArenaMatchScoringService({
        serverCapability,
        getPrivateScoringProjection:
          attemptService
            .getPrivateScoringProjection,
        getQuestionPackForScoring:
          questionPackService
            .getQuestionPackForScoring,
      });
  }
  const scoreSubmittedAttempt =
    options
      .scoreSubmittedAttempt ||
    scoringService
      .scoreSubmittedAttempt;
  const verifyScoredSubmission =
    options
      .verifyScoredSubmission ||
    createRankSubmissionVerifier({
      scoreSubmittedAttempt,
      serverCapability,
    });
  let rankService =
    options.rankService ||
    null;
  if (
    (!options.submitResult ||
      !options
        .resolveScoredMatch ||
      !options
        .settleResolvedMatch) &&
    !rankService
  ) {
    rankService =
      createRankTakeoverService({
        skipCommandReceipts:
          true,
        verifyScoredSubmission,
      });
  }
  return {
    AttemptModel:
      options.AttemptModel ||
      ArenaMatchAttempt,
    OutboxModel:
      options.OutboxModel ||
      OutboxEvent,
    serverCapability,
    loadSubmittedAttemptSource:
      options
        .loadSubmittedAttemptSource ||
      ((payload) =>
        loadSubmittedAttemptSource(
          payload,
          {
            AttemptModel:
              options
                .AttemptModel ||
              ArenaMatchAttempt,
          }
        )),
    scoreSubmittedAttempt:
      scoreSubmittedAttempt,
    submitResult:
      options.submitResult ||
      rankService.submitResult,
    resolveScoredMatch:
      options
        .resolveScoredMatch ||
      rankService
        .resolveScoredMatch,
    settleResolvedMatch:
      options
        .settleResolvedMatch ||
      rankService
        .settleResolvedMatch,
  };
}

function requireDispatchDependencies(
  dependencies
) {
  for (const name of [
    "loadSubmittedAttemptSource",
    "scoreSubmittedAttempt",
    "submitResult",
    "resolveScoredMatch",
    "settleResolvedMatch",
  ]) {
    if (
      typeof dependencies
        ?.[name] !==
      "function"
    ) {
      fail(
        "ARENA_SCORING_OUTBOX_CONFIGURATION_INVALID",
        `${name} is required`,
        {
          retryable: false,
          statusCode: 500,
        }
      );
    }
  }
  const capability =
    dependencies
      .serverCapability;
  if (
    !(
      typeof capability ===
        "symbol" ||
      (capability !== null &&
        capability !==
          undefined &&
        (typeof capability ===
          "object" ||
          typeof capability ===
            "function"))
    )
  ) {
    fail(
      "ARENA_SCORING_OUTBOX_CONFIGURATION_INVALID",
      "an in-process scoring capability is required",
      {
        retryable: false,
        statusCode: 500,
      }
    );
  }
}

function leaseFilter(
  event,
  workerId
) {
  return {
    _id: event._id,
    eventType:
      ARENA_ATTEMPT_SUBMITTED_EVENT_TYPE,
    status:
      "PROCESSING",
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

async function claimNextArenaScoringIntent(
  {
    workerId,
    now = new Date(),
    leaseMs =
      DEFAULT_LEASE_MS,
  },
  {
    OutboxModel =
      OutboxEvent,
  } = {}
) {
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
  return resolveQuery(
    OutboxModel
      .findOneAndUpdate(
        {
          eventType:
            ARENA_ATTEMPT_SUBMITTED_EVENT_TYPE,
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
      )
  );
}

async function assertLeaseOwned(
  event,
  {
    workerId,
  },
  {
    OutboxModel =
      OutboxEvent,
  } = {}
) {
  const owned =
    await OutboxModel.exists(
      leaseFilter(
        event,
        workerId
      )
    );
  if (!owned) {
    fail(
      "ARENA_SCORING_OUTBOX_LEASE_LOST",
      "the scoring outbox lease was lost",
      {
        retryable: true,
        statusCode: 409,
      }
    );
  }
}

async function markArenaScoringIntentPublished(
  event,
  {
    workerId,
    now = new Date(),
  },
  {
    OutboxModel =
      OutboxEvent,
  } = {}
) {
  return resolveQuery(
    OutboxModel
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
              requiredDate(
                now,
                "now"
              ),
            nextAttemptAt:
              null,
            lockedAt: null,
            lockedBy: null,
            lastError: "",
          },
        },
        {
          returnDocument:
            "after",
          runValidators: true,
        }
      )
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

function safeIdentifier(
  value,
  fallback
) {
  return (
    String(
      value || ""
    )
      .trim()
      .toUpperCase()
      .replace(
        /[^A-Z0-9_.:-]+/g,
        "_"
      )
      .slice(0, 160) ||
    fallback
  );
}

function safeErrorText(
  error
) {
  return [
    "ARENA_SCORING_DISPATCH_FAILED",
    safeIdentifier(
      error?.code,
      "UNKNOWN"
    ),
  ]
    .join(":")
    .slice(
      0,
      MAX_LAST_ERROR_LENGTH
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

function dispatchFailure(
  error
) {
  if (
    error instanceof
      ArenaMatchScoringOutboxError
  ) {
    return error;
  }
  const code =
    safeIdentifier(
      error?.code,
      "ARENA_SCORING_DISPATCH_FAILED"
    );
  const statusCode =
    Number(
      error?.statusCode ||
      error?.status
    ) || 500;
  const retryable =
    typeof error
      ?.retryable ===
      "boolean"
      ? error.retryable
      : RETRYABLE_CODES.has(
            code
          ) ||
        hasTransientLabel(
          error
        ) ||
        statusCode >= 500;
  return new ArenaMatchScoringOutboxError(
    code,
    "the private Arena scoring dispatch failed",
    {
      retryable,
      statusCode,
      cause: error,
    }
  );
}

async function markArenaScoringIntentFailed(
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
  {
    OutboxModel =
      OutboxEvent,
  } = {}
) {
  positiveInteger(
    maxAttempts,
    "maxAttempts"
  );
  const failure =
    dispatchFailure(
      error
    );
  const observedAt =
    requiredDate(
      now,
      "now"
    );
  const attemptCount =
    Math.max(
      1,
      Number(
        event.attemptCount
      ) || 1
    );
  const dead =
    failure.retryable ===
      false ||
    attemptCount >=
      maxAttempts;
  return resolveQuery(
    OutboxModel
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
            nextAttemptAt:
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
                  ),
            lockedAt: null,
            lockedBy: null,
            lastError:
              safeErrorText(
                failure
              ),
          },
        },
        {
          returnDocument:
            "after",
          runValidators: true,
        }
      )
  );
}

async function deliverClaimedArenaScoringIntent(
  event,
  {
    workerId,
    now = new Date(),
  },
  dependencies
) {
  requireDispatchDependencies(
    dependencies
  );
  const observedAt =
    requiredDate(
      now,
      "now"
    );
  const payload =
    validatedIntentPayload(
      event
    );
  await assertLeaseOwned(
    event,
    {
      workerId,
    },
    dependencies
  );
  const source =
    await dependencies
      .loadSubmittedAttemptSource(
        payload
      );
  const scored =
    await dependencies
      .scoreSubmittedAttempt({
        matchId:
          source.matchId,
        participantRole:
          source
            .participantRole,
        participantUserId:
          source
            .participantUserId,
        questionPackId:
          source
            .questionPackId,
        serverCapability:
          dependencies
            .serverCapability,
      });
  const submissionId =
    requiredText(
      scored?.submissionId,
      "scored.submissionId"
    );
  const ranked =
    await dependencies
      .submitResult({
        matchId:
          source.matchId,
        participantUserId:
          source
            .participantUserId,
        submissionId,
      });
  const rankedStatus =
    String(
      ranked?.status || ""
    ).toUpperCase();
  let resolved = null;
  let settled = null;
  if (
    rankedStatus ===
    "SUBMITTED"
  ) {
    resolved =
      await dependencies
        .resolveScoredMatch({
          matchId:
            source.matchId,
          idempotencyKey:
            `arena-score-resolve:${source.matchId}`,
        });
    if (
      ![
        "RESOLVED",
        "SETTLED",
      ].includes(
        String(
          resolved?.status ||
          ""
        ).toUpperCase()
      )
    ) {
      fail(
        "ARENA_SCORING_RESOLUTION_INCOMPLETE",
        "Rank Takeover did not produce a terminal scored decision",
        {
          retryable: true,
          statusCode: 503,
        }
      );
    }
  } else if (
    ![
      "IN_PROGRESS",
      "RESOLVED",
      "SETTLED",
    ].includes(
      rankedStatus
    )
  ) {
    fail(
      "ARENA_SCORING_RANK_STATE_INVALID",
      "Rank Takeover returned an unsupported state after server scoring",
      {
        retryable: false,
        statusCode: 409,
      }
    );
  }
  const resolvedStatus =
    String(
      resolved?.status ||
      rankedStatus
    ).toUpperCase();
  if (
    resolvedStatus ===
    "RESOLVED"
  ) {
    settled =
      await dependencies
        .settleResolvedMatch({
          matchId:
            source.matchId,
        });
    if (
      String(
        settled?.status ||
        ""
      ).toUpperCase() !==
      "SETTLED"
    ) {
      fail(
        "ARENA_SCORING_SETTLEMENT_INCOMPLETE",
        "Rank Takeover did not complete settlement after score resolution",
        {
          retryable: true,
          statusCode: 503,
        }
      );
    }
  }

  await assertLeaseOwned(
    event,
    {
      workerId,
    },
    dependencies
  );
  const published =
    await markArenaScoringIntentPublished(
      event,
      {
        workerId,
        now:
          observedAt,
      },
      dependencies
    );
  if (!published) {
    fail(
      "ARENA_SCORING_OUTBOX_LEASE_LOST",
      "the scoring outbox lease was lost before publication",
      {
        retryable: true,
        statusCode: 409,
      }
    );
  }
  return {
    status:
      "PUBLISHED",
    event: published,
    rankStatus:
      String(
        settled?.status ||
        resolved?.status ||
        rankedStatus
      ).toUpperCase(),
  };
}

async function processNextArenaScoringIntent(
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
  dependencies
) {
  requireDispatchDependencies(
    dependencies
  );
  const observedAt =
    requiredDate(
      now,
      "now"
    );
  const event =
    await claimNextArenaScoringIntent(
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
  try {
    return await deliverClaimedArenaScoringIntent(
      event,
      {
        workerId,
        now:
          observedAt,
      },
      dependencies
    );
  } catch (error) {
    const failure =
      dispatchFailure(
        error
      );
    const failed =
      await markArenaScoringIntentFailed(
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
          failure.code,
          "ARENA_SCORING_DISPATCH_FAILED"
        ),
      retryable:
        failure.retryable,
    };
  }
}

async function drainArenaMatchScoringOutbox(
  {
    workerId,
    now =
      () => new Date(),
    batchSize =
      DEFAULT_BATCH_SIZE,
    ...workerOptions
  },
  dependencies
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
      await processNextArenaScoringIntent(
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
    results.push(result);
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

function startWorker(
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
  dependencies
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
        return await drainArenaMatchScoringOutbox(
          {
            workerId,
            batchSize,
            ...workerOptions,
          },
          dependencies
        );
      } catch (error) {
        logger.error(
          "Arena scoring outbox worker failed:",
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

function createArenaMatchScoringOutboxService(
  options = {}
) {
  const dependencies =
    defaultDispatchDependencies(
      options
    );
  const clock =
    typeof options.now ===
      "function"
      ? options.now
      : () => new Date();
  return Object.freeze({
    claimNextArenaScoringIntent:
      (input = {}) =>
        claimNextArenaScoringIntent(
          {
            ...input,
            now:
              input.now ||
              clock(),
          },
          dependencies
        ),
    deliverClaimedArenaScoringIntent:
      (
        event,
        input = {}
      ) =>
        deliverClaimedArenaScoringIntent(
          event,
          {
            ...input,
            now:
              input.now ||
              clock(),
          },
          dependencies
        ),
    drainArenaMatchScoringOutbox:
      (input = {}) =>
        drainArenaMatchScoringOutbox(
          {
            ...input,
            now:
              input.now ||
              clock,
          },
          dependencies
        ),
    processNextArenaScoringIntent:
      (input = {}) =>
        processNextArenaScoringIntent(
          {
            ...input,
            now:
              input.now ||
              clock(),
          },
          dependencies
        ),
    startArenaMatchScoringOutboxWorker:
      (input = {}) =>
        startWorker(
          input,
          dependencies
        ),
  });
}

function startArenaMatchScoringOutboxWorker(
  input = {},
  dependencies = null
) {
  if (dependencies) {
    requireDispatchDependencies(
      dependencies
    );
    return startWorker(
      input,
      dependencies
    );
  }
  return createArenaMatchScoringOutboxService()
    .startArenaMatchScoringOutboxWorker(
      input
    );
}

module.exports = {
  ARENA_ATTEMPT_SUBMITTED_EVENT_TYPE,
  ARENA_SCORING_OUTBOX_SCHEMA_VERSION,
  ArenaMatchScoringOutboxError,
  DEFAULT_BASE_RETRY_MS,
  DEFAULT_LEASE_MS,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_MAX_RETRY_MS,
  claimNextArenaScoringIntent,
  createArenaMatchScoringOutboxService,
  createRankSubmissionVerifier,
  deliverClaimedArenaScoringIntent,
  drainArenaMatchScoringOutbox,
  enqueueArenaMatchScoringIntent,
  loadSubmittedAttemptSource,
  markArenaScoringIntentFailed,
  markArenaScoringIntentPublished,
  processNextArenaScoringIntent,
  retryDelayMs,
  startArenaMatchScoringOutboxWorker,
  validatedIntentPayload,
};
