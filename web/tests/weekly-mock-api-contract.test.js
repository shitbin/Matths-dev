"use strict";

const assert = require("node:assert/strict");
const {
  createIpadWeeklyMockController,
} = require("../controllers/ipadWeeklyMockController");
const apiRouter = require("../routes/api-routes");

const calls = [];
const attemptData = {
  serverNow: new Date("2026-08-11T09:00:00.000Z"),
  submitted: false,
  notStarted: false,
  exam: {
    _id: "exam-1",
    title: "주간 공식 모의고사",
    formCode: "A",
    attemptNumber: 1,
    isTest: false,
    questionCount: 30,
  },
  attempt: {
    _id: "attempt-1",
    answers: ["1"],
    answeredCount: 1,
  },
};
const service = {
  async getPrivateMockExamPageData(userId) {
    calls.push(["dashboard", String(userId)]);
    return {
      eligibility: { allowed: true, status: "allowed", title: "응시 가능", message: "", ctaLabel: "입장" },
      weeklyExams: [],
      weeklyRanking: [],
      rankingRules: [],
    };
  },
  async startPrivateMockAttempt(input) {
    calls.push(["start", input]);
  },
  async getPrivateMockAttemptData(input) {
    calls.push(["attempt", input]);
    return attemptData;
  },
  async savePrivateMockDraft(input) {
    calls.push(["draft", input]);
    return { answeredCount: 1, savedAt: new Date("2026-08-11T09:01:00.000Z") };
  },
  async submitPrivateMockAttempt(input) {
    calls.push(["submit", input]);
    return {
      elapsedMs: 60000,
      elapsedLabel: "1분",
      pendingAggregation: true,
      attemptNumber: 1,
      formCode: "A",
      isTest: false,
      weekKey: "2026-W33",
    };
  },
  async submitPrivateMockIntegrityEvidence(input) {
    calls.push(["evidence", input]);
    return {
      submitted: true,
      replayed: true,
      receiptId: "receipt-1",
      submittedAt: "2026-08-11T09:02:00.000Z",
    };
  },
  async selectPrivateMockWeeklyAttempt(input) {
    calls.push(["selection", input]);
    return {
      selectionState: input.defer ? "deferred" : "selected",
      selectedAttemptId: input.defer ? null : input.attemptId,
    };
  },
  async getUserPrivateMockIntegrityCases(input) {
    calls.push(["integrity-cases", input]);
    return [{
      _id: "case-1",
      examId: {
        _id: "exam-1",
        title: "주간 공식 모의고사",
        formCode: "A",
        releaseAt: new Date("2026-08-11T09:00:00.000Z"),
      },
      attemptId: "attempt-1",
      weekKey: "2026-W33",
      status: "EVIDENCE_REQUIRED",
      requestedQuestionNumbers: [3, 7],
      evidenceRequest: {
        requestedAt: new Date("2026-08-11T09:00:00.000Z"),
        deadlineAt: new Date("2099-08-14T14:59:59.999Z"),
        instructions: "3번과 7번 풀이를 제출해주세요.",
      },
      evidenceSubmissions: [],
      reviewStatus: "unreviewed",
      penaltyDecision: "pending",
      decision: {},
    }];
  },
  async getUserIntegrityCase(input) {
    calls.push(["integrity-case", input]);
    return (await this.getUserPrivateMockIntegrityCases(input))[0];
  },
  async getPrivateMockObjectionFormData(input) {
    calls.push(["objection-options", input]);
    return {
      exams: [{
        id: "exam-1",
        title: "주간 공식 모의고사",
        formCode: "A",
        questionCount: 30,
        releaseAt: "2026-08-11T09:00:00.000Z",
      }],
    };
  },
  async getUserPrivateMockObjections(input) {
    calls.push(["objections", input]);
    return [{
      _id: "objection-1",
      examId: "exam-1",
      examTitle: "주간 공식 모의고사",
      questionNumber: 7,
      issueDetail: "정답 조건을 다시 확인해주세요.",
      status: "pending",
      reviewReason: "",
      createdAt: new Date("2026-08-11T09:03:00.000Z"),
    }];
  },
  async createPrivateMockObjection(input) {
    calls.push(["create-objection", input]);
    return {
      _id: "objection-2",
      examId: input.examId,
      examTitle: "주간 공식 모의고사",
      questionNumber: input.questionNumber,
      issueDetail: input.issueDetail,
      status: "pending",
      reviewReason: "",
      createdAt: new Date("2026-08-11T09:04:00.000Z"),
    };
  },
  async getPrivateMockExamFile(input) {
    calls.push(["paper", input]);
    return {
      path: null,
      cloudUrl: "https://files.example.test/weekly-mock.pdf",
      name: "weekly-mock.pdf",
      mimeType: "application/octet-stream",
    };
  },
};

function response() {
  return {
    headers: {},
    set(key, value) { this.headers[key] = value; return this; },
    json(value) { this.value = value; return value; },
    redirect(status, location) {
      this.statusCode = status;
      this.location = location;
      return location;
    },
  };
}

async function main() {
  const controller = createIpadWeeklyMockController({
    service,
    recordActivity: async (...args) => calls.push(["activity", args]),
    pdfIsDownload: () => false,
  });
  const next = (error) => { if (error) throw error; };
  const base = {
    apiUser: { _id: "user-1" },
    params: { examId: "exam-1" },
    body: { answers: ["1"], telemetryEvents: [{ eventType: "answer" }] },
  };

  const dashboardResponse = response();
  await controller.dashboard(base, dashboardResponse, next);
  assert.equal(dashboardResponse.value.weeklyMock.eligibility.allowed, true);
  assert.equal(dashboardResponse.headers["Cache-Control"], "private, no-store");

  const startResponse = response();
  await controller.start(base, startResponse, next);
  assert.equal(startResponse.value.attempt.exam.id, "exam-1");
  assert.equal(startResponse.value.attempt.state, "in-progress");

  const draftResponse = response();
  await controller.saveDraft(base, draftResponse, next);
  assert.equal(draftResponse.value.draft.answeredCount, 1);
  const draftCall = calls.find(([name]) => name === "draft")[1];
  assert.deepEqual(draftCall.telemetryEvents, base.body.telemetryEvents);

  const submitResponse = response();
  await controller.submit(base, submitResponse, next);
  assert.equal(submitResponse.value.submitted, true);
  assert.ok(calls.some(([name]) => name === "activity"));

  const attemptResponse = response();
  await controller.getAttempt(base, attemptResponse, next);
  assert.equal(attemptResponse.value.attempt.exam.id, "exam-1");

  // 첫 응시는 서버 adapter가 `lobby`로 표현한다. iPad 화면은 이 값을 시작
  // CTA 상태로 소비해야 하므로 계약에서 명시적으로 고정한다.
  attemptData.notStarted = true;
  const lobbyResponse = response();
  await controller.getAttempt(base, lobbyResponse, next);
  assert.equal(lobbyResponse.value.attempt.state, "lobby");
  assert.equal(lobbyResponse.value.attempt.submitted, false);
  attemptData.notStarted = false;

  const selectionResponse = response();
  await controller.selectRepresentative({
    ...base,
    params: { weekKey: "2026-W33" },
    body: { attemptId: "attempt-1", defer: false },
  }, selectionResponse, next);
  assert.equal(selectionResponse.value.selection.selectedAttemptId, "attempt-1");

  const integrityCasesResponse = response();
  await controller.integrityCases(base, integrityCasesResponse, next);
  assert.equal(integrityCasesResponse.value.integrityCases[0].id, "case-1");
  assert.equal(integrityCasesResponse.value.integrityCases[0].canSubmit, true);

  const integrityCaseResponse = response();
  await controller.integrityCase({
    ...base,
    params: { caseId: "case-1" },
  }, integrityCaseResponse, next);
  assert.equal(integrityCaseResponse.value.integrityCase.attemptId, "attempt-1");

  const evidenceResponse = response();
  await controller.submitEvidence({
    apiUser: { _id: "user-1" },
    params: { caseId: "case-1" },
    files: [{ originalname: "solution.jpg" }],
    body: { note: "풀이 순서" },
    get(name) {
      return name === "Idempotency-Key" ? "evidence-command-1" : undefined;
    },
  }, evidenceResponse, next);
  assert.equal(evidenceResponse.value.evidence.replayed, true);
  const evidenceCall = calls.find(([name]) => name === "evidence")[1];
  assert.equal(evidenceCall.submissionId, "evidence-command-1");

  const objectionOptionsResponse = response();
  await controller.objectionOptions(base, objectionOptionsResponse, next);
  assert.equal(objectionOptionsResponse.value.exams[0].id, "exam-1");

  const objectionsResponse = response();
  await controller.objections(base, objectionsResponse, next);
  assert.equal(objectionsResponse.value.objections[0].id, "objection-1");

  const createObjectionResponse = response();
  await controller.createObjection({
    ...base,
    body: {
      examId: "exam-1",
      questionNumber: 7,
      issueDetail: "정답 조건을 다시 확인해주세요.",
    },
  }, createObjectionResponse, next);
  assert.equal(createObjectionResponse.value.objection.id, "objection-2");

  const paperResponse = response();
  await controller.paper(base, paperResponse, next);
  assert.equal(paperResponse.statusCode, 302);
  assert.equal(paperResponse.location, "https://files.example.test/weekly-mock.pdf");

  const submittedController = createIpadWeeklyMockController({
    service: {
      async getPrivateMockAttemptData() {
        return { ...attemptData, submitted: true, notStarted: false };
      },
    },
  });
  const expireResponse = response();
  await submittedController.expire(base, expireResponse, next);
  assert.equal(expireResponse.value.replayed, true);
  assert.equal(expireResponse.value.state, "submitted");

  const routes = apiRouter.stack.map((layer, index) => ({
    index,
    auth: layer.name === "requireApiAuth",
    path: layer.route?.path,
    methods: Object.keys(layer.route?.methods || {}),
  }));
  const authIndex = routes.findIndex((route) => route.auth);
  const weeklyRoutes = routes.filter((route) =>
    String(route.path || "").startsWith("/weekly-mock-exams")
  );
  const expectedRoutes = [
    ["GET", "/weekly-mock-exams/integrity-cases"],
    ["GET", "/weekly-mock-exams/integrity-cases/:caseId"],
    ["POST", "/weekly-mock-exams/integrity-cases/:caseId/evidence"],
    ["GET", "/weekly-mock-exams/objections/options"],
    ["GET", "/weekly-mock-exams/objections"],
    ["POST", "/weekly-mock-exams/objections"],
    ["POST", "/weekly-mock-exams/weeks/:weekKey/selection"],
    ["GET", "/weekly-mock-exams"],
    ["GET", "/weekly-mock-exams/:examId/paper"],
    ["POST", "/weekly-mock-exams/:examId/start"],
    ["PATCH", "/weekly-mock-exams/:examId/draft"],
    ["POST", "/weekly-mock-exams/:examId/submit"],
    ["POST", "/weekly-mock-exams/:examId/expire"],
    ["GET", "/weekly-mock-exams/:examId"],
  ];
  assert.deepEqual(
    weeklyRoutes.map((route) => [route.methods[0].toUpperCase(), route.path]),
    expectedRoutes,
    "WeeklyMockAPI.swift의 전체 HTTP 표면이 같은 동사와 정적-우선 순서로 등록되어야 합니다."
  );
  assert.ok(
    authIndex >= 0 && weeklyRoutes.every((route) => route.index > authIndex),
    "모든 주간 모의고사 API는 Bearer 인증 뒤에 있어야 합니다."
  );

  console.log("iPad weekly mock routes delegate to the authoritative exam service");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
