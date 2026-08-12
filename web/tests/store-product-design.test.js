"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const root = path.resolve(__dirname, "..");

async function render(product) {
  return ejs.renderFile(path.join(root, "views/store-product.ejs"), {
    user: { name: "테스트 학생" },
    categories: ["교재"],
    product,
  });
}

async function run() {
  const product = {
    id: "product-1",
    slug: "common-math",
    name: "공통수학 실전 교재",
    subtitle: "개념을 실전 문제로 연결합니다.",
    summary: "학습 목표와 포함 자료를 확인하세요.",
    category: "교재",
    badge: "추천 교재",
    price: 19000,
    originalPrice: 22000,
    thumbnail: null,
    assets: [],
    freeDownloadFiles: [],
    bundleItems: [],
    detailBlocks: [],
  };

  const html = await render(product);
  const stylesheet = fs.readFileSync(path.join(root, "public/css/store.css"), "utf8");

  assert.match(html, /src="\/images\/brand\/matths-logo\.svg"/);
  assert.doesNotMatch(html, />\s*MATTHS\s*</);
  assert.match(html, /현재는 상품 정보만 확인할 수 있습니다/);
  assert.match(html, /구매가 열리기 전에는 결제나 주문이 발생하지 않습니다/);
  assert.match(html, /role="status"/);
  assert.doesNotMatch(html, /disabled[^>]*>결제 기능 준비 중/);
  assert.match(stylesheet, /\.store-product-hero\s*\{[\s\S]*var\(--matths-surface\)/);
  assert.match(stylesheet, /\.store-detail-cover-fallback \.brand-logo\s*\{/);
  assert.match(stylesheet, /\.store-purchase-status\s*\{[\s\S]*var\(--matths-action-primary\)/);

  console.log("store product identity and unavailable-purchase contract passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
