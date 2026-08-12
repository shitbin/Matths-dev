// 실행: node tests/ranking-service.test.js
//
// 웹 전체 순위와 앱 전체/Sub/Main 순위가 공유하는 학생 비교 계약을 검증한다.
const path = require("node:path");

const REPO = path.resolve(
  __dirname,
  ".."
);
const modelPath =
  require.resolve(
    path.join(
      REPO,
      "models/matthsModel.js"
    )
  );
const identityPath =
  require.resolve(
    path.join(
      REPO,
      "services/userIdentityService.js"
    )
  );
// 58차 병합으로 rankingService 가 goatArenaModel(라이브/최종 프로필·스탠딩)도
// 읽는다 — 이 테스트는 학생 comparator 계약 검증이 목적이므로 아레나 쪽은
// 빈 컬렉션으로 모킹해 legacy 산출 경로(응시·프로필 기반)를 태운다.
const arenaModelPath =
  require.resolve(
    path.join(
      REPO,
      "models/goatArenaModel.js"
    )
  );

let attemptRows = [];
let profileRows = [];
let userRows = [];
let lastAttemptFilter = null;

function valueForSort(value) {
  return value instanceof Date
    ? value.getTime()
    : value;
}

function chain(rows) {
  let output = [
    ...rows,
  ];
  const query = {
    sort(specification) {
      const fields =
        Object.entries(
          specification || {}
        );
      output.sort(
        (left, right) => {
          for (const [
            field,
            direction,
          ] of fields) {
            const leftValue =
              valueForSort(
                left[field]
              );
            const rightValue =
              valueForSort(
                right[field]
              );
            if (
              leftValue <
              rightValue
            ) {
              return direction >= 0
                ? -1
                : 1;
            }
            if (
              leftValue >
              rightValue
            ) {
              return direction >= 0
                ? 1
                : -1;
            }
          }
          return 0;
        }
      );
      return query;
    },
    select() {
      return query;
    },
    // 58차 병합본 rankingService 가 아레나 원장 조회에 limit 를 건다
    limit(count) {
      output = output.slice(
        0,
        Number(count) || 0
      );
      return query;
    },
    lean: async () =>
      output,
  };

  return query;
}

function requestedIds(filter) {
  return (
    filter?._id?.$in ||
    filter?.userId?.$in ||
    []
  ).map(String);
}

require.cache[modelPath] = {
  id: modelPath,
  filename: modelPath,
  loaded: true,
  exports: {
    AssessmentAttempt: {
      find: (filter) => {
        lastAttemptFilter =
          filter;
        const eligibleIds =
          filter?.userId?.$in
            ?.map(String);
        return chain(
          eligibleIds
            ? attemptRows.filter(
                (attempt) =>
                  eligibleIds.includes(
                    String(
                      attempt.userId
                    )
                  )
              )
            : attemptRows
        );
      },
    },
    RankingProfile: {
      find: (filter) => {
        const ids =
          requestedIds(filter);
        return chain(
          profileRows.filter(
            (profile) =>
              ids.includes(
                String(
                  profile.userId
                )
              )
          )
        );
      },
    },
    User: {
      find: (filter) => {
        const ids =
          requestedIds(filter);
        return chain(
          userRows.filter(
            (user) =>
              ids.includes(
                String(user._id)
              ) &&
              user.isActive ===
                true
          )
        );
      },
    },
  },
};
require.cache[identityPath] = {
  id: identityPath,
  filename: identityPath,
  loaded: true,
  exports: {
    getRankingDisplayName:
      (user) =>
        String(
          user.name || "학생"
        ),
  },
};
require.cache[arenaModelPath] = {
  id: arenaModelPath,
  filename: arenaModelPath,
  loaded: true,
  exports: {
    ArenaStanding: {
      find: () => chain([]),
    },
    ArenaStandingChangeLedger: {
      find: () => chain([]),
    },
    LiveFinalRankingProfile: {
      find: () => chain([]),
    },
    MainShopEffect: {
      find: () => chain([]),
    },
  },
};

const {
  getRankingData,
  _testing: {
    ranked,
  },
} = require(
  path.join(
    REPO,
    "services/rankingService.js"
  )
);

const failures = [];
function check(
  condition,
  label,
  got
) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    return;
  }
  failures.push(label);
  console.log(
    `  ✗ ${label} — 실제: ${JSON.stringify(got)}`
  );
}

function rankingEntry(
  userId,
  overrides = {}
) {
  return {
    userId,
    rating: 1000,
    latestPerformance: 1,
    recentPerformanceAverage: 1,
    advancedPerformance: 1,
    totalScore: 100,
    reachedCurrentMmrAt:
      "2026-01-02T00:00:00.000Z",
    elapsedTimeMs: 1000,
    ...overrides,
  };
}

(async () => {
  const ordered = ranked([
    rankingEntry(
      "tie-a"
    ),
    rankingEntry(
      "elapsed",
      {
        elapsedTimeMs: 500,
      }
    ),
    rankingEntry(
      "total",
      {
        totalScore: 200,
      }
    ),
    rankingEntry(
      "rating",
      {
        rating: 1100,
      }
    ),
    rankingEntry(
      "advanced",
      {
        advancedPerformance: 2,
      }
    ),
    rankingEntry(
      "recent",
      {
        recentPerformanceAverage: 2,
      }
    ),
    rankingEntry(
      "reached",
      {
        reachedCurrentMmrAt:
          "2026-01-01T00:00:00.000Z",
      }
    ),
    rankingEntry(
      "latest",
      {
        latestPerformance: 2,
      }
    ),
    rankingEntry(
      "tie-b"
    ),
  ]);
  check(
    ordered
      .map(
        (entry) =>
          entry.userId
      )
      .join(",") ===
      [
        "rating",
        "latest",
        "recent",
        "advanced",
        "total",
        "reached",
        "elapsed",
        "tie-a",
        "tie-b",
      ].join(","),
    "웹의 7단계 학생 comparator 순서를 고정",
    ordered.map(
      (entry) =>
        entry.userId
    )
  );
  check(
    ordered.at(-2).rank ===
      8 &&
      ordered.at(-1).rank ===
        8,
    "모든 비교 필드가 같을 때만 공동 순위",
    ordered.slice(-2)
  );

  attemptRows = [
    {
      userId: "u1",
      scorePercent: 90,
      elapsedTimeMs: 900,
      submittedAt:
        new Date(
          "2026-07-03T00:00:00.000Z"
        ),
      placementResult: {
        placementScore: 90,
        verification: {
          result:
            "not-required",
        },
      },
    },
    {
      userId: "u2",
      scorePercent: 89,
      elapsedTimeMs: 800,
      submittedAt:
        new Date(
          "2026-07-02T00:00:00.000Z"
        ),
      placementResult: {
        placementScore: 89,
        verification: {
          result:
            "not-required",
        },
      },
    },
    {
      userId: "outside",
      scorePercent: 99,
      elapsedTimeMs: 700,
      submittedAt:
        new Date(
          "2026-07-04T00:00:00.000Z"
        ),
      placementResult: {
        placementScore: 99,
        verification: {
          result:
            "not-required",
        },
      },
    },
  ];
  profileRows = [
    {
      userId: "u1",
      mmr: 1200,
      tier: "EMERALD",
      rankPoint: 60,
      status: "CONFIRMED",
      recentPerformances: [
        0.7,
      ],
      lastAdvancedPerformance:
        0.8,
      reachedCurrentMmrAt:
        new Date(
          "2026-07-01T00:00:00.000Z"
        ),
    },
    {
      userId: "u2",
      mmr: 1200,
      tier: "EMERALD",
      rankPoint: 70,
      status: "CONFIRMED",
      recentPerformances: [
        0.9,
      ],
      lastAdvancedPerformance:
        0.6,
      reachedCurrentMmrAt:
        new Date(
          "2026-07-02T00:00:00.000Z"
        ),
    },
    {
      userId: "outside",
      mmr: 1700,
      tier: "CHALLENGER",
      rankPoint: 99,
      status: "CONFIRMED",
      recentPerformances: [
        1,
      ],
    },
  ];
  userRows = [
    {
      _id: "u1",
      name: "나",
      isActive: true,
      school: {
        code: "s1",
        name: "학교",
        region: "서울",
      },
      schoolGrade: 2,
    },
    {
      _id: "u2",
      name: "상대",
      isActive: true,
      school: {
        code: "s1",
        name: "학교",
        region: "서울",
      },
      schoolGrade: 2,
    },
    {
      _id: "outside",
      name: "다른 풀",
      isActive: true,
      school: {
        code: "s2",
        name: "다른 학교",
        region: "부산",
      },
      schoolGrade: 3,
    },
  ];

  const subset =
    await getRankingData(
      "u1",
      {
        eligibleUserIds: [
          "u1",
          "u2",
        ],
      }
    );
  check(
    lastAttemptFilter
      ?.userId?.$in
      ?.map(String)
      .join(",") ===
      "u1,u2",
    "활성 랭킹 풀을 배치 시도 조회부터 격리",
    lastAttemptFilter
  );
  check(
    subset.cohortSize ===
      2 &&
      subset.overall
        .map(
          (entry) =>
            entry.userId
        )
        .join(",") ===
        "u2,u1",
    "부분 풀에도 전체 순위와 같은 성과 tie-break 적용",
    subset.overall
  );
  check(
    subset.current
      ?.overallRank === 2 &&
      subset.current
        ?.userId === "u1",
    "부분 풀 기준 내 순위를 current에 제공",
    subset.current
  );

  console.log(
    failures.length
      ? `\n실패 ${failures.length}건`
      : "\n전부 통과"
  );
  process.exit(
    failures.length ? 1 : 0
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
