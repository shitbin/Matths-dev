const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const REPO = path.resolve(
  __dirname,
  ".."
);
const modelPath = require.resolve(
  path.join(
    REPO,
    "models/matthsModel.js"
  )
);
const activityServicePath =
  require.resolve(
    path.join(
      REPO,
      "services/dashboardActivityService.js"
    )
  );

const dashboardFixture = {
  generatedAt:
    "2026-07-30T12:34:56.000Z",
  stats: {
    weeklyStudyMinutes: 63,
    weeklyStudyDetail:
      "지난 기간보다 +62분",
    todayStudyMinutes: 2,
    activeStudyDays: 3,
    averageStudyMinutes: 21,
    weeklySolvedProblems: 4,
    weeklySolvedDetail:
      "지난 기간보다 +1문제",
    correctRate: 75,
    correctRateDetail:
      "지난 기간보다 +8%",
  },
  weeklyActivity: {
    days: Array.from(
      { length: 7 },
      (_, index) => ({
        dateKey:
          `2026-07-${String(
            24 + index
          ).padStart(2, "0")}`,
        label:
          index === 6
            ? "오늘"
            : "요일",
        minutes:
          index === 6 ? 2 : 0,
        isToday: index === 6,
      })
    ),
    maxMinutes: 10,
  },
};
let requestedUserId = null;
let serviceError = null;

require.cache[modelPath] = {
  id: modelPath,
  filename: modelPath,
  loaded: true,
  exports: {
    AssessmentAttempt: {},
    RankingProfile: {},
    ConceptProgress: {},
    LearningEvent: {},
    Problem: {},
    ProblemAttempt: {},
  },
};
require.cache[activityServicePath] = {
  id: activityServicePath,
  filename: activityServicePath,
  loaded: true,
  exports: {
    getDashboardActivity:
      async (userId) => {
        requestedUserId =
          String(userId);
        if (serviceError) {
          throw serviceError;
        }
        return dashboardFixture;
      },
  },
};

const controller = require(
  path.join(
    REPO,
    "controllers/ipadSyncController.js"
  )
);

(async () => {
  const response = {
    body: null,
    json(body) {
      this.body = body;
      return this;
    },
  };
  let forwardedError = null;
  const next = (error) => {
    forwardedError = error;
  };

  await controller.getDashboardActivity(
    {
      apiUser: {
        _id: "user-42",
      },
    },
    response,
    next
  );
  assert.equal(
    requestedUserId,
    "user-42",
    "인증 사용자의 통계만 요청한다"
  );
  assert.deepEqual(
    response.body,
    {
      dashboard:
        dashboardFixture,
    },
    "고정된 dashboard activity API 계약으로 감싼다"
  );
  assert.equal(
    Object.keys(
      response.body.dashboard.stats
    ).length,
    9,
    "6 KPI와 3개 비교 문구를 모두 제공한다"
  );
  assert.equal(
    response.body.dashboard
      .weeklyActivity.days.length,
    7
  );
  assert.equal(
    forwardedError,
    null
  );

  serviceError = new Error(
    "activity unavailable"
  );
  await controller.getDashboardActivity(
    {
      apiUser: {
        _id: "user-42",
      },
    },
    response,
    next
  );
  assert.equal(
    forwardedError,
    serviceError,
    "집계 실패는 공통 API 오류 처리기로 전달한다"
  );

  const routes = fs.readFileSync(
    path.join(
      REPO,
      "routes/api-routes.js"
    ),
    "utf8"
  );
  assert.match(
    routes,
    /router\.get\(\s*"\/dashboard\/activity",\s*ipadSync\.getDashboardActivity\s*\)/,
    "인증 이후 /api/v1/dashboard/activity 라우트를 등록한다"
  );

  console.log(
    "dashboard activity controller tests passed"
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
