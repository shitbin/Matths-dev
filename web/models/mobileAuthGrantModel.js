const mongoose = require("mongoose");

const mobileAuthGrantSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, select: false },
  // 앱이 만든 PKCE challenge. 비밀값은 아니지만 교환 검증 외에는 읽지 않는다.
  // null 값은 과거 문서 역호환을 위해 읽을 수만 있고 교환에는 사용할 수 없다.
  codeChallenge: { type: String, default: null, select: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  consumedAt: { type: Date, default: null },
  // 응답 유실 재시도에서 새 Bearer를 만들지 않도록 최초 소비와 함께 고정한다.
  // 토큰 원문이나 verifier는 저장하지 않는다.
  accessTokenIssuedAt: { type: Date, default: null },
  // 최초 JSON 응답은 서버 비밀로 AES-GCM 암호화해 짧은 재시도 창 동안만 보관한다.
  // 세 필드는 직접 조회하지 않으면 API 응답이나 일반 쿼리에 나타나지 않는다.
  responseCiphertext: { type: String, default: null, select: false },
  responseIv: { type: String, default: null, select: false },
  responseTag: { type: String, default: null, select: false },
  resultExpiresAt: { type: Date, default: null, index: { expireAfterSeconds: 0 } },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.models.MobileAuthGrant ||
  mongoose.model("MobileAuthGrant", mobileAuthGrantSchema);
