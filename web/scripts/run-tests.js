#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const testsDirectory = path.join(repoRoot, "tests");

// Keep this list explicit so test coverage cannot change silently.
// Tests run sequentially in the order below and stop on the first failure.
const testFiles = [
  "tests/access-economy.test.js",
  "tests/access-controller.test.js",
  "tests/goat-arena-foundation.test.js",
  "tests/goat-arena-read-model.test.js",
  "tests/goat-arena-match-read.test.js",
  "tests/goat-arena-command-service.test.js",
  "tests/goat-arena-command-controller.test.js",
  "tests/goat-arena-production-adapter.test.js",
  "tests/arena-ipad-visualization-contract.test.js",
  "tests/arena-pdf-recent-structure.test.js",
  "tests/goat-arena-main-native.test.js",
  "tests/cycle-attendance.test.js",
  "tests/cycle-attendance-outbox.test.js",
  "tests/ipad-attendance-outbox.test.js",
  "tests/arena-season-profile.test.js",
  "tests/arena-question-pack.test.js",
  "tests/arena-question-bank-isolation.test.js",
  "tests/arena-pdf-preview-export.test.js",
  "tests/arena-tier-catalog-import-safety.test.js",
  "tests/arena-match-attempt-service.test.js",
  "tests/arena-attempt-deadline.test.js",
  "tests/arena-attempt-deadline-unit.test.js",
  "tests/arena-match-scoring-service.test.js",
  "tests/arena-rank-scoring-boundary.test.js",
  "tests/arena-match-scoring-outbox.test.js",
  "tests/arena-revenge-right.test.js",
  "tests/arena-revenge-settlement-rule.test.js",
  "tests/sub-normal-settlement-rule.test.js",
  "tests/arena-takeover-outbox.test.js",
  "tests/arena-pair-integrity-service.test.js",
  "tests/defender-assignment-service.test.js",
  "tests/defender-assignment-index-migration.test.js",
  "tests/arena-shop.test.js",
  "tests/arena-authority-boundary.test.js",
  "tests/arena-platform-contract.test.js",
  "tests/arena-operational-policy.test.js",
  "tests/arena-client-review-contract.test.js",
  "tests/arena-client-review.test.js",
  "tests/rank-takeover-match.test.js",
  "tests/rank-takeover-service.test.js",
  "tests/payment-webhook-inbox.test.js",
  "tests/payment-capture.test.js",
  "tests/access-cycle-model-authority.test.js",
  "tests/access-cycle-migration-apply.test.js",
  "tests/access-cycle-migration-guard.test.js",
  "tests/authority-stale-index-cleanup.test.js",
  "tests/schema-parity.test.js",
  "tests/checkout-gate.test.js",
  "tests/toss-payments.test.js",
  "tests/production-preflight.test.js",
  "tests/cafe24-release-package.test.js",
  "tests/cafe24-deployment-verification.test.js",
  "tests/local-preview-db-boundary.test.js",
  "tests/design-review-package.test.js",
  "tests/full-design-review-package.test.js",
  "tests/final-release-readiness.test.js",
  "tests/atlas-migration-evidence.test.js",
  "tests/weekly-mock-api-contract.test.js",
  "tests/ipad-assessment-sync-http.test.js",
  "tests/weekly-mock-evidence-idempotency.test.js",
  "tests/ipad-api-surface-parity.test.js",
  "tests/ipad-screen-integrity-event.test.js",
  "tests/ipad-placement-promotion-contract.test.js",
  "tests/ipad-placement-promotion-http.test.js",
  "tests/ipad-assessment-catalog-parity.test.js",
  "tests/placement-promotion-service.test.js",
  "tests/rank-motion-web-contract.test.js",
  "tests/api-auth-account-status.test.js",
  "tests/session-api-auth-boundary.test.js",
  "tests/ranking-identity-api.test.js",
  "tests/profile-school-api.test.js",
  "tests/social-auth-mobile.test.js",
  "tests/google-account-deletion-reauth-http.test.js",
  "tests/google-oauth-production-evidence.test.js",
  "tests/payment-production-evidence.test.js",
  "tests/ipad-learning-state.test.js",
  "tests/quick-practice-api-http.test.js",
  "tests/web-first-entry-http-contract.test.js",
  "tests/api-rulebook-http.test.js",
  "tests/ranking-service.test.js",
  "tests/final-ranking-write-plan.test.js",
  "tests/arena.test.js",
  "tests/dashboard-activity.test.js",
  "tests/dashboard-activity-controller.test.js",
  "tests/dashboard-home-render.test.js",
  "tests/public-language-contract.test.js",
  "tests/brand-font-contract.test.js",
  "tests/product-refresh-contract.test.js",
  "tests/web-interaction-size-contract.test.js",
  "tests/web-accessibility-contract.test.js",
  "tests/responsive-evidence-capture.test.js",
  "tests/local-capture-role-seed.test.js",
  "tests/arena-mobile-navigation.test.js",
  "tests/arena-feature-design.test.js",
  "tests/arena-revenge-experience.test.js",
  "tests/arena-gradient-discipline.test.js",
  "tests/ejs-attribute-contract.test.js",
  "tests/assessment-center-design.test.js",
  "tests/arena-access-view.test.js",
  "tests/curriculum-public-atlas.test.js",
  "tests/public-curriculum-scope-copy.test.js",
  "tests/intro-design.test.js",
  "tests/learning-flow-design.test.js",
  "tests/visual-learning-design.test.js",
  "tests/wrong-notes-design.test.js",
  "tests/study-hall-design.test.js",
  "tests/store-product-design.test.js",
  "tests/community-design.test.js",
  "tests/profile-design.test.js",
  "tests/parent-experience-design.test.js",
  "tests/admin-experience-design.test.js",
  "tests/curriculum-concept-check.test.js",
  "tests/curriculum-learning-paths.test.js",
  "tests/curriculum-editorial-quality.test.js",
  "tests/concept-learning-completeness.test.js",
  "tests/progress-type-id.test.js",
  "tests/learning-pull.test.js",
  "tests/topic-completion.test.js",
  "tests/mastery-progress.test.js",
  "tests/wrongnotes-bulk-update.test.js",
  "tests/wrong-note-incremental-updated-at.test.js",
  "tests/war-of-masters-render.test.js",
];

// Cafe24 release archive에는 웹/서버 정본만 있고 형제 저장소인 ../ipad-app은 없다.
// 이 검사는 패키징 전에 전체 작업공간에서 반드시 실행하고, 독립 아카이브에서는
// 나머지 웹/서버 검사를 다시 실행한다. 목록을 넓히면 아래 계약 검사가 실패한다.
const deploymentExcludedTests = Object.freeze([
  "tests/arena-ipad-visualization-contract.test.js",
  "tests/final-release-readiness.test.js",
  "tests/goat-arena-main-native.test.js",
  "tests/goat-arena-production-adapter.test.js",
  "tests/ipad-api-surface-parity.test.js",
  "tests/ipad-placement-promotion-contract.test.js",
  "tests/ipad-assessment-catalog-parity.test.js",
  "tests/social-auth-mobile.test.js",
]);

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right, "en"));
}

function assertCompleteManifest() {
  const duplicateFiles = sorted(
    testFiles.filter((file, index) => testFiles.indexOf(file) !== index),
  );

  const discoveredFiles = sorted(
    fs
      .readdirSync(testsDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".test.js"))
      .map((entry) => path.posix.join("tests", entry.name)),
  );
  const manifestedFiles = sorted(new Set(testFiles));
  const manifestedSet = new Set(manifestedFiles);
  const discoveredSet = new Set(discoveredFiles);
  const missingFromManifest = discoveredFiles.filter(
    (file) => !manifestedSet.has(file),
  );
  const missingFromDisk = manifestedFiles.filter(
    (file) => !discoveredSet.has(file),
  );

  if (
    duplicateFiles.length > 0 ||
    missingFromManifest.length > 0 ||
    missingFromDisk.length > 0
  ) {
    console.error("Test manifest is out of sync.");
    if (duplicateFiles.length > 0) {
      console.error(`  Duplicate entries: ${duplicateFiles.join(", ")}`);
    }
    if (missingFromManifest.length > 0) {
      console.error(
        `  Missing from manifest: ${missingFromManifest.join(", ")}`,
      );
    }
    if (missingFromDisk.length > 0) {
      console.error(`  Missing from disk: ${missingFromDisk.join(", ")}`);
    }
    process.exit(1);
  }

  console.log(`Test manifest OK: ${testFiles.length} files, no omissions.`);
}

assertCompleteManifest();

for (const excluded of deploymentExcludedTests) {
  if (!testFiles.includes(excluded)) {
    console.error(`Deployment exclusion is not in the full manifest: ${excluded}`);
    process.exit(1);
  }
}

if (process.argv.includes("--check")) {
  process.exit(0);
}

const selectedTests = process.argv.includes("--deployment")
  ? testFiles.filter((file) => !deploymentExcludedTests.includes(file))
  : testFiles;

if (process.argv.includes("--deployment")) {
  console.log(
    `Deployment archive mode: ${selectedTests.length} web/server tests; `
      + `${deploymentExcludedTests.length} sibling-iPad source contracts were verified before packaging.`,
  );
}

for (const [index, testFile] of selectedTests.entries()) {
  console.log(`\n[${index + 1}/${selectedTests.length}] ${testFile}`);

  const result = spawnSync(process.execPath, [path.join(repoRoot, testFile)], {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`Unable to run ${testFile}:`, result.error);
    process.exit(1);
  }

  if (result.signal) {
    console.error(`${testFile} terminated by signal ${result.signal}.`);
    process.kill(process.pid, result.signal);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`\nAll ${selectedTests.length} test files passed.`);

module.exports = { deploymentExcludedTests, testFiles };
