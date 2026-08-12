"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const root = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");
const render = (name, locals) =>
  ejs.renderFile(path.join(root, "views", name), locals);

function relativeLuminance(hex) {
  const channels = String(hex)
    .match(/[0-9a-f]{2}/gi)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

function cssHexVariable(stylesheet, name) {
  const match = stylesheet.match(
    new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"),
  );
  assert.ok(match, `--${name} 색상 토큰을 찾지 못했습니다.`);
  return match[1];
}

const parentLocals = (stats) => ({
  dashboard: { stats },
  child: {
    name: "테스트학생",
    realName: "김학생",
    schoolGrade: 10,
    school: { name: "서울고등학교" },
    currentStreak: 0,
    totalStudySeconds: 0,
  },
  currentFinal: null,
  affiliationRanking: null,
  currentArena: null,
  familyChildren: [
    {
      childId: "child-1",
      child: { name: "테스트학생", realName: "김학생" },
    },
  ],
  selectedChildId: "child-1",
  welcome: false,
  linked: false,
});

async function run() {
  const landingStyles = read("public/css/index.css");
  assert.match(
    landingStyles,
    /@media\s*\(min-width:\s*901px\)\s*and\s*\(max-width:\s*1050px\)\s*\{[\s\S]*?\.arena-hero h1\s*\{[\s\S]*?white-space:\s*normal;[\s\S]*?\.arena-hero h1 span,[\s\S]*?\.arena-hero h1 strong\s*\{[\s\S]*?display:\s*block;/,
    "901~1050px 랜딩 헤드라인은 랭킹 카드와 겹치지 않도록 두 의미 단위로 줄바꿈해야 합니다.",
  );

  const emptyLanding = await render("index.ejs", {
    user: null,
    arenaSpotlight: null,
  });
  assert.match(emptyLanding, /이번 시즌 랭킹은 준비 중입니다/);
  assert.doesNotMatch(emptyLanding, /갱신 중|불러오는 중입니다/);

  const rankedLanding = await render("index.ejs", {
    user: null,
    arenaSpotlight: {
      available: true,
      seasonLabel: "시즌 1",
      topEntries: [
        { displayName: "테스트랭커", tierLabel: "골드", rankPoint: 1200 },
      ],
    },
  });
  assert.match(rankedLanding, /갱신 중/);
  assert.doesNotMatch(rankedLanding, /이번 시즌 랭킹은 준비 중입니다/);

  const storeStyles = read("public/css/store.css");
  assert.match(
    storeStyles,
    /@media\s*\(min-width:\s*901px\)\s*\{\s*\.study-hall-mobile-header\s*\{\s*display:\s*none;/,
    "수험관 모바일 헤더는 사이드바가 고정되는 901px부터 숨겨야 합니다.",
  );
  assert.doesNotMatch(
    storeStyles,
    /@media\s*\(min-width:\s*761px\)\s*\{\s*\.study-hall-mobile-header/,
  );

  const refreshStyles = read("public/css/product-refresh.css");
  assert.match(
    refreshStyles,
    /\.archive-intro > strong\s*\{[\s\S]*?color:\s*var\(--product-ink\);[\s\S]*?background:\s*var\(--product-surface-subtle\);[\s\S]*?border-color:\s*var\(--product-line\);/,
  );
  assert.match(
    refreshStyles,
    /\.notification-hero > div > p,[\s\S]*?\.notification-hero h2 strong,[\s\S]*?\.suggestion-hero > div > p\s*\{[\s\S]*?color:\s*var\(--product-action\);/,
  );
  assert.match(
    refreshStyles,
    /\.notification-hero dl div,[\s\S]*?\.suggestion-hero aside\s*\{[\s\S]*?background:\s*var\(--product-surface-subtle\);[\s\S]*?border-color:\s*var\(--product-line\);/,
  );

  const surface = cssHexVariable(refreshStyles, "product-surface");
  for (const token of ["product-ink", "product-muted", "product-action"]) {
    assert.ok(
      contrastRatio(cssHexVariable(refreshStyles, token), surface) >= 4.5,
      `${token}은 라이트 히어로 표면에서 4.5:1 이상이어야 합니다.`,
    );
  }

  const zeroSampleParent = await render(
    "parent-dashboard.ejs",
    parentLocals({
      correctRate: 0,
      weeklyStudyMinutes: 0,
      todayStudyMinutes: 0,
      todaySolvedProblems: 0,
      weeklySolvedProblems: 0,
    }),
  );
  assert.match(zeroSampleParent, /정답률<\/small><strong>—<\/strong>/);
  assert.match(zeroSampleParent, /아직 풀이 기록이 없습니다/);
  assert.doesNotMatch(zeroSampleParent, /오답률\s*100%/);

  const sampledParent = await render(
    "parent-dashboard.ejs",
    parentLocals({
      correctRate: 70,
      weeklyStudyMinutes: 20,
      todayStudyMinutes: 10,
      todaySolvedProblems: 4,
      weeklySolvedProblems: 10,
    }),
  );
  assert.match(sampledParent, /정답률<\/small><strong>70<em>%<\/em><\/strong>/);
  assert.match(sampledParent, /오답률 30%/);

  const parentStyles = read("public/css/parent-v2.css");
  assert.match(
    parentStyles,
    /@media\s*\(max-width:\s*800px\)\s*\{[\s\S]*?\.parent-hero\s*\{[\s\S]*?align-items:\s*flex-start;/,
    "학부모 히어로는 521~800px 세로 흐름에서도 왼쪽 정렬을 유지해야 합니다.",
  );

  const lockedMock = await render("private-mock-exams.ejs", {
    user: { name: "테스트학생", schoolGrade: 10 },
    examData: {
      eligibility: {
        allowed: false,
        title: "입단 배치고사를 먼저 완료해주세요.",
        message: "배치고사로 초기 실력을 확인한 회원만 응시할 수 있습니다.",
        ctaLabel: "배치고사 보러 가기",
        ctaHref: "/war-of-masters",
      },
      scheduleLabel: "매주 일요일 오후 3시·6시·9시, 최대 3회 응시",
      nextReleaseAt: "2026-08-16T06:00:00.000Z",
      durationMinutes: 100,
    },
  });
  assert.match(lockedMock, /class="private-mock-locked-preview"/);
  assert.match(lockedMock, /시험 일정/);
  assert.match(lockedMock, /A·B·C형 · 각 100분/);
  assert.match(lockedMock, /입장 → 답안 저장 → 제출/);

  const mockStyles = read("public/css/private-mock-exams.css");
  assert.match(
    mockStyles,
    /\.private-mock-locked-preview > div\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/,
  );
  assert.match(
    mockStyles,
    /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.private-mock-locked-preview > div\s*\{[\s\S]*?grid-template-columns:\s*1fr;/,
  );

  console.log("v8 visual P1 regression contracts passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
