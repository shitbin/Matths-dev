#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const shardPath = path.resolve(__dirname, "..", "content_folder", "curriculum-stories", "algebra.json");
const beat = ([id, action, target, expression, result, caption, durationMs = 1_900]) => ({
  id, action, target, expression, result, caption, durationMs,
});
const check = (prompt, choices, answerIndex, correctFeedback, retryFeedback) => ({
  prompt,
  choices: choices.map((choice) => choice.length >= 4 ? choice : `${choice} 선택`),
  answerIndex,
  correctFeedback,
  retryFeedback,
});
const motion = (focus, instruction, frames, mild, spicy, sceneCheck) => ({
  version: 1,
  mode: "plot",
  focus,
  instruction,
  beats: frames.map(beat),
  mild: { explanation: mild },
  spicy: { explanation: spicy },
  check: sceneCheck,
});

const specs = {
  "arc-as-angle-ruler": motion(
    "호의 길이 l ÷ 반지름 r = 각 θ",
    "반지름 자를 원둘레에 눕혀 호를 재고, 한 자 길이를 1라디안으로 표시",
    [
      ["lay-radius", "point", "반지름 r", "원의 중심→원둘레", "길이 자", "반지름을 원둘레 위의 같은 길이 호와 나란히 놓습니다."],
      ["mark-one-radian", "highlight", "호 l=r", "θ=l/r", "θ=1rad", "호가 반지름 하나 길이면 중심각은 1라디안입니다."],
      ["complete-circle", "verify", "원둘레 2πr", "2πr/r", "한 바퀴 2πrad", "원을 한 바퀴 돌면 반지름 자가 2π개 들어갑니다."],
    ],
    "각을 숫자만 외우지 말고, 원둘레에 반지름 길이 자가 몇 번 놓이는지 세어 보세요. 호가 r이면 1라디안, 반원이면 π라디안입니다.",
    "radian measure is the dimensionless arc-to-radius ratio θ=l/r, so a full circumference gives exactly 2π radians.",
    check("호의 길이가 반지름의 3배이면 중심각은?", ["1라디안", "3라디안", "3도"], 1, "맞아요. θ=l/r=3r/r=3라디안입니다.", "호의 길이를 반지름으로 나눈 비를 계산하세요."),
  ),
  "directed-turn-counter": motion(
    "방향 부호·완전한 바퀴·마지막 동경",
    "회전 카운터가 시계 반대는 +, 시계 방향은 −로 기록하고 2π마다 같은 동경에 도착하는 과정 표시",
    [
      ["set-positive", "highlight", "시계 반대 방향", "회전 +θ", "양의 각", "시초선에서 반시계 방향 회전을 양수로 기록합니다."],
      ["count-turns", "group", "π/6+2πn", "같은 동경", "바퀴 수 n", "한 바퀴 2π를 더하거나 빼도 마지막 동경은 같습니다."],
      ["compare-routes", "verify", "π/6·13π/6·−11π/6", "차이 2π", "동일 위치", "회전 경로는 달라도 세 각의 마지막 동경은 일치합니다."],
    ],
    "먼저 회전 방향에 부호를 붙이고, 한 바퀴 2π를 몇 번 더 돌았는지 분리하세요. 마지막 위치만 볼 때는 2π의 정수배를 접어 겹칩니다.",
    "coterminal angles differ by integer multiples of 2π, while the signed total angle still preserves direction and turn count.",
    check("π/3과 같은 동경을 나타내는 각은?", ["π/3+2π", "π/3+π", "−π/3"], 0, "맞아요. 2π를 더하면 한 바퀴 뒤 같은 동경입니다.", "같은 동경은 2π의 정수배만큼 차이 납니다."),
  ),
  "degree-radian-mixup": motion(
    "180° ↔ πrad 단위 저울",
    "도와 라디안을 같은 저울에 올리고, 단위를 지우기 전에 변환 계수를 통과시키기",
    [
      ["balance-units", "group", "180°와 πrad", "180°=πrad", "같은 반 바퀴", "서로 다른 숫자지만 같은 회전량을 나타냅니다."],
      ["convert-sixty", "transform", "60°", "60×π/180", "π/3rad", "도에서 라디안으로 갈 때 π/180을 곱합니다."],
      ["guard-formulas", "verify", "l=rθ의 θ", "라디안 입력", "단위 통과", "호의 길이 공식에는 도가 아니라 라디안을 넣습니다."],
    ],
    "숫자 크기만 비교하지 말고 단위를 먼저 확인하세요. 도에 π/180을 곱하면 라디안이 되고, 60°와 π/3은 같은 각입니다.",
    "degree and radian numerals are incomparable until converted; formulas such as l=rθ assume the dimensionless radian measure.",
    check("150°를 라디안으로 바꾸면?", ["5π/6", "6π/5", "150π"], 0, "맞아요. 150×π/180=5π/6입니다.", "도에서 라디안으로 갈 때 π/180을 곱하세요."),
  ),
  "sector-measure-solution": motion(
    "150°→5π/6→호·넓이",
    "부채꼴을 전체 원의 비율로 색칠하고 l=rθ와 S=½r²θ를 같은 각도 레일에서 계산",
    [
      ["convert-angle", "highlight", "중심각 150°", "150×π/180", "5π/6", "계산 전에 중심각을 라디안으로 통일합니다."],
      ["measure-arc", "transform", "호의 길이", "6×5π/6", "5π", "반지름 6에 라디안 각을 곱해 호를 구합니다."],
      ["measure-area", "verify", "부채꼴 넓이", "½×6²×5π/6", "15π", "같은 각도 비율을 원의 넓이에 적용해 검산합니다."],
    ],
    "150°를 먼저 5π/6으로 바꾸세요. 반지름 6을 곱하면 호는 5π, ½r²θ에 넣으면 넓이는 15π입니다.",
    "arc length and sector area are the same angular fraction of circumference and disk area, expressed compactly with radian θ.",
    check("r=4, θ=π/2일 때 호의 길이는?", ["2π", "4π", "8π"], 0, "맞아요. l=rθ=4×π/2=2π입니다.", "호의 길이는 반지름과 라디안 각을 곱합니다."),
  ),
  "radius-ruler-recall": motion(
    "1rad·πrad·2πrad 회전 표지",
    "원 위에 반지름 한 개, 반원, 한 바퀴 표지를 차례로 놓아 방향·바퀴 수·호 길이를 회상",
    [
      ["recall-one", "point", "반지름 한 개 호", "l=r", "1rad", "1라디안의 실제 길이 장면을 다시 고정합니다."],
      ["recall-half", "transform", "반원", "l=πr", "πrad", "반 바퀴는 π라디안이자 180도입니다."],
      ["recall-full", "verify", "한 바퀴", "l=2πr", "2πrad", "방향 부호와 바퀴 수까지 붙여 일반각을 완성합니다."],
    ],
    "반지름 하나 길이의 호가 1라디안, 반원이 π라디안, 한 바퀴가 2π라디안입니다. 회전 방향과 바퀴 수도 함께 말해 보세요.",
    "the radius ruler anchors the radian scale at 1, π, and 2π while signed turns distinguish orientation and repeated revolutions.",
    check("시계 방향 한 바퀴를 라디안으로 쓰면?", ["−2π", "−π", "2π"], 0, "맞아요. 시계 방향은 음수이고 한 바퀴는 2π입니다.", "방향 부호와 한 바퀴 크기를 따로 확인하세요."),
  ),

  "rotating-beacon-shadows": motion(
    "단위원 점 (cosθ,sinθ)와 두 그림자",
    "회전점에서 x축·y축으로 수선을 내려 가로 그림자와 세로 그림자가 파동값이 되는 장면 표시",
    [
      ["rotate-point", "point", "단위원의 회전점 P", "P=(cosθ,sinθ)", "좌표 한 쌍", "점 하나의 가로·세로 좌표가 두 삼각함숫값입니다."],
      ["drop-shadows", "highlight", "가로·세로 수선", "x=cosθ, y=sinθ", "두 그림자", "축으로 내린 그림자가 회전에 따라 길어지고 짧아집니다."],
      ["unroll-wave", "transform", "θ에 따른 좌표", "회전→시간축", "사인·코사인 파동", "각을 가로축으로 펼치면 반복되는 파동이 됩니다."],
    ],
    "단위원의 점에서 축으로 그림자를 내리세요. 가로 좌표는 cosθ, 세로 좌표는 sinθ이고, 회전을 펼친 자취가 파동입니다.",
    "sine and cosine are coordinate projections of uniform circular motion; unrolling angle converts those projections into periodic waves.",
    check("단위원 점 P의 y좌표는 무엇인가요?", ["sinθ", "cosθ", "tanθ"], 0, "맞아요. 세로 좌표가 sinθ입니다.", "가로는 코사인, 세로는 사인으로 표시하세요."),
  ),
  "wave-landmarks-question": motion(
    "0·π/2·π·3π/2·2π 기준점",
    "단위원의 네 방향 점을 파동 축의 다섯 표식과 연결해 한 주기 뼈대 복원",
    [
      ["mark-cardinals", "group", "네 방향 좌표", "(1,0),(0,1),(−1,0),(0,−1)", "단위원 표식", "한 바퀴의 네 방향에서 좌표를 먼저 읽습니다."],
      ["transfer-sine", "transform", "세로 좌표", "0,1,0,−1,0", "사인 기준점", "각도 순서대로 세로 그림자를 파동 축에 옮깁니다."],
      ["transfer-cosine", "verify", "가로 좌표", "1,0,−1,0,1", "코사인 기준점", "코사인은 같은 표식에서 한 칸 앞선 모양으로 복원됩니다."],
    ],
    "0, π/2, π, 3π/2, 2π에서 단위원 좌표를 먼저 적으세요. y좌표를 옮기면 사인, x좌표를 옮기면 코사인 한 주기가 됩니다.",
    "five cardinal angle samples determine the standard sine and cosine skeletons because they record the unit-circle coordinates across one period.",
    check("sinθ가 1이 되는 한 바퀴 안의 각은?", ["0", "π/2", "π"], 1, "맞아요. 단위원 꼭대기의 y좌표가 1입니다.", "세로 그림자가 가장 긴 위쪽 점을 찾으세요."),
  ),
  "tangent-gap-trap": motion(
    "tanθ=sinθ/cosθ와 cosθ=0 틈",
    "사인·코사인 두 막대의 비를 만들고 분모가 0인 각에 금지벽과 세로 점근선 표시",
    [
      ["build-ratio", "group", "sinθ ÷ cosθ", "tanθ", "좌표의 비", "탄젠트는 단위원 세로좌표를 가로좌표로 나눈 값입니다."],
      ["find-zero-denominator", "highlight", "cosθ=0", "θ=π/2+kπ", "정의 불가", "가로좌표가 0이면 나눗셈을 할 수 없습니다."],
      ["separate-branches", "verify", "세로 점근선", "각 구간별 곡선", "끊어진 가지", "금지각을 가로질러 탄젠트 그래프를 이어 그리지 않습니다."],
    ],
    "tanθ는 sinθ/cosθ입니다. cosθ=0인 π/2+kπ에서는 분모가 0이므로 점을 찍지 말고 그래프 가지를 끊으세요.",
    "tangent inherits vertical asymptotes wherever cosine vanishes, splitting its graph into separate branches rather than one continuous stroke.",
    check("tanθ가 정의되지 않는 조건은?", ["sinθ=0", "cosθ=0", "sinθ=cosθ"], 1, "맞아요. 탄젠트의 분모 cosθ가 0이면 정의되지 않습니다.", "tanθ=sinθ/cosθ에서 분모를 확인하세요."),
  ),
  "transformed-wave-solution": motion(
    "진폭 |A|·주기 2π/|B|·중심선 D",
    "기본 사인파에 세 개의 조절 손잡이를 순서대로 적용해 y=A sin(Bx)+D 조립",
    [
      ["set-amplitude", "highlight", "계수 A", "최고·최저 높이 |A|", "진폭", "중심선에서 위아래로 움직이는 최대 거리를 정합니다."],
      ["set-period", "transform", "계수 B", "2π/|B|", "한 주기 폭", "B가 커질수록 같은 폭 안에 파동이 더 촘촘해집니다."],
      ["shift-midline", "verify", "바깥 +D", "y=D", "중심선", "마지막에 파동 전체를 위아래로 옮겨 기준선을 맞춥니다."],
    ],
    "y=A sin(Bx)+D에서 |A|는 중심선으로부터의 높이, 2π/|B|는 가로 한 주기, D는 중심선입니다. 세 값을 따로 표시하세요.",
    "amplitude, period, and midline are independent geometric controls; parsing them separately prevents coefficient and translation errors.",
    check("y=3sin(2x)−1의 중심선은?", ["y=3", "y=−1", "y=2"], 1, "맞아요. 함수 밖의 −1이 중심선을 y=−1로 옮깁니다.", "사인 함수 바깥에 더한 상수 D를 찾으세요."),
  ),
  "circle-wave-recall": motion(
    "가로 cos·세로 sin·비 tan",
    "단위원과 세 파동 카드를 연결해 좌표, 주기, 탄젠트 금지각을 한 번에 회상",
    [
      ["recall-cos", "point", "가로 그림자", "x=cosθ", "코사인", "회전점의 가로좌표가 코사인입니다."],
      ["recall-sin", "transform", "세로 그림자", "y=sinθ", "사인", "회전점의 세로좌표가 사인입니다."],
      ["recall-tan", "verify", "세로÷가로", "tanθ=sinθ/cosθ", "분모 0 금지", "탄젠트는 비이므로 코사인이 0인 위치에서 끊깁니다."],
    ],
    "단위원 점의 가로가 코사인, 세로가 사인, 세로를 가로로 나눈 비가 탄젠트입니다. 탄젠트의 끊김까지 함께 기억하세요.",
    "the coordinate definitions unify all three functions and immediately explain their periods, landmarks, and tangent discontinuities.",
    check("tanθ를 단위원 좌표로 나타내면?", ["x+y", "y/x", "x/y"], 1, "맞아요. tanθ=sinθ/cosθ=y/x입니다.", "세로좌표를 가로좌표로 나누세요."),
  ),

  "triangulation-measurement": motion(
    "기준선·두 시선각·닿을 수 없는 거리",
    "강 건너 목표점에 두 관측점에서 시선을 보내 측정 가능한 삼각형을 만들기",
    [
      ["lay-baseline", "highlight", "측정 가능한 기준선 AB", "AB=100m", "한 변 고정", "직접 잴 수 있는 두 지점 사이 거리를 먼저 확보합니다."],
      ["aim-sightlines", "point", "관측각 A·B", "두 시선", "삼각형 완성", "목표점 C로 향하는 두 방향을 재어 삼각형을 닫습니다."],
      ["recover-distance", "verify", "미지 거리 AC·BC", "사인법칙", "간접 측정", "한 변과 각 정보로 닿지 못한 거리를 계산합니다."],
    ],
    "직접 잴 수 있는 기준선 하나를 잡고 목표점으로 향하는 두 각을 재세요. 그러면 닿을 수 없는 거리도 삼각형 관계로 복원됩니다.",
    "triangulation converts inaccessible distance into a solvable triangle by combining one measured baseline with observed directions.",
    check("삼각측량에서 먼저 실제로 재기 쉬운 것은?", ["기준선 한 변", "목표점 높이 전부", "세 변 모두"], 0, "맞아요. 기준선과 시선각을 재어 나머지를 계산합니다.", "직접 접근할 수 있는 두 관측점 사이를 찾으세요."),
  ),
  "law-selection-question": motion(
    "맞은편 쌍은 사인·두 변과 끼인각은 코사인",
    "주어진 정보 카드의 모양을 분류해 사인법칙·코사인법칙 도구 상자로 보내기",
    [
      ["spot-opposite-pair", "group", "a↔A 한 쌍", "a/sinA", "사인법칙 후보", "변과 그 맞은편 각이 한 쌍 있으면 비례식을 만들 수 있습니다."],
      ["spot-included-angle", "group", "두 변 b,c와 끼인각 A", "a²=b²+c²−2bc cosA", "코사인법칙 후보", "두 변 사이 각이 있으면 반대편 변을 바로 연결합니다."],
      ["choose-tool", "verify", "정보 모양", "SSA/AAS 또는 SAS/SSS", "도구 결정", "공식 이름보다 주어진 정보의 배치를 먼저 봅니다."],
    ],
    "변과 맞은편 각 한 쌍이 보이면 사인법칙, 두 변과 그 사이 각이 보이면 코사인법칙을 먼저 떠올리세요. 정보의 배치가 도구를 고릅니다.",
    "law selection follows the geometry of known data: opposite side-angle ratios suggest sine law, while SAS or SSS structure suggests cosine law.",
    check("두 변과 그 사이의 각이 주어지면 먼저 쓸 법칙은?", ["사인법칙", "코사인법칙", "피타고라스만"], 1, "맞아요. SAS 정보는 코사인법칙에 바로 들어갑니다.", "주어진 각이 두 변 사이에 끼어 있는지 확인하세요."),
  ),
  "opposite-pair-trap": motion(
    "변 a는 각 A의 맞은편",
    "삼각형 꼭짓점과 반대 변을 같은 색 실로 연결하고 붙어 있는 변과 혼동하는 경로 차단",
    [
      ["label-vertices", "point", "꼭짓점 A·B·C", "세 각", "대문자", "각은 꼭짓점의 대문자로 표시합니다."],
      ["connect-opposites", "highlight", "A↔a, B↔b, C↔c", "정반대 위치", "맞은편 쌍", "소문자 변은 같은 글자 각의 건너편에 놓입니다."],
      ["reject-adjacent", "verify", "A에 붙은 두 변", "b와 c", "a가 아님", "각 A에 닿는 변을 a라고 부르는 실수를 막습니다."],
    ],
    "각 A에서 삼각형 건너편을 바라보세요. 그 반대 변이 a이고, A에 붙어 있는 두 변은 b와 c입니다. 같은 글자는 맞은편 쌍입니다.",
    "standard triangle notation pairs each capital-angle label with the opposite lowercase side, not either adjacent side.",
    check("각 B의 맞은편 변은 무엇인가요?", ["변 a", "변 b", "변 c"], 1, "맞아요. 같은 글자 B와 b가 맞은편 쌍입니다.", "꼭짓점 B에서 정반대 변을 가리키세요."),
  ),
  "triangulation-solution-route": motion(
    "빈 각→맞은편 쌍→비례식→크기 검산",
    "삼각형 풀이를 네 칸 레일로 나누고 각의 합과 사인법칙을 한 번만 연결",
    [
      ["find-third-angle", "highlight", "A+B+C=180°", "빈 각 계산", "C 확정", "먼저 각의 합으로 누락된 각을 채웁니다."],
      ["pair-data", "group", "a↔A와 b↔B", "a/sinA=b/sinB", "한 비례식", "구하려는 변과 이미 아는 맞은편 쌍만 골라 씁니다."],
      ["check-magnitude", "verify", "큰 각↔긴 변", "각 크기 순서", "답 검산", "계산한 변의 크기가 반대 각의 순서와 맞는지 확인합니다."],
    ],
    "빈 각을 먼저 구하고, 아는 변·맞은편 각과 구할 변·맞은편 각만 표시해 비례식 하나를 세우세요. 큰 각 맞은편이 더 긴지도 검산합니다.",
    "a reliable solution route completes the angle data, preserves opposite pairs, solves one minimal relation, and checks side-angle ordering.",
    check("사인법칙 계산 뒤 가장 좋은 크기 검산은?", ["큰 각 맞은편이 더 긴지", "모든 변이 같은지", "각을 전부 더하는지"], 0, "맞아요. 변 길이 순서와 맞은편 각 순서는 같습니다.", "계산한 변의 반대 각 크기와 비교하세요."),
  ),
  "triangle-tool-recall": motion(
    "사인 비례·코사인 결합·맞은편 표시",
    "삼각형 중앙에 맞은편 쌍을 고정하고 두 법칙의 입력 모양과 출력 목표를 좌우 카드로 회상",
    [
      ["recall-sine", "highlight", "a/sinA=b/sinB", "맞은편 쌍 두 개", "사인법칙", "변과 맞은편 각의 비를 서로 연결합니다."],
      ["recall-cosine", "transform", "a²=b²+c²−2bc cosA", "두 변+끼인각", "코사인법칙", "끼인각이 반대편 변을 얼마나 여는지 계산합니다."],
      ["recall-selection", "verify", "문제의 주어진 표시", "쌍 또는 끼인각", "도구 선택", "외운 공식보다 그림에 표시된 정보 구조를 먼저 읽습니다."],
    ],
    "맞은편 변·각 한 쌍을 먼저 색칠하세요. 그런 쌍이 두 개면 사인법칙, 두 변과 끼인각이면 코사인법칙으로 연결합니다.",
    "opposite-pair marking is the shared prerequisite that makes sine-law ratios and cosine-law included-angle structure visually unambiguous.",
    check("사인법칙의 한 쌍으로 올바른 것은?", ["a와 A", "a와 B", "A와 b"], 0, "맞아요. 변 a와 맞은편 각 A가 한 쌍입니다.", "같은 글자의 대문자 각과 소문자 변을 연결하세요."),
  ),
};

const shard = JSON.parse(fs.readFileSync(shardPath, "utf8"));
const targetConcepts = new Set(["algebra-02-01", "algebra-02-02", "algebra-02-03"]);
const targetStories = shard.stories.filter((story) => targetConcepts.has(story.conceptId));
const targetSceneIds = new Set(targetStories.flatMap((story) => story.scenes.map((scene) => scene.id)));
const missing = [...targetSceneIds].filter((id) => !specs[id]);
const extra = Object.keys(specs).filter((id) => !targetSceneIds.has(id));
if (missing.length || extra.length) {
  throw new Error(`motion spec 불일치: missing=${missing.join(",")} extra=${extra.join(",")}`);
}
for (const story of targetStories) {
  for (const scene of story.scenes) scene.motion = specs[scene.id];
}
fs.writeFileSync(shardPath, `${JSON.stringify(shard, null, 2)}\n`);
console.log(`Authored algebra trigonometry motion: ${targetStories.length} stories / ${targetSceneIds.size} scenes`);
