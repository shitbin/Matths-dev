#!/bin/bash
# Release 빌드 출시 전 검증 — 백로그 L-4 를 사람이 눈으로 보는 대신 기계가 막는다.
#
#   bash ipad-app/verify-release.sh
#
# 무엇을 막는가
#  1) 비밀정보가 바이너리에 섞여 나가는 것 (DB 문자열·SECRET·API 키).
#     원칙: 앱은 서버 API 만 부른다. 이 원칙이 깨지면 앱을 뜯는 누구나 DB 를 연다.
#  2) DEBUG 전용 통로가 출시판에 남는 것 (서버 주소 입력 필드·기록 보기·런치 인자).
#     특히 서버 주소 필드는 학생이 속아 임의 서버에 계정·토큰을 보내는 통로가 된다.
#  3) **임시 터널 주소로 출시되는 것.** trycloudflare/ngrok 호스트는 수명이 짧고,
#     터널이 죽으면 그 이름을 남이 다시 잡을 수 있다. 그 상태로 출시된 앱은
#     학생 로그인 정보를 모르는 서버로 보낸다. 정식 도메인으로 바꾼 뒤 출시한다.
#     ※ 이 검사(소스의 defaultURL 선언 기준)는 Xcode 타깃의 "Release 서버 주소 게이트"
#     Run Script 페이즈가 Release 빌드마다 자동으로도 수행한다 — 사람이 이 스크립트를
#     잊어도 빌드가 먼저 실패한다. 여기서는 최종 바이너리를 사후 감사(다층 방어)한다.
#
# 함정 12(Release 검증 후 Debug 로 되돌리기)를 피하려고 파생 데이터를 따로 쓴다.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
DD="${DD:-/tmp/matths-rel}"
APP="$DD/Build/Products/Release-iphoneos/Matths.app"
BIN="$APP/Matths"

# macOS `strings` 는 기본 설정에서 UTF-8 한글을 출력하지 않을 수 있다.
# 출시 바이너리 원문을 C locale 의 고정 바이트열로 직접 검색해 한글 DEBUG 문구도 잡는다.
count_fixed_bytes() { # 바이너리, 검색할 고정 문자열
  LC_ALL=C grep -aF -o -- "$2" "$1" 2>/dev/null | wc -l | tr -d '[:space:]'
}

binary_scanner_self_test() {
  local fixture marker detected
  marker="개발 서버 미리보기 코드"
  fixture="$(mktemp "${TMPDIR:-/tmp}/matths-release-scanner.XXXXXX")" || return 1
  # 실제 Mach-O 처럼 NUL 바이트 사이에 UTF-8 문자열이 있어도 탐지해야 한다.
  printf '\000release-prefix\000%s\000release-suffix\000' "$marker" > "$fixture"
  detected="$(count_fixed_bytes "$fixture" "$marker")"
  rm -f -- "$fixture"
  [ "$detected" -eq 1 ]
}

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "▶ Release 빌드…"
  xcodebuild -project "$HERE/Matths.xcodeproj" -scheme Matths -configuration Release \
    -destination 'generic/platform=iOS' -derivedDataPath "$DD" \
    -allowProvisioningUpdates build 2>&1 | grep -E "error:|BUILD" | tail -3
fi

[ -f "$BIN" ] || { echo "✗ Release 바이너리가 없다: $BIN"; exit 2; }

if binary_scanner_self_test; then
  echo "✓ Release 바이너리 스캐너 양성 대조 통과"
else
  echo "✗ Release 바이너리 스캐너가 UTF-8 양성 대조를 탐지하지 못했다"
  exit 3
fi

fail=0
report() { # 이름, 개수, 기대(0)
  if [ "$2" -eq 0 ]; then printf "  ✓ %-26s 없음\n" "$1"
  else printf "  ✗ %-26s %s건 발견\n" "$1" "$2"; fail=$((fail+1)); fi
}

echo
echo "[1/4] 비밀정보"
for s in "mongodb" "mongodb+srv" "API_TOKEN_SECRET" "EMAIL_API_KEY" "SECRET="; do
  report "$s" "$(count_fixed_bytes "$BIN" "$s")"
done

echo
echo "[2/4] DEBUG 전용 통로"
# "개발 서버 미리보기 코드": 비밀번호 재설정 코드를 화면에 그대로 보여주는 개발 편의 문구.
# 출시판에 남으면 운영 서버가 메일 키를 잃는 순간 계정 탈취 통로가 된다 — #if DEBUG 회귀를 기계로 잡는다.
for s in "서버 주소 (개발용)" "기록 보기 (디버그)" "채점 기록 · 디버그" \
         "개발 서버 미리보기 코드" \
         "-fakeAnalysis" "-fakeTrace" "-proReport"; do
  report "$s" "$(count_fixed_bytes "$BIN" "$s")"
done

echo
echo "[3/4] 서버 주소"
hosts=$(strings "$BIN" | grep -oE "https://[a-zA-Z0-9._/-]+" | grep -v "huggingface.co" | sort -u)
if [ -z "$hosts" ]; then
  echo "  ✗ API 주소가 하나도 없다 — 빌드가 잘못됐다"; fail=$((fail+1))
else
  while IFS= read -r h; do
    case "$h" in
      *trycloudflare.com*|*ngrok*|*loca.lt*|*localhost*|*127.0.0.1*)
        echo "  ✗ 임시/로컬 주소로 출시하려 한다: $h"
        echo "     → ServerAPI.defaultURL 을 정식 도메인으로 바꾼 뒤 다시 돌려라 (백로그 L-3)."
        fail=$((fail+1)) ;;
      *) echo "  ✓ $h" ;;
    esac
  done <<< "$hosts"
fi

echo
echo "[4/4] 앱 아이콘"
# 앱스토어는 **알파 채널이 있는 1024 아이콘을 거부한다**
# ("Invalid large app icon … can't be transparent or contain an alpha channel").
# 실제로 이 저장소의 아이콘 두 장에 모서리 라운딩 때문에 투명 픽셀이 있었다
# (2026-07-29). 업로드하고 나서야 알게 되면 제출이 한 판 통째로 밀린다.
ICONSET="Matths/Assets.xcassets/AppIcon.appiconset"
if [ -d "$ICONSET" ]; then
  for png in "$ICONSET"/*.png; do
    [ -e "$png" ] || continue
    mode=$(python3 -c "from PIL import Image;im=Image.open('$png');print(im.mode,im.size[0])" 2>/dev/null || echo "?")
    case "$mode" in
      RGBA*|LA*|PA*)
        echo "  ✗ $(basename "$png") 에 알파 채널이 있다 — 업로드가 거부된다"
        echo "     → 배경색 위로 평탄화해 RGB 로 저장하라"
        fail=$((fail+1)) ;;
      "?") echo "  · $(basename "$png") 검사 건너뜀 (Pillow 없음)" ;;
      *)  echo "  ✓ $(basename "$png") ($mode)" ;;
    esac
  done
else
  echo "  ✗ AppIcon.appiconset 이 없다"; fail=$((fail+1))
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "✅ Release 바이너리 감사 통과 — 서명 아카이브·자산 카탈로그·App Store 제출은 별도 검증"
else
  echo "❌ 실패 $fail 건 — 위 항목을 고치기 전에는 출시하지 마라"
fi
exit "$fail"
