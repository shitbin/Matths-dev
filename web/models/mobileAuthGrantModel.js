const mongoose = require("mongoose");

const mobileAuthGrantSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, select: false },
  // 앱이 만든 PKCE challenge. 비밀값은 아니지만 교환 검증 외에는 읽지 않는다.
  // 구버전 앱의 이미 시작된 OAuth 왕복을 깨지 않도록 optional이다.
  codeChallenge: { type: String, default: null, select: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  consumedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.models.MobileAuthGrant ||
  mongoose.model("MobileAuthGrant", mobileAuthGrantSchema);
