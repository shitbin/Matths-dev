#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
CACHE="${TMPDIR:-/tmp}/matths-local-ai-recovery-module-cache"
mkdir -p "$CACHE"

xcrun swiftc \
  -module-cache-path "$CACHE" \
  "$ROOT/Matths/DataScope.swift" \
  "$ROOT/Matths/LocalAIJobRecovery.swift" \
  "$ROOT/tests/LocalAIJobRecoveryCases.swift" \
  -o "${TMPDIR:-/tmp}/matths-local-ai-recovery-tests"

"${TMPDIR:-/tmp}/matths-local-ai-recovery-tests"

grep -Fq 'iPadOS가 허용하는 짧은 시간 동안만 이어집니다.' "$ROOT/Matths/ProScreen.swift"
grep -Fq '다음 실행에서 처음부터 다시 시작' "$ROOT/Matths/ProScreen.swift"
grep -Fq 'beginBackgroundTask' "$ROOT/Matths/LocalAIBackgroundExecution.swift"
grep -Fq 'LocalAIRecoverySelfTest.runIfRequested()' "$ROOT/Matths/MatthsApp.swift"
grep -Fq 'MATTHS_LOCAL_AI_RECOVERY_DEVICE_QA_V1' "$ROOT/Matths/LocalAIRecoverySelfTest.swift"
grep -Fq 'LocalAIJobRecovery.restore(in: recovery)' "$ROOT/Matths/LocalAIRecoverySelfTest.swift"
grep -Fq 'LocalAIJobRecovery.clear(in: recovery)' "$ROOT/Matths/LocalAIRecoverySelfTest.swift"
grep -Fq 'LocalAIBackgroundSelfTest.startIfRequested()' "$ROOT/Matths/MatthsApp.swift"
grep -Fq 'LocalAIBackgroundSelfTest.recordBackgroundIfRequested()' "$ROOT/Matths/MatthsApp.swift"
grep -Fq 'MATTHS_LOCAL_AI_BACKGROUND_DEVICE_QA_V1' "$ROOT/Matths/LocalAIBackgroundSelfTest.swift"
grep -Fq 'backgroundTaskActive' "$ROOT/Matths/LocalAIBackgroundSelfTest.swift"
grep -Fq 'NotificationCenter.default.post(name: didSwitchNotification' "$ROOT/Matths/DataScope.swift"
grep -Fq 'DataScope.didSwitchNotification' "$ROOT/Matths/ProScreen.swift"
grep -Fq 'analysisOwnerSlot == DataScope.slot' "$ROOT/Matths/ProScreen.swift"
grep -Fq 'guard self.activeRunID == runID else' "$ROOT/Matths/SheetGrader.swift"
grep -Fq 'activeRunID = nil' "$ROOT/Matths/SheetGrader.swift"
