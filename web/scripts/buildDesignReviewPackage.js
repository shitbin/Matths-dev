#!/usr/bin/env node

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const requiredWidths = [320, 390, 768, 1024, 1440];
const requiredRoles = ["public", "student", "parent", "admin"];
const exactNonVisualRuntimeFiles = new Set([
  "package.json",
  "package-lock.json",
  "services/atlasOperationEvidenceService.js",
]);

function isNonVisualLineageFile(filename) {
  return filename.startsWith("docs/") ||
    filename.startsWith("scripts/") ||
    filename.startsWith("tests/") ||
    exactNonVisualRuntimeFiles.has(filename);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} 실패\n${result.stderr || result.stdout}`);
  }
  return String(result.stdout || "").trim();
}

function option(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  if (!process.argv[index + 1]) throw new Error(`${name} 값이 필요합니다.`);
  return process.argv[index + 1];
}

function safeEvidenceFile(root, relativeFilename) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, String(relativeFilename || ""));
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`증거 파일 경로가 폴더 밖을 가리킵니다: ${relativeFilename}`);
  }
  return resolved;
}

function pngSize(filename) {
  const header = Buffer.alloc(24);
  const descriptor = fs.openSync(filename, "r");
  try {
    if (fs.readSync(descriptor, header, 0, header.length, 0) !== header.length) {
      throw new Error(`${filename}: PNG 헤더가 짧습니다.`);
    }
  } finally {
    fs.closeSync(descriptor);
  }
  if (header.toString("hex", 0, 8) !== "89504e470d0a1a0a") {
    throw new Error(`${filename}: PNG 파일이 아닙니다.`);
  }
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

function sha256(filename) {
  return crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
}

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

const evidenceOption = option("--evidence");
const evidenceDirectories = evidenceOption
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => path.resolve(entry));
if (!evidenceDirectories.length || evidenceDirectories.some((entry) => entry === repoRoot)) {
  throw new Error("--evidence <증거 폴더[,증거 폴더...]>가 필요합니다.");
}

const status = run("git", ["status", "--porcelain"]);
if (status) throw new Error("검수 패키지는 깨끗한 로컬 커밋에서만 만들 수 있습니다.");
const commit = run("git", ["rev-parse", "HEAD"]);
const tree = run("git", ["rev-parse", "HEAD^{tree}"]);
const shortCommit = commit.slice(0, 12);
const visualBaselineOption = option("--visual-baseline-commit");
const visualBaselineCommit = visualBaselineOption
  ? run("git", ["rev-parse", "--verify", `${visualBaselineOption}^{commit}`])
  : commit;
if (visualBaselineOption) {
  const ancestor = spawnSync("git", ["merge-base", "--is-ancestor", visualBaselineCommit, commit], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (ancestor.status !== 0) {
    throw new Error("시각 기준 커밋이 현재 HEAD의 조상이 아닙니다.");
  }
}
const visualBaselineTree = run("git", ["rev-parse", `${visualBaselineCommit}^{tree}`]);
const lineageChangedFiles = visualBaselineCommit === commit
  ? []
  : run("git", ["diff", "--name-only", `${visualBaselineCommit}..${commit}`])
      .split("\n")
      .filter(Boolean);
const visualSourceChanges = lineageChangedFiles.filter((filename) => !isNonVisualLineageFile(filename));
if (visualSourceChanges.length) {
  throw new Error(
    `시각 기준 이후 화면 또는 화면 데이터 소스가 바뀌었습니다. 현재 커밋에서 다시 캡처하세요:\n` +
    visualSourceChanges.join("\n"),
  );
}
const sourceManifests = evidenceDirectories.map((directory) => {
  const manifestPath = path.join(directory, "manifest.json");
  if (!fs.existsSync(manifestPath)) throw new Error(`manifest.json이 없습니다: ${manifestPath}`);
  const sourceManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (sourceManifest.schema !== "MATTHS_RESPONSIVE_EVIDENCE_V2") {
    throw new Error(`지원하지 않는 증거 manifest입니다: ${sourceManifest.schema}`);
  }
  if (sourceManifest.sourceCommit !== visualBaselineCommit) {
    throw new Error(
      `${directory}: 캡처 커밋 ${sourceManifest.sourceCommit || "없음"}이 ` +
      `시각 기준 커밋 ${visualBaselineCommit}과 다릅니다. 현재 커밋에서 다시 캡처하세요.`,
    );
  }
  if (sourceManifest.sourceTree !== visualBaselineTree) {
    throw new Error(`${directory}: 캡처 소스 트리가 시각 기준 Git 트리와 다릅니다.`);
  }
  if (sourceManifest.trackedWorkingTreeClean !== true) {
    throw new Error(`${directory}: 캡처 당시 커밋되지 않은 추적 파일 변경이 있었습니다.`);
  }
  if (sourceManifest.failureCount !== 0) {
    throw new Error(`${directory}: 실패한 캡처가 ${sourceManifest.failureCount}장 있습니다.`);
  }
  if (sourceManifest.captureDriver !== "cdp") {
    throw new Error(`${directory}: CDP 실 viewport 캡처가 아닙니다.`);
  }
  if (JSON.stringify(sourceManifest.widths) !== JSON.stringify(requiredWidths)) {
    throw new Error(`${directory}: 필수 폭이 다릅니다: ${JSON.stringify(sourceManifest.widths)}`);
  }
  if (sourceManifest.captureCount !== sourceManifest.pageCount * requiredWidths.length) {
    throw new Error(`${directory}: pageCount와 captureCount가 일치하지 않습니다.`);
  }
  return { directory, manifest: sourceManifest };
});

const captures = [];
const captureSources = new Map();
const sourceRoles = new Set();
for (const source of sourceManifests) {
  for (const role of source.manifest.roles || []) sourceRoles.add(role);
  for (const capture of source.manifest.captures || []) {
    const key = `${capture.role}/${capture.slug}/${capture.width}`;
    if (captureSources.has(key)) throw new Error(`중복 캡처가 있습니다: ${key}`);
    captureSources.set(key, source.directory);
    captures.push(capture);
  }
}
for (const role of requiredRoles) {
  if (!sourceRoles.has(role)) throw new Error(`필수 역할 캡처가 없습니다: ${role}`);
}

const manifest = {
  schema: "MATTHS_RESPONSIVE_EVIDENCE_V2",
  createdAt: new Date().toISOString(),
  sourceCommit: commit,
  sourceTree: tree,
  captureSourceCommit: visualBaselineCommit,
  captureSourceTree: visualBaselineTree,
  visualLineage: {
    result: "PASS",
    changedFileCount: lineageChangedFiles.length,
    changedFiles: lineageChangedFiles,
    visualSourceChangeCount: visualSourceChanges.length,
    allowedBoundary: "docs/, scripts/, tests/, package manifests, atlas operation evidence service",
  },
  trackedWorkingTreeClean: true,
  sourceCreatedAt: sourceManifests.map(({ manifest: source }) => source.createdAt),
  baseUrls: [...new Set(sourceManifests.map(({ manifest: source }) => source.baseUrl))],
  widths: requiredWidths,
  viewportHeight: sourceManifests[0].manifest.viewportHeight,
  roles: requiredRoles,
  pageCount: 0,
  captureCount: captures.length,
  failureCount: 0,
  captureDriver: "cdp",
  captures,
};

const grouped = new Map();
for (const capture of manifest.captures) {
  if (
    !capture.ok ||
    capture.authenticationFailure ||
    capture.pageFailure ||
    capture.documentStatusOk !== true ||
    !Number.isInteger(capture.documentStatus) ||
    capture.documentStatus < 200 ||
    capture.documentStatus >= 400 ||
    capture.horizontalOverflow ||
    capture.viewportVerified !== true
  ) {
    throw new Error(`${capture.slug}/${capture.width}: 통과하지 않은 캡처입니다.`);
  }
  if (!requiredWidths.includes(capture.width)) {
    throw new Error(`${capture.slug}: 지원하지 않는 폭 ${capture.width}`);
  }
  const sourceDirectory = captureSources.get(`${capture.role}/${capture.slug}/${capture.width}`);
  const filename = safeEvidenceFile(sourceDirectory, capture.file);
  if (!fs.existsSync(filename)) throw new Error(`캡처 파일이 없습니다: ${capture.file}`);
  const size = pngSize(filename);
  if (size.width !== capture.width) {
    throw new Error(`${capture.file}: 실제 폭 ${size.width}px, manifest ${capture.width}px`);
  }
  const key = `${capture.role}/${capture.slug}`;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(capture);
}
manifest.pageCount = grouped.size;
if (manifest.captureCount !== manifest.pageCount * requiredWidths.length) {
  throw new Error("병합한 pageCount와 captureCount가 일치하지 않습니다.");
}
for (const [key, captures] of grouped) {
  const actual = [...new Set(captures.map((capture) => capture.width))].sort((a, b) => a - b);
  if (JSON.stringify(actual) !== JSON.stringify(requiredWidths)) {
    throw new Error(`${key}: 다섯 폭이 모두 없습니다.`);
  }
}

const beforeDirectory = path.join(repoRoot, "docs", "web-redesign", "screenshots", "before");
const beforeFiles = fs.readdirSync(beforeDirectory).filter((name) => name.endsWith(".png"));
if (beforeFiles.length === 0) throw new Error("기준선 before 캡처가 없습니다.");

const outputDirectory = path.resolve(
  option("--output", path.join(repoRoot, "dist", "design-review")),
);
fs.mkdirSync(outputDirectory, { recursive: true });
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "matths-design-review-"));
const packageRoot = path.join(temporary, `matths-design-review-${shortCommit}`);
fs.mkdirSync(packageRoot, { recursive: true });

const request = `# Matths 웹 전체 코드 기반 디자인 승인 요청\n\n` +
  `검토 기준 커밋: \`${commit}\`\n\n` +
  `화면 캡처 기준 커밋: \`${visualBaselineCommit}\`\n\n` +
  (visualBaselineCommit === commit
    ? `캡처와 검토 소스는 같은 커밋입니다.\n\n`
    : `캡처 이후 변경은 패키지 manifest의 visualLineage에 전부 기록돼 있으며, ` +
      `화면·스타일·클라이언트·route/controller·화면 데이터 service 변경은 0건입니다. ` +
      `이 판정도 독립적으로 소스 diff를 재검증해 주세요.\n\n`) +
  `자기보고 문서의 완료 주장을 통과 근거로 사용하지 말고, \`web-source.tar.gz\`의 실코드와 ` +
  `\`evidence/manifest.json\` 및 PNG를 서로 대조해 독립 판정해 주세요.\n\n` +
  `필수 판정:\n\n` +
  `1. 웹 전체 출시 가능/보류/불가와 10점 만점 점수\n` +
  `2. 공개·학생·학부모·관리자·GOAT Arena별 P0/P1/P2\n` +
  `3. 320·390·768·1024·1440에서 가로 넘침, 고정 내비 가림, 44px 조작 영역, 글자 크기\n` +
  `4. 공식 CI, 색·그라디언트·모션 토큰, 수학식, 실패·빈·로딩 상태의 사용자 언어\n` +
  `5. 코드 근거와 화면 근거를 분리한 상위 문제 20개\n` +
  `6. 반드시 유지할 것 5개, 버릴 습관 5개, 다음 구현 10개\n\n` +
  `한 폭이나 한 역할의 근거가 없으면 보지 않은 화면을 통과시키지 마세요. before는 과거 ` +
  `768px 기준선이고, after가 현재 다섯 폭 정본입니다.\n`;
fs.writeFileSync(path.join(packageRoot, "00_REVIEW_REQUEST.md"), request, "utf8");

const matrix = [
  "# 현재 캡처 행렬",
  "",
  `커밋: \`${commit}\``,
  `캡처 기준: \`${visualBaselineCommit}\``,
  "",
  "| 역할 | 화면 | 320 | 390 | 768 | 1024 | 1440 |",
  "|---|---|---:|---:|---:|---:|---:|",
];
for (const [key, captures] of [...grouped].sort(([left], [right]) => left.localeCompare(right))) {
  const [role, slug] = key.split("/");
  const byWidth = new Map(captures.map((capture) => [capture.width, capture]));
  matrix.push(`| ${role} | ${slug} | ${requiredWidths.map((width) => byWidth.has(width) ? "✓" : "—").join(" | ")} |`);
}
matrix.push("", `총 ${manifest.pageCount}개 화면 · ${manifest.captureCount}장`, "");
fs.writeFileSync(path.join(packageRoot, "01_CAPTURE_MATRIX.md"), `${matrix.join("\n")}\n`, "utf8");
fs.writeFileSync(
  path.join(packageRoot, "02_EVIDENCE_MANIFEST.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
const packagedEvidence = path.join(packageRoot, "evidence");
fs.mkdirSync(packagedEvidence, { recursive: true });
fs.writeFileSync(
  path.join(packagedEvidence, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
for (const capture of manifest.captures) {
  const sourceDirectory = captureSources.get(`${capture.role}/${capture.slug}/${capture.width}`);
  const source = safeEvidenceFile(sourceDirectory, capture.file);
  const destination = safeEvidenceFile(packagedEvidence, capture.file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}
fs.cpSync(beforeDirectory, path.join(packageRoot, "before-768-baseline"), { recursive: true });

run("git", [
  "archive",
  "--format=tar.gz",
  `--output=${path.join(packageRoot, "web-source.tar.gz")}`,
  "HEAD",
]);

const sums = walk(packageRoot)
  .sort((left, right) => left.localeCompare(right))
  .map((filename) => `${sha256(filename)}  ${path.relative(packageRoot, filename)}`);
fs.writeFileSync(path.join(packageRoot, "SHA256SUMS.txt"), `${sums.join("\n")}\n`, "utf8");

const archive = path.join(outputDirectory, `matths-design-review-${shortCommit}.tar.gz`);
run("tar", ["-czf", archive, "-C", temporary, path.basename(packageRoot)]);
const archiveHash = sha256(archive);
fs.writeFileSync(`${archive}.sha256`, `${archiveHash}  ${path.basename(archive)}\n`, "utf8");

console.log(`검수 패키지: ${archive}`);
console.log(`SHA-256: ${archiveHash}`);
console.log(`화면: ${manifest.pageCount}개 · PNG ${manifest.captureCount}장 · before ${beforeFiles.length}장`);
