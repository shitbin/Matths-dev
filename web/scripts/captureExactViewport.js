#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

function option(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  if (!process.argv[index + 1]) throw new Error(`${name} 값이 필요합니다.`);
  return process.argv[index + 1];
}

function positiveInteger(name, fallback) {
  const value = Number(option(name, String(fallback)));
  if (!Number.isInteger(value) || value < 1 || value > 10000) {
    throw new Error(`${name}은 1~10000 정수여야 합니다.`);
  }
  return value;
}

function findChrome(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.MATTHS_CAPTURE_CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("Chrome 실행 파일을 찾지 못했습니다.");
  return found;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function waitForDevTools(child, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      reject(new Error(`Chrome DevTools 시작 시간 초과: ${output.slice(-1200)}`));
    }, timeoutMs);
    child.stderr.on("data", (chunk) => {
      output += String(chunk);
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolve(match[1]);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`Chrome이 먼저 종료됐습니다: ${code ?? signal ?? "unknown"}`));
    });
  });
}

class CdpConnection {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.eventWaiters = new Map();
    this.eventHandlers = new Map();
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result || {});
        return;
      }
      const handlers = this.eventHandlers.get(message.method) || [];
      handlers.forEach((handler) => handler(message.params || {}));
      const waiters = this.eventWaiters.get(message.method) || [];
      this.eventWaiters.delete(message.method);
      waiters.forEach((waiter) => waiter(message.params || {}));
    });
  }

  on(method, handler) {
    const handlers = this.eventHandlers.get(method) || [];
    handlers.push(handler);
    this.eventHandlers.set(method, handlers);
  }

  send(method, params = {}, timeoutMs = 20_000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} CDP 응답 시간 초과 (${timeoutMs}ms)`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  waitForEvent(method, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${method} 대기 시간 초과`)), timeoutMs);
      const wrapped = (value) => {
        clearTimeout(timer);
        resolve(value);
      };
      const waiters = this.eventWaiters.get(method) || [];
      waiters.push(wrapped);
      this.eventWaiters.set(method, waiters);
    });
  }

  close() {
    this.socket.close();
  }
}

async function terminate(child) {
  if (child.exitCode != null || child.signalCode) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(1500),
  ]);
  if (child.exitCode == null && !child.signalCode) child.kill("SIGKILL");
}

async function run() {
  const targetUrl = new URL(option("--url"));
  if (!["http:", "https:", "data:"].includes(targetUrl.protocol)) {
    throw new Error("캡처 URL은 http, https 또는 data 형식이어야 합니다.");
  }
  const width = positiveInteger("--width", 390);
  const height = positiveInteger("--height", 1024);
  const waitMs = positiveInteger("--wait-ms", 800);
  const output = path.resolve(option("--output"));
  const fullOutputValue = option("--full-output", "");
  const fullOutput = fullOutputValue ? path.resolve(fullOutputValue) : null;
  const chrome = findChrome(option("--chrome"));
  const suppliedProfile = option("--profile");
  const temporaryProfile = suppliedProfile
    ? null
    : fs.mkdtempSync(path.join(os.tmpdir(), "matths-exact-viewport-"));
  const profile = path.resolve(suppliedProfile || temporaryProfile);
  fs.mkdirSync(profile, { recursive: true });
  fs.mkdirSync(path.dirname(output), { recursive: true });
  if (fullOutput) fs.mkdirSync(path.dirname(fullOutput), { recursive: true });

  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--hide-scrollbars",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  let connection;
  try {
    const browserWebSocket = await waitForDevTools(child);
    const browserUrl = new URL(browserWebSocket);
    const targetResponse = await fetch(
      `http://${browserUrl.hostname}:${browserUrl.port}/json/new?${encodeURIComponent("about:blank")}`,
      { method: "PUT" },
    );
    if (!targetResponse.ok) throw new Error(`Chrome target 생성 실패: ${targetResponse.status}`);
    const target = await targetResponse.json();
    connection = new CdpConnection(target.webSocketDebuggerUrl);
    await connection.open();
    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    await connection.send("Network.enable");
    const documentResponses = [];
    connection.on("Network.responseReceived", (event) => {
      if (event.type !== "Document" || !event.response) return;
      documentResponses.push({
        url: String(event.response.url || ""),
        status: Number(event.response.status),
        mimeType: String(event.response.mimeType || ""),
      });
    });
    const sessionCookie = String(process.env.MATTHS_CAPTURE_SESSION_COOKIE || "").trim();
    if (sessionCookie) {
      const cookieResult = await connection.send("Network.setCookie", {
        name: "connect.sid",
        value: sessionCookie,
        domain: targetUrl.hostname,
        path: "/",
        secure: targetUrl.protocol === "https:",
        httpOnly: true,
        sameSite: "Lax",
      });
      if (cookieResult.success !== true) {
        throw new Error("캡처용 로그인 쿠키를 브라우저에 적용하지 못했습니다.");
      }
    }
    await connection.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: width,
      screenHeight: height,
      positionX: 0,
      positionY: 0,
    });
    const loaded = connection.waitForEvent("Page.loadEventFired");
    await connection.send("Page.navigate", { url: targetUrl.href });
    await loaded;
    await delay(waitMs);
    const finalDocumentResponse = documentResponses.at(-1) || (
      targetUrl.protocol === "data:"
        ? { url: targetUrl.href, status: 200, mimeType: "text/html" }
        : null
    );
    const evaluated = await connection.send("Runtime.evaluate", {
      expression: `(async () => {
        window.scrollTo(0, 0);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const root = document.documentElement;
        const isMeasurable = (element) => {
          const style = getComputedStyle(element);
          if (style.display === "none" || style.visibility === "hidden") return false;
          if (element.closest("[hidden], [inert], [aria-hidden='true']")) return false;
          const closedDetails = element.closest("details:not([open])");
          const visibleSummary = element.closest("summary");
          if (
            closedDetails
            && element !== closedDetails
            && visibleSummary?.parentElement !== closedDetails
          ) return false;
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };
        const isClippedByInlineScroller = (element) => {
          for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
            const parentStyle = getComputedStyle(parent);
            const overflowX = parentStyle.overflowX;
            if (["auto", "scroll", "hidden", "clip"].includes(overflowX)) {
              const parentRect = parent.getBoundingClientRect();
              if (parentRect.left >= -0.5 && parentRect.right <= window.innerWidth + 0.5) return true;
            }
          }
          return false;
        };
        const overflowingElements = [...document.body.querySelectorAll("*")]
          .filter(isMeasurable)
          .map((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const parentRect = element.parentElement?.getBoundingClientRect();
            return {
              tag: element.tagName.toLowerCase(),
              id: element.id || "",
              className: typeof element.className === "string" ? element.className : "",
              left: Math.round(rect.left * 10) / 10,
              right: Math.round(rect.right * 10) / 10,
              width: Math.round(rect.width * 10) / 10,
              display: style.display,
              position: style.position,
              minWidth: style.minWidth,
              maxWidth: style.maxWidth,
              cssWidth: style.width,
              parentTag: element.parentElement?.tagName.toLowerCase() || "",
              parentClassName: typeof element.parentElement?.className === "string"
                ? element.parentElement.className
                : "",
              parentWidth: parentRect ? Math.round(parentRect.width * 10) / 10 : 0,
              clippedByInlineScroller: isClippedByInlineScroller(element),
              leftOverflow: Math.max(0, Math.round(-rect.left * 10) / 10),
              rightOverflow: Math.max(0, Math.round((rect.right - window.innerWidth) * 10) / 10),
              text: String(element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
            };
          })
          .filter((item) =>
            !item.clippedByInlineScroller &&
            (item.left < -0.5 || item.right > window.innerWidth + 0.5)
          )
          .sort((a, b) => b.rightOverflow - a.rightOverflow || b.leftOverflow - a.leftOverflow)
          .slice(0, 30);
        const intrinsicOverflowElements = [...document.body.querySelectorAll("*")]
          .filter(isMeasurable)
          .map((element) => {
            const style = getComputedStyle(element);
            return {
              tag: element.tagName.toLowerCase(),
              id: element.id || "",
              className: typeof element.className === "string" ? element.className : "",
              clientWidth: element.clientWidth,
              scrollWidth: element.scrollWidth,
              overflowX: style.overflowX,
              text: String(element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
            };
          })
          .filter((item) => item.scrollWidth > item.clientWidth + 1 && item.overflowX === "visible")
          .sort((a, b) => (b.scrollWidth - b.clientWidth) - (a.scrollWidth - a.clientWidth))
          .slice(0, 30);
        return {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          scrollWidth: root.scrollWidth,
          overflowingElements,
          intrinsicOverflowElements,
          html: root.outerHTML
        };
      })()`,
      returnByValue: true,
      awaitPromise: true,
    });
    const metrics = evaluated.result?.value;
    if (
      !metrics ||
      metrics.innerWidth !== width ||
      metrics.innerHeight !== height ||
      metrics.scrollX !== 0 ||
      metrics.scrollY !== 0
    ) {
      throw new Error(
        `CSS viewport 불일치: 요청 ${width}x${height}, 실제 ${metrics?.innerWidth}x${metrics?.innerHeight}, scroll ${metrics?.scrollX},${metrics?.scrollY}`,
      );
    }
    const screenshot = await connection.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });
    fs.writeFileSync(output, Buffer.from(screenshot.data, "base64"));
    if (fullOutput) {
      const fullScreenshot = await connection.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: true,
      });
      fs.writeFileSync(fullOutput, Buffer.from(fullScreenshot.data, "base64"));
    }
    process.stdout.write(`${JSON.stringify({
      requestedWidth: width,
      requestedHeight: height,
      documentUrl: finalDocumentResponse?.url || "",
      documentStatus: finalDocumentResponse?.status ?? null,
      documentMimeType: finalDocumentResponse?.mimeType || "",
      innerWidth: metrics.innerWidth,
      innerHeight: metrics.innerHeight,
      scrollX: metrics.scrollX,
      scrollY: metrics.scrollY,
      scrollWidth: metrics.scrollWidth,
      overflowingElements: metrics.overflowingElements,
      intrinsicOverflowElements: metrics.intrinsicOverflowElements,
      fullPageCaptured: Boolean(fullOutput),
      viewportVerified: true,
      html: metrics.html,
    })}\n`);
  } finally {
    connection?.close();
    await terminate(child);
    if (temporaryProfile) fs.rmSync(temporaryProfile, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
