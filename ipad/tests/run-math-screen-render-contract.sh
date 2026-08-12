#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
shop="$root/Matths/ArenaShopScreen.swift"

for field in 'question.prompt' 'question.solution' 'step.explanation'; do
  if grep -Eq "Text\\($field\\)" "$shop"; then
    echo "경기 상세 분석에서 $field 수식을 일반 Text로 표시하면 안 됩니다." >&2
    exit 1
  fi
done

# 줄번호는 기능 코드가 앞에 추가될 때마다 밀린다. 분석 화면 타입의 실제 본문만
# 잘라 검사해 unrelated MathInline이 통과시키거나 정상 리팩터링이 깨지지 않게 한다.
analysis_body=$(sed -n \
  '/private struct ArenaShopAnalysisScreen: View {/,/private struct ArenaShopAnalysisPreview: View {/p' \
  "$shop")
math_inline_count=$(printf '%s\n' "$analysis_body" | grep -c 'MathInline(')
if [ "$math_inline_count" -lt 4 ]; then
  echo "경기 문제·답·정답·해설·단계의 수식 조판 경계가 빠졌습니다." >&2
  exit 1
fi

grep -Fq 'MathText.containsMath(text)' "$root/Matths/MathLabel.swift"
grep -Fq 'WebContentAccessibility.configure(web)' "$root/Matths/MathLabel.swift"

echo "student-facing Arena analysis math rendering contract passed"
