"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const tokens = fs.readFileSync(
  path.join(repoRoot, "public/css/matths-brand-tokens.css"),
  "utf8",
);
const brand = fs.readFileSync(
  path.join(repoRoot, "public/css/brand.css"),
  "utf8",
);
const touchSection = tokens.slice(
  tokens.indexOf("iPad·모바일에서 실제로 누르는"),
  tokens.indexOf("전역 모션 가드"),
);

assert.match(
  brand,
  /@import url\("\/css\/matths-brand-tokens\.css"\)/,
  "공통 브랜드 CSS는 조작 영역 정본을 불러와야 합니다.",
);
assert.match(
  tokens,
  /:where\(button, \[role="button"\]\)[\s\S]*?min-inline-size:\s*44px\s*!important[\s\S]*?min-block-size:\s*44px\s*!important/,
  "버튼은 페이지별 작은 선언보다 우선하는 44×44px 조작 영역을 가져야 합니다.",
);
assert.match(
  tokens,
  /input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\):not\(\[type="hidden"\]\)[\s\S]*?select,[\s\S]*?summary[\s\S]*?min-block-size:\s*44px\s*!important/,
  "입력·선택·접기 조작은 44px 높이를 가져야 합니다.",
);
assert.doesNotMatch(
  touchSection,
  /:where\(a(?:,|\))/,
  "문장 안의 일반 링크까지 블록 조작 영역으로 강제하면 읽기 흐름이 깨집니다.",
);

console.log("web interaction size contract: ok");
