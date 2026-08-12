#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
source_file="$root/Matths/RankPromotionPerformanceSelfTest.swift"

grep -q 'rankPromotionPerformanceSelfTest' "$source_file"
grep -q 'CADisplayLink' "$source_file"
grep -q 'RankTier.allCases' "$source_file"
grep -q 'serverSyncSuppressed: true' "$source_file"
grep -q 'rank-promotion-performance.json' "$source_file"
grep -q 'RankPromotionPerformanceSelfTest.runIfRequested' "$root/Matths/MatthsApp.swift"

work=$(mktemp -d /tmp/matths-rank-promotion-evidence.XXXXXX)
trap 'rm -rf "$work"' EXIT
cat > "$work/pass.json" <<'JSON'
{"schemaVersion":"MATTHS_RANK_PROMOTION_PERFORMANCE_V1","result":"PASS","reduceMotionEnabled":false,"serverSyncSuppressed":true,"tiers":[
{"tierCode":"BRONZE","durationSeconds":7.4,"callbackCount":440,"dropRatio":0.01,"maxFrameMs":25,"passed":true},
{"tierCode":"SILVER","durationSeconds":7.4,"callbackCount":440,"dropRatio":0.01,"maxFrameMs":25,"passed":true},
{"tierCode":"GOLD","durationSeconds":7.4,"callbackCount":440,"dropRatio":0.01,"maxFrameMs":25,"passed":true},
{"tierCode":"PLATINUM","durationSeconds":7.4,"callbackCount":440,"dropRatio":0.01,"maxFrameMs":25,"passed":true},
{"tierCode":"EMERALD","durationSeconds":7.4,"callbackCount":440,"dropRatio":0.01,"maxFrameMs":25,"passed":true},
{"tierCode":"DIAMOND","durationSeconds":7.4,"callbackCount":440,"dropRatio":0.01,"maxFrameMs":25,"passed":true},
{"tierCode":"MASTER","durationSeconds":7.4,"callbackCount":440,"dropRatio":0.01,"maxFrameMs":25,"passed":true},
{"tierCode":"GRANDMASTER","durationSeconds":7.4,"callbackCount":440,"dropRatio":0.01,"maxFrameMs":25,"passed":true},
{"tierCode":"CHALLENGER","durationSeconds":7.4,"callbackCount":440,"dropRatio":0.01,"maxFrameMs":25,"passed":true}]}
JSON
node "$root/scripts/verifyRankPromotionEvidence.js" "$work/pass.json"

node -e 'const fs=require("fs");const p=process.argv[1];const r=JSON.parse(fs.readFileSync(p));r.tiers[8].dropRatio=.2;fs.writeFileSync(p,JSON.stringify(r))' "$work/pass.json"
if node "$root/scripts/verifyRankPromotionEvidence.js" "$work/pass.json" >/dev/null 2>&1; then
  echo '불일치 성능 판정이 검증을 통과했습니다.' >&2
  exit 1
fi

echo 'Rank promotion device evidence contract passed'
