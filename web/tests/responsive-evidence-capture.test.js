"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "scripts/captureResponsiveEvidence.js"), "utf8");

for (const width of [320, 390, 768, 1024, 1440]) {
  assert.match(source, new RegExp(`\\b${width}\\b`));
}
for (const role of ["public", "student", "parent", "admin"]) {
  assert.match(source, new RegExp(`\\b${role}\\b`));
}
for (const route of [
  "/main",
  "/goat-arena",
  "/goat-arena/rules/sub",
  "/parent",
  "/admin",
]) {
  assert.ok(source.includes(`route: "${route}"`), `missing route ${route}`);
}

assert.match(source, /MATTHS_CAPTURE_STUDENT_PROFILE/);
assert.match(source, /MATTHS_CAPTURE_STUDENT_RANKED_PROFILE/);
assert.match(source, /MATTHS_CAPTURE_PARENT_PROFILE/);
assert.match(source, /MATTHS_CAPTURE_ADMIN_PROFILE/);
assert.match(source, /MATTHS_CAPTURE_STUDENT_COOKIE/);
assert.match(source, /MATTHS_CAPTURE_STUDENT_RANKED_COOKIE/);
assert.match(source, /authProfile: "studentRanked"/);
assert.match(source, /MATTHS_CAPTURE_PARENT_COOKIE/);
assert.match(source, /MATTHS_CAPTURE_ADMIN_COOKIE/);
assert.match(source, /authenticationFailure/);
assert.match(source, /pageFailure/);
assert.match(source, /documentStatusOk/);
assert.match(source, /documentStatus >= 200/);
assert.match(source, /documentStatus < 400/);
assert.match(source, /--only-extra/);
assert.match(source, /MATTHS_RESPONSIVE_EVIDENCE_V2/);
assert.match(source, /sourceCommit/);
assert.match(source, /sourceTree/);
assert.match(source, /trackedWorkingTreeClean/);
assert.match(source, /sourceProvenance/);
assert.match(source, /RELEASE-SOURCE\.json/);
assert.match(source, /MATTHS_RELEASE_SOURCE_V1/);
assert.match(source, /--untracked-files=no/);
assert.match(source, /MATTHS_CAPTURE_DRIVER \|\| "cdp"/);
assert.match(source, /captureExactViewport\.js/);
assert.match(source, /viewportVerified/);
assert.match(source, /horizontalOverflow/);
assert.match(source, /scrollWidth/);
assert.match(source, /failureCount/);
assert.match(source, /process\.exit\(1\)/);
assert.equal((source.match(/\{ slug:/g) || []).length, 54);
assert.ok(
  !source.includes('/admin/announcements'),
  "존재하지 않는 관리자 GET 경로를 증거 목록에 포함하면 안 됩니다.",
);

const pkg = require(path.join(root, "package.json"));
assert.equal(pkg.scripts["evidence:web"], "node scripts/captureResponsiveEvidence.js");

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "matths-capture-contract-"));
const fakeChrome = path.join(temporary, "fake-chrome");
fs.writeFileSync(
  fakeChrome,
  `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
const shot = args.find((arg) => arg.startsWith("--screenshot=")).slice(13);
const [width, height] = args.find((arg) => arg.startsWith("--window-size=")).slice(14).split(",").map(Number);
const png = Buffer.alloc(24);
Buffer.from("89504e470d0a1a0a", "hex").copy(png, 0);
png.writeUInt32BE(width, 16);
png.writeUInt32BE(height, 20);
fs.mkdirSync(require("node:path").dirname(shot), { recursive: true });
fs.writeFileSync(shot, png);
process.stdout.write(process.env.FAKE_LOGIN === "1" ? '<form><input name="email"><input name="password">로그인</form>' : '<main>ok</main>');
`,
  "utf8",
);
fs.chmodSync(fakeChrome, 0o755);

const publicOutput = path.join(temporary, "public-evidence");
const publicRun = spawnSync(
  process.execPath,
  [
    path.join(root, "scripts/captureResponsiveEvidence.js"),
    "--roles", "public",
    "--chrome", fakeChrome,
    "--driver", "cli",
    "--output", publicOutput,
    "--base-url", "http://example.invalid",
  ],
  { cwd: root, encoding: "utf8" },
);
assert.equal(publicRun.status, 0, publicRun.stderr || publicRun.stdout);
const publicManifest = JSON.parse(fs.readFileSync(path.join(publicOutput, "manifest.json"), "utf8"));
assert.equal(publicManifest.pageCount, 13);
assert.equal(publicManifest.captureCount, 65);
assert.equal(publicManifest.failureCount, 0);
assert.match(publicManifest.sourceCommit, /^[0-9a-f]{40}$/);
assert.match(publicManifest.sourceTree, /^[0-9a-f]{40}$/);
assert.equal(typeof publicManifest.trackedWorkingTreeClean, "boolean");
assert.ok(
  ["git", "release-archive"].includes(publicManifest.sourceProvenance),
  `unexpected source provenance: ${publicManifest.sourceProvenance}`,
);

const extraPlan = path.join(temporary, "extra-plan.json");
fs.writeFileSync(extraPlan, JSON.stringify([
  { slug: "extra-only", route: "/preview", role: "public" },
]));
const extraOutput = path.join(temporary, "extra-evidence");
const extraRun = spawnSync(
  process.execPath,
  [
    path.join(root, "scripts/captureResponsiveEvidence.js"),
    "--roles", "public",
    "--chrome", fakeChrome,
    "--driver", "cli",
    "--output", extraOutput,
    "--base-url", "http://example.invalid",
    "--extra-plan", extraPlan,
    "--only-extra",
  ],
  { cwd: root, encoding: "utf8" },
);
assert.equal(extraRun.status, 0, extraRun.stderr || extraRun.stdout);
const extraManifest = JSON.parse(fs.readFileSync(path.join(extraOutput, "manifest.json"), "utf8"));
assert.equal(extraManifest.pageCount, 1);
assert.equal(extraManifest.captureCount, 5);

const studentProfile = path.join(temporary, "student-profile");
fs.mkdirSync(studentProfile);
const authRun = spawnSync(
  process.execPath,
  [
    path.join(root, "scripts/captureResponsiveEvidence.js"),
    "--roles", "student",
    "--chrome", fakeChrome,
    "--driver", "cli",
    "--output", path.join(temporary, "auth-failure"),
    "--base-url", "http://example.invalid",
  ],
  {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      MATTHS_CAPTURE_STUDENT_PROFILE: studentProfile,
      MATTHS_CAPTURE_STUDENT_RANKED_PROFILE: studentProfile,
      FAKE_LOGIN: "1",
    },
  },
);
assert.notEqual(authRun.status, 0, "student login redirects must fail evidence capture");

const exactSource = fs.readFileSync(path.join(root, "scripts/captureExactViewport.js"), "utf8");
assert.match(exactSource, /Emulation\.setDeviceMetricsOverride/);
assert.match(exactSource, /Network\.setCookie/);
assert.match(exactSource, /Network\.responseReceived/);
assert.match(exactSource, /documentStatus/);
assert.match(exactSource, /CDP 응답 시간 초과/);
assert.match(exactSource, /this\.pending\.delete\(id\)/);
assert.match(exactSource, /MATTHS_CAPTURE_SESSION_COOKIE/);
assert.match(exactSource, /metrics\.innerWidth !== width/);
assert.match(exactSource, /metrics\.scrollX !== 0/);
assert.match(exactSource, /metrics\.scrollY !== 0/);
assert.match(exactSource, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
assert.match(exactSource, /overflowingElements/);
assert.match(exactSource, /getBoundingClientRect/);
assert.match(exactSource, /Page\.captureScreenshot/);
assert.match(exactSource, /captureBeyondViewport: false/);

console.log("Responsive evidence capture contracts passed");
