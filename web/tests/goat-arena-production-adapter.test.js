"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const {
  createGoatArenaProductionCommandService,
} = require("../services/goatArenaProductionCommandService");
const {
  serializeParticipantMatch,
} = require("../services/goatArenaProductionMatchReadService");
const {
  buildGoatArenaReadModel,
  buildMatchSnapshot,
} = require("../services/goatArenaReadService");
const {
  ArenaMatch,
  ArenaOutboxEvent,
  MainInvitationOffer,
  MainInvitationRequest,
} = require("../models/goatArenaModel");
const {
  respondToMainInvitation,
} = require("../services/mainArenaMatchService");
const { resolveIpadSourceRoot } = require("../scripts/resolveIpadWorkspace");

const repoRoot = path.resolve(__dirname, "..");
const ipadRoot = resolveIpadSourceRoot(repoRoot);
const read = (file) => fs.readFileSync(file, "utf8");
const oid = () => new mongoose.Types.ObjectId();

class FakeQuery {
  constructor(value) {
    this.value = value;
  }
  select() { return this; }
  sort() { return this; }
  async lean() { return this.value; }
}

(async () => {
  const challengerId = oid();
  const defenderId = oid();
  const matchId = oid();
  const invitationRequestId = oid();
  const offerId = oid();
  const attemptId = oid();
  const packId = oid();
  const now = new Date("2026-08-10T06:00:00.000Z");

  const match = {
    _id: matchId,
    status: "MATCHED",
    division: "MAIN",
    matchType: "NORMAL",
    matchOrigin: "MAIN_LOWER_INVITATION",
    requestInitiatorUserId: challengerId,
    invitationRequestId,
    problemPackId: null,
    scoringVersion: "ARENA_SCORE_V1",
    timeLimitMs: 3_000_000,
    startDeadlineAt: new Date("2026-08-10T07:00:00.000Z"),
    completionDeadlineAt: new Date("2026-08-10T08:00:00.000Z"),
    integrityStatus: "PENDING",
    challenger: {
      userId: challengerId,
      stakeDays: 1,
      tupleBefore: { arenaPosition: 2 },
    },
    defender: {
      userId: defenderId,
      stakeDays: 1,
      tupleBefore: { arenaPosition: 1 },
    },
    createdAt: now,
  };
  let attempt = null;
  const pack = {
    _id: packId,
    version: "PACK_V1",
    scoringVersion: "ARENA_SCORE_V1",
    questionCount: 5,
    timeLimitMs: 3_000_000,
    curriculumCoverage: ["MATH"],
    sealedAt: now,
    questions: Array.from({ length: 5 }, (_, index) => ({
      questionKey: `Q${index + 1}`,
      prompt: `${index + 1}번 문제`,
      choices: [],
      inputMode: "short-answer",
      points: 1,
      difficultyScore: 0.5,
      difficultyPosition: "MID",
      answer: "SERVER_ONLY_ANSWER",
      solution: "SERVER_ONLY_SOLUTION",
      ...(index === 0
        ? {
            visualization: {
              kind: "geometry",
              renderContractVersion: "ARENA_PDF_VISUAL_V1",
              presentedInProblem: true,
              sourceRole: "PROBLEM_STEM",
              showAxes: true,
              xRange: [-1, 3],
              yRange: [-1, 3],
              points: [{ x: 1, y: 2, label: "A" }],
            },
          }
        : {}),
    })),
  };
  const offer = {
    _id: offerId,
    invitationRequestId,
    candidateUserId: defenderId,
    status: "OFFERED",
  };

  const models = {
    ArenaMatch: {
      findOne(query) {
        if (query.invitationRequestId) {
          return new FakeQuery(
            String(query.invitationRequestId) === String(invitationRequestId)
              ? match
              : null
          );
        }
        return new FakeQuery(
          String(query._id) === String(matchId) ? match : null
        );
      },
    },
    ArenaMatchAttempt: {
      findOne() { return new FakeQuery(attempt); },
    },
    ArenaProblemPack: {
      findById(id) {
        return new FakeQuery(String(id) === String(packId) ? pack : null);
      },
    },
    ArenaMatchEvidence: {
      findOne() { return new FakeQuery(null); },
    },
    MainInvitationOffer: {
      findOne(query) {
        const statusMatches = !query.status || query.status === offer.status;
        const idMatches = String(query._id) === String(offerId);
        const userMatches =
          String(query.candidateUserId) === String(defenderId);
        return new FakeQuery(
          statusMatches && idMatches && userMatches ? offer : null
        );
      },
    },
  };

  let invitationAcceptCalls = 0;
  let subCreateCalls = 0;
  let capturedDeclineReason = null;
  const commands = {
    async createSubNormalChallenge({ challengerUserId, requestId }) {
      subCreateCalls += 1;
      assert.equal(String(challengerUserId), String(defenderId));
      assert.equal(requestId, "sub-create-once");
      return { match, replayed: false };
    },
    async prepareArenaMatch() {
      match.status = "READY";
      match.problemPackId = packId;
      attempt = {
        _id: attemptId,
        matchId,
        userId: defenderId,
        role: "DEFENDER",
        status: "READY",
        currentQuestionIndex: 0,
        answers: [],
        questionTimings: [],
        answerRevision: 0,
      };
    },
    async startArenaMatchAttempt() {
      match.status = "IN_PROGRESS";
      attempt.status = "IN_PROGRESS";
      attempt.startedAt = now;
      attempt.deadlineAt = new Date(now.getTime() + 600_000);
    },
    async getArenaMatchPageData() {},
    async saveArenaMatchAnswers() {},
    async recordArenaMatchActivity() {},
    async advanceArenaMatchQuestion({ value }) {
      attempt.answers = [
        ...attempt.answers.filter(
          (entry) => entry.questionKey !== pack.questions[attempt.currentQuestionIndex].questionKey
        ),
        {
          questionKey: pack.questions[attempt.currentQuestionIndex].questionKey,
          value,
        },
      ];
      if (attempt.currentQuestionIndex === 4) {
        attempt.currentQuestionIndex = 5;
        attempt.status = "EVIDENCE_REQUIRED";
        attempt.submittedAt = now;
        attempt.evidenceDeadlineAt = new Date(now.getTime() + 60_000);
      } else {
        attempt.currentQuestionIndex += 1;
        attempt.deadlineAt = new Date(now.getTime() + 600_000);
      }
    },
    async submitArenaMatchAttempt() {},
    async submitArenaMatchEvidence() {},
    async settleArenaMatch() {},
    async respondToMainInvitation({ response, reasonCode }) {
      if (response === "ACCEPT") {
        invitationAcceptCalls += 1;
        offer.status = "ACCEPTED";
        return { status: "MATCHED", matchId };
      }
      capturedDeclineReason = reasonCode;
      if (reasonCode === "OTHER") {
        return { status: "SUPERSEDED" };
      }
      offer.status = "DECLINED";
      return { status: "DECLINED" };
    },
  };

  const service = createGoatArenaProductionCommandService({
    models,
    commands,
    now: () => now,
  });
  const auth = { userId: defenderId };
  const input = (id, key) => ({
    matchId: String(id),
    idempotencyKey: key,
    clientBuildVersion: "1.0(1)",
  });

  // 같은 offer 수락을 네트워크 재시도로 두 번 보내도 새 경기를 만들지 않고
  // 최초 ArenaMatch id를 그대로 반환한다.
  const accepted = await service.acceptParticipantChallenge(
    auth,
    input(offerId, "accept-once")
  );
  const acceptedReplay = await service.acceptParticipantChallenge(
    auth,
    input(offerId, "accept-once")
  );
  assert.equal(accepted.match.id, String(matchId));
  assert.equal(acceptedReplay.match.id, String(matchId));
  assert.equal(invitationAcceptCalls, 1);

  const createdSub = await service.createParticipantSubMatch(auth, {
    idempotencyKey: "sub-create-once",
    clientBuildVersion: "1.0(1)",
  });
  assert.equal(createdSub.match.id, String(matchId));
  assert.equal(subCreateCalls, 1);

  // 웹에서 만든 MATCHED ArenaMatch를 iPad adapter가 같은 문서에서 준비/시작한다.
  const publicRead = serializeParticipantMatch(match, defenderId, null);
  assert.equal(publicRead.id, String(matchId));
  assert.equal(publicRead.status, "MATCHED");
  assert.deepEqual(publicRead.capabilities.availableActions, ["START"]);
  assert.deepEqual(
    buildMatchSnapshot({
      activeMatch: match,
      activeAttempt: null,
      userId: defenderId,
    }).availableActions,
    ["START"]
  );
  const started = await service.startParticipantMatch(
    auth,
    input(matchId, "start-once")
  );
  assert.equal(started.attempt.status, "IN_PROGRESS");
  assert.equal(started.attempt.currentQuestionNumber, 1);
  assert.equal(started.questionPack.questions.length, 1);
  assert.equal(started.questionPack.questions[0].slot, 1);
  assert.deepEqual(
    JSON.parse(started.questionPack.questions[0].visualizationJSON),
    pack.questions[0].visualization
  );
  assert.equal(
    JSON.stringify(started.questionPack.questions[0]).includes("SERVER_ONLY_ANSWER"),
    false,
    "시각자료 DTO에 정답이 섞이면 안 됩니다."
  );
  assert.equal(
    JSON.stringify(started.questionPack.questions[0]).includes("SERVER_ONLY_SOLUTION"),
    false,
    "시각자료 DTO에 풀이가 섞이면 안 됩니다."
  );

  const advanced = await service.advanceParticipantQuestion(auth, {
    ...input(matchId, "advance-1"),
    questionSlot: 1,
    answer: "17",
  });
  assert.equal(advanced.attempt.currentQuestionNumber, 2);
  assert.deepEqual(advanced.questionPack.questions.map((row) => row.slot), [2]);
  assert.equal(
    advanced.questionPack.questions.some((row) => row.slot === 1),
    false,
    "봉인된 이전 문항을 iPad 응답에 다시 노출하면 안 됩니다."
  );

  attempt.currentQuestionIndex = 4;
  const final = await service.advanceParticipantQuestion(auth, {
    ...input(matchId, "advance-5"),
    questionSlot: 5,
    answer: "23",
  });
  assert.equal(final.attempt.status, "EVIDENCE_REQUIRED");
  assert.equal(final.questionPack.questions.length, 0);
  assert.equal(final.attempt.evidenceRequired, true);

  offer.status = "OFFERED";
  await service.declineParticipantChallenge(auth, {
    ...input(offerId, "decline-once"),
    reasonCode: "SCHEDULE_CONFLICT",
  });
  assert.equal(capturedDeclineReason, "SCHEDULE_CONFLICT");
  await assert.rejects(
    service.declineParticipantChallenge(auth, {
      ...input(offerId, "decline-after-state-change"),
      reasonCode: "OTHER",
    }),
    (error) =>
      error?.code === "GOAT_ARENA_INVITATION_STATE_CHANGED" &&
      error?.statusCode === 409
  );

  // KST 23:59에 시작해 실제 경과는 2분뿐이어도 KST 자정이 지나면 2일차다.
  const productionSnapshot = buildGoatArenaReadModel({
    userId: String(defenderId),
    user: { name: "학생" },
    cycle: {
      _id: oid(),
      status: "ACTIVE",
      division: "SUB",
      startsAt: new Date("2026-08-10T14:59:00.000Z"),
      expiresAt: new Date("2026-09-10T15:00:00.000Z"),
      evaluationAt: new Date("2026-09-10T15:00:00.000Z"),
      paybackScoreDays: 31,
      lockedPaybackScoreDays: 1,
      availableLearningDays: 27,
      lockedLearningDays: 1,
      reservedLearningDays: 2,
      streakDays: 3,
      paidNormalAttacksCompleted: 1,
      paybackDisqualifiers: [],
    },
    accessState: { currentCompetitiveDivision: "SUB" },
    policy: {
      payback: {
        minimumStreakDays: 29,
        minimumScoreDays: 30,
        bands: [{ minScoreDays: 0, maxScoreDays: null, ratePercent: 0 }],
      },
    },
    arenaProfile: {
      status: "ACTIVE",
      arenaRank: "BRONZE",
      arenaPosition: 7,
      arenaGp: 15,
      seasonKey: "2026-S1",
    },
    rankingProfile: null,
    activeMatch: null,
    now: new Date("2026-08-10T15:01:00.000Z"),
  });
  assert.equal(productionSnapshot.state, "ACTIVE_CYCLE");
  assert.equal(productionSnapshot.cycle.cycleDay, 2);
  assert.equal(productionSnapshot.cycle.activeRanking, "SUB");
  assert.deepEqual(productionSnapshot.cycle.balances, {
    refundAvailableDays: 31,
    refundLockedDays: 1,
    bonusAvailableDays: 27,
    bonusLockedDays: 3,
    source: "ACCESS_CYCLE_LEDGER_CACHE",
  });
  assert.equal(productionSnapshot.ranking.seat.arenaPosition, 7);

  const screen = read(path.join(ipadRoot, "GoatArenaScreen.swift"));
  const play = read(path.join(ipadRoot, "GoatArenaMatchPlayScreen.swift"));
  const api = read(path.join(ipadRoot, "ServerAPI.swift"));
  assert.match(screen, /\["MATCHED", "READY", "IN_PROGRESS", "SUBMITTED"\]/);
  assert.match(screen, /\["READY", "IN_PROGRESS"\]\.contains\(attempt\.status\)/);
  assert.match(screen, /match\.availableActions/);
  assert.doesNotMatch(screen, /canRespondToDefenderChallenge/);
  assert.match(screen, /guard let invitation = snapshot\.pendingInvitation else/);
  assert.match(screen, /case "PAYBACK_SCORE_DAY", "REFUND_CHALLENGE_DAY"/);
  assert.match(screen, /case "LEARNING_DAY", "BONUS_ACCESS_DAY"/);
  assert.match(screen, /브론즈일 때[^\n]+반환받고, 실버 이상일 때는 1점을 소각/);
  assert.doesNotMatch(screen, /페이백 도전일|보너스 이용일/);
  assert.match(play, /questions\.count == 1/);
  assert.match(play, /ArenaProblemVisualizationView/);
  assert.match(api, /visualizationJSON: String\?/);
  assert.doesNotMatch(play, /moveToQuestion/);
  assert.match(api, /\/api\/v1\/goat-arena\/matches\/\\\(matchId\)\/advance/);
  assert.match(api, /\/api\/v1\/goat-arena\/matches\/sub/);
  assert.match(screen, /ServerAPI\.createUnrankedArenaMatch/);

  const readService = read(path.join(repoRoot, "services/goatArenaReadService.js"));
  assert.doesNotMatch(
    readService,
    /models\/(?:accessCycleModel|arenaProfileModel|arenaSeasonModel|policyVersionModel)/
  );
  assert.match(readService, /ArenaAccessState\.findOne/);
  assert.match(readService, /ArenaStanding\.findById/);

  const invitationService = read(
    path.join(repoRoot, "services/mainArenaMatchService.js")
  );
  assert.match(invitationService, /GOAT_ARENA_DECLINE_REASON_INVALID/);
  assert.match(invitationService, /offer\.responseReason = normalizedReasonCode/);
  assert.match(invitationService, /reasonCode: normalizedReasonCode/);

  // terminal 영수증은 운영 잠금보다 먼저 반환되어야 한다. 일요일 15시
  // 재시도도 ACCEPTED/DECLINED를 뒤집거나 409로 바꾸지 않는다.
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  try {
    await mongoose.connect(replSet.getUri(), { dbName: "arena-adapter-contract" });
    const sundayAfterLock = new Date("2026-08-09T06:00:00.000Z");
    const acceptedOfferId = oid();
    const declinedOfferId = oid();
    const acceptedRequestId = oid();
    const declinedRequestId = oid();
    const acceptedMatchId = oid();
    const freshOfferId = oid();
    const freshRequestId = oid();
    await MainInvitationOffer.collection.insertMany([
      {
        _id: acceptedOfferId,
        invitationRequestId: acceptedRequestId,
        candidateUserId: defenderId,
        selectionAuditId: oid(),
        status: "ACCEPTED",
        offeredAt: now,
        respondedAt: now,
        responseReason: "",
      },
      {
        _id: declinedOfferId,
        invitationRequestId: declinedRequestId,
        candidateUserId: defenderId,
        selectionAuditId: oid(),
        status: "DECLINED",
        offeredAt: now,
        respondedAt: now,
        responseReason: "SCHEDULE_CONFLICT",
      },
      {
        _id: freshOfferId,
        invitationRequestId: freshRequestId,
        candidateUserId: defenderId,
        selectionAuditId: oid(),
        status: "OFFERED",
        offeredAt: now,
        respondedAt: null,
        responseReason: "",
      },
    ]);
    await MainInvitationRequest.collection.insertOne({
      _id: freshRequestId,
      requestId: "fresh-decline",
      initiatorUserId: challengerId,
      initiatorStandingId: oid(),
      initiatorArenaTier: "SILVER",
      competitivePool: "ALL",
      targetTier: "BRONZE",
      stakeDays: 1,
      policyVersionId: oid(),
      policyVersionCode: "MAIN-V1",
      status: "OFFERED",
      reservedLearningDays: 1,
      candidatePoolHash: "fixture",
      selectionPolicyVersion: "fixture",
      randomSelectionSeed: "fixture",
      createdAt: now,
      updatedAt: now,
    });
    await ArenaMatch.collection.insertOne({
      _id: acceptedMatchId,
      invitationRequestId: acceptedRequestId,
      status: "READY",
      challenger: { userId: challengerId },
      defender: { userId: defenderId },
      createdAt: now,
      updatedAt: now,
    });

    const acceptedTerminal = await respondToMainInvitation({
      offerId: acceptedOfferId,
      userId: defenderId,
      response: "ACCEPT",
      now: sundayAfterLock,
    });
    assert.equal(acceptedTerminal.replayed, true);
    assert.equal(String(acceptedTerminal.matchId), String(acceptedMatchId));
    assert.equal(acceptedTerminal.status, "READY");

    const declinedTerminal = await respondToMainInvitation({
      offerId: declinedOfferId,
      userId: defenderId,
      response: "DECLINE",
      reasonCode: "SCHEDULE_CONFLICT",
      now: sundayAfterLock,
    });
    assert.equal(declinedTerminal.replayed, true);
    assert.equal(declinedTerminal.status, "DECLINED");
    assert.equal(
      String(declinedTerminal.invitationId),
      String(declinedRequestId)
    );

    const freshDecline = await respondToMainInvitation({
      offerId: freshOfferId,
      userId: defenderId,
      response: "DECLINE",
      reasonCode: "TECHNICAL_ISSUE",
      now,
    });
    assert.equal(freshDecline.status, "DECLINED");
    const declinedOffer = await MainInvitationOffer.findById(freshOfferId).lean();
    assert.equal(declinedOffer.responseReason, "TECHNICAL_ISSUE");
    const declineAudit = await ArenaOutboxEvent.findOne({
      idempotencyKey: `${freshOfferId}:MainInvitationDeclined`,
    }).lean();
    assert.equal(declineAudit.payload.reasonCode, "TECHNICAL_ISSUE");

    await assert.rejects(
      respondToMainInvitation({
        offerId: oid(),
        userId: defenderId,
        response: "DECLINE",
        reasonCode: "FREE_TEXT",
        now,
      }),
      (error) => error?.code === "GOAT_ARENA_DECLINE_REASON_INVALID"
    );
  } finally {
    await mongoose.disconnect();
    await replSet.stop();
  }

  console.log(
    "GOAT Arena web-create to iPad read/command production adapter contract passed"
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
