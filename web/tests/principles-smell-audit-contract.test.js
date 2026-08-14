"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");
const ledgerSource = read("docs/principles-smell-audit.json");
const ledger = JSON.parse(ledgerSource);
const markdown = read("docs/principles-smell-audit.md");
const handoff = read("docs/CODEX-HANDOFF.md");
const runbook = read("docs/LOCAL-ENV-RUNBOOK.md");
const repro = read("docs/PKDRAWING-DARK-MODE-REPRO.md");
const reproSource = read("tests/manual/pencilkit-dark-mode-export-repro.swift");

function countBy(items, field, labels) {
  return Object.fromEntries(labels.map((label) => [
    label,
    items.filter((item) => item[field] === label).length,
  ]));
}

function valuesForKey(value, key, results = []) {
  if (!value || typeof value !== "object") return results;
  if (Object.hasOwn(value, key)) results.push(value[key]);
  for (const child of Object.values(value)) valuesForKey(child, key, results);
  return results;
}

function finding(ruleId) {
  const matches = ledger.findings.filter((item) => item.ruleId === ruleId);
  assert.equal(matches.length, 1, `${ruleId} must identify exactly one finding`);
  return matches[0];
}

assert.equal(ledger.schema, "matths-principles-smell-audit/2");
assert.equal(ledger.ledgerRole, "historical-audit-record-not-work-queue");
assert.equal(ledger.provenanceStatus, "unverified-external-sources-not-bundled");
assert.match(ledger.executionPolicy, /자동 실행 작업 목록이 아니다/);
assert.equal(ledger.targets.web, "d6c62938fdd3726e0f7d052b47b57142eb42c68a (감사 시점)");
assert.equal(ledger.targets.ipad, "8869906fbb9a376b7015820a824506a79b7d2989");
assert.equal(ledger.sources.length, 2);
for (const source of ledger.sources) {
  assert.equal(source.availability, "not-bundled");
  assert.equal(
    source.coverageVerification,
    "independently-unverifiable-from-this-repository",
  );
}
assert.match(ledger.method, /원시 journal과 원문 PDF가 .*동봉되지 않아/);
assert.match(ledger.method, /독립 재검증할 수 없다/);
assert.equal(ledger.rawAgentOutput.availability, "not-bundled");
assert.equal(
  ledger.rawAgentOutput.sha256,
  "dfcdf1eb121568016b566c74b1c343ee59f6b2f346be6aaf0d38e7f0bfaf9a98",
);
assert.equal(ledger.rawAgentOutput.lineCount, 24);
assert.equal(ledger.rawAgentOutput.agentRuns, 12);
assert.equal(ledger.rawAgentOutput.reportedFindingCount, 121);

assert.equal(ledger.findings.length, 121);
assert.deepEqual(
  countBy(ledger.findings, "severity", ["P1", "P2", "INFO"]),
  { P1: 29, P2: 88, INFO: 4 },
);
assert.deepEqual(
  countBy(ledger.findings, "platformNorm", ["iPad", "웹", "공통"]),
  { iPad: 68, 웹: 46, 공통: 7 },
);

const currentFindings = ledger.findings.filter(
  (item) => !["retracted", "resolved"].includes(item.status),
);
assert.equal(currentFindings.length, 118);
assert.deepEqual(
  countBy(currentFindings, "severity", ["P1", "P2", "INFO"]),
  { P1: 29, P2: 86, INFO: 3 },
);
assert.deepEqual(
  countBy(currentFindings, "platformNorm", ["iPad", "웹", "공통"]),
  { iPad: 66, 웹: 46, 공통: 6 },
);
assert.deepEqual(ledger.summary.raw.bySeverity, { P1: 29, P2: 88, INFO: 4 });
assert.deepEqual(ledger.summary.raw.byPlatform, { iPad: 68, 웹: 46, 공통: 7 });
assert.equal(ledger.summary.raw.noveltyLabels.status, "historical-unverified");
assert.match(ledger.summary.raw.noveltyLabels.note, /실행 가능 작업 수를 뜻하지 않는다/);
assert.deepEqual(ledger.summary.active.bySeverity, { P1: 29, P2: 86, INFO: 3 });
assert.deepEqual(ledger.summary.active.byPlatform, { iPad: 66, 웹: 46, 공통: 6 });
assert.equal(ledger.summary.raw.total, 121);
assert.equal(ledger.summary.active.total, 118);
assert.equal(ledger.summary.rootCauseDeduplication.status, "unverified");
assert.equal(ledger.summary.rootCauseDeduplication.count, null);
assert.equal(valuesForKey(ledger, "distinctByRootCause").length, 0);
assert.equal(valuesForKey(ledger, "sharesRootCauseWith").length, 0);
assert.deepEqual(
  countBy(ledger.findings, "status", ["active", "report-only", "resolved", "retracted"]),
  { active: 78, "report-only": 40, resolved: 2, retracted: 1 },
);
assert.equal(
  ledger.findings.every((item) =>
    ["active", "report-only", "resolved", "retracted"].includes(item.status)),
  true,
);

const correctionIds = ledger.corrections.map((item) => item.ruleId);
assert.equal(new Set(correctionIds).size, correctionIds.length);
for (const correctionId of correctionIds) finding(correctionId);

const retracted0274 = finding("0274");
assert.equal(retracted0274.status, "retracted");
assert.equal(retracted0274.severity, "INFO");
assert.equal(retracted0274.frozen, true);
assert.equal(Object.hasOwn(retracted0274, "evidence"), false);
assert.equal(Object.hasOwn(retracted0274, "fixDirection"), false);
assert.match(retracted0274.retraction, /PKDrawing\.image/);
assert.match(retracted0274.retraction, /0,0,0,255/);
assert.equal(
  retracted0274.verification.artifact,
  "docs/PKDRAWING-DARK-MODE-REPRO.md",
);
assert.match(repro, /transparentCenter=0,0,0,255/);
assert.match(repro, /whiteCenter=0,0,0,255/);
assert.match(reproSource, /PKDrawing/);
assert.match(reproSource, /whiteBackground/);

const oldS05 =
  'S-05 (CORS "*"와 쿠키 인증을 동시에 허용한다) — 출처·자격증명·CSRF 경계 명시';
assert.equal(ledger.findings.some((item) => item.ruleId === oldS05), false);
const headerCorrection = ledger.corrections.find(
  (item) => item.ruleId === "DEPLOY-HEADER-DRIFT",
);
assert.equal(headerCorrection.historicalRuleId, oldS05);
assert.equal(headerCorrection.historicalAction, "retracted");
const headerDrift = finding("DEPLOY-HEADER-DRIFT");
assert.equal(headerDrift.status, "active");
assert.equal(headerDrift.severity, "P2");
assert.equal(headerDrift.platformNorm, "웹");
assert.match(headerDrift.evidence, /CSP·HSTS·X-Frame-Options DENY·nosniff·Referrer-Policy/);
assert.match(headerDrift.evidence, /운영 응답 실측/);
assert.match(headerDrift.fixDirection, /contentSecurityPolicy: false/);
assert.match(headerDrift.fixDirection, /모든 정책이 함께 적용/);
assert.match(headerDrift.fixDirection, /단일 소유 계층/);

for (const ruleId of ["0132", "1706"]) {
  const resolved = finding(ruleId);
  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.frozen, false);
  assert.equal(Object.hasOwn(resolved, "evidence"), false);
  assert.equal(Object.hasOwn(resolved, "fixDirection"), false);
  assert.equal(
    resolved.resolutionCommit,
    "bcf0234234d36a230224a8766b1f983e7e441f8c",
  );
}

const reportOnlyFindings = ledger.findings.filter(
  (item) => item.status === "report-only",
);
assert.ok(reportOnlyFindings.length > 0);
for (const item of reportOnlyFindings) {
  assert.equal(item.frozen, true, `${item.ruleId} report-only finding must be frozen`);
  assert.equal(
    Object.hasOwn(item, "fixDirection"),
    false,
    `${item.ruleId} report-only finding must not retain an implementation direction`,
  );
  assert.equal(typeof item.reportOnlyNote, "string");
  assert.ok(item.reportOnlyNote.length > 0);
}
for (const ruleId of [
  "1202",
  "1780",
  "1815",
  "0074",
  "0379",
  "0527",
  "0756",
  "0757",
  "X-04",
  "1806",
  "0518",
  "1270",
  "1793",
  "0584",
  "1803",
  "F-07",
  "P-02 / P-07",
  "V-01 / V-03",
  "X-01",
  "0755",
  "B-09",
  'B-09 ("백그라운드 작업을 실행했으니 됐다"고 본다) — 재시도 정책·DLQ 런북',
  "Q-04 (경계값·동시성·취소를 테스트하지 않는다) — 부분 실패 재전송 중복",
  "Q-04 (경계값·동시성·취소를 테스트하지 않는다) — 재시도 멱등성",
]) {
  assert.equal(finding(ruleId).status, "report-only");
}
const webV03 = ledger.findings.filter(
  (item) => item.ruleId === "V-03" && item.platformNorm === "웹",
);
assert.equal(webV03.length, 1);
assert.equal(webV03[0].status, "report-only");
assert.equal(webV03[0].frozen, true);
assert.equal(Object.hasOwn(webV03[0], "fixDirection"), false);

for (const [relativePath, source] of [
  ["docs/principles-smell-audit.json", ledgerSource],
  ["docs/principles-smell-audit.md", markdown],
  ["docs/CODEX-HANDOFF.md", handoff],
  ["docs/PKDRAWING-DARK-MODE-REPRO.md", repro],
  ["docs/LOCAL-ENV-RUNBOOK.md", runbook],
]) {
  for (const forbidden of [
    /\/Users\//i,
    new RegExp(String.raw`C:\\${"Users"}\\`, "i"),
    /file:\/\//i,
    /Documents\/Codex/i,
    /\.codex\/attachments/i,
    /workflow\s+wf_[a-z0-9-]+/i,
    new RegExp(["soo", "bin"].join(""), "i"),
    /[\w.%+-]+@(gmail|naver|lsbproduction)\.(com|co\.kr)/i,
  ]) {
    assert.doesNotMatch(source, forbidden, `${relativePath} contains private/local provenance`);
  }
}

assert.match(markdown, /역사 감사 기록이며 작업 목록이 아니다/);
assert.match(markdown, /원시 역사 항목 \| 121 \| 29 \| 88 \| 4 \| 68 \| 46 \| 7/);
assert.match(markdown, /현재 사실 항목 \| 118 \| 29 \| 86 \| 3 \| 66 \| 46 \| 6/);
assert.doesNotMatch(markdown, /\bNone\b/);
assert.doesNotMatch(markdown, /고유 결함\s*116|116개(?:의)?\s*고유/);
assert.match(handoff, /역사 감사 기록이지 작업 목록이 아니다/);
assert.match(handoff, /D2 — 소비된 grant의 동일 응답 재생 \(`d6296bf`\)/);
assert.match(handoff, /AES-256-GCM/);
assert.match(handoff, /responseCiphertext: null.*CAS/);
assert.match(handoff, /`sub`와 현재 `tokenVersion`/);
assert.match(handoff, /iPhone·iPad 전환 \(`bcf0234`\)/);
assert.match(handoff, /실기 iPad 설치·launch 확인: `fa46a6d`/);
assert.match(handoff, /원시 12-agent journal과 원문 PDF는 저장소에 동봉되지 않았다/);

const grantModel = read("models/mobileAuthGrantModel.js");
const grantService = read("services/mobileSocialAuthGrantService.js");
const apiController = read("controllers/apiController.js");
const socialAuthContract = read("tests/social-auth-mobile.test.js");
assert.match(grantModel, /responseCiphertext/);
assert.match(grantModel, /resultExpiresAt/);
assert.match(grantService, /RESULT_CIPHER = "aes-256-gcm"/);
assert.match(grantService, /responseCiphertext: null/);
assert.match(grantService, /CODE_VERIFIER_PATTERN = .*\{43,128\}/);
assert.match(apiController, /verifyAccessToken\(stableResponse\.accessToken\)/);
assert.match(apiController, /stableTokenPayload\.sub/);
assert.match(apiController, /user\.tokenVersion/);
assert.match(socialAuthContract, /assert\.deepEqual\(retriedStableResult, firstStableResult\)/);
assert.match(socialAuthContract, /a retry must reconstruct the identical Bearer/);
assert.match(socialAuthContract, /resultExpiresAt/);

assert.match(runbook, /-type f -name mongod -perm -111/);
assert.match(runbook, /"\$candidate" --version/);
assert.match(runbook, /원백업에서 새로 만든 독립 복제본/);
assert.match(runbook, /패키지 버전과 내려받은 `mongod` 버전은 같은\s*\n숫자라는 보장이 없다/);
assert.doesNotMatch(runbook, /@(gmail|naver|lsbproduction)\.(com|co\.kr)/i);

const manifest = read("scripts/run-tests.js");
assert.match(manifest, /tests\/principles-smell-audit-contract\.test\.js/);

console.log("Principles/smell historical-ledger contract passed.");
