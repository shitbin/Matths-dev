#!/bin/bash
# 로컬 부정행위 판정의 JSON·좌표·강한 근거 승격 규칙을 앱 밖에서 빠르게 검증한다.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$HERE/.."
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cp "$APP/Matths/CheatingDetectionModels.swift" "$WORK/"
cp "$APP/Matths/CheatingReviewModels.swift" "$WORK/"
cp "$HERE/CheatingDetectionCases.swift" "$WORK/main.swift"
swiftc -parse-as-library -O \
  "$WORK/CheatingDetectionModels.swift" "$WORK/CheatingReviewModels.swift" "$WORK/main.swift" \
  -o "$WORK/check"
"$WORK/check"
