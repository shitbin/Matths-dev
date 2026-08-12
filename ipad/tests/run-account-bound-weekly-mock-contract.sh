#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
api="$ROOT/Matths/WeeklyMockAPI.swift"
screen="$ROOT/Matths/WeeklyMockScreen.swift"

# 시험지 다운로드 완료 시점의 전역 계정이 아니라 요청 시작 계정 캐시에 쓴다.
grep -Fq 'downloadWeeklyMockPaper(' "$api"
grep -Fq 'accountSlot: String' "$api"
grep -Fq '.appendingPathComponent(accountSlot, isDirectory: true)' "$api"
grep -Fq 'accountSlot: accountSlot)' "$screen"

# 소명 제출은 계정·사건별 동일 키를 응답 확인 전까지 보존한다.
grep -Fq 'submissionId: String' "$api"
grep -Fq 'request.setValue(submissionId, forHTTPHeaderField: "Idempotency-Key")' "$api"
grep -Fq 'WeeklyMockEvidenceCommandStore.loadOrCreate' "$screen"
grep -Fq 'WeeklyMockEvidenceCommandStore.clear' "$screen"
grep -Fq 'DataScope.defaultsKey(' "$screen"

# 화면 인스턴스도 계정 전환 알림을 받아 이전 학생의 비동기 상태를 폐기한다.
grep -Fq 'DataScope.didSwitchNotification' "$screen"
grep -Fq '.id(accountSlot)' "$screen"

echo 'Account-bound weekly mock download and evidence contracts passed.'
