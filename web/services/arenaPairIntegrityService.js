const crypto = require("node:crypto");
const mongoose = require("mongoose");

const {
  ARENA_PAIR_INTEGRITY_DECISIONS,
  ARENA_PAIR_INTEGRITY_ISSUER_TYPES,
  ARENA_PAIR_INTEGRITY_REASON_CODES,
  ARENA_PAIR_INTEGRITY_TRANSITIONS,
  ARENA_PAIR_INTEGRITY_VERIFICATION_METHODS,
  ArenaPairIntegrityDecision,
  canonicalPair,
} = require(
  "../models/arenaPairIntegrityDecisionModel"
);
const {
  ArenaSeason,
} = require(
  "../models/arenaSeasonModel"
);
const {
  PolicyVersion,
} = require(
  "../models/policyVersionModel"
);

const MAX_IDEMPOTENCY_KEY_LENGTH =
  200;

const ISSUE_INPUT_FIELDS =
  new Set([
    "idempotencyKey",
    "userAId",
    "userBId",
    "seasonId",
    "policyVersionId",
    "decision",
    "reasonCodes",
    "evidenceFingerprint",
    "expiresAt",
    "transitionType",
    "supersedesDecisionId",
    "revokesDecisionId",
    "issuerType",
    "issuerId",
  ]);

const RAW_SIGNAL_FIELD_PATTERN =
  /(raw|evidence(?!fingerprint)|ip(address)?|network(identifier)?|device(identifier|id)?|payment(method|instrument)?|card(number|token)?|answer(pattern)?|telemetry|cookie|fingerprint(?!$))/i;

const VERIFICATION_METHODS_BY_ISSUER =
  Object.freeze({
    RISK_ENGINE:
      new Set([
        "RISK_ENGINE_SIGNATURE",
        "INTERNAL_SERVICE_IDENTITY",
      ]),
    ADMIN:
      new Set([
        "ADMIN_SESSION",
        "INTERNAL_SERVICE_IDENTITY",
      ]),
  });

class ArenaPairIntegrityError
  extends Error {
  constructor(
    code,
    message,
    {
      statusCode = 409,
      details = {},
      cause,
    } = {}
  ) {
    super(message, {
      cause,
    });
    this.name =
      "ArenaPairIntegrityError";
    this.code = code;
    this.statusCode =
      statusCode;
    this.details = details;
  }
}

function fail(
  code,
  message,
  options
) {
  throw new ArenaPairIntegrityError(
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
      details: {
        reasonCode,
        blocker: reasonCode,
      },
    }
  );
}

function objectId(
  value,
  fieldName,
  {
    nullable = false,
  } = {}
) {
  if (
    nullable &&
    (value === null ||
      value === undefined ||
      value === "")
  ) {
    return null;
  }
  if (
    value instanceof
    mongoose.Types.ObjectId
  ) {
    return value;
  }
  if (
    typeof value !==
      "string" ||
    !mongoose.Types.ObjectId
      .isValid(value)
  ) {
    throw new TypeError(
      `${fieldName} must be a valid ObjectId`
    );
  }
  return new mongoose
    .Types.ObjectId(value);
}

function sameId(left, right) {
  return Boolean(
    left &&
      right &&
      String(left) ===
        String(right)
  );
}

function requiredText(
  value,
  fieldName,
  maxLength
) {
  const text = String(
    value || ""
  ).trim();
  if (
    !text ||
    text.length > maxLength
  ) {
    throw new TypeError(
      `${fieldName} is required and must be at most ${maxLength} characters`
    );
  }
  return text;
}

function asDate(
  value,
  fieldName
) {
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
      `${fieldName} must be a valid date`
    );
  }
  return date;
}

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

function normalizeForHash(
  value
) {
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
  if (
    value instanceof
      mongoose.Types.ObjectId
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(
      normalizeForHash
    );
  }
  if (
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [
          key,
          normalizeForHash(
            value[key]
          ),
        ])
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(
    normalizeForHash(value)
  );
}

function assertIssueInputFields(
  input
) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError(
      "pair integrity decision input must be an object"
    );
  }
  for (const key of
    Object.keys(input)) {
    if (ISSUE_INPUT_FIELDS.has(key)) {
      continue;
    }
    if (
      RAW_SIGNAL_FIELD_PATTERN.test(
        key
      )
    ) {
      fail(
        "RAW_PAIR_INTEGRITY_SIGNAL_FORBIDDEN",
        "raw IP, device, network, payment, answer, and telemetry identifiers cannot be stored",
        {
          statusCode: 400,
          details: {
            forbiddenField: key,
          },
        }
      );
    }
    fail(
      "UNSUPPORTED_PAIR_INTEGRITY_FIELD",
      "pair integrity decisions accept only canonical audit fields",
      {
        statusCode: 400,
        details: {
          unsupportedField:
            key,
        },
      }
    );
  }
}

function normalizeHash(
  value,
  fieldName
) {
  const hash = String(
    value || ""
  )
    .trim()
    .toLowerCase();
  if (
    !/^[a-f0-9]{64}$/.test(
      hash
    )
  ) {
    throw new TypeError(
      `${fieldName} must be a SHA-256 hex digest`
    );
  }
  return hash;
}

function normalizeDecision(
  value
) {
  const decision = String(
    value || ""
  )
    .trim()
    .toUpperCase();
  if (
    !ARENA_PAIR_INTEGRITY_DECISIONS.includes(
      decision
    )
  ) {
    throw new TypeError(
      "decision must be ALLOW, BLOCK, or REVIEW"
    );
  }
  return decision;
}

function normalizeReasons(
  value
) {
  if (
    !Array.isArray(value) ||
    value.length === 0
  ) {
    throw new TypeError(
      "reasonCodes must contain at least one policy code"
    );
  }
  const reasons = [
    ...new Set(
      value.map((code) =>
        String(code || "")
          .trim()
          .toUpperCase()
      )
    ),
  ].sort();
  if (
    reasons.some(
      (code) =>
        !ARENA_PAIR_INTEGRITY_REASON_CODES.includes(
          code
        )
    )
  ) {
    throw new TypeError(
      "reasonCodes contains an unsupported or sensitive reason"
    );
  }
  return reasons;
}

function normalizeTransition(
  input
) {
  if (
    input
      .supersedesDecisionId &&
    input.revokesDecisionId
  ) {
    throw new TypeError(
      "a decision cannot supersede and revoke two predecessors"
    );
  }
  let transitionType =
    input.transitionType
      ? String(
          input.transitionType
        )
          .trim()
          .toUpperCase()
      : input
            .supersedesDecisionId
        ? "SUPERSEDES"
        : input
              .revokesDecisionId
          ? "REVOKES"
          : "INITIAL";
  if (
    !ARENA_PAIR_INTEGRITY_TRANSITIONS.includes(
      transitionType
    )
  ) {
    throw new TypeError(
      "transitionType must be INITIAL, SUPERSEDES, or REVOKES"
    );
  }
  const supersedesDecisionId =
    objectId(
      input
        .supersedesDecisionId,
      "supersedesDecisionId",
      {
        nullable: true,
      }
    );
  const revokesDecisionId =
    objectId(
      input.revokesDecisionId,
      "revokesDecisionId",
      {
        nullable: true,
      }
    );
  if (
    transitionType ===
      "INITIAL" &&
    (supersedesDecisionId ||
      revokesDecisionId)
  ) {
    throw new TypeError(
      "INITIAL decision cannot reference a predecessor"
    );
  }
  if (
    transitionType ===
      "SUPERSEDES" &&
    (!supersedesDecisionId ||
      revokesDecisionId)
  ) {
    throw new TypeError(
      "SUPERSEDES requires only supersedesDecisionId"
    );
  }
  if (
    transitionType ===
      "REVOKES" &&
    (!revokesDecisionId ||
      supersedesDecisionId)
  ) {
    throw new TypeError(
      "REVOKES requires only revokesDecisionId"
    );
  }
  return {
    transitionType,
    supersedesDecisionId,
    revokesDecisionId,
    predecessorDecisionId:
      supersedesDecisionId ||
      revokesDecisionId ||
      null,
  };
}

function normalizeIssueInput(
  input,
  observedAt
) {
  assertIssueInputFields(input);
  const pair = canonicalPair(
    input.userAId,
    input.userBId
  );
  const decision =
    normalizeDecision(
      input.decision
    );
  const reasonCodes =
    normalizeReasons(
      input.reasonCodes
    );
  const transition =
    normalizeTransition(input);
  const expiresAt =
    asDate(
      input.expiresAt,
      "expiresAt"
    );
  if (
    expiresAt <= observedAt
  ) {
    throw new TypeError(
      "expiresAt must be after the server issue time"
    );
  }
  if (
    transition.transitionType ===
      "REVOKES" &&
    (decision !== "REVIEW" ||
      !reasonCodes.includes(
        "PRIOR_DECISION_REVOKED"
      ))
  ) {
    throw new TypeError(
      "REVOKES must append a REVIEW decision with PRIOR_DECISION_REVOKED"
    );
  }
  const issuerType = String(
    input.issuerType || ""
  )
    .trim()
    .toUpperCase();
  if (
    !ARENA_PAIR_INTEGRITY_ISSUER_TYPES.includes(
      issuerType
    )
  ) {
    throw new TypeError(
      "issuerType must be RISK_ENGINE or ADMIN"
    );
  }
  return {
    ...pair,
    idempotencyKey:
      requiredText(
        input.idempotencyKey,
        "idempotencyKey",
        MAX_IDEMPOTENCY_KEY_LENGTH
      ),
    seasonId: objectId(
      input.seasonId,
      "seasonId"
    ),
    policyVersionId:
      objectId(
        input.policyVersionId,
        "policyVersionId"
      ),
    decision,
    reasonCodes,
    evidenceFingerprint:
      normalizeHash(
        input
          .evidenceFingerprint,
        "evidenceFingerprint"
      ),
    expiresAt,
    issuerType,
    issuerId:
      requiredText(
        input.issuerId,
        "issuerId",
        120
      ),
    ...transition,
  };
}

function normalizeVerification(
  value,
  normalized
) {
  if (
    !value ||
    value.authorized !== true
  ) {
    fail(
      "PAIR_INTEGRITY_ISSUER_NOT_TRUSTED",
      "pair integrity decision issuer is not trusted",
      {
        statusCode: 403,
      }
    );
  }
  const issuerType = String(
    value.issuerType || ""
  )
    .trim()
    .toUpperCase();
  if (
    issuerType !==
    normalized.issuerType
  ) {
    fail(
      "PAIR_INTEGRITY_ISSUER_IDENTITY_MISMATCH",
      "verified issuer type does not match the requested issuer",
      {
        statusCode: 403,
      }
    );
  }
  const issuerKey =
    requiredText(
      value.issuerKey,
      "verified issuerKey",
      180
    );
  if (
    !issuerKey.startsWith(
      `${issuerType}:`
    )
  ) {
    fail(
      "PAIR_INTEGRITY_ISSUER_IDENTITY_MISMATCH",
      "verified issuer key is not correctly namespaced",
      {
        statusCode: 403,
      }
    );
  }
  const method = String(
    value.verificationMethod ||
      ""
  )
    .trim()
    .toUpperCase();
  if (
    !ARENA_PAIR_INTEGRITY_VERIFICATION_METHODS.includes(
      method
    )
  ) {
    fail(
      "PAIR_INTEGRITY_ISSUER_VERIFICATION_INVALID",
      "trusted issuer verifier returned an unsupported verification method",
      {
        statusCode: 500,
      }
    );
  }
  if (
    !VERIFICATION_METHODS_BY_ISSUER[
      issuerType
    ].has(method)
  ) {
    fail(
      "PAIR_INTEGRITY_ISSUER_VERIFICATION_INVALID",
      "trusted issuer verification method does not match the issuer type",
      {
        statusCode: 403,
      }
    );
  }
  return {
    issuerType,
    issuerKey,
    issuerVerificationMethod:
      method,
  };
}

function requestFingerprint(
  normalized,
  verification
) {
  return sha256(
    stableJson({
      idempotencyKey:
        normalized
          .idempotencyKey,
      pairKey:
        normalized.pairKey,
      seasonId:
        normalized.seasonId,
      policyVersionId:
        normalized
          .policyVersionId,
      decision:
        normalized.decision,
      reasonCodes:
        normalized
          .reasonCodes,
      evidenceFingerprint:
        normalized
          .evidenceFingerprint,
      expiresAt:
        normalized.expiresAt,
      transitionType:
        normalized
          .transitionType,
      predecessorDecisionId:
        normalized
          .predecessorDecisionId,
      issuerType:
        verification.issuerType,
      issuerKey:
        verification.issuerKey,
    })
  );
}

function assertReplayMatches(
  existing,
  fingerprint
) {
  if (
    existing
      .requestFingerprint !==
    fingerprint
  ) {
    fail(
      "IDEMPOTENCY_KEY_CONFLICT",
      "pair integrity idempotency key was reused with altered facts",
      {
        statusCode: 409,
      }
    );
  }
  return existing;
}

function publicDecisionDto(
  document
) {
  const source =
    typeof document?.toObject ===
    "function"
      ? document.toObject()
      : document;
  if (!source) {
    return null;
  }
  const id = (value) =>
    value
      ? String(value)
      : null;
  const date = (value) =>
    value
      ? new Date(value)
          .toISOString()
      : null;
  return {
    _id: id(source._id),
    decisionId:
      source.decisionId,
    pairKey: source.pairKey,
    lowerUserId:
      id(source.lowerUserId),
    higherUserId:
      id(source.higherUserId),
    seasonId:
      id(source.seasonId),
    policyVersionId:
      id(
        source.policyVersionId
      ),
    decision:
      source.decision,
    reasonCodes: [
      ...(source.reasonCodes ||
        []),
    ],
    issuedAt:
      date(source.issuedAt),
    expiresAt:
      date(source.expiresAt),
    transitionType:
      source.transitionType,
    chainSequence:
      source.chainSequence,
    predecessorDecisionId:
      id(
        source
          .predecessorDecisionId
      ),
    supersedesDecisionId:
      id(
        source
          .supersedesDecisionId
      ),
    revokesDecisionId:
      id(
        source.revokesDecisionId
      ),
  };
}

function queryWithSession(
  query,
  session
) {
  return session
    ? query.session(session)
    : query;
}

function isDuplicateKey(
  error
) {
  return Boolean(
    error &&
      (error.code === 11000 ||
        error.code === 11001)
  );
}

function adapterUserId(
  input,
  names,
  fieldName
) {
  for (const name of names) {
    const path =
      name.split(".");
    let value = input;
    for (const key of path) {
      value = value?.[key];
    }
    if (value) {
      return objectId(
        value,
        fieldName
      );
    }
  }
  throw new TypeError(
    `${fieldName} is required`
  );
}

function adapterContext(
  input
) {
  const firstUserId =
    adapterUserId(
      input,
      [
        "challengerUserId",
        "challengerUser._id",
        "challengerCycle.userId",
      ],
      "challengerUserId"
    );
  const secondUserId =
    adapterUserId(
      input,
      [
        "candidateUserId",
        "defenderUserId",
        "defenderUser._id",
        "candidateCycle.userId",
        "defenderCycle.userId",
      ],
      "defenderUserId"
    );
  const pair = canonicalPair(
    firstUserId,
    secondUserId
  );
  const seasonId =
    objectId(
      input.season?._id ||
        input.seasonId,
      "seasonId"
    );
  const seasonPolicyVersionId =
    objectId(
      input.season
        ?.policyVersionId ||
        input.policyVersionId,
      "season.policyVersionId"
    );
  const explicitPolicyVersionId =
    input.policy?._id
      ? objectId(
          input.policy._id,
          "policy._id"
        )
      : seasonPolicyVersionId;
  if (
    !sameId(
      explicitPolicyVersionId,
      seasonPolicyVersionId
    )
  ) {
    policyPending(
      "PAIR_INTEGRITY_POLICY_VERSION_MISMATCH",
      "pair integrity lookup policy does not match the Arena season"
    );
  }
  for (const cycle of [
    input.challengerCycle,
    input.candidateCycle,
    input.defenderCycle,
  ]) {
    if (
      cycle?.policyVersionId &&
      !sameId(
        cycle.policyVersionId,
        seasonPolicyVersionId
      )
    ) {
      policyPending(
        "PAIR_INTEGRITY_POLICY_VERSION_MISMATCH",
        "participant cycle policy does not match the Arena season"
      );
    }
  }
  return {
    ...pair,
    seasonId,
    policyVersionId:
      seasonPolicyVersionId,
  };
}

function createArenaPairIntegrityService(
  options = {}
) {
  const verifyTrustedIssuer =
    options
      .verifyTrustedIssuer;
  const now =
    typeof options.now ===
      "function"
      ? options.now
      : () => new Date();

  async function issuePairIntegrityDecision(
    input,
    {
      issuerContext = null,
      session:
        suppliedSession = null,
    } = {}
  ) {
    const observedAt =
      asDate(
        now(),
        "server time"
      );
    const normalized =
      normalizeIssueInput(
        input,
        observedAt
      );
    if (
      typeof verifyTrustedIssuer !==
      "function"
    ) {
      fail(
        "PAIR_INTEGRITY_ISSUER_VERIFIER_REQUIRED",
        "trusted risk-engine or administrator issuer verification is required",
        {
          statusCode: 500,
        }
      );
    }
    const verification =
      normalizeVerification(
        await verifyTrustedIssuer({
          issuerType:
            normalized
              .issuerType,
          issuerId:
            normalized.issuerId,
          issuerContext,
          operation:
            "ISSUE_ARENA_PAIR_INTEGRITY_DECISION",
          pairKey:
            normalized.pairKey,
          seasonId:
            normalized.seasonId,
          policyVersionId:
            normalized
              .policyVersionId,
          decision:
            normalized.decision,
          evidenceFingerprint:
            normalized
              .evidenceFingerprint,
        }),
        normalized
      );
    const fingerprint =
      requestFingerprint(
        normalized,
        verification
      );

    if (!suppliedSession) {
      const existingBefore =
        await ArenaPairIntegrityDecision
          .findOne({
            idempotencyKey:
              normalized
                .idempotencyKey,
          });
      if (existingBefore) {
        return assertReplayMatches(
          existingBefore,
          fingerprint
        );
      }
    }

    async function issueWithin(
      session
    ) {
      const existing =
        await queryWithSession(
          ArenaPairIntegrityDecision
            .findOne({
              idempotencyKey:
                normalized
                  .idempotencyKey,
            }),
          session
        );
      if (existing) {
        return assertReplayMatches(
          existing,
          fingerprint
        );
      }

      // Keep operations sequential: parallel work on one transaction session
      // is unsupported by the MongoDB driver.
      const season =
        await queryWithSession(
          ArenaSeason.findById(
            normalized.seasonId
          ),
          session
        );
      if (!season) {
        fail(
          "ARENA_SEASON_NOT_FOUND",
          "Arena season does not exist",
          {
            statusCode: 404,
          }
        );
      }
      const policy =
        await queryWithSession(
          PolicyVersion.findById(
            normalized
              .policyVersionId
          ),
          session
        );
      if (!policy) {
        fail(
          "POLICY_VERSION_NOT_FOUND",
          "pair integrity policy version does not exist",
          {
            statusCode: 404,
          }
        );
      }
      if (
        !sameId(
          season
            .policyVersionId,
          policy._id
        )
      ) {
        fail(
          "PAIR_INTEGRITY_POLICY_VERSION_MISMATCH",
          "decision policy must match the Arena season policy",
          {
            statusCode: 409,
          }
        );
      }

      const latest =
        await queryWithSession(
          ArenaPairIntegrityDecision
            .findOne({
              pairKey:
                normalized.pairKey,
              seasonId:
                normalized.seasonId,
              policyVersionId:
                normalized
                  .policyVersionId,
            })
            .sort({
              chainSequence: -1,
            }),
          session
        );
      if (
        !latest &&
        normalized
          .transitionType !==
          "INITIAL"
      ) {
        fail(
          "PAIR_INTEGRITY_PREDECESSOR_NOT_FOUND",
          "successor decision requires the latest decision in this pair chain",
          {
            statusCode: 409,
          }
        );
      }
      if (
        latest &&
        normalized
          .transitionType ===
          "INITIAL"
      ) {
        fail(
          "PAIR_INTEGRITY_TRANSITION_REQUIRED",
          "existing pair decision must be superseded or revoked by reference",
          {
            statusCode: 409,
          }
        );
      }
      if (
        latest &&
        !sameId(
          latest._id,
          normalized
            .predecessorDecisionId
        )
      ) {
        fail(
          "PAIR_INTEGRITY_STALE_PREDECESSOR",
          "successor must reference the current latest pair decision",
          {
            statusCode: 409,
          }
        );
      }

      const document =
        new ArenaPairIntegrityDecision({
          decisionId:
            `apid-${sha256(
              normalized
                .idempotencyKey
            )}`,
          idempotencyKey:
            normalized
              .idempotencyKey,
          requestFingerprint:
            fingerprint,
          pairKey:
            normalized.pairKey,
          lowerUserId:
            normalized
              .lowerUserId,
          higherUserId:
            normalized
              .higherUserId,
          seasonId:
            normalized.seasonId,
          policyVersionId:
            normalized
              .policyVersionId,
          decision:
            normalized.decision,
          reasonCodes:
            normalized
              .reasonCodes,
          evidenceFingerprint:
            normalized
              .evidenceFingerprint,
          issuerType:
            verification
              .issuerType,
          issuerKey:
            verification
              .issuerKey,
          issuerVerificationMethod:
            verification
              .issuerVerificationMethod,
          issuedAt:
            observedAt,
          expiresAt:
            normalized.expiresAt,
          transitionType:
            normalized
              .transitionType,
          chainSequence:
            latest
              ? latest
                  .chainSequence +
                1
              : 1,
          predecessorDecisionId:
            normalized
              .predecessorDecisionId,
          supersedesDecisionId:
            normalized
              .supersedesDecisionId,
          revokesDecisionId:
            normalized
              .revokesDecisionId,
        });
      document.$locals
        .trustedPairIntegrityIssue =
        true;
      await document.save({
        session,
      });
      return document;
    }

    if (suppliedSession) {
      if (
        typeof suppliedSession
          .inTransaction !==
          "function" ||
        !suppliedSession
          .inTransaction()
      ) {
        fail(
          "PAIR_INTEGRITY_TRANSACTION_REQUIRED",
          "supplied pair integrity session must own an active transaction",
          {
            statusCode: 500,
          }
        );
      }
      try {
        return await issueWithin(
          suppliedSession
        );
      } catch (error) {
        if (isDuplicateKey(error)) {
          fail(
            "PAIR_INTEGRITY_CONCURRENT_WRITE",
            "concurrent pair decision requires the caller transaction to retry",
            {
              statusCode: 409,
              cause: error,
            }
          );
        }
        throw error;
      }
    }

    const session =
      await mongoose
        .startSession();
    let result;
    try {
      try {
        await session.withTransaction(
          async () => {
            result =
              await issueWithin(
                session
              );
          }
        );
      } catch (error) {
        if (!isDuplicateKey(error)) {
          throw error;
        }
        const concurrentExisting =
          await ArenaPairIntegrityDecision
            .findOne({
              idempotencyKey:
                normalized
                  .idempotencyKey,
            });
        if (concurrentExisting) {
          result =
            assertReplayMatches(
              concurrentExisting,
              fingerprint
            );
        } else {
          fail(
            "PAIR_INTEGRITY_CONCURRENT_DECISION",
            "another pair decision won the current chain sequence",
            {
              statusCode: 409,
              cause: error,
            }
          );
        }
      }
      return result;
    } finally {
      await session.endSession();
    }
  }

  async function latestDecisionDocumentFor(
    input
  ) {
    const context =
      adapterContext(input);
    const session =
      input.session || null;
    const observedAt =
      asDate(
        input.now || now(),
        "decision lookup time"
      );
    const latest =
      await queryWithSession(
        ArenaPairIntegrityDecision
          .findOne({
            pairKey:
              context.pairKey,
            seasonId:
              context.seasonId,
            policyVersionId:
              context
                .policyVersionId,
          })
          .sort({
            chainSequence: -1,
          }),
        session
      );
    if (!latest) {
      const otherPolicy =
        await queryWithSession(
          ArenaPairIntegrityDecision
            .findOne({
              pairKey:
                context.pairKey,
              seasonId:
                context.seasonId,
            })
            .sort({
              issuedAt: -1,
            })
            .select(
              "policyVersionId"
            )
            .lean(),
          session
        );
      if (otherPolicy) {
        policyPending(
          "PAIR_INTEGRITY_POLICY_VERSION_MISMATCH",
          "pair integrity decision belongs to another policy version"
        );
      }
      const otherSeason =
        await queryWithSession(
          ArenaPairIntegrityDecision
            .findOne({
              pairKey:
                context.pairKey,
            })
            .sort({
              issuedAt: -1,
            })
            .select(
              "seasonId"
            )
            .lean(),
          session
        );
      if (otherSeason) {
        policyPending(
          "PAIR_INTEGRITY_SEASON_MISMATCH",
          "pair integrity decision belongs to another Arena season"
        );
      }
      policyPending(
        "PAIR_INTEGRITY_DECISION_MISSING",
        "a current pair integrity decision is required"
      );
    }
    if (
      latest.issuedAt >
      observedAt
    ) {
      policyPending(
        "PAIR_INTEGRITY_DECISION_NOT_YET_ACTIVE",
        "pair integrity decision is not active yet"
      );
    }
    if (
      latest.expiresAt <=
      observedAt
    ) {
      policyPending(
        "PAIR_INTEGRITY_DECISION_EXPIRED",
        "pair integrity decision has expired"
      );
    }
    return latest;
  }

  async function latestDecisionFor(
    input
  ) {
    return publicDecisionDto(
      await latestDecisionDocumentFor(
        input
      )
    );
  }

  async function assertPairIntegrity(
    input
  ) {
    const latest =
      await latestDecisionDocumentFor(
        input
      );
    return (
      latest.decision ===
      "ALLOW"
    );
  }

  async function resolveStrongRelation(
    input
  ) {
    const latest =
      await latestDecisionDocumentFor(
        input
      );
    return {
      blocked:
        latest.decision !==
        "ALLOW",
    };
  }

  return {
    assertPairIntegrity,
    issuePairIntegrityDecision,
    latestDecisionFor,
    resolveStrongRelation,
  };
}

module.exports = {
  ArenaPairIntegrityError,
  ISSUE_INPUT_FIELDS,
  RAW_SIGNAL_FIELD_PATTERN,
  VERIFICATION_METHODS_BY_ISSUER,
  createArenaPairIntegrityService,
  publicDecisionDto,
  stableJson,
};
