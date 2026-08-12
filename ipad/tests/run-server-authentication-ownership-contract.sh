#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/matths-auth-owner.XXXXXX")"
trap 'rm -rf "$BUILD_DIR"' EXIT

swiftc \
  "$ROOT/Matths/ServerAuthenticationOwnership.swift" \
  "$ROOT/tests/ServerAuthenticationOwnershipCases.swift" \
  -o "$BUILD_DIR/auth-ownership"
"$BUILD_DIR/auth-ownership"

if grep -nE 'TokenBox\.save\(auth\.accessToken\)' "$ROOT/Matths/ServerAPI.swift"; then
  echo "Authentication network methods must not install tokens before UI ownership checks." >&2
  exit 1
fi

grep -Fq 'ServerAPI.acceptAuthentication(auth, attemptID: attemptID)' "$ROOT/Matths/AuthScreen.swift"
grep -Fq '.onDisappear { cancelAuthentication() }' "$ROOT/Matths/AuthScreen.swift"
grep -Fq '.onDisappear { cancelGoogleSignIn() }' "$ROOT/Matths/AuthScreen.swift"

echo "Server authentication ownership contract passed."
