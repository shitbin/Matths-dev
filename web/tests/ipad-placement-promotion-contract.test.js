"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  buildPlacementPresentation,
} = require("../controllers/ipadPlacementController");
const { resolveIpadRoot } = require("../scripts/resolveIpadWorkspace");

const root = path.resolve(__dirname, "..");
const ipadRoot = resolveIpadRoot(root);
const placementSource = fs.readFileSync(
  path.join(ipadRoot, "Matths/PlacementExamScreen.swift"),
  "utf8",
);
const appSource = fs.readFileSync(
  path.join(ipadRoot, "Matths/MatthsApp.swift"),
  "utf8",
);
const badgeSource = fs.readFileSync(
  path.join(ipadRoot, "Matths/RankBadge.swift"),
  "utf8",
);

const tiers = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "emerald",
  "diamond",
  "master",
  "grandmaster",
  "challenger",
];

const presentation = buildPlacementPresentation(
  { tierCode: "GOLD", tierLabel: "골드" },
  "attempt-123",
);
assert.deepEqual(presentation, {
  id: "placement-attempt-123",
  kind: "placement",
  tierCode: "GOLD",
  tierLabel: "골드",
});
assert.equal(buildPlacementPresentation(null, "attempt-123"), null);

assert.match(placementSource, /Text\("배치 완료"\)/);
assert.doesNotMatch(placementSource, /PLACEMENT COMPLETE/);
assert.match(
  placementSource,
  /showResult[\s\S]*store\.presentRankPromotion\([\s\S]*presentationId:\s*presentation\.id/,
  "서버가 발급한 배치 공개 이벤트가 전체 화면 휘장 표시로 이어져야 합니다.",
);
assert.match(
  appSource,
  /\.overlay\s*\{[\s\S]*RankPromotionOverlay\s*\(\s*tierCode:\s*store\.rankPromotionPresentation\?\.tierCode\s*\)/,
  "배치 공개 이벤트는 앱 최상단 전체 화면 오버레이로 표시해야 합니다.",
);
assert.match(
  appSource,
  /RankPromotionOverlay[\s\S]*(?:\.screenProtectionLayer\(guardModel:\s*screenshotGuard\)|\.overlay\s*\{[\s\S]*screenshotGuard\.isCaptureActive)/,
  "화면 캡처·앱 전환 privacy cover는 승급 장식보다 위에 있어야 합니다.",
);
assert.match(badgeSource, /private func playTierSound\(\)/);
assert.match(badgeSource, /preparedSoundPlayer\(for:\s*tier\)/);
assert.match(badgeSource, /AVAudioPlayer\(data:/);
assert.match(badgeSource, /session\.setCategory\(\.ambient/);
assert.match(badgeSource, /player\.volume\s*=\s*0[\s\S]*player\.play\(\)[\s\S]*player\.stop\(\)/);
assert.match(badgeSource, /RankPromotionPipelinePrewarmView/);
assert.match(badgeSource, /subdirectory:\s*"RankSounds"/);

for (const tier of tiers) {
  const sound = path.join(
    ipadRoot,
    `Matths/RankSounds/rank-sfx-${tier}.m4a`,
  );
  const assetDirectory = path.join(
    ipadRoot,
    `Matths/RankBadges/MechanicalV5/${tier}`,
  );
  assert.ok(fs.statSync(sound).size > 0, `${tier} 효과음이 비어 있습니다.`);
  assert.ok(
    fs.readdirSync(assetDirectory).some((name) => name.endsWith(".png")),
    `${tier} 기계식 레이어 자산이 없습니다.`,
  );
}

console.log("placement result opens the 9-tier full-screen motion and sound contract");
