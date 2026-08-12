"use strict";

// Google 가입 계정은 저장된 임의 비밀번호를 알 수 없으므로 비밀번호 탈퇴가
// 불가능했다. 이 검사는 fake Google upstream + 격리 Mongo replica set을
// 사용해 iPad ASWebAuthenticationSession 왕복과 웹 세션 왕복을 실제 HTTP로
// 끝까지 통과시킨다. 운영 Google/Atlas에는 어떤 요청도 보내지 않는다.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

process.env.NODE_ENV = "test";
process.env.SECRET = "google-account-deletion-http-session-secret";
process.env.API_TOKEN_SECRET = "google-account-deletion-http-api-secret";
process.env.GOOGLE_OAUTH_CLIENT_ID = "fake-google-client";
process.env.GOOGLE_OAUTH_CLIENT_SECRET = "fake-google-secret";

const { User } = require("../models/matthsModel");
const AccountReauthentication = require("../models/accountReauthenticationModel");
const apiController = require("../controllers/apiController");
const matthsController = require("../controllers/matthsController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireApiAuth } = require("../middleware/apiAuthMiddleware");
const { errorHandler } = require("../middleware/errorMiddleware");
const { createAccessToken } = require("../services/mobileAuthService");
const {
  REAUTHENTICATION_TTL_MS,
  consumeAccountDeletionProof,
  issueAccountDeletionProof,
  _testing: { verifierChallenge },
} = require("../services/accountReauthenticationService");

const base64urlRandom = () => crypto.randomBytes(32).toString("base64url");

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function close(server) {
  if (!server) return Promise.resolve();
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

class CookieJar {
  constructor() {
    this.values = new Map();
  }

  headers(url, source = {}) {
    const headers = new Headers(source);
    const cookie = this.values.get(new URL(url).origin);
    if (cookie) headers.set("cookie", cookie);
    return headers;
  }

  capture(url, response) {
    const raw = response.headers.get("set-cookie");
    if (!raw) return;
    const pair = raw.match(/^([^=;,\s]+=[^;,]*)/)?.[1];
    if (pair) this.values.set(new URL(url).origin, pair);
  }
}

async function jarFetch(jar, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: jar.headers(url, options.headers),
    redirect: "manual",
  });
  jar.capture(url, response);
  return response;
}

async function followBrowser(startURL, jar) {
  let current = startURL;
  for (let hop = 0; hop < 12; hop += 1) {
    if (String(current).startsWith("matths:")) return new URL(current);
    const response = await jarFetch(jar, current);
    assert.ok(
      response.status >= 300 && response.status < 400,
      `browser hop ${hop} expected redirect, got ${response.status} at ${current}`,
    );
    const location = response.headers.get("location");
    assert.ok(location, `browser hop ${hop} omitted Location`);
    current = new URL(location, current).toString();
  }
  throw new Error("OAuth redirect loop exceeded 12 hops");
}

async function createStudent({ email, googleId = null, password = null }) {
  return User.create({
    name: email.split("@")[0].slice(0, 20),
    realName: "테스트 학생",
    email,
    passwordHash: await bcrypt.hash(password || base64urlRandom(), 4),
    ...(googleId ? { socialAuth: { googleId } } : {}),
    emailVerifiedAt: new Date(),
    schoolGrade: 10,
    termsAcceptedAt: new Date(),
  });
}

async function main() {
  let replSet;
  let fakeGoogleServer;
  let appServer;
  const originalEnv = {
    authorize: process.env.GOOGLE_OAUTH_TEST_AUTHORIZE_URL,
    token: process.env.GOOGLE_OAUTH_TEST_TOKEN_URL,
    profile: process.env.GOOGLE_OAUTH_TEST_PROFILE_URL,
    redirect: process.env.GOOGLE_OAUTH_REDIRECT_URI,
  };

  try {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    await mongoose.connect(replSet.getUri("google-account-deletion-http"));

    let selectedSubject = "google-app-user";
    const providerTokens = new Map();
    const fakeGoogle = express();
    fakeGoogle.use(express.urlencoded({ extended: false }));
    fakeGoogle.get("/authorize", (req, res) => {
      assert.equal(req.query.client_id, "fake-google-client");
      assert.equal(req.query.prompt, "select_account");
      const code = base64urlRandom();
      providerTokens.set(code, selectedSubject);
      const callback = new URL(String(req.query.redirect_uri));
      callback.searchParams.set("code", code);
      callback.searchParams.set("state", String(req.query.state));
      return res.redirect(callback.toString());
    });
    fakeGoogle.post("/token", (req, res) => {
      const subject = providerTokens.get(String(req.body.code));
      if (!subject) return res.status(400).json({ error: "invalid_grant" });
      const token = `fake-provider-${base64urlRandom()}`;
      providerTokens.set(token, subject);
      return res.json({ access_token: token, token_type: "Bearer" });
    });
    fakeGoogle.get("/userinfo", (req, res) => {
      const token = String(req.get("authorization") || "").replace(/^Bearer\s+/i, "");
      const subject = providerTokens.get(token);
      if (!subject) return res.status(401).json({ error: "invalid_token" });
      return res.json({
        sub: subject,
        email: `${subject}@example.test`,
        email_verified: true,
        name: "Google 테스트 학생",
      });
    });
    fakeGoogleServer = await listen(fakeGoogle);
    const fakeOrigin = `http://127.0.0.1:${fakeGoogleServer.address().port}`;
    process.env.GOOGLE_OAUTH_TEST_AUTHORIZE_URL = `${fakeOrigin}/authorize`;
    process.env.GOOGLE_OAUTH_TEST_TOKEN_URL = `${fakeOrigin}/token`;
    process.env.GOOGLE_OAUTH_TEST_PROFILE_URL = `${fakeOrigin}/userinfo`;

    const app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use(session({
      secret: process.env.SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: "lax" },
    }));
    app.get("/test/session/:userId", async (req, res, next) => {
      try {
        const user = await User.findById(req.params.userId);
        req.session.user = {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
          tokenVersion: user.tokenVersion,
        };
        req.session.save((error) => error ? next(error) : res.json({ ok: true }));
      } catch (error) {
        next(error);
      }
    });
    app.get(
      "/auth/google/app",
      matthsController.socialOAuthAppStart,
    );
    // 구버전 별칭은 Bearer 경계보다 먼저 등록돼야 한다. 이 순서 자체를
    // 실제 HTTP 302/401 대조로 검증한다.
    app.get(
      "/api/v1/auth/google/start",
      matthsController.socialOAuthLegacyAppStart,
    );
    app.post(
      "/api/v1/auth/google/exchange",
      apiController.exchangeGoogleAuthCode,
    );
    app.get("/api/v1/auth/providers", apiController.socialAuthProviders);
    app.use("/api/v1", requireApiAuth);
    app.get("/api/v1/test/protected", (_req, res) => res.json({ ok: true }));
    app.get(
      "/profile/withdraw/google",
      authMiddleware.isLoggedIn,
      matthsController.socialOAuthWithdrawalWebStart,
    );
    app.get(
      "/auth/google/withdrawal/app",
      matthsController.socialOAuthWithdrawalAppStart,
    );
    app.get(
      "/auth/google/callback",
      authMiddleware.isSocialOAuthCallbackAllowed,
      (req, res) => {
        req.params.provider = "google";
        return matthsController.socialOAuthCallback(req, res);
      },
    );
    app.post(
      "/profile/withdraw",
      authMiddleware.isLoggedIn,
      matthsController.withdrawOwnAccount,
    );
    app.post(
      "/api/v1/me/withdrawal/google/start",
      requireApiAuth,
      apiController.startGoogleWithdrawalReauthentication,
    );
    app.get(
      "/api/v1/me/withdrawal/options",
      requireApiAuth,
      apiController.withdrawalOptions,
    );
    app.delete("/api/v1/me", requireApiAuth, apiController.withdrawMe);
    app.use(errorHandler);
    appServer = await listen(app);
    const appOrigin = `http://127.0.0.1:${appServer.address().port}`;
    process.env.GOOGLE_OAUTH_REDIRECT_URI = `${appOrigin}/auth/google/callback`;

    const loginUser = await createStudent({
      email: "google-login-user@example.test",
      googleId: "google-login-user",
    });
    selectedSubject = "google-login-user";

    // 신규 앱 경로는 PKCE를 유지해 fake Google authorize/token/userinfo와
    // 실제 HTTP 왕복 후 앱 deeplink로 돌아오고, verifier가 있어야 교환된다.
    const loginVerifier = base64urlRandom();
    const loginChallenge = verifierChallenge(loginVerifier);
    let terminal = await followBrowser(
      `${appOrigin}/auth/google/app?code_challenge=${loginChallenge}`,
      new CookieJar(),
    );
    assert.equal(terminal.protocol, "matths:");
    assert.equal(terminal.host, "oauth");
    assert.equal(terminal.pathname, "/google");
    const loginCode = terminal.searchParams.get("code");
    assert.ok(loginCode);
    let response = await fetch(`${appOrigin}/api/v1/auth/google/exchange`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: loginCode, codeVerifier: loginVerifier }),
    });
    assert.equal(response.status, 200);
    assert.ok(String((await response.json()).accessToken || "").split(".").length === 3);

    // 구 `/api/v1/auth/google/start`는 Bearer 토큰 없이도 Google 302를
    // 유지한다. 바로 뒤의 일반 API는 같은 무인증 요청을 401로 막는다.
    const legacyJar = new CookieJar();
    response = await jarFetch(
      legacyJar,
      `${appOrigin}/api/v1/auth/google/start`,
    );
    assert.equal(response.status, 302);
    assert.equal(new URL(response.headers.get("location")).origin, fakeOrigin);
    terminal = await followBrowser(
      response.headers.get("location"),
      legacyJar,
    );
    assert.equal(terminal.toString().startsWith("matths://oauth/google?code="), true);
    response = await fetch(`${appOrigin}/api/v1/test/protected`);
    assert.equal(response.status, 401);

    assert.equal(String(loginUser._id).length, 24);

    const appUser = await createStudent({
      email: "google-app-user@example.test",
      googleId: "google-app-user",
    });
    const otherUser = await createStudent({
      email: "google-other-user@example.test",
      googleId: "google-other-user",
    });
    const appToken = createAccessToken(appUser);
    const otherToken = createAccessToken(otherUser);

    response = await fetch(`${appOrigin}/api/v1/me/withdrawal/options`, {
      headers: { authorization: `Bearer ${appToken}` },
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).googleReauthentication, {
      linked: true,
      available: true,
    });

    const startAppReauthentication = async () => {
      const verifier = base64urlRandom();
      const challenge = verifierChallenge(verifier);
      const started = await fetch(`${appOrigin}/api/v1/me/withdrawal/google/start`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${appToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ codeChallenge: challenge }),
      });
      assert.equal(started.status, 201);
      const body = await started.json();
      const remaining = Date.parse(body.expiresAt) - Date.now();
      assert.ok(remaining > REAUTHENTICATION_TTL_MS - 10_000 && remaining <= REAUTHENTICATION_TTL_MS);
      return { verifier, authorizationUrl: body.authorizationUrl };
    };

    // 연결되지 않은 다른 Google 계정으로 돌아오면 proof가 발급되지 않는다.
    selectedSubject = "attacker-google-user";
    let started = await startAppReauthentication();
    terminal = await followBrowser(started.authorizationUrl, new CookieJar());
    assert.equal(terminal.pathname, "/google-reauth");
    assert.match(terminal.searchParams.get("error") || "", /현재 계정에 연결된 Google 계정/);
    assert.equal(await AccountReauthentication.countDocuments({
      userId: appUser._id,
      kind: "account-deletion-proof",
    }), 0);

    // 올바른 계정이면 앱 전용 proof와 PKCE verifier를 받는다.
    selectedSubject = "google-app-user";
    started = await startAppReauthentication();
    terminal = await followBrowser(started.authorizationUrl, new CookieJar());
    const proof = terminal.searchParams.get("code");
    assert.ok(proof);

    const deleteWithProof = (token, verifier = started.verifier) => fetch(
      `${appOrigin}/api/v1/me`,
      {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          reauthenticationProof: proof,
          codeVerifier: verifier,
          confirmation: "탈퇴",
          acknowledgeAnonymousRetention: true,
        }),
      },
    );

    // proof는 user, 현재 Google sub, PKCE에 모두 결합되고 실패 시 소비되지 않는다.
    response = await deleteWithProof(otherToken);
    assert.equal(response.status, 401);
    await User.updateOne(
      { _id: appUser._id },
      { $set: { "socialAuth.googleId": "changed-google-user" } },
    );
    response = await deleteWithProof(appToken);
    assert.equal(response.status, 401);
    await User.updateOne(
      { _id: appUser._id },
      { $set: { "socialAuth.googleId": "google-app-user" } },
    );
    response = await deleteWithProof(appToken, base64urlRandom());
    assert.equal(response.status, 401);
    response = await deleteWithProof(appToken);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).withdrawn, true);
    assert.equal((await User.findById(appUser._id).lean()).accountStatus, "withdrawn");

    // 웹은 로그인 세션과 OAuth state에 묶인 5분 proof를 서버 세션에 보관한다.
    const webUser = await createStudent({
      email: "google-web-user@example.test",
      googleId: "google-web-user",
    });
    selectedSubject = "google-web-user";
    const webJar2 = new CookieJar();
    response = await jarFetch(webJar2, `${appOrigin}/test/session/${webUser._id}`);
    assert.equal(response.status, 200);
    let current = `${appOrigin}/profile/withdraw/google`;
    let finalLocation = "";
    for (let hop = 0; hop < 6; hop += 1) {
      response = await jarFetch(webJar2, current);
      assert.equal(response.status, 302);
      finalLocation = response.headers.get("location") || "";
      if (finalLocation.startsWith("/profile?withdrawReauthenticated=1")) break;
      current = new URL(finalLocation, current).toString();
    }
    assert.match(finalLocation, /^\/profile\?withdrawReauthenticated=1/);
    response = await jarFetch(webJar2, `${appOrigin}/profile/withdraw`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        confirmation: "탈퇴",
        acknowledgeAnonymousRetention: "true",
      }),
    });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/login?withdrawn=1");
    assert.equal((await User.findById(webUser._id).lean()).accountStatus, "withdrawn");

    // 기존 이메일/비밀번호 계정의 탈퇴 경로는 그대로 유지한다.
    const passwordUser = await createStudent({
      email: "password-user@example.test",
      password: "correct-password-123!",
    });
    response = await fetch(`${appOrigin}/api/v1/me`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${createAccessToken(passwordUser)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        password: "correct-password-123!",
        confirmation: "탈퇴",
        acknowledgeAnonymousRetention: true,
      }),
    });
    assert.equal(response.status, 200);
    assert.equal((await User.findById(passwordUser._id).lean()).accountStatus, "withdrawn");

    // 서비스 수준에서도 proof는 정확히 한 번만 소비된다.
    const oneTimeUser = await createStudent({
      email: "one-time-google@example.test",
      googleId: "one-time-google",
    });
    const oneTime = await issueAccountDeletionProof(oneTimeUser._id, {
      providerSubject: "one-time-google",
    });
    assert.ok(await consumeAccountDeletionProof(oneTimeUser._id, oneTime.token, {
      providerSubject: "one-time-google",
    }));
    assert.equal(await consumeAccountDeletionProof(oneTimeUser._id, oneTime.token, {
      providerSubject: "one-time-google",
    }), null);

    console.log(
      "Google OAuth HTTP contracts passed " +
      "(fake upstream, isolated Mongo, PKCE app login, public legacy 302, " +
      "web+iPad account deletion, one-time proof)",
    );
  } finally {
    process.env.GOOGLE_OAUTH_TEST_AUTHORIZE_URL = originalEnv.authorize;
    process.env.GOOGLE_OAUTH_TEST_TOKEN_URL = originalEnv.token;
    process.env.GOOGLE_OAUTH_TEST_PROFILE_URL = originalEnv.profile;
    process.env.GOOGLE_OAUTH_REDIRECT_URI = originalEnv.redirect;
    await close(appServer).catch(() => {});
    await close(fakeGoogleServer).catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (replSet) await replSet.stop().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
