#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/Matths/RankBadge.swift"
APP_SOURCE="$ROOT/Matths/MatthsApp.swift"
VIDEO_SOURCE="$ROOT/Matths/RankPromotionVideo.swift"

grep -Fq 'import ImageIO' "$SOURCE"
grep -Fq 'RankBadgeAssets.prewarmPromotion(tier: requestedTier)' "$SOURCE"
grep -Fq 'RankTier.allCases.enumerated()' "$SOURCE"
grep -Fq 'prewarmPromotionVisuals(tier: tier)' "$SOURCE"
grep -Fq 'PromotionVisualReadiness: @unchecked Sendable' "$SOURCE"
grep -Fq 'promotionVisualReadiness.contains(tier) && preparedPlayers[tier] != nil' "$SOURCE"
grep -Fq 'if RankBadgeAssets.isPromotionPrepared(tier: requestedTier)' "$SOURCE"
grep -Fq '.opacity(isPresented ? 1 : 0.001)' "$SOURCE"
grep -Fq '.allowsHitTesting(isPresented)' "$SOURCE"
grep -Fq '.accessibilityHidden(!isPresented)' "$SOURCE"
grep -Fq 'guard isPresented else { return }' "$SOURCE"
grep -Fq 'RankPromotionVideoPlayer(' "$SOURCE"
grep -Fq 'Button("건너뛰기")' "$SOURCE"
grep -Fq '.accessibilityLabel("승급 모션 건너뛰기")' "$SOURCE"
grep -Fq 'if useVideo { return }' "$SOURCE"
grep -Fq 'playerLayer.videoGravity = .resizeAspect' "$VIDEO_SOURCE"
grep -Fq 'player.isMuted = !motionActive' "$VIDEO_SOURCE"
grep -Fq 'CMTime(seconds: 5.7' "$VIDEO_SOURCE"
grep -Fq '.AVPlayerItemDidPlayToEndTime' "$VIDEO_SOURCE"
grep -Fq '.id("rank-pipeline-prewarm-\(tier.rawValue)")' "$SOURCE"
grep -Fq '.allowsHitTesting(false)' "$SOURCE"
grep -Fq '.accessibilityHidden(true)' "$SOURCE"
grep -Fq 'audioPlaybackSuppressed' "$SOURCE"
grep -Fq 'rank-promotion-pipeline-prewarm.json' "$SOURCE"
grep -Fq 'kCGImageSourceShouldCacheImmediately: true' "$SOURCE"
grep -Fq 'kCGImageSourceThumbnailMaxPixelSize: 1152' "$SOURCE"
grep -Fq '.disabled(!assetsReady)' "$SOURCE"
grep -Fq 'if isPresented { prepareTierAndPlay() }' "$SOURCE"
grep -Fq 'tierCode: store.rankPromotionPresentation?.tierCode' "$APP_SOURCE"
if grep -Fq 'if let presentation = store.rankPromotionPresentation' "$APP_SOURCE"; then
  echo "승급 overlay host가 presentation마다 다시 mount됩니다" >&2
  exit 1
fi

if grep -Fq 'UIImage(contentsOfFile: url.path)' "$SOURCE"; then
  echo "승급 PNG가 첫 프레임에서 지연 디코딩될 수 있습니다" >&2
  exit 1
fi

while read -r expected_hash filename; do
  asset="$ROOT/Matths/RankMotion/$filename"
  test -f "$asset"
  test "$(stat -f %z "$asset")" -gt 1000000
  test "$(shasum -a 256 "$asset" | awk '{print $1}')" = "$expected_hash"
done <<'HASHES'
86206344b96bd1b9ebeaf66078c49d45b70c9a0cedf9d42401dce51a7441743d bronze-rank-up.v6.mp4
04b5c3d4b6cfd9354e247c9fc4df90ae89808bbad6536f079f666f9e531d5526 silver-rank-up.v6.mp4
79a55282c52100294c04be86e08baa90e9e7c88266c542b4e575f59d51e36fc8 gold-rank-up.v6.mp4
c5586ebd29c8ec9b579013329df72971c23e63ac00f42afde19f219c42f0bbc8 platinum-rank-up.v7.mp4
c24b825b2fd7079f01b4ff0ed8bcde465bea590ac8bc8f67a82d4b94d56b3b30 emerald-rank-up.v6.mp4
5b107162d1366f2f7406c2e75c0a0f02194a2677e203005b91be755c5690870a diamond-rank-up.v6.mp4
b446d1cec5b332e7373ba10085342a1c1f6123e9a731f32cc92fc75322bc5f8b master-rank-up.v6.mp4
e5385e44304a3aa7211eee34148229ee4ebccbdf7705961e6dc3656e00b7cb6e grandmaster-rank-up.v6.mp4
6872dae1cd44e78e3c829dce7d5627eb7d80112240c22165e961e77423dc9ecf challenger-rank-up.v12.mp4
HASHES

echo "승급 모션 자산 사전 디코딩 계약 통과"
