"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  consumeAppCommerceHandoff,
  getAppStorefront,
  issueAppCommerceHandoff,
  productDestination,
} = require("../services/appCommerceService");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const enabled = {
  PAYMENT_CHECKOUT_ENABLED: "true",
  TOSS_CLIENT_KEY: "test_ck",
  TOSS_SECRET_KEY: "test_sk",
  PUBLIC_BASE_URL: "https://www.matths.kr",
};

async function main() {

assert.equal(productDestination(null, "pricing"), "/pricing");
assert.equal(
  productDestination("LEARNING_PACKAGE_29", "self"),
  "/pricing/learning-package/self",
);
assert.equal(
  productDestination("MOCK_EXAM_ONLY", "parent-request"),
  "/pricing/mock-exam-only/parent-request",
);
assert.throws(
  () => productDestination("../../admin", "self"),
  /열 수 없는 이용권 결제 경로/,
);

const storefront = await getAppStorefront("student-1", {
  environment: enabled,
  catalogLoader: async () => [
    {
      code: "MOCK_EXAM_ONLY",
      name: "모의고사 이용권",
      amount: 5000,
      periodLabel: "30일",
      description: "모의고사",
    },
    {
      code: "LEARNING_PACKAGE_29",
      name: "학습권",
      amount: 29000,
      periodLabel: "29일",
      description: "전체 학습",
    },
  ],
  accessLoader: async () => ({
    packageType: "LEARNING_PACKAGE",
    learningPackage: { active: true, cycle: { division: "MAIN" } },
    mockExamOnlyPackage: { active: false },
    arenaAllowed: true,
  }),
});
assert.equal(storefront.checkoutEnabled, true);
assert.equal(storefront.products.length, 2);
assert.equal(storefront.products[1].current, true);
assert.equal(storefront.access.arenaAllowed, true);
assert.equal(storefront.access.rankedShopAvailable, true);
assert.ok(storefront.products[1].features.includes("GOAT Arena 공식 경기"));

let stored = null;
const fakeModel = {
  async create(value) {
    stored = { _id: "handoff-1", ...value, consumedAt: null };
    return stored;
  },
  findOneAndUpdate(query, update) {
    return {
      lean: async () => {
        if (!stored || stored.consumedAt) return null;
        if (query.tokenHash !== stored.tokenHash) return null;
        if (!(stored.expiresAt > query.expiresAt.$gt)) return null;
        stored = { ...stored, ...update.$set };
        return stored;
      },
    };
  },
};
const issued = await issueAppCommerceHandoff({
  userId: "student-1",
  productCode: "LEARNING_PACKAGE_29",
  mode: "self",
  model: fakeModel,
  environment: enabled,
  now: new Date("2026-08-15T05:00:00.000Z"),
});
const rawToken = new URL(issued.url).pathname.split("/").at(-1);
assert.match(issued.url, /^https:\/\/www\.matths\.kr\/app\/commerce\/[A-Za-z0-9_-]{43}$/);
assert.notEqual(stored.tokenHash, rawToken, "원문 handoff token을 DB에 저장하면 안 됩니다.");
assert.equal(stored.destination, "/pricing/learning-package/self");
const consumed = await consumeAppCommerceHandoff(rawToken, {
  model: fakeModel,
  now: new Date("2026-08-15T05:00:30.000Z"),
});
assert.equal(consumed.userId, "student-1");
assert.equal(
  await consumeAppCommerceHandoff(rawToken, {
    model: fakeModel,
    now: new Date("2026-08-15T05:00:31.000Z"),
  }),
  null,
  "handoff는 한 번만 소비돼야 합니다.",
);

const closedPricing = await issueAppCommerceHandoff({
  userId: "student-1",
  mode: "pricing",
  model: { create: async () => ({}) },
  environment: { PUBLIC_BASE_URL: "https://www.matths.kr" },
});
assert.match(closedPricing.url, /\/app\/commerce\//);
await assert.rejects(
  issueAppCommerceHandoff({
    userId: "student-1",
    productCode: "MOCK_EXAM_ONLY",
    mode: "self",
    model: { create: async () => ({}) },
    environment: { PUBLIC_BASE_URL: "https://www.matths.kr" },
  }),
  /결제는 현재 준비 중/,
);

const apiRoutes = read("routes/api-routes.js");
const webRoutes = read("routes/matths-routes.js");
const releaseIdentity = require("../services/releaseIdentityService");
assert.match(apiRoutes, /router\.use\(requireApiAuth\)[\s\S]*?"\/commerce\/storefront"/);
assert.match(apiRoutes, /"\/commerce\/handoffs"/);
assert.match(webRoutes, /'\/app\/commerce\/:token'/);
assert.match(read("controllers/appCommerceController.js"), /req\.session\.regenerate/);
assert.match(read("models/appCommerceHandoffModel.js"), /expireAfterSeconds:\s*0/);
for (const boundaryFile of [
  "controllers/appCommerceController.js",
  "models/appCommerceHandoffModel.js",
  "services/appCommerceService.js",
]) {
  assert.ok(
    releaseIdentity.identityFiles.includes(boundaryFile),
    `release fingerprint must cover commerce boundary ${boundaryFile}`,
  );
}

console.log("iPad commerce catalog and one-use browser handoff contracts passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
