const crypto = require("crypto");
const MobileAuthGrant = require("../models/mobileAuthGrantModel");

const GRANT_TTL_MS = 5 * 60 * 1000;
// 토큰 응답이 유실된 앱이 같은 code로 다시 물어볼 수 있는 창. 네트워크 재시도에는
// 넉넉하고 TTL(5분) 전체를 열어 두지는 않는다. 이 창이 없으면 code와 verifier를
// 확보한 쪽이 만료 전까지 Bearer를 몇 번이든 다시 발급받을 수 있다.
const GRANT_REPLAY_WINDOW_MS = 60 * 1000;
const CODE_VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;
const RESULT_CIPHER = "aes-256-gcm";
const digest = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const base64url = (value) => Buffer.from(value).toString("base64url");
const verifierChallenge = (value) =>
  base64url(crypto.createHash("sha256").update(String(value)).digest());

function resultEncryptionKey() {
  const secret = process.env.API_TOKEN_SECRET || process.env.SECRET;
  if (!secret) {
    throw new Error("API_TOKEN_SECRET 또는 SECRET 환경 변수가 필요합니다.");
  }
  return crypto
    .createHash("sha256")
    .update("matths-mobile-auth-grant-result-v1\0")
    .update(String(secret))
    .digest();
}

function encryptResult(grantId, value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(RESULT_CIPHER, resultEncryptionKey(), iv);
  cipher.setAAD(Buffer.from(String(grantId), "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return {
    responseCiphertext: ciphertext.toString("base64url"),
    responseIv: iv.toString("base64url"),
    responseTag: cipher.getAuthTag().toString("base64url"),
  };
}

function decryptResult(grantId, row) {
  const decipher = crypto.createDecipheriv(
    RESULT_CIPHER,
    resultEncryptionKey(),
    Buffer.from(String(row.responseIv || ""), "base64url"),
  );
  decipher.setAAD(Buffer.from(String(grantId), "utf8"));
  decipher.setAuthTag(Buffer.from(String(row.responseTag || ""), "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(String(row.responseCiphertext || ""), "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext);
}

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
  // PKCE verifier 없이는 어떤 grant도 교환하지 않는다. 예전에는 codeChallenge가
  // 없는 grant를 verifier 없이도 교환할 수 있게 열어 뒀는데, 이는 PKCE 배포 당시
  // 이미 시작된 왕복만 살리려던 한시적 조치였다. 그 조치에 만료 조건이 적히지
  // 않아 그대로 남았고, 결과적으로 challenge 없이 grant를 발급하는 경로
  // (`/api/v1/auth/google/start`)로 유도하면 code만으로 Bearer를 받을 수 있었다.
  // PKCE가 막으려던 시나리오가 그대로 열려 있었으므로 여기서 닫는다.
  if (!CODE_VERIFIER_PATTERN.test(verifier)) return null;
  const challenge = verifierChallenge(verifier);
  const consumedAt = new Date();
  const resultExpiresAt = new Date(consumedAt.getTime() + GRANT_REPLAY_WINDOW_MS);
  const consumed = await GrantModel.findOneAndUpdate(
    {
      tokenHash: digest(normalized),
      // challenge가 정확히 일치해야 한다. null 허용은 위 이유로 제거했다.
      codeChallenge: challenge,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        consumedAt,
        accessTokenIssuedAt: consumedAt,
        resultExpiresAt,
        // 최초 소비가 원래 5분 TTL 직전에 일어나도 약속한 재시도 창을 보장한다.
        // 소비 후에는 grant 자체의 TTL도 정확히 이 짧은 결과 창으로 수렴한다.
        expiresAt: resultExpiresAt,
      },
    },
    { new: true },
  ).select("+tokenHash +codeChallenge");
  if (consumed) {
    return {
      grant: consumed,
      replayed: false,
      accessTokenIssuedAtSeconds: Math.floor(consumedAt.getTime() / 1000),
    };
  }

  // 서버가 grant를 소비한 직후 응답만 유실된 경우, verifier를 가진 원래 앱은
  // 짧은 창 안에서 같은 계정의 Bearer 응답을 다시 받을 수 있다. 창을 두지 않으면
  // 소비된 grant가 TTL이 끝날 때까지 재발급 수단으로 남는다.
  const replay = await GrantModel.findOne({
    tokenHash: digest(normalized),
    codeChallenge: challenge,
    consumedAt: { $gt: new Date(Date.now() - GRANT_REPLAY_WINDOW_MS) },
    resultExpiresAt: { $gt: new Date() },
    expiresAt: { $gt: new Date() },
  }).select("+tokenHash +codeChallenge");
  if (!replay) return null;
  const fixedIssuedAt = replay.accessTokenIssuedAt;
  if (!(fixedIssuedAt instanceof Date) || !Number.isFinite(fixedIssuedAt.getTime())) {
    return null;
  }
  return {
    grant: replay,
    replayed: true,
    accessTokenIssuedAtSeconds: Math.floor(fixedIssuedAt.getTime() / 1000),
  };
}

async function resolveMobileAuthGrantResult(
  grantId,
  candidateResult,
  { GrantModel = MobileAuthGrant } = {},
) {
  if (!grantId || !candidateResult || typeof candidateResult !== "object") {
    return null;
  }
  const encrypted = encryptResult(grantId, candidateResult);
  const activeAfter = new Date(Date.now() - GRANT_REPLAY_WINDOW_MS);
  const stored = await GrantModel.findOneAndUpdate(
    {
      _id: grantId,
      consumedAt: { $gt: activeAfter },
      resultExpiresAt: { $gt: new Date() },
      responseCiphertext: null,
    },
    { $set: encrypted },
    { new: true },
  ).select("+responseCiphertext +responseIv +responseTag");
  if (stored) {
    try {
      return decryptResult(grantId, stored);
    } catch {
      return null;
    }
  }

  const replay = await GrantModel.findOne({
    _id: grantId,
    consumedAt: { $gt: activeAfter },
    resultExpiresAt: { $gt: new Date() },
    responseCiphertext: { $ne: null },
  }).select("+responseCiphertext +responseIv +responseTag");
  if (!replay) return null;
  try {
    return decryptResult(grantId, replay);
  } catch {
    return null;
  }
}

module.exports = {
  issueMobileAuthGrant,
  consumeMobileAuthGrant,
  resolveMobileAuthGrantResult,
  GRANT_TTL_MS,
  GRANT_REPLAY_WINDOW_MS,
  _testing: {
    verifierChallenge,
    CODE_VERIFIER_PATTERN,
    encryptResult,
    decryptResult,
  },
};
