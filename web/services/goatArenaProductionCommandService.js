const mongoose = require("mongoose");

const {
  ArenaMatch,
  ArenaMatchAttempt,
  ArenaMatchEvidence,
  ArenaProblemPack,
  MainInvitationOffer,
} = require("../models/goatArenaModel");
const {
  advanceArenaMatchQuestion,
  getArenaMatchPageData,
  prepareArenaMatch,
  recordArenaMatchActivity,
  saveArenaMatchAnswers,
  startArenaMatchAttempt,
  submitArenaMatchAttempt,
} = require("./arenaMatchAttemptService");
const {
  attachArenaClientReview,
  submitArenaMatchEvidence,
} = require("./arenaMatchEvidenceService");
const {
  settleArenaMatch,
} = require("./arenaMatchSettlementService");
const {
  cancelMainInvitation,
  createMainLowerInvitation,
  createMainUpwardChallenge,
  getMainArenaActionData,
  respondToMainInvitation,
} = require("./mainArenaMatchService");
const {
  createSubNormalChallenge,
} = require("./arenaMatchService");
const {
  ARENA_TIER_CONFIG,
} = require("./arenaTierPolicy");

const MAX_MATCH_ID_LENGTH = 160;
const MAX_IDEMPOTENCY_KEY_LENGTH = 180;
const MAX_BUILD_VERSION_LENGTH = 100;
const PUBLIC_ARENA_TIER_LABELS = new Set(
  ARENA_TIER_CONFIG.map((tier) => tier.label)
);

class GoatArenaProductionCommandError extends Error {
  constructor(code, message, { statusCode = 400, details = null } = {}) {
    super(message);
    this.name = "GoatArenaProductionCommandError";
    this.code = code;
    this.status = statusCode;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function fail(code, message, options) {
  throw new GoatArenaProductionCommandError(code, message, options);
}

function requiredText(value, label, maxLength) {
  if (typeof value !== "string") {
    fail("GOAT_ARENA_COMMAND_INPUT_INVALID", `${label} 형식을 확인해주세요.`);
  }
  const normalized = value.normalize("NFKC").trim();
  if (!normalized || normalized.length > maxLength) {
    fail("GOAT_ARENA_COMMAND_INPUT_INVALID", `${label} 값을 확인해주세요.`);
  }
  return normalized;
}

function authenticatedUserId(authContext) {
  const value = authContext?.userId;
  if (!mongoose.Types.ObjectId.isValid(value)) {
    fail("GOAT_ARENA_AUTH_REQUIRED", "다시 로그인한 뒤 시도해주세요.", {
      statusCode: 401,
    });
  }
  return new mongoose.Types.ObjectId(value);
}

function normalizedInput(rawInput, allowedFields) {
  if (!rawInput || typeof rawInput !== "object" || Array.isArray(rawInput)) {
    fail("GOAT_ARENA_COMMAND_INPUT_INVALID", "요청 형식을 확인해주세요.");
  }
  const allowed = new Set(allowedFields);
  const unexpected = Object.keys(rawInput).filter((key) => !allowed.has(key));
  if (unexpected.length) {
    fail(
      "GOAT_ARENA_COMMAND_INPUT_INVALID",
      "요청에 허용되지 않은 값이 포함되어 있습니다.",
      { details: { fields: unexpected.sort() } }
    );
  }
  return {
    ...rawInput,
    matchId: requiredText(rawInput.matchId, "matchId", MAX_MATCH_ID_LENGTH),
    idempotencyKey: requiredText(
      rawInput.idempotencyKey,
      "idempotencyKey",
      MAX_IDEMPOTENCY_KEY_LENGTH
    ),
    clientBuildVersion: requiredText(
      rawInput.clientBuildVersion,
      "clientBuildVersion",
      MAX_BUILD_VERSION_LENGTH
    ),
  };
}

function normalizedCreateInput(rawInput, { includeTarget = false } = {}) {
  if (!rawInput || typeof rawInput !== "object" || Array.isArray(rawInput)) {
    fail("GOAT_ARENA_COMMAND_INPUT_INVALID", "요청 형식을 확인해주세요.");
  }
  const allowed = new Set([
    "idempotencyKey",
    "clientBuildVersion",
    ...(includeTarget ? ["targetTier", "stakeDays"] : []),
  ]);
  const unexpected = Object.keys(rawInput).filter((key) => !allowed.has(key));
  if (unexpected.length) {
    fail(
      "GOAT_ARENA_COMMAND_INPUT_INVALID",
      "요청에 허용되지 않은 값이 포함되어 있습니다.",
      { details: { fields: unexpected.sort() } }
    );
  }
  const input = {
    idempotencyKey: requiredText(
      rawInput.idempotencyKey,
      "idempotencyKey",
      MAX_IDEMPOTENCY_KEY_LENGTH
    ),
    clientBuildVersion: requiredText(
      rawInput.clientBuildVersion,
      "clientBuildVersion",
      MAX_BUILD_VERSION_LENGTH
    ),
  };
  if (!includeTarget) return input;
  const stakeDays = Number(rawInput.stakeDays);
  if (!Number.isInteger(stakeDays) || stakeDays < 1 || stakeDays > 365) {
    fail(
      "GOAT_ARENA_COMMAND_INPUT_INVALID",
      "예치 학습일은 1일 이상의 정수여야 합니다."
    );
  }
  const targetTier = requiredText(rawInput.targetTier, "상대 티어", 40);
  if (!PUBLIC_ARENA_TIER_LABELS.has(targetTier)) {
    fail(
      "GOAT_ARENA_COMMAND_INPUT_INVALID",
      "선택할 수 없는 상대 티어입니다."
    );
  }
  return {
    ...input,
    targetTier,
    stakeDays,
  };
}

function isoString(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function participantRole(match, userId) {
  if (String(match?.challenger?.userId) === String(userId)) return "CHALLENGER";
  if (String(match?.defender?.userId) === String(userId)) return "DEFENDER";
  fail("GOAT_ARENA_MATCH_NOT_FOUND", "GOAT Arena match was not found", {
    statusCode: 404,
  });
}

function publicIntegrityState(match) {
  return match.integrityStatus || "PENDING";
}

function asPlain(value) {
  if (!value) return value;
  return typeof value.toObject === "function" ? value.toObject() : value;
}

function serializeMainActionOptions(actionData) {
  const availableLearningDays = Math.max(
    0,
    Number(actionData?.availableLearningDays || 0)
  );
  const maximumSpendableDays = Math.max(0, availableLearningDays - 1);
  const policyMinimumByGap = new Map(
    (actionData?.policy?.stakeDaysByTierGap || []).map((row) => [
      Number(row.tierGap),
      Number(row.stakeDays),
    ])
  );
  const targets = (rows, { invitation = false } = {}) =>
    (Array.isArray(rows) ? rows : []).map((row) => {
      const minimumStakeDays = Math.max(
        1,
        Number(
          row.minimumStakeDays ||
            (invitation ? policyMinimumByGap.get(Number(row.gap)) : null) ||
            row.gap ||
            1
        )
      );
      const policyMaximum = Math.max(
        minimumStakeDays,
        Number(
          row.maximumStakeDays ||
            (invitation ? maximumSpendableDays : 5)
        )
      );
      const maximumStakeDays = Math.min(policyMaximum, maximumSpendableDays);
      return {
        tier: String(row.label || ""),
        gap: Number(row.gap || 0),
        minimumStakeDays,
        maximumStakeDays,
        available: maximumStakeDays >= minimumStakeDays,
      };
    });
  const activeMatch = asPlain(actionData?.activeMatch);
  const requestLocked = actionData?.requestLocked === true;
  const reasonCodes = Array.isArray(actionData?.reasons)
    ? actionData.reasons.map((reason) => String(reason))
    : [];
  if (requestLocked && !reasonCodes.includes("SUNDAY_MATCH_REQUEST_LOCK")) {
    reasonCodes.unshift("SUNDAY_MATCH_REQUEST_LOCK");
  }
  return {
    schemaVersion: "GOAT_ARENA_MAIN_ACTIONS_V1",
    eligible: actionData?.eligible === true && !requestLocked,
    reasonCodes,
    requestLocked,
    currentTier: actionData?.currentTier || null,
    availableLearningDays,
    matchmakingRestrictedUntil: isoString(
      actionData?.matchmakingRestrictedUntil
    ),
    hasActiveMatch: Boolean(activeMatch?._id),
    sentInvitations: (Array.isArray(actionData?.sentInvitations)
      ? actionData.sentInvitations
      : []).map((invitation) => ({
      id: String(invitation?._id || ""),
      status: String(invitation?.status || "SEARCHING"),
      targetTier: String(invitation?.targetTier || ""),
      stakeDays: Math.max(0, Number(invitation?.stakeDays || 0)),
      reservedLearningDays: Math.max(
        0,
        Number(invitation?.reservedLearningDays || 0)
      ),
      createdAt: isoString(invitation?.createdAt),
      canCancel: ["SEARCHING", "OFFERED", "PAUSED"].includes(
        String(invitation?.status || "")
      ),
    })),
    upwardTargets: targets(actionData?.upwardTargets),
    lowerTargets: targets(actionData?.lowerTargets, { invitation: true }),
  };
}

function createGoatArenaProductionCommandService(options = {}) {
  const models = {
    ArenaMatch: options.models?.ArenaMatch || ArenaMatch,
    ArenaMatchAttempt: options.models?.ArenaMatchAttempt || ArenaMatchAttempt,
    ArenaMatchEvidence: options.models?.ArenaMatchEvidence || ArenaMatchEvidence,
    ArenaProblemPack: options.models?.ArenaProblemPack || ArenaProblemPack,
    MainInvitationOffer:
      options.models?.MainInvitationOffer || MainInvitationOffer,
  };
  const commands = {
    advanceArenaMatchQuestion:
      options.commands?.advanceArenaMatchQuestion || advanceArenaMatchQuestion,
    getArenaMatchPageData:
      options.commands?.getArenaMatchPageData || getArenaMatchPageData,
    prepareArenaMatch: options.commands?.prepareArenaMatch || prepareArenaMatch,
    recordArenaMatchActivity:
      options.commands?.recordArenaMatchActivity || recordArenaMatchActivity,
    respondToMainInvitation:
      options.commands?.respondToMainInvitation || respondToMainInvitation,
    cancelMainInvitation:
      options.commands?.cancelMainInvitation || cancelMainInvitation,
    createMainLowerInvitation:
      options.commands?.createMainLowerInvitation || createMainLowerInvitation,
    createMainUpwardChallenge:
      options.commands?.createMainUpwardChallenge || createMainUpwardChallenge,
    getMainArenaActionData:
      options.commands?.getMainArenaActionData || getMainArenaActionData,
    createSubNormalChallenge:
      options.commands?.createSubNormalChallenge || createSubNormalChallenge,
    saveArenaMatchAnswers:
      options.commands?.saveArenaMatchAnswers || saveArenaMatchAnswers,
    settleArenaMatch: options.commands?.settleArenaMatch || settleArenaMatch,
    startArenaMatchAttempt:
      options.commands?.startArenaMatchAttempt || startArenaMatchAttempt,
    submitArenaMatchAttempt:
      options.commands?.submitArenaMatchAttempt || submitArenaMatchAttempt,
    submitArenaMatchEvidence:
      options.commands?.submitArenaMatchEvidence || submitArenaMatchEvidence,
    attachArenaClientReview:
      options.commands?.attachArenaClientReview || attachArenaClientReview,
  };
  const now = typeof options.now === "function" ? options.now : () => new Date();

  async function loadParticipantAuthority(matchId, userId) {
    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      fail("GOAT_ARENA_MATCH_NOT_FOUND", "GOAT Arena match was not found", {
        statusCode: 404,
      });
    }
    const match = await models.ArenaMatch.findOne({
      _id: new mongoose.Types.ObjectId(matchId),
      $or: [
        { "challenger.userId": userId },
        { "defender.userId": userId },
      ],
    }).lean();
    if (!match) {
      fail("GOAT_ARENA_MATCH_NOT_FOUND", "GOAT Arena match was not found", {
        statusCode: 404,
      });
    }
    const role = participantRole(match, userId);
    const [attempt, pack] = await Promise.all([
      models.ArenaMatchAttempt.findOne({ matchId: match._id, userId }).lean(),
      match.problemPackId
        ? models.ArenaProblemPack.findById(match.problemPackId)
            .select("+questions +contentHash")
            .lean()
        : null,
    ]);
    return { match, attempt, pack, role };
  }

  function currentQuestion(authority) {
    if (!authority.attempt || !authority.pack) return null;
    const index = Number(authority.attempt.currentQuestionIndex || 0);
    return authority.pack.questions?.[index] || null;
  }

  function serializeQuestion(question, slot) {
    const visualizationJSON = question.visualization
      ? JSON.stringify(question.visualization)
      : null;
    return {
      slot,
      questionVersionId: question.questionKey,
      stem: question.prompt,
      choices: (question.choices || []).map((choice) => ({
        key: choice.key,
        text: choice.text,
      })),
      inputMode:
        question.inputMode === "short-answer" ? "SHORT_ANSWER" : question.inputMode,
      scoreWeight: Number(question.points || 0),
      targetDifficulty: Number(question.difficultyScore || 0),
      calibratedDifficulty: Number(question.difficultyScore || 0),
      advanced: question.difficultyPosition === "HIGH",
      visualizationJSON,
      savedAnswer: "",
    };
  }

  function serializeQuestionPack(authority) {
    const { match, attempt, pack, role } = authority;
    if (!pack) {
      fail(
        "GOAT_ARENA_QUESTION_PACK_NOT_READY",
        "participant question pack is not ready",
        { statusCode: 409 }
      );
    }
    const index = Number(attempt?.currentQuestionIndex || 0);
    const question =
      attempt?.status === "IN_PROGRESS" ? currentQuestion(authority) : null;
    const savedAnswer = question
      ? (attempt.answers || []).find(
          (answer) => answer.questionKey === question.questionKey
        )?.value || ""
      : "";
    return {
      questionPackId: String(pack._id),
      matchId: String(match._id),
      participantRole: role,
      packVersion: pack.version,
      curriculumVersion: (pack.curriculumCoverage || []).join(","),
      questionVersion: question?.questionKey || pack.version,
      scoringPolicyVersion: match.scoringVersion || pack.scoringVersion,
      questionCount: Number(pack.questionCount || 5),
      currentQuestionNumber: Math.min(
        Number(pack.questionCount || 5),
        index + 1
      ),
      timeLimitSeconds: Math.round(Number(pack.timeLimitMs || match.timeLimitMs) / 1000),
      questions: question
        ? [
            {
              ...serializeQuestion(question, index + 1),
              savedAnswer,
            },
          ]
        : [],
      sealedAt: isoString(pack.sealedAt || pack.createdAt),
    };
  }

  function serializeAttempt(authority) {
    const { match, attempt, pack, role } = authority;
    if (!attempt || !pack) {
      fail("GOAT_ARENA_ATTEMPT_NOT_READY", "participant attempt is not ready", {
        statusCode: 409,
      });
    }
    return {
      attemptId: String(attempt._id),
      matchId: String(match._id),
      participantRole: role,
      questionPackId: String(pack._id),
      questionPackVersion: pack.version,
      scoringPolicyVersion: match.scoringVersion || pack.scoringVersion,
      timingPolicyVersion: "ARENA_CURRENT_QUESTION_10M_V1",
      status: attempt.status,
      questionCount: Number(pack.questionCount || 5),
      currentQuestionNumber: Math.min(
        Number(pack.questionCount || 5),
        Number(attempt.currentQuestionIndex || 0) + 1
      ),
      timeLimitSeconds: Math.round(Number(pack.timeLimitMs || match.timeLimitMs) / 1000),
      startedAt: isoString(attempt.startedAt),
      endsAt: isoString(attempt.deadlineAt),
      commonSubmitsBy: isoString(match.completionDeadlineAt || match.startDeadlineAt),
      networkReconnectGraceMs: null,
      recognizedHeartbeatActiveMs: 0,
      submittedAt: isoString(attempt.submittedAt),
      evidenceDeadlineAt: isoString(attempt.evidenceDeadlineAt),
      evidenceRequired: attempt.status === "EVIDENCE_REQUIRED",
    };
  }

  function serializeStart(authority) {
    return {
      attempt: serializeAttempt(authority),
      questionPack: serializeQuestionPack(authority),
    };
  }

  async function acceptParticipantChallenge(authContext, rawInput) {
    const userId = authenticatedUserId(authContext);
    const input = normalizedInput(rawInput, [
      "matchId",
      "idempotencyKey",
      "clientBuildVersion",
    ]);
    const acceptedOffer = await models.MainInvitationOffer.findOne({
      _id: input.matchId,
      candidateUserId: userId,
      status: "ACCEPTED",
    }).lean();
    let result = null;
    if (!acceptedOffer) {
      result = await commands.respondToMainInvitation({
        offerId: input.matchId,
        userId,
        response: "ACCEPT",
        now: new Date(now()),
      });
    }
    let matchId = result?.matchId || result?.match?._id;
    const replayOffer = acceptedOffer || (
      result?.status === "ACCEPTED"
        ? await models.MainInvitationOffer.findOne({
            _id: input.matchId,
            candidateUserId: userId,
            status: "ACCEPTED",
          }).lean()
        : null
    );
    if (!matchId && replayOffer) {
      const replayMatch = await models.ArenaMatch.findOne({
        invitationRequestId: replayOffer.invitationRequestId,
        $or: [
          { "challenger.userId": userId },
          { "defender.userId": userId },
        ],
      }).sort({ createdAt: -1 }).lean();
      matchId = replayMatch?._id || null;
    }
    if (!matchId) {
      fail("GOAT_ARENA_INVITATION_STATE_INVALID", "invitation was not matched", {
        statusCode: 409,
      });
    }
    const authority = await loadParticipantAuthority(String(matchId), userId);
    return {
      match: {
        id: String(authority.match._id),
        status: authority.match.status,
        integrityState: publicIntegrityState(authority.match),
      },
      invitationId: input.matchId,
    };
  }

  async function createParticipantSubMatch(authContext, rawInput) {
    const userId = authenticatedUserId(authContext);
    const input = normalizedCreateInput(rawInput);
    const result = await commands.createSubNormalChallenge({
      challengerUserId: userId,
      requestId: input.idempotencyKey,
      now: new Date(now()),
    });
    const createdMatch = result?.match;
    const createdMatchId = createdMatch?._id || result?.matchId;
    if (!createdMatchId) {
      fail("GOAT_ARENA_MATCH_CREATE_FAILED", "GOAT Arena match was not created", {
        statusCode: 409,
      });
    }
    const authority = await loadParticipantAuthority(String(createdMatchId), userId);
    return {
      match: {
        id: String(authority.match._id),
        status: authority.match.status,
        integrityState: publicIntegrityState(authority.match),
      },
    };
  }

  async function getParticipantMainOptions(authContext) {
    const userId = authenticatedUserId(authContext);
    const actionData = await commands.getMainArenaActionData({
      userId,
      now: new Date(now()),
    });
    return serializeMainActionOptions(actionData);
  }

  async function createParticipantMainUpwardMatch(authContext, rawInput) {
    const userId = authenticatedUserId(authContext);
    const input = normalizedCreateInput(rawInput, { includeTarget: true });
    const result = await commands.createMainUpwardChallenge({
      userId,
      targetTier: input.targetTier,
      stakeDays: input.stakeDays,
      requestId: input.idempotencyKey,
      now: new Date(now()),
    });
    const createdMatch = asPlain(result?.match);
    const matchId = createdMatch?._id || result?.matchId;
    if (!matchId) {
      fail("GOAT_ARENA_MATCH_CREATE_FAILED", "GOAT Arena match was not created", {
        statusCode: 409,
      });
    }
    return {
      kind: "MATCH",
      match: {
        id: String(matchId),
        status: createdMatch?.status || "MATCHED",
        integrityState: publicIntegrityState(createdMatch || {}),
      },
    };
  }

  async function createParticipantMainInvitation(authContext, rawInput) {
    const userId = authenticatedUserId(authContext);
    const input = normalizedCreateInput(rawInput, { includeTarget: true });
    const result = asPlain(
      await commands.createMainLowerInvitation({
        userId,
        targetTier: input.targetTier,
        stakeDays: input.stakeDays,
        requestId: input.idempotencyKey,
        now: new Date(now()),
      })
    );
    if (!result?._id) {
      fail(
        "GOAT_ARENA_INVITATION_CREATE_FAILED",
        "GOAT Arena invitation was not created",
        { statusCode: 409 }
      );
    }
    return {
      kind: "INVITATION",
      invitation: {
        id: String(result._id),
        status: result.status || "SEARCHING",
        targetTier: result.targetTier || input.targetTier,
        stakeDays: Number(result.stakeDays || input.stakeDays),
      },
    };
  }

  async function cancelParticipantMainInvitation(authContext, rawInput) {
    const userId = authenticatedUserId(authContext);
    const input = normalizedInput(rawInput, [
      "matchId",
      "idempotencyKey",
      "clientBuildVersion",
    ]);
    const result = asPlain(
      await commands.cancelMainInvitation({
        invitationId: input.matchId,
        userId,
        cancellationType: "MANUAL",
        reason: "USER_CANCELLED",
        now: new Date(now()),
      })
    );
    return {
      kind: "INVITATION_CANCELLATION",
      invitation: {
        id: String(result?._id || input.matchId),
        status: result?.status || "CANCELLED",
        releasedLearningDays: Math.max(
          0,
          Number(result?.releasedLearningDays || 0)
        ),
        burnedLearningDays: Math.max(
          0,
          Number(result?.burnedLearningDays || 0)
        ),
      },
    };
  }

  async function declineParticipantChallenge(authContext, rawInput) {
    const userId = authenticatedUserId(authContext);
    const input = normalizedInput(rawInput, [
      "matchId",
      "idempotencyKey",
      "clientBuildVersion",
      "reasonCode",
    ]);
    const result = await commands.respondToMainInvitation({
      offerId: input.matchId,
      userId,
      response: "DECLINE",
      reasonCode: input.reasonCode,
      now: new Date(now()),
    });
    // The iPad command contract treats a successful decline as a terminal
    // CANCELLED receipt.  A concurrently accepted/superseded offer is not a
    // successful decline; returning HTTP 200 with that internal status leaves
    // the client retry record stuck because it cannot reconcile the receipt.
    if (result?.status !== "DECLINED") {
      fail(
        "GOAT_ARENA_INVITATION_STATE_CHANGED",
        "초대 상태가 이미 변경되었습니다. 최신 Arena 상태를 다시 확인해주세요.",
        { statusCode: 409 }
      );
    }
    return {
      match: {
        id: input.matchId,
        status: "CANCELLED",
        integrityState: "CLEAR",
      },
      invitationId: input.matchId,
    };
  }

  async function startParticipantMatch(authContext, rawInput) {
    const userId = authenticatedUserId(authContext);
    const input = normalizedInput(rawInput, [
      "matchId",
      "idempotencyKey",
      "clientBuildVersion",
    ]);
    let authority = await loadParticipantAuthority(input.matchId, userId);
    if (!authority.pack && authority.match.status === "MATCHED") {
      await commands.prepareArenaMatch({
        matchId: input.matchId,
        userId,
        now: new Date(now()),
      });
      authority = await loadParticipantAuthority(input.matchId, userId);
    }
    if (authority.attempt?.status === "READY") {
      await commands.startArenaMatchAttempt({
        matchId: input.matchId,
        userId,
        requestId: input.idempotencyKey,
        now: new Date(now()),
      });
      authority = await loadParticipantAuthority(input.matchId, userId);
    }
    if (authority.attempt?.status === "IN_PROGRESS") {
      // 이 호출은 만료된 현재 문항을 서버 시각으로 확정하고 다음 문항만
      // 공개한다. 브라우저와 iPad가 같은 자동 진행 함수를 공유한다.
      await commands.getArenaMatchPageData({
        matchId: input.matchId,
        userId,
        now: new Date(now()),
      });
      authority = await loadParticipantAuthority(input.matchId, userId);
    }
    return serializeStart(authority);
  }

  async function getParticipantQuestionPack(authContext, rawInput) {
    const userId = authenticatedUserId(authContext);
    const input = normalizedInput(rawInput, [
      "matchId",
      "idempotencyKey",
      "clientBuildVersion",
    ]);
    await commands.getArenaMatchPageData({
      matchId: input.matchId,
      userId,
      now: new Date(now()),
    });
    const authority = await loadParticipantAuthority(input.matchId, userId);
    return serializeQuestionPack(authority);
  }

  async function recordParticipantEvent(authContext, rawInput) {
    const userId = authenticatedUserId(authContext);
    const input = normalizedInput(rawInput, [
      "matchId",
      "idempotencyKey",
      "clientBuildVersion",
      "eventType",
      "payload",
    ]);
    const authority = await loadParticipantAuthority(input.matchId, userId);
    const question = currentQuestion(authority);
    const slot = Number(authority.attempt?.currentQuestionIndex || 0) + 1;
    const payload = input.payload || {};
    let answerStored = false;

    if (input.eventType === "ANSWER_CHANGED") {
      if (Number(payload.questionSlot) !== slot || !question) {
        fail("GOAT_ARENA_QUESTION_SEQUENCE_REQUIRED", "current question is required", {
          statusCode: 409,
        });
      }
      await commands.saveArenaMatchAnswers({
        matchId: input.matchId,
        userId,
        requestId: input.idempotencyKey,
        changes: [
          {
            questionKey: question.questionKey,
            value: payload.answer,
            clientAt: new Date(now()),
          },
        ],
        now: new Date(now()),
      });
      answerStored = true;
    } else {
      const signals = [];
      if (input.eventType === "HEARTBEAT") {
        signals.push({ type: "HEARTBEAT", clientAt: new Date(now()) });
      } else if (input.eventType === "QUESTION_FOCUS") {
        if (Number(payload.questionSlot) !== slot || !question) {
          fail("GOAT_ARENA_QUESTION_SEQUENCE_REQUIRED", "current question is required", {
            statusCode: 409,
          });
        }
        signals.push({
          type: "QUESTION_FOCUSED",
          questionKey: question.questionKey,
          clientAt: new Date(now()),
        });
      } else if (input.eventType === "NETWORK_STATE") {
        const state = String(payload.networkState || "").toUpperCase();
        signals.push({
          type: ["BACKGROUND", "OFFLINE", "DISCONNECTED"].includes(state)
            ? "FOCUS_LOST"
            : "FOCUS_GAINED",
          clientAt: new Date(now()),
        });
      } else {
        fail("GOAT_ARENA_EVENT_TYPE_INVALID", "event type is not supported");
      }
      await commands.recordArenaMatchActivity({
        matchId: input.matchId,
        userId,
        requestId: input.idempotencyKey,
        signals,
        now: new Date(now()),
      });
    }

    const refreshed = await loadParticipantAuthority(input.matchId, userId);
    return {
      eventId: input.idempotencyKey,
      attemptId: String(refreshed.attempt._id),
      matchId: String(refreshed.match._id),
      eventType: input.eventType,
      clientEventId: input.idempotencyKey,
      serverSequence: Number(refreshed.attempt.answerRevision || 0),
      serverOccurredAt: isoString(new Date(now())),
      questionSlot: ["ANSWER_CHANGED", "QUESTION_FOCUS"].includes(input.eventType)
        ? slot
        : null,
      networkState:
        input.eventType === "NETWORK_STATE"
          ? String(payload.networkState || "")
          : null,
      recognizedActiveIntervalMs: 0,
      answerStored,
    };
  }

  async function advanceParticipantQuestion(authContext, rawInput) {
    const userId = authenticatedUserId(authContext);
    const input = normalizedInput(rawInput, [
      "matchId",
      "idempotencyKey",
      "clientBuildVersion",
      "questionSlot",
      "answer",
    ]);
    const authority = await loadParticipantAuthority(input.matchId, userId);
    const expectedSlot = Number(authority.attempt?.currentQuestionIndex || 0) + 1;
    if (Number(input.questionSlot) !== expectedSlot) {
      fail("GOAT_ARENA_QUESTION_SEQUENCE_REQUIRED", "current question is required", {
        statusCode: 409,
      });
    }
    await commands.advanceArenaMatchQuestion({
      matchId: input.matchId,
      userId,
      requestId: input.idempotencyKey,
      value: input.answer,
      submissionMode: "MANUAL",
      now: new Date(now()),
    });
    const refreshed = await loadParticipantAuthority(input.matchId, userId);
    return serializeStart(refreshed);
  }

  async function submitParticipantAttempt(authContext, rawInput) {
    const userId = authenticatedUserId(authContext);
    const input = normalizedInput(rawInput, [
      "matchId",
      "idempotencyKey",
      "clientBuildVersion",
    ]);
    await commands.submitArenaMatchAttempt({
      matchId: input.matchId,
      userId,
      requestId: input.idempotencyKey,
      changes: [],
      submissionMode: "MANUAL",
      now: new Date(now()),
    });
    const authority = await loadParticipantAuthority(input.matchId, userId);
    const answerCount = (authority.attempt.answers || []).filter(
      (answer) => String(answer.value || "").trim()
    ).length;
    return {
      submissionRecordId: `${authority.attempt._id}:submission`,
      attemptId: String(authority.attempt._id),
      matchId: String(authority.match._id),
      participantRole: authority.role,
      questionPackId: String(authority.pack._id),
      submissionId: input.idempotencyKey,
      submittedAt: isoString(authority.attempt.submittedAt),
      evidenceDeadlineAt: isoString(authority.attempt.evidenceDeadlineAt),
      evidenceRequired: authority.attempt.status === "EVIDENCE_REQUIRED",
      lastAcceptedServerSequence: Number(authority.attempt.answerRevision || 0),
      recognizedHeartbeatActiveMs: 0,
      answerCount,
    };
  }

  async function submitParticipantEvidence(authContext, rawInput) {
    const userId = authenticatedUserId(authContext);
    const input = normalizedInput(rawInput, [
      "matchId",
      "idempotencyKey",
      "clientBuildVersion",
      "files",
      "receivedAt",
    ]);
    const result = await commands.submitArenaMatchEvidence({
      matchId: input.matchId,
      userId,
      files: input.files,
      receivedAt: input.receivedAt,
      now: new Date(now()),
    });
    let settlement = null;
    if (result.matchStatus === "SUBMITTED") {
      settlement = await commands.settleArenaMatch({
        matchId: input.matchId,
        now: new Date(now()),
      });
    }
    const [attempt, evidence] = await Promise.all([
      models.ArenaMatchAttempt.findOne({ matchId: input.matchId, userId }).lean(),
      models.ArenaMatchEvidence.findOne({ matchId: input.matchId, userId }).lean(),
    ]);
    return {
      evidenceId: result.evidenceId,
      attemptId: String(attempt?._id || ""),
      status: result.status,
      matchStatus: settlement?.status || result.matchStatus,
      replayed: result.replayed,
      submissionId: input.idempotencyKey,
      submittedAt: isoString(evidence?.submittedAt),
      deadlineAt: isoString(evidence?.deadlineAt),
      anomalyFlags: evidence?.anomalyFlags || [],
    };
  }

  async function submitParticipantClientReview(authContext, rawInput) {
    const userId = authenticatedUserId(authContext);
    const input = normalizedInput(rawInput, [
      "matchId",
      "idempotencyKey",
      "clientBuildVersion",
      "evidenceId",
      "model",
      "modelVersion",
      "reviewState",
      "signals",
      "completedAt",
    ]);
    return commands.attachArenaClientReview({
      matchId: input.matchId,
      evidenceId: input.evidenceId,
      userId,
      review: {
        reviewId: input.idempotencyKey,
        model: input.model,
        modelVersion: input.modelVersion,
        reviewState: input.reviewState,
        signals: input.signals,
        clientBuildVersion: input.clientBuildVersion,
        completedAt: input.completedAt,
      },
      now: new Date(now()),
    });
  }

  return Object.freeze({
    acceptParticipantChallenge,
    advanceParticipantQuestion,
    cancelParticipantMainInvitation,
    createParticipantMainInvitation,
    createParticipantMainUpwardMatch,
    createParticipantSubMatch,
    declineParticipantChallenge,
    getParticipantMainOptions,
    getParticipantQuestionPack,
    recordParticipantEvent,
    startParticipantMatch,
    submitParticipantAttempt,
    submitParticipantClientReview,
    submitParticipantEvidence,
    _testing: {
      loadParticipantAuthority,
      serializeAttempt,
      serializeQuestionPack,
      serializeStart,
    },
  });
}

module.exports = {
  GoatArenaProductionCommandError,
  createGoatArenaProductionCommandService,
  serializeMainActionOptions,
};
