#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { MongoClient } = require("mongodb");
const {
  assertOutputAvailable,
  assertAtlasProductionTarget,
  cleanSourceCommit,
  writeExclusiveJson,
} = require("../services/atlasOperationEvidenceService");
const {
  APPLY_CONFIRMATION,
  applyAuthorityIndexCleanup,
  assertApplyAuthorized,
  inspectAuthorityIndexes,
} = require("../services/authorityIndexCleanupService");

const ROOT = path.resolve(__dirname, "..");
const ENV_FILE = path.join(ROOT, "config.env");

function parseArguments(argv) {
  const allowed = argv.filter((argument) =>
    argument === "--apply" || argument.startsWith("--confirm=") ||
    argument.startsWith("--environment=") || argument.startsWith("--report-output="));
  if (allowed.length !== argv.length) {
    throw new Error(
      `unknown arguments: ${argv.filter((argument) => !allowed.includes(argument)).join(", ")}`,
    );
  }
  const confirmations = argv
    .filter((argument) => argument.startsWith("--confirm="))
    .map((argument) => argument.slice("--confirm=".length));
  if (confirmations.length > 1) {
    throw new Error("--confirm may be provided only once");
  }
  const environmentArgument = argv.find((argument) => argument.startsWith("--environment="));
  const reportArgument = argv.find((argument) => argument.startsWith("--report-output="));
  const environment = environmentArgument
    ? environmentArgument.slice("--environment=".length)
    : process.env.NODE_ENV === "production" ? "production" : "local";
  if (!["local", "test", "production"].includes(environment)) {
    throw new Error("--environment must be local, test, or production");
  }
  const parsed = {
    apply: argv.includes("--apply"),
    confirmation: confirmations[0] || "",
    environment,
    reportOutput: reportArgument ? reportArgument.slice("--report-output=".length) : "",
  };
  if (parsed.apply && parsed.environment === "production" && !parsed.reportOutput) {
    throw new Error("production apply requires --report-output");
  }
  if (parsed.reportOutput && (!parsed.apply || parsed.environment !== "production")) {
    throw new Error("--report-output requires production apply");
  }
  return parsed;
}

async function run(argv = process.argv.slice(2)) {
  if (fs.existsSync(ENV_FILE)) {
    require("dotenv").config({ path: ENV_FILE, quiet: true });
  }
  const options = parseArguments(argv);
  assertApplyAuthorized(options);
  const uri = String(process.env.DB || "").trim();
  if (!uri) {
    throw new Error("DB is required for the authority index audit");
  }
  const reportIdentity = options.reportOutput
    ? {
        output: assertOutputAvailable(options.reportOutput),
        sourceCommit: cleanSourceCommit(),
        targetFingerprint: assertAtlasProductionTarget(uri),
      }
    : null;

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15_000,
    connectTimeoutMS: 15_000,
  });
  await client.connect();
  try {
    const db = client.db();
    if (!options.apply) {
      const report = await inspectAuthorityIndexes({ db });
      process.stdout.write(
        `${JSON.stringify({ mode: "DRY_RUN", confirmationRequired: APPLY_CONFIRMATION, ...report }, null, 2)}\n`,
      );
      if (!report.safeToApply) process.exitCode = 2;
      return report;
    }

    const result = await applyAuthorityIndexCleanup({
      db,
      confirmation: options.confirmation,
    });
    process.stdout.write(
      `${JSON.stringify({ mode: "APPLY", ...result }, null, 2)}\n`,
    );
    if (options.reportOutput) {
      const report = {
        schemaVersion: "MATTHS_AUTHORITY_INDEX_CLEANUP_RUN_V1",
        result: "PASS",
        environment: "production",
        mode: "apply",
        sourceCommit: reportIdentity.sourceCommit,
        targetFingerprint: reportIdentity.targetFingerprint,
        droppedIndexCount: result.dropped.length,
        remainingRemovableCount: result.after.removableCount,
        fingerprintMismatchCount: result.after.fingerprintMismatchCount,
        legacyBlockedCollectionCount: result.after.legacyBlockedCollections.length,
        observedAt: new Date().toISOString(),
      };
      process.stdout.write(
        `${JSON.stringify({ reportOutput: writeExclusiveJson(reportIdentity.output, report) }, null, 2)}\n`,
      );
    }
    return result;
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  run().catch((error) => {
    const payload = {
      ok: false,
      code: error.code || "AUTHORITY_INDEX_CLEANUP_FAILED",
      message: error.message,
    };
    if (error.report) payload.report = error.report;
    process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
    process.exitCode = 1;
  });
}

module.exports = { parseArguments, run };
