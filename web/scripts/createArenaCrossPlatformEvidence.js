"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const {
  ArenaMatch,
  ArenaMatchAttempt,
  ArenaProblemPack,
} = require("../models/goatArenaModel");
const { User } = require("../models/matthsModel");
const {
  getArenaMatchPageData,
  prepareArenaMatch,
} = require("../services/arenaMatchAttemptService");
const {
  buildArenaProblemPackDraft,
  computeArenaProblemPackHash,
} = require("../services/arenaProblemPackService");
const {
  createGoatArenaProductionCommandService,
} = require("../services/goatArenaProductionCommandService");
const {
  getParticipantMatch,
} = require("../services/goatArenaProductionMatchReadService");
const { resolveIpadRoot } = require("./resolveIpadWorkspace");

const REPO_ROOT = path.resolve(__dirname, "..");
const IPAD_ROOT = resolveIpadRoot(REPO_ROOT);
const DEFAULT_OUTPUT_DIRECTORY = path.join(
  os.tmpdir(),
  "matths-arena-cross-platform-evidence"
);
const NOW = new Date("2026-08-10T06:00:00.000Z");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fileHash(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  return {
    path: relativePath,
    sha256: sha256(fs.readFileSync(absolutePath)),
  };
}

function externalFileHash(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  return {
    path: relativePath,
    sha256: sha256(fs.readFileSync(absolutePath)),
  };
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

function objectId() {
  return new mongoose.Types.ObjectId();
}

function comparableWeb(page) {
  const current = Array.isArray(page.questions) ? page.questions[0] : null;
  return {
    matchId: page.id,
    matchStatus: page.matchStatus,
    attemptStatus: page.attempt?.status || null,
    currentQuestionIndex: page.attempt?.currentQuestionIndex ?? null,
    currentQuestionNumber: current?.number ?? null,
    questionKey: current?.questionKey || null,
    canPrepare: page.canPrepare === true,
    canStart: page.canStart === true,
    inProgress: page.inProgress === true,
    evidenceRequired: page.evidenceRequired === true,
  };
}

function comparableIpadRead(dto) {
  return {
    matchId: dto.id,
    matchStatus: dto.status,
    attemptStatus: dto.attempt?.status || null,
    currentQuestionIndex: dto.attempt?.currentQuestionIndex ?? null,
    availableActions: dto.capabilities?.availableActions || [],
  };
}

function comparableIpadCommand(dto) {
  if (!dto) return null;
  const current = dto.questionPack?.questions?.[0] || null;
  return {
    matchId: dto.attempt?.matchId || dto.questionPack?.matchId || null,
    attemptStatus: dto.attempt?.status || null,
    currentQuestionNumber: dto.attempt?.currentQuestionNumber ?? null,
    questionSlot: current?.slot ?? null,
    questionKey: current?.questionVersionId || null,
    exposedQuestionCount: dto.questionPack?.questions?.length ?? null,
    evidenceRequired: dto.attempt?.evidenceRequired === true,
  };
}

function parityFor(web, ipadRead, ipadCommand = null) {
  const checks = {
    matchId: web.matchId === ipadRead.matchId,
    matchStatus: web.matchStatus === ipadRead.matchStatus,
    attemptStatus: web.attemptStatus === ipadRead.attemptStatus,
    currentQuestionIndex:
      web.currentQuestionIndex === ipadRead.currentQuestionIndex,
  };
  if (ipadCommand) {
    checks.commandMatchId = web.matchId === ipadCommand.matchId;
    checks.commandAttemptStatus =
      web.attemptStatus === ipadCommand.attemptStatus;
    checks.questionKey = web.questionKey === ipadCommand.questionKey;
    checks.questionNumber =
      web.currentQuestionNumber === ipadCommand.questionSlot;
  }
  checks.all = Object.values(checks).every(Boolean);
  return checks;
}

async function captureStage({ name, matchId, userId, commandDTO = null }) {
  const [page, ipadDTO] = await Promise.all([
    getArenaMatchPageData({ matchId, userId, now: NOW }),
    getParticipantMatch({ userId, id: matchId }),
  ]);
  const web = comparableWeb(page);
  const ipadRead = comparableIpadRead(ipadDTO);
  const ipadCommand = comparableIpadCommand(commandDTO);
  const parity = parityFor(web, ipadRead, ipadCommand);
  assert.equal(parity.all, true, `${name}: web/iPad DTO parity failed`);
  return { name, webAuthority: web, ipadReadDTO: ipadRead, ipadCommandDTO: ipadCommand, parity };
}

async function main() {
  const outputDirectory = path.resolve(
    process.env.MATTHS_ARENA_EVIDENCE_DIR || DEFAULT_OUTPUT_DIRECTORY
  );
  fs.mkdirSync(outputDirectory, { recursive: true });

  const sourceCommit = git("rev-parse", "HEAD");
  const initialStatus = git("status", "--short", "--untracked-files=no");
  const productPaths = [
    "models/goatArenaModel.js",
    "services/arenaMatchAttemptService.js",
    "services/arenaProblemPackService.js",
    "services/goatArenaProductionCommandService.js",
    "services/goatArenaProductionMatchReadService.js",
  ];
  const productFileHashes = productPaths.map(fileHash);
  const ipadSourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: IPAD_ROOT,
    encoding: "utf8",
  }).trim();
  const ipadConsumerFileHashes = [
    "Matths/ServerAPI.swift",
    "Matths/GoatArenaScreen.swift",
    "Matths/GoatArenaMatchPlayScreen.swift",
  ].map((relativePath) => externalFileHash(IPAD_ROOT, relativePath));
  const scriptFileHash = fileHash("scripts/createArenaCrossPlatformEvidence.js");

  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const databaseName = `arena-cross-platform-${process.pid}`;
  const stages = [];
  let matchId = null;
  let packId = null;
  let participantAttemptId = null;

  try {
    await mongoose.connect(replSet.getUri(), { dbName: databaseName });

    const challengerId = objectId();
    const defenderId = objectId();
    const matchObjectId = objectId();
    matchId = String(matchObjectId);
    const matchKey = `EVIDENCE:${matchId}`;

    await User.collection.insertMany([
      { _id: challengerId, username: "arena-evidence-challenger", name: "도전자" },
      { _id: defenderId, username: "arena-evidence-defender", name: "상대" },
    ]);

    const draft = buildArenaProblemPackDraft({
      version: `EVIDENCE_${matchId}`,
      displayName: "Cross-platform evidence pack",
      timeLimitMinutes: 10,
      scoringVersion: "ARENA_SCORE_V1",
      availableFrom: new Date(NOW.getTime() - 60_000),
      tierPairKey: "EMERALD_DIAMOND",
      generationMode: "AUTO_ON_CHALLENGE",
      generatedForMatchKey: matchKey,
    });
    // Compute the seal after Mongoose has applied production schema defaults.
    // This mirrors the persisted payload that the production integrity check
    // reloads; the generated content itself is never rewritten by this script.
    const pack = new ArenaProblemPack({ ...draft, status: "DRAFT" });
    await pack.validate();
    pack.contentHash = computeArenaProblemPackHash(pack);
    pack.status = "SEALED";
    pack.sealedAt = new Date(NOW.getTime() - 30_000);
    pack.autoValidatedAt = pack.sealedAt;
    await pack.save();
    packId = String(pack._id);

    const tuple = (arenaPosition) => ({
      arenaRank: "EMERALD",
      arenaPosition,
      arenaGp: 50,
      gpScaleVersion: "TIER_LOCAL_0_99_V1",
    });
    await ArenaMatch.create({
      _id: matchObjectId,
      matchKey,
      division: draft.division,
      seasonKey: "EVIDENCE-2026",
      competitivePool: "ALL",
      matchType: draft.matchType,
      matchOrigin: "SUB_UPWARD_AUTO_MATCH",
      requestInitiatorUserId: challengerId,
      targetTier: "DIAMOND",
      tierPairKey: draft.tierPairKey,
      tierPairLabel: draft.tierPairLabel,
      challenger: {
        userId: challengerId,
        standingId: objectId(),
        accessCycleId: objectId(),
        tupleBefore: tuple(2),
        stakeDays: 1,
      },
      defender: {
        userId: defenderId,
        standingId: objectId(),
        accessCycleId: objectId(),
        tupleBefore: tuple(1),
        stakeDays: 1,
      },
      status: "MATCHED",
      policyVersionCode: "EVIDENCE_ONLY_V1",
      problemPackVersion: "PENDING_ASSIGNMENT",
      scoringVersion: "ARENA_SCORE_V1",
      requestedAt: NOW,
      startDeadlineAt: new Date(NOW.getTime() + 60 * 60 * 1000),
      completionDeadlineAt: new Date(NOW.getTime() + 2 * 60 * 60 * 1000),
      integrityStatus: "PENDING",
    });

    stages.push(await captureStage({
      name: "created_matched",
      matchId,
      userId: defenderId,
    }));

    await prepareArenaMatch({ matchId, userId: defenderId, now: NOW });
    stages.push(await captureStage({
      name: "prepared_ready",
      matchId,
      userId: defenderId,
    }));

    const adapter = createGoatArenaProductionCommandService({ now: () => NOW });
    const auth = { userId: defenderId };
    const input = (idempotencyKey) => ({
      matchId,
      idempotencyKey,
      clientBuildVersion: "cross-platform-evidence-1",
    });

    let commandDTO = await adapter.startParticipantMatch(
      auth,
      input("evidence-start-0001")
    );
    participantAttemptId = commandDTO.attempt.attemptId;
    stages.push(await captureStage({
      name: "started_question_1",
      matchId,
      userId: defenderId,
      commandDTO,
    }));

    commandDTO = await adapter.advanceParticipantQuestion(auth, {
      ...input("evidence-advance-0001"),
      questionSlot: 1,
      answer: "11",
    });
    stages.push(await captureStage({
      name: "current_question_2",
      matchId,
      userId: defenderId,
      commandDTO,
    }));

    for (let slot = 2; slot <= 4; slot += 1) {
      commandDTO = await adapter.advanceParticipantQuestion(auth, {
        ...input(`evidence-advance-000${slot}`),
        questionSlot: slot,
        answer: String(10 + slot),
      });
    }
    stages.push(await captureStage({
      name: "current_question_5",
      matchId,
      userId: defenderId,
      commandDTO,
    }));

    await adapter.recordParticipantEvent(auth, {
      ...input("evidence-answer-q5-0001"),
      eventType: "ANSWER_CHANGED",
      payload: { questionSlot: 5, answer: "15" },
    });
    const submission = await adapter.submitParticipantAttempt(
      auth,
      input("evidence-submit-0001")
    );
    const authority = await adapter._testing.loadParticipantAuthority(
      matchId,
      defenderId
    );
    commandDTO = adapter._testing.serializeStart(authority);
    const submittedStage = await captureStage({
      name: "submitted_evidence_required",
      matchId,
      userId: defenderId,
      commandDTO,
    });
    submittedStage.submissionReceipt = submission;
    submittedStage.parity.submissionMatchId = submission.matchId === matchId;
    submittedStage.parity.submissionAttemptId =
      submission.attemptId === participantAttemptId;
    submittedStage.parity.submissionState =
      submission.evidenceRequired === true &&
      submittedStage.webAuthority.evidenceRequired === true &&
      submittedStage.ipadCommandDTO.evidenceRequired === true;
    submittedStage.parity.all = Object.values(submittedStage.parity).every(Boolean);
    assert.equal(submittedStage.parity.all, true, "submission parity failed");
    stages.push(submittedStage);

    const persistedMatch = await ArenaMatch.findById(matchId).lean();
    const persistedAttempt = await ArenaMatchAttempt.findOne({
      matchId,
      userId: defenderId,
    }).lean();
    assert.equal(String(persistedMatch._id), matchId);
    assert.equal(String(persistedAttempt._id), participantAttemptId);

    const evidence = {
      schemaVersion: "MATTHS_ARENA_CROSS_PLATFORM_EVIDENCE_V1",
      generatedAt: new Date().toISOString(),
      result: "PASS",
      scope: {
        productBaseCommit: sourceCommit,
        sourceStatusBeforeRun: initialStatus || "CLEAN",
        productionDatabaseWrite: false,
        database: "ephemeral MongoMemoryReplSet (wiredTiger, one member)",
        databaseName,
        databaseUriPersisted: false,
        arenaRuleOrPolicyMutation: false,
      },
      authority: {
        matchId,
        participantUserId: String(defenderId),
        participantAttemptId,
        problemPackId: packId,
        persistedMatchStatus: persistedMatch.status,
        persistedAttemptStatus: persistedAttempt.status,
        persistedCurrentQuestionIndex: persistedAttempt.currentQuestionIndex,
      },
      productFileHashes,
      ipadConsumer: {
        sourceCommit: ipadSourceCommit,
        fileHashes: ipadConsumerFileHashes,
      },
      evidenceScript: scriptFileHash,
      stages,
    };
    const canonicalEvidence = `${JSON.stringify(evidence, null, 2)}\n`;
    const evidencePath = path.join(outputDirectory, "arena-cross-platform-evidence.json");
    fs.writeFileSync(evidencePath, canonicalEvidence);
    const evidenceSha = sha256(canonicalEvidence);
    fs.writeFileSync(
      path.join(outputDirectory, "arena-cross-platform-evidence.json.sha256"),
      `${evidenceSha}  arena-cross-platform-evidence.json\n`
    );
    process.stdout.write(`${JSON.stringify({ result: "PASS", matchId, participantAttemptId, evidencePath, evidenceSha, stages: stages.map((stage) => stage.name) }, null, 2)}\n`);
  } finally {
    await mongoose.disconnect();
    await replSet.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
