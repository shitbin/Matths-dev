#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");

const ROOT = path.resolve(__dirname, "..");
const envFile = path.join(ROOT, "config.env");
const COLLECTION_NAME =
  "defenderassignmentaudits";
const LEGACY_INDEX_NAME =
  "requestId_1";
const TARGET_INDEX_NAME =
  "challenger_request_id_unique";
const TARGET_KEY = Object.freeze({
  challengerUserId: 1,
  requestId: 1,
});

function stableKey(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return "";
  }
  return Object.entries(value)
    .map(
      ([key, direction]) =>
        `${key}:${direction}`
    )
    .join("|");
}

function planIndexMigration(
  indexes
) {
  if (!Array.isArray(indexes)) {
    throw new TypeError(
      "indexes must be an array"
    );
  }
  const target =
    indexes.find(
      (index) =>
        index?.name ===
        TARGET_INDEX_NAME
    );
  if (
    target &&
    (stableKey(target.key) !==
      stableKey(TARGET_KEY) ||
      target.unique !== true)
  ) {
    throw new Error(
      `${TARGET_INDEX_NAME} exists with an unexpected definition`
    );
  }

  const legacy =
    indexes.find(
      (index) =>
        index?.name ===
        LEGACY_INDEX_NAME
    );
  const safeLegacyUnique =
    legacy &&
    stableKey(legacy.key) ===
      stableKey({
        requestId: 1,
      }) &&
    legacy.unique === true;

  return Object.freeze({
    createTarget: !target,
    dropLegacy:
      Boolean(safeLegacyUnique),
  });
}

function isNamespaceMissing(
  error
) {
  return (
    error?.code === 26 ||
    error?.codeName ===
      "NamespaceNotFound"
  );
}

function isIndexMissing(
  error
) {
  return (
    error?.code === 27 ||
    error?.codeName ===
      "IndexNotFound"
  );
}

function isIndexMissing(
  error
) {
  return (
    error?.code === 27 ||
    error?.codeName ===
      "IndexNotFound"
  );
}

async function currentIndexes(
  collection
) {
  try {
    return await collection
      .listIndexes()
      .toArray();
  } catch (error) {
    if (
      isNamespaceMissing(error)
    ) {
      return [];
    }
    throw error;
  }
}

async function run() {
  if (fs.existsSync(envFile)) {
    require("dotenv").config({
      path: envFile,
    });
  }
  const uri =
    String(
      process.env.DB || ""
    ).trim();
  if (!uri) {
    throw new Error(
      "DB is required for the defender assignment index migration"
    );
  }

  await mongoose.connect(uri, {
    autoIndex: false,
  });
  try {
    const collection =
      mongoose.connection
        .collection(
          COLLECTION_NAME
        );
    const before =
      await currentIndexes(
        collection
      );
    const plan =
      planIndexMigration(
        before
      );

    if (plan.createTarget) {
      await collection
        .createIndex(
          TARGET_KEY,
          {
            unique: true,
            name:
              TARGET_INDEX_NAME,
          }
        );
    }

    const afterCreate =
      await currentIndexes(
        collection
      );
    const verified =
      planIndexMigration(
        afterCreate
      );
    if (verified.createTarget) {
      throw new Error(
        `${TARGET_INDEX_NAME} was not created`
      );
    }

    if (verified.dropLegacy) {
      try {
        await collection
          .dropIndex(
            LEGACY_INDEX_NAME
          );
      } catch (error) {
        // Rolling deploys can run this migration concurrently. Another
        // instance removing the exact legacy index first is already success;
        // every other drop failure remains fatal and the final state is still
        // re-read below.
        if (
          !isIndexMissing(
            error
          )
        ) {
          throw error;
        }
      }
    }

    const finalIndexes =
      await currentIndexes(
        collection
      );
    const finalPlan =
      planIndexMigration(
        finalIndexes
      );
    if (
      finalPlan.createTarget ||
      finalPlan.dropLegacy
    ) {
      throw new Error(
        "defender assignment index migration did not converge"
      );
    }

    process.stdout.write(
      "Defender assignment indexes are current.\n"
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  run().catch((error) => {
    process.stderr.write(
      `Defender assignment index migration failed: ${error.message}\n`
    );
    process.exitCode = 1;
  });
}

module.exports = {
  LEGACY_INDEX_NAME,
  TARGET_INDEX_NAME,
  TARGET_KEY,
  isIndexMissing,
  planIndexMigration,
};
