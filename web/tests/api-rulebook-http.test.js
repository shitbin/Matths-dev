"use strict";

// 별도 HTTP 테스트 패키지 없이 실제 Express router를 임시 포트에 올린다.
// 이 테스트는 소스 문자열이 아니라 다음 실행 경계를 검증한다.
//   요청 → 전역 Bearer 인증 → 룰북 controller → no-store JSON 응답
const assert = require("node:assert/strict");
const path = require("node:path");
const express = require("express");

const repoRoot = path.resolve(__dirname, "..");
const resolve = (relativePath) =>
  require.resolve(path.join(repoRoot, relativePath));
const stub = (relativePath, exports) => {
  const filename = resolve(relativePath);
  require.cache[filename] = {
    id: filename,
    filename,
    loaded: true,
    exports,
  };
};
const fallbackHandler = (req, res) =>
  res.status(501).json({ code: "TEST_ROUTE_NOT_IMPLEMENTED" });
const controllerProxy = (overrides = {}) =>
  new Proxy(overrides, {
    get(target, property) {
      return target[property] || fallbackHandler;
    },
  });

let verifiedTokens = [];
const apiUser = {
  _id: "user-42",
  tokenVersion: 7,
  toObject() {
    return {
      _id: this._id,
      tokenVersion: this.tokenVersion,
    };
  },
};

stub("services/mobileAuthService.js", {
  verifyAccessToken(token) {
    verifiedTokens.push(token);
    return token === "valid-token"
      ? { sub: "user-42", ver: 7 }
      : null;
  },
});
stub("services/accountAccessService.js", {
  synchronizeAccountAccess: async (userId) => ({
    allowed: userId === "user-42",
    user: apiUser,
  }),
});
stub("services/userLifecycleService.js", {
  synchronizeUserLifecycle: async () => apiUser,
});

delete require.cache[resolve("middleware/apiAuthMiddleware.js")];
const apiAuth = require(resolve("middleware/apiAuthMiddleware.js"));

const policyCalls = [];
const activePayback = { id: "payback-active" };
const activeMain = { id: "main-active" };
const upcomingPayback = { id: "payback-upcoming" };
const upcomingMain = { id: "main-upcoming" };

stub("models/matthsModel.js", { User: {} });
stub("models/goatArenaModel.js", {});
stub("services/placementExamService.js", {});
stub("services/errorHelpService.js", {});
stub("services/rankingService.js", {});
stub("services/arenaTierPolicy.js", {
  arenaTierGuide: () => [],
  arenaUpperTierPopulationGuide: () => [],
});
stub("services/arenaOneOnOneProblemBank.js", {
  ARENA_ONE_ON_ONE_QUESTION_COUNT: 5,
  ARENA_ONE_ON_ONE_TIME_LIMIT_MS: 300000,
  ARENA_ONE_ON_ONE_EVIDENCE_LIMIT_MS: 30000,
});
stub("services/userIdentityService.js", {});
stub("services/arenaMatchService.js", {});
stub("services/arenaMatchAttemptService.js", {});
stub("services/arenaMatchEvidenceService.js", {});
stub("services/arenaRankUpPresentationService.js", {});
stub("services/arenaMatchSettlementService.js", {});
stub("services/arenaRevengeService.js", {});
stub("services/arenaPolicyService.js", {
  getActiveArenaPolicy: async (now) => {
    policyCalls.push({ kind: "active-payback", now });
    return activePayback;
  },
  getActiveMainDivisionPolicy: async (now, options) => {
    policyCalls.push({ kind: "active-main", now, options });
    return activeMain;
  },
  getUpcomingArenaPolicy: async (now) => {
    policyCalls.push({ kind: "upcoming-payback", now });
    return upcomingPayback;
  },
  getUpcomingMainDivisionPolicy: async (now) => {
    policyCalls.push({ kind: "upcoming-main", now });
    return upcomingMain;
  },
});
stub("services/arenaRulebookViewService.js", {
  getArenaRulebook(division, policies) {
    assert.equal(policies.paybackPolicy, activePayback);
    assert.equal(policies.mainPolicy, activeMain);
    assert.equal(policies.upcomingPaybackPolicy, upcomingPayback);
    assert.equal(policies.upcomingMainPolicy, upcomingMain);
    return { division, authority: "SERVER_ACTIVE_POLICY" };
  },
});
stub("services/arenaAccessViewService.js", {});
stub("services/mainArenaMatchService.js", {});
stub("services/mainArenaRevengeService.js", {});
stub("services/arenaShopPolicyService.js", {});
stub("services/operationalMetricEventService.js", {});
stub("services/paybackAccountService.js", {});
stub("services/arenaNotificationService.js", {});

delete require.cache[resolve("controllers/goatArenaController.js")];
const realGoatArenaController = require(
  resolve("controllers/goatArenaController.js")
);

stub("controllers/apiController.js", controllerProxy());
stub("controllers/ipadSyncController.js", controllerProxy());
stub("controllers/accessEconomyController.js", controllerProxy());
stub(
  "controllers/goatArenaController.js",
  controllerProxy({
    getGoatArenaRulebook:
      realGoatArenaController.getGoatArenaRulebook,
  })
);
stub("controllers/goatArenaCommandController.js", controllerProxy());
stub("controllers/ipadPlacementController.js", controllerProxy());
stub("middleware/apiAuthMiddleware.js", apiAuth);

delete require.cache[resolve("routes/api-routes.js")];
const router = require(resolve("routes/api-routes.js"));

async function main() {
  const app = express();
  app.use("/api/v1", router);
  app.use((error, req, res, next) => {
    void req;
    void next;
    res.status(error.status || 500).json({
      code: error.code || "INTERNAL_ERROR",
      message: error.message,
    });
  });

  const server = await new Promise((resolveListening) => {
    const listener = app.listen(0, "127.0.0.1", () =>
      resolveListening(listener)
    );
  });
  const address = server.address();
  const endpoint =
    `http://127.0.0.1:${address.port}/api/v1/goat-arena/rulebook`;

  try {
    const denied = await fetch(endpoint);
    assert.equal(denied.status, 401);
    assert.deepEqual(await denied.json(), {
      code: "UNAUTHORIZED",
      message: "유효한 접근 토큰이 필요합니다.",
    });
    assert.equal(
      policyCalls.length,
      0,
      "인증 실패 요청은 정책 조회와 controller 실행 전에 끝나야 한다"
    );

    const allowed = await fetch(endpoint, {
      headers: {
        authorization: "Bearer valid-token",
      },
    });
    assert.equal(allowed.status, 200);
    assert.match(
      allowed.headers.get("cache-control") || "",
      /no-store/,
      "활성 정책 룰북을 중간 캐시가 보관하면 안 된다"
    );
    const payload = await allowed.json();
    assert.equal(
      payload.rulebook.schemaVersion,
      "GOAT_ARENA_RULEBOOK_V1"
    );
    assert.equal(payload.rulebook.revision, "FINAL_LOGIC_V1_4");
    assert.equal(payload.rulebook.source, "SERVER_ACTIVE_POLICY");
    assert.deepEqual(
      Object.keys(payload.rulebook.divisions).sort(),
      ["main", "sub"]
    );
    assert.deepEqual(
      policyCalls.map(({ kind }) => kind).sort(),
      [
        "active-main",
        "active-payback",
        "upcoming-main",
        "upcoming-payback",
      ]
    );
    assert.equal(
      policyCalls.find(({ kind }) => kind === "active-main")
        .options.bypassCache,
      true,
      "웹 룰북과 같은 최신 Ranked 정책 조회 계약을 사용한다"
    );
    assert.ok(
      policyCalls.every(({ now }) => now instanceof Date),
      "한 요청의 정책 조회는 controller가 만든 시각을 전달해야 한다"
    );
    assert.deepEqual(verifiedTokens, ["valid-token"]);
  } finally {
    await new Promise((resolveClosed, rejectClosed) =>
      server.close((error) =>
        error ? rejectClosed(error) : resolveClosed()
      )
    );
  }

  console.log("authenticated rulebook HTTP contract passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
