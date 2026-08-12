"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const {
  createIpadAssessmentController,
} = require("../controllers/ipadAssessmentController");

const calls = [];
const starts = new Map();
const baseAttempt = {
  _id: "assessment-1",
  scopeType: "course",
  courseId: "math1",
  unitId: null,
  subunitId: null,
  title: "수학 I 과목 종합평가",
  status: "in-progress",
  startedAt: new Date("2026-08-12T00:00:00.000Z"),
  updatedAt: new Date("2026-08-12T00:01:00.000Z"),
  timeLimitMs: 3_600_000,
  questions: [{
    questionId: "question-authority-1",
    typeId: "type-1",
    prompt: "x+1=2",
    choices: [],
    answer: "1",
    solution: "양변에서 1을 뺀다.",
    points: 100,
    submittedAnswer: "",
    isCorrect: null,
  }],
};

const service = {
  async listAssessmentAttempts({ userId }) {
    calls.push(["list", String(userId)]);
    return [...starts.values()];
  },
  async createAssessmentAttempt(input) {
    calls.push(["start", input]);
    if (!starts.has(input.clientStartId)) starts.set(input.clientStartId, { ...baseAttempt });
    return starts.get(input.clientStartId);
  },
  async getAssessmentAttempt(input) {
    calls.push(["get", input]);
    return baseAttempt;
  },
  async saveAssessmentDraft(input) {
    calls.push(["draft", input]);
    return { savedAt: new Date(), elapsedTimeMs: 10_000 };
  },
  async submitAssessmentAttempt(input) {
    calls.push(["submit", input]);
    return {
      ...baseAttempt,
      status: "submitted",
      submittedAt: new Date("2026-08-12T00:05:00.000Z"),
      scorePercent: 100,
      passed: true,
      questions: [{
        ...baseAttempt.questions[0],
        submittedAnswer: "1",
        isCorrect: true,
      }],
    };
  },
  async expireAssessmentAttempt(input) {
    calls.push(["expire", input]);
    return { ...baseAttempt, status: "disqualified", submittedAt: new Date(), scorePercent: 0, passed: false };
  },
};

async function main() {
  const controller = createIpadAssessmentController(service);
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (req.get("Authorization") !== "Bearer account-a") {
      return res.status(401).json({ code: "UNAUTHORIZED" });
    }
    req.apiUser = { _id: "account-a" };
    return next();
  });
  app.get("/api/v1/assessments", controller.list);
  app.post("/api/v1/assessments/start", controller.start);
  app.get("/api/v1/assessments/:attemptId", controller.get);
  app.patch("/api/v1/assessments/:attemptId/draft", controller.saveDraft);
  app.post("/api/v1/assessments/:attemptId/submit", controller.submit);
  app.post("/api/v1/assessments/:attemptId/expire", controller.expire);
  app.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
    res.status(500).json({ message: error.message });
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/v1/assessments`;
  const request = (path, options = {}) => fetch(`${base}${path}`, {
    ...options,
    headers: {
      Authorization: "Bearer account-a",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  try {
    let response = await fetch(base);
    assert.equal(response.status, 401, "Bearer 없는 계정 경계는 거절");

    const startBody = JSON.stringify({
      scopeType: "course", courseId: "math1", clientStartId: "start-1",
    });
    response = await request("/start", { method: "POST", body: startBody });
    let payload = await response.json();
    assert.equal(payload.assessment.id, "assessment-1");
    assert.equal(payload.assessment.questions[0].answer, "", "응시 중 정답 비노출");

    response = await request("/start", { method: "POST", body: startBody });
    payload = await response.json();
    assert.equal(payload.assessment.id, "assessment-1", "같은 시작 키 멱등");
    assert.equal(starts.size, 1);

    response = await request("/assessment-1/draft", {
      method: "PATCH",
      body: JSON.stringify({ answers: { "question-authority-1": "1" } }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(calls.find(([name]) => name === "draft")[1].answers,
      { "question-authority-1": "1" });

    response = await request("/assessment-1/submit", {
      method: "POST",
      body: JSON.stringify({ answers: { "question-authority-1": "1" } }),
    });
    payload = await response.json();
    assert.equal(payload.assessment.passed, true);
    assert.equal(payload.assessment.questions[0].answer, "1", "제출 후 정답 공개");

    response = await request("");
    payload = await response.json();
    assert.ok(Array.isArray(payload.assessments));
    assert.ok(calls.every(([, value]) => typeof value !== "object" || String(value.userId) === "account-a"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log("iPad assessment Bearer HTTP sync contract passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
