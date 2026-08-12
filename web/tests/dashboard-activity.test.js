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

let aggregateRows = [];
let observedPipeline = null;
const supplementalRows = {
  quickPractice: [],
  assessment: [],
  privateMock: [],
};
const observedSupplementalPipelines = {};
const supplementalAggregate = (kind) => async (pipeline) => {
  observedSupplementalPipelines[kind] = pipeline;
  return supplementalRows[kind];
};
require.cache[modelPath] = {
  id: modelPath,
  filename: modelPath,
  loaded: true,
  exports: {
    LearningEvent: {
      aggregate: async (pipeline) => {
        observedPipeline = pipeline;
        return aggregateRows;
      },
    },
    QuickPracticeAttempt: {
      aggregate:
        supplementalAggregate(
          "quickPractice"
        ),
    },
    AssessmentAttempt: {
      aggregate:
        supplementalAggregate(
          "assessment"
        ),
    },
    PrivateMockExamAttempt: {
      aggregate:
        supplementalAggregate(
          "privateMock"
        ),
    },
  },
};

const {
  PROBLEM_EVENT_TYPES,
  buildDashboardActivity,
  buildDashboardActivitySnapshot,
  createKstDateSeries,
  getDashboardActivity,
} = require(
  path.join(
    REPO,
    "services/dashboardActivityService.js"
  )
);

const NOW = new Date(
  "2026-07-30T12:34:56.000Z"
);

function checkPeriodBoundaries() {
  const series =
    createKstDateSeries(NOW);

  assert.equal(
    series.length,
    14,
    "직전 7일과 현재 7일, 총 14일을 만든다"
  );
  assert.equal(
    series[0].dateKey,
    "2026-07-17",
    "직전 기간 첫날은 KST 13일 전이다"
  );
  assert.equal(
    series[6].dateKey,
    "2026-07-23",
    "직전 기간은 KST 어제 7일 전까지다"
  );
  assert.equal(
    series[7].dateKey,
    "2026-07-24",
    "현재 기간은 KST 오늘 포함 최근 7일이다"
  );
  assert.equal(
    series[13].dateKey,
    "2026-07-30",
    "현재 기간 마지막 날은 KST 오늘이다"
  );
}

function checkKpisAndDailyRounding() {
  const activity =
    buildDashboardActivity(
      [
        {
          _id: "2026-07-17",
          durationMs: 60000,
          solvedProblems: 2,
          correctProblems: 1,
        },
        {
          _id: "2026-07-18",
          durationMs: 29999,
          solvedProblems: 1,
          correctProblems: 1,
        },
        // 같은 날의 duration은 합한 다음 한 번 반올림해야 한다.
        {
          _id: "2026-07-24",
          durationMs: 31000,
          solvedProblems: 1,
          correctProblems: 1,
        },
        {
          _id: "2026-07-24",
          durationMs: 31000,
          solvedProblems: 1,
          correctProblems: 1,
        },
        {
          _id: "2026-07-27",
          durationMs: 3600000,
          solvedProblems: 1,
          correctProblems: 0,
        },
        {
          _id: "2026-07-30",
          durationMs: 149999,
          solvedProblems: 1,
          correctProblems: 1,
        },
        // 허용 날짜 밖의 행은 방어적으로 무시한다.
        {
          _id: "2026-07-31",
          durationMs: 99999999,
          solvedProblems: 100,
          correctProblems: 100,
        },
      ],
      { now: NOW }
    );

  assert.deepEqual(
    activity.stats,
    {
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
    "6 KPI와 비교 문구는 날짜별 반올림·LearningEvent 풀이 모집단을 사용한다"
  );
  assert.equal(
    activity.generatedAt,
    NOW.toISOString(),
    "집계 기준 시각을 명시한다"
  );
  assert.equal(
    activity.weeklyActivity.days.length,
    7,
    "그래프는 최근 7일을 빠짐없이 제공한다"
  );
  assert.deepEqual(
    activity.weeklyActivity.days.map(
      ({
        dateKey,
        minutes,
        isToday,
      }) => ({
        dateKey,
        minutes,
        isToday,
      })
    ),
    [
      {
        dateKey: "2026-07-24",
        minutes: 1,
        isToday: false,
      },
      {
        dateKey: "2026-07-25",
        minutes: 0,
        isToday: false,
      },
      {
        dateKey: "2026-07-26",
        minutes: 0,
        isToday: false,
      },
      {
        dateKey: "2026-07-27",
        minutes: 60,
        isToday: false,
      },
      {
        dateKey: "2026-07-28",
        minutes: 0,
        isToday: false,
      },
      {
        dateKey: "2026-07-29",
        minutes: 0,
        isToday: false,
      },
      {
        dateKey: "2026-07-30",
        minutes: 2,
        isToday: true,
      },
    ],
    "날짜 누락을 0분으로 채우고 KST 오늘을 표시한다"
  );
  assert.equal(
    activity.weeklyActivity.days[6]
      .label,
    "오늘",
    "오늘 라벨을 고정한다"
  );
  assert.equal(
    activity.weeklyActivity.maxMinutes,
    60,
    "그래프 최대값은 실제 일 최대 학습 시간이다"
  );
}

function checkZeroDeltaAndEmptyFloor() {
  const equal = buildDashboardActivity(
    [
      {
        _id: "2026-07-20",
        durationMs: 60000,
        solvedProblems: 1,
        correctProblems: 1,
      },
      {
        _id: "2026-07-27",
        durationMs: 60000,
        solvedProblems: 1,
        correctProblems: 1,
      },
    ],
    { now: NOW }
  );

  assert.equal(
    equal.stats.weeklyStudyDetail,
    "지난 기간과 동일"
  );
  assert.equal(
    equal.stats.weeklySolvedDetail,
    "지난 기간과 동일"
  );
  assert.equal(
    equal.stats.correctRateDetail,
    "지난 기간과 동일"
  );

  const empty =
    buildDashboardActivity([], {
      now: NOW,
    });
  assert.equal(
    empty.weeklyActivity.maxMinutes,
    10,
    "빈 그래프도 웹 계약의 최소 축 10분을 유지한다"
  );
  assert.deepEqual(
    empty.stats,
    {
      weeklyStudyMinutes: 0,
      weeklyStudyDetail:
        "지난 기간과 동일",
      todayStudyMinutes: 0,
      activeStudyDays: 0,
      averageStudyMinutes: 0,
      weeklySolvedProblems: 0,
      weeklySolvedDetail:
        "지난 기간과 동일",
      correctRate: 0,
      correctRateDetail:
        "지난 기간과 동일",
    }
  );
}

function checkNegativeDeltaCopy() {
  const decreased =
    buildDashboardActivity(
      [
        {
          _id: "2026-07-20",
          durationMs: 120000,
          solvedProblems: 3,
          correctProblems: 3,
        },
        {
          _id: "2026-07-27",
          durationMs: 60000,
          solvedProblems: 1,
          correctProblems: 0,
        },
      ],
      { now: NOW }
    );

  assert.equal(
    decreased.stats
      .weeklyStudyDetail,
    "지난 기간보다 -1분"
  );
  assert.equal(
    decreased.stats
      .weeklySolvedDetail,
    "지난 기간보다 -2문제"
  );
  assert.equal(
    decreased.stats
      .correctRateDetail,
    "지난 기간보다 -100%"
  );
}

async function checkWebUsesSharedService() {
  const snapshot =
    buildDashboardActivitySnapshot(
      [
        {
          _id: "2026-07-30",
          durationMs: 149999,
          solvedProblems: 3,
          correctProblems: 2,
        },
      ],
      { now: NOW }
    );
  assert.equal(
    snapshot.todaySolvedProblems,
    3,
    "웹 전용 오늘 풀이 수 역시 공통 일별 집계에서 파생한다"
  );
  assert.equal(
    snapshot.activity.stats.todayStudyMinutes,
    2
  );

  const dashboardServicePath =
    require.resolve(
      path.join(
        REPO,
        "services/dashboardService.js"
      )
    );
  const stub = (relativePath, exports) => {
    const resolved = require.resolve(
      path.join(REPO, relativePath)
    );
    require.cache[resolved] = {
      id: resolved,
      filename: resolved,
      loaded: true,
      exports,
    };
  };
  const query = (value) => ({
    sort() { return this; },
    limit() { return this; },
    populate() { return this; },
    select() { return this; },
    lean: async () => value,
  });
  const model = ({ one = null, many = [] } = {}) => ({
    findById: () => query(one),
    findOne: () => query(one),
    find: () => query(many),
    countDocuments: async () => 0,
  });
  const sharedActivity = {
    generatedAt: NOW.toISOString(),
    stats: {
      weeklyStudyMinutes: 63,
      weeklyStudyDetail: "지난 기간보다 +62분",
      todayStudyMinutes: 2,
      activeStudyDays: 3,
      averageStudyMinutes: 21,
      weeklySolvedProblems: 4,
      weeklySolvedDetail: "지난 기간보다 +1문제",
      correctRate: 75,
      correctRateDetail: "지난 기간보다 +8%",
    },
    weeklyActivity: {
      days: [
        {
          dateKey: "2026-07-30",
          label: "오늘",
          minutes: 2,
          isToday: true,
        },
      ],
      maxMinutes: 10,
    },
  };
  let sharedRequest = null;

  require.cache[modelPath].exports = {
    User: {
      findById: () => query({
        _id: "user-1",
        name: "테스트 학생",
        realName: "테스트 학생",
        role: "student",
        schoolGrade: 11,
        school: "테스트고",
        preferences: {},
      }),
    },
    ConceptProgress: model(),
    ConceptLesson: model(),
    DailyPlan: model(),
    ProblemAttempt: model(),
    AssessmentAttempt: model(),
    Announcement: model(),
    UserNotification: model(),
  };
  stub("models/goatArenaModel.js", {
    AccessCycle: model(),
    ArenaAccessState: model(),
    MainToSubConversionResult: model(),
    MockExamSubscription: model(),
  });
  stub("services/arenaTierPolicy.js", {
    ARENA_TIER_CONFIG: [
      { label: "브론즈" },
    ],
    arenaTierByValue: () => ({ label: "브론즈" }),
    arenaTierIndex: () => 0,
  });
  stub("services/curriculumService.js", {
    loadCurriculum: () => ({
      curriculum: { id: "kr-2022" },
      courses: [],
    }),
    buildLearningViewModel: () => ({
      courses: [],
      completedConcepts: 0,
      totalConcepts: 0,
    }),
  });
  stub("services/mathTextService.js", {
    formatDashboardFormula: (value) => value,
  });
  stub("services/userLifecycleService.js", {
    getKoreanDateKey: () => "2026-07-30",
    getEffectiveStreak: () => 4,
  });
  stub("services/assessmentService.js", {
    applyAssessmentGatesToLearningData: (value) => value,
  });
  stub("services/coachMessageService.js", {
    getCoachView: () => ({ message: "계속 학습해요" }),
    MODES: ["spicy"],
  });
  stub("services/dashboardActivityService.js", {
    getDashboardActivitySnapshot: async (userId, options) => {
      sharedRequest = { userId: String(userId), now: options.now };
      return {
        activity: sharedActivity,
        todaySolvedProblems: 3,
      };
    },
  });
  delete require.cache[dashboardServicePath];
  const { getDashboardData } = require(dashboardServicePath);
  const web = await getDashboardData("user-1");

  assert.equal(sharedRequest.userId, "user-1");
  assert.ok(
    sharedRequest.now instanceof Date,
    "웹은 계획 날짜와 공통 집계에 같은 기준 시각을 전달한다"
  );
  assert.deepEqual(
    web.weeklyActivity,
    sharedActivity.weeklyActivity,
    "웹 차트는 공통 집계 결과를 다시 계산하지 않고 그대로 소비한다"
  );
  assert.equal(web.stats.weeklyStudyMinutes, 63);
  assert.equal(web.stats.weeklySolvedProblems, 4);
  assert.equal(web.stats.todaySolvedProblems, 3);
  assert.equal(
    web.stats.correctRateDetail,
    "지난 기간보다 +8%p",
    "웹의 기존 %p 표시 계약은 유지한다"
  );
  assert.equal(web.stats.pendingReviewCount, 0);

  const dashboardSource = fs.readFileSync(
    dashboardServicePath,
    "utf8"
  );
  assert.doesNotMatch(
    dashboardSource,
    /(?:ProblemAttempt|QuickPracticeAttempt|AssessmentAttempt|PrivateMockExamAttempt)\.aggregate/,
    "웹 서비스가 별도 활동 집계를 다시 만들면 안 된다"
  );
}

async function checkDatabaseContract() {
  aggregateRows = [
    {
      _id: "2026-07-30",
      durationMs: 60000,
      solvedProblems: 1,
      correctProblems: 1,
    },
  ];
  supplementalRows.quickPractice = [];
  supplementalRows.assessment = [];
  supplementalRows.privateMock = [];
  const result =
    await getDashboardActivity(
      "user-1",
      { now: NOW }
    );
  const match =
    observedPipeline[0].$match;
  const group =
    observedPipeline[1].$group;

  assert.equal(
    match.userId,
    "user-1",
    "현재 사용자만 집계한다"
  );
  assert.equal(
    match.occurredAt.$gte.toISOString(),
    "2026-07-16T15:00:00.000Z",
    "직전 7일 첫날 KST 자정부터 조회한다"
  );
  assert.equal(
    match.occurredAt.$lte.toISOString(),
    NOW.toISOString(),
    "오늘 같은 날짜의 미래 이벤트도 제외한다"
  );
  assert.deepEqual(
    match.$or[1].eventType.$in,
    PROBLEM_EVENT_TYPES,
    "풀이 KPI 모집단은 problem-correct/problem-wrong이다"
  );
  assert.match(
    JSON.stringify(group),
    /problem-correct/
  );
  assert.doesNotMatch(
    JSON.stringify(
      observedPipeline
    ),
    /ProblemAttempt/
  );
  assert.equal(
    result.stats.weeklySolvedProblems,
    1,
    "DB 집계 결과도 공통 계약으로 변환한다"
  );
}

async function checkSupplementalActivityContract() {
  aggregateRows = [
    {
      _id: "2026-07-30",
      durationMs: 60000,
      solvedProblems: 1,
      correctProblems: 1,
    },
  ];
  supplementalRows.quickPractice = [
    {
      _id: "2026-07-30",
      durationMs: 60000,
      solvedProblems: 1,
      correctProblems: 0,
    },
  ];
  supplementalRows.assessment = [
    {
      _id: "2026-07-30",
      durationMs: 120000,
      solvedProblems: 2,
      correctProblems: 2,
    },
  ];
  supplementalRows.privateMock = [
    {
      _id: "2026-07-30",
      durationMs: 0,
      solvedProblems: 1,
      correctProblems: 0,
    },
  ];

  const result =
    await getDashboardActivity(
      "user-all-surfaces",
      { now: NOW }
    );
  assert.equal(
    result.stats.weeklySolvedProblems,
    5,
    "일반/iPad 풀이와 눈풀이·평가·모의고사를 한 공통 모집단으로 합친다"
  );
  assert.equal(result.stats.todayStudyMinutes, 4);
  assert.equal(result.stats.correctRate, 60);

  for (const [kind, pipeline] of Object.entries(
    observedSupplementalPipelines
  )) {
    assert.equal(
      pipeline[0].$match.userId,
      "user-all-surfaces",
      `${kind}도 현재 사용자만 집계한다`
    );
    assert.equal(
      pipeline[0].$match.submittedAt.$gte.toISOString(),
      "2026-07-16T15:00:00.000Z"
    );
    assert.equal(
      pipeline[0].$match.submittedAt.$lte.toISOString(),
      NOW.toISOString(),
      `${kind}는 같은 날 미래 제출을 포함하지 않는다`
    );
    assert.match(
      JSON.stringify(pipeline[1].$group),
      /solvedProblems/
    );
    assert.match(
      JSON.stringify(pipeline[1].$group),
      /correctProblems/
    );
  }
}

(async () => {
  checkPeriodBoundaries();
  checkKpisAndDailyRounding();
  checkZeroDeltaAndEmptyFloor();
  checkNegativeDeltaCopy();
  await checkWebUsesSharedService();
  await checkSupplementalActivityContract();
  await checkDatabaseContract();
  console.log(
    "dashboard activity service tests passed"
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
