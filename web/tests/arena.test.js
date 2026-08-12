// 실행:  node webrepo-applied/tests/arena.test.js
//
// GET /api/v1/arena · /arena/leaderboard 를 DB 없이 실행한다.
//
// **이 테스트가 지키는 것은 하나다: 앱이 웹과 같은 숫자를 본다.**
// 그래서 여기서 티어 경계나 rankPoint 식을 다시 적지 않는다 —
// 전부 services/mmrService.js(실 레포에서 그대로 옮겨 온 파일)에서 읽어 대조한다.
// 상수를 이 파일에 베껴 두면, 레포가 바뀌었을 때 테스트가 옛 값을 지켜 버린다.
const path = require("path");
const REPO = path.resolve(__dirname, "..");
const modelPath = require.resolve(path.join(REPO, "models/matthsModel.js"));
const identityPath = require.resolve(path.join(REPO, "services/userIdentityService.js"));
const rankingServicePath = require.resolve(path.join(REPO, "services/rankingService.js"));

let profileRows = [];
let myProfile = null;
let userRows = [];
let rankingData = {
  current: null,
  cohortSize: 0,
  overall: [],
};
let requestedRankingUserId = null;

// **정렬을 실제로 수행하는 스텁.** 인자를 버리면 정렬 버그를 못 잡는다 —
// 실제로 `.sort({overallRank:1})` 로 두는 바람에 등수 없는(null) 프로필이 맨 위로
// 올라오는 결함이 이 테스트를 통과했었다(2026-07-30).
const chain = (rows) => {
  let out = rows.slice();
  const api = {
    sort(spec) {
      const keys = Object.entries(spec || {});
      out = out.slice().sort((a, b) => {
        for (const [k, dir] of keys) {
          // MongoDB 는 null 을 숫자보다 **앞**에 둔다. 그 성질까지 흉내 내야
          // 정렬 키를 잘못 고른 것을 테스트가 잡아낸다.
          const av = a[k] == null ? -Infinity : a[k];
          const bv = b[k] == null ? -Infinity : b[k];
          if (av < bv) return dir >= 0 ? -1 : 1;
          if (av > bv) return dir >= 0 ? 1 : -1;
        }
        return 0;
      });
      return api;
    },
    limit(n) { out = out.slice(0, n); return api; },
    select() { return api; },
    lean: async () => out,
  };
  return api;
};

require.cache[modelPath] = {
  id: modelPath, filename: modelPath, loaded: true, exports: {
    RankingProfile: {
      findOne: () => ({ lean: async () => myProfile }),
      find: () => chain(profileRows),
    },
    User: { find: () => chain(userRows) },
    AssessmentAttempt: { find: () => chain([]) },
    ConceptProgress: {}, LearningEvent: {}, Problem: {}, ProblemAttempt: {},
    PrivateMockExamAttempt: {}, PrivateMockWeeklyResult: {},
  },
};
require.cache[identityPath] = {
  id: identityPath, filename: identityPath, loaded: true,
  exports: { getRankingDisplayName: (u) => String(u.name || "학생") },
};
require.cache[rankingServicePath] = {
  id: rankingServicePath,
  filename: rankingServicePath,
  loaded: true,
  exports: {
    getRankingData: async (currentUserId) => {
      requestedRankingUserId = String(currentUserId);
      return rankingData;
    },
  },
};

const ctrl = require(path.join(REPO, "controllers/ipadSyncController.js"));
const mmr = require(path.join(REPO, "services/mmrService.js"));
const res = { json(b) { this.body = b; return this; } };
const user = { _id: "u1", name: "이수빈", school: { name: "경기외고" }, preferences: {} };

(async () => {
  const fails = [];
  const ok = (c, label, got) =>
    c ? console.log(`  ✓ ${label}`)
      : (fails.push(label), console.log(`  ✗ ${label} — 실제: ${JSON.stringify(got)}`));

  // ── 배치고사 전: 프로필이 없다 ─────────────────────────────────────
  myProfile = null;
  await ctrl.getArena({ apiUser: user }, res);
  ok(res.body.arena.locked === true, "프로필 없으면 잠금", res.body.arena);
  ok(res.body.arena.mmr === null, "잠금이면 MMR 은 null(0 점 아님)", res.body.arena.mmr);

  // ── 사다리는 mmrService 를 그대로 내려보낸다 ────────────────────────
  const ladder = res.body.ladder;
  ok(ladder.length === mmr.TIER_CONFIG.length, "사다리 티어 수 일치", ladder.length);
  ok(ladder.every((t, i) => t.name === mmr.TIER_CONFIG[i].name
                         && t.minMmr === mmr.TIER_CONFIG[i].minMmr),
     "사다리 이름·하한이 mmrService 와 일치", ladder.map((t) => `${t.name}:${t.minMmr}`));
  ok(ladder[ladder.length - 1].maxMmr === null,
     "최상위 상한은 null (Infinity 는 JSON 에 못 담는다)", ladder[ladder.length - 1]);
  ok(JSON.parse(JSON.stringify(ladder)).length === ladder.length,
     "사다리가 JSON 직렬화를 통과한다", "ok");

  // ── 프로필이 있으면 저장값을 그대로 내려보낸다 ──────────────────────
  myProfile = {
    userId: "u1", mmr: 1180, tier: "EMERALD", rankPoint: 66,
    status: "CONFIRMED", overallRank: 7, percentile: 0.93,
    recentPerformances: [0.7, 0.6], weeklyExamsUntilConfirmed: 0,
  };
  await ctrl.getArena({ apiUser: user }, res);
  const a = res.body.arena;
  ok(a.locked === false, "프로필 있으면 잠금 해제", a.locked);
  ok(a.mmr === 1180, "MMR 을 다시 계산하지 않고 그대로 내려보낸다", a.mmr);
  ok(a.tier === "EMERALD" && a.tierLabel === "에메랄드", "티어와 한글 라벨", [a.tier, a.tierLabel]);
  ok(a.division === mmr.divisionFromRankPoint(66), "디비전은 mmrService 식과 동일", a.division);
  ok(a.overallRank === 7, "서버가 매긴 등수를 그대로 쓴다", a.overallRank);
  ok(!("rating" in a), "레거시 rating 을 섞지 않는다(명세 9.3)", Object.keys(a));

  // ── 티어 경계는 mmrService 가 정한다 ────────────────────────────────
  ok(mmr.findBaseTier(799).name === "BRONZE" && mmr.findBaseTier(800).name === "SILVER",
     "실버 경계 800", [mmr.findBaseTier(799).name, mmr.findBaseTier(800).name]);
  ok(mmr.findBaseTier(1519).name === "GRANDMASTER" && mmr.findBaseTier(1520).name === "CHALLENGER",
     "챌린저 경계 1520", [mmr.findBaseTier(1519).name, mmr.findBaseTier(1520).name]);

  // ── 순위표: 웹 rankingService 결과의 얇은 DTO 어댑터 ───────────────
  rankingData = {
    cohortSize: 2,
    overall: [
      {
        userId: "u2",
        displayName: "상대",
        rank: 1,
        rating: 1180,
        tier: "에메랄드",
        division: "II",
        rankPoint: 76,
        rankingStatus: "confirmed",
        placementScore: 94.2,
      },
      {
        userId: "u1",
        displayName: "이수빈",
        rank: 2,
        rating: 1180,
        tier: "에메랄드",
        division: "III",
        rankPoint: 66,
        rankingStatus: "provisional",
        placementScore: 91.1,
      },
    ],
    current: {
      userId: "u1",
      displayName: "이수빈",
      rank: 2,
      overallRank: 2,
      rating: 1180,
      tier: "에메랄드",
      division: "III",
      rankPoint: 66,
      rankingStatus: "provisional",
      placementScore: 91.1,
    },
  };
  await ctrl.getArenaLeaderboard({ apiUser: user }, res);
  const b = res.body;
  ok(requestedRankingUserId === "u1",
     "현재 사용자를 웹 rankingService에 전달", requestedRankingUserId);
  ok(b.total === 2 && b.top.map((row) => row.rank).join(",") === "1,2",
     "웹이 매긴 순서·등수를 다시 계산하지 않고 유지", b);
  ok(b.top[0].tier === "EMERALD" && b.top[0].tierLabel === "에메랄드",
     "웹 한글 티어를 앱 코드·라벨 DTO로 변환", b.top[0]);
  ok(b.top[1].status === "PROVISIONAL" && b.top[1].isMe === true,
     "상태 대소문자와 내 행 표시를 앱 계약에 맞춤", b.top[1]);
  ok(b.me && b.me.rank === 2 && b.me.mmr === 1180,
     "웹 current를 내 행으로 별도 제공", b.me);
  ok(b.top.every((row) => !("placementScore" in row) && !("totalScore" in row)),
     "원점수·배치점수는 앱 순위 DTO에서 제거", Object.keys(b.top[0]));

  // top 20 밖의 내 순위도 current로 보존한다.
  const topTwenty = Array.from({ length: 20 }, (_, index) => ({
    userId: `other-${index + 1}`,
    displayName: `상대${index + 1}`,
    rank: index + 1,
    rating: 1600 - index,
    tier: "챌린저",
    division: "I",
    rankPoint: 90,
    rankingStatus: "CONFIRMED",
  }));
  rankingData = {
    cohortSize: 21,
    overall: [
      ...topTwenty,
      {
        userId: "u1",
        displayName: "이수빈",
        rank: 21,
        rating: 1180,
        tier: "에메랄드",
        division: "III",
        rankPoint: 66,
        rankingStatus: "CONFIRMED",
      },
    ],
    current: {
      userId: "u1",
      displayName: "이수빈",
      overallRank: 21,
      rating: 1180,
      tier: "에메랄드",
      division: "III",
      rankPoint: 66,
      rankingStatus: "CONFIRMED",
    },
  };
  await ctrl.getArenaLeaderboard({ apiUser: user }, res);
  ok(res.body.top.length === 20 && !res.body.top.some((row) => row.isMe),
     "top은 20명으로 제한", res.body.top.length);
  ok(res.body.me?.rank === 21 && res.body.me?.isMe === true,
     "top 밖의 내 행도 current로 반환", res.body.me);

  // ── 아무도 없을 때 ─────────────────────────────────────────────────
  rankingData = { current: null, cohortSize: 0, overall: [] };
  await ctrl.getArenaLeaderboard({ apiUser: user }, res);
  ok(res.body.total === 0 && res.body.top.length === 0 && res.body.me === null,
     "참가자가 없으면 빈 순위표(지어내지 않는다)", res.body);

  console.log(fails.length ? `\n실패 ${fails.length}건` : "\n전부 통과");
  process.exit(fails.length ? 1 : 0);
})();
