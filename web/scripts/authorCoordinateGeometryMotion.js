#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const shardPath = path.resolve(
  __dirname,
  "..",
  "content_folder",
  "curriculum-stories",
  "common-math-2.json",
);

function beat(id, action, target, expression, result, caption, durationMs = 1_900) {
  return { id, action, target, expression, result, caption, durationMs };
}

function check(prompt, choices, answerIndex, correctFeedback, retryFeedback) {
  const normalizedPrompt = prompt.length >= 12 ? prompt : `${prompt} 다음 중 고르세요.`;
  const normalizedChoices = choices.map((choice) => (
    String(choice).length >= 4 ? choice : `${choice}입니다`
  ));
  return {
    prompt: normalizedPrompt,
    choices: normalizedChoices,
    answerIndex,
    correctFeedback,
    retryFeedback,
  };
}

function motion(focus, instruction, beats, mild, spicy, sceneCheck) {
  return {
    version: 1,
    mode: "plot",
    focus,
    instruction,
    beats,
    mild: { explanation: mild },
    spicy: { explanation: spicy },
    check: sceneCheck,
  };
}

const specs = {
  "triangle-and-slider": motion(
    "가로 차·세로 차·빗변과 선분 위 비율 점",
    "두 점 사이에 직각삼각형을 만든 뒤 같은 선분에 1:2 슬라이더를 놓기",
    [
      beat("build-right-triangle", "group", "가로 변화량 6과 세로 변화량 4", "Δx=6, Δy=4", "빗변²=6²+4²", "두 좌표 차가 거리 공식의 두 직각변이 됩니다."),
      beat("measure-hypotenuse", "point", "A에서 B까지의 빗변", "AB=√(Δx²+Δy²)", "AB=2√13", "제곱합의 양의 제곱근만 실제 길이가 됩니다."),
      beat("place-ratio-slider", "transform", "AP:PB=1:2인 점 P", "전체의 1/3만 A에서 이동", "P는 A 쪽에 가까움", "짧은 AP가 먼저 보이도록 공식 전에 위치를 예측합니다."),
    ],
    "A와 B를 잇고 가로선과 세로선을 그으면 직각삼각형이 보입니다. 가로 차와 세로 차를 제곱해 더한 뒤 빗변을 구하면 거리입니다. 내분점은 같은 선분 위를 몇 몫 움직였는지 표시한 슬라이더입니다.",
    "거리 공식은 Euclidean norm이고, 내분점은 A+(m/(m+n))(B−A)인 affine combination입니다. 길이와 비율 주소를 한 선분에서 함께 검산하세요.",
    check("가로 차가 3, 세로 차가 4인 두 점의 거리는?", ["5", "7", "25"], 0, "맞아요. 3²+4²=25이므로 거리는 5입니다.", "거리에는 제곱합의 제곱근을 씁니다. 25에서 한 번 더 제곱근을 취하세요."),
  ),
  "closer-side-question": motion(
    "1:2 내분점이 짧은 구간 쪽 끝에 가까운 모습",
    "A(−2,1)와 B(4,5)를 연결하고 P를 A에서 전체의 1/3 위치에 놓기",
    [
      beat("predict-near-a", "highlight", "AP가 1, PB가 2인 두 구간", "AP:PB=1:2", "P는 A에 가까움", "작은 비에 해당하는 구간이 짧으므로 점은 그 끝 가까이에 있습니다."),
      beat("cross-weight-x", "point", "x좌표의 엇갈린 가중평균", "(1·4+2·(−2))/3", "x=0", "A 쪽 비 1은 반대편 B 좌표 4에 붙습니다."),
      beat("cross-weight-y", "verify", "y좌표의 엇갈린 가중평균", "(1·5+2·1)/3", "y=7/3", "계산된 점이 두 끝 사이와 예측한 A 쪽에 있는지 확인합니다."),
    ],
    "1 대 2는 A에서 P까지가 더 짧다는 뜻입니다. 먼저 P를 A 가까이에 찍고, x와 y를 따로 엇갈려 평균 내세요. 답이 B 쪽으로 가면 비를 붙인 방향을 바꾼 것입니다.",
    "AP:PB=m:n이면 P=(nA+mB)/(m+n)입니다. barycentric weight는 반대편 구간의 길이에 비례하며 convex weights라 P는 선분 안에 남습니다.",
    check("AP:PB=1:2이면 P는 어느 점에 더 가까워야 하나요?", ["A", "B", "항상 중점"], 0, "맞아요. AP가 더 짧으므로 P는 A에 가깝습니다.", "비의 첫 수는 AP의 길이입니다. 1인 구간이 A와 P 사이에 놓입니다."),
  ),
  "cross-weight-misread": motion(
    "같은 쪽 곱을 지우고 반대편 좌표와 연결하는 선",
    "A와 B 좌표 위의 비 숫자를 교차 화살표로 분자에 연결",
    [
      beat("show-wrong-weight", "highlight", "mA+nB로 적은 잘못된 분자", "AP:PB=m:n", "위치가 반대로 치우침", "같은 쪽끼리 곱하면 m이 커질수록 오히려 A 쪽으로 움직입니다."),
      beat("derive-from-movement", "transform", "A에서 전체의 m/(m+n) 이동", "A+m(B−A)/(m+n)", "(nA+mB)/(m+n)", "출발점에 이동량을 더해 엇갈린 곱을 직접 만듭니다."),
      beat("range-check", "verify", "A와 B 사이에 남은 P", "0<m/(m+n)<1", "선분 안쪽", "양의 내분비라면 각 좌표가 두 끝 좌표 범위를 벗어나지 않아야 합니다."),
    ],
    "공식을 외우기보다 A에서 출발해 전체의 m몫만큼 B 쪽으로 간다고 생각하세요. 식을 펼치면 A에는 n, B에는 m이 남습니다. 그 교차가 틀린 방향을 막아 줍니다.",
    "affine parameter t=m/(m+n)를 쓰면 P=(1−t)A+tB입니다. 0<t<1인 convex combination이므로 internal division의 범위 조건도 자동으로 보입니다.",
    check("AP:PB=m:n일 때 B 좌표에 붙는 가중치는?", ["m", "n", "m+n"], 0, "맞아요. A에서 B 쪽으로 m몫 이동하므로 B에는 m이 붙습니다.", "A+t(B−A)를 전개해 B 앞에 남는 계수를 확인하세요."),
  ),
  "coordinate-route": motion(
    "A(2,−1)에서 B(8,5)로 2/3 이동한 P",
    "x와 y 슬라이더를 나란히 움직여 P(6,3)를 좌표평면에 고정",
    [
      beat("predict-near-b", "highlight", "AP:PB=2:1", "P는 B 쪽", "예상 위치 B 가까이", "PB가 더 짧으므로 계산 전에 B 가까이에 빈 점을 찍습니다."),
      beat("compute-coordinates", "point", "x와 y의 엇갈린 평균", "x=(2·8+1·2)/3, y=(2·5+1·(−1))/3", "P=(6,3)", "가로와 세로를 같은 비율로 독립 계산합니다."),
      beat("compare-vectors", "verify", "AP=(4,4), PB=(2,2)", "AP=2·PB", "2:1 확인", "두 변화 벡터의 각 성분이 같은 2:1인지 되읽습니다."),
    ],
    "P는 B에 가까울 것이라고 먼저 표시합니다. x와 y를 각각 엇갈려 평균 내면 6과 3이 나옵니다. A에서 P의 변화가 4,4이고 P에서 B가 2,2라 정확히 두 배입니다.",
    "내분은 각 coordinate에 동일 affine weight를 적용합니다. vector ratio AP⃗:PB⃗=m:n을 확인하면 좌표별 계산과 기하적 위치를 동시에 검증할 수 있습니다.",
    check("A(2,−1), B(8,5)를 2:1로 내분한 점은?", ["(4,1)", "(6,3)", "(7,4)"], 1, "맞아요. P는 B에 가깝고 좌표는 (6,3)입니다.", "분모는 3, B에는 2, A에는 1을 붙여 x와 y를 따로 계산하세요."),
  ),
  "segment-recall": motion(
    "거리 삼각형과 내분 슬라이더의 한 화면 회상",
    "차이→제곱합→위치 예측→교차 평균 순서로 네 표지를 켜기",
    [
      beat("recall-differences", "highlight", "Δx와 Δy", "AB=√(Δx²+Δy²)", "음수 없는 거리", "좌표 자체가 아니라 두 점의 차이를 먼저 표시합니다."),
      beat("recall-position", "point", "m:n 슬라이더의 가까운 끝", "작은 구간 쪽에 가까움", "방향 예측", "공식 전에 점이 어느 쪽에 있어야 하는지 정합니다."),
      beat("recall-cross-average", "verify", "반대편 좌표와 비의 교차선", "P=(nA+mB)/(m+n)", "범위·비율 검산", "마지막에는 선분 안쪽과 벡터 비를 확인합니다."),
    ],
    "거리는 좌표 차로 만든 직각삼각형의 빗변입니다. 내분은 먼저 가까운 끝을 예측하고, 반대편 좌표와 비를 교차해 평균 냅니다. 결과가 선분 밖이면 멈춰 다시 보세요.",
    "norm과 affine combination을 분리하되 동일 segment 위에서 검증합니다. midpoint는 m=n=1인 특수한 affine average입니다.",
    check("내분 계산 뒤 가장 빠른 검산은?", ["점이 선분 안에 있는지 확인", "좌표를 모두 제곱", "비를 더하지 않기"], 0, "맞아요. 양의 내분비의 점은 반드시 두 끝 사이에 있습니다.", "공식 모양보다 결과의 기하적 위치를 먼저 되읽으세요."),
  ),

  "road-directions": motion(
    "출발점과 무관한 두 직선의 방향 화살표",
    "같은 기울기 화살표는 평행, 음의 역수 화살표는 90도 회전으로 겹쳐 보기",
    [
      beat("copy-slope", "group", "기울기 2인 두 방향", "y=2x+1 / y=2x−3", "평행", "절편은 달라도 한 칸 갈 때 두 칸 오르는 방향은 같습니다."),
      beat("rotate-direction", "transform", "(1,m)을 90도 돌린 방향", "(1,m)→(m,−1)", "기울기 −1/m", "가로·세로를 바꾸고 한 부호를 뒤집으면 직각 방향이 됩니다."),
      beat("separate-position", "verify", "기울기와 절편의 역할", "m=방향, b=위치", "관계는 방향부터", "같은 기울기에서 절편까지 같으면 평행한 다른 선이 아니라 같은 선입니다."),
    ],
    "기울기는 도로가 어느 방향으로 뻗는지 알려 주는 화살표입니다. 출발 높이는 달라도 같은 화살표면 평행합니다. 화살표를 직각으로 돌리면 기울기가 음의 역수가 됩니다.",
    "direction vector (1,m)의 perpendicular vector는 (m,−1)이며 slope product는 −1입니다. intercept는 incidence가 아니라 translation만 결정합니다.",
    check("기울기가 2인 직선과 수직인 일반 직선의 기울기는?", ["2", "1/2", "−1/2"], 2, "맞아요. 역수를 취하고 부호를 바꿔 −1/2입니다.", "직각 회전은 역수만이 아니라 부호도 함께 바꿉니다."),
  ),
  "two-lines-question": motion(
    "기울기 3과 −1/3의 직각 화살표",
    "일반형 두 식에서 y를 고립시키고 방향 삼각형을 겹쳐 곱을 확인",
    [
      beat("solve-first-slope", "highlight", "3x−y+1=0", "y=3x+1", "m₁=3", "y의 계수를 옮겨 첫 방향을 꺼냅니다."),
      beat("solve-second-slope", "point", "x+3y−2=0", "y=−x/3+2/3", "m₂=−1/3", "둘째 직선도 같은 y=mx+b 꼴로 정리합니다."),
      beat("multiply-slopes", "verify", "두 방향의 곱", "3·(−1/3)", "−1 → 수직", "상수항이 아니라 두 기울기만 직각 판정에 사용합니다."),
    ],
    "두 식을 나란히 y=mx+b 꼴로 바꾸면 방향이 3과 −1/3으로 보입니다. 곱이 −1이라 두 방향은 직각입니다. 상수항은 만나는 위치만 옮깁니다.",
    "일반형 ax+by+c=0의 slope는 −a/b입니다(b≠0). 두 finite slopes의 product가 −1이면 Euclidean inner product가 0입니다.",
    check("기울기 3과 −1/3인 두 직선의 관계는?", ["평행", "수직", "일치"], 1, "맞아요. 곱이 −1이므로 수직입니다.", "두 기울기를 실제로 곱해 부호와 역수를 함께 확인하세요."),
  ),
  "axis-exception": motion(
    "세로선 x=2와 가로선 y=5",
    "기울기 숫자 대신 축 방향 두 화살표를 직접 90도로 놓기",
    [
      beat("show-vertical-undefined", "highlight", "x=2의 세로 방향", "Δx=0", "기울기 정의 안 됨", "0으로 나눌 수 없어 숫자 기울기를 붙이지 않습니다."),
      beat("pair-horizontal", "point", "y=5의 가로 방향", "m=0", "세로선과 수직", "숫자 곱 대신 그림의 가로·세로 방향으로 바로 판정합니다."),
      beat("check-coincident", "verify", "같은 기울기와 같은 절편", "y=2x+1 / y=2x+1", "동일 직선", "평행 판정 뒤 절편까지 같으면 두 선이 완전히 겹칩니다."),
    ],
    "세로선은 한 칸 오른쪽으로 갈 수 없어 기울기를 숫자로 정할 수 없습니다. 그래서 가로선과의 수직 관계는 그림으로 처리합니다. 같은 기울기끼리는 절편까지 확인해야 합니다.",
    "vertical direction (0,1)은 horizontal (1,0)과 orthogonal하지만 slope chart에는 속하지 않습니다. projective direction과 affine position을 분리하세요.",
    check("x=2와 y=5의 관계는?", ["평행", "수직", "일치"], 1, "맞아요. 세로선과 가로선은 직각으로 만납니다.", "x=상수는 세로, y=상수는 가로라는 축 방향을 그려 보세요."),
  ),
  "parameter-slope": motion(
    "k를 기울기 조건으로 바꾸는 한 줄",
    "kx+2y−1=0의 방향을 꺼내 기울기 3 화살표와 직각 조건에 연결",
    [
      beat("extract-parameter-slope", "highlight", "kx+2y−1=0", "y=−(k/2)x+1/2", "m₁=−k/2", "미지 계수를 방향 숫자로 바꿉니다."),
      beat("apply-perpendicular", "point", "y=3x+4와 수직", "(−k/2)·3=−1", "3k/2=1", "수직 조건 하나를 k의 방정식으로 번역합니다."),
      beat("solve-and-check", "verify", "k=2/3", "m₁=−1/3", "3·(−1/3)=−1", "구한 값을 다시 기울기에 넣어 직각을 확인합니다."),
    ],
    "계수 k를 바로 비교하지 말고 먼저 기울기 −k/2로 바꿉니다. 수직인 상대 기울기 3과 곱해 −1이 되게 하면 k=2/3입니다.",
    "parameter constraint는 direction-space equation으로 환원합니다. b=0이 되는 vertical exceptional case도 algebraic division 전에 확인해야 합니다.",
    check("−k/2와 3이 수직 기울기라면 k는?", ["2/3", "3/2", "−2/3"], 0, "맞아요. (−k/2)·3=−1에서 k=2/3입니다.", "양변의 음수는 지워지고 3k/2=1이 됩니다."),
  ),
  "slope-recall": motion(
    "평행 복사·수직 회전·세로선 예외 카드",
    "세 방향 카드를 차례로 켜고 절편은 마지막에만 확인",
    [
      beat("recall-parallel", "highlight", "같은 방향 화살표", "m₁=m₂", "평행 또는 일치", "기울기가 같으면 먼저 방향이 같다고 판정합니다."),
      beat("recall-perpendicular", "transform", "90도 회전 화살표", "m₁m₂=−1", "수직", "유한 기울기에서는 음의 역수 관계를 확인합니다."),
      beat("recall-exceptions", "verify", "세로·가로와 같은 절편", "x=c ⟂ y=d", "예외·겹침 확인", "숫자 공식이 정의되지 않는 축 방향과 동일 직선을 끝에 점검합니다."),
    ],
    "평행은 방향 복사, 수직은 역수 뒤집기입니다. 단 세로선은 기울기가 없으니 가로선과의 직각을 그림으로 보고, 평행에서는 절편까지 같아 겹치는지 확인합니다.",
    "finite slope rules와 axis-aligned exceptional directions를 하나의 direction-vector 관점으로 통합하면 예외 암기가 줄어듭니다.",
    check("같은 기울기의 두 식을 본 뒤 추가로 확인할 것은?", ["절편이 같은지", "기울기를 제곱", "x를 0으로 고정"], 0, "맞아요. 절편도 같으면 두 직선은 일치합니다.", "평행한 서로 다른 선과 같은 선을 구분하려면 위치 정보를 봐야 합니다."),
  ),

  "shortest-rope": motion(
    "점에서 직선으로 내린 직각 수선",
    "비스듬한 두 선분과 수선을 나란히 그려 가장 짧은 길이만 남기기",
    [
      beat("compare-ropes", "group", "비스듬한 밧줄 두 개와 수선", "옆 이동이 있는 경로 vs 직각 경로", "수선이 최단", "직선 위 도착점이 옆으로 움직일수록 삼각형의 빗변이 길어집니다."),
      beat("show-normal-vector", "point", "ax+by+c=0의 법선 (a,b)", "직선에 수직인 방향", "분모 √(a²+b²)", "계수 a,b가 거리 측정 방향과 그 길이를 줍니다."),
      beat("project-offset", "verify", "점 대입값의 정규화", "|ax₀+by₀+c|/√(a²+b²)", "실제 수선 길이", "식의 배수와 무관하도록 법선 길이로 나눕니다."),
    ],
    "벽까지 가장 짧은 밧줄은 벽에 직각인 수선입니다. 직선 계수 a,b가 이 수선 방향을 알려 주고, 점을 식에 넣은 값을 그 방향의 길이로 나누면 실제 거리가 됩니다.",
    "거리식은 signed normal projection의 절댓값입니다. normal vector를 unit length로 정규화해야 같은 직선의 scalar multiple 표현에 불변입니다.",
    check("점과 직선 사이 거리의 경로는 어떤 선분인가요?", ["직선에 평행한 선분", "직선에 수직인 선분", "아무 선분"], 1, "맞아요. 수선이 가장 짧은 경로입니다.", "비스듬한 경로는 옆 이동이 더해져 빗변이 됩니다."),
  ),
  "distance-meter-question": motion(
    "P(2,−1) 대입값 10과 법선 길이 5",
    "분자와 분모를 서로 다른 색으로 계산해 마지막에 10÷5로 합치기",
    [
      beat("substitute-point", "highlight", "3x+4y−12에 P 대입", "6−4−12=−10", "절댓값 10", "부호는 어느 쪽인지 말하고 거리는 절댓값으로 바꿉니다."),
      beat("measure-normal", "point", "법선 (3,4)", "√(3²+4²)", "5", "3-4-5 삼각형으로 법선 벡터 길이를 구합니다."),
      beat("normalize-distance", "verify", "분자 10 ÷ 분모 5", "10/5", "거리 2", "직선식을 배로 늘려도 두 부분이 함께 늘어 같은 2가 됩니다."),
    ],
    "점 P를 직선식에 넣으면 −10입니다. 방향 부호는 떼고 10만 남깁니다. 법선 3,4의 길이는 5이므로 실제 거리는 10/5=2입니다.",
    "signed offset −10을 normal magnitude 5로 나눈 absolute projection이 2입니다. homogeneous line coefficients의 scale invariance를 확인하세요.",
    check("P(2,−1)와 3x+4y−12=0 사이 거리는?", ["2", "5", "10"], 0, "맞아요. |6−4−12|/5=10/5=2입니다.", "분자 절댓값 10을 법선 길이 5로 한 번 더 나누세요."),
  ),
  "absolute-and-normalization": motion(
    "음수 대입값의 절댓값과 계수 배수 지우기",
    "−10을 +10 길이로 접고 식을 2배 했을 때 20/10이 되는 모습 비교",
    [
      beat("remove-side-sign", "highlight", "대입값 −10", "signed side=−", "길이 |−10|=10", "거리에는 방향이 없으므로 음수 부호를 길이에서 제거합니다."),
      beat("scale-equation", "transform", "직선식 전체 ×2", "6x+8y−24=0", "분자 20, 분모 10", "같은 직선을 다르게 적어도 두 부분이 같은 배수로 변합니다."),
      beat("confirm-invariance", "verify", "20/10과 10/5", "둘 다 2", "표현과 무관한 거리", "분모를 빼면 같은 직선에서 다른 답이 나오는 모순이 생깁니다."),
    ],
    "대입값의 부호는 점이 선의 어느 쪽에 있는지만 알려 줍니다. 길이는 절댓값을 씌웁니다. 직선식을 몇 배로 적어도 답이 같으려면 반드시 법선 길이로 나눠야 합니다.",
    "distance is invariant under nonzero scaling of homogeneous line coordinates. absolute value quotients the two oriented half-planes into a nonnegative metric.",
    check("거리 공식에서 분모 √(a²+b²)가 필요한 이유는?", ["답을 크게 하려고", "직선식의 배수 표현을 없애려고", "부호를 만들려고"], 1, "맞아요. 같은 직선을 몇 배로 적어도 같은 거리가 나와야 합니다.", "직선식 전체를 2배 했을 때 분자도 2배가 된다는 점을 보세요."),
  ),
  "parallel-gap": motion(
    "평행선 한쪽의 쉬운 점에서 다른 선까지 수선",
    "(0,1)을 첫 직선에 찍고 둘째 직선까지 법선 방향으로 거리 표시",
    [
      beat("choose-easy-point", "highlight", "2x−y+1=0 위의 (0,1)", "2·0−1+1=0", "첫 선 위 점", "x=0처럼 계산이 쉬운 값을 골라 한 점을 만듭니다."),
      beat("measure-to-other-line", "point", "(0,1)에서 2x−y−4=0까지", "|0−1−4|/√5", "5/√5", "같은 법선 계수를 가진 다른 선에 점 거리 공식을 씁니다."),
      beat("simplify-gap", "verify", "5/√5", "√5", "평행선 간격", "어느 점을 골라도 두 평행선 사이 수선 길이는 같습니다."),
    ],
    "첫 직선 위에서 가장 쉬운 점 (0,1)을 고릅니다. 그 점과 둘째 직선 사이 거리를 재면 두 평행선의 간격입니다. 계산은 |−5|/√5=√5입니다.",
    "normalized parallel equations share normal (a,b), so gap=|c₁−c₂|/√(a²+b²). Choosing a point derives the shortcut without memorizing it blindly.",
    check("두 평행선 사이 거리를 구하는 안전한 방법은?", ["한 선 위 점을 골라 다른 선까지 거리 측정", "두 기울기를 더하기", "절편만 무조건 빼기"], 0, "맞아요. 한쪽의 실제 점에서 다른 선까지 수선을 재면 됩니다.", "평행선 중 하나를 점으로 바꾸면 이미 아는 점-직선 거리 문제가 됩니다."),
  ),
  "perpendicular-recall": motion(
    "일반형→대입→절댓값→정규화 네 단계",
    "네 표지를 왼쪽 위에서 오른쪽 아래 순서로 하나씩 연결",
    [
      beat("recall-general-form", "highlight", "ax+by+c=0", "한쪽으로 모두 모으기", "계수 a,b,c", "거리 측정 전에 직선을 일반형으로 정리합니다."),
      beat("recall-numerator", "point", "점 대입값", "|ax₀+by₀+c|", "방향 제거", "대입값의 절댓값으로 어느 쪽 부호도 같은 길이로 만듭니다."),
      beat("recall-denominator", "verify", "법선 벡터 길이", "÷√(a²+b²)", "수선 거리", "점이 선 위면 분자가 0인지, 식을 배로 해도 답이 같은지 검산합니다."),
    ],
    "직선을 일반형으로 만들고 점을 넣습니다. 부호는 절댓값으로 없애고, 계수 a,b의 길이로 나눕니다. 점이 선 위라면 0, 식을 몇 배 해도 같은 값이어야 합니다.",
    "the metric formula is absolute signed distance after normal normalization. zero-incidence and scale-invariance are its two fastest contracts.",
    check("점이 직선 위에 있으면 거리 공식의 분자는?", ["0", "1", "√(a²+b²)"], 0, "맞아요. 직선식을 만족하므로 대입값이 0입니다.", "‘직선 위’는 ax₀+by₀+c=0이라는 뜻입니다."),
  ),

  "compass-trace": motion(
    "고정 중심과 일정한 반지름",
    "컴퍼스 중심에서 움직이는 점까지 반지름을 세 방향으로 돌리기",
    [
      beat("fix-center", "highlight", "중심 C(a,b)", "움직이지 않는 바늘", "고정점", "원의 모든 점이 공유하는 기준점을 먼저 고정합니다."),
      beat("rotate-radius", "point", "C에서 P(x,y)까지", "(x−a, y−b)", "길이 r", "점이 어디로 움직여도 중심과의 거리는 같습니다."),
      beat("square-distance", "verify", "가로·세로 차의 제곱합", "(x−a)²+(y−b)²", "r²", "피타고라스 정리를 모든 원 위 점에 적용합니다."),
    ],
    "컴퍼스 바늘은 중심에 고정되고 연필만 움직입니다. 가로 차와 세로 차로 만든 빗변이 항상 r이므로 제곱합은 r²입니다.",
    "circle is the level set of squared Euclidean distance from center C. Standard form records a fixed norm constraint, not merely a visual curve.",
    check("중심 (a,b), 반지름 r인 원의 식은?", ["(x+a)²+(y+b)²=r", "(x−a)²+(y−b)²=r²", "x²+y²=a+b+r"], 1, "맞아요. 중심까지 거리의 제곱이 r²로 일정합니다.", "괄호는 좌표 차이고 우변은 반지름의 제곱입니다."),
  ),
  "radius-from-point": motion(
    "C(2,−1)에서 P(5,3)까지 3-4-5 반지름",
    "가로 3·세로 4를 그린 뒤 반지름 5와 표준형에 연결",
    [
      beat("measure-radius", "group", "C→P의 가로 3, 세로 4", "r=√(3²+4²)", "r=5", "중심과 한 점의 좌표 차로 반지름을 복원합니다."),
      beat("write-standard-form", "point", "중심 C(2,−1)", "(x−2)²+(y+1)²", "=25", "괄호를 영으로 만드는 좌표가 중심이 되게 씁니다."),
      beat("substitute-point", "verify", "P(5,3) 대입", "3²+4²", "25", "주어진 점이 원 식을 만족하는지 되읽습니다."),
    ],
    "중심에서 주어진 점까지 가로 3, 세로 4라 반지름은 5입니다. 중심의 y가 −1이므로 식 안은 y+1이고 우변은 25입니다.",
    "center is the zero of both translated coordinates; a supplied point fixes radius by its norm. Substitution is an exact incidence check.",
    check("중심 (2,−1), 반지름 5인 원의 식은?", ["(x−2)²+(y+1)²=25", "(x+2)²+(y−1)²=5", "(x−2)²+(y−1)²=25"], 0, "맞아요. 중심 부호는 괄호 안에서 반대로 보이고 우변은 5²입니다.", "괄호를 0으로 만드는 값이 (2,−1)인지 확인하세요."),
  ),
  "sign-and-square-trap": motion(
    "괄호를 영으로 만드는 중심과 r² 카드",
    "(x−2), (y+3), 25를 각각 2, −3, 5에 연결",
    [
      beat("read-center-signs", "highlight", "(x−2)²+(y+3)²", "x=2, y=−3에서 0", "중심 (2,−3)", "눈에 보이는 부호가 아니라 괄호를 영으로 만드는 값을 읽습니다."),
      beat("take-radius-root", "point", "우변 25", "r²=25", "r=5", "반지름은 길이라 양의 제곱근을 취합니다."),
      beat("reject-negative-radius-square", "verify", "표준형 우변", "r²≥0", "음수면 실수 원 없음", "제곱합이 음수가 될 수 없다는 존재 조건을 확인합니다."),
    ],
    "x−2가 보이면 중심 x는 2, y+3이면 중심 y는 −3입니다. 우변 25는 반지름이 아니라 반지름 제곱이므로 실제 길이는 5입니다.",
    "standard form encodes center as translated-coordinate zero and radius via a nonnegative squared norm. Negative right side has empty real locus.",
    check("(x−2)²+(y+3)²=25의 중심과 반지름은?", ["(−2,3), 25", "(2,−3), 5", "(2,3), 5"], 1, "맞아요. 괄호를 영으로 만들면 (2,−3), √25=5입니다.", "중심은 괄호를 0으로 만드는 값, 반지름은 우변의 양의 제곱근입니다."),
  ),
  "complete-the-circle": motion(
    "x와 y의 완전제곱 두 상자",
    "x²−4x와 y²+6y를 각각 (x−2)², (y+3)²로 접기",
    [
      beat("complete-x", "group", "x²−4x", "(x−2)²−4", "x 중심 2", "일차항 계수 −4의 절반 −2를 괄호에 넣습니다."),
      beat("complete-y", "group", "y²+6y", "(y+3)²−9", "y 중심 −3", "계수 6의 절반 3으로 둘째 완전제곱을 만듭니다."),
      beat("collect-radius", "verify", "−4−9−12", "(x−2)²+(y+3)²=25", "중심 (2,−3), r=5", "상수 이동을 모두 반영한 뒤 다시 전개해 원식을 확인합니다."),
    ],
    "x끼리, y끼리 따로 모아 일차항 계수의 절반을 괄호에 넣습니다. 빠진 4와 9를 정확히 반영하면 표준형 우변이 25가 됩니다.",
    "completing squares is translation to the quadratic center. Constant bookkeeping preserves equality and reveals squared radius as the residual level.",
    check("x²−4x를 완전제곱으로 쓰면?", ["(x−2)²−4", "(x−4)²−2", "(x+2)²+4"], 0, "맞아요. (x−2)²=x²−4x+4라 4를 다시 빼야 합니다.", "일차항 계수의 절반은 −2이고, 새로 생긴 4를 보정하세요."),
  ),
  "circle-recall": motion(
    "중심 바늘·반지름·완전제곱 세 표지",
    "표준형에서 중심과 반지름을 읽고 전개형을 다시 접는 순서로 재생",
    [
      beat("recall-center", "highlight", "괄호를 영으로 만드는 좌표", "(x−a),(y−b)", "중심 (a,b)", "보이는 부호가 아니라 0이 되는 값을 읽습니다."),
      beat("recall-radius", "point", "우변 r²", "양의 제곱근", "반지름 r", "길이는 음수가 아니며 우변 자체와 구분합니다."),
      beat("recall-completion", "verify", "전개형의 x·y 묶음", "계수 절반→완전제곱", "표준형 복원", "복원 뒤 다시 전개해 부호와 상수를 검산합니다."),
    ],
    "괄호를 0으로 만드는 곳에 컴퍼스 바늘을 꽂고, 우변의 제곱근만큼 연필을 벌립니다. 전개형이면 x와 y를 따로 완전제곱으로 접습니다.",
    "center extraction, radius-level reading, and completing-square inversion form a reversible representation contract for circles.",
    check("원 표준형 우변 16이 뜻하는 반지름은?", ["4", "8", "16"], 0, "맞아요. r²=16이므로 r=4입니다.", "우변은 반지름의 제곱입니다."),
  ),

  "fence-and-path": motion(
    "중심-직선 수선 d와 원의 반지름 r",
    "직선을 원 안·접선·원 밖 세 위치로 이동해 교점 수를 비교",
    [
      beat("line-inside", "group", "d<r인 직선", "중심 가까이 통과", "교점 2개", "직선이 원 안으로 들어왔다가 다시 나가므로 두 번 만납니다."),
      beat("line-tangent", "point", "d=r인 직선", "반지름 끝에서 스침", "교점 1개", "수선의 발이 원 경계에 정확히 놓여 접점이 됩니다."),
      beat("line-outside", "verify", "d>r인 직선", "원 바깥 통과", "교점 0개", "수선조차 반지름보다 길면 직선 전체가 원에 닿지 않습니다."),
    ],
    "중심에서 직선까지 가장 짧은 거리 d를 재고 반지름 r과 비교합니다. d가 작으면 두 점, 같으면 한 점, 크면 만나지 않습니다.",
    "line-circle incidence is classified by signed-distance magnitude relative to radius. It is the geometric counterpart of discriminant sign.",
    check("중심-직선 거리 d가 반지름 r보다 작으면 교점 수는?", ["0개", "1개", "2개"], 2, "맞아요. 직선이 원 내부를 지나 두 번 경계를 통과합니다.", "울타리 안으로 들어간 길은 들어갈 때와 나올 때 두 번 만납니다."),
  ),
  "moving-line-question": motion(
    "원 양쪽의 평행한 두 접선",
    "4x−3y+k=0을 이동해 중심 거리 3인 두 위치에 고정",
    [
      beat("measure-center-offset", "highlight", "중심 (1,−2) 대입", "|4+6+k|/5", "|k+10|/5", "법선 길이 5로 나눈 중심의 직선 거리입니다."),
      beat("set-tangent-distance", "point", "접선 조건 d=r=3", "|k+10|/5=3", "|k+10|=15", "접할 때 수선 길이가 반지름과 정확히 같습니다."),
      beat("split-two-sides", "verify", "k+10=±15", "k=5 또는 −25", "양쪽 접선 2개", "절댓값의 두 부호가 원의 서로 반대편 위치를 나타냅니다."),
    ],
    "직선의 방향은 그대로 두고 k를 바꾸면 평행하게 움직입니다. 중심까지 거리가 3이 되는 위치는 원 위아래 두 곳이라 k가 두 값 나옵니다.",
    "the absolute signed-distance equation produces two parallel support lines at offsets ±r from center. Both branches are geometrically necessary.",
    check("접선 조건 |k+10|=15의 해는?", ["k=5만", "k=−25만", "k=5 또는 −25"], 2, "맞아요. 절댓값은 원의 양쪽 접선을 모두 줍니다.", "k+10을 15와 −15 두 경우로 나누세요."),
  ),
  "compare-like-quantities": motion(
    "길이 d·r와 제곱 d²·r²의 두 저울",
    "d를 r² 저울에서 빼고 같은 단위끼리만 올리기",
    [
      beat("show-mismatch", "highlight", "거리 d와 반지름 제곱 r²", "길이 vs 길이²", "직접 비교 금지", "서로 다른 종류의 양을 같은 저울에 놓지 않습니다."),
      beat("compare-lengths", "point", "d와 r", "d<r, d=r, d>r", "2·1·0개", "근호를 유지하면 길이끼리 바로 비교합니다."),
      beat("compare-squares", "verify", "d²와 r²", "둘 다 비음수", "같은 판정", "근호를 없앨 때는 양쪽을 모두 제곱한 뒤 비교합니다."),
    ],
    "거리 d와 반지름 r은 같은 길이입니다. 우변에 보인 r²와 d를 바로 비교하지 마세요. 근호를 없애려면 d²와 r²를 함께 비교합니다.",
    "dimensionally consistent comparison is required: nonnegative lengths preserve order under squaring, but length and squared length are not comparable quantities.",
    check("근호를 없애 위치 관계를 비교하려면?", ["d와 r² 비교", "d²와 r² 비교", "d²와 r 비교"], 1, "맞아요. 양쪽을 같은 차수로 제곱해 비교합니다.", "길이는 길이끼리, 제곱은 제곱끼리 맞추세요."),
  ),
  "position-decision": motion(
    "원 중심 (1,−2), r=3과 직선 거리 17/5",
    "전개 원을 표준형으로 접고 중심에서 직선까지 수선을 그어 바깥 판정",
    [
      beat("recover-circle", "group", "x²+y²−2x+4y−4=0", "(x−1)²+(y+2)²=9", "C=(1,−2), r=3", "완전제곱으로 비교에 필요한 중심과 반지름만 꺼냅니다."),
      beat("measure-line-distance", "point", "3x+4y−12=0", "|3−8−12|/5", "d=17/5", "중심 좌표를 직선 거리 공식에 넣습니다."),
      beat("decide-no-intersection", "verify", "17/5와 3", "17/5>3", "교점 0개", "수선이 반지름 문턱보다 길어 직선이 원 밖을 지납니다."),
    ],
    "먼저 원을 표준형으로 바꾸어 중심과 반지름을 찾습니다. 중심에서 직선까지 거리는 17/5이고 반지름 3보다 크므로 둘은 만나지 않습니다.",
    "extract only center and radius, then classify with normalized line distance. Algebraic intersection is unnecessary unless coordinates of intersections are requested.",
    check("d=17/5, r=3이면 원과 직선은?", ["두 점에서 만남", "접함", "만나지 않음"], 2, "맞아요. 17/5가 3보다 커 직선은 원 밖입니다.", "거리 문턱 r보다 d가 큰지 작은지 소수나 교차곱으로 비교하세요."),
  ),
  "radius-gate-recall": motion(
    "반지름 문턱 안·위·밖의 세 칸",
    "수선 끝을 원 안에서 경계, 바깥으로 이동하며 교점 숫자를 붙이기",
    [
      beat("recall-inside", "highlight", "d<r", "수선 끝이 원 안", "교점 2", "직선은 원의 경계를 들어가고 나옵니다."),
      beat("recall-boundary", "point", "d=r", "수선 끝이 원 위", "접점 1", "수선의 발 하나가 접점입니다."),
      beat("recall-outside", "verify", "d>r", "수선 끝이 원 밖", "교점 0", "절댓값 접선 문제라면 양쪽 위치 두 해도 확인합니다."),
    ],
    "중심에서 길까지 재고 반지름 문턱과 비교합니다. 안이면 2, 문턱 위면 1, 밖이면 0입니다. 접선의 평행 이동 값은 양쪽에 하나씩 있을 수 있습니다.",
    "distance-radius trichotomy is equivalent to positive/zero/negative intersection discriminant but retains direct geometric meaning.",
    check("d=r인 경우의 이름은?", ["할선", "접선", "평행선"], 1, "맞아요. 원을 한 점에서 스치는 접선입니다.", "중심에서 접점까지의 수선이 바로 반지름입니다."),
  ),

  "transparent-sticker": motion(
    "모든 점에 같은 이동 벡터 (a,b)",
    "삼각형 세 꼭짓점의 화살표를 같은 길이·방향으로 동시에 이동",
    [
      beat("attach-same-vectors", "group", "도형의 모든 점", "각 점 +(a,b)", "모양·크기 보존", "한 점만이 아니라 모든 점에 같은 화살표를 붙입니다."),
      beat("move-point-forward", "point", "원래 점 (x,y)", "(x,y)→(x+a,y+b)", "도착 좌표", "점의 관점에서는 이동량을 그대로 더합니다."),
      beat("trace-equation-back", "verify", "새 위치 (x,y)의 출발점", "(x−a,y−b)", "f(x−a,y−b)=0", "새 식은 현재 점이 원래 어디서 왔는지 반대로 추적합니다."),
    ],
    "투명 스티커의 모든 점은 같은 화살표만큼 움직입니다. 점은 앞으로 가므로 더하고, 새 방정식은 출발점을 되찾아야 하므로 변수에서 이동량을 뺍니다.",
    "translation T_v sends points p→p+v; pullback of an implicit equation is f∘T_{−v}. Pushforward and coordinate substitution use opposite signs.",
    check("f(x,y)=0을 (a,b)만큼 평행이동한 식은?", ["f(x+a,y+b)=0", "f(x−a,y−b)=0", "f(ax,by)=0"], 1, "맞아요. 새 점에서 이동량을 빼 옛 좌표를 찾습니다.", "점 이동의 더하기와 식의 역추적 빼기를 구분하세요."),
  ),
  "parabola-slide-question": motion(
    "꼭짓점 (0,0)에서 (3,−2)로 이동",
    "포물선 전체를 오른쪽 3·아래 2 화살표로 밀고 새 꼭짓점을 강조",
    [
      beat("move-vertex", "highlight", "원래 꼭짓점 (0,0)", "+(3,−2)", "새 꼭짓점 (3,−2)", "복잡한 곡선보다 기준점 하나를 먼저 정확히 옮깁니다."),
      beat("pull-back-x", "point", "새 x에서 옛 x", "x−3", "오른쪽 이동", "새 점의 출발 x를 찾으려면 3을 뺍니다."),
      beat("write-shifted-parabola", "verify", "y+2=(x−3)²", "(3,−2) 대입 → 0=0", "부호 검산", "새 꼭짓점이 식을 만족하는지 바로 확인합니다."),
    ],
    "원래 꼭짓점은 (0,0)이고 오른쪽 3, 아래 2로 가서 (3,−2)가 됩니다. 새 식 y+2=(x−3)²에 그 점을 넣으면 양쪽이 0입니다.",
    "graph translation y=f(x) by (h,k) gives y−k=f(x−h). Distinguished points provide a fast sign-invariant check.",
    check("y=x²을 오른쪽 3, 아래 2 이동한 식은?", ["y−2=(x+3)²", "y+2=(x−3)²", "y+3=(x−2)²"], 1, "맞아요. 새 꼭짓점은 (3,−2)입니다.", "괄호와 y항을 0으로 만드는 점이 원하는 꼭짓점인지 확인하세요."),
  ),
  "same-sign-error": motion(
    "점 화살표 +2와 식의 역화살표 x−2",
    "같은 이동을 정방향·역추적 두 줄로 나란히 표시",
    [
      beat("show-point-forward", "highlight", "점의 오른쪽 2 이동", "x_old→x_old+2", "도착 +2", "점은 실제 이동 방향으로 좌표에 2를 더합니다."),
      beat("show-wrong-equation", "point", "식에 x+2를 넣은 경우", "x+2=0 at x=−2", "왼쪽 이동", "같은 부호를 복사하면 기준점이 반대쪽으로 갑니다."),
      beat("replace-with-pullback", "verify", "새 x의 옛 좌표", "x_old=x_new−2", "식에는 x−2", "기준점이 원하는 새 위치에서 0이 되는지 확인합니다."),
    ],
    "점은 앞으로 움직여 +2지만 식은 새 위치에서 옛 좌표를 물으므로 x−2를 넣습니다. x+2를 넣으면 기준점이 −2에서 0이 되어 왼쪽 이동입니다.",
    "implicit equations transform contravariantly under coordinate changes. Checking a distinguished point exposes sign reversal immediately.",
    check("오른쪽 2 이동한 식 안에 들어갈 x 표현은?", ["x+2", "x−2", "2x"], 1, "맞아요. 새 좌표에서 출발 좌표로 돌아가려면 2를 뺍니다.", "x−2가 0이 되는 위치가 x=2인지 확인하세요."),
  ),
  "translate-equation": motion(
    "원 중심 (0,0)에서 (−1,3)으로 이동",
    "이동 벡터와 식의 반대 대입을 연결해 새 원을 그리기",
    [
      beat("move-center", "highlight", "중심 (0,0)", "+(−1,3)", "새 중심 (−1,3)", "원 전체 대신 중심을 먼저 옮기고 반지름은 유지합니다."),
      beat("pull-back-coordinates", "point", "새 점의 옛 좌표", "x−(−1)=x+1, y−3", "(x+1,y−3)", "이동 벡터를 변수에서 반대로 뺍니다."),
      beat("write-new-circle", "verify", "(x+1)²+(y−3)²=4", "중심 (−1,3), r=2", "이동 완료", "새 중심과 원래 반지름이 식에서 그대로 읽히는지 확인합니다."),
    ],
    "원 중심은 (0,0)에서 (−1,3)으로 갑니다. 새 위치에서 옛 좌표는 (x+1,y−3)이므로 식은 (x+1)²+(y−3)²=4입니다.",
    "translation preserves radius and shape; only center is shifted. Pullback substitution matches direct center transport exactly.",
    check("x²+y²=4를 왼쪽 1, 위 3 이동한 식은?", ["(x−1)²+(y+3)²=4", "(x+1)²+(y−3)²=4", "(x+1)²+(y+3)²=4"], 1, "맞아요. 새 중심은 (−1,3)입니다.", "괄호를 0으로 만드는 중심이 (−1,3)인지 확인하세요."),
  ),
  "translation-recall": motion(
    "점은 앞으로·식은 출발점으로 두 방향 카드",
    "(a,b) 화살표를 점 카드에는 더하고 식 카드에는 빼기",
    [
      beat("recall-point-rule", "highlight", "점 p", "p→p+(a,b)", "앞으로 더하기", "좌표점이 실제 어디로 갔는지 기록합니다."),
      beat("recall-equation-rule", "transform", "식 f", "f(x−a,y−b)=0", "뒤로 빼기", "현재 점의 출발 위치를 원래 식에 묻습니다."),
      beat("recall-invariants", "verify", "길이·각도·모양", "모든 점에 같은 벡터", "그대로 보존", "중심·꼭짓점이 원하는 곳으로 갔는지 기준점으로 검산합니다."),
    ],
    "점은 화살표를 따라 더하고 식은 출발점으로 돌아가 빼기입니다. 모든 점이 같은 벡터를 받아 길이와 모양은 변하지 않습니다.",
    "translation is an isometry; point action and equation pullback are inverse-coordinate views of the same group action.",
    check("평행이동 뒤에도 보존되는 것은?", ["모양과 길이", "모든 좌표값", "중심의 위치"], 0, "맞아요. 위치는 바뀌지만 모양·길이·각도는 같습니다.", "투명 스티커 전체를 밀어도 그림 자체는 늘어나지 않습니다."),
  ),

  "folding-paper": motion(
    "대칭축 양쪽 같은 거리의 점 두 개",
    "x축·y축·원점·y=x 접기를 차례로 보여 좌표 규칙 연결",
    [
      beat("fold-x-axis", "group", "x축 양쪽의 P와 P′", "(x,y)→(x,−y)", "x 유지", "축을 따라가는 가로 위치는 남고 세로 거리만 반대로 갑니다."),
      beat("fold-origin", "transform", "원점 반대편", "(x,y)→(−x,−y)", "두 부호 반전", "반 바퀴 돌아 두 방향이 모두 바뀝니다."),
      beat("fold-diagonal", "verify", "y=x 양쪽", "(x,y)→(y,x)", "좌표 자리 교환", "가로 거리와 세로 거리가 접는 선을 기준으로 서로 역할을 바꿉니다."),
    ],
    "대칭은 종이를 접어 두 점이 포개지는 이동입니다. 축의 방향 좌표는 남고 축에서 떨어진 좌표만 바뀝니다. y=x는 가로와 세로 역할을 바꿉니다.",
    "reflection fixes the mirror subspace and negates its normal component. Coordinate rules are basis-specific forms of that decomposition.",
    check("x축 대칭에서 그대로 남는 좌표는?", ["x좌표", "y좌표", "둘 다 바뀜"], 0, "맞아요. x축 방향 위치는 그대로이고 y만 부호가 바뀝니다.", "축 이름은 움직이지 않는 방향을 알려 줍니다."),
  ),
  "coordinate-mirror-question": motion(
    "P(3,−2)의 네 대칭점",
    "한 점을 x축·y축·원점·y=x 네 거울로 복제해 좌표를 붙이기",
    [
      beat("reflect-axes", "group", "x축과 y축 대칭", "x축:(3,2), y축:(−3,−2)", "축 방향 좌표 유지", "각 축 이름의 좌표를 남기고 다른 부호만 바꿉니다."),
      beat("reflect-origin", "point", "원점 대칭", "(3,−2)→(−3,2)", "두 부호 반전", "원점을 중점으로 정반대 점에 놓습니다."),
      beat("reflect-diagonal", "verify", "y=x 대칭", "(3,−2)→(−2,3)", "좌표 교환", "두 좌표의 자리만 바뀌는지 확인합니다."),
    ],
    "P(3,−2)에서 x축 대칭은 (3,2), y축은 (−3,−2), 원점은 (−3,2), y=x는 (−2,3)입니다. 무엇이 고정되는지 먼저 보세요.",
    "each reflection is an involutive linear isometry. Midpoints lie on the mirror and connecting segments are perpendicular to it.",
    check("P(3,−2)를 y=x에 대칭시킨 점은?", ["(−3,2)", "(−2,3)", "(3,2)"], 1, "맞아요. x와 y의 자리를 바꿔 (−2,3)입니다.", "y=x 거울은 부호가 아니라 두 좌표의 역할을 교환합니다."),
  ),
  "axis-name-confusion": motion(
    "x축 이름표와 실제로 바뀌는 y좌표",
    "축 방향·수직 방향을 다른 색으로 나눠 잘못 바꾼 x를 복원",
    [
      beat("show-axis-direction", "highlight", "x축을 따라가는 x", "x→x", "고정", "접는 선 위 방향은 대칭 전후 바뀌지 않습니다."),
      beat("flip-normal-direction", "point", "x축에서 떨어진 y", "y→−y", "부호 반전", "축의 수직 방향 거리만 반대편으로 옮깁니다."),
      beat("apply-twice", "verify", "같은 대칭 두 번", "(x,y)→(x,−y)→(x,y)", "원래 점 복원", "대칭 규칙이 맞으면 두 번 적용했을 때 제자리로 돌아옵니다."),
    ],
    "x축 대칭이라는 이름은 x를 바꾸라는 뜻이 아니라 x축 방향을 남기라는 뜻입니다. 바뀌는 것은 축에서 떨어진 y의 부호입니다.",
    "reflection is an involution: R²=I. This property is a fast algebraic contract for coordinate substitution rules.",
    check("x축 대칭 규칙은?", ["(x,y)→(−x,y)", "(x,y)→(x,−y)", "(x,y)→(y,x)"], 1, "맞아요. x는 남고 y 부호만 바뀝니다.", "축 이름의 좌표는 보존된다고 기억하세요."),
  ),
  "reflect-circle": motion(
    "중심 (2,−1)을 y=x로 접어 (−1,2)로 이동",
    "중심점 좌표를 맞바꾸고 반지름 2 원을 새 중심에서 다시 그리기",
    [
      beat("swap-center", "highlight", "원래 중심 (2,−1)", "(x,y)→(y,x)", "새 중심 (−1,2)", "도형 전체보다 중심의 좌표 변환을 먼저 적용합니다."),
      beat("preserve-radius", "point", "반지름 2", "대칭은 거리 보존", "r=2 그대로", "거울 접기는 원을 늘이거나 줄이지 않습니다."),
      beat("write-reflected-circle", "verify", "새 중심 표준형", "(x+1)²+(y−2)²", "=4", "원식에서 x와 y를 맞바꾼 결과와도 일치하는지 봅니다."),
    ],
    "중심 (2,−1)의 좌표를 맞바꾸면 (−1,2)입니다. 반지름은 그대로 2라 새 식은 (x+1)²+(y−2)²=4입니다.",
    "isometric reflection transports center and preserves radius. Pullback variable swap and direct geometric transport yield the same locus.",
    check("중심 (2,−1), r=2인 원을 y=x 대칭하면 중심은?", ["(−2,1)", "(−1,2)", "(1,−2)"], 1, "맞아요. 좌표를 맞바꿔 (−1,2)입니다.", "y=x 대칭은 x와 y의 자리를 교환합니다."),
  ),
  "mirror-recall": motion(
    "x축·y축·원점·y=x 네 규칙의 최소 카드",
    "고정 좌표와 바뀌는 좌표를 한 번씩 짚고 두 번 적용 검산",
    [
      beat("recall-axis-rules", "highlight", "x축:(x,−y), y축:(−x,y)", "축 이름 좌표 유지", "한 부호 반전", "접는 선 방향을 남기고 수직 방향만 뒤집습니다."),
      beat("recall-origin-diagonal", "transform", "원점:(−x,−y), y=x:(y,x)", "두 부호 / 자리 교환", "두 다른 거울", "원점과 대각선의 변환을 서로 섞지 않습니다."),
      beat("recall-involution", "verify", "같은 대칭 두 번", "R(R(P))", "P 복원", "거리 보존과 두 번 복원을 마지막 계약으로 확인합니다."),
    ],
    "축 이름의 좌표는 남고 다른 부호가 바뀝니다. 원점은 두 부호, y=x는 두 자리입니다. 같은 거울을 두 번 쓰면 반드시 원래로 돌아옵니다.",
    "the four standard reflections are orthogonal involutions. Fixed subspace, normal negation, and R²=I unify their coordinate mnemonics.",
    check("y축 대칭 규칙은?", ["(x,y)→(−x,y)", "(x,y)→(x,−y)", "(x,y)→(y,x)"], 0, "맞아요. y축 방향 y는 남고 x 부호만 바뀝니다.", "축 이름인 y를 보존하고 그 수직 방향 x를 뒤집으세요."),
  ),
};

const shard = JSON.parse(fs.readFileSync(shardPath, "utf8"));
const targetStories = shard.stories.filter((story) => story.unitId === "coordinate-geometry");
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
console.log(`Authored coordinate geometry motion: ${targetStories.length} stories / ${targetSceneIds.size} scenes`);
