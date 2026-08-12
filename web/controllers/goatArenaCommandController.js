const {
  createGoatArenaProductionCommandService,
} = require(
  "../services/goatArenaProductionCommandService"
);

const MAX_COMMAND_KEY_LENGTH = 180;
const MAX_CLIENT_BUILD_LENGTH = 100;

class GoatArenaCommandControllerError
  extends Error {
  constructor(
    code,
    message,
    statusCode = 400
  ) {
    super(message);
    this.name =
      "GoatArenaCommandControllerError";
    this.code = code;
    this.statusCode =
      statusCode;
    this.status =
      statusCode;
  }
}

function fail(
  code,
  message,
  statusCode
) {
  throw new GoatArenaCommandControllerError(
    code,
    message,
    statusCode
  );
}

function requiredHeader(
  req,
  name,
  maxLength
) {
  const value =
    typeof req.get ===
      "function"
      ? req.get(name)
      : req.headers?.[
          name.toLowerCase()
        ];
  if (
    typeof value !==
      "string" ||
    !value.trim() ||
    value.trim().length >
      maxLength
  ) {
    fail(
      "GOAT_ARENA_COMMAND_HEADER_REQUIRED",
      "요청 식별 정보를 확인한 뒤 다시 시도해주세요.",
      400
    );
  }
  return value.trim();
}

function strictBody(
  req,
  allowedFields
) {
  const body =
    req.body ===
      undefined ||
    req.body === null
      ? {}
      : req.body;
  if (
    typeof body !==
      "object" ||
    Array.isArray(body)
  ) {
    fail(
      "GOAT_ARENA_COMMAND_BODY_INVALID",
      "요청 형식을 확인해주세요.",
      400
    );
  }
  const allowed =
    new Set(
      allowedFields
    );
  const unexpected =
    Object.keys(body)
      .filter(
        (field) =>
          !allowed.has(field)
      );
  if (unexpected.length) {
    fail(
      "GOAT_ARENA_COMMAND_BODY_INVALID",
      "요청에 허용되지 않은 값이 포함되어 있습니다.",
      400
    );
  }
  return body;
}

function commandContext(
  req
) {
  if (!req.apiUser?._id) {
    fail(
      "UNAUTHORIZED",
      "다시 로그인한 뒤 시도해주세요.",
      401
    );
  }
  return {
    userId:
      req.apiUser._id,
  };
}

function commandInput(
  req
) {
  return {
    matchId:
      req.params
        .matchId,
    idempotencyKey:
      requiredHeader(
        req,
        "Idempotency-Key",
        MAX_COMMAND_KEY_LENGTH
      ),
    clientBuildVersion:
      requiredHeader(
        req,
        "X-Matths-Client-Version",
        MAX_CLIENT_BUILD_LENGTH
      ),
  };
}

function createCommandInput(
  req,
  body = {}
) {
  return {
    ...body,
    idempotencyKey:
      requiredHeader(
        req,
        "Idempotency-Key",
        MAX_COMMAND_KEY_LENGTH
      ),
    clientBuildVersion:
      requiredHeader(
        req,
        "X-Matths-Client-Version",
        MAX_CLIENT_BUILD_LENGTH
      ),
  };
}

function createGoatArenaCommandController(
  {
    commandService =
      createGoatArenaProductionCommandService(),
  } = {}
) {
  async function startMatch(
    req,
    res,
    next
  ) {
    try {
      strictBody(req, []);
      const result =
        await commandService
          .startParticipantMatch(
            commandContext(req),
            commandInput(req)
          );
      return res.json(
        result
      );
    } catch (error) {
      return next(error);
    }
  }

  async function createSubMatch(
    req,
    res,
    next
  ) {
    try {
      strictBody(req, []);
      const result = await commandService.createParticipantSubMatch(
        commandContext(req),
        createCommandInput(req)
      );
      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async function getMainOptions(
    req,
    res,
    next
  ) {
    try {
      const result = await commandService.getParticipantMainOptions(
        commandContext(req)
      );
      res.set("Cache-Control", "no-store");
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  async function createMainUpwardMatch(
    req,
    res,
    next
  ) {
    try {
      const body = strictBody(req, ["targetTier", "stakeDays"]);
      const result = await commandService.createParticipantMainUpwardMatch(
        commandContext(req),
        createCommandInput(req, {
          targetTier: body.targetTier,
          stakeDays: body.stakeDays,
        })
      );
      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async function createMainInvitation(
    req,
    res,
    next
  ) {
    try {
      const body = strictBody(req, ["targetTier", "stakeDays"]);
      const result = await commandService.createParticipantMainInvitation(
        commandContext(req),
        createCommandInput(req, {
          targetTier: body.targetTier,
          stakeDays: body.stakeDays,
        })
      );
      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async function cancelMainInvitation(
    req,
    res,
    next
  ) {
    try {
      strictBody(req, []);
      const result = await commandService.cancelParticipantMainInvitation(
        commandContext(req),
        {
          matchId: req.params.invitationId,
          ...createCommandInput(req),
        }
      );
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  async function acceptChallenge(
    req,
    res,
    next
  ) {
    try {
      strictBody(req, []);
      const result =
        await commandService
          .acceptParticipantChallenge(
            commandContext(req),
            commandInput(req)
          );
      return res.json(
        result
      );
    } catch (error) {
      return next(error);
    }
  }

  async function declineChallenge(
    req,
    res,
    next
  ) {
    try {
      const body =
        strictBody(
          req,
          ["reasonCode"]
        );
      const result =
        await commandService
          .declineParticipantChallenge(
            commandContext(req),
            {
              ...commandInput(req),
              reasonCode:
                body.reasonCode,
            }
          );
      return res.json(
        result
      );
    } catch (error) {
      return next(error);
    }
  }

  async function getQuestions(
    req,
    res,
    next
  ) {
    try {
      strictBody(req, []);
      const questionPack =
        await commandService
          .getParticipantQuestionPack(
            commandContext(req),
            commandInput(req)
          );
      return res.json({
        questionPack,
      });
    } catch (error) {
      return next(error);
    }
  }

  function eventHandler(
    eventType,
    allowedFields,
    payloadFrom
  ) {
    return async (
      req,
      res,
      next
    ) => {
      try {
        const body =
          strictBody(
            req,
            allowedFields
          );
        const event =
          await commandService
            .recordParticipantEvent(
              commandContext(
                req
              ),
              {
                ...commandInput(
                  req
                ),
                eventType,
                payload:
                  payloadFrom(
                    body
                  ),
              }
            );
        return res.json({
          event,
        });
      } catch (error) {
        return next(error);
      }
    };
  }

  const heartbeat =
    eventHandler(
      "HEARTBEAT",
      [],
      () => ({})
    );
  const saveAnswer =
    eventHandler(
      "ANSWER_CHANGED",
      [
        "questionSlot",
        "answer",
      ],
      (body) => ({
        questionSlot:
          body
            .questionSlot,
        answer:
          body.answer,
      })
    );
  const recordQuestionFocus =
    eventHandler(
      "QUESTION_FOCUS",
      ["questionSlot"],
      (body) => ({
        questionSlot:
          body
            .questionSlot,
      })
    );
  const recordNetworkState =
    eventHandler(
      "NETWORK_STATE",
      ["networkState"],
      (body) => ({
        networkState:
          body
            .networkState,
      })
    );

  async function submitAttempt(
    req,
    res,
    next
  ) {
    try {
      strictBody(req, []);
      const attempt =
        await commandService
          .submitParticipantAttempt(
            commandContext(req),
            commandInput(req)
          );
      return res.json({
        attempt,
      });
    } catch (error) {
      return next(error);
    }
  }

  async function advanceQuestion(
    req,
    res,
    next
  ) {
    try {
      const body = strictBody(
        req,
        ["questionSlot", "answer"]
      );
      const result =
        await commandService
          .advanceParticipantQuestion(
            commandContext(req),
            {
              ...commandInput(req),
              questionSlot:
                body.questionSlot,
              answer: body.answer,
            }
          );
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  async function submitEvidence(
    req,
    res,
    next
  ) {
    try {
      const evidence =
        await commandService
          .submitParticipantEvidence(
            commandContext(req),
            {
              ...commandInput(req),
              files: req.files,
              receivedAt:
                req.arenaEvidenceReceivedAt ||
                new Date(),
            }
          );
      return res.json({ evidence });
    } catch (error) {
      return next(error);
    }
  }

  async function submitClientReview(
    req,
    res,
    next
  ) {
    try {
      const body = strictBody(req, [
        "evidenceId",
        "model",
        "modelVersion",
        "reviewState",
        "signals",
        "completedAt",
      ]);
      const review = await commandService.submitParticipantClientReview(
        commandContext(req),
        {
          ...commandInput(req),
          ...body,
        }
      );
      return res.json({ review });
    } catch (error) {
      return next(error);
    }
  }

  return Object.freeze({
    acceptChallenge,
    advanceQuestion,
    cancelMainInvitation,
    createMainInvitation,
    createMainUpwardMatch,
    createSubMatch,
    declineChallenge,
    getMainOptions,
    getQuestions,
    heartbeat,
    recordNetworkState,
    recordQuestionFocus,
    saveAnswer,
    startMatch,
    submitAttempt,
    submitClientReview,
    submitEvidence,
  });
}

const defaultController =
  createGoatArenaCommandController();

module.exports = {
  GoatArenaCommandControllerError,
  createGoatArenaCommandController,
  ...defaultController,
};
