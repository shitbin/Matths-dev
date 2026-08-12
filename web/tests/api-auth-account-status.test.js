// 실행:  node webrepo-applied/tests/api-auth-account-status.test.js
//
// **정지된 계정이 앱 API 를 쓸 수 없어야 한다.**
//
// 이전 작업본은 `!user.isActive` 만 봤고, 스키마에 accountStatus 필드가 아예
// 없어서 정지 처리가 조용히 무동작이었다. 관리자가 정지시켜도 앱은 계속 돌았다.
// 그 회귀를 여기서 막는다.
const path = require("path");
const REPO = path.resolve(__dirname, "..");
const modelPath = require.resolve(path.join(REPO, "models/matthsModel.js"));
const authPath = require.resolve(path.join(REPO, "services/mobileAuthService.js"));
const lifePath = require.resolve(path.join(REPO, "services/userLifecycleService.js"));

let currentUser = null;
const real = require(modelPath);

require.cache[modelPath].exports = {
  ...real,
  User: {
    // accountAccessService 는 `await User.findById(id)` 로 **문서를 바로** 받는다.
    // 체이닝 스텁({exec})을 주면 그 객체 자체가 user 로 들어가 항상 active 로
    // 판정된다 — 실제로 이 테스트가 처음에 그렇게 통과했다.
    findById: async () => currentUser,
    findOne: async () => currentUser,
  },
};
require.cache[authPath] = {
  id: authPath, filename: authPath, loaded: true,
  exports: { verifyAccessToken: () => ({ sub: "u1", ver: 0 }) },
};
require.cache[lifePath] = {
  id: lifePath, filename: lifePath, loaded: true,
  exports: { synchronizeUserLifecycle: async () => currentUser },
};

const { requireApiAuth } = require(path.join(REPO, "middleware/apiAuthMiddleware.js"));

const fails = [];
const ok = (c, label, got) =>
  c ? console.log(`  ✓ ${label}`)
    : (fails.push(label), console.log(`  ✗ ${label} — 실제: ${JSON.stringify(got)}`));

const makeUser = (over) => ({
  _id: "u1", name: "이수빈", isActive: true, tokenVersion: 0,
  accountStatus: "active", suspendedUntil: null,
  save: async function () { return this; },
  toObject() { return { ...this }; },
  ...over,
});

const run = async (user) => {
  currentUser = user;
  let status = null, body = null, passed = false;
  const res = {
    status(s) { status = s; return this; },
    json(b) { body = b; return this; },
  };
  await requireApiAuth({ get: () => "Bearer x" }, res, () => { passed = true; });
  return { status, body, passed };
};

(async () => {
  ok((await run(makeUser())).passed === true, "정상 계정은 통과", null);

  const suspended = await run(makeUser({
    accountStatus: "suspended",
    suspendedUntil: new Date(Date.now() + 86_400_000),   // 내일까지 정지
  }));
  ok(suspended.passed === false, "정지 계정은 통과하지 못한다", suspended);
  ok(suspended.status === 401, "401 로 막는다", suspended.status);

  const withdrawn = await run(makeUser({ accountStatus: "withdrawn", isActive: false }));
  ok(withdrawn.passed === false, "탈퇴 계정은 통과하지 못한다", withdrawn.status);

  // 정지 기간이 지나면 자동 해제된다. 다만 해제하면서 **tokenVersion 을 올리므로**
  // 기존 토큰은 무효가 되고 재로그인이 필요하다 — 레포의 의도된 동작이다
  // (정지 중에 발급돼 있던 토큰을 그대로 살려 두지 않는다).
  const expiredUser = makeUser({
    accountStatus: "suspended",
    suspendedUntil: new Date(Date.now() - 86_400_000),   // 어제까지였다
  });
  const expired = await run(expiredUser);
  ok(expiredUser.accountStatus === "active", "정지 기간이 지나면 상태가 active 로 풀린다",
     expiredUser.accountStatus);
  ok(Number(expiredUser.tokenVersion) === 1, "해제 시 토큰 버전을 올린다", expiredUser.tokenVersion);
  ok(expired.status === 401, "옛 토큰은 무효 — 재로그인이 필요하다", expired.status);

  const revoked = await run(makeUser({ tokenVersion: 3 }));
  ok(revoked.passed === false, "토큰 버전이 다르면 막는다(탈퇴·비번변경 후)", revoked.status);

  console.log(fails.length ? `\n실패 ${fails.length}건` : "\n전부 통과");
  process.exit(fails.length ? 1 : 0);
})();
