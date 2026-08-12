"use strict";

const express = require("express");
const controller = require("../controllers/tossPaymentsController");

const router = express.Router();

router.post(
  "/webhooks/toss-payments",
  express.raw({ type: "application/json", limit: "256kb" }),
  controller.webhook
);
router.get("/payments/toss/success", controller.success);
router.get("/payments/toss/fail", controller.failure);

module.exports = router;
