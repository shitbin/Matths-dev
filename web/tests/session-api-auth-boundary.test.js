"use strict";

const assert = require("node:assert/strict");
const auth = require("../middleware/authMiddleware");

function response() {
  return {
    statusCode: 200,
    body: null,
    redirectUrl: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    redirect(url) {
      this.statusCode = 302;
      this.redirectUrl = url;
      return this;
    },
  };
}

async function main() {
  let res = response();
  const pageSession = {};
  await auth.isLoggedIn(
    {
      method: "GET",
      originalUrl: "/main?from=resume",
      session: pageSession,
    },
    res,
    () => {
      throw new Error("anonymous page request must not continue");
    },
  );
  assert.equal(res.statusCode, 302);
  assert.equal(res.redirectUrl, "/login");
  assert.equal(pageSession.returnTo, "/main?from=resume");

  res = response();
  const apiSession = {};
  await auth.isLoggedIn(
    {
      method: "POST",
      originalUrl: "/api/quick-practice/start",
      session: apiSession,
    },
    res,
    () => {
      throw new Error("anonymous API request must not continue");
    },
  );
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    code: "SESSION_EXPIRED",
    message:
      "로그인 세션이 만료되었습니다. 다시 로그인해주세요.",
    loginUrl: "/login",
  });
  assert.equal(apiSession.returnTo, undefined);

  console.log(
    "session auth returns JSON for fetch APIs and redirects full pages",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
