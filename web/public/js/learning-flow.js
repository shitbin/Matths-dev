(function () {
  "use strict";

  document.documentElement.classList.add("js-enabled");

  function initFlowNavigation(motionPreference) {
    const flow = document.querySelector(".orbit-flow");
    const steps = flow ? Array.from(flow.querySelectorAll(".flow-step")) : [];
    const playbackButton = flow?.querySelector(".flow-playback-button");
    if (!flow || !steps.length) return;

    let current = 0;
    let timer;
    let paused = false;
    let manuallyPaused = motionPreference.matches;

    function renderPlaybackControl() {
      if (!playbackButton) return;
      const label = playbackButton.querySelector("b");
      const symbol = playbackButton.querySelector("span");
      playbackButton.setAttribute("aria-pressed", String(manuallyPaused));
      playbackButton.setAttribute(
        "aria-label",
        manuallyPaused
          ? "학습 흐름 자동 진행 시작하기"
          : "학습 흐름 자동 진행 멈추기",
      );
      if (label) label.textContent = manuallyPaused ? "자동 진행 시작" : "자동 진행 멈춤";
      if (symbol) symbol.textContent = manuallyPaused ? "▶" : "Ⅱ";
    }

    function activate(index, shouldScroll) {
      current = index;
      steps.forEach((step, stepIndex) => {
        const isActive = stepIndex === index;
        step.classList.toggle("active", isActive);
        step.setAttribute("aria-pressed", String(isActive));
      });

      if (shouldScroll) {
        const target = document.getElementById(steps[index].dataset.target);
        target?.scrollIntoView({
          behavior: motionPreference.matches ? "auto" : "smooth",
          block: "start",
        });
      }
    }

    function schedule() {
      window.clearTimeout(timer);
      if (motionPreference.matches || manuallyPaused || paused) return;
      timer = window.setTimeout(() => {
        activate((current + 1) % steps.length, false);
        schedule();
      }, 2600);
    }

    steps.forEach((step, index) => {
      step.addEventListener("click", () => {
        activate(index, true);
        schedule();
      });
    });

    playbackButton?.addEventListener("click", () => {
      manuallyPaused = !manuallyPaused;
      renderPlaybackControl();
      if (manuallyPaused) {
        window.clearTimeout(timer);
        return;
      }
      schedule();
    });

    motionPreference.addEventListener?.("change", (event) => {
      if (!event.matches) return;
      manuallyPaused = true;
      window.clearTimeout(timer);
      renderPlaybackControl();
    });

    flow.addEventListener("pointerenter", () => {
      paused = true;
      window.clearTimeout(timer);
    });
    flow.addEventListener("pointerleave", () => {
      paused = false;
      schedule();
    });
    flow.addEventListener("focusin", () => {
      paused = true;
      window.clearTimeout(timer);
    });
    flow.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (!flow.contains(document.activeElement)) {
          paused = false;
          schedule();
        }
      }, 0);
    });

    activate(0, false);
    renderPlaybackControl();
    schedule();
  }

  function initJourneyAnimations() {
    const items = Array.from(document.querySelectorAll(".journey-item"));
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8%" },
    );

    items.forEach((item) => observer.observe(item));
  }

  function initReviewDemo(motionPreference) {
    const review = document.querySelector(".review-screen");
    if (!review) return;

    const title = document.getElementById("review-title");
    const body = document.getElementById("review-body");
    const input = document.getElementById("review-input");
    const output = document.getElementById("review-output");
    const buttons = Array.from(review.querySelectorAll(".review-step-button"));
    const playbackButton = review.querySelector(".review-playback-button");
    const content = [
      {
        title: "필요한 수를 더하고 빼자.",
        body: "−4x의 절반인 −2를 제곱하면 4야.",
        input: "x² − 4x + 7",
        output: "x² − 4x + 4 + 3",
      },
      {
        title: "앞의 세 항을 묶어볼게.",
        body: "x² − 4x + 4는 (x − 2)²이야.",
        input: "x² − 4x + 4 + 3",
        output: "(x − 2)² + 3",
      },
      {
        title: "이제 그래프의 최솟값을 읽자.",
        body: "제곱식은 0 이상이므로 최솟값은 3이야.",
        input: "(x − 2)² + 3",
        output: "최솟값 3",
      },
    ];
    let current = 1;
    let timer;
    let paused = false;
    let manuallyPaused = motionPreference.matches;

    function renderPlaybackControl() {
      if (!playbackButton) return;
      const label = playbackButton.querySelector("b");
      const symbol = playbackButton.querySelector("span");
      playbackButton.setAttribute("aria-pressed", String(manuallyPaused));
      playbackButton.setAttribute(
        "aria-label",
        manuallyPaused
          ? "오답 풀이 자동 진행 시작하기"
          : "오답 풀이 자동 진행 멈추기",
      );
      if (label) label.textContent = manuallyPaused ? "재생" : "멈춤";
      if (symbol) symbol.textContent = manuallyPaused ? "▶" : "Ⅱ";
    }

    function render(step) {
      current = step;
      const value = content[step - 1];
      review.classList.remove("is-changing");
      void review.offsetWidth;
      review.dataset.reviewStep = String(step);
      review.classList.add("is-changing");
      title.textContent = value.title;
      body.textContent = value.body;
      input.textContent = value.input;
      output.textContent = value.output;

      buttons.forEach((button) => {
        const isActive = Number(button.dataset.reviewStep) === step;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    }

    function schedule() {
      window.clearTimeout(timer);
      if (motionPreference.matches || manuallyPaused || paused) return;
      timer = window.setTimeout(() => {
        render((current % content.length) + 1);
        schedule();
      }, 3000);
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        render(Number(button.dataset.reviewStep));
        schedule();
      });
    });
    playbackButton?.addEventListener("click", () => {
      manuallyPaused = !manuallyPaused;
      renderPlaybackControl();
      if (manuallyPaused) {
        window.clearTimeout(timer);
        return;
      }
      schedule();
    });
    motionPreference.addEventListener?.("change", (event) => {
      if (!event.matches) return;
      manuallyPaused = true;
      window.clearTimeout(timer);
      renderPlaybackControl();
    });
    review.addEventListener("pointerenter", () => {
      paused = true;
      window.clearTimeout(timer);
    });
    review.addEventListener("pointerleave", () => {
      paused = false;
      schedule();
    });
    review.addEventListener("focusin", () => {
      paused = true;
      window.clearTimeout(timer);
    });
    review.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (!review.contains(document.activeElement)) {
          paused = false;
          schedule();
        }
      }, 0);
    });

    render(1);
    renderPlaybackControl();
    schedule();
  }

  function initModeSelector() {
    const card = document.querySelector(".coach-card[data-mode]");
    if (!card) return;

    const label = document.getElementById("coach-mode-label");
    const tone = document.getElementById("coach-tone-message");
    const helper = document.getElementById("coach-helper-message");
    const buttons = Array.from(card.querySelectorAll(".mode-button"));
    const modes = {
      mild: {
        label: "순한맛 모드",
        tone: "조금 헷갈렸네. 같이 다시 확인해 보자.",
        helper: "괜찮아. 2단계부터 천천히 그림으로 다시 설명해 줄게.",
      },
      spicy: {
        label: "매운맛 모드",
        tone: "공식은 기억했지만 숫자가 바뀐 순간 막혔네.",
        helper: "바로 다시 잡자. 원리까지 이해하면 다음 숫자 변화에도 흔들리지 않아.<br />네가 막힌 2단계부터 다시 보자.",
      },
      silent: {
        label: "무음 모드",
        tone: "",
        helper: "2단계부터 시각적 풀이를 시작합니다.",
      },
    };

    function selectMode(mode, save) {
      const content = modes[mode] || modes.spicy;
      card.dataset.mode = mode;
      label.textContent = content.label;
      tone.textContent = content.tone;
      helper.innerHTML = content.helper;

      buttons.forEach((button) => {
        const isActive = button.dataset.mode === mode;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      if (save) {
        try {
          window.localStorage.setItem("matths-learning-mode", mode);
        } catch (error) {
          // Storage can be unavailable in privacy mode; the selector still works.
        }
      }
    }

    let savedMode = "spicy";
    try {
      const stored = window.localStorage.getItem("matths-learning-mode");
      if (stored && modes[stored]) savedMode = stored;
    } catch (error) {
      // Use the default mode when storage is unavailable.
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => selectMode(button.dataset.mode, true));
    });
    selectMode(savedMode, false);
  }

  function init() {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    initFlowNavigation(motionPreference);
    initJourneyAnimations();
    initReviewDemo(motionPreference);
    initModeSelector();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
