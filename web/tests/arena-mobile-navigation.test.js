"use strict";

const assert = require("node:assert/strict");
const ejs = require("ejs");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const partialPath = path.join(repoRoot, "views/partials/goat-arena-navigation.ejs");
const source = fs.readFileSync(partialPath, "utf8");
const baseLocals = {
  arenaUser: {
    nickname: "학생",
    hasMainProfileBorder: false,
    hasStyleEntrance: false,
  },
  arenaNotifications: null,
  rankUpPresentation: null,
};

function render(activeArenaPage) {
  return ejs.render(
    source,
    { ...baseLocals, activeArenaPage },
    { filename: partialPath },
  );
}

const ranked = render("main");
const unranked = render("sub");
const mobileNav = ranked.match(/<nav class="arena-mobile-navigation"[\s\S]*?<\/nav>/)?.[0] || "";

assert.ok(mobileNav, "모바일 Arena 내비게이션이 렌더되지 않았습니다.");
assert.equal((mobileNav.match(/<a\b/g) || []).length, 9, "상위 3개 링크와 더보기 내부 6개 링크를 유지해야 합니다.");
assert.match(mobileNav, />홈<\/a>[\s\S]*?>경기<\/a>[\s\S]*?>순위<\/a>[\s\S]*?>더보기<\/button>/);
assert.match(ranked, /href="\/goat-arena\/main"[^>]*aria-current="page"[^>]*class="active"[^>]*>경기<\/a>/);
assert.match(unranked, /href="\/goat-arena\/sub"[^>]*aria-current="page"[^>]*class="active"[^>]*>경기<\/a>/);

const css = fs.readFileSync(path.join(repoRoot, "public/css/goat-arena.css"), "utf8");
assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.arena-mobile-navigation\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
assert.match(css, /\.arena-mobile-navigation > a,[\s\S]*?\.arena-mobile-navigation > button\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/);

const finalMobileOverride = css.lastIndexOf("@media (max-width: 560px)");
const lateTabletNavigation = css.lastIndexOf("@media (max-width: 800px)");
assert.ok(finalMobileOverride > lateTabletNavigation, "모바일 내비 숨김 규칙은 후반 800px HUD 규칙보다 뒤에 있어야 합니다.");
const finalMobileCss = css.slice(finalMobileOverride);
assert.match(finalMobileCss, /\.goat-arena-page \.arena-main-navigation\s*\{\s*display:\s*none;/);
assert.match(finalMobileCss, /\.goat-arena-page \.arena-mobile-navigation\s*\{\s*display:\s*grid;/);

const script = fs.readFileSync(path.join(repoRoot, "public/js/goat-arena-navigation.js"), "utf8");
assert.match(script, /aria-expanded/);
assert.match(script, /event\.key === "Escape"/);
assert.match(script, /restoreFocus/);

console.log("Arena mobile navigation contract passed");
