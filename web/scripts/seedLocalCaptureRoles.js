#!/usr/bin/env node

"use strict";

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const { User } = require("../models/matthsModel");
const { ParentAccount, ParentChildLink } = require("../models/parentModel");

const batchKey = "LOCAL-RESPONSIVE-CAPTURE";

function fail(message) {
  throw new Error(message);
}

function assertLocalDatabase(uri) {
  if (!/^mongodb:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//i.test(uri)) {
    fail("로컬 캡처 계정은 localhost MongoDB에서만 만들 수 있습니다.");
  }
  const databaseName = uri.replace(/^mongodb:\/\/[^/]+\//i, "").split(/[?&]/, 1)[0];
  if (!/(?:test|dev|local|preview)/i.test(databaseName)) {
    fail("DB 이름에 test, dev, local 또는 preview가 포함되어야 합니다.");
  }
}

async function main() {
  if (process.env.MATTHS_CAPTURE_SEED !== "local-only") {
    fail("MATTHS_CAPTURE_SEED=local-only 확인값이 필요합니다.");
  }
  const uri = String(process.env.DB || "").trim();
  const password = String(process.env.MATTHS_CAPTURE_SEED_PASSWORD || "");
  if (!uri) fail("DB 환경변수가 필요합니다.");
  if (password.length < 10) fail("캡처 계정 비밀번호는 10자 이상이어야 합니다.");
  assertLocalDatabase(uri);

  mongoose.set("autoIndex", false);
  await mongoose.connect(uri);
  const student = await User.findOne({
    email: String(process.env.MATTHS_CAPTURE_STUDENT_EMAIL || "placetester3@test.local")
      .trim()
      .toLowerCase(),
    accountStatus: "active",
  });
  if (!student) fail("연결할 로컬 학생 테스트 계정을 찾지 못했습니다.");

  const passwordHash = await bcrypt.hash(password, 12);
  const adminEmail = "admin.capture@test.local";
  const parentEmail = "parent.capture@test.local";
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await User.findOneAndUpdate(
        { email: adminEmail },
        {
          $set: {
            name: "captureadmin",
            nameNormalized: "captureadmin",
            realName: "로컬 검수 관리자",
            passwordHash,
            role: "admin",
            isTestAccount: true,
            testBatchKey: batchKey,
            accountStatus: "active",
            isActive: true,
          },
        },
        { upsert: true, runValidators: true, setDefaultsOnInsert: true, session },
      );

      const parent = await ParentAccount.findOneAndUpdate(
        { email: parentEmail },
        {
          $set: {
            username: "captureparent",
            usernameNormalized: "captureparent",
            passwordHash,
            childUserId: student._id,
            isActive: true,
            acceptedTermsAt: new Date(),
          },
        },
        { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true, session },
      );

      await ParentChildLink.findOneAndUpdate(
        { parentAccountId: parent._id, childUserId: student._id },
        {
          $set: { status: "ACTIVE" },
          $setOnInsert: { linkedAt: new Date() },
        },
        { upsert: true, runValidators: true, setDefaultsOnInsert: true, session },
      );
    });
  } finally {
    await session.endSession();
    await mongoose.disconnect();
  }

  process.stdout.write(`${JSON.stringify({
    database: "local-only",
    studentEmail: student.email,
    parentEmail,
    adminEmail,
    batchKey,
  }, null, 2)}\n`);
}

main().catch(async (error) => {
  await mongoose.disconnect().catch(() => {});
  console.error(error.message || error);
  process.exitCode = 1;
});
