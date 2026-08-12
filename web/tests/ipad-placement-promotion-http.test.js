"use strict";

// 배치고사 제출 결과가 함수 내부에만 머물지 않고 실제 Bearer HTTP 경계를
// 통과해 iPad의 랭크 공개 계약으로 직렬화되는지 검증한다.
const assert = require("node:assert/strict");
const express = require("express");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const resolve = (relativePath) => require.resolve(path.join(repoRoot, relativePath));
const stub = (relativePath, exports) => {
  const filename = resolve(relativePath);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
};

const userId = "64d000000000000000000001";
const attemptId = "64d000000000000000000099";
const apiUser = {
  _id: userId,
  tokenVersion: 3,
  toObject() {
    return { _id: this._id, tokenVersion: this.tokenVersion };
  },
};

stub("services/mobileAuthService.js", {
  verifyAccessToken(token) {
    return token === "placement-token" ? { sub: userId, ver: 3 } : null;
  },
});
stub("services/accountAccessService.js", {
  synchronizeAccountAccess: async (id) => ({ allowed: id === userId, user: apiUser }),
});
stub("services/userLifecycleService.js", {
  synchronizeUserLifecycle: async () => apiUser,
});

const serviceCalls = [];
const submittedAttempt = {
  _id: attemptId,
  userId,
  status: "submitted",
  placementPurpose: "INITIAL",
  placementResult: {
    placementScore: 87.5,
    initialMmr: 1320,
    initialTier: "플래티넘",
    rankPoint: 42,
    rankingStatus: "PROVISIONAL",
    percentile: 0.91,
    threePoint: { correct: 18 },
    fourPoint: { correct: 7 },
    verification: { result: "passed" },
  },
  questions: [],
  elapsedTimeMs: 4_200_000,
  currentQuestionIndex: 29,
  submittedAt: new Date("2026-08-12T03:00:00.000Z"),
};

stub("services/placementExamService.js", {
  getPlacementDashboardData: async () => ({}),
  createPlacementAttempt: async () => submittedAttempt,
  getPlacementAttempt: async () => submittedAttempt,
  savePlacementDraft: async () => ({}),
  expirePlacementAttempt: async () => submittedAttempt,
  async submitPlacementAttempt(input) {
    serviceCalls.push(input);
    return submittedAttempt;
  },
});
stub("services/mmrService.js", {
  ensureRankingProfile: async (id) => {
    assert.equal(String(id), userId);
    return {
      tier: "PLATINUM",
      tierLabel: "플래티넘",
      mmr: 1320,
      rankPoint: 42,
      status: "PROVISIONAL",
      percentile: 0.91,
    };
  },
  rankingProfileView: (profile) => profile,
});

delete require.cache[resolve("middleware/apiAuthMiddleware.js")];
delete require.cache[resolve("controllers/ipadPlacementController.js")];
const { requireApiAuth } = require(resolve("middleware/apiAuthMiddleware.js"));
const placement = require(resolve("controllers/ipadPlacementController.js"));

async function run() {
  const app = express();
  app.use(express.json());
  app.post(
    "/api/v1/placement-exam/:attemptId/submit",
    requireApiAuth,
    placement.submit,
  );
  app.use((error, req, res, next) => {
    void req;
    void next;
    res.status(error.status || 500).json({ message: error.message });
  });

  const server = await new Promise((accept) => {
    const listening = app.listen(0, "127.0.0.1", () => accept(listening));
  });
  try {
    const address = server.address();
    const endpoint = `http://127.0.0.1:${address.port}/api/v1/placement-exam/${attemptId}/submit`;

    const unauthorized = await fetch(endpoint, { method: "POST" });
    assert.equal(unauthorized.status, 401);
    assert.equal(serviceCalls.length, 0, "인증 실패 요청은 배치 서비스에 도달하면 안 됩니다.");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: "Bearer placement-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        answers: { q1: "2" },
        activeQuestionId: "q30",
        currentQuestionIndex: 29,
      }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();

    assert.equal(serviceCalls.length, 1);
    assert.deepEqual(serviceCalls[0], {
      userId,
      attemptId,
      answers: { q1: "2" },
      activeQuestionId: "q30",
      currentQuestionIndex: 29,
    });
    assert.equal(body.result.tierCode, "PLATINUM");
    assert.equal(body.result.tierLabel, "플래티넘");
    assert.equal(body.result.initialMmr, 1320);
    assert.equal(body.result.rankPoint, 42);
    assert.deepEqual(body.presentation, {
      id: `placement-${attemptId}`,
      kind: "placement",
      tierCode: "PLATINUM",
      tierLabel: "플래티넘",
    });
    assert.deepEqual(body.attempt.presentation, body.presentation);
    assert.equal(body.attempt.phase, "completed");
  } finally {
    await new Promise((resolveClose, reject) => {
      server.close((error) => (error ? reject(error) : resolveClose()));
    });
  }

  console.log("placement submit Bearer HTTP response opens the iPad rank presentation contract");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
