"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const fileStorage = require("../services/fileStorageService");
const archiveService = require("../services/archiveService");
const adminTodoService = require("../services/adminTodoService");

let failUploads = false;
let pauseUpload = null;
let uploadStarted = null;
let storedSequence = 0;

fileStorage.storeUploadedFile = async (file) => {
  uploadStarted?.();
  if (pauseUpload) await pauseUpload;
  if (failUploads) throw new Error("simulated storage failure");
  storedSequence += 1;
  const asset = {
    storageProvider: "CLOUDINARY",
    storagePurpose: "USER_PRIVATE_MOCK_INTEGRITY",
    storedName: `stored-${storedSequence}.jpg`,
    cloudPublicId: `private-mock/${storedSequence}`,
    cloudResourceType: "image",
    cloudDeliveryType: "authenticated",
    cloudVersion: storedSequence,
    cloudFormat: "jpg",
  };
  file.storageAsset = asset;
  return asset;
};
fileStorage.destroyStoredAsset = async () => {};
archiveService.discardArchiveUpload = async (file) => {
  if (file?.path) await fs.promises.unlink(file.path).catch(() => {});
};
adminTodoService.createAdminTodo = async () => ({ id: "todo-1" });

const {
  ArchiveItem,
  PrivateMockIntegrityCase,
} = require("../models/matthsModel");
const {
  submitPrivateMockIntegrityEvidence,
} = require("../services/privateMockExamService");

const NOW = new Date("2026-08-12T08:00:00.000Z");
const oid = () => new mongoose.Types.ObjectId();

async function createCase(userId) {
  const value = {
    _id: oid(),
    userId,
    examId: oid(),
    attemptId: oid(),
    weekKey: "2026-W33",
    status: "EVIDENCE_REQUIRED",
    riskScore: 0,
    suspicionSignals: [],
    requestedQuestionNumbers: [3, 7],
    evidenceRequest: {
      requestedAt: NOW,
      deadlineAt: new Date(NOW.getTime() + 60 * 60 * 1000),
      instructions: "3번과 7번 풀이 전체를 제출해주세요.",
    },
    evidenceSubmissions: [],
    reviewStatus: "unreviewed",
    penaltyDecision: "pending",
    createdAt: NOW,
    updatedAt: NOW,
  };
  await PrivateMockIntegrityCase.collection.insertOne(value);
  return value;
}

async function evidenceFile(label) {
  const filePath = path.join(
    os.tmpdir(),
    `matths-weekly-evidence-${label}-${Date.now()}-${Math.random()}.jpg`
  );
  await fs.promises.writeFile(
    filePath,
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
  );
  return {
    path: filePath,
    filename: path.basename(filePath),
    originalname: `${label}.jpg`,
    mimetype: "image/jpeg",
    size: 10,
  };
}

async function submit({ userId, caseId, submissionId, label }) {
  return submitPrivateMockIntegrityEvidence({
    userId,
    caseId,
    submissionId,
    files: [await evidenceFile(label)],
    note: "풀이 순서대로 첨부했습니다.",
    now: NOW,
  });
}

async function main() {
  const replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  try {
    await mongoose.connect(replicaSet.getUri(), {
      dbName: "weekly-mock-evidence-idempotency",
    });
    const userId = oid();

    const firstCase = await createCase(userId);
    const first = await submit({
      userId,
      caseId: firstCase._id,
      submissionId: "evidence-command-stable-1",
      label: "first",
    });
    const replay = await submit({
      userId,
      caseId: firstCase._id,
      submissionId: "evidence-command-stable-1",
      label: "replay",
    });
    assert.equal(first.replayed, false);
    assert.equal(replay.replayed, true);
    assert.equal(replay.receiptId, first.receiptId);
    const firstStored = await PrivateMockIntegrityCase.findById(firstCase._id).lean();
    assert.equal(firstStored.evidenceSubmissions.length, 1);
    assert.equal(await ArchiveItem.countDocuments({ uploadedBy: userId }), 1);

    const concurrentCase = await createCase(userId);
    let releaseUpload;
    pauseUpload = new Promise((resolve) => { releaseUpload = resolve; });
    const reachedStorage = new Promise((resolve) => { uploadStarted = resolve; });
    const inFlight = submit({
      userId,
      caseId: concurrentCase._id,
      submissionId: "evidence-command-concurrent",
      label: "concurrent-first",
    });
    await reachedStorage;
    await assert.rejects(
      () => submit({
        userId,
        caseId: concurrentCase._id,
        submissionId: "evidence-command-concurrent",
        label: "concurrent-second",
      }),
      (error) => error.code === "EVIDENCE_SUBMISSION_IN_PROGRESS"
    );
    uploadStarted = null;
    pauseUpload = null;
    releaseUpload();
    const concurrentReceipt = await inFlight;
    const concurrentReplay = await submit({
      userId,
      caseId: concurrentCase._id,
      submissionId: "evidence-command-concurrent",
      label: "concurrent-replay",
    });
    assert.equal(concurrentReplay.receiptId, concurrentReceipt.receiptId);
    const concurrentStored = await PrivateMockIntegrityCase.findById(concurrentCase._id).lean();
    assert.equal(concurrentStored.evidenceSubmissions.length, 1);

    const retryCase = await createCase(userId);
    failUploads = true;
    await assert.rejects(
      () => submit({
        userId,
        caseId: retryCase._id,
        submissionId: "evidence-command-retry",
        label: "failed",
      }),
      /simulated storage failure/
    );
    const released = await PrivateMockIntegrityCase.findById(retryCase._id).lean();
    assert.equal(released.status, "EVIDENCE_REQUIRED");
    assert.equal(released.evidenceSubmissionCommand.state, "");
    assert.equal(released.evidenceSubmissions.length, 0);
    failUploads = false;
    const recovered = await submit({
      userId,
      caseId: retryCase._id,
      submissionId: "evidence-command-retry",
      label: "recovered",
    });
    assert.equal(recovered.replayed, false);

    console.log("weekly mock evidence idempotency and retry recovery: ok");
  } finally {
    await mongoose.disconnect();
    await replicaSet.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
