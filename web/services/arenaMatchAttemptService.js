const mongoose = require("mongoose");
const {
  createHash,
} = require("node:crypto");
const {
  User,
} = require("../models/matthsModel");
const {
  ArenaMatch,
  ArenaMatchAttempt,
  ArenaMatchAttemptEvent,
  ArenaRevengeRight,
  ArenaOutboxEvent,
  ArenaProblemPack,
} = require("../models/goatArenaModel");
const {
  assertArenaProblemPackIntegrity,
} = require("./arenaProblemPackService");
const {
  isSundayDivisionLocked,
  isSundayMatchRequestLocked,
} = require("./arenaMatchService");
const {
  ARENA_ONE_ON_ONE_EVIDENCE_LIMIT_MS,
  ARENA_ONE_ON_ONE_TIME_LIMIT_MS,
} = require("./arenaOneOnOneProblemBank");
const {
  assertNaturalNumberMaxThreeDigits,
  targetAccuracyRangeForSlot,
} = require("./arenaOneOnOneDifficultyPolicy");
const {
  SOURCE_DIFFICULTY_BANDS,
} = require("./arenaMatchDifficultyPlan");
const {
  arenaPdfSourceMetadataForReferenceId,
} = require("./arenaPdfOneOnOneQuestionPool");
const {
  holdExpiredEvidence,
  holdExpiredMatchStarts,
  holdSundayCutoffMatches,
} = require("./arenaMatchEvidenceService");
const {
  settleExpiredSubRevengeMatches,
} = require("./arenaMatchSettlementService");
const {
  settleExpiredMainRevengeMatches,
} = require("./mainArenaRevengeService");
const {
  getMainShopItemOffer,
} = require("./arenaShopPolicyService");
const { withSchedulerLease } = require("./schedulerLeaseService");

const MAX_CHANGE_EVENTS_PER_REQUEST = 200;
const MAX_SIGNAL_EVENTS_PER_REQUEST = 200;
const MATCH_START_INTRO_DELAY_MS = 3650;
const QUESTION_INTRO_DELAY_MS = 1700;
const ATTEMPT_SCHEDULER_INTERVAL_MS = 10 * 1000;
let attemptScheduleTimer = null;
let attemptScheduleRunning = false;

const MATCH_STATUS_LABELS = {
  MATCHED: "문제 배정 대기",
  READY: "경기 준비 완료",
  IN_PROGRESS: "경기 진행 중",
  SUBMITTED: "양측 제출 완료",
  RESOLVED: "결과 확인 중",
  HELD: "운영 검토 중",
  INVALID: "경기 무효 검토",
  SETTLED: "경기 정산 완료",
  CANCELLED: "경기 취소",
  INSURED_CANCELLED: "방어 일정 보호로 종료",
};

function statusError(status, message, code = "") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function queryWithSession(query, session) {
  return session ? query.session(session) : query;
}

function normalizeOperationId(value, label) {
  const id = String(value || "").trim();
  if (
    id.length < 16 ||
    id.length > 160 ||
    !/^[A-Za-z0-9._:-]+$/.test(id)
  ) {
    throw statusError(
      400,
      `${label} 식별자를 확인해주세요.`,
      "INVALID_ARENA_OPERATION_ID"
    );
  }
  return id;
}

function cleanAnswer(value) {
  const answer = String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
  if (answer && !/^[0-9]{1,3}$/.test(answer)) {
    throw statusError(
      400,
      "답은 3자리 이하 자연수로 입력해주세요.",
      "INVALID_ARENA_ANSWER_FORMAT"
    );
  }
  return answer;
}

function safeClientDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function participantRole(match, userId) {
  if (
    String(match?.challenger?.userId) ===
    String(userId)
  ) {
    return "CHALLENGER";
  }
  if (
    String(match?.defender?.userId) ===
    String(userId)
  ) {
    return "DEFENDER";
  }
  return null;
}

function assertMatchParticipant(match, userId) {
  const role = participantRole(match, userId);
  if (!role) {
    throw statusError(
      403,
      "이 경기에 참가한 사용자만 열람할 수 있습니다.",
      "ARENA_MATCH_PARTICIPANT_REQUIRED"
    );
  }
  return role;
}

function chooseSealedProblemPack(
  packs,
  matchId
) {
  if (!Array.isArray(packs) || !packs.length) {
    return null;
  }
  const digest = createHash("sha256")
    .update(String(matchId), "utf8")
    .digest();
  const cursor = digest.readUInt32BE(0);
  return packs[cursor % packs.length];
}

function initialAnswersForPack(pack) {
  return (pack.questions || []).map(
    (question) => ({
      questionKey: question.questionKey,
      value: "",
      revision: 0,
      lastChangedAt: null,
    })
  );
}

function formatAccuracyPercent(value) {
  const percentage = Number(value) * 100;
  if (!Number.isFinite(percentage)) return "";
  return Number.isInteger(percentage)
    ? String(percentage)
    : percentage.toFixed(1).replace(/\.0$/, "");
}

function formatSourceCorrectRatePercent(value) {
  const percentage = Number(value);
  if (!Number.isFinite(percentage)) return "";
  return Number.isInteger(percentage)
    ? String(percentage)
    : percentage.toFixed(1).replace(/\.0$/, "");
}

function publicSourceAccuracyForQuestion(question) {
  const source = arenaPdfSourceMetadataForReferenceId(
    question?.sourceTypeId
  );
  if (!source) return null;
  const band = SOURCE_DIFFICULTY_BANDS[source.sourceDifficultyCode];
  if (!band) return null;

  const exact = source.correctRatePercent === null
    ? null
    : Number(source.correctRatePercent);
  if (exact !== null && Number.isFinite(exact)) {
    return {
      min: exact / 100,
      max: exact / 100,
      label: `${formatSourceCorrectRatePercent(exact)}%`,
      basisLabel: "원문 정답률",
      rangeLabel: `${source.sourceDifficultyCode} · ${band.rangeLabel}`,
      sourceDifficultyCode: source.sourceDifficultyCode,
      evidenceKind: "EXACT",
    };
  }

  const lower = source.correctRateLowerBoundPercent === null
    ? null
    : Number(source.correctRateLowerBoundPercent);
  if (lower !== null && Number.isFinite(lower)) {
    return {
      min: lower / 100,
      max: source.correctRateUpperBoundPercent !== null &&
        Number.isFinite(Number(source.correctRateUpperBoundPercent))
        ? Number(source.correctRateUpperBoundPercent) / 100
        : 1,
      label: `${formatSourceCorrectRatePercent(lower)}% 이상`,
      basisLabel: "원문 정답률 하한",
      rangeLabel: `${source.sourceDifficultyCode} · ${band.rangeLabel}`,
      sourceDifficultyCode: source.sourceDifficultyCode,
      evidenceKind: "CENSORED_BOUND",
    };
  }
  return null;
}

function publicTargetAccuracyForQuestion(pack, question, order) {
  const sourceAccuracy = publicSourceAccuracyForQuestion(question);
  if (sourceAccuracy) return sourceAccuracy;
  const hasStoredValues =
    question?.targetAccuracyMin !== null &&
    question?.targetAccuracyMin !== undefined &&
    question?.targetAccuracyMax !== null &&
    question?.targetAccuracyMax !== undefined;
  const storedRange = [
    Number(question?.targetAccuracyMin),
    Number(question?.targetAccuracyMax),
  ];
  const hasStoredRange =
    hasStoredValues &&
    storedRange.every(Number.isFinite) &&
    storedRange[0] >= 0 &&
    storedRange[1] >= storedRange[0] &&
    storedRange[1] <= 1;
  const range = hasStoredRange
    ? storedRange
    : targetAccuracyRangeForSlot({
        difficultyCode: pack?.difficultyCode,
        order,
        division: pack?.division,
      });
  if (!range) return null;
  return {
    min: range[0],
    max: range[1],
    label: `${formatAccuracyPercent(range[0])}~${formatAccuracyPercent(range[1])}%`,
    basisLabel: "목표 정답률 구간",
    rangeLabel: "",
    sourceDifficultyCode: "",
    evidenceKind: "TARGET_RANGE",
  };
}

const QUESTION_CATEGORY_LABELS = Object.freeze({
  "basic-general": "기초 일반",
  general: "일반",
  "upper-general": "상위 일반",
  "semi-killer": "준킬러",
  killer: "킬러",
});

function publicCategoryLabelForQuestion(question) {
  return QUESTION_CATEGORY_LABELS[question?.category] || "일반";
}

function publicQuestionsForAttempt(pack, attempt) {
  const answerByKey = new Map(
    (attempt?.answers || []).map(
      (answer) => [
        answer.questionKey,
        answer.value || "",
      ]
    )
  );
  const currentIndex = Math.max(
    0,
    Number(attempt?.currentQuestionIndex || 0)
  );
  return (pack?.questions || []).slice(currentIndex, currentIndex + 1).map(
    (question, index) => {
      const number = currentIndex + index + 1;
      const targetAccuracy = publicTargetAccuracyForQuestion(
        pack,
        question,
        number
      );
      return {
        number,
        questionKey: question.questionKey,
        sourceDifficultyCode:
          targetAccuracy?.sourceDifficultyCode || "",
        categoryLabel: publicCategoryLabelForQuestion(question),
        courseId: question.courseId,
        prompt: question.prompt,
        visualization: question.visualization || null,
        inputMode: question.inputMode,
        choices: (question.choices || []).map(
          (choice) => ({
            key: choice.key,
            text: choice.text,
          })
        ),
        points: Number(question.points),
        targetAccuracy,
        savedAnswer:
          answerByKey.get(
            question.questionKey
          ) || "",
      };
    }
  );
}

function formatTimeLimit(timeLimitMs) {
  const totalSeconds = Math.max(
    1,
    Math.round(Number(timeLimitMs) / 1000)
  );
  if (totalSeconds % 60 === 0) {
    return `${totalSeconds / 60}분`;
  }
  return `${Math.floor(totalSeconds / 60)}분 ${
    totalSeconds % 60
  }초`;
}

function questionDeadlineAt({
  startedAt,
  match,
}) {
  const regularDeadline = new Date(
    new Date(startedAt).getTime() +
      ARENA_ONE_ON_ONE_TIME_LIMIT_MS
  );
  const completionDeadline =
    match?.completionDeadlineAt
      ? new Date(
          match.completionDeadlineAt
        )
      : null;
  return completionDeadline &&
    completionDeadline <
      regularDeadline
    ? completionDeadline
    : regularDeadline;
}

function completedSolveTimeMs(
  attempt
) {
  return (attempt.questionTimings || []).reduce(
    (total, timing) =>
      total +
      Math.max(
        0,
        Number(
          timing.responseTimeMs
        ) || 0
      ),
    0
  );
}

async function loadMatch(matchId, session = null) {
  if (!mongoose.isValidObjectId(matchId)) {
    throw statusError(
      400,
      "경기 정보를 확인해주세요.",
      "INVALID_ARENA_MATCH_ID"
    );
  }
  const match = await queryWithSession(
    ArenaMatch.findById(matchId),
    session
  );
  if (!match) {
    throw statusError(
      404,
      "경기를 찾을 수 없습니다.",
      "ARENA_MATCH_NOT_FOUND"
    );
  }
  return match;
}

async function loadPackWithQuestions(
  problemPackId,
  session = null
) {
  const pack = await queryWithSession(
    ArenaProblemPack.findById(
      problemPackId
    ).select("+questions +contentHash"),
    session
  ).lean();
  if (!pack) {
    throw statusError(
      409,
      "경기에 고정된 문제 팩을 찾을 수 없습니다.",
      "ARENA_PROBLEM_PACK_NOT_FOUND"
    );
  }
  assertArenaProblemPackIntegrity(pack);
  return pack;
}

async function prepareArenaMatch({
  matchId,
  userId,
  now = new Date(),
}) {
  const session = await mongoose.startSession();
  let preparedMatch = null;
  try {
    await session.withTransaction(async () => {
      const match = await loadMatch(
        matchId,
        session
      );
      assertMatchParticipant(match, userId);

      if (
        match.problemPackId &&
        match.problemPackVersion !==
          "PENDING_ASSIGNMENT"
      ) {
        preparedMatch = match;
        return;
      }
      if (match.status !== "MATCHED") {
        throw statusError(
          409,
          "현재 상태에서는 경기 문제를 준비할 수 없습니다.",
          "ARENA_MATCH_NOT_MATCHED"
        );
      }
      if (
        isSundayMatchRequestLocked(
          now,
          match.division
        )
      ) {
        throw statusError(
          423,
          match.matchType === "FRIENDLY"
            ? "GOAT Arena 친선 경기는 일요일 14시부터 새 경기 준비와 시작이 차단됩니다."
            : match.division === "MAIN"
              ? "Ranked는 일요일 14시부터 새 경기 준비와 시작이 차단됩니다."
              : "Unranked는 일요일 14시부터 새 경기 준비와 시작이 차단됩니다.",
          "SUNDAY_MATCH_START_LOCK"
        );
      }

      const packs = await queryWithSession(
        ArenaProblemPack.find({
          status: "SEALED",
          division: match.division,
          matchType: match.matchType,
          tierPairKey: match.tierPairKey,
          generationMode: "AUTO_ON_CHALLENGE",
          generatedForMatchKey: match.matchKey,
          timeLimitMs: ARENA_ONE_ON_ONE_TIME_LIMIT_MS,
          availableFrom: { $lte: now },
          $or: [
            { availableUntil: null },
            { availableUntil: { $gt: now } },
          ],
        })
          .select("+questions +contentHash")
          .sort({ availableFrom: 1, version: 1 }),
        session
      ).lean();
      const pack = chooseSealedProblemPack(
        packs,
        match._id
      );
      if (!pack) {
        throw statusError(
          409,
          "해당 티어 조합의 자동 검증 문제 유형이 아직 연결되지 않았습니다.",
          "NO_SEALED_ARENA_PROBLEM_PACK"
        );
      }
      assertArenaProblemPackIntegrity(pack);
      const answers = initialAnswersForPack(pack);
      await ArenaMatchAttempt.create(
        [
          {
            matchId: match._id,
            userId: match.challenger.userId,
            role: "CHALLENGER",
            problemPackId: pack._id,
            problemPackVersion: pack.version,
            variantCode: "COMMON",
            status: "READY",
            answers,
          },
          {
            matchId: match._id,
            userId: match.defender.userId,
            role: "DEFENDER",
            problemPackId: pack._id,
            problemPackVersion: pack.version,
            variantCode: "COMMON",
            status: "READY",
            answers,
          },
        ],
        { session, ordered: true }
      );
      match.problemPackId = pack._id;
      match.problemPackVersion = pack.version;
      match.scoringVersion = pack.scoringVersion;
      match.timeLimitMs = pack.timeLimitMs;
      match.status = "READY";
      match.readyAt = now;
      await match.save({ session });
      await ArenaOutboxEvent.create(
        [
          {
            eventType: "ArenaMatchReady",
            aggregateType: "ArenaMatch",
            aggregateId: match._id,
            idempotencyKey:
              `${match._id}:ArenaMatchReady`,
            payload: {
              problemPackVersion:
                pack.version,
              scoringVersion:
                pack.scoringVersion,
              timeLimitMs:
                pack.timeLimitMs,
            },
          },
        ],
        { session, ordered: true }
      );
      preparedMatch = match;
    });
    return {
      matchId: String(preparedMatch._id),
      status: preparedMatch.status,
    };
  } finally {
    await session.endSession();
  }
}

async function startArenaMatchAttempt({
  matchId,
  userId,
  requestId,
  now = new Date(),
}) {
  const operationId = normalizeOperationId(
    requestId,
    "경기 시작"
  );
  const session = await mongoose.startSession();
  let result = null;
  try {
    await session.withTransaction(async () => {
      const match = await loadMatch(
        matchId,
        session
      );
      assertMatchParticipant(match, userId);
      const attempt = await queryWithSession(
        ArenaMatchAttempt.findOne({
          matchId: match._id,
          userId,
        }),
        session
      );
      if (!attempt) {
        throw statusError(
          409,
          "경기 문제 준비를 먼저 완료해주세요.",
          "ARENA_ATTEMPT_NOT_READY"
        );
      }
      if (
        ["IN_PROGRESS", "EVIDENCE_REQUIRED", "SUBMITTED"].includes(
          attempt.status
        )
      ) {
        result = {
          attempt,
          replayed: true,
        };
        return;
      }
      if (match.status === "HELD" && match.integrityStatus === "CLEAR") {
        const matchAttempts = await queryWithSession(
          ArenaMatchAttempt.find({ matchId: match._id }).select("status"),
          session
        );
        const anotherParticipantStarted = matchAttempts.some((entry) =>
          ["IN_PROGRESS", "EVIDENCE_REQUIRED", "SUBMITTED"].includes(entry.status)
        );
        match.status = anotherParticipantStarted ? "IN_PROGRESS" : "READY";
        await match.save({ session });
      }
      if (
        !["READY", "IN_PROGRESS"].includes(
          match.status
        )
      ) {
        throw statusError(
          409,
          "현재 경기 상태에서는 응시를 시작할 수 없습니다.",
          "ARENA_MATCH_NOT_READY"
        );
      }
      if (
        !match.startDeadlineAt ||
        new Date(match.startDeadlineAt) < now
      ) {
        throw statusError(
          410,
          "경기 요청 후 24시간의 시작 기한이 끝났습니다.",
          "ARENA_MATCH_START_DEADLINE_EXPIRED"
        );
      }
      if (
        isSundayMatchRequestLocked(
          now,
          match.division
        )
      ) {
        throw statusError(
          423,
          match.matchType === "FRIENDLY"
            ? "GOAT Arena 친선 경기는 일요일 14시부터 새 경기를 시작할 수 없습니다."
            : match.division === "MAIN"
              ? "Ranked는 일요일 14시부터 새 경기를 시작할 수 없습니다."
              : "Unranked는 일요일 14시부터 새 경기를 시작할 수 없습니다.",
          "SUNDAY_MATCH_START_LOCK"
        );
      }

      const startKey =
        `ARENA_START:${attempt._id}:${operationId}`;
      const solveStartedAt = new Date(
        now.getTime() +
          MATCH_START_INTRO_DELAY_MS
      );
      attempt.status = "IN_PROGRESS";
      attempt.startIdempotencyKey = startKey;
      attempt.startedAt = solveStartedAt;
      attempt.deadlineAt =
        questionDeadlineAt({
          startedAt:
            solveStartedAt,
          match,
        });
      attempt.lastHeartbeatAt = now;
      attempt.focusState = "FOCUSED";
      attempt.currentQuestionIndex = 0;
      attempt.questionTimings = [
        {
          questionKey: attempt.answers[0].questionKey,
          startedAt: solveStartedAt,
          completedAt: null,
          responseTimeMs: null,
        },
      ];
      await attempt.save({ session });

      if (match.status === "READY") {
        match.status = "IN_PROGRESS";
      }
      if (!match.startedAt) {
        match.startedAt = solveStartedAt;
      }
      await match.save({ session });
      await ArenaMatchAttemptEvent.create(
        [
          {
            attemptId: attempt._id,
            matchId: match._id,
            userId,
            idempotencyKey: startKey,
            eventType: "ATTEMPT_STARTED",
            serverAt: now,
          },
        ],
        { session, ordered: true }
      );
      await ArenaOutboxEvent.create(
        [
          {
            eventType: "ArenaAttemptStarted",
            aggregateType: "ArenaMatchAttempt",
            aggregateId: attempt._id,
            idempotencyKey:
              `${attempt._id}:ArenaAttemptStarted`,
            payload: {
              matchId: String(match._id),
              deadlineAt:
                attempt.deadlineAt,
            },
          },
        ],
        { session, ordered: true }
      );
      result = { attempt, replayed: false };
    });
    return {
      attemptId: String(result.attempt._id),
      status: result.attempt.status,
      deadlineAt:
        result.attempt.deadlineAt,
      replayed: result.replayed,
    };
  } finally {
    await session.endSession();
  }
}

function normalizeAnswerChanges(
  changes,
  allowedQuestionKeys
) {
  const allowed = new Set(
    allowedQuestionKeys
  );
  const source = Array.isArray(changes)
    ? changes.slice(
        -MAX_CHANGE_EVENTS_PER_REQUEST
      )
    : [];
  return source.map((change) => {
    const questionKey = String(
      change?.questionKey || ""
    ).trim();
    if (!allowed.has(questionKey)) {
      throw statusError(
        400,
        "저장할 문항 정보를 확인해주세요.",
        "INVALID_ARENA_QUESTION_KEY"
      );
    }
    return {
      questionKey,
      value: cleanAnswer(change?.value),
      clientAt: safeClientDate(
        change?.clientAt
      ),
    };
  });
}

function applyAnswerChanges({
  attempt,
  changes,
  now,
}) {
  const answerByKey = new Map(
    attempt.answers.map((answer) => [
      answer.questionKey,
      answer,
    ])
  );
  changes.forEach((change) => {
    const answer = answerByKey.get(
      change.questionKey
    );
    answer.value = change.value;
    answer.revision =
      Number(answer.revision || 0) + 1;
    answer.lastChangedAt = now;
  });
  attempt.markModified("answers");
  attempt.answerRevision =
    Number(attempt.answerRevision || 0) +
    changes.length;
  attempt.lastSavedAt = now;
}

async function loadWritableAttempt({
  matchId,
  userId,
  session,
}) {
  const match = await loadMatch(
    matchId,
    session
  );
  assertMatchParticipant(match, userId);
  const attempt = await queryWithSession(
    ArenaMatchAttempt.findOne({
      matchId: match._id,
      userId,
    }),
    session
  );
  if (!attempt) {
    throw statusError(
      409,
      "경기 응시 정보를 찾을 수 없습니다.",
      "ARENA_ATTEMPT_NOT_FOUND"
    );
  }
  const pack = await loadPackWithQuestions(
    attempt.problemPackId,
    session
  );
  return { match, attempt, pack };
}

function assertAttemptWritable(
  attempt,
  now,
  { allowExpired = false } = {}
) {
  if (isSundayDivisionLocked(now)) {
    throw statusError(
      423,
      "일요일 15시부터 월요일 0시까지 공식 경기가 잠깁니다.",
      "SUNDAY_DIVISION_LOCK"
    );
  }
  if (attempt.status !== "IN_PROGRESS") {
    throw statusError(
      409,
      "진행 중인 경기에서만 답안을 저장할 수 있습니다.",
      "ARENA_ATTEMPT_NOT_IN_PROGRESS"
    );
  }
  if (
    (
      !allowExpired &&
      (
        !attempt.deadlineAt ||
        new Date(
          attempt.deadlineAt
        ) <= now
      )
    )
  ) {
    throw statusError(
      410,
      "제한 시간이 끝나 답안을 더 변경할 수 없습니다.",
      "ARENA_ATTEMPT_TIME_LIMIT"
    );
  }
}

async function saveArenaMatchAnswers({
  matchId,
  userId,
  requestId,
  changes,
  now = new Date(),
}) {
  const operationId = normalizeOperationId(
    requestId,
    "답안 저장"
  );
  const session = await mongoose.startSession();
  let result = null;
  try {
    await session.withTransaction(async () => {
      const { match, attempt, pack } =
        await loadWritableAttempt({
          matchId,
          userId,
          session,
        });
      const eventKey =
        `ARENA_SAVE:${operationId}`;
      const replay = await queryWithSession(
        ArenaMatchAttemptEvent.findOne({
          attemptId: attempt._id,
          idempotencyKey: eventKey,
        }),
        session
      ).lean();
      if (replay) {
        result = {
          attempt,
          replayed: true,
        };
        return;
      }
      assertAttemptWritable(attempt, now);
      const normalized = normalizeAnswerChanges(
        changes,
        [pack.questions[attempt.currentQuestionIndex]?.questionKey].filter(Boolean)
      );
      if (!normalized.length) {
        result = {
          attempt,
          replayed: false,
        };
        return;
      }
      applyAnswerChanges({
        attempt,
        changes: normalized,
        now,
      });
      await attempt.save({ session });
      await ArenaMatchAttemptEvent.create(
        [
          {
            attemptId: attempt._id,
            matchId: match._id,
            userId,
            idempotencyKey: eventKey,
            eventType: "ANSWERS_SAVED",
            answerChanges: normalized,
            serverAt: now,
          },
        ],
        { session, ordered: true }
      );
      result = {
        attempt,
        replayed: false,
      };
    });
    return {
      savedAt:
        result.attempt.lastSavedAt || now,
      answerRevision:
        result.attempt.answerRevision,
      replayed: result.replayed,
    };
  } finally {
    await session.endSession();
  }
}

async function advanceArenaMatchQuestion({
  matchId,
  userId,
  requestId,
  value,
  submissionMode = "MANUAL",
  now = new Date(),
}) {
  const operationId = normalizeOperationId(
    requestId,
    "다음 문항"
  );
  const session = await mongoose.startSession();
  let result = null;
  try {
    await session.withTransaction(async () => {
      const { match, attempt, pack } = await loadWritableAttempt({
        matchId,
        userId,
        session,
      });
      const eventKey = `ARENA_ADVANCE:${attempt._id}:${operationId}`;
      const replay = await queryWithSession(
        ArenaMatchAttemptEvent.findOne({
          attemptId: attempt._id,
          idempotencyKey: eventKey,
        }),
        session
      ).lean();
      if (replay) {
        result = {
          finalQuestion:
            Number(replay.metadata?.completedQuestionNumber) ===
            pack.questions.length,
          currentQuestionIndex: Number(attempt.currentQuestionIndex || 0),
          replayed: true,
        };
        return;
      }
      const timedOut =
        submissionMode ===
        "TIME_LIMIT";
      assertAttemptWritable(
        attempt,
        now,
        { allowExpired: timedOut }
      );
      if (
        timedOut &&
        (
          !attempt.deadlineAt ||
          new Date(
            attempt.deadlineAt
          ) > now
        )
      ) {
        throw statusError(
          409,
          "현재 문항의 제한 시간이 아직 남아 있습니다.",
          "ARENA_QUESTION_TIME_REMAINS"
        );
      }

      const currentIndex = Number(attempt.currentQuestionIndex || 0);
      const question = pack.questions[currentIndex];
      if (!question) {
        throw statusError(
          409,
          "현재 풀 문항을 확인할 수 없습니다.",
          "ARENA_CURRENT_QUESTION_NOT_FOUND"
        );
      }
      const savedAnswer =
        attempt.answers.find(
          (answer) =>
            answer.questionKey ===
            question.questionKey
        )?.value || "";
      const finalAnswer = timedOut
        ? cleanAnswer(savedAnswer)
        : cleanAnswer(value);
      if (finalAnswer) {
        assertNaturalNumberMaxThreeDigits(finalAnswer);
      }
      const change = normalizeAnswerChanges(
        [
          {
            questionKey: question.questionKey,
            value: finalAnswer,
            clientAt: now,
          },
        ],
        [question.questionKey]
      );
      if (!timedOut) {
        applyAnswerChanges({
          attempt,
          changes: change,
          now,
        });
      }

      const timing = (attempt.questionTimings || []).find(
        (entry) => entry.questionKey === question.questionKey
      );
      if (timing && !timing.completedAt) {
        timing.completedAt = timedOut
          ? new Date(
              attempt.deadlineAt
            )
          : now;
        timing.responseTimeMs = Math.max(
          0,
          new Date(
            timing.completedAt
          ).getTime() -
            new Date(
              timing.startedAt
            ).getTime()
        );
      }

      const finalQuestion = currentIndex === pack.questions.length - 1;
      if (finalQuestion) {
        const submissionKey = `ARENA_SUBMIT:${attempt._id}:${operationId}`;
        attempt.status = "EVIDENCE_REQUIRED";
        attempt.currentQuestionIndex = pack.questions.length;
        attempt.submissionIdempotencyKey = submissionKey;
        attempt.submittedAt = now;
        attempt.submissionMode = timedOut
          ? "TIME_LIMIT"
          : "MANUAL";
        attempt.activeSolveTimeMs =
          completedSolveTimeMs(
            attempt
          );
        attempt.evidenceDeadlineAt = new Date(
          now.getTime() + ARENA_ONE_ON_ONE_EVIDENCE_LIMIT_MS
        );
        match.set(
          attempt.role === "CHALLENGER"
            ? "challenger.submittedAt"
            : "defender.submittedAt",
          now
        );
      } else {
        const nextQuestionStartedAt =
          new Date(
            now.getTime() +
              QUESTION_INTRO_DELAY_MS
          );
        attempt.currentQuestionIndex = currentIndex + 1;
        attempt.deadlineAt =
          questionDeadlineAt({
            startedAt:
              nextQuestionStartedAt,
            match,
          });
        attempt.questionTimings.push({
          questionKey: pack.questions[currentIndex + 1].questionKey,
          startedAt:
            nextQuestionStartedAt,
          completedAt: null,
          responseTimeMs: null,
        });
      }
      await attempt.save({ session });
      await match.save({ session });
      await ArenaMatchAttemptEvent.create(
        [
          {
            attemptId: attempt._id,
            matchId: match._id,
            userId,
            idempotencyKey: eventKey,
            eventType: "QUESTION_ADVANCED",
            answerChanges: change,
            serverAt: now,
            metadata: {
              completedQuestionNumber: currentIndex + 1,
              finalQuestion,
              submissionMode:
                timedOut
                  ? "TIME_LIMIT"
                  : "MANUAL",
              evidenceDeadlineAt: attempt.evidenceDeadlineAt || null,
            },
          },
        ],
        { session, ordered: true }
      );
      result = {
        finalQuestion,
        currentQuestionIndex: Number(attempt.currentQuestionIndex),
        evidenceDeadlineAt: attempt.evidenceDeadlineAt || null,
        replayed: false,
      };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

function normalizeSignals(
  signals,
  allowedQuestionKeys = []
) {
  const allowed = new Set([
    "HEARTBEAT",
    "FOCUS_GAINED",
    "FOCUS_LOST",
    "QUESTION_FOCUSED",
    "PAGE_EXITED",
  ]);
  const allowedQuestions = new Set(
    allowedQuestionKeys
  );
  return (
    Array.isArray(signals)
      ? signals.slice(
          -MAX_SIGNAL_EVENTS_PER_REQUEST
        )
      : []
  ).map((signal) => {
    const type = String(
      signal?.type || ""
    ).toUpperCase();
    if (!allowed.has(type)) {
      throw statusError(
        400,
        "경기 활동 기록을 확인해주세요.",
        "INVALID_ARENA_ACTIVITY_SIGNAL"
      );
    }
    const questionKey = String(
      signal?.questionKey || ""
    )
      .trim()
      .slice(0, 40);
    if (
      [
        "QUESTION_FOCUSED",
        "PAGE_EXITED",
      ].includes(type) &&
      !allowedQuestions.has(questionKey)
    ) {
      throw statusError(
        400,
        "현재 문항 활동 기록을 확인해주세요.",
        "INVALID_ARENA_ACTIVITY_QUESTION"
      );
    }
    return {
      type,
      questionKey,
      clientAt: safeClientDate(
        signal?.clientAt
      ),
    };
  });
}

async function recordArenaMatchActivity({
  matchId,
  userId,
  requestId,
  signals,
  now = new Date(),
}) {
  const operationId = normalizeOperationId(
    requestId,
    "활동 기록"
  );
  const session = await mongoose.startSession();
  if (!Array.isArray(signals) || !signals.length) {
    await session.endSession();
    return { recorded: 0, replayed: false };
  }
  let replayed = false;
  let recordedCount = 0;
  try {
    await session.withTransaction(async () => {
      const { match, attempt, pack } =
        await loadWritableAttempt({
          matchId,
          userId,
          session,
        });
      assertAttemptWritable(attempt, now);
      const normalized = normalizeSignals(
        signals,
        pack.questions.map(
          (question) =>
            question.questionKey
        )
      );
      recordedCount = normalized.length;
      const eventKey =
        `ARENA_ACTIVITY:${operationId}`;
      const replay = await queryWithSession(
        ArenaMatchAttemptEvent.findOne({
          attemptId: attempt._id,
          idempotencyKey: eventKey,
        }),
        session
      ).lean();
      if (replay) {
        replayed = true;
        return;
      }
      attempt.lastHeartbeatAt = now;
      const lastFocusSignal = [...normalized]
        .reverse()
        .find((signal) =>
          [
            "FOCUS_GAINED",
            "FOCUS_LOST",
          ].includes(signal.type)
        );
      if (lastFocusSignal) {
        attempt.focusState =
          lastFocusSignal.type ===
          "FOCUS_GAINED"
            ? "FOCUSED"
            : "BLURRED";
      }
      await attempt.save({ session });
      await ArenaMatchAttemptEvent.create(
        [
          {
            attemptId: attempt._id,
            matchId: match._id,
            userId,
            idempotencyKey: eventKey,
            eventType: "ACTIVITY_RECORDED",
            signals: normalized,
            serverAt: now,
          },
        ],
        { session, ordered: true }
      );
    });
    return {
      recorded: replayed
        ? 0
        : recordedCount,
      replayed,
    };
  } finally {
    await session.endSession();
  }
}

async function submitArenaMatchAttempt({
  matchId,
  userId,
  requestId,
  changes = [],
  submissionMode = "MANUAL",
  now = new Date(),
}) {
  const operationId = normalizeOperationId(
    requestId,
    "답안 제출"
  );
  const session = await mongoose.startSession();
  let result = null;
  try {
    await session.withTransaction(async () => {
      const { match, attempt, pack } =
        await loadWritableAttempt({
          matchId,
          userId,
          session,
        });
      if (["EVIDENCE_REQUIRED", "SUBMITTED"].includes(attempt.status)) {
        result = {
          attempt,
          match,
          replayed: true,
        };
        return;
      }
      if (attempt.status !== "IN_PROGRESS") {
        throw statusError(
          409,
          "시작한 경기만 제출할 수 있습니다.",
          "ARENA_ATTEMPT_NOT_IN_PROGRESS"
        );
      }
      if (isSundayDivisionLocked(now)) {
        throw statusError(
          423,
          "일요일 15시부터 월요일 0시까지 공식 경기가 잠깁니다.",
          "SUNDAY_DIVISION_LOCK"
        );
      }
      const currentQuestionIndex =
        Number(
          attempt.currentQuestionIndex ||
            0
        );
      if (
        currentQuestionIndex !==
        pack.questions.length - 1
      ) {
        throw statusError(
          409,
          "현재 문항을 확정한 뒤 순서대로 다음 문제로 이동해주세요.",
          "ARENA_QUESTION_SEQUENCE_REQUIRED"
        );
      }
      const deadlineReached =
        !attempt.deadlineAt ||
        new Date(attempt.deadlineAt) <= now;
      const effectiveMode =
        deadlineReached ||
        submissionMode === "TIME_LIMIT"
          ? "TIME_LIMIT"
          : "MANUAL";
      const normalized = deadlineReached
        ? []
        : normalizeAnswerChanges(
            changes,
            [
              pack.questions[
                currentQuestionIndex
              ]?.questionKey,
            ].filter(Boolean)
          );
      if (normalized.length) {
        applyAnswerChanges({
          attempt,
          changes: normalized,
          now,
        });
      }
      const submissionKey =
        `ARENA_SUBMIT:${attempt._id}:${operationId}`;
      attempt.status = "EVIDENCE_REQUIRED";
      attempt.submissionIdempotencyKey =
        submissionKey;
      attempt.submittedAt = now;
      attempt.submissionMode = effectiveMode;
      attempt.lastSavedAt = now;
      attempt.currentQuestionIndex = 5;
      const currentTiming =
        (attempt.questionTimings || []).find(
          (timing) =>
            timing.questionKey ===
            pack.questions[
              currentQuestionIndex
            ]?.questionKey
        );
      if (
        currentTiming &&
        !currentTiming.completedAt
      ) {
        currentTiming.completedAt =
          deadlineReached
            ? new Date(
                attempt.deadlineAt
              )
            : now;
        currentTiming.responseTimeMs =
          Math.max(
            0,
            new Date(
              currentTiming.completedAt
            ).getTime() -
              new Date(
                currentTiming.startedAt
              ).getTime()
          );
      }
      attempt.activeSolveTimeMs =
        completedSolveTimeMs(
          attempt
        );
      attempt.evidenceDeadlineAt = new Date(
        now.getTime() + ARENA_ONE_ON_ONE_EVIDENCE_LIMIT_MS
      );
      await attempt.save({ session });

      const participantPath =
        attempt.role === "CHALLENGER"
          ? "challenger.submittedAt"
          : "defender.submittedAt";
      match.set(participantPath, now);
      await match.save({ session });

      await ArenaMatchAttemptEvent.create(
        [
          {
            attemptId: attempt._id,
            matchId: match._id,
            userId,
            idempotencyKey: submissionKey,
            eventType: "ATTEMPT_SUBMITTED",
            answerChanges: normalized,
            serverAt: now,
            metadata: {
              submissionMode:
                effectiveMode,
              answerRevision:
                attempt.answerRevision,
            },
          },
        ],
        { session, ordered: true }
      );
      const outboxEvents = [
        {
          eventType:
            "ArenaAttemptSubmitted",
          aggregateType:
            "ArenaMatchAttempt",
          aggregateId: attempt._id,
          idempotencyKey:
            `${attempt._id}:ArenaAttemptSubmitted`,
          payload: {
            matchId: String(match._id),
            submissionMode:
              effectiveMode,
          },
        },
      ];
      await ArenaOutboxEvent.create(
        outboxEvents,
        { session, ordered: true }
      );
      result = {
        attempt,
        match,
        replayed: false,
      };
    });
    return {
      attemptId: String(result.attempt._id),
      status: result.attempt.status,
      matchStatus: result.match.status,
      replayed: result.replayed,
    };
  } finally {
    await session.endSession();
  }
}

async function getArenaMatchPageData({
  matchId,
  userId,
  now = new Date(),
}) {
  let autoAdvancedQuestionNumber = 0;
  let match = await loadMatch(matchId);
  const role = assertMatchParticipant(
    match,
    userId
  );
  let attempt =
    await ArenaMatchAttempt.findOne({
      matchId: match._id,
      userId,
    }).lean();
  const divisionLocked =
    isSundayDivisionLocked(now);
  const matchRequestLocked =
    isSundayMatchRequestLocked(
      now,
      match.division
    );
  if (
    !divisionLocked &&
    attempt?.status === "IN_PROGRESS" &&
    attempt.deadlineAt &&
    new Date(attempt.deadlineAt) <= now
  ) {
    await advanceArenaMatchQuestion({
      matchId: match._id,
      userId,
      requestId:
        `QUESTION_TIME_LIMIT:${attempt._id}:${new Date(
          attempt.deadlineAt
        ).getTime()}`,
      submissionMode: "TIME_LIMIT",
      now,
    });
    [match, attempt] = await Promise.all([
      ArenaMatch.findById(match._id),
      ArenaMatchAttempt.findOne({
        matchId: match._id,
        userId,
      }).lean(),
    ]);
    if (
      attempt?.status ===
      "IN_PROGRESS"
    ) {
      autoAdvancedQuestionNumber =
        Number(
          attempt.currentQuestionIndex
        ) + 1;
    }
  }

  const opponentUserId =
    role === "CHALLENGER"
      ? match.defender.userId
      : match.challenger.userId;
  const opponent = await User.findById(
    opponentUserId
  )
    .select("username name")
    .lean();
  const pack = match.problemPackId
    ? await loadPackWithQuestions(
        match.problemPackId
      )
    : null;
  const showQuestions =
    !divisionLocked &&
    attempt?.status === "IN_PROGRESS";
  const remainingMs = showQuestions
    ? Math.max(
        0,
        new Date(attempt.deadlineAt).getTime() -
          now.getTime()
      )
    : 0;
  const roleResultKey = role === "CHALLENGER" ? "challenger" : "defender";
  const opponentResultKey = role === "CHALLENGER" ? "defender" : "challenger";
  const resultSnapshot = match.resultSnapshot || null;
  const isFriendlyMatch = match.matchType === "FRIENDLY";
  const revengeRight = match.status === "SETTLED" && match.matchType === "NORMAL"
    ? await ArenaRevengeRight.findOne({
        sourceMatchId: match._id,
        eligibleUserId: userId,
      }).lean()
    : null;
  const defenseScheduleProtectionCandidate =
    match.division === "MAIN" &&
    match.matchType === "NORMAL" &&
    match.matchOrigin ===
      "MAIN_UPWARD_AUTO_MATCH" &&
    role === "DEFENDER" &&
    match.status === "READY" &&
    attempt?.status === "READY" &&
    !attempt?.startedAt &&
    new Date(now).getTime() -
      new Date(
        match.readyAt ||
          match.createdAt
      ).getTime() <=
      3 * 60 * 60 * 1000;
  const defenseScheduleProtectionOffer =
    defenseScheduleProtectionCandidate
      ? await getMainShopItemOffer({
          itemCode:
            "DEFENSE_SCHEDULE_PROTECTION",
          now,
        })
      : null;
  return {
    id: String(match._id),
    matchStatus: match.status,
    matchStatusLabel:
      MATCH_STATUS_LABELS[match.status] ||
      "경기 처리 중",
    role,
    roleLabel:
      isFriendlyMatch
        ? (role === "CHALLENGER" ? "초대한 사용자" : "초대 수락 사용자")
        : (role === "CHALLENGER" ? "공격자" : "방어자"),
    opponentName:
      String(opponent?.name || opponent?.username || "닉네임 확인 중"),
    matchType: match.matchType,
    matchTitle:
      match.matchType === "REVENGE"
        ? "복수전"
        : match.matchType === "FRIENDLY"
          ? "친선 경기"
          : "일반 쟁탈전",
    divisionLabel:
      isFriendlyMatch
        ? "Ranked"
        : match.division === "MAIN"
          ? "Ranked"
          : "Unranked",
    division: match.division,
    canUseDefenseScheduleProtection:
      defenseScheduleProtectionCandidate &&
      defenseScheduleProtectionOffer
        ?.purchaseOpen === true,
    defenseScheduleProtectionPriceDays:
      defenseScheduleProtectionOffer
        ?.priceDays ?? null,
    problemPack: pack
      ? {
          version: pack.version,
          questionCount:
            pack.questionCount,
          totalPoints:
            pack.totalPoints,
          timeLimitMs:
            pack.timeLimitMs,
          timeLimitLabel:
            formatTimeLimit(
              pack.timeLimitMs
            ),
          curriculumCoverage:
            pack.curriculumCoverage,
        }
      : null,
    attempt: attempt
      ? {
          id: String(attempt._id),
          status: attempt.status,
          startedAt: attempt.startedAt,
          deadlineAt: attempt.deadlineAt,
          submittedAt:
            attempt.submittedAt,
          currentQuestionIndex:
            attempt.currentQuestionIndex,
          evidenceDeadlineAt:
            attempt.evidenceDeadlineAt,
          evidenceSubmittedAt:
            attempt.evidenceSubmittedAt,
          submissionMode:
            attempt.submissionMode,
          answerRevision:
            attempt.answerRevision,
        }
      : null,
    questions: showQuestions
      ? publicQuestionsForAttempt(
          pack,
          attempt
        )
      : [],
    serverNow: now.toISOString(),
    remainingMs,
    autoAdvancedQuestionNumber,
    canPrepare:
      match.status === "MATCHED" &&
      !match.problemPackId &&
      !matchRequestLocked,
    canStart:
      attempt?.status === "READY" &&
      (
        ["READY", "IN_PROGRESS"].includes(match.status) ||
        (match.status === "HELD" && match.integrityStatus === "CLEAR")
      ) &&
      !matchRequestLocked,
    inProgress: showQuestions,
    submitted:
      attempt?.status === "SUBMITTED",
    evidenceRequired:
      attempt?.status === "EVIDENCE_REQUIRED",
    matchRequestLocked,
    divisionLocked,
    settled: match.status === "SETTLED",
    held: match.status === "HELD",
    didWin:
      match.status === "SETTLED" &&
      match.winnerRole === role,
    winnerRole: match.winnerRole || null,
    result: resultSnapshot
      ? {
          myScore: resultSnapshot[roleResultKey] || null,
          opponentScore: resultSnapshot[opponentResultKey] || null,
          tieBreakStep: resultSnapshot.tieBreakStep || "",
          tupleAction:
            resultSnapshot.settlementSummary?.tupleAction || "KEEP",
          stakeOutcome:
            resultSnapshot.settlementSummary?.challengerStakeOutcome || "",
        }
      : null,
    revengeRight: revengeRight
      ? {
          id: String(revengeRight._id),
          // 결과 화면의 복수전 오버레이가 Unranked 페이백 점수와
          // Ranked 학습일수를 정확히 구분하도록 원경기 Division을 함께 전달한다.
          division: match.division,
          status: revengeRight.status,
          canClaim: revengeRight.status === "AVAILABLE",
          revengeMatchId: revengeRight.revengeMatchId
            ? String(revengeRight.revengeMatchId)
            : null,
          stakeDays: Number(revengeRight.revengeStakeDays),
          feeDays: Number(revengeRight.feeDays),
        }
      : null,
  };
}

async function submitExpiredArenaAttempts({
  now = new Date(),
  limit = 100,
} = {}) {
  if (isSundayDivisionLocked(now)) {
    return {
      scanned: 0,
      submitted: 0,
      divisionLocked: true,
    };
  }
  const attempts =
    await ArenaMatchAttempt.find({
      status: "IN_PROGRESS",
      deadlineAt: { $lte: now },
    })
      .select("_id matchId userId deadlineAt")
      .limit(Math.max(1, Math.min(500, limit)))
      .lean();
  let submitted = 0;
  for (const attempt of attempts) {
    try {
      await advanceArenaMatchQuestion({
        matchId: attempt.matchId,
        userId: attempt.userId,
        requestId:
          `QUESTION_TIME_LIMIT:${attempt._id}:${new Date(
            attempt.deadlineAt
          ).getTime()}`,
        submissionMode: "TIME_LIMIT",
        now,
      });
      submitted += 1;
    } catch (error) {
      if (
        ![
          "ARENA_ATTEMPT_NOT_IN_PROGRESS",
        ].includes(error.code)
      ) {
        console.error(
          "Arena 제한 시간 제출 실패:",
          error
        );
      }
    }
  }
  return { scanned: attempts.length, submitted };
}

function startArenaMatchAttemptScheduler() {
  if (attemptScheduleTimer) {
    return attemptScheduleTimer;
  }
  attemptScheduleTimer = setInterval(
    async () => {
      if (attemptScheduleRunning) return;
      attemptScheduleRunning = true;
      try {
        await withSchedulerLease(
          { name: "ARENA_MATCH_TIMERS", leaseMs: 2 * 60 * 1000 },
          () => Promise.all([
            submitExpiredArenaAttempts(),
            holdExpiredEvidence(),
            holdExpiredMatchStarts(),
            holdSundayCutoffMatches(),
            settleExpiredSubRevengeMatches(),
            settleExpiredMainRevengeMatches(),
          ])
        );
      } finally {
        attemptScheduleRunning = false;
      }
    },
    ATTEMPT_SCHEDULER_INTERVAL_MS
  );
  attemptScheduleTimer.unref?.();
  return attemptScheduleTimer;
}

/* ------------------------------------------------------------------
 * iPad 포크의 시도(attempt) 서비스 — OURS 에서 재이식.
 * arenaAttemptDeadlineService, arenaMatchScoringOutboxService,
 * goatArenaCommandService 및 테스트가 팩토리 API
 * (createArenaMatchAttemptService, serverDeadlineSubmissionId,
 *  ArenaMatchAttemptError)를 사용한다. 원격 정본(위쪽)과 최상위
 * 식별자(mongoose, ArenaMatchAttempt 등)가 겹쳐 IIFE 스코프로 격리한다.
 * ------------------------------------------------------------------ */
const __ipadAttemptFork = (() => {
  const module = { exports: {} };
const crypto = require("node:crypto");
const mongoose = require("mongoose");

const {
  ArenaQuestionPack,
} = require(
  "../models/arenaQuestionPackModel"
);
const {
  RankTakeoverAttempt:
    ArenaMatchAttempt,
  RankTakeoverAttemptEvent:
    ArenaMatchAttemptEvent,
  RankTakeoverAttemptSubmission:
    ArenaMatchAttemptSubmission,
  authorizeArenaAttemptMutation,
} = require(
  "../models/arenaMatchAttemptModel"
);
const {
  RankTakeoverMatch,
} = require(
  "../models/rankTakeoverMatchModel"
);

const MATCH_SELECTION = [
  "_id",
  "matchId",
  "policyVersionId",
  "status",
  "challengerUserId",
  "defenderUserId",
  "challengerQuestionPackId",
  "defenderQuestionPackId",
  "startsBy",
  "submitsBy",
  "integrityState",
].join(" ");

// Deliberately excludes answerKeyVersion, answerVersionIds and privateMaterial.
const PUBLIC_PACK_SELECTION = [
  "_id",
  "matchId",
  "matchRecordId",
  "participantRole",
  "participantUserId",
  "packVersion",
  "sealedContentHash",
  "questionCount",
  "timeLimitSeconds",
  "scoringPolicyVersion",
].join(" ");

const START_INPUT_FIELDS =
  new Set([
    "matchId",
    "participantRole",
    "participantUserId",
    "questionPackId",
    "clientBuildVersion",
    "observedAt",
    "startCapability",
    "session",
  ]);

const EVENT_INPUT_FIELDS =
  new Set([
    "matchId",
    "participantRole",
    "participantUserId",
    "questionPackId",
    "clientEventId",
    "eventType",
    "payload",
    "clientBuildVersion",
    "session",
  ]);

const SUBMIT_INPUT_FIELDS =
  new Set([
    "matchId",
    "participantRole",
    "participantUserId",
    "questionPackId",
    "submissionId",
    "clientBuildVersion",
    "session",
  ]);

const READ_INPUT_FIELDS =
  new Set([
    "matchId",
    "participantRole",
    "participantUserId",
    "questionPackId",
    "session",
  ]);

const SCORING_INPUT_FIELDS =
  new Set([
    ...READ_INPUT_FIELDS,
    "serverCapability",
  ]);

const DEADLINE_INPUT_FIELDS =
  new Set([
    ...READ_INPUT_FIELDS,
    "attemptId",
    "deadlineCapability",
  ]);

const FORBIDDEN_CLIENT_KEYS =
  new Set([
    "score",
    "calibratedscore",
    "advancedcorrectcount",
    "correctness",
    "iscorrect",
    "correctanswer",
    "answerkey",
    "answerkeyversion",
    "answerversionid",
    "answerversionids",
    "solution",
    "calculatedduration",
    "calculateddurationms",
    "duration",
    "durationms",
    "activesolvetime",
    "activesolvetimems",
    "recognizedactiveintervalms",
    "recognizedheartbeatactivems",
    "timeSpentMs".toLowerCase(),
    "startedat",
    "endsat",
    "submittedat",
    "effectivesubmittedat",
    "frozenat",
    "submissionsource",
    "nonblankanswercount",
    "serveroccurredat",
    "serversequence",
    "ip",
    "ipaddress",
    "rawip",
    "device",
    "deviceid",
    "devicefingerprint",
    "payment",
    "paymentid",
    "paymentorderid",
  ]);

class ArenaMatchAttemptError
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
      "ArenaMatchAttemptError";
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
  throw new ArenaMatchAttemptError(
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

function requiredText(
  value,
  label,
  maxLength = 180,
  {
    allowEmpty = false,
  } = {}
) {
  if (
    typeof value !==
    "string"
  ) {
    fail(
      "ARENA_ATTEMPT_INPUT_INVALID",
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
  if (
    !allowEmpty &&
    !normalized
  ) {
    fail(
      "ARENA_ATTEMPT_INPUT_INVALID",
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
      "ARENA_ATTEMPT_INPUT_INVALID",
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
      "ARENA_ATTEMPT_INPUT_INVALID",
      `${label} must be a valid identifier`,
      {
        statusCode: 400,
      }
    );
  }
  return new mongoose.Types
    .ObjectId(value);
}

function requiredRole(
  value
) {
  const role =
    requiredText(
      value,
      "participantRole",
      20
    ).toUpperCase();
  if (
    ![
      "CHALLENGER",
      "DEFENDER",
    ].includes(role)
  ) {
    fail(
      "ARENA_ATTEMPT_INPUT_INVALID",
      "participantRole must be CHALLENGER or DEFENDER",
      {
        statusCode: 400,
      }
    );
  }
  return role;
}

function asDate(
  value,
  label
) {
  const date =
    value instanceof Date
      ? new Date(
          value.getTime()
        )
      : new Date(value);
  if (
    !Number.isFinite(
      date.getTime()
    )
  ) {
    fail(
      "ARENA_ATTEMPT_SERVER_TIME_INVALID",
      `${label} must be a valid date`,
      {
        statusCode: 500,
      }
    );
  }
  return date;
}

function normalizedKey(key) {
  return String(key)
    .replace(
      /[^a-zA-Z0-9]/g,
      ""
    )
    .toLowerCase();
}

function assertNoForbiddenFields(
  value,
  path = "input"
) {
  if (
    value === null ||
    value === undefined
  ) {
    return;
  }
  if (
    path.endsWith(
      ".session"
    ) ||
    path.endsWith(
      ".serverCapability"
    ) ||
    path.endsWith(
      ".deadlineCapability"
    ) ||
    path.endsWith(
      ".startCapability"
    )
  ) {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(
      (entry, index) =>
        assertNoForbiddenFields(
          entry,
          `${path}[${index}]`
        )
    );
    return;
  }
  if (
    typeof value !==
      "object" ||
    value instanceof Date ||
    value instanceof
      mongoose.Types.ObjectId
  ) {
    return;
  }
  for (const [
    key,
    child,
  ] of Object.entries(value)) {
    if (
      FORBIDDEN_CLIENT_KEYS.has(
        normalizedKey(key)
      )
    ) {
      fail(
        "ARENA_ATTEMPT_CLIENT_FIELD_FORBIDDEN",
        `${path}.${key} is server-owned or prohibited telemetry`,
        {
          statusCode: 400,
          details: {
            field:
              `${path}.${key}`,
          },
        }
      );
    }
    assertNoForbiddenFields(
      child,
      `${path}.${key}`
    );
  }
}

function assertAllowedFields(
  input,
  allowed,
  label = "input"
) {
  if (
    !input ||
    typeof input !==
      "object" ||
    Array.isArray(input)
  ) {
    fail(
      "ARENA_ATTEMPT_INPUT_INVALID",
      `${label} must be an object`,
      {
        statusCode: 400,
      }
    );
  }
  assertNoForbiddenFields(
    input,
    label
  );
  const unexpected =
    Object.keys(input)
      .filter(
        (key) =>
          !allowed.has(key)
      );
  if (unexpected.length) {
    fail(
      "ARENA_ATTEMPT_INPUT_INVALID",
      `${label} contains unsupported fields: ${unexpected.join(
        ", "
      )}`,
      {
        statusCode: 400,
        details: {
          fields:
            unexpected,
        },
      }
    );
  }
}

function normalizeIdentity(
  input,
  allowed
) {
  assertAllowedFields(
    input,
    allowed
  );
  return {
    matchId:
      requiredText(
        input.matchId,
        "matchId"
      ),
    participantRole:
      requiredRole(
        input
          .participantRole
      ),
    participantUserId:
      requiredObjectId(
        input
          .participantUserId,
        "participantUserId"
      ),
    questionPackId:
      requiredObjectId(
        input
          .questionPackId,
        "questionPackId"
      ),
    session:
      input.session || null,
  };
}

function stableValue(value) {
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
      stableValue
    );
  }
  if (
    typeof value ===
    "object"
  ) {
    return Object.keys(value)
      .sort()
      .reduce(
        (result, key) => {
          result[key] =
            stableValue(
              value[key]
            );
          return result;
        },
        {}
      );
  }
  return value;
}

function fingerprint(value) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        stableValue(value)
      )
    )
    .digest("hex");
}

function queryWithSession(
  query,
  session
) {
  return session
    ? query.session(session)
    : query;
}

function publicAttempt(
  input
) {
  const value =
    asPlain(input);
  return Object.freeze({
    attemptId: value._id,
    matchId: value.matchId,
    participantRole:
      value.participantRole,
    participantUserId:
      value.participantUserId,
    questionPackId:
      value.questionPackId,
    questionPackVersion:
      value.questionPackVersion,
    scoringPolicyVersion:
      value.scoringPolicyVersion,
    timingPolicyVersion:
      value
        .timingPolicySnapshot
        ?.version,
    activeSolveTimePolicyVersion:
      value
        .timingPolicySnapshot
        ?.version,
    heartbeatPolicyVersion:
      value
        .timingPolicySnapshot
        ?.heartbeatPolicyVersion,
    networkReconnectGraceMs:
      value
        .timingPolicySnapshot
        ?.networkReconnectGraceMs,
    status: value.status,
    questionCount:
      value.questionCount,
    timeLimitSeconds:
      value.timeLimitSeconds,
    startedAt:
      value.startedAt,
    endsAt: value.endsAt,
    commonSubmitsBy:
      value.commonSubmitsBy,
    recognizedHeartbeatActiveMs:
      value
        .recognizedHeartbeatActiveMs,
    submittedAt:
      value.submittedAt || null,
  });
}

function publicEvent(
  input
) {
  const value =
    asPlain(input);
  return Object.freeze({
    eventId: value._id,
    attemptId:
      value.attemptId,
    matchId: value.matchId,
    eventType:
      value.eventType,
    clientEventId:
      value.clientEventId,
    serverSequence:
      value.serverSequence,
    serverOccurredAt:
      value.serverOccurredAt,
    questionSlot:
      value.questionSlot ??
      null,
    networkState:
      value.networkState ||
      null,
    recognizedActiveIntervalMs:
      value
        .recognizedActiveIntervalMs,
    answerStored:
      value.eventType ===
      "ANSWER_CHANGED",
  });
}

function publicSubmission(
  input
) {
  const value =
    asPlain(input);
  return Object.freeze({
    submissionRecordId:
      value._id,
    attemptId:
      value.attemptId,
    matchId: value.matchId,
    participantRole:
      value.participantRole,
    participantUserId:
      value.participantUserId,
    questionPackId:
      value.questionPackId,
    submissionId:
      value.submissionId,
    submissionSource:
      value.submissionSource,
    submittedAt:
      value.submittedAt,
    effectiveSubmittedAt:
      value
        .effectiveSubmittedAt,
    frozenAt:
      value.frozenAt,
    lastAcceptedServerSequence:
      value
        .lastAcceptedServerSequence,
    recognizedHeartbeatActiveMs:
      value
        .recognizedHeartbeatActiveMs,
    answerCount:
      value.answerCount,
    nonBlankAnswerCount:
      value
        .nonBlankAnswerCount,
  });
}

function normalizeAnswer(
  value
) {
  if (
    typeof value !==
    "string"
  ) {
    fail(
      "ARENA_ATTEMPT_INPUT_INVALID",
      "payload.answer must be a string",
      {
        statusCode: 400,
      }
    );
  }
  const normalized =
    value
      .normalize("NFKC")
      .trim()
      .replace(
        /\s+/g,
        " "
      );
  if (
    normalized.length >
    4000
  ) {
    fail(
      "ARENA_ATTEMPT_INPUT_INVALID",
      "payload.answer is too long",
      {
        statusCode: 400,
      }
    );
  }
  return {
    kind: "TEXT",
    value: normalized,
  };
}

function assertPayloadFields(
  payload,
  allowed,
  required = []
) {
  if (
    !payload ||
    typeof payload !==
      "object" ||
    Array.isArray(payload)
  ) {
    fail(
      "ARENA_ATTEMPT_INPUT_INVALID",
      "payload must be an object",
      {
        statusCode: 400,
      }
    );
  }
  assertNoForbiddenFields(
    payload,
    "input.payload"
  );
  const unexpected =
    Object.keys(payload)
      .filter(
        (key) =>
          !allowed.includes(key)
      );
  const missing =
    required.filter(
      (key) =>
        !Object.prototype
          .hasOwnProperty.call(
            payload,
            key
          )
    );
  if (
    unexpected.length ||
    missing.length
  ) {
    fail(
      "ARENA_ATTEMPT_INPUT_INVALID",
      "payload does not match the event contract",
      {
        statusCode: 400,
        details: {
          unexpected,
          missing,
        },
      }
    );
  }
}

function normalizeQuestionSlot(
  value
) {
  if (
    !Number.isSafeInteger(
      value
    ) ||
    value < 1
  ) {
    fail(
      "ARENA_ATTEMPT_INPUT_INVALID",
      "payload.questionSlot must be a positive integer",
      {
        statusCode: 400,
      }
    );
  }
  return value;
}

function normalizeEventPayload(
  eventType,
  payload
) {
  if (
    eventType ===
    "QUESTION_FOCUS"
  ) {
    assertPayloadFields(
      payload,
      ["questionSlot"],
      ["questionSlot"]
    );
    return {
      questionSlot:
        normalizeQuestionSlot(
          payload
            .questionSlot
        ),
      normalizedAnswer:
        null,
      networkState: null,
    };
  }
  if (
    eventType ===
    "ANSWER_CHANGED"
  ) {
    assertPayloadFields(
      payload,
      [
        "questionSlot",
        "answer",
      ],
      [
        "questionSlot",
        "answer",
      ]
    );
    return {
      questionSlot:
        normalizeQuestionSlot(
          payload
            .questionSlot
        ),
      normalizedAnswer:
        normalizeAnswer(
          payload.answer
        ),
      networkState: null,
    };
  }
  if (
    eventType ===
    "HEARTBEAT"
  ) {
    assertPayloadFields(
      payload,
      []
    );
    return {
      questionSlot: null,
      normalizedAnswer:
        null,
      networkState: null,
    };
  }
  if (
    eventType ===
    "NETWORK_STATE"
  ) {
    assertPayloadFields(
      payload,
      ["networkState"],
      ["networkState"]
    );
    const networkState =
      requiredText(
        payload
          .networkState,
        "payload.networkState",
        20
      ).toUpperCase();
    if (
      ![
        "ONLINE",
        "OFFLINE",
        "RECONNECTED",
        "BACKGROUND",
        "FOREGROUND",
      ].includes(
        networkState
      )
    ) {
      fail(
        "ARENA_ATTEMPT_INPUT_INVALID",
        "payload.networkState is not recognized",
        {
          statusCode: 400,
        }
      );
    }
    return {
      questionSlot: null,
      normalizedAnswer:
        null,
      networkState,
    };
  }
  fail(
    "ARENA_ATTEMPT_INPUT_INVALID",
    "eventType is not recognized",
    {
      statusCode: 400,
    }
  );
}

function normalizeStartInput(
  input
) {
  const identity =
    normalizeIdentity(
      input,
      START_INPUT_FIELDS
    );
  return {
    ...identity,
    clientBuildVersion:
      requiredText(
        input
          .clientBuildVersion,
        "clientBuildVersion",
        100
      ),
    observedAt:
      asDate(
        input.observedAt,
        "observedAt"
      ),
    startCapability:
      input
        .startCapability,
  };
}

function normalizeEventInput(
  input
) {
  const identity =
    normalizeIdentity(
      input,
      EVENT_INPUT_FIELDS
    );
  const eventType =
    requiredText(
      input.eventType,
      "eventType",
      40
    ).toUpperCase();
  const payload =
    normalizeEventPayload(
      eventType,
      input.payload
    );
  return {
    ...identity,
    clientEventId:
      requiredText(
        input.clientEventId,
        "clientEventId"
      ),
    eventType,
    payload,
    clientBuildVersion:
      requiredText(
        input
          .clientBuildVersion,
        "clientBuildVersion",
        100
      ),
  };
}

function normalizeSubmitInput(
  input
) {
  const identity =
    normalizeIdentity(
      input,
      SUBMIT_INPUT_FIELDS
    );
  return {
    ...identity,
    submissionId:
      requiredText(
        input.submissionId,
        "submissionId"
      ),
    clientBuildVersion:
      requiredText(
        input
          .clientBuildVersion,
        "clientBuildVersion",
        100
      ),
  };
}

function normalizeDeadlineInput(
  input
) {
  const identity =
    normalizeIdentity(
      input,
      DEADLINE_INPUT_FIELDS
    );
  return {
    ...identity,
    attemptId:
      requiredObjectId(
        input.attemptId,
        "attemptId"
      ),
    deadlineCapability:
      input
        .deadlineCapability,
  };
}

function serverDeadlineSubmissionId(
  attemptId
) {
  return `SERVER_DEADLINE:${String(
    attemptId
  )}`;
}

function createArenaMatchAttemptService(
  options = {}
) {
  const now =
    typeof options.now ===
    "function"
      ? options.now
      : () => new Date();
  const resolveHeartbeatPolicy =
    options
      .resolveHeartbeatPolicy;
  const serverCapability =
    options.serverCapability;
  const startCapability =
    options.startCapability ??
    serverCapability;
  const deadlineCapability =
    options
      .deadlineCapability ??
    serverCapability;
  const enqueueScoringIntent =
    typeof options
      .enqueueScoringIntent ===
    "function"
      ? options
          .enqueueScoringIntent
      : (input) =>
          require(
            "./arenaMatchScoringOutboxService"
          )
            .enqueueArenaMatchScoringIntent(
              input
            );

  function isConfiguredCapability(
    capability
  ) {
    return (
      typeof capability ===
        "symbol" ||
      (capability !== null &&
        capability !==
          undefined &&
        (typeof capability ===
          "object" ||
          typeof capability ===
            "function"))
    );
  }

  function assertStartAuthority(
    input
  ) {
    if (
      !isConfiguredCapability(
        startCapability
      ) ||
      input
        .startCapability !==
        startCapability
    ) {
      fail(
        "ARENA_ATTEMPT_SERVER_ONLY",
        "participant attempt start is available only to the in-process Rank Takeover command",
        {
          statusCode: 403,
        }
      );
    }
    if (
      !input.session ||
      typeof input
        .session
        .inTransaction !==
        "function" ||
      input
        .session
        .inTransaction() !==
        true
    ) {
      fail(
        "ARENA_ATTEMPT_TRANSACTION_REQUIRED",
        "participant attempt start must share the Rank Takeover Mongo transaction",
        {
          statusCode: 500,
        }
      );
    }
  }

  function assertDeadlineAuthority(
    input
  ) {
    if (
      !isConfiguredCapability(
        deadlineCapability
      ) ||
      input
        .deadlineCapability !==
        deadlineCapability
    ) {
      fail(
        "ARENA_ATTEMPT_SERVER_ONLY",
        "participant deadline submission is available only to the in-process deadline worker",
        {
          statusCode: 403,
        }
      );
    }
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

  async function loadMatch(
    matchId,
    session
  ) {
    const match =
      await queryWithSession(
        RankTakeoverMatch
          .findOne({
            matchId,
          })
          .select(
            MATCH_SELECTION
          ),
        session
      ).lean();
    if (!match) {
      fail(
        "ARENA_MATCH_NOT_FOUND",
        "Rank Takeover match does not exist",
        {
          statusCode: 404,
        }
      );
    }
    return match;
  }

  async function loadPublicPack(
    questionPackId,
    session
  ) {
    const pack =
      await queryWithSession(
        ArenaQuestionPack
          .findById(
            questionPackId
          )
          .select(
            PUBLIC_PACK_SELECTION
          ),
        session
      ).lean();
    if (!pack) {
      fail(
        "ARENA_QUESTION_PACK_NOT_FOUND",
        "sealed participant question pack does not exist",
        {
          statusCode: 404,
        }
      );
    }
    return pack;
  }

  function assertParticipantContract(
    identity,
    match,
    pack
  ) {
    const rolePrefix =
      identity
        .participantRole ===
      "CHALLENGER"
        ? "challenger"
        : "defender";
    const expectedUserId =
      match[
        `${rolePrefix}UserId`
      ];
    const expectedPackId =
      match[
        `${rolePrefix}QuestionPackId`
      ];

    if (
      !sameId(
        expectedUserId,
        identity
          .participantUserId
      )
    ) {
      fail(
        "ARENA_ATTEMPT_PARTICIPANT_MISMATCH",
        "participant role does not belong to this user",
        {
          statusCode: 403,
        }
      );
    }
    if (
      !sameId(
        expectedPackId,
        identity.questionPackId
      )
    ) {
      fail(
        "ARENA_ATTEMPT_PACK_MISMATCH",
        "participant must use the sealed pack assigned to their role",
        {
          statusCode: 409,
        }
      );
    }
    if (
      pack.matchId !==
        match.matchId ||
      pack.participantRole !==
        identity
          .participantRole ||
      !sameId(
        pack
          .participantUserId,
        identity
          .participantUserId
      ) ||
      !sameId(
        pack._id,
        identity.questionPackId
      ) ||
      (pack.matchRecordId &&
        !sameId(
          pack.matchRecordId,
          match._id
        ))
    ) {
      fail(
        "ARENA_ATTEMPT_PACK_MISMATCH",
        "sealed pack participant contract does not match the Rank Takeover match",
        {
          statusCode: 409,
        }
      );
    }
    if (
      !match.policyVersionId ||
      !pack.packVersion ||
      !pack
        .scoringPolicyVersion ||
      !/^[a-f0-9]{64}$/.test(
        String(
          pack
            .sealedContentHash ||
            ""
        )
      ) ||
      !Number.isSafeInteger(
        pack.questionCount
      ) ||
      pack.questionCount < 1 ||
      !Number.isSafeInteger(
        pack
          .timeLimitSeconds
      ) ||
      pack
        .timeLimitSeconds < 1
    ) {
      fail(
        "ARENA_ATTEMPT_PACK_INVALID",
        "sealed pack is missing its public immutable contract",
        {
          statusCode: 409,
        }
      );
    }
  }

  async function loadContract(
    identity,
    session
  ) {
    const match =
      await loadMatch(
        identity.matchId,
        session
      );
    const pack =
      await loadPublicPack(
        identity
          .questionPackId,
        session
      );
    assertParticipantContract(
      identity,
      match,
      pack
    );
    return {
      match,
      pack,
    };
  }

  function assertAttemptIdentity(
    attempt,
    identity
  ) {
    if (
      !attempt ||
      attempt.matchId !==
        identity.matchId ||
      attempt
        .participantRole !==
        identity
          .participantRole ||
      !sameId(
        attempt
          .participantUserId,
        identity
          .participantUserId
      ) ||
      !sameId(
        attempt
          .questionPackId,
        identity.questionPackId
      )
    ) {
      fail(
        "ARENA_ATTEMPT_IDENTITY_CONFLICT",
        "existing attempt belongs to a different participant contract",
        {
          statusCode: 409,
        }
      );
    }
  }

  async function findAttempt(
    identity,
    session
  ) {
    return queryWithSession(
      ArenaMatchAttempt
        .findOne({
          matchId:
            identity.matchId,
          participantRole:
            identity
              .participantRole,
          participantUserId:
            identity
              .participantUserId,
          questionPackId:
            identity
              .questionPackId,
        }),
      session
    );
  }

  function assertNewAttemptMatchState(
    match
  ) {
    if (
      ![
        "READY",
        "IN_PROGRESS",
      ].includes(
        match.status
      )
    ) {
      fail(
        "ARENA_MATCH_NOT_OPEN_FOR_ATTEMPT",
        `participant attempt cannot start from ${match.status}`,
        {
          statusCode: 409,
        }
      );
    }
  }

  function assertLiveMatchState(
    match
  ) {
    if (
      ![
        "READY",
        "IN_PROGRESS",
      ].includes(
        match.status
      )
    ) {
      fail(
        "ARENA_MATCH_NOT_IN_PROGRESS",
        `participant event cannot be accepted from ${match.status}`,
        {
          statusCode: 409,
        }
      );
    }
  }

  async function resolveTimingPolicy(
    match,
    pack,
    session
  ) {
    if (
      typeof resolveHeartbeatPolicy !==
      "function"
    ) {
      policyPending(
        "HEARTBEAT_POLICY_RESOLVER_UNAVAILABLE",
        "published heartbeat recognition policy is unavailable"
      );
    }
    const resolved =
      await resolveHeartbeatPolicy({
        policyVersionId:
          match
            .policyVersionId,
        match: {
          id: match._id,
          matchId:
            match.matchId,
          status:
            match.status,
          submitsBy:
            match.submitsBy,
        },
        questionPack: {
          id: pack._id,
          packVersion:
            pack.packVersion,
          timeLimitSeconds:
            pack
              .timeLimitSeconds,
          scoringPolicyVersion:
            pack
              .scoringPolicyVersion,
        },
        session,
      });
    const published =
      resolved &&
      (resolved.status ===
        "PUBLISHED" ||
        resolved.published ===
          true);
    const version =
      typeof resolved?.version ===
        "string"
        ? resolved.version
            .trim()
        : "";
    const heartbeatPolicyVersion =
      typeof resolved
        ?.heartbeatPolicyVersion ===
        "string"
        ? resolved
            .heartbeatPolicyVersion
            .trim()
        : "";
    const maxInterval =
      resolved
        ?.maxRecognizedHeartbeatIntervalMs;
    const reconnectGrace =
      resolved
        ?.networkReconnectGraceMs;
    if (
      !published ||
      !version ||
      !heartbeatPolicyVersion ||
      !Number.isSafeInteger(
        maxInterval
      ) ||
      maxInterval < 1 ||
      !Number.isSafeInteger(
        reconnectGrace
      ) ||
      reconnectGrace < 0
    ) {
      policyPending(
        "HEARTBEAT_POLICY_UNPUBLISHED",
        "heartbeat recognition cap must be published before participant start"
      );
    }
    if (
      resolved.policyVersionId &&
      !sameId(
        resolved
          .policyVersionId,
        match.policyVersionId
      )
    ) {
      policyPending(
        "HEARTBEAT_POLICY_VERSION_MISMATCH",
        "heartbeat policy does not match the policy pinned to the match"
      );
    }
    return {
      version,
      heartbeatPolicyVersion,
      maxRecognizedHeartbeatIntervalMs:
        maxInterval,
      networkReconnectGraceMs:
        reconnectGrace,
    };
  }

  async function startAttemptInTransaction(
    input,
    observedAt,
    session
  ) {
    const {
      match,
      pack,
    } =
      await loadContract(
        input,
        session
      );
    const existing =
      await findAttempt(
        input,
        session
      );
    if (existing) {
      assertAttemptIdentity(
        existing,
        input
      );
      return publicAttempt(
        existing
      );
    }

    assertNewAttemptMatchState(
      match
    );
    const startsBy =
      match.startsBy
        ? asDate(
            match.startsBy,
            "match.startsBy"
          )
        : null;
    const submitsBy =
      asDate(
        match.submitsBy,
        "match.submitsBy"
      );
    if (
      startsBy &&
      observedAt > startsBy
    ) {
      fail(
        "ARENA_ATTEMPT_START_DEADLINE_PASSED",
        "participant start deadline has passed",
        {
          statusCode: 409,
        }
      );
    }
    if (
      observedAt >=
      submitsBy
    ) {
      fail(
        "ARENA_ATTEMPT_COMMON_DEADLINE_PASSED",
        "common match submission deadline has passed",
        {
          statusCode: 409,
        }
      );
    }

    const timingPolicy =
      await resolveTimingPolicy(
        match,
        pack,
        session
      );
    const endsAt =
      new Date(
        Math.min(
          observedAt.getTime() +
            pack
              .timeLimitSeconds *
              1000,
          submitsBy.getTime()
        )
      );
    const [attempt] =
      await ArenaMatchAttempt
        .create(
          [
            {
              matchId:
                match.matchId,
              matchRecordId:
                match._id,
              participantRole:
                input
                  .participantRole,
              participantUserId:
                input
                  .participantUserId,
              questionPackId:
                pack._id,
              questionPackVersion:
                pack.packVersion,
              questionPackSealHash:
                pack
                  .sealedContentHash,
              policyVersionId:
                match
                  .policyVersionId,
              scoringPolicyVersion:
                pack
                  .scoringPolicyVersion,
              questionCount:
                pack
                  .questionCount,
              timeLimitSeconds:
                pack
                  .timeLimitSeconds,
              timingPolicySnapshot:
                timingPolicy,
              clientBuildVersionAtStart:
                input
                  .clientBuildVersion,
              startedAt:
                observedAt,
              endsAt,
              commonSubmitsBy:
                submitsBy,
              status:
                "IN_PROGRESS",
              nextServerSequence:
                1,
              lastHeartbeatAt:
                observedAt,
              heartbeatActivityState:
                "ACTIVE",
              recognizedHeartbeatActiveMs:
                0,
            },
          ],
          {
            session,
          }
        );
    return publicAttempt(
      attempt
    );
  }

  async function recoverStartedAttempt(
    input
  ) {
    const existing =
      await findAttempt(
        input,
        null
      );
    if (!existing) {
      return null;
    }
    assertAttemptIdentity(
      existing,
      input
    );
    return publicAttempt(
      existing
    );
  }

  async function startAttempt(
    rawInput
  ) {
    const input =
      normalizeStartInput(
        rawInput
      );
    assertStartAuthority(
      input
    );
    const observedAt =
      input.observedAt;
    try {
      return await runInTransaction(
        (session) =>
          startAttemptInTransaction(
            input,
            observedAt,
            session
          ),
        input.session
      );
    } catch (error) {
      if (
        !input.session &&
        isDuplicateKey(error)
      ) {
        const recovered =
          await recoverStartedAttempt(
            input
          );
        if (recovered) {
          return recovered;
        }
      }
      throw error;
    }
  }

  function assertQuestionSlot(
    attempt,
    payload
  ) {
    if (
      payload.questionSlot &&
      payload.questionSlot >
        attempt.questionCount
    ) {
      fail(
        "ARENA_ATTEMPT_QUESTION_SLOT_INVALID",
        "question slot is outside the sealed participant pack",
        {
          statusCode: 400,
        }
      );
    }
  }

  function heartbeatMutation(
    attempt,
    input,
    observedAt
  ) {
    let recognizedInterval =
      0;
    const set = {};
    if (
      input.eventType ===
      "HEARTBEAT"
    ) {
      const last =
        asDate(
          attempt
            .lastHeartbeatAt,
          "attempt.lastHeartbeatAt"
        );
      const elapsed =
        observedAt.getTime() -
        last.getTime();
      if (elapsed < 0) {
        fail(
          "ARENA_ATTEMPT_SERVER_TIME_REGRESSION",
          "server time moved behind the last recognized heartbeat",
          {
            statusCode: 500,
          }
        );
      }
      if (
        attempt
          .heartbeatActivityState ===
        "ACTIVE"
      ) {
        recognizedInterval =
          Math.min(
            elapsed,
            attempt
              .timingPolicySnapshot
              .maxRecognizedHeartbeatIntervalMs
          );
      }
      set.lastHeartbeatAt =
        observedAt;
      set.heartbeatActivityState =
        "ACTIVE";
    } else if (
      input.eventType ===
      "NETWORK_STATE"
    ) {
      set.lastHeartbeatAt =
        observedAt;
      set.heartbeatActivityState =
        [
          "OFFLINE",
          "BACKGROUND",
        ].includes(
          input.payload
            .networkState
        )
          ? "INACTIVE"
          : "ACTIVE";
    }
    return {
      recognizedInterval,
      set,
    };
  }

  async function findExistingEvent(
    attemptId,
    clientEventId,
    session
  ) {
    return queryWithSession(
      ArenaMatchAttemptEvent
        .findOne({
          attemptId,
          clientEventId,
        }),
      session
    );
  }

  function assertEventIdempotency(
    event,
    requestFingerprint
  ) {
    if (
      event
        .requestFingerprint !==
      requestFingerprint
    ) {
      fail(
        "ARENA_ATTEMPT_EVENT_ID_CONFLICT",
        "clientEventId was already used with different event data",
        {
          statusCode: 409,
        }
      );
    }
    return publicEvent(event);
  }

  async function recordEventInTransaction(
    input,
    observedAt,
    requestFingerprint,
    session
  ) {
    const {
      match,
    } =
      await loadContract(
        input,
        session
      );
    const attempt =
      await findAttempt(
        input,
        session
      );
    if (!attempt) {
      fail(
        "ARENA_ATTEMPT_NOT_STARTED",
        "participant must start their own timed attempt before sending events",
        {
          statusCode: 409,
        }
      );
    }
    assertAttemptIdentity(
      attempt,
      input
    );

    const existing =
      await findExistingEvent(
        attempt._id,
        input.clientEventId,
        session
      );
    if (existing) {
      return assertEventIdempotency(
        existing,
        requestFingerprint
      );
    }

    if (
      observedAt >
      attempt.endsAt
    ) {
      fail(
        "ARENA_ATTEMPT_DEADLINE_PASSED",
        "participant attempt deadline has passed",
        {
          statusCode: 409,
        }
      );
    }
    assertLiveMatchState(
      match
    );
    if (
      attempt.status !==
      "IN_PROGRESS"
    ) {
      fail(
        "ARENA_ATTEMPT_ALREADY_SUBMITTED",
        "submitted attempt cannot accept new events",
        {
          statusCode: 409,
        }
      );
    }
    assertQuestionSlot(
      attempt,
      input.payload
    );

    const {
      recognizedInterval,
      set,
    } =
      heartbeatMutation(
        attempt,
        input,
        observedAt
      );
    const sequence =
      attempt
        .nextServerSequence;
    const update = {
      $inc: {
        nextServerSequence: 1,
        recognizedHeartbeatActiveMs:
          recognizedInterval,
      },
    };
    if (
      Object.keys(set).length
    ) {
      update.$set = set;
    }
    const updatedAttempt =
      await authorizeArenaAttemptMutation(
        ArenaMatchAttempt
          .findOneAndUpdate(
          {
            _id: attempt._id,
            status:
              "IN_PROGRESS",
            nextServerSequence:
              sequence,
            endsAt: {
              $gte:
                observedAt,
            },
          },
          update,
          {
            session,
            returnDocument:
              "after",
          }
        ),
        "EVENT_APPEND"
      );
    if (!updatedAttempt) {
      fail(
        "ARENA_ATTEMPT_CONCURRENT_CHANGE",
        "participant attempt changed while the event was being appended",
        {
          statusCode: 409,
        }
      );
    }

    const [event] =
      await ArenaMatchAttemptEvent
        .create(
          [
            {
              attemptId:
                attempt._id,
              matchId:
                attempt.matchId,
              participantRole:
                attempt
                  .participantRole,
              participantUserId:
                attempt
                  .participantUserId,
              questionPackId:
                attempt
                  .questionPackId,
              clientEventId:
                input.clientEventId,
              requestFingerprint,
              eventType:
                input.eventType,
              serverSequence:
                sequence,
              serverOccurredAt:
                observedAt,
              clientBuildVersion:
                input
                  .clientBuildVersion,
              questionSlot:
                input.payload
                  .questionSlot,
              normalizedAnswer:
                input.payload
                  .normalizedAnswer,
              networkState:
                input.payload
                  .networkState,
              recognizedActiveIntervalMs:
                recognizedInterval,
            },
          ],
          {
            session,
          }
        );
    return publicEvent(event);
  }

  async function recoverEvent(
    input,
    requestFingerprint
  ) {
    const attempt =
      await findAttempt(
        input,
        null
      );
    if (!attempt) {
      return null;
    }
    const event =
      await findExistingEvent(
        attempt._id,
        input.clientEventId,
        null
      );
    if (!event) {
      return null;
    }
    return assertEventIdempotency(
      event,
      requestFingerprint
    );
  }

  async function lazyFinalizeExpiredAttempt(
    input,
    observedAt
  ) {
    if (
      input.session ||
      !isConfiguredCapability(
        deadlineCapability
      )
    ) {
      return null;
    }
    const attempt =
      await findAttempt(
        input,
        null
      );
    if (
      !attempt ||
      attempt.status !==
        "IN_PROGRESS" ||
      observedAt <=
        attempt.endsAt
    ) {
      return null;
    }
    return submitExpiredAttempt({
      matchId:
        attempt.matchId,
      participantRole:
        attempt
          .participantRole,
      participantUserId:
        attempt
          .participantUserId,
      questionPackId:
        attempt
          .questionPackId,
      attemptId:
        attempt._id,
      deadlineCapability,
    });
  }

  async function recordEvent(
    rawInput
  ) {
    const input =
      normalizeEventInput(
        rawInput
      );
    const observedAt =
      asDate(
        now(),
        "now"
      );
    const requestFingerprint =
      fingerprint({
        matchId:
          input.matchId,
        participantRole:
          input
            .participantRole,
        participantUserId:
          input
            .participantUserId,
        questionPackId:
          input.questionPackId,
        clientEventId:
          input.clientEventId,
        eventType:
          input.eventType,
        payload:
          input.payload,
        clientBuildVersion:
          input
            .clientBuildVersion,
      });
    await lazyFinalizeExpiredAttempt(
      input,
      observedAt
    );
    try {
      return await runInTransaction(
        (session) =>
          recordEventInTransaction(
            input,
            observedAt,
            requestFingerprint,
            session
          ),
        input.session
      );
    } catch (error) {
      if (
        !input.session &&
        isDuplicateKey(error)
      ) {
        const recovered =
          await recoverEvent(
            input,
            requestFingerprint
          );
        if (recovered) {
          return recovered;
        }
      }
      throw error;
    }
  }

  async function findSubmission(
    attemptId,
    session,
    {
      includeAnswers =
        false,
    } = {}
  ) {
    let query =
      ArenaMatchAttemptSubmission
        .findOne({
          attemptId,
        });
    if (includeAnswers) {
      query =
        query.select(
          "+finalAnswers"
        );
    }
    return queryWithSession(
      query,
      session
    );
  }

  function assertSubmissionIdempotency(
    submission,
    submissionId,
    {
      allowCanonical =
        false,
    } = {}
  ) {
    if (
      !allowCanonical &&
      submission.submissionId !==
      submissionId
    ) {
      fail(
        "ARENA_ATTEMPT_SUBMISSION_ID_CONFLICT",
        "participant attempt is already frozen under another submissionId",
        {
          statusCode: 409,
        }
      );
    }
    return publicSubmission(
      submission
    );
  }

  async function frozenAttemptSnapshot(
    attempt,
    effectiveSubmittedAt,
    session
  ) {
    const events =
      await queryWithSession(
        ArenaMatchAttemptEvent
          .find({
            attemptId:
              attempt._id,
            serverSequence: {
              $lt:
                attempt
                  .nextServerSequence,
            },
            serverOccurredAt: {
              $lte:
                effectiveSubmittedAt,
            },
          })
          .select(
            "+normalizedAnswer"
          )
          .sort({
            serverSequence: 1,
          }),
        session
      ).lean();
    const latest =
      new Map();
    let recognizedHeartbeatActiveMs =
      0;
    for (const event of events) {
      if (
        event.eventType ===
        "ANSWER_CHANGED"
      ) {
        latest.set(
          event.questionSlot,
          event
        );
      }
      recognizedHeartbeatActiveMs +=
        Number(
          event
            .recognizedActiveIntervalMs ||
            0
        );
    }
    const finalAnswers = [
        ...latest.values(),
      ]
      .sort(
        (left, right) =>
          left.questionSlot -
          right.questionSlot
      )
      .map(
        (event) => ({
          questionSlot:
            event
              .questionSlot,
          normalizedAnswer: {
            kind:
              event
                .normalizedAnswer
                .kind,
            value:
              event
                .normalizedAnswer
                .value,
          },
          sourceEventId:
            event._id,
          sourceServerSequence:
            event
              .serverSequence,
          answerChangedAt:
            event
              .serverOccurredAt,
        })
      );
    return {
      finalAnswers,
      lastAcceptedServerSequence:
        events.length
          ? events[
              events.length -
                1
            ].serverSequence
          : 0,
      recognizedHeartbeatActiveMs,
      nonBlankAnswerCount:
        finalAnswers.filter(
          (answer) =>
            answer
              .normalizedAnswer
              .value
              .trim()
              .length > 0
        ).length,
    };
  }

  async function replayFrozenSubmission(
    attempt,
    existing,
    session,
    submissionId,
    {
      allowCanonical =
        false,
    } = {}
  ) {
    const replay =
      assertSubmissionIdempotency(
        existing,
        submissionId,
        {
          allowCanonical:
            allowCanonical ||
            existing
              .submissionSource ===
              "SERVER_DEADLINE",
        }
      );
    await enqueueScoringIntent({
      attemptId:
        attempt._id,
      submissionRecordId:
        existing._id,
      session,
      now:
        existing.frozenAt ||
        existing
          .submittedAt,
    });
    return replay;
  }

  async function freezeAttemptInTransaction(
    {
      attempt,
      observedAt,
      submissionSource,
      submissionId,
      clientBuildVersion,
    },
    session
  ) {
    const effectiveSubmittedAt =
      submissionSource ===
      "SERVER_DEADLINE"
        ? new Date(
            attempt
              .endsAt
          )
        : new Date(
            observedAt
          );
    const snapshot =
      await frozenAttemptSnapshot(
        attempt,
        effectiveSubmittedAt,
        session
      );
    const submissionRecordId =
      new mongoose.Types
        .ObjectId();
    const requestFingerprint =
      fingerprint({
        attemptId:
          attempt._id,
        submissionId,
        submissionSource,
        effectiveSubmittedAt,
        lastAcceptedServerSequence:
          snapshot
            .lastAcceptedServerSequence,
        clientBuildVersion,
      });

    const [submission] =
      await ArenaMatchAttemptSubmission
        .create(
          [
            {
              _id:
                submissionRecordId,
              attemptId:
                attempt._id,
              matchId:
                attempt.matchId,
              participantRole:
                attempt
                  .participantRole,
              participantUserId:
                attempt
                  .participantUserId,
              questionPackId:
                attempt
                  .questionPackId,
              submissionId,
              requestFingerprint,
              clientBuildVersion,
              submissionSource,
              startedAt:
                attempt.startedAt,
              endsAt:
                attempt.endsAt,
              submittedAt:
                effectiveSubmittedAt,
              effectiveSubmittedAt,
              frozenAt:
                observedAt,
              lastAcceptedServerSequence:
                snapshot
                  .lastAcceptedServerSequence,
              recognizedHeartbeatActiveMs:
                snapshot
                  .recognizedHeartbeatActiveMs,
              answerCount:
                snapshot
                  .finalAnswers
                  .length,
              nonBlankAnswerCount:
                snapshot
                  .nonBlankAnswerCount,
              finalAnswers:
                snapshot
                  .finalAnswers,
            },
          ],
          {
            session,
          }
        );

    const updated =
      await authorizeArenaAttemptMutation(
        ArenaMatchAttempt
          .findOneAndUpdate(
          {
            _id: attempt._id,
            status:
              "IN_PROGRESS",
            nextServerSequence:
              attempt
                .nextServerSequence,
            submissionRecordId:
              null,
          },
          {
            $set: {
              status:
                "SUBMITTED",
              submissionRecordId,
              submissionId,
              submittedAt:
                effectiveSubmittedAt,
            },
          },
          {
            session,
            returnDocument:
              "after",
          }
        ),
        "FINAL_SUBMISSION"
      );
    if (!updated) {
      fail(
        "ARENA_ATTEMPT_CONCURRENT_CHANGE",
        "participant attempt changed while final answers were being frozen",
        {
          statusCode: 409,
        }
      );
    }
    await enqueueScoringIntent({
      attemptId:
        attempt._id,
      submissionRecordId:
        submissionRecordId,
      session,
      now:
        observedAt,
    });
    return publicSubmission(
      submission
    );
  }

  async function submitAttemptInTransaction(
    input,
    observedAt,
    session
  ) {
    const {
      match,
    } =
      await loadContract(
        input,
        session
      );
    const attempt =
      await findAttempt(
        input,
        session
      );
    if (!attempt) {
      fail(
        "ARENA_ATTEMPT_NOT_STARTED",
        "participant must start their timed attempt before submitting",
        {
          statusCode: 409,
        }
      );
    }
    assertAttemptIdentity(
      attempt,
      input
    );

    const existing =
      await findSubmission(
        attempt._id,
        session
      );
    if (existing) {
      return replayFrozenSubmission(
        attempt,
        existing,
        session,
        input.submissionId
      );
    }

    assertLiveMatchState(
      match
    );
    if (
      attempt.status !==
      "IN_PROGRESS"
    ) {
      fail(
        "ARENA_ATTEMPT_SUBMISSION_STATE_INVALID",
        "participant attempt is not open for submission",
        {
          statusCode: 409,
        }
      );
    }

    const deadlineSubmission =
      observedAt >
      attempt.endsAt;
    return freezeAttemptInTransaction(
      {
        attempt,
        observedAt,
        submissionSource:
          deadlineSubmission
            ? "SERVER_DEADLINE"
            : "CLIENT",
        submissionId:
          deadlineSubmission
            ? serverDeadlineSubmissionId(
                attempt._id
              )
            : input
                .submissionId,
        clientBuildVersion:
          deadlineSubmission
            ? attempt
                .clientBuildVersionAtStart
            : input
                .clientBuildVersion,
      },
      session
    );
  }

  async function submitExpiredAttemptInTransaction(
    input,
    observedAt,
    session
  ) {
    await loadContract(
      input,
      session
    );
    const attempt =
      await findAttempt(
        input,
        session
      );
    if (
      !attempt ||
      !sameId(
        attempt._id,
        input.attemptId
      )
    ) {
      fail(
        "ARENA_ATTEMPT_IDENTITY_CONFLICT",
        "deadline worker attempt identity does not match the participant contract",
        {
          statusCode: 409,
        }
      );
    }
    assertAttemptIdentity(
      attempt,
      input
    );

    const existing =
      await findSubmission(
        attempt._id,
        session
      );
    if (existing) {
      return replayFrozenSubmission(
        attempt,
        existing,
        session,
        existing
          .submissionId,
        {
          allowCanonical:
            true,
        }
      );
    }

    if (
      attempt.status !==
      "IN_PROGRESS"
    ) {
      fail(
        "ARENA_ATTEMPT_SUBMISSION_STATE_INVALID",
        "participant attempt is not open for deadline submission",
        {
          statusCode: 409,
        }
      );
    }
    if (
      observedAt <=
      attempt.endsAt
    ) {
      fail(
        "ARENA_ATTEMPT_DEADLINE_NOT_REACHED",
        "participant attempt deadline has not passed",
        {
          statusCode: 409,
        }
      );
    }
    return freezeAttemptInTransaction(
      {
        attempt,
        observedAt,
        submissionSource:
          "SERVER_DEADLINE",
        submissionId:
          serverDeadlineSubmissionId(
            attempt._id
          ),
        clientBuildVersion:
          attempt
            .clientBuildVersionAtStart,
      },
      session
    );
  }

  async function recoverSubmission(
    input,
    {
      allowCanonical =
        false,
    } = {}
  ) {
    const attempt =
      await findAttempt(
        input,
        null
      );
    if (
      !attempt ||
      (input.attemptId &&
        !sameId(
          attempt._id,
          input.attemptId
        ))
    ) {
      return null;
    }
    const submission =
      await findSubmission(
        attempt._id,
        null
      );
    if (!submission) {
      return null;
    }
    return assertSubmissionIdempotency(
      submission,
      input.submissionId,
      {
        allowCanonical:
          allowCanonical ||
          submission
            .submissionSource ===
            "SERVER_DEADLINE",
      }
    );
  }

  async function submitAttempt(
    rawInput
  ) {
    const input =
      normalizeSubmitInput(
        rawInput
      );
    const observedAt =
      asDate(
        now(),
        "now"
      );
    try {
      return await runInTransaction(
        (session) =>
          submitAttemptInTransaction(
            input,
            observedAt,
            session
          ),
        input.session
      );
    } catch (error) {
      if (
        !input.session &&
        (isDuplicateKey(
          error
        ) ||
          error.code ===
            "ARENA_ATTEMPT_CONCURRENT_CHANGE")
      ) {
        const recovered =
          await recoverSubmission(
            input
          );
        if (recovered) {
          return recovered;
        }
      }
      throw error;
    }
  }

  async function submitExpiredAttempt(
    rawInput
  ) {
    const input =
      normalizeDeadlineInput(
        rawInput
      );
    assertDeadlineAuthority(
      input
    );
    const observedAt =
      asDate(
        now(),
        "now"
      );
    try {
      return await runInTransaction(
        (session) =>
          submitExpiredAttemptInTransaction(
            input,
            observedAt,
            session
          ),
        input.session
      );
    } catch (error) {
      if (
        !input.session &&
        (isDuplicateKey(
          error
        ) ||
          error.code ===
            "ARENA_ATTEMPT_CONCURRENT_CHANGE")
      ) {
        const recovered =
          await recoverSubmission(
            input,
            {
              allowCanonical:
                true,
            }
          );
        if (recovered) {
          return recovered;
        }
      }
      throw error;
    }
  }

  async function getParticipantAttempt(
    rawInput
  ) {
    const input =
      normalizeIdentity(
        rawInput,
        READ_INPUT_FIELDS
      );
    await loadContract(
      input,
      input.session
    );
    let attempt =
      await findAttempt(
        input,
        input.session
      );
    if (!attempt) {
      fail(
        "ARENA_ATTEMPT_NOT_FOUND",
        "participant attempt does not exist",
        {
          statusCode: 404,
        }
      );
    }
    const finalized =
      await lazyFinalizeExpiredAttempt(
        input,
        asDate(
          now(),
          "now"
        )
      );
    if (finalized) {
      attempt =
        await findAttempt(
          input,
          null
        );
    }
    return publicAttempt(
      attempt
    );
  }

  /**
   * Returns only the authenticated participant's own latest accepted answers.
   * Correct answers, scoring fields, event ids and device/network telemetry are
   * deliberately absent. The command facade derives every identity field from
   * the authenticated Rank match contract before calling this method.
   */
  async function getParticipantSavedAnswers(
    rawInput
  ) {
    const input =
      normalizeIdentity(
        rawInput,
        READ_INPUT_FIELDS
      );
    await loadContract(
      input,
      input.session
    );
    let attempt =
      await findAttempt(
        input,
        input.session
      );
    if (!attempt) {
      fail(
        "ARENA_ATTEMPT_NOT_FOUND",
        "participant attempt does not exist",
        {
          statusCode: 404,
        }
      );
    }
    const observedAt =
      asDate(
        now(),
        "now"
      );
    const finalized =
      await lazyFinalizeExpiredAttempt(
        input,
        observedAt
      );
    if (finalized) {
      attempt =
        await findAttempt(
          input,
          null
        );
    }
    let acceptedThrough;
    if (
      attempt.status ===
        "SUBMITTED" &&
      attempt.submittedAt
    ) {
      acceptedThrough =
        asDate(
          attempt
            .submittedAt,
          "attempt.submittedAt"
        );
    } else {
      acceptedThrough =
        observedAt <=
        attempt.endsAt
          ? observedAt
          : new Date(
              attempt
                .endsAt
            );
    }
    const events =
      await queryWithSession(
        ArenaMatchAttemptEvent
          .find({
            attemptId:
              attempt._id,
            eventType:
              "ANSWER_CHANGED",
            serverSequence: {
              $lt:
                attempt
                  .nextServerSequence,
            },
            serverOccurredAt: {
              $lte:
                acceptedThrough,
            },
          })
          .select(
            "+normalizedAnswer"
          )
          .sort({
            serverSequence: 1,
          }),
        input.session
      ).lean();
    const latest =
      new Map();
    for (const event of events) {
      latest.set(
        event.questionSlot,
        event
      );
    }
    return Object.freeze(
      [...latest.values()]
        .sort(
          (left, right) =>
            left.questionSlot -
            right.questionSlot
        )
        .map(
          (event) =>
            Object.freeze({
              questionSlot:
                event
                  .questionSlot,
              answer:
                event
                  .normalizedAnswer
                  .value,
              serverSequence:
                event
                  .serverSequence,
              savedAt:
                event
                  .serverOccurredAt,
            })
        )
    );
  }

  async function assertPublicReleaseAllowed(
    input
  ) {
    const pack =
      asPlain(input?.pack);
    if (
      !pack._id ||
      !pack.matchId ||
      !pack.matchRecordId ||
      !pack.participantRole ||
      !pack.participantUserId ||
      !input
        ?.participantUserId ||
      !sameId(
        pack
          .participantUserId,
        input
          .participantUserId
      )
    ) {
      return {
        allowed: false,
        reasonCode:
          "PARTICIPANT_PACK_MISMATCH",
      };
    }
    if (
      ![
        "CHALLENGER",
        "DEFENDER",
      ].includes(
        pack.participantRole
      )
    ) {
      return {
        allowed: false,
        reasonCode:
          "PARTICIPANT_PACK_MISMATCH",
      };
    }
    const rolePrefix =
      pack
        .participantRole ===
      "CHALLENGER"
        ? "challenger"
        : "defender";
    const match =
      await RankTakeoverMatch
        .findOne({
          _id:
            pack.matchRecordId,
          matchId:
            pack.matchId,
        })
        .select(
          [
            "_id",
            "matchId",
            "status",
            "integrityState",
            "challengerUserId",
            "defenderUserId",
            "challengerQuestionPackId",
            "defenderQuestionPackId",
          ].join(" ")
        )
        .lean();
    if (
      !match ||
      !sameId(
        match[
          `${rolePrefix}UserId`
        ],
        pack.participantUserId
      ) ||
      !sameId(
        match[
          `${rolePrefix}QuestionPackId`
        ],
        pack._id
      )
    ) {
      return {
        allowed: false,
        reasonCode:
          "MATCH_NOT_PUBLICLY_RELEASABLE",
      };
    }
    const observedAt =
      asDate(
        now(),
        "now"
      );
    let attempt =
      await ArenaMatchAttempt
        .findOne({
          matchId:
            pack.matchId,
          matchRecordId:
            pack.matchRecordId,
          participantRole:
            pack
              .participantRole,
          participantUserId:
            pack
              .participantUserId,
          questionPackId:
            pack._id,
        })
        .select(
          "_id matchId participantRole participantUserId questionPackId status startedAt endsAt"
        )
        .lean();
    if (
      attempt &&
      attempt.status ===
        "IN_PROGRESS" &&
      observedAt >
        attempt.endsAt
    ) {
      await lazyFinalizeExpiredAttempt(
        {
          matchId:
            attempt.matchId,
          participantRole:
            attempt
              .participantRole,
          participantUserId:
            attempt
              .participantUserId,
          questionPackId:
            attempt
              .questionPackId,
        },
        observedAt
      );
      attempt =
        await ArenaMatchAttempt
          .findById(
            attempt._id
          )
          .select(
            "_id status startedAt endsAt"
          )
          .lean();
    }
    if (
      match.status !==
        "IN_PROGRESS" ||
      match.integrityState !==
        "CLEAR"
    ) {
      return {
        allowed: false,
        reasonCode:
          "MATCH_NOT_PUBLICLY_RELEASABLE",
      };
    }
    if (
      !attempt ||
      attempt.status !==
        "IN_PROGRESS" ||
      attempt.startedAt >
        observedAt ||
      attempt.endsAt <
        observedAt
    ) {
      return {
        allowed: false,
        reasonCode:
          "PARTICIPANT_ATTEMPT_NOT_LIVE",
      };
    }
    return {
      allowed: true,
      attemptId:
        attempt._id,
      startedAt:
        attempt.startedAt,
      endsAt:
        attempt.endsAt,
    };
  }

  function assertScoringCapability(
    supplied
  ) {
    const configured =
      isConfiguredCapability(
        serverCapability
      );
    if (
      !configured ||
      supplied !==
        serverCapability
    ) {
      fail(
        "ARENA_ATTEMPT_SERVER_ONLY",
        "frozen answers are available only to the in-process scoring service",
        {
          statusCode: 403,
        }
      );
    }
  }

  async function getPrivateScoringProjection(
    rawInput
  ) {
    assertAllowedFields(
      rawInput,
      SCORING_INPUT_FIELDS
    );
    assertScoringCapability(
      rawInput
        .serverCapability
    );
    const input =
      normalizeIdentity(
        rawInput,
        SCORING_INPUT_FIELDS
      );
    await loadContract(
      input,
      input.session
    );
    const attempt =
      await findAttempt(
        input,
        input.session
      );
    if (!attempt) {
      fail(
        "ARENA_ATTEMPT_NOT_FOUND",
        "participant attempt does not exist",
        {
          statusCode: 404,
        }
      );
    }
    const submission =
      await findSubmission(
        attempt._id,
        input.session,
        {
          includeAnswers:
            true,
        }
      );
    if (!submission) {
      fail(
        "ARENA_ATTEMPT_NOT_SUBMITTED",
        "participant answers are not frozen for scoring",
        {
          statusCode: 409,
        }
      );
    }
    const events =
      await queryWithSession(
        ArenaMatchAttemptEvent
          .find({
            attemptId:
              attempt._id,
            serverSequence: {
              $lte:
                submission
                  .lastAcceptedServerSequence,
            },
            serverOccurredAt: {
              $lte:
                submission
                  .effectiveSubmittedAt,
            },
          })
          .select(
            "+normalizedAnswer"
          )
          .sort({
            serverSequence: 1,
          }),
        input.session
      ).lean();

    return Object.freeze({
      attemptId:
        attempt._id,
      submissionRecordId:
        submission._id,
      matchId:
        attempt.matchId,
      participantRole:
        attempt
          .participantRole,
      participantUserId:
        attempt
          .participantUserId,
      questionPackId:
        attempt
          .questionPackId,
      questionPackVersion:
        attempt
          .questionPackVersion,
      questionPackSealHash:
        attempt
          .questionPackSealHash,
      policyVersionId:
        attempt
          .policyVersionId,
      scoringPolicyVersion:
        attempt
          .scoringPolicyVersion,
      timingPolicySnapshot:
        asPlain(
          attempt
            .timingPolicySnapshot
        ),
      startedAt:
        attempt.startedAt,
      endsAt:
        attempt.endsAt,
      submittedAt:
        submission
          .submittedAt,
      effectiveSubmittedAt:
        submission
          .effectiveSubmittedAt,
      frozenAt:
        submission
          .frozenAt,
      submissionSource:
        submission
          .submissionSource,
      submissionId:
        submission
          .submissionId,
      recognizedHeartbeatActiveMs:
        submission
          .recognizedHeartbeatActiveMs,
      nonBlankAnswerCount:
        submission
          .nonBlankAnswerCount,
      finalAnswers:
        submission
          .finalAnswers
          .map(
            (answer) => ({
              questionSlot:
                answer
                  .questionSlot,
              normalizedAnswer:
                asPlain(
                  answer
                    .normalizedAnswer
                ),
              sourceServerSequence:
                answer
                  .sourceServerSequence,
              answerChangedAt:
                answer
                  .answerChangedAt,
            })
          ),
      eventTimeline:
        events.map(
          (event) => ({
            serverSequence:
              event
                .serverSequence,
            eventType:
              event.eventType,
            serverOccurredAt:
              event
                .serverOccurredAt,
            questionSlot:
              event
                .questionSlot ??
              null,
            normalizedAnswer:
              event
                .normalizedAnswer
                ? asPlain(
                    event
                      .normalizedAnswer
                  )
                : null,
            networkState:
              event
                .networkState ||
              null,
            recognizedActiveIntervalMs:
              event
                .recognizedActiveIntervalMs,
          })
        ),
    });
  }

  return Object.freeze({
    assertPublicReleaseAllowed,
    getParticipantAttempt,
    getParticipantSavedAnswers,
    getPrivateScoringProjection,
    recordEvent,
    startAttempt,
    submitAttempt,
    submitExpiredAttempt,
  });
}

module.exports = {
  ArenaMatchAttemptError,
  createArenaMatchAttemptService,
  serverDeadlineSubmissionId,
};
  return module.exports;
})();
const {
  ArenaMatchAttemptError,
  createArenaMatchAttemptService,
  serverDeadlineSubmissionId,
} = __ipadAttemptFork;

module.exports = {
  ATTEMPT_SCHEDULER_INTERVAL_MS,
  MATCH_START_INTRO_DELAY_MS,
  QUESTION_INTRO_DELAY_MS,
  advanceArenaMatchQuestion,
  applyAnswerChanges,
  chooseSealedProblemPack,
  formatTimeLimit,
  completedSolveTimeMs,
  questionDeadlineAt,
  getArenaMatchPageData,
  initialAnswersForPack,
  normalizeAnswerChanges,
  normalizeOperationId,
  normalizeSignals,
  participantRole,
  prepareArenaMatch,
  publicCategoryLabelForQuestion,
  publicQuestionsForAttempt,
  publicSourceAccuracyForQuestion,
  recordArenaMatchActivity,
  saveArenaMatchAnswers,
  startArenaMatchAttempt,
  startArenaMatchAttemptScheduler,
  submitArenaMatchAttempt,
  submitExpiredArenaAttempts,
  ArenaMatchAttemptError,
  createArenaMatchAttemptService,
  serverDeadlineSubmissionId,
};
