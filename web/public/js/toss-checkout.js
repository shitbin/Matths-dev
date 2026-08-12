"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const button = document.querySelector("[data-toss-checkout]");
  const feedback = document.querySelector("[data-payment-feedback]");
  if (!button) return;
  button.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;
    if (feedback) feedback.textContent = "결제 화면을 여는 중입니다.";
    try {
      if (typeof window.TossPayments !== "function") {
        throw new Error("결제 모듈을 불러오지 못했습니다.");
      }
      const tossPayments = window.TossPayments(button.dataset.clientKey);
      const payment = tossPayments.payment({
        customerKey: button.dataset.customerKey,
      });
      await payment.requestPayment({
        method: "CARD",
        amount: {
          currency: "KRW",
          value: Number(button.dataset.amount),
        },
        orderId: button.dataset.orderId,
        orderName: button.dataset.orderName,
        successUrl: button.dataset.successUrl,
        failUrl: button.dataset.failUrl,
      });
    } catch (error) {
      button.disabled = false;
      if (feedback) {
        feedback.textContent =
          error?.code === "USER_CANCEL"
            ? "결제를 취소했습니다."
            : "결제 화면을 열지 못했습니다. 잠시 후 다시 시도해주세요.";
      }
    }
  });
});
