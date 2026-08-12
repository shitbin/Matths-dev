#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
coach="$root/Matths/CoachEngine.swift"
tutor="$root/Matths/AITutor.swift"
chat="$root/Matths/ChatScreen.swift"
messages="$root/Matths/coach-messages.json"

grep -Fq 'case mild, spicy, silent' "$coach"
! grep -Eq '\.hell|지옥맛|손은 장식|덜 한심|인간으로 복구|코치 빡침|카롤리나 리퍼| SHU' "$coach"
! grep -Eq 'case \.hell|강하게 도발' "$tutor"
grep -Fq '학습 온도 · 안정' "$coach"
grep -Fq '극한의 뜻을 그래프로 설명해줘' "$chat"
grep -Fq '이 풀이에서 처음 틀린 단계를 찾아줘' "$chat"

node - "$messages" <<'NODE'
const fs = require('node:fs');
const file = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const modes = Object.keys(file.modes).sort();
if (JSON.stringify(modes) !== JSON.stringify(['mild', 'silent', 'spicy'])) {
  throw new Error(`코치 모드 정본 불일치: ${modes.join(', ')}`);
}
for (const [mode, value] of Object.entries(file.modes)) {
  for (const key of ['correct', 'incorrect', 'unanswered']) {
    if (!Array.isArray(value.messages[key]) || value.messages[key].length < 1) {
      throw new Error(`${mode}.${key} 문구가 비었습니다.`);
    }
  }
}
NODE

echo "Coach mode parity and minor-safe copy contract passed"
