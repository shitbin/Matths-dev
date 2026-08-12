const crypto = require("crypto");
const MobileAuthGrant = require("../models/mobileAuthGrantModel");

const GRANT_TTL_MS = 5 * 60 * 1000;
const digest = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const base64url = (value) => Buffer.from(value).toString("base64url");
const verifierChallenge = (value) =>
  base64url(crypto.createHash("sha256").update(String(value)).digest());

async function issueMobileAuthGrant(
  userId,
  { GrantModel = MobileAuthGrant, codeChallenge = null } = {},
) {
  const code = crypto.randomBytes(32).toString("base64url");
  await GrantModel.create({
    tokenHash: digest(code),
    codeChallenge: codeChallenge || null,
    userId,
    expiresAt: new Date(Date.now() + GRANT_TTL_MS),
  });
  return code;
}

async function consumeMobileAuthGrant(
  code,
  { GrantModel = MobileAuthGrant, codeVerifier = null } = {},
) {
  const normalized = String(code || "").trim();
  if (!normalized) return null;
  const verifier = String(codeVerifier || "").trim();
  const query = {
    tokenHash: digest(normalized),
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  };
  // 신규 앱 grant는 verifier가 맞아야만 원자적으로 소비된다. codeChallenge가
  // 없는 기존 grant만 verifier 없이 교환할 수 있어 배포 순서가 앱/서버 어느
  // 쪽이 먼저여도 이미 열린 로그인 왕복을 깨지 않는다.
  query.codeChallenge = verifier
    ? { $in: [null, verifierChallenge(verifier)] }
    : null;
  const consumed = await GrantModel.findOneAndUpdate(
    query,
    { $set: { consumedAt: new Date() } },
    { new: true },
  ).select("+tokenHash +codeChallenge");
  if (consumed || !verifier) return consumed;

  // 서버가 grant를 소비한 직후 응답만 유실된 경우, PKCE verifier를 가진
  // 원래 앱은 만료 전 같은 계정의 Bearer 응답을 다시 받을 수 있다. 새로운
  // 부작용을 만들지 않고 로그인 완료 응답만 재생하므로 네트워크 재시도에
  // 안전하다. verifier 없는 legacy grant에는 이 경로를 열지 않는다.
  return GrantModel.findOne({
    tokenHash: digest(normalized),
    codeChallenge: verifierChallenge(verifier),
    consumedAt: { $ne: null },
    expiresAt: { $gt: new Date() },
  }).select("+tokenHash +codeChallenge");
}

module.exports = {
  issueMobileAuthGrant,
  consumeMobileAuthGrant,
  GRANT_TTL_MS,
  _testing: { verifierChallenge },
};
