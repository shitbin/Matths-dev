"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const root = path.resolve(__dirname, "..");
const viewsDirectory = path.join(root, "views");
const stylesheet = fs.readFileSync(
  path.join(root, "public/css/admin-v2.css"),
  "utf8",
);
const legacyAdminStylesheet = fs.readFileSync(
  path.join(root, "public/css/admin.css"),
  "utf8",
);
const adminViews = fs
  .readdirSync(viewsDirectory)
  .filter((name) => /^admin-.*\.ejs$/.test(name));

async function run() {
  assert.equal(adminViews.length, 24, "관리자 상위 화면 수가 바뀌면 전수 범위를 갱신해야 합니다.");
  for (const filename of adminViews) {
    const source = fs.readFileSync(path.join(viewsDirectory, filename), "utf8");
    assert.match(
      source,
      /href="\/css\/admin-v2\.css"/,
      `${filename}가 운영센터 공통 정비층을 불러와야 합니다.`,
    );
    const uppercaseLabels = [
      ...source.matchAll(
        /<(?:p|small|span)>([A-Z][A-Z0-9 &/·_-]{2,})<\/(?:p|small|span)>/g,
      ),
    ].map((match) => match[1]);
    assert.deepEqual(
      uppercaseLabels.filter(
        (label) => !["GOAT ARENA", "UNRANKED", "RANKED"].includes(label),
      ),
      [],
      `${filename}에 사용자 설명이 아닌 내부 영문 라벨이 남아 있습니다.`,
    );
  }

  const html = await ejs.renderFile(path.join(viewsDirectory, "admin-dashboard.ejs"), {
    user: { name: "운영자" },
    feedback: null,
    error: null,
    oldInput: {},
    adminTodoSummary: { pendingCount: 2, items: [] },
    adminData: {
      stats: {
        activeUsers: 120,
        activeParents: 44,
        pendingInquiries: 3,
        publishedAnnouncements: 2,
        archiveItems: 30,
        archiveFolders: 4,
      },
      revenue: {
        netRevenue: 290_000,
        todayRevenue: 29_000,
        grossApproved: 319_000,
        refunded: 29_000,
        cancelled: 0,
        updatedAt: "2026-08-11T09:00:00.000Z",
      },
      inquiries: [],
      announcements: [],
    },
  });
  assert.match(html, /관리자 운영센터/);
  assert.match(html, /현재 매출 지표/);
  assert.match(html, /처리할 관리자 알림 2개/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /href="\/css\/admin-v2\.css"/);

  assert.doesNotMatch(stylesheet, /(?:linear|radial|conic)-gradient\s*\(/);
  assert.match(stylesheet, /\.admin-heading,[\s\S]*background:\s*var\(--matths-surface\)/);
  assert.match(stylesheet, /\.admin-form input,[\s\S]*min-height:\s*44px/);
  assert.match(stylesheet, /\.danger-form button,[\s\S]*background:\s*var\(--matths-danger\)/);
  assert.match(stylesheet, /\.admin-table-wrap,[\s\S]*overflow-x:\s*auto/);
  assert.match(
    stylesheet,
    /@media\s*\(max-width:\s*520px\)[\s\S]*\.admin-main-nav\s*\{[\s\S]*overflow-x:\s*auto/,
  );
  assert.match(
    legacyAdminStylesheet,
    /\.admin-policy-card\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*100%;[\s\S]*?box-sizing:\s*border-box;/,
    "관리자 정책 카드는 320px에서 고정 min-content 폭으로 화면 밖에 나가면 안 됩니다.",
  );

  console.log("admin 24-view operation hierarchy and density contract passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
