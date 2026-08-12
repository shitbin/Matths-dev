"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const view = fs.readFileSync(
  path.join(repoRoot, "views/partials/arena-revenge-overlay.ejs"),
  "utf8",
);
const css = fs.readFileSync(path.join(repoRoot, "public/css/goat-arena.css"), "utf8");
const revengeCss = css.slice(
  css.indexOf(".arena-revenge-overlay {"),
  css.indexOf(".arena-shop-heading h1"),
);

assert.doesNotMatch(view, /role="dialog"|aria-modal="true"/);
assert.doesNotMatch(view, /REVENGE WINDOW|arena-revenge-overlay__glow/);
assert.match(view, /aria-describedby="arena-revenge-description"/);
assert.match(view, />복수전 시작</);
assert.match(view, />현재 결과 확정</);
assert.doesNotMatch(revengeCss, /position:\s*fixed|backdrop-filter|linear-gradient|radial-gradient/);
assert.match(revengeCss, /background:\s*var\(--matths-action-primary\)/);

console.log("arena revenge experience contract: ok");
