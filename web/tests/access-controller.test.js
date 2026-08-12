const assert = require("node:assert/strict");
const path = require("node:path");

const REPO = path.resolve(
  __dirname,
  ".."
);
const accessModelPath =
  require.resolve(
    path.join(
      REPO,
      "models/accessEconomyModel.js"
    )
  );
const matthsModelPath =
  require.resolve(
    path.join(
      REPO,
      "models/matthsModel.js"
    )
  );
const rankingServicePath =
  require.resolve(
    path.join(
      REPO,
      "services/rankingService.js"
    )
  );

let currentAccount = null;
let currentRanking = null;
let rankingAccounts = [];
let rankingProfiles = [];
let rankingUsers = [];
let lastRankingAccountFindFilter =
  null;
let lastRankingProfileFindFilter =
  null;
let activeRankingData = {
  current: null,
  cohortSize: 0,
  overall: [],
};
let lastEligibleUserIds = null;
const leanResult = (read) => ({
  lean: async () => read(),
});
const chainResult = (read) => {
  let rows = [];
  const refresh = () => {
    rows = [...read()];
  };
  refresh();
  const chain = {
    select() {
      return chain;
    },
    sort(specification) {
      const entries =
        Object.entries(
          specification || {}
        );
      rows.sort((left, right) => {
        for (const [field, direction] of entries) {
          const leftValue =
            left[field] instanceof Date
              ? left[field].getTime()
              : left[field];
          const rightValue =
            right[field] instanceof Date
              ? right[field].getTime()
              : right[field];
          if (leftValue < rightValue) {
            return direction >= 0
              ? -1
              : 1;
          }
          if (leftValue > rightValue) {
            return direction >= 0
              ? 1
              : -1;
          }
        }
        return 0;
      });
      return chain;
    },
    limit(count) {
      rows = rows.slice(0, count);
      return chain;
    },
    lean: async () => rows,
  };
  return chain;
};

require.cache[accessModelPath] = {
  id: accessModelPath,
  filename: accessModelPath,
  loaded: true,
  exports: {
    LearningAccessAccount: {
      findOne: () =>
        leanResult(
          () => currentAccount
        ),
      find: (filter) => {
        lastRankingAccountFindFilter =
          filter;
        return chainResult(
          () => rankingAccounts
        );
      },
    },
  },
};
require.cache[matthsModelPath] = {
  id: matthsModelPath,
  filename: matthsModelPath,
  loaded: true,
  exports: {
    RankingProfile: {
      findOne: () =>
        leanResult(
          () => currentRanking
        ),
      find: (filter) => {
        lastRankingProfileFindFilter =
          filter;
        return chainResult(
          () => rankingProfiles
        );
      },
    },
    User: {
      find: () =>
        chainResult(
          () => rankingUsers
        ),
    },
  },
};
require.cache[rankingServicePath] = {
  id: rankingServicePath,
  filename: rankingServicePath,
  loaded: true,
  exports: {
    getRankingData: async (
      currentUserId,
      options
    ) => {
      lastEligibleUserIds =
        options?.eligibleUserIds
          ?.map(String) || null;
      return activeRankingData;
    },
  },
};

const controller = require(
  path.join(
    REPO,
    "controllers/accessEconomyController.js"
  )
);

const response = {
  body: null,
  json(body) {
    this.body = body;
    return this;
  },
};
const request = {
  apiUser: {
    _id: "user-1",
  },
};

(async () => {
  const failures = [];
  const check = (
    condition,
    label,
    got
  ) => {
    if (condition) {
      console.log(`  ✓ ${label}`);
      return;
    }
    failures.push(label);
    console.log(
      `  ✗ ${label} — 실제: ${JSON.stringify(got)}`
    );
  };

  await controller.getAccessSummary(
    request,
    response,
    (error) => {
      throw error;
    }
  );
  check(
    response.body.economy.state ===
      "NO_PACKAGE",
    "패키지 전 상태를 명시",
    response.body
  );
  check(
    response.body.economy.ranking
      .activeRanking === null,
    "패키지 전에는 이름을 어느 랭킹에도 노출하지 않음",
    response.body.economy.ranking
  );

  currentAccount = {
    cycleId: "cycle-1",
    paidAccessDays: 29,
    refundChallengeDays: 31,
    bonusAccessDays: 0,
    lockedDays: 0,
    streakDays: 18,
    activeRanking: "SUB",
    activeTakeoverCount: 0,
    refundStatus: "CHALLENGING",
    purchaseAmountKRW: 99000,
    paidAccessStartsAt:
      new Date(
        "2026-07-01T00:00:00+09:00"
      ),
    paidAccessEndsAt:
      new Date(
        "2026-07-29T23:59:59.999+09:00"
      ),
  };
  currentRanking = {
    mmr: 1510,
    tier: "GOLD",
    overallRank: 12,
  };
  await controller.getAccessSummary(
    request,
    response,
    (error) => {
      throw error;
    }
  );
  const economy =
    response.body.economy;
  check(
    economy.state ===
      "REFUND_CHALLENGE",
    "Sub Ranking 도전 상태",
    economy.state
  );
  check(
    economy.access
      .refundChallengeDays === 31 &&
      economy.refund.streakDays ===
        18,
    "도전 잔액과 스트릭을 분리해 반환",
    economy
  );
  check(
    economy.ranking
      .activeRanking === "SUB",
    "활성 랭킹은 하나만 반환",
    economy.ranking
  );
  check(
    economy.ranking.skillMMR ===
      1510 &&
      economy.ranking
        .ladderPosition === 12,
    "기존 MMR 저장값을 다시 계산하지 않음",
    economy.ranking
  );

  rankingAccounts = [
    {
      userId: "user-1",
      activeRanking: "SUB",
    },
    {
      userId: "user-2",
      activeRanking: "SUB",
    },
  ];
  rankingProfiles = [
    {
      userId: "user-1",
      mmr: 1510,
      tier: "GOLD",
      rankPoint: 55,
      status: "CONFIRMED",
      reachedCurrentMmrAt:
        new Date("2026-07-02"),
    },
    {
      userId: "user-2",
      mmr: 1620,
      tier: "PLATINUM",
      rankPoint: 70,
      status: "CONFIRMED",
      reachedCurrentMmrAt:
        new Date("2026-07-03"),
    },
    // MAIN 계정이라 rankingAccounts에 없고 실제 DB 쿼리 결과에도 없어야 하는 행.
    // 스텁은 쿼리 조건을 실행하지 않으므로 아래 검증 전에 명시적으로 빼서
    // 컨트롤러의 정렬·응답 모양만 검증한다.
  ];
  rankingUsers = [
    {
      _id: "user-1",
      name: "수빈",
      preferences: {
        rankingDisplayMode:
          "nickname",
      },
    },
    {
      _id: "user-2",
      name: "상대",
      preferences: {
        rankingDisplayMode:
          "nickname",
      },
    },
  ];
  activeRankingData = {
    cohortSize: 2,
    overall: [
      {
        userId: "user-2",
        displayName: "상대",
        rank: 1,
        rating: 1620,
        tier: "챌린저",
        division: "I",
        rankPoint: 70,
        rankingStatus:
          "CONFIRMED",
      },
      {
        userId: "user-1",
        displayName: "수빈",
        rank: 2,
        rating: 1510,
        tier: "그랜드마스터",
        division: "II",
        rankPoint: 55,
        rankingStatus:
          "CONFIRMED",
      },
    ],
    current: {
      userId: "user-1",
      displayName: "수빈",
      overallRank: 2,
      rating: 1510,
      tier: "그랜드마스터",
      division: "II",
      rankPoint: 55,
      rankingStatus:
        "CONFIRMED",
    },
  };
  response.statusCode = 200;
  response.status = function status(code) {
    this.statusCode = code;
    return this;
  };
  await controller
    .getActiveRankingLeaderboard(
      {
        ...request,
        params: {
          ranking: "sub",
        },
      },
      response,
      (error) => {
        throw error;
      }
    );
  const board = response.body;
  check(
    lastRankingAccountFindFilter
      ?.activeRanking === "SUB",
    "Sub 계정 풀만 먼저 조회",
    lastRankingAccountFindFilter
  );
  check(
    lastRankingProfileFindFilter
      ?.status === "CONFIRMED",
    "확정된 랭킹 프로필만 조회",
    lastRankingProfileFindFilter
  );
  check(
    lastRankingProfileFindFilter
      ?.datasetOnly?.$ne ===
      true,
    "익명 데이터셋 프로필은 풀에서 제외",
    lastRankingProfileFindFilter
  );
  check(
    lastEligibleUserIds
      ?.join(",") ===
      "user-1,user-2",
    "Sub의 CONFIRMED 사용자만 공통 순위 서비스에 전달",
    lastEligibleUserIds
  );
  check(
    board.ranking === "SUB" &&
      board.total === 2,
    "Sub 풀만 별도 순위표로 반환",
    board
  );
  check(
    board.top[0].userId ===
      "user-2" &&
      board.top[0].rank === 1,
    "공통 순위 서비스가 매긴 풀 안 순서·등수 유지",
    board.top
  );
  check(
    board.me?.userId ===
      "user-1" &&
      board.me?.rank === 2,
    "내 행과 풀 순위를 별도 제공",
    board.me
  );

  await controller
    .getActiveRankingLeaderboard(
      {
        ...request,
        params: {
          ranking: "other",
        },
      },
      response,
      (error) => {
        throw error;
      }
    );
  check(
    response.statusCode === 400 &&
      response.body.code ===
        "INVALID_ACTIVE_RANKING",
    "알 수 없는 랭킹은 400으로 거부",
    response.body
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
