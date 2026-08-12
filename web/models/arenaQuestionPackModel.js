const crypto = require("node:crypto");
const mongoose = require("mongoose");

const { Schema } = mongoose;

const ARENA_PARTICIPANT_ROLES =
  Object.freeze([
    "CHALLENGER",
    "DEFENDER",
  ]);

const ARENA_QUESTION_INPUT_MODES =
  Object.freeze([
    "MULTIPLE_CHOICE",
    "SHORT_ANSWER",
    "ESSAY",
  ]);

const ARENA_TAKEOVER_RANKINGS =
  Object.freeze(["SUB", "MAIN"]);

const ARENA_TAKEOVER_MATCH_TYPES =
  Object.freeze([
    "NORMAL",
    "REVENGE",
  ]);

const SCORING_TIE_BREAK_ORDER =
  Object.freeze([
    "CALIBRATED_SCORE",
    "ADVANCED_CORRECT_COUNT",
    "CORRECT_ANSWER_ACTIVE_SOLVE_TIME_MS",
    "PUBLISHED_EXTRA_TIEBREAKER",
    "DEFENDER_WINS_FULL_TIE",
  ]);

class ArenaQuestionPackImmutableError
  extends Error {
  constructor(
    modelName,
    operation
  ) {
    super(
      `${modelName} is append-only; ${operation} is not allowed`
    );
    this.name =
      "ArenaQuestionPackImmutableError";
    this.code =
      "ARENA_QUESTION_PACK_IMMUTABLE";
    this.statusCode = 409;
  }
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

function normalizeForHash(
  value
) {
  if (value === undefined) {
    return null;
  }
  if (value === null) {
    return null;
  }
  if (
    value instanceof Date
  ) {
    return value.toISOString();
  }
  if (
    value instanceof
      mongoose.Types.ObjectId
  ) {
    return String(value);
  }
  if (Buffer.isBuffer(value)) {
    return value.toString("base64");
  }
  if (Array.isArray(value)) {
    return value.map(
      normalizeForHash
    );
  }
  if (
    typeof value === "object"
  ) {
    return Object.keys(value)
      .filter(
        (key) =>
          ![
            "_id",
            "__v",
            "createdAt",
            "updatedAt",
          ].includes(key)
      )
      .sort()
      .reduce(
        (result, key) => {
          result[key] =
            normalizeForHash(
              value[key]
            );
          return result;
        },
        {}
      );
  }
  if (
    typeof value === "number" &&
    !Number.isFinite(value)
  ) {
    throw new TypeError(
      "non-finite numbers cannot be sealed"
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(
    normalizeForHash(value)
  );
}

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

function templateIntegrityPayload(
  input
) {
  const value = asPlain(input);
  const normalizeChoices = (
    choices
  ) =>
    Array.isArray(choices)
      ? choices.map(
          (choice) => ({
            key: choice.key,
            text: choice.text,
          })
        )
      : [];
  const normalizeSlot = (slot) => ({
    slot: slot.slot,
    courseId: slot.courseId,
    unitId: slot.unitId,
    conceptIds:
      slot.conceptIds || [],
    scoreWeight:
      slot.scoreWeight,
    targetDifficulty:
      slot.targetDifficulty,
    calibratedDifficulty:
      slot.calibratedDifficulty,
    advanced:
      Boolean(slot.advanced),
  });
  return {
    status: value.status,
    templateSetVersion:
      value.templateSetVersion,
    policyVersionId:
      value.policyVersionId,
    activeRanking:
      value.activeRanking,
    matchType:
      value.matchType,
    curriculumVersion:
      value.curriculumVersion,
    eligibilityPolicyVersion:
      value
        .eligibilityPolicyVersion,
    eligibleSchoolGrades:
      value.eligibleSchoolGrades,
    questionVersion:
      value.questionVersion,
    answerKeyVersion:
      value.answerKeyVersion,
    difficultyCalibrationVersion:
      value
        .difficultyCalibrationVersion,
    scoringPolicyVersion:
      value.scoringPolicyVersion,
    questionCount:
      value.questionCount,
    timeLimitSeconds:
      value.timeLimitSeconds,
    scoringContract: value
      .scoringContract
      ? {
          calibratedScoreMethodVersion:
            value.scoringContract
              .calibratedScoreMethodVersion,
          advancedThresholdVersion:
            value.scoringContract
              .advancedThresholdVersion,
          activeSolveTimePolicyVersion:
            value.scoringContract
              .activeSolveTimePolicyVersion,
          extraTieBreakerPolicyVersion:
            value.scoringContract
              .extraTieBreakerPolicyVersion,
          answerComparisonPolicyVersion:
            value.scoringContract
              .answerComparisonPolicyVersion,
          tieBreakOrder:
            value.scoringContract
              .tieBreakOrder || [],
        }
      : null,
    equivalenceSlots:
      (
        value.equivalenceSlots ||
        []
      ).map(normalizeSlot),
    variants: (
      value.variants || []
    ).map((variant) => ({
      variantVersion:
        variant.variantVersion,
      questions: (
        variant.questions || []
      ).map((question) => ({
        ...normalizeSlot(
          question
        ),
        questionVersionId:
          question
            .questionVersionId,
        answerVersionId:
          question
            .answerVersionId,
        stem: question.stem,
        choices:
          normalizeChoices(
            question.choices
          ),
        inputMode:
          question.inputMode,
        correctAnswer:
          question.correctAnswer,
        solution:
          question.solution || "",
      })),
    })),
    pairings: (
      value.pairings || []
    ).map((pairing) => ({
      pairingVersion:
        pairing.pairingVersion,
      challengerVariantVersion:
        pairing
          .challengerVariantVersion,
      defenderVariantVersion:
        pairing
          .defenderVariantVersion,
    })),
  };
}

function computeTemplateContentHash(
  input
) {
  return sha256(
    stableJson(
      templateIntegrityPayload(
        input
      )
    )
  );
}

function packIntegrityPayload(
  input
) {
  const value = asPlain(input);
  const normalizeChoices = (
    choices
  ) =>
    Array.isArray(choices)
      ? choices.map(
          (choice) => ({
            key: choice.key,
            text: choice.text,
          })
        )
      : [];
  return {
    matchId: value.matchId,
    matchRecordId:
      value.matchRecordId,
    participantRole:
      value.participantRole,
    participantUserId:
      value.participantUserId,
    counterpartPackId:
      value.counterpartPackId,
    packVersion:
      value.packVersion,
    templateSetId:
      value.templateSetId,
    templateSetVersion:
      value.templateSetVersion,
    approvedPairingVersion:
      value.approvedPairingVersion,
    approvedVariantVersion:
      value.approvedVariantVersion,
    approvalContentHash:
      value.approvalContentHash,
    curriculumVersion:
      value.curriculumVersion,
    questionVersion:
      value.questionVersion,
    questionVersionIds:
      value.questionVersionIds,
    answerKeyVersion:
      value.answerKeyVersion,
    answerVersionIds:
      value.answerVersionIds,
    difficultyCalibrationVersion:
      value
        .difficultyCalibrationVersion,
    scoringPolicyVersion:
      value.scoringPolicyVersion,
    eligibilityPolicyVersion:
      value
        .eligibilityPolicyVersion,
    randomSeedHash:
      value.randomSeedHash,
    equivalenceContractHash:
      value.equivalenceContractHash,
    pairSealHash:
      value.pairSealHash,
    questionCount:
      value.questionCount,
    timeLimitSeconds:
      value.timeLimitSeconds,
    scoringContract:
      value.scoringContract,
    equivalenceSlots:
      value.equivalenceSlots,
    publicQuestions:
      (
        value.publicQuestions ||
        []
      ).map((question) => ({
        slot: question.slot,
        questionVersionId:
          question
            .questionVersionId,
        stem: question.stem,
        choices:
          normalizeChoices(
            question.choices
          ),
        inputMode:
          question.inputMode,
        scoreWeight:
          question.scoreWeight,
        targetDifficulty:
          question
            .targetDifficulty,
        calibratedDifficulty:
          question
            .calibratedDifficulty,
        advanced:
          Boolean(
            question.advanced
          ),
      })),
    privateMaterial: value
      .privateMaterial
      ? {
          rawRandomSeed:
            value.privateMaterial
              .rawRandomSeed,
          answerKeys: (
            value.privateMaterial
              .answerKeys || []
          ).map((answer) => ({
            slot: answer.slot,
            questionVersionId:
              answer
                .questionVersionId,
            answerVersionId:
              answer
                .answerVersionId,
            correctAnswer:
              answer.correctAnswer,
            solution:
              answer.solution || "",
          })),
        }
      : null,
    sealedAt: value.sealedAt,
  };
}

function computePackSealedContentHash(
  input
) {
  return sha256(
    stableJson(
      packIntegrityPayload(input)
    )
  );
}

function conceptsEqual(
  left,
  right
) {
  const normalize = (values) =>
    [...new Set(
      (values || []).map(
        (value) =>
          String(value)
      )
    )].sort();
  return (
    stableJson(normalize(left)) ===
    stableJson(normalize(right))
  );
}

function collectTemplateContractIssues(
  input
) {
  const value = asPlain(input);
  const issues = [];
  const requiredPolicies = [
    "curriculumVersion",
    "eligibilityPolicyVersion",
    "questionVersion",
    "answerKeyVersion",
    "difficultyCalibrationVersion",
    "scoringPolicyVersion",
  ];

  for (
    const field of requiredPolicies
  ) {
    if (
      !String(
        value[field] || ""
      ).trim()
    ) {
      issues.push(
        `${field} is unresolved`
      );
    }
  }

  if (
    !Number.isSafeInteger(
      value.questionCount
    ) ||
    value.questionCount <= 0
  ) {
    issues.push(
      "questionCount must be a positive integer"
    );
  }
  if (
    !Number.isSafeInteger(
      value.timeLimitSeconds
    ) ||
    value.timeLimitSeconds <= 0
  ) {
    issues.push(
      "timeLimitSeconds must be a positive integer"
    );
  }

  const slots = Array.isArray(
    value.equivalenceSlots
  )
    ? value.equivalenceSlots
    : [];
  if (
    slots.length !==
    value.questionCount
  ) {
    issues.push(
      "equivalence slot count must equal questionCount"
    );
  }
  slots.forEach(
    (slot, index) => {
      if (
        slot.slot !==
        index + 1
      ) {
        issues.push(
          "equivalence slots must be ordered from 1"
        );
      }
      if (
        !Number.isFinite(
          slot.scoreWeight
        ) ||
        slot.scoreWeight <= 0
      ) {
        issues.push(
          `slot ${index + 1} requires a positive scoreWeight`
        );
      }
    }
  );

  const expectedTieBreak =
    SCORING_TIE_BREAK_ORDER;
  const actualTieBreak =
    value.scoringContract
      ?.tieBreakOrder || [];
  if (
    stableJson(
      actualTieBreak
    ) !==
    stableJson(
      expectedTieBreak
    )
  ) {
    issues.push(
      "scoring tie-break order does not match the published contract"
    );
  }

  const variants = Array.isArray(
    value.variants
  )
    ? value.variants
    : [];
  if (!variants.length) {
    issues.push(
      "at least one pre-approved variant is required"
    );
  }

  const variantVersions =
    new Set();
  for (const variant of variants) {
    const variantVersion =
      String(
        variant.variantVersion ||
          ""
      );
    if (
      !variantVersion ||
      variantVersions.has(
        variantVersion
      )
    ) {
      issues.push(
        "variantVersion values must be present and unique"
      );
    }
    variantVersions.add(
      variantVersion
    );

    const questions =
      Array.isArray(
        variant.questions
      )
        ? variant.questions
        : [];
    if (
      questions.length !==
      value.questionCount
    ) {
      issues.push(
        `${variantVersion || "variant"} question count does not match`
      );
      continue;
    }

    const questionIds =
      new Set();
    const answerIds =
      new Set();
    questions.forEach(
      (question, index) => {
        const slot =
          slots[index] || {};
        if (
          question.slot !==
          index + 1
        ) {
          issues.push(
            `${variantVersion} questions must be ordered by slot`
          );
        }
        if (
          question.slot !==
            slot.slot ||
          question.courseId !==
            slot.courseId ||
          question.unitId !==
            slot.unitId ||
          !conceptsEqual(
            question.conceptIds,
            slot.conceptIds
          ) ||
          question.scoreWeight !==
            slot.scoreWeight ||
          question.targetDifficulty !==
            slot.targetDifficulty ||
          question.calibratedDifficulty !==
            slot.calibratedDifficulty ||
          Boolean(
            question.advanced
          ) !==
            Boolean(
              slot.advanced
            )
        ) {
          issues.push(
            `${variantVersion} slot ${index + 1} violates the equivalence contract`
          );
        }

        const questionId =
          String(
            question
              .questionVersionId ||
              ""
          );
        const answerId =
          String(
            question
              .answerVersionId ||
              ""
          );
        if (
          !questionId ||
          questionIds.has(
            questionId
          )
        ) {
          issues.push(
            `${variantVersion} questionVersionIds must be present and unique`
          );
        }
        if (
          !answerId ||
          answerIds.has(
            answerId
          )
        ) {
          issues.push(
            `${variantVersion} answerVersionIds must be present and unique`
          );
        }
        questionIds.add(
          questionId
        );
        answerIds.add(answerId);
        if (
          question.correctAnswer ===
            undefined ||
          question.correctAnswer ===
            null
        ) {
          issues.push(
            `${variantVersion} slot ${index + 1} requires a sealed answer`
          );
        }
      }
    );
  }

  const pairings = Array.isArray(
    value.pairings
  )
    ? value.pairings
    : [];
  if (!pairings.length) {
    issues.push(
      "at least one approved variant pairing is required"
    );
  }
  const pairingVersions =
    new Set();
  for (const pairing of pairings) {
    const version =
      String(
        pairing.pairingVersion ||
          ""
      );
    if (
      !version ||
      pairingVersions.has(version)
    ) {
      issues.push(
        "pairingVersion values must be present and unique"
      );
    }
    pairingVersions.add(version);
    if (
      !variantVersions.has(
        String(
          pairing
            .challengerVariantVersion ||
            ""
        )
      ) ||
      !variantVersions.has(
        String(
          pairing
            .defenderVariantVersion ||
            ""
        )
      )
    ) {
      issues.push(
        `${version || "pairing"} references an unapproved variant`
      );
    }
  }

  return [...new Set(issues)];
}

function positiveFiniteField({
  min = 0,
  max,
} = {}) {
  const field = {
    type: Number,
    required: true,
    min,
    validate: {
      validator:
        Number.isFinite,
      message:
        "{PATH} must be finite",
    },
  };
  if (max !== undefined) {
    field.max = max;
  }
  return field;
}

const choiceSchema =
  new Schema(
    {
      key: {
        type: String,
        trim: true,
        maxlength: 40,
        required: true,
      },
      text: {
        type: String,
        maxlength: 2000,
        required: true,
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const equivalenceSlotSchema =
  new Schema(
    {
      slot: {
        type: Number,
        min: 1,
        required: true,
        validate: {
          validator:
            Number.isSafeInteger,
          message:
            "{PATH} must be an integer",
        },
      },
      courseId: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
      },
      unitId: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
      },
      conceptIds: {
        type: [
          {
            type: String,
            trim: true,
            maxlength: 120,
          },
        ],
        required: true,
        validate: {
          validator: (values) =>
            Array.isArray(values) &&
            values.length > 0,
          message:
            "{PATH} requires curriculum concepts",
        },
      },
      scoreWeight:
        positiveFiniteField({
          min: 0.000001,
        }),
      targetDifficulty:
        positiveFiniteField({
          min: 1,
          max: 5,
        }),
      calibratedDifficulty:
        positiveFiniteField({
          min: 0.000001,
          max: 100,
        }),
      advanced: {
        type: Boolean,
        required: true,
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const scoringContractSchema =
  new Schema(
    {
      calibratedScoreMethodVersion:
        {
          type: String,
          trim: true,
          maxlength: 100,
          required: true,
        },
      advancedThresholdVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
      },
      activeSolveTimePolicyVersion:
        {
          type: String,
          trim: true,
          maxlength: 100,
          required: true,
        },
      extraTieBreakerPolicyVersion:
        {
          type: String,
          trim: true,
          maxlength: 100,
          required: true,
        },
      answerComparisonPolicyVersion:
        {
          type: String,
          trim: true,
          maxlength: 100,
          required: true,
        },
      tieBreakOrder: {
        type: [
          {
            type: String,
            enum:
              SCORING_TIE_BREAK_ORDER,
          },
        ],
        required: true,
        validate: {
          validator: (values) =>
            stableJson(values) ===
            stableJson(
              SCORING_TIE_BREAK_ORDER
            ),
          message:
            "{PATH} must preserve the published order",
        },
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const approvedQuestionSchema =
  new Schema(
    {
      slot: {
        type: Number,
        min: 1,
        required: true,
        validate: {
          validator:
            Number.isSafeInteger,
          message:
            "{PATH} must be an integer",
        },
      },
      questionVersionId: {
        type: String,
        trim: true,
        maxlength: 160,
        required: true,
      },
      answerVersionId: {
        type: String,
        trim: true,
        maxlength: 160,
        required: true,
      },
      courseId: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
      },
      unitId: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
      },
      conceptIds: {
        type: [
          {
            type: String,
            trim: true,
            maxlength: 120,
          },
        ],
        required: true,
      },
      stem: {
        type: String,
        maxlength: 12000,
        required: true,
      },
      choices: {
        type: [choiceSchema],
        default: undefined,
      },
      inputMode: {
        type: String,
        enum:
          ARENA_QUESTION_INPUT_MODES,
        required: true,
      },
      scoreWeight:
        positiveFiniteField({
          min: 0.000001,
        }),
      targetDifficulty:
        positiveFiniteField({
          min: 1,
          max: 5,
        }),
      calibratedDifficulty:
        positiveFiniteField({
          min: 0.000001,
          max: 100,
        }),
      advanced: {
        type: Boolean,
        required: true,
      },
      correctAnswer: {
        type: Schema.Types.Mixed,
        required: true,
      },
      solution: {
        type: String,
        maxlength: 20000,
        default: "",
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const approvedVariantSchema =
  new Schema(
    {
      variantVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
      },
      questions: {
        type: [
          approvedQuestionSchema,
        ],
        required: true,
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const approvedPairingSchema =
  new Schema(
    {
      pairingVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
      },
      challengerVariantVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
      },
      defenderVariantVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const approvalSchema =
  new Schema(
    {
      approvedAt: {
        type: Date,
        required: true,
      },
      approvedBy: {
        type: String,
        trim: true,
        maxlength: 160,
        required: true,
      },
      reviewReference: {
        type: String,
        trim: true,
        maxlength: 200,
        required: true,
      },
      contentHash: {
        type: String,
        lowercase: true,
        match: /^[a-f0-9]{64}$/,
        required: true,
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const arenaQuestionTemplateSetSchema =
  new Schema(
    {
      templateSetVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
        unique: true,
        immutable: true,
      },
      status: {
        type: String,
        enum: ["APPROVED"],
        required: true,
        immutable: true,
      },
      policyVersionId: {
        type:
          Schema.Types.ObjectId,
        ref: "PolicyVersion",
        required: true,
        immutable: true,
        index: true,
      },
      activeRanking: {
        type: String,
        enum:
          ARENA_TAKEOVER_RANKINGS,
        required: true,
        immutable: true,
      },
      matchType: {
        type: String,
        enum:
          ARENA_TAKEOVER_MATCH_TYPES,
        required: true,
        immutable: true,
      },
      curriculumVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
        immutable: true,
      },
      eligibilityPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
        immutable: true,
      },
      eligibleSchoolGrades: {
        type: [
          {
            type: Number,
            min: 1,
            max: 12,
          },
        ],
        required: true,
        immutable: true,
        validate: {
          validator: (values) =>
            Array.isArray(values) &&
            values.length > 0 &&
            values.every(
              Number.isSafeInteger
            ) &&
            new Set(values).size ===
              values.length,
          message:
            "{PATH} requires unique integer grades",
        },
      },
      questionVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
        immutable: true,
      },
      answerKeyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
        immutable: true,
      },
      difficultyCalibrationVersion:
        {
          type: String,
          trim: true,
          maxlength: 100,
          required: true,
          immutable: true,
        },
      scoringPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
        immutable: true,
      },
      questionCount: {
        type: Number,
        min: 1,
        required: true,
        immutable: true,
        validate: {
          validator:
            Number.isSafeInteger,
          message:
            "{PATH} must be an integer",
        },
      },
      timeLimitSeconds: {
        type: Number,
        min: 1,
        required: true,
        immutable: true,
        validate: {
          validator:
            Number.isSafeInteger,
          message:
            "{PATH} must be an integer",
        },
      },
      scoringContract: {
        type:
          scoringContractSchema,
        required: true,
        immutable: true,
      },
      equivalenceSlots: {
        type: [
          equivalenceSlotSchema,
        ],
        required: true,
        immutable: true,
      },
      variants: {
        type: [
          approvedVariantSchema,
        ],
        required: true,
        immutable: true,
        select: false,
      },
      pairings: {
        type: [
          approvedPairingSchema,
        ],
        required: true,
        immutable: true,
      },
      approval: {
        type: approvalSchema,
        required: true,
        immutable: true,
      },
    },
    {
      timestamps: {
        createdAt: true,
        updatedAt: false,
      },
      versionKey: false,
      strict: "throw",
    }
  );

arenaQuestionTemplateSetSchema
  .index(
    {
      policyVersionId: 1,
      activeRanking: 1,
      matchType: 1,
    },
    {
      unique: true,
      name:
        "one_approved_question_set_per_policy_ranking_match_type",
    }
  );

arenaQuestionTemplateSetSchema.pre(
  "validate",
  function validateApprovedSet() {
    if (!this.isNew) {
      throw new ArenaQuestionPackImmutableError(
        "ArenaQuestionTemplateSet",
        "validate/save"
      );
    }
    const issues =
      collectTemplateContractIssues(
        this
      );
    for (
      let index = 0;
      index < issues.length;
      index += 1
    ) {
      this.invalidate(
        `contract.${index}`,
        issues[index]
      );
    }

    const contentHash =
      this.approval
        ?.contentHash;
    if (
      contentHash &&
      contentHash !==
        computeTemplateContentHash(
          this
        )
    ) {
      this.invalidate(
        "approval.contentHash",
        "approval hash does not match the reviewed template content"
      );
    }
  }
);

const publicQuestionSchema =
  new Schema(
    {
      slot: {
        type: Number,
        min: 1,
        required: true,
      },
      questionVersionId: {
        type: String,
        trim: true,
        maxlength: 160,
        required: true,
      },
      stem: {
        type: String,
        maxlength: 12000,
        required: true,
      },
      choices: {
        type: [choiceSchema],
        default: undefined,
      },
      inputMode: {
        type: String,
        enum:
          ARENA_QUESTION_INPUT_MODES,
        required: true,
      },
      scoreWeight:
        positiveFiniteField({
          min: 0.000001,
        }),
      targetDifficulty:
        positiveFiniteField({
          min: 1,
          max: 5,
        }),
      calibratedDifficulty:
        positiveFiniteField({
          min: 0.000001,
          max: 100,
        }),
      advanced: {
        type: Boolean,
        required: true,
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const answerKeySchema =
  new Schema(
    {
      slot: {
        type: Number,
        min: 1,
        required: true,
      },
      questionVersionId: {
        type: String,
        trim: true,
        maxlength: 160,
        required: true,
      },
      answerVersionId: {
        type: String,
        trim: true,
        maxlength: 160,
        required: true,
      },
      correctAnswer: {
        type: Schema.Types.Mixed,
        required: true,
      },
      solution: {
        type: String,
        maxlength: 20000,
        default: "",
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const privateMaterialSchema =
  new Schema(
    {
      rawRandomSeed: {
        type: String,
        minlength: 64,
        maxlength: 128,
        required: true,
      },
      answerKeys: {
        type: [answerKeySchema],
        required: true,
      },
    },
    {
      _id: false,
      strict: "throw",
    }
  );

const arenaQuestionPackSchema =
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
        default: null,
        immutable: true,
      },
      participantRole: {
        type: String,
        enum:
          ARENA_PARTICIPANT_ROLES,
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
      counterpartPackId: {
        type:
          Schema.Types.ObjectId,
        ref: "ArenaQuestionPack",
        required: true,
        immutable: true,
      },
      packVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
        immutable: true,
      },
      templateSetId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "ArenaQuestionTemplateSet",
        required: true,
        immutable: true,
      },
      templateSetVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
        immutable: true,
      },
      approvedPairingVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
        immutable: true,
      },
      approvedVariantVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
        immutable: true,
      },
      approvalContentHash: {
        type: String,
        lowercase: true,
        match: /^[a-f0-9]{64}$/,
        required: true,
        immutable: true,
      },
      curriculumVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
        immutable: true,
      },
      questionVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
        immutable: true,
      },
      questionVersionIds: {
        type: [
          {
            type: String,
            trim: true,
            maxlength: 160,
          },
        ],
        required: true,
        immutable: true,
      },
      answerKeyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
        immutable: true,
        select: false,
      },
      answerVersionIds: {
        type: [
          {
            type: String,
            trim: true,
            maxlength: 160,
          },
        ],
        required: true,
        immutable: true,
        select: false,
      },
      difficultyCalibrationVersion:
        {
          type: String,
          trim: true,
          maxlength: 100,
          required: true,
          immutable: true,
        },
      scoringPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
        immutable: true,
      },
      eligibilityPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
        immutable: true,
      },
      randomSeedHash: {
        type: String,
        lowercase: true,
        match: /^[a-f0-9]{64}$/,
        required: true,
        immutable: true,
      },
      equivalenceContractHash: {
        type: String,
        lowercase: true,
        match: /^[a-f0-9]{64}$/,
        required: true,
        immutable: true,
      },
      pairSealHash: {
        type: String,
        lowercase: true,
        match: /^[a-f0-9]{64}$/,
        required: true,
        immutable: true,
      },
      questionCount: {
        type: Number,
        min: 1,
        required: true,
        immutable: true,
        validate: {
          validator:
            Number.isSafeInteger,
          message:
            "{PATH} must be an integer",
        },
      },
      timeLimitSeconds: {
        type: Number,
        min: 1,
        required: true,
        immutable: true,
        validate: {
          validator:
            Number.isSafeInteger,
          message:
            "{PATH} must be an integer",
        },
      },
      scoringContract: {
        type:
          scoringContractSchema,
        required: true,
        immutable: true,
      },
      equivalenceSlots: {
        type: [
          equivalenceSlotSchema,
        ],
        required: true,
        immutable: true,
      },
      publicQuestions: {
        type: [
          publicQuestionSchema,
        ],
        required: true,
        immutable: true,
      },
      privateMaterial: {
        type:
          privateMaterialSchema,
        required: true,
        immutable: true,
        select: false,
      },
      sealedAt: {
        type: Date,
        required: true,
        immutable: true,
      },
      sealedContentHash: {
        type: String,
        lowercase: true,
        match: /^[a-f0-9]{64}$/,
        required: true,
        immutable: true,
      },
    },
    {
      timestamps: {
        createdAt: true,
        updatedAt: false,
      },
      versionKey: false,
      strict: "throw",
    }
  );

arenaQuestionPackSchema.index(
  {
    matchId: 1,
    participantRole: 1,
  },
  {
    unique: true,
    name:
      "one_sealed_pack_per_match_participant_role",
  }
);

arenaQuestionPackSchema.index(
  {
    matchId: 1,
    participantRole: 1,
    packVersion: 1,
  },
  {
    unique: true,
    name:
      "one_sealed_pack_per_match_role_version",
  }
);

arenaQuestionPackSchema.pre(
  "validate",
  function validateSealedPack() {
    if (!this.isNew) {
      throw new ArenaQuestionPackImmutableError(
        "ArenaQuestionPack",
        "validate/save"
      );
    }
    if (
      this.questionCount !==
        this.questionVersionIds
          ?.length ||
      this.questionCount !==
        this.answerVersionIds
          ?.length ||
      this.questionCount !==
        this.publicQuestions
          ?.length ||
      this.questionCount !==
        this.privateMaterial
          ?.answerKeys
          ?.length ||
      this.questionCount !==
        this.equivalenceSlots
          ?.length
    ) {
      this.invalidate(
        "questionCount",
        "all sealed question and answer arrays must match questionCount"
      );
    }

    for (
      let index = 0;
      index < this.questionCount;
      index += 1
    ) {
      const publicQuestion =
        this.publicQuestions?.[
          index
        ];
      const answerKey =
        this.privateMaterial
          ?.answerKeys?.[index];
      if (
        !publicQuestion ||
        !answerKey ||
        publicQuestion
          .questionVersionId !==
          this.questionVersionIds?.[
            index
          ] ||
        answerKey
          .questionVersionId !==
          this.questionVersionIds?.[
            index
          ] ||
        answerKey
          .answerVersionId !==
          this.answerVersionIds?.[
            index
          ]
      ) {
        this.invalidate(
          `publicQuestions.${index}`,
          "sealed question and answer versions must align by slot"
        );
      }
    }

    if (
      this.privateMaterial
        ?.rawRandomSeed &&
      sha256(
        this.privateMaterial
          .rawRandomSeed
      ) !== this.randomSeedHash
    ) {
      this.invalidate(
        "randomSeedHash",
        "randomSeedHash does not match private seed material"
      );
    }

    if (
      this.sealedContentHash &&
      this.sealedContentHash !==
        computePackSealedContentHash(
          this
        )
    ) {
      this.invalidate(
        "sealedContentHash",
        "sealed content hash does not match pack material"
      );
    }
  }
);

arenaQuestionPackSchema.pre(
  "save",
  function rejectPackResave() {
    if (!this.isNew) {
      throw new ArenaQuestionPackImmutableError(
        "ArenaQuestionPack",
        "save"
      );
    }
  }
);

arenaQuestionTemplateSetSchema.pre(
  "save",
  function rejectTemplateResave() {
    if (!this.isNew) {
      throw new ArenaQuestionPackImmutableError(
        "ArenaQuestionTemplateSet",
        "save"
      );
    }
  }
);

function installAppendOnlyHooks(
  schema,
  modelName
) {
  const operations = [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "findOneAndReplace",
    "replaceOne",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
  ];
  for (const operation of operations) {
    schema.pre(
      operation,
      function rejectMutation() {
        throw new ArenaQuestionPackImmutableError(
          modelName,
          operation
        );
      }
    );
  }
  schema.pre(
    "bulkWrite",
    function rejectBulkMutation() {
      throw new ArenaQuestionPackImmutableError(
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
        throw new ArenaQuestionPackImmutableError(
          modelName,
          `document.${operation}`
        );
      }
    );
  }
}

installAppendOnlyHooks(
  arenaQuestionTemplateSetSchema,
  "ArenaQuestionTemplateSet"
);
installAppendOnlyHooks(
  arenaQuestionPackSchema,
  "ArenaQuestionPack"
);

const ArenaQuestionTemplateSet =
  mongoose.models
    .ArenaQuestionTemplateSet ||
  mongoose.model(
    "ArenaQuestionTemplateSet",
    arenaQuestionTemplateSetSchema
  );

const ArenaQuestionPack =
  mongoose.models
    .ArenaQuestionPack ||
  mongoose.model(
    "ArenaQuestionPack",
    arenaQuestionPackSchema
  );

module.exports = {
  ARENA_PARTICIPANT_ROLES,
  ARENA_QUESTION_INPUT_MODES,
  ARENA_TAKEOVER_MATCH_TYPES,
  ARENA_TAKEOVER_RANKINGS,
  SCORING_TIE_BREAK_ORDER,
  ArenaQuestionPack,
  ArenaQuestionPackImmutableError,
  ArenaQuestionTemplateSet,
  collectTemplateContractIssues,
  computePackSealedContentHash,
  computeTemplateContentHash,
  sha256,
  stableJson,
};
