const assert = require(
  "node:assert/strict"
);
const fs = require("node:fs");
const path = require(
  "node:path"
);

const {
  buildGoatArenaReadModel,
} = require(
  "../services/goatArenaReadService"
);

const now = new Date(
  "2026-07-12T12:00:00+09:00"
);

const readyPolicy = {
  minCompletedSubChallenges:
    2,
  subChallengeRequestLimit:
    null,
  newChallengeCutoffCycleDay:
    28,
  subNormalTakeoverCostDays:
    1,
  subRevengeCostDays: 2,
  completionPass: {
    opensAtKst: "00:00",
    deadlineAtKst: "23:59",
    allowedActivityTypes: [
      "PRACTICE",
    ],
  },
  minRecognizedProblemsPerDay:
    5,
  minValidStudySecondsPerDay:
    900,
  noShowCountsAsCompletedChallenge:
    false,
  arenaTierStepMappingVersion:
    "tier-v1",
  revengeBypassesShield:
    false,
};

function cycle(
  overrides = {}
) {
  return {
    _id: "cycle-1",
    status: "SUB_ACTIVE",
    activeRanking: "SUB",
    paidAccessStartsOn:
      "2026-07-01",
    paidAccessEndsOn:
      "2026-07-29",
    day30ReviewOn:
      "2026-07-30",
    refundChallengeDays: 30,
    lockedRefundDays: 0,
    bonusAccessDays: 0,
    lockedBonusDays: 0,
    cycleStreakDays: 30,
    completedSubNormalChallenges:
      2,
    completedSubRevengeChallenges:
      0,
    completedSubChallenges: 2,
    challengeRequestCount: 4,
    refundAttendanceConditionMet:
      true,
    refundBalanceConditionMet:
      true,
    refundMinimumChallengeConditionMet:
      true,
    refundEligible: true,
    refundStatus: "ELIGIBLE",
    integrityState: "CLEAR",
    ...overrides,
  };
}

function build(
  overrides = {}
) {
  return buildGoatArenaReadModel({
    userId: "user-1",
    user: {
      _id: "user-1",
      name: "수학왕",
      school: {
        name: "경기외고",
      },
    },
    cycle: cycle(),
    policy: readyPolicy,
    season: {
      _id: "season-object-id",
      seasonId:
        "2026-season-1",
      title: "GOAT Arena 1",
      status: "ACTIVE",
      startsAt:
        "2026-07-01T00:00:00.000Z",
      endsAt:
        "2026-08-01T00:00:00.000Z",
    },
    rankingProfile: {
      status: "CONFIRMED",
      mmr: 1510,
      tier: "GOLD",
      rankPoint: 42,
      overallRank: 12,
    },
    arenaProfile: {
      status: "ACTIVE",
      arenaPosition: 7,
      mmrAtLastSeed: 1490,
      seededAt:
        "2026-07-07T00:00:00.000Z",
      seedWeekKey:
        "2026-W28",
      rankShieldUntil: null,
    },
    activeMatch: null,
    now,
    ...overrides,
  });
}

const snapshot = build();

assert.equal(
  snapshot.state,
  "ACTIVE_CYCLE"
);
assert.equal(
  snapshot.cycle.cycleDay,
  12
);
assert.equal(
  snapshot.cycle.phase,
  "PAID_ACCESS"
);
assert.deepEqual(
  snapshot.cycle.balances,
  {
    refundAvailableDays: 30,
    refundLockedDays: 0,
    bonusAvailableDays: 0,
    bonusLockedDays: 0,
    source:
      "LEDGER_DERIVED_CACHE",
  },
  "Sub/Main 자산을 합치지 않는다"
);
assert.equal(
  snapshot.ranking.skill.mmr,
  1510
);
assert.equal(
  snapshot.ranking.seat
    .arenaPosition,
  7
);
assert.equal(
  snapshot.ranking.contract,
  "MMR_AND_ARENA_POSITION_ARE_SEPARATE",
  "MMR과 Arena 좌석을 한 등수로 합치지 않는다"
);
assert.equal(
  snapshot.payback.eligible,
  true
);
assert.deepEqual(
  snapshot.payback.conditions.map(
    (condition) => [
      condition.key,
      condition.current,
      condition.required,
      condition.met,
    ]
  ),
  [
    [
      "CYCLE_ATTENDANCE",
      30,
      30,
      true,
    ],
    [
      "REFUND_DAY_BALANCE",
      30,
      30,
      true,
    ],
    [
      "COMPLETED_SUB_CHALLENGES",
      2,
      2,
      true,
    ],
  ]
);

const pendingPolicy = build({
  policy: {
    ...readyPolicy,
    completionPass: {
      cycleDay: 30,
    },
    minRecognizedProblemsPerDay:
      null,
  },
});
assert.equal(
  pendingPolicy.payback.state,
  "POLICY_PENDING"
);
assert.equal(
  pendingPolicy.payback.eligible,
  null,
  "미확정 정책으로 페이백 가능 여부를 추측하지 않는다"
);
assert.ok(
  pendingPolicy.payback.blockers
    .some(
      (blocker) =>
        blocker.code ===
        "POLICY_PENDING"
    )
);

const matchBlocked = build({
  activeMatch: {
    _id: "match-object-id",
    matchId: "match-1",
    status: "MATCHED",
    activeRanking: "SUB",
    matchType: "NORMAL",
    challengerUserId:
      "user-1",
    defenderUserId:
      "user-2",
    challengerPositionBefore:
      7,
    defenderPositionBefore:
      6,
    challengeCostSnapshot: {
      assetType:
        "REFUND_CHALLENGE_DAY",
      stakeDays: 1,
    },
    startsBy:
      "2026-07-12T05:10:00.000Z",
    submitsBy:
      "2026-07-12T05:40:00.000Z",
    integrityState: "CLEAR",
  },
  activeAttempt: {
    status: "SUBMITTED",
    startedAt:
      "2026-07-12T03:00:00.000Z",
    endsAt:
      "2026-07-12T03:20:00.000Z",
    submittedAt:
      "2026-07-12T03:18:00.000Z",
  },
});
assert.equal(
  matchBlocked.payback.eligible,
  false
);
assert.ok(
  matchBlocked.payback.blockers
    .some(
      (blocker) =>
        blocker.code ===
        "ACTIVE_MATCH"
    )
);
assert.equal(
  matchBlocked.activeMatch.role,
  "CHALLENGER"
);
assert.equal(
  matchBlocked.activeMatch.stake.days,
  1
);
assert.deepEqual(
  matchBlocked.activeMatch.attempt,
  {
    status: "SUBMITTED",
    startedAt:
      "2026-07-12T03:00:00.000Z",
    endsAt:
      "2026-07-12T03:20:00.000Z",
    submittedAt:
      "2026-07-12T03:18:00.000Z",
  },
  "활성 매치에는 상대 시도가 아닌 현재 사용자의 개인 시도 상태만 포함한다"
);

const noCycle = build({
  cycle: null,
  policy: null,
  arenaProfile: null,
  activeMatch: null,
});
assert.equal(
  noCycle.state,
  "NO_ACTIVE_CYCLE"
);
assert.equal(
  noCycle.cycle,
  null
);
assert.equal(
  noCycle.payback.eligible,
  null
);
assert.equal(
  noCycle.ranking.skill.mmr,
  1510,
  "패키지가 없어도 기존 MMR 정본은 보존한다"
);

const json =
  JSON.stringify(snapshot);
assert.doesNotMatch(
  json,
  /coin|wallet/i,
  "금지된 코인·현금 지갑 계약을 만들지 않는다"
);

const routes = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "routes/api-routes.js"
  ),
  "utf8"
);
for (const route of [
  "/me/access-cycle",
  "/me/payback-progress",
  "/goat-arena",
]) {
  assert.ok(
    routes.includes(route),
    `${route} 라우트 등록`
  );
}

console.log(
  "goat arena read model tests passed"
);
