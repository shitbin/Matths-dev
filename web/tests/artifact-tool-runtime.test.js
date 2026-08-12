"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const scripts = [
  "scripts/buildArenaTestWorkbook.mjs",
  "scripts/createArenaVirtualUsersWorkbook.mjs",
];

const fixtureDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "matths-artifact-tool-contract-"),
);
const fixtureModule = path.join(fixtureDirectory, "artifact_tool.mjs");
fs.writeFileSync(
  fixtureModule,
  "export const Workbook = {}; export const SpreadsheetFile = {};\n",
  "utf8",
);

try {
  for (const relativePath of scripts) {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.doesNotMatch(source, /\/Users\//, `${relativePath} must not contain a personal home path`);

    const result = spawnSync(process.execPath, [relativePath, "--check-runtime"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        MATTHS_ARTIFACT_TOOL_MODULE: fixtureModule,
      },
    });
    assert.equal(
      result.status,
      0,
      `${relativePath} runtime check failed:\n${result.stderr || result.stdout}`,
    );
    assert.match(result.stdout, /artifact-tool runtime ready/);
  }
} finally {
  fs.rmSync(fixtureDirectory, { recursive: true, force: true });
}

console.log("artifact-tool workbook runtime contract passed");
