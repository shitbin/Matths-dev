#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SELECTOR="$ROOT/Matths/DebugLocalModelSelector.swift"
LOCAL_LLM="$ROOT/Matths/LocalLLM.swift"
PROFILE="$ROOT/Matths/ProfileScreen.swift"
PRO="$ROOT/Matths/ProScreen.swift"

grep -Fq '#if DEBUG' "$SELECTOR"
grep -Fq 'Ling 3.0 tiny Q3' "$SELECTOR"
grep -Fq '사진 판독은 Qwen VL 3B로 고정' "$SELECTOR"
grep -Fq 'frame(minHeight: 44)' "$SELECTOR"
grep -Fq 'ModelDownloader.shared.startForTierSwitch()' "$SELECTOR"
grep -Fq 'DebugLocalModelSelector(selection: $debugTier' "$PROFILE"
grep -Fq 'DebugLocalModelSelector(selection: $debugTier' "$PRO"
grep -Fq 'if let tier = debugForcedTier { return spec(forTier: tier) }' "$LOCAL_LLM"
grep -Fq 'case "ling3-q3": return specLing3Q3' "$LOCAL_LLM"

echo "DEBUG local model selector contract passed"
