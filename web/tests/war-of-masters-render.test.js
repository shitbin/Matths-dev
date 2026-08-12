"use strict";

// GOAT Arena 허브와 현재 랭킹 화면을 실제 EJS로 렌더해, 주요 행동과
// 현재 사용자 행의 접근성 속성이 최종 HTML에서 보존되는지 확인한다.
const assert = require("node:assert/strict");
const ejs = require("ejs");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

function renderView(name, locals) {
  const filename = path.join(repoRoot, `views/${name}.ejs`);
  return ejs.render(fs.readFileSync(filename, "utf8"), locals, { filename });
}

const baseHub = {
  user: { _id: "u1", name: "이수빈", schoolGrade: 12 },
  arenaUser: {
    nickname: "이수빈",
    displayName: "맵쓰수학왕",
    schoolName: "경기외고",
    gradeLabel: "고등학교 3학년",
    displayMode: "닉네임",
  },
  tiers: [],
  placement: {
    status: "not-started",
    attemptId: null,
    answeredCount: 0,
    ctaLabel: "입단 배치고사 시작",
    ctaHref: null,
    result: null,
  },
  paidPackageAccess: { active: false },
  privateMockEligibility: {
    status: "not-eligible",
    allowed: false,
    ctaHref: null,
    ctaLabel: null,
    message: "배치 완료 후 열립니다.",
  },
};

for (const arena of [
  {
    locked: true,
    mmr: null,
    tier: null,
    tierLabel: null,
    rankPoint: 0,
    division: null,
    status: "PROVISIONAL",
    overallRank: null,
    percentile: null,
    recentPerformances: [],
  },
  {
    locked: false,
    mmr: 1180,
    tier: "EMERALD",
    tierLabel: "에메랄드",
    rankPoint: 66,
    division: "MAIN",
    status: "CONFIRMED",
    overallRank: 7,
    percentile: 0.93,
    recentPerformances: [0.7],
  },
]) {
  const html = renderView("war-of-masters", { ...baseHub, arena });
  assert.match(html, /href="\/goat-arena"[\s\S]*?>\s*<span class="goat-arena-entry-copy">/);
  assert.match(html, /href="\/war-of-masters\/rankings"/);
  assert.match(html, /href="\/profile#nickname-settings"/);
  assert.doesNotMatch(html, /점 남았습니다|2,350/);
}

const rankingsHTML = renderView("war-of-masters-rankings", {
  user: { _id: "u1", name: "이수빈", schoolGrade: 12 },
  ranking: {
    latestCalculatedAt: new Date("2026-08-10T00:00:00.000Z"),
    currentFinal: {
      userId: "u1",
      displayName: "맵쓰수학왕",
      affiliationName: "경기외고",
      division: "MAIN",
      finalRank: 7,
      finalRating: 1412,
    },
    finalOverall: [
      {
        userId: "u1",
        displayName: "맵쓰수학왕",
        affiliationName: "경기외고",
        division: "MAIN",
        finalRank: 7,
        finalRating: 1412,
        rankDelta: 2,
      },
      {
        userId: "u2",
        displayName: "다른학생",
        affiliationName: "서울고",
        division: "SUB",
        finalRank: 8,
        finalRating: 1390,
        rankDelta: 0,
      },
    ],
    schoolRankings: [],
    universityRankings: [],
    retakerRankings: [],
    workerRankings: [],
  },
});

assert.match(rankingsHTML, /data-current-ranker aria-current="true"/);
assert.doesNotMatch(rankingsHTML, /aria-current=&(?:#34|quot);/);
assert.match(rankingsHTML, />Ranked<\/span>/);
assert.match(rankingsHTML, />Unranked<\/span>/);

console.log("GOAT Arena hub and ranking render contracts passed");
