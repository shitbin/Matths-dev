#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
work=$(mktemp -d /tmp/matths-release-binary-scanner.XXXXXX)
trap 'rm -rf "$work"' EXIT

app="$work/Build/Products/Release-iphoneos/Matths.app"
binary="$app/Matths"
mkdir -p "$app"
cp "$root/Matths/curriculum-story-policy.json" "$app/"
cp "$root/Matths/curriculum-stories-index.json" "$app/"
cp "$root/Matths/curriculum-v2.json" "$app/"
for shard in "$root"/Matths/curriculum-stories/*.json; do
  cp "$shard" "$app/"
done

# Direct xcodebuild/archive도 Resources 뒤의 실제 .app을 같은 검증기로 닫아야 한다.
grep -Fq 'verify-curriculum-story-bundle.sh' "$root/Matths.xcodeproj/project.pbxproj"
grep -Fq 'Release 커리큘럼 5분 해설 번들 게이트 실패' \
  "$root/Matths.xcodeproj/project.pbxproj"
grep -Fq '/opt/homebrew/bin/node' "$root/scripts/verify-curriculum-story-bundle.sh"
grep -Fq '/usr/local/bin/node' "$root/scripts/verify-curriculum-story-bundle.sh"

# 음성 대조: 정식 API 주소만 든 바이너리는 감사에 통과해야 한다.
printf '\000release-prefix\000%s\000release-suffix\000' \
  'https://www.matths.kr/api/v1' > "$binary"
clean_output=$(cd "$root" && SKIP_BUILD=1 DD="$work" bash ./verify-release.sh 2>&1)
printf '%s\n' "$clean_output" | grep -Fq 'Release 바이너리 스캐너 양성 대조 통과'
printf '%s\n' "$clean_output" | grep -Fq 'Release 바이너리 감사 통과'
PATH=/usr/bin:/bin NODE_BINARY=$(command -v node) \
  "$root/scripts/verify-curriculum-story-bundle.sh" "$app" >/dev/null

# 정본 식별자 양성 대조: 220개 숫자가 맞아도 다른 교육과정이면 닫혀야 한다.
cp "$app/curriculum-v2.json" "$work/curriculum-v2.json"
node - "$app/curriculum-v2.json" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
const document = JSON.parse(fs.readFileSync(file, "utf8"));
document.curriculumId = "wrong-curriculum";
fs.writeFileSync(file, `${JSON.stringify(document)}\n`);
NODE
set +e
authority_output=$("$root/scripts/verify-curriculum-story-bundle.sh" "$app" 2>&1)
authority_exit=$?
set -e
if [ "$authority_exit" -eq 0 ]; then
  echo '다른 curriculumId의 정본이 번들 검증을 통과했습니다.' >&2
  exit 1
fi
printf '%s\n' "$authority_output" | grep -Fq \
  'curriculum-v2와 story policy의 curriculumId가 다릅니다.'
cp "$work/curriculum-v2.json" "$app/curriculum-v2.json"

# 학생 projection 양성 대조: index SHA까지 다시 맞춘 악성 shard라도 상단 태그는 닫혀야 한다.
cp "$app/common-math-1.json" "$work/common-math-1-before-tag.json"
cp "$app/curriculum-stories-index.json" "$work/curriculum-stories-index-before-tag.json"
node - "$app/common-math-1.json" "$app/curriculum-stories-index.json" <<'NODE'
const crypto = require("node:crypto");
const fs = require("node:fs");
const [shardFile, indexFile] = process.argv.slice(2);
const shard = JSON.parse(fs.readFileSync(shardFile, "utf8"));
shard.stories[0].title = `[침착하게] ${shard.stories[0].title}`;
const raw = `${JSON.stringify(shard, null, 2)}\n`;
fs.writeFileSync(shardFile, raw);
const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
index.shards.find((item) => item.courseId === "common-math-1").sha256 =
  crypto.createHash("sha256").update(raw).digest("hex");
fs.writeFileSync(indexFile, `${JSON.stringify(index, null, 2)}\n`);
NODE
set +e
projection_output=$("$root/scripts/verify-curriculum-story-bundle.sh" "$app" 2>&1)
projection_exit=$?
set -e
if [ "$projection_exit" -eq 0 ]; then
  echo '학생 상단 문구의 studio 태그가 번들 검증을 통과했습니다.' >&2
  exit 1
fi
printf '%s\n' "$projection_output" | grep -Fq \
  '학생 projection에 studio 태그가 있습니다.'
cp "$work/common-math-1-before-tag.json" "$app/common-math-1.json"
cp "$work/curriculum-stories-index-before-tag.json" "$app/curriculum-stories-index.json"

# 양성 대조: NUL 사이의 UTF-8 한글 DEBUG 표식을 실제 감사기가 거부해야 한다.
printf '\000%s\000' '개발 서버 미리보기 코드' >> "$binary"
set +e
positive_output=$(cd "$root" && SKIP_BUILD=1 DD="$work" bash ./verify-release.sh 2>&1)
positive_exit=$?
set -e

if [ "$positive_exit" -eq 0 ]; then
  echo '한글 DEBUG 표식이 든 Release 바이너리가 감사를 통과했습니다.' >&2
  exit 1
fi
printf '%s\n' "$positive_output" | grep -Fq '개발 서버 미리보기 코드'
printf '%s\n' "$positive_output" | grep -Fq '1건 발견'
printf '%s\n' "$positive_output" | grep -Fq '실패 1 건'

# SHA 양성 대조: index 뒤에서 shard가 한 바이트라도 바뀌면 출시 감사가 닫혀야 한다.
printf '\000release-prefix\000%s\000release-suffix\000' \
  'https://www.matths.kr/api/v1' > "$binary"
printf '\n' >> "$app/common-math-1.json"
set +e
curriculum_output=$(cd "$root" && SKIP_BUILD=1 DD="$work" bash ./verify-release.sh 2>&1)
curriculum_exit=$?
set -e

if [ "$curriculum_exit" -eq 0 ]; then
  echo '변조된 커리큘럼 shard가 Release 감사를 통과했습니다.' >&2
  exit 1
fi
printf '%s\n' "$curriculum_output" | grep -Fq '커리큘럼 5분 해설 번들 실패'
printf '%s\n' "$curriculum_output" | grep -Fq 'common-math-1 shard SHA-256 불일치'
printf '%s\n' "$curriculum_output" | grep -Fq '실패 1 건'

echo 'iPad Release binary scanner contract passed'
