#!/usr/bin/env node
/**
 * preflight — 서버를 띄우기 전에 **환경이 제대로 서 있는지** 먼저 본다.
 *
 * 왜 필요한가: 지금까지는 값이 비어 있어도 그냥 뜬 다음, 첫 요청에서 이상하게
 * 실패했다(세션이 안 붙거나, 토큰이 빈 문자열로 서명되거나, 메일이 안 나가거나).
 * 배포는 그 진단을 원격에서 해야 해서 몇 배로 비싸진다. 그러니 **뜨기 전에**
 * 한 번에 다 말해 준다 — 무엇이 없고, 무엇이 위험하고, 무엇을 하면 되는지.
 *
 *   node scripts/preflight.js          # 로컬(config.env 읽음)
 *   npm run preflight                  # 같은 것
 *   NODE_ENV=production node scripts/preflight.js   # 배포 환경 기준으로 검사
 *
 * 종료 코드 0 = 띄워도 된다, 1 = 고치고 다시.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const envFile = path.join(ROOT, "config.env");
if (
  process.env.MATTHS_PREFLIGHT_SKIP_ENV_FILE !== "1" &&
  fs.existsSync(envFile)
) {
  require("dotenv").config({ path: envFile });
}

const isProd = process.env.NODE_ENV === "production";
const problems = [];
const warnings = [];

/** 반드시 있어야 하는 것 — 없으면 서버가 조용히 잘못 동작한다. */
const REQUIRED = [
  ["DB", "MongoDB 접속 문자열. Atlas 콘솔 → Connect → Drivers"],
  ["SECRET", "웹 세션 서명 키. 길고 무작위인 값"],
  ["API_TOKEN_SECRET", "앱 API 토큰 서명 키. SECRET 과 **다른** 값이어야 한다"],
];

/** 있으면 좋은 것 — 없으면 해당 기능만 죽는다. */
const OPTIONAL = [
  ["ADMIN_EMAIL", "운영자 계정"],
  ["PASSWORD_RESET_SECRET", "재설정 코드 서명(없으면 SECRET 사용)"],
];
const ARENA_SECRETS = [
  [
    "ARENA_QUESTION_PACK_SEED_SECRET",
    "봉인 문제팩의 서버 전용 결정적 선택 키",
  ],
  [
    "ARENA_DEFENDER_ASSIGNMENT_SEED_SECRET",
    "Sub 방어자 배정 감사 난수 키",
  ],
];

for (const [key, why] of REQUIRED) {
  const v = process.env[key];
  if (!v || !String(v).trim()) problems.push(`${key} 가 비어 있다 — ${why}`);
}
for (const [key, why] of OPTIONAL) {
  const v = process.env[key];
  if (!v || !String(v).trim()) warnings.push(`${key} 없음 — ${why}`);
}
for (const [key, why] of ARENA_SECRETS) {
  const value =
    process.env[key];
  if (
    !value ||
    Buffer.byteLength(
      String(value),
      "utf8"
    ) < 32
  ) {
    (
      isProd
        ? problems
        : warnings
    ).push(
      `${key} 없음 또는 32바이트 미만 — ${why}`
    );
  }
}

// ── 키가 실제로 안전한가 ────────────────────────────────────────────────
const weak = (v) => !v || v.length < 24 || /^(change|test|secret|password|1234)/i.test(v);
if (process.env.SECRET && weak(process.env.SECRET)) {
  problems.push("SECRET 이 너무 짧거나 예시값이다 (24자 이상 무작위로)");
}
if (process.env.API_TOKEN_SECRET && weak(process.env.API_TOKEN_SECRET)) {
  problems.push("API_TOKEN_SECRET 이 너무 짧거나 예시값이다 (24자 이상 무작위로)");
}
if (
  process.env.SECRET &&
  process.env.SECRET === process.env.API_TOKEN_SECRET
) {
  // 하나가 새면 둘 다 새는 구조가 된다 — 세션과 앱 토큰은 신뢰 경계가 다르다.
  problems.push("SECRET 과 API_TOKEN_SECRET 이 같다 — 서로 다른 값이어야 한다");
}

// ── 배포에서만 따지는 것 ────────────────────────────────────────────────
if (isProd) {
  const canonicalPublicBaseURL =
    "https://www.matths.kr";
  if (fs.existsSync(envFile)) {
    // 운영 서버에 비밀이 **파일로** 올라가 있으면 안 된다.
    // 값은 호스팅 대시보드의 환경변수로만 들어가야 한다.
    warnings.push(
      "운영인데 config.env 파일이 함께 배포돼 있다 — 비밀은 호스팅 환경변수로만 넣어라"
    );
  }
  const publicBaseURL =
    String(
      process.env.PUBLIC_BASE_URL ||
        ""
    ).trim();
  try {
    const parsed =
      new URL(publicBaseURL);
    if (
      parsed.protocol !==
        "https:" ||
      parsed.origin !==
        canonicalPublicBaseURL ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      publicBaseURL !==
        canonicalPublicBaseURL
    ) {
      throw new Error(
        "not the canonical production URL"
      );
    }
  } catch {
    problems.push(
      `PUBLIC_BASE_URL 은 ${canonicalPublicBaseURL} 이어야 한다 (${publicBaseURL || "비어 있음"})`
    );
  }
  if (String(process.env.APP_BASE_URL || "").trim()) {
    problems.push(
      "APP_BASE_URL 은 폐기됐다 — 운영 공개 주소는 PUBLIC_BASE_URL 하나만 사용한다"
    );
  }
  const expectedGoogleRedirect = publicBaseURL
    ? `${publicBaseURL.replace(/\/$/, "")}/auth/google/callback`
    : "";
  const googleValues = [
    ["GOOGLE_OAUTH_CLIENT_ID", "Google OAuth 웹 클라이언트 ID"],
    ["GOOGLE_OAUTH_CLIENT_SECRET", "Google OAuth 서버 비밀키"],
    ["GOOGLE_OAUTH_REDIRECT_URI", "Google OAuth 콜백 주소"],
  ];
  for (const [key, why] of googleValues) {
    if (!String(process.env[key] || "").trim()) {
      problems.push(`${key} 가 비어 있다 — ${why}`);
    }
  }
  if (
    process.env.GOOGLE_OAUTH_REDIRECT_URI &&
    process.env.GOOGLE_OAUTH_REDIRECT_URI !== expectedGoogleRedirect
  ) {
    problems.push(
      `GOOGLE_OAUTH_REDIRECT_URI 는 ${expectedGoogleRedirect || "PUBLIC_BASE_URL 기반 콜백"} 이어야 한다`
    );
  }

  if (!String(process.env.GMAIL_USER || "").trim()) {
    problems.push("GMAIL_USER 가 비어 있다 — 가입·비밀번호 재설정 메일을 보낼 수 없다");
  }
  const gmailPassword = String(process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
  if (gmailPassword.length !== 16) {
    problems.push("GMAIL_APP_PASSWORD 는 공백을 제외한 Gmail 앱 비밀번호 16자리여야 한다");
  }

  const paymentEnabled = /^(1|true|yes|on)$/i.test(
    String(process.env.PAYMENT_CHECKOUT_ENABLED || "")
  );
  if (paymentEnabled) {
    if (!String(process.env.TOSS_CLIENT_KEY || "").trim()) {
      problems.push("결제가 열렸지만 TOSS_CLIENT_KEY 가 비어 있다");
    }
    if (!String(process.env.TOSS_SECRET_KEY || "").trim()) {
      problems.push("결제가 열렸지만 TOSS_SECRET_KEY 가 비어 있다");
    }
  } else {
    warnings.push("PAYMENT_CHECKOUT_ENABLED 가 꺼져 있다 — 결제 화면은 준비 중 상태로 유지된다");
  }
  if (!/^mongodb(\+srv)?:\/\//.test(String(process.env.DB || ""))) {
    problems.push("DB 가 mongodb:// 또는 mongodb+srv:// 로 시작하지 않는다");
  }
} else {
  if (process.env.NODE_ENV !== "production") {
    warnings.push(
      "NODE_ENV 가 production 이 아니다 — 배포 서버에서는 반드시 production 으로 두어라 " +
        "(쿠키 secure, 메일 실발송, 에러 상세 숨김이 여기에 걸려 있다)"
    );
  }
}

// ── 결과 ────────────────────────────────────────────────────────────────
const say = (s) => process.stdout.write(s + "\n");
say(`\n환경 점검 (NODE_ENV=${process.env.NODE_ENV || "미설정"})`);
say(
  process.env.MATTHS_PREFLIGHT_SKIP_ENV_FILE !== "1" && fs.existsSync(envFile)
    ? "  config.env 를 읽었다"
    : "  config.env 미사용 — 실제 환경변수로 검사한다"
);

if (warnings.length) {
  say("\n[경고]");
  warnings.forEach((w) => say("  · " + w));
}
if (problems.length) {
  say("\n[막힘 — 고쳐야 뜬다]");
  problems.forEach((p) => say("  ✗ " + p));
  say("");
  process.exit(1);
}
say("\n통과 — 띄워도 된다.\n");
