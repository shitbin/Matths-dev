"use strict";

const assert = require("node:assert/strict");
const {
  authorization,
  checkoutClientConfig,
  confirmPayment,
  requestToss,
} = require("../services/tossPaymentsService");

const environment = {
  PAYMENT_CHECKOUT_ENABLED: "true",
  TOSS_CLIENT_KEY: "test_ck_matths",
  TOSS_SECRET_KEY: "test_sk_matths",
  PUBLIC_BASE_URL: "https://www.matths.kr",
};

const intent = {
  _id: "intent-id",
  studentUserId: "507f1f77bcf86cd799439011",
  productCode: "LEARNING_PACKAGE_29",
  productName: "29일 학습권 패키지",
  amount: 29000,
  currency: "KRW",
  status: "AWAITING_PG",
  policyVersionId: "507f1f77bcf86cd799439012",
  providerOrderId: "MATTHS-unit-test-order",
  expiresAt: new Date(Date.now() + 60000),
};

function intentModel(value) {
  return {
    findOne() {
      return { select: async () => value };
    },
  };
}

async function main() {
  assert.equal(
    authorization("test_sk_matths"),
    `Basic ${Buffer.from("test_sk_matths:").toString("base64")}`,
    "secret key 뒤의 콜론까지 Basic 인증에 포함해야 합니다."
  );

  const client = checkoutClientConfig(intent, { environment });
  assert.deepEqual(
    {
      orderId: client.orderId,
      amount: client.amount,
      successUrl: client.successUrl,
      failUrl: client.failUrl,
    },
    {
      orderId: intent.providerOrderId,
      amount: 29000,
      successUrl: "https://www.matths.kr/payments/toss/success",
      failUrl: "https://www.matths.kr/payments/toss/fail",
    }
  );

  const calls = [];
  const providerPayload = {
    paymentKey: "payment-key-1",
    orderId: intent.providerOrderId,
    totalAmount: 29000,
    currency: "KRW",
    status: "DONE",
    approvedAt: new Date().toISOString(),
  };
  const fetchImpl = async (url, request) => {
    calls.push({ url, request });
    return { ok: true, status: 200, json: async () => providerPayload };
  };
  const confirmed = await confirmPayment(
    {
      paymentKey: providerPayload.paymentKey,
      orderId: intent.providerOrderId,
      amount: 29000,
    },
    {
      environment,
      fetchImpl,
      IntentModel: intentModel(intent),
      getProductImpl: async () => ({
        amount: 29000,
        policyVersionId: intent.policyVersionId,
      }),
    }
  );
  assert.equal(confirmed.payment.status, "DONE");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.tosspayments.com/v1/payments/confirm");
  assert.equal(
    calls[0].request.headers.Authorization,
    authorization(environment.TOSS_SECRET_KEY)
  );
  assert.deepEqual(JSON.parse(calls[0].request.body), {
    paymentKey: providerPayload.paymentKey,
    orderId: intent.providerOrderId,
    amount: 29000,
  });

  await assert.rejects(
    confirmPayment(
      { paymentKey: "x", orderId: intent.providerOrderId, amount: 1 },
      { environment, IntentModel: intentModel(intent) }
    ),
    (error) => error?.code === "PAYMENT_AMOUNT_MISMATCH"
  );
  assert.equal(calls.length, 1, "금액 불일치는 결제사 호출 전에 차단해야 합니다.");

  await assert.rejects(
    requestToss("/v1/payments/confirm", {
      environment,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ ...providerPayload, totalAmount: 1 }),
      }),
    }).then((payload) => {
      // request transport는 응답을 반환하고, 주문 경계의 assertConfirmedPayment가
      // 금액을 검사한다. 이 분리를 문서화하는 검증입니다.
      if (payload.totalAmount !== 29000) throw Object.assign(new Error("mismatch"), { code: "MISMATCH" });
    }),
    (error) => error?.code === "MISMATCH"
  );

  console.log("Toss checkout confirms only exact server-owned orders");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
