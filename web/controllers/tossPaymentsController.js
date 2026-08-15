"use strict";

const {
  TossPaymentsError,
  confirmPayment,
  processWebhook,
  recordVerifiedPayment,
} = require("../services/tossPaymentsService");

function paymentErrorView(res, error, status = 409, { retryHref = null } = {}) {
  const uncertain =
    !(error instanceof TossPaymentsError) || error.retryable === true || status >= 500;
  res.set("Cache-Control", "no-store");
  return res.status(status).render("payment-result", {
    success: false,
    uncertain,
    heading: uncertain
      ? "결제 상태를 확인하는 중입니다."
      : "결제를 완료하지 못했습니다.",
    message:
      error instanceof TossPaymentsError
        ? error.message
        : "결제 상태를 확인하지 못했습니다. 중복 결제 없이 다시 확인할 수 있습니다.",
    primaryHref: uncertain && retryHref ? retryHref : "/pricing",
    primaryLabel: uncertain && retryHref ? "같은 주문 다시 확인하기" : "이용권 다시 확인하기",
    paymentSummary: null,
  });
}

exports.success = async (req, res) => {
  try {
    const confirmed = await confirmPayment({
      paymentKey: req.query.paymentKey,
      orderId: req.query.orderId,
      amount: req.query.amount,
    });
    if (!confirmed.duplicate) {
      await recordVerifiedPayment(confirmed.intent, confirmed.payment);
    }
    res.set("Cache-Control", "no-store");
    return res.render("payment-result", {
      success: true,
      uncertain: false,
      heading: "결제가 완료됐습니다.",
      message: "이용권 반영이 끝났습니다. 학습 화면에서 바로 확인할 수 있습니다.",
      primaryHref: "/my-learning",
      primaryLabel: "학습 시작하기",
      paymentSummary: {
        orderName: String(confirmed.payment?.orderName || confirmed.intent.productName || "이용권"),
        amount: Number(confirmed.payment?.totalAmount ?? confirmed.intent.amount),
        approvedAt:
          confirmed.payment?.approvedAt || confirmed.intent.updatedAt || null,
        orderId: String(confirmed.intent.providerOrderId || req.query.orderId || ""),
        receiptUrl: /^https:\/\//.test(String(confirmed.payment?.receipt?.url || ""))
          ? String(confirmed.payment.receipt.url)
          : null,
      },
    });
  } catch (error) {
    const params = new URLSearchParams({
      paymentKey: String(req.query.paymentKey || ""),
      orderId: String(req.query.orderId || ""),
      amount: String(req.query.amount || ""),
    });
    return paymentErrorView(res, error, Number(error?.status) || 409, {
      retryHref: `/payments/toss/success?${params.toString()}`,
    });
  }
};

exports.failure = (req, res) => {
  const code = String(req.query.code || "");
  const cancelled = ["PAY_PROCESS_CANCELED", "USER_CANCEL"].includes(code);
  return paymentErrorView(
    res,
    new TossPaymentsError(
      cancelled ? "PAYMENT_CANCELLED" : "PAYMENT_FAILED",
      cancelled
        ? "결제를 취소했습니다. 이용권은 결제되지 않았습니다."
        : "결제가 승인되지 않았습니다. 이용권은 지급되지 않았습니다."
    ),
    cancelled ? 200 : 409
  );
};

exports.webhook = async (req, res) => {
  try {
    const result = await processWebhook(
      req.body,
      req.get("tosspayments-webhook-transmission-id")
    );
    return res.status(200).json({ received: true, ignored: result?.ignored === true });
  } catch (error) {
    // Toss는 200이 아닌 응답을 재전송한다. 일시 오류를 성공으로 삼키지 않는다.
    const status = Number(error?.status) || 503;
    return res.status(status).json({
      received: false,
      code: String(error?.code || "PAYMENT_WEBHOOK_FAILED"),
    });
  }
};
