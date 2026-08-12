((root, factory) => {
  const api = factory();

  if (
    typeof module === "object" &&
    module.exports
  ) {
    module.exports = api;
  }

  if (root) {
    root.MatthsFetchErrorMessage =
      api;
  }
})(
  typeof globalThis !==
    "undefined"
    ? globalThis
    : this,
  () => {
    const defaultMessage =
      "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
    const networkMessage =
      "인터넷 연결을 확인한 뒤 다시 시도해주세요.";
    const responseMessage =
      "서버 응답을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.";
    const timeoutMessage =
      "요청 시간이 초과되었습니다. 인터넷 연결을 확인한 뒤 다시 시도해주세요.";
    const koreanPattern =
      /[가-힣]/;
    const networkPattern =
      /failed to fetch|fetch failed|load failed|network(?:error| request failed)|connection (?:refused|reset)|internet connection|offline/i;

    const safeFallback = (
      fallback
    ) =>
      typeof fallback ===
        "string" &&
      koreanPattern.test(fallback)
        ? fallback
        : defaultMessage;

    const toUserMessage = (
      error,
      fallback = defaultMessage
    ) => {
      const resolvedFallback =
        safeFallback(fallback);
      const name = String(
        error?.name || ""
      );
      const message = String(
        error?.message || ""
      ).trim();

      if (name === "AbortError") {
        return timeoutMessage;
      }

      if (name === "SyntaxError") {
        return responseMessage;
      }

      if (
        networkPattern.test(message) ||
        (name === "TypeError" && !message)
      ) {
        return networkMessage;
      }

      if (
        message &&
        koreanPattern.test(message)
      ) {
        return message;
      }

      return resolvedFallback;
    };

    return Object.freeze({
      toUserMessage,
    });
  }
);
