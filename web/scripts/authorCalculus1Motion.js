#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const shardPath = path.resolve(__dirname, "..", "content_folder", "curriculum-stories", "calculus-1.json");
const shard = JSON.parse(fs.readFileSync(shardPath, "utf8"));

function studentText(value) {
  return String(value || "").replace(/\[/gu, "(").replace(/\]/gu, ")");
}

function answerChoice(value) {
  const text = studentText(value);
  return text.length >= 4 ? text : `${text} 선택`;
}

const concepts = {
  "calculus-1-01-01": {
    instruction: "구멍이 있는 함수 그래프에서 x가 a의 왼쪽·오른쪽에서 다가오는 두 화살표와 도착 높이를 따로 표시",
    mild: "점에 바로 대입하지 말고 왼쪽에서 다가오는 값과 오른쪽에서 다가오는 값을 먼저 손가락으로 따라가세요. 두 화살표가 같은 높이에 도착해야 극한이 있습니다.",
    spicy: "핵심 대상은 함수값 f(a)가 아니라 punctured neighborhood의 양쪽 수렴입니다. 좌극한과 우극한이 같은 유한값 L일 때만 양쪽 극한을 L로 고정합니다.",
    scenes: {
      "walk-toward-a": ["x=a 주변", "x→a, x≠a", "주변의 도착 높이 L", "극한이 먼저 보는 것은?", ["a 주변의 흐름", "점 하나의 색", "함수 이름"], 0],
      "both-sides": ["좌·우 두 화살표", "limₓ→a⁻f(x), limₓ→a⁺f(x)", "둘 다 L", "양쪽 극한이 존재하려면?", ["좌우가 같은 값", "함숫값만 존재", "오른쪽만 존재"], 0],
      "substitution-trap": ["0/0 표지", "0/0", "정리하라는 신호", "0/0을 만났을 때 첫 행동은?", ["식의 구조를 정리", "답을 0으로 확정", "분모만 삭제"], 0],
      "hole-example": ["약분되는 인수", "(x²−1)/(x−1)", "x+1 → 2", "x가 1로 갈 때 극한은?", ["2", "0", "존재하지 않음"], 0],
      "three-questions-recall": ["값·왼쪽·오른쪽", "f(a), L⁻, L⁺", "서로 분리해 확인", "극한을 판단할 때 반드시 비교할 두 흐름은?", ["좌극한과 우극한", "최댓값과 최솟값", "분자와 계수"], 0],
    },
  },
  "calculus-1-01-02": {
    instruction: "복잡한 극한식을 합·곱·몫 블록으로 분해한 뒤 분모 조건을 통과한 블록만 다시 조립",
    mild: "큰 식을 한 번에 보지 말고 더하기, 곱하기, 나누기 블록으로 쪼개세요. 나눗셈 블록은 분모가 0으로 가지 않는지 마지막에 따로 확인합니다.",
    spicy: "핵심 대상은 limit algebra의 적용 조건입니다. 합과 곱은 각 극한으로 보존되지만 quotient는 denominator limit가 0이 아닐 때만 조립할 수 있습니다.",
    scenes: {
      "limit-building-blocks": ["작은 극한 블록", "f→A, g→B", "합 A+B·곱 AB", "f→2, g→3이면 f+g의 극한은?", ["5", "6", "1"], 0],
      "limit-law-check": ["연산 기호", "2f−3g", "2A−3B", "극한의 선형 결합에서 유지할 것은?", ["계수와 부호", "분모만", "지수만"], 0],
      "zero-denominator-warning": ["분모 극한 0", "B=0", "몫 법칙 사용 중지", "분모 극한이 0이면 무엇을 해야 하나요?", ["다른 변형을 찾음", "무조건 극한 없음", "분자를 0으로 만듦"], 0],
      "factor-limit-example": ["공통인수 x−2", "(x²−4)/(x−2)", "x+2 → 4", "막힌 분수 극한을 여는 방법은?", ["인수분해 후 약분", "분모를 무시", "양변을 미분"], 0],
      "assemble-the-limit": ["조립 조건", "합·곱·몫", "분모≠0 확인", "몫의 극한 법칙에 추가로 필요한 조건은?", ["분모 극한이 0 아님", "분자가 양수", "함수가 다항식"], 0],
    },
  },
  "calculus-1-01-03": {
    instruction: "조각함수의 왼쪽 선·오른쪽 선·경계 점을 한 이음매에 겹쳐 연속의 세 조건을 순서대로 잠금",
    mild: "그래프가 이어지려면 주변에서 같은 높이로 들어오고, 그 높이에 실제 점도 찍혀 있어야 합니다. 왼쪽, 오른쪽, 점의 값을 한 줄씩 확인하세요.",
    spicy: "핵심 대상은 limₓ→a f(x)=f(a)입니다. 정의역의 점 존재, 양쪽 극한 존재, 극한과 함숫값 일치의 세 gate를 모두 통과해야 합니다.",
    scenes: {
      "continuity-pencil-path": ["한 점의 이음매", "limₓ→a f(x)=f(a)", "연필이 끊기지 않음", "한 점에서 연속이라는 식은?", ["극한=함숫값", "좌극한만 존재", "함숫값=0"], 0],
      "three-continuity-tests": ["세 개의 잠금", "정의·극한·일치", "모두 통과", "연속 판정의 마지막 확인은?", ["극한과 함숫값 일치", "함숫값의 부호", "도함수 존재"], 0],
      "defined-is-not-continuous": ["찍힌 점 하나", "f(a)는 존재", "그것만으로 부족", "f(a)가 존재하면 항상 연속인가요?", ["아니요", "항상 연속", "다항식만 불연속"], 0],
      "piecewise-continuity-fit": ["조각의 경계", "왼쪽값=오른쪽값=f(a)", "같은 높이로 접합", "조각함수 경계에서 맞춰야 할 것은?", ["좌·우·점의 높이", "기울기만", "구간 길이"], 0],
      "continuity-gate-memory": ["들어옴·만남·서 있음", "L⁻=L⁺=f(a)", "연속", "연속의 세 값을 한 식으로 쓰면?", ["L⁻=L⁺=f(a)", "L⁻<L⁺", "f(a)=0"], 0],
    },
  },
  "calculus-1-01-04": {
    instruction: "연속인 산길과 닫힌구간 울타리 위에 중간 높이·최고점·최저점 후보를 실제 점으로 표시",
    mild: "연속인 길에서는 낮은 곳에서 높은 곳으로 갈 때 사이 높이를 건너뛸 수 없습니다. 닫힌구간의 최대·최소는 안쪽 후보뿐 아니라 양 끝도 꼭 비교하세요.",
    spicy: "핵심 대상은 compact interval 위 continuous function의 존재 보장입니다. IVT는 중간값을, EVT는 절대최대·절대최소의 달성을 보증합니다.",
    scenes: {
      "continuous-mountain-trail": ["끊기지 않는 산길", "f(a)<k<f(b)", "어딘가 f(c)=k", "연속인 길이 보장하는 것은?", ["사이 높이를 지남", "항상 증가", "기울기 일정"], 0],
      "root-between-endpoints": ["양 끝의 부호", "f(a)f(b)<0", "사이에 근 존재", "연속이고 끝 부호가 다르면?", ["사이에 적어도 한 근", "근이 정확히 두 개", "근이 없음"], 0],
      "sign-change-needs-continuity": ["연속 조건", "부호 변화 + 연속", "중간값 정리 사용", "부호 변화만으로 근을 보장할 수 있나요?", ["연속도 필요", "항상 보장", "미분만 필요"], 0],
      "closed-interval-extrema": ["끝점과 내부 후보", "f(a), f(b), 임계점", "가장 큰·작은 값", "닫힌구간 최대·최소에서 비교 대상은?", ["끝점과 내부 후보 모두", "내부점만", "끝점 하나만"], 0],
      "continuity-guarantees": ["구간과 연속", "[a,b]에서 연속", "중간값·극값 보장", "정리를 쓰기 전에 먼저 확인할 것은?", ["구간과 연속성", "그래프 색", "함수 이름"], 0],
    },
  },
  "calculus-1-02-01": {
    instruction: "곡선 위 두 점의 할선을 h가 줄어들수록 회전시켜 한 점의 접선과 순간기울기로 수렴",
    mild: "처음에는 두 점 사이 기울기를 구합니다. h를 0으로 바로 넣지 말고 식을 정리한 뒤 두 번째 점을 첫 점 가까이 움직이세요.",
    spicy: "핵심 대상은 difference quotient의 h→0 limit입니다. h=0인 몫이 아니라 punctured increments가 만드는 secant slope의 수렴값입니다.",
    scenes: {
      "secant-becomes-tangent": ["할선의 두 점", "[f(a+h)−f(a)]/h", "h→0에서 접선", "순간변화율은 무엇의 극한인가요?", ["평균변화율", "함숫값", "넓이"], 0],
      "square-at-two": ["x=2와 2+h", "[(2+h)²−4]/h", "4+h → 4", "x²의 x=2 미분계수는?", ["4", "2", "0"], 0],
      "zero-increment-trap": ["h=0 금지", "0/0이 되기 전 정리", "그 뒤 h→0", "차분몫에 h=0을 먼저 넣어도 되나요?", ["아니요", "항상 가능", "분자만 0이면 가능"], 0],
      "coefficient-from-definition": ["기준점·이동점", "평균기울기→극한", "접선 기울기", "미분 정의 계산의 마지막 단계는?", ["h를 0으로 보내기", "h를 1로 고정", "함수를 적분"], 0],
      "derivative-coefficient-memory": ["두 점에서 한 점", "secant→tangent", "f′(a)", "미분계수를 기억하는 그림은?", ["할선이 접선으로 수렴", "원이 커짐", "넓이가 사라짐"], 0],
    },
  },
  "calculus-1-02-02": {
    instruction: "연속인 길의 모서리에서 왼쪽·오른쪽 접선 방향을 따로 그려 위치 연결과 방향 일치를 비교",
    mild: "길이 이어져도 모서리에서는 핸들이 갑자기 꺾입니다. 먼저 그래프가 이어지는지 보고, 그다음 왼쪽과 오른쪽 기울기가 같은지 보세요.",
    spicy: "핵심 대상은 differentiability⇒continuity의 단방향 함의입니다. converse는 |x|의 cusp에서 좌우 derivative가 달라 반례가 됩니다.",
    scenes: {
      "road-with-a-corner": ["이어진 모서리", "좌기울기≠우기울기", "연속이지만 미분불가", "모서리에서 깨지는 것은?", ["미분가능성", "함숫값 존재", "정의역"], 0],
      "continuity-or-differentiability": ["위치와 방향", "연속 검사→좌우 기울기", "두 단계 판정", "미분가능 판정 전에 확인할 것은?", ["연속성", "정적분", "최댓값"], 0],
      "reverse-arrow-error": ["한 방향 화살표", "미분가능⇒연속", "역은 거짓", "연속이면 반드시 미분가능한가요?", ["아니요", "항상 가능", "다항식도 불가능"], 0],
      "piecewise-smooth-join": ["조각의 높이와 기울기", "좌값=우값, 좌미분=우미분", "매끈한 접합", "조각함수를 매끈하게 잇는 조건은?", ["높이와 기울기 모두 일치", "높이만 일치", "기울기만 일치"], 0],
      "one-way-smoothness": ["연속 위의 방향 일치", "미분가능=연속+좌우기울기", "더 강한 조건", "미분가능성이 더 요구하는 것은?", ["좌우 기울기 일치", "함숫값 0", "정의역 무한"], 0],
    },
  },
  "calculus-1-02-03": {
    instruction: "거듭제곱 층에서 지수 n을 계수 앞으로 내려놓고 남은 층을 n−1로 한 칸 줄이는 두 동작을 분리",
    mild: "지수를 줄이는 것만 하지 마세요. 원래 지수는 앞으로 내려와 계수가 되고, 지수는 한 칸 줄어듭니다.",
    spicy: "핵심 대상은 power rule d(xⁿ)/dx=nxⁿ⁻¹입니다. coefficient extraction과 exponent decrement는 분리할 수 없는 한 쌍입니다.",
    scenes: {
      "power-growth-layers": ["지수 n", "xⁿ", "n·xⁿ⁻¹", "거듭제곱 미분의 두 동작은?", ["n을 내리고 지수−1", "지수만−1", "계수만 n"], 0],
      "cube-definition-proof": ["세 개의 일차 변화", "(x+h)³−x³", "3x²h+…", "x³ 미분의 계수 3은 어디서 나오나요?", ["세 겹의 일차 변화", "h를 세 번 나눔", "상수항"], 0],
      "power-rule-half-remembered": ["빠진 앞 계수", "x⁵→x⁴", "5x⁴가 정답", "x⁵의 도함수는?", ["5x⁴", "x⁴", "5x⁵"], 0],
      "fifth-power-slope": ["도함수에 점 대입", "f′(x)=5x⁴", "f′(a)=5a⁴", "한 점의 기울기는 어디에 대입하나요?", ["도함수", "원함수만", "적분상수"], 0],
      "power-rule-memory": ["앞으로·한 칸 아래", "n↓, n−1", "nxⁿ⁻¹", "거듭제곱 규칙의 기억 문장은?", ["앞으로 내리고 한 칸 낮춤", "둘 다 한 칸 높임", "계수 삭제"], 0],
    },
  },
  "calculus-1-02-04": {
    instruction: "다항식 항을 각각 미분하는 레일과 두 함수 곱에서 한쪽씩만 변하는 교차 레일을 나란히 표시",
    mild: "더하기로 연결된 항은 하나씩 따로 미분합니다. 곱은 두 함수가 모두 변하므로 첫째만 변한 줄과 둘째만 변한 줄을 더하세요.",
    spicy: "핵심 대상은 linearity와 product rule의 구조 차이입니다. (fg)′=f′g+fg′이며 f′g′가 아닙니다.",
    scenes: {
      "polynomial-change-parts": ["각 항의 변화", "Σ aₖxᵏ", "Σ k·aₖxᵏ⁻¹", "다항식은 어떻게 미분하나요?", ["항별로 미분", "전체를 곱함", "상수만 미분"], 0],
      "termwise-polynomial": ["계수·지수·부호", "4x⁴−3x²+7", "16x³−6x", "상수항 7의 도함수는?", ["0", "7", "1"], 0],
      "product-of-derivatives-error": ["두 교차 경로", "(fg)′", "f′g+fg′", "곱의 미분법은?", ["f′g+fg′", "f′g′", "fg"], 0],
      "polynomial-product-example": ["한쪽씩 변화", "(x²)(x+1)", "2x(x+1)+x²", "곱 미분에서 더하는 두 항은?", ["f′g와 fg′", "f′와 g′", "f와 g"], 0],
      "polynomial-derivative-map": ["바깥 연산", "+인지 ×인지", "규칙 선택", "미분 전에 먼저 볼 것은?", ["식의 바깥 연산", "답의 부호", "정의역 길이"], 0],
    },
  },
  "calculus-1-02-05": {
    instruction: "곡선의 접점에서 좌표 점을 고정하고 도함수 기울기 화살표를 점기울기식 직선으로 결합",
    mild: "접선에는 점과 방향이 둘 다 필요합니다. 원함수로 점의 높이를 구하고, 도함수로 기울기를 구한 뒤 점기울기식에 넣으세요.",
    spicy: "핵심 대상은 tangent line y−f(a)=f′(a)(x−a)입니다. f(a)는 anchor point, f′(a)는 local direction을 제공합니다.",
    scenes: {
      "tangent-point-direction": ["접점과 방향", "(a,f(a)), f′(a)", "접선 하나", "직선을 고정하는 두 정보는?", ["점과 기울기", "기울기 두 개", "점 하나만"], 0],
      "parabola-tangent-at-one": ["x=1의 접점", "f=x², f′=2x", "y−1=2(x−1)", "x²의 x=1 접선 기울기는?", ["2", "1", "0"], 0],
      "tangent-through-origin-error": ["실제 접점", "y−f(a)=m(x−a)", "원점 강제 금지", "y=mx만 쓰면 놓치는 것은?", ["접점의 위치", "기울기", "변수 x"], 0],
      "cubic-tangent-example": ["원함수 칸·도함수 칸", "f(a), f′(a)", "점기울기식", "접점의 y좌표는 어디서 구하나요?", ["원함수", "도함수", "적분"], 0],
      "tangent-two-clues": ["점·기울기 두 단서", "anchor+direction", "접선 완성", "접선 계산 순서는?", ["점과 기울기→점기울기식", "기울기만→원점", "적분→넓이"], 0],
    },
  },
  "calculus-1-02-06": {
    instruction: "구간 양 끝을 잇는 할선과 그와 평행한 내부 접선을 같은 그래프에 놓고 정리 조건을 관문으로 표시",
    mild: "먼저 양 끝을 잇는 직선의 기울기를 구하세요. 함수가 구간에서 이어지고 안쪽에서 매끈하면 같은 기울기의 접선이 안에 있습니다.",
    spicy: "핵심 대상은 MVT의 hypotheses와 conclusion입니다. [a,b] 연속·(a,b) 미분가능이면 어떤 c에서 f′(c)=[f(b)−f(a)]/(b−a)입니다.",
    scenes: {
      "average-speed-moment": ["평균과 같은 순간", "전체거리/전체시간", "어떤 순간속도와 일치", "매끄러운 여정이 보장하는 것은?", ["평균속도와 같은 순간", "항상 일정속도", "정지 순간"], 0],
      "parabola-mean-value": ["할선과 평행한 접선", "평균기울기=f′(c)", "구간 안 c", "평균값 정리의 c는 어디에 있나요?", ["구간 내부", "왼쪽 끝", "구간 밖"], 0],
      "mean-value-condition-gap": ["두 조건 관문", "닫힌구간 연속·열린구간 미분", "정리 사용 가능", "평균값 정리에 필요한 조건은?", ["연속과 미분가능", "끝값만", "도함수 양수"], 0],
      "derivative-bound-change": ["기울기 범위", "m≤f′≤M", "mΔx≤Δf≤MΔx", "도함수 경계가 묶는 것은?", ["함수값 변화량", "정의역 개수", "적분상수"], 0],
      "mean-value-bridge": ["할선↔접선 다리", "[f(b)−f(a)]/(b−a)", "같은 f′(c)", "정리 적용의 첫 계산은?", ["평균변화율", "정적분", "최댓값"], 0],
    },
  },
  "calculus-1-02-07": {
    instruction: "도함수 영점을 세로선으로 세우고 각 구간에 +/− 기울기 화살표를 놓아 극대·극소를 방향 전환으로 판정",
    mild: "도함수가 0인 점은 후보일 뿐입니다. 그 점 왼쪽과 오른쪽에서 그래프가 오르는지 내리는지를 화살표로 비교하세요.",
    spicy: "핵심 대상은 derivative sign transition입니다. +→−는 local maximum, −→+는 local minimum이며 sign이 유지되면 stationary point일 뿐입니다.",
    scenes: {
      "slope-direction-arrows": ["도함수 부호", "f′>0 / f′<0", "오름 / 내림", "도함수가 양수이면 함수는?", ["증가", "감소", "항상 0"], 0],
      "cubic-sign-chart": ["도함수 영점", "f′(x)=0", "구간 세 칸", "부호표를 나누는 기준은?", ["도함수 영점", "원함수 값 1", "적분 구간"], 0],
      "stationary-not-extreme": ["양옆 부호", "+,+ 또는 −,−", "극값 아님", "f′=0이면 무조건 극값인가요?", ["부호 변화가 필요", "항상 극값", "항상 최댓값"], 0],
      "increase-decrease-example": ["+→−와 −→+", "도함수 부호표", "극대·극소", "+에서 −로 바뀌면?", ["극대", "극소", "변곡점만"], 0],
      "derivative-sign-memory": ["영점보다 화살표", "좌부호→우부호", "방향 전환", "극값 판정의 핵심은?", ["양옆 부호 변화", "도함수 값 0만", "함숫값 부호"], 0],
    },
  },
  "calculus-1-02-08": {
    instruction: "절편·임계점·증가감소 화살표를 좌표판에 먼저 고정한 뒤 그 순서를 따라 매끄러운 그래프 윤곽을 연결",
    mild: "아무 점이나 많이 찍지 마세요. 축과 만나는 점, 방향이 바뀌는 점, 양 끝이 향하는 쪽만 먼저 놓고 화살표대로 곡선을 이으세요.",
    spicy: "핵심 대상은 qualitative graph reconstruction입니다. intercepts, critical points, monotonic intervals, end behavior가 topology를 결정합니다.",
    scenes: {
      "graph-clue-map": ["절편·전환점", "roots + critical points", "그래프 이정표", "개형을 그릴 때 먼저 놓을 점은?", ["절편과 임계점", "무작위 점", "도함수 계수만"], 0],
      "cubic-outline-clues": ["세제곱의 방향", "영점+부호표", "회전 위치", "곡선의 진행 방향은 무엇이 알려주나요?", ["도함수 부호", "함수 이름", "적분상수"], 0],
      "dot-plot-graph-error": ["점 사이의 흐름", "몇 점≠개형", "구간 방향 필요", "점만 직선으로 이어도 되나요?", ["증가·감소를 반영해야 함", "항상 됨", "점이 둘이면 됨"], 0],
      "draw-cubic-outline": ["위치 순서", "절편→극점→끝동작", "매끄러운 곡선", "극점 사이를 잇는 기준은?", ["부호표 화살표", "가까운 점 직선", "정적분 값"], 0],
      "graph-outline-memory": ["이정표와 방향", "절편+임계점+end behavior", "전체 윤곽", "개형의 세 단서는?", ["절편·방향전환·끝동작", "색·굵기·이름", "합·곱·몫"], 0],
    },
  },
  "calculus-1-02-09": {
    instruction: "원함수 그래프의 x축 교점과 도함수 부호 구간을 서로 다른 줄에 놓아 해·극점 혼동을 차단",
    mild: "원함수의 해는 그래프가 x축을 만나는 곳입니다. 도함수의 해는 그래프가 방향을 바꿀 후보이므로 두 줄을 섞지 마세요.",
    spicy: "핵심 대상은 root counting by monotonic partition. IVT로 각 단조구간의 존재를 보이고 strict monotonicity로 uniqueness를 고정합니다.",
    scenes: {
      "roots-as-crossings": ["원함수의 x축 교점", "f(x)=0", "방정식의 해", "방정식의 실근은 그래프에서?", ["x축 교점", "도함수 영점", "y축 절편"], 0],
      "unique-root-by-growth": ["한 방향 증가", "strictly increasing", "교점 최대 하나", "계속 증가하는 함수가 같은 축을 두 번 만날 수 있나요?", ["아니요", "항상 두 번", "세 번만 가능"], 0],
      "derivative-root-confusion": ["두 종류 영점", "f=0 vs f′=0", "교점 vs 전환후보", "f′(x)=0은 무엇인가요?", ["방향 전환 후보", "원함수의 근", "정적분"], 0],
      "three-root-proof": ["단조 구간 세 칸", "각 칸 부호변화", "실근 세 개", "각 단조구간에서 근을 하나로 제한하는 것은?", ["단조성", "함숫값 0", "도함수 적분"], 0],
      "equation-inequality-graph": ["교점과 부호 영역", "f=0, f>0, f<0", "해 개수·범위", "부등식의 해는 그래프에서?", ["축 위·아래 구간", "도함수 영점만", "꼭짓점 하나"], 0],
    },
  },
  "calculus-1-02-10": {
    instruction: "시간축 위에 위치·속도·가속도 세 계기판을 세로로 맞추고 속도 영점에서 이동 구간을 나눔",
    mild: "어디에 있는지는 위치, 어느 쪽으로 가는지는 속도, 속도가 어떻게 바뀌는지는 가속도입니다. 이동거리는 속도가 0인 때마다 나누어 더하세요.",
    spicy: "핵심 대상은 s′=v, v′=a의 derivative chain입니다. displacement는 ∫v, distance는 sign partitions에서 ∫|v|입니다.",
    scenes: {
      "motion-three-gauges": ["위치·속도·가속도", "s, v=s′, a=v′", "세 계기판", "진행 방향을 직접 정하는 것은?", ["속도의 부호", "가속도의 부호", "위치의 크기"], 0],
      "motion-direction-times": ["속도 영점", "v(t)=0", "방향 구간 경계", "움직임 방향이 바뀔 후보 시각은?", ["속도가 0인 때", "위치가 0인 때", "가속도가 양수인 때"], 0],
      "acceleration-direction-error": ["속도와 가속도 분리", "v<0, a>0 가능", "뒤로 가며 느려짐", "가속도 양수면 반드시 앞으로 가나요?", ["아니요, 방향은 속도", "항상 앞으로", "항상 정지"], 0],
      "motion-distance-example": ["구간별 위치 차", "|Δs₁|+|Δs₂|", "이동거리", "방향이 바뀌면 거리는 어떻게 구하나요?", ["구간별 위치 변화의 절댓값 합", "처음과 끝만 뺌", "가속도를 더함"], 0],
      "motion-derivative-chain": ["s→v→a", "한 번·두 번 미분", "위치→속도→가속도", "위치를 두 번 미분하면?", ["가속도", "속도", "변위"], 0],
    },
  },
  "calculus-1-03-01": {
    instruction: "도함수 화살표를 반대로 되감아 서로 세로 위치만 다른 원시함수 가족을 만들고 +C 레일로 묶음",
    mild: "미분해서 주어진 함수가 되는 모양을 찾은 뒤, 미분하면 사라지는 상수 C를 꼭 붙이세요. 한 점 조건이 있으면 그 가족에서 하나를 고릅니다.",
    spicy: "핵심 대상은 antiderivative equivalence class F+C입니다. 같은 derivative를 가진 함수들은 connected interval에서 상수 차이만 갖습니다.",
    scenes: {
      "reverse-the-derivative": ["미분 화살표 되감기", "F′=f", "∫f dx=F+C", "부정적분은 무엇을 찾나요?", ["원시함수 가족", "한 점의 기울기", "도함수 영점"], 0],
      "antiderivative-family": ["세로로 이동한 곡선", "6x²→2x³+C", "여러 원시함수", "6x²의 부정적분은?", ["2x³+C", "6x+C", "3x²"], 0],
      "missing-integration-constant": ["+C 자리", "d(C)/dx=0", "사라진 높이 복원", "적분상수를 빼면 무엇을 잃나요?", ["원시함수의 세로 위치 가족", "도함수", "정의역"], 0],
      "initial-value-selects-curve": ["한 점 조건", "F(a)=b", "C 하나 결정", "초기 조건은 무엇을 정하나요?", ["적분상수 C", "미분 차수", "구간 길이"], 0],
      "antiderivative-memory": ["되감기와 +C", "미분의 역과정", "모든 원시함수", "부정적분 답 끝에 붙일 것은?", ["+C", "+x", "절댓값"], 0],
    },
  },
  "calculus-1-03-02": {
    instruction: "거듭제곱 미분 기계를 역방향으로 돌려 지수를 한 칸 올리고 새 지수로 계수를 나누는 두 칸 레일 표시",
    mild: "적분에서는 지수를 먼저 하나 올립니다. 그리고 원래 계수가 아니라 방금 만든 새 지수로 나누세요. 마지막에 C를 붙입니다.",
    spicy: "핵심 대상은 ∫xⁿdx=xⁿ⁺¹/(n+1)+C, n≠−1입니다. exponent increment와 reciprocal scaling이 power rule을 정확히 역전합니다.",
    scenes: {
      "reverse-power-rule": ["지수 n", "xⁿ", "xⁿ⁺¹/(n+1)", "거듭제곱 적분의 첫 동작은?", ["지수를 1 올림", "지수를 1 내림", "계수 삭제"], 0],
      "integrate-four-terms": ["항별 새 지수", "Σ aₖxᵏ", "Σ aₖxᵏ⁺¹/(k+1)", "다항식 적분은 어떻게 하나요?", ["항별로 적분", "모두 곱함", "상수만 남김"], 0],
      "integration-power-slip": ["미분 습관 차단", "x³ 적분", "x⁴/4", "x³의 부정적분은?", ["x⁴/4+C", "3x²+C", "x⁴+C"], 0],
      "polynomial-antiderivative-condition": ["항별 적분+한 점", "F′=f, F(a)=b", "C 결정", "다항함수를 완전히 복원하려면?", ["초기 조건으로 C 결정", "도함수만", "영점 하나"], 0],
      "polynomial-integral-memory": ["올리고 나누기", "n→n+1→÷(n+1)", "+C", "적분 거듭제곱 규칙의 순서는?", ["한 칸 올리고 새 지수로 나눔", "내리고 곱함", "계수만 더함"], 0],
    },
  },
  "calculus-1-03-03": {
    instruction: "x축 위 영역은 파란 양수 띠, 아래 영역은 붉은 음수 띠로 채워 정적분과 실제 넓이를 분리",
    mild: "정적분은 방향이 있는 누적입니다. 그래프가 축 위에 있으면 더하고 아래에 있으면 빼며, 실제 넓이는 아래쪽도 절댓값으로 바꿉니다.",
    spicy: "핵심 대상은 signed accumulation입니다. ∫f는 oriented area이고 geometric area는 sign-change partition 뒤 ∫|f|로 계산합니다.",
    scenes: {
      "signed-accumulation": ["축 위·아래 띠", "f>0 / f<0", "+누적 / −누적", "정적분의 축 아래 부분은?", ["음수로 누적", "항상 양수", "무시"], 0],
      "trapezoid-definite-integral": ["직선 아래 사다리꼴", "∫ₐᵇ f", "기하 넓이와 일치", "함수가 구간에서 양수이면 정적분은?", ["축과 그래프 사이 넓이", "항상 0", "기울기"], 0],
      "integral-always-area-error": ["음수 영역", "∫f ≠ 전체 도형넓이", "부호를 보존", "정적분은 항상 양의 넓이인가요?", ["아니요", "항상 양수", "다항식만 양수"], 0],
      "split-signed-integral": ["축 교점", "구간 분할", "부호별 적분", "그래프가 축을 지나면 무엇을 먼저 하나요?", ["교점에서 구간을 나눔", "전체를 한 번에 절댓값", "끝점을 삭제"], 0],
      "definite-integral-memory": ["방향 있는 누적", "위 +, 아래 −", "정적분", "적분 구간을 뒤집으면?", ["부호가 바뀜", "값이 같음", "0이 됨"], 0],
    },
  },
  "calculus-1-03-04": {
    instruction: "구간을 따라 쌓인 작은 변화 조각을 원시함수의 시작 높이 F(a)와 끝 높이 F(b)의 차 하나로 접음",
    mild: "먼저 원시함수 F를 찾습니다. 위끝 b를 넣은 값에서 아래끝 a를 넣은 값을 빼고, 아래끝이 음수면 괄호를 유지하세요.",
    spicy: "핵심 대상은 FTC evaluation ∫ₐᵇf(x)dx=F(b)−F(a). accumulation operator가 antiderivative endpoint difference로 압축됩니다.",
    scenes: {
      "accumulation-endpoint-difference": ["처음·마지막 높이", "F(b)−F(a)", "전체 누적", "정적분을 원시함수로 계산하는 식은?", ["F(b)−F(a)", "F(a)+F(b)", "F(a)−F(b)"], 0],
      "evaluate-linear-integral": ["위끝 3·아래끝 1", "F(3)−F(1)", "구간 누적", "끝값 계산 순서는?", ["위끝에서 아래끝 빼기", "두 끝 더하기", "아래끝에서 위끝 빼기"], 0],
      "endpoint-order-error": ["뺄셈 방향", "upper−lower", "순서 고정", "정적분 끝값의 올바른 순서는?", ["위끝−아래끝", "아래끝−위끝", "두 값의 곱"], 0],
      "evaluate-polynomial-integral": ["아래끝 괄호", "F(b)−[F(a)]", "부호 안전", "아래끝이 음수일 때 필요한 것은?", ["괄호로 값을 묶기", "부호 삭제", "위끝과 교환"], 0],
      "fundamental-link-memory": ["미분↔적분 다리", "F′=f", "∫f=F(b)−F(a)", "정적분을 두 값으로 줄이는 도구는?", ["원시함수", "도함수 영점", "평균값"], 0],
    },
  },
  "calculus-1-03-05": {
    instruction: "두 곡선 사이에 세로 띠를 여러 개 세우고 각 띠의 높이를 위 함수−아래 함수로 직접 표시",
    mild: "식이 적힌 순서는 잊고 중간 x값에서 어느 그래프가 위인지 보세요. 교점을 경계로 세로 띠 높이를 위에서 아래를 빼서 만듭니다.",
    spicy: "핵심 대상은 area integrand top(x)−bottom(x). intersections partition the domain, and ordering must be re-evaluated on every subinterval.",
    scenes: {
      "vertical-area-strips": ["세로 띠 높이", "위 함수−아래 함수", "양수 높이", "곡선 사이 넓이의 피적분함수는?", ["위−아래", "아래−위", "두 함수의 곱"], 0],
      "line-parabola-unit-area": ["교점과 중간값", "두 곡선 비교", "위아래 결정", "두 그래프의 위아래는 어떻게 확인하나요?", ["구간 중간값 비교", "식 순서", "계수 크기만"], 0],
      "area-formula-order-error": ["식 순서 함정", "첫 식−둘째 식 아님", "실제 위−아래", "먼저 제시된 함수를 위로 두어도 되나요?", ["그래프 위치를 확인해야 함", "항상 됨", "다항식만 됨"], 0],
      "parabola-line-area": ["교점 사이 띠", "∫(top−bottom)", "둘러싸인 넓이", "넓이 계산의 첫 단계는?", ["교점 찾기", "바로 적분", "도함수만 구하기"], 0],
      "area-top-minus-bottom": ["경계·위아래·적분", "교점→비교→∫", "넓이 완성", "곡선 사이 넓이의 올바른 순서는?", ["교점→위아래→적분", "적분→교점→미분", "기울기→넓이"], 0],
    },
  },
  "calculus-1-03-06": {
    instruction: "속도 그래프의 양수·음수 영역을 방향별로 색칠하고 영점마다 잘라 변위와 이동거리 두 누적계에 따로 넣음",
    mild: "속도 그래프가 축 위면 앞으로, 아래면 뒤로 갑니다. 변위는 부호대로 더하고, 이동거리는 방향이 바뀔 때 나눠 각 크기를 더하세요.",
    spicy: "핵심 대상은 displacement ∫v versus distance ∫|v|. velocity zeros define the sign partition required to prevent cancellation of traveled length.",
    scenes: {
      "velocity-signed-area": ["속도 양·음 영역", "v>0 / v<0", "앞·뒤 변위", "속도 그래프 아래 정적분은?", ["변위", "항상 거리", "가속도"], 0],
      "velocity-crosses-zero": ["속도 영점", "v(t)=0", "방향 분할", "이동거리를 구할 때 구간을 나누는 곳은?", ["속도 영점", "위치 영점", "가속도 최댓값"], 0],
      "displacement-equals-distance-error": ["상쇄된 음수", "∫v vs ∫|v|", "변위≠거리", "방향이 바뀌면 변위와 거리는 같나요?", ["다를 수 있음", "항상 같음", "둘 다 0"], 0],
      "round-trip-from-velocity": ["왕복 두 구간", "+거리와 −변위", "출발 복귀·거리 남음", "출발점으로 돌아오면 이동거리는?", ["0보다 클 수 있음", "항상 0", "변위와 같음"], 0],
      "velocity-integral-memory": ["부호대로·절댓값으로", "∫v / ∫|v|", "변위 / 거리", "실제 이동거리는 어떤 적분인가요?", ["속력 |v|의 적분", "속도 v의 적분만", "가속도 적분"], 0],
    },
  },
};

const targetIDs = new Set(Object.keys(concepts));
const stories = shard.stories.filter((story) => targetIDs.has(story.conceptId));
const knownSceneIDs = new Set(stories.flatMap((story) => story.scenes.map((scene) => scene.id)));
const configuredSceneIDs = new Set(Object.values(concepts).flatMap((concept) => Object.keys(concept.scenes)));
const missingConcepts = [...targetIDs].filter((id) => !stories.some((story) => story.conceptId === id));
const missingScenes = [...knownSceneIDs].filter((id) => !configuredSceneIDs.has(id));
const extraScenes = [...configuredSceneIDs].filter((id) => !knownSceneIDs.has(id));
if (missingConcepts.length || missingScenes.length || extraScenes.length) {
  throw new Error(`미적분Ⅰ motion spec 불일치: concepts=${missingConcepts.join(",")} missing=${missingScenes.join(",")} extra=${extraScenes.join(",")}`);
}

for (const story of stories) {
  const concept = concepts[story.conceptId];
  for (const scene of story.scenes) {
    const [rawFocus, rawExpression, rawResult, rawPrompt, rawChoices, answerIndex] = concept.scenes[scene.id];
    const focus = studentText(rawFocus);
    const expression = studentText(rawExpression);
    const result = studentText(rawResult);
    const promptBase = studentText(rawPrompt);
    const prompt = promptBase.length >= 12 ? promptBase : `${promptBase} 확인해보세요.`;
    const choices = rawChoices.map(answerChoice);
    scene.motion = {
      version: 1,
      mode: "plot",
      focus,
      instruction: studentText(concept.instruction),
      beats: [
        {
          id: `${scene.id}-locate`,
          action: "highlight",
          target: focus,
          expression,
          result: "대상 고정",
          caption: `먼저 ${focus}을 화면에서 찾고 다른 정보는 잠시 흐리게 둡니다.`,
          durationMs: 1_800,
        },
        {
          id: `${scene.id}-transform`,
          action: "transform",
          target: focus,
          expression,
          result,
          caption: studentText(scene.subtitle),
          durationMs: 2_200,
        },
        {
          id: `${scene.id}-verify`,
          action: "verify",
          target: result,
          expression: `${expression} → ${result}`,
          result,
          caption: `${result}가 정의·부호·구간 조건을 모두 지키는지 반대 방향으로 한 번 검산합니다.`,
          durationMs: 2_000,
        },
      ],
      mild: { explanation: studentText(`${scene.subtitle} ${concept.mild}`) },
      spicy: { explanation: studentText(`${concept.spicy} 이 장면에서는 ${expression}에서 ${result}로 바뀌는 한 지점만 추적합니다.`) },
      check: {
        prompt,
        choices,
        answerIndex,
        correctFeedback: `맞아요. ${focus}을 기준으로 ${result}까지 연결했습니다.`,
        retryFeedback: `${focus}을 먼저 가리킨 뒤 ${expression}에서 ${result}로 가는 조건을 한 단계씩 다시 보세요.`,
      },
    };
  }
}

fs.writeFileSync(shardPath, `${JSON.stringify(shard, null, 2)}\n`);
console.log(`Authored Calculus I motion: ${stories.length} stories / ${knownSceneIDs.size} scenes`);
