(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.MatthsSolutionDrawing = api;
  }
})(
  typeof window !== "undefined" ? window : globalThis,
  function () {
    "use strict";

    const PNG_MIME = "image/png";
    const MAX_PNG_BYTES = 4 * 1024 * 1024;
    const MAX_PATHS = 200;
    const MAX_POINTS_PER_PATH = 2000;
    const MAX_POINTS_TOTAL = 12000;

    function positiveLimit(value, fallback) {
      return Number.isInteger(value) && value > 0
        ? value
        : fallback;
    }

    function validatePngBlob(
      blob,
      maximumBytes = MAX_PNG_BYTES
    ) {
      if (!blob || blob.type !== PNG_MIME) {
        throw new TypeError(
          "손글씨 미리보기는 PNG 형식이어야 합니다."
        );
      }

      if (
        !Number.isFinite(blob.size) ||
        blob.size <= 0 ||
        blob.size > maximumBytes
      ) {
        throw new RangeError(
          "손글씨 미리보기의 크기가 허용 범위를 벗어났습니다."
        );
      }

      return blob;
    }

    function createDrawingPad({
      canvas,
      clearButton,
      statusElement,
      windowObject,
      maximumBytes = MAX_PNG_BYTES,
      maximumPaths = MAX_PATHS,
      maximumPointsPerPath = MAX_POINTS_PER_PATH,
      maximumPointsTotal = MAX_POINTS_TOTAL,
    }) {
      if (!canvas?.getContext) {
        throw new TypeError(
          "손글씨 캔버스를 초기화할 수 없습니다."
        );
      }

      const browser =
        windowObject ||
        (typeof window !== "undefined"
          ? window
          : globalThis);
      const context = canvas.getContext("2d", {
        alpha: false,
      });

      if (!context) {
        throw new TypeError(
          "손글씨 캔버스를 초기화할 수 없습니다."
        );
      }

      const paths = [];
      const pathLimit = positiveLimit(
        maximumPaths,
        MAX_PATHS
      );
      const perPathPointLimit = positiveLimit(
        maximumPointsPerPath,
        MAX_POINTS_PER_PATH
      );
      const totalPointLimit = positiveLimit(
        maximumPointsTotal,
        MAX_POINTS_TOTAL
      );
      let activePointerId = null;
      let activePath = null;
      let totalPoints = 0;
      let enabled = true;
      let viewWidth = 1;
      let viewHeight = 1;
      let resizeObserver = null;

      function updateState(message) {
        const hasInk = paths.length > 0;

        if (clearButton) {
          clearButton.disabled = !enabled || !hasInk;
        }

        canvas.dataset.hasInk = hasInk ? "true" : "false";
        canvas.setAttribute(
          "aria-disabled",
          enabled ? "false" : "true"
        );

        if (message && statusElement) {
          statusElement.textContent = message;
        }
      }

      function prepareContext() {
        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle = "#172033";
        context.fillStyle = "#172033";
        context.lineWidth = Math.max(
          2.25,
          Math.min(4, viewWidth / 210)
        );
      }

      function paintBackground() {
        context.save();
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, viewWidth, viewHeight);
        context.restore();
      }

      function denormalize(point) {
        return {
          x: point.x * viewWidth,
          y: point.y * viewHeight,
        };
      }

      function drawPoint(point) {
        const position = denormalize(point);
        const radius = context.lineWidth / 2;

        context.beginPath();
        context.arc(
          position.x,
          position.y,
          radius,
          0,
          Math.PI * 2
        );
        context.fill();
      }

      function drawSegment(from, to) {
        const start = denormalize(from);
        const end = denormalize(to);

        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
      }

      function redraw() {
        paintBackground();
        prepareContext();

        paths.forEach((path) => {
          if (path.length === 1) {
            drawPoint(path[0]);
            return;
          }

          for (
            let index = 1;
            index < path.length;
            index += 1
          ) {
            drawSegment(
              path[index - 1],
              path[index]
            );
          }
        });
      }

      function resize() {
        const bounds = canvas.getBoundingClientRect();
        viewWidth = Math.max(
          1,
          Math.round(bounds.width || canvas.clientWidth || 640)
        );
        viewHeight = Math.max(
          1,
          Math.round(bounds.height || canvas.clientHeight || 250)
        );
        const ratio = Math.max(
          1,
          Math.min(
            Number(browser.devicePixelRatio) || 1,
            2
          )
        );

        canvas.width = Math.round(viewWidth * ratio);
        canvas.height = Math.round(viewHeight * ratio);
        context.setTransform(
          ratio,
          0,
          0,
          ratio,
          0,
          0
        );
        redraw();
      }

      function pointFromEvent(event) {
        const bounds = canvas.getBoundingClientRect();
        const width = bounds.width || viewWidth;
        const height = bounds.height || viewHeight;

        return {
          x: Math.max(
            0,
            Math.min(
              1,
              (Number(event.clientX) - bounds.left) /
                width
            )
          ),
          y: Math.max(
            0,
            Math.min(
              1,
              (Number(event.clientY) - bounds.top) /
                height
            )
          ),
        };
      }

      function appendPoint(event) {
        if (!activePath) return;

        if (
          activePath.length >= perPathPointLimit ||
          totalPoints >= totalPointLimit
        ) {
          updateState(
            "필기 한도에 도달했습니다. 계속 적으려면 필기를 지워주세요."
          );
          return;
        }

        const point = pointFromEvent(event);
        const previous = activePath.at(-1);

        if (
          previous &&
          Math.hypot(
            point.x - previous.x,
            point.y - previous.y
          ) < 0.0005
        ) {
          return;
        }

        activePath.push(point);
        totalPoints += 1;
        prepareContext();

        if (previous) {
          drawSegment(previous, point);
        } else {
          drawPoint(point);
        }
      }

      function onPointerDown(event) {
        if (
          !enabled ||
          event.isPrimary === false ||
          (event.pointerType !== "pen" &&
            Number.isFinite(event.button) &&
            event.button !== 0)
        ) {
          return;
        }

        if (
          paths.length >= pathLimit ||
          totalPoints >= totalPointLimit
        ) {
          event.preventDefault();
          updateState(
            "필기 한도에 도달했습니다. 계속 적으려면 필기를 지워주세요."
          );
          return;
        }

        event.preventDefault();
        activePointerId = event.pointerId;
        activePath = [];
        paths.push(activePath);
        appendPoint(event);
        canvas.setPointerCapture?.(event.pointerId);
        updateState(
          "필기가 있습니다. 오답이면 이 기기에서 풀이 미리보기를 표시합니다."
        );
      }

      function onPointerMove(event) {
        if (
          !enabled ||
          activePointerId !== event.pointerId
        ) {
          return;
        }

        event.preventDefault();
        const events =
          typeof event.getCoalescedEvents === "function"
            ? event.getCoalescedEvents()
            : [event];

        (events.length ? events : [event]).forEach(
          appendPoint
        );
      }

      function finishPointer(event) {
        if (activePointerId !== event.pointerId) {
          return;
        }

        event.preventDefault();
        canvas.releasePointerCapture?.(
          event.pointerId
        );
        activePointerId = null;
        activePath = null;
      }

      function clear() {
        paths.splice(0, paths.length);
        totalPoints = 0;
        activePointerId = null;
        activePath = null;
        redraw();
        updateState(
          "필기를 지웠습니다. 필기는 선택사항입니다."
        );
      }

      function setEnabled(nextEnabled) {
        enabled = Boolean(nextEnabled);

        if (!enabled) {
          activePointerId = null;
          activePath = null;
        }

        updateState();
      }

      function capturePng() {
        if (!paths.length) {
          return Promise.reject(
            new Error("저장할 손글씨가 없습니다.")
          );
        }

        return new Promise((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              try {
                resolve(
                  validatePngBlob(blob, maximumBytes)
                );
              } catch (error) {
                reject(error);
              }
            },
            PNG_MIME
          );
        });
      }

      canvas.addEventListener(
        "pointerdown",
        onPointerDown
      );
      canvas.addEventListener(
        "pointermove",
        onPointerMove
      );
      canvas.addEventListener(
        "pointerup",
        finishPointer
      );
      canvas.addEventListener(
        "pointercancel",
        finishPointer
      );
      clearButton?.addEventListener("click", clear);

      if (typeof browser.ResizeObserver === "function") {
        resizeObserver = new browser.ResizeObserver(resize);
        resizeObserver.observe(canvas);
      } else {
        browser.addEventListener?.("resize", resize);
      }

      resize();
      updateState(
        "아직 필기가 없습니다. 필기는 선택사항입니다."
      );

      return {
        hasInk: () => paths.length > 0,
        clear,
        setEnabled,
        capturePng,
        resize,
        getUsage: () => ({
          paths: paths.length,
          points: totalPoints,
        }),
        destroy() {
          resizeObserver?.disconnect();
          browser.removeEventListener?.("resize", resize);
          canvas.removeEventListener(
            "pointerdown",
            onPointerDown
          );
          canvas.removeEventListener(
            "pointermove",
            onPointerMove
          );
          canvas.removeEventListener(
            "pointerup",
            finishPointer
          );
          canvas.removeEventListener(
            "pointercancel",
            finishPointer
          );
          clearButton?.removeEventListener(
            "click",
            clear
          );
        },
      };
    }

    return {
      PNG_MIME,
      MAX_PNG_BYTES,
      MAX_PATHS,
      MAX_POINTS_PER_PATH,
      MAX_POINTS_TOTAL,
      validatePngBlob,
      createDrawingPad,
    };
  }
);
