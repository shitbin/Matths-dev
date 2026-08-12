const mongoose = require(
  "mongoose"
);

const {
  RankTakeoverMatch,
} = require(
  "../models/rankTakeoverMatchModel"
);
const {
  createArenaMatchAttemptService,
} = require(
  "./arenaMatchAttemptService"
);
const {
  createArenaOperationalPolicyService,
} = require(
  "./arenaOperationalPolicyService"
);
const {
  createArenaPairIntegrityService,
} = require(
  "./arenaPairIntegrityService"
);
const {
  createArenaQuestionPackService,
} = require(
  "./arenaQuestionPackService"
);
const {
  createArenaRevengeRightService,
} = require(
  "./arenaRevengeRightService"
);
const {
  createDefenderAssignmentService,
} = require(
  "./defenderAssignmentService"
);
const {
  createRankTakeoverService,
} = require(
  "./rankTakeoverService"
);

const MAX_MATCH_ID_LENGTH = 160;
const MAX_IDEMPOTENCY_KEY_LENGTH =
  180;
const MAX_BUILD_VERSION_LENGTH =
  100;

const COMMON_INPUT_FIELDS =
  Object.freeze([
    "matchId",
    "idempotencyKey",
    "clientBuildVersion",
  ]);

const EVENT_INPUT_FIELDS =
  Object.freeze([
    ...COMMON_INPUT_FIELDS,
    "eventType",
    "payload",
  ]);

const DECLINE_INPUT_FIELDS =
  Object.freeze([
    ...COMMON_INPUT_FIELDS,
    "reasonCode",
  ]);

const DECLINE_REASON_MESSAGES =
  Object.freeze({
    SCHEDULE_CONFLICT:
      "DEFENDER_SCHEDULE_CONFLICT",
    TECHNICAL_ISSUE:
      "DEFENDER_TECHNICAL_ISSUE",
    OTHER:
      "DEFENDER_OTHER",
  });

const MATCH_CONTRACT_SELECTION =
  [
    "_id",
    "matchId",
    "status",
    "integrityState",
    "participantUserIds",
    "challengerUserId",
    "defenderUserId",
    "challengerQuestionPackId",
    "defenderQuestionPackId",
  ].join(" ");

class GoatArenaCommandError
  extends Error {
  constructor(
    code,
    message,
    {
      statusCode = 400,
      details = null,
      cause,
    } = {}
  ) {
    super(message, {
      cause,
    });
    this.name =
      "GoatArenaCommandError";
    this.code = code;
    this.statusCode =
      statusCode;
    this.status =
      statusCode;
    this.details = details;
  }
}

function fail(
  code,
  message,
  options
) {
  throw new GoatArenaCommandError(
    code,
    message,
    options
  );
}

function plainObject(
  value,
  label
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    fail(
      "GOAT_ARENA_COMMAND_INPUT_INVALID",
      `${label} must be an object`,
      {
        statusCode: 400,
      }
    );
  }
  return value;
}

function requiredText(
  value,
  label,
  maxLength
) {
  if (
    typeof value !==
    "string"
  ) {
    fail(
      "GOAT_ARENA_COMMAND_INPUT_INVALID",
      `${label} must be a string`,
      {
        statusCode: 400,
      }
    );
  }
  const normalized =
    value
      .normalize("NFKC")
      .trim();
  if (!normalized) {
    fail(
      "GOAT_ARENA_COMMAND_INPUT_INVALID",
      `${label} is required`,
      {
        statusCode: 400,
      }
    );
  }
  if (
    normalized.length >
    maxLength
  ) {
    fail(
      "GOAT_ARENA_COMMAND_INPUT_INVALID",
      `${label} is too long`,
      {
        statusCode: 400,
      }
    );
  }
  return normalized;
}

function objectId(
  value,
  label
) {
  if (
    !mongoose.Types.ObjectId
      .isValid(value)
  ) {
    fail(
      "GOAT_ARENA_AUTH_REQUIRED",
      `${label} is invalid`,
      {
        statusCode: 401,
      }
    );
  }
  return new mongoose.Types
    .ObjectId(value);
}

function authenticatedUserId(
  authContext
) {
  const auth =
    plainObject(
      authContext,
      "authenticated context"
    );
  return objectId(
    auth.userId,
    "authenticated user"
  );
}

function normalizedInput(
  rawInput,
  allowedFields
) {
  const input =
    plainObject(
      rawInput,
      "public input"
    );
  const allowed =
    new Set(
      allowedFields
    );
  const unexpected =
    Object.keys(input)
      .filter(
        (field) =>
          !allowed.has(field)
      );
  if (unexpected.length) {
    fail(
      "GOAT_ARENA_COMMAND_INPUT_INVALID",
      "public input contains server-owned fields",
      {
        statusCode: 400,
        details: {
          fields:
            unexpected.sort(),
        },
      }
    );
  }
  return {
    matchId:
      requiredText(
        input.matchId,
        "matchId",
        MAX_MATCH_ID_LENGTH
      ),
    idempotencyKey:
      requiredText(
        input.idempotencyKey,
        "idempotencyKey",
        MAX_IDEMPOTENCY_KEY_LENGTH
      ),
    clientBuildVersion:
      requiredText(
        input
          .clientBuildVersion,
        "clientBuildVersion",
        MAX_BUILD_VERSION_LENGTH
      ),
    source: input,
  };
}

function declineReason(
  value
) {
  const reasonCode =
    requiredText(
      value,
      "reasonCode",
      40
    );
  const reason =
    DECLINE_REASON_MESSAGES[
      reasonCode
    ];
  if (!reason) {
    fail(
      "GOAT_ARENA_DECLINE_REASON_INVALID",
      "reasonCode is not supported",
      {
        statusCode: 400,
      }
    );
  }
  return {
    reason,
    reasonCode,
  };
}

function asPlain(
  value
) {
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

async function resolveQuery(
  query
) {
  if (
    query &&
    typeof query.select ===
      "function"
  ) {
    query =
      query.select(
        MATCH_CONTRACT_SELECTION
      );
  }
  if (
    query &&
    typeof query.lean ===
      "function"
  ) {
    return query.lean();
  }
  return query;
}

function requireMethod(
  service,
  method,
  label
) {
  if (
    !service ||
    typeof service[method] !==
      "function"
  ) {
    fail(
      "GOAT_ARENA_COMMAND_CONFIGURATION_INVALID",
      `${label}.${method} is unavailable`,
      {
        statusCode: 500,
      }
    );
  }
  return service[
    method
  ].bind(service);
}

/**
 * Participant command boundary for GOAT Arena.
 *
 * Authentication context is deliberately a separate argument from public
 * input. Public callers cannot supply a user, role, question-pack, position,
 * or stake. Every participant contract is reloaded from RankTakeoverMatch.
 */
function createGoatArenaCommandService(
  options = {}
) {
  const factories =
    options.factories || {};
  const suppliedServices =
    options.services || {};
  const MatchModel =
    options.MatchModel ||
    RankTakeoverMatch;
  const now =
    typeof options.now ===
      "function"
      ? options.now
      : () => new Date();

  // This capability never leaves the closure. The same unforgeable value
  // gates participant-attempt start and all private scoring projections.
  const serverCapability =
    Symbol(
      "goat-arena-server-capability"
    );

  const operationalPolicyService =
    suppliedServices
      .operationalPolicyService ||
    (
      factories
        .createArenaOperationalPolicyService ||
      createArenaOperationalPolicyService
    )({
      now,
    });

  const pairIntegrityService =
    suppliedServices
      .pairIntegrityService ||
    (
      factories
        .createArenaPairIntegrityService ||
      createArenaPairIntegrityService
    )({
      now,
      verifyTrustedIssuer:
        options
          .verifyTrustedIssuer,
    });

  const revengeRightService =
    suppliedServices
      .revengeRightService ||
    (
      factories
        .createArenaRevengeRightService ||
      createArenaRevengeRightService
    )({
      now,
    });

  const defenderAssignmentService =
    suppliedServices
      .defenderAssignmentService ||
    (
      factories
        .createDefenderAssignmentService ||
      createDefenderAssignmentService
    )({
      seedSecret:
        options
          .defenderAssignmentSeedSecret ??
        process.env
          .ARENA_DEFENDER_ASSIGNMENT_SEED_SECRET,
      resolveAssignmentPolicy:
        requireMethod(
          operationalPolicyService,
          "resolveAssignmentPolicy",
          "operationalPolicyService"
        ),
      resolveStrongRelation:
        requireMethod(
          pairIntegrityService,
          "resolveStrongRelation",
          "pairIntegrityService"
        ),
      resolveActivity:
        requireMethod(
          operationalPolicyService,
          "resolveActivity",
          "operationalPolicyService"
        ),
      resolveIntegrity:
        requireMethod(
          operationalPolicyService,
          "resolveIntegrity",
          "operationalPolicyService"
        ),
      resolveSettlementEligibility:
        requireMethod(
          operationalPolicyService,
          "resolveSettlementEligibility",
          "operationalPolicyService"
        ),
    });

  const attemptService =
    suppliedServices
      .attemptService ||
    (
      factories
        .createArenaMatchAttemptService ||
      createArenaMatchAttemptService
    )({
      now,
      serverCapability,
      startCapability:
        serverCapability,
      resolveHeartbeatPolicy:
        requireMethod(
          operationalPolicyService,
          "resolveHeartbeatPolicy",
          "operationalPolicyService"
        ),
    });

  const questionPackService =
    suppliedServices
      .questionPackService ||
    (
      factories
        .createArenaQuestionPackService ||
      createArenaQuestionPackService
    )({
      now,
      seedSecret:
        options
          .questionPackSeedSecret ??
        process.env
          .ARENA_QUESTION_PACK_SEED_SECRET,
      serverCapability,
      assertParticipantEligibility:
        options
          .assertParticipantEligibility,
      assertPublicReleaseAllowed:
        requireMethod(
          attemptService,
          "assertPublicReleaseAllowed",
          "attemptService"
        ),
    });

  const rankTakeoverService =
    suppliedServices
      .rankTakeoverService ||
    (
      factories
        .createRankTakeoverService ||
      createRankTakeoverService
    )({
      now,
      selectSubDefender:
        requireMethod(
          defenderAssignmentService,
          "selectSubDefender",
          "defenderAssignmentService"
        ),
      resolveRevengeRight:
        requireMethod(
          revengeRightService,
          "resolveRevengeRight",
          "revengeRightService"
        ),
      consumeRevengeRight:
        requireMethod(
          revengeRightService,
          "consumeRevengeRight",
          "revengeRightService"
        ),
      resolveMainTierStepGap:
        requireMethod(
          operationalPolicyService,
          "resolveMainTierStepGap",
          "operationalPolicyService"
        ),
      resolveDeadlinePolicy:
        requireMethod(
          operationalPolicyService,
          "resolveDeadlinePolicy",
          "operationalPolicyService"
        ),
      assertPairIntegrity:
        requireMethod(
          pairIntegrityService,
          "assertPairIntegrity",
          "pairIntegrityService"
        ),
      prepareQuestionPacks:
        requireMethod(
          questionPackService,
          "prepareQuestionPacks",
          "questionPackService"
        ),
      ensureParticipantAttemptStarted:
        ({
          match,
          participantUserId,
          participantRole,
          questionPackId,
          clientBuildVersion,
          observedAt,
          session,
        }) =>
          attemptService
            .startAttempt({
              matchId:
                match.matchId,
              participantUserId,
              participantRole,
              questionPackId,
              clientBuildVersion,
              observedAt,
              startCapability:
                serverCapability,
              session,
            }),
    });

  const rankStartMatch =
    requireMethod(
      rankTakeoverService,
      "startMatch",
      "rankTakeoverService"
    );
  const rankAcceptChallenge =
    requireMethod(
      rankTakeoverService,
      "acceptChallenge",
      "rankTakeoverService"
    );
  const rankRejectChallenge =
    requireMethod(
      rankTakeoverService,
      "rejectChallenge",
      "rankTakeoverService"
    );
  const getParticipantAttempt =
    requireMethod(
      attemptService,
      "getParticipantAttempt",
      "attemptService"
    );
  const getParticipantSavedAnswers =
    requireMethod(
      attemptService,
      "getParticipantSavedAnswers",
      "attemptService"
    );
  const recordEvent =
    requireMethod(
      attemptService,
      "recordEvent",
      "attemptService"
    );
  const submitAttempt =
    requireMethod(
      attemptService,
      "submitAttempt",
      "attemptService"
    );
  const getPublicQuestionPack =
    requireMethod(
      questionPackService,
      "getPublicQuestionPack",
      "questionPackService"
    );

  async function participantContract(
    matchId,
    participantUserId
  ) {
    const match =
      asPlain(
        await resolveQuery(
          MatchModel.findOne({
            matchId,
            participantUserIds:
              participantUserId,
          })
        )
      );
    if (!match._id) {
      // Participant filtering intentionally makes both a missing match and an
      // outsider indistinguishable.
      fail(
        "GOAT_ARENA_MATCH_NOT_FOUND",
        "GOAT Arena match was not found",
        {
          statusCode: 404,
        }
      );
    }
    const challenger =
      sameId(
        match
          .challengerUserId,
        participantUserId
      );
    const defender =
      sameId(
        match
          .defenderUserId,
        participantUserId
      );
    if (
      challenger ===
      defender
    ) {
      fail(
        "GOAT_ARENA_PARTICIPANT_CONTRACT_INVALID",
        "authoritative participant contract is invalid",
        {
          statusCode: 409,
        }
      );
    }
    const participantRole =
      challenger
        ? "CHALLENGER"
        : "DEFENDER";
    const questionPackId =
      challenger
        ? match
            .challengerQuestionPackId
        : match
            .defenderQuestionPackId;
    if (!questionPackId) {
      fail(
        "GOAT_ARENA_QUESTION_PACK_NOT_READY",
        "participant question pack is not ready",
        {
          statusCode: 409,
        }
      );
    }
    return Object.freeze({
      matchId:
        match.matchId,
      participantUserId,
      participantRole,
      questionPackId,
    });
  }

  async function defenderContract(
    matchId,
    defenderUserId,
    allowedStatuses
  ) {
    const match =
      asPlain(
        await resolveQuery(
          MatchModel.findOne({
            matchId,
            participantUserIds:
              defenderUserId,
            defenderUserId,
          })
        )
      );
    if (!match._id) {
      // A missing match, challenger, and unrelated user all share the same
      // response so this public boundary cannot be used for enumeration.
      fail(
        "GOAT_ARENA_MATCH_NOT_FOUND",
        "GOAT Arena match was not found",
        {
          statusCode: 404,
        }
      );
    }
    if (
      !allowedStatuses.includes(
        match.status
      )
    ) {
      fail(
        "GOAT_ARENA_MATCH_STATE_INVALID",
        "GOAT Arena match is not actionable",
        {
          statusCode: 409,
        }
      );
    }
    return match;
  }

  function publicMatchProjection(
    value
  ) {
    const match =
      asPlain(value);
    return Object.freeze({
      match: Object.freeze({
        id:
          match.matchId,
        status:
          match.status,
        integrityState:
          match
            .integrityState ||
          "CLEAR",
      }),
    });
  }

  async function acceptParticipantChallenge(
    authContext,
    rawInput
  ) {
    const defenderUserId =
      authenticatedUserId(
        authContext
      );
    const input =
      normalizedInput(
        rawInput,
        COMMON_INPUT_FIELDS
      );
    await defenderContract(
      input.matchId,
      defenderUserId,
      ["MATCHED", "READY"]
    );
    // clientBuildVersion is request provenance rather than acceptance
    // semantics. Rank receipts therefore remain stable across app upgrades.
    await rankAcceptChallenge({
      matchId:
        input.matchId,
      defenderUserId,
      idempotencyKey:
        input.idempotencyKey,
      clientBuildVersion:
        input
          .clientBuildVersion,
    });
    const match =
      await defenderContract(
        input.matchId,
        defenderUserId,
        ["READY"]
      );
    return publicMatchProjection(
      match
    );
  }

  async function declineParticipantChallenge(
    authContext,
    rawInput
  ) {
    const defenderUserId =
      authenticatedUserId(
        authContext
      );
    const input =
      normalizedInput(
        rawInput,
        DECLINE_INPUT_FIELDS
      );
    const reason =
      declineReason(
        input.source
          .reasonCode
      );
    await defenderContract(
      input.matchId,
      defenderUserId,
      [
        "MATCHED",
        "CANCELLED",
      ]
    );
    await rankRejectChallenge({
      matchId:
        input.matchId,
      defenderUserId,
      idempotencyKey:
        input.idempotencyKey,
      clientBuildVersion:
        input
          .clientBuildVersion,
      reason:
        reason.reason,
    });
    const match =
      await defenderContract(
        input.matchId,
        defenderUserId,
        ["CANCELLED"]
      );
    return publicMatchProjection(
      match
    );
  }

  async function startParticipantMatch(
    authContext,
    rawInput
  ) {
    const participantUserId =
      authenticatedUserId(
        authContext
      );
    const input =
      normalizedInput(
        rawInput,
        COMMON_INPUT_FIELDS
      );
    await participantContract(
      input.matchId,
      participantUserId
    );
    // Rank Takeover remains the sole authority for READY -> IN_PROGRESS and
    // starts the personal attempt in its own Mongo transaction.
    await rankStartMatch({
      matchId:
        input.matchId,
      participantUserId,
      idempotencyKey:
        input.idempotencyKey,
      clientBuildVersion:
        input
          .clientBuildVersion,
    });
    const contract =
      await participantContract(
        input.matchId,
        participantUserId
      );
    let attempt =
      await getParticipantAttempt(
        contract
      );
    let questionPack =
      null;
    if (
      attempt.status ===
      "IN_PROGRESS"
    ) {
      try {
        questionPack =
          await getPublicQuestionPack({
            questionPackId:
              contract
                .questionPackId,
            participantUserId:
              contract
                .participantUserId,
          });
      } catch (error) {
        if (
          error?.code !==
          "QUESTION_PACK_NOT_RELEASED"
        ) {
          throw error;
        }
        // A deadline worker may freeze the attempt between the first read and
        // the release guard. Re-read the authority and return a submitted
        // state without reopening questions; any other release denial remains
        // fail-closed.
        const refreshed =
          await getParticipantAttempt(
            contract
          );
        if (
          refreshed.status !==
          "SUBMITTED"
        ) {
          throw error;
        }
        attempt = refreshed;
      }
    }
    const savedAnswers =
      await getParticipantSavedAnswers(
        contract
      );
    // Saved-answer recovery can itself cross the deadline and trigger the
    // lazy finalizer. Reconcile once more so a submitted replay never carries
    // a question pack obtained just before that transition.
    const refreshedAttempt =
      await getParticipantAttempt(
        contract
      );
    attempt =
      refreshedAttempt;
    if (
      refreshedAttempt.status !==
      "IN_PROGRESS"
    ) {
      questionPack = null;
    }
    const responseNow =
      new Date(now());
    if (
      !Number.isFinite(
        responseNow.getTime()
      )
    ) {
      fail(
        "GOAT_ARENA_SERVER_TIME_INVALID",
        "server time is invalid",
        {
          statusCode: 500,
        }
      );
    }
    return Object.freeze({
      attempt,
      questionPack,
      serverNow:
        responseNow
          .toISOString(),
      savedAnswers,
    });
  }

  async function recordParticipantEvent(
    authContext,
    rawInput
  ) {
    const participantUserId =
      authenticatedUserId(
        authContext
      );
    const input =
      normalizedInput(
        rawInput,
        EVENT_INPUT_FIELDS
      );
    const contract =
      await participantContract(
        input.matchId,
        participantUserId
      );
    return recordEvent({
      ...contract,
      clientEventId:
        input.idempotencyKey,
      eventType:
        input.source
          .eventType,
      payload:
        input.source.payload,
      clientBuildVersion:
        input
          .clientBuildVersion,
    });
  }

  async function submitParticipantAttempt(
    authContext,
    rawInput
  ) {
    const participantUserId =
      authenticatedUserId(
        authContext
      );
    const input =
      normalizedInput(
        rawInput,
        COMMON_INPUT_FIELDS
      );
    const contract =
      await participantContract(
        input.matchId,
        participantUserId
      );
    return submitAttempt({
      ...contract,
      submissionId:
        input.idempotencyKey,
      clientBuildVersion:
        input
          .clientBuildVersion,
    });
  }

  async function getParticipantQuestionPack(
    authContext,
    rawInput
  ) {
    const participantUserId =
      authenticatedUserId(
        authContext
      );
    const input =
      normalizedInput(
        rawInput,
        COMMON_INPUT_FIELDS
      );
    const contract =
      await participantContract(
        input.matchId,
        participantUserId
      );
    return getPublicQuestionPack({
      questionPackId:
        contract
          .questionPackId,
      participantUserId:
        contract
          .participantUserId,
    });
  }

  // Intentionally no requestChallenge, submitResult, scoring projection, raw
  // rank service, capability, or issuer mutation API is exposed here.
  return Object.freeze({
    acceptParticipantChallenge,
    declineParticipantChallenge,
    getParticipantQuestionPack,
    recordParticipantEvent,
    startParticipantMatch,
    submitParticipantAttempt,
  });
}

module.exports = {
  GoatArenaCommandError,
  createGoatArenaCommandService,
};
