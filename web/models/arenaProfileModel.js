const mongoose = require("mongoose");

const { Schema } = mongoose;

const ARENA_RANKING_TYPES = Object.freeze([
  "SUB",
  "MAIN",
]);

const ARENA_PROFILE_STATUSES = Object.freeze([
  "PLACEMENT_PENDING",
  "ACTIVE",
  "HIDDEN",
  "SETTLING",
  "CLOSED",
]);

const SEATED_PROFILE_STATUSES = Object.freeze([
  "ACTIVE",
  "HIDDEN",
  "SETTLING",
]);

const seedSnapshotFields = Object.freeze([
  "mmrAtLastSeed",
  "seededAt",
  "seedWeekKey",
]);

function owns(object, key) {
  return Object.prototype.hasOwnProperty.call(
    object || {},
    key
  );
}

function arenaProfileMutationError(
  code,
  message
) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function fieldMutation(update, field) {
  const mutations = [];

  if (owns(update, field)) {
    mutations.push({
      operator: "$set",
      value: update[field],
    });
  }

  for (const [operator, payload] of Object.entries(
    update
  )) {
    if (
      !operator.startsWith("$") ||
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      continue;
    }

    if (owns(payload, field)) {
      mutations.push({
        operator,
        value:
          operator === "$unset"
            ? null
            : payload[field],
      });
    }

    if (
      operator === "$rename" &&
      Object.values(payload).includes(field)
    ) {
      mutations.push({
        operator,
        value: field,
      });
    }
  }

  if (mutations.length === 0) {
    return {
      touched: false,
      clears: false,
      value: undefined,
    };
  }
  if (mutations.length > 1) {
    throw arenaProfileMutationError(
      "AMBIGUOUS_ARENA_PROFILE_MUTATION",
      `${field} cannot be changed by multiple update operators`
    );
  }

  const mutation = mutations[0];
  if (
    ![
      "$set",
      "$unset",
    ].includes(mutation.operator)
  ) {
    throw arenaProfileMutationError(
      "UNSUPPORTED_ARENA_PROFILE_MUTATION",
      `${field} must use an explicit set or unset`
    );
  }

  return {
    touched: true,
    operator: mutation.operator,
    value: mutation.value,
    clears:
      mutation.operator === "$unset" ||
      (mutation.operator === "$set" &&
        mutation.value === null),
  };
}

function assertSafeArenaProfileUpdate({
  filter = {},
  update = {},
  replacement = false,
} = {}) {
  if (
    !update ||
    typeof update !== "object" ||
    Array.isArray(update)
  ) {
    throw arenaProfileMutationError(
      "ARENA_PROFILE_UPDATE_NOT_SUPPORTED",
      "ArenaProfile update must be an object"
    );
  }

  if (replacement) {
    if (
      update.rankShieldUntil !== null &&
      update.rankShieldUntil !== undefined &&
      update.activeRanking !== "MAIN"
    ) {
      throw arenaProfileMutationError(
        "SUB_RANK_SHIELD_FORBIDDEN",
        "Rank Shield is available only in Main"
      );
    }

    const isSeated =
      SEATED_PROFILE_STATUSES.includes(
        update.status
      );
    if (
      isSeated &&
      (!Number.isSafeInteger(
        update.arenaPosition
      ) ||
        update.mmrAtLastSeed === null ||
        update.mmrAtLastSeed === undefined ||
        !update.seededAt ||
        !update.seedWeekKey)
    ) {
      throw arenaProfileMutationError(
        "INCOMPLETE_ARENA_SEED_SNAPSHOT",
        "seated replacement requires its seat and complete seed snapshot"
      );
    }
    if (
      !isSeated &&
      update.arenaPosition !== null &&
      update.arenaPosition !== undefined
    ) {
      throw arenaProfileMutationError(
        "UNSEATED_ARENA_POSITION_FORBIDDEN",
        "unseated replacement cannot retain a seat"
      );
    }

    const replacementSeedFields =
      seedSnapshotFields.filter((field) =>
        owns(update, field)
      );
    if (
      replacementSeedFields.length > 0 &&
      replacementSeedFields.length !==
        seedSnapshotFields.length
    ) {
      throw arenaProfileMutationError(
        "INCOMPLETE_ARENA_SEED_SNAPSHOT",
        "seed MMR, timestamp, and week key must be replaced together"
      );
    }
    return;
  }

  const shieldMutation = fieldMutation(
    update,
    "rankShieldUntil"
  );
  const rankingMutation = fieldMutation(
    update,
    "activeRanking"
  );

  if (
    shieldMutation.touched &&
    !shieldMutation.clears &&
    shieldMutation.value !== undefined &&
    (filter.activeRanking !== "MAIN" ||
      (rankingMutation.touched &&
        rankingMutation.value !== "MAIN"))
  ) {
    throw arenaProfileMutationError(
      "MAIN_RANKING_CAS_REQUIRED",
      "setting Rank Shield requires an activeRanking MAIN condition"
    );
  }

  if (
    rankingMutation.touched &&
    rankingMutation.value === "SUB" &&
    !shieldMutation.clears
  ) {
    throw arenaProfileMutationError(
      "SUB_RANK_SHIELD_CLEAR_REQUIRED",
      "moving to Sub must clear rankShieldUntil atomically"
    );
  }

  const seedMutations =
    seedSnapshotFields.map((field) =>
      fieldMutation(update, field)
    );
  const touchedSeedFields =
    seedMutations.filter(
      ({ touched }) => touched
    );
  if (
    touchedSeedFields.length > 0 &&
    touchedSeedFields.length !==
      seedSnapshotFields.length
  ) {
    throw arenaProfileMutationError(
      "INCOMPLETE_ARENA_SEED_SNAPSHOT",
      "seed MMR, timestamp, and week key must update atomically"
    );
  }
  if (
    touchedSeedFields.length ===
    seedSnapshotFields.length
  ) {
    const clearedCount =
      seedMutations.filter(
        ({ clears }) => clears
      ).length;
    if (
      clearedCount > 0 &&
      clearedCount <
        seedSnapshotFields.length
    ) {
      throw arenaProfileMutationError(
        "INCOMPLETE_ARENA_SEED_SNAPSHOT",
        "seed snapshot cannot mix cleared and populated fields"
      );
    }

    if (
      seedMutations.some(
        ({ clears, value }) =>
          !clears &&
          value === undefined
      )
    ) {
      throw arenaProfileMutationError(
        "INCOMPLETE_ARENA_SEED_SNAPSHOT",
        "seed snapshot fields cannot be undefined"
      );
    }

    if (
      clearedCount ===
      seedSnapshotFields.length
    ) {
      const statusMutation =
        fieldMutation(
          update,
          "status"
        );
      const positionMutation =
        fieldMutation(
          update,
          "arenaPosition"
        );
      if (
        !statusMutation.touched ||
        ![
          "PLACEMENT_PENDING",
          "CLOSED",
        ].includes(
          statusMutation.value
        ) ||
        !positionMutation.clears
      ) {
        throw arenaProfileMutationError(
          "ACTIVE_SEED_SNAPSHOT_CLEAR_FORBIDDEN",
          "clearing a seed snapshot must unseat the profile atomically"
        );
      }
    }
  }
}

const arenaProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
      index: true,
    },
    seasonId: {
      type: Schema.Types.ObjectId,
      ref: "ArenaSeason",
      required: true,
      immutable: true,
      index: true,
    },
    activeRanking: {
      type: String,
      enum: ARENA_RANKING_TYPES,
      required: true,
      index: true,
    },
    arenaPosition: {
      type: Number,
      min: 1,
      default: null,
      validate: {
        validator: (value) =>
          value === null ||
          Number.isSafeInteger(value),
        message:
          "arenaPosition must be an integer",
      },
    },
    status: {
      type: String,
      enum: ARENA_PROFILE_STATUSES,
      default: "PLACEMENT_PENDING",
      index: true,
    },

    // MMR의 권위 원본은 RankingProfile이다. 이 값은 마지막 주간 시드의 감사용
    // snapshot일 뿐이며 Rank Takeover 정산으로 갱신하지 않는다.
    mmrAtLastSeed: {
      type: Number,
      min: 0,
      default: null,
    },
    seededAt: {
      type: Date,
      default: null,
    },
    seedWeekKey: {
      type: String,
      trim: true,
      maxlength: 80,
      default: null,
    },
    lastTakeoverSettledAt: {
      type: Date,
      default: null,
    },
    protectionUntil: {
      type: Date,
      default: null,
      index: true,
    },
    rankShieldUntil: {
      // 구매형 Rank Shield는 Main 전용이다.
      type: Date,
      default: null,
      index: true,
    },
    hiddenReason: {
      type: String,
      trim: true,
      maxlength: 240,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: "version",
    optimisticConcurrency: true,
  }
);

arenaProfileSchema.index(
  {
    seasonId: 1,
    activeRanking: 1,
    arenaPosition: 1,
  },
  {
    // 이 인덱스는 중복 좌석만 막는다. 1↔2를 직접 갱신하면 트랜잭션 안에서도
    // 중간 E11000이 나므로 정산·재시드는 staging collection 또는 충돌하지 않는
    // 양수 임시 namespace를 사용해야 한다.
    unique: true,
    partialFilterExpression: {
      arenaPosition: {
        $type: "number",
      },
    },
    name: "one_arena_profile_per_seat",
  }
);

arenaProfileSchema.index(
  {
    seasonId: 1,
    userId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: SEATED_PROFILE_STATUSES,
      },
    },
    name: "one_active_arena_profile_per_user",
  }
);

arenaProfileSchema.index({
  seasonId: 1,
  activeRanking: 1,
  status: 1,
  arenaPosition: 1,
});

arenaProfileSchema.pre(
  "validate",
  function validateArenaProfile() {
    const isSeated =
      SEATED_PROFILE_STATUSES.includes(this.status);
    const presentSeedFieldCount = [
      this.mmrAtLastSeed !== null &&
        this.mmrAtLastSeed !== undefined,
      Boolean(this.seededAt),
      Boolean(this.seedWeekKey),
    ].filter(Boolean).length;

    if (
      !isSeated &&
      presentSeedFieldCount > 0 &&
      presentSeedFieldCount <
        seedSnapshotFields.length
    ) {
      this.invalidate(
        "mmrAtLastSeed",
        "seed snapshot must be complete or absent"
      );
    }

    if (isSeated) {
      if (!Number.isSafeInteger(this.arenaPosition)) {
        this.invalidate(
          "arenaPosition",
          "active arena profile requires a seat"
        );
      }
      if (
        typeof this.mmrAtLastSeed !== "number" ||
        !Number.isFinite(this.mmrAtLastSeed)
      ) {
        this.invalidate(
          "mmrAtLastSeed",
          "active arena profile requires its seed MMR snapshot"
        );
      }
      if (!this.seededAt) {
        this.invalidate(
          "seededAt",
          "active arena profile requires seededAt"
        );
      }
      if (!this.seedWeekKey) {
        this.invalidate(
          "seedWeekKey",
          "active arena profile requires its seed week key"
        );
      }
    } else if (this.arenaPosition !== null) {
      this.invalidate(
        "arenaPosition",
        "unseated arena profile cannot retain a seat"
      );
    }

    if (
      this.activeRanking === "SUB" &&
      this.rankShieldUntil
    ) {
      this.invalidate(
        "rankShieldUntil",
        "Rank Shield is available only in Main"
      );
    }

    if (
      this.status === "HIDDEN" &&
      !this.hiddenReason
    ) {
      this.invalidate(
        "hiddenReason",
        "hidden arena profile requires a reason"
      );
    }

    const mmrModified =
      this.isModified(
        "mmrAtLastSeed"
      );
    const seededAtModified =
      this.isModified("seededAt");
    const seedWeekModified =
      this.isModified("seedWeekKey");
    if (
      !this.isNew &&
      ((mmrModified &&
        (!seededAtModified ||
          !seedWeekModified)) ||
        seededAtModified !==
          seedWeekModified)
    ) {
      this.invalidate(
        "mmrAtLastSeed",
        "seed MMR, timestamp, and week key must update atomically"
      );
    }
  }
);

arenaProfileSchema.pre(
  [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "findOneAndReplace",
    "replaceOne",
  ],
  function guardArenaProfileQuery() {
    this.setOptions({
      runValidators: true,
      context: "query",
    });
    assertSafeArenaProfileUpdate({
      filter: this.getFilter(),
      update: this.getUpdate(),
      replacement:
        this.op === "replaceOne" ||
        this.op ===
          "findOneAndReplace",
    });
  }
);

const ArenaProfile =
  mongoose.models.ArenaProfile ||
  mongoose.model(
    "ArenaProfile",
    arenaProfileSchema
  );

// Mongoose bulkWrite는 document/query middleware를 실행하지 않는다. 앱이 이
// 모델을 통해 수행하는 일괄 변경에도 같은 Shield·seed snapshot 계약을 적용한다.
const unguardedBulkWrite =
  ArenaProfile.bulkWrite.bind(ArenaProfile);
ArenaProfile.bulkWrite =
  async function guardedBulkWrite(
    operations,
    options
  ) {
    for (const operation of operations || []) {
      if (operation.updateOne) {
        assertSafeArenaProfileUpdate({
          filter:
            operation.updateOne.filter,
          update:
            operation.updateOne.update,
        });
      } else if (operation.updateMany) {
        assertSafeArenaProfileUpdate({
          filter:
            operation.updateMany.filter,
          update:
            operation.updateMany.update,
        });
      } else if (operation.replaceOne) {
        assertSafeArenaProfileUpdate({
          filter:
            operation.replaceOne.filter,
          update:
            operation.replaceOne.replacement,
          replacement: true,
        });
      } else if (
        operation.insertOne?.document
      ) {
        assertSafeArenaProfileUpdate({
          update:
            operation.insertOne.document,
          replacement: true,
        });
      }
    }
    return unguardedBulkWrite(
      operations,
      options
    );
  };

module.exports = {
  ARENA_PROFILE_STATUSES,
  ARENA_RANKING_TYPES,
  ArenaProfile,
  SEATED_PROFILE_STATUSES,
  assertSafeArenaProfileUpdate,
};
