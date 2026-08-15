#!/usr/bin/env node

"use strict";

const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: "./config.env", quiet: true });

const {
  resumePendingWithdrawals,
} = require("../services/accountDeletionService");

const APPLY = process.argv.includes("--apply");
const CONFIRMED = process.argv.includes(
  "--confirm=RESUME_PENDING_WITHDRAWALS"
);
const limitArgument = process.argv.find((value) => value.startsWith("--limit="));
const LIMIT = Math.max(
  1,
  Math.min(500, Number(limitArgument?.split("=")[1]) || 100)
);

async function main() {
  if (!process.env.DB) {
    throw new Error("config.env의 DB 연결 문자열이 필요합니다.");
  }
  if (!APPLY || !CONFIRMED) {
    throw new Error(
      "중단된 탈퇴를 재개하려면 --apply --confirm=RESUME_PENDING_WITHDRAWALS를 함께 지정해야 합니다."
    );
  }

  await mongoose.connect(process.env.DB, {
    serverSelectionTimeoutMS: 15_000,
    connectTimeoutMS: 15_000,
  });
  try {
    const result = await resumePendingWithdrawals({ limit: LIMIT });
    console.log(JSON.stringify(result, null, 2));
    if (result.failed) process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  console.error(String(error?.message || error));
  if (mongoose.connection.readyState) await mongoose.disconnect();
  process.exitCode = 1;
});
