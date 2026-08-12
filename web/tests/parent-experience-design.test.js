"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const root = path.resolve(__dirname, "..");
const view = (name) => path.join(root, "views", name);
const stylesheet = fs.readFileSync(
  path.join(root, "public/css/parent-v2.css"),
  "utf8",
);
const parentViews = [
  "checkout.ejs",
  "minor-payment-consent.ejs",
  "parent-checkout.ejs",
  "parent-dashboard.ejs",
  "parent-link-child.ejs",
  "parent-login.ejs",
  "parent-notification-settings.ejs",
  "parent-payment-request.ejs",
  "parent-pricing.ejs",
  "parent-register.ejs",
];

const familyChildren = [
  {
    childId: "child-1",
    child: { name: "테스트학생", realName: "김학생" },
  },
];

async function run() {
  for (const filename of parentViews) {
    const source = fs.readFileSync(view(filename), "utf8");
    assert.match(
      source,
      /href="\/css\/parent-v2\.css"/,
      `${filename}가 학부모 공통 제품 정비층을 불러와야 합니다.`,
    );
  }

  const dashboardHtml = await ejs.renderFile(view("parent-dashboard.ejs"), {
    dashboard: {
      stats: {
        correctRate: 82,
        weeklyStudyMinutes: 145,
        todayStudyMinutes: 30,
        todaySolvedProblems: 18,
        weeklySolvedProblems: 72,
      },
    },
    child: {
      name: "테스트학생",
      realName: "김학생",
      schoolGrade: 10,
      school: { name: "서울고등학교" },
      currentStreak: 8,
      totalStudySeconds: 21_600,
    },
    currentFinal: { finalRank: 12, division: "MAIN", finalRating: 1830 },
    affiliationRanking: { rank: 3 },
    currentArena: { tier: "Gold", arenaDivision: "SUB", tierRank: 4, gp: 38 },
    familyChildren,
    selectedChildId: "child-1",
    welcome: false,
    linked: false,
  });
  assert.match(dashboardHtml, /김학생의 학습 흐름/);
  assert.match(dashboardHtml, /학습 알림 설정/);
  assert.match(dashboardHtml, /aria-current="page"[^>]*>학습 현황/);
  assert.doesNotMatch(dashboardHtml, /학습 흐름을 확인하세요/);

  const notificationsHtml = await ejs.renderFile(
    view("parent-notification-settings.ejs"),
    {
      childLink: {
        notificationSettings: {
          emailEnabled: true,
          lowLearning: { enabled: true, minimumMinutesPerDay: 20, consecutiveDays: 3 },
          inactivity: { enabled: true, days: 7 },
        },
      },
      dashboard: { stats: { weeklyStudyMinutes: 145, activeStudyDays: 5 } },
      child: { name: "테스트학생", realName: "김학생", lastLoginAt: null, lastStudyDate: null },
      parent: { email: "parent@example.com" },
      familyChildren,
      selectedChildId: "child-1",
      saved: false,
    },
  );
  assert.match(notificationsHtml, /학습 시간 기준/);
  assert.match(notificationsHtml, /로그인 공백 기준/);
  assert.doesNotMatch(notificationsHtml, /LOW LEARNING|INACTIVITY/);

  const openPricingHtml = await ejs.renderFile(view("parent-pricing.ejs"), {
    checkoutEnabled: true,
    child: { name: "테스트학생", realName: "김학생" },
    products: [
      {
        code: "LEARNING_PACKAGE_29",
        periodLabel: "29일",
        name: "29일 학습권 패키지",
        description: "29일 학습 이용권",
        amount: 29_000,
      },
    ],
    familyChildren,
    selectedChildId: "child-1",
  });
  assert.match(openPricingHtml, /김학생 학생의 이용권 선택/);
  assert.match(openPricingHtml, /href="\/parent\/checkout\/LEARNING_PACKAGE_29"/);
  assert.doesNotMatch(openPricingHtml, /결제를 준비하고 있습니다/);

  const loginHtml = await ejs.renderFile(view("parent-login.ejs"), {
    error: null,
    next: "/parent",
    oldInput: { identifier: "parent@example.com" },
  });
  assert.match(loginHtml, /학부모 계정/);
  assert.doesNotMatch(loginHtml, /MATTHS PARENT/);

  assert.doesNotMatch(stylesheet, /(?:linear|radial|conic)-gradient\s*\(/);
  assert.match(stylesheet, /\.parent-hero\s*\{[\s\S]*var\(--matths-surface\)/);
  assert.match(stylesheet, /\.parent-hero > a\s*\{[\s\S]*var\(--matths-action-primary\)/);
  assert.match(stylesheet, /\.parent-auth-form input,[\s\S]*min-height:\s*48px/);
  assert.match(
    stylesheet,
    /@media\s*\(max-width:\s*520px\)[\s\S]*\.parent-nav nav\s*\{[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/,
  );

  console.log("parent learning, notification and payment hierarchy contract passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
