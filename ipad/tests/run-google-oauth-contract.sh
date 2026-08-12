#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
coordinator="$root/Matths/GoogleSignInCoordinator.swift"
auth_screen="$root/Matths/AuthScreen.swift"
google_mark="$root/Matths/Assets.xcassets/GoogleGMark.imageset/GoogleGMark.svg"
plist="$root/Info.plist"

grep -Fq 'callbackURL.scheme?.lowercased() == "matths"' "$coordinator"
grep -Fq 'callbackURL.host?.lowercased() == "oauth"' "$coordinator"
grep -Fq 'callbackURL.path == expectedPath' "$coordinator"
grep -Fq 'expectedPath: "/google"' "$coordinator"
grep -Fq 'expectedPath: "/google-reauth"' "$coordinator"
grep -Fq 'SOCIAL_AUTH_CALLBACK_DUPLICATE' "$coordinator"
grep -Fq 'appendingPathComponent("/auth/google/app")' "$coordinator"
grep -Fq 'URLQueryItem(name: "code_challenge", value: codeChallenge)' "$coordinator"
grep -Fq 'codeVerifier: codeVerifier' "$coordinator"
grep -Fq 'startGoogleWithdrawalReauthentication(' "$coordinator"
grep -Fq 'reauthenticateForAccountDeletion()' "$coordinator"
grep -Fq 'static func exchangeGoogleAuthCode(' "$root/Matths/ServerAPI.swift"
grep -Fq 'body: ["code": code, "codeVerifier": codeVerifier]' "$root/Matths/ServerAPI.swift"
grep -Fq '"/api/v1/me/withdrawal/google/start"' "$root/Matths/ServerAPI.swift"
grep -Fq '"reauthenticationProof": reauthentication.proof' "$root/Matths/ServerAPI.swift"
grep -Fq 'reauthenticateForAccountDeletion()' "$root/Matths/ProfileScreen.swift"
if grep -Fq 'appendingPathComponent("/api/v1/auth/google/start")' "$coordinator"; then
  echo "Google 시작 경로를 Bearer API 경계 안으로 되돌리면 안 됩니다." >&2
  exit 1
fi
grep -Fq 'Image("GoogleGMark")' "$auth_screen"
test -s "$google_mark"
for color in 4285F4 34A853 FBBC05 EA4335; do
  grep -Fqi "#$color" "$google_mark"
done
if grep -Eq 'Text\("G"\)' "$auth_screen"; then
  echo "Google 버튼에 임시 텍스트 G를 다시 사용하면 안 됩니다." >&2
  exit 1
fi
grep -Fq '<string>matths</string>' "$plist"

if grep -Fq 'Dictionary(uniqueKeysWithValues' "$coordinator"; then
  echo "중복 OAuth query가 앱을 종료시킬 수 있는 변환이 남아 있습니다." >&2
  exit 1
fi

echo "Google OAuth callback contract passed"
