"use strict";

const assert = require("node:assert/strict");

const quickPracticeService = require("../services/quickPracticeService");
let receivedInput = null;
quickPracticeService.createQuickPracticeAttempt = async (input) => {
  receivedInput = input;
  return {
    instanceId: "quick-api-no-body",
    pointValue: 2,
    prompt: "1+1은?",
    status: "active",
  };
};
delete require.cache[require.resolve("../controllers/apiController")];
const apiController = require("../controllers/apiController");

async function main() {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let forwarded = null;
  await apiController.startQuickPractice(
    { apiUser: { _id: "student-1" }, body: undefined },
    response,
    (error) => { forwarded = error; },
  );
  assert.equal(forwarded, null);
  assert.deepEqual(receivedInput, { userId: "student-1", pointValue: undefined });
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.timeLimitMs, 40_000);
  assert.equal(response.body.attempt.instanceId, "quick-api-no-body");
  console.log("iPad quick-practice start accepts an empty POST body");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
