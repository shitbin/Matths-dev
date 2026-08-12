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
  _testing: { verifierChallenge },
} = require("../services/mobileSocialAuthGrantService");
const authMiddleware = require("../middleware/authMiddleware");

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
  const coordinator = fs.readFileSync(
    path.join(repoRoot, "../ipad-app/Matths/GoogleSignInCoordinator.swift"),
    "utf8",
  );
  const googleMark = fs.readFileSync(
    path.join(repoRoot, "views/partials/google-g-mark.ejs"),
    "utf8",
  );
  assert.equal((loginView.match(/href="\/auth\/google"/g) || []).length, 1);
  assert.ok(loginView.indexOf('href="/auth/google"') < loginView.indexOf('action="/login"'));
  assert.match(loginView, /googleAuthReady/);
  assert.match(loginView, /Google 로그인 설정 중/);
  assert.match(loginView, /social-auth-button is-google is-unavailable/);
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
  assert.match(
    apiRoutes,
    /"\/auth\/google\/start",\s*matthsController\.socialOAuthLegacyAppStart/,
    "legacy API start path must remain available during app/server rollout",
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
  process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://matths.kr/auth/google/callback";

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
    async create(value) { row = { ...value, consumedAt: null }; },
    findOneAndUpdate(query, update) {
      return {
        async select() {
          const expectedChallenges = query.codeChallenge?.$in || [query.codeChallenge];
          if (!row || row.tokenHash !== query.tokenHash || row.consumedAt ||
              row.expiresAt <= new Date() ||
              !expectedChallenges.includes(row.codeChallenge ?? null)) return null;
          row = { ...row, consumedAt: update.$set.consumedAt };
          return { ...row, userId: "user-1" };
        },
      };
    },
    findOne(query) {
      return {
        async select() {
          if (!row || row.tokenHash !== query.tokenHash ||
              row.codeChallenge !== query.codeChallenge ||
              !row.consumedAt || row.expiresAt <= new Date()) return null;
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
  assert.ok(await consumeMobileAuthGrant(code, { GrantModel, codeVerifier: verifier }));
  assert.ok(
    await consumeMobileAuthGrant(code, { GrantModel, codeVerifier: verifier }),
    "the original app may retry after the token response is lost",
  );
  assert.equal(
    await consumeMobileAuthGrant(code, { GrantModel }),
    null,
    "legacy exchange without the verifier remains single-use",
  );

  const legacyCode = await issueMobileAuthGrant("user-1", { GrantModel });
  assert.ok(
    await consumeMobileAuthGrant(legacyCode, { GrantModel }),
    "a pre-PKCE login already in flight must survive server-first rollout",
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
