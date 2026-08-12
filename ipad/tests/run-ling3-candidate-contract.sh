#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d /tmp/matths-ling3-candidate.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT

xcrun swiftc \
  "$ROOT/Matths/ExperimentalLocalModelCatalog.swift" \
  "$ROOT/tests/Ling3CandidateCases.swift" \
  -o "$WORK/ling3-candidate-cases"
"$WORK/ling3-candidate-cases"

FRAMEWORK="$ROOT/Frameworks/llama.xcframework/ios-arm64/llama.framework/llama"
strings "$FRAMEWORK" > "$WORK/llama-strings.txt"
grep -Fq 'f95de9776' "$WORK/llama-strings.txt"
if grep -Fq 'bailingmoe3' "$WORK/llama-strings.txt"; then
  echo "bundled runtime changed: review and update the Ling 3.0 candidate pin" >&2
  exit 1
fi

grep -Fq 'userSelectable: false' "$ROOT/Matths/ExperimentalLocalModelCatalog.swift"
grep -Fq 'shippingEligible: false' "$ROOT/Matths/ExperimentalLocalModelCatalog.swift"
echo "Ling 3.0 tiny bundled-runtime isolation contract passed"
