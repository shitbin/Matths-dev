"use strict";

const mongoose = require("mongoose");

// 로그인 토큰과 계정 삭제 재인증은 권한과 수명이 다르다. 같은 grant 모델을
// 재사용하지 않아, 로그인 재시도 허용 같은 정책이 탈퇴 증명에 섞이지 않게 한다.
const accountReauthenticationSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    select: false,
  },
  kind: {
    type: String,
    enum: ["browser-start", "account-deletion-proof"],
    required: true,
    index: true,
  },
  provider: {
    type: String,
    enum: ["google"],
    required: true,
  },
  purpose: {
    type: String,
    enum: ["account-deletion"],
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  // 앱 proof는 PKCE verifier 없이는 소비할 수 없다. 웹 proof는 로그인
  // 세션과 OAuth state에 이미 묶여 있으므로 null이다.
  codeChallenge: {
    type: String,
    default: null,
    select: false,
  },
  // Google sub 원문은 또 하나의 로그인 식별자다. proof 문서에는 단방향
  // 해시만 저장하고, 소비할 때 현재 계정에 연결된 sub의 해시까지 원자
  // 쿼리에 포함한다. 연결 계정이 바뀌면 아직 유효한 proof도 사용할 수 없다.
  providerSubjectHash: {
    type: String,
    required: true,
    select: false,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 },
  },
  consumedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  versionKey: false,
});

accountReauthenticationSchema.index({
  userId: 1,
  purpose: 1,
  kind: 1,
  createdAt: -1,
});

module.exports = mongoose.models.AccountReauthentication ||
  mongoose.model("AccountReauthentication", accountReauthenticationSchema);
