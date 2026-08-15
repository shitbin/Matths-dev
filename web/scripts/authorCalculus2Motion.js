#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const shardPath = path.resolve(
  __dirname,
  "..",
  "content_folder",
  "curriculum-stories",
  "calculus-2.json",
);
const shard = JSON.parse(fs.readFileSync(shardPath, "utf8"));

function clean(value) {
  return String(value || "")
    .replace(/\[/gu, "(")
    .replace(/\]/gu, ")");
}

const specs = {
  "calculus-2-01-01": {
    mode: "graph",
    instruction: "수열의 앞부분은 흐리게 두고 n이 커진 뒤의 꼬리만 확대해 한 값에 모이는지, 커지는지, 진동하는지 포인터로 추적",
    mild: "앞의 몇 항은 힌트일 뿐이에요. n을 계속 오른쪽으로 보내며 항들이 머무는 높이 하나가 생기는지 먼저 보세요.",
    spicy: "핵심은 finite prefix가 아니라 tail behavior입니다. 유리식은 최고차항으로 나눠 지배항의 차수와 계수비만 남깁니다.",
    scenes: [
      ["n이 큰 꼬리", "aₙ → L", "한 높이 L에 모임"],
      ["발산의 세 방향", "+∞, −∞, 진동", "흩어지는 모양을 구분"],
      ["초기항과 꼬리", "a₁,a₂,a₃ ≠ 전체", "유한 표만으로 결론 금지"],
      ["최고차항의 차수", "(2n²+1)/(n²−3)", "계수비 2로 수렴"],
      ["수열의 마지막 표정", "n → ∞", "꼬리가 머무는 곳 확인"],
    ],
    distractors: ["첫 세 항만 같은지 확인", "항상 마지막 계산값으로 확정"],
  },
  "calculus-2-01-02": {
    mode: "equation",
    instruction: "극한식을 합·곱·몫 블록으로 분해하고 각 부품의 수렴 조건과 분모 0 여부를 통과한 뒤 다시 조립",
    mild: "큰 식을 바로 계산하지 말고 작은 극한 블록으로 나누세요. 무한대끼리의 계산은 답이 아니라 성장 속도를 비교하라는 신호예요.",
    spicy: "limit algebra는 각 부품의 수렴과 quotient denominator nonzero가 전제입니다. 부정형은 지배항·유리화·끼워넣기로 구조를 먼저 바꿉니다.",
    scenes: [
      ["수렴하는 두 부품", "aₙ→A, bₙ→B", "합·곱은 A,B로 조립"],
      ["∞/∞ 표지", "∞/∞", "성장 속도 비교가 필요"],
      ["발산 부품의 분리", "(n+1)−n", "따로 떼면 법칙 적용 불가"],
      ["같은 곳으로 좁는 울타리", "lₙ≤aₙ≤uₙ", "lₙ,uₙ→L이면 aₙ→L"],
      ["법칙의 사용 조건", "부품 수렴 + 분모≠0", "조건 뒤에만 조립"],
    ],
    distractors: ["무한대 기호끼리 바로 약분", "발산하는 항을 각각 계산해 더함"],
  },
  "calculus-2-01-03": {
    mode: "graph",
    instruction: "공비 r을 -1과 1 사이 수직선 위에서 움직이며 부호 교대보다 진폭이 줄어드는지 한 항씩 점으로 표시",
    mild: "음수 공비라고 바로 발산하지 않아요. 점이 위아래로 오가더라도 높이의 폭이 점점 줄어드는지를 보세요.",
    spicy: "geometric sequence rⁿ의 운명은 |r|가 정합니다. |r|<1은 0, r=1은 상수, r=-1은 비수렴 진동, |r|>1은 크기 발산입니다.",
    scenes: [
      ["공비의 절댓값", "|r|<1", "진폭이 0으로 압축"],
      ["두 경계점", "r=1, r=−1", "멈춤과 진동을 구분"],
      ["음수 공비의 진폭", "−1<r<0", "교대하지만 0으로 수렴"],
      ["미지수 공비 구간", "−1<r≤1", "수렴 범위를 부등식으로"],
      ["공비 수직선", "−1 | 0 | 1", "경계별 미래를 지도화"],
    ],
    distractors: ["공비가 음수면 모두 발산", "첫항의 부호만으로 수렴 결정"],
  },
  "calculus-2-01-04": {
    mode: "blocks",
    instruction: "각 항이 아니라 n개까지 쌓인 부분합 Sₙ 블록을 늘려 누적계가 한 높이에 안정되는지 확인",
    mild: "항 하나가 0에 가까워지는 것과 합이 안정되는 것은 달라요. 1개, 2개, n개까지 더한 누적값을 따로 따라가세요.",
    spicy: "series convergence는 term limit가 아니라 partial-sum sequence Sₙ의 convergence입니다. aₙ→0은 necessary일 뿐 sufficient가 아닙니다.",
    scenes: [
      ["부분합 누적계", "Sₙ=Σₖ₌₁ⁿaₖ", "Sₙ의 극한이 급수의 합"],
      ["항의 극한 0", "aₙ→0", "필수지만 충분하지 않음"],
      ["무한 덧셈표", "Σaₙ := lim Sₙ", "마지막 항이 아니라 극한"],
      ["소거되는 중간항", "1/k−1/(k+1)", "양끝만 남는 Sₙ"],
      ["항에서 부분합으로", "aₙ → Sₙ", "누적이 머무는 값 추적"],
    ],
    distractors: ["aₙ이 0이면 항상 급수 수렴", "마지막 항을 급수의 합으로 사용"],
  },
  "calculus-2-01-05": {
    mode: "blocks",
    instruction: "첫항 a에서 시작해 r배 조각을 연속 배치하고 유한 부분합의 남은 rᴺ 블록이 사라지는 조건을 시각화",
    mild: "공식을 먼저 넣지 말고 첫 조각과 다음 조각의 배율을 찾으세요. 남는 꼬리 조각이 정말 0으로 줄 때만 합이 닫혀요.",
    spicy: "Sₙ=a(1−rⁿ)/(1−r)에서 |r|<1일 때만 rⁿ→0이므로 S=a/(1−r)입니다. 경계 조건 없는 공식 대입은 무효입니다.",
    scenes: [
      ["줄어드는 남은 틈", "a, ar, ar², …", "|r|<1이면 빈칸이 0"],
      ["부분합의 꼬리", "a(1−rᴺ)/(1−r)", "rᴺ→0 뒤 a/(1−r)"],
      ["수렴 조건 문", "|r|<1", "조건을 통과해야 공식 사용"],
      ["순환소수의 자리값", "0.3+0.03+0.003+…", "a=0.3, r=0.1"],
      ["첫항·공비·조건", "a, r, |r|<1", "세 표식을 먼저 확정"],
    ],
    distractors: ["모든 공비에 a/(1−r) 사용", "항 하나가 작으면 조건 없이 합 계산"],
  },
  "calculus-2-02-01": {
    mode: "graph",
    instruction: "지수곡선의 현재 높이와 접선 기울기를 같은 점에 겹치고 로그곡선은 입력 x가 커질수록 기울기 1/x가 눕는 모습을 비교",
    mild: "e의 지수는 높이와 기울기가 같아요. 다른 밑은 성장률 ln a가 붙고, 로그는 입력 x의 역수만큼 천천히 변해요.",
    spicy: "d(aˣ)/dx=aˣ ln a, d(ln x)/dx=1/x입니다. 합성된 지수·로그는 outer derivative 뒤 inner derivative를 반드시 곱합니다.",
    scenes: [
      ["현재 높이와 기울기", "(eˣ)'=eˣ", "같은 크기로 성장"],
      ["로그의 역수 기울기", "(ln x)'=1/x", "x가 클수록 접선이 눕음"],
      ["밑의 성장률", "(aˣ)'=aˣln a", "e가 아니면 ln a 필요"],
      ["바깥과 안쪽", "(ln(e^{g(x)}))'", "층마다 변화율을 곱함"],
      ["지수·로그 한 쌍", "eˣ ↔ ln x", "높이 비례와 역수 척도"],
    ],
    distractors: ["모든 aˣ을 그대로 aˣ로 미분", "ln x의 기울기를 x로 사용"],
  },
  "calculus-2-02-02": {
    mode: "geometry",
    instruction: "단위원의 점을 α만큼, 다시 β만큼 회전시키고 최종 x·y좌표를 투명 레이어로 겹쳐 덧셈정리의 네 항을 표시",
    mild: "부호를 외우기보다 두 번 회전한 점의 가로·세로 좌표를 보세요. 차의 공식은 β 대신 -β를 넣으면 다시 만들 수 있어요.",
    spicy: "rotation composition R(α)R(β)=R(α+β)가 sin·cos addition formula의 원천입니다. parity를 적용하면 difference formula가 따라옵니다.",
    scenes: [
      ["두 번의 회전", "R(α)R(β)", "각은 α+β로 합쳐짐"],
      ["음의 각", "β→−β", "짝·홀 성질로 차의 공식"],
      ["코사인의 가운데 부호", "cos(α+β)", "cosαcosβ−sinαsinβ"],
      ["15도 회전", "45°−30°", "익숙한 좌표로 정확값"],
      ["회전 좌표의 두 행", "cos 합, sin 합", "차·배각 공식을 재생성"],
    ],
    distractors: ["괄호 속 부호를 그대로 복사", "각을 더하면 좌표도 단순히 더함"],
  },
  "calculus-2-02-03": {
    mode: "graph",
    instruction: "단위원의 작은 라디안 호 h와 세로높이 sin h를 함께 축소하고 차분몫에서 남는 항을 접선 방향으로 연결",
    mild: "각도는 라디안으로 보세요. h가 작아질수록 sin h와 h의 길이가 비슷해지고, 그 비가 1로 가는 장면이 미분의 출발이에요.",
    spicy: "sin h/h→1과 (1−cos h)/h→0을 addition formula의 difference quotient에 넣어 sin'=cos, cos'=−sin을 얻습니다.",
    scenes: [
      ["작은 호와 높이", "sin h / h", "h→0에서 1"],
      ["사인 차분몫", "sin(x+h)−sin x", "덧셈정리 뒤 cos x"],
      ["코사인의 감소 방향", "(cos x)'", "−sin x의 부호"],
      ["진폭과 각속도", "A sin(ωx)", "Aω cos(ωx)"],
      ["라디안 작은 비율", "sin h/h→1", "삼각함수 미분의 기반"],
    ],
    distractors: ["도 단위 그대로 차분몫 사용", "cos의 미분에서 음수 부호 생략"],
  },
  "calculus-2-02-04": {
    mode: "equation",
    instruction: "분자 변화와 분모 변화 두 레일을 교차시켜 위 변화×아래 원형에서 위 원형×아래 변화를 빼고 분모 제곱으로 묶음",
    mild: "분자와 분모를 따로 미분해 나누면 안 돼요. 위쪽 변화와 아래쪽 변화가 비율에 주는 영향을 두 줄로 만든 뒤 빼세요.",
    spicy: "quotient rule은 (f/g)'=(f'g−fg')/g²입니다. denominator dilution 항의 음수와 g² 정규화가 핵심입니다.",
    scenes: [
      ["움직이는 두 양의 비", "f/g", "분자 증가와 분모 희석 경쟁"],
      ["분모의 제곱", "(1/g)'=−g'/g²", "g²가 이미 역수 미분에 등장"],
      ["잘못된 f'/g'", "(f/g)' ≠ f'/g'", "교차 두 항이 필요"],
      ["교차 곱의 차", "f'g−fg'", "공통인수는 마지막에 정리"],
      ["몫의 균형식", "(위'·아래−위·아래')/아래²", "증가와 희석을 함께 반영"],
    ],
    distractors: ["분자 미분을 분모 미분으로 나눔", "분모를 한 번만 곱해 정규화"],
  },
  "calculus-2-02-05": {
    mode: "blocks",
    instruction: "겹친 함수를 바깥·중간·안쪽 기어로 분리하고 출력에서 입력 방향으로 각 기어의 변화율을 한 번씩 곱함",
    mild: "가장 바깥 껍질부터 벗기고 안쪽 이름을 잠시 붙이세요. 각 껍질을 미분한 뒤 안쪽이 움직이는 속도를 빠뜨리지 말아요.",
    spicy: "chain rule dy/dx=(dy/du)(du/dx)는 composition graph의 edge product입니다. 빠진 inner derivative는 입력 scale을 잃습니다.",
    scenes: [
      ["맞물린 변화율", "dy/du · du/dx", "두 기어 속도를 곱함"],
      ["가장 바깥 껍질", "F(G(H(x)))", "바깥에서 안쪽 순서"],
      ["안쪽 미분", "F'(g(x))·g'(x)", "g'(x)를 빠뜨리지 않음"],
      ["로그·제곱근의 층", "ln√(g(x))", "중간 변수로 분모 추적"],
      ["출력에서 입력 경로", "y→u→x", "각 층 변화율을 한 번씩"],
    ],
    distractors: ["바깥 함수만 미분하고 종료", "안쪽부터 원래 식을 모두 전개"],
  },
  "calculus-2-02-06": {
    mode: "graph",
    instruction: "시간 슬라이더 t로 점 (x(t),y(t))을 움직여 궤적과 가로속도·세로속도 화살표, 그 비인 접선 기울기를 같은 점에 표시",
    mild: "t는 재생 시간이에요. 같은 t에서 x와 y의 위치를 찍고, 가로로 움직이는 속도와 세로로 움직이는 속도의 비를 보세요.",
    spicy: "parametric slope는 dy/dx=(dy/dt)/(dx/dt)입니다. dx/dt=0, dy/dt≠0이면 vertical tangent 후보이며 방향 정보는 t가 보존합니다.",
    scenes: [
      ["움직이는 점의 시간", "(x(t), y(t))", "t가 궤적을 그림"],
      ["가로속도 0", "dx/dt=0", "세로속도가 남으면 수직접선"],
      ["매개변수의 방향", "t 증가 방향", "소거하면 잃을 수 있는 정보"],
      ["두 속도의 비", "(dy/dt)/(dx/dt)", "같은 t의 접선 기울기"],
      ["위치와 방향 한 쌍", "x(t),y(t),dy/dx", "접선까지 같은 시간에서"],
    ],
    distractors: ["항상 t를 먼저 소거해야 함", "dx/dt가 0이면 모든 기울기 정보가 사라짐"],
  },
  "calculus-2-02-07": {
    mode: "geometry",
    instruction: "원 위 점의 x·y가 함께 움직이는 화살표와 y=x 거울 대칭을 겹쳐 음함수 변화율과 역함수의 뒤집힌 기울기를 비교",
    mild: "식에 y가 보여도 x가 바뀌면 y도 함께 움직여요. 역함수는 점의 가로·세로가 바뀌므로 기울기도 원래 기울기의 역수가 됩니다.",
    spicy: "implicit differentiation은 y항마다 y'를 붙이고 constraint를 유지합니다. inverse derivative는 (f⁻¹)'(y)=1/f'(x), f'(x)≠0입니다.",
    scenes: [
      ["함께 움직이는 좌표", "x²+y²=1", "y항마다 y'가 따라옴"],
      ["y=x 거울", "(x,y)↔(y,x)", "기울기도 서로 역수"],
      ["숨은 y의 변화", "d(y²)/dx=2yy'", "y를 상수처럼 두지 않음"],
      ["관계식의 한 점", "2x+2yy'=0", "곡선을 풀지 않고 기울기"],
      ["숨은 변화와 거울", "implicit + inverse", "관계 보존과 좌표 교환"],
    ],
    distractors: ["y를 상수로 두고 미분", "역함수 기울기를 원래 기울기와 같게 둠"],
  },
  "calculus-2-02-08": {
    mode: "graph",
    instruction: "곡선을 접점 주변에서 확대해 직선처럼 보이는 구간을 만들고 접점 좌표와 도함수 기울기를 점기울기식에 결합",
    mild: "접선에는 점과 방향이 모두 필요해요. 접점이 없으면 미지수 a로 두고 곡선 위 조건과 지나가는 조건을 함께 만족시키세요.",
    spicy: "tangent is the first-order local model y−f(a)=f'(a)(x−a). unknown contact requires simultaneous curve and incidence constraints.",
    scenes: [
      ["확대한 곡선", "y≈f(a)+f'(a)(x−a)", "한 점 주변의 최선 직선"],
      ["미지의 접점 a", "(a,f(a))", "곡선과 기울기 조건을 동시 사용"],
      ["할선과 접선", "Δy/Δx → f'(a)", "간격을 0으로 보낸 순간값"],
      ["외부 점 조건", "접선이 주어진 점 통과", "a를 정하는 방정식"],
      ["점과 방향", "(a,f(a)), f'(a)", "점기울기식으로 완성"],
    ],
    distractors: ["떨어진 두 점의 평균기울기를 그대로 사용", "접점 없이 기울기만으로 직선을 확정"],
  },
  "calculus-2-02-09": {
    mode: "graph",
    instruction: "정의역·점근선을 먼저 세운 뒤 f' 부호 화살표와 f'' 굽힘 레이어를 겹쳐 극값·변곡점·끝 행동을 순서대로 배치",
    mild: "그래프를 바로 그리지 말고 끊기는 곳과 끝 방향부터 표시하세요. 그 위에 오르내림 화살표, 마지막으로 위·아래 굽힘을 얹으면 돼요.",
    spicy: "qualitative reconstruction은 domain/asymptote, end behavior, sign(f'), sign(f'')의 ordered layers입니다. 영점은 부호 변화 전까지 후보일 뿐입니다.",
    scenes: [
      ["방향과 굽힘", "f' / f''", "증감과 오목·볼록을 분리"],
      ["두 종류 후보", "f'=0, f''=0", "양옆 부호 변화로 확정"],
      ["정의역과 점근선", "domain holes", "도함수보다 먼저 그래프 분리"],
      ["삼차함수 두 레이어", "sign f' + sign f''", "극값과 변곡점 배치"],
      ["그래프 표지판 순서", "정의역→끝→f'→f''", "한 겹씩 복원"],
    ],
    distractors: ["도함수 영점만 찍고 모두 연결", "f''가 0이면 무조건 변곡점"],
  },
  "calculus-2-02-10": {
    mode: "graph",
    instruction: "방정식·부등식을 한쪽으로 모은 함수 h(x)의 x축 교점, 부호 영역, 최솟값을 같은 좌표판에서 차례로 강조",
    mild: "두 식을 한쪽으로 모아 새 함수 하나를 만드세요. 축을 만나는 곳은 등식의 해이고, 축 위·아래 구간은 부등식의 해예요.",
    spicy: "translate algebra to h(x)=LHS−RHS. existence uses sign change/IVT, uniqueness uses monotonicity, global inequality uses extrema over the domain.",
    scenes: [
      ["두 그래프의 만남", "LHS=RHS ↔ h(x)=0", "x축 교점이 해"],
      ["존재와 유일성", "부호 변화 + 단조성", "적어도 하나와 많아야 하나"],
      ["전체 구간 조건", "h(x)≥0", "몇 점이 아니라 최솟값 확인"],
      ["로그 부등식", "x−1−ln x", "최솟값 0으로 증명"],
      ["영점·부호·극값", "h=0, h>0, min h", "식의 답을 그래프로 번역"],
    ],
    distractors: ["몇 개 점 대입으로 전체 구간 확정", "도함수 영점을 원방정식 해로 사용"],
  },
  "calculus-2-02-11": {
    mode: "plot",
    instruction: "같은 시간축에 위치·속도·가속도 그래프를 세 줄로 맞추고 속도·가속도 부호 조합과 속도 영점에서 이동 방향을 표시",
    mild: "위치의 기울기가 속도, 속도의 기울기가 가속도예요. 빠르기는 속도와 가속도의 부호가 같은지 비교해야 판단할 수 있어요.",
    spicy: "s'=v, v'=a이며 speed increases iff v·a>0. displacement is signed position change; distance partitions at velocity zeros and sums absolute travel.",
    scenes: [
      ["세 겹 시간 그래프", "s(t), v(t), a(t)", "기울기로 차례로 연결"],
      ["속도와 가속도 부호", "v·a>0", "속력이 커지는 구간"],
      ["변위와 이동거리", "Δs vs Σ|Δs|", "방향 상쇄 여부를 분리"],
      ["속도 영점", "v(t)=0", "왕복 구간의 경계"],
      ["운동 언어 번역", "위치→기울기→기울기 변화", "세 그래프를 같은 시각에 읽음"],
    ],
    distractors: ["가속도가 양수면 항상 앞으로 이동", "출발·도착 차이를 항상 이동거리로 사용"],
  },
  "calculus-2-03-01": {
    mode: "equation",
    instruction: "기본 미분 공식을 역방향 화살표로 되감고 원시함수 가족의 +C와 정적분 끝값 차에서 C가 소거되는 장면을 분리",
    mild: "적분한 답은 다시 미분해 확인하세요. 부정적분에는 C를 붙이고, 정적분은 같은 원시함수의 위끝 값에서 아래끝 값을 빼요.",
    spicy: "integration table is inverse differentiation. ∫x⁻¹dx=ln|x| is the exceptional power, while definite evaluation F(b)−F(a) removes additive constants.",
    scenes: [
      ["미분 화살표 되감기", "F'=f", "∫f dx=F+C"],
      ["끝값 차의 C", "(F(b)+C)−(F(a)+C)", "정적분에서 C 소거"],
      ["지수 −1 예외", "∫1/x dx", "ln|x|+C"],
      ["항별 기본함수", "선형성으로 분해", "원시함수 뒤 경계 대입"],
      ["미분으로 역검산", "d/dx(적분답)", "원래 피적분함수 복귀"],
    ],
    distractors: ["정적분 끝에도 임의의 C를 남김", "1/x에 일반 거듭제곱 적분 공식을 적용"],
  },
  "calculus-2-03-02": {
    mode: "blocks",
    instruction: "반복되는 안쪽 식 g(x)을 u 블록으로 묶고 옆의 g'(x)dx와 짝지어 변수·미분소·경계가 모두 u 언어로 바뀌는지 확인",
    mild: "반복되는 덩어리에 u라는 이름을 붙이세요. 그 옆에 du가 되는 계수가 있는지 보고, 정적분이면 시작과 끝 숫자도 u값으로 바꿔요.",
    spicy: "substitution is a coordinate change: u=g(x), du=g'(x)dx. no x residue and transformed bounds are the completion invariants.",
    scenes: [
      ["안쪽 기계 이름", "u=g(x)", "반복 덩어리를 한 블록으로"],
      ["새 좌표의 경계", "x=a,b → u=g(a),g(b)", "정적분 시작·끝도 변환"],
      ["du의 계수", "du=g'(x)dx", "남는 x가 없는지 확인"],
      ["분모와 그 미분", "g'(x)/g(x)", "∫du/u=ln|u|"],
      ["치환 완료 네 항목", "함수·미분소·변수·경계", "모두 u로 통일"],
    ],
    distractors: ["안쪽 식만 u로 바꾸고 dx 유지", "경계는 x값 그대로 둠"],
  },
  "calculus-2-03-03": {
    mode: "blocks",
    instruction: "곱의 미분 두 항을 역재생해 uv 경계 블록을 남기고 미분하면 단순해지는 u와 적분 가능한 dv를 교환",
    mild: "두 함수 중 미분하면 가벼워지는 쪽을 u로 잡으세요. 다른 쪽은 바로 적분할 수 있어야 하고, 앞의 uv 항과 마이너스를 잊지 마세요.",
    spicy: "integration by parts rewinds (uv)'=u'v+uv': ∫u dv=uv−∫v du. the choice is successful when derivative complexity decreases.",
    scenes: [
      ["곱의 미분 역재생", "(uv)'=u'v+uv'", "∫u dv=uv−∫v du"],
      ["u와 dv 선택", "u는 미분해 단순화", "dv는 바로 적분 가능"],
      ["경계항과 음수", "uv − ∫v du", "두 요소를 함께 보존"],
      ["x와 eˣ", "u=x, dv=eˣdx", "x eˣ−eˣ+C"],
      ["더 쉬운 곱으로 교환", "복잡도 감소", "되풀이 여부 확인"],
    ],
    distractors: ["두 함수의 적분을 단순히 곱함", "uv 항 없이 적분 두 개만 교환"],
  },
  "calculus-2-03-04": {
    mode: "blocks",
    instruction: "구간을 n개 직사각형으로 나누고 Δx 폭을 줄이며 대표점 함수값 블록의 합이 곡선 아래 넓이에 붙는 과정을 표시",
    mild: "시그마 안에서 함수값과 조각 폭을 따로 찾으세요. 1/n은 폭이고 k/n은 조각 안의 위치라는 그림으로 바꾸면 적분 구간이 보여요.",
    spicy: "Riemann sum has the invariant Σf(xₖ*)Δx. Δx determines interval scale; representative points determine sampling; mesh→0 creates the integral.",
    scenes: [
      ["잘게 나눈 직사각형", "Σ f(xₖ*)Δx", "폭이 0으로 가며 곡선에 밀착"],
      ["1/n과 k/n", "Δx=1/n, xₖ=k/n", "구간과 대표점을 해독"],
      ["빠진 조각 폭", "Σf(xₖ*)만", "Δx 없이는 적분 아님"],
      ["제곱합", "(1/n)Σ(k/n)²", "∫₀¹x²dx"],
      ["급수와 적분의 다리", "함수값 × 폭", "대표점 이동 구간 확인"],
    ],
    distractors: ["함수값만 더하면 항상 적분", "k/n을 조각 폭으로 사용"],
  },
  "calculus-2-03-05": {
    mode: "graph",
    instruction: "x축 위는 파란 양수, 아래는 붉은 음수로 칠하고 교점마다 구간을 잘라 실제 넓이에서는 각 조각의 부호를 양수로 전환",
    mild: "전체 적분에 절댓값 한 번만 씌우면 이미 상쇄된 넓이는 돌아오지 않아요. 축이나 두 곡선이 만나는 곳에서 먼저 잘라 주세요.",
    spicy: "geometric area requires sign/order partition before integration: Σ|∫interval f| or ∫|f|. for two curves use top−bottom on each partition.",
    scenes: [
      ["축 위·아래 색", "∫f", "정적분은 부호 있는 누적"],
      ["교점 경계", "f=0 또는 f=g", "부호·위아래가 바뀌는 곳에서 분할"],
      ["조각 전 절댓값", "Σ|∫f|", "상쇄 전에 크기로 전환"],
      ["포물선과 직선", "∫(위−아래)", "중간 시험점으로 순서 결정"],
      ["세로 조각 높이", "top−bottom", "경계·순서·적분의 순서"],
    ],
    distractors: ["전체 정적분 뒤 절댓값만 한 번 적용", "식에 먼저 나온 함수를 항상 위로 둠"],
  },
  "calculus-2-03-06": {
    mode: "geometry",
    instruction: "회전축에 수직인 얇은 원판·고리 단면을 세우고 축에서 곡선까지의 거리를 반지름으로 측정해 단면적을 연속해서 쌓음",
    mild: "반지름은 x나 y 그 자체가 아니라 회전축에서 곡선까지의 거리예요. 고리라면 큰 원과 작은 원을 각각 제곱한 뒤 빼세요.",
    spicy: "volume is ∫A(x)dx. washer area is π(R²−r²), not π(R−r)²; radii are distances to the axis and may require shifted coordinates.",
    scenes: [
      ["얇은 단면", "A(x)·dx", "단면적을 쌓아 부피"],
      ["축에서의 거리", "R=|곡선−회전축|", "좌표가 아니라 반지름"],
      ["고리 단면", "πR²−πr²", "제곱한 뒤 차"],
      ["포물면 원판", "A(x)=π(f(x))²", "단면적을 구간 적분"],
      ["부피 조립 순서", "축→반지름→A(x)→∫", "거리와 단면을 먼저 확정"],
    ],
    distractors: ["바깥·안쪽 반지름 차를 먼저 제곱", "좌표값을 항상 그대로 반지름으로 사용"],
  },
  "calculus-2-03-07": {
    mode: "plot",
    instruction: "속도 그래프를 영점에서 구간별로 색칠하고 부호 있는 넓이는 변위계, 절댓값 넓이는 이동거리계에 따로 누적",
    mild: "속도×아주 짧은 시간을 쌓으면 위치 변화가 돼요. 방향이 바뀌는 속도 0 지점에서 나누고, 거리는 각 조각을 양수로 더하세요.",
    spicy: "position satisfies s(t)=s(t₀)+∫v. displacement is ∫v; distance is ∫|v| with velocity-zero partition. initial position selects the trajectory.",
    scenes: [
      ["속도 조각의 누적", "v(t)Δt", "∫v가 위치 변화"],
      ["속력의 넓이", "∫|v(t)|dt", "모든 이동을 양수로 합산"],
      ["초기 위치", "s(t₀)", "적분상수를 정해 한 궤적 선택"],
      ["속도 영점 분할", "v(t)=0", "방향별 넓이를 따로 계산"],
      ["변위와 거리 두 계기", "∫v / ∫|v|", "상쇄와 실제 길이를 분리"],
    ],
    distractors: ["속도 적분만으로 초기 위치까지 자동 결정", "방향이 바뀌어도 변위와 거리가 항상 같음"],
  },
};

if (Object.keys(specs).length !== shard.stories.length) {
  throw new Error(`미적분Ⅱ spec 수 불일치: ${Object.keys(specs).length}/${shard.stories.length}`);
}

for (const story of shard.stories) {
  const spec = specs[story.conceptId];
  if (!spec || spec.scenes.length !== story.scenes.length) {
    throw new Error(`미적분Ⅱ scene spec 누락: ${story.conceptId}`);
  }

  story.scenes.forEach((scene, index) => {
    const [focus, expression, result] = spec.scenes[index];
    const rawChoices = [result, ...spec.distractors];
    const offset = index % rawChoices.length;
    const choices = [...rawChoices.slice(offset), ...rawChoices.slice(0, offset)].map(clean);
    const answerIndex = choices.indexOf(clean(result));
    scene.motion = {
      version: 1,
      mode: spec.mode,
      focus: clean(focus),
      instruction: clean(spec.instruction),
      beats: [
        {
          id: `${scene.id}-locate`,
          action: "highlight",
          target: clean(focus),
          expression: clean(expression),
          result: "대상 고정",
          caption: `먼저 ${clean(focus)}을 노란 강조판과 파란 밑줄로 고정합니다.`,
          durationMs: 1_800,
        },
        {
          id: `${scene.id}-connect`,
          action: "transform",
          target: clean(focus),
          expression: clean(expression),
          result: clean(result),
          caption: `${clean(expression)}의 변화에서 ${clean(result)}만 남도록 관계를 한 단계씩 연결합니다.`,
          durationMs: 2_300,
        },
        {
          id: `${scene.id}-verify`,
          action: "verify",
          target: clean(result),
          expression: `${clean(expression)} → ${clean(result)}`,
          result: clean(result),
          caption: `반대 방향으로 되짚어 ${clean(result)}가 정의·부호·구간 조건을 모두 지키는지 확인합니다.`,
          durationMs: 2_000,
        },
      ],
      mild: {
        explanation: clean(`${scene.subtitle} ${spec.mild}`),
      },
      spicy: {
        explanation: clean(`${spec.spicy} 지금은 ${expression}에서 ${result}로 바뀌는 지점만 추적합니다.`),
      },
      check: {
        prompt: `${clean(focus)}을 확인할 때 이 장면에서 맞는 결론은 무엇인가요?`,
        choices,
        answerIndex,
        correctFeedback: `맞아요. ${clean(focus)}을 기준으로 ${clean(result)}까지 연결했습니다.`,
        retryFeedback: `${clean(focus)}을 먼저 가리킨 뒤 ${clean(expression)}에서 ${clean(result)}로 이어지는 한 단계를 다시 보세요.`,
      },
    };
  });
}

fs.writeFileSync(shardPath, `${JSON.stringify(shard, null, 2)}\n`);
console.log(`Authored Calculus II motion: ${shard.stories.length} stories / ${shard.stories.flatMap((story) => story.scenes).length} scenes`);
