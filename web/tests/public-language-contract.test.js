"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

function collectEJSFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectEJSFiles(absolutePath);
    return entry.isFile() && entry.name.endsWith(".ejs") ? [absolutePath] : [];
  });
}

const allViewFiles = collectEJSFiles(path.join(repoRoot, "views"));

const landingView = fs.readFileSync(path.join(repoRoot, "views/index.ejs"), "utf8");
assert.match(
  landingView,
  /<h1 id="arena-hero-title"><span>고등수학<\/span> <strong>1 vs 1 랭크전<\/strong><\/h1>/,
  "랜딩 히어로는 한 줄의 구체적인 제품 문장과 Regular/Bold 구조를 사용해야 합니다.",
);
assert.doesNotMatch(
  landingView,
  /같은 문제, 같은 시간|실력으로 올라가세요|두 학생이 검산된 주관식 5문항/,
  "랜딩 히어로에 긴 홍보 문구를 다시 추가하면 안 됩니다.",
);
assert.match(landingView, /주관식 5개/);
assert.match(landingView, /문항당 10분/);
assert.match(landingView, /220개념/);
assert.doesNotMatch(
  landingView,
  /등급을 빼앗아라|짧은 수학 승부|39개/,
  "랜딩은 실제 경기·커리큘럼 범위와 충돌하거나 손실 추격을 자극하는 문구를 사용하면 안 됩니다.",
);

const landingStylesheet = fs.readFileSync(path.join(repoRoot, "public/css/index.css"), "utf8");
assert.match(
  landingStylesheet,
  /\.arena-hero h1\s*\{[\s\S]*?font-weight:\s*480;/,
  "랜딩 제목의 기본 어조는 Regular/Medium 웨이트여야 합니다.",
);
assert.match(
  landingStylesheet,
  /\.arena-hero h1 strong\s*\{[\s\S]*?font-weight:\s*880;/,
  "랜딩 제목의 핵심 구절만 Bold 웨이트로 강조해야 합니다.",
);
assert.match(
  landingStylesheet,
  /\.learning-proof \.hero-copy h2\s*\{[\s\S]*?font-weight:\s*480;/,
  "학습 섹션 제목도 Regular와 Bold의 대비를 유지해야 합니다.",
);

const studyHallView = fs.readFileSync(path.join(repoRoot, "views/store.ejs"), "utf8");
assert.doesNotMatch(
  studyHallView,
  /MATTHS EXAM PREP|<small>SERIES<\/small>|운영자가 콘텐츠를 공개/,
  "수험관은 내부 코드·운영 절차가 아니라 학생이 이해하는 한국어를 사용해야 합니다.",
);

const publicNavigation = fs.readFileSync(
  path.join(repoRoot, "views/partials/public-navigation.ejs"),
  "utf8",
);
assert.match(
  publicNavigation,
  /<img[\s\S]*class="brand-logo"[\s\S]*src="\/images\/brand\/matths-logo\.svg"/,
  "공개 내비게이션은 공식 Primary Identity SVG 전체 락업을 사용해야 합니다.",
);
assert.doesNotMatch(
  publicNavigation,
  /class="brand-mark"|<span>\s*Matths\s*<\/span>/,
  "공식 심볼 옆에 Matths 워드마크를 일반 텍스트로 재입력하면 안 됩니다.",
);
assert.match(
  publicNavigation,
  /class="mobile-primary-action"[\s\S]*?<%= publicStartLabel %>/,
  "560px 이하에서도 가입 또는 학습 계속하기 주 행동을 숨기면 안 됩니다.",
);
assert.match(
  publicNavigation,
  /data-public-mobile-menu[\s\S]*?aria-current="page"/,
  "모바일 공개 내비게이션도 현재 페이지를 보조기기에 전달해야 합니다.",
);

const dashboardNavigation = fs.readFileSync(
  path.join(repoRoot, "views/partials/dashboard-navigation.ejs"),
  "utf8",
);
const dashboardTheme = fs.readFileSync(
  path.join(repoRoot, "public/css/matths-theme.css"),
  "utf8",
);
assert.match(
  dashboardTheme,
  /\.sidebar \.brand\s*\{[\s\S]*?width:\s*41px;[\s\S]*?overflow:\s*hidden;/,
  "네이비 사이드바에서는 공식 락업의 검은 워드마크가 묻히지 않도록 심볼 부분만 노출해야 합니다.",
);

const studentLanguageViews = [
  "archive.ejs", "archive-public.ejs", "community-new.ejs", "contact.ejs",
  "community-announcement.ejs", "community-notice.ejs", "goat-arena-payback-account-confirm.ejs",
  "goat-arena-profile.ejs", "goat-arena-rulebook.ejs", "goat-arena-supplemental-evidence.ejs",
  "log-curriculum.ejs", "main.ejs", "my-learning.ejs", "partials/concept-experience.ejs",
  "nickname-change.ejs", "notification-detail.ejs", "password-reset.ejs", "register.ejs",
  "unit-learning.ejs", "wrong-note-review.ejs",
];
const decorativeEnglishLabels = /WEEKLY ACTIVITY|CURRICULUM CATALOG|COURSE PROGRESS|COMMON MATHEMATICS|CONTACT FORM|SUPPORT PROCESS|MY INQUIRIES|NEW POST|NOTIFICATION DETAIL|SECURE RESET|CONCEPT LIST|QUESTION-SPECIFIC REVIEW|START MATTHS|CREATE ACCOUNT|ACCOUNT SAFETY|READ THIS FIRST|CURATED MATERIALS|ADMIN UPLOAD|ALL FILES|WRONG NOTE REVIEW|NOW PLAYING|PAYBACK ACCOUNT CHECK|SUPPLEMENTAL EVIDENCE|SESSION CONTROL|MATTHS OFFICIAL|MATTHS NOTICE|MATTHS SUPPORT/;
for (const relativePath of studentLanguageViews) {
  const source = fs.readFileSync(path.join(repoRoot, "views", relativePath), "utf8");
  assert.doesNotMatch(
    source,
    decorativeEnglishLabels,
    `${relativePath}의 장식용 영문 eyebrow는 학생이 바로 이해하는 한국어여야 합니다.`,
  );
}
assert.doesNotMatch(
  fs.readFileSync(path.join(repoRoot, "views/log-curriculum.ejs"), "utf8"),
  /category\.englishTitle\s*\|\|/,
  "교육과정 화면은 내부 영문 분류명을 장식용 레이블로 노출하면 안 됩니다.",
);
assert.doesNotMatch(
  fs.readFileSync(path.join(repoRoot, "views/goat-arena.ejs"), "utf8"),
  /arena-seed-pending[^>]*>\s*\?\s*</,
  "배치 전 Arena 상태를 물음표 임시 휘장으로 표시하면 안 됩니다.",
);

const arenaNavigation = fs.readFileSync(
  path.join(repoRoot, "views/partials/goat-arena-navigation.ejs"),
  "utf8",
);
assert.match(arenaNavigation, /src="\/images\/brand\/matths-symbol\.svg"/);
assert.doesNotMatch(
  arenaNavigation,
  /goat-arena-logo\.jpg|>\s*✉\s*</,
  "Arena 공통 셸은 생성형 JPEG 로고나 글꼴 의존 우편함 문자를 사용하면 안 됩니다.",
);
assert.match(arenaNavigation, /class="arena-nav-alert-count"/);
assert.match(dashboardNavigation, /label: "오늘"/);
assert.match(dashboardNavigation, /label: "학습"/);
assert.match(dashboardNavigation, /label: "경쟁과 자료"/);
assert.doesNotMatch(
  dashboardNavigation,
  /icon:\s*"[♜◆⌂▦◫⚡✓↻✦⚙]"/,
  "대시보드 주요 내비게이션에 글꼴 의존 특수문자 아이콘을 사용하면 안 됩니다.",
);
assert.match(
  dashboardNavigation,
  /include\("dashboard-nav-icon"/,
  "대시보드 아이콘은 공용 벡터 partial을 사용해야 합니다.",
);

const primaryIdentityPartial = fs.readFileSync(
  path.join(repoRoot, "views/partials/brand-primary-logo.ejs"),
  "utf8",
);
assert.match(
  primaryIdentityPartial,
  /<img[\s\S]*class="brand-logo"[\s\S]*src="\/images\/brand\/matths-logo\.svg"/,
  "공용 브랜드 식별자는 공식 Primary Identity SVG 전체 락업이어야 합니다.",
);

const migratedBrandViews = [
  "archive.ejs",
  "assessment-attempt.ejs",
  "assessment-center.ejs",
  "coach-suggestions.ejs",
  "contact.ejs",
  "curriculum.ejs",
  "faq.ejs",
  "goat-arena-rulebook.ejs",
  "intro.ejs",
  "learning-flow.ejs",
  "log-curriculum.ejs",
  "login.ejs",
  "main.ejs",
  "my-learning.ejs",
  "nickname-change.ejs",
  "notification-detail.ejs",
  "notifications.ejs",
  "parent-link-child.ejs",
  "parent-login.ejs",
  "parent-register.ejs",
  "partials/admin-navigation.ejs",
  "partials/parent-navigation.ejs",
  "password-reset.ejs",
  "private-mock-exam.ejs",
  "private-mock-exams.ejs",
  "private-mock-integrity-case.ejs",
  "private-mock-objection.ejs",
  "private-mock-restriction.ejs",
  "profile.ejs",
  "quick-practice.ejs",
  "register.ejs",
  "store-product.ejs",
  "store.ejs",
  "unit-learning.ejs",
  "visual-learning.ejs",
  "war-of-masters-rankings.ejs",
  "war-of-masters.ejs",
  "wrong-note-review.ejs",
  "wrong-notes.ejs",
];

for (const relativePath of migratedBrandViews) {
  const source = fs.readFileSync(path.join(repoRoot, "views", relativePath), "utf8");
  assert.match(
    source,
    /include\("(?:partials\/)?brand-primary-logo"\)/,
    `${relativePath}는 공식 Primary Identity 공용 partial을 사용해야 합니다.`,
  );
}

for (const absolutePath of allViewFiles) {
  const source = fs.readFileSync(absolutePath, "utf8");
  assert.doesNotMatch(
    source,
    /War of GOAT/,
    `${path.relative(repoRoot, absolutePath)}에서 폐기된 서비스 이름을 다시 노출하면 안 됩니다.`,
  );
  assert.doesNotMatch(
    source,
    /class="[^"]*brand-mark[^"]*"[\s\S]{0,300}(?:>\s*Matths\s*<|<strong>\s*Matths\s*<\/strong>)/i,
    `${path.relative(repoRoot, absolutePath)}에서 공식 심볼과 typed Matths 워드마크를 재조합하면 안 됩니다.`,
  );
  assert.doesNotMatch(
    source,
    /(?:matths-symbol\.svg|>\s*M\s*<\/span>)[\s\S]{0,400}(?:>\s*Matths\s*<|<strong>\s*Matths\s*<\/strong>)/i,
    `${path.relative(repoRoot, absolutePath)}에서 class 이름을 바꿔 공식 심볼과 typed Matths 워드마크를 재조합하면 안 됩니다.`,
  );
  if (/goat-arena[^/]*\.ejs$/.test(absolutePath)) {
    assert.doesNotMatch(
      source,
      /goat-arena-logo\.jpg|type="image\/jpeg"/,
      `${path.relative(repoRoot, absolutePath)}는 구형 GOAT JPEG를 로고·파비콘으로 쓰면 안 됩니다.`,
    );
  }
}

[
  "services/placementExamService.js",
  "services/placementExamBank.js",
  "services/privateMockExamService.js",
  "content/email/privateMock.js",
].forEach((relativePath) => {
  const source = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
  assert.doesNotMatch(source, /War of GOAT/, `${relativePath} 사용자 문구는 GOAT Arena 이름을 사용해야 합니다.`);
});

// EJS 밖에서 error middleware와 경기 service가 직접 내보내는 상수도
// 브라우저·iPad 오류 문구가 된다. 내부 enum 이름은 허용하되 사용자에게
// 전달되는 문자열 값에는 서버 키 Division을 노출하지 않는다.
function javascriptConstantBlock(relativePath, start, end) {
  const source = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `${relativePath}에서 ${start} 상수를 찾지 못했습니다.`);
  assert.notEqual(endIndex, -1, `${relativePath}에서 ${end} 경계를 찾지 못했습니다.`);
  return source.slice(startIndex, endIndex);
}

const javascriptUserCopyBlocks = [
  [
    "middleware/errorMiddleware.js",
    "const ERROR_COPY =",
    "function normalizedStatus",
  ],
  [
    "services/arenaMatchService.js",
    "const ELIGIBILITY_MESSAGES =",
    "const DAILY_COUNTED_MATCH_STATUSES",
  ],
  [
    "services/arenaDivisionRuleService.js",
    "const {",
    "module.exports =",
  ],
  [
    "services/arenaStandingService.js",
    "const mongoose",
    "module.exports =",
  ],
];

for (const [relativePath, start, end] of javascriptUserCopyBlocks) {
  const copy = javascriptConstantBlock(relativePath, start, end)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const literals = copy.match(
    /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,
  ) || [];
  for (const literal of literals) {
    assert.doesNotMatch(
      literal,
      /\bDivision\b/i,
      `${relativePath}의 공개 JavaScript 문자열에 내부 용어 Division을 노출하지 않는다`,
    );
  }
}

const primaryLogoHash = crypto
  .createHash("sha256")
  .update(
    fs.readFileSync(path.join(repoRoot, "public/images/brand/matths-logo.svg")),
  )
  .digest("hex");
assert.equal(
  primaryLogoHash,
  "f46fd23006c2a529f94f85a25ef34c3e577d072a9e925e4d6afe9f997d9a59d4",
  "Primary Identity SVG가 승인된 CI 스무딩 최종본과 다릅니다.",
);

const publicNavigationCSS = fs.readFileSync(
  path.join(repoRoot, "public/css/public-navigation.css"),
  "utf8",
);
const arenaCSS = fs.readFileSync(
  path.join(repoRoot, "public/css/goat-arena.css"),
  "utf8",
);
const rankedBattle = staticUserCopy("views/goat-arena-main-battle.ejs");
const unrankedBattle = staticUserCopy("views/goat-arena-sub-challenge.ejs");
const rankedShop = staticUserCopy("views/goat-arena-main-shop.ejs");
const arenaMatch = staticUserCopy("views/goat-arena-match.ejs");
assert.doesNotMatch(
  rankedBattle,
  /COMMAND CENTER|OPERATION 0|상위 전장|지휘소|매칭 서버 온라인|FRIENDLY MATCH/,
  "Ranked 경기 화면에 게임 콘솔·작전명 같은 장식 문구를 되살리면 안 됩니다.",
);
assert.match(rankedBattle, /경기 방식 선택/);
assert.match(rankedBattle, /조건 확인 후 매칭 신청/);
assert.match(rankedBattle, /순위에 반영되지 않는 경기/);
assert.doesNotMatch(
  unrankedBattle,
  /순위를\s*탈취|UNRANKED · 1대1|공정 자동 매칭/,
  "Unranked 신청 화면은 약탈 카피나 게임 장식 대신 실제 매칭 조건을 설명해야 합니다.",
);
assert.match(unrankedBattle, /조건이 맞는 상대 찾기/);
assert.match(unrankedBattle, /매치가 만들어지기 전에는 페이백 점수가 예치되지 않습니다/);
assert.doesNotMatch(
  rankedShop,
  /정산 완료 경기 ID|경기로 얻은 시간을/,
  "Ranked 상점은 내부 경기 ID 입력이나 보상 과장 문구를 학생에게 요구하지 않습니다.",
);
assert.match(rankedShop, /정산이 끝난 경기를 선택해주세요/);
assert.match(rankedShop, /승패나 GP를 사는 곳이 아닙니다/);
assert.doesNotMatch(
  arenaMatch,
  /VICTORY|DEFEAT|FIGHT!|NEXT ROUND|QUESTION|STYLE TITLE|ARENA CONTENDER|전장에 입장/,
  "실전 경기 화면의 상태와 결과는 장식용 영문 게임 카피보다 학생 언어를 우선합니다.",
);
assert.match(arenaMatch, /경기 화면에 입장했습니다/);
assert.match(arenaMatch, /준비 완료/);
assert.match(
  arenaCSS,
  /\.arena-main-navigation a,[\s\S]*?\.arena-sound-toggle strong\s*\{[\s\S]*?font-size:\s*13px/,
  "Arena 데스크톱 핵심 내비게이션은 11px 마이크로타입으로 돌아가면 안 됩니다.",
);
assert.match(
  publicNavigationCSS,
  /\.site-header \.brand-logo\s*\{[\s\S]*?width:\s*132px/,
  "디지털 Primary Identity는 CI 권장 최소 폭 120px 이상이어야 합니다.",
);
assert.match(
  publicNavigationCSS,
  /\.site-header \.button-primary\s*\{[\s\S]*?background:\s*var\(--matths-action-primary,\s*#7b4efc\)/i,
  "공개 상단의 주 CTA는 actionPrimary 바이올렛을 사용해야 합니다.",
);
assert.match(
  publicNavigationCSS,
  /\.site-header \.button-primary:hover\s*\{[\s\S]*?background:\s*var\(--matths-action-primary-hover,\s*#6339dc\)/i,
  "공개 상단의 주 CTA hover는 승인된 actionPrimary hover 색을 사용해야 합니다.",
);
assert.match(
  publicNavigationCSS,
  /@media \(max-width: 640px\)[\s\S]*?\.site-footer \.footer-inner\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?\.site-footer \.footer-brand\s*\{[\s\S]*?width:\s*132px;[\s\S]*?min-width:\s*120px;/,
  "320px 공개 푸터에서도 공식 Primary Identity를 작은 grid 칸으로 잘라내면 안 됩니다.",
);

function staticUserCopy(relativePath) {
  return fs
    .readFileSync(path.join(repoRoot, relativePath), "utf8")
    .replace(/<%[\s\S]*?%>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

for (const absolutePath of allViewFiles) {
  const relativePath = path.relative(repoRoot, absolutePath);
  const copy = staticUserCopy(relativePath);
  assert.doesNotMatch(
    copy,
    /\bDivision\b/,
    `${relativePath}의 사용자 문구에 내부 용어 Division을 노출하지 않는다`,
  );
}

const privacy = staticUserCopy("views/privacy.ejs");
assert.doesNotMatch(
  privacy,
  /운영 전 확인 사항|실제 운영 배포 시|정식 서비스 배포 전/,
  "공개 개인정보처리방침에 개발 체크리스트를 노출하지 않는다",
);
assert.match(privacy, /처리 국가/);
assert.match(privacy, /처리 항목/);
assert.match(privacy, /일시·방법/);
assert.match(privacy, /보유 기간/);
assert.match(privacy, /거부와 영향/);

const legalCSS = fs.readFileSync(
  path.join(repoRoot, "public/css/legal.css"),
  "utf8",
);
assert.match(legalCSS, /\.legal-document p,[\s\S]*?font-size:\s*16px/);
assert.match(legalCSS, /@media \(max-width: 960px\)[\s\S]*?\.legal-document tr/);

console.log("public language and legal responsive contracts passed");
