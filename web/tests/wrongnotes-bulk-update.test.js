// 실행: node tests/wrongnotes-bulk-update.test.js
//
// DB 없이 postWrongNotesBulk를 실제 실행한다. 특히 실기에서 관찰된
// "같은 typeKey + seed, 서로 다른 지문" 큐가 하나의 Problem으로 합쳐져
// userId/problemId/attemptNumber 유니크 인덱스와 충돌하던 회귀를 재현한다.
const path = require("path");
const REPO = path.resolve(__dirname, "..");
const modelPath = require.resolve(path.join(REPO, "models/matthsModel.js"));

const problems = [];
const attempts = [];
let nextProblemId = 1;
let nextAttemptId = 1;
let injectConcurrentSameClientOnce = false;

function same(left, right) {
  return String(left) === String(right);
}

function duplicateKey(keyPattern) {
  const error = new Error("E11000 duplicate key error");
  error.code = 11000;
  error.keyPattern = keyPattern;
  return error;
}

function attemptConflicts(candidate, current = null) {
  return attempts.find((row) => {
    if (row === current) return false;
    const sameUser = same(row.userId, candidate.userId);
    return (
      (sameUser &&
        row.clientAttemptId === candidate.clientAttemptId) ||
      (sameUser &&
        same(row.problemId, candidate.problemId) &&
        row.attemptNumber === candidate.attemptNumber)
    );
  });
}

function makeAttempt(init) {
  const doc = {
    _id: init._id || `attempt-${nextAttemptId++}`,
    attemptNumber: 1,
    submittedAnswer: "3",
    review: {
      status: "scheduled",
      scheduledAt: new Date("2026-07-30T00:00:00Z"),
      reviewedAt: null,
      correctedAfterReview: false,
      srsStage: 1,
      wrongCount: 1,
      hasDrawing: false,
      ...(init.review || {}),
    },
    ...init,
  };
  doc.asyncSave = async function asyncSave() {
    if (attemptConflicts(this, this)) {
      throw duplicateKey({ userId: 1, problemId: 1, attemptNumber: 1 });
    }
    return this;
  };
  doc.save = doc.asyncSave;
  return doc;
}

function matchingAttempts(query) {
  return attempts.filter((row) =>
    Object.entries(query).every(([key, value]) => same(row[key], value))
  );
}

function findOneQuery(query) {
  let sort = null;
  const queryObject = {
    sort(value) {
      sort = value;
      return this;
    },
    select() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve()
        .then(() => {
          const rows = matchingAttempts(query);
          if (sort?.attemptNumber) {
            rows.sort(
              (left, right) =>
                (right.attemptNumber - left.attemptNumber) *
                Math.sign(sort.attemptNumber)
            );
          }
          return rows[0] || null;
        })
        .then(resolve, reject);
    },
  };
  return queryObject;
}

const fakeModels = {
  ConceptProgress: {},
  LearningEvent: {},
  Problem: {
    findOneAndUpdate: async (filter, update) => {
      let problem = problems.find(
        (row) => row.externalId === filter.externalId
      );
      if (!problem) {
        problem = {
          _id: `problem-${nextProblemId++}`,
          ...update.$setOnInsert,
        };
        problems.push(problem);
      }
      return problem;
    },
  },
  ProblemAttempt: {
    findOne: findOneQuery,
    create: async (data) => {
      if (injectConcurrentSameClientOnce) {
        injectConcurrentSameClientOnce = false;
        attempts.push(makeAttempt(data));
        throw duplicateKey({ userId: 1, clientAttemptId: 1 });
      }
      const conflict = attemptConflicts(data);
      if (conflict) {
        const clientCollision =
          conflict.clientAttemptId === data.clientAttemptId;
        throw duplicateKey(
          clientCollision
            ? { userId: 1, clientAttemptId: 1 }
            : { userId: 1, problemId: 1, attemptNumber: 1 }
        );
      }
      const doc = makeAttempt(data);
      attempts.push(doc);
      return doc;
    },
  },
};

require.cache[modelPath] = {
  id: modelPath,
  filename: modelPath,
  loaded: true,
  exports: fakeModels,
};

const ctrl = require(path.join(REPO, "controllers/ipadSyncController.js"));

function reset() {
  problems.length = 0;
  attempts.length = 0;
  nextProblemId = 1;
  nextAttemptId = 1;
  injectConcurrentSameClientOnce = false;
}

function fakeRes() {
  const response = {};
  response.json = (body) => {
    response.body = body;
    return response;
  };
  response.status = (code) => {
    response.code = code;
    return response;
  };
  return response;
}

async function post(entries) {
  const response = fakeRes();
  let forwardedError = null;
  await ctrl.postWrongNotesBulk(
    { apiUser: { _id: "u1" }, body: { entries } },
    response,
    (error) => {
      forwardedError = error;
    }
  );
  if (forwardedError) throw forwardedError;
  return response.body;
}

const entry = (overrides = {}) => ({
  clientAttemptId: "c-1",
  typeKey: "quadratic-vertex",
  seed: "42",
  statement: "y = x^2 - 4x + 1 의 꼭짓점을 구하시오.",
  answer: "(2, -3)",
  myAnswer: "(2, 3)",
  wrongCount: 1,
  srsStage: 0,
  nextReviewAt: "2026-07-30T00:00:00.000Z",
  ...overrides,
});

(async () => {
  const failures = [];
  const ok = (condition, label, actual) => {
    if (condition) {
      console.log(`  ✓ ${label}`);
    } else {
      failures.push(label);
      console.log(`  ✗ ${label} — 실제: ${JSON.stringify(actual)}`);
    }
  };

  reset();
  let response = await post([entry()]);
  console.log("[1] 첫 제출");
  ok(response.synced.length === 1, "새 오답으로 기록", response);
  ok(attempts.length === 1, "시도 문서 1건", attempts.length);
  ok(attempts[0].attemptNumber === 1, "첫 시도 ordinal = 1", attempts[0]);
  ok(
    problems[0].externalId.startsWith("ipad:v2:quadratic-vertex:42:"),
    "문항 내용 fingerprint identity 사용",
    problems[0].externalId
  );

  attempts[0].review.reviewedAt = new Date("2026-07-28T00:00:00Z");
  attempts[0].review.hasDrawing = true;
  response = await post([
    entry({
      wrongCount: 3,
      srsStage: 2,
      myAnswer: "(2, 5)",
      nextReviewAt: "2026-08-05T00:00:00.000Z",
    }),
  ]);
  console.log("[2] 같은 clientAttemptId 재오답");
  const updated = response.synced[0];
  ok(updated.duplicate === true && updated.updated === true, "중복 갱신 응답", updated);
  ok(attempts[0].review.wrongCount === 3, "wrongCount = 3", attempts[0].review);
  ok(attempts[0].review.srsStage === 2, "srsStage 반영", attempts[0].review);
  ok(
    attempts[0].attemptNumber === 1,
    "attemptNumber는 복습 횟수와 분리된 불변 ordinal",
    attempts[0].attemptNumber
  );
  ok(attempts[0].submittedAnswer === "(2, 5)", "마지막 오답 답안 갱신", attempts[0]);
  ok(attempts[0].review.hasDrawing === true, "hasDrawing 보존", attempts[0].review);
  ok(
    attempts[0].review.reviewedAt instanceof Date,
    "reviewedAt 보존",
    attempts[0].review
  );

  await post([entry({ wrongCount: 1, srsStage: 0 })]);
  console.log("[3] 지각 도착한 옛 값");
  ok(attempts[0].review.wrongCount === 3, "wrongCount 단조 유지", attempts[0].review);

  // 실기 데이터 그대로의 충돌 모양:
  // typeKey와 seed는 같지만 실제 지문/정답이 다른 두 생성 문항이다.
  reset();
  problems.push({
    _id: "legacy-problem",
    externalId: "ipad:alg-log-equation:1785312996",
    stem: "방정식 log₅(x − 1) = 4 를 만족하는 x 의 값을 구하시오.",
  });
  attempts.push(
    makeAttempt({
      _id: "legacy-attempt",
      userId: "u1",
      problemId: "legacy-problem",
      clientAttemptId: "8F346BB5-67BD-484A-AFA0-C85051028649",
      attemptNumber: 1,
    })
  );
  const queued = entry({
    clientAttemptId: "120E7D9E-16FC-4A4C-9542-00C50B3E3461",
    typeKey: "alg-log-equation",
    seed: "1785312996",
    statement: "방정식 log₃(x − 2) = 4 를 만족하는 x 의 값을 구하시오.",
    answer: "83",
  });
  response = await post([queued]);
  console.log("[4] 실기 회귀 — 같은 typeKey+seed, 다른 문항");
  ok(response.synced.length === 1, "E11000 없이 큐 항목 수락", response);
  ok(attempts.length === 2, "기존 데이터 삭제 없이 새 시도 추가", attempts.length);
  ok(
    attempts[1].problemId !== "legacy-problem",
    "서로 다른 지문은 서로 다른 Problem",
    attempts[1]
  );
  ok(attempts[1].attemptNumber === 1, "새 Problem의 첫 ordinal", attempts[1]);

  const problemCountBeforeRetry = problems.length;
  response = await post([queued]);
  console.log("[5] 같은 큐 재시도");
  ok(attempts.length === 2, "시도 중복 없음", attempts.length);
  ok(problems.length === problemCountBeforeRetry, "사용되지 않는 Problem 생성 없음", problems.length);
  ok(response.synced[0].duplicate === true, "기존 시도로 멱등 수렴", response);

  response = await post([
    { ...queued, clientAttemptId: "same-problem-new-attempt" },
  ]);
  console.log("[6] 같은 실제 문항의 새 시도");
  ok(attempts.length === 3, "새 시도 문서 추가", attempts.length);
  ok(
    attempts[2].problemId === attempts[1].problemId,
    "같은 내용이면 Problem 재사용",
    attempts[2]
  );
  ok(attempts[2].attemptNumber === 2, "다음 ordinal 자동 할당", attempts[2]);

  reset();
  injectConcurrentSameClientOnce = true;
  response = await post([entry({ clientAttemptId: "concurrent-client" })]);
  console.log("[7] 동시 중복 요청");
  ok(attempts.length === 1, "동시 삽입도 한 건으로 수렴", attempts.length);
  ok(response.synced[0].duplicate === true, "E11000을 멱등 성공으로 회수", response);

  console.log(failures.length ? `\n실패 ${failures.length}건` : "\n전부 통과");
  process.exit(failures.length ? 1 : 0);
})();
