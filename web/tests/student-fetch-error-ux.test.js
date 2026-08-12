"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(
    path.join(root, relativePath),
    "utf8"
  );
const {
  toUserMessage,
} = require("../public/js/fetch-error-message");

assert.equal(
  toUserMessage(
    new TypeError("Failed to fetch")
  ),
  "인터넷 연결을 확인한 뒤 다시 시도해주세요."
);
assert.equal(
  toUserMessage(
    new SyntaxError(
      "Unexpected token '<'"
    )
  ),
  "서버 응답을 확인하지 못했습니다. 잠시 후 다시 시도해주세요."
);
assert.equal(
  toUserMessage(
    Object.assign(
      new Error("The operation was aborted"),
      { name: "AbortError" }
    )
  ),
  "요청 시간이 초과되었습니다. 인터넷 연결을 확인한 뒤 다시 시도해주세요."
);
assert.equal(
  toUserMessage(
    new Error("Internal Server Error"),
    "시험을 시작하지 못했습니다. 잠시 후 다시 시도해주세요."
  ),
  "시험을 시작하지 못했습니다. 잠시 후 다시 시도해주세요."
);
assert.equal(
  toUserMessage(
    new Error(
      "응시 가능한 시간이 아닙니다."
    )
  ),
  "응시 가능한 시간이 아닙니다."
);

const privateMockView = read(
  "views/private-mock-exam.ejs"
);
const privateMockScript = read(
  "public/js/private-mock-exam.js"
);
const privateMockListView = read(
  "views/private-mock-exams.ejs"
);
const privateMockListScript = read(
  "public/js/private-mock-exams.js"
);
const arenaMatchView = read(
  "views/goat-arena-match.ejs"
);
const arenaMatchScript = read(
  "public/js/goat-arena-match.js"
);

for (const [view, featureScript] of [
  [privateMockView, "/js/private-mock-exam.js"],
  [privateMockListView, "/js/private-mock-exams.js"],
  [arenaMatchView, "/js/goat-arena-match.js"],
]) {
  assert.ok(
    view.indexOf(
      "/js/fetch-error-message.js"
    ) < view.indexOf(featureScript),
    `${featureScript}보다 한국어 오류 매퍼를 먼저 로드해야 합니다.`
  );
}

assert.match(
  privateMockView,
  /role="alert"[\s\S]*?data-private-mock-start-error/
);
assert.match(
  privateMockScript,
  /startButton\.innerHTML\s*=\s*readyButtonMarkup;/
);
assert.match(
  privateMockScript,
  /startError\.textContent\s*=\s*toUserErrorMessage/
);
assert.doesNotMatch(
  privateMockScript,
  /startButton\.textContent\s*=\s*error\.message|showError\(error\.message\)/
);
assert.doesNotMatch(
  privateMockListScript,
  /status\.textContent\s*=\s*error\.message/
);
assert.match(
  arenaMatchView,
  /data-arena-match-error role="alert" aria-live="assertive"/
);
assert.doesNotMatch(
  arenaMatchScript,
  /showError\(error\.message\)/
);

async function verifyStartFailureRecovery() {
  let clickHandler = null;
  const attributes = new Map([
    ["aria-disabled", "false"],
  ]);
  const startButton = {
    dataset: {},
    disabled: false,
    textContent: "시험 시작",
    innerHTML:
      '시험 시작 <span aria-hidden="true">→</span>',
    classList: {
      remove() {},
    },
    addEventListener(type, handler) {
      if (type === "click") {
        clickHandler = handler;
      }
    },
    getAttribute(name) {
      return attributes.get(name);
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
  };
  const startError = {
    hidden: true,
    textContent: "",
  };
  const countdown = {
    textContent: "00:00",
  };
  const rootElement = {
    dataset: {
      examId: "exam-1",
      notStarted: "true",
      releaseAt: new Date(
        Date.now() - 1000
      ).toISOString(),
      serverNow: new Date().toISOString(),
    },
    classList: {
      toggle() {},
    },
    querySelector(selector) {
      return {
        "[data-private-mock-start]":
          startButton,
        "[data-private-mock-start-error]":
          startError,
        "[data-private-mock-lobby-countdown]":
          countdown,
      }[selector] || null;
    },
    querySelectorAll() {
      return [];
    },
  };
  const windowObject = {
    MatthsFetchErrorMessage: {
      toUserMessage,
    },
    location: {
      reload() {
        throw new Error(
          "네트워크 실패 후에는 새로고침하면 안 됩니다."
        );
      },
    },
    setInterval() {
      return 1;
    },
  };
  const context = {
    document: {
      querySelector(selector) {
        return selector ===
          "[data-private-mock-exam]"
          ? rootElement
          : null;
      },
    },
    fetch: async () => {
      throw new TypeError(
        "Failed to fetch"
      );
    },
    window: windowObject,
  };

  vm.runInNewContext(
    privateMockScript,
    context,
    {
      filename:
        "public/js/private-mock-exam.js",
    }
  );
  assert.equal(
    typeof clickHandler,
    "function"
  );

  await clickHandler({
    preventDefault() {},
  });

  assert.equal(
    startButton.disabled,
    false
  );
  assert.equal(
    startButton.innerHTML,
    '시험 시작 <span aria-hidden="true">→</span>'
  );
  assert.equal(
    startError.hidden,
    false
  );
  assert.equal(
    startError.textContent,
    "인터넷 연결을 확인한 뒤 다시 시도해주세요."
  );
}

verifyStartFailureRecovery()
  .then(() => {
    console.log(
      "student fetch error UX contract: PASS"
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
