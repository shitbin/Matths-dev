#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const widths = [320, 390, 768, 1024, 1440];
const viewportHeight = 1024;
const exactViewportCapture = path.join(repoRoot, "scripts", "captureExactViewport.js");
const profileVariables = {
  student: "MATTHS_CAPTURE_STUDENT_PROFILE",
  studentRanked: "MATTHS_CAPTURE_STUDENT_RANKED_PROFILE",
  parent: "MATTHS_CAPTURE_PARENT_PROFILE",
  admin: "MATTHS_CAPTURE_ADMIN_PROFILE",
};
const cookieVariables = {
  student: "MATTHS_CAPTURE_STUDENT_COOKIE",
  studentRanked: "MATTHS_CAPTURE_STUDENT_RANKED_COOKIE",
  parent: "MATTHS_CAPTURE_PARENT_COOKIE",
  admin: "MATTHS_CAPTURE_ADMIN_COOKIE",
};

const pages = [
  { slug: "landing", route: "/", role: "public" },
  { slug: "intro", route: "/intro", role: "public" },
  { slug: "faq", route: "/faq", role: "public" },
  { slug: "terms", route: "/terms", role: "public" },
  { slug: "privacy", route: "/privacy", role: "public" },
  { slug: "login", route: "/login", role: "public" },
  { slug: "register", route: "/register", role: "public" },
  { slug: "curriculum", route: "/curriculum", role: "public" },
  { slug: "visual-learning", route: "/visual-learning", role: "public" },
  { slug: "learning-flow", route: "/learning-flow", role: "public" },
  { slug: "pricing", route: "/pricing", role: "public" },
  { slug: "community", route: "/community", role: "public" },
  { slug: "parent-login", route: "/parent/login", role: "public" },

  { slug: "contact", route: "/contact", role: "student" },
  { slug: "main", route: "/main", role: "student" },
  { slug: "my-learning", route: "/my-learning", role: "student" },
  { slug: "log-curriculum", route: "/log-curriculum", role: "student" },
  { slug: "wrong-notes", route: "/wrong-notes", role: "student" },
  { slug: "assessments", route: "/assessments", role: "student" },
  { slug: "private-mock-exams", route: "/private-mock-exams", role: "student" },
  { slug: "account-restriction", route: "/account/private-mock-restriction", role: "student" },
  { slug: "quick-practice", route: "/quick-practice", role: "student" },
  { slug: "coach-suggestions", route: "/coach-suggestions", role: "student" },
  { slug: "archive", route: "/archive", role: "student" },
  { slug: "store", route: "/store", role: "student" },
  { slug: "notifications", route: "/notifications", role: "student" },
  { slug: "profile", route: "/profile", role: "student" },
  { slug: "goat-arena", route: "/goat-arena", role: "student" },
  { slug: "goat-arena-rulebook-sub", route: "/goat-arena/rules/sub", role: "student" },
  { slug: "goat-arena-rulebook-main", route: "/goat-arena/rules/main", role: "student" },
  { slug: "goat-arena-sub-challenge", route: "/goat-arena/sub/challenge", role: "student" },
  { slug: "goat-arena-main-battle", route: "/goat-arena/main/battle", role: "student", authProfile: "studentRanked" },
  { slug: "goat-arena-main-shop", route: "/goat-arena/main/shop", role: "student", authProfile: "studentRanked" },

  { slug: "parent-dashboard", route: "/parent", role: "parent" },
  { slug: "parent-notifications", route: "/parent/notifications", role: "parent" },
  { slug: "parent-pricing", route: "/parent/pricing", role: "parent" },

  { slug: "archive-admin", route: "/archive/admin", role: "admin" },
  { slug: "admin-store", route: "/admin/store", role: "admin" },
  { slug: "admin-dashboard", route: "/admin", role: "admin" },
  { slug: "admin-paybacks", route: "/admin/paybacks", role: "admin" },
  { slug: "admin-operations-guide", route: "/admin/operations-guide", role: "admin" },
  { slug: "admin-pdf-forensics", route: "/admin/pdf-forensics", role: "admin" },
  { slug: "admin-test-control", route: "/admin/test-control", role: "admin" },
  { slug: "admin-arena-policies", route: "/admin/arena-policies", role: "admin" },
  { slug: "admin-problem-banks", route: "/admin/problem-banks", role: "admin" },
  { slug: "admin-arena-matches", route: "/admin/arena-matches", role: "admin" },
  { slug: "admin-arena-audit", route: "/admin/arena-audit", role: "admin" },
  { slug: "admin-data-analysis", route: "/admin/data-analysis", role: "admin" },
  { slug: "admin-private-mock-exams", route: "/admin/private-mock-exams", role: "admin" },
  { slug: "admin-inquiries", route: "/admin/inquiries", role: "admin" },
  { slug: "admin-todos", route: "/admin/todos", role: "admin" },
  { slug: "admin-community", route: "/admin/community", role: "admin" },
  { slug: "admin-coach-suggestions", route: "/admin/coach-suggestions", role: "admin" },
  { slug: "admin-users", route: "/admin/users", role: "admin" },
];

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  if (!process.argv[index + 1]) throw new Error(`${name} 값이 필요합니다.`);
  return process.argv[index + 1];
}

function gitText(args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} 실패\n${result.stderr || result.stdout}`);
  }
  return String(result.stdout || "").trim();
}

function readSourceProvenance() {
  try {
    return {
      sourceCommit: gitText(["rev-parse", "HEAD"]),
      sourceTree: gitText(["rev-parse", "HEAD^{tree}"]),
      trackedWorkingTreeClean: gitText([
        "status",
        "--porcelain",
        "--untracked-files=no",
      ]) === "",
      sourceProvenance: "git",
    };
  } catch (gitError) {
    const releaseSourcePath = path.join(repoRoot, "RELEASE-SOURCE.json");
    if (!fs.existsSync(releaseSourcePath)) throw gitError;
    const releaseSource = JSON.parse(fs.readFileSync(releaseSourcePath, "utf8"));
    if (
      releaseSource.schemaVersion !== "MATTHS_RELEASE_SOURCE_V1" ||
      !/^[0-9a-f]{40}$/.test(releaseSource.commit || "") ||
      !/^[0-9a-f]{40}$/.test(releaseSource.tree || "")
    ) {
      throw new Error("RELEASE-SOURCE.json의 소스 식별자가 유효하지 않습니다.");
    }
    return {
      sourceCommit: releaseSource.commit,
      sourceTree: releaseSource.tree,
      trackedWorkingTreeClean: true,
      sourceProvenance: "release-archive",
    };
  }
}

function findChrome(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.MATTHS_CAPTURE_CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error("Chrome 실행 파일을 찾지 못했습니다. --chrome 또는 MATTHS_CAPTURE_CHROME을 지정하세요.");
  }
  return found;
}

function loadExtraPages(filename) {
  if (!filename) return [];
  const parsed = JSON.parse(fs.readFileSync(path.resolve(filename), "utf8"));
  if (!Array.isArray(parsed)) throw new Error("추가 캡처 계획은 JSON 배열이어야 합니다.");
  for (const page of parsed) {
    if (!page || !/^[a-z0-9-]+$/.test(page.slug || "")) {
      throw new Error("추가 캡처 slug는 영문 소문자·숫자·하이픈만 허용합니다.");
    }
    if (!String(page.route || "").startsWith("/")) {
      throw new Error(`${page.slug}: route는 /로 시작해야 합니다.`);
    }
    if (!["public", "student", "parent", "admin"].includes(page.role)) {
      throw new Error(`${page.slug}: 지원하지 않는 role입니다.`);
    }
    if (page.authProfile && !["student", "studentRanked", "parent", "admin"].includes(page.authProfile)) {
      throw new Error(`${page.slug}: 지원하지 않는 authProfile입니다.`);
    }
  }
  return parsed;
}

function profileFor(authProfile, outputDirectory) {
  if (authProfile === "public") return path.join(outputDirectory, ".profiles", "public");
  const variable = profileVariables[authProfile];
  const value = process.env[variable];
  const cookieValue = process.env[cookieVariables[authProfile]];
  if (!value && cookieValue) {
    return path.join(outputDirectory, ".profiles", authProfile);
  }
  if (!value) {
    throw new Error(`${authProfile} 화면에는 로그인된 전용 프로필 또는 세션 쿠키가 필요합니다. ${variable} 또는 ${cookieVariables[authProfile]}을 지정하세요.`);
  }
  const resolved = path.resolve(value);
  if (!fs.existsSync(resolved)) throw new Error(`${variable} 경로가 없습니다: ${resolved}`);
  return resolved;
}

function hasAuthenticationFailure(html, role) {
  if (role === "public") return false;
  const text = html.toLowerCase();
  return (
    text.includes('name="password"') &&
    (text.includes('name="email"') || text.includes("로그인"))
  );
}

function hasPageFailure(html) {
  const text = String(html || "").toLowerCase();
  return text.includes("cannot get /") ||
    text.includes("페이지를 찾을 수 없습니다") ||
    text.includes("요청한 페이지를 찾지 못했습니다");
}

function assertUniquePlan(plan) {
  const seen = new Set();
  for (const page of plan) {
    if (seen.has(page.slug)) throw new Error(`중복 캡처 slug: ${page.slug}`);
    seen.add(page.slug);
  }
}

const baseUrl = new URL(option("--base-url", process.env.MATTHS_CAPTURE_BASE_URL || "http://localhost:8000"));
const captureDriver = option("--driver", process.env.MATTHS_CAPTURE_DRIVER || "cdp");
if (!["cdp", "cli"].includes(captureDriver)) {
  throw new Error("--driver는 cdp 또는 cli여야 합니다. 승인 증거는 cdp를 사용하세요.");
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDirectory = path.resolve(option("--output", path.join(repoRoot, "evidence", `web-${stamp}`)));
const requestedRoles = new Set(
  option("--roles", process.env.MATTHS_CAPTURE_ROLES || "public,student,parent,admin")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean),
);
for (const role of requestedRoles) {
  if (!["public", "student", "parent", "admin"].includes(role)) {
    throw new Error(`지원하지 않는 role: ${role}`);
  }
}

const chrome = findChrome(option("--chrome", ""));
const extraPages = loadExtraPages(option("--extra-plan", process.env.MATTHS_CAPTURE_EXTRA_PLAN || ""));
const onlyExtra = process.argv.includes("--only-extra");
if (onlyExtra && extraPages.length === 0) {
  throw new Error("--only-extra에는 --extra-plan <JSON>이 필요합니다.");
}
const plan = [...(onlyExtra ? [] : pages), ...extraPages]
  .filter((page) => requestedRoles.has(page.role));
assertUniquePlan(plan);
fs.mkdirSync(outputDirectory, { recursive: true });

// Bind every screenshot manifest to the exact tracked source that rendered it.
// Untracked evidence output is intentionally ignored, but tracked edits are
// recorded and the review-package builder rejects them.
const {
  sourceCommit,
  sourceTree,
  trackedWorkingTreeClean,
  sourceProvenance,
} = readSourceProvenance();

const requiredAuthProfiles = new Set(
  plan.map((page) => page.authProfile || page.role),
);
const captureProfiles = new Map();
for (const authProfile of requiredAuthProfiles) {
  captureProfiles.set(authProfile, profileFor(authProfile, outputDirectory));
}

const manifest = {
  schema: "MATTHS_RESPONSIVE_EVIDENCE_V2",
  createdAt: new Date().toISOString(),
  sourceCommit,
  sourceTree,
  trackedWorkingTreeClean,
  sourceProvenance,
  baseUrl: baseUrl.origin,
  widths,
  viewportHeight,
  roles: [...requestedRoles],
  captureDriver,
  pageCount: plan.length,
  captures: [],
};

let failures = 0;
for (const page of plan) {
  const pageDirectory = path.join(outputDirectory, page.role);
  fs.mkdirSync(pageDirectory, { recursive: true });
  for (const width of widths) {
    const authProfile = page.authProfile || page.role;
    const filename = `${page.slug}-${width}.png`;
    const screenshot = path.join(pageDirectory, filename);
    const url = new URL(page.route, baseUrl).href;
    const result = captureDriver === "cdp"
      ? spawnSync(
          process.execPath,
          [
            exactViewportCapture,
            "--chrome", chrome,
            "--profile", captureProfiles.get(authProfile),
            "--url", url,
            "--width", String(width),
            "--height", String(viewportHeight),
            "--wait-ms", "800",
            "--output", screenshot,
          ],
          {
            cwd: repoRoot,
            encoding: "utf8",
            maxBuffer: 16 * 1024 * 1024,
            env: {
              ...process.env,
              MATTHS_CAPTURE_SESSION_COOKIE: authProfile === "public"
                ? ""
                : String(process.env[cookieVariables[authProfile]] || ""),
            },
          },
        )
      : spawnSync(
          chrome,
          [
            "--headless=new",
            "--hide-scrollbars",
            "--disable-gpu",
            "--no-first-run",
            "--no-default-browser-check",
            "--force-device-scale-factor=1",
            `--window-size=${width},${viewportHeight}`,
            "--virtual-time-budget=3000",
          `--user-data-dir=${captureProfiles.get(authProfile)}`,
            `--screenshot=${screenshot}`,
            "--dump-dom",
            url,
          ],
          { cwd: repoRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
        );
    let exactResult = null;
    if (captureDriver === "cdp" && result.status === 0) {
      try {
        exactResult = JSON.parse(String(result.stdout || "").trim());
      } catch (error) {
        exactResult = null;
      }
    }
    const html = captureDriver === "cdp" ? exactResult?.html || "" : result.stdout || "";
    const authenticationFailure = hasAuthenticationFailure(html, page.role);
    const pageFailure = hasPageFailure(html);
    const documentStatus = Number(exactResult?.documentStatus);
    const documentStatusOk = captureDriver !== "cdp" || (
      Number.isInteger(documentStatus) &&
      documentStatus >= 200 &&
      documentStatus < 400
    );
    const screenshotExists = fs.existsSync(screenshot) && fs.statSync(screenshot).size > 0;
    const viewportVerified = captureDriver === "cdp" &&
      exactResult?.viewportVerified === true &&
      exactResult?.innerWidth === width &&
      exactResult?.innerHeight === viewportHeight;
    const horizontalOverflow = captureDriver === "cdp" &&
      Number(exactResult?.scrollWidth || 0) > Number(exactResult?.innerWidth || width);
    const ok = result.status === 0 &&
      screenshotExists &&
      !authenticationFailure &&
      !pageFailure &&
      documentStatusOk &&
      !horizontalOverflow &&
      (captureDriver !== "cdp" || viewportVerified);
    if (!ok) failures += 1;
    manifest.captures.push({
      slug: page.slug,
      role: page.role,
      authProfile,
      route: page.route,
      url,
      documentUrl: exactResult?.documentUrl || null,
      documentStatus: Number.isInteger(documentStatus) ? documentStatus : null,
      documentMimeType: exactResult?.documentMimeType || null,
      documentStatusOk,
      width,
      height: viewportHeight,
      innerWidth: exactResult?.innerWidth ?? null,
      innerHeight: exactResult?.innerHeight ?? null,
      scrollWidth: exactResult?.scrollWidth ?? null,
      overflowingElements: exactResult?.overflowingElements || [],
      horizontalOverflow,
      viewportVerified,
      driver: captureDriver,
      file: path.relative(outputDirectory, screenshot),
      ok,
      authenticationFailure,
      pageFailure,
      exitCode: result.status,
      signal: result.signal || null,
      stderr: ok ? "" : String(result.stderr || "").slice(-1000),
    });
    process.stdout.write(`${ok ? "✓" : "✗"} ${page.role}/${filename}\n`);
  }
}

manifest.failureCount = failures;
manifest.captureCount = manifest.captures.length;
fs.writeFileSync(
  path.join(outputDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

const expectedCaptureCount = plan.length * widths.length;
if (manifest.captureCount !== expectedCaptureCount || failures > 0) {
  console.error(`캡처 실패: ${failures}/${expectedCaptureCount}. manifest.json을 확인하세요.`);
  process.exit(1);
}

console.log(`완료: ${plan.length}개 화면 × ${widths.length}개 폭 = ${expectedCaptureCount}장`);
console.log(outputDirectory);
