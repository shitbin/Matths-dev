const crypto = require(
  "node:crypto"
);
const mongoose = require(
  "mongoose"
);

const {
  AccessCycle,
} = require(
  "../models/accessCycleModel"
);
const {
  ATTENDANCE_INTEGRITY_STATES,
  ATTENDANCE_SOURCE_TYPES,
  CycleAttendanceDay,
} = require(
  "../models/cycleAttendanceDayModel"
);
const {
  PolicyVersion,
} = require(
  "../models/policyVersionModel"
);
const {
  asDate,
  cycleDayForDateKey,
  dateKeyOrdinal,
  kstDateKey,
} = require(
  "./accessCycleService"
);

const MAX_WRITE_ATTEMPTS = 8;
const EVENT_TYPE_PATTERN =
  /^[A-Z][A-Z0-9_]{0,79}$/;

const POLICY_BLOCKERS =
  new Set([
    "POLICY_MIN_PROBLEMS_UNSET",
    "POLICY_MIN_STUDY_SECONDS_UNSET",
    "POLICY_DAY30_WINDOW_UNSET",
    "POLICY_DAY30_ALLOWLIST_UNSET",
  ]);

const INTEGRITY_WEIGHT =
  Object.freeze({
    CLEAR: 0,
    HELD: 1,
    INVALID: 2,
  });

class CycleAttendanceError
  extends Error {
  constructor(
    code,
    message,
    {
      statusCode = 400,
    } = {}
  ) {
    super(message);
    this.name =
      "CycleAttendanceError";
    this.code = code;
    this.statusCode =
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

function requiredText(
  value,
  label,
  maxLength
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

function normalizeProblemKeys(
  value
) {
  if (!Array.isArray(value)) {
    throw new TypeError(
      "problemIds must be an array"
    );
  }
  const keys =
    value.map((problemId) =>
      requiredText(
        problemId,
        "problemId",
        240
      )
    );
  return [
    ...new Set(keys),
  ].sort();
}

function normalizeEventType(
  value
) {
  const normalized =
    requiredText(
      value,
      "eventType",
      80
    ).toUpperCase();
  if (
    !EVENT_TYPE_PATTERN.test(
      normalized
    )
  ) {
    throw new TypeError(
      "eventType must use uppercase letters, numbers and underscores"
    );
  }
  return normalized;
}

function normalizeSourceType(
  value
) {
  const normalized =
    requiredText(
      value,
      "sourceType",
      80
    ).toUpperCase();
  if (
    !ATTENDANCE_SOURCE_TYPES
      .includes(normalized)
  ) {
    throw new TypeError(
      "sourceType is not eligible for cycle attendance"
    );
  }
  return normalized;
}

function normalizeIntegrityState(
  value
) {
  const normalized =
    requiredText(
      value,
      "integrityState",
      20
    ).toUpperCase();
  if (
    !ATTENDANCE_INTEGRITY_STATES
      .includes(normalized)
  ) {
    throw new TypeError(
      "integrityState is unsupported"
    );
  }
  return normalized;
}

function nonNegativeSafeInteger(
  value,
  label
) {
  if (
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new TypeError(
      `${label} must be a non-negative integer`
    );
  }
  return value;
}

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function sourceEventIdempotencyKey({
  sourceType,
  sourceId,
  eventType,
}) {
  return sha256(
    JSON.stringify([
      sourceType,
      sourceId,
      eventType,
    ])
  );
}

function sourceEventFingerprint(
  event
) {
  return sha256(
    JSON.stringify({
      userId: event.userId,
      cycleId: event.cycleId,
      sourceType:
        event.sourceType,
      sourceId: event.sourceId,
      eventType:
        event.eventType,
      problemKeys:
        event.problemKeys,
      validStudyMilliseconds:
        event
          .validStudyMilliseconds,
      occurredAt:
        event.occurredAt
          .toISOString(),
      allRequiredSubmissionsPersisted:
        event
          .allRequiredSubmissionsPersisted,
      integrityState:
        event.integrityState,
    })
  );
}

function normalizeLearningEvent(
  input
) {
  if (
    !input ||
    typeof input !== "object"
  ) {
    throw new TypeError(
      "attendance event is required"
    );
  }

  const sourceType =
    normalizeSourceType(
      input.sourceType
    );
  const sourceId =
    requiredText(
      input.sourceId,
      "sourceId",
      240
    );
  const eventType =
    normalizeEventType(
      input.eventType
    );
  if (
    input.occurredAt ===
      null ||
    input.occurredAt ===
      undefined
  ) {
    throw new TypeError(
      "occurredAt must be a valid date"
    );
  }
  const occurredAt =
    asDate(
      input.occurredAt,
      "occurredAt"
    );
  if (
    typeof input
      .allRequiredSubmissionsPersisted !==
    "boolean"
  ) {
    throw new TypeError(
      "allRequiredSubmissionsPersisted must be a boolean"
    );
  }

  const normalized = {
    userId: objectIdText(
      input.userId,
      "userId"
    ),
    cycleId: objectIdText(
      input.cycleId,
      "cycleId"
    ),
    sourceType,
    sourceId,
    eventType,
    problemKeys:
      normalizeProblemKeys(
        input.problemIds
      ),
    validStudyMilliseconds:
      nonNegativeSafeInteger(
        input.durationMs,
        "durationMs"
      ),
    occurredAt,
    allRequiredSubmissionsPersisted:
      input
        .allRequiredSubmissionsPersisted,
    integrityState:
      normalizeIntegrityState(
        input.integrityState
      ),
  };

  normalized.idempotencyKey =
    sourceEventIdempotencyKey(
      normalized
    );
  normalized.payloadFingerprint =
    sourceEventFingerprint(
      normalized
    );
  return normalized;
}

function completionPassPolicy(
  policy
) {
  const plain =
    asPlain(policy) || {};
  return (
    asPlain(
      plain.completionPass
    ) || {}
  );
}

function hasPositivePolicyInteger(
  value
) {
  return (
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function classifyAttendanceAccess({
  cycle,
  policy,
  event,
}) {
  const plainCycle =
    asPlain(cycle);
  if (
    !plainCycle
      ?.paidAccessStartsOn
  ) {
    throw new TypeError(
      "cycle paid access start date is required"
    );
  }
  const dateKey =
    kstDateKey(
      event.occurredAt
    );
  const cycleDay =
    cycleDayForDateKey(
      plainCycle
        .paidAccessStartsOn,
      dateKey
    );

  if (
    cycleDay < 1 ||
    cycleDay > 30
  ) {
    return {
      persist: false,
      dateKeyKst: dateKey,
      cycleDay,
      accessState: null,
    };
  }

  if (cycleDay <= 29) {
    return {
      persist: true,
      dateKeyKst: dateKey,
      cycleDay,
      accessState:
        "PAID_ACCESS",
    };
  }

  const completion =
    completionPassPolicy(
      policy
    );
  const allowlist =
    completion
      .allowedActivityTypes;
  const opensAt =
    plainCycle
      .day30CompletionOpensAt
      ? asDate(
          plainCycle
            .day30CompletionOpensAt,
          "day30CompletionOpensAt"
        )
      : null;
  const deadlineAt =
    plainCycle
      .day30CompletionDeadlineAt
      ? asDate(
          plainCycle
            .day30CompletionDeadlineAt,
          "day30CompletionDeadlineAt"
        )
      : null;

  if (
    !opensAt ||
    !deadlineAt ||
    !Array.isArray(allowlist) ||
    !allowlist.length
  ) {
    return {
      persist: true,
      dateKeyKst: dateKey,
      cycleDay,
      accessState:
        "POLICY_PENDING",
    };
  }

  if (
    plainCycle.status !==
      "SUB_CLOSING" ||
    event.occurredAt < opensAt ||
    event.occurredAt >=
      deadlineAt
  ) {
    return {
      persist: true,
      dateKeyKst: dateKey,
      cycleDay,
      accessState:
        "COMPLETION_PASS_INACTIVE",
    };
  }

  if (
    !allowlist.includes(
      event.sourceType
    )
  ) {
    return {
      persist: true,
      dateKeyKst: dateKey,
      cycleDay,
      accessState:
        "ACTIVITY_NOT_ALLOWED",
    };
  }

  return {
    persist: true,
    dateKeyKst: dateKey,
    cycleDay,
    accessState:
      "COMPLETION_PASS",
  };
}

function eventOutcome({
  accessState,
  event,
}) {
  if (
    accessState ===
    "POLICY_PENDING"
  ) {
    return "POLICY_PENDING";
  }
  if (
    accessState ===
    "COMPLETION_PASS_INACTIVE"
  ) {
    return "COMPLETION_PASS_INACTIVE";
  }
  if (
    accessState ===
    "ACTIVITY_NOT_ALLOWED"
  ) {
    return "ACTIVITY_NOT_ALLOWED";
  }
  if (
    !event
      .allRequiredSubmissionsPersisted
  ) {
    return "SUBMISSION_NOT_PERSISTED";
  }
  if (
    event.integrityState ===
    "HELD"
  ) {
    return "INTEGRITY_HELD";
  }
  if (
    event.integrityState ===
    "INVALID"
  ) {
    return "INTEGRITY_INVALID";
  }
  return "VALID_ACTIVITY";
}

function buildAttendanceSourceEvent({
  cycle,
  policy,
  event,
  recordedAt,
}) {
  const access =
    classifyAttendanceAccess({
      cycle,
      policy,
      event,
    });
  if (!access.persist) {
    return {
      ...access,
      sourceEvent: null,
    };
  }

  const outcome =
    eventOutcome({
      accessState:
        access.accessState,
      event,
    });
  const insideLearningWindow =
    access.accessState ===
      "PAID_ACCESS" ||
    access.accessState ===
      "COMPLETION_PASS";
  const includedInDayTotals =
    insideLearningWindow &&
    event
      .allRequiredSubmissionsPersisted &&
    event.integrityState ===
      "CLEAR";

  return {
    ...access,
    sourceEvent: {
      idempotencyKey:
        event.idempotencyKey,
      payloadFingerprint:
        event
          .payloadFingerprint,
      sourceType:
        event.sourceType,
      sourceId: event.sourceId,
      eventType:
        event.eventType,
      occurredAt:
        event.occurredAt,
      dateKeyKst:
        access.dateKeyKst,
      cycleDay:
        access.cycleDay,
      validStudyMilliseconds:
        event
          .validStudyMilliseconds,
      problemKeys:
        event.problemKeys,
      allRequiredSubmissionsPersisted:
        event
          .allRequiredSubmissionsPersisted,
      integrityState:
        event.integrityState,
      accessState:
        access.accessState,
      outcome,
      includedInDayTotals,
      recordedAt,
    },
  };
}

function eventIsIntegrityCandidate(
  event
) {
  return (
    (event.accessState ===
      "PAID_ACCESS" ||
      event.accessState ===
        "COMPLETION_PASS") &&
    event
      .allRequiredSubmissionsPersisted
  );
}

function strongestIntegrityState(
  events
) {
  return events.reduce(
    (strongest, event) => {
      if (
        !eventIsIntegrityCandidate(
          event
        )
      ) {
        return strongest;
      }
      return INTEGRITY_WEIGHT[
        event.integrityState
      ] >
        INTEGRITY_WEIGHT[
          strongest
        ]
        ? event.integrityState
        : strongest;
    },
    "CLEAR"
  );
}

function evaluateAttendanceDayRecognition({
  day,
  cycle,
  policy,
}) {
  const plainDay =
    asPlain(day);
  const plainCycle =
    asPlain(cycle);
  const plainPolicy =
    asPlain(policy) || {};
  const blockers = [];
  const minimumProblems =
    plainPolicy
      .minRecognizedProblemsPerDay;
  const minimumSeconds =
    plainPolicy
      .minValidStudySecondsPerDay;

  if (
    !hasPositivePolicyInteger(
      minimumProblems
    )
  ) {
    blockers.push(
      "POLICY_MIN_PROBLEMS_UNSET"
    );
  }
  if (
    !hasPositivePolicyInteger(
      minimumSeconds
    )
  ) {
    blockers.push(
      "POLICY_MIN_STUDY_SECONDS_UNSET"
    );
  }

  if (
    plainDay.cycleDay === 30
  ) {
    const completion =
      completionPassPolicy(
        plainPolicy
      );
    if (
      !plainCycle
        ?.day30CompletionOpensAt ||
      !plainCycle
        ?.day30CompletionDeadlineAt
    ) {
      blockers.push(
        "POLICY_DAY30_WINDOW_UNSET"
      );
    }
    if (
      !Array.isArray(
        completion
          .allowedActivityTypes
      ) ||
      !completion
        .allowedActivityTypes
        .length
    ) {
      blockers.push(
        "POLICY_DAY30_ALLOWLIST_UNSET"
      );
    }
  }

  const sourceEvents =
    plainDay.sourceEvents ||
    [];
  if (
    !sourceEvents.some(
      (event) =>
        event
          .includedInDayTotals
    )
  ) {
    blockers.push(
      "NO_ELIGIBLE_ACTIVITY"
    );
  }
  if (
    hasPositivePolicyInteger(
      minimumProblems
    ) &&
    plainDay
      .distinctProblemCount <
      minimumProblems
  ) {
    blockers.push(
      "PROBLEM_THRESHOLD_NOT_MET"
    );
  }
  if (
    hasPositivePolicyInteger(
      minimumSeconds
    ) &&
    plainDay.validStudySeconds <
      minimumSeconds
  ) {
    blockers.push(
      "STUDY_TIME_THRESHOLD_NOT_MET"
    );
  }
  if (
    plainDay.integrityState ===
    "HELD"
  ) {
    blockers.push(
      "INTEGRITY_HELD"
    );
  }
  if (
    plainDay.integrityState ===
    "INVALID"
  ) {
    blockers.push(
      "INTEGRITY_INVALID"
    );
  }

  const uniqueBlockers = [
    ...new Set(blockers),
  ];
  let recognitionState =
    "UNRECOGNIZED";
  if (!uniqueBlockers.length) {
    recognitionState =
      "RECOGNIZED";
  } else if (
    uniqueBlockers.some(
      (blocker) =>
        POLICY_BLOCKERS.has(
          blocker
        )
    )
  ) {
    recognitionState =
      "POLICY_PENDING";
  } else if (
    uniqueBlockers.includes(
      "INTEGRITY_INVALID"
    )
  ) {
    recognitionState =
      "INTEGRITY_INVALID";
  } else if (
    uniqueBlockers.includes(
      "INTEGRITY_HELD"
    )
  ) {
    recognitionState =
      "INTEGRITY_HELD";
  }

  return {
    recognized:
      recognitionState ===
      "RECOGNIZED",
    recognitionState,
    recognitionBlockers:
      uniqueBlockers,
    recordOnly:
      recognitionState ===
      "POLICY_PENDING",
  };
}

function sameId(valueA, valueB) {
  return (
    String(valueA) ===
    String(valueB)
  );
}

function appendAttendanceEvent({
  currentDay = null,
  cycle,
  policy,
  sourceEvent,
  evaluatedAt,
}) {
  const plainCurrent =
    asPlain(currentDay);
  const plainCycle =
    asPlain(cycle);
  if (
    plainCurrent &&
    (!sameId(
      plainCurrent.cycleId,
      plainCycle._id
    ) ||
      !sameId(
        plainCurrent.userId,
        plainCycle.userId
      ) ||
      plainCurrent
        .dateKeyKst !==
        sourceEvent
          .dateKeyKst)
  ) {
    throw new CycleAttendanceError(
      "ATTENDANCE_DAY_IDENTITY_MISMATCH",
      "attendance day identity does not match the event",
      {
        statusCode: 409,
      }
    );
  }

  const priorEvents =
    plainCurrent
      ?.sourceEvents || [];
  const replay =
    priorEvents.find(
      (event) =>
        event.idempotencyKey ===
        sourceEvent
          .idempotencyKey
    );
  if (replay) {
    if (
      replay.payloadFingerprint !==
      sourceEvent
        .payloadFingerprint
    ) {
      throw new CycleAttendanceError(
        "ATTENDANCE_EVENT_CONFLICT",
        "the same source event was replayed with a different payload",
        {
          statusCode: 409,
        }
      );
    }
    return {
      duplicate: true,
      day: plainCurrent,
    };
  }

  const sourceEvents = [
    ...priorEvents,
    sourceEvent,
  ];
  const problemKeys =
    new Set();
  let validStudyMilliseconds =
    0;
  for (const event of sourceEvents) {
    if (
      !event
        .includedInDayTotals
    ) {
      continue;
    }
    validStudyMilliseconds +=
      event
        .validStudyMilliseconds;
    if (
      !Number.isSafeInteger(
        validStudyMilliseconds
      )
    ) {
      throw new CycleAttendanceError(
        "ATTENDANCE_DURATION_OVERFLOW",
        "attendance duration exceeds the supported range"
      );
    }
    for (const problemKey of
      event.problemKeys) {
      problemKeys.add(
        problemKey
      );
    }
  }

  const completedProblemKeys = [
    ...problemKeys,
  ].sort();
  const aggregate = {
    cycleId: plainCycle._id,
    userId: plainCycle.userId,
    dateKeyKst:
      sourceEvent.dateKeyKst,
    cycleDay:
      sourceEvent.cycleDay,
    validStudyMilliseconds,
    validStudySeconds:
      Math.floor(
        validStudyMilliseconds /
          1000
      ),
    completedProblemKeys,
    distinctProblemCount:
      completedProblemKeys.length,
    sourceEvents,
    integrityState:
      strongestIntegrityState(
        sourceEvents
      ),
    restoredByAdmin:
      plainCurrent
        ?.restoredByAdmin ||
      null,
    restoreReason:
      plainCurrent
        ?.restoreReason || "",
  };
  const recognition =
    evaluateAttendanceDayRecognition({
      day: aggregate,
      cycle: plainCycle,
      policy,
    });

  return {
    duplicate: false,
    day: {
      ...aggregate,
      ...recognition,
      recognizedAt:
        recognition.recognized
          ? plainCurrent
              ?.recognizedAt ||
            evaluatedAt
          : null,
    },
  };
}

function deriveCycleAttendanceStreak(
  attendanceDays
) {
  const recognizedDateKeys = [
    ...new Set(
      (attendanceDays || [])
        .filter(
          (day) =>
            day.recognized
        )
        .map(
          (day) =>
            day.dateKeyKst
        )
    ),
  ].sort(
    (left, right) =>
      dateKeyOrdinal(left) -
      dateKeyOrdinal(right)
  );

  let streak = 0;
  let previousOrdinal = null;
  for (const dateKey of
    recognizedDateKeys) {
    const ordinal =
      dateKeyOrdinal(dateKey);
    streak =
      previousOrdinal !== null &&
      ordinal ===
        previousOrdinal + 1
        ? streak + 1
        : 1;
    previousOrdinal = ordinal;
  }

  return {
    cycleStreakDays:
      recognizedDateKeys.length
        ? streak
        : 0,
    lastRecognizedAttendanceDate:
      recognizedDateKeys.at(-1) ||
      null,
  };
}

function isDuplicateKey(error) {
  return (
    error?.code === 11000 ||
    error?.code === 11001
  );
}

async function resolveQuery(
  query,
  {
    session = null,
    lean = true,
  } = {}
) {
  let pending = query;
  if (
    session &&
    typeof pending.session ===
      "function"
  ) {
    pending =
      pending.session(session);
  }
  if (
    lean &&
    typeof pending.lean ===
      "function"
  ) {
    pending = pending.lean();
  }
  return pending;
}

function findSourceEvent(
  day,
  idempotencyKey
) {
  return (
    asPlain(day)
      ?.sourceEvents || []
  ).find(
    (event) =>
      event.idempotencyKey ===
      idempotencyKey
  );
}

function assertReplayMatches(
  event,
  normalized
) {
  if (
    event.payloadFingerprint !==
    normalized
      .payloadFingerprint
  ) {
    throw new CycleAttendanceError(
      "ATTENDANCE_EVENT_CONFLICT",
      "the same source event was replayed with a different payload",
      {
        statusCode: 409,
      }
    );
  }
}

async function findDayByEventKey({
  AttendanceDayModel,
  idempotencyKey,
  session,
}) {
  return resolveQuery(
    AttendanceDayModel.findOne({
      "sourceEvents.idempotencyKey":
        idempotencyKey,
    }),
    {
      session,
    }
  );
}

async function findDayByDate({
  AttendanceDayModel,
  cycleId,
  dateKeyKst,
  session,
}) {
  return resolveQuery(
    AttendanceDayModel.findOne({
      cycleId,
      dateKeyKst,
    }),
    {
      session,
    }
  );
}

function mutableAttendanceFields(
  day
) {
  return {
    validStudyMilliseconds:
      day.validStudyMilliseconds,
    validStudySeconds:
      day.validStudySeconds,
    completedProblemKeys:
      day.completedProblemKeys,
    distinctProblemCount:
      day.distinctProblemCount,
    sourceEvents:
      day.sourceEvents,
    integrityState:
      day.integrityState,
    recognitionState:
      day.recognitionState,
    recognitionBlockers:
      day.recognitionBlockers,
    recognized: day.recognized,
    recognizedAt:
      day.recognizedAt,
    restoredByAdmin:
      day.restoredByAdmin,
    restoreReason:
      day.restoreReason,
  };
}

async function persistAttendanceEvent({
  AttendanceDayModel,
  cycle,
  policy,
  sourceEvent,
  evaluatedAt,
  session,
}) {
  for (
    let attempt = 0;
    attempt < MAX_WRITE_ATTEMPTS;
    attempt += 1
  ) {
    const existingByEvent =
      await findDayByEventKey({
        AttendanceDayModel,
        idempotencyKey:
          sourceEvent
            .idempotencyKey,
        session,
      });
    if (existingByEvent) {
      const replay =
        findSourceEvent(
          existingByEvent,
          sourceEvent
            .idempotencyKey
        );
      assertReplayMatches(
        replay,
        sourceEvent
      );
      return {
        duplicate: true,
        day: existingByEvent,
      };
    }

    const currentDay =
      await findDayByDate({
        AttendanceDayModel,
        cycleId:
          asPlain(cycle)._id,
        dateKeyKst:
          sourceEvent.dateKeyKst,
        session,
      });
    const reduced =
      appendAttendanceEvent({
        currentDay,
        cycle,
        policy,
        sourceEvent,
        evaluatedAt,
      });
    if (reduced.duplicate) {
      return reduced;
    }

    try {
      if (!currentDay) {
        const created =
          new AttendanceDayModel(
            reduced.day
          );
        await created.save({
          session,
        });
        return {
          duplicate: false,
          day:
            asPlain(created),
        };
      }

      const currentVersion =
        Number.isSafeInteger(
          currentDay.version
        )
          ? currentDay.version
          : 0;
      const updated =
        await resolveQuery(
          AttendanceDayModel
            .findOneAndUpdate(
              {
                _id:
                  currentDay._id,
                version:
                  currentVersion,
                "sourceEvents.idempotencyKey":
                  {
                    $ne:
                      sourceEvent
                        .idempotencyKey,
                  },
              },
              {
                $set:
                  mutableAttendanceFields(
                    reduced.day
                  ),
                $inc: {
                  version: 1,
                },
              },
              {
                returnDocument:
                  "after",
                runValidators:
                  true,
                session,
              }
            ),
          {
            session,
          }
        );
      if (updated) {
        return {
          duplicate: false,
          day: updated,
        };
      }
    } catch (error) {
      if (
        !isDuplicateKey(error)
      ) {
        throw error;
      }
      const duplicateDay =
        await findDayByEventKey({
          AttendanceDayModel,
          idempotencyKey:
            sourceEvent
              .idempotencyKey,
          session,
        });
      if (duplicateDay) {
        const replay =
          findSourceEvent(
            duplicateDay,
            sourceEvent
              .idempotencyKey
          );
        assertReplayMatches(
          replay,
          sourceEvent
        );
        return {
          duplicate: true,
          day:
            duplicateDay,
        };
      }
      // 같은 날짜를 서로 다른 이벤트가 동시에 처음 만들었다.
      // 다음 반복에서 새 하루 문서를 읽고 낙관적 잠금으로 합친다.
    }
  }

  throw new CycleAttendanceError(
    "ATTENDANCE_WRITE_CONFLICT",
    "attendance event could not be stored after concurrent updates",
    {
      statusCode: 409,
    }
  );
}

async function recognizedDaysForCycle({
  AttendanceDayModel,
  cycleId,
  session,
}) {
  let query =
    AttendanceDayModel.find({
      cycleId,
      recognized: true,
    });
  if (
    typeof query.sort ===
    "function"
  ) {
    query = query.sort({
      dateKeyKst: 1,
    });
  }
  if (
    typeof query.select ===
    "function"
  ) {
    query = query.select(
      "dateKeyKst recognized -_id"
    );
  }
  return resolveQuery(query, {
    session,
  });
}

async function refreshCycleAttendanceProgress(
  cycleId,
  {
    AttendanceDayModel =
      CycleAttendanceDay,
    AccessCycleModel =
      AccessCycle,
    session = null,
  } = {}
) {
  for (
    let attempt = 0;
    attempt < MAX_WRITE_ATTEMPTS;
    attempt += 1
  ) {
    const cycle =
      await resolveQuery(
        AccessCycleModel.findById(
          cycleId
        ),
        {
          session,
        }
      );
    if (!cycle) {
      throw new CycleAttendanceError(
        "ATTENDANCE_CYCLE_NOT_FOUND",
        "access cycle was not found",
        {
          statusCode: 404,
        }
      );
    }

    const attendanceDays =
      await recognizedDaysForCycle({
        AttendanceDayModel,
        cycleId,
        session,
      });
    const progress =
      deriveCycleAttendanceStreak(
        attendanceDays
      );
    const attendanceConditionMet =
      progress
        .cycleStreakDays >= 30;
    if (
      cycle.cycleStreakDays ===
        progress
          .cycleStreakDays &&
      (cycle
        .lastRecognizedAttendanceDate ||
        null) ===
        progress
          .lastRecognizedAttendanceDate &&
      cycle
        .refundAttendanceConditionMet ===
        attendanceConditionMet
    ) {
      return cycle;
    }
    const currentVersion =
      Number.isSafeInteger(
        cycle.version
      )
        ? cycle.version
        : 0;
    const updated =
      await resolveQuery(
        AccessCycleModel
          .findOneAndUpdate(
            {
              _id: cycleId,
              version:
                currentVersion,
            },
            {
              $set: {
                ...progress,
                refundAttendanceConditionMet:
                  attendanceConditionMet,
              },
              $inc: {
                version: 1,
              },
            },
            {
              returnDocument:
                "after",
              runValidators: true,
              session,
            }
          ),
        {
          session,
        }
      );
    if (updated) {
      return updated;
    }
  }

  throw new CycleAttendanceError(
    "ATTENDANCE_PROGRESS_WRITE_CONFLICT",
    "cycle attendance progress could not be refreshed",
    {
      statusCode: 409,
    }
  );
}

function resultFromDay({
  day,
  duplicate,
  sourceEvent,
  cycleProgress,
}) {
  const plainDay =
    asPlain(day);
  const storedEvent =
    findSourceEvent(
      plainDay,
      sourceEvent
        .idempotencyKey
    );
  const recordOnly =
    plainDay
      .recognitionState ===
      "POLICY_PENDING" ||
    storedEvent.outcome ===
      "POLICY_PENDING";

  let status =
    "RECORDED_UNRECOGNIZED";
  if (duplicate) {
    status =
      "IDEMPOTENT_REPLAY";
  } else if (
    plainDay.recognized
  ) {
    status =
      "RECORDED_RECOGNIZED";
  } else if (recordOnly) {
    status =
      "RECORDED_POLICY_PENDING";
  }

  return {
    status,
    recorded: true,
    idempotentReplay:
      duplicate,
    recordOnly,
    eventOutcome:
      storedEvent.outcome,
    dateKeyKst:
      plainDay.dateKeyKst,
    cycleDay:
      plainDay.cycleDay,
    recognized:
      plainDay.recognized,
    recognitionState:
      plainDay
        .recognitionState,
    recognitionBlockers:
      plainDay
        .recognitionBlockers,
    day: plainDay,
    cycleProgress:
      asPlain(cycleProgress),
  };
}

async function recordCycleAttendanceActivity(
  input,
  {
    AttendanceDayModel =
      CycleAttendanceDay,
    AccessCycleModel =
      AccessCycle,
    PolicyVersionModel =
      PolicyVersion,
    session = null,
    now = new Date(),
    updateCycleProgress =
      true,
  } = {}
) {
  const normalized =
    normalizeLearningEvent(
      input
    );
  const recordedAt =
    asDate(now, "now");
  if (
    normalized.occurredAt >
    recordedAt
  ) {
    throw new CycleAttendanceError(
      "ATTENDANCE_EVENT_IN_FUTURE",
      "attendance event cannot occur in the future"
    );
  }

  const cycle =
    await resolveQuery(
      AccessCycleModel.findOne({
        _id:
          normalized.cycleId,
        userId:
          normalized.userId,
      }),
      {
        session,
      }
    );
  if (!cycle) {
    throw new CycleAttendanceError(
      "ATTENDANCE_CYCLE_NOT_FOUND",
      "access cycle was not found for the user",
      {
        statusCode: 404,
      }
    );
  }
  const policy =
    await resolveQuery(
      PolicyVersionModel.findById(
        cycle.policyVersionId
      ),
      {
        session,
      }
    );
  if (!policy) {
    throw new CycleAttendanceError(
      "ATTENDANCE_POLICY_NOT_FOUND",
      "the cycle policy snapshot was not found",
      {
        statusCode: 500,
      }
    );
  }

  const built =
    buildAttendanceSourceEvent({
      cycle,
      policy,
      event: normalized,
      recordedAt,
    });
  if (!built.persist) {
    return {
      status:
        "OUTSIDE_CYCLE_WINDOW",
      recorded: false,
      idempotentReplay:
        false,
      recordOnly: false,
      eventOutcome:
        "OUTSIDE_CYCLE_WINDOW",
      dateKeyKst:
        built.dateKeyKst,
      cycleDay:
        built.cycleDay,
      recognized: false,
      recognitionState:
        "UNRECOGNIZED",
      recognitionBlockers:
        [],
      day: null,
      cycleProgress: null,
    };
  }

  const persisted =
    await persistAttendanceEvent({
      AttendanceDayModel,
      cycle,
      policy,
      sourceEvent:
        built.sourceEvent,
      evaluatedAt:
        recordedAt,
      session,
    });
  const cycleProgress =
    updateCycleProgress
      ? await refreshCycleAttendanceProgress(
          normalized.cycleId,
          {
            AttendanceDayModel,
            AccessCycleModel,
            session,
          }
        )
      : null;

  return resultFromDay({
    ...persisted,
    sourceEvent:
      built.sourceEvent,
    cycleProgress,
  });
}

module.exports = {
  CycleAttendanceError,
  appendAttendanceEvent,
  buildAttendanceSourceEvent,
  classifyAttendanceAccess,
  deriveCycleAttendanceStreak,
  evaluateAttendanceDayRecognition,
  normalizeLearningEvent,
  recordCycleAttendanceActivity,
  refreshCycleAttendanceProgress,
  sourceEventIdempotencyKey,
};
