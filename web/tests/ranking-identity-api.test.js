"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const routesSource = fs.readFileSync(
  path.join(repoRoot, "routes/api-routes.js"),
  "utf8"
);
const syncControllerSource = fs.readFileSync(
  path.join(repoRoot, "controllers/ipadSyncController.js"),
  "utf8"
);
const arenaReadSource = fs.readFileSync(
  path.join(repoRoot, "services/goatArenaReadService.js"),
  "utf8"
);
const identity = require(
  path.join(repoRoot, "services/userIdentityService.js")
);
const { User } = require(
  path.join(repoRoot, "models/matthsModel.js")
);

const authBoundaryIndex = routesSource.indexOf(
  "router.use(requireApiAuth)"
);
const routeIndex = routesSource.indexOf(
  '"/me/ranking-identity"'
);

assert.ok(
  authBoundaryIndex >= 0 && routeIndex > authBoundaryIndex,
  "랭킹 공개 이름 PATCH는 전역 Bearer 인증 뒤에 등록해야 한다"
);
assert.match(
  routesSource,
  /router\.patch\(\s*"\/me\/ranking-identity",\s*apiController\.updateRankingIdentity\s*\)/,
  "iPad가 호출하는 PATCH 경로를 실제 controller에 연결해야 한다"
);

assert.equal(
  identity.normalizeRankingDisplayMode(" nickname "),
  "nickname",
  "공백을 정리한 닉네임 공개 모드를 허용한다"
);
assert.equal(
  identity.normalizeRankingDisplayMode("realName"),
  null,
  "현재 공개 정책에 없는 실명 모드는 거절한다"
);
assert.equal(
  identity.getRankingDisplayName({
    name: "수학왕",
    realName: "이학생",
    preferences: {
      rankingDisplayMode: "realName",
    },
  }),
  "수학왕",
  "구 저장값이 realName이어도 공개 이름 정본은 닉네임이다"
);
assert.doesNotMatch(
  syncControllerSource,
  /rankingDisplayMode\s*===\s*["']realName["']\s*\?\s*["']실명["']/,
  "구 저장값 때문에 iPad 랭킹 라벨이 실명으로 바뀌면 안 된다"
);
assert.doesNotMatch(
  arenaReadSource,
  /displayName:\s*[\s\S]{0,120}user\?\.realName/,
  "GOAT Arena 공개 이름이 실명으로 폴백하면 안 된다"
);

const originalFindByIdAndUpdate =
  User.findByIdAndUpdate;
let updateResult = null;
let updateCall = null;

User.findByIdAndUpdate = async (
  userId,
  update,
  options
) => {
  updateCall = { userId, update, options };
  return updateResult;
};

delete require.cache[
  require.resolve(
    path.join(repoRoot, "controllers/apiController.js")
  )
];
const apiController = require(
  path.join(repoRoot, "controllers/apiController.js")
);

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function main() {
  try {
    let nextError = null;
    let res = response();
    await apiController.updateRankingIdentity(
      {
        apiUser: { _id: "user-42" },
        body: { rankingDisplayMode: "realName" },
      },
      res,
      (error) => {
        nextError = error;
      }
    );
    assert.equal(res.statusCode, 400);
    assert.equal(
      res.body.code,
      "INVALID_RANKING_DISPLAY_MODE"
    );
    assert.equal(
      updateCall,
      null,
      "허용하지 않는 공개 모드는 DB에 쓰지 않는다"
    );
    assert.equal(nextError, null);

    res = response();
    await apiController.updateRankingIdentity(
      {
        apiUser: { _id: "user-42" },
      },
      res,
      (error) => {
        nextError = error;
      }
    );
    assert.equal(
      res.statusCode,
      400,
      "빈 JSON 요청도 서버 오류가 아니라 입력 오류로 답한다"
    );
    assert.equal(
      updateCall,
      null,
      "빈 요청은 DB에 쓰지 않는다"
    );

    updateResult = {
      _id: "user-42",
      name: "수학왕",
      realName: "이학생",
      email: "student@example.com",
      role: "student",
      schoolGrade: 10,
      preferences: {
        rankingDisplayMode: "nickname",
      },
    };
    res = response();
    await apiController.updateRankingIdentity(
      {
        apiUser: { _id: "user-42" },
        body: { rankingDisplayMode: "nickname" },
      },
      res,
      (error) => {
        nextError = error;
      }
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.name, "수학왕");
    assert.equal(
      res.body.user.rankingDisplayMode,
      "nickname"
    );
    assert.deepEqual(updateCall, {
      userId: "user-42",
      update: {
        "preferences.rankingDisplayMode":
          "nickname",
      },
      options: {
        new: true,
        runValidators: true,
      },
    });

    updateResult = null;
    res = response();
    await apiController.updateRankingIdentity(
      {
        apiUser: { _id: "missing-user" },
        body: { rankingDisplayMode: "nickname" },
      },
      res,
      (error) => {
        nextError = error;
      }
    );
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.code, "USER_NOT_FOUND");
    assert.equal(nextError, null);

    console.log(
      "ranking identity API tests passed"
    );
  } finally {
    User.findByIdAndUpdate =
      originalFindByIdAndUpdate;
  }
}

main().catch((error) => {
  User.findByIdAndUpdate =
    originalFindByIdAndUpdate;
  console.error(error);
  process.exit(1);
});
