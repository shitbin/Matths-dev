const {
  randomUUID,
} = require("node:crypto");
const os = require("node:os");
const mongoose = require(
  "mongoose"
);

const {
  AccessCycle,
} = require(
  "../models/accessCycleModel"
);
const {
  OutboxEvent,
} = require(
  "../models/outboxEventModel"
);
const {
  AssessmentAttempt,
  LearningEvent,
  ProblemAttempt,
  QuickPracticeAttempt,
} = require(
  "../models/matthsModel"
);
const {
  kstDateKey,
} = require(
  "./accessCycleService"
);
const {
  recordCycleAttendanceActivity,
} = require(
  "./cycleAttendanceService"
);

const ATTENDANCE_OUTBOX_EVENT_TYPE =
  "CYCLE_ATTENDANCE_ACTIVITY";
const ATTENDANCE_OUTBOX_SCHEMA_VERSION =
  1;
const DEFAULT_LEASE_MS =
  60 * 1000;
const DEFAULT_BASE_RETRY_MS =
  1000;
const DEFAULT_MAX_RETRY_MS =
  5 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 25;
const DEFAULT_ORPHAN_GRACE_MS =
  24 * 60 * 60 * 1000;
const DEFAULT_WORKER_INTERVAL_MS =
  1000;
const DEFAULT_BATCH_SIZE = 50;
const IPAD_ATTENDANCE_CONTRACT_VERSION =
  1;
const IPAD_CLIENT_REPORTED_MAX_DURATION_MS =
  15 * 60 * 1000;
const IPAD_CLIENT_REPORTED_DURATION_TRUST =
  "CLIENT_REPORTED_UNVERIFIED";
const IPAD_SERVER_VERIFIED_DURATION_TRUST =
  "SERVER_VERIFIED";
const IPAD_EVENT_FUTURE_SKEW_MS =
  5 * 60 * 1000;

const ATTENDANCE_SOURCE_MODELS =
  Object.freeze({
    ASSESSMENT_ATTEMPT:
      "ASSESSMENT_ATTEMPT",
    LEARNING_EVENT:
      "LEARNING_EVENT",
    PROBLEM_ATTEMPT:
      "PROBLEM_ATTEMPT",
    QUICK_PRACTICE_ATTEMPT:
      "QUICK_PRACTICE_ATTEMPT",
  });

const CYCLE_SOURCE_STATUSES =
  Object.freeze([
    "SUB_ACTIVE",
    "SUB_CLOSING",
    "REFUND_REVIEW",
    "REFUND_HELD",
    "PAYBACK_COMPLETED",
    "PAYBACK_FAILED",
    "MAIN_ACTIVE",
    "MAIN_SETTLING",
    "CLOSED",
  ]);

const DEFAULT_SOURCE_MODELS =
  Object.freeze({
    [ATTENDANCE_SOURCE_MODELS
      .ASSESSMENT_ATTEMPT]:
      AssessmentAttempt,
    [ATTENDANCE_SOURCE_MODELS
      .LEARNING_EVENT]:
      LearningEvent,
    [ATTENDANCE_SOURCE_MODELS
      .PROBLEM_ATTEMPT]:
      ProblemAttempt,
    [ATTENDANCE_SOURCE_MODELS
      .QUICK_PRACTICE_ATTEMPT]:
      QuickPracticeAttempt,
  });

class CycleAttendanceOutboxError
  extends Error {
  constructor(
    code,
    message,
    {
      retryable = true,
      statusCode = 500,
    } = {}
  ) {
    super(message);
    this.name =
      "CycleAttendanceOutboxError";
    this.code = code;
    this.retryable =
      retryable;
    this.status =
      statusCode;
  }
}

function asPlain(value) {
  if (!value) {
    return value;
  }
  return typeof value.toObject ===
    "function"
    ? value.toObject()
    : value;
}

async function resolveQuery(
  query,
  {
    lean = true,
  } = {}
) {
  let pending = query;
  if (
    lean &&
    typeof pending?.lean ===
      "function"
  ) {
    pending = pending.lean();
  }
  return pending;
}

function requiredText(
  value,
  label,
  maxLength = 240
) {
  const normalized =
    String(value || "").trim();
  if (!normalized) {
    throw new TypeError(
      `${label} is required`
    );
  }
  if (
    normalized.length >
    maxLength
  ) {
    throw new TypeError(
      `${label} is too long`
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
    throw new TypeError(
      `${label} must be a valid ObjectId`
    );
  }
  return normalized;
}

function requiredDate(
  value,
  label
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    throw new TypeError(
      `${label} must be a valid date`
    );
  }
  const date =
    value instanceof Date
      ? new Date(
          value.getTime()
        )
      : new Date(value);
  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new TypeError(
      `${label} must be a valid date`
    );
  }
  return date;
}

function storedDurationMs(
  value,
  label
) {
  const normalized =
    Number(value);
  if (
    !Number.isSafeInteger(
      normalized
    ) ||
    normalized < 0
  ) {
    throw new CycleAttendanceOutboxError(
      "ATTENDANCE_SOURCE_INVALID",
      `${label} is not a persisted non-negative integer`,
      {
        retryable: false,
      }
    );
  }
  return normalized;
}

function sourceModelName(
  value
) {
  const normalized =
    requiredText(
      value,
      "sourceModel",
      80
    ).toUpperCase();
  if (
    !Object.values(
      ATTENDANCE_SOURCE_MODELS
    ).includes(normalized)
  ) {
    throw new TypeError(
      "sourceModel is unsupported"
    );
  }
  return normalized;
}

function outboxIdentity({
  sourceModel,
  sourceDocumentId,
}) {
  return [
    "cycle-attendance",
    sourceModel,
    sourceDocumentId,
  ].join(":");
}

function sameOutboxPayload(
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
      left?.cycleId || ""
    ) ===
      String(
        right?.cycleId || ""
      ) &&
    String(
      left?.sourceModel || ""
    ) ===
      String(
        right?.sourceModel || ""
      ) &&
    String(
      left?.sourceDocumentId ||
        ""
    ) ===
      String(
        right?.sourceDocumentId ||
          ""
      )
  );
}

function isDuplicateKey(error) {
  return (
    error?.code === 11000 ||
    error?.code === 11001
  );
}

async function eligibleCycleForSource({
  AccessCycleModel =
    AccessCycle,
  userId,
  occurredAt,
}) {
  const normalizedUserId =
    objectIdText(
      userId,
      "userId"
    );
  const dateKey =
    kstDateKey(
      requiredDate(
        occurredAt,
        "occurredAt"
      )
    );
  let query =
    AccessCycleModel.findOne({
      userId:
        normalizedUserId,
      status: {
        $in:
          CYCLE_SOURCE_STATUSES,
      },
      paidAccessStartsOn: {
        $lte: dateKey,
      },
      day30ReviewOn: {
        $gte: dateKey,
      },
    });
  if (
    typeof query?.sort ===
      "function"
  ) {
    query = query.sort({
      startedAt: -1,
      _id: -1,
    });
  }
  return resolveQuery(query);
}

async function enqueueCycleAttendanceIntent(
  {
    userId,
    sourceModel,
    sourceDocumentId,
    occurredAt,
  },
  {
    AccessCycleModel =
      AccessCycle,
    OutboxModel =
      OutboxEvent,
    ...dependencies
  } = {}
) {
  const normalizedSourceModel =
    sourceModelName(
      sourceModel
    );
  const normalizedSourceId =
    objectIdText(
      sourceDocumentId,
      "sourceDocumentId"
    );
  const cycle =
    Object.prototype
      .hasOwnProperty.call(
        dependencies,
        "resolvedCycle"
      )
      ? dependencies
          .resolvedCycle
      : await eligibleCycleForSource({
          AccessCycleModel,
          userId,
          occurredAt,
        });
  if (!cycle) {
    return {
      queued: false,
      reason:
        "NO_ELIGIBLE_CYCLE",
      event: null,
    };
  }

  const identity =
    outboxIdentity({
      sourceModel:
        normalizedSourceModel,
      sourceDocumentId:
        normalizedSourceId,
    });
  const payload = {
    schemaVersion:
      ATTENDANCE_OUTBOX_SCHEMA_VERSION,
    cycleId: String(
      cycle._id
    ),
    sourceModel:
      normalizedSourceModel,
    sourceDocumentId:
      normalizedSourceId,
  };
  const document = {
    eventId: identity,
    idempotencyKey:
      identity,
    aggregateType:
      normalizedSourceModel,
    aggregateId:
      normalizedSourceId,
    eventType:
      ATTENDANCE_OUTBOX_EVENT_TYPE,
    // 답안·문제 본문·학생 개인정보는 넣지 않는다. worker가 권위 원천을
    // 다시 읽어 출석 입력을 만든다.
    payload,
    status: "PENDING",
    attemptCount: 0,
    nextAttemptAt:
      new Date(),
  };

  try {
    const created =
      await OutboxModel.create(
        document
      );
    return {
      queued: true,
      created: true,
      event: asPlain(
        created
      ),
    };
  } catch (error) {
    if (
      !isDuplicateKey(error)
    ) {
      throw error;
    }
  }

  let existing =
    await resolveQuery(
      OutboxModel.findOne({
        idempotencyKey:
          identity,
      })
    );
  if (
    !existing ||
    existing.eventId !==
      identity ||
    existing
      .idempotencyKey !==
      identity ||
    existing.aggregateType !==
      normalizedSourceModel ||
    String(
      existing.aggregateId
    ) !==
      normalizedSourceId ||
    existing.eventType !==
      ATTENDANCE_OUTBOX_EVENT_TYPE ||
    !sameOutboxPayload(
      existing.payload,
      payload
    )
  ) {
    throw new CycleAttendanceOutboxError(
      "ATTENDANCE_OUTBOX_CONFLICT",
      "the attendance source key is already bound to a different intent",
      {
        retryable: false,
        statusCode: 409,
      }
    );
  }
  let requeued = false;
  if (
    existing.status ===
    "DEAD"
  ) {
    const revived =
      await resolveQuery(
        OutboxModel.findOneAndUpdate(
          {
            _id: existing._id,
            status: "DEAD",
          },
          {
            $set: {
              status:
                "PENDING",
              nextAttemptAt:
                new Date(),
              lockedAt: null,
              lockedBy: null,
            },
          },
          {
            returnDocument:
              "after",
            runValidators:
              true,
          }
        )
      );
    if (revived) {
      existing = revived;
      requeued = true;
    } else {
      existing =
        await resolveQuery(
          OutboxModel.findById(
            existing._id
          )
        );
    }
  }
  return {
    queued: true,
    created: false,
    requeued,
    event: existing,
  };
}

/**
 * MongoDB가 standalone인 로컬 환경에서도 source-success/outbox-missing
 * 틈이 생기지 않도록 의도를 먼저 영속화한다. source 저장이 실패하거나
 * 결과가 불명확하면 worker가 실제 원천 문서를 검증하므로 출석은 잘못
 * 반영되지 않는다. 반대로 source 저장이 성공했다면 outbox는 이미 존재한다.
 */
async function persistLearningSourceWithAttendance(
  {
    userId,
    sourceModel,
    sourceDocumentId,
    occurredAt,
    persistSource,
  },
  dependencies = {}
) {
  if (
    typeof persistSource !==
    "function"
  ) {
    throw new TypeError(
      "persistSource must be a function"
    );
  }
  const intent =
    await enqueueCycleAttendanceIntent(
      {
        userId,
        sourceModel,
        sourceDocumentId,
        occurredAt,
      },
      dependencies
    );
  const source =
    await persistSource();
  return {
    source,
    attendanceIntent:
      intent,
  };
}

function sourceNotReady(
  message
) {
  return new CycleAttendanceOutboxError(
    "ATTENDANCE_SOURCE_NOT_READY",
    message,
    {
      retryable: true,
    }
  );
}

function sourceMissing() {
  return new CycleAttendanceOutboxError(
    "ATTENDANCE_SOURCE_MISSING",
    "the referenced learning source has not been persisted",
    {
      retryable: true,
    }
  );
}

function answeredQuestion(
  question
) {
  const answer =
    question
      ?.submittedAnswer;
  if (
    answer === null ||
    answer === undefined
  ) {
    return false;
  }
  return (
    typeof answer !== "string" ||
    answer.trim() !== ""
  );
}

function deriveProblemAttemptEvent(
  source
) {
  // iPad /wrong-notes/bulk가 만드는 ProblemAttempt는 이미 앞선
  // LearningEvent(problem-wrong)의 파생 저장소다. 이를 별도 출석 원천으로
  // 다시 발행하면 한 풀이가 두 번 집계되므로 adapter 단계에서도 차단한다.
  if (
    String(
      source.clientAttemptId ||
        ""
    ).trim()
  ) {
    throw new CycleAttendanceOutboxError(
      "ATTENDANCE_DERIVED_SOURCE",
      "an iPad wrong-note attempt is derivative storage, not a separate attendance source",
      {
        retryable: false,
      }
    );
  }
  if (
    !source.submittedAt
  ) {
    throw sourceNotReady(
      "the problem attempt has no persisted submission timestamp"
    );
  }
  const isReview =
    Boolean(
      source
        .reviewSourceAttemptId
    );
  return {
    userId: String(
      source.userId
    ),
    sourceType: isReview
      ? "WRONG_NOTE_REVIEW"
      : "PRACTICE",
    sourceId: String(
      source._id
    ),
    eventType: isReview
      ? "REVIEW_ATTEMPT_COMPLETED"
      : "ATTEMPT_COMPLETED",
    problemIds: [
      String(
        source.problemId
      ),
    ],
    durationMs:
      storedDurationMs(
        source.responseTimeMs,
        "ProblemAttempt.responseTimeMs"
      ),
    occurredAt:
      requiredDate(
        source.submittedAt,
        "ProblemAttempt.submittedAt"
      ),
    allRequiredSubmissionsPersisted:
      true,
    integrityState:
      "CLEAR",
  };
}

function deriveLearningEvent(
  source
) {
  const attendance =
    source.metadata
      ?.cycleAttendance;
  if (
    !attendance ||
    attendance.candidate !==
      true ||
    Number(
      attendance
        .contractVersion
    ) !==
      IPAD_ATTENDANCE_CONTRACT_VERSION ||
    attendance.sourceType !==
      "PRACTICE"
  ) {
    throw new CycleAttendanceOutboxError(
      "ATTENDANCE_SOURCE_INELIGIBLE",
      "the learning event was not accepted under the server attendance contract",
      {
        retryable: false,
      }
    );
  }

  const eventType =
    requiredText(
      source.eventType,
      "LearningEvent.eventType",
      80
    );
  const expectedCorrect =
    eventType ===
      "problem-correct"
      ? true
      : eventType ===
          "problem-wrong"
        ? false
        : null;
  if (
    expectedCorrect ===
      null ||
    source.correct !==
      expectedCorrect
  ) {
    throw new CycleAttendanceOutboxError(
      "ATTENDANCE_SOURCE_INVALID",
      "the learning event is not a terminal problem result",
      {
        retryable: false,
      }
    );
  }

  requiredText(
    source.conceptId,
    "LearningEvent.conceptId",
    180
  );
  const clientEventId =
    requiredText(
      source.clientEventId,
      "LearningEvent.clientEventId",
      120
    );
  const clientDurationMs =
    storedDurationMs(
      source.durationMs,
      "LearningEvent.durationMs"
    );
  if (
    clientDurationMs <= 0 ||
    clientDurationMs >
      IPAD_CLIENT_REPORTED_MAX_DURATION_MS
  ) {
    throw new CycleAttendanceOutboxError(
      "ATTENDANCE_SOURCE_INVALID",
      "the learning event duration is outside the accepted telemetry range",
      {
        retryable: false,
      }
    );
  }

  const durationTrust =
    requiredText(
      attendance
        .durationTrust,
      "LearningEvent.metadata.cycleAttendance.durationTrust",
      80
    );
  if (
    ![
      IPAD_CLIENT_REPORTED_DURATION_TRUST,
      IPAD_SERVER_VERIFIED_DURATION_TRUST,
    ].includes(
      durationTrust
    )
  ) {
    throw new CycleAttendanceOutboxError(
      "ATTENDANCE_SOURCE_INVALID",
      "the learning event duration trust level is unsupported",
      {
        retryable: false,
      }
    );
  }

  const occurredAt =
    requiredDate(
      source.occurredAt,
      "LearningEvent.occurredAt"
    );
  const persistedAt =
    requiredDate(
      source.createdAt,
      "LearningEvent.createdAt"
    );
  if (
    occurredAt.getTime() >
    persistedAt.getTime() +
      IPAD_EVENT_FUTURE_SKEW_MS
  ) {
    throw new CycleAttendanceOutboxError(
      "ATTENDANCE_SOURCE_INVALID",
      "the learning event timestamp is too far in the future",
      {
        retryable: false,
      }
    );
  }

  const sourceId =
    `ipad-learning:${clientEventId}`;
  return {
    userId: String(
      source.userId
    ),
    sourceType:
      "PRACTICE",
    sourceId,
    eventType:
      "IPAD_PROBLEM_COMPLETED",
    problemIds: [
      sourceId,
    ],
    // 현재 iPad의 wall-clock duration은 HTTP 클라이언트가 정한 값이다.
    // 풀이 완료 문제는 감사 가능하게 남기되, 서버 검증 계약이 생기기 전에는
    // 환급 출석의 유효 학습 시간으로 절대 올리지 않는다.
    durationMs:
      durationTrust ===
      IPAD_SERVER_VERIFIED_DURATION_TRUST
        ? clientDurationMs
        : 0,
    occurredAt,
    allRequiredSubmissionsPersisted:
      true,
    integrityState:
      "CLEAR",
  };
}

function deriveQuickPracticeEvent(
  source
) {
  const status =
    String(
      source.status || ""
    );
  if (status === "active") {
    throw sourceNotReady(
      "the quick-practice attempt is still active"
    );
  }
  if (
    ![
      "correct",
      "wrong",
      "expired",
    ].includes(status)
  ) {
    throw new CycleAttendanceOutboxError(
      "ATTENDANCE_SOURCE_INVALID",
      "the quick-practice attempt has an unsupported terminal state",
      {
        retryable: false,
      }
    );
  }
  if (
    !source.submittedAt
  ) {
    throw sourceNotReady(
      "the quick-practice attempt has no persisted submission timestamp"
    );
  }
  const submitted =
    status === "correct" ||
    status === "wrong";
  const instanceId =
    requiredText(
      source.instanceId,
      "QuickPracticeAttempt.instanceId",
      180
    );
  return {
    userId: String(
      source.userId
    ),
    sourceType:
      "QUICK_PRACTICE",
    sourceId: instanceId,
    eventType: submitted
      ? "ATTEMPT_SUBMITTED"
      : "ATTEMPT_EXPIRED",
    problemIds: submitted
      ? [
          `quick-practice:${instanceId}`,
        ]
      : [],
    durationMs:
      storedDurationMs(
        source.responseTimeMs,
        "QuickPracticeAttempt.responseTimeMs"
      ),
    occurredAt:
      requiredDate(
        source.submittedAt,
        "QuickPracticeAttempt.submittedAt"
      ),
    // 시간만 흐르고 답을 제출하지 않은 만료는 감사 기록만 남긴다.
    allRequiredSubmissionsPersisted:
      submitted,
    integrityState:
      "CLEAR",
  };
}

function deriveAssessmentEvent(
  source
) {
  const status =
    String(
      source.status || ""
    );
  if (
    status === "in-progress"
  ) {
    throw sourceNotReady(
      "the assessment attempt is still in progress"
    );
  }
  if (
    ![
      "submitted",
      "disqualified",
    ].includes(status)
  ) {
    throw new CycleAttendanceOutboxError(
      "ATTENDANCE_SOURCE_INVALID",
      "the assessment attempt has an unsupported terminal state",
      {
        retryable: false,
      }
    );
  }
  if (
    !source.submittedAt
  ) {
    throw sourceNotReady(
      "the assessment attempt has no persisted submission timestamp"
    );
  }
  const submitted =
    status === "submitted";
  const sourceId =
    String(source._id);
  const problemIds = (
    source.questions || []
  )
    .filter(
      answeredQuestion
    )
    .map(
      (question) =>
        `assessment:${sourceId}:${requiredText(
          question.questionId,
          "AssessmentAttempt.questionId",
          160
        )}`
    );
  return {
    userId: String(
      source.userId
    ),
    sourceType:
      source.scopeType ===
      "placement"
        ? "PLACEMENT"
        : "ASSESSMENT",
    sourceId,
    eventType: submitted
      ? "ASSESSMENT_SUBMITTED"
      : "ASSESSMENT_DISQUALIFIED",
    problemIds,
    durationMs:
      storedDurationMs(
        source.elapsedTimeMs,
        "AssessmentAttempt.elapsedTimeMs"
      ),
    occurredAt:
      requiredDate(
        source.submittedAt,
        "AssessmentAttempt.submittedAt"
      ),
    // 제한시간 초과는 제출 없는 타이머와 동일하게 출석 합계에서 제외한다.
    allRequiredSubmissionsPersisted:
      submitted,
    integrityState:
      "CLEAR",
  };
}

function deriveAttendanceEventFromSource(
  sourceModel,
  source
) {
  const normalizedSourceModel =
    sourceModelName(
      sourceModel
    );
  const plain =
    asPlain(source);
  if (!plain) {
    throw sourceMissing();
  }
  if (
    normalizedSourceModel ===
    ATTENDANCE_SOURCE_MODELS
      .LEARNING_EVENT
  ) {
    return deriveLearningEvent(
      plain
    );
  }
  if (
    normalizedSourceModel ===
    ATTENDANCE_SOURCE_MODELS
      .PROBLEM_ATTEMPT
  ) {
    return deriveProblemAttemptEvent(
      plain
    );
  }
  if (
    normalizedSourceModel ===
    ATTENDANCE_SOURCE_MODELS
      .QUICK_PRACTICE_ATTEMPT
  ) {
    return deriveQuickPracticeEvent(
      plain
    );
  }
  return deriveAssessmentEvent(
    plain
  );
}

function validatedIntentPayload(
  event
) {
  const plain =
    asPlain(event);
  if (
    plain?.eventType !==
    ATTENDANCE_OUTBOX_EVENT_TYPE
  ) {
    throw new CycleAttendanceOutboxError(
      "ATTENDANCE_OUTBOX_INVALID",
      "the outbox event type is not an attendance intent",
      {
        retryable: false,
      }
    );
  }
  const payload =
    asPlain(
      plain.payload
    ) || {};
  if (
    Number(
      payload.schemaVersion
    ) !==
    ATTENDANCE_OUTBOX_SCHEMA_VERSION
  ) {
    throw new CycleAttendanceOutboxError(
      "ATTENDANCE_OUTBOX_INVALID",
      "the attendance outbox schema version is unsupported",
      {
        retryable: false,
      }
    );
  }
  const sourceModel =
    sourceModelName(
      payload.sourceModel
    );
  const sourceDocumentId =
    objectIdText(
      payload.sourceDocumentId,
      "sourceDocumentId"
    );
  const cycleId =
    objectIdText(
      payload.cycleId,
      "cycleId"
    );
  if (
    plain.aggregateType !==
      sourceModel ||
    String(
      plain.aggregateId
    ) !==
      sourceDocumentId
  ) {
    throw new CycleAttendanceOutboxError(
      "ATTENDANCE_OUTBOX_INVALID",
      "the outbox aggregate does not match its source payload",
      {
        retryable: false,
      }
    );
  }
  return {
    sourceModel,
    sourceDocumentId,
    cycleId,
  };
}

async function loadAttendanceSource(
  {
    sourceModel,
    sourceDocumentId,
  },
  {
    sourceModels =
      DEFAULT_SOURCE_MODELS,
  } = {}
) {
  const SourceModel =
    sourceModels[
      sourceModel
    ];
  if (
    !SourceModel ||
    typeof SourceModel.findById !==
      "function"
  ) {
    throw new CycleAttendanceOutboxError(
      "ATTENDANCE_SOURCE_ADAPTER_MISSING",
      "the attendance source adapter is not configured",
      {
        retryable: false,
      }
    );
  }
  const source =
    await resolveQuery(
      SourceModel.findById(
        sourceDocumentId
      )
    );
  if (!source) {
    throw sourceMissing();
  }
  return source;
}

async function claimNextAttendanceIntent(
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
  const normalizedWorkerId =
    requiredText(
      workerId,
      "workerId",
      120
    );
  const claimedAt =
    requiredDate(now, "now");
  const staleBefore =
    new Date(
      claimedAt.getTime() -
        leaseMs
    );
  return resolveQuery(
    OutboxModel.findOneAndUpdate(
      {
        eventType:
          ATTENDANCE_OUTBOX_EVENT_TYPE,
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
                claimedAt,
            },
          },
          {
            status:
              "PROCESSING",
            lockedAt: {
              $lte:
                staleBefore,
            },
          },
        ],
      },
      {
        $set: {
          status:
            "PROCESSING",
          lockedAt:
            claimedAt,
          lockedBy:
            normalizedWorkerId,
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

function retryDelayMs(
  attemptCount,
  {
    baseRetryMs =
      DEFAULT_BASE_RETRY_MS,
    maxRetryMs =
      DEFAULT_MAX_RETRY_MS,
  } = {}
) {
  const exponent =
    Math.max(
      0,
      Math.min(
        Number(
          attemptCount
        ) - 1,
        20
      )
    );
  return Math.min(
    maxRetryMs,
    baseRetryMs *
      2 ** exponent
  );
}

function safeErrorText(error) {
  const code =
    String(
      error?.code ||
        error?.name ||
        "ATTENDANCE_OUTBOX_FAILURE"
    )
      .replace(
        /[^A-Z0-9_]/gi,
        "_"
      )
      .slice(0, 100);
  const message =
    String(
      error?.message ||
        "attendance dispatch failed"
    )
      .replace(
        /\s+/g,
        " "
      )
      .slice(0, 850);
  return `${code}: ${message}`.slice(
    0,
    1000
  );
}

function sourceAwaitingPersistence(
  error
) {
  return [
    "ATTENDANCE_SOURCE_MISSING",
    "ATTENDANCE_SOURCE_NOT_READY",
  ].includes(
    error?.code
  );
}

async function markAttendanceIntentFailed(
  event,
  error,
  {
    workerId,
    now = new Date(),
    maxAttempts =
      DEFAULT_MAX_ATTEMPTS,
    orphanGraceMs =
      DEFAULT_ORPHAN_GRACE_MS,
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
  const failedAt =
    requiredDate(now, "now");
  const attemptCount =
    Math.max(
      1,
      Number(
        event.attemptCount
      ) || 1
    );
  const createdAt =
    event.createdAt
      ? requiredDate(
          event.createdAt,
          "createdAt"
        )
      : failedAt;
  const orphanGraceElapsed =
    failedAt.getTime() -
      createdAt.getTime() >=
    orphanGraceMs;
  const sourceOrphan =
    sourceAwaitingPersistence(
      error
    );
  const exhausted =
    attemptCount >=
      maxAttempts &&
    (!sourceOrphan ||
      orphanGraceElapsed);
  const dead =
    error?.retryable ===
      false ||
    exhausted;
  const nextAttemptAt = dead
    ? null
    : new Date(
        failedAt.getTime() +
          retryDelayMs(
            attemptCount,
            {
              baseRetryMs,
              maxRetryMs,
            }
          )
      );
  return resolveQuery(
    OutboxModel.findOneAndUpdate(
      {
        _id: event._id,
        status:
          "PROCESSING",
        lockedBy:
          workerId,
      },
      {
        $set: {
          status: dead
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
    )
  );
}

async function markAttendanceIntentPublished(
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
    OutboxModel.findOneAndUpdate(
      {
        _id: event._id,
        status:
          "PROCESSING",
        lockedBy:
          workerId,
      },
      {
        $set: {
          status:
            "PUBLISHED",
          publishedAt:
            requiredDate(
              now,
              "now"
            ),
          nextAttemptAt: null,
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

async function deliverClaimedAttendanceIntent(
  event,
  {
    workerId,
    now = new Date(),
  },
  {
    sourceModels =
      DEFAULT_SOURCE_MODELS,
    recordAttendance =
      recordCycleAttendanceActivity,
    OutboxModel =
      OutboxEvent,
  } = {}
) {
  const payload =
    validatedIntentPayload(
      event
    );
  const source =
    await loadAttendanceSource(
      payload,
      {
        sourceModels,
      }
    );
  const attendanceInput =
    deriveAttendanceEventFromSource(
      payload.sourceModel,
      source
    );
  const attendanceResult =
    await recordAttendance(
      {
        ...attendanceInput,
        cycleId:
          payload.cycleId,
      },
      {
        now:
          requiredDate(
            now,
            "now"
          ),
      }
    );
  const published =
    await markAttendanceIntentPublished(
      event,
      {
        workerId,
        now,
      },
      {
        OutboxModel,
      }
    );
  if (!published) {
    throw new CycleAttendanceOutboxError(
      "ATTENDANCE_OUTBOX_LEASE_LOST",
      "the attendance outbox lease was lost before publication",
      {
        retryable: true,
        statusCode: 409,
      }
    );
  }
  return {
    status: "PUBLISHED",
    event: published,
    attendanceResult,
  };
}

async function processNextAttendanceIntent(
  {
    workerId,
    now = new Date(),
    leaseMs =
      DEFAULT_LEASE_MS,
    maxAttempts =
      DEFAULT_MAX_ATTEMPTS,
    orphanGraceMs =
      DEFAULT_ORPHAN_GRACE_MS,
    baseRetryMs =
      DEFAULT_BASE_RETRY_MS,
    maxRetryMs =
      DEFAULT_MAX_RETRY_MS,
  },
  dependencies = {}
) {
  const event =
    await claimNextAttendanceIntent(
      {
        workerId,
        now,
        leaseMs,
      },
      dependencies
    );
  if (!event) {
    return null;
  }
  try {
    return await deliverClaimedAttendanceIntent(
      event,
      {
        workerId,
        now,
      },
      dependencies
    );
  } catch (error) {
    const failed =
      await markAttendanceIntentFailed(
        event,
        error,
        {
          workerId,
          now,
          maxAttempts,
          orphanGraceMs,
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
      error,
    };
  }
}

async function drainCycleAttendanceOutbox(
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
      await processNextAttendanceIntent(
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

function startCycleAttendanceOutboxWorker(
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
  let running = false;
  let stopped = false;

  const runNow = async () => {
    if (
      running ||
      stopped
    ) {
      return [];
    }
    running = true;
    try {
      return await drainCycleAttendanceOutbox(
        {
          workerId,
          batchSize,
          ...workerOptions,
        },
        dependencies
      );
    } catch (error) {
      logger.error(
        "Cycle attendance outbox worker failed:",
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
      clearInterval(timer);
    },
  };
}

module.exports = {
  ATTENDANCE_OUTBOX_EVENT_TYPE,
  ATTENDANCE_OUTBOX_SCHEMA_VERSION,
  ATTENDANCE_SOURCE_MODELS,
  CYCLE_SOURCE_STATUSES,
  CycleAttendanceOutboxError,
  IPAD_ATTENDANCE_CONTRACT_VERSION,
  IPAD_CLIENT_REPORTED_DURATION_TRUST,
  IPAD_CLIENT_REPORTED_MAX_DURATION_MS,
  IPAD_EVENT_FUTURE_SKEW_MS,
  IPAD_SERVER_VERIFIED_DURATION_TRUST,
  claimNextAttendanceIntent,
  deliverClaimedAttendanceIntent,
  deriveAttendanceEventFromSource,
  drainCycleAttendanceOutbox,
  eligibleCycleForSource,
  enqueueCycleAttendanceIntent,
  markAttendanceIntentFailed,
  persistLearningSourceWithAttendance,
  processNextAttendanceIntent,
  retryDelayMs,
  startCycleAttendanceOutboxWorker,
};
