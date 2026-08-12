const mongoose = require("mongoose");

const { Schema } = mongoose;

const ARENA_PAIR_INTEGRITY_DECISIONS =
  Object.freeze([
    "ALLOW",
    "BLOCK",
    "REVIEW",
  ]);

const ARENA_PAIR_INTEGRITY_TRANSITIONS =
  Object.freeze([
    "INITIAL",
    "SUPERSEDES",
    "REVOKES",
  ]);

const ARENA_PAIR_INTEGRITY_ISSUER_TYPES =
  Object.freeze([
    "RISK_ENGINE",
    "ADMIN",
  ]);

const ARENA_PAIR_INTEGRITY_VERIFICATION_METHODS =
  Object.freeze([
    "RISK_ENGINE_SIGNATURE",
    "ADMIN_SESSION",
    "INTERNAL_SERVICE_IDENTITY",
  ]);

const ARENA_PAIR_INTEGRITY_REASON_CODES =
  Object.freeze([
    "RISK_SCREEN_CLEAR",
    "ADMIN_REVIEW_CLEARED",
    "SAME_DEVICE_PATTERN",
    "SAME_NETWORK_PATTERN",
    "SHARED_PAYMENT_INSTRUMENT_PATTERN",
    "ONE_WAY_VALUE_TRANSFER_PATTERN",
    "ANSWER_PATTERN_SIMILARITY",
    "COORDINATED_NO_SHOW_PATTERN",
    "NEW_ACCOUNT_CLUSTER_PATTERN",
    "RISK_THRESHOLD_REVIEW",
    "MANUAL_REVIEW_REQUIRED",
    "DATA_QUALITY_REVIEW",
    "CONFIRMED_COLLUSION",
    "PRIOR_DECISION_REVOKED",
  ]);

const ALLOW_REASON_CODES =
  new Set([
    "RISK_SCREEN_CLEAR",
    "ADMIN_REVIEW_CLEARED",
  ]);

const BLOCK_REASON_CODES =
  new Set([
    "SAME_DEVICE_PATTERN",
    "SAME_NETWORK_PATTERN",
    "SHARED_PAYMENT_INSTRUMENT_PATTERN",
    "ONE_WAY_VALUE_TRANSFER_PATTERN",
    "ANSWER_PATTERN_SIMILARITY",
    "COORDINATED_NO_SHOW_PATTERN",
    "NEW_ACCOUNT_CLUSTER_PATTERN",
    "CONFIRMED_COLLUSION",
  ]);

const REVIEW_REASON_CODES =
  new Set([
    "SAME_DEVICE_PATTERN",
    "SAME_NETWORK_PATTERN",
    "SHARED_PAYMENT_INSTRUMENT_PATTERN",
    "ONE_WAY_VALUE_TRANSFER_PATTERN",
    "ANSWER_PATTERN_SIMILARITY",
    "COORDINATED_NO_SHOW_PATTERN",
    "NEW_ACCOUNT_CLUSTER_PATTERN",
    "RISK_THRESHOLD_REVIEW",
    "MANUAL_REVIEW_REQUIRED",
    "DATA_QUALITY_REVIEW",
    "PRIOR_DECISION_REVOKED",
  ]);

const sha256Pattern =
  /^[a-f0-9]{64}$/;
const pairKeyPattern =
  /^[a-f0-9]{24}:[a-f0-9]{24}$/;

class ArenaPairIntegrityImmutableError
  extends Error {
  constructor(operation) {
    super(
      `ArenaPairIntegrityDecision is append-only; ${operation} is not allowed`
    );
    this.name =
      "ArenaPairIntegrityImmutableError";
    this.code =
      "ARENA_PAIR_INTEGRITY_DECISION_IMMUTABLE";
    this.statusCode = 409;
  }
}

class ArenaPairIntegrityTrustedIssueError
  extends Error {
  constructor() {
    super(
      "ArenaPairIntegrityDecision can be inserted only by the trusted issue service"
    );
    this.name =
      "ArenaPairIntegrityTrustedIssueError";
    this.code =
      "ARENA_PAIR_INTEGRITY_TRUSTED_ISSUER_REQUIRED";
    this.statusCode = 403;
  }
}

function canonicalPair(
  firstUserId,
  secondUserId
) {
  const first = String(
    firstUserId || ""
  ).toLowerCase();
  const second = String(
    secondUserId || ""
  ).toLowerCase();
  if (
    !mongoose.Types.ObjectId
      .isValid(first) ||
    !mongoose.Types.ObjectId
      .isValid(second)
  ) {
    throw new TypeError(
      "pair users must be valid ObjectIds"
    );
  }
  if (first === second) {
    throw new TypeError(
      "pair users must be different"
    );
  }
  const ordered = [
    first,
    second,
  ].sort();
  return {
    lowerUserId:
      new mongoose.Types.ObjectId(
        ordered[0]
      ),
    higherUserId:
      new mongoose.Types.ObjectId(
        ordered[1]
      ),
    pairKey:
      ordered.join(":"),
  };
}

function decisionIdMatches(
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

function allowedReasonsFor(
  decision
) {
  if (decision === "ALLOW") {
    return ALLOW_REASON_CODES;
  }
  if (decision === "BLOCK") {
    return BLOCK_REASON_CODES;
  }
  return REVIEW_REASON_CODES;
}

const arenaPairIntegrityDecisionSchema =
  new Schema(
    {
      decisionId: {
        type: String,
        trim: true,
        maxlength: 100,
        required: true,
        immutable: true,
        unique: true,
      },
      idempotencyKey: {
        type: String,
        trim: true,
        maxlength: 200,
        required: true,
        immutable: true,
        unique: true,
      },
      requestFingerprint: {
        type: String,
        lowercase: true,
        match: sha256Pattern,
        required: true,
        immutable: true,
      },
      pairKey: {
        type: String,
        lowercase: true,
        match: pairKeyPattern,
        required: true,
        immutable: true,
        index: true,
      },
      lowerUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
        index: true,
      },
      higherUserId: {
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
      policyVersionId: {
        type: Schema.Types.ObjectId,
        ref: "PolicyVersion",
        required: true,
        immutable: true,
        index: true,
      },
      decision: {
        type: String,
        enum:
          ARENA_PAIR_INTEGRITY_DECISIONS,
        required: true,
        immutable: true,
        index: true,
      },
      reasonCodes: {
        type: [
          {
            type: String,
            enum:
              ARENA_PAIR_INTEGRITY_REASON_CODES,
          },
        ],
        required: true,
        immutable: true,
        validate: {
          validator(value) {
            return (
              Array.isArray(value) &&
              value.length > 0 &&
              new Set(value).size ===
                value.length
            );
          },
          message:
            "reasonCodes must contain unique, non-sensitive policy codes",
        },
      },
      evidenceFingerprint: {
        // Raw IP, device, network, payment, answer, and telemetry values are
        // deliberately absent. The trusted risk system provides only a hash.
        type: String,
        lowercase: true,
        match: sha256Pattern,
        required: true,
        immutable: true,
      },
      issuerType: {
        type: String,
        enum:
          ARENA_PAIR_INTEGRITY_ISSUER_TYPES,
        required: true,
        immutable: true,
      },
      issuerKey: {
        type: String,
        trim: true,
        maxlength: 180,
        required: true,
        immutable: true,
      },
      issuerVerificationMethod: {
        type: String,
        enum:
          ARENA_PAIR_INTEGRITY_VERIFICATION_METHODS,
        required: true,
        immutable: true,
      },
      issuedAt: {
        type: Date,
        required: true,
        immutable: true,
        index: true,
      },
      expiresAt: {
        type: Date,
        required: true,
        immutable: true,
        index: true,
      },
      transitionType: {
        type: String,
        enum:
          ARENA_PAIR_INTEGRITY_TRANSITIONS,
        required: true,
        immutable: true,
      },
      chainSequence: {
        type: Number,
        min: 1,
        required: true,
        immutable: true,
        validate: {
          validator:
            Number.isSafeInteger,
          message:
            "chainSequence must be an integer",
        },
      },
      predecessorDecisionId: {
        type: Schema.Types.ObjectId,
        ref:
          "ArenaPairIntegrityDecision",
        default: null,
        immutable: true,
      },
      supersedesDecisionId: {
        type: Schema.Types.ObjectId,
        ref:
          "ArenaPairIntegrityDecision",
        default: null,
        immutable: true,
      },
      revokesDecisionId: {
        type: Schema.Types.ObjectId,
        ref:
          "ArenaPairIntegrityDecision",
        default: null,
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
      strict: "throw",
    }
  );

arenaPairIntegrityDecisionSchema.index(
  {
    pairKey: 1,
    seasonId: 1,
    policyVersionId: 1,
    chainSequence: 1,
  },
  {
    unique: true,
    name:
      "one_pair_integrity_decision_per_chain_sequence",
  }
);
arenaPairIntegrityDecisionSchema.index(
  {
    predecessorDecisionId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      predecessorDecisionId: {
        $type: "objectId",
      },
    },
    name:
      "one_successor_per_pair_integrity_decision",
  }
);
arenaPairIntegrityDecisionSchema.index({
  pairKey: 1,
  seasonId: 1,
  policyVersionId: 1,
  chainSequence: -1,
});
arenaPairIntegrityDecisionSchema.index({
  pairKey: 1,
  seasonId: 1,
  issuedAt: -1,
});

arenaPairIntegrityDecisionSchema.pre(
  "validate",
  function validatePairDecision() {
    if (!this.isNew) {
      throw new ArenaPairIntegrityImmutableError(
        "save"
      );
    }
    if (
      this.$locals
        .trustedPairIntegrityIssue !==
        true
    ) {
      throw new ArenaPairIntegrityTrustedIssueError();
    }

    let pair;
    try {
      pair = canonicalPair(
        this.lowerUserId,
        this.higherUserId
      );
    } catch (error) {
      this.invalidate(
        "lowerUserId",
        error.message
      );
      return;
    }
    if (
      !decisionIdMatches(
        pair.lowerUserId,
        this.lowerUserId
      ) ||
      !decisionIdMatches(
        pair.higherUserId,
        this.higherUserId
      ) ||
      pair.pairKey !==
        this.pairKey
    ) {
      this.invalidate(
        "pairKey",
        "pair users and pairKey must use canonical ObjectId order"
      );
    }
    if (
      !this.issuedAt ||
      !this.expiresAt ||
      this.expiresAt <=
        this.issuedAt
    ) {
      this.invalidate(
        "expiresAt",
        "expiresAt must be after issuedAt"
      );
    }

    const allowed =
      allowedReasonsFor(
        this.decision
      );
    if (
      (this.reasonCodes || []).some(
        (code) =>
          !allowed.has(code)
      )
    ) {
      this.invalidate(
        "reasonCodes",
        `reasonCodes are not valid for ${this.decision}`
      );
    }
    const sortedReasons = [
      ...(this.reasonCodes || []),
    ].sort();
    if (
      JSON.stringify(
        sortedReasons
      ) !==
      JSON.stringify(
        this.reasonCodes || []
      )
    ) {
      this.invalidate(
        "reasonCodes",
        "reasonCodes must use canonical sorted order"
      );
    }

    const expectedIssuerPrefix =
      `${this.issuerType}:`;
    if (
      !this.issuerKey?.startsWith(
        expectedIssuerPrefix
      )
    ) {
      this.invalidate(
        "issuerKey",
        "issuerKey must be namespaced by issuerType"
      );
    }

    if (
      this.transitionType ===
      "INITIAL"
    ) {
      if (
        this.chainSequence !== 1 ||
        this
          .predecessorDecisionId ||
        this
          .supersedesDecisionId ||
        this.revokesDecisionId
      ) {
        this.invalidate(
          "transitionType",
          "INITIAL decision cannot reference a predecessor"
        );
      }
      return;
    }

    if (
      this.chainSequence <= 1 ||
      !this.predecessorDecisionId
    ) {
      this.invalidate(
        "predecessorDecisionId",
        "successor decision requires a predecessor and sequence greater than one"
      );
    }
    if (
      this.transitionType ===
      "SUPERSEDES"
    ) {
      if (
        !decisionIdMatches(
          this
            .predecessorDecisionId,
          this
            .supersedesDecisionId
        ) ||
        this.revokesDecisionId
      ) {
        this.invalidate(
          "supersedesDecisionId",
          "SUPERSEDES must reference exactly its predecessor"
        );
      }
    }
    if (
      this.transitionType ===
      "REVOKES"
    ) {
      if (
        this.decision !==
          "REVIEW" ||
        !this.reasonCodes.includes(
          "PRIOR_DECISION_REVOKED"
        ) ||
        !decisionIdMatches(
          this
            .predecessorDecisionId,
          this
            .revokesDecisionId
        ) ||
        this
          .supersedesDecisionId
      ) {
        this.invalidate(
          "revokesDecisionId",
          "REVOKES must append a REVIEW decision that references exactly its predecessor"
        );
      }
    }
  }
);

arenaPairIntegrityDecisionSchema.pre(
  "save",
  function rejectResave() {
    if (!this.isNew) {
      throw new ArenaPairIntegrityImmutableError(
        "save"
      );
    }
  }
);

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
  arenaPairIntegrityDecisionSchema.pre(
    operation,
    function rejectMutation() {
      throw new ArenaPairIntegrityImmutableError(
        operation
      );
    }
  );
}

arenaPairIntegrityDecisionSchema.pre(
  "bulkWrite",
  function rejectBulkMutation() {
    throw new ArenaPairIntegrityImmutableError(
      "bulkWrite"
    );
  }
);

arenaPairIntegrityDecisionSchema.pre(
  "insertMany",
  function rejectBulkInsert() {
    throw new ArenaPairIntegrityTrustedIssueError();
  }
);

for (const operation of [
  "updateOne",
  "deleteOne",
]) {
  arenaPairIntegrityDecisionSchema.pre(
    operation,
    {
      document: true,
      query: false,
    },
    function rejectDocumentMutation() {
      throw new ArenaPairIntegrityImmutableError(
        `document.${operation}`
      );
    }
  );
}

const ArenaPairIntegrityDecision =
  mongoose.models
    .ArenaPairIntegrityDecision ||
  mongoose.model(
    "ArenaPairIntegrityDecision",
    arenaPairIntegrityDecisionSchema
  );

module.exports = {
  ALLOW_REASON_CODES,
  ARENA_PAIR_INTEGRITY_DECISIONS,
  ARENA_PAIR_INTEGRITY_ISSUER_TYPES,
  ARENA_PAIR_INTEGRITY_REASON_CODES,
  ARENA_PAIR_INTEGRITY_TRANSITIONS,
  ARENA_PAIR_INTEGRITY_VERIFICATION_METHODS,
  ArenaPairIntegrityDecision,
  ArenaPairIntegrityImmutableError,
  ArenaPairIntegrityTrustedIssueError,
  BLOCK_REASON_CODES,
  REVIEW_REASON_CODES,
  canonicalPair,
};
