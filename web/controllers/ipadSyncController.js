/**
 * iPad 앱 동기화 전용 컨트롤러 (/api/v1)
 *
 * 웹 세션 흐름(practice/attempt)을 타지 않는 앱 전용 경로다. 앱은 문제를
 * 기기에서 생성해 로컬에서 채점하므로, 서버는 "결과만" 받아 적립한다.
 *
 * 설계 원칙
 *  - 멱등: 모든 쓰기는 클라이언트가 만든 id(clientEventId/clientAttemptId)로
 *    중복을 걸러낸다. 네트워크가 끊겨 같은 큐를 두 번 올려도 안전해야 한다.
 *  - 단조: 진도·유형 게이트는 $addToSet 으로만 늘린다. 두 기기가 엇갈려도
 *    서로의 성과를 지우지 않는다.
 *  - 최소 수집: 필기 이미지 같은 큰 자산은 받지 않는다(hasDrawing 불리언만).
 */

const { createHash } = require("node:crypto");
const mongoose = require("mongoose");
const {
  AssessmentAttempt,
  RankingProfile,
  ConceptProgress,
  LearningEvent,
  Problem,
  ProblemAttempt,
} = require("../models/matthsModel");
// 랭킹은 **레포의 mmrService 가 진실원이다.** 앱이 자체 산식을 갖지 않는다.
// (예전엔 arenaService 로 1000+실력 방식의 별도 레이팅을 계산했다. 그러면 같은
//  학생에게 웹은 "골드 1010", 앱은 "다이아 1978" 처럼 서로 다른 티어를 말한다.
//  명세 9.3 도 "신규 기능은 레거시 rating 기준과 혼합하면 안 된다" 고 못박는다.)
const {
  TIER_CONFIG,
  rankingProfileView,
} = require("../services/mmrService");
const { getRankingDisplayName } = require("../services/userIdentityService");
const {
  getRankingData,
} = require("../services/rankingService");
const {
  arenaBoardFromRankingData,
} = require("../services/rankingApiAdapter");
const {
  loadCurriculum,
  findCurriculumConcept,
} = require("../services/curriculumService");
const {
  ATTENDANCE_SOURCE_MODELS,
  IPAD_ATTENDANCE_CONTRACT_VERSION,
  IPAD_CLIENT_REPORTED_DURATION_TRUST,
  IPAD_CLIENT_REPORTED_MAX_DURATION_MS,
  IPAD_EVENT_FUTURE_SKEW_MS,
  eligibleCycleForSource,
  enqueueCycleAttendanceIntent,
  persistLearningSourceWithAttendance,
} = require("../services/cycleAttendanceOutboxService");
const {
  kstDateKey,
} = require("../services/accessCycleService");
const {
  getDashboardActivity: loadDashboardActivity,
} = require("../services/dashboardActivityService");
const {
  canonicalProgressTypeId,
  canonicalProgressTypeIds,
  canonicalProgressView,
} = require("../services/progressTypeIdService");
const {
  getProblemGenerator,
} = require("../services/problemGenerators");
const {
  getCurriculumConceptCheckGenerator,
} = require(
  "../services/problemGenerators/curriculumConceptCheck"
);
const {
  listStuckPoints,
  resetLearningProgress,
  saveStuckPoint,
  serializeStuckPoint,
} = require("../services/ipadLearningStateService");

const CURRICULUM_ID = "kr-2022";
const IPAD_ATTENDANCE_EVENT_TYPES =
  new Set([
    "problem-correct",
    "problem-wrong",
  ]);
const IPAD_CLIENT_EVENT_ID_MAX_LENGTH = 120;
const IPAD_LEARNING_CONTEXT_MAX_LENGTH = 180;
const IPAD_MASTERY_TYPE_ID_MAX_LENGTH = 120;
const IPAD_MASTERY_TYPE_ID_MAX_COUNT = 50;
const IPAD_INTEGRITY_EVENT_TYPES =
  new Set([
    "protected-screen-screenshot",
    "protected-screen-capture-started",
    "protected-screen-capture-ended",
  ]);

/** 앱 오답노트의 틀린 이유 7종 — 웹 ERROR_LABELS 와 문자열이 동일해 변환이 없다 */
const ERROR_TYPES = [
  "calculation-error",
  "formula-confusion",
  "missing-condition",
  "sign-error",
  "concept-not-understood",
  "prerequisite-missing",
  "unknown",
];

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/**
 * iPad는 문제를 오프라인으로 생성·채점하므로 서버가 개별 정답을 재채점하지는
 * 않는다. 대신 학습 진도에 적립할 수 있는 개념과 유형 ID, 완료에 필요한 서로
 * 다른 유형 수는 서버 커리큘럼/생성기만 정본으로 삼는다. 클라이언트가 임의
 * 문자열을 다섯 개 보내 완료 게이트를 여는 경로를 여기서 차단한다.
 */
function requireIpadMasteryContract({ courseId, unitId, conceptId }) {
  const curriculumItem = findCurriculumConcept(
    loadCurriculum(),
    courseId,
    unitId,
    conceptId
  );
  if (!curriculumItem) {
    throw requestError(
      "교육과정에서 해당 개념을 찾을 수 없습니다.",
      404
    );
  }

  const generator =
    getProblemGenerator({ courseId, unitId, conceptId }) ||
    getCurriculumConceptCheckGenerator({ courseId, unitId, conceptId });
  const allowedTypeIds = new Set(
    (generator?.problemTypes || [])
      .map((problemType) =>
        canonicalProgressTypeId(problemType?.id)
      )
      .filter(Boolean)
  );
  if (!allowedTypeIds.size) {
    throw requestError(
      "이 개념의 문제 유형이 아직 등록되지 않았습니다.",
      404
    );
  }

  const configuredRequired = Math.max(
    1,
    Number(generator.requiredDistinctTypes) || 5
  );
  return {
    curriculumItem,
    allowedTypeIds,
    requiredDistinctTypes: Math.min(
      configuredRequired,
      allowedTypeIds.size
    ),
  };
}

function requireAllowedMasteryTypeIds(rawValues, allowedTypeIds) {
  if (rawValues === undefined || rawValues === null) return [];
  if (!Array.isArray(rawValues)) {
    throw requestError("문제 유형 목록 형식이 올바르지 않습니다.");
  }

  const normalized = rawValues.map(canonicalProgressTypeId);
  if (
    normalized.some(
      (typeId) =>
        !typeId ||
        typeId.length > IPAD_MASTERY_TYPE_ID_MAX_LENGTH ||
        !allowedTypeIds.has(typeId)
    )
  ) {
    throw requestError("등록되지 않은 문제 유형은 진도에 반영할 수 없습니다.");
  }

  const distinct = [...new Set(normalized)];
  if (distinct.length > IPAD_MASTERY_TYPE_ID_MAX_COUNT) {
    throw requestError("한 번에 반영할 문제 유형이 너무 많습니다.");
  }
  return distinct;
}

function requireMasteryCompletionAllowed({
  requested,
  correctTypeIds,
  requiredDistinctTypes,
}) {
  if (requested !== true) return;
  if (correctTypeIds.length < requiredDistinctTypes) {
    throw requestError(
      "필수 문제 유형을 모두 학습한 뒤 완료할 수 있습니다.",
      409
    );
  }
}

/**
 * 생성형 문항의 서버 identity.
 *
 * seed 는 "시험지 한 회차" 단위라 같은 회차 안의 여러 문항이 공유할 수 있다.
 * 예전 externalId(`typeKey + seed`)는 같은 유형의 서로 다른 지문을 한 Problem으로
 * 합쳤다. 그 결과 둘째 오답도 attemptNumber=1로 저장하려다 복합 유니크 인덱스와
 * 충돌했고, iPad 큐가 같은 항목을 영원히 재시도했다.
 *
 * 정답·선지까지 포함한 짧은 digest를 붙여 실제 문항 내용이 같을 때만 같은
 * Problem을 재사용한다. 원문을 externalId에 그대로 넣지 않아 키 크기도 일정하다.
 */
function ipadProblemExternalId({ typeKey, seed, statement, answer, choices }) {
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        statement,
        answer: String(answer || ""),
        choices: (Array.isArray(choices) ? choices : [])
          .slice(0, 5)
          .map((choice) => String(choice)),
      })
    )
    .digest("hex")
    .slice(0, 24);

  return `ipad:v2:${typeKey}:${String(seed ?? 0)}:${fingerprint}`;
}

function incomingWrongCount(entry) {
  return Number.isInteger(entry.wrongCount) && entry.wrongCount > 0
    ? entry.wrongCount
    : 1;
}

function validReviewResultEventId(value) {
  const eventId = String(value || "").trim();
  return eventId && eventId.length <= IPAD_CLIENT_EVENT_ID_MAX_LENGTH
    ? eventId
    : null;
}

function validNextReviewAt(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * iPad가 첫 오답 bulk 응답(server attempt id)을 받기 전에 그 문제를 복습할 수
 * 있다. 그때 앱은 UUID인 clientAttemptId밖에 모르므로 두 식별자를 모두 받는다.
 * clientEventId를 review.lastClientEventId에 보관해 응답 유실 재시도도 한 번으로
 * 수렴시킨다.
 */
async function applyIpadReviewResult(attempt, body = {}) {
  const clientEventId = validReviewResultEventId(body.clientEventId);
  if (body.clientEventId != null && !clientEventId) {
    const error = new Error("복습 결과 요청 ID가 없습니다.");
    error.status = 400;
    error.code = "INVALID_REVIEW_RESULT_EVENT_ID";
    throw error;
  }

  if (clientEventId && attempt.review?.lastClientEventId === clientEventId) {
    return { duplicate: true };
  }

  if (typeof body.correct !== "boolean") {
    const error = new Error("복습 정오 결과가 올바르지 않습니다.");
    error.status = 400;
    error.code = "INVALID_REVIEW_RESULT";
    throw error;
  }

  const nextReviewAt = validNextReviewAt(body.nextReviewAt);
  if (!body.correct && !nextReviewAt) {
    const error = new Error("다음 복습 시각이 올바르지 않습니다.");
    error.status = 400;
    error.code = "INVALID_NEXT_REVIEW_AT";
    throw error;
  }
  const incomingWrong = incomingWrongCount(body);
  const currentWrong = Math.max(Number(attempt.review?.wrongCount) || 1, 1);
  const srsStage = Number.isInteger(body.srsStage) && body.srsStage >= 0
    ? body.srsStage
    : attempt.review?.srsStage ?? 0;

  if (!attempt.review) attempt.review = {};
  attempt.review.status = body.correct ? "completed" : "scheduled";
  attempt.review.scheduledAt = body.correct ? null : (nextReviewAt || new Date());
  attempt.review.reviewedAt = body.correct ? new Date() : null;
  attempt.review.correctedAfterReview = body.correct;
  attempt.review.srsStage = Math.max(Number(attempt.review.srsStage) || 0, srsStage);
  attempt.review.wrongCount = Math.max(currentWrong, incomingWrong);
  if (clientEventId) {
    attempt.review.lastClientEventId = clientEventId;
  }
  await attempt.save();
  return { duplicate: false };
}

/**
 * 같은 clientAttemptId의 지각/중복 업로드를 기존 문서에 단조 병합한다.
 *
 * attemptNumber는 한 Problem 안에서 시도 문서를 구분하는 불변 ordinal이다.
 * 복습 누적 횟수(review.wrongCount)와 같은 값이 아니므로 갱신하지 않는다.
 */
async function mergeWrongNoteAttempt(attempt, entry) {
  const incoming = incomingWrongCount(entry);
  const merged = Math.max(incoming, attempt.review?.wrongCount ?? 0, 1);

  if (!attempt.review) attempt.review = {};
  attempt.review.wrongCount = merged;
  if (Number.isInteger(entry.srsStage)) {
    attempt.review.srsStage = entry.srsStage;
  }
  if (entry.nextReviewAt) {
    attempt.review.scheduledAt = new Date(entry.nextReviewAt);
    attempt.review.status = "scheduled";
  }
  if (entry.myAnswer) {
    attempt.submittedAnswer = String(entry.myAnswer);
  }
  await attempt.save();
  return merged;
}

async function nextProblemAttemptNumber(userId, problemId) {
  const latest = await ProblemAttempt.findOne({ userId, problemId })
    .sort({ attemptNumber: -1 })
    .select("attemptNumber");
  const latestNumber = Number.isInteger(latest?.attemptNumber)
    ? latest.attemptNumber
    : 0;
  return latestNumber + 1;
}

/**
 * 두 기기/재시도가 동시에 같은 오답을 올려도 한 건으로 수렴한다.
 *
 *  - clientAttemptId 충돌: 먼저 들어간 문서를 다시 읽어 병합
 *  - 같은 문제의 다른 clientAttemptId 충돌: 다음 attemptNumber로 재시도
 */
async function createWrongNoteAttemptIdempotently({
  userId,
  clientAttemptId,
  problemId,
  entry,
  fields,
}) {
  const maxAllocationAttempts = 8;

  for (let allocationAttempt = 0;
    allocationAttempt < maxAllocationAttempts;
    allocationAttempt += 1) {
    const attemptNumber = await nextProblemAttemptNumber(userId, problemId);
    try {
      const attempt = await ProblemAttempt.create({
        ...fields,
        userId,
        problemId,
        clientAttemptId,
        attemptNumber,
      });
      return { attempt, duplicate: false };
    } catch (error) {
      if (error?.code !== 11000) throw error;

      // 응답 유실 뒤 재전송이거나 동시 요청이면 다른 요청이 이미 같은
      // clientAttemptId를 저장했을 수 있다. 그 문서를 정답으로 삼아 수렴한다.
      const concurrentDuplicate = await ProblemAttempt.findOne({
        userId,
        clientAttemptId,
      });
      if (concurrentDuplicate) {
        const wrongCount = await mergeWrongNoteAttempt(
          concurrentDuplicate,
          entry
        );
        return {
          attempt: concurrentDuplicate,
          duplicate: true,
          wrongCount,
        };
      }

      // 다른 clientAttemptId가 같은 Problem의 ordinal을 먼저 차지했다.
      // 최신 ordinal을 다시 읽어 다음 번호로 한정 재시도한다.
      if (allocationAttempt === maxAllocationAttempts - 1) throw error;
    }
  }

  throw new Error("오답 시도 번호를 할당하지 못했습니다.");
}

/**
 * GET /api/v1/dashboard/activity
 *
 * 웹 메인과 같은 최근 7일 KPI 정본을 앱에 내려준다. 일반·iPad 풀이의
 * LearningEvent와 별도 평가/눈풀이/모의고사 기록을 dashboardActivityService가
 * 한 번만 합치며, 웹과 앱은 완성된 같은 스냅샷을 소비한다.
 */
exports.getDashboardActivity = async (req, res, next) => {
  try {
    const dashboard = await loadDashboardActivity(req.apiUser._id);
    return res.json({ dashboard });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/v1/learning/:courseId/:unitId/:conceptId/mastery
 * body: { addCorrectTypeIds: [String], userCompleted?: Boolean }
 *
 * 앱이 로컬 채점으로 확보한 "서로 다른 유형 정답"을 게이트에 적립한다.
 * 웹은 practice attempt 를 거쳐야만 쌓이는데 앱에는 그 경로가 없다.
 */
exports.patchMastery = async (req, res, next) => {
  try {
    const { courseId, unitId, conceptId } = req.params;
    const masteryContract = requireIpadMasteryContract({
      courseId,
      unitId,
      conceptId,
    });
    const typeIds = requireAllowedMasteryTypeIds(
      req.body?.addCorrectTypeIds,
      masteryContract.allowedTypeIds
    );

    // **문서를 불러와 save() 한다. findOneAndUpdate 를 쓰면 안 된다.**
    //
    // 쿼리 업데이트는 document 훅(pre('validate'))을 태우지 않는다. 그래서
    // completionPercent 가 기본값 0, status 가 not-started 로 굳었고,
    // 웹 my-learning 이 그 값을 그대로 읽어 **앱에서 아무리 풀어도 웹 진도가 0**
    // 이었다. 레포의 findOrCreateProgress(practiceService.js:357-391)와 같은 형태로 쓴다.
    let progress = await ConceptProgress.findOne({
      userId: req.apiUser._id,
      curriculumId: CURRICULUM_ID,
      courseId,
      unitId,
      conceptId,
    });
    if (!progress) {
      progress = new ConceptProgress({
        userId: req.apiUser._id,
        curriculumId: CURRICULUM_ID,
        courseId,
        unitId,
        conceptId,
        topicCount:
          masteryContract.curriculumItem.concept.topics?.length || 0,
        masteryGate: {
          requiredDistinctTypes:
            masteryContract.requiredDistinctTypes,
          correctTypeIds: [],
        },
      });
    }

    progress.topicCount =
      masteryContract.curriculumItem.concept.topics?.length || 0;
    progress.masteryGate.requiredDistinctTypes =
      masteryContract.requiredDistinctTypes;
    // 이미 저장된 값도 현재 서버 생성기 allowlist를 통과한 것만 유지한다.
    const seen = new Set(
      canonicalProgressTypeIds(progress.masteryGate?.correctTypeIds)
        .filter((typeId) => masteryContract.allowedTypeIds.has(typeId))
    );
    typeIds.forEach((typeId) => seen.add(typeId));
    progress.masteryGate.correctTypeIds = [...seen];
    requireMasteryCompletionAllowed({
      requested: req.body?.userCompleted,
      correctTypeIds: progress.masteryGate.correctTypeIds,
      requiredDistinctTypes: masteryContract.requiredDistinctTypes,
    });
    if (req.body?.userCompleted === true) {
      progress.masteryGate.userCompleted = true;
      // 오프라인 재전송으로 같은 완료 요청이 와도 최초 완료 시각을 보존한다.
      progress.masteryGate.completedAt =
        progress.masteryGate.completedAt ||
        progress.completedAt ||
        new Date();
    }
    progress.lastStudiedAt = new Date();

    // save() 를 타야 pre('validate') 가 completionPercent·status 를 다시 계산한다.
    await progress.save();

    return res.json({
      progress: {
        courseId,
        unitId,
        conceptId,
        completedTopicIndexes: progress.completedTopicIndexes || [],
        completionPercent: progress.completionPercent || 0,
        masteryGate: {
          requiredDistinctTypes: progress.masteryGate?.requiredDistinctTypes ?? 5,
          correctTypeIds: progress.masteryGate?.correctTypeIds || [],
          userCompleted: progress.masteryGate?.userCompleted === true,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/v1/learning/:courseId/:unitId/:conceptId/snapshot
 *
 * 게스트 기록을 계정으로 처음 승계할 때 쓰는 무이벤트 단조 병합.
 * 과거에 체크한 토픽마다 오늘의 LearningEvent를 새로 만들면 주간 그래프가
 * 왜곡되므로, 진도 문서만 합치고 행동 로그는 만들지 않는다.
 */
exports.patchProgressSnapshot = async (req, res, next) => {
  try {
    const { courseId, unitId, conceptId } = req.params;
    const masteryContract = requireIpadMasteryContract({
      courseId,
      unitId,
      conceptId
    });
    const { curriculumItem } = masteryContract;

    const topics = Array.isArray(curriculumItem.concept.topics)
      ? curriculumItem.concept.topics
      : [];
    const incomingTopics = [
      ...new Set(
        (Array.isArray(req.body.completedTopicIndexes)
          ? req.body.completedTopicIndexes
          : [])
          .map(Number)
          .filter(
            (index) =>
              Number.isInteger(index) &&
              index >= 0 &&
              index < topics.length
          )
      ),
    ];
    const incomingTypes = requireAllowedMasteryTypeIds(
      req.body?.correctTypeIds,
      masteryContract.allowedTypeIds
    );

    let progress = await ConceptProgress.findOne({
      userId: req.apiUser._id,
      curriculumId: CURRICULUM_ID,
      courseId,
      unitId,
      conceptId,
    });
    if (!progress) {
      progress = new ConceptProgress({
        userId: req.apiUser._id,
        curriculumId: CURRICULUM_ID,
        courseId,
        unitId,
        conceptId,
        topicCount: topics.length,
        completedTopicIndexes: [],
        masteryGate: {
          requiredDistinctTypes:
            masteryContract.requiredDistinctTypes,
          correctTypeIds: [],
        },
      });
    }

    progress.topicCount = topics.length;
    progress.completedTopicIndexes = [
      ...new Set([
        ...(progress.completedTopicIndexes || []).map(Number),
        ...incomingTopics,
      ]),
    ].sort((left, right) => left - right);
    progress.masteryGate.requiredDistinctTypes =
      masteryContract.requiredDistinctTypes;
    const correctTypeIds = new Set(
      canonicalProgressTypeIds(progress.masteryGate?.correctTypeIds)
        .filter((typeId) => masteryContract.allowedTypeIds.has(typeId))
    );
    incomingTypes.forEach((value) => correctTypeIds.add(value));
    progress.masteryGate.correctTypeIds = [...correctTypeIds];

    const incomingLastStudiedAt = req.body?.lastStudiedAt
      ? new Date(req.body.lastStudiedAt)
      : null;
    if (
      req.body?.lastStudiedAt &&
      (
        Number.isNaN(incomingLastStudiedAt.getTime()) ||
        incomingLastStudiedAt.getTime() >
          Date.now() + IPAD_EVENT_FUTURE_SKEW_MS
      )
    ) {
      throw requestError("마지막 학습 시각이 허용 범위를 벗어났습니다.");
    }
    if (
      incomingLastStudiedAt &&
      !Number.isNaN(incomingLastStudiedAt.getTime()) &&
      (
        !progress.lastStudiedAt ||
        incomingLastStudiedAt > progress.lastStudiedAt
      )
    ) {
      progress.lastStudiedAt = incomingLastStudiedAt;
    }
    requireMasteryCompletionAllowed({
      requested: req.body?.userCompleted,
      correctTypeIds: progress.masteryGate.correctTypeIds,
      requiredDistinctTypes: masteryContract.requiredDistinctTypes,
    });
    if (req.body?.userCompleted === true) {
      progress.masteryGate.userCompleted = true;
      progress.masteryGate.completedAt =
        progress.masteryGate.completedAt ||
        progress.completedAt ||
        incomingLastStudiedAt ||
        new Date();
    }

    await progress.save();
    return res.json({
      progress: {
        courseId,
        unitId,
        conceptId,
        completedTopicIndexes: progress.completedTopicIndexes || [],
        completionPercent: progress.completionPercent || 0,
        masteryGate: {
          requiredDistinctTypes:
            progress.masteryGate?.requiredDistinctTypes ?? 5,
          correctTypeIds:
            progress.masteryGate?.correctTypeIds || [],
          userCompleted:
            progress.masteryGate?.userCompleted === true,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/learning
 *
 * 이 계정의 개념별 진도를 통째로 내려준다 — **동기화의 내려받는 쪽**이다.
 *
 * 왜 필요한가: 진도는 PATCH 로 올리기만 하고 받아오는 경로가 앱에도 서버에도
 * 없었다(2026-07-29 감사 적발). 그래서 기기를 바꾸거나 게스트로 공부하다
 * 가입하면 학습 허브가 0% 로 보였다 — 서버에는 기록이 멀쩡히 있는데도.
 *
 * 응답은 PATCH 의 progress 와 **같은 모양**을 배열로 준다. 앱이 두 경로에서
 * 서로 다른 스키마를 다루지 않게 하려는 것이다.
 */
exports.getLearning = async (req, res, next) => {
  try {
    const rows = await ConceptProgress.find({
      userId: req.apiUser._id,
      curriculumId: CURRICULUM_ID,
    })
      .sort({ lastStudiedAt: -1 })
      .limit(1000)              // 한 커리큘럼의 개념 수를 훨씬 넘는 안전선
      .lean();

    const progress = rows.map((p) => {
      const normalized = canonicalProgressView(p);
      return {
        courseId: p.courseId,
        unitId: p.unitId,
        conceptId: p.conceptId,
        completedTopicIndexes: normalized.completedTopicIndexes,
        completionPercent: normalized.completionPercent,
        masteryGate: {
          requiredDistinctTypes: normalized.requiredDistinctTypes,
          correctTypeIds: normalized.correctTypeIds,
          userCompleted: normalized.userCompleted,
        },
        lastStudiedAt: p.lastStudiedAt || null,
      };
    });

    return res.json({ progress });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/events
 * body: { sessionId, events: [{ clientEventId, eventType, ... , occurredAt }] }
 *
 * 학습 이벤트 벌크 적재. 실제 문제 제출로 식별할 수 있는 event만 30일 출석
 * outbox에 write-ahead로 연결한다. assessment/KICE gradingBatch와 오답 복습은
 * 현재 payload에 source 구분이 없으므로 conceptId 없는 이벤트를 억지 분류하지
 * 않는다. 클라이언트 duration은 텔레메트리로 보관하되 출석 시간에는 0ms로
 * 반영하며, 서버가 검증 가능한 시간 계약이 생기면 그때 승격한다.
 */
function boundedOptionalText(value, maxLength) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }
  const normalized =
    String(value).trim();
  if (
    !normalized ||
    normalized.length >
      maxLength
  ) {
    return null;
  }
  return normalized;
}

function normalizeIpadLearningEvent({
  event,
  userId,
  sessionId,
  allowedEventTypes,
  receivedAt,
}) {
  if (
    !event ||
    typeof event !==
      "object"
  ) {
    return null;
  }
  const clientEventId =
    boundedOptionalText(
      event.clientEventId,
      IPAD_CLIENT_EVENT_ID_MAX_LENGTH
    );
  const eventType =
    String(
      event.eventType || ""
    );
  if (
    !clientEventId ||
    !allowedEventTypes.has(
      eventType
    )
  ) {
    return null;
  }

  const explicitOccurredAt =
    event.occurredAt !==
      null &&
    event.occurredAt !==
      undefined &&
    event.occurredAt !==
      "";
  const parsedOccurredAt =
    explicitOccurredAt
      ? new Date(
          event.occurredAt
        )
      : null;
  const validOccurredAt =
    parsedOccurredAt &&
    !Number.isNaN(
      parsedOccurredAt
        .getTime()
    ) &&
    parsedOccurredAt
      .getTime() <=
      receivedAt.getTime() +
        IPAD_EVENT_FUTURE_SKEW_MS;
  const occurredAt =
    validOccurredAt
      ? parsedOccurredAt
      : new Date(
          receivedAt
        );

  const durationIsStoredTelemetry =
    Number.isSafeInteger(
      event.durationMs
    ) &&
    event.durationMs >= 0 &&
    event.durationMs <=
      IPAD_CLIENT_REPORTED_MAX_DURATION_MS;
  const durationMs =
    durationIsStoredTelemetry
      ? event.durationMs
      : null;
  const correct =
    typeof event.correct ===
      "boolean"
      ? event.correct
      : null;
  const conceptId =
    boundedOptionalText(
      event.conceptId,
      IPAD_LEARNING_CONTEXT_MAX_LENGTH
    );
  const expectedCorrect =
    eventType ===
      "problem-correct"
      ? true
      : eventType ===
          "problem-wrong"
        ? false
        : null;
  const attendanceCandidate =
    IPAD_ATTENDANCE_EVENT_TYPES
      .has(eventType) &&
    correct ===
      expectedCorrect &&
    Boolean(conceptId) &&
    validOccurredAt &&
    Number.isSafeInteger(
      durationMs
    ) &&
    durationMs > 0;
  const integrityEvent =
    IPAD_INTEGRITY_EVENT_TYPES
      .has(eventType);
  const integritySessionCode =
    integrityEvent
      ? boundedOptionalText(
          event.integritySessionCode,
          16
        )
      : null;
  const protectedSurface =
    integrityEvent
      ? boundedOptionalText(
          event.protectedSurface,
          120
        )
      : null;

  return {
    userId,
    clientEventId,
    sessionId,
    eventType,
    curriculumId:
      CURRICULUM_ID,
    courseId:
      boundedOptionalText(
        event.courseId,
        IPAD_LEARNING_CONTEXT_MAX_LENGTH
      ),
    unitId:
      boundedOptionalText(
        event.unitId,
        IPAD_LEARNING_CONTEXT_MAX_LENGTH
      ),
    conceptId,
    topicIndex:
      Number.isSafeInteger(
        event.topicIndex
      ) &&
      event.topicIndex >= 0
        ? event.topicIndex
        : null,
    durationMs,
    correct,
    metadata:
      attendanceCandidate
        ? {
            cycleAttendance: {
              candidate:
                true,
              contractVersion:
                IPAD_ATTENDANCE_CONTRACT_VERSION,
              sourceType:
                "PRACTICE",
              durationTrust:
                IPAD_CLIENT_REPORTED_DURATION_TRUST,
            },
          }
        : integrityEvent
          ? {
              screenIntegrity: {
                sessionCode:
                  integritySessionCode,
                surface:
                  protectedSurface,
              },
            }
          : {},
    occurredAt,
  };
}

function hasServerAttendanceCandidate(
  event
) {
  const attendance =
    event?.metadata
      ?.cycleAttendance;
  return (
    attendance
      ?.candidate ===
      true &&
    Number(
      attendance
        .contractVersion
    ) ===
      IPAD_ATTENDANCE_CONTRACT_VERSION &&
    attendance.sourceType ===
      "PRACTICE" &&
    attendance.durationTrust ===
      IPAD_CLIENT_REPORTED_DURATION_TRUST
  );
}

async function leanResult(query) {
  return typeof query?.lean ===
    "function"
    ? query.lean()
    : query;
}

exports.postEvents = async (req, res, next) => {
  try {
    const receivedAt =
      new Date();
    const normalizedSessionId =
      boundedOptionalText(
        req.body.sessionId,
        120
      );
    const sessionId =
      normalizedSessionId ||
      "ipad";
    const incoming =
      Array.isArray(
        req.body.events
      )
        ? req.body.events
            .slice(0, 500)
        : [];
    if (!incoming.length) {
      return res.json({
        accepted: 0,
        duplicates: 0,
      });
    }

    const enumValues =
      LearningEvent.schema
        ?.path("eventType")
        ?.enumValues;
    if (
      !Array.isArray(
        enumValues
      )
    ) {
      throw new Error(
        "LearningEvent eventType schema is unavailable"
      );
    }
    const allowedEventTypes =
      new Set(enumValues);
    const uniqueDocs = [];
    const seenIds =
      new Set();
    let duplicates = 0;
    for (
      const event of
        incoming
    ) {
      const normalized =
        normalizeIpadLearningEvent({
          event,
          userId:
            req.apiUser._id,
          sessionId,
          allowedEventTypes,
          receivedAt,
        });
      if (!normalized) {
        continue;
      }
      if (
        seenIds.has(
          normalized
            .clientEventId
        )
      ) {
        duplicates += 1;
        continue;
      }
      seenIds.add(
        normalized
          .clientEventId
      );
      uniqueDocs.push(
        normalized
      );
    }
    if (!uniqueDocs.length) {
      return res.json({
        accepted: 0,
        duplicates,
      });
    }

    const existingRows =
      await leanResult(
        LearningEvent.find({
          userId:
            req.apiUser._id,
          clientEventId: {
            $in:
              uniqueDocs.map(
                (document) =>
                  document
                    .clientEventId
              ),
          },
        })
      );
    const existingById =
      new Map(
        (existingRows || [])
          .map((row) => [
            String(
              row.clientEventId
            ),
            row,
          ])
      );
    const cycleByDateKey =
      new Map();
    const resolvedCycleFor =
      async (event) => {
        const dateKey =
          kstDateKey(
            event.occurredAt
          );
        if (
          cycleByDateKey
            .has(dateKey)
        ) {
          return cycleByDateKey
            .get(dateKey);
        }
        const cycle =
          await eligibleCycleForSource({
            userId:
              req.apiUser._id,
            occurredAt:
              event.occurredAt,
          });
        cycleByDateKey.set(
          dateKey,
          cycle || null
        );
        return cycle || null;
      };
    const ensureIntent =
      async (event) => {
        if (
          !hasServerAttendanceCandidate(
            event
          )
        ) {
          return null;
        }
        const cycle =
          await resolvedCycleFor(
            event
          );
        return enqueueCycleAttendanceIntent(
          {
            userId:
              req.apiUser._id,
            sourceModel:
              ATTENDANCE_SOURCE_MODELS
                .LEARNING_EVENT,
            sourceDocumentId:
              event._id,
            occurredAt:
              event.occurredAt,
          },
          {
            resolvedCycle:
              cycle,
          }
        );
      };

    let accepted = 0;
    for (
      const document of
        uniqueDocs
    ) {
      const existing =
        existingById.get(
          document
            .clientEventId
        );
      if (existing) {
        duplicates += 1;
        await ensureIntent(
          existing
        );
        continue;
      }

      const learningEvent =
        new LearningEvent(
          document
        );
      try {
        if (
          hasServerAttendanceCandidate(
            learningEvent
          )
        ) {
          const cycle =
            await resolvedCycleFor(
              learningEvent
            );
          await persistLearningSourceWithAttendance(
            {
              userId:
                req.apiUser._id,
              sourceModel:
                ATTENDANCE_SOURCE_MODELS
                  .LEARNING_EVENT,
              sourceDocumentId:
                learningEvent._id,
              occurredAt:
                learningEvent
                  .occurredAt,
              persistSource:
                () =>
                  learningEvent
                    .save(),
            },
            {
              resolvedCycle:
                cycle,
            }
          );
        } else {
          await learningEvent
            .save();
        }
        accepted += 1;
      } catch (error) {
        if (
          error?.code !==
            11000
        ) {
          throw error;
        }
        const winner =
          await leanResult(
            LearningEvent.findOne({
              userId:
                req.apiUser._id,
              clientEventId:
                document
                  .clientEventId,
            })
          );
        if (!winner) {
          throw error;
        }
        duplicates += 1;
        await ensureIntent(
          winner
        );
      }
    }
    return res.json({
      accepted,
      duplicates,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/wrong-notes/bulk
 * body: { entries: [{ clientAttemptId, typeKey, seed, statement, answer, steps,
 *                     choices?, myAnswer?, divergenceStep?, errorType?,
 *                     wrongCount, srsStage, nextReviewAt?, hasDrawing?, createdAt }] }
 *
 * 앱에서 생성·채점된 문항이라 서버에 Problem 문서가 없다. externalId 로 upsert 해
 * 두고 그 위에 ProblemAttempt(오답)를 남긴다.
 */
exports.postWrongNotesBulk = async (req, res, next) => {
  try {
    // 이 endpoint는 앞선 problem-wrong 이벤트에서 파생된 상세 오답 저장소다.
    // duration도 없으므로 여기서 출석 outbox를 만들면 한 풀이가 이중 집계된다.
    const entries = Array.isArray(req.body.entries) ? req.body.entries.slice(0, 200) : [];
    if (!entries.length) return res.json({ synced: [] });

    const synced = [];
    for (const e of entries) {
      const clientAttemptId = String(e.clientAttemptId || "").trim();
      const typeKey = String(e.typeKey || "unknown").slice(0, 120);
      const statement = String(e.statement || "").slice(0, 4000);
      if (!clientAttemptId || !statement) continue;

      const courseId = String(e.courseId || "ipad");
      const unitId = String(e.unitId || "ipad");
      const conceptId = String(e.conceptId || typeKey);

      // 멱등 키를 먼저 본다. 이미 동기화된 큐 재전송에서 Problem을 새로
      // upsert하면 identity 규칙 변경 시 사용되지 않는 Problem이 남을 수 있다.
      const exists = await ProblemAttempt.findOne({
        userId: req.apiUser._id,
        clientAttemptId,
      });
      if (exists) {
        const merged = await mergeWrongNoteAttempt(exists, e);
        synced.push({
          clientAttemptId,
          attemptId: String(exists._id),
          duplicate: true,
          updated: true,
          wrongCount: merged,
        });
        continue;
      }

      const externalId = ipadProblemExternalId({
        typeKey,
        seed: e.seed,
        statement,
        answer: e.answer,
        choices: e.choices,
      });
      const problem = await Problem.findOneAndUpdate(
        { externalId },
        {
          $setOnInsert: {
            externalId,
            curriculumId: CURRICULUM_ID,
            courseId,
            unitId,
            conceptIds: [conceptId],
            primaryConceptId: conceptId,
            source: { type: "generated", generatorId: typeKey, seed: String(e.seed ?? "") },
            questionType: Array.isArray(e.choices) && e.choices.length ? "multiple-choice" : "short-answer",
            stem: statement,
            correctAnswer: String(e.answer || ""),
            solutionSteps: (Array.isArray(e.steps) ? e.steps : [])
              .slice(0, 12)
              .map((s, i) => ({ stepNumber: i + 1, explanation: String(s).slice(0, 2000) })),
          },
        },
        {
          returnDocument:
            "after",
          upsert: true,
          setDefaultsOnInsert:
            true,
        }
      );

      const errorType = ERROR_TYPES.includes(e.errorType) ? e.errorType : "unknown";
      const creation = await createWrongNoteAttemptIdempotently({
        userId: req.apiUser._id,
        problemId: problem._id,
        clientAttemptId,
        entry: e,
        fields: {
          curriculumId: CURRICULUM_ID,
          courseId,
          unitId,
          conceptId,
          submittedAnswer: String(e.myAnswer || ""),
          // 선지·수식 플래그를 스냅샷에 남긴다.
          // 이게 없으면 다른 기기에서 받아 간 5지선다가 선지 없이 복원돼
          // **주관식으로 둔갑**한다(앱 11차에 로컬 경로만 고쳤던 증상).
          // choiceSchema 는 {key,text} 라 문자열 배열을 그 꼴로 옮겨 담는다.
          problemSnapshot: {
            stem: statement,
            choices: (Array.isArray(e.choices) ? e.choices : [])
              .slice(0, 5)
              .map((text, i) => ({
                key: ["a", "b", "c", "d", "e"][i],
                text: String(text),
              })),
            // 스키마에 없는 값이라 solution 칸을 빌리지 않고 별도 키로 두면 저장되지 않는다.
            // isTex 는 아래 errorAnalysis 가 아니라 review 와 무관한 표시용이므로
            // 스냅샷 difficulty 를 건드리지 않고 stem 옆에 두되, 스키마에 필드를 추가했다.
            isTex: e.isTex === true,
          },
          isCorrect: false,
          stoppedAtStep:
            Number.isInteger(e.divergenceStep) && e.divergenceStep > 0
              ? e.divergenceStep
              : null,
          errorAnalysis: { errorType },
          review: {
            status: e.nextReviewAt ? "scheduled" : "completed",
            scheduledAt: e.nextReviewAt ? new Date(e.nextReviewAt) : null,
            srsStage: Number.isInteger(e.srsStage) ? e.srsStage : 0,
            wrongCount: incomingWrongCount(e),
            hasDrawing: e.hasDrawing === true,
          },
          submittedAt: e.createdAt ? new Date(e.createdAt) : new Date(),
        },
      });
      synced.push({
        clientAttemptId,
        attemptId: String(creation.attempt._id),
        ...(creation.duplicate
          ? {
              duplicate: true,
              updated: true,
              wrongCount: creation.wrongCount,
            }
          : {}),
      });
    }

    return res.json({ synced });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/wrong-notes?since=ISO8601
 * 다른 기기에서 생성되거나 복습 상태가 바뀐 오답을 내려받는다(증분).
 */
exports.getWrongNotes = async (req, res, next) => {
  try {
    // **웹 오답 목록과 같은 모집단이어야 한다.**
    // `reviewSourceAttemptId: null` 을 빼면 "복습 세션 안에서 또 틀린 시도"가
    // 부모 오답과 함께 내려가 앱에 같은 문제가 두 번 쌓인다
    // (레포 wrongNoteService 의 목록 쿼리와 같은 조건).
    const query = {
      userId: req.apiUser._id,
      isCorrect: false,
      reviewSourceAttemptId: null,
    };
    if (req.query.since) {
      const since = new Date(req.query.since);
      // submittedAt은 최초 오답 제출 시각이라 복습 결과 저장 뒤에도 변하지 않는다.
      // 증분 정본은 mongoose timestamps의 updatedAt이다.
      if (!Number.isNaN(since.getTime())) query.updatedAt = { $gt: since };
    }
    const rows = await ProblemAttempt.find(query)
      // 오래된 변경부터 페이지를 넘겨야 300건 제한에서도 중간 구간을 건너뛰지
      // 않는다. 클라이언트는 마지막 행의 updatedAt을 다음 since로 사용한다.
      .sort({ updatedAt: 1, _id: 1 })
      .limit(300)
      .populate("problemId", "externalId stem correctAnswer solutionSteps source")
      .lean();

    const entries = rows.map((r) => ({
      attemptId: String(r._id),
      clientAttemptId: r.clientAttemptId || null,
      statement: r.problemSnapshot?.stem || r.problemId?.stem || "",
      answer: r.problemId?.correctAnswer || "",
      steps: (r.problemId?.solutionSteps || []).map((s) => s.explanation),
      typeKey: r.problemId?.source?.generatorId || "unknown",
      seed: r.problemId?.source?.seed || "",
      myAnswer: r.submittedAnswer || null,
      divergenceStep: r.stoppedAtStep ?? null,
      errorType: r.errorAnalysis?.errorType || "unknown",
      srsStage: r.review?.srsStage ?? 0,
      wrongCount: r.review?.wrongCount ?? 1,
      // **상태를 그대로 보낸다.** 앱은 nextReviewAt 이 null 이면 '복습 완료'로
      // 취급하는데, 서버에서 pending(아직 한 번도 복습 안 함)도 scheduledAt 이
      // null 이다. 그대로 내려보내면 **한 번도 안 푼 오답이 완료로 둔갑**해
      // 다시는 출제되지 않는다. 앱이 세 상태를 구분할 수 있게 원값을 준다.
      reviewStatus: r.review?.status || "pending",
      nextReviewAt: r.review?.scheduledAt || null,
      createdAt: r.submittedAt,
      updatedAt: r.updatedAt || r.submittedAt,
      // 앱이 5지선다를 그대로 복원할 수 있게 함께 돌려준다
      choices: (r.problemSnapshot?.choices || []).map((c) => c.text),
      isTex: r.problemSnapshot?.isTex === true,
    }));
    return res.json({ entries });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/wrong-notes/:attemptId/review-result
 * body: { correct: Boolean, srsStage: Number, nextReviewAt?: ISO, clientEventId }
 * 앱의 SRS 가 정본이다 — 서버는 그 결과를 받아 적는다.
 */
exports.postReviewResult = async (req, res, next) => {
  try {
    const attemptId = String(req.params.attemptId || "").trim();
    let attempt = null;
    if (mongoose.isValidObjectId(attemptId)) {
      attempt = await ProblemAttempt.findOne({
        _id: attemptId,
        userId: req.apiUser._id,
      });
    }
    // UUID가 보통이지만 clientAttemptId 형식 자체를 24-hex가 아니라고 가정하지
    // 않는다. ObjectId처럼 생긴 클라이언트 키도 첫 조회 실패 뒤 안전하게 찾는다.
    if (!attempt) {
      attempt = await ProblemAttempt.findOne({
        clientAttemptId: attemptId,
        userId: req.apiUser._id,
      });
    }
    if (!attempt) {
      return res.status(404).json({ code: "NOT_FOUND", message: "해당 오답 기록이 없습니다." });
    }
    const result = await applyIpadReviewResult(attempt, req.body);
    return res.json({
      review: {
        attemptId: String(attempt._id),
        clientAttemptId: attempt.clientAttemptId || null,
        srsStage: attempt.review.srsStage,
        wrongCount: attempt.review.wrongCount,
        nextReviewAt: attempt.review.scheduledAt || null,
        status: attempt.review.status,
        duplicate: result.duplicate,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/learning/progress/reset
 * 초기화 요청 시각 이전의 진도만 지운다. 응답 유실 뒤 같은 요청을 다시 보내거나
 * 다른 기기가 초기화 직후 새로 공부해도 그 이후 진도를 함께 지우지 않는다.
 */
exports.resetLearningProgress = async (req, res, next) => {
  try {
    const result = await resetLearningProgress({
      userId: req.apiUser._id,
      clientResetId: req.body?.clientResetId,
      occurredAt: req.body?.occurredAt,
    });
    return res.json({
      reset: {
        clientResetId: result.clientResetId,
        cutoff: result.cutoff,
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/** 학생이 보호 화면 캡처 직후 직접 적은 학습 메모. 캡처 이미지 자체는 받지 않는다. */
exports.postStuckPoint = async (req, res, next) => {
  try {
    const document = await saveStuckPoint({
      userId: req.apiUser._id,
      clientStuckPointId: req.body?.id,
      text: req.body?.text,
      occurredAt: req.body?.createdAt,
    });
    return res.json({ stuckPoint: serializeStuckPoint(document) });
  } catch (error) {
    return next(error);
  }
};

exports.getStuckPoints = async (req, res, next) => {
  try {
    const documents = await listStuckPoints({ userId: req.apiUser._id });
    return res.json({ stuckPoints: documents.map(serializeStuckPoint) });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/arena
 *
 * 랭킹전(War of Masters) — 앱이 웹과 **같은 티어·같은 숫자**를 보여 주기 위한 창구.
 *
 * **여기서 점수를 계산하지 않는다.** `RankingProfile` 에 이미 저장돼 있는 값을
 * 그대로 읽어 내려보낼 뿐이다. 계산은 웹의 주간 처리(`processWeeklyMmr`)가 한다.
 *
 * 왜 이렇게 바뀌었나: 이 엔드포인트는 한때 `arenaService` 로 **자체 레이팅**을
 * 계산했다(최근 10판 가중 평균 → 1000+실력). 그 산식은 초기 MMR 도, 강등도,
 * 결석 감점도, provisional 도 없었고 티어 경계마저 달랐다(실버 1000 vs 800).
 * 결과적으로 같은 학생에게 웹과 앱이 **다른 티어**를 말했다.
 * 명세 9.3 도 "신규 기능은 레거시 rating 기준과 혼합하면 안 된다" 고 못박는다.
 *
 * 배치고사를 마치기 전이면 프로필 자체가 없다 → `locked: true`.
 * 0 점으로 내려보내면 시작도 안 한 학생을 브론즈 바닥에 세우는 셈이 된다.
 */
exports.getArena = async (req, res, next) => {
  try {
    const user = req.apiUser;
    const profile = await RankingProfile.findOne({
      userId: user._id,
      datasetOnly: { $ne: true },   // 탈퇴 후 익명 보존분은 랭킹에서 제외한다
    }).lean();

    const view = rankingProfileView(profile);

    return res.json({
      arena: view
        ? { locked: false, ...view }
        : { locked: true, mmr: null, tier: null, tierLabel: null,
            rankPoint: 0, division: null, status: "PROVISIONAL",
            overallRank: null, percentile: null, recentPerformances: [] },
      // 사다리를 앱이 하드코딩하지 않게 같이 내려준다. Infinity 는 JSON 에 담기지
      // 않으므로(null 이 된다) 최상위 티어의 상한은 null 로 명시해 보낸다.
      ladder: TIER_CONFIG.map((t) => ({
        name: t.name,
        label: t.label,
        minMmr: t.minMmr,
        maxMmr: Number.isFinite(t.maxMmr) ? t.maxMmr : null,
        maxTopPercentile: t.maxTopPercentile ?? null,
      })),
      identity: {
        displayName: getRankingDisplayName(user),
        schoolName: String(user.school?.name || "학교 미설정"),
        displayMode: "닉네임",
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/arena/leaderboard
 *
 * 순위표. 앱이 "김○○ (예시)" 같은 **지어낸 경쟁자**를 그리던 자리를 대체한다.
 *
 * 웹 순위 화면의 `rankingService.getRankingData()`를 그대로 읽고 앱 DTO로만
 * 바꾼다. MMR부터 세부 성과·도달 시각·풀이 시간까지 웹의 동점 판정 순서를
 * 공유하므로, 같은 학생 집합에 웹과 앱이 서로 다른 등수를 매기지 않는다.
 *
 * 남의 원점수·배치점수는 내려보내지 않는다. 표시 이름은 각자의 설정(닉네임/실명)을 따른다.
 */
exports.getArenaLeaderboard = async (req, res, next) => {
  try {
    const me = req.apiUser;
    const rankingData =
      await getRankingData(
        me._id
      );

    return res.json(
      arenaBoardFromRankingData(
        rankingData,
        me._id
      )
    );
  } catch (error) {
    return next(error);
  }
};
