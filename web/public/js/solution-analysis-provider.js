(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.MatthsSolutionAnalysis = api;
  }
})(
  typeof window !== "undefined" ? window : globalThis,
  function () {
    "use strict";

    const ATTEMPT_ID_PATTERN = /^[a-f\d]{24}$/i;
    const MAX_PNG_BYTES = 4 * 1024 * 1024;

    function validateInput({ attemptId, imageBlob }) {
      const normalizedAttemptId = String(
        attemptId || ""
      ).trim();

      if (!ATTEMPT_ID_PATTERN.test(normalizedAttemptId)) {
        throw new TypeError(
          "풀이 기록 식별자가 올바르지 않습니다."
        );
      }

      if (
        !imageBlob ||
        imageBlob.type !== "image/png" ||
        !Number.isFinite(imageBlob.size) ||
        imageBlob.size <= 0 ||
        imageBlob.size > MAX_PNG_BYTES
      ) {
        throw new TypeError(
          "분석할 손글씨 이미지가 올바르지 않습니다."
        );
      }

      return {
        attemptId: normalizedAttemptId,
        imageBlob,
        authoritative: false,
        retention: "memory-only",
      };
    }

    function unavailableResult() {
      return {
        status: "unavailable",
        terminal: true,
        authoritative: false,
        retained: false,
        message:
          "기기 분석 기능이 준비되지 않아 내 풀이만 표시합니다.",
      };
    }

    function shouldPresentPreview({
      correct,
      hasInk,
    }) {
      return correct === false && hasInk === true;
    }

    function supportsEphemeralLocalAnalysis(provider) {
      return Boolean(
        provider?.analyze &&
          provider.capabilities?.execution === "local" &&
          provider.capabilities?.retention ===
            "memory-only" &&
          provider.capabilities?.network === false
      );
    }

    function normalizeProviderResult(result) {
      if (
        !result ||
        result.status !== "complete" ||
        result.retained === true
      ) {
        return {
          status: "failed",
          terminal: true,
          authoritative: false,
          retained: false,
          message:
            "풀이 분석을 마치지 못했습니다. 채점 결과와 학습 기록에는 영향이 없습니다.",
        };
      }

      return {
        status: "complete",
        terminal: true,
        authoritative: false,
        retained: false,
        message:
          typeof result.message === "string" &&
          result.message.trim()
            ? result.message.trim()
            : "보조 풀이 분석을 마쳤습니다. 채점 결과는 변경하지 않습니다.",
      };
    }

    async function analyze(
      input,
      provider =
        typeof window !== "undefined"
          ? window.MatthsHandwritingAnalysisProvider
          : null
    ) {
      if (!supportsEphemeralLocalAnalysis(provider)) {
        return unavailableResult();
      }

      const validated = validateInput(input);

      try {
        const result = await provider.analyze(validated);
        return normalizeProviderResult(result);
      } catch (_error) {
        return normalizeProviderResult(null);
      }
    }

    return {
      ATTEMPT_ID_PATTERN,
      MAX_PNG_BYTES,
      validateInput,
      unavailableResult,
      shouldPresentPreview,
      supportsEphemeralLocalAnalysis,
      analyze,
    };
  }
);
