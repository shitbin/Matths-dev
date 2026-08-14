"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  beginSocialAuthorization,
  completeSocialAuthorization,
  publicProviderStatus,
} = require("../services/socialAuthService");
const {
  issueMobileAuthGrant,
  consumeMobileAuthGrant,
  resolveMobileAuthGrantResult,
  GRANT_REPLAY_WINDOW_MS,
  _testing: { verifierChallenge },
} = require("../services/mobileSocialAuthGrantService");
const authMiddleware = require("../middleware/authMiddleware");
const { createAccessToken } = require("../services/mobileAuthService");
const { resolveIpadSourceRoot } = require("../scripts/resolveIpadWorkspace");

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const loginView = fs.readFileSync(path.join(repoRoot, "views/login.ejs"), "utf8");
  const webRoutes = fs.readFileSync(
    path.join(repoRoot, "routes/matths-routes.js"),
    "utf8",
  );
  const apiRoutes = fs.readFileSync(
    path.join(repoRoot, "routes/api-routes.js"),
    "utf8",
  );
  const ipadSourceRoot = resolveIpadSourceRoot(repoRoot);
  const coordinator = fs.readFileSync(
    path.join(ipadSourceRoot, "GoogleSignInCoordinator.swift"),
    "utf8",
  );
  const googleMark = fs.readFileSync(
    path.join(repoRoot, "views/partials/google-g-mark.ejs"),
    "utf8",
  );
  assert.equal((loginView.match(/href="\/auth\/google"/g) || []).length, 1);
  assert.ok(loginView.indexOf('href="/auth/google"') < loginView.indexOf('action="/login"'));
  assert.match(loginView, /googleAuthReady/);
  assert.doesNotMatch(loginView, /Google 로그인 설정 중/);
  assert.doesNotMatch(loginView, /social-auth-button is-google is-unavailable/);
  assert.doesNotMatch(loginView, /지금은 Google 로그인을 이용할 수 없습니다/);
  assert.match(loginView, /include\("partials\/google-g-mark"\)/);
  assert.doesNotMatch(loginView, /social-auth-mark[^>]*>\s*G\s*</);
  for (const color of ["#4285F4", "#34A853", "#FBBC05", "#EA4335"]) {
    assert.match(googleMark, new RegExp(color, "i"), `Google mark color ${color} missing`);
  }
  assert.match(
    webRoutes,
    /router\.get\(\s*"\/auth\/google\/app",\s*matthsController\.socialOAuthAppStart\s*\)/,
    "iPad Google start must be a public web route outside the Bearer API boundary",
  );
  // PKCE 강제 이후 challenge 없는 grant 는 교환되지 않는다. 이 별칭을 남겨 두면
  // Google 왕복을 끝내고도 exchange 에서 반드시 401 이 되는 길이 열린 채로 있다.
  assert.doesNotMatch(
    apiRoutes,
    /"\/auth\/google\/start"/,
    "the pre-PKCE start alias must not be routable — it can no longer complete an exchange",
  );
  assert.match(coordinator, /appendingPathComponent\("\/auth\/google\/app"\)/);
  assert.match(coordinator, /URLQueryItem\(name: "code_challenge"/);
  assert.match(coordinator, /codeVerifier: codeVerifier/);
  assert.match(coordinator, /try await ServerAPI\.socialAuthProviders\(\)/);
  assert.match(coordinator, /SOCIAL_AUTH_NOT_CONFIGURED/);
  assert.match(apiRoutes, /"\/auth\/providers",\s*apiController\.socialAuthProviders/);
  assert.doesNotMatch(
    coordinator,
    /appendingPathComponent\("\/api\/v1\/auth\/google\/start"\)/,
  );

  const old = {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirect: process.env.GOOGLE_OAUTH_REDIRECT_URI,
  };
  process.env.GOOGLE_OAUTH_CLIENT_ID = "test-client";
  process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://www.matths.kr/auth/google/callback";

  delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  assert.equal(publicProviderStatus()[0].configured, false);
  assert.throws(
    () => beginSocialAuthorization({ session: {} }, "google"),
    (error) => error?.code === "SOCIAL_AUTH_NOT_CONFIGURED",
    "client secret이 빠진 반쪽 설정은 Google 왕복을 시작하면 안 됩니다.",
  );

  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-secret";
  assert.equal(publicProviderStatus()[0].configured, true);

  const verifier = "mobile-pkce-verifier-that-is-long-enough-for-this-contract";
  const challenge = verifierChallenge(verifier);
  const req = { session: {} };
  const authorizationURL = new URL(beginSocialAuthorization(req, "google", {
    mobile: true,
    codeChallenge: challenge,
  }));
  assert.equal(authorizationURL.searchParams.get("redirect_uri"), process.env.GOOGLE_OAUTH_REDIRECT_URI);
  assert.equal(req.session.socialOAuthState.context.mobile, true);
  assert.equal(req.session.socialOAuthState.context.codeChallenge, challenge);

  const fetchImpl = async (url) => ({
    ok: true,
    async json() {
      return String(url).includes("token")
        ? { access_token: "provider-token" }
        : { sub: "google-user", email: "student@example.com", email_verified: true, name: "학생" };
    },
  });
  const completed = await completeSocialAuthorization(req, "google", {
    code: "authorization-code",
    state: authorizationURL.searchParams.get("state"),
  }, fetchImpl);
  assert.equal(completed.context.mobile, true);
  assert.equal(completed.profile.email, "student@example.com");
  assert.equal(req.session.socialOAuthState, undefined);

  assert.equal(completed.context.codeChallenge, challenge);

  let row = null;
  const GrantModel = {
    async create(value) {
      row = {
        _id: "grant-1",
        ...value,
        consumedAt: null,
        accessTokenIssuedAt: null,
        responseCiphertext: null,
      };
    },
    findOneAndUpdate(query, update) {
      return {
        async select() {
          if (query._id) {
            if (!row || row._id !== query._id ||
                row.consumedAt <= query.consumedAt?.$gt ||
                row.resultExpiresAt <= query.resultExpiresAt?.$gt ||
                (query.responseCiphertext === null && row.responseCiphertext !== null)) {
              return null;
            }
            row = { ...row, ...update.$set };
            return { ...row };
          }
          const expectedChallenges = query.codeChallenge?.$in || [query.codeChallenge];
          if (!row || row.tokenHash !== query.tokenHash || row.consumedAt ||
              row.expiresAt <= new Date() ||
              !expectedChallenges.includes(row.codeChallenge ?? null)) return null;
          row = { ...row, ...update.$set };
          return { ...row, userId: "user-1" };
        },
      };
    },
    findOne(query) {
      return {
        async select() {
          if (query._id) {
            if (!row || row._id !== query._id ||
                row.consumedAt <= query.consumedAt?.$gt ||
                row.resultExpiresAt <= query.resultExpiresAt?.$gt ||
                (query.responseCiphertext?.$ne === null && row.responseCiphertext === null)) {
              return null;
            }
            return { ...row };
          }
          if (!row || row.tokenHash !== query.tokenHash ||
              row.codeChallenge !== query.codeChallenge ||
              !row.consumedAt || row.expiresAt <= new Date()) return null;
          // 재생 창은 실제 쿼리 조건이므로 목도 그대로 판정해야 한다.
          // 창을 무시하면 "재시도는 되지만 무제한은 아니다"를 검증하지 못한다.
          const after = query.consumedAt?.$gt;
          if (after && row.consumedAt <= after) return null;
          const resultAfter = query.resultExpiresAt?.$gt;
          if (resultAfter && row.resultExpiresAt <= resultAfter) return null;
          return { ...row, userId: "user-1" };
        },
      };
    },
  };
  const code = await issueMobileAuthGrant("user-1", {
    GrantModel,
    codeChallenge: challenge,
  });
  assert.equal(
    await consumeMobileAuthGrant(code, {
      GrantModel,
      codeVerifier: "wrong-verifier",
    }),
    null,
    "a stolen callback code must not be exchangeable without the app verifier",
  );
  const firstConsumption = await consumeMobileAuthGrant(code, {
    GrantModel,
    codeVerifier: verifier,
  });
  assert.equal(firstConsumption.replayed, false);
  const retriedConsumption = await consumeMobileAuthGrant(code, {
    GrantModel,
    codeVerifier: verifier,
  });
  assert.equal(retriedConsumption.replayed, true);
  assert.equal(
    retriedConsumption.accessTokenIssuedAtSeconds,
    firstConsumption.accessTokenIssuedAtSeconds,
    "the original app may retry after the token response is lost",
  );
  const tokenUser = {
    _id: "user-1",
    email: "student@example.test",
    role: "student",
    tokenVersion: 0,
  };
  const previousApiTokenSecret = process.env.API_TOKEN_SECRET;
  process.env.API_TOKEN_SECRET = "social-auth-mobile-contract-secret";
  const firstToken = createAccessToken(tokenUser, {
      issuedAtSeconds: firstConsumption.accessTokenIssuedAtSeconds,
    });
  const retriedToken = createAccessToken(tokenUser, {
      issuedAtSeconds: retriedConsumption.accessTokenIssuedAtSeconds,
    });
  assert.equal(
    firstToken,
    retriedToken,
    "a retry must reconstruct the identical Bearer instead of issuing another one",
  );
  const firstStableResult = await resolveMobileAuthGrantResult(
    firstConsumption.grant._id,
    { accessToken: firstToken, marker: "first" },
    { GrantModel },
  );
  const retriedStableResult = await resolveMobileAuthGrantResult(
    retriedConsumption.grant._id,
    { accessToken: `${firstToken}-must-not-win`, marker: "retry" },
    { GrantModel },
  );
  assert.deepEqual(retriedStableResult, firstStableResult);
  assert.equal(firstStableResult.marker, "first");
  assert.notEqual(row.responseCiphertext, firstToken, "the Bearer is encrypted at rest");
  if (previousApiTokenSecret === undefined) {
    delete process.env.API_TOKEN_SECRET;
  } else {
    process.env.API_TOKEN_SECRET = previousApiTokenSecret;
  }
  assert.equal(
    await consumeMobileAuthGrant(code, { GrantModel }),
    null,
    "an exchange without the verifier is never accepted",
  );
  assert.equal(
    await consumeMobileAuthGrant(code, {
      GrantModel,
      codeVerifier: `${"a".repeat(42)}!`,
    }),
    null,
    "the server enforces the RFC 7636 verifier character set and length",
  );

  // 재시도 허용은 짧은 창 안에서만이다. 창이 지난 grant는 소비 여부와 무관하게
  // 다시 Bearer를 내주지 않는다 — 소비된 code가 TTL 내내 재발급 수단이 되면
  // PKCE로 막은 탈취 시나리오가 되살아난다.
  row = { ...row, consumedAt: new Date(Date.now() - (GRANT_REPLAY_WINDOW_MS + 1_000)) };
  assert.equal(
    await consumeMobileAuthGrant(code, { GrantModel, codeVerifier: verifier }),
    null,
    "a consumed grant stops replaying once the retry window closes",
  );

  // PKCE 배포기의 한시적 예외(challenge 없는 grant를 verifier 없이 교환)는
  // 만료 조건이 적히지 않은 채 남아 우회 경로가 됐다. 이제 교환되지 않는다.
  //
  // 이 단언은 "발급은 되지만 교환은 안 된다"는 상태를 고정한다. 그런 grant 를
  // 발급하는 경로를 남겨 두면 사용자는 Google 왕복을 다 끝내고 마지막에만
  // 실패한다 — 그래서 위(라우트 검사)에서 별칭 자체의 부재를 함께 못박는다.
  // 302 와 code 발급까지만 보는 검사는 이 회귀를 잡지 못한다.
  const legacyCode = await issueMobileAuthGrant("user-1", { GrantModel });
  assert.equal(
    await consumeMobileAuthGrant(legacyCode, { GrantModel }),
    null,
    "a PKCE-less grant is no longer exchangeable",
  );
  assert.equal(
    await consumeMobileAuthGrant(legacyCode, { GrantModel, codeVerifier: verifier }),
    null,
    "a PKCE-less grant is not rescued by supplying some other verifier",
  );

  // 최초 교환이 원래 5분 grant TTL 직전에 일어나더라도, 성공한 교환에는 온전한
  // 60초 응답 재시도 창이 있어야 한다. 소비와 함께 문서 TTL도 같은 창 끝으로
  // 옮기지 않으면 원래 expiresAt이 먼저 문서를 지워 버린다.
  const boundaryCode = await issueMobileAuthGrant("user-1", {
    GrantModel,
    codeChallenge: challenge,
  });
  const originalBoundaryExpiry = new Date(Date.now() + 100);
  row = { ...row, expiresAt: originalBoundaryExpiry };
  assert.ok(await consumeMobileAuthGrant(boundaryCode, {
    GrantModel,
    codeVerifier: verifier,
  }));
  assert.ok(row.expiresAt > originalBoundaryExpiry);
  assert.equal(row.expiresAt.getTime(), row.resultExpiresAt.getTime());
  await new Promise((resolve) => setTimeout(resolve, 125));
  assert.ok(Date.now() > originalBoundaryExpiry.getTime());
  assert.ok(
    await consumeMobileAuthGrant(boundaryCode, { GrantModel, codeVerifier: verifier }),
    "a successful near-expiry exchange keeps the full response replay window",
  );

  let nextCount = 0;
  let redirectedTo = "";
  const response = { redirect(location) { redirectedTo = location; } };
  authMiddleware.isSocialOAuthCallbackAllowed({
    session: {
      user: { id: "already-web-authenticated", role: "student" },
      socialOAuthState: { context: { mobile: true } },
    },
  }, response, () => { nextCount += 1; });
  assert.equal(nextCount, 1, "mobile callback must survive an existing web login cookie");
  assert.equal(redirectedTo, "");

  authMiddleware.isSocialOAuthCallbackAllowed({
    session: {
      user: { id: "already-web-authenticated", role: "student" },
      socialOAuthState: { context: { mobile: false } },
    },
  }, response, () => { nextCount += 1; });
  assert.equal(nextCount, 1, "web callback must retain the logged-out-only contract");
  assert.equal(redirectedTo, "/main");

  process.env.GOOGLE_OAUTH_CLIENT_ID = old.clientId;
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = old.secret;
  process.env.GOOGLE_OAUTH_REDIRECT_URI = old.redirect;
  console.log("social auth mobile contract passed");
}

main().catch((error) => { console.error(error); process.exit(1); });
