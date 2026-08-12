#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

profile="$root/Matths/ProfileScreen.swift"
auth="$root/Matths/AuthScreen.swift"
chat="$root/Matths/ChatScreen.swift"
quick="$root/Matths/QuickPracticeScreen.swift"
weekly="$root/Matths/WeeklyMockScreen.swift"

grep -Fq '.accessibilityLabel("코치 수위")' "$profile"
grep -Fq '.accessibilityLabel("복습 리마인더")' "$profile"
grep -Fq '.accessibilityLabel("화면 모션")' "$profile"
grep -Fq '.accessibilityLabel("왼손잡이 모드")' "$profile"
grep -Fq '.accessibilityLabel("AI 모델 9B 실험 모드")' "$profile"
grep -Fq '.accessibilityLabel("로그인 또는 회원가입")' "$auth"
grep -Fq '.accessibilityLabel("보고 있는 문제 연결 해제")' "$chat"
grep -Fq '.accessibilityLabel("첨부한 풀이 사진 삭제")' "$chat"
grep -Fq '.accessibilityLabel("\(label), \(value)")' "$chat"
grep -Fq '.accessibilityHint("다운로드가 끝나면 AI 튜터가 자동으로 열립니다")' "$chat"
grep -Fq '.accessibilityLabel("퀵 연습 진행, 취약 개념 문제 받기, 40초 풀이, 정답률과 평균 속도 확인")' "$quick"
grep -Fq '.accessibilityLabel("주간 공식 모의고사 진행, 회차 응시, 전국 기준 환산, 이번 주 대표 결과 확정")' "$weekly"

echo "Native settings, auth, tutor, and guest journey accessibility labels passed"
