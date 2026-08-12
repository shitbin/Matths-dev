#!/usr/bin/env node

"use strict";

const path = require("node:path");
const express = require("express");
const { buildErrorViewModel } = require("../middleware/errorMiddleware");
const { errorFaqHref } = require("../services/errorHelpService");

if (process.env.NODE_ENV === "production") {
  throw new Error("v8 evidence fixture server는 production에서 실행할 수 없습니다.");
}

const host = "127.0.0.1";
const requestedPort = Number(process.env.MATTHS_V8_EVIDENCE_PORT || 0);
if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) {
  throw new Error("MATTHS_V8_EVIDENCE_PORT는 0~65535 정수여야 합니다.");
}

const app = express();
const root = path.resolve(__dirname, "..");
const fixtureSchema = "MATTHS_WEB_V8_EVIDENCE_FIXTURES_V1";
const errorStatuses = Object.freeze([
  400, 401, 403, 404, 409, 410, 413, 422, 423, 429, 500, 501,
]);

const fixtureIds = Object.freeze([
  "payment-checkout",
  "payment-minor-consent",
  "payment-parent-request",
  "payment-parent-checkout",
  "payment-result",
  ...errorStatuses.map((status) => `error-${status}`),
  "goat-arena-error",
]);

const student = Object.freeze({
  id: "evidence-student",
  name: "증거 검수 학생",
});
const parent = Object.freeze({
  id: "evidence-parent",
  name: "증거 검수 학부모",
});
const child = Object.freeze({
  _id: "evidence-child",
  name: "매쓰",
  realName: "김매쓰",
});
const familyChildren = Object.freeze([{
  childId: child._id,
  child,
}]);
const product = Object.freeze({
  code: "LEARNING_PACKAGE_29",
  name: "29일 학습권 패키지",
  amount: 29_000,
  periodLabel: "29일",
  description: "모의고사·배치고사·GOAT Arena까지 포함한 학습권",
});

app.set("view engine", "ejs");
app.set("views", path.join(root, "views"));
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.set({
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
    "X-Matths-Evidence-Fixture": fixtureSchema,
  });
  next();
});
app.use(express.static(path.join(root, "public"), {
  index: false,
  dotfiles: "deny",
  maxAge: 0,
}));

app.get("/__evidence__/health", (_req, res) => {
  res.json({
    schema: fixtureSchema,
    fixtureCount: fixtureIds.length,
    fixtureIds,
  });
});

app.get("/__evidence__/payment/checkout", (_req, res) => {
  res.render("checkout", {
    user: student,
    product,
    intent: null,
    paymentConfig: null,
    checkoutEnabled: false,
  });
});

app.get("/__evidence__/payment/minor-consent", (_req, res) => {
  res.render("minor-payment-consent", {
    user: student,
    product,
    productRoute: "learning-package",
    error: "",
  });
});

app.get("/__evidence__/payment/parent-request", (_req, res) => {
  res.render("parent-payment-request", {
    user: student,
    product,
    feedback: null,
    previewUrl: "",
    oldInput: { parentEmail: "" },
    checkoutEnabled: false,
  });
});

app.get("/__evidence__/payment/parent-checkout", (_req, res) => {
  res.render("parent-checkout", {
    parent,
    child,
    familyChildren,
    selectedChildId: child._id,
    product,
    intent: null,
    paymentConfig: null,
    checkoutEnabled: false,
  });
});

app.get("/__evidence__/payment/result", (_req, res) => {
  res.render("payment-result", {
    success: true,
    heading: "결제가 완료됐습니다.",
    message: "이용권 반영이 끝났습니다. 학습 화면에서 바로 확인할 수 있습니다.",
  });
});

app.get("/__evidence__/error/:status", (req, res, next) => {
  const status = Number(req.params.status);
  if (!errorStatuses.includes(status)) return next();
  return res.render("error", buildErrorViewModel({
    req,
    status,
  }));
});

app.get("/__evidence__/goat-arena-error", (_req, res) => {
  res.render("goat-arena-error", {
    activeArenaPage: "shop",
    arenaUser: {
      nickname: "검수학생",
      hasStyleEntrance: false,
      hasMainProfileBorder: false,
    },
    arenaNotifications: {
      unreadCount: 0,
      notifications: [],
      actionByDivision: {},
      defenseByDivision: {},
    },
    rankUpPresentation: null,
    errorStatus: 403,
    errorTitle: "Ranked 상점 이용 안내",
    errorMessage: "Ranked 진입 조건을 먼저 확인해주세요.",
    errorCode: "MAIN_SHOP_ACCESS_REQUIRED",
    errorFaqHref: errorFaqHref(403),
    returnHref: "/goat-arena/sub",
    returnLabel: "Unranked 진행 계속하기",
  });
});

app.use((_req, res) => {
  res.status(404).type("text/plain").send("Unknown evidence fixture");
});

const server = app.listen(requestedPort, host, () => {
  const address = server.address();
  const origin = `http://${host}:${address.port}`;
  process.stdout.write(`MATTHS_V8_EVIDENCE_READY ${JSON.stringify({
    schema: fixtureSchema,
    origin,
    fixtureCount: fixtureIds.length,
  })}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
