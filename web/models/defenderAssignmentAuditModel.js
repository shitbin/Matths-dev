const mongoose = require("mongoose");

const { Schema } = mongoose;

const ASSIGNMENT_AUDIT_STATUSES =
  Object.freeze([
    "SELECTED",
    "NO_CANDIDATE",
  ]);

const sha256Pattern = /^[a-f0-9]{64}$/;
const dateKeyPattern =
  /^\d{4}-\d{2}-\d{2}$/;

function finiteNumberField({
  min = null,
  max = null,
  defaultValue = null,
} = {}) {
  const field = {
    type: Number,
    default: defaultValue,
    validate: {
      validator(value) {
        if (value === null) {
          return true;
        }
        if (
          typeof value !== "number" ||
          !Number.isFinite(value)
        ) {
          return false;
        }
        if (
          min !== null &&
          value < min
        ) {
          return false;
        }
        if (
          max !== null &&
          value > max
        ) {
          return false;
        }
        return true;
      },
      message:
        "{PATH} must be a finite number in the allowed range",
    },
  };
  return field;
}

function nonNegativeIntegerField() {
  return {
    type: Number,
    min: 0,
    required: true,
    validate: {
      validator:
        Number.isSafeInteger,
      message:
        "{PATH} must be a non-negative integer",
    },
  };
}

const eligibilitySchema =
  new Schema(
    {
      sameSeason: {
        type: Boolean,
        required: true,
      },
      subRanking: {
        type: Boolean,
        required: true,
      },
      activeSeat: {
        type: Boolean,
        required: true,
      },
      higherPosition: {
        type: Boolean,
        required: true,
      },
      inAllowedRankRange: {
        type: Boolean,
        required: true,
      },
      accountActive: {
        type: Boolean,
        required: true,
      },
      placementComplete: {
        type: Boolean,
        required: true,
      },
      activeSubCycle: {
        type: Boolean,
        required: true,
      },
      samePolicyVersion: {
        type: Boolean,
        required: true,
      },
      noActiveMatch: {
        type: Boolean,
        required: true,
      },
      notProtected: {
        type: Boolean,
        required: true,
      },
      notShielded: {
        type: Boolean,
        required: true,
      },
      pairCooldownClear: {
        type: Boolean,
        required: true,
      },
      strongRelationClear: {
        type: Boolean,
        required: true,
      },
      recentlyActive: {
        type: Boolean,
        required: true,
      },
      integrityClear: {
        type: Boolean,
        required: true,
      },
      // Main Shop 방어 휴식권 효과 판별 (docs/logic/12_SHOP.md §5.2).
      defenseRestClear: {
        type: Boolean,
        required: true,
      },
      belowAssignmentCap: {
        type: Boolean,
        required: true,
      },
      dailyAssignmentSlotOpen: {
        type: Boolean,
        required: true,
      },
      canSettleBeforeDeadline: {
        type: Boolean,
        required: true,
      },
    },
    {
      _id: false,
    }
  );

const assignmentMetricsSchema =
  new Schema(
    {
      defenseAssignmentsInCycle:
        nonNegativeIntegerField(),
      completedSubChallenges:
        nonNegativeIntegerField(),
      assignmentCap:
        nonNegativeIntegerField(),
      lastDefenseAssignedAt: {
        type: Date,
        default: null,
      },
      assignmentBalance:
        finiteNumberField({
          min: 0,
        }),
      recency: finiteNumberField({
        min: 0,
        max: 1,
      }),
      activityMultiplier:
        finiteNumberField({
          min: 0,
          max: 1,
        }),
      auditJitter:
        finiteNumberField({
          min: 0,
        }),
      rawWeight:
        finiteNumberField({
          min: 0,
        }),
      probability:
        finiteNumberField({
          min: 0,
          max: 1,
        }),
    },
    {
      _id: false,
    }
  );

const candidateSnapshotSchema =
  new Schema(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      cycleId: {
        type: Schema.Types.ObjectId,
        ref: "AccessCycleLifecycle",
        default: null,
      },
      arenaPosition: {
        type: Number,
        min: 1,
        required: true,
        validate: {
          validator:
            Number.isSafeInteger,
          message:
            "candidate position must be an integer",
        },
      },
      eligible: {
        type: Boolean,
        required: true,
      },
      eligibility: {
        type: eligibilitySchema,
        required: true,
      },
      exclusionCodes: {
        type: [
          {
            type: String,
            trim: true,
            maxlength: 80,
          },
        ],
        default: [],
      },
      activityPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },
      metrics: {
        type:
          assignmentMetricsSchema,
        required: true,
      },
    },
    {
      _id: false,
    }
  );

const assignmentPolicySnapshotSchema =
  new Schema(
    {
      alpha: finiteNumberField({
        min: 0,
      }),
      targetDefenseGapHours:
        finiteNumberField({
          min: Number.MIN_VALUE,
        }),
      auditJitterMin:
        finiteNumberField({
          min: Number.MIN_VALUE,
        }),
      auditJitterMax:
        finiteNumberField({
          min: Number.MIN_VALUE,
        }),
      defenseAssignmentCapOffset:
        nonNegativeIntegerField(),
      maxDefenseAssignmentsPerDay:
        nonNegativeIntegerField(),
      sameOpponentCooldownDays:
        nonNegativeIntegerField(),
      minHigherPositionGap: {
        type: Number,
        min: 1,
        required: true,
        validate: {
          validator:
            Number.isSafeInteger,
          message:
            "minimum rank gap must be an integer",
        },
      },
      maxHigherPositionGap: {
        type: Number,
        min: 1,
        required: true,
        validate: {
          validator:
            Number.isSafeInteger,
          message:
            "maximum rank gap must be an integer",
        },
      },
      rankRangePolicyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
      },
      activityPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
      },
      settlementPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
      },
      strongRelationPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
      },
      integrityPolicyVersion: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
      },
    },
    {
      _id: false,
    }
  );

const defenderAssignmentAuditSchema =
  new Schema(
    {
      requestId: {
        type: String,
        trim: true,
        maxlength: 160,
        required: true,
        immutable: true,
      },
      requestFingerprint: {
        type: String,
        match: sha256Pattern,
        required: true,
        immutable: true,
      },
      policyVersionId: {
        type: Schema.Types.ObjectId,
        ref: "PolicyVersion",
        required: true,
        immutable: true,
        index: true,
      },
      policyVersion: {
        type: String,
        trim: true,
        maxlength: 80,
        required: true,
        immutable: true,
      },
      seasonId: {
        type: Schema.Types.ObjectId,
        ref: "ArenaSeason",
        required: true,
        immutable: true,
        index: true,
      },
      challengerUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
        index: true,
      },
      challengerCycleId: {
        type: Schema.Types.ObjectId,
        ref: "AccessCycleLifecycle",
        required: true,
        immutable: true,
      },
      challengerPosition: {
        type: Number,
        min: 1,
        required: true,
        immutable: true,
        validate: {
          validator:
            Number.isSafeInteger,
          message:
            "challenger position must be an integer",
        },
      },
      status: {
        type: String,
        enum:
          ASSIGNMENT_AUDIT_STATUSES,
        required: true,
        immutable: true,
        index: true,
      },
      assignmentDateKeyKst: {
        type: String,
        match: dateKeyPattern,
        required: true,
        immutable: true,
      },
      selectionSeed: {
        type: String,
        match: sha256Pattern,
        required: true,
        immutable: true,
        select: false,
      },
      selectionSeedHash: {
        type: String,
        match: sha256Pattern,
        required: true,
        immutable: true,
      },
      candidateSnapshotHash: {
        type: String,
        match: sha256Pattern,
        required: true,
        immutable: true,
      },
      selectionDraw: {
        ...finiteNumberField({
          min: 0,
          max: 1,
        }),
        required: true,
        immutable: true,
      },
      policySnapshot: {
        type:
          assignmentPolicySnapshotSchema,
        required: true,
        immutable: true,
      },
      candidates: {
        type: [
          candidateSnapshotSchema,
        ],
        default: [],
        immutable: true,
      },
      selectedDefenderUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
        immutable: true,
        index: true,
      },
      selectedDefenderCycleId: {
        type: Schema.Types.ObjectId,
        ref: "AccessCycleLifecycle",
        default: null,
        immutable: true,
      },
      selectedDefenderPosition: {
        type: Number,
        min: 1,
        default: null,
        immutable: true,
      },
      selectedAt: {
        type: Date,
        required: true,
        immutable: true,
      },
      auditSchemaVersion: {
        type: Number,
        min: 1,
        max: 1,
        default: 1,
        immutable: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

defenderAssignmentAuditSchema.index({
  seasonId: 1,
  selectedDefenderUserId: 1,
  selectedAt: -1,
});
defenderAssignmentAuditSchema.index({
  challengerCycleId: 1,
  selectedAt: -1,
});
defenderAssignmentAuditSchema.index({
  selectedDefenderCycleId: 1,
  assignmentDateKeyKst: 1,
  status: 1,
});
defenderAssignmentAuditSchema.index(
  {
    challengerUserId: 1,
    requestId: 1,
  },
  {
    unique: true,
    name:
      "challenger_request_id_unique",
  }
);

defenderAssignmentAuditSchema.pre(
  "validate",
  function validateAudit() {
    const probabilities =
      (this.candidates || [])
        .map(
          (candidate) =>
            candidate.metrics
              ?.probability || 0
        );
    const probabilitySum =
      probabilities.reduce(
        (sum, value) =>
          sum + value,
        0
      );

    if (
      this.policySnapshot &&
      this.policySnapshot
        .auditJitterMin >
        this.policySnapshot
          .auditJitterMax
    ) {
      this.invalidate(
        "policySnapshot.auditJitterMax",
        "audit jitter max must be greater than or equal to min"
      );
    }
    if (
      this.policySnapshot &&
      this.policySnapshot
        .minHigherPositionGap >
        this.policySnapshot
          .maxHigherPositionGap
    ) {
      this.invalidate(
        "policySnapshot.maxHigherPositionGap",
        "maximum rank gap must be greater than or equal to minimum"
      );
    }

    if (
      this.status === "SELECTED"
    ) {
      if (
        !this
          .selectedDefenderUserId ||
        !this
          .selectedDefenderCycleId ||
        !Number.isSafeInteger(
          this
            .selectedDefenderPosition
        )
      ) {
        this.invalidate(
          "selectedDefenderUserId",
          "selected assignment requires a complete defender reference"
        );
      }
      if (
        Math.abs(
          probabilitySum - 1
        ) > 1e-9
      ) {
        this.invalidate(
          "candidates",
          "selected candidate probabilities must sum to one"
        );
      }
      const selected =
        (this.candidates || []).find(
          (candidate) =>
            String(
              candidate.userId
            ) ===
            String(
              this
                .selectedDefenderUserId
            )
        );
      if (
        !selected ||
        !selected.eligible ||
        selected.metrics
          .probability <= 0
      ) {
        this.invalidate(
          "selectedDefenderUserId",
          "selected defender must be an eligible candidate with positive probability"
        );
      }
    } else {
      if (
        this
          .selectedDefenderUserId ||
        this
          .selectedDefenderCycleId ||
        this
          .selectedDefenderPosition !==
          null
      ) {
        this.invalidate(
          "selectedDefenderUserId",
          "no-candidate audit cannot retain a selected defender"
        );
      }
      if (
        Math.abs(
          probabilitySum
        ) > 1e-12
      ) {
        this.invalidate(
          "candidates",
          "no-candidate probabilities must all be zero"
        );
      }
    }
  }
);

const DefenderAssignmentAudit =
  mongoose.models
    .DefenderAssignmentAudit ||
  mongoose.model(
    "DefenderAssignmentAudit",
    defenderAssignmentAuditSchema
  );

module.exports = {
  ASSIGNMENT_AUDIT_STATUSES,
  DefenderAssignmentAudit,
};
