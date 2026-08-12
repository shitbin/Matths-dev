"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const routesSource = fs.readFileSync(
  path.join(repoRoot, "routes/api-routes.js"),
  "utf8",
);
const authBoundaryIndex = routesSource.indexOf(
  "router.use(requireApiAuth)",
);
const routeIndex = routesSource.indexOf('"/me/school"');

assert.ok(
  authBoundaryIndex >= 0 && routeIndex > authBoundaryIndex,
  "학교 변경 API는 전역 Bearer 인증 뒤에 등록해야 한다",
);
assert.match(
  routesSource,
  /router\.patch\(\s*"\/me\/school",\s*apiController\.updateSchool\s*\)/,
  "iPad 학교 변경 경로를 실제 controller에 연결해야 한다",
);

const { User } = require("../models/matthsModel");
const originalFindByIdAndUpdate = User.findByIdAndUpdate;
let updateCall = null;
let updateResult = null;

User.findByIdAndUpdate = async (
  userId,
  update,
  options,
) => {
  updateCall = { userId, update, options };
  return updateResult;
};

delete require.cache[
  require.resolve("../controllers/apiController")
];
const apiController = require("../controllers/apiController");

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

async function call(body = undefined) {
  const res = response();
  let nextError = null;
  await apiController.updateSchool(
    {
      apiUser: { _id: "user-42" },
      body,
    },
    res,
    (error) => {
      nextError = error;
    },
  );
  assert.equal(nextError, null);
  return res;
}

async function main() {
  try {
    let res = await call();
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, "INVALID_SCHOOL");
    assert.equal(updateCall, null);

    res = await call({
      schoolRegion: "서울특별시",
      schoolCode: "not-a-school",
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, "INVALID_SCHOOL");
    assert.equal(updateCall, null);

    updateResult = {
      _id: "user-42",
      name: "수학왕",
      realName: "이학생",
      email: "student@example.test",
      role: "student",
      schoolGrade: 10,
      school: {
        region: "서울특별시",
        code: "7010057",
        name: "가락고등학교",
      },
    };
    res = await call({
      schoolRegion: " 서울특별시 ",
      schoolCode: " 7010057 ",
    });
    assert.equal(res.statusCode, 200);
    assert.equal(
      res.body.user.school.name,
      "가락고등학교",
    );
    assert.deepEqual(updateCall, {
      userId: "user-42",
      update: {
        school: {
          region: "서울특별시",
          code: "7010057",
          name: "가락고등학교",
          roadAddress:
            "서울특별시 송파구 송이로 42",
          establishment: "공립",
          highSchoolType: "일반고",
        },
      },
      options: {
        new: true,
        runValidators: true,
      },
    });

    updateResult = null;
    res = await call({
      schoolRegion: "서울특별시",
      schoolCode: "7010057",
    });
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.code, "USER_NOT_FOUND");

    console.log("profile school Bearer API tests passed");
  } finally {
    User.findByIdAndUpdate =
      originalFindByIdAndUpdate;
  }
}

main().catch((error) => {
  User.findByIdAndUpdate =
    originalFindByIdAndUpdate;
  console.error(error);
  process.exitCode = 1;
});
