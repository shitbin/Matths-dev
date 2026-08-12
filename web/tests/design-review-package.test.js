"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "scripts/buildDesignReviewPackage.js"), "utf8");

assert.match(source, /MATTHS_RESPONSIVE_EVIDENCE_V2/);
assert.match(source, /sourceManifest\.sourceCommit !== visualBaselineCommit/);
assert.match(source, /sourceManifest\.sourceTree !== visualBaselineTree/);
assert.match(source, /--visual-baseline-commit/);
assert.match(source, /merge-base/);
assert.match(source, /visualSourceChanges\.length/);
assert.match(source, /화면 또는 화면 데이터 소스가 바뀌었습니다/);
assert.match(source, /captureSourceCommit/);
assert.match(source, /visualLineage/);
assert.match(source, /trackedWorkingTreeClean !== true/);
assert.match(source, /requiredWidths = \[320, 390, 768, 1024, 1440\]/);
assert.match(source, /requiredRoles = \["public", "student", "parent", "admin"\]/);
assert.match(source, /authenticationFailure/);
assert.match(source, /documentStatusOk !== true/);
assert.match(source, /capture\.documentStatus >= 400/);
assert.match(source, /horizontalOverflow/);
assert.match(source, /viewportVerified/);
assert.match(source, /captureDriver !== "cdp"/);
assert.match(source, /중복 캡처가 있습니다/);
assert.match(source, /pngSize/);
assert.match(source, /actual\.width|size\.width/);
assert.match(source, /git", \["status", "--porcelain"\]/);
assert.match(source, /git", \[[\s\S]*"archive"/);
assert.match(source, /web-source\.tar\.gz/);
assert.match(source, /SHA256SUMS\.txt/);
assert.doesNotMatch(source, /cpSync\(evidenceDirectory/);
assert.match(source, /자기보고 문서의 완료 주장을 통과 근거로 사용하지 말고/);
assert.doesNotMatch(source, /\b(?:scp|rsync|ftp|sftp)\b/);

const pkg = require(path.join(root, "package.json"));
assert.equal(pkg.scripts["review:package"], "node scripts/buildDesignReviewPackage.js");

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

function writePNG(filename, width, height) {
  const png = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(png, 0);
  png.writeUInt32BE(width, 16);
  png.writeUInt32BE(height, 20);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, png);
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "matths-review-package-contract-"));
const fixtureRoot = path.join(temporary, "fixture-repo");
const fixtureScript = path.join(fixtureRoot, "scripts", "buildDesignReviewPackage.js");
fs.mkdirSync(path.dirname(fixtureScript), { recursive: true });
fs.copyFileSync(path.join(root, "scripts/buildDesignReviewPackage.js"), fixtureScript);
writePNG(
  path.join(fixtureRoot, "docs/web-redesign/screenshots/before/landing-ipad-768.png"),
  768,
  1024,
);
fs.writeFileSync(path.join(fixtureRoot, "app.js"), "console.log('fixture');\n", "utf8");
run("git", ["init", "-q"], fixtureRoot);
run("git", ["config", "user.email", "test@matths.invalid"], fixtureRoot);
run("git", ["config", "user.name", "Matths Test"], fixtureRoot);
run("git", ["add", "."], fixtureRoot);
run("git", ["commit", "-qm", "fixture"], fixtureRoot);
const fixtureCommit = run("git", ["rev-parse", "HEAD"], fixtureRoot).trim();
const fixtureTree = run("git", ["rev-parse", "HEAD^{tree}"], fixtureRoot).trim();

const evidenceRoot = path.join(temporary, "evidence");
const widths = [320, 390, 768, 1024, 1440];
const captures = [];
for (const role of ["public", "student", "parent", "admin"]) {
  for (const width of widths) {
    const relative = `${role}/${role}-home-${width}.png`;
    writePNG(path.join(evidenceRoot, relative), width, 1024);
    captures.push({
      slug: `${role}-home`,
      role,
      route: "/",
      url: "http://example.invalid/",
      width,
      height: 1024,
      file: relative,
      ok: true,
      authenticationFailure: false,
      documentStatus: 200,
      documentStatusOk: true,
      exitCode: 0,
      signal: null,
      stderr: "",
    });
  }
}
fs.writeFileSync(
  path.join(evidenceRoot, "manifest.json"),
  JSON.stringify({
    schema: "MATTHS_RESPONSIVE_EVIDENCE_V2",
    createdAt: "2026-08-11T00:00:00.000Z",
    sourceCommit: fixtureCommit,
    sourceTree: fixtureTree,
    trackedWorkingTreeClean: true,
    baseUrl: "http://example.invalid",
    widths,
    viewportHeight: 1024,
    roles: ["public", "student", "parent", "admin"],
    pageCount: 4,
    captureCount: captures.length,
    failureCount: 0,
    captureDriver: "cdp",
    captures: captures.map((capture) => ({
      ...capture,
      innerWidth: capture.width,
      innerHeight: capture.height,
      scrollWidth: capture.width,
      horizontalOverflow: false,
      viewportVerified: true,
      pageFailure: false,
    })),
  }),
  "utf8",
);
const reviewOutput = path.join(temporary, "review-output");
run(
  process.execPath,
  [fixtureScript, "--evidence", evidenceRoot, "--output", reviewOutput],
  fixtureRoot,
);
const archives = fs.readdirSync(reviewOutput).filter((name) => name.endsWith(".tar.gz"));
assert.equal(archives.length, 1);
assert.ok(fs.existsSync(path.join(reviewOutput, `${archives[0]}.sha256`)));

const staleManifest = JSON.parse(
  fs.readFileSync(path.join(evidenceRoot, "manifest.json"), "utf8"),
);
staleManifest.sourceCommit = "0".repeat(40);
fs.writeFileSync(
  path.join(evidenceRoot, "manifest.json"),
  `${JSON.stringify(staleManifest, null, 2)}\n`,
  "utf8",
);
const staleRun = spawnSync(
  process.execPath,
  [fixtureScript, "--evidence", evidenceRoot, "--output", path.join(temporary, "stale-output")],
  { cwd: fixtureRoot, encoding: "utf8" },
);
assert.notEqual(staleRun.status, 0, "stale capture commit must block the review package");
assert.match(staleRun.stderr, /캡처 커밋/);

staleManifest.sourceCommit = fixtureCommit;
fs.writeFileSync(
  path.join(evidenceRoot, "manifest.json"),
  `${JSON.stringify(staleManifest, null, 2)}\n`,
  "utf8",
);
fs.mkdirSync(path.join(fixtureRoot, "docs"), { recursive: true });
fs.writeFileSync(path.join(fixtureRoot, "docs", "release-note.md"), "non visual\n", "utf8");
run("git", ["add", "docs/release-note.md"], fixtureRoot);
run("git", ["commit", "-qm", "non visual evidence note"], fixtureRoot);
run(
  process.execPath,
  [
    fixtureScript,
    "--evidence", evidenceRoot,
    "--output", path.join(temporary, "lineage-output"),
    "--visual-baseline-commit", fixtureCommit,
  ],
  fixtureRoot,
);

fs.mkdirSync(path.join(fixtureRoot, "views"), { recursive: true });
fs.writeFileSync(path.join(fixtureRoot, "views", "home.ejs"), "changed screen\n", "utf8");
run("git", ["add", "views/home.ejs"], fixtureRoot);
run("git", ["commit", "-qm", "visual change"], fixtureRoot);
const visualChangeRun = spawnSync(
  process.execPath,
  [
    fixtureScript,
    "--evidence", evidenceRoot,
    "--output", path.join(temporary, "visual-change-output"),
    "--visual-baseline-commit", fixtureCommit,
  ],
  { cwd: fixtureRoot, encoding: "utf8" },
);
assert.notEqual(visualChangeRun.status, 0, "visual source changes must require recapture");
assert.match(visualChangeRun.stderr, /화면 또는 화면 데이터 소스/);

console.log("Design review package contracts passed");
