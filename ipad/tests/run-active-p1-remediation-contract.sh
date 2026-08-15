#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
app="$root/Matths/MatthsApp.swift"
auth="$root/Matths/AuthScreen.swift"
tokens="$root/Matths/DesignTokens.swift"
screens="$root/Matths/Screens.swift"
canvas="$root/Matths/SolutionCanvas.swift"
weekly="$root/Matths/WeeklyMockScreen.swift"

# 오답 검색·필터·펼침은 라우트 View 수명보다 긴 AppStore가 소유한다.
for field in wrongNoteExpanded wrongNoteFilterUnit wrongNoteFilterError wrongNoteQuery wrongNoteSortKey; do
  grep -Fq "@Published var $field" "$app"
done
if sed -n '/struct WrongNotesScreen/,/struct WrongNoteRow/p' "$screens" \
  | grep -Eq '@State private var (expanded|filterUnit|filterError|query|sortKey)'; then
  echo "WrongNotesScreen에 라우트 교체 시 사라지는 필터 상태가 남았습니다." >&2
  exit 1
fi

# 버튼 disabled 외형과 AA 상태 잉크.
grep -Fq '@Environment(\.isEnabled) private var isEnabled' "$tokens"
grep -Fq 'static let dangerInk' "$tokens"
grep -Fq 'isEnabled ? Tokens.actionPrimary : Tokens.line' "$tokens"

# 입력 자동완성·OTP·약관 원문·키보드 닫기.
grep -Fq '.textContentType(mode == .register ? .newPassword : .password)' "$auth"
grep -Fq '.textContentType(.oneTimeCode)' "$auth"
grep -Fq 'ToolbarItemGroup(placement: .keyboard)' "$auth"
grep -Fq 'destination: ServerAPI.baseURL.appendingPathComponent("terms")' "$auth"
grep -Fq 'destination: ServerAPI.baseURL.appendingPathComponent("privacy")' "$auth"
grep -Fq '.scrollDismissesKeyboard(.interactively)' "$weekly"
grep -Fq '.frame(width: 36, height: 44)' "$weekly"
grep -Fq '.frame(maxWidth: 140, minHeight: 44)' "$weekly"

# 권한 재동기화와 ViewThatFits 후보 교체 후 필기 도구 상태 보존.
grep -Fq 'func refreshNotificationAuthorization() async' "$app"
grep -Fq 'await store.refreshNotificationAuthorization()' "$app"
grep -Fq '@Binding var undoStack: [PKDrawing]' "$canvas"
grep -Fq 'undoStack: $noteUndoStack' "$screens"

echo "Active non-Arena iPad P1 remediation contracts passed"
