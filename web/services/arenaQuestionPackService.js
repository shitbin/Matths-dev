const crypto = require("node:crypto");
const mongoose = require("mongoose");

const {
  ArenaQuestionPack,
  ArenaQuestionTemplateSet,
  collectTemplateContractIssues,
  computePackSealedContentHash,
  computeTemplateContentHash,
  sha256,
  stableJson,
} = require(
  "../models/arenaQuestionPackModel"
);
const {
  User,
} = require(
  "../models/matthsModel"
);
const {
  RankTakeoverMatch,
} = require(
  "../models/rankTakeoverMatchModel"
);
const PRIVATE_PACK_SELECTION =
  [
    "+answerKeyVersion",
    "+answerVersionIds",
    "+privateMaterial",
  ].join(" ");

class ArenaQuestionPackError
  extends Error {
  constructor(
    code,
    message,
    {
      statusCode = 409,
      reasonCode = null,
      details = null,
      cause,
    } = {}
  ) {
    super(message, {
      cause,
    });
    this.name =
      "ArenaQuestionPackError";
    this.code = code;
    this.statusCode =
      statusCode;
    this.reasonCode =
      reasonCode;
    this.details = details;
  }
}

function fail(
  code,
  message,
  options
) {
  throw new ArenaQuestionPackError(
    code,
    message,
    options
  );
}

function policyPending(
  reasonCode,
  message,
  details = null
) {
  fail(
    "POLICY_PENDING",
    message,
    {
      statusCode: 409,
      reasonCode,
      details,
    }
  );
}

function requiredText(
  value,
  label,
  maxLength = 180
) {
  const normalized =
    String(value || "").trim();
  if (!normalized) {
    fail(
      "QUESTION_PACK_INPUT_INVALID",
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
      "QUESTION_PACK_INPUT_INVALID",
      `${label} is too long`,
      {
        statusCode: 400,
      }
    );
  }
  return normalized;
}

function requiredObjectId(
  value,
  label
) {
  if (
    !mongoose.Types.ObjectId
      .isValid(value)
  ) {
    fail(
      "QUESTION_PACK_INPUT_INVALID",
      `${label} must be a valid identifier`,
      {
        statusCode: 400,
      }
    );
  }
  return new mongoose
    .Types.ObjectId(value);
}

function validDate(
  value,
  label
) {
  const normalized =
    value instanceof Date
      ? new Date(
          value.getTime()
        )
      : new Date(value);
  if (
    !Number.isFinite(
      normalized.getTime()
    )
  ) {
    fail(
      "QUESTION_PACK_INPUT_INVALID",
      `${label} must be a valid date`,
      {
        statusCode: 400,
      }
    );
  }
  return normalized;
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

function isDuplicateKey(
  error
) {
  return Boolean(
    error &&
      (error.code === 11000 ||
        error
          .cause
          ?.code === 11000)
  );
}

function normalizeMatch(
  input
) {
  const value = asPlain(input);
  const matchId =
    requiredText(
      value.matchId,
      "match.matchId"
    );
  const activeRanking =
    requiredText(
      value.activeRanking,
      "match.activeRanking",
      10
    ).toUpperCase();
  const matchType =
    requiredText(
      value.matchType,
      "match.matchType",
      10
    ).toUpperCase();

  if (
    !["SUB", "MAIN"].includes(
      activeRanking
    )
  ) {
    fail(
      "QUESTION_PACK_INPUT_INVALID",
      "match.activeRanking must be SUB or MAIN",
      {
        statusCode: 400,
      }
    );
  }
  if (
    ![
      "NORMAL",
      "REVENGE",
    ].includes(matchType)
  ) {
    fail(
      "QUESTION_PACK_INPUT_INVALID",
      "match.matchType must be NORMAL or REVENGE",
      {
        statusCode: 400,
      }
    );
  }

  return {
    matchId,
    matchRecordId:
      value._id
        ? requiredObjectId(
            value._id,
            "match._id"
          )
        : null,
    policyVersionId:
      requiredObjectId(
        value.policyVersionId,
        "match.policyVersionId"
      ),
    activeRanking,
    matchType,
    status:
      String(
        value.status || ""
      ).toUpperCase(),
    challengerUserId:
      requiredObjectId(
        value.challengerUserId,
        "match.challengerUserId"
      ),
    defenderUserId:
      requiredObjectId(
        value.defenderUserId,
        "match.defenderUserId"
      ),
  };
}

function deriveSeed(
  seedSecret,
  purpose
) {
  return crypto
    .createHmac(
      "sha256",
      seedSecret
    )
    .update(purpose)
    .digest("hex");
}

function deterministicIndex(
  seed,
  length
) {
  if (
    !Number.isSafeInteger(
      length
    ) ||
    length <= 0
  ) {
    throw new TypeError(
      "selection length must be positive"
    );
  }
  const prefix =
    seed.slice(0, 16);
  return Number(
    BigInt(`0x${prefix}`) %
      BigInt(length)
  );
}

function unresolvedPolicyFields(
  template
) {
  const unresolved = [
    "curriculumVersion",
    "eligibilityPolicyVersion",
    "questionVersion",
    "answerKeyVersion",
    "difficultyCalibrationVersion",
    "scoringPolicyVersion",
  ].filter(
    (field) =>
      !String(
        template?.[field] ||
          ""
      ).trim()
  );
  if (
    !Number.isSafeInteger(
      template?.questionCount
    ) ||
    template.questionCount <= 0
  ) {
    unresolved.push(
      "questionCount"
    );
  }
  if (
    !Number.isSafeInteger(
      template
        ?.timeLimitSeconds
    ) ||
    template.timeLimitSeconds <=
      0
  ) {
    unresolved.push(
      "timeLimitSeconds"
    );
  }
  if (
    !Array.isArray(
      template
        ?.eligibleSchoolGrades
    ) ||
    !template
      .eligibleSchoolGrades
      .length
  ) {
    unresolved.push(
      "eligibleSchoolGrades"
    );
  }
  for (const field of [
    "calibratedScoreMethodVersion",
    "advancedThresholdVersion",
    "activeSolveTimePolicyVersion",
    "extraTieBreakerPolicyVersion",
    "answerComparisonPolicyVersion",
  ]) {
    if (
      !String(
        template
          ?.scoringContract?.[
            field
          ] || ""
      ).trim()
    ) {
      unresolved.push(
        `scoringContract.${field}`
      );
    }
  }
  return unresolved;
}

function assertApprovedTemplate(
  template,
  observedAt
) {
  if (!template) {
    policyPending(
      "APPROVED_QUESTION_TEMPLATE_UNAVAILABLE",
      "no approved sealed Arena question template exists for this policy"
    );
  }
  if (
    template.status !==
    "APPROVED"
  ) {
    policyPending(
      "QUESTION_TEMPLATE_NOT_APPROVED",
      "Arena question content has not completed approval"
    );
  }

  const unresolved =
    unresolvedPolicyFields(
      template
    );
  if (unresolved.length) {
    policyPending(
      "QUESTION_PACK_POLICY_VERSION_UNRESOLVED",
      "question, answer, calibration, or scoring policy versions are unresolved",
      {
        fields: unresolved,
      }
    );
  }

  if (
    !template.approval
      ?.approvedAt ||
    !template.approval
      ?.approvedBy ||
    !template.approval
      ?.reviewReference ||
    !template.approval
      ?.contentHash
  ) {
    policyPending(
      "QUESTION_TEMPLATE_APPROVAL_INCOMPLETE",
      "Arena question content is missing approval evidence"
    );
  }
  const approvedAt =
    new Date(
      template.approval
        .approvedAt
    );
  if (
    !Number.isFinite(
      approvedAt.getTime()
    )
  ) {
    policyPending(
      "QUESTION_TEMPLATE_APPROVAL_INCOMPLETE",
      "Arena question content approval timestamp is invalid"
    );
  }
  if (
    approvedAt > observedAt
  ) {
    policyPending(
      "QUESTION_TEMPLATE_APPROVAL_NOT_EFFECTIVE",
      "Arena question content approval is not effective yet"
    );
  }

  const issues =
    collectTemplateContractIssues(
      template
    ).filter(
      (issue) =>
        !issue.endsWith(
          " is unresolved"
        )
    );
  if (issues.length) {
    fail(
      "QUESTION_PACK_EQUIVALENCE_MISMATCH",
      "approved variants do not share one question-count, curriculum, difficulty, score, and scoring contract",
      {
        statusCode: 409,
        details: {
          issues,
        },
      }
    );
  }

  const expectedHash =
    computeTemplateContentHash(
      template
    );
  if (
    expectedHash !==
    template.approval
      .contentHash
  ) {
    fail(
      "QUESTION_TEMPLATE_APPROVAL_HASH_MISMATCH",
      "approved question template content no longer matches its review hash",
      {
        statusCode: 409,
      }
    );
  }
}

function equivalenceContract(
  template
) {
  return {
    curriculumVersion:
      template.curriculumVersion,
    eligibilityPolicyVersion:
      template
        .eligibilityPolicyVersion,
    questionCount:
      template.questionCount,
    timeLimitSeconds:
      template.timeLimitSeconds,
    difficultyCalibrationVersion:
      template
        .difficultyCalibrationVersion,
    scoringPolicyVersion:
      template
        .scoringPolicyVersion,
    scoringContract:
      template.scoringContract,
    equivalenceSlots:
      template.equivalenceSlots,
  };
}

function publicQuestion(
  question
) {
  return {
    slot: question.slot,
    questionVersionId:
      question.questionVersionId,
    stem: question.stem,
    choices:
      question.choices,
    inputMode:
      question.inputMode,
    scoreWeight:
      question.scoreWeight,
    targetDifficulty:
      question.targetDifficulty,
    calibratedDifficulty:
      question
        .calibratedDifficulty,
    advanced:
      Boolean(
        question.advanced
      ),
  };
}

function privateAnswerKey(
  question
) {
  return {
    slot: question.slot,
    questionVersionId:
      question.questionVersionId,
    answerVersionId:
      question.answerVersionId,
    correctAnswer:
      question.correctAnswer,
    solution:
      question.solution || "",
  };
}

function buildPackSource({
  packId,
  counterpartPackId,
  match,
  template,
  pairing,
  variant,
  participantRole,
  participantUserId,
  packVersion,
  rawRandomSeed,
  randomSeedHash,
  equivalenceContractHash,
  pairSealHash,
  sealedAt,
}) {
  const questions =
    variant.questions;
  const source = {
    _id: packId,
    matchId:
      match.matchId,
    matchRecordId:
      match.matchRecordId,
    participantRole,
    participantUserId,
    counterpartPackId,
    packVersion,
    templateSetId:
      template._id,
    templateSetVersion:
      template.templateSetVersion,
    approvedPairingVersion:
      pairing.pairingVersion,
    approvedVariantVersion:
      variant.variantVersion,
    approvalContentHash:
      template.approval
        .contentHash,
    curriculumVersion:
      template.curriculumVersion,
    questionVersion:
      template.questionVersion,
    questionVersionIds:
      questions.map(
        (question) =>
          question
            .questionVersionId
      ),
    answerKeyVersion:
      template.answerKeyVersion,
    answerVersionIds:
      questions.map(
        (question) =>
          question.answerVersionId
      ),
    difficultyCalibrationVersion:
      template
        .difficultyCalibrationVersion,
    scoringPolicyVersion:
      template
        .scoringPolicyVersion,
    eligibilityPolicyVersion:
      template
        .eligibilityPolicyVersion,
    randomSeedHash,
    equivalenceContractHash,
    pairSealHash,
    questionCount:
      template.questionCount,
    timeLimitSeconds:
      template.timeLimitSeconds,
    scoringContract:
      template.scoringContract,
    equivalenceSlots:
      template.equivalenceSlots,
    publicQuestions:
      questions.map(
        publicQuestion
      ),
    privateMaterial: {
      rawRandomSeed,
      answerKeys:
        questions.map(
          privateAnswerKey
        ),
    },
    sealedAt,
  };
  source.sealedContentHash =
    computePackSealedContentHash(
      source
    );
  return source;
}

function assertPackSeal(pack) {
  const value = asPlain(pack);
  if (
    !value.privateMaterial ||
    !Array.isArray(
      value.answerVersionIds
    ) ||
    !value.answerKeyVersion
  ) {
    fail(
      "QUESTION_PACK_PRIVATE_MATERIAL_UNAVAILABLE",
      "sealed pack could not be verified from private storage",
      {
        statusCode: 500,
      }
    );
  }
  if (
    sha256(
      value.privateMaterial
        .rawRandomSeed
    ) !==
    value.randomSeedHash
  ) {
    fail(
      "QUESTION_PACK_SEAL_INVALID",
      "sealed question selection seed failed verification",
      {
        statusCode: 409,
      }
    );
  }
  if (
    computePackSealedContentHash(
      value
    ) !==
    value.sealedContentHash
  ) {
    fail(
      "QUESTION_PACK_SEAL_INVALID",
      "sealed question content failed integrity verification",
      {
        statusCode: 409,
      }
    );
  }
}

function adapterResult(
  challenger,
  defender
) {
  const commonFields = [
    "questionVersion",
    "answerKeyVersion",
    "difficultyCalibrationVersion",
    "scoringPolicyVersion",
    "equivalenceContractHash",
    "pairSealHash",
    "questionCount",
    "timeLimitSeconds",
  ];
  for (
    const field of commonFields
  ) {
    if (
      stableJson(
        challenger[field]
      ) !==
      stableJson(defender[field])
    ) {
      fail(
        "QUESTION_PACK_EQUIVALENCE_MISMATCH",
        `sealed participant packs disagree on ${field}`,
        {
          statusCode: 409,
        }
      );
    }
  }
  return {
    challengerQuestionPackId:
      challenger._id,
    defenderQuestionPackId:
      defender._id,
    questionVersion:
      challenger.questionVersion,
    answerKeyVersion:
      challenger.answerKeyVersion,
    calibrationVersion:
      challenger
        .difficultyCalibrationVersion,
    timeLimitSeconds:
      challenger
        .timeLimitSeconds,
  };
}

function assertExistingPair(
  packs,
  match
) {
  if (!packs.length) {
    return null;
  }
  if (packs.length !== 2) {
    fail(
      "QUESTION_PACK_PARTIAL_SEAL",
      "only one participant pack exists; append-only packs cannot be regenerated",
      {
        statusCode: 409,
      }
    );
  }

  const challenger =
    packs.find(
      (pack) =>
        pack.participantRole ===
        "CHALLENGER"
    );
  const defender =
    packs.find(
      (pack) =>
        pack.participantRole ===
        "DEFENDER"
    );
  if (
    !challenger ||
    !defender
  ) {
    fail(
      "QUESTION_PACK_ROLE_CONFLICT",
      "sealed packs do not contain one challenger and one defender",
      {
        statusCode: 409,
      }
    );
  }
  if (
    !sameId(
      challenger
        .participantUserId,
      match.challengerUserId
    ) ||
    !sameId(
      defender
        .participantUserId,
      match.defenderUserId
    ) ||
    !sameId(
      challenger
        .counterpartPackId,
      defender._id
    ) ||
    !sameId(
      defender
        .counterpartPackId,
      challenger._id
    )
  ) {
    fail(
      "QUESTION_PACK_PARTICIPANT_CONFLICT",
      "sealed packs belong to a different participant contract",
      {
        statusCode: 409,
      }
    );
  }
  assertPackSeal(challenger);
  assertPackSeal(defender);
  return adapterResult(
    challenger,
    defender
  );
}

function userPublicProjection(
  pack
) {
  const value = asPlain(pack);
  return {
    questionPackId:
      value._id,
    matchId: value.matchId,
    participantRole:
      value.participantRole,
    packVersion:
      value.packVersion,
    curriculumVersion:
      value.curriculumVersion,
    questionVersion:
      value.questionVersion,
    questionVersionIds:
      value.questionVersionIds,
    difficultyCalibrationVersion:
      value
        .difficultyCalibrationVersion,
    scoringPolicyVersion:
      value.scoringPolicyVersion,
    randomSeedHash:
      value.randomSeedHash,
    questionCount:
      value.questionCount,
    timeLimitSeconds:
      value.timeLimitSeconds,
    scoringContract: {
      tieBreakOrder:
        value.scoringContract
          .tieBreakOrder,
    },
    questions:
      value.publicQuestions.map(
        (question) => ({
          slot: question.slot,
          questionVersionId:
            question
              .questionVersionId,
          stem: question.stem,
          choices:
            question.choices,
          inputMode:
            question.inputMode,
        })
      ),
    sealedAt:
      value.sealedAt,
  };
}

function scoringProjection(
  pack
) {
  const value = asPlain(pack);
  return {
    questionPackId:
      value._id,
    matchId: value.matchId,
    participantRole:
      value.participantRole,
    participantUserId:
      value.participantUserId,
    packVersion:
      value.packVersion,
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
    randomSeedHash:
      value.randomSeedHash,
    rawRandomSeed:
      value.privateMaterial
        .rawRandomSeed,
    questionCount:
      value.questionCount,
    timeLimitSeconds:
      value.timeLimitSeconds,
    scoringContract:
      value.scoringContract,
    equivalenceSlots:
      value.equivalenceSlots,
    questions:
      value.publicQuestions,
    answerKeys:
      value.privateMaterial
        .answerKeys,
    sealedContentHash:
      value.sealedContentHash,
  };
}

function createArenaQuestionPackService(
  options = {}
) {
  const seedSecret =
    options.seedSecret ??
    process.env
      .ARENA_QUESTION_PACK_SEED_SECRET;
  const now =
    typeof options.now ===
    "function"
      ? options.now
      : () => new Date();
  const serverCapability =
    options.serverCapability;
  const assertParticipantEligibility =
    options
      .assertParticipantEligibility;
  const assertPublicReleaseAllowed =
    options
      .assertPublicReleaseAllowed;

  function assertSeedPolicyReady() {
    if (
      typeof seedSecret !==
        "string" ||
      seedSecret.length < 32
    ) {
      policyPending(
        "QUESTION_PACK_SEED_SECRET_UNAVAILABLE",
        "secure deterministic Arena question selection is not configured"
      );
    }
  }

  async function loadExisting(
    match,
    session = null
  ) {
    let query =
      ArenaQuestionPack
        .find({
          matchId:
            match.matchId,
        })
        .select(
          PRIVATE_PACK_SELECTION
        )
        .sort({
          participantRole: 1,
        });
    if (session) {
      query = query.session(
        session
      );
    }
    return query.lean();
  }

  async function loadTemplate(
    match,
    session
  ) {
    let query =
      ArenaQuestionTemplateSet
        .findOne({
          policyVersionId:
            match.policyVersionId,
          activeRanking:
            match.activeRanking,
          matchType:
            match.matchType,
          status: "APPROVED",
        })
        .select("+variants");
    if (session) {
      query = query.session(
        session
      );
    }
    return query.lean();
  }

  async function verifyEligibility(
    match,
    template,
    session
  ) {
    if (
      typeof assertParticipantEligibility ===
      "function"
    ) {
      const outcome =
        await assertParticipantEligibility({
          match,
          template,
          session,
        });
      if (
        outcome !== true &&
        outcome?.eligible !== true
      ) {
        fail(
          "QUESTION_PACK_PARTICIPANT_INELIGIBLE",
          "the approved curriculum pack is outside a participant's common eligible scope",
          {
            statusCode: 409,
          }
        );
      }
      return;
    }

    let query = User.find({
      _id: {
        $in: [
          match
            .challengerUserId,
          match.defenderUserId,
        ],
      },
    }).select(
      "_id schoolGrade accountStatus isActive"
    );
    if (session) {
      query = query.session(
        session
      );
    }
    const participants =
      await query.lean();
    if (
      participants.length !== 2
    ) {
      fail(
        "QUESTION_PACK_PARTICIPANT_INELIGIBLE",
        "both participant records are required to prove a common curriculum scope",
        {
          statusCode: 409,
        }
      );
    }
    const allowedGrades =
      new Set(
        template
          .eligibleSchoolGrades
          .map(Number)
      );
    const eligible =
      participants.every(
        (participant) =>
          participant
            .accountStatus ===
            "active" &&
          participant.isActive !==
            false &&
          allowedGrades.has(
            Number(
              participant
                .schoolGrade
            )
          )
      );
    if (!eligible) {
      fail(
        "QUESTION_PACK_PARTICIPANT_INELIGIBLE",
        "the approved curriculum pack is outside a participant's common eligible scope",
        {
          statusCode: 409,
        }
      );
    }
  }

  async function createPair(
    match,
    observedAt,
    session
  ) {
    const existing =
      await loadExisting(
        match,
        session
      );
    const existingResult =
      assertExistingPair(
        existing,
        match
      );
    if (existingResult) {
      return existingResult;
    }

    // 봉인 허용 구간 — 역할별 공개 설계 기준.
    //
    // 예전엔 MATCHED 에서만 봉인을 허용했다. 그런데 시작이 역할별로 갈리면서
    // "상대는 시작했는데(IN_PROGRESS) 내 팩 쌍은 아직 없는" 경우가 정상 흐름이
    // 됐다 — 시작이 곧 공개가 아니고, 공개는 각자 개인 시작 뒤에만 일어난다.
    // 팩 내용은 시드 시크릿에서 결정적으로 나오므로 봉인 시점이 늦어도
    // 내용에 영향을 줄 수 없다.
    // 다만 제출 이후(SUBMITTED~)와 종료 상태에서는 새 봉인이 의미가 없고
    // 악용 여지만 생기므로 계속 막는다.
    const SEALABLE_MATCH_STATUSES =
      new Set([
        "MATCHED",
        "READY",
        "IN_PROGRESS",
      ]);
    if (
      match.status &&
      !SEALABLE_MATCH_STATUSES
        .has(match.status)
    ) {
      fail(
        "QUESTION_PACK_CREATION_CLOSED",
        "new question packs can only be sealed before the match is submitted",
        {
          statusCode: 409,
        }
      );
    }

    const template =
      await loadTemplate(
        match,
        session
      );
    assertApprovedTemplate(
      template,
      observedAt
    );
    await verifyEligibility(
      match,
      template,
      session
    );

    const matchSelectionSeed =
      deriveSeed(
        seedSecret,
        [
          "MATTHS_ARENA_PACK_V1",
          match.matchId,
          String(
            match.policyVersionId
          ),
          template
            .templateSetVersion,
        ].join("|")
      );
    const pairing =
      template.pairings[
        deterministicIndex(
          matchSelectionSeed,
          template
            .pairings.length
        )
      ];
    const variants =
      new Map(
        template.variants.map(
          (variant) => [
            variant
              .variantVersion,
            variant,
          ]
        )
      );
    const challengerVariant =
      variants.get(
        pairing
          .challengerVariantVersion
      );
    const defenderVariant =
      variants.get(
        pairing
          .defenderVariantVersion
      );
    if (
      !challengerVariant ||
      !defenderVariant
    ) {
      fail(
        "QUESTION_PACK_EQUIVALENCE_MISMATCH",
        "approved pairing references unavailable variants",
        {
          statusCode: 409,
        }
      );
    }

    const contract =
      equivalenceContract(
        template
      );
    const contractHash =
      sha256(
        stableJson(contract)
      );
    const packVersion = [
      "PACK_V1",
      sha256(
        stableJson({
          templateSetVersion:
            template
              .templateSetVersion,
          pairingVersion:
            pairing
              .pairingVersion,
          questionVersion:
            template
              .questionVersion,
          answerKeyVersion:
            template
              .answerKeyVersion,
          calibrationVersion:
            template
              .difficultyCalibrationVersion,
          scoringPolicyVersion:
            template
              .scoringPolicyVersion,
        })
      ).slice(0, 40),
    ].join("_");
    const challengerPackId =
      new mongoose.Types
        .ObjectId();
    const defenderPackId =
      new mongoose.Types
        .ObjectId();
    // 실제 pairing 선택에 사용한 원시 seed를 양쪽 pack의 private
    // material에 봉인한다. 공개 projection에는 이 값의 hash만 남는다.
    const rawSelectionSeed =
      matchSelectionSeed;
    const selectionSeedHash =
      sha256(
        rawSelectionSeed
      );
    const pairSealHash =
      sha256(
        stableJson({
          matchId:
            match.matchId,
          challengerPackId,
          defenderPackId,
          challengerUserId:
            match
              .challengerUserId,
          defenderUserId:
            match.defenderUserId,
          templateSetVersion:
            template
              .templateSetVersion,
          approvalContentHash:
            template.approval
              .contentHash,
          pairingVersion:
            pairing
              .pairingVersion,
          challengerVariantVersion:
            challengerVariant
              .variantVersion,
          defenderVariantVersion:
            defenderVariant
              .variantVersion,
          challengerQuestionVersionIds:
            challengerVariant
              .questions.map(
                (question) =>
                  question
                    .questionVersionId
              ),
          defenderQuestionVersionIds:
            defenderVariant
              .questions.map(
                (question) =>
                  question
                    .questionVersionId
              ),
          challengerAnswerVersionIds:
            challengerVariant
              .questions.map(
                (question) =>
                  question
                    .answerVersionId
              ),
          defenderAnswerVersionIds:
            defenderVariant
              .questions.map(
                (question) =>
                  question
                    .answerVersionId
              ),
          selectionSeedHash,
          contractHash,
        })
      );

    const challengerSource =
      buildPackSource({
        packId:
          challengerPackId,
        counterpartPackId:
          defenderPackId,
        match,
        template,
        pairing,
        variant:
          challengerVariant,
        participantRole:
          "CHALLENGER",
        participantUserId:
          match
            .challengerUserId,
        packVersion,
        rawRandomSeed:
          rawSelectionSeed,
        randomSeedHash:
          selectionSeedHash,
        equivalenceContractHash:
          contractHash,
        pairSealHash,
        sealedAt:
          observedAt,
      });
    const defenderSource =
      buildPackSource({
        packId:
          defenderPackId,
        counterpartPackId:
          challengerPackId,
        match,
        template,
        pairing,
        variant:
          defenderVariant,
        participantRole:
          "DEFENDER",
        participantUserId:
          match.defenderUserId,
        packVersion,
        rawRandomSeed:
          rawSelectionSeed,
        randomSeedHash:
          selectionSeedHash,
        equivalenceContractHash:
          contractHash,
        pairSealHash,
        sealedAt:
          observedAt,
      });

    const created =
      await ArenaQuestionPack
        .create(
          [
            challengerSource,
            defenderSource,
          ],
          {
            session,
            ordered: true,
          }
        );
    const createdPlain =
      created.map(
        (pack) =>
          pack.toObject({
            depopulate: true,
          })
      );
    return assertExistingPair(
      createdPlain,
      match
    );
  }

  async function runInTransaction(
    work,
    suppliedSession
  ) {
    if (suppliedSession) {
      return work(
        suppliedSession
      );
    }
    const session =
      await mongoose
        .startSession();
    let result;
    try {
      await session.withTransaction(
        async () => {
          result =
            await work(
              session
            );
        }
      );
      return result;
    } finally {
      await session.endSession();
    }
  }

  async function prepareQuestionPacks(
    input
  ) {
    assertSeedPolicyReady();
    const match =
      normalizeMatch(
        input?.match
      );
    if (
      sameId(
        match.challengerUserId,
        match.defenderUserId
      )
    ) {
      fail(
        "QUESTION_PACK_INPUT_INVALID",
        "challenger and defender must be different users",
        {
          statusCode: 400,
        }
      );
    }
    const observedAt =
      validDate(
        input?.now ?? now(),
        "now"
      );
    const suppliedSession =
      input?.session || null;

    try {
      return await runInTransaction(
        (session) =>
          createPair(
            match,
            observedAt,
            session
          ),
        suppliedSession
      );
    } catch (error) {
      if (
        !suppliedSession &&
        isDuplicateKey(error)
      ) {
        const existing =
          await loadExisting(
            match
          );
        const result =
          assertExistingPair(
            existing,
            match
          );
        if (result) {
          return result;
        }
      }
      throw error;
    }
  }

  async function getPublicQuestionPack(
    input
  ) {
    const questionPackId =
      requiredObjectId(
        input
          ?.questionPackId,
        "questionPackId"
      );
    const participantUserId =
      requiredObjectId(
        input
          ?.participantUserId,
        "participantUserId"
      );
    const pack =
      await ArenaQuestionPack
        .findOne({
          _id: questionPackId,
          participantUserId,
        })
        .select(
          PRIVATE_PACK_SELECTION
        )
        .lean();
    if (!pack) {
      fail(
        "QUESTION_PACK_NOT_FOUND",
        "question pack does not exist for this participant",
        {
          statusCode: 404,
        }
      );
    }
    assertPackSeal(pack);
    if (
      typeof assertPublicReleaseAllowed !==
      "function"
    ) {
      // serverCapability 를 선언한 호출자는 **완전한 서버 문맥**이다 — 그쪽에서
      // 가드가 빠졌다면 배선 실수이므로 폴백으로 조용히 덮지 않고 설정 오류로
      // 알린다. 폴백은 capability 없는 경량 문맥(공개 읽기 API)에만 허용된다.
      if (
        serverCapability !==
          undefined &&
        serverCapability !== null
      ) {
        policyPending(
          "PARTICIPANT_ATTEMPT_RELEASE_GUARD_UNAVAILABLE",
          "participant-specific timed release guard is unavailable"
        );
      }
      // 내장 폴백 — 주입된 가드가 없으면 **매치 문서의 역할별 개인 시작
      // 시각**으로 직접 판정한다(question-pack-role-release 의 원 설계).
      // 시작은 역할별로 갈리므로 상대가 시작했어도 내 팩은 열리지 않는다.
      // 한때 이 폴백이 재구조화 중에 사라져 POLICY_PENDING 으로 떨어졌고,
      // 가드 주입 없이 쓰는 호출부(폴백 API)가 전부 죽었다.
      const rolePrefix =
        pack.participantRole ===
        "DEFENDER"
          ? "defender"
          : "challenger";
      const releaseQuery = {
        [`${rolePrefix}StartedAt`]: {
          $ne: null,
        },
      };
      // 조회 키는 **matchId(비즈니스 키)** 다. matchRecordId(_id)를 우선하면
      // 재생성·이관으로 _id 가 갈린 문서를 못 찾는다 — 팩과 매치를 잇는
      // 불변 식별자는 matchId 쪽이다.
      if (pack.matchId) {
        releaseQuery.matchId =
          pack.matchId;
      } else {
        releaseQuery._id =
          pack.matchRecordId;
      }
      const startedMatch =
        await RankTakeoverMatch
          .findOne(releaseQuery)
          .select("_id")
          .lean();
      if (!startedMatch) {
        fail(
          "QUESTION_PACK_NOT_RELEASED",
          "questions are released only after the participant starts the timed match",
          {
            statusCode: 409,
          }
        );
      }
      return userPublicProjection(
        pack
      );
    }
    const release =
      await assertPublicReleaseAllowed({
        pack: Object.freeze({
          _id: pack._id,
          matchId:
            pack.matchId,
          matchRecordId:
            pack
              .matchRecordId,
          participantRole:
            pack
              .participantRole,
          participantUserId:
            pack
              .participantUserId,
        }),
        participantUserId,
      });
    if (
      release !== true &&
      release?.allowed !== true
    ) {
      fail(
        "QUESTION_PACK_NOT_RELEASED",
        "questions are released only after the participant starts the timed match",
        {
          statusCode: 409,
        }
      );
    }
    return userPublicProjection(
      pack
    );
  }

  async function getQuestionPackForScoring(
    input
  ) {
    const capabilityConfigured =
      typeof serverCapability ===
        "symbol" ||
      (serverCapability !== null &&
        (typeof serverCapability ===
          "object" ||
          typeof serverCapability ===
            "function"));
    if (
      !capabilityConfigured ||
      input?.serverCapability !==
        serverCapability
    ) {
      fail(
        "SERVER_ONLY_QUESTION_PACK_ACCESS",
        "answer keys are available only to the in-process scoring service",
        {
          statusCode: 403,
        }
      );
    }
    const questionPackId =
      requiredObjectId(
        input
          ?.questionPackId,
        "questionPackId"
      );
    const matchId =
      requiredText(
        input?.matchId,
        "matchId"
      );
    const pack =
      await ArenaQuestionPack
        .findOne({
          _id: questionPackId,
          matchId,
        })
        .select(
          PRIVATE_PACK_SELECTION
        )
        .lean();
    if (!pack) {
      fail(
        "QUESTION_PACK_NOT_FOUND",
        "sealed scoring pack does not exist",
        {
          statusCode: 404,
        }
      );
    }
    assertPackSeal(pack);
    return scoringProjection(
      pack
    );
  }

  return Object.freeze({
    getPublicQuestionPack,
    getQuestionPackForScoring,
    prepareQuestionPacks,
  });
}

async function prepareQuestionPacks(
  input
) {
  return createArenaQuestionPackService()
    .prepareQuestionPacks(input);
}

module.exports = {
  ArenaQuestionPackError,
  createArenaQuestionPackService,
  prepareQuestionPacks,
};
