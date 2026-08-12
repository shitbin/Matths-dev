#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OUTPUT_FILE="/tmp/matths-sync-contract-cases"
API_OUTPUT_FILE="/tmp/matths-sync-api-decode-cases"
MODULE_CACHE="/tmp/matths-sync-contract-module-cache"

xcrun swiftc \
  "$ROOT_DIR/tests/SyncContractCases.swift" \
  "$ROOT_DIR/Matths/WrongNoteStore.swift" \
  -module-cache-path "$MODULE_CACHE" \
  -o "$OUTPUT_FILE"

"$OUTPUT_FILE"

xcrun swiftc \
  "$ROOT_DIR/tests/SyncAPIDecodeCases.swift" \
  "$ROOT_DIR/Matths/ServerAPI.swift" \
  "$ROOT_DIR/Matths/DataScope.swift" \
  "$ROOT_DIR/Matths/ServerAuthenticationOwnership.swift" \
  "$ROOT_DIR/Matths/ServerTokenOwnership.swift" \
  -module-cache-path "$MODULE_CACHE" \
  -o "$API_OUTPUT_FILE"

"$API_OUTPUT_FILE"
