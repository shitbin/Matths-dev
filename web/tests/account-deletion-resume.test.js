"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const { User, UserNotification } = require("../models/matthsModel");
const {
  resumePendingWithdrawals,
} = require("../services/accountDeletionService");

async function main() {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  try {
    await mongoose.connect(replSet.getUri("account-deletion-resume"));
    const user = await User.create({
      name: "탈퇴복구검증",
      realName: "복구 검증 학생",
      email: "withdrawal-resume@example.test",
      passwordHash: "not-a-real-password-hash",
      role: "student",
      accountStatus: "inactive",
      accountStatusReason: "withdrawal_in_progress",
      isActive: false,
      tokenVersion: 8,
      withdrawal: {
        startedAt: new Date(Date.now() - 60_000),
        stage: "uploads-removed",
        initiatedBy: "admin",
        dataRetention: "anonymous",
      },
    });
    await UserNotification.create({
      userId: user._id,
      title: "재실행 검증",
      message: "중단 지점 이전 단계는 다시 실행돼도 안전해야 합니다.",
    });

    const result = await resumePendingWithdrawals({ limit: 10 });
    assert.deepEqual(
      { scanned: result.scanned, completed: result.completed, failed: result.failed },
      { scanned: 1, completed: 1, failed: 0 },
    );
    const completed = await User.findById(user._id).lean();
    assert.equal(completed.accountStatus, "withdrawn");
    assert.equal(completed.withdrawal?.stage, "completed");
    assert.ok(completed.withdrawal?.completedAt instanceof Date);
    assert.equal(completed.withdrawal?.dataRetention, "anonymous");
    assert.equal(completed.tokenVersion, 8, "재개 시 토큰 버전을 두 번 올리면 안 됩니다.");

    const second = await resumePendingWithdrawals({ limit: 10 });
    assert.equal(second.scanned, 0, "완료 계정은 재실행 큐에서 빠져야 합니다.");

    const runner = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "resumePendingAccountWithdrawals.js"),
      "utf8",
    );
    assert.match(runner, /--apply/);
    assert.match(runner, /--confirm=RESUME_PENDING_WITHDRAWALS/);
    assert.match(runner, /resumePendingWithdrawals/);
    assert.doesNotMatch(runner, /name email|select\([^)]*email/);

    console.log("Interrupted account deletion resumes once without re-exposing personal data");
  } finally {
    await mongoose.disconnect().catch(() => {});
    await replSet.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
