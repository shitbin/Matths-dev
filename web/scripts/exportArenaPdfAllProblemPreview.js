#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawn } = require("node:child_process");
const { PDFDocument } = require("pdf-lib");
const {
  DEFINITIONS,
} = require("../services/arenaPdfTranscriptionGenerators");
const {
  OUTPUT: previewHtml,
  main: buildPreview,
} = require("./buildArenaPdfAllProblemPreview");

const repoRoot = path.resolve(__dirname, "..");
const defaultOutput = path.join(
  repoRoot,
  "dataAnalysis/arenaPdfSkeletonImplementation/GOAT_Arena_200문항_검수본.pdf",
);

function option(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  if (!process.argv[index + 1]) throw new Error(`${name} 값이 필요합니다.`);
  return process.argv[index + 1];
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

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function waitForDevTools(child, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(
      () => reject(new Error(`Chrome DevTools 시작 시간 초과: ${output.slice(-1200)}`)),
      timeoutMs,
    );
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
    this.waiters = new Map();
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
      const waiters = this.waiters.get(message.method) || [];
      this.waiters.delete(message.method);
      waiters.forEach((resolve) => resolve(message.params || {}));
    });
  }

  send(method, params = {}, timeoutMs = 30_000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} CDP 응답 시간 초과`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  waitForEvent(method, timeoutMs = 20_000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${method} 대기 시간 초과`)), timeoutMs);
      const wrapped = (value) => {
        clearTimeout(timer);
        resolve(value);
      };
      const waiters = this.waiters.get(method) || [];
      waiters.push(wrapped);
      this.waiters.set(method, waiters);
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
    wait(1500),
  ]);
  if (child.exitCode == null && !child.signalCode) child.kill("SIGKILL");
}

async function readProtocolStream(connection, handle) {
  const chunks = [];
  try {
    while (true) {
      const chunk = await connection.send("IO.read", {
        handle,
        size: 1024 * 1024,
      }, 30_000);
      if (chunk.data) {
        chunks.push(Buffer.from(chunk.data, chunk.base64Encoded ? "base64" : "utf8"));
      }
      if (chunk.eof) break;
    }
  } finally {
    await connection.send("IO.close", { handle }, 10_000).catch(() => {});
  }
  return Buffer.concat(chunks);
}

async function verifyPdf(pdfPath) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const document = await pdfjs.getDocument({ data }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => String(item.str || "")).join(" "));
  }
  const text = pages.join("\n");
  const compactText = text.replace(/\s+/g, "");
  const missingSourceIds = DEFINITIONS
    .map((definition) => definition.sourceReferenceId)
    .filter((sourceId) => !text.includes(sourceId) && !compactText.includes(sourceId));
  const forbidden = ["\\(", "\\[", "\\frac", "\\sum", "\\sqrt", "전체 렌더 검사 대기", "file:///Users/"]
    .filter((token) => text.includes(token));
  if (missingSourceIds.length > 0 || forbidden.length > 0) {
    throw new Error(
      `PDF 사후 검사 실패: 누락 source ID ${missingSourceIds.join(", ") || "0"}, 금칙 토큰 ${forbidden.join(", ") || "0"}`,
    );
  }
  return {
    pageCount: document.numPages,
    sourceIdCount: DEFINITIONS.length,
    missingSourceIds,
    forbiddenTokens: forbidden,
  };
}

async function exportPreview() {
  buildPreview();
  const output = path.resolve(option("--output", defaultOutput));
  const chrome = findChrome(option("--chrome"));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "matths-arena-pdf-"));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const child = spawn(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--allow-file-access-from-files",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });

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
    const loaded = connection.waitForEvent("Page.loadEventFired");
    await connection.send("Page.navigate", { url: pathToFileURL(previewHtml).href });
    await loaded;

    const auditResult = await connection.send("Runtime.evaluate", {
      expression: `(async () => {
        const deadline = Date.now() + 45000;
        while (!window.allProblemPreviewAuditReady && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        const audit = document.querySelector("#render-audit");
        return audit ? { ...audit.dataset, text: audit.textContent } : null;
      })()`,
      returnByValue: true,
      awaitPromise: true,
    }, 50_000);
    const audit = auditResult.result?.value;
    if (!audit || audit.invalid !== "false") {
      throw new Error(`브라우저 렌더 검사가 실패했습니다: ${JSON.stringify(audit)}`);
    }
    for (const [key, expected] of [
      ["cards", "200"],
      ["uniqueSourceIds", "200"],
      ["answers", "200"],
      ["renderedVisuals", "15"],
      ["invalidVisuals", "0"],
      ["rawTexBlocks", "0"],
      ["contiguousNumbers", "true"],
      ["mathError", "false"],
    ]) {
      if (audit[key] !== expected) {
        throw new Error(`브라우저 렌더 검사 ${key} 불일치: ${audit[key]} != ${expected}`);
      }
    }

    const merged = await PDFDocument.create();
    const chunkSize = 25;
    try {
      for (let start = 0; start < DEFINITIONS.length; start += chunkSize) {
        const end = Math.min(start + chunkSize, DEFINITIONS.length);
        await connection.send("Runtime.evaluate", {
          expression: `document.querySelectorAll(".problem-card").forEach((card, index) => { card.hidden = index < ${start} || index >= ${end}; });`,
        });
        const printed = await connection.send("Page.printToPDF", {
          printBackground: true,
          displayHeaderFooter: false,
          preferCSSPageSize: true,
          transferMode: "ReturnAsStream",
        }, 90_000);
        if (!printed.stream) throw new Error(`Chrome PDF 스트림을 받지 못했습니다 (${start + 1}-${end}).`);
        const bytes = await readProtocolStream(connection, printed.stream);
        const part = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(part, part.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      }
    } finally {
      await connection.send("Runtime.evaluate", {
        expression: `document.querySelectorAll(".problem-card").forEach((card) => { card.hidden = false; });`,
      }).catch(() => {});
    }
    fs.writeFileSync(output, await merged.save({ useObjectStreams: true }));
    const pdfAudit = await verifyPdf(output);
    process.stdout.write(`${JSON.stringify({
      output,
      bytes: fs.statSync(output).size,
      browserAudit: audit,
      pdfAudit,
    }, null, 2)}\n`);
  } catch (error) {
    fs.rmSync(output, { force: true });
    throw error;
  } finally {
    connection?.close();
    await terminate(child);
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

if (require.main === module) {
  exportPreview().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exit(1);
  });
}

module.exports = { exportPreview, verifyPdf };
