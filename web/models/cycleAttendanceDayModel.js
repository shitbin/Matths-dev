const crypto = require(
  "node:crypto"
);
const mongoose = require(
  "mongoose"
);

const { Schema } = mongoose;

const ATTENDANCE_SOURCE_TYPES =
  Object.freeze([
    "PRACTICE",
    "QUICK_PRACTICE",
    "ASSESSMENT",
    "PLACEMENT",
    "OFFICIAL_MOCK",
    "WRONG_NOTE_REVIEW",
  ]);

const ATTENDANCE_INTEGRITY_STATES =
  Object.freeze([
    "CLEAR",
    "HELD",
    "INVALID",
  ]);

const ATTENDANCE_ACCESS_STATES =
  Object.freeze([
    "PAID_ACCESS",
    "COMPLETION_PASS",
    "POLICY_PENDING",
    "COMPLETION_PASS_INACTIVE",
    "ACTIVITY_NOT_ALLOWED",
  ]);

const ATTENDANCE_EVENT_OUTCOMES =
  Object.freeze([
    "VALID_ACTIVITY",
    "POLICY_PENDING",
    "COMPLETION_PASS_INACTIVE",
    "ACTIVITY_NOT_ALLOWED",
    "SUBMISSION_NOT_PERSISTED",
    "INTEGRITY_HELD",
    "INTEGRITY_INVALID",
  ]);

const ATTENDANCE_RECOGNITION_STATES =
  Object.freeze([
    "UNRECOGNIZED",
    "POLICY_PENDING",
    "INTEGRITY_HELD",
    "INTEGRITY_INVALID",
    "RECOGNIZED",
  ]);

const ATTENDANCE_RECOGNITION_BLOCKERS =
  Object.freeze([
    "POLICY_MIN_PROBLEMS_UNSET",
    "POLICY_MIN_STUDY_SECONDS_UNSET",
    "POLICY_DAY30_WINDOW_UNSET",
    "POLICY_DAY30_ALLOWLIST_UNSET",
    "NO_ELIGIBLE_ACTIVITY",
    "PROBLEM_THRESHOLD_NOT_MET",
    "STUDY_TIME_THRESHOLD_NOT_MET",
    "INTEGRITY_HELD",
    "INTEGRITY_INVALID",
  ]);

const dateKeyPattern =
  /^\d{4}-\d{2}-\d{2}$/;
const eventTypePattern =
  /^[A-Z][A-Z0-9_]{0,79}$/;
const sha256Pattern =
  /^[a-f0-9]{64}$/;
const integrityWeight =
  Object.freeze({
    CLEAR: 0,
    HELD: 1,
    INVALID: 2,
  });

function expectedEventOutcome(
  event
) {
  if (
    event.accessState ===
    "POLICY_PENDING"
  ) {
    return "POLICY_PENDING";
  }
  if (
    event.accessState ===
    "COMPLETION_PASS_INACTIVE"
  ) {
    return "COMPLETION_PASS_INACTIVE";
  }
  if (
    event.accessState ===
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

function expectedIdempotencyKey(
  event
) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify([
        event.sourceType,
        event.sourceId,
        event.eventType,
      ])
    )
    .digest("hex");
}

function nonNegativeIntegerField(
  defaultValue = 0
) {
  return {
    type: Number,
    min: 0,
    default: defaultValue,
    validate: {
      validator:
        Number.isSafeInteger,
      message:
        "{PATH} must be an integer",
    },
  };
}

const attendanceSourceEventSchema =
  new Schema(
    {
      idempotencyKey: {
        type: String,
        required: true,
        match: sha256Pattern,
      },
      payloadFingerprint: {
        type: String,
        required: true,
        match: sha256Pattern,
      },
      sourceType: {
        type: String,
        enum:
          ATTENDANCE_SOURCE_TYPES,
        required: true,
      },
      sourceId: {
        type: String,
        trim: true,
        maxlength: 240,
        required: true,
      },
      eventType: {
        type: String,
        match: eventTypePattern,
        required: true,
      },
      occurredAt: {
        type: Date,
        required: true,
      },
      dateKeyKst: {
        type: String,
        match: dateKeyPattern,
        required: true,
      },
      cycleDay: {
        type: Number,
        min: 1,
        max: 30,
        required: true,
        validate: {
          validator:
            Number.isSafeInteger,
          message:
            "{PATH} must be an integer",
        },
      },
      validStudyMilliseconds:
        nonNegativeIntegerField(),
      problemKeys: {
        type: [
          {
            type: String,
            trim: true,
            maxlength: 240,
          },
        ],
        default: [],
      },
      allRequiredSubmissionsPersisted: {
        type: Boolean,
        required: true,
      },
      integrityState: {
        type: String,
        enum:
          ATTENDANCE_INTEGRITY_STATES,
        required: true,
      },
      accessState: {
        type: String,
        enum:
          ATTENDANCE_ACCESS_STATES,
        required: true,
      },
      outcome: {
        type: String,
        enum:
          ATTENDANCE_EVENT_OUTCOMES,
        required: true,
      },
      includedInDayTotals: {
        type: Boolean,
        required: true,
      },
      recordedAt: {
        type: Date,
        required: true,
      },
    },
    {
      _id: false,
    }
  );

const cycleAttendanceDaySchema =
  new Schema(
    {
      cycleId: {
        type: Schema.Types.ObjectId,
        ref: "AccessCycleLifecycle",
        required: true,
        index: true,
      },
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      dateKeyKst: {
        type: String,
        match: dateKeyPattern,
        required: true,
      },
      cycleDay: {
        type: Number,
        min: 1,
        max: 30,
        required: true,
        validate: {
          validator:
            Number.isSafeInteger,
          message:
            "{PATH} must be an integer",
        },
      },
      validStudyMilliseconds:
        nonNegativeIntegerField(),
      validStudySeconds:
        nonNegativeIntegerField(),
      completedProblemKeys: {
        type: [
          {
            type: String,
            trim: true,
            maxlength: 240,
          },
        ],
        default: [],
      },
      distinctProblemCount:
        nonNegativeIntegerField(),
      sourceEvents: {
        type: [
          attendanceSourceEventSchema,
        ],
        default: [],
      },
      integrityState: {
        type: String,
        enum:
          ATTENDANCE_INTEGRITY_STATES,
        default: "CLEAR",
      },
      recognitionState: {
        type: String,
        enum:
          ATTENDANCE_RECOGNITION_STATES,
        default: "UNRECOGNIZED",
      },
      recognitionBlockers: {
        type: [
          {
            type: String,
            enum:
              ATTENDANCE_RECOGNITION_BLOCKERS,
          },
        ],
        default: [],
      },
      recognized: {
        type: Boolean,
        default: false,
      },
      recognizedAt: {
        type: Date,
        default: null,
      },
      restoredByAdmin: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      restoreReason: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },
    },
    {
      timestamps: true,
      versionKey: "version",
      optimisticConcurrency: true,
    }
  );

cycleAttendanceDaySchema.index(
  {
    cycleId: 1,
    dateKeyKst: 1,
  },
  {
    unique: true,
    name:
      "one_attendance_day_per_cycle_date",
  }
);

// sourceType + sourceId + eventType에서 만든 SHA-256 키다. 배열 내부
// 중복은 서비스의 원자 조건이, 서로 다른 날짜 문서 간 중복은 이 인덱스가 막는다.
cycleAttendanceDaySchema.index(
  {
    "sourceEvents.idempotencyKey":
      1,
  },
  {
    unique: true,
    sparse: true,
    name:
      "unique_cycle_attendance_source_event",
  }
);

cycleAttendanceDaySchema.index({
  userId: 1,
  dateKeyKst: -1,
});

cycleAttendanceDaySchema.pre(
  "validate",
  function validateAttendanceDay() {
    const problemKeys =
      this.completedProblemKeys ||
      [];
    const uniqueProblemKeys =
      new Set(problemKeys);
    if (
      uniqueProblemKeys.size !==
      problemKeys.length
    ) {
      this.invalidate(
        "completedProblemKeys",
        "completed problem keys must be distinct"
      );
    }
    if (
      this.distinctProblemCount !==
      uniqueProblemKeys.size
    ) {
      this.invalidate(
        "distinctProblemCount",
        "distinct problem count must match completed problem keys"
      );
    }
    if (
      this.validStudySeconds !==
      Math.floor(
        this
          .validStudyMilliseconds /
          1000
      )
    ) {
      this.invalidate(
        "validStudySeconds",
        "valid study seconds must be derived from milliseconds"
      );
    }

    const sourceEvents =
      this.sourceEvents || [];
    const eventKeys =
      sourceEvents.map(
        (event) =>
          event.idempotencyKey
      );
    if (
      new Set(eventKeys).size !==
      eventKeys.length
    ) {
      this.invalidate(
        "sourceEvents",
        "source events must be idempotent within a day"
      );
    }

    const aggregateProblemKeys =
      new Set();
    let aggregateMilliseconds =
      0;
    let aggregateIntegrity =
      "CLEAR";
    for (const event of
      sourceEvents) {
      if (
        event.dateKeyKst !==
          this.dateKeyKst ||
        event.cycleDay !==
          this.cycleDay
      ) {
        this.invalidate(
          "sourceEvents",
          "source event date and cycle day must match the attendance day"
        );
      }
      if (
        event.idempotencyKey !==
        expectedIdempotencyKey(
          event
        )
      ) {
        this.invalidate(
          "sourceEvents",
          "source event idempotency key must match its identity"
        );
      }

      const outcome =
        expectedEventOutcome(
          event
        );
      if (
        event.outcome !== outcome
      ) {
        this.invalidate(
          "sourceEvents",
          "source event outcome must match its validation state"
        );
      }
      const insideLearningWindow =
        event.accessState ===
          "PAID_ACCESS" ||
        event.accessState ===
          "COMPLETION_PASS";
      const expectedIncluded =
        insideLearningWindow &&
        event
          .allRequiredSubmissionsPersisted &&
        event.integrityState ===
          "CLEAR";
      if (
        event
          .includedInDayTotals !==
        expectedIncluded
      ) {
        this.invalidate(
          "sourceEvents",
          "source event total inclusion must match its validation state"
        );
      }

      if (
        insideLearningWindow &&
        event
          .allRequiredSubmissionsPersisted &&
        integrityWeight[
          event.integrityState
        ] >
          integrityWeight[
            aggregateIntegrity
          ]
      ) {
        aggregateIntegrity =
          event.integrityState;
      }
      if (!expectedIncluded) {
        continue;
      }
      aggregateMilliseconds +=
        event
          .validStudyMilliseconds;
      for (const problemKey of
        event.problemKeys) {
        aggregateProblemKeys.add(
          problemKey
        );
      }
    }
    if (
      !Number.isSafeInteger(
        aggregateMilliseconds
      ) ||
      aggregateMilliseconds !==
        this
          .validStudyMilliseconds
    ) {
      this.invalidate(
        "validStudyMilliseconds",
        "valid study milliseconds must match included source events"
      );
    }
    if (
      aggregateProblemKeys.size !==
        uniqueProblemKeys.size ||
      [
        ...aggregateProblemKeys,
      ].some(
        (problemKey) =>
          !uniqueProblemKeys.has(
            problemKey
          )
      )
    ) {
      this.invalidate(
        "completedProblemKeys",
        "completed problem keys must match included source events"
      );
    }
    if (
      this.integrityState !==
      aggregateIntegrity
    ) {
      this.invalidate(
        "integrityState",
        "day integrity must match eligible source events"
      );
    }

    if (this.recognized) {
      if (
        this.recognitionState !==
        "RECOGNIZED"
      ) {
        this.invalidate(
          "recognitionState",
          "recognized day must use RECOGNIZED state"
        );
      }
      if (
        !this.recognizedAt
      ) {
        this.invalidate(
          "recognizedAt",
          "recognized day must include recognizedAt"
        );
      }
      if (
        this.recognitionBlockers
          .length
      ) {
        this.invalidate(
          "recognitionBlockers",
          "recognized day cannot have blockers"
        );
      }
    } else {
      if (
        this.recognitionState ===
        "RECOGNIZED"
      ) {
        this.invalidate(
          "recognitionState",
          "unrecognized day cannot use RECOGNIZED state"
        );
      }
      if (
        this.recognizedAt
      ) {
        this.invalidate(
          "recognizedAt",
          "unrecognized day cannot include recognizedAt"
        );
      }
    }
  }
);

const CycleAttendanceDay =
  mongoose.models
    .CycleAttendanceDay ||
  mongoose.model(
    "CycleAttendanceDay",
    cycleAttendanceDaySchema
  );

module.exports = {
  ATTENDANCE_ACCESS_STATES,
  ATTENDANCE_EVENT_OUTCOMES,
  ATTENDANCE_INTEGRITY_STATES,
  ATTENDANCE_RECOGNITION_BLOCKERS,
  ATTENDANCE_RECOGNITION_STATES,
  ATTENDANCE_SOURCE_TYPES,
  CycleAttendanceDay,
};
