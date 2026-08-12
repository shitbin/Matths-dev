"use strict";

const crypto = require("node:crypto");
const mongoose = require("mongoose");
const { CheckoutIntent } = require("../models/parentModel");
const {
  MockExamPackagePolicyVersion,
  MockExamSubscription,
} = require("../models/goatArenaModel");
const { applyApprovedPackagePayment } = require("./accessCycleService");
const { receivePaymentWebhook } = require("./paymentWebhookInboxService");
const { getProduct, isCheckoutEnabled } = require("./checkoutService");

const PROVIDER = "tosspayments";
const API_BASE_URL = "https://api.tosspayments.com";

class TossPaymentsError extends Error {
  constructor(code, message, { status = 400, retryable = false, cause } = {}) {
    super(message, { cause });
    this.name = "TossPaymentsError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function text(value) {
  return String(value || "").trim();
}

function providerConfig(environment = process.env) {
  const clientKey = text(environment.TOSS_CLIENT_KEY);
  const secretKey = text(environment.TOSS_SECRET_KEY);
  const publicBaseUrl = text(environment.PUBLIC_BASE_URL).replace(/\/$/, "");
  if (
    !isCheckoutEnabled(environment) ||
    !clientKey ||
    !secretKey ||
    !/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(publicBaseUrl)
  ) {
    throw new TossPaymentsError(
      "PAYMENT_PROVIDER_NOT_CONFIGURED",
      "결제 기능을 준비하고 있습니다. 무료 학습은 계속 이용할 수 있습니다.",
      { status: 503 }
    );
  }
  return { clientKey, secretKey, publicBaseUrl };
}

function checkoutClientConfig(intent, { environment = process.env } = {}) {
  const { clientKey, publicBaseUrl } = providerConfig(environment);
  if (!intent || intent.status !== "AWAITING_PG") {
    throw new TossPaymentsError(
      "CHECKOUT_INTENT_NOT_PAYABLE",
      "이미 처리됐거나 사용할 수 없는 결제 요청입니다.",
      { status: 409 }
    );
  }
  if (new Date(intent.expiresAt) <= new Date()) {
    throw new TossPaymentsError(
      "CHECKOUT_INTENT_EXPIRED",
      "결제 요청 시간이 만료됐습니다. 상품 화면에서 다시 시작해주세요.",
      { status: 410 }
    );
  }
  return {
    clientKey,
    customerKey: `student-${String(intent.studentUserId)}`,
    orderId: intent.providerOrderId,
    orderName: intent.productName,
    amount: Number(intent.amount),
    currency: "KRW",
    successUrl: `${publicBaseUrl}/payments/toss/success`,
    failUrl: `${publicBaseUrl}/payments/toss/fail`,
  };
}

function authorization(secretKey) {
  // Toss Basic 인증은 secret key 뒤의 콜론까지 Base64 인코딩해야 한다.
  return `Basic ${Buffer.from(`${secretKey}:`, "utf8").toString("base64")}`;
}

async function requestToss(path, {
  method = "GET",
  body,
  idempotencyKey,
  environment = process.env,
  fetchImpl = global.fetch,
} = {}) {
  const { secretKey } = providerConfig(environment);
  if (typeof fetchImpl !== "function") {
    throw new TossPaymentsError(
      "PAYMENT_NETWORK_UNAVAILABLE",
      "결제사 연결을 시작할 수 없습니다.",
      { status: 503, retryable: true }
    );
  }
  let response;
  try {
    response = await fetchImpl(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: authorization(secretKey),
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    throw new TossPaymentsError(
      "PAYMENT_PROVIDER_UNREACHABLE",
      "결제사 응답을 확인하지 못했습니다. 같은 결제 요청으로 다시 확인해주세요.",
      { status: 503, retryable: true, cause: error }
    );
  }
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok) {
    throw new TossPaymentsError(
      text(payload.code) || "PAYMENT_PROVIDER_REJECTED",
      text(payload.message) || "결제 승인을 완료하지 못했습니다.",
      { status: response.status >= 500 ? 503 : 409, retryable: response.status >= 500 }
    );
  }
  return payload;
}

function assertConfirmedPayment(payment, intent) {
  if (
    text(payment.orderId) !== text(intent.providerOrderId) ||
    Number(payment.totalAmount) !== Number(intent.amount) ||
    text(payment.currency).toUpperCase() !== "KRW" ||
    text(payment.status).toUpperCase() !== "DONE" ||
    !text(payment.paymentKey)
  ) {
    throw new TossPaymentsError(
      "PAYMENT_CONFIRMATION_MISMATCH",
      "결제사 승인 정보와 주문 정보가 일치하지 않습니다.",
      { status: 409 }
    );
  }
  const approvedAt = new Date(payment.approvedAt);
  if (!Number.isFinite(approvedAt.getTime())) {
    throw new TossPaymentsError(
      "PAYMENT_APPROVED_AT_INVALID",
      "결제 승인 시각을 확인할 수 없습니다.",
      { status: 409 }
    );
  }
  return approvedAt;
}

async function loadPayableIntent(orderId, { IntentModel = CheckoutIntent } = {}) {
  const intent = await IntentModel.findOne({
    provider: PROVIDER,
    providerOrderId: text(orderId),
  }).select("+providerPaymentKey");
  if (!intent) {
    throw new TossPaymentsError("CHECKOUT_INTENT_NOT_FOUND", "결제 요청을 찾을 수 없습니다.", {
      status: 404,
    });
  }
  return intent;
}

async function assertCurrentIntentPolicy(
  intent,
  { getProductImpl = getProduct } = {}
) {
  const product = await getProductImpl(intent.productCode);
  if (
    String(product?.policyVersionId || "") !== String(intent.policyVersionId || "") ||
    Number(product?.amount) !== Number(intent.amount)
  ) {
    throw new TossPaymentsError(
      "CHECKOUT_POLICY_CHANGED",
      "결제 금액 정책이 변경됐습니다. 상품 화면에서 금액을 다시 확인해주세요.",
      { status: 409 }
    );
  }
}

async function confirmPayment({ paymentKey, orderId, amount }, options = {}) {
  const intent = await loadPayableIntent(orderId, options);
  if (intent.status === "PAID") {
    return { intent, duplicate: true, payment: null };
  }
  if (intent.status !== "AWAITING_PG" || new Date(intent.expiresAt) <= new Date()) {
    throw new TossPaymentsError(
      "CHECKOUT_INTENT_NOT_PAYABLE",
      "결제 요청 시간이 끝났습니다. 상품 화면에서 다시 시작해주세요.",
      { status: 410 }
    );
  }
  if (Number(amount) !== Number(intent.amount)) {
    throw new TossPaymentsError(
      "PAYMENT_AMOUNT_MISMATCH",
      "결제 금액이 주문 금액과 일치하지 않습니다.",
      { status: 409 }
    );
  }
  await assertCurrentIntentPolicy(intent, options);
  const payment = await requestToss(
    "/v1/payments/confirm",
    {
      ...options,
      method: "POST",
      idempotencyKey: `confirm-${intent.providerOrderId}`,
      body: {
        paymentKey: text(paymentKey),
        orderId: intent.providerOrderId,
        amount: Number(intent.amount),
      },
    }
  );
  assertConfirmedPayment(payment, intent);
  return { intent, duplicate: false, payment };
}

async function lookupPayment(orderId, options = {}) {
  return requestToss(
    `/v1/payments/orders/${encodeURIComponent(text(orderId))}`,
    options
  );
}

function paymentInstrumentFingerprint(payment) {
  const card = payment?.card;
  if (!card) return "";
  return [card.issuerCode, card.acquirerCode, card.number, card.cardType]
    .map(text)
    .filter(Boolean)
    .join(":")
    .slice(0, 500);
}

async function applyMockExamPayment(intent, payment, { now = new Date() } = {}) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const fresh = await CheckoutIntent.findById(intent._id)
        .select("+providerPaymentKey")
        .session(session);
      if (fresh?.status === "PAID") {
        result = { duplicate: true, intent: fresh };
        return;
      }
      if (!fresh || fresh.status !== "AWAITING_PG") {
        throw new TossPaymentsError(
          "CHECKOUT_INTENT_NOT_PAYABLE",
          "이미 처리됐거나 사용할 수 없는 결제 요청입니다.",
          { status: 409 }
        );
      }
      const policy = await MockExamPackagePolicyVersion.findById(
        fresh.policyVersionId
      ).session(session).lean();
      if (
        !policy ||
        Number(policy.monthlyPriceAmount) !== Number(fresh.amount) ||
        Number(payment.totalAmount) !== Number(fresh.amount)
      ) {
        throw new TossPaymentsError(
          "PAYMENT_POLICY_MISMATCH",
          "모의고사 이용권 정책과 승인 금액이 일치하지 않습니다.",
          { status: 409 }
        );
      }
      const approvedAt = assertConfirmedPayment(payment, fresh);
      const active = await MockExamSubscription.findOne({
        userId: fresh.studentUserId,
        status: "ACTIVE",
      }).session(session);
      const periodMs = Number(policy.billingPeriodDays || 30) * 86400000;
      if (active) {
        const base = new Date(active.endsAt) > approvedAt
          ? new Date(active.endsAt)
          : approvedAt;
        active.endsAt = new Date(base.getTime() + periodMs);
        await active.save({ session });
        result = { duplicate: false, subscription: active };
      } else {
        const [subscription] = await MockExamSubscription.create([{
          userId: fresh.studentUserId,
          policyVersionId: policy._id,
          policySnapshot: {
            code: policy.code,
            monthlyPriceAmount: Number(policy.monthlyPriceAmount),
            currency: policy.currency || "KRW",
            billingPeriodDays: Number(policy.billingPeriodDays || 30),
            placementCalibrationMinimumWeeklyExams: Number(
              policy.placementCalibrationMinimumWeeklyExams || 4
            ),
          },
          status: "ACTIVE",
          purchaseMode: fresh.requestedBy === "PARENT" ? "PARENT_REQUEST" : "SELF",
          startsAt: approvedAt,
          endsAt: new Date(approvedAt.getTime() + periodMs),
          activatedAt: approvedAt,
        }], { session });
        result = { duplicate: false, subscription };
      }
      fresh.status = "PAID";
      fresh.providerPaymentKey = payment.paymentKey;
      fresh.providerTransactionId = payment.paymentKey;
      fresh.paidAt = approvedAt;
      await fresh.save({ session });
      result.intent = fresh;
    });
    return result;
  } finally {
    await session.endSession();
  }
}

async function recordVerifiedPayment(intent, payment, { rawPayload, webhookEventId } = {}) {
  const approvedAt = assertConfirmedPayment(payment, intent);
  const bytes = Buffer.isBuffer(rawPayload)
    ? rawPayload
    : Buffer.from(JSON.stringify(payment), "utf8");
  const eventId = text(webhookEventId) || `confirm-${payment.paymentKey}`;
  const receipt = await receivePaymentWebhook({
    provider: PROVIDER,
    webhookEventId: eventId,
    eventType: "PAYMENT_STATUS_CHANGED",
    rawPayload: bytes,
    receivedAt: new Date(),
    // Toss 카드 웹훅에는 일반 서명 헤더가 없다. 서버 API 재조회 결과가
    // 아래의 주문·금액·상태 검증을 모두 통과한 경우만 VERIFIED로 기록한다.
    verifySignature: async () => ({
      status: "VERIFIED",
      checkedAt: new Date(),
      reasonCode: "PROVIDER_API_RECONFIRMED",
    }),
  });
  if (intent.productCode === "LEARNING_PACKAGE_29") {
    const applied = await applyApprovedPackagePayment({
      userId: String(intent.studentUserId),
      provider: "TOSSPAYMENTS",
      providerPaymentKey: payment.paymentKey,
      orderReference: intent.providerOrderId,
      idempotencyKey: eventId,
      currency: "KRW",
      approvedAmount: Number(payment.totalAmount),
      approvedAt,
      paymentInstrumentFingerprint: paymentInstrumentFingerprint(payment),
    });
    await CheckoutIntent.updateOne(
      { _id: intent._id, status: { $ne: "PAID" } },
      {
        $set: {
          status: "PAID",
          providerPaymentKey: payment.paymentKey,
          providerTransactionId: payment.paymentKey,
          paidAt: approvedAt,
        },
      }
    );
    return { receipt, applied };
  }
  return { receipt, applied: await applyMockExamPayment(intent, payment) };
}

async function processWebhook(rawPayload, transmissionId, options = {}) {
  if (!Buffer.isBuffer(rawPayload)) {
    throw new TossPaymentsError("RAW_WEBHOOK_BODY_REQUIRED", "웹훅 원문이 필요합니다.", {
      status: 500,
    });
  }
  let event;
  try {
    event = JSON.parse(rawPayload.toString("utf8"));
  } catch {
    throw new TossPaymentsError("INVALID_WEBHOOK_JSON", "웹훅 본문을 읽을 수 없습니다.", {
      status: 400,
    });
  }
  const orderId = text(event?.data?.orderId);
  if (!orderId) {
    return { ignored: true, reason: "ORDER_ID_MISSING" };
  }
  const intent = await loadPayableIntent(orderId, options);
  const payment = await lookupPayment(orderId, options);
  if (text(payment.status).toUpperCase() !== "DONE") {
    return { ignored: true, reason: "PAYMENT_NOT_CAPTURED" };
  }
  assertConfirmedPayment(payment, intent);
  const eventId = text(transmissionId) || crypto
    .createHash("sha256")
    .update(rawPayload)
    .digest("hex");
  return recordVerifiedPayment(intent, payment, {
    rawPayload,
    webhookEventId: eventId,
  });
}

module.exports = {
  TossPaymentsError,
  authorization,
  assertConfirmedPayment,
  checkoutClientConfig,
  confirmPayment,
  lookupPayment,
  processWebhook,
  providerConfig,
  recordVerifiedPayment,
  requestToss,
};
