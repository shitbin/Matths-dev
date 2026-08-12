"use strict";

const assert = require("node:assert/strict");

async function verifyNicknameChangeGetHasNoBodyDependency() {
  const nicknameService = require("../services/nicknameService");
  const filename = require.resolve("../services/nicknameService");
  let received = null;

  require.cache[filename] = {
    id: filename,
    filename,
    loaded: true,
    exports: {
      ...nicknameService,
      async getNicknameChangePageData(input) {
        received = input;
        return {
          currentName: "기존닉네임",
          request: {
            id: "request-1",
            reason: "운영자 요청",
            expiresAt: new Date("2026-08-13T00:00:00.000Z"),
          },
        };
      },
    },
  };
  delete require.cache[require.resolve("../controllers/matthsController")];
  const controller = require("../controllers/matthsController");

  const rendered = {};
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    render(view, locals) {
      rendered.view = view;
      rendered.locals = locals;
      return this;
    },
  };
  let forwarded = null;

  await controller.nicknameChangePage(
    {
      query: {},
      // Express GET 요청은 body parser가 body를 만들지 않을 수 있다.
      body: undefined,
      session: {
        user: {
          id: "64d000000000000000000001",
          name: "기존닉네임",
          email: "student@example.test",
        },
      },
    },
    response,
    (error) => {
      forwarded = error;
    },
  );

  assert.equal(forwarded, null);
  assert.deepEqual(received, {
    userId: "64d000000000000000000001",
    requestId: "",
    token: "",
  });
  assert.equal(rendered.view, "nickname-change");
  assert.equal(rendered.locals.requestId, "");
  assert.equal(rendered.locals.token, "");
}

function verifyArenaFirstEntryWithoutTierRendersGateData() {
  const {
    subDailyLimitStateForView,
  } = require("../services/arenaMatchService");

  assert.deepEqual(
    subDailyLimitStateForView({
      policy: {
        dailyMatchLimitsByTier: [
          {
            tier: "BRONZE",
            attackLimit: 3,
            defenseLimit: 1,
          },
        ],
      },
      standing: null,
      usage: null,
    }),
    {
      attackCount: 0,
      defenseCount: 0,
      challengerWin: false,
      attackLimit: 0,
      defenseLimit: 0,
      attackRemaining: 0,
      defenseRemaining: 0,
    },
  );
}

async function main() {
  await verifyNicknameChangeGetHasNoBodyDependency();
  verifyArenaFirstEntryWithoutTierRendersGateData();
  console.log(
    "web first-entry pages tolerate GET without body and Arena placement without tier",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
