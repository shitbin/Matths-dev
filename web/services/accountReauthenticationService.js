"use strict";

const crypto = require("node:crypto");
const AccountReauthentication = require("../models/accountReauthenticationModel");
const { User } = require("../models/matthsModel");

const REAUTHENTICATION_TTL_MS = 5 * 60 * 1000;
const PKCE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const digest = (value) => crypto
  .createHash("sha256")
  .update(String(value))
  .digest("hex");
const base64url = (value) => Buffer.from(value).toString("base64url");
const verifierChallenge = (value) => base64url(
  crypto.createHash("sha256").update(String(value)).digest()
);

function codedError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function assertCodeChallenge(value) {
  const challenge = String(value || "").trim();
  if (!PKCE_CHALLENGE_PATTERN.test(challenge)) {
    throw codedError(
      400,
      "ACCOUNT_REAUTHENTICATION_PKCE_REQUIRED",
      "Google 본인 확인을 안전하게 시작하지 못했습니다. 앱에서 다시 시도해주세요.",
    );
  }
  return challenge;
}

async function linkedGoogleAccount(userId, { UserModel = User } = {}) {
  return UserModel.findById(userId)
    .select("+socialAuth.googleId role accountStatus")
    .lean();
}

async function assertLinkedGoogleAccount(userId, options = {}) {
  const user = await linkedGoogleAccount(userId, options);
  if (!user) {
    throw codedError(404, "USER_NOT_FOUND", "사용자 정보를 찾을 수 없습니다.");
  }
  if (!String(user.socialAuth?.googleId || "").trim()) {
    throw codedError(
      409,
      "GOOGLE_ACCOUNT_NOT_LINKED",
      "이 계정에는 Google 로그인이 연결되어 있지 않습니다.",
    );
  }
  return user;
}

async function issueGrant({
  userId,
  kind,
  providerSubject,
  codeChallenge = null,
  GrantModel = AccountReauthentication,
}) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + REAUTHENTICATION_TTL_MS);
  await GrantModel.create({
    tokenHash: digest(token),
    kind,
    provider: "google",
    purpose: "account-deletion",
    userId,
    codeChallenge,
    providerSubjectHash: digest(providerSubject),
    expiresAt,
  });
  return { token, expiresAt };
}

async function issueBrowserStart(userId, codeChallenge, options = {}) {
  const user = await assertLinkedGoogleAccount(userId, options);
  return issueGrant({
    userId,
    kind: "browser-start",
    providerSubject: user.socialAuth.googleId,
    codeChallenge: assertCodeChallenge(codeChallenge),
    GrantModel: options.GrantModel,
  });
}

async function consumeGrant({
  token,
  kind,
  userId = null,
  codeVerifier = null,
  providerSubject = null,
  matchCodeChallenge = true,
  GrantModel = AccountReauthentication,
}) {
  const normalized = String(token || "").trim();
  if (!normalized) return null;
  const verifier = String(codeVerifier || "").trim();
  const query = {
    tokenHash: digest(normalized),
    kind,
    purpose: "account-deletion",
    consumedAt: null,
    expiresAt: { $gt: new Date() },
    ...(userId ? { userId } : {}),
    ...(providerSubject
      ? { providerSubjectHash: digest(providerSubject) }
      : {}),
    ...(matchCodeChallenge
      ? { codeChallenge: verifier ? verifierChallenge(verifier) : null }
      : {}),
  };
  return GrantModel.findOneAndUpdate(
    query,
    { $set: { consumedAt: new Date() } },
    { new: true },
  ).select("+tokenHash +codeChallenge +providerSubjectHash");
}

async function consumeBrowserStart(token, options = {}) {
  // browser-start의 challenge는 다음 proof에 전달할 값이지, 브라우저가
  // verifier로 푸는 값이 아니다. 여기서 null challenge를 찾으면 모든 앱
  // 요청이 실패한다. 토큰을 1회 소비한 뒤 현재 연결된 Google sub와도 다시
  // 대조해, API 시작 이후 계정 연결이 바뀐 요청은 OAuth로 넘기지 않는다.
  const request = await consumeGrant({
    token,
    kind: "browser-start",
    matchCodeChallenge: false,
    GrantModel: options.GrantModel,
  });
  if (!request) return null;
  const user = await assertLinkedGoogleAccount(request.userId, options);
  if (!safeDigestEqual(
    request.providerSubjectHash,
    digest(user.socialAuth.googleId),
  )) {
    throw codedError(
      401,
      "ACCOUNT_REAUTHENTICATION_IDENTITY_CHANGED",
      "Google 계정 연결이 변경되었습니다. 앱에서 다시 시작해주세요.",
    );
  }
  return request;
}

function safeDigestEqual(left, right) {
  const first = Buffer.from(String(left || ""));
  const second = Buffer.from(String(right || ""));
  return first.length === second.length && crypto.timingSafeEqual(first, second);
}

async function verifyGoogleIdentity(userId, providerUserId, options = {}) {
  const user = await assertLinkedGoogleAccount(userId, options);
  const linkedId = Buffer.from(String(user.socialAuth.googleId));
  const verifiedId = Buffer.from(String(providerUserId || ""));
  if (
    linkedId.length !== verifiedId.length ||
    !crypto.timingSafeEqual(linkedId, verifiedId)
  ) {
    throw codedError(
      403,
      "ACCOUNT_REAUTHENTICATION_IDENTITY_MISMATCH",
      "현재 계정에 연결된 Google 계정으로 다시 확인해주세요.",
    );
  }
  return user;
}

async function issueAccountDeletionProof(userId, {
  codeChallenge = null,
  providerSubject = null,
  GrantModel = AccountReauthentication,
  ...options
} = {}) {
  const user = await assertLinkedGoogleAccount(userId, options);
  const subject = String(providerSubject || user.socialAuth.googleId);
  if (!safeDigestEqual(digest(subject), digest(user.socialAuth.googleId))) {
    throw codedError(
      403,
      "ACCOUNT_REAUTHENTICATION_IDENTITY_MISMATCH",
      "현재 계정에 연결된 Google 계정으로 다시 확인해주세요.",
    );
  }
  return issueGrant({
    userId,
    kind: "account-deletion-proof",
    providerSubject: subject,
    codeChallenge,
    GrantModel,
  });
}

async function consumeAccountDeletionProof(userId, proof, {
  codeVerifier = null,
  providerSubject = null,
  GrantModel = AccountReauthentication,
} = {}) {
  if (!String(providerSubject || "").trim()) return null;
  return consumeGrant({
    token: proof,
    kind: "account-deletion-proof",
    userId,
    codeVerifier,
    providerSubject,
    GrantModel,
  });
}

module.exports = {
  REAUTHENTICATION_TTL_MS,
  assertCodeChallenge,
  assertLinkedGoogleAccount,
  consumeAccountDeletionProof,
  consumeBrowserStart,
  issueAccountDeletionProof,
  issueBrowserStart,
  linkedGoogleAccount,
  verifyGoogleIdentity,
  _testing: { digest, verifierChallenge },
};
