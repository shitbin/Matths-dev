const mongoose = require(
  "mongoose"
);

// Legacy RankTakeover compatibility storage only. The production authority is
// goatArenaModel.ArenaRevengeRight; never share its model or collection name.

const { Schema } = mongoose;

const REVENGE_RIGHT_STATUSES =
  Object.freeze([
    "AVAILABLE",
    "CONSUMED",
    "EXPIRED",
    "INVALID",
  ]);

const REVENGE_RIGHT_HISTORY_REASONS =
  Object.freeze([
    "EARNED_FROM_SEAT_LOSS",
    "CONSUMED_BY_REVENGE_MATCH",
    "RIGHT_WINDOW_ELAPSED",
    "SOURCE_MATCH_HELD",
    "SOURCE_MATCH_INVALID",
    "SOURCE_RESULT_CORRECTED",
    "SOURCE_MATCH_MISSING",
    "SOURCE_IDENTITY_MISMATCH",
    "MANUAL_INTEGRITY_REVOCATION",
  ]);

const INVALIDATION_REASON_CODES =
  Object.freeze(
    REVENGE_RIGHT_HISTORY_REASONS.filter(
      (reason) =>
        ![
          "EARNED_FROM_SEAT_LOSS",
          "CONSUMED_BY_REVENGE_MATCH",
          "RIGHT_WINDOW_ELAPSED",
        ].includes(reason)
    )
  );

const STATUS_TRANSITIONS =
  Object.freeze({
    AVAILABLE: Object.freeze([
      "CONSUMED",
      "EXPIRED",
      "INVALID",
    ]),
    CONSUMED:
      Object.freeze([
        "INVALID",
      ]),
    EXPIRED:
      Object.freeze([
        "INVALID",
      ]),
    INVALID:
      Object.freeze([]),
  });

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
        "{PATH} must be an integer",
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

function sameId(
  left,
  right
) {
  return Boolean(
    left &&
      right &&
      String(left) ===
        String(right)
  );
}

function plainHistoryEntry(
  entry
) {
  const value =
    typeof entry?.toObject ===
    "function"
      ? entry.toObject({
          depopulate: true,
          versionKey: false,
        })
      : entry;
  return JSON.stringify(
    value
  );
}

const revengeRightHistorySchema =
  new Schema(
    {
      status: {
        type: String,
        enum:
          REVENGE_RIGHT_STATUSES,
        required: true,
      },
      reasonCode: {
        type: String,
        enum:
          REVENGE_RIGHT_HISTORY_REASONS,
        required: true,
      },
      occurredAt: {
        type: Date,
        required: true,
      },
      relatedMatchId: {
        type: String,
        trim: true,
        maxlength: 160,
        default: null,
      },
    },
    {
      _id: false,
    }
  );

const arenaRevengeRightSchema =
  new Schema(
    {
      rightId: {
        type: String,
        trim: true,
        maxlength: 180,
        required: true,
        immutable: true,
      },
      sourceMatchId: {
        type: String,
        trim: true,
        maxlength: 160,
        required: true,
        immutable: true,
      },
      sourceMatchDocumentId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "RankTakeoverMatch",
        required: true,
        immutable: true,
      },
      sourceSettlementVersion: {
        ...safeIntegerField({
          min: 1,
          required: true,
        }),
        immutable: true,
      },
      sourceMatchType: {
        type: String,
        enum: [
          "NORMAL",
          "REVENGE",
        ],
        required: true,
        immutable: true,
      },

      seasonId: {
        type:
          Schema.Types.ObjectId,
        ref: "ArenaSeason",
        required: true,
        immutable: true,
        index: true,
      },
      policyVersionId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "PolicyVersion",
        required: true,
        immutable: true,
        index: true,
      },
      rankingType: {
        type: String,
        enum: [
          "SUB",
          "MAIN",
        ],
        required: true,
        immutable: true,
        index: true,
      },

      entitledUserId: {
        type:
          Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
        index: true,
      },
      targetUserId: {
        type:
          Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
        index: true,
      },
      entitledCycleId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "AccessCycleLifecycle",
        required: true,
        immutable: true,
      },
      targetCycleId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "AccessCycleLifecycle",
        required: true,
        immutable: true,
      },

      sourceNormalStakeDays: {
        ...safeIntegerField({
          min: 1,
          required: true,
        }),
        immutable: true,
      },
      revengeStakeDays: {
        ...safeIntegerField({
          min: 2,
          required: true,
        }),
        immutable: true,
      },
      revengeFeeBurnDays: {
        ...safeIntegerField({
          min: 1,
          required: true,
        }),
        immutable: true,
      },

      earnedAt: {
        type: Date,
        required: true,
        immutable: true,
      },
      issuedAt: {
        type: Date,
        required: true,
        immutable: true,
      },
      expiresAt: {
        type: Date,
        required: true,
        immutable: true,
        index: true,
      },
      status: {
        type: String,
        enum:
          REVENGE_RIGHT_STATUSES,
        required: true,
        default: "AVAILABLE",
        index: true,
      },

      consumedByMatchId: {
        type: String,
        trim: true,
        maxlength: 160,
        default: null,
      },
      consumedByMatchDocumentId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "RankTakeoverMatch",
        default: null,
      },
      consumedAt: {
        type: Date,
        default: null,
      },
      expiredAt: {
        type: Date,
        default: null,
      },
      invalidatedAt: {
        type: Date,
        default: null,
      },
      invalidationReasonCode: {
        type: String,
        enum: [
          ...INVALIDATION_REASON_CODES,
          null,
        ],
        default: null,
      },

      stateHistory: {
        type: [
          revengeRightHistorySchema,
        ],
        required: true,
        default: undefined,
      },
    },
    {
      timestamps: true,
      versionKey: "version",
      optimisticConcurrency: true,
    }
  );

arenaRevengeRightSchema.index(
  {
    rightId: 1,
  },
  {
    unique: true,
    name:
      "one_revenge_right_per_public_id",
  }
);

arenaRevengeRightSchema.index(
  {
    sourceMatchId: 1,
  },
  {
    unique: true,
    name:
      "one_revenge_right_per_source_match",
  }
);

arenaRevengeRightSchema.index(
  {
    sourceMatchDocumentId: 1,
  },
  {
    unique: true,
    name:
      "one_revenge_right_per_source_document",
  }
);

arenaRevengeRightSchema.index(
  {
    sourceMatchId: 1,
    entitledUserId: 1,
  },
  {
    unique: true,
    name:
      "one_revenge_right_per_source_and_loser",
  }
);

arenaRevengeRightSchema.index(
  {
    consumedByMatchId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      consumedByMatchId: {
        $type: "string",
      },
    },
    name:
      "one_revenge_right_per_consuming_match",
  }
);

arenaRevengeRightSchema.index({
  entitledUserId: 1,
  seasonId: 1,
  rankingType: 1,
  status: 1,
  expiresAt: 1,
});

arenaRevengeRightSchema.post(
  "init",
  function rememberOriginalHistory(
    document
  ) {
    document.$locals
      .originalStateHistory =
      document.stateHistory.map(
        plainHistoryEntry
      );
  }
);

arenaRevengeRightSchema.pre(
  "validate",
  function validateRevengeRight() {
    if (
      sameId(
        this.entitledUserId,
        this.targetUserId
      )
    ) {
      this.invalidate(
        "targetUserId",
        "entitled user and target user must differ"
      );
    }
    if (
      sameId(
        this.entitledCycleId,
        this.targetCycleId
      )
    ) {
      this.invalidate(
        "targetCycleId",
        "entitled and target cycles must differ"
      );
    }
    if (
      this.earnedAt &&
      this.expiresAt &&
      this.expiresAt <=
        this.earnedAt
    ) {
      this.invalidate(
        "expiresAt",
        "RevengeRight must expire after it is earned"
      );
    }
    if (
      this.sourceNormalStakeDays +
        this
          .revengeFeeBurnDays !==
      this.revengeStakeDays
    ) {
      this.invalidate(
        "revengeStakeDays",
        "revenge stake must equal the normal stake plus the snapshotted burn fee"
      );
    }

    const history =
      this.stateHistory || [];
    if (history.length === 0) {
      this.invalidate(
        "stateHistory",
        "RevengeRight requires an append-only state history"
      );
      return;
    }
    if (
      history[0].status !==
        "AVAILABLE" ||
      history[0].reasonCode !==
        "EARNED_FROM_SEAT_LOSS"
    ) {
      this.invalidate(
        "stateHistory",
        "RevengeRight history must begin with the eligible seat-loss event"
      );
    }
    if (
      history[
        history.length - 1
      ].status !== this.status
    ) {
      this.invalidate(
        "stateHistory",
        "current status must equal the last history status"
      );
    }
    for (
      let index = 1;
      index < history.length;
      index += 1
    ) {
      const previous =
        history[index - 1];
      const current =
        history[index];
      if (
        !STATUS_TRANSITIONS[
          previous.status
        ]?.includes(
          current.status
        )
      ) {
        this.invalidate(
          "stateHistory",
          `invalid RevengeRight transition ${previous.status} -> ${current.status}`
        );
      }
      if (
        current.occurredAt <
        previous.occurredAt
      ) {
        this.invalidate(
          "stateHistory",
          "RevengeRight history timestamps must be monotonic"
        );
      }
    }

    const original =
      this.$locals
        .originalStateHistory;
    if (
      !this.isNew &&
      Array.isArray(original) &&
      this.isModified(
        "stateHistory"
      )
    ) {
      const current =
        history.map(
          plainHistoryEntry
        );
      const prefixChanged =
        current.length <
          original.length ||
        original.some(
          (entry, index) =>
            current[index] !==
            entry
        );
      if (prefixChanged) {
        this.invalidate(
          "stateHistory",
          "RevengeRight state history is append-only"
        );
      }
    }

    if (
      this.status ===
      "AVAILABLE"
    ) {
      if (
        this.consumedAt ||
        this.consumedByMatchId ||
        this
          .consumedByMatchDocumentId ||
        this.expiredAt ||
        this.invalidatedAt ||
        this
          .invalidationReasonCode
      ) {
        this.invalidate(
          "status",
          "available right cannot contain terminal state fields"
        );
      }
    } else if (
      this.status ===
      "CONSUMED"
    ) {
      if (
        !this.consumedAt ||
        !this.consumedByMatchId ||
        !this
          .consumedByMatchDocumentId
      ) {
        this.invalidate(
          "consumedAt",
          "consumed right requires its consuming match and timestamp"
        );
      }
    } else if (
      this.status ===
      "EXPIRED"
    ) {
      if (!this.expiredAt) {
        this.invalidate(
          "expiredAt",
          "expired right requires expiredAt"
        );
      }
      if (
        this.consumedAt ||
        this.consumedByMatchId ||
        this
          .consumedByMatchDocumentId
      ) {
        this.invalidate(
          "consumedAt",
          "expired right cannot be consumed"
        );
      }
    } else if (
      this.status ===
      "INVALID"
    ) {
      if (
        !this.invalidatedAt ||
        !this
          .invalidationReasonCode
      ) {
        this.invalidate(
          "invalidatedAt",
          "invalid right requires a timestamp and reason"
        );
      }
    }
  }
);

function touchesHistory(
  value
) {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }
  return Object.keys(
    value
  ).some(
    (key) =>
      key === "stateHistory" ||
      key.startsWith(
        "stateHistory."
      )
  );
}

arenaRevengeRightSchema.pre(
  [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "replaceOne",
  ],
  function guardHistoryUpdates() {
    const update =
      this.getUpdate() || {};
    if (
      Object.prototype
        .hasOwnProperty.call(
          update,
          "stateHistory"
        )
    ) {
      throw new Error(
        "RevengeRight stateHistory cannot be replaced"
      );
    }
    for (const [
      operator,
      value,
    ] of Object.entries(
      update
    )) {
      if (
        operator === "$push"
      ) {
        if (
          touchesHistory(
            value
          )
        ) {
          const mutation =
            value.stateHistory;
          if (
            !mutation ||
            typeof mutation !==
              "object" ||
            Array.isArray(
              mutation
            ) ||
            [
              "$position",
              "$slice",
              "$sort",
            ].some(
              (modifier) =>
                Object.prototype
                  .hasOwnProperty.call(
                    mutation,
                    modifier
                  )
            )
          ) {
            throw new Error(
              "RevengeRight stateHistory accepts append-only push operations"
            );
          }
        }
        continue;
      }
      if (
        touchesHistory(
          value
        )
      ) {
        throw new Error(
          "RevengeRight stateHistory is append-only"
        );
      }
    }

    const nextStatus =
      update.status ||
      update.$set?.status;
    const appendedStatus =
      update.$push
        ?.stateHistory
        ?.status;
    if (
      nextStatus &&
      appendedStatus !==
        nextStatus
    ) {
      throw new Error(
        "RevengeRight status changes require a matching appended history event"
      );
    }
    if (
      appendedStatus &&
      nextStatus !==
        appendedStatus
    ) {
      throw new Error(
        "RevengeRight history events require the matching status transition"
      );
    }
  }
);

const RankTakeoverRevengeRight =
  mongoose.models
    .RankTakeoverRevengeRight ||
  mongoose.model(
    "RankTakeoverRevengeRight",
    arenaRevengeRightSchema,
    "ranktakeoverrevengerights"
  );

module.exports = {
  RankTakeoverRevengeRight,
  INVALIDATION_REASON_CODES,
  REVENGE_RIGHT_HISTORY_REASONS,
  REVENGE_RIGHT_STATUSES,
  STATUS_TRANSITIONS,
};
