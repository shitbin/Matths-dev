#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="$ROOT/Matths/CommerceAPI.swift"
HUB="$ROOT/Matths/CommerceHubScreen.swift"
APP="$ROOT/Matths/MatthsApp.swift"
ROOT_VIEW="$ROOT/Matths/RootView.swift"
PROFILE="$ROOT/Matths/ProfileScreen.swift"
ARENA="$ROOT/Matths/GoatArenaScreen.swift"

for file in "$API" "$HUB" "$APP" "$ROOT_VIEW" "$PROFILE" "$ARENA"; do
  test -f "$file" || { echo "missing commerce source: $file" >&2; exit 1; }
done

grep -q '"/api/v1/commerce/storefront"' "$API"
grep -q '"/api/v1/commerce/handoffs"' "$API"
grep -q 'authed: true' "$API"

grep -q 'import SafariServices' "$HUB"
grep -q 'SFSafariViewController' "$HUB"
grep -q 'url.scheme == "https"' "$HUB"
grep -q 'ServerAPI.baseURL.host' "$HUB"
grep -q 'url.path.hasPrefix("/app/commerce/")' "$HUB"
grep -q '#if DEBUG' "$HUB"
grep -q 'mode: "parent-request"' "$HUB"
grep -q 'mode: "self"' "$HUB"
grep -q 'Ranked 상점은.*서로 다른 지갑' "$HUB"
grep -q 'access.rankedShopAvailable' "$HUB"
grep -q 'store.route = \.arenaShop' "$HUB"
grep -q 'store.route = \.rank' "$HUB"

grep -q 'case .*commerce' "$APP"
grep -q 'store.route == \.commerce' "$ROOT_VIEW"
grep -q 'CommerceHubScreen()' "$ROOT_VIEW"
grep -q 'store.route = \.commerce' "$PROFILE"
grep -q 'Text("이용권과 상점")' "$PROFILE"
grep -q 'store.route = \.commerce' "$ARENA"
grep -q 'Label("상점·이용권"' "$ARENA"
grep -q 'Label("이용권과 상점 보기"' "$ARENA"

# 정액 결제와 Ranked 학습일 상점은 한 화면에서 설명하되, 앱에서 가격·
# 경기 규칙을 새로 정의하지 않는다. 서버 storefront/shop 응답만 표시해야 한다.
if grep -Eq 'priceDays[[:space:]]*=[[:space:]]*[0-9]|stakeDays[[:space:]]*=[[:space:]]*[0-9]' "$HUB"; then
  echo "commerce hub must not hard-code Arena economy values" >&2
  exit 1
fi

echo "iPad commerce hub and browser handoff contract passed"
