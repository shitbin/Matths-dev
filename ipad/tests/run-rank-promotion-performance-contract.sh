#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/Matths/RankBadge.swift"

grep -Fq 'import ImageIO' "$SOURCE"
grep -Fq 'RankBadgeAssets.prewarmPromotion(tier: requestedTier)' "$SOURCE"
grep -Fq 'kCGImageSourceShouldCacheImmediately: true' "$SOURCE"
grep -Fq 'kCGImageSourceThumbnailMaxPixelSize: 1152' "$SOURCE"
grep -Fq '.disabled(!assetsReady)' "$SOURCE"
grep -Fq '.onAppear { prepareTierAndPlay() }' "$SOURCE"

if grep -Fq 'UIImage(contentsOfFile: url.path)' "$SOURCE"; then
  echo "승급 PNG가 첫 프레임에서 지연 디코딩될 수 있습니다" >&2
  exit 1
fi

echo "승급 모션 자산 사전 디코딩 계약 통과"
