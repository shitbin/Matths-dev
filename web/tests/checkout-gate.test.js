"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  CHECKOUT_FEATURE_FLAG,
  createCheckoutIntent,
  isCheckoutEnabled,
} = require("../services/checkoutService");

const repoRoot = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(
    path.join(repoRoot, relativePath),
    "utf8"
  );

assert.equal(
  CHECKOUT_FEATURE_FLAG,
  "PAYMENT_CHECKOUT_ENABLED"
);
assert.equal(isCheckoutEnabled({}), false);
assert.equal(
  isCheckoutEnabled({
    PAYMENT_CHECKOUT_ENABLED: "true",
    TOSS_CLIENT_KEY: "test_ck_sample",
    TOSS_SECRET_KEY: "test_sk_sample",
    PUBLIC_BASE_URL: "https://www.matths.kr",
  }),
  true
);
assert.equal(
  isCheckoutEnabled({
    PAYMENT_CHECKOUT_ENABLED: "1",
    TOSS_CLIENT_KEY: "test_ck_sample",
    TOSS_SECRET_KEY: "test_sk_sample",
    PUBLIC_BASE_URL: "https://www.matths.kr",
  }),
  true
);
assert.equal(
  isCheckoutEnabled({ PAYMENT_CHECKOUT_ENABLED: "true" }),
  false,
  "결제사 키와 운영 HTTPS 주소가 없으면 기능 플래그만으로 결제가 열리면 안 됩니다."
);
assert.equal(
  isCheckoutEnabled({
    PAYMENT_CHECKOUT_ENABLED: "yes",
  }),
  false
);

const previousFlag =
  process.env.PAYMENT_CHECKOUT_ENABLED;
delete process.env.PAYMENT_CHECKOUT_ENABLED;

async function main() {
  await assert.rejects(
    createCheckoutIntent({
      studentUserId: "not-read",
      requestedBy: "STUDENT",
      productCode: "LEARNING_PACKAGE_29",
    }),
    (error) =>
      error?.status === 503 &&
      error?.code ===
        "CHECKOUT_NOT_AVAILABLE",
    "기능 플래그가 닫힌 상태에서는 DB 조회·주문 준비 데이터 생성을 시작하면 안 됩니다."
  );

  const publicPaymentViews = [
    "views/checkout.ejs",
    "views/parent-checkout.ejs",
    "views/parent-payment-request.ejs",
    "views/parent-pricing.ejs",
    "views/pricing.ejs",
  ];
  for (const relativePath of publicPaymentViews) {
    const source = read(relativePath);
    assert.match(
      source,
      /checkoutEnabled|paymentsOpen/,
      `${relativePath}는 결제 기능 플래그를 소비해야 합니다.`
    );
    assert.doesNotMatch(
      source,
      /\bPG\b|intent\._id|주문번호|결제 승인 로직|주문 준비 라우트/,
      `${relativePath}에 개발자 언어 또는 내부 주문 식별자가 노출되면 안 됩니다.`
    );
  }

  const pricingView = read("views/pricing.ejs");
  assert.match(
    pricingView,
    /if \(!paymentsOpen\)[\s\S]*?pricing-payment-status[\s\S]*?유료 이용권 결제를 준비하고 있습니다/,
    "결제가 열린 뒤에도 준비 중·과금 없음 안내가 상시 노출되면 안 됩니다."
  );

  const checkoutService =
    read("services/checkoutService.js");
  assert.match(
    checkoutService,
    /async function createCheckoutIntent[\s\S]*?assertCheckoutEnabled\(\);[\s\S]*?User\.findById/,
    "CheckoutIntent 쓰기 전에 서비스 경계에서 기능 플래그를 검사해야 합니다."
  );
  assert.match(
    checkoutService,
    /async function createParentInvite[\s\S]*?assertCheckoutEnabled\(\);[\s\S]*?const email/,
    "결제 요청 이메일·초대 데이터 쓰기 전에 기능 플래그를 검사해야 합니다."
  );

  console.log(
    "closed checkout gate blocks writes and exposes only user-facing copy"
  );
}

main()
  .finally(() => {
    if (previousFlag === undefined) {
      delete process.env
        .PAYMENT_CHECKOUT_ENABLED;
    } else {
      process.env
        .PAYMENT_CHECKOUT_ENABLED =
        previousFlag;
    }
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
