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

const defaultFallback =
  "기능을 이용하지 못했습니다. 잠시 후 다시 시도해주세요.";

assert.equal(
  toUserMessage(
    new TypeError("Failed to fetch"),
    defaultFallback
  ),
  "인터넷 연결을 확인한 뒤 다시 시도해주세요."
);
assert.equal(
  toUserMessage(
    new SyntaxError("Unexpected end of JSON input"),
    defaultFallback
  ),
  "서버 응답을 확인하지 못했습니다. 잠시 후 다시 시도해주세요."
);
assert.equal(
  toUserMessage(
    Object.assign(new Error("aborted"), {
      name: "AbortError",
    }),
    defaultFallback
  ),
  "요청 시간이 초과되었습니다. 인터넷 연결을 확인한 뒤 다시 시도해주세요."
);
assert.equal(
  toUserMessage(
    new Error("현재는 문제를 시작할 수 없습니다."),
    defaultFallback
  ),
  "현재는 문제를 시작할 수 없습니다."
);
assert.equal(
  toUserMessage(
    new TypeError(
      "Cannot read properties of undefined"
    ),
    defaultFallback
  ),
  defaultFallback,
  "일반 코드 TypeError를 네트워크 오류로 오인하면 안 됩니다."
);

const featureScripts = [
  "public/js/study-hall.js",
  "public/js/wrong-note-review.js",
  "public/js/quick-practice.js",
  "public/js/concept-experience.js",
  "public/js/unit-learning.js",
  "public/js/main.js",
];

for (const scriptPath of featureScripts) {
  const source = read(scriptPath);
  assert.match(
    source,
    /MatthsFetchErrorMessage[\s\S]*?toUserMessage/,
    `${scriptPath}는 공통 한국어 오류 매퍼를 사용해야 합니다.`
  );
  assert.doesNotMatch(
    source,
    /\berror\.message\b/,
    `${scriptPath}가 브라우저 오류 원문을 사용자 화면에 직접 노출하면 안 됩니다.`
  );
}

const viewScripts = [
  ["views/main.ejs", ["/js/main.js"]],
  [
    "views/store-study.ejs",
    ["/js/main.js", "/js/study-hall.js"],
  ],
  [
    "views/quick-practice.ejs",
    ["/js/main.js", "/js/quick-practice.js"],
  ],
  [
    "views/wrong-note-review.ejs",
    ["/js/main.js", "/js/wrong-note-review.js"],
  ],
  [
    "views/unit-learning.ejs",
    [
      "/js/main.js",
      "/js/unit-learning.js",
      "/js/concept-experience.js",
    ],
  ],
];

for (const [viewPath, dependentScripts] of viewScripts) {
  const view = read(viewPath);
  const mapperIndex = view.indexOf(
    "/js/fetch-error-message.js"
  );
  assert.ok(
    mapperIndex >= 0,
    `${viewPath}에 한국어 오류 매퍼가 필요합니다.`
  );
  for (const dependentScript of dependentScripts) {
    assert.ok(
      mapperIndex < view.indexOf(dependentScript),
      `${viewPath}는 ${dependentScript}보다 오류 매퍼를 먼저 로드해야 합니다.`
    );
  }
}

const studyHallScript = read(
  "public/js/study-hall.js"
);

async function runStudyHallFailure(fetchImpl) {
  let saveHandler = null;
  const hidden = { value: "" };
  const count = { textContent: "" };
  const status = { textContent: "" };
  const saveButton = {
    disabled: false,
    addEventListener(type, handler) {
      if (type === "click") saveHandler = handler;
    },
  };
  const form = {
    dataset: {
      contentId: "content-1",
      submitted: "0",
    },
    querySelector(selector) {
      return {
        "[data-answers-json]": hidden,
        "[data-answered-count]": count,
        "[data-save-status]": status,
        "[data-save-progress]": saveButton,
      }[selector] || null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
  };
  const context = {
    document: {
      querySelector(selector) {
        return selector ===
          "[data-study-hall-form]"
          ? form
          : null;
      },
    },
    fetch: fetchImpl,
    URLSearchParams,
    window: {
      MatthsFetchErrorMessage: {
        toUserMessage,
      },
      confirm() {
        return true;
      },
    },
  };

  vm.runInNewContext(
    studyHallScript,
    context,
    {
      filename:
        "public/js/study-hall.js",
    }
  );
  assert.equal(typeof saveHandler, "function");
  await saveHandler();
  assert.equal(
    saveButton.disabled,
    false,
    "실패 뒤 임시 저장 버튼을 다시 사용할 수 있어야 합니다."
  );
  return status.textContent;
}

Promise.all([
  runStudyHallFailure(async () => {
    throw new TypeError("Failed to fetch");
  }).then((message) =>
    assert.equal(
      message,
      "인터넷 연결을 확인한 뒤 다시 시도해주세요."
    )
  ),
  runStudyHallFailure(async () => ({
    ok: true,
    async json() {
      throw new SyntaxError(
        "Unexpected end of JSON input"
      );
    },
  })).then((message) =>
    assert.equal(
      message,
      "서버 응답을 확인하지 못했습니다. 잠시 후 다시 시도해주세요."
    )
  ),
  runStudyHallFailure(async () => ({
    ok: false,
    async json() {
      return {
        message:
          "이미 제출한 답안은 바꿀 수 없습니다.",
      };
    },
  })).then((message) =>
    assert.equal(
      message,
      "이미 제출한 답안은 바꿀 수 없습니다."
    )
  ),
])
  .then(() => {
    console.log(
      "student fetch error completion: PASS"
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
