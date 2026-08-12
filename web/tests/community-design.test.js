"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const root = path.resolve(__dirname, "..");
const templatePath = path.join(root, "views/community.ejs");
const stylesheetPath = path.join(root, "public/css/community-v2.css");

async function run() {
  const boardData = {
    board: "high-school",
    boardLabel: "통합 고등학교",
    search: "",
    sort: "newest",
    selectedOperationsCategory: "",
    operationsCategories: {},
    selectedSchool: null,
    selectedUniversity: null,
    popularPosts: [],
    posts: [
      {
        _id: "post-1",
        title: "수학 공부 순서를 어떻게 잡나요?",
        content: "공통수학 복습과 대수 선행 순서가 궁금합니다.",
        authorName: "익명 학생",
        authorSchoolGrade: 10,
        authorRegion: "서울",
        isAnonymous: true,
        isCommunityNotice: false,
        isBoardRulesNotice: false,
        isOperationsNotice: false,
        isPinned: false,
        isPopular: false,
        schoolName: "",
        viewCount: 14,
        upvoteCount: 3,
        downvoteCount: 0,
        publishedAt: "2026-08-11T09:00:00.000Z",
      },
    ],
    pagination: {
      total: 1,
      page: 1,
      totalPages: 1,
      hasPrevious: false,
      hasNext: false,
    },
  };

  const loggedOutHtml = await ejs.renderFile(templatePath, {
    user: null,
    feedback: null,
    boardData,
  });
  const loggedInHtml = await ejs.renderFile(templatePath, {
    user: { name: "테스트학생", schoolGrade: 10 },
    feedback: null,
    boardData,
  });
  const stylesheet = fs.readFileSync(stylesheetPath, "utf8");

  assert.match(loggedOutHtml, /href="\/login"[\s\S]*로그인하고 글쓰기/);
  assert.doesNotMatch(loggedOutHtml, /href="\/community\/new\?board=high-school"/);
  assert.match(loggedInHtml, /href="\/community\/new\?board=high-school"[\s\S]*새 글 쓰기/);
  assert.match(loggedOutHtml, /서울 OO고등학교 1학년/);
  assert.match(loggedOutHtml, /수학 공부 순서를 어떻게 잡나요\?/);
  assert.doesNotMatch(loggedOutHtml, /<span>0[123]<\/span>/);
  assert.doesNotMatch(loggedOutHtml, /<br>\s*<span>/);
  assert.doesNotMatch(loggedOutHtml, /☷/);

  assert.doesNotMatch(stylesheet, /(?:linear|radial|conic)-gradient\s*\(/);
  assert.match(stylesheet, /var\(--matths-action-primary\)/);
  assert.match(stylesheet, /\.community-hero > a\s*\{[\s\S]*min-height:\s*46px/);
  assert.match(stylesheet, /\.community-post-list > a:hover\s*\{[\s\S]*var\(--motion-lift\)/);
  assert.match(
    stylesheet,
    /@media\s*\(max-width:\s*760px\)[\s\S]*\.community-board-tabs\s*\{[\s\S]*grid-template-columns:\s*1fr/,
    "좁은 폭에서는 게시판 탭을 한 열로 접어야 합니다.",
  );

  console.log("community access boundary and visual hierarchy contract passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
