#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
shop="$root/Matths/ArenaShopScreen.swift"
arena="$root/Matths/GoatArenaScreen.swift"
match="$root/Matths/GoatArenaMatchPlayScreen.swift"
rulebook="$root/Matths/GoatArenaRulebookScreen.swift"
server_api="$root/Matths/ServerAPI.swift"
web_root=${MATTHS_WEB_REPO:-"$root/../webrepo-applied"}
shop_authority="$web_root/services/arenaShopPolicyService.js"

if [ ! -f "$shop_authority" ]; then
  echo "FAIL: production 상점 표시 정본을 찾지 못했습니다: $shop_authority" >&2
  echo "MATTHS_WEB_REPO로 웹 작업본 경로를 지정해주세요." >&2
  exit 1
fi

for state in normal purchase confirm analysis locked failure
do
  grep -q "case \"$state\"" "$shop"
done

grep -q 'ArenaShopFixture.make' "$shop"
grep -q 'case "matchplay"' "$arena"
grep -q 'GoatArenaMatchFixture.make' "$match"
grep -q 'if !usesDebugFixture { await heartbeatLoop() }' "$match"

# 룰북은 오래된 경제 규칙을 앱 내부 fallback으로 다시 만들지 않는다.
grep -q 'var upcomingPolicy: UpcomingPolicy? = nil' "$server_api"
grep -q 'UpcomingPolicyNotice(policy: upcomingPolicy)' "$rulebook"
grep -q 'offlineRulebookUnavailable("Unranked")' "$rulebook"
grep -q 'offlineRulebookUnavailable("Ranked")' "$rulebook"
if grep -q 'private var subRules\|private var mainRules\|기본 내장 룰북' "$rulebook"; then
  echo "FAIL: iPad 룰북에 서버와 갈라질 수 있는 상세 fallback 사본이 남아 있습니다." >&2
  exit 1
fi

# 활성 경기 정산 설명은 서버 표시 정본을 우선하고 구 서버에서만 FINAL LOGIC과
# 같은 fallback을 사용한다. 정상 승리와 No-show 환불을 같은 문장으로 합치지 않는다.
grep -q 'match.settlementRule' "$arena"
grep -q 'match.activeRanking == "MAIN"' "$arena"
grep -q '공격자가 이기면 Arena 상태를 교환하고 2×S-1일을 공격자에게 반환' "$arena"
grep -q '도전자가 이기면 Arena 상태를 교환하고 예치한 페이백 점수 2점을 전부 소각합니다' "$arena"
grep -q '방어자만 24시간 안에 미완료하면 2×S-1일을 공격자에게 반환' "$arena"
if grep -q 'Ranked 복수전 정산[^\n]*2×S일을 전부 소각' "$arena"; then
  echo "FAIL: 활성 경기 카드가 정상 승리와 No-show 반환 규칙을 섞었습니다." >&2
  exit 1
fi

# 검수 캡처가 production 카탈로그를 위조하지 않도록 경제 정본과 동일한
# 6개 itemCode·가격·판매 단계를 고정한다.
for code in \
  MATCH_ANALYSIS \
  DEFENSE_REST \
  DEFENSE_SCHEDULE_PROTECTION \
  INVITATION_ACCELERATION \
  MAIN_PROFILE_BORDER \
  STYLE_ENTRANCE
do
  grep -q "itemCode: \"$code\"" "$shop"
done

if grep -q 'ARENA_MATCH_ANALYSIS\|INVITE_MATCH_ACCELERATION' "$shop"; then
  echo "FAIL: iPad 검수 fixture가 production itemCode와 다릅니다." >&2
  exit 1
fi

python3 - "$shop" "$shop_authority" <<'PY'
import pathlib, re, sys
text = pathlib.Path(sys.argv[1]).read_text()
authority = pathlib.Path(sys.argv[2]).read_text()
fixture = text.split("private enum ArenaShopFixture", 1)[1]
fixture_items = fixture.split("items: [", 1)[1].split("effects:", 1)[0]
expected = {
    "MATCH_ANALYSIS": (1, 1, "MATCH", True),
    "DEFENSE_REST": (1, 1, "NONE", True),
    "DEFENSE_SCHEDULE_PROTECTION": (2, 2, "MATCH", False),
    "INVITATION_ACCELERATION": (1, 2, "INVITATION", False),
    "MAIN_PROFILE_BORDER": (2, 1, "NONE", True),
    "STYLE_ENTRANCE": (1, 1, "NONE", True),
}
for code, (price, phase, target, eligible) in expected.items():
    match = re.search(
        rf'itemCode: "{code}".*?priceDays: (\d+).*?releasePhase: (\d+).*?targetType: "([A-Z]+)".*?purchaseEligible: (true|false)',
        fixture_items,
        re.S,
    )
    actual = None if not match else (
        int(match.group(1)), int(match.group(2)), match.group(3), match.group(4) == "true"
    )
    if actual != (price, phase, target, eligible):
        raise SystemExit(f"FAIL: {code} fixture {actual} != {(price, phase, target, eligible)}")

catalog = authority.split("const MAIN_SHOP_ITEMS", 1)[1].split(
    "const MAIN_SHOP_ITEM_PRESENTATION", 1
)[0]
presentation = authority.split("const MAIN_SHOP_ITEM_PRESENTATION", 1)[1].split(
    "function dateValue", 1
)[0]

def value(source, field, label):
    match = re.search(rf'{field}:\s*"([^"]*)"', source, re.S)
    if not match:
        raise SystemExit(f"FAIL: {label}의 {field} 값을 찾지 못했습니다.")
    return match.group(1)

def js_entry(source, code, next_codes):
    start = source.index(f"{code}:")
    ends = [source.find(f"{candidate}:", start + len(code) + 1) for candidate in next_codes]
    ends = [index for index in ends if index >= 0]
    return source[start:min(ends) if ends else len(source)]

codes = list(expected)
copy_fields = ["displayName", "eyebrow", "description", "targetType", "durationLabel", "refundCondition"]
for index, code in enumerate(codes):
    swift_match = re.search(
        rf'itemCode: "{code}"(?P<body>.*?)purchasePreview:\s*\.init\(',
        fixture_items,
        re.S,
    )
    if not swift_match:
        raise SystemExit(f"FAIL: {code} Swift fixture 설명을 찾지 못했습니다.")
    swift_entry = swift_match.group("body")
    catalog_entry = js_entry(catalog, code, codes[index + 1:])
    presentation_entry = js_entry(presentation, code, codes[index + 1:])
    expected_copy = {
        "displayName": value(catalog_entry, "displayName", code),
        **{
            field: value(presentation_entry, field, code)
            for field in copy_fields
            if field != "displayName"
        },
    }
    for field, expected_value in expected_copy.items():
        actual_value = value(swift_entry, field, f"{code} fixture")
        if actual_value != expected_value:
            raise SystemExit(
                f"FAIL: {code}.{field} fixture={actual_value!r} production={expected_value!r}"
            )

api_function = authority.split("async function getMainShopApiData", 1)[1].split(
    "async function purchaseMainShopApiItem", 1
)[0]
swift_policy = fixture.split("policy: .init(", 1)[1].split("items: [", 1)[0]
policy_fields = ["sundayLockMessage", "demotionMessage", "nonRefundableMessage"]
for field in policy_fields:
    expected_value = value(api_function, field, "production shop policy")
    actual_value = value(swift_policy, field, "Swift fixture policy")
    if actual_value != expected_value:
        raise SystemExit(
            f"FAIL: policy.{field} fixture={actual_value!r} production={expected_value!r}"
        )

if value(swift_policy, "displayName", "Swift fixture policy") != "Ranked 상점 운영 정책":
    raise SystemExit("FAIL: fixture policy displayName이 production 기본 표시명과 다릅니다.")
PY

echo "Arena shop, purchase, analysis, and match review fixtures passed"
