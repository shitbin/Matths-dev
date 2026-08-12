#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

grep -q 'static let defaultURL = "https://matths.kr"' "$ROOT/Matths/ServerAPI.swift"
! grep -q 'trycloudflare.com' "$ROOT/Matths/ServerAPI.swift"
grep -q 'ASWebAuthenticationSession' "$ROOT/Matths/GoogleSignInCoordinator.swift"
grep -q '/api/v1/auth/google/exchange' "$ROOT/Matths/ServerAPI.swift"
grep -q '<string>matths</string>' "$ROOT/Info.plist"
grep -q 'UIScreen.capturedDidChangeNotification' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q 'UIScreen.main.isCaptured' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q 'protected-screen-screenshot' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q 'protected-screen-capture-started' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q 'enqueueIntegrityEvent' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q 'integritySessionCode' "$ROOT/Matths/SyncEngine.swift"
grep -q 'protectedSurface' "$ROOT/Matths/SyncEngine.swift"
grep -q 'ProtectedContentWatermark' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q '@State private var id = UUID()' "$ROOT/Matths/ScreenshotGuard.swift"
! grep -q 'private let id = UUID()' "$ROOT/Matths/ScreenshotGuard.swift"
grep -q 'watermarkCode' "$ROOT/Matths/MatthsApp.swift"
grep -q 'ScreenProtectionSelfTest.runIfRequested' "$ROOT/Matths/MatthsApp.swift"
grep -q 'serverSyncSuppressed: true' "$ROOT/Matths/ScreenProtectionSelfTest.swift"
grep -q 'MATTHS_SCREEN_PROTECTION_DEVICE_QA_V1' "$ROOT/Matths/ScreenProtectionSelfTest.swift"
grep -q 'runIntegrityQueueDeviceQA' "$ROOT/Matths/ScreenProtectionSelfTest.swift"
grep -q 'queuePayloadPreserved' "$ROOT/Matths/ScreenProtectionSelfTest.swift"
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

echo "Google auth and supported screen protection contract passed"
