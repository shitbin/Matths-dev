"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const viewsRoot = path.join(repoRoot, "views");
const voidElements = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
  "meta", "param", "source", "track", "wbr",
]);
const liveRegionClasses = [
  "admin-feedback",
  "admin-operation-feedback",
  "archive-feedback",
  "arena-account-feedback",
  "arena-supplemental-feedback",
  "community-feedback",
  "nickname-form-error",
  "objection-feedback",
  "private-mock-submit-error",
  "store-admin-feedback",
  "suggestion-alert",
];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function maskEjs(source, replacement = " ") {
  return source.replace(/<%[\s\S]*?%>/g, (match) => replacement.repeat(match.length));
}

const failures = [];
const templates = walk(viewsRoot).filter((file) => file.endsWith(".ejs"));

templates.forEach((file) => {
  const relative = path.relative(repoRoot, file);
  const raw = fs.readFileSync(file, "utf8");
  const source = maskEjs(raw);

  if (/<!doctype html>/i.test(raw)) {
    const directSkipLinks = [...raw.matchAll(
      /<a\b[^>]*class=["'][^"']*(?:skip-link|arena-skip-link|legal-skip)[^"']*["'][^>]*href=["']#([^"']+)["'][^>]*>/gi,
    )];
    const usesCommonSkipLink =
      /partials\/(?:public-navigation|admin-navigation|parent-navigation)/.test(raw);
    if (directSkipLinks.length === 0 && !usesCommonSkipLink) {
      failures.push(`${relative}: 문서 첫 진입용 본문 바로가기 누락`);
    }
    directSkipLinks.forEach((match) => {
      const escaped = match[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`\\bid=["']${escaped}["']`).test(source)) {
        failures.push(`${relative}: 본문 바로가기 대상 #${match[1]} 누락`);
      }
    });
  }

  for (const match of source.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt\s*=/.test(match[0])) {
      failures.push(`${relative}:${lineAt(source, match.index)} 이미지 alt 속성 누락`);
    }
  }

  const labels = [...source.matchAll(/<label\b([^>]*)>/gi)]
    .map((match) => (match[1].match(/\bfor\s*=\s*["']([^"']+)/i) || [])[1])
    .filter(Boolean);
  const stack = [];
  const tagPattern = /<\/?([a-z][\w:-]*)\b[^>]*>/gi;
  let tagMatch;

  while ((tagMatch = tagPattern.exec(source))) {
    const tag = tagMatch[0];
    const name = tagMatch[1].toLowerCase();
    const closing = tag.startsWith("</");

    if (closing) {
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        if (stack[index] === name) {
          stack.splice(index);
          break;
        }
      }
      continue;
    }

    if (["input", "select", "textarea"].includes(name)) {
      const type = (tag.match(/\btype\s*=\s*["']?([^\s"'>]+)/i) || [])[1] || "";
      if (!/^(hidden|submit|button|reset)$/i.test(type)) {
        const id = (tag.match(/\bid\s*=\s*["']([^"']+)/i) || [])[1];
        const hasAccessibleName =
          /\b(aria-label|aria-labelledby|title)\s*=/.test(tag) ||
          stack.includes("label") ||
          (id && labels.includes(id));
        if (!hasAccessibleName) {
          failures.push(
            `${relative}:${lineAt(source, tagMatch.index)} ${name} 접근 가능한 이름 누락`,
          );
        }
      }
    }

    if (!voidElements.has(name) && !tag.endsWith("/>")) stack.push(name);
  }

  const dynamicSource = maskEjs(raw, "DYNAMIC");
  ["button", "a"].forEach((name) => {
    const pattern = new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)<\\/${name}>`, "gi");
    let match;
    while ((match = pattern.exec(dynamicSource))) {
      if (/\b(aria-label|aria-labelledby|title)\s*=/.test(match[1])) continue;
      const accessibleText = match[2]
        .replace(/<[^>]*aria-hidden=["']true["'][^>]*>[\s\S]*?<\/[^>]+>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&\w+;|&#\d+;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!accessibleText) {
        failures.push(
          `${relative}:${lineAt(dynamicSource, match.index)} ${name} 접근 가능한 이름 누락`,
        );
      }
    }
  });

  for (const match of source.matchAll(/<(div|p|section)\b[^>]*>/gi)) {
    const isFeedback = liveRegionClasses.some((className) =>
      new RegExp(`class=["'][^"']*\\b${className}\\b`).test(match[0]),
    );
    if (isFeedback && !/\b(role|aria-live)\s*=/.test(match[0])) {
      failures.push(
        `${relative}:${lineAt(source, match.index)} 상태·오류 알림의 live region 누락`,
      );
    }
  }
});

[
  ["public-navigation.ejs", "public-navigation-end"],
  ["admin-navigation.ejs", "admin-navigation-end"],
  ["parent-navigation.ejs", "parent-navigation-end"],
].forEach(([partial, target]) => {
  const source = fs.readFileSync(path.join(viewsRoot, "partials", partial), "utf8");
  assert.match(source, new RegExp(`href=["']#${target}["']`));
  assert.match(source, new RegExp(`id=["']${target}["']`));
});

assert.deepEqual(
  failures,
  [],
  `웹 접근성 정적 계약 위반:\n${failures.map((failure) => `- ${failure}`).join("\n")}`,
);

console.log(`web accessibility contract: ${templates.length} templates ok`);
