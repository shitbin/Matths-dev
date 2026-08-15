const { randomUUID } = require("crypto");
const mongoose = require("mongoose");

const {
  ConceptProgress,
  Problem,
  ProblemAttempt,
  LearningEvent,
} = require("../models/matthsModel");

const {
  getProblemGenerator,
} = require("./problemGenerators");
const {
  getCurriculumConceptCheckGenerator,
} = require(
  "./problemGenerators/curriculumConceptCheck"
);
const {
  generateValidProblem,
} = require("./problemGenerators/utils");
const {
  formatMathTextForCourse,
} = require("./mathTextService");
const {
  buildProblemTypeGuide,
} = require("./conceptGuideService");
const {
  getCoachView,
} = require("./coachMessageService");
const {
  ATTENDANCE_SOURCE_MODELS,
  persistLearningSourceWithAttendance,
} = require(
  "./cycleAttendanceOutboxService"
);
const {
  conceptProblemEngineKey,
  isProblemTypeEnabled,
  problemTypeSelectionWeight,
} = require("./problemTypeCatalogService");
const {
  canonicalProgressTypeId,
  canonicalProgressTypeIds,
} = require("./progressTypeIdService");

const QUESTION_EXPIRES_MS = 15 * 60 * 1000;
const MAX_SESSION_QUESTIONS = 30;
const REVIEW_VARIATION_ATTEMPTS = 16;
const MAX_REVIEW_PROMPT_ENTRIES = 50;

function coachDiagnosticPlan(typeId = "") {
  const key = String(typeId).toLowerCase();
  const plan = (first, second, action) => ({
    first,
    second,
    mildAction: action,
    spicyAction: `답을 다시 찍지 말고, ${action}`,
  });

  if (/(conditional|condition)/u.test(key)) {
    return plan(
      "분모를 전체가 아니라 조건이 주어진 표본공간으로 다시 잡습니다.",
      "그 안에서 두 사건이 함께 일어나는 경우만 분자로 셉니다.",
      "조건 사건에 울타리를 치고 ‘울타리 안 전체 → 겹치는 부분’ 순서로 다시 세어 보세요.",
    );
  }
  if (/binomial/u.test(key)) {
    return plan(
      "시행 횟수·성공 확률·구하려는 성공 횟수를 각각 표시합니다.",
      "조합계수와 성공·실패 확률의 지수가 횟수와 맞는지 확인합니다.",
      "n, p, r 세 값을 문제 옆에 먼저 적고 이항확률 한 항만 다시 만드세요.",
    );
  }
  if (/normal/u.test(key)) {
    return plan(
      "원래 값을 평균 0, 표준편차 1인 z값으로 바꾼 방향을 확인합니다.",
      "구간이 평균의 왼쪽인지 오른쪽인지 표시한 뒤 표의 넓이를 고릅니다.",
      "정규곡선에 평균과 경계값을 찍고 필요한 영역만 칠한 뒤 z값을 다시 계산하세요.",
    );
  }
  if (/(confidence|sampling)/u.test(key)) {
    return plan(
      "표본통계량과 모집단 모수 중 무엇을 추정하는지 먼저 구분합니다.",
      "표준오차에서 표본크기의 제곱근이 분모에 들어갔는지 확인합니다.",
      "‘추정 대상 → 표준오차 → 신뢰계수’ 세 칸을 적고 수치를 다시 배치하세요.",
    );
  }
  if (/(variance|deviation|stat)/u.test(key)) {
    return plan(
      "각 값과 평균의 차이를 먼저 만들고 그 차이를 제곱했는지 확인합니다.",
      "편차제곱의 합을 어떤 개수로 나누는 문제인지 다시 읽습니다.",
      "평균을 가운데 적고 ‘차이 → 제곱 → 평균’ 세 단계만 다시 계산하세요.",
    );
  }
  if (/(prob|count|comb|permut)/u.test(key)) {
    return plan(
      "순서를 구분하는지, 같은 대상을 중복해서 고를 수 있는지 먼저 결정합니다.",
      "전체 경우와 조건을 만족하는 경우를 같은 기준으로 세었는지 확인합니다.",
      "작은 예를 세 칸만 직접 나열한 뒤 순서·중복 표시를 공식에 연결하세요.",
    );
  }
  if (/(log|exp)/u.test(key)) {
    return plan(
      "로그의 밑 조건과 진수가 양수라는 조건을 식 옆에 적습니다.",
      "로그를 지수식으로 바꾸거나 밑을 통일한 첫 줄의 괄호를 확인합니다.",
      "정의역을 먼저 표시하고 첫 변형 한 줄만 역으로 되돌려 검산하세요.",
    );
  }
  if (/limit/u.test(key)) {
    return plan(
      "대입만으로 정해지는지, 0/0 꼴이라 변형이 필요한지 먼저 판별합니다.",
      "약분·유리화 뒤에도 극한을 취하는 방향과 값이 유지되는지 확인합니다.",
      "대입 결과를 첫 줄에 쓰고 0/0이면 공통인수 또는 유리화 대상 하나만 표시하세요.",
    );
  }
  if (/(tangent|derivative|extremum)/u.test(key)) {
    return plan(
      "미분한 식에 어느 x값을 넣어 기울기를 구하는지 표시합니다.",
      "극값 문제라면 도함수가 0인 후보와 실제 부호 변화 여부를 구분합니다.",
      "도함수·기준 x값·부호표 중 빠진 한 칸을 채운 뒤 계산을 다시 시작하세요.",
    );
  }
  if (/(integral|area)/u.test(key)) {
    return plan(
      "적분 구간과 위·아래 함수를 먼저 표시합니다.",
      "넓이라면 함수값의 부호가 바뀌는 지점에서 구간을 나눴는지 확인합니다.",
      "수직선에 경계값을 찍고 각 구간의 ‘위 함수 − 아래 함수’를 한 줄씩 적으세요.",
    );
  }
  if (/(circle|distance|vector|geo)/u.test(key)) {
    return plan(
      "그림에 기준점·방향·거리의 대상을 직접 표시합니다.",
      "좌표나 벡터를 식에 옮길 때 시작점과 끝점의 순서가 바뀌지 않았는지 확인합니다.",
      "그림에서 아는 값은 파란 밑줄, 구할 값은 노란 상자로 표시한 뒤 식을 다시 세우세요.",
    );
  }
  if (/seq/u.test(key)) {
    return plan(
      "공차·공비 또는 반복되는 한 주기의 길이를 먼저 확정합니다.",
      "완전한 묶음의 합과 마지막에 남는 항을 분리했는지 확인합니다.",
      "항 번호를 세 칸만 직접 써서 규칙을 확인한 뒤 ‘묶음 + 나머지’로 다시 계산하세요.",
    );
  }
  if (/(quad|disc|vieta)/u.test(key)) {
    return plan(
      "이차식의 모든 항을 한쪽으로 모아 계수 a, b, c를 다시 읽습니다.",
      "판별식 또는 근과 계수 공식에 넣을 때 b의 부호와 제곱을 확인합니다.",
      "a, b, c 아래에 값을 적고 b만 괄호로 묶어 한 줄을 다시 계산하세요.",
    );
  }
  return plan(
    "발문에서 주어진 조건과 구해야 하는 값을 서로 다른 표시로 나눕니다.",
    "첫 변형에서 괄호를 푸는 순서와 음수 부호가 유지됐는지 확인합니다.",
    "모범 풀이 1단계와 내 첫 식만 나란히 놓고 달라진 기호 하나를 찾으세요.",
  );
}

function coachSubmissionShape(submittedAnswer, inputMode = "") {
  if (/choice/u.test(String(inputMode))) return "선택한 보기가";
  const input = String(submittedAnswer || "").trim();
  if (input.includes("=")) return "등식 형태로 쓴 답이";
  if (/[\/⁄]/u.test(input)) return "분수 형태로 쓴 답이";
  if (/[.,]/u.test(input)) return "소수 형태로 쓴 답이";
  if (/[-−]/u.test(input)) return "음수 부호를 포함한 답이";
  if (/\p{L}/u.test(input)) return "문자식을 포함한 답이";
  return "제출한 답이";
}

function buildPracticeCoachGuidance({
  mode,
  situation,
  seed,
  typeId,
  typeLabel,
  submittedAnswer,
  inputMode,
}) {
  const base = getCoachView({ mode, situation, seed });
  if (base.mode === "silent") {
    return { ...base, message: "", observation: "", reason: "", nextAction: "" };
  }

  const label = String(typeLabel || "이 문제 유형");
  if (situation === "correct") {
    return {
      ...base,
      observation: `관찰 · ${label}에서 최종 답이 성립했습니다.`,
      reason: "근거 · 답만 맞춘 것으로 끝내지 않고 첫 변형의 조건과 부호를 확인하면 풀이를 재현할 수 있습니다.",
      nextAction: "다음 행동 · 같은 풀이의 첫 줄에 핵심 조건 하나를 표시한 채 다음 문제로 넘어가세요.",
    };
  }
  if (situation === "incorrect") {
    const diagnostic = coachDiagnosticPlan(typeId);
    return {
      ...base,
      observation: `관찰 · ${label}에서 ${coachSubmissionShape(submittedAnswer, inputMode)} 정답 조건을 만족하지 않았습니다.`,
      reason: `점검 순서 · ① ${diagnostic.first} ② ${diagnostic.second}`,
      nextAction: base.mode === "mild"
        ? `다음 행동 · ${diagnostic.mildAction}`
        : `다음 행동 · ${diagnostic.spicyAction}`,
    };
  }
  const diagnostic = coachDiagnosticPlan(typeId);
  return {
    ...base,
    observation: "관찰 · 아직 답이 입력되지 않았습니다.",
    reason: `먼저 볼 곳 · ${diagnostic.first}`,
    nextAction: `첫 행동 · ${diagnostic.mildAction}`,
  };
}

function generateReviewVariation({
  problemType,
  courseId,
  previousProblem,
}) {
  const fingerprint = (problem) =>
    JSON.stringify({
      prompt: formatMathTextForCourse(
        courseId,
        problem?.prompt || ""
      ),
      choices: (problem?.choices || []).map(
        (choice) =>
          formatMathTextForCourse(
            courseId,
            choice?.text || ""
          )
      ),
    });
  const normalizedPrevious =
    fingerprint(previousProblem);
  let generated = null;

  for (
    let attempt = 0;
    attempt < REVIEW_VARIATION_ATTEMPTS;
    attempt += 1
  ) {
    generated =
      generateValidProblem(problemType);

    if (
      fingerprint(generated) !==
      normalizedPrevious
    ) {
      return generated;
    }
  }

  /*
   * 정의 판별처럼 숫자가 없는 고정 문항은 같은 유형 자체가
   * 하나의 문장일 수 있다. 이 경우에도 복습을 막지는 않는다.
   */
  return generated;
}

function reviewPromptKey(reviewAttemptId) {
  return String(reviewAttemptId || "");
}

function getPreviousReviewProblem({
  req,
  reviewAttemptId,
  fallbackProblem,
}) {
  const key = reviewPromptKey(reviewAttemptId);

  return (
    req.session.reviewPreviousProblems?.[key]
      ?.problem ||
    fallbackProblem ||
    { prompt: "", choices: [] }
  );
}

function rememberReviewProblem({
  req,
  reviewAttemptId,
  problem,
}) {
  const key = reviewPromptKey(reviewAttemptId);
  if (!key || !problem?.prompt) return;

  req.session.reviewPreviousProblems ||= {};
  req.session.reviewPreviousProblems[key] = {
    problem: {
      prompt: problem.prompt,
      choices: problem.choices || [],
    },
    updatedAt: Date.now(),
  };

  const entries = Object.entries(
    req.session.reviewPreviousProblems
  );

  if (entries.length <= MAX_REVIEW_PROMPT_ENTRIES) {
    return;
  }

  entries
    .sort(
      ([, left], [, right]) =>
        Number(left?.updatedAt || 0) -
        Number(right?.updatedAt || 0)
    )
    .slice(
      0,
      entries.length - MAX_REVIEW_PROMPT_ENTRIES
    )
    .forEach(([staleKey]) => {
      delete req.session.reviewPreviousProblems[
        staleKey
      ];
    });
}

function clearReviewProblem({
  req,
  reviewAttemptId,
}) {
  const key = reviewPromptKey(reviewAttemptId);

  if (
    key &&
    req.session.reviewPreviousProblems
  ) {
    delete req.session.reviewPreviousProblems[key];
  }
}

function masteryView(progress) {
  const gate = progress.masteryGate || {};
  const correctTypeIds = canonicalProgressTypeIds(
    gate.correctTypeIds
  );
  const required = gate.requiredDistinctTypes || 5;

  return {
    correctTypeIds,
    required,
    unlocked: correctTypeIds.length >= required,
    userCompleted: Boolean(gate.userCompleted),
  };
}

function reviewView(attempt) {
  if (!attempt) return null;

  const status =
    attempt.review?.status || "pending";

  return {
    attemptId: String(attempt._id),
    typeId:
      attempt.problemSnapshot?.typeId || null,
    status,
    completed: status === "completed",
    scheduled:
      status === "scheduled",
    scheduledAt:
      attempt.review?.scheduledAt ||
      null,
    reviewedAt:
      attempt.review?.reviewedAt || null,
  };
}

function practiceAttemptResponse({
  attempt,
  correct,
  solution,
  activityDurationMs,
  mastery,
  review,
  coachFeedback,
}) {
  return {
    // 인증된 제출자에게 방금 생성된 자기 기록의 식별자만 돌려준다.
    // 손글씨 원본이나 분석 결과는 이 응답과 서버 저장소에 싣지 않는다.
    attemptId: String(attempt._id),
    correct,
    solution,
    activityDurationMs,
    mastery,
    review,
    coachFeedback,
  };
}

function nextReviewDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function requireReviewAttempt({
  userId,
  reviewAttemptId,
  courseId,
  unitId,
  conceptId,
}) {
  if (
    !reviewAttemptId ||
    !mongoose.isValidObjectId(reviewAttemptId)
  ) {
    const error = new Error(
      "복습할 오답 기록을 찾을 수 없습니다."
    );

    error.status = 404;
    throw error;
  }

  const attempt = await ProblemAttempt.findOne({
    _id: reviewAttemptId,
    userId,
    isCorrect: false,
    reviewSourceAttemptId: null,
    courseId,
    unitId,
    conceptId,
  });

  if (!attempt) {
    const error = new Error(
      "복습할 오답 기록을 찾을 수 없습니다."
    );

    error.status = 404;
    throw error;
  }

  return attempt;
}

async function getReviewContext({
  userId,
  reviewAttemptId,
  courseId,
  unitId,
  conceptId,
}) {
  const attempt = await requireReviewAttempt({
    userId,
    reviewAttemptId,
    courseId,
    unitId,
    conceptId,
  });

  return reviewView(attempt);
}

function requireGenerator({
  courseId,
  unitId,
  conceptId,
}) {
  const generator =
    getProblemGenerator({
      courseId,
      unitId,
      conceptId,
    }) ||
    getCurriculumConceptCheckGenerator({
      courseId,
      unitId,
      conceptId,
    });

  if (!generator) {
    const error = new Error(
      "이 개념의 문제 유형이 아직 등록되지 않았습니다."
    );

    error.status = 404;
    throw error;
  }

  if (!generator.problemTypes?.length) {
    const error = new Error(
      "등록된 문제 유형이 없습니다."
    );

    error.status = 500;
    throw error;
  }

  return generator;
}

function stableReviewIndex(
  reviewAttempt,
  length
) {
  if (length <= 1) return 0;

  const source = String(
    reviewAttempt?._id || ""
  );
  const hash = [...source].reduce(
    (total, character) =>
      (
        total * 31 +
        character.charCodeAt(0)
      ) >>> 0,
    0
  );

  return hash % length;
}

function enabledConceptProblemTypes({ generator, courseId, unitId, conceptId }) {
  const enabled = (generator.problemTypes || []).filter((problemType) =>
    isProblemTypeEnabled(
      "CONCEPT_PRACTICE",
      conceptProblemEngineKey({
        courseId,
        unitId,
        conceptId,
        typeId: problemType.id,
      })
    )
  );
  if (!enabled.length) {
    const error = new Error(
      "자동 검산을 통과해 사용 중인 문제 유형이 없습니다. 관리자에게 문의해주세요."
    );
    error.status = 503;
    throw error;
  }
  return enabled;
}

function weightedProblemType({ problemTypes, courseId, unitId, conceptId }) {
  const weighted = problemTypes.map((problemType) => ({
    problemType,
    weight: problemTypeSelectionWeight(
      "CONCEPT_PRACTICE",
      conceptProblemEngineKey({
        courseId,
        unitId,
        conceptId,
        typeId: problemType.id,
      })
    ),
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.problemType;
  }
  return weighted.at(-1).problemType;
}

function fallbackReviewProblemType({
  generator,
  reviewAttempt,
}) {
  const targetDifficulty = Math.max(
    1,
    Number(
      reviewAttempt
        .problemSnapshot
        ?.difficulty
    ) || 1
  );
  const distances =
    generator.problemTypes.map(
      (problemType) => ({
        problemType,
        distance: Math.abs(
          (
            Number(
              problemType.difficulty
            ) || 1
          ) - targetDifficulty
        ),
      })
    );
  const closestDistance =
    Math.min(
      ...distances.map(
        (item) => item.distance
      )
    );
  const candidates = distances
    .filter(
      (item) =>
        item.distance ===
        closestDistance
    )
    .map(
      (item) =>
        item.problemType
    );

  return candidates[
    stableReviewIndex(
      reviewAttempt,
      candidates.length
    )
  ];
}

async function findOrCreateProgress({
  userId,
  courseId,
  unitId,
  conceptId,
  requiredDistinctTypes,
}) {
  let progress = await ConceptProgress.findOne({
    userId,
    curriculumId: "kr-2022",
    courseId,
    unitId,
    conceptId,
  });

  if (!progress) {
    progress = new ConceptProgress({
      userId,
      curriculumId: "kr-2022",
      courseId,
      unitId,
      conceptId,
      masteryGate: {
        requiredDistinctTypes,
        correctTypeIds: [],
      },
    });
  } else {
    progress.masteryGate.requiredDistinctTypes =
      requiredDistinctTypes;
  }

  await progress.save();

  return progress;
}

async function ensureProblemTemplate({
  courseId,
  unitId,
  conceptId,
  problemType,
  generated,
}) {
  const externalId = [
    "generated",
    courseId,
    conceptId,
    problemType.id,
  ].join(":");

  return Problem.findOneAndUpdate(
    { externalId },
    {
      $set: {
        curriculumId: "kr-2022",
        courseId,
        unitId,
        conceptIds: [conceptId],
        primaryConceptId: conceptId,
        source: {
          type: "generated",
        },
        questionType:
          generated.inputMode ===
          "multiple-choice"
            ? "multiple-choice"
            : "short-answer",
        stem: `${problemType.label} 숫자 변형 문제`,
        correctAnswer: "__generated_on_request__",
        difficulty: problemType.difficulty || 1,
        estimatedTimeSeconds: 120,
        score: 1,
        tags: [
          "generated",
          conceptId,
          problemType.id,
        ],
        isPublished: true,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    }
  );
}

function rememberQuestion(req, instanceId, question) {
  req.session.practiceQuestions ||= {};
  req.session.practiceQuestions[instanceId] = question;

  const storedIds = Object.keys(
    req.session.practiceQuestions
  );

  if (storedIds.length > MAX_SESSION_QUESTIONS) {
    storedIds
      .slice(
        0,
        storedIds.length - MAX_SESSION_QUESTIONS
      )
      .forEach((id) => {
        delete req.session.practiceQuestions[id];
      });
  }
}

async function recordLearningEvent(event) {
  try {
    await LearningEvent.create({
      clientEventId: randomUUID(),
      occurredAt: new Date(),
      ...event,
    });
  } catch (error) {
    console.error(
      "문제풀이 LearningEvent 저장 실패:",
      error
    );
  }
}

async function createNextProblem({
  req,
  userId,
  courseId,
  unitId,
  conceptId,
  reviewAttemptId,
}) {
  const generator = requireGenerator({
    courseId,
    unitId,
    conceptId,
  });
  const enabledTypes = enabledConceptProblemTypes({
    generator,
    courseId,
    unitId,
    conceptId,
  });

  const requiredDistinctTypes =
    generator.requiredDistinctTypes || 5;

  const reviewAttempt = reviewAttemptId
    ? await requireReviewAttempt({
        userId,
        reviewAttemptId,
        courseId,
        unitId,
        conceptId,
      })
    : null;

  const progress = await findOrCreateProgress({
    userId,
    courseId,
    unitId,
    conceptId,
    requiredDistinctTypes,
  });

  let problemType = null;

  if (reviewAttempt) {
    const reviewTypeId =
      reviewAttempt.problemSnapshot?.typeId;

    problemType = enabledTypes.find(
      (candidate) =>
        candidate.id === reviewTypeId
    );

    if (!problemType) {
      problemType =
        fallbackReviewProblemType({
          generator: {
            ...generator,
            problemTypes: enabledTypes,
          },
          reviewAttempt,
        });
    }
  } else {
    const completedTypes = new Set(
      canonicalProgressTypeIds(
        progress.masteryGate?.correctTypeIds
      )
    );

    const unseenTypes = enabledTypes.filter(
      (candidate) =>
        !completedTypes.has(candidate.id)
    );

    const candidates = unseenTypes.length
      ? unseenTypes
      : enabledTypes;

    problemType = weightedProblemType({
      problemTypes: candidates,
      courseId,
      unitId,
      conceptId,
    });
  }

  const generated = reviewAttempt
    ? generateReviewVariation({
        problemType,
        courseId,
        previousProblem: getPreviousReviewProblem({
          req,
          reviewAttemptId: reviewAttempt._id,
          fallbackProblem: {
            prompt:
              reviewAttempt.problemSnapshot
                ?.stem || "",
            choices:
              reviewAttempt.problemSnapshot
                ?.choices || [],
          },
        }),
      })
    : generateValidProblem(problemType);

  if (reviewAttempt) {
    rememberReviewProblem({
      req,
      reviewAttemptId: reviewAttempt._id,
      problem: generated,
    });
  }

  const problemTemplate =
    await ensureProblemTemplate({
      courseId,
      unitId,
      conceptId,
      problemType,
      generated,
    });

  const instanceId = randomUUID();

  rememberQuestion(req, instanceId, {
    userId: String(userId),
    problemId: String(problemTemplate._id),
    courseId,
    unitId,
    conceptId,
    typeId: problemType.id,
    typeLabel: problemType.label,
    difficulty: problemType.difficulty || 1,
    prompt: generated.prompt,
    inputMode: generated.inputMode,
    choices: generated.choices || [],
    answer: generated.answer,
    solution: generated.solution,
    hintText: generated.hintText || "",
    visualization: generated.visualization || null,
    reviewAttemptId: reviewAttempt
      ? String(reviewAttempt._id)
      : null,
    createdAt: Date.now(),
  });

  await recordLearningEvent({
    userId,
    sessionId: req.sessionID,
    eventType: "problem-opened",
    curriculumId: "kr-2022",
    courseId,
    unitId,
    conceptId,
    problemId: problemTemplate._id,
    metadata: {
      instanceId,
      problemTypeId: problemType.id,
      reviewAttemptId: reviewAttempt
        ? String(reviewAttempt._id)
        : null,
    },
  });

  if (reviewAttempt) {
    await recordLearningEvent({
      userId,
      sessionId: req.sessionID,
      eventType: "review-started",
      curriculumId: "kr-2022",
      courseId,
      unitId,
      conceptId,
      problemId: problemTemplate._id,
      attemptId: reviewAttempt._id,
      metadata: {
        instanceId,
        problemTypeId: problemType.id,
      },
    });
  }

  return {
    problem: {
      instanceId,
      typeId: problemType.id,
      typeLabel: problemType.label,
      prompt: generated.prompt,
      inputMode: generated.inputMode,
      choices: generated.choices || [],
      hintText: generated.hintText || "",
      visualization: generated.visualization || null,
      conceptGuide:
        buildProblemTypeGuide({
          courseId,
          problemType,
          problem: generated,
          order:
            generator.problemTypes.findIndex(
              (candidate) =>
                candidate.id ===
                problemType.id
            ) + 1,
        }),
      coachPrompt:
        buildPracticeCoachGuidance({
          mode:
            req.session?.user
              ?.preferences
              ?.coachMode,
          situation:
            "unanswered",
          seed: instanceId,
          typeId: problemType.id,
          typeLabel: problemType.label,
          inputMode: generated.inputMode,
        }),
    },
    mastery: masteryView(progress),
    review: reviewView(reviewAttempt),
  };
}

async function submitProblem({
  req,
  userId,
  instanceId,
  submittedAnswer,
}) {
  const stored =
    req.session.practiceQuestions?.[instanceId];

  if (!stored || stored.userId !== String(userId)) {
    const error = new Error(
      "문제가 만료되었거나 이미 제출되었습니다."
    );

    error.status = 400;
    throw error;
  }

  delete req.session.practiceQuestions[instanceId];

  if (
    Date.now() - stored.createdAt >
    QUESTION_EXPIRES_MS
  ) {
    const error = new Error(
      "문제 풀이 시간이 만료되었습니다."
    );

    error.status = 400;
    throw error;
  }

  if (
    submittedAnswer === undefined ||
    submittedAnswer === null ||
    String(submittedAnswer).trim() === ""
  ) {
    const error = new Error("정답을 입력해주세요.");
    error.status = 400;
    throw error;
  }

  const generator = requireGenerator({
    courseId: stored.courseId,
    unitId: stored.unitId,
    conceptId: stored.conceptId,
  });

  const correct = generator.isCorrectAnswer(
    stored.answer,
    submittedAnswer
  );

  const responseTimeMs = Math.max(
    0,
    Date.now() - stored.createdAt
  );

  const progress = await findOrCreateProgress({
    userId,
    courseId: stored.courseId,
    unitId: stored.unitId,
    conceptId: stored.conceptId,
    requiredDistinctTypes:
      generator.requiredDistinctTypes || 5,
  });

  progress.signals.totalAttempts += 1;
  progress.signals.totalResponseTimeMs +=
    responseTimeMs;

  if (correct) {
    progress.signals.correctAttempts += 1;

    const correctTypes = new Set(
      canonicalProgressTypeIds(
        progress.masteryGate?.correctTypeIds
      )
    );

    correctTypes.add(
      canonicalProgressTypeId(stored.typeId)
    );

    progress.masteryGate.correctTypeIds = [
      ...correctTypes,
    ];
  }

  progress.lastStudiedAt = new Date();
  await progress.save();

  const problemId = stored.problemId;

  const attemptNumber =
    (await ProblemAttempt.countDocuments({
      userId,
      problemId,
    })) + 1;

  const submittedAt =
    new Date();
  const attempt =
    new ProblemAttempt({
      userId,
      problemId,
      reviewSourceAttemptId:
        stored.reviewAttemptId ||
        null,
      curriculumId:
        "kr-2022",
      courseId:
        stored.courseId,
      unitId:
        stored.unitId,
      conceptId:
        stored.conceptId,
      attemptNumber,
      submittedAnswer,
      problemSnapshot: {
        typeId:
          stored.typeId,
        stem: stored.prompt,
        choices:
          stored.choices,
        solution:
          stored.solution,
        difficulty:
          stored.difficulty,
      },
      isCorrect: correct,
      score:
        correct ? 1 : 0,
      maxScore: 1,
      responseTimeMs,
      errorAnalysis: correct
        ? undefined
        : {
            errorType:
              "unknown",
            relatedConceptId:
              stored.conceptId,
          },
      review: {
        status:
          stored.reviewAttemptId
            ? "not-required"
            : correct
              ? "not-required"
              : "pending",
      },
      submittedAt,
    });
  await persistLearningSourceWithAttendance({
    userId,
    sourceModel:
      ATTENDANCE_SOURCE_MODELS
        .PROBLEM_ATTEMPT,
    sourceDocumentId:
      attempt._id,
    occurredAt:
      submittedAt,
    persistSource: () =>
      attempt.save(),
  });

  await recordLearningEvent({
    userId,
    sessionId: req.sessionID,
    eventType: correct
      ? "problem-correct"
      : "problem-wrong",
    curriculumId: "kr-2022",
    courseId: stored.courseId,
    unitId: stored.unitId,
    conceptId: stored.conceptId,
    problemId,
    attemptId: attempt._id,
    durationMs: responseTimeMs,
    correct,
    metadata: {
      instanceId,
      problemTypeId: stored.typeId,
      reviewAttemptId:
        stored.reviewAttemptId || null,
    },
  });

  let review = null;

  if (stored.reviewAttemptId) {
    const reviewFilter = {
      _id: stored.reviewAttemptId,
      userId,
      isCorrect: false,
      courseId: stored.courseId,
      unitId: stored.unitId,
      conceptId: stored.conceptId,
    };

    let originalAttempt = null;

    if (correct) {
      originalAttempt =
        await ProblemAttempt.findOneAndUpdate(
          reviewFilter,
          {
            $set: {
              "review.status": "completed",
              "review.reviewedAt": new Date(),
              "review.correctedAfterReview": true,
            },
            $unset: {
              "review.scheduledAt": 1,
            },
          },
          {
            returnDocument: "after",
          }
        );
    } else {
      originalAttempt =
        await ProblemAttempt.findOneAndUpdate(
          {
            ...reviewFilter,
            "review.status": {
              $ne: "completed",
            },
          },
          {
            $set: {
              "review.status": "scheduled",
              "review.scheduledAt":
                nextReviewDate(),
              "review.correctedAfterReview": false,
            },
            $unset: {
              "review.reviewedAt": 1,
            },
          },
          {
            returnDocument: "after",
          }
        );

      if (!originalAttempt) {
        originalAttempt =
          await ProblemAttempt.findOne(
            reviewFilter
          );
      }
    }

    review = reviewView(originalAttempt);

    if (correct && originalAttempt) {
      clearReviewProblem({
        req,
        reviewAttemptId:
          stored.reviewAttemptId,
      });

      await recordLearningEvent({
        userId,
        sessionId: req.sessionID,
        eventType: "review-completed",
        curriculumId: "kr-2022",
        courseId: stored.courseId,
        unitId: stored.unitId,
        conceptId: stored.conceptId,
        problemId,
        attemptId: originalAttempt._id,
        correct: true,
        metadata: {
          retryAttemptId: String(attempt._id),
          problemTypeId: stored.typeId,
        },
      });
    }
  }

  return practiceAttemptResponse({
    attempt,
    correct,
    solution: stored.solution,
    activityDurationMs:
      responseTimeMs,
    mastery: masteryView(progress),
    review,
    coachFeedback:
      buildPracticeCoachGuidance({
        mode:
          req.session?.user
            ?.preferences
            ?.coachMode,
        situation: correct
          ? "correct"
          : "incorrect",
        seed: instanceId,
        typeId: stored.typeId,
        typeLabel: stored.typeLabel,
        submittedAnswer,
        inputMode: stored.inputMode,
      }),
  });
}

async function changeCompletion({
  userId,
  courseId,
  unitId,
  conceptId,
  completed,
  sessionId,
}) {
  const generator = requireGenerator({
    courseId,
    unitId,
    conceptId,
  });

  const progress = await findOrCreateProgress({
    userId,
    courseId,
    unitId,
    conceptId,
    requiredDistinctTypes:
      generator.requiredDistinctTypes || 5,
  });

  const gate = progress.masteryGate;
  gate.correctTypeIds = canonicalProgressTypeIds(
    gate.correctTypeIds
  );
  const required = gate.requiredDistinctTypes || 5;
  const unlocked =
    gate.correctTypeIds.length >= required;

  if (completed && !unlocked) {
    const error = new Error(
      `서로 다른 유형 ${required}개를 먼저 맞혀야 합니다.`
    );

    error.status = 403;
    throw error;
  }

  gate.userCompleted = Boolean(completed);
  gate.completedAt = completed ? new Date() : null;
  progress.lastStudiedAt = new Date();

  await progress.save();

  await recordLearningEvent({
    userId,
    sessionId:
      sessionId || `server-${randomUUID()}`,
    eventType: completed
      ? "concept-completed"
      : "concept-closed",
    curriculumId: "kr-2022",
    courseId,
    unitId,
    conceptId,
    metadata: {
      userCompleted: Boolean(completed),
      correctTypeCount:
        gate.correctTypeIds.length,
    },
  });

  return masteryView(progress);
}

module.exports = {
  createNextProblem,
  submitProblem,
  changeCompletion,
  getReviewContext,
  generateReviewVariation,
  getPreviousReviewProblem,
  rememberReviewProblem,
  clearReviewProblem,
  practiceAttemptResponse,
  buildPracticeCoachGuidance,
};
