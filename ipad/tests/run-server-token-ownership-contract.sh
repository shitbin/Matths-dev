#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

xcrun swiftc \
  "$ROOT/Matths/ServerTokenOwnership.swift" \
  "$ROOT/tests/ServerTokenOwnershipCases.swift" \
  -o "$WORK/server-token-ownership"
"$WORK/server-token-ownership"

api="$ROOT/Matths/ServerAPI.swift"
grep -Fq 'private static let lock = NSLock()' "$api"
grep -Fq 'TokenBox.clear(ifMatches: requestToken)' "$api"
grep -Fq 'requestToken: bearerToken(from: request)' "$api"
grep -Fq 'matthsServerAuthenticationExpired' "$api"
grep -Fq 'restoredSessionAction(' "$ROOT/Matths/MatthsApp.swift"
grep -Fq 'authenticationNotice' "$ROOT/Matths/AuthScreen.swift"
if grep -Fq 'if status == 401 { TokenBox.clear()' "$api"; then
  echo 'Unowned JSON 401 token clearing returned.' >&2
  exit 1
fi
if grep -Fq 'if http.statusCode == 401 { TokenBox.clear()' "$api"; then
  echo 'Unowned file 401 token clearing returned.' >&2
  exit 1
fi

echo 'Server token ownership and atomic keychain contracts passed.'
