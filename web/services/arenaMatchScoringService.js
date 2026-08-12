const crypto = require("node:crypto");

const {
  answersEquivalent,
} = require(
  "./mathAnswerService"
);

const SUPPORTED_SCORING_POLICY_VERSION =
  "ARENA_SCORING_V2";
const SUPPORTED_CALIBRATED_SCORE_METHOD_VERSION =
  "CAL_SCORE_V3";
const SUPPORTED_ADVANCED_THRESHOLD_VERSION =
  "ADVANCED_THRESHOLD_V2";
const SUPPORTED_ACTIVE_SOLVE_TIME_POLICY_VERSION =
  "ACTIVE_TIME_V2";
const SUPPORTED_EXTRA_TIEBREAKER_POLICY_VERSION =
  "SUDDEN_DEATH_V2";
const SUPPORTED_ANSWER_COMPARISON_POLICY_VERSION =
  "MATH_EQUIVALENCE_V4";

const SUPPORTED_TIE_BREAK_ORDER =
  Object.freeze([
    "CALIBRATED_SCORE",
    "ADVANCED_CORRECT_COUNT",
    "CORRECT_ANSWER_ACTIVE_SOLVE_TIME_MS",
    "PUBLISHED_EXTRA_TIEBREAKER",
    "DEFENDER_WINS_FULL_TIE",
  ]);

const SUPPORTED_SCORING_CONTRACT =
  Object.freeze({
    scoringPolicyVersion:
      SUPPORTED_SCORING_POLICY_VERSION,
    calibratedScoreMethodVersion:
      SUPPORTED_CALIBRATED_SCORE_METHOD_VERSION,
    advancedThresholdVersion:
      SUPPORTED_ADVANCED_THRESHOLD_VERSION,
    activeSolveTimePolicyVersion:
      SUPPORTED_ACTIVE_SOLVE_TIME_POLICY_VERSION,
    extraTieBreakerPolicyVersion:
      SUPPORTED_EXTRA_TIEBREAKER_POLICY_VERSION,
    answerComparisonPolicyVersion:
      SUPPORTED_ANSWER_COMPARISON_POLICY_VERSION,
    tieBreakOrder:
      SUPPORTED_TIE_BREAK_ORDER,
  });

const ALLOWED_INPUT_FIELDS =
  new Set([
    "matchId",
    "participantRole",
    "participantUserId",
    "questionPackId",
    "serverCapability",
  ]);

const FORBIDDEN_CLIENT_FIELDS =
  new Set([
    "submissionid",
    "score",
    "calibratedscore",
    "correctcount",
    "advancedcorrectcount",
    "correctness",
    "iscorrect",
    "correctanswer",
    "answer",
    "answers",
    "answerkey",
    "answerkeys",
    "solution",
    "solutions",
    "duration",
    "durationms",
    "activesolvetime",
    "activesolvetimems",
    "correctansweractivesolvetimems",
    "gradingauthority",
    "integritystate",
    "eventtimeline",
    "events",
  ]);

class ArenaMatchScoringError
  extends Error {
  constructor(
    code,
    message,
    {
      statusCode = 409,
      reasonCode = null,
      details = null,
      cause,
    } = {}
  ) {
    super(message, {
      cause,
    });
    this.name =
      "ArenaMatchScoringError";
    this.code = code;
    this.statusCode =
      statusCode;
    this.reasonCode =
      reasonCode;
    this.details = details;
  }
}

function fail(
  code,
  message,
  options
) {
  throw new ArenaMatchScoringError(
    code,
    message,
    options
  );
}

function policyPending(
  reasonCode,
  message
) {
  fail(
    "POLICY_PENDING",
    message,
    {
      statusCode: 409,
      reasonCode,
    }
  );
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

function normalizedKey(key) {
  return String(key)
    .replace(
      /[^a-zA-Z0-9]/g,
      ""
    )
    .toLowerCase();
}

function assertNoForbiddenFields(
  value,
  path = "input"
) {
  if (
    value === null ||
    value === undefined ||
    path.endsWith(
      ".serverCapability"
    )
  ) {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(
      (entry, index) =>
        assertNoForbiddenFields(
          entry,
          `${path}[${index}]`
        )
    );
    return;
  }
  if (
    typeof value !==
      "object" ||
    value instanceof Date
  ) {
    return;
  }
  for (const [
    key,
    child,
  ] of Object.entries(value)) {
    if (
      FORBIDDEN_CLIENT_FIELDS.has(
        normalizedKey(key)
      )
    ) {
      fail(
        "ARENA_SCORING_CLIENT_FIELD_FORBIDDEN",
        `${path}.${key} is derived only by the server scorer`,
        {
          statusCode: 400,
          details: {
            field:
              `${path}.${key}`,
          },
        }
      );
    }
    assertNoForbiddenFields(
      child,
      `${path}.${key}`
    );
  }
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
      "ARENA_SCORING_INPUT_INVALID",
      `${label} is required and must be at most ${maxLength} characters`,
      {
        statusCode: 400,
      }
    );
  }
  return normalized;
}

function normalizeInput(
  input
) {
  if (
    !input ||
    typeof input !==
      "object" ||
    Array.isArray(input)
  ) {
    fail(
      "ARENA_SCORING_INPUT_INVALID",
      "input must be an object",
      {
        statusCode: 400,
      }
    );
  }
  assertNoForbiddenFields(
    input
  );
  const unexpected =
    Object.keys(input)
      .filter(
        (key) =>
          !ALLOWED_INPUT_FIELDS.has(
            key
          )
      );
  if (unexpected.length) {
    fail(
      "ARENA_SCORING_INPUT_INVALID",
      `input contains unsupported fields: ${unexpected.join(
        ", "
      )}`,
      {
        statusCode: 400,
      }
    );
  }
  const participantRole =
    requiredText(
      input.participantRole,
      "participantRole",
      20
    ).toUpperCase();
  if (
    ![
      "CHALLENGER",
      "DEFENDER",
    ].includes(
      participantRole
    )
  ) {
    fail(
      "ARENA_SCORING_INPUT_INVALID",
      "participantRole must be CHALLENGER or DEFENDER",
      {
        statusCode: 400,
      }
    );
  }
  return {
    matchId:
      requiredText(
        input.matchId,
        "matchId"
      ),
    participantRole,
    participantUserId:
      requiredText(
        input
          .participantUserId,
        "participantUserId"
      ),
    questionPackId:
      requiredText(
        input
          .questionPackId,
        "questionPackId"
      ),
    serverCapability:
      input
        .serverCapability,
  };
}

function sameIdentity(
  left,
  right
) {
  return Boolean(
    left !== null &&
      left !== undefined &&
      right !== null &&
      right !==
        undefined &&
      String(left) ===
        String(right)
  );
}

function requireSafeInteger(
  value,
  label,
  {
    min = 0,
  } = {}
) {
  if (
    !Number.isSafeInteger(
      value
    ) ||
    value < min
  ) {
    fail(
      "ARENA_SCORING_PROJECTION_INVALID",
      `${label} must be a safe integer of at least ${min}`,
      {
        statusCode: 500,
      }
    );
  }
  return value;
}

function requireFinitePositive(
  value,
  label
) {
  const number =
    Number(value);
  if (
    !Number.isFinite(
      number
    ) ||
    number <= 0
  ) {
    fail(
      "ARENA_SCORING_PROJECTION_INVALID",
      `${label} must be a positive finite number`,
      {
        statusCode: 500,
      }
    );
  }
  return number;
}

function requireDate(
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
      "ARENA_SCORING_PROJECTION_INVALID",
      `${label} must be a valid server timestamp`,
      {
        statusCode: 500,
      }
    );
  }
  return date;
}

function assertSupportedContract(
  pack,
  attempt
) {
  if (
    pack
      .scoringPolicyVersion !==
      SUPPORTED_SCORING_POLICY_VERSION
  ) {
    policyPending(
      "SCORING_POLICY_VERSION_UNSUPPORTED",
      "sealed scoring policy version is not published in this scorer"
    );
  }
  const contract =
    pack.scoringContract;
  if (
    !contract ||
    typeof contract !==
      "object"
  ) {
    policyPending(
      "SCORING_CONTRACT_UNAVAILABLE",
      "sealed scoring contract is unavailable"
    );
  }
  for (const [
    field,
    expected,
  ] of Object.entries({
    calibratedScoreMethodVersion:
      SUPPORTED_CALIBRATED_SCORE_METHOD_VERSION,
    advancedThresholdVersion:
      SUPPORTED_ADVANCED_THRESHOLD_VERSION,
    activeSolveTimePolicyVersion:
      SUPPORTED_ACTIVE_SOLVE_TIME_POLICY_VERSION,
    extraTieBreakerPolicyVersion:
      SUPPORTED_EXTRA_TIEBREAKER_POLICY_VERSION,
    answerComparisonPolicyVersion:
      SUPPORTED_ANSWER_COMPARISON_POLICY_VERSION,
  })) {
    if (
      contract[field] !==
      expected
    ) {
      policyPending(
        `${field
          .replace(
            /([A-Z])/g,
            "_$1"
          )
          .toUpperCase()}_UNSUPPORTED`,
        `${field} is not published in this scorer`
      );
    }
  }
  if (
    !Array.isArray(
      contract.tieBreakOrder
    ) ||
    contract
      .tieBreakOrder
      .length !==
      SUPPORTED_TIE_BREAK_ORDER
        .length ||
    contract
      .tieBreakOrder
      .some(
        (entry, index) =>
          entry !==
          SUPPORTED_TIE_BREAK_ORDER[
            index
          ]
      )
  ) {
    policyPending(
      "TIE_BREAK_ORDER_UNSUPPORTED",
      "sealed tie-break order is not published in this scorer"
    );
  }
  if (
    attempt
      .timingPolicySnapshot
      ?.version !==
    contract
      .activeSolveTimePolicyVersion
  ) {
    fail(
      "ARENA_SCORING_POLICY_IDENTITY_MISMATCH",
      "attempt timing policy does not match the sealed active-time policy",
      {
        statusCode: 409,
      }
    );
  }
}

function assertProjectionIdentities(
  input,
  pack,
  attempt
) {
  if (
    !pack ||
    typeof pack !==
      "object" ||
    !attempt ||
    typeof attempt !==
      "object"
  ) {
    fail(
      "ARENA_SCORING_PROJECTION_INVALID",
      "both private scoring projections are required",
      {
        statusCode: 500,
      }
    );
  }

  const identityChecks = [
    [
      input.matchId,
      pack.matchId,
      "input and pack match",
    ],
    [
      input.matchId,
      attempt.matchId,
      "input and attempt match",
    ],
    [
      input.participantRole,
      pack.participantRole,
      "input and pack role",
    ],
    [
      input.participantRole,
      attempt
        .participantRole,
      "input and attempt role",
    ],
    [
      input.participantUserId,
      pack.participantUserId,
      "input and pack participant",
    ],
    [
      input.participantUserId,
      attempt
        .participantUserId,
      "input and attempt participant",
    ],
    [
      input.questionPackId,
      pack.questionPackId,
      "input and pack identifier",
    ],
    [
      input.questionPackId,
      attempt.questionPackId,
      "input and attempt pack",
    ],
    [
      pack.packVersion,
      attempt
        .questionPackVersion,
      "pack version",
    ],
    [
      pack.sealedContentHash,
      attempt
        .questionPackSealHash,
      "pack seal",
    ],
    [
      pack
        .scoringPolicyVersion,
      attempt
        .scoringPolicyVersion,
      "scoring policy",
    ],
  ];
  for (const [
    left,
    right,
    label,
  ] of identityChecks) {
    if (
      !sameIdentity(
        left,
        right
      )
    ) {
      fail(
        "ARENA_SCORING_IDENTITY_MISMATCH",
        `${label} identity does not match`,
        {
          statusCode: 409,
        }
      );
    }
  }

  if (
    !/^[a-f0-9]{64}$/.test(
      String(
        pack
          .sealedContentHash ||
          ""
      )
    )
  ) {
    fail(
      "ARENA_SCORING_PROJECTION_INVALID",
      "sealed content hash is invalid",
      {
        statusCode: 500,
      }
    );
  }
  requiredText(
    attempt.attemptId,
    "attempt.attemptId"
  );
  requiredText(
    attempt
      .submissionRecordId,
    "attempt.submissionRecordId"
  );
  requiredText(
    attempt.submissionId,
    "attempt.submissionId"
  );
  requireDate(
    attempt.startedAt,
    "attempt.startedAt"
  );
  requireDate(
    attempt.endsAt,
    "attempt.endsAt"
  );
  const submittedAt =
    requireDate(
      attempt.submittedAt,
      "attempt.submittedAt"
    );
  const effectiveSubmittedAt =
    requireDate(
      attempt
        .effectiveSubmittedAt,
      "attempt.effectiveSubmittedAt"
    );
  if (
    submittedAt.getTime() !==
    effectiveSubmittedAt
      .getTime()
  ) {
    fail(
      "ARENA_SCORING_ATTEMPT_TIME_INVALID",
      "submittedAt must equal the immutable effective submission time",
      {
        statusCode: 409,
      }
    );
  }
}

function alignedQuestionContract(
  pack
) {
  const questionCount =
    requireSafeInteger(
      pack.questionCount,
      "pack.questionCount",
      {
        min: 1,
      }
    );
  const arrays = [
    [
      pack.questions,
      "pack.questions",
    ],
    [
      pack.answerKeys,
      "pack.answerKeys",
    ],
    [
      pack.questionVersionIds,
      "pack.questionVersionIds",
    ],
    [
      pack.answerVersionIds,
      "pack.answerVersionIds",
    ],
    [
      pack.equivalenceSlots,
      "pack.equivalenceSlots",
    ],
  ];
  for (const [
    values,
    label,
  ] of arrays) {
    if (
      !Array.isArray(values) ||
      values.length !==
        questionCount
    ) {
      fail(
        "ARENA_SCORING_PROJECTION_INVALID",
        `${label} must align with sealed questionCount`,
        {
          statusCode: 500,
        }
      );
    }
  }

  const bySlot =
    new Map();
  for (
    let index = 0;
    index <
    questionCount;
    index += 1
  ) {
    const question =
      pack.questions[index];
    const answerKey =
      pack.answerKeys[index];
    const equivalence =
      pack
        .equivalenceSlots[
          index
        ];
    const slot =
      requireSafeInteger(
        question?.slot,
        `pack.questions.${index}.slot`,
        {
          min: 1,
        }
      );
    if (
      slot >
        questionCount ||
      bySlot.has(slot) ||
      equivalence?.slot !==
        slot ||
      !sameIdentity(
        question
          .questionVersionId,
        pack
          .questionVersionIds[
            index
          ]
      ) ||
      !sameIdentity(
        answerKey
          ?.questionVersionId,
        question
          .questionVersionId
      ) ||
      !sameIdentity(
        answerKey
          ?.answerVersionId,
        pack
          .answerVersionIds[
            index
          ]
      )
    ) {
      fail(
        "ARENA_SCORING_SEALED_CONTENT_MISMATCH",
        "question, answer and equivalence slots do not share one sealed identity",
        {
          statusCode: 409,
        }
      );
    }
    const scoreWeight =
      requireFinitePositive(
        question.scoreWeight,
        `pack.questions.${index}.scoreWeight`
      );
    if (
      Number(
        equivalence
          .scoreWeight
      ) !== scoreWeight ||
      Boolean(
        equivalence.advanced
      ) !==
        Boolean(
          question.advanced
        )
    ) {
      fail(
        "ARENA_SCORING_SEALED_CONTENT_MISMATCH",
        "question scoring metadata does not match its sealed equivalence slot",
        {
          statusCode: 409,
        }
      );
    }
    if (
      answerKey
        .correctAnswer ===
        undefined ||
      answerKey
        .correctAnswer ===
        null
    ) {
      fail(
        "ARENA_SCORING_PROJECTION_INVALID",
        "sealed answer is unavailable",
        {
          statusCode: 500,
        }
      );
    }
    bySlot.set(
      slot,
      {
        slot,
        scoreWeight,
        advanced:
          Boolean(
            question.advanced
          ),
        correctAnswer:
          answerKey
            .correctAnswer,
      }
    );
  }
  return {
    bySlot,
    questionCount,
  };
}

function normalizedAnswerText(
  answer,
  label
) {
  if (
    !answer ||
    answer.kind !==
      "TEXT" ||
    typeof answer.value !==
      "string"
  ) {
    fail(
      "ARENA_SCORING_PROJECTION_INVALID",
      `${label} must be a normalized TEXT answer`,
      {
        statusCode: 500,
      }
    );
  }
  return answer.value;
}

function sameServerTime(
  left,
  right
) {
  return (
    requireDate(
      left,
      "left server timestamp"
    ).getTime() ===
    requireDate(
      right,
      "right server timestamp"
    ).getTime()
  );
}

function reconstructAttempt(
  attempt,
  questionCount
) {
  if (
    !Array.isArray(
      attempt.eventTimeline
    ) ||
    !Array.isArray(
      attempt.finalAnswers
    )
  ) {
    fail(
      "ARENA_SCORING_PROJECTION_INVALID",
      "attempt events and frozen final answers are required",
      {
        statusCode: 500,
      }
    );
  }
  const startedAt =
    requireDate(
      attempt.startedAt,
      "attempt.startedAt"
    );
  const endsAt =
    requireDate(
      attempt.endsAt,
      "attempt.endsAt"
    );
  const submittedAt =
    requireDate(
      attempt.submittedAt,
      "attempt.submittedAt"
    );
  if (
    startedAt > endsAt ||
    submittedAt <
      startedAt ||
    submittedAt > endsAt
  ) {
    fail(
      "ARENA_SCORING_ATTEMPT_TIME_INVALID",
      "submitted attempt timestamps are outside the personal server deadline",
      {
        statusCode: 409,
      }
    );
  }
  const heartbeatCap =
    requireSafeInteger(
      attempt
        .timingPolicySnapshot
        ?.maxRecognizedHeartbeatIntervalMs,
      "attempt.timingPolicySnapshot.maxRecognizedHeartbeatIntervalMs",
      {
        min: 1,
      }
    );

  const latestAnswerEvents =
    new Map();
  const focusTimeline =
    [];
  const recognizedWindows =
    [];
  const activeMsBySlot =
    new Map();
  let recognizedTotal = 0;
  let previousTime = null;
  let heartbeatBaselineAt =
    startedAt;
  let heartbeatActivityState =
    "ACTIVE";
  let previousRecognizedWindowEndMs =
    null;

  for (
    let index = 0;
    index <
    attempt
      .eventTimeline
      .length;
    index += 1
  ) {
    const event =
      attempt
        .eventTimeline[
          index
        ];
    const expectedSequence =
      index + 1;
    if (
      event
        ?.serverSequence !==
      expectedSequence
    ) {
      fail(
        "ARENA_SCORING_EVENT_SEQUENCE_INVALID",
        "server event sequence must be contiguous and monotonic",
        {
          statusCode: 409,
        }
      );
    }
    const occurredAt =
      requireDate(
        event
          .serverOccurredAt,
        `attempt.eventTimeline.${index}.serverOccurredAt`
      );
    if (
      previousTime &&
      occurredAt <
        previousTime
    ) {
      fail(
        "ARENA_SCORING_EVENT_SEQUENCE_INVALID",
        "server event timestamps cannot move backwards",
        {
          statusCode: 409,
        }
      );
    }
    if (
      occurredAt <
        startedAt ||
      occurredAt >
        submittedAt ||
      occurredAt > endsAt
    ) {
      fail(
        "ARENA_SCORING_EVENT_TIME_INVALID",
        "server event is outside the submitted participant attempt window",
        {
          statusCode: 409,
        }
      );
    }
    previousTime =
      occurredAt;
    const interval =
      requireSafeInteger(
        event
          .recognizedActiveIntervalMs,
        `attempt.eventTimeline.${index}.recognizedActiveIntervalMs`
      );

    if (
      event.eventType ===
      "QUESTION_FOCUS"
    ) {
      const focusedSlot =
        requireSafeInteger(
          event.questionSlot,
          `attempt.eventTimeline.${index}.questionSlot`,
          {
            min: 1,
          }
        );
      if (
        focusedSlot >
        questionCount ||
        interval !== 0
      ) {
        fail(
          "ARENA_SCORING_EVENT_INVALID",
          "question focus event is outside the sealed pack contract",
          {
            statusCode: 409,
          }
        );
      }
      focusTimeline.push({
        serverSequence:
          event
            .serverSequence,
        occurredAtMs:
          occurredAt.getTime(),
        questionSlot:
          focusedSlot,
      });
      continue;
    }

    if (
      event.eventType ===
      "ANSWER_CHANGED"
    ) {
      const slot =
        requireSafeInteger(
          event.questionSlot,
          `attempt.eventTimeline.${index}.questionSlot`,
          {
            min: 1,
          }
        );
      if (
        slot >
          questionCount ||
        interval !== 0
      ) {
        fail(
          "ARENA_SCORING_EVENT_INVALID",
          "answer event is outside the sealed pack contract",
          {
            statusCode: 409,
          }
        );
      }
      normalizedAnswerText(
        event
          .normalizedAnswer,
        `attempt.eventTimeline.${index}.normalizedAnswer`
      );
      latestAnswerEvents.set(
        slot,
        event
      );
      continue;
    }

    if (
      event.eventType ===
      "HEARTBEAT"
    ) {
      if (
        interval >
        heartbeatCap
      ) {
        fail(
          "ARENA_SCORING_ACTIVE_TIME_INVALID",
          "heartbeat interval exceeds the published recognition cap",
          {
            statusCode: 409,
          }
        );
      }

      const occurredAtMs =
        occurredAt.getTime();
      const baselineAtMs =
        heartbeatBaselineAt
          .getTime();
      const elapsedMs =
        occurredAtMs -
        baselineAtMs;
      if (elapsedMs < 0) {
        fail(
          "ARENA_SCORING_EVENT_SEQUENCE_INVALID",
          "heartbeat baseline cannot move behind the server event timeline",
          {
            statusCode: 409,
          }
        );
      }
      const expectedInterval =
        heartbeatActivityState ===
        "ACTIVE"
          ? Math.min(
              elapsedMs,
              heartbeatCap
            )
          : 0;

      if (interval > 0) {
        const windowStartMs =
          occurredAtMs -
          interval;
        if (
          windowStartMs <
            startedAt.getTime() ||
          windowStartMs >
            occurredAtMs
        ) {
          fail(
            "ARENA_SCORING_ACTIVE_TIME_INVALID",
            "recognized heartbeat window is outside the participant attempt",
            {
              statusCode: 409,
            }
          );
        }
        if (
          previousRecognizedWindowEndMs !==
            null &&
          windowStartMs <
            previousRecognizedWindowEndMs
        ) {
          fail(
            "ARENA_SCORING_ACTIVE_TIME_INVALID",
            "recognized heartbeat windows cannot overlap",
            {
              statusCode: 409,
            }
          );
        }
        recognizedWindows.push({
          startMs:
            windowStartMs,
          endMs:
            occurredAtMs,
          heartbeatSequence:
            event
              .serverSequence,
        });
        previousRecognizedWindowEndMs =
          occurredAtMs;
      }

      if (
        interval !==
        expectedInterval
      ) {
        fail(
          "ARENA_SCORING_ACTIVE_TIME_INVALID",
          "recognized heartbeat interval does not match the server timing policy",
          {
            statusCode: 409,
          }
        );
      }
      recognizedTotal +=
        interval;
      if (
        !Number.isSafeInteger(
          recognizedTotal
        )
      ) {
        fail(
          "ARENA_SCORING_ACTIVE_TIME_INVALID",
          "recognized active time overflowed a safe integer",
          {
            statusCode: 409,
          }
        );
      }
      heartbeatBaselineAt =
        occurredAt;
      heartbeatActivityState =
        "ACTIVE";
      continue;
    }

    if (
      event.eventType ===
      "NETWORK_STATE"
    ) {
      if (interval !== 0) {
        fail(
          "ARENA_SCORING_EVENT_INVALID",
          "network-state event cannot add active solve time",
          {
            statusCode: 409,
          }
        );
      }
      if (
        ![
          "ONLINE",
          "OFFLINE",
          "RECONNECTED",
          "BACKGROUND",
          "FOREGROUND",
        ].includes(
          event.networkState
        )
      ) {
        fail(
          "ARENA_SCORING_EVENT_INVALID",
          "network-state event is outside the attempt event contract",
          {
            statusCode: 409,
          }
        );
      }
      heartbeatBaselineAt =
        occurredAt;
      heartbeatActivityState =
        [
          "OFFLINE",
          "BACKGROUND",
        ].includes(
          event.networkState
        )
          ? "INACTIVE"
          : "ACTIVE";
      continue;
    }

    fail(
      "ARENA_SCORING_EVENT_INVALID",
      "attempt contains an unsupported server event type",
      {
        statusCode: 409,
      }
    );
  }

  if (
    recognizedTotal !==
    requireSafeInteger(
      attempt
        .recognizedHeartbeatActiveMs,
      "attempt.recognizedHeartbeatActiveMs"
    )
  ) {
    fail(
      "ARENA_SCORING_ACTIVE_TIME_MISMATCH",
      "heartbeat ledger does not match the frozen active-time total",
      {
        statusCode: 409,
      }
    );
  }

  function addAttributedDuration(
    questionSlot,
    durationMs
  ) {
    if (
      questionSlot ===
        null ||
      durationMs === 0
    ) {
      return;
    }
    const next =
      (activeMsBySlot.get(
        questionSlot
      ) || 0) +
      durationMs;
    if (
      !Number.isSafeInteger(
        next
      )
    ) {
      fail(
        "ARENA_SCORING_ACTIVE_TIME_INVALID",
        "attributed active solve time overflowed a safe integer",
        {
          statusCode: 409,
        }
      );
    }
    activeMsBySlot.set(
      questionSlot,
      next
    );
  }

  let focusIndex = 0;
  let focusedSlot = null;
  for (const window of
    recognizedWindows) {
    while (
      focusIndex <
        focusTimeline.length &&
      focusTimeline[
        focusIndex
      ].occurredAtMs <=
        window.startMs &&
      focusTimeline[
        focusIndex
      ].serverSequence <
        window
          .heartbeatSequence
    ) {
      focusedSlot =
        focusTimeline[
          focusIndex
        ].questionSlot;
      focusIndex += 1;
    }

    let cursorMs =
      window.startMs;
    while (
      focusIndex <
        focusTimeline.length &&
      focusTimeline[
        focusIndex
      ].occurredAtMs <=
        window.endMs &&
      focusTimeline[
        focusIndex
      ].serverSequence <
        window
          .heartbeatSequence
    ) {
      const focus =
        focusTimeline[
          focusIndex
        ];
      addAttributedDuration(
        focusedSlot,
        focus.occurredAtMs -
          cursorMs
      );
      focusedSlot =
        focus.questionSlot;
      cursorMs =
        focus.occurredAtMs;
      focusIndex += 1;
    }
    addAttributedDuration(
      focusedSlot,
      window.endMs -
        cursorMs
    );
  }

  const finalBySlot =
    new Map();
  for (
    let index = 0;
    index <
    attempt.finalAnswers
      .length;
    index += 1
  ) {
    const answer =
      attempt
        .finalAnswers[
          index
        ];
    const slot =
      requireSafeInteger(
        answer?.questionSlot,
        `attempt.finalAnswers.${index}.questionSlot`,
        {
          min: 1,
        }
      );
    const source =
      latestAnswerEvents.get(
        slot
      );
    if (
      slot >
        questionCount ||
      finalBySlot.has(slot) ||
      !source ||
      source
        .serverSequence !==
        answer
          .sourceServerSequence ||
      normalizedAnswerText(
        source
          .normalizedAnswer,
        `attempt.eventTimeline.${source.serverSequence - 1}.normalizedAnswer`
      ) !==
        normalizedAnswerText(
          answer
            .normalizedAnswer,
          `attempt.finalAnswers.${index}.normalizedAnswer`
        ) ||
      !sameServerTime(
        source
          .serverOccurredAt,
        answer
          .answerChangedAt
      )
    ) {
      fail(
        "ARENA_SCORING_FINAL_ANSWER_MISMATCH",
        "frozen final answer does not match the latest server answer event",
        {
          statusCode: 409,
        }
      );
    }
    finalBySlot.set(
      slot,
      answer
        .normalizedAnswer
        .value
    );
  }
  if (
    finalBySlot.size !==
    latestAnswerEvents.size
  ) {
    fail(
      "ARENA_SCORING_FINAL_ANSWER_MISMATCH",
      "frozen final answers do not cover every latest server answer event",
      {
        statusCode: 409,
      }
    );
  }

  return {
    activeMsBySlot,
    finalBySlot,
  };
}

function answerMatches(
  expected,
  submitted
) {
  const alternatives =
    String(expected)
      .split("|")
      .map(
        (entry) =>
          entry.trim()
      )
      .filter(Boolean);
  if (!alternatives.length) {
    return false;
  }
  return alternatives.some(
    (alternative) =>
      answersEquivalent(
        alternative,
        submitted
      )
  );
}

function scoreContract(
  questions,
  attempt
) {
  const {
    activeMsBySlot,
    finalBySlot,
  } =
    reconstructAttempt(
      attempt,
      questions
        .questionCount
    );
  let weightedCorrectSum =
    0;
  let advancedCorrectCount =
    0;
  let correctAnswerActiveSolveTimeMs =
    0;

  for (const [
    slot,
    question,
  ] of questions.bySlot) {
    const submitted =
      finalBySlot.get(slot);
    const correct =
      submitted !==
        undefined &&
      answerMatches(
        question.correctAnswer,
        submitted
      );
    if (!correct) {
      continue;
    }
    weightedCorrectSum +=
      question.scoreWeight;
    if (question.advanced) {
      advancedCorrectCount +=
        1;
    }
    correctAnswerActiveSolveTimeMs +=
      activeMsBySlot.get(
        slot
      ) || 0;
  }

  if (
    !Number.isSafeInteger(
      correctAnswerActiveSolveTimeMs
    )
  ) {
    fail(
      "ARENA_SCORING_ACTIVE_TIME_INVALID",
      "correct-answer active time overflowed a safe integer",
      {
        statusCode: 409,
      }
    );
  }
  return {
    calibratedScore:
      Number(
        weightedCorrectSum
          .toFixed(12)
      ),
    advancedCorrectCount,
    correctAnswerActiveSolveTimeMs,
  };
}

function stableValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }
  if (
    value instanceof Date
  ) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(
      stableValue
    );
  }
  if (
    typeof value ===
    "object"
  ) {
    return Object.keys(value)
      .sort()
      .reduce(
        (result, key) => {
          result[key] =
            stableValue(
              value[key]
            );
          return result;
        },
        {}
      );
  }
  return String(value);
}

function deriveSubmissionId(
  attempt,
  pack
) {
  const digest =
    crypto
      .createHash(
        "sha256"
      )
      .update(
        JSON.stringify(
          stableValue({
            authority:
              "MATTHS_ARENA_SERVER_SCORER_V1",
            matchId:
              attempt.matchId,
            attemptId:
              attempt.attemptId,
            submissionRecordId:
              attempt
                .submissionRecordId,
            questionPackId:
              pack
                .questionPackId,
            packVersion:
              pack.packVersion,
            sealedContentHash:
              pack
                .sealedContentHash,
            scoringPolicyVersion:
              pack
                .scoringPolicyVersion,
          })
        )
      )
      .digest("hex");
  return `ARENA_SCORE_V1_${digest}`;
}

function createArenaMatchScoringService(
  options = {}
) {
  const getQuestionPackForScoring =
    options
      .getQuestionPackForScoring;
  const getPrivateScoringProjection =
    options
      .getPrivateScoringProjection;
  const serverCapability =
    options.serverCapability;

  if (
    typeof getQuestionPackForScoring !==
      "function" ||
    typeof getPrivateScoringProjection !==
      "function"
  ) {
    throw new TypeError(
      "Arena scoring coordinator requires both private projection adapters"
    );
  }
  if (
    !isConfiguredCapability(
      serverCapability
    )
  ) {
    throw new TypeError(
      "Arena scoring coordinator requires an in-process server capability"
    );
  }

  async function scoreSubmittedAttempt(
    rawInput
  ) {
    if (
      !rawInput ||
      typeof rawInput !==
        "object" ||
      rawInput
        .serverCapability !==
        serverCapability
    ) {
      fail(
        "ARENA_SCORING_SERVER_ONLY",
        "Arena scoring is available only to the in-process scoring coordinator",
        {
          statusCode: 403,
        }
      );
    }
    const input =
      normalizeInput(
        rawInput
      );

    const [
      pack,
      attempt,
    ] =
      await Promise.all([
        getQuestionPackForScoring({
          questionPackId:
            input.questionPackId,
          matchId:
            input.matchId,
          serverCapability,
        }),
        getPrivateScoringProjection({
          matchId:
            input.matchId,
          participantRole:
            input
              .participantRole,
          participantUserId:
            input
              .participantUserId,
          questionPackId:
            input
              .questionPackId,
          serverCapability,
        }),
      ]);

    assertProjectionIdentities(
      input,
      pack,
      attempt
    );
    assertSupportedContract(
      pack,
      attempt
    );
    const questions =
      alignedQuestionContract(
        pack
      );
    const score =
      scoreContract(
        questions,
        attempt
      );

    return Object.freeze({
      submissionId:
        deriveSubmissionId(
          attempt,
          pack
        ),
      calibratedScore:
        score.calibratedScore,
      advancedCorrectCount:
        score
          .advancedCorrectCount,
      correctAnswerActiveSolveTimeMs:
        score
          .correctAnswerActiveSolveTimeMs,
      integrityState:
        "CLEAR",
      gradingAuthority:
        "SERVER",
      questionVersion:
        requiredText(
          pack.questionVersion,
          "pack.questionVersion",
          100
        ),
      answerKeyVersion:
        requiredText(
          pack
            .answerKeyVersion,
          "pack.answerKeyVersion",
          100
        ),
      calibrationVersion:
        requiredText(
          pack
            .difficultyCalibrationVersion,
          "pack.difficultyCalibrationVersion",
          100
        ),
      questionPackVersion:
        requiredText(
          pack.packVersion,
          "pack.packVersion",
          120
        ),
      scoringPolicyVersion:
        pack
          .scoringPolicyVersion,
      calibratedScoreMethodVersion:
        pack
          .scoringContract
          .calibratedScoreMethodVersion,
      activeSolveTimePolicyVersion:
        pack
          .scoringContract
          .activeSolveTimePolicyVersion,
      answerComparisonPolicyVersion:
        pack
          .scoringContract
          .answerComparisonPolicyVersion,
      submittedAt:
        requireDate(
          attempt
            .effectiveSubmittedAt,
          "attempt.effectiveSubmittedAt"
        ).toISOString(),
    });
  }

  return Object.freeze({
    scoreSubmittedAttempt,
  });
}

/* ------------------------------------------------------------------
 * 원격 정본(Final Rule Logics) 채점 API — THEIRS 에서 병합.
 * arenaMatchSettlementService, mainArenaSettlementService,
 * arenaMatchEvidenceService, mainArenaRevengeService 등이 사용.
 * ------------------------------------------------------------------ */
function scoreArenaAttempt({ attempt, problemPack }) {
  const answerByKey = new Map(
    (attempt?.answers || []).map((answer) => [
      String(answer.questionKey),
      String(answer.value ?? ""),
    ])
  );
  const timingByKey = new Map(
    (attempt?.questionTimings || []).map((timing) => [
      String(timing.questionKey),
      timing.responseTimeMs === null ||
      timing.responseTimeMs === undefined ||
      !Number.isFinite(Number(timing.responseTimeMs))
        ? null
        : Math.max(0, Number(timing.responseTimeMs)),
    ])
  );
  const questionResults = (problemPack?.questions || []).map((question) => {
    const submittedAnswer = answerByKey.get(String(question.questionKey)) || "";
    const expectedAnswer =
      question?.answerKey?.correctAnswer ?? question.answer;
    const correct = answersEquivalent(expectedAnswer, submittedAnswer);
    return {
      questionKey: String(question.questionKey),
      correct,
      pointsAwarded: correct ? Number(question.points || 0) : 0,
      responseTimeMs:
        timingByKey.get(String(question.questionKey)) ?? null,
    };
  });
  return {
    score: questionResults.reduce(
      (sum, result) => sum + result.pointsAwarded,
      0
    ),
    correctCount: questionResults.filter((result) => result.correct).length,
    correctAnswerSolveTimeMs: (() => {
      const correctResults = questionResults.filter(
        (result) => result.correct
      );
      return correctResults.some(
        (result) => result.responseTimeMs === null
      )
        ? null
        : correctResults.reduce(
            (sum, result) => sum + result.responseTimeMs,
            0
          );
    })(),
    totalSolveTimeMs:
      attempt?.activeSolveTimeMs === null ||
      attempt?.activeSolveTimeMs === undefined ||
      !Number.isFinite(Number(attempt.activeSolveTimeMs))
        ? null
        : Math.max(0, Number(attempt.activeSolveTimeMs)),
    questionResults,
  };
}

function compareArenaAttemptScores(challengerScore, defenderScore) {
  const rules = ARENA_SCORING_PRIORITY;
  for (const [key, direction] of rules) {
    const challengerValue = challengerScore?.[key];
    const defenderValue = defenderScore?.[key];
    const challengerRaw =
      challengerValue === null || challengerValue === undefined
        ? Number.NaN
        : Number(challengerValue);
    const defenderRaw =
      defenderValue === null || defenderValue === undefined
        ? Number.NaN
        : Number(defenderValue);
    const missingValue =
      direction === "DESC"
        ? Number.NEGATIVE_INFINITY
        : Number.POSITIVE_INFINITY;
    const challenger = Number.isFinite(challengerRaw)
      ? challengerRaw
      : missingValue;
    const defender = Number.isFinite(defenderRaw)
      ? defenderRaw
      : missingValue;
    if (challenger === defender) continue;
    const challengerWins =
      direction === "DESC" ? challenger > defender : challenger < defender;
    return challengerWins ? "CHALLENGER" : "DEFENDER";
  }
  return "DEFENDER";
}

const ARENA_SCORING_PRIORITY = [
    ["score", "DESC"],
    ["correctCount", "DESC"],
    ["correctAnswerSolveTimeMs", "ASC"],
    ["totalSolveTimeMs", "ASC"],
  ];

module.exports = {
  ARENA_SCORING_PRIORITY,
  ArenaMatchScoringError,
  SUPPORTED_ACTIVE_SOLVE_TIME_POLICY_VERSION,
  SUPPORTED_ADVANCED_THRESHOLD_VERSION,
  SUPPORTED_ANSWER_COMPARISON_POLICY_VERSION,
  SUPPORTED_CALIBRATED_SCORE_METHOD_VERSION,
  SUPPORTED_EXTRA_TIEBREAKER_POLICY_VERSION,
  SUPPORTED_SCORING_CONTRACT,
  SUPPORTED_SCORING_POLICY_VERSION,
  SUPPORTED_TIE_BREAK_ORDER,
  compareArenaAttemptScores,
  createArenaMatchScoringService,
  scoreArenaAttempt,
};
