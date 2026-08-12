#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
MODULE_CACHE="${TMPDIR:-/tmp}/matths-screen-integrity-module-cache"
CASES_BIN="${TMPDIR:-/tmp}/matths-screen-integrity-contract-cases"

mkdir -p "$MODULE_CACHE"
xcrun swiftc \
  -module-cache-path "$MODULE_CACHE" \
  "$ROOT/Matths/ScreenIntegrityEventContract.swift" \
  "$ROOT/Matths/DataScope.swift" \
  "$ROOT/tests/ScreenIntegrityEventContractCases.swift" \
  -o "$CASES_BIN"
"$CASES_BIN"

grep -q 'static let defaultURL = "https://matths.kr"' "$ROOT/Matths/ServerAPI.swift"
! grep -q 'trycloudflare.com' "$ROOT/Matths/ServerAPI.swift"
grep -q 'ASWebAuthenticationSession' "$ROOT/Matths/GoogleSignInCoordinator.swift"
grep -q '/api/v1/auth/google/exchange' "$ROOT/Matths/ServerAPI.swift"
grep -q '<string>matths</string>' "$ROOT/Info.plist"
grep -q 'UIScreen.capturedDidChangeNotification' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q 'UIScreen.main.isCaptured' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q 'UIApplication.willResignActiveNotification' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q 'UIApplication.didBecomeActiveNotification' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q 'protected-screen-screenshot' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q 'protected-screen-capture-started' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q 'enqueueIntegrityEvent' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q 'integritySessionCode' "$ROOT/Matths/SyncEngine.swift"
grep -q 'protectedSurface' "$ROOT/Matths/SyncEngine.swift"
grep -q 'ProtectedContentWatermark' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q 'accountWatermarkCode' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q 'screenProtectionAccountCode' "$ROOT/Matths/DataScope.swift"
grep -q '@State private var id = UUID()' "$ROOT/Matths/ScreenshotGuard.swift"
! grep -q 'private let id = UUID()' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q 'watermarkCode' "$ROOT/Matths/MatthsApp.swift"
grep -q 'accountCode: screenshotGuard.accountWatermarkCode' "$ROOT/Matths/MatthsApp.swift"
grep -q 'ScreenProtectionSelfTest.runIfRequested' "$ROOT/Matths/MatthsApp.swift"
grep -q 'serverSyncSuppressed: true' "$ROOT/Matths/ScreenProtectionSelfTest.swift"
grep -q 'MATTHS_SCREEN_PROTECTION_DEVICE_QA_V1' "$ROOT/Matths/ScreenProtectionSelfTest.swift"
grep -q 'runIntegrityQueueDeviceQA' "$ROOT/Matths/ScreenProtectionSelfTest.swift"
grep -q 'queuePayloadPreserved' "$ROOT/Matths/ScreenProtectionSelfTest.swift"
grep -q 'repeatedScreenshotRecorded' "$ROOT/Matths/ScreenProtectionSelfTest.swift"
grep -q 'accountWatermarkPseudonymous' "$ROOT/Matths/ScreenProtectionSelfTest.swift"
grep -q 'loadQueue(at: url, quarantineURL: nil)' "$ROOT/Matths/SyncEngine.swift"
grep -q 'simulateScreenshotForDeviceQA' "$ROOT/Matths/ScreenshotGuard.swift"
if grep -q '답을 찾으러 갈 시간' "$ROOT/Matths/ScreenshotGuard.swift"; then
  echo "student-blaming screenshot copy must not return" >&2
  exit 1
fi
grep -q 'isPrivacyCoverActive' "$ROOT/Matths/MatthsApp.swift"
grep -q 'protectedAssessmentSurface' "$ROOT/Matths/GoatArenaScreen.swift"
for screen in KiceExamScreen AssessmentPaperScreen PlacementExamScreen WeeklyMockScreen; do
  if ! perl -0ne "exit 0 if /${screen}\\(\\)[\\s\\S]{0,140}\\.protectedAssessmentSurface\\([^)]*\\)/; exit 1" \
      "$ROOT/Matths/RootView.swift"; then
    echo "$screen must use the shared protected assessment surface" >&2
    exit 1
  fi
done
! grep -R -q 'isSecureTextEntry.*screenshot\|screenshot.*isSecureTextEntry' "$ROOT/Matths"

python3 - "$ROOT/Matths/ScreenshotGuard.swift" "$ROOT/Matths/SyncEngine.swift" <<'PY'
from pathlib import Path
import sys

guard_source = Path(sys.argv[1]).read_text(encoding="utf-8")
sync_source = Path(sys.argv[2]).read_text(encoding="utf-8")

screenshot_start = guard_source.index("private func handleScreenshotDetected()")
screenshot_end = guard_source.index("#if DEBUG", screenshot_start)
screenshot_body = guard_source[screenshot_start:screenshot_end]
if screenshot_body.index("recordIntegrityEvent") > screenshot_body.index("guard !isShowing"):
    raise SystemExit("every protected screenshot notification must be recorded, including repeats")

enqueue_start = sync_source.index("func enqueueIntegrityEvent(")
enqueue_end = sync_source.index("/// 평가·기출", enqueue_start)
enqueue_body = sync_source[enqueue_start:enqueue_end]
for forbidden in ("email", "school", "accountWatermarkCode", "DataScope.slot", "matchId", "questionId"):
    if forbidden in enqueue_body:
        raise SystemExit(f"integrity payload must not include {forbidden}")
PY

python3 - "$ROOT/Matths/MatthsApp.swift" <<'PY'
from pathlib import Path
import sys

source = Path(sys.argv[1]).read_text(encoding="utf-8")
overlay_start = source.index("if screenshotGuard.isCaptureActive")
overlay_end = source.index(".animation", overlay_start)
overlay = source[overlay_start:overlay_end]
if "else if screenshotGuard.isShowing" in overlay:
    raise SystemExit("screenshot alert must not replace the protected-content watermark")
if overlay.index("screenshotGuard.isShowing") > overlay.index("ProtectedContentWatermark"):
    raise SystemExit("watermark must render over the screenshot alert and protected content")
PY

echo "Google auth and supported screen protection contract passed"
