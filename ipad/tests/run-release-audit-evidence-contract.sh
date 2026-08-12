#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
work="$(mktemp -d /tmp/matths-release-audit.XXXXXX)"
trap 'rm -rf "$work"' EXIT
source_root="$work/source"
mkdir -p "$source_root"
git -C "$source_root" init -q
git -C "$source_root" config user.email release-audit@example.invalid
git -C "$source_root" config user.name 'Release Audit Test'
printf '%s\n' candidate > "$source_root/README.md"
git -C "$source_root" add README.md
git -C "$source_root" commit -qm candidate
app="$work/Matths.app"
mkdir -p "$app"
printf '%s\n' 'release binary https://matths.kr' > "$app/Matths"
cat > "$app/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>kr.matths.app</string>
<key>CFBundleURLTypes</key><array><dict><key>CFBundleURLSchemes</key><array><string>matths</string></array></dict></array>
</dict></plist>
PLIST
printf '%s\n' '<?xml version="1.0"?><plist version="1.0"><dict/></plist>' > "$app/PrivacyInfo.xcprivacy"
printf '%s\n' '** BUILD SUCCEEDED **' > "$work/build.log"
cat > "$work/lipo" <<'SH'
#!/bin/sh
echo arm64
SH
chmod +x "$work/lipo"

MATTHS_LIPO="$work/lipo" node "$root/scripts/createReleaseAuditEvidence.js" \
  --app "$app" --build-log "$work/build.log" --output "$work/audit.json" \
  --assets excluded --signing unsigned --source-root "$source_root"
grep -Fq '"schemaVersion": "MATTHS_IPAD_RELEASE_AUDIT_V1"' "$work/audit.json"
grep -Fq '"appStoreEligible": false' "$work/audit.json"
grep -Eq '"commit": "[0-9a-f]{40}"' "$work/audit.json"
grep -Eq '"tree": "[0-9a-f]{40}"' "$work/audit.json"
grep -Fq '"trackedWorkingTreeClean": true' "$work/audit.json"

printf '%s\n' '** ARCHIVE SUCCEEDED **' > "$work/archive.log"
MATTHS_LIPO="$work/lipo" node "$root/scripts/createReleaseAuditEvidence.js" \
  --app "$app" --build-log "$work/archive.log" --output "$work/archive-audit.json" \
  --assets excluded --signing unsigned --source-root "$source_root"
grep -Fq '"result": "PASS"' "$work/archive-audit.json"

touch "$app/embedded.mobileprovision"
cat > "$work/codesign" <<'SH'
#!/bin/sh
exit 0
SH
cat > "$work/security" <<'SH'
#!/bin/sh
while [ "$#" -gt 0 ]; do
  if [ "$1" = "-o" ]; then
    cp "$MATTHS_PROFILE" "$2"
    exit 0
  fi
  shift
done
exit 1
SH
chmod +x "$work/codesign" "$work/security"

cat > "$work/development.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Entitlements</key><dict><key>get-task-allow</key><true/></dict>
<key>ProvisionedDevices</key><array><string>DEVICE</string></array>
</dict></plist>
PLIST
MATTHS_LIPO="$work/lipo" MATTHS_CODESIGN="$work/codesign" \
MATTHS_SECURITY="$work/security" MATTHS_PROFILE="$work/development.plist" \
node "$root/scripts/createReleaseAuditEvidence.js" \
  --app "$app" --build-log "$work/build.log" --output "$work/development.json" \
  --assets compiled --signing signed --source-root "$source_root"
grep -Fq '"signing": "development"' "$work/development.json"
grep -Fq '"appStoreEligible": false' "$work/development.json"

cat > "$work/distribution.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Entitlements</key><dict><key>get-task-allow</key><false/></dict>
</dict></plist>
PLIST
mkdir -p "$work/ipa/Payload"
cp -R "$app" "$work/ipa/Payload/Matths.app"
(cd "$work/ipa" && /usr/bin/zip -qry "$work/Matths.ipa" Payload)
MATTHS_LIPO="$work/lipo" MATTHS_CODESIGN="$work/codesign" \
MATTHS_SECURITY="$work/security" MATTHS_PROFILE="$work/distribution.plist" \
node "$root/scripts/createReleaseAuditEvidence.js" \
  --app "$app" --build-log "$work/build.log" --output "$work/distribution.json" \
  --assets compiled --signing signed --signed-archive "$work/Matths.ipa" \
  --source-root "$source_root"
grep -Fq '"signing": "app-store-distribution"' "$work/distribution.json"
grep -Fq '"appStoreEligible": true' "$work/distribution.json"
grep -Fq '"signing": "app-store-distribution"' "$work/distribution.json"
grep -Fq '"file": "Matths.ipa"' "$work/distribution.json"
grep -Eq '"sha256": "[0-9a-f]{64}"' "$work/distribution.json"

if MATTHS_LIPO="$work/lipo" MATTHS_CODESIGN="$work/codesign" \
  MATTHS_SECURITY="$work/security" MATTHS_PROFILE="$work/distribution.plist" \
  node "$root/scripts/createReleaseAuditEvidence.js" \
    --app "$app" --build-log "$work/build.log" --output "$work/missing-ipa.json" \
    --assets compiled --signing signed --source-root "$source_root" >/dev/null 2>&1; then
  echo 'IPA 없는 App Store 배포 감사가 통과했습니다.' >&2
  exit 1
fi

printf '%s\n' 'trycloudflare.com' >> "$app/Matths"
if MATTHS_LIPO="$work/lipo" node "$root/scripts/createReleaseAuditEvidence.js" \
  --app "$app" --build-log "$work/build.log" --output "$work/fail.json" \
  --assets excluded --signing unsigned --source-root "$source_root" >/dev/null 2>&1; then
  echo '임시 서버 주소가 Release 감사에 통과했습니다.' >&2
  exit 1
fi

echo 'iPad Release audit evidence contract passed'
