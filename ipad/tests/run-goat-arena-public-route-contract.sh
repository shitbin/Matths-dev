#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
rank="$root/Matths/RankArenaScreen.swift"
arena="$root/Matths/GoatArenaScreen.swift"
evidence="$root/Matths/GoatArenaEvidencePanel.swift"
shop="$root/Matths/ArenaShopScreen.swift"
placement="$root/Matths/PlacementExamScreen.swift"

grep -Fq 'appendingPathComponent("goat-arena")' "$rank"
grep -Fq '웹 GOAT Arena에서 확인' "$rank"
# 로그인 전 공개 랭킹은 웹 경로를 유지한다. 로그인 뒤 주문 상태는 앱의 Bearer
# 세션과 웹 쿠키를 안전하게 잇는 commerce handoff 화면으로 들어가야 한다.
grep -Fq 'store.route = .commerce' "$arena"
grep -Fq 'Label("이용권과 상점 보기"' "$arena"

if grep -Eiq 'war of goat|war-of-masters|warOfGoatLink' "$rank" "$arena"; then
  echo "iPad 사용자 Arena 화면에 폐기된 이름이나 구형 웹 경로가 남아 있습니다." >&2
  exit 1
fi

if grep -Eq 'TWO AXES|SKILL MMR|ARENA POSITION|SERVER DEADLINES|SOLUTION EVIDENCE|SEALED MATCH REVIEW|GOAT ARENA ENTRY|SKILL CHECK' \
  "$arena" "$evidence" "$shop" "$placement"; then
  echo "iPad 사용자 Arena 화면에 뜻이 불분명한 장식용 영문 라벨이 남아 있습니다." >&2
  exit 1
fi

if grep -Fq 'Text(attempt?.phase == "verification" ? "SKILL CHECK" : "PLACEMENT")' "$placement"; then
  echo "배치고사 상단에 폐기한 영문 상태 라벨이 남아 있습니다." >&2
  exit 1
fi

echo "iPad GOAT Arena public route contract passed"
