"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(
    path.join(root, relativePath),
    "utf8"
  );

const drawing = require("../public/js/solution-drawing");
const analysis = require("../public/js/solution-analysis-provider");
const {
  practiceAttemptResponse,
} = require("../services/practiceService");

class FakeTarget {
  constructor() {
    this.listeners = new Map();
    this.disabled = false;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) {
      this.listeners.delete(type);
    }
  }

  emit(type, properties = {}) {
    this.listeners.get(type)?.({
      preventDefault() {},
      ...properties,
    });
  }
}

function drawingHarness(drawingOptions = {}) {
  const operations = [];
  const context = {
    save() {},
    restore() {},
    fillRect() {
      operations.push("fill");
    },
    beginPath() {},
    arc() {
      operations.push("point");
    },
    fill() {},
    moveTo() {},
    lineTo() {},
    stroke() {
      operations.push("stroke");
    },
    setTransform() {},
  };
  const canvas = new FakeTarget();
  canvas.dataset = {};
  canvas.attributes = new Map();
  canvas.clientWidth = 320;
  canvas.clientHeight = 220;
  canvas.getContext = () => context;
  canvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 320,
    height: 220,
  });
  canvas.setAttribute = (name, value) => {
    canvas.attributes.set(name, value);
  };
  canvas.setPointerCapture = () => {};
  canvas.releasePointerCapture = () => {};
  canvas.toBlob = (callback, type) => {
    callback(new Blob(["local-png"], { type }));
  };

  const clearButton = new FakeTarget();
  const statusElement = { textContent: "" };
  const observed = [];
  const windowObject = {
    devicePixelRatio: 2,
    ResizeObserver: class {
      constructor(callback) {
        this.callback = callback;
      }
      observe(target) {
        observed.push(target);
      }
      disconnect() {}
    },
    addEventListener() {},
    removeEventListener() {},
  };

  return {
    canvas,
    clearButton,
    statusElement,
    operations,
    observed,
    pad: drawing.createDrawingPad({
      canvas,
      clearButton,
      statusElement,
      windowObject,
      ...drawingOptions,
    }),
  };
}

async function main() {
  const harness = drawingHarness();

  assert.equal(harness.pad.hasInk(), false);
  assert.equal(harness.clearButton.disabled, true);
  assert.equal(harness.canvas.width, 640);
  assert.equal(harness.canvas.height, 440);
  assert.deepEqual(harness.observed, [harness.canvas]);

  for (const [index, pointerType] of [
    "mouse",
    "touch",
    "pen",
  ].entries()) {
    const pointerId = index + 1;
    harness.canvas.emit("pointerdown", {
      pointerId,
      pointerType,
      button: 0,
      isPrimary: true,
      clientX: 20,
      clientY: 30,
    });
    harness.canvas.emit("pointermove", {
      pointerId,
      pointerType,
      clientX: 90,
      clientY: 110,
    });
    harness.canvas.emit("pointerup", {
      pointerId,
      pointerType,
    });
    assert.equal(
      harness.pad.hasInk(),
      true,
      `${pointerType} 입력은 필기로 인식해야 합니다.`
    );
    assert.equal(harness.clearButton.disabled, false);

    if (pointerType !== "pen") {
      harness.clearButton.emit("click");
      assert.equal(harness.pad.hasInk(), false);
    }
  }

  const png = await harness.pad.capturePng();
  assert.equal(png.type, drawing.PNG_MIME);
  assert.ok(png.size > 0);
  assert.ok(harness.operations.includes("stroke"));

  assert.throws(
    () =>
      drawing.validatePngBlob({
        type: "image/jpeg",
        size: 10,
      }),
    /PNG/
  );
  assert.throws(
    () =>
      drawing.validatePngBlob({
        type: "image/png",
        size: drawing.MAX_PNG_BYTES + 1,
      }),
    /크기/
  );
  harness.pad.destroy();

  assert.equal(drawing.MAX_PATHS, 200);
  assert.equal(drawing.MAX_POINTS_PER_PATH, 2000);
  assert.equal(drawing.MAX_POINTS_TOTAL, 12000);
  const limited = drawingHarness({
    maximumPaths: 1,
    maximumPointsPerPath: 2,
    maximumPointsTotal: 2,
  });
  limited.canvas.emit("pointerdown", {
    pointerId: 11,
    pointerType: "pen",
    button: 0,
    isPrimary: true,
    clientX: 10,
    clientY: 10,
  });
  limited.canvas.emit("pointermove", {
    pointerId: 11,
    pointerType: "pen",
    clientX: 40,
    clientY: 40,
  });
  limited.canvas.emit("pointermove", {
    pointerId: 11,
    pointerType: "pen",
    clientX: 80,
    clientY: 80,
  });
  limited.canvas.emit("pointerup", {
    pointerId: 11,
    pointerType: "pen",
  });
  limited.canvas.emit("pointerdown", {
    pointerId: 12,
    pointerType: "mouse",
    button: 0,
    isPrimary: true,
    clientX: 20,
    clientY: 20,
  });
  assert.deepEqual(limited.pad.getUsage(), {
    paths: 1,
    points: 2,
  });
  assert.match(limited.statusElement.textContent, /필기 한도/);
  limited.pad.clear();
  assert.deepEqual(limited.pad.getUsage(), {
    paths: 0,
    points: 0,
  });
  limited.pad.destroy();

  assert.equal(
    analysis.shouldPresentPreview({
      correct: false,
      hasInk: true,
    }),
    true
  );
  assert.equal(
    analysis.shouldPresentPreview({
      correct: true,
      hasInk: true,
    }),
    false,
    "정답이면 필기가 있어도 floating을 열지 않습니다."
  );
  assert.equal(
    analysis.shouldPresentPreview({
      correct: false,
      hasInk: false,
    }),
    false,
    "빈 필기는 오답이어도 floating을 열지 않습니다."
  );

  const attemptId = "a".repeat(24);
  const unavailable = await analysis.analyze(
    { attemptId, imageBlob: png },
    null
  );
  assert.deepEqual(unavailable, {
    status: "unavailable",
    terminal: true,
    authoritative: false,
    retained: false,
    message:
      "기기 분석 기능이 준비되지 않아 내 풀이만 표시합니다.",
  });

  let providerInput = null;
  const localCapabilities = {
    execution: "local",
    retention: "memory-only",
    network: false,
  };
  const completed = await analysis.analyze(
    { attemptId, imageBlob: png },
    {
      capabilities: localCapabilities,
      async analyze(input) {
        providerInput = input;
        return {
          status: "complete",
          message: "보조 분석 결과",
        };
      },
    }
  );
  assert.equal(providerInput.attemptId, attemptId);
  assert.equal(providerInput.imageBlob, png);
  assert.equal(providerInput.authoritative, false);
  assert.equal(providerInput.retention, "memory-only");
  assert.equal(completed.status, "complete");
  assert.equal(completed.authoritative, false);
  assert.equal(completed.retained, false);

  const rejectedRetention = await analysis.analyze(
    { attemptId, imageBlob: png },
    {
      capabilities: localCapabilities,
      async analyze() {
        return {
          status: "complete",
          retained: true,
          message: "저장된 분석",
        };
      },
    }
  );
  assert.equal(rejectedRetention.status, "failed");
  assert.equal(rejectedRetention.retained, false);

  let incompatibleProviderCalled = false;
  const incompatibleProvider = await analysis.analyze(
    { attemptId, imageBlob: png },
    {
      capabilities: {
        execution: "remote",
        retention: "unknown",
        network: true,
      },
      async analyze() {
        incompatibleProviderCalled = true;
        return { status: "complete" };
      },
    }
  );
  assert.equal(incompatibleProvider.status, "unavailable");
  assert.equal(incompatibleProviderCalled, false);

  await assert.rejects(
    analysis.analyze(
      {
        attemptId: "not-owned-or-valid",
        imageBlob: png,
      },
      {
        capabilities: localCapabilities,
        analyze() {},
      }
    ),
    /식별자/
  );

  const mastery = {
    correctTypeIds: [],
    required: 5,
    unlocked: false,
    userCompleted: false,
  };
  const coachFeedback = { message: "다시 확인해보세요." };
  const attemptResponse = practiceAttemptResponse({
    attempt: { _id: attemptId },
    correct: false,
    solution: "해설",
    activityDurationMs: 1200,
    mastery,
    review: null,
    coachFeedback,
  });
  assert.deepEqual(
    Object.keys(attemptResponse),
    [
      "attemptId",
      "correct",
      "solution",
      "activityDurationMs",
      "mastery",
      "review",
      "coachFeedback",
    ],
    "기존 채점 응답 필드를 유지하면서 attemptId만 추가합니다."
  );
  assert.equal(attemptResponse.attemptId, attemptId);
  assert.equal(attemptResponse.mastery, mastery);
  assert.equal(
    attemptResponse.coachFeedback,
    coachFeedback
  );

  const view = read(
    "views/partials/concept-experience.ejs"
  );
  const page = read("views/unit-learning.ejs");
  const styles = read(
    "public/css/concept-experience.css"
  );
  const client = read(
    "public/js/concept-experience.js"
  );
  const providerSource = read(
    "public/js/solution-analysis-provider.js"
  );
  const service = read("services/practiceService.js");

  for (const marker of [
    'id="solution-drawing-canvas"',
    'id="clear-solution-drawing"',
    'id="solution-drawing-status"',
    'id="solution-floating-preview"',
    'id="solution-floating-image"',
    'id="solution-analysis-state"',
    'aria-live="polite"',
    'aria-describedby="solution-drawing-help solution-drawing-status"',
  ]) {
    assert.ok(view.includes(marker), `${marker} 계약 누락`);
  }

  assert.match(
    page,
    /solution-drawing\.js[\s\S]*solution-analysis-provider\.js[\s\S]*concept-experience\.js/,
    "drawing과 provider 경계가 화면 로직보다 먼저 로드돼야 합니다."
  );
  assert.match(
    styles,
    /#solution-drawing-canvas\s*\{[\s\S]*touch-action:\s*none/,
    "손가락과 Pencil 입력 중 페이지가 움직이면 안 됩니다."
  );
  assert.match(
    styles,
    /\.clear-solution-drawing,[\s\S]*min-height:\s*44px/,
    "필기 조작 버튼은 최소 44px이어야 합니다."
  );
  assert.match(
    styles,
    /\.solution-floating-preview\s*\{[\s\S]*position:\s*fixed[\s\S]*width:\s*min\(390px, calc\(100vw - 24px\)\)/,
    "320px부터 큰 화면까지 floating 폭이 viewport 안에 있어야 합니다."
  );
  assert.match(
    styles,
    /@media\s*\(max-width:\s*620px\)[\s\S]*#solution-drawing-canvas\s*\{[\s\S]*height:\s*220px/,
    "좁은 화면 필기 높이를 명시해야 합니다."
  );
  assert.match(
    styles,
    /\.experience-section\s*\{[\s\S]*width:\s*100%[\s\S]*box-sizing:\s*border-box/,
    "320px 화면에서 practice section의 padding이 문서 폭을 늘리면 안 됩니다."
  );

  assert.match(client, /URL\.createObjectURL\(imageBlob\)/);
  assert.match(client, /URL\.revokeObjectURL/);
  assert.match(client, /pagehide/);
  assert.match(
    client,
    /shouldPresentPreview[\s\S]*result\.attemptId/,
    "정오답·필기 유무 판정 뒤 서버 attemptId로 로컬 분석을 시작해야 합니다."
  );

  const attemptRequestStart = client.indexOf(
    "`${baseUrl}/attempt`"
  );
  assert.ok(attemptRequestStart >= 0);
  const attemptRequest = client.slice(
    attemptRequestStart,
    attemptRequestStart + 430
  );
  assert.match(attemptRequest, /instanceId:/);
  assert.match(attemptRequest, /answer,/);
  assert.doesNotMatch(
    attemptRequest,
    /imageBlob|drawingCanvas|floatingObjectUrl/,
    "채점 API에 손글씨 원본을 보내면 안 됩니다."
  );
  assert.match(
    providerSource,
    /execution === "local"[\s\S]*retention ===[\s\S]*"memory-only"[\s\S]*network === false/,
    "명시적인 로컬·메모리 전용 capability가 없으면 provider를 호출하지 않습니다."
  );
  assert.match(
    view,
    /현재 기본 기능은 원본 이미지를 이 탭 메모리에서만 다루며,[\s\S]*서버로 보내거나 저장하지 않습니다/,
    "저장 안내는 현재 기본 adapter의 보장 범위로 한정해야 합니다."
  );

  assert.doesNotMatch(
    providerSource,
    /\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB/,
    "기본 provider는 이미지 전송이나 영구 저장을 하면 안 됩니다."
  );
  assert.match(
    service,
    /attemptId:\s*String\(attempt\._id\),[\s\S]*correct,/,
    "채점 응답은 인증 사용자에게 생성한 attemptId를 포함해야 합니다."
  );
  assert.doesNotMatch(
    service,
    /drawingBlob|drawingImage|handwritingImage/,
    "연습 서비스는 손글씨 원본을 영구 저장하지 않습니다."
  );

  console.log(
    "concept solution drawing, local floating preview, and non-authoritative analysis boundary passed"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
