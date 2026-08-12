#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
work=$(mktemp -d /tmp/matths-release-binary-scanner.XXXXXX)
trap 'rm -rf "$work"' EXIT

app="$work/Build/Products/Release-iphoneos/Matths.app"
binary="$app/Matths"
mkdir -p "$app"

# 음성 대조: 정식 API 주소만 든 바이너리는 감사에 통과해야 한다.
printf '\000release-prefix\000%s\000release-suffix\000' \
  'https://matths.kr/api/v1' > "$binary"
clean_output=$(cd "$root" && SKIP_BUILD=1 DD="$work" bash ./verify-release.sh 2>&1)
printf '%s\n' "$clean_output" | grep -Fq 'Release 바이너리 스캐너 양성 대조 통과'
printf '%s\n' "$clean_output" | grep -Fq 'Release 바이너리 감사 통과'

# 양성 대조: NUL 사이의 UTF-8 한글 DEBUG 표식을 실제 감사기가 거부해야 한다.
printf '\000%s\000' '개발 서버 미리보기 코드' >> "$binary"
set +e
positive_output=$(cd "$root" && SKIP_BUILD=1 DD="$work" bash ./verify-release.sh 2>&1)
positive_exit=$?
set -e

if [ "$positive_exit" -eq 0 ]; then
  echo '한글 DEBUG 표식이 든 Release 바이너리가 감사를 통과했습니다.' >&2
  exit 1
fi
printf '%s\n' "$positive_output" | grep -Fq '개발 서버 미리보기 코드'
printf '%s\n' "$positive_output" | grep -Fq '1건 발견'
printf '%s\n' "$positive_output" | grep -Fq '실패 1 건'

echo 'iPad Release binary scanner contract passed'
