const mongoose = require("mongoose");

// Legacy RankTakeover compatibility storage only. The production authority is
// goatArenaModel.ArenaMatchAttempt; model and collection names must stay
// distinct so module load order cannot select the wrong schema.

const { Schema } = mongoose;

const ARENA_ATTEMPT_ROLES =
  Object.freeze([
    "CHALLENGER",
    "DEFENDER",
  ]);

const ARENA_ATTEMPT_STATUSES =
  Object.freeze([
    "IN_PROGRESS",
    "SUBMITTED",
  ]);

const ARENA_ATTEMPT_SUBMISSION_SOURCES =
  Object.freeze([
    "CLIENT",
    "SERVER_DEADLINE",
  ]);

const ARENA_ATTEMPT_EVENT_TYPES =
  Object.freeze([
    "QUESTION_FOCUS",
    "ANSWER_CHANGED",
    "HEARTBEAT",
    "NETWORK_STATE",
  ]);

const ARENA_NETWORK_STATES =
  Object.freeze([
    "ONLINE",
    "OFFLINE",
    "RECONNECTED",
    "BACKGROUND",
    "FOREGROUND",
  ]);

class ArenaAttemptImmutableError
  extends Error {
  constructor(
    modelName,
    operation
  ) {
    super(
      `${modelName} is append-only; ${operation} is not allowed`
    );
    this.name =
      "ArenaAttemptImmutableError";
    this.code =
      "ARENA_ATTEMPT_RECORD_IMMUTABLE";
    this.statusCode = 409;
  }
}

const attemptMutationAuthorization =
  Symbol(
    "arenaAttemptMutationAuthorization"
  );

function authorizeArenaAttemptMutation(
  query,
  operation
) {
  if (
    ![
      "EVENT_APPEND",
      "FINAL_SUBMISSION",
    ].includes(operation)
  ) {
    throw new TypeError(
      "unknown Arena attempt mutation operation"
    );
  }
  query[
    attemptMutationAuthorization
  ] = operation;
  return query;
}

function updateKeys(
  update,
  operator
) {
  return Object.keys(
    update?.[operator] ||
      {}
  );
}

function hasOnlyKeys(
  keys,
  allowed
) {
  return keys.every(
    (key) =>
      allowed.has(key)
  );
}

function safeIntegerField({
  min = 0,
  required = false,
  defaultValue,
} = {}) {
  const field = {
    type: Number,
    min,
    required,
    validate: {
      validator: (value) =>
        value === null
          ? !required
          : Number.isSafeInteger(
              value
            ),
      message:
        "{PATH} must be a safe integer",
    },
  };
  if (
    defaultValue !==
    undefined
  ) {
    field.default =
      defaultValue;
  }
  return field;
}

const timingPolicySnapshotSchema =
  new Schema(
    {
      version: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
        immutable: true,
      },
      heartbeatPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
        immutable: true,
      },
      maxRecognizedHeartbeatIntervalMs:
        {
          ...safeIntegerField({
            min: 1,
            required: true,
          }),
          immutable: true,
        },
      networkReconnectGraceMs: {
        ...safeIntegerField({
          min: 0,
          required: true,
        }),
        immutable: true,
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const arenaMatchAttemptSchema =
  new Schema(
    {
      matchId: {
        type: String,
        trim: true,
        maxlength: 180,
        required: true,
        immutable: true,
        index: true,
      },
      matchRecordId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "RankTakeoverMatch",
        required: true,
        immutable: true,
      },
      participantRole: {
        type: String,
        enum:
          ARENA_ATTEMPT_ROLES,
        required: true,
        immutable: true,
      },
      participantUserId: {
        type:
          Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
        index: true,
      },
      questionPackId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "ArenaQuestionPack",
        required: true,
        immutable: true,
      },
      questionPackVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
        immutable: true,
      },
      questionPackSealHash: {
        type: String,
        lowercase: true,
        match: /^[a-f0-9]{64}$/,
        required: true,
        immutable: true,
      },
      policyVersionId: {
        type:
          Schema.Types.ObjectId,
        ref: "PolicyVersion",
        required: true,
        immutable: true,
      },
      scoringPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
        immutable: true,
      },
      questionCount: {
        ...safeIntegerField({
          min: 1,
          required: true,
        }),
        immutable: true,
      },
      timeLimitSeconds: {
        ...safeIntegerField({
          min: 1,
          required: true,
        }),
        immutable: true,
      },
      timingPolicySnapshot: {
        type:
          timingPolicySnapshotSchema,
        required: true,
        immutable: true,
      },
      clientBuildVersionAtStart: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
        immutable: true,
      },
      startedAt: {
        type: Date,
        required: true,
        immutable: true,
      },
      endsAt: {
        type: Date,
        required: true,
        immutable: true,
        index: true,
      },
      commonSubmitsBy: {
        type: Date,
        required: true,
        immutable: true,
      },
      status: {
        type: String,
        enum:
          ARENA_ATTEMPT_STATUSES,
        default:
          "IN_PROGRESS",
        required: true,
        index: true,
      },
      nextServerSequence: {
        ...safeIntegerField({
          min: 1,
          required: true,
          defaultValue: 1,
        }),
      },
      lastHeartbeatAt: {
        type: Date,
        required: true,
      },
      heartbeatActivityState: {
        type: String,
        enum: [
          "ACTIVE",
          "INACTIVE",
        ],
        default: "ACTIVE",
        required: true,
      },
      recognizedHeartbeatActiveMs:
        {
          ...safeIntegerField({
            min: 0,
            required: true,
            defaultValue: 0,
          }),
        },
      submissionRecordId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "RankTakeoverAttemptSubmission",
        default: null,
      },
      submissionId: {
        type: String,
        trim: true,
        maxlength: 180,
        default: null,
      },
      submittedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      strict: "throw",
      versionKey: false,
    }
  );

arenaMatchAttemptSchema.index(
  {
    matchId: 1,
    participantRole: 1,
  },
  {
    unique: true,
    name:
      "one_arena_attempt_per_match_role",
  }
);

arenaMatchAttemptSchema.index(
  {
    matchId: 1,
    participantUserId: 1,
  },
  {
    unique: true,
    name:
      "one_arena_attempt_per_match_participant",
  }
);

arenaMatchAttemptSchema.index(
  {
    questionPackId: 1,
  },
  {
    unique: true,
    name:
      "one_arena_attempt_per_sealed_pack",
  }
);

arenaMatchAttemptSchema.index(
  {
    status: 1,
    endsAt: 1,
  },
  {
    name:
      "arena_attempt_deadline_scan",
  }
);

arenaMatchAttemptSchema.pre(
  "validate",
  function validateAttempt() {
    if (
      this.startedAt &&
      this.endsAt &&
      this.commonSubmitsBy
    ) {
      const expectedEndsAt =
        Math.min(
          this.startedAt.getTime() +
            this.timeLimitSeconds *
              1000,
          this.commonSubmitsBy
            .getTime()
        );
      if (
        this.endsAt.getTime() !==
        expectedEndsAt
      ) {
        this.invalidate(
          "endsAt",
          "participant endsAt must be the earlier of the sealed pack time limit and common submitsBy"
        );
      }
    }

    if (
      this.lastHeartbeatAt &&
      this.startedAt &&
      this.lastHeartbeatAt <
        this.startedAt
    ) {
      this.invalidate(
        "lastHeartbeatAt",
        "heartbeat baseline cannot precede participant start"
      );
    }

    const submitted =
      this.status ===
      "SUBMITTED";
    const hasSubmissionFields =
      Boolean(
        this.submissionRecordId &&
          this.submissionId &&
          this.submittedAt
      );
    if (
      submitted !==
      hasSubmissionFields
    ) {
      this.invalidate(
        "status",
        "submitted attempts require one immutable submission record"
      );
    }
  }
);

for (const operation of [
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
  "findOneAndReplace",
  "replaceOne",
]) {
  arenaMatchAttemptSchema.pre(
    operation,
    function rejectAttemptRemoval() {
      throw new ArenaAttemptImmutableError(
        "RankTakeoverAttempt",
        operation
      );
    }
  );
}

arenaMatchAttemptSchema.pre(
  "updateMany",
  function rejectAttemptBulkUpdate() {
    throw new ArenaAttemptImmutableError(
      "RankTakeoverAttempt",
      "updateMany"
    );
  }
);

for (const operation of [
  "updateOne",
  "findOneAndUpdate",
]) {
  arenaMatchAttemptSchema.pre(
    operation,
    function guardAttemptUpdate() {
      const authorization =
        this[
          attemptMutationAuthorization
        ];
      const update =
        this.getUpdate() || {};
      const operators =
        Object.keys(update);
      const filter =
        this.getFilter() || {};
      const incKeys =
        updateKeys(
          update,
          "$inc"
        );
      const setKeys =
        updateKeys(
          update,
          "$set"
        );
      const setOnInsertKeys =
        updateKeys(
          update,
          "$setOnInsert"
        );
      const allowedOperators =
        operators.every(
          (key) =>
            [
              "$inc",
              "$set",
              "$setOnInsert",
            ].includes(key)
        );
      const validTimestampInsert =
        hasOnlyKeys(
          setOnInsertKeys,
          new Set([
            "createdAt",
          ])
        );

      if (
        authorization ===
        "EVENT_APPEND"
      ) {
        const valid =
          allowedOperators &&
          validTimestampInsert &&
          hasOnlyKeys(
            incKeys,
            new Set([
              "nextServerSequence",
              "recognizedHeartbeatActiveMs",
            ])
          ) &&
          hasOnlyKeys(
            setKeys,
            new Set([
              "lastHeartbeatAt",
              "heartbeatActivityState",
              "updatedAt",
            ])
          ) &&
          update.$inc
            ?.nextServerSequence ===
            1 &&
          Number.isSafeInteger(
            update.$inc
              ?.recognizedHeartbeatActiveMs
          ) &&
          update.$inc
            .recognizedHeartbeatActiveMs >=
            0 &&
          filter._id &&
          filter.status ===
            "IN_PROGRESS" &&
          Number.isSafeInteger(
            filter
              .nextServerSequence
          ) &&
          Boolean(
            filter.endsAt
              ?.$gte
          );
        if (valid) {
          return;
        }
      }

      if (
        authorization ===
        "FINAL_SUBMISSION"
      ) {
        const valid =
          allowedOperators &&
          validTimestampInsert &&
          incKeys.length ===
            0 &&
          hasOnlyKeys(
            setKeys,
            new Set([
              "status",
              "submissionRecordId",
              "submissionId",
              "submittedAt",
              "updatedAt",
            ])
          ) &&
          update.$set
            ?.status ===
            "SUBMITTED" &&
          Boolean(
            update.$set
              ?.submissionRecordId
          ) &&
          Boolean(
            update.$set
              ?.submissionId
          ) &&
          Boolean(
            update.$set
              ?.submittedAt
          ) &&
          filter._id &&
          filter.status ===
            "IN_PROGRESS" &&
          Number.isSafeInteger(
            filter
              .nextServerSequence
          ) &&
          filter
            .submissionRecordId ===
            null;
        if (valid) {
          return;
        }
      }

      throw new ArenaAttemptImmutableError(
        "RankTakeoverAttempt",
        operation
      );
    }
  );
}

arenaMatchAttemptSchema.pre(
  "save",
  function rejectAttemptResave() {
    if (!this.isNew) {
      throw new ArenaAttemptImmutableError(
        "RankTakeoverAttempt",
        "save"
      );
    }
  }
);

arenaMatchAttemptSchema.pre(
  "bulkWrite",
  function rejectAttemptBulkWrite() {
    throw new ArenaAttemptImmutableError(
      "RankTakeoverAttempt",
      "bulkWrite"
    );
  }
);

for (const operation of [
  "updateOne",
  "deleteOne",
]) {
  arenaMatchAttemptSchema.pre(
    operation,
    {
      document: true,
      query: false,
    },
    function rejectAttemptDocumentMutation() {
      throw new ArenaAttemptImmutableError(
        "RankTakeoverAttempt",
        `document.${operation}`
      );
    }
  );
}

const normalizedAnswerSchema =
  new Schema(
    {
      kind: {
        type: String,
        enum: ["TEXT"],
        required: true,
      },
      value: {
        type: String,
        maxlength: 4000,
        default: "",
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const arenaMatchAttemptEventSchema =
  new Schema(
    {
      attemptId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "RankTakeoverAttempt",
        required: true,
        immutable: true,
        index: true,
      },
      matchId: {
        type: String,
        trim: true,
        maxlength: 180,
        required: true,
        immutable: true,
      },
      participantRole: {
        type: String,
        enum:
          ARENA_ATTEMPT_ROLES,
        required: true,
        immutable: true,
      },
      participantUserId: {
        type:
          Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
      },
      questionPackId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "ArenaQuestionPack",
        required: true,
        immutable: true,
      },
      clientEventId: {
        type: String,
        trim: true,
        maxlength: 180,
        required: true,
        immutable: true,
      },
      requestFingerprint: {
        type: String,
        lowercase: true,
        match: /^[a-f0-9]{64}$/,
        required: true,
        immutable: true,
      },
      eventType: {
        type: String,
        enum:
          ARENA_ATTEMPT_EVENT_TYPES,
        required: true,
        immutable: true,
        index: true,
      },
      serverSequence: {
        ...safeIntegerField({
          min: 1,
          required: true,
        }),
        immutable: true,
      },
      serverOccurredAt: {
        type: Date,
        required: true,
        immutable: true,
      },
      clientBuildVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
        immutable: true,
      },
      questionSlot: {
        ...safeIntegerField({
          min: 1,
          required: false,
          defaultValue: null,
        }),
        immutable: true,
      },
      normalizedAnswer: {
        type:
          normalizedAnswerSchema,
        default: null,
        immutable: true,
        select: false,
      },
      networkState: {
        type: String,
        enum: [
          ...ARENA_NETWORK_STATES,
          null,
        ],
        default: null,
        immutable: true,
      },
      recognizedActiveIntervalMs:
        {
          ...safeIntegerField({
            min: 0,
            required: true,
            defaultValue: 0,
          }),
          immutable: true,
        },
    },
    {
      timestamps: {
        createdAt: true,
        updatedAt: false,
      },
      strict: "throw",
      versionKey: false,
    }
  );

arenaMatchAttemptEventSchema.index(
  {
    attemptId: 1,
    clientEventId: 1,
  },
  {
    unique: true,
    name:
      "one_client_event_per_arena_attempt",
  }
);

arenaMatchAttemptEventSchema.index(
  {
    attemptId: 1,
    serverSequence: 1,
  },
  {
    unique: true,
    name:
      "monotonic_server_sequence_per_arena_attempt",
  }
);

arenaMatchAttemptEventSchema.pre(
  "validate",
  function validateEventShape() {
    if (!this.isNew) {
      throw new ArenaAttemptImmutableError(
        "RankTakeoverAttemptEvent",
        "validate/save"
      );
    }

    const needsQuestion =
      [
        "QUESTION_FOCUS",
        "ANSWER_CHANGED",
      ].includes(
        this.eventType
      );
    if (
      needsQuestion !==
      Number.isSafeInteger(
        this.questionSlot
      )
    ) {
      this.invalidate(
        "questionSlot",
        "question events require one question slot and non-question events forbid it"
      );
    }

    const hasAnswer =
      Boolean(
        this.normalizedAnswer
      );
    if (
      (this.eventType ===
        "ANSWER_CHANGED") !==
      hasAnswer
    ) {
      this.invalidate(
        "normalizedAnswer",
        "only answer-change events may store a normalized answer"
      );
    }

    const hasNetworkState =
      Boolean(
        this.networkState
      );
    if (
      (this.eventType ===
        "NETWORK_STATE") !==
      hasNetworkState
    ) {
      this.invalidate(
        "networkState",
        "only network-state events may store a network state"
      );
    }

    if (
      this.eventType !==
        "HEARTBEAT" &&
      this
        .recognizedActiveIntervalMs !==
        0
    ) {
      this.invalidate(
        "recognizedActiveIntervalMs",
        "only server-recognized heartbeat events may add active time"
      );
    }
  }
);

const frozenAnswerSchema =
  new Schema(
    {
      questionSlot: {
        ...safeIntegerField({
          min: 1,
          required: true,
        }),
        immutable: true,
      },
      normalizedAnswer: {
        type:
          normalizedAnswerSchema,
        required: true,
        immutable: true,
      },
      sourceEventId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "RankTakeoverAttemptEvent",
        required: true,
        immutable: true,
      },
      sourceServerSequence: {
        ...safeIntegerField({
          min: 1,
          required: true,
        }),
        immutable: true,
      },
      answerChangedAt: {
        type: Date,
        required: true,
        immutable: true,
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const arenaMatchAttemptSubmissionSchema =
  new Schema(
    {
      attemptId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "RankTakeoverAttempt",
        required: true,
        immutable: true,
        unique: true,
      },
      matchId: {
        type: String,
        trim: true,
        maxlength: 180,
        required: true,
        immutable: true,
      },
      participantRole: {
        type: String,
        enum:
          ARENA_ATTEMPT_ROLES,
        required: true,
        immutable: true,
      },
      participantUserId: {
        type:
          Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
      },
      questionPackId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "ArenaQuestionPack",
        required: true,
        immutable: true,
      },
      submissionId: {
        type: String,
        trim: true,
        maxlength: 180,
        required: true,
        immutable: true,
      },
      requestFingerprint: {
        type: String,
        lowercase: true,
        match: /^[a-f0-9]{64}$/,
        required: true,
        immutable: true,
      },
      clientBuildVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
        immutable: true,
      },
      submissionSource: {
        type: String,
        enum:
          ARENA_ATTEMPT_SUBMISSION_SOURCES,
        required: true,
        immutable: true,
      },
      startedAt: {
        type: Date,
        required: true,
        immutable: true,
      },
      endsAt: {
        type: Date,
        required: true,
        immutable: true,
      },
      submittedAt: {
        type: Date,
        required: true,
        immutable: true,
      },
      effectiveSubmittedAt: {
        type: Date,
        required: true,
        immutable: true,
      },
      frozenAt: {
        type: Date,
        required: true,
        immutable: true,
      },
      lastAcceptedServerSequence:
        {
          ...safeIntegerField({
            min: 0,
            required: true,
          }),
          immutable: true,
        },
      recognizedHeartbeatActiveMs:
        {
          ...safeIntegerField({
            min: 0,
            required: true,
          }),
          immutable: true,
        },
      answerCount: {
        ...safeIntegerField({
          min: 0,
          required: true,
        }),
        immutable: true,
      },
      nonBlankAnswerCount: {
        ...safeIntegerField({
          min: 0,
          required: true,
        }),
        immutable: true,
      },
      finalAnswers: {
        type: [
          frozenAnswerSchema,
        ],
        required: true,
        immutable: true,
        select: false,
      },
    },
    {
      timestamps: {
        createdAt: true,
        updatedAt: false,
      },
      strict: "throw",
      versionKey: false,
    }
  );

arenaMatchAttemptSubmissionSchema.index(
  {
    matchId: 1,
    participantUserId: 1,
    submissionId: 1,
  },
  {
    unique: true,
    name:
      "one_submission_request_per_arena_participant",
  }
);

arenaMatchAttemptSubmissionSchema.pre(
  "validate",
  function validateSubmission() {
    if (!this.isNew) {
      throw new ArenaAttemptImmutableError(
        "RankTakeoverAttemptSubmission",
        "validate/save"
      );
    }
    const slots =
      (this.finalAnswers || [])
        .map(
          (answer) =>
            answer.questionSlot
        );
    if (
      new Set(slots).size !==
      slots.length
    ) {
      this.invalidate(
        "finalAnswers",
        "a frozen submission may contain only one final answer per question slot"
      );
    }
    if (
      this.answerCount !==
      slots.length
    ) {
      this.invalidate(
        "answerCount",
        "answerCount must match the frozen final answer set"
      );
    }
    const nonBlankAnswerCount =
      (this.finalAnswers || [])
        .filter(
          (answer) =>
            typeof answer
              ?.normalizedAnswer
              ?.value ===
              "string" &&
            answer
              .normalizedAnswer
              .value
              .trim()
        )
        .length;
    if (
      this
        .nonBlankAnswerCount !==
      nonBlankAnswerCount
    ) {
      this.invalidate(
        "nonBlankAnswerCount",
        "nonBlankAnswerCount must match the frozen non-blank answer set"
      );
    }
    if (
      this.submittedAt &&
      this
        .effectiveSubmittedAt &&
      this.submittedAt
        .getTime() !==
        this
          .effectiveSubmittedAt
          .getTime()
    ) {
      this.invalidate(
        "effectiveSubmittedAt",
        "submittedAt and effectiveSubmittedAt must identify the same authoritative submission time"
      );
    }
    if (
      this.frozenAt &&
      this
        .effectiveSubmittedAt &&
      this.frozenAt <
        this
          .effectiveSubmittedAt
    ) {
      this.invalidate(
        "frozenAt",
        "frozenAt cannot precede the authoritative submission time"
      );
    }
    if (
      this.submissionSource ===
        "CLIENT" &&
      this
        .effectiveSubmittedAt >
        this.endsAt
    ) {
      this.invalidate(
        "effectiveSubmittedAt",
        "client submissions cannot be effective after the participant deadline"
      );
    }
    if (
      this.submissionSource ===
        "SERVER_DEADLINE" &&
      this
        .effectiveSubmittedAt
        ?.getTime() !==
        this.endsAt
          ?.getTime()
    ) {
      this.invalidate(
        "effectiveSubmittedAt",
        "server deadline submissions must be effective exactly at the participant deadline"
      );
    }
    if (
      (this.finalAnswers || [])
        .some(
          (answer) =>
            answer
              .answerChangedAt >
            this
              .effectiveSubmittedAt
        )
    ) {
      this.invalidate(
        "finalAnswers",
        "a frozen submission cannot include answer events after its authoritative submission time"
      );
    }
  }
);

function installAppendOnlyHooks(
  schema,
  modelName
) {
  for (const operation of [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "findOneAndReplace",
    "replaceOne",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
  ]) {
    schema.pre(
      operation,
      function rejectMutation() {
        throw new ArenaAttemptImmutableError(
          modelName,
          operation
        );
      }
    );
  }
  schema.pre(
    "bulkWrite",
    function rejectBulkMutation() {
      throw new ArenaAttemptImmutableError(
        modelName,
        "bulkWrite"
      );
    }
  );
  for (const operation of [
    "updateOne",
    "deleteOne",
  ]) {
    schema.pre(
      operation,
      {
        document: true,
        query: false,
      },
      function rejectDocumentMutation() {
        throw new ArenaAttemptImmutableError(
          modelName,
          `document.${operation}`
        );
      }
    );
  }
  schema.pre(
    "save",
    function rejectResave() {
      if (!this.isNew) {
        throw new ArenaAttemptImmutableError(
          modelName,
          "save"
        );
      }
    }
  );
}

installAppendOnlyHooks(
  arenaMatchAttemptEventSchema,
  "RankTakeoverAttemptEvent"
);
installAppendOnlyHooks(
  arenaMatchAttemptSubmissionSchema,
  "RankTakeoverAttemptSubmission"
);

const RankTakeoverAttempt =
  mongoose.models
    .RankTakeoverAttempt ||
  mongoose.model(
    "RankTakeoverAttempt",
    arenaMatchAttemptSchema,
    "ranktakeoverattempts"
  );

const RankTakeoverAttemptEvent =
  mongoose.models
    .RankTakeoverAttemptEvent ||
  mongoose.model(
    "RankTakeoverAttemptEvent",
    arenaMatchAttemptEventSchema,
    "ranktakeoverattemptevents"
  );

const RankTakeoverAttemptSubmission =
  mongoose.models
    .RankTakeoverAttemptSubmission ||
  mongoose.model(
    "RankTakeoverAttemptSubmission",
    arenaMatchAttemptSubmissionSchema,
    "ranktakeoverattemptsubmissions"
  );

module.exports = {
  ARENA_ATTEMPT_EVENT_TYPES,
  ARENA_ATTEMPT_ROLES,
  ARENA_ATTEMPT_STATUSES,
  ARENA_ATTEMPT_SUBMISSION_SOURCES,
  ARENA_NETWORK_STATES,
  ArenaAttemptImmutableError,
  RankTakeoverAttempt,
  RankTakeoverAttemptEvent,
  RankTakeoverAttemptSubmission,
  authorizeArenaAttemptMutation,
};
