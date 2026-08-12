"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");

const {
  GoatArenaProductionCommandError,
  createGoatArenaProductionCommandService,
} = require("../services/goatArenaProductionCommandService");
const {
  createGoatArenaCommandController,
} = require("../controllers/goatArenaCommandController");
const {
  ArenaMatch,
  MainInvitationRequest,
} = require("../models/goatArenaModel");
const {
  createMainLowerInvitation,
  createMainUpwardChallenge,
  _testing: mainArenaTesting,
} = require("../services/mainArenaMatchService");

const userId = new mongoose.Types.ObjectId().toString();
const matchId = new mongoose.Types.ObjectId().toString();
const invitationId = new mongoose.Types.ObjectId().toString();
const fixedNow = new Date("2026-08-10T03:00:00.000Z");

function commandService(overrides = {}) {
  return createGoatArenaProductionCommandService({
    now: () => fixedNow,
    commands: {
      getMainArenaActionData: async () => ({
        eligible: true,
        reasons: [],
        currentTier: "골드",
        availableLearningDays: 4,
        matchmakingRestrictedUntil: null,
        policy: {
          stakeDaysByTierGap: [
            { tierGap: 1, stakeDays: 2 },
            { tierGap: 2, stakeDays: 4 },
          ],
        },
        activeMatch: { _id: matchId, privateField: "must-not-leak" },
        sentInvitations: [{
          _id: invitationId,
          status: "OFFERED",
          targetTier: "실버",
          stakeDays: 2,
          reservedLearningDays: 2,
          createdAt: fixedNow,
          secret: true,
        }],
        receivedOffers: [{ secret: true }],
        upwardTargets: [
          { label: "플래티넘", gap: 1, minimumStakeDays: 1, maximumStakeDays: 5 },
        ],
        lowerTargets: [
          { label: "실버", gap: 1 },
          { label: "브론즈", gap: 2 },
        ],
      }),
      createMainUpwardChallenge: async (input) => ({
        match: { _id: matchId, status: "READY", integrityStatus: "CLEAR" },
        input,
      }),
      createMainLowerInvitation: async (input) => ({
        _id: invitationId,
        status: "OFFERED",
        targetTier: input.targetTier,
        stakeDays: input.stakeDays,
      }),
      cancelMainInvitation: async ({ invitationId: id }) => ({
        _id: id,
        status: "CANCELLED",
        releasedLearningDays: 2,
        burnedLearningDays: 0,
      }),
      ...overrides,
    },
  });
}

async function exerciseService() {
  const captured = {};
  const service = commandService({
    createMainUpwardChallenge: async (input) => {
      captured.upward = input;
      return { match: { _id: matchId, status: "READY", integrityStatus: "CLEAR" } };
    },
    createMainLowerInvitation: async (input) => {
      captured.invitation = input;
      return {
        _id: invitationId,
        status: "OFFERED",
        targetTier: input.targetTier,
        stakeDays: input.stakeDays,
      };
    },
  });

  const options = await service.getParticipantMainOptions({ userId });
  assert.equal(options.schemaVersion, "GOAT_ARENA_MAIN_ACTIONS_V1");
  assert.equal(options.hasActiveMatch, true);
  assert.equal(options.availableLearningDays, 4);
  assert.deepEqual(options.upwardTargets[0], {
    tier: "플래티넘",
    gap: 1,
    minimumStakeDays: 1,
    maximumStakeDays: 3,
    available: true,
  });
  assert.deepEqual(options.lowerTargets[0], {
    tier: "실버",
    gap: 1,
    minimumStakeDays: 2,
    maximumStakeDays: 3,
    available: true,
  });
  assert.deepEqual(options.lowerTargets[1], {
    tier: "브론즈",
    gap: 2,
    minimumStakeDays: 4,
    maximumStakeDays: 3,
    available: false,
  });
  assert.equal("activeMatch" in options, false);
  assert.deepEqual(options.sentInvitations[0], {
    id: invitationId,
    status: "OFFERED",
    targetTier: "실버",
    stakeDays: 2,
    reservedLearningDays: 2,
    createdAt: fixedNow.toISOString(),
    canCancel: true,
  });
  assert.equal("secret" in options.sentInvitations[0], false);
  assert.equal("receivedOffers" in options, false);

  const sundayOptions = await commandService({
    getMainArenaActionData: async () => ({
      eligible: true,
      reasons: [],
      requestLocked: true,
      currentTier: "골드",
      availableLearningDays: 4,
      upwardTargets: [],
      lowerTargets: [],
    }),
  }).getParticipantMainOptions({ userId });
  assert.equal(sundayOptions.eligible, false);
  assert.equal(sundayOptions.requestLocked, true);
  assert.deepEqual(sundayOptions.reasonCodes, ["SUNDAY_MATCH_REQUEST_LOCK"]);

  const upward = await service.createParticipantMainUpwardMatch(
    { userId },
    {
      targetTier: "플래티넘",
      stakeDays: 2,
      idempotencyKey: "main-upward-1",
      clientBuildVersion: "1.0(1)",
    }
  );
  assert.equal(upward.kind, "MATCH");
  assert.equal(upward.match.id, matchId);
  assert.equal(String(captured.upward.userId), userId);
  assert.equal(captured.upward.requestId, "main-upward-1");
  assert.equal(captured.upward.targetTier, "플래티넘");
  assert.equal(captured.upward.stakeDays, 2);

  const invitation = await service.createParticipantMainInvitation(
    { userId },
    {
      targetTier: "실버",
      stakeDays: 2,
      idempotencyKey: "main-invitation-1",
      clientBuildVersion: "1.0(1)",
    }
  );
  assert.equal(invitation.kind, "INVITATION");
  assert.equal(invitation.invitation.id, invitationId);
  assert.equal(String(captured.invitation.userId), userId);

  const cancellation = await service.cancelParticipantMainInvitation(
    { userId },
    {
      matchId: invitationId,
      idempotencyKey: "main-invitation-cancel-1",
      clientBuildVersion: "1.0(1)",
    }
  );
  assert.equal(cancellation.kind, "INVITATION_CANCELLATION");
  assert.deepEqual(cancellation.invitation, {
    id: invitationId,
    status: "CANCELLED",
    releasedLearningDays: 2,
    burnedLearningDays: 0,
  });

  await assert.rejects(
    () => service.createParticipantMainUpwardMatch(
      { userId },
      {
        targetTier: "플래티넘",
        stakeDays: 2,
        idempotencyKey: "main-upward-2",
        clientBuildVersion: "1.0(1)",
        userId: "attacker-controlled",
      }
    ),
    (error) =>
      error instanceof GoatArenaProductionCommandError &&
      error.code === "GOAT_ARENA_COMMAND_INPUT_INVALID"
  );

  await assert.rejects(
    () => service.createParticipantMainInvitation(
      { userId },
      {
        targetTier: "알 수 없는 티어",
        stakeDays: 2,
        idempotencyKey: "main-invitation-invalid-tier",
        clientBuildVersion: "1.0(1)",
      }
    ),
    (error) =>
      error instanceof GoatArenaProductionCommandError &&
      error.code === "GOAT_ARENA_COMMAND_INPUT_INVALID" &&
      error.message === "선택할 수 없는 상대 티어입니다."
  );

  assert.throws(
    () => mainArenaTesting.tierRelationship({
      actorTier: "골드",
      targetTier: "알 수 없는 티어",
      direction: "DOWNWARD",
    }),
    (error) => error.code === "MAIN_TARGET_TIER_INVALID"
  );
  assert.throws(
    () => mainArenaTesting.tierRelationship({
      actorTier: "UNKNOWN",
      targetTier: "플래티넘",
      direction: "UPWARD",
    }),
    (error) => error.code === "MAIN_CURRENT_TIER_INVALID"
  );
}

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(value) { this.statusCode = value; return this; },
    set(name, value) { this.headers[name] = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

async function exerciseController() {
  const calls = [];
  const controller = createGoatArenaCommandController({
    commandService: {
      getParticipantMainOptions: async (context) => {
        calls.push(["options", context]);
        return { schemaVersion: "GOAT_ARENA_MAIN_ACTIONS_V1" };
      },
      createParticipantMainUpwardMatch: async (context, input) => {
        calls.push(["upward", context, input]);
        return { kind: "MATCH", match: { id: matchId } };
      },
      createParticipantMainInvitation: async (context, input) => {
        calls.push(["invitation", context, input]);
        return { kind: "INVITATION", invitation: { id: invitationId } };
      },
      cancelParticipantMainInvitation: async (context, input) => {
        calls.push(["cancel", context, input]);
        return {
          kind: "INVITATION_CANCELLATION",
          invitation: { id: invitationId, status: "CANCELLED" },
        };
      },
    },
  });
  const baseRequest = {
    apiUser: { _id: userId },
    headers: {
      "idempotency-key": "native-main-1",
      "x-matths-client-version": "1.0(1)",
    },
    get(name) { return this.headers[name.toLowerCase()]; },
  };
  const failures = [];
  const next = (error) => { failures.push(error); };

  const optionsResponse = responseRecorder();
  await controller.getMainOptions(baseRequest, optionsResponse, next);
  assert.equal(optionsResponse.headers["Cache-Control"], "no-store");

  const upwardResponse = responseRecorder();
  await controller.createMainUpwardMatch(
    { ...baseRequest, body: { targetTier: "플래티넘", stakeDays: 2 } },
    upwardResponse,
    next
  );
  assert.equal(upwardResponse.statusCode, 201);
  assert.equal(calls[1][2].targetTier, "플래티넘");
  assert.equal(calls[1][2].idempotencyKey, "native-main-1");

  const badResponse = responseRecorder();
  await controller.createMainInvitation(
    {
      ...baseRequest,
      body: { targetTier: "실버", stakeDays: 2, status: "ACCEPTED" },
    },
    badResponse,
    next
  );
  assert.equal(failures.at(-1)?.code, "GOAT_ARENA_COMMAND_BODY_INVALID");

  const cancelResponse = responseRecorder();
  await controller.cancelMainInvitation(
    {
      ...baseRequest,
      params: { invitationId },
      body: {},
    },
    cancelResponse,
    next
  );
  assert.equal(cancelResponse.statusCode, 200);
  assert.equal(calls.at(-1)[2].matchId, invitationId);
  assert.equal(calls.at(-1)[2].idempotencyKey, "native-main-1");
}

async function exerciseAuthoritativeReplayBeforeCurrentGates() {
  const originalMatchFindOne = ArenaMatch.findOne;
  const originalInvitationFindOne = MainInvitationRequest.findOne;
  const lockedSunday = new Date("2026-08-09T06:00:00.000Z");
  try {
    ArenaMatch.findOne = (query) => ({
      lean: async () => ({
        _id: matchId,
        matchKey: query.matchKey,
        status: "READY",
        targetTier: "플래티넘",
        economySnapshot: { originalStakeDays: 2 },
      }),
    });
    const upwardReplay = await createMainUpwardChallenge({
      userId,
      targetTier: "플래티넘",
      stakeDays: 2,
      requestId: "lost-upward-response",
      now: lockedSunday,
    });
    assert.equal(String(upwardReplay.match._id), matchId);
    assert.equal(upwardReplay.replayed, true);
    await assert.rejects(
      () => createMainUpwardChallenge({
        userId,
        targetTier: "다이아몬드",
        stakeDays: 3,
        requestId: "lost-upward-response",
        now: lockedSunday,
      }),
      (error) => error.code === "GOAT_ARENA_IDEMPOTENCY_KEY_CONFLICT"
    );

    MainInvitationRequest.findOne = () => ({
      lean: async () => ({
        _id: invitationId,
        status: "OFFERED",
        targetTier: "실버",
        stakeDays: 2,
      }),
    });
    const invitationReplay = await createMainLowerInvitation({
      userId,
      targetTier: "실버",
      stakeDays: 2,
      requestId: "lost-invitation-response",
      now: lockedSunday,
    });
    assert.equal(String(invitationReplay._id), invitationId);

    await assert.rejects(
      () => createMainLowerInvitation({
        userId,
        targetTier: "브론즈",
        stakeDays: 3,
        requestId: "lost-invitation-response",
        now: lockedSunday,
      }),
      (error) => error.code === "GOAT_ARENA_IDEMPOTENCY_KEY_CONFLICT"
    );
  } finally {
    ArenaMatch.findOne = originalMatchFindOne;
    MainInvitationRequest.findOne = originalInvitationFindOne;
  }
}

function exerciseRouteOrder() {
  const routes = fs.readFileSync(
    path.join(__dirname, "..", "routes", "api-routes.js"),
    "utf8"
  );
  const dynamicIndex = routes.indexOf('"/goat-arena/matches/:matchId"');
  for (const route of [
    '"/goat-arena/matches/main/options"',
    '"/goat-arena/matches/main/upward"',
    '"/goat-arena/matches/main/invitations"',
    '"/goat-arena/matches/main/invitations/:invitationId/cancel"',
  ]) {
    const routeIndex = routes.indexOf(route);
    assert.ok(routeIndex >= 0, `${route} must exist`);
    assert.ok(routeIndex < dynamicIndex, `${route} must precede :matchId`);
  }
}

function exerciseIPadNativeBoundary() {
  const { resolveIpadSourceRoot } = require("../scripts/resolveIpadWorkspace");
  const ipadRoot = resolveIpadSourceRoot(path.resolve(__dirname, ".."));
  const arenaScreen = fs.readFileSync(
    path.join(ipadRoot, "GoatArenaScreen.swift"),
    "utf8"
  );
  const nativeSheet = fs.readFileSync(
    path.join(ipadRoot, "GoatArenaMainMatchSheet.swift"),
    "utf8"
  );
  const dataScope = fs.readFileSync(
    path.join(ipadRoot, "DataScope.swift"),
    "utf8"
  );
  const webBattle = fs.readFileSync(
    path.join(__dirname, "..", "views", "goat-arena-main-battle.ejs"),
    "utf8"
  );
  assert.doesNotMatch(arenaScreen, /goat-arena\/main\/battle/);
  assert.match(arenaScreen, /GoatArenaMainMatchSheet/);
  assert.match(nativeSheet, /\/api\/v1\/goat-arena\/matches\/main\/options/);
  assert.match(nativeSheet, /\/api\/v1\/goat-arena\/matches\/main\/upward/);
  assert.match(nativeSheet, /\/api\/v1\/goat-arena\/matches\/main\/invitations/);
  assert.match(nativeSheet, /cancelMainArenaInvitation/);
  assert.match(nativeSheet, /sentInvitationSection/);
  assert.match(nativeSheet, /초대 예약을 취소할까요/);
  assert.match(nativeSheet, /releasedLearningDays/);
  assert.match(nativeSheet, /await load\(\)[\s\S]*onInvitationCreated\(\)/);
  assert.doesNotMatch(
    arenaScreen,
    /onInvitationCreated:\s*\{\s*showsMainMatchMaker = false/
  );
  assert.match(nativeSheet, /goat-arena-main-create-command\.json/);
  assert.match(nativeSheet, /ViewThatFits\(in: \.horizontal\)/);
  assert.match(
    nativeSheet,
    /if let pendingCommand \{[\s\S]*pendingNotice\(pendingCommand\)[\s\S]*submitButton\(selectedTarget\)[\s\S]*\} else if let options/
  );
  assert.match(
    nativeSheet,
    /pendingCommand = saved[\s\S]*getMainArenaMatchOptions\(\)/
  );
  assert.match(dataScope, /"goat-arena-main-create-command\.json"/);
  assert.match(webBattle, /battleData\.requestLocked/);
  assert.match(webBattle, /availableLowerTargets/);
  assert.match(webBattle, /availableUpwardTargets/);
  assert.match(webBattle, /data-main-lower-target/);
}

(async () => {
  await exerciseService();
  await exerciseController();
  await exerciseAuthoritativeReplayBeforeCurrentGates();
  exerciseRouteOrder();
  exerciseIPadNativeBoundary();
  console.log("GOAT Arena native Ranked creation contract passed.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
