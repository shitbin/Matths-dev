#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
work=$(mktemp -d "${TMPDIR:-/tmp}/matths-universal-contract.XXXXXX")
trap 'rm -rf "$work"' EXIT HUP INT TERM

project="$root/Matths.xcodeproj/project.pbxproj"
root_view="$root/Matths/RootView.swift"
canvas="$root/Matths/SolutionCanvas.swift"

family_count=$(grep -c 'TARGETED_DEVICE_FAMILY = "1,2";' "$project")
if [ "$family_count" -ne 2 ]; then
  echo "FAIL: Debug와 Release 모두 iPhone·iPad 유니버설이어야 합니다." >&2
  exit 1
fi

grep -Fq 'INFOPLIST_KEY_UIRequiresFullScreen = NO;' "$project"
grep -Fq 'INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone = "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";' "$project"
grep -Fq 'INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad = "UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";' "$project"

grep -Fq '@Environment(\.verticalSizeClass)' "$root_view"
grep -Fq 'safeAreaInset(edge: .top' "$root_view"
grep -Fq 'safeAreaInset(edge: .bottom' "$root_view"
grep -Fq 'forcesIconOnlyTabs' "$root_view"
grep -Fq 'accessibilityLabel(accessibilityLabel(for: item))' "$root_view"

grep -Fq 'deviceClass == .phone || allowsFinger' "$canvas"
grep -Fq 'drawingPolicy = allowsFingerDrawing ? .anyInput : .pencilOnly' "$canvas"
grep -Fq 'accessibilityTraits.insert(.allowsDirectInteraction)' "$canvas"
grep -Fq 'accessibilityIdentifier = "solutionCanvas"' "$canvas"
grep -Fq '.frame(minHeight: canvasMinimumHeight)' "$canvas"

xcrun swiftc \
  "$root/Matths/UniversalLayoutPolicy.swift" \
  "$root/tests/UniversalLayoutPolicyCases.swift" \
  -o "$work/universal-layout-policy"
"$work/universal-layout-policy"

echo "Universal target, orientation, safe-area, input, and accessibility contracts passed"
