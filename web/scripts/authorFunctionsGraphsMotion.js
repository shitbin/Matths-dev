#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const shardPath = path.resolve(__dirname, "..", "content_folder", "curriculum-stories", "common-math-2.json");

const beat = (id, action, target, expression, result, caption, durationMs = 1_900) => (
  { id, action, target, expression, result, caption, durationMs }
);
const check = (prompt, choices, answerIndex, correctFeedback, retryFeedback) => ({
  prompt: prompt.length >= 12 ? prompt : `${prompt} 다음 중 고르세요.`,
  choices: choices.map((choice) => String(choice).length >= 4 ? choice : `${choice}입니다`),
  answerIndex,
  correctFeedback,
  retryFeedback,
});
const motion = (focus, instruction, beats, mild, spicy, sceneCheck) => ({
  version: 1,
  mode: "plot",
  focus,
  instruction,
  beats,
  mild: { explanation: mild },
  spicy: { explanation: spicy },
  check: sceneCheck,
});

const specs = {
  "vending-buttons": motion(
    "입력 버튼마다 정확히 하나씩 연결된 출력 컵",
    "정의역 1·2·3 버튼에서 출력 A·B 컵으로 화살표를 한 줄씩 연결",
    [
      beat("load-domain", "group", "정의역의 모든 입력 버튼", "{1,2,3}", "빠진 버튼 없음", "함수는 정의역의 모든 입력을 빠짐없이 처리해야 합니다."),
      beat("connect-one-output", "point", "각 버튼에서 나가는 화살표", "입력 1개→출력 1개", "정확히 한 잔", "서로 다른 버튼이 같은 컵으로 가도 되지만 한 버튼이 두 컵으로 가면 안 됩니다."),
      beat("audit-machine", "verify", "화살표가 0개 또는 2개인 버튼", "누락·분기 금지", "함수 여부 판정", "정의역 쪽에서 나가는 화살표 수만 세면 함수인지 빠르게 알 수 있습니다."),
    ],
    "함수는 모든 입력 버튼이 정확히 한 잔만 고르는 자판기입니다. 여러 버튼이 같은 잔을 골라도 괜찮습니다.",
    "a function is total and single-valued on its domain. Injectivity is optional; one output may have multiple preimages.",
    check("함수에서 정의역의 입력 하나가 가져야 하는 출력 수는?", ["정확히 하나", "두 개 이상", "없어도 됨"], 0, "맞아요. 입력마다 정확히 하나의 출력이 정해져야 합니다.", "정의역 버튼 하나에서 나가는 화살표를 세어 보세요."),
  ),
  "mapping-question": motion(
    "입력 1·2·3의 화살표 수와 실제 도착값 모음",
    "왼쪽 입력 열에서 오른쪽 출력 열로 화살표를 그리고 치역 컵만 색칠",
    [
      beat("count-arrows", "highlight", "각 입력에서 나가는 화살표", "1→a, 2→b, 3→b", "모두 1개", "입력마다 하나씩이라 함수 조건을 통과합니다."),
      beat("collect-arrivals", "group", "실제로 도착한 출력 a·b", "치역={a,b}", "사용한 컵만", "공역에 컵 c가 있어도 아무 화살표도 오지 않으면 치역에는 넣지 않습니다."),
      beat("show-invalid-branch", "verify", "2에서 a와 b로 갈라지는 경우", "2→a and 2→b", "함수 아님", "한 입력의 두 도착값이 single-valued 조건을 깨뜨립니다."),
    ],
    "왼쪽 입력마다 화살표가 정확히 하나인지 먼저 봅니다. 그다음 실제 화살표가 닿은 출력만 모으면 치역입니다.",
    "range is the image f(D), not the entire codomain. Function validity is checked at domain nodes before image collection.",
    check("공역 원소 중 실제 화살표가 도착한 값들의 집합은?", ["정의역", "치역", "그래프 축"], 1, "맞아요. 실제 출력으로 사용된 값들이 치역입니다.", "오른쪽 컵 중 화살표가 닿은 것만 색칠해 보세요."),
  ),
  "horizontal-test-error": motion(
    "같은 x에서 그래프를 만나는 세로선",
    "원 그래프에 세로선과 가로선을 번갈아 대어 함수 판정에 필요한 방향을 비교",
    [
      beat("show-vertical-line", "highlight", "x=c 세로선", "한 x의 모든 y 검사", "교점 2개면 함수 아님", "입력 x 하나가 출력 y를 몇 개 갖는지 세로선이 보여 줍니다."),
      beat("reject-horizontal-test", "point", "y=c 가로선", "여러 x의 같은 y 검사", "일대일 여부와 관련", "가로선은 함수 자체가 아니라 역함수 가능성을 보는 검사입니다."),
      beat("apply-to-circle", "verify", "원 x²+y²=1", "x=0에서 y=±1", "y 두 개→함수 아님", "같은 x에서 위·아래 두 점을 만나므로 전체 원은 y=f(x)가 아닙니다."),
    ],
    "함수 여부는 입력 x를 고정해야 하므로 세로선을 긋습니다. 가로선은 서로 다른 x가 같은 y를 쓰는지를 보는 다른 검사입니다.",
    "vertical-line testing enforces single-valuedness in x; horizontal-line testing detects injectivity for inverse-function eligibility.",
    check("y가 x의 함수인지 그래프에서 검사하는 선은?", ["세로선", "가로선", "대각선"], 0, "맞아요. 같은 x에서 y가 하나인지 세로선으로 봅니다.", "입력 x를 고정하는 선의 방향을 생각하세요."),
  ),
  "graph-from-rule": motion(
    "대응쌍 (x,f(x))을 좌표 점으로 옮기는 레일",
    "f(x)=2x+1에서 x=0·1·2를 처리해 표→순서쌍→그래프로 이동",
    [
      beat("calculate-table", "group", "x=0·1·2 입력", "f(x)=2x+1", "y=1·3·5", "규칙에 입력을 넣어 출력 열을 만듭니다."),
      beat("pair-coordinates", "transform", "입력과 출력의 짝", "(0,1),(1,3),(2,5)", "순서쌍", "입력이 x좌표, 출력이 y좌표가 되어 점의 주소가 됩니다."),
      beat("plot-and-read-range", "verify", "좌표평면의 세 점", "x→y", "그래프와 치역 {1,3,5}", "점의 y좌표를 모으면 표에서 읽은 치역과 같아야 합니다."),
    ],
    "입력을 규칙에 넣고, 입력과 출력을 (x,y)로 묶어 좌표평면에 찍습니다. 점들의 y좌표가 치역입니다.",
    "the graph is the set of ordered pairs {(x,f(x))}. Tabular, mapping, and geometric representations preserve the same relation.",
    check("f(x)=2x+1에서 x=2에 대응하는 그래프 점은?", ["(2,3)", "(2,5)", "(5,2)"], 1, "맞아요. f(2)=5이므로 점은 (2,5)입니다.", "순서쌍의 첫 칸은 입력, 둘째 칸은 출력입니다."),
  ),
  "function-recall": motion(
    "정의역 화살표와 세로선 검사 사이의 같은 규칙",
    "입력 버튼당 화살표 하나를 그래프의 x당 교점 하나로 겹쳐 표시",
    [
      beat("recall-mapping", "highlight", "정의역 각 입력", "화살표 정확히 1개", "함수", "누락되거나 갈라지는 버튼이 없는지 봅니다."),
      beat("recall-graph", "point", "각 x의 세로선", "그래프 교점 최대 1개", "같은 규칙", "세로선은 화살표 수를 좌표평면에서 세는 방법입니다."),
      beat("recall-range", "verify", "실제로 사용한 출력", "f(D)", "치역", "공역 전체가 아니라 도착한 출력만 모읍니다."),
    ],
    "화살표 지도에서는 입력당 하나, 그래프에서는 x당 교점 하나입니다. 실제 도착값만 모으면 치역입니다.",
    "mapping and graph tests are two projections of total single-valued correspondence; image extraction yields the range.",
    check("함수 그래프의 세로선 교점 수는 한 x에서 최대 몇 개인가요?", ["한 개", "두 개", "제한 없음"], 0, "맞아요. 한 입력에는 출력 하나만 대응합니다.", "세로선은 하나의 x를 고정합니다."),
  ),

  "assembly-line": motion(
    "f 기계의 출력이 g 기계 입력으로 바로 들어가는 처리선",
    "x 카드를 f→g 순서로 이동시키고 중간값과 최종값을 따로 표시",
    [
      beat("enter-inner-machine", "highlight", "입력 x와 f 기계", "x→f(x)", "중간값", "합성에서는 x에 가까운 안쪽 함수가 먼저 처리합니다."),
      beat("feed-outer-machine", "transform", "f(x) 전체와 g 기계", "f(x)→g(f(x))", "최종값", "첫 출력 전체를 둘째 기계의 한 입력으로 넣습니다."),
      beat("name-composition", "verify", "연결된 하나의 처리선", "(g∘f)(x)=g(f(x))", "f 먼저, g 나중", "기호는 g가 앞에 보여도 이동 경로는 오른쪽 f부터입니다."),
    ],
    "x는 먼저 f 기계를 지나 f(x)가 되고, 그 결과가 g 기계로 들어갑니다. 그래서 g∘f는 f 먼저, g 나중입니다.",
    "composition is pipeline evaluation right-to-left: (g∘f)(x)=g(f(x)), subject to f(x) lying in g's domain.",
    check("(g∘f)(x)에서 먼저 적용하는 함수는?", ["f 함수", "g 함수", "동시에 적용"], 0, "맞아요. x에 가장 가까운 f부터 계산합니다.", "괄호 안 g(f(x))에서 x 바로 옆 함수를 보세요."),
  ),
  "order-question": motion(
    "제곱 기계와 2배+1 기계의 두 연결 순서",
    "같은 입력 x를 f→g와 g→f 두 레일로 흘려 서로 다른 결과식을 비교",
    [
      beat("run-g-after-f", "group", "f(x)=x² 뒤 g(x)=2x+1", "g(f(x))=2x²+1", "첫 결과", "제곱한 전체를 g의 x 자리에 넣습니다."),
      beat("run-f-after-g", "group", "g(x)=2x+1 뒤 f", "f(g(x))=(2x+1)²", "둘째 결과", "2배+1 전체를 제곱하므로 교차항까지 생깁니다."),
      beat("compare-orders", "verify", "두 처리선 결과", "2x²+1 ≠ (2x+1)²", "순서 중요", "함수 합성은 일반적으로 교환법칙이 성립하지 않습니다."),
    ],
    "제곱 후 2배+1은 2x²+1이고, 2배+1 후 제곱은 (2x+1)²입니다. 같은 기계라도 순서가 바뀌면 결과가 달라집니다.",
    "composition is noncommutative in general. Nonlinear outer operations make parentheses and pipeline order observable.",
    check("f(x)=x², g(x)=2x+1일 때 (f∘g)(x)는?", ["2x²+1", "(2x+1)²", "2x+1"], 1, "맞아요. g의 결과 전체를 f에서 제곱합니다.", "f(g(x))를 먼저 괄호로 적으세요."),
  ),
  "missing-parentheses": motion(
    "바깥 함수의 x 슬롯 하나에 들어가는 안쪽 식 전체",
    "g(x)=x²−3x에서 x 자리를 큰 괄호로 묶고 f(x)=2x+1 블록을 통째로 삽입",
    [
      beat("open-input-slot", "highlight", "g의 두 x 자리", "g(□)=□²−3□", "같은 입력 슬롯", "바깥 함수의 모든 x 자리에 같은 안쪽 결과를 넣습니다."),
      beat("insert-whole-expression", "transform", "f(x)=2x+1 블록", "(2x+1)²−3(2x+1)", "괄호 유지", "안쪽 식 전체가 하나의 입력이라 괄호로 경계를 지킵니다."),
      beat("expand-after-substitution", "verify", "괄호가 있는 식", "4x²+4x+1−6x−3", "4x²−2x−2", "대입을 끝낸 뒤에만 전개해 누락을 막습니다."),
    ],
    "바깥 함수의 x 자리를 빈 상자라고 생각하세요. 안쪽 식 전체를 모든 상자에 넣고 괄호를 유지한 뒤 전개합니다.",
    "substitution is capture of a complete expression into every free occurrence of the outer variable. Parentheses preserve syntax-tree boundaries.",
    check("g(x)=x²−3x에 f(x)=2x+1을 넣은 첫 식은?", ["2x+1²−6x", "(2x+1)²−3(2x+1)", "2x²−3x+1"], 1, "맞아요. 두 x 자리에 같은 식 전체를 넣습니다.", "g의 x 자리를 두 개의 빈 상자로 바꿔 보세요."),
  ),
  "numeric-pipeline": motion(
    "숫자 2가 f와 g 기계를 거치는 실제 중간값",
    "f(x)=x+3, g(x)=x² 처리선에서 2→5→25 카드 이동",
    [
      beat("evaluate-inner", "highlight", "입력 2와 f", "f(2)=2+3", "5", "첫 기계의 값을 완전히 계산해 중간 카드에 적습니다."),
      beat("pass-middle-value", "transform", "중간값 5와 g", "g(5)=5²", "25", "x 대신 실제 중간값을 둘째 기계에 넘깁니다."),
      beat("compare-symbolic", "verify", "합성식 g(f(x))=(x+3)²", "x=2", "25 일치", "숫자 처리선과 기호 합성식이 같은 결과인지 검산합니다."),
    ],
    "숫자 2를 f에 넣어 5를 얻고, 그 5를 g에 넣어 25를 얻습니다. 중간값을 한 줄씩 적으면 순서를 잃지 않습니다.",
    "numeric tracing evaluates the same expression tree as symbolic composition and is an effective order sanity check.",
    check("f(x)=x+3, g(x)=x²일 때 (g∘f)(2)는?", ["10", "25", "7"], 1, "맞아요. 2→5→25 순서입니다.", "먼저 f(2)를 계산한 뒤 그 결과를 g에 넣으세요."),
  ),
  "composition-recall": motion(
    "오른쪽 함수부터 왼쪽 함수로 이동하는 x 카드",
    "(h∘g∘f)(x) 아래에 f→g→h 화살표를 반대 읽기 순서로 배치",
    [
      beat("find-nearest", "highlight", "x에 가장 가까운 f", "f(x)", "첫 기계", "합성 기호의 가장 오른쪽 함수가 입력에 먼저 닿습니다."),
      beat("follow-pipeline", "transform", "f 결과→g→h", "h(g(f(x)))", "처리 순서 f,g,h", "각 중간 결과를 다음 함수의 한 입력으로 넘깁니다."),
      beat("recall-domain", "verify", "각 기계의 입력 허용 범위", "f(x)∈Dom(g)", "연결 가능 확인", "중간 출력이 다음 정의역에 들어가지 않으면 합성이 그 입력에서 정의되지 않습니다."),
    ],
    "x에 가장 가까운 함수부터 따라가세요. f, g, h 순서로 처리하고 각 중간값이 다음 기계에 들어갈 수 있는지도 확인합니다.",
    "right-associative evaluation follows the expression tree leaves inward; composability requires image-domain compatibility at every edge.",
    check("(h∘g∘f)(x)의 계산 순서는?", ["h→g→f", "f→g→h", "g→f→h"], 1, "맞아요. x에 가까운 f부터 시작합니다.", "합성 기호를 오른쪽에서 왼쪽으로 따라가세요."),
  ),

  "undo-button": motion(
    "함수 기계의 정방향과 역함수 되감기 방향",
    "x→f(x) 화살표를 뒤집어 f(x)→x로 돌아오는 버튼을 켜기",
    [
      beat("run-forward", "highlight", "입력 x와 함수 f", "x→y=f(x)", "출력 y", "먼저 원래 함수가 어떤 변화를 했는지 순서대로 적습니다."),
      beat("reverse-operations", "transform", "출력 y와 되감기 버튼", "y→f⁻¹(y)", "원래 x", "마지막 연산부터 반대로 실행해 입력을 복원합니다."),
      beat("round-trip", "verify", "두 기계 연결", "f⁻¹(f(x))=x", "왕복 원상복구", "모든 허용 입력이 제자리로 돌아오면 역함수 관계를 확인한 것입니다."),
    ],
    "역함수는 출력에서 출발해 원래 입력으로 돌아가는 되감기 버튼입니다. 함수가 한 일을 마지막부터 반대로 풉니다.",
    "an inverse is a two-sided undo map on the relevant domains: f⁻¹∘f=id and f∘f⁻¹=id.",
    check("역함수의 핵심 역할은?", ["출력을 원래 입력으로 복원", "함숫값을 항상 음수로 변경", "함수를 제곱"], 0, "맞아요. 함수가 만든 변화를 정확히 되돌립니다.", "되감기 버튼을 누르면 어느 값으로 돌아가야 하는지 생각하세요."),
  ),
  "linear-undo-question": motion(
    "×3 후 −2 연산을 +2 후 ÷3으로 되감는 스택",
    "x→3x→3x−2 정방향 옆에 y→y+2→(y+2)/3 역방향을 나란히 표시",
    [
      beat("list-forward", "group", "f(x)=3x−2", "×3 then −2", "정방향 두 단계", "함수의 연산을 적용 순서대로 분해합니다."),
      beat("reverse-last-first", "transform", "출력 y", "+2 then ÷3", "(y+2)/3", "되감을 때는 마지막 −2부터 +2로 취소합니다."),
      beat("test-round-trip", "verify", "x=4", "4→10→(10+2)/3", "4 복원", "실제 숫자를 왕복시켜 역함수 식을 검산합니다."),
    ],
    "3배하고 2를 뺐다면, 되돌릴 때는 먼저 2를 더하고 3으로 나눕니다. 연산 순서도 반대로 뒤집습니다.",
    "inverse of an operation composition reverses order: (T_{−2}∘S_3)⁻¹=S_{1/3}∘T_{+2}.",
    check("f(x)=3x−2의 역함수는?", ["(x+2)/3", "3x+2", "1/(3x−2)"], 0, "맞아요. 먼저 2를 더하고 3으로 나눕니다.", "정방향의 마지막 연산부터 반대로 취소하세요."),
  ),
  "negative-one-is-not-reciprocal": motion(
    "f⁻¹ 입력 되감기와 1/f 출력 역수의 서로 다른 기계",
    "f(x)=2x에서 f⁻¹(x)=x/2와 1/f(x)=1/(2x)를 다른 레일에 배치",
    [
      beat("show-inverse", "highlight", "f⁻¹(x)", "입력-출력 역할 교환", "x/2", "역함수는 2배한 결과를 2로 나눠 원래 입력으로 돌립니다."),
      beat("show-reciprocal", "point", "1/f(x)", "함숫값의 역수", "1/(2x)", "역수는 출력 숫자를 뒤집을 뿐 입력을 복원하지 않습니다."),
      beat("compare-composition", "verify", "f(f⁻¹(x))와 f(x)·1/f(x)", "x / 1", "목적이 다름", "표기 −1과 분수 1을 같은 연산으로 읽지 않습니다."),
    ],
    "f⁻¹은 함수가 한 일을 되돌리는 새 함수이고, 1/f는 함숫값의 역수입니다. f(x)=2x에서 둘은 x/2와 1/(2x)로 전혀 다릅니다.",
    "superscript −1 denotes inverse under composition, whereas reciprocal denotes inverse under multiplication in the codomain.",
    check("f(x)=2x일 때 f⁻¹(x)는?", ["x/2", "1/(2x)", "−2x"], 0, "맞아요. 2배를 되돌리려면 2로 나눕니다.", "역수 대신 입력을 원래대로 복원하는 규칙을 찾으세요."),
  ),
  "solve-swap-check": motion(
    "y=f(x)에서 x를 푼 뒤 x·y 역할을 교환하는 세 단계",
    "y=3x−2→x=(y+2)/3→f⁻¹(x)=(x+2)/3 흐름과 합성 검산",
    [
      beat("solve-for-input", "highlight", "y=3x−2", "x=(y+2)/3", "입력 복원식", "출력 y가 주어졌다고 보고 원래 입력 x를 풉니다."),
      beat("swap-roles", "transform", "입출력 이름", "y=(x+2)/3", "f⁻¹(x)", "역함수의 입력 이름을 다시 x로 바꿉니다."),
      beat("composition-check", "verify", "f(f⁻¹(x))", "3·(x+2)/3−2", "x", "괄호를 유지해 합성한 결과가 x인지 확인합니다."),
    ],
    "y=f(x)로 놓고 x를 푼 다음 x와 y의 역할을 바꿉니다. 마지막에는 원래 함수와 합성해 x가 돌아오는지 확인합니다.",
    "algebraic inversion solves the graph relation for the former input; variable swapping re-expresses the inverse as a function on the original range.",
    check("역함수 식을 구한 뒤 가장 확실한 검산은?", ["원래 함수와 합성해 x 확인", "계수를 모두 더하기", "그래프를 지우기"], 0, "맞아요. f(f⁻¹(x))=x인지 확인합니다.", "되감기 뒤 원래 위치로 돌아와야 합니다."),
  ),
  "inverse-recall": motion(
    "되감기 화살표·입출력 교환·y=x 대칭의 세 표현",
    "함수 그래프 점 (a,b)를 역함수 점 (b,a)로 대각선 너머 이동",
    [
      beat("recall-undo", "highlight", "f의 출력에서 입력으로", "y→x", "되감기", "연산을 마지막부터 반대로 취소합니다."),
      beat("recall-swap", "transform", "순서쌍 (a,b)", "(b,a)", "입출력 역할 교환", "그래프 점의 두 좌표 자리가 바뀝니다."),
      beat("recall-diagonal", "verify", "직선 y=x", "서로 대칭", "함수와 역함수 그래프", "가로선 검사를 통과한 함수만 전체 치역에서 역함수가 됩니다."),
    ],
    "역함수는 연산 되감기, 입출력 자리 교환, y=x 대칭으로 모두 같은 내용을 말합니다.",
    "inverse graphs reflect across y=x because relation pairs are transposed. Injectivity guarantees the reflected relation remains single-valued.",
    check("함수 그래프의 점 (a,b)는 역함수에서 어떤 점이 되나요?", ["(b,a)", "(−a,b)", "(a,−b)"], 0, "맞아요. 입력과 출력의 자리를 바꿉니다.", "y=x 대칭은 두 좌표를 교환합니다."),
  ),

  "forbidden-wall-horizon": motion(
    "세로 점근선 x=p와 가로 점근선 y=q가 만드는 네 구역",
    "두 점근선을 먼저 그리고 유리함수 두 가지를 중심 반대편에 배치",
    [
      beat("raise-vertical-wall", "highlight", "분모가 0인 x=p", "x=p 입력 금지", "세로 점근선", "그래프는 이 벽을 건너지 않고 가까이 다가갑니다."),
      beat("draw-horizontal-horizon", "point", "x가 멀어질 때 y→q", "y=q", "가로 점근선", "아주 멀리서 그래프가 향하는 높이입니다."),
      beat("place-branches", "verify", "중심 (p,q) 양쪽 가지", "y=a/(x−p)+q", "a 부호로 방향", "점근선 교점은 대칭 중심이지만 함수가 실제로 찍는 점은 아닙니다."),
    ],
    "세로 점근선은 사용할 수 없는 입력의 벽이고, 가로 점근선은 멀리서 향하는 높이입니다. 두 선의 교점이 그래프 배치의 중심입니다.",
    "the translated reciprocal graph has asymptotes x=p and y=q; sign(a) selects opposite quadrants around center (p,q).",
    check("y=a/(x−p)+q의 세로 점근선은?", ["x=p", "y=q", "x=q"], 0, "맞아요. 분모 x−p가 0이 되는 입력입니다.", "분모를 0으로 만드는 x값을 찾으세요."),
  ),
  "divide-to-see-question": motion(
    "분자 나눗셈으로 꺼낸 q와 나머지 a",
    "(3x+1)/(x−2)를 3+7/(x−2)로 분해해 점근선 표시",
    [
      beat("divide-leading-terms", "highlight", "3x ÷ x", "3", "가로 이동값 q=3", "같은 차수의 최고차항 비가 멀리서 향하는 높이를 줍니다."),
      beat("compute-remainder", "transform", "3(x−2)=3x−6", "(3x+1)−(3x−6)=7", "나머지 7", "분자에서 몫×분모를 빼 이동형의 분자를 만듭니다."),
      beat("read-asymptotes", "verify", "3+7/(x−2)", "x=2, y=3", "중심 (2,3)", "이동형에서 두 점근선과 가지 방향을 바로 읽습니다."),
    ],
    "분자를 분모로 나누면 (3x+1)/(x−2)=3+7/(x−2)입니다. 그래서 벽은 x=2, 수평선은 y=3입니다.",
    "polynomial division isolates the asymptotic quotient and residual reciprocal term. The remainder controls branch orientation and scale.",
    check("(3x+1)/(x−2)의 가로 점근선은?", ["y=2", "y=3", "x=3"], 1, "맞아요. 최고차항 계수비이자 나눗셈의 몫 3입니다.", "분자를 분모로 나눈 상수 몫을 찾으세요."),
  ),
  "asymptote-is-not-graph": motion(
    "점근선 교점에 놓인 금지 표지와 양쪽 그래프 가지",
    "중심 (2,3)에 빈 원을 두고 실제 함수값이 될 수 없는 이유를 분모·극한으로 연결",
    [
      beat("mark-center", "point", "점근선 교점 (2,3)", "대칭 중심", "그래프 점 아님", "중심은 두 가지를 뒤집어 겹치는 기준점입니다."),
      beat("show-input-forbidden", "highlight", "x=2", "분모 0", "함숫값 없음", "중심의 x좌표 자체가 정의역에서 제외되어 점을 찍을 수 없습니다."),
      beat("show-output-missed", "verify", "y=3", "7/(x−2)=0 불가능", "치역에서도 제외", "유한한 x에서는 분수항이 0이 되지 않아 가로 점근선에도 닿지 않습니다."),
    ],
    "점근선의 교점은 그래프의 중심일 뿐 그래프 위 점이 아닙니다. x=2는 입력 금지이고 y=3도 유한한 x에서 나오지 않습니다.",
    "asymptotes describe limiting geometry, not locus membership. For nonzero a, neither x=p nor y=q belongs to y=a/(x−p)+q.",
    check("유리함수 점근선의 교점은 일반적으로 무엇인가요?", ["항상 그래프 위 점", "대칭 중심이지만 그래프 점은 아님", "x절편"], 1, "맞아요. 가지 배치의 중심이지 실제 함수값은 아닙니다.", "세로 점근선의 x는 정의되지 않는 입력입니다."),
  ),
  "rational-sketch": motion(
    "점근선 뼈대·부호·쉬운 점 순서로 완성되는 두 가지",
    "y=−2/(x+1)+3에서 x=−1,y=3을 세우고 x=0 점을 계산",
    [
      beat("set-asymptotes", "group", "x=−1과 y=3", "중심 (−1,3)", "뼈대", "그래프보다 먼저 세로 벽과 가로 수평선을 그립니다."),
      beat("read-sign", "highlight", "분자 a=−2", "a<0", "왼쪽 위·오른쪽 아래 가지", "중심 기준 곱 (x+1)(y−3)이 음수가 되는 두 구역을 고릅니다."),
      beat("plot-easy-point", "verify", "x=0", "y=−2+3", "점 (0,1)", "쉬운 점 하나를 찍고 중심 대칭 점까지 연결해 가지 방향을 확정합니다."),
    ],
    "x=−1, y=3 점근선을 먼저 그리고 a<0이라 왼쪽 위와 오른쪽 아래에 가지를 둡니다. x=0에서 (0,1)을 찍어 위치를 확정합니다.",
    "translated reciprocal sign follows (x−p)(y−q)=a. One evaluated point plus central symmetry determines branch placement.",
    check("y=−2/(x+1)+3의 세로 점근선은?", ["x=−1", "x=1", "y=3"], 0, "맞아요. x+1=0이 되는 x=−1입니다.", "분모 괄호를 0으로 만드는 값을 찾으세요."),
  ),
  "rational-recall": motion(
    "벽·수평선·중심·가지 방향 네 표지",
    "이동형 y=a/(x−p)+q를 네 요소에 연결해 순서대로 켜기",
    [
      beat("recall-wall", "highlight", "x=p", "분모 0", "세로 벽", "허용되지 않는 입력을 먼저 세웁니다."),
      beat("recall-horizon-center", "group", "y=q와 (p,q)", "가로 수평선·중심", "뼈대 완성", "두 점근선 교점은 대칭의 기준입니다."),
      beat("recall-sign", "verify", "a의 부호", "a>0 / a<0", "가지 구역 결정", "쉬운 점 하나로 식과 그림의 방향을 마지막 검산합니다."),
    ],
    "유리함수는 세로 벽 x=p, 가로 수평선 y=q, 중심 (p,q), a의 부호 순서로 그립니다.",
    "asymptotic frame plus sign and one sample point is a minimal sufficient sketch specification for translated reciprocal graphs.",
    check("유리함수 이동형에서 가지 방향을 정하는 것은?", ["a의 부호", "p+q의 값", "x축 이름"], 0, "맞아요. a의 양수·음수가 중심 기준 가지 구역을 바꿉니다.", "(x−p)(y−q)=a의 곱 부호를 보세요."),
  ),

  "trailhead-boundary": motion(
    "근호 안이 0이 되는 시작점과 한쪽으로만 이어지는 곡선",
    "y=√(x−2)에서 x=2 경계 표지를 세우고 오른쪽 방향으로 길을 그리기",
    [
      beat("solve-domain-boundary", "highlight", "x−2≥0", "x≥2", "경계 x=2", "근호 안은 음수가 될 수 없어 허용 구간이 경계에서 시작합니다."),
      beat("place-trailhead", "point", "x=2", "y=√0", "시작점 (2,0)", "근호 안을 0으로 만드는 실제 x값을 좌표에 찍습니다."),
      beat("grow-allowed-way", "verify", "x>2 방향", "√(x−2) 증가", "오른쪽으로 성장", "허용되지 않는 왼쪽에는 그래프를 그리지 않습니다."),
    ],
    "근호 안 x−2가 0 이상이어야 하므로 x≥2입니다. x=2에서 y=0으로 시작해 오른쪽으로 자랍니다.",
    "radical domain is the preimage of [0,∞). The boundary radicand zero maps to the graph endpoint.",
    check("y=√(x−2)의 시작점은?", ["(−2,0)", "(2,0)", "(0,2)"], 1, "맞아요. x−2=0에서 x=2, y=0입니다.", "근호 안을 0으로 만드는 x값을 구하세요."),
  ),
  "direction-question": motion(
    "근호 안 부호와 밖 계수 부호가 정하는 좌우·상하 방향",
    "y=−√(3−x)+1에서 x≤3 경계와 아래쪽 곡선을 두 화살표로 분해",
    [
      beat("read-horizontal-domain", "highlight", "3−x≥0", "x≤3", "시작점에서 왼쪽", "x 앞 부호가 음수라 허용 방향이 왼쪽으로 열립니다."),
      beat("read-vertical-sign", "transform", "근호 밖 −", "−√(…)", "기준 높이 아래", "밖의 음수는 곡선을 위아래로 뒤집습니다."),
      beat("place-start-height", "verify", "근호 안 0과 +1", "x=3,y=1", "시작점 (3,1)", "경계의 높이를 찍은 뒤 왼쪽 아래로 곡선을 잇습니다."),
    ],
    "3−x≥0이므로 x≤3, 시작점은 (3,1)입니다. 근호 밖 음수 때문에 그래프는 왼쪽 아래로 뻗습니다.",
    "inner affine sign controls domain orientation; outer coefficient sign reflects vertically; additive constant translates the endpoint height.",
    check("y=−√(3−x)+1의 정의역 방향은?", ["x≥3", "x≤3", "모든 실수"], 1, "맞아요. 3−x가 0 이상이어야 하므로 x≤3입니다.", "근호 안 부등식을 먼저 풀어 보세요."),
  ),
  "start-sign-error": motion(
    "x−p=0에서 p가 시작점이 되는 부호 검산",
    "y=√(x−4)에서 −4 후보를 지우고 x=4를 근호 안에 대입해 0 확인",
    [
      beat("show-wrong-sign", "point", "잘못 찍은 x=−4", "−4−4=−8", "근호 불가", "괄호 안 숫자의 부호를 그대로 복사하면 허용되지 않는 점이 됩니다."),
      beat("solve-zero", "transform", "x−4=0", "x=4", "정확한 경계", "시작점은 괄호가 아니라 방정식을 풀어 구합니다."),
      beat("substitute-check", "verify", "x=4", "√(4−4)=0", "시작점 (4,0)", "구한 좌표를 원래 식에 넣어 근호 안과 y값을 동시에 확인합니다."),
    ],
    "x−4의 시작점은 −4가 아니라 x−4=0을 푼 4입니다. 원래 식에 넣어 √0이 되는지 확인하세요.",
    "endpoint sign is determined by solving the radicand equation, not by visually copying the constant's sign.",
    check("y=√(x−4)의 시작 x값은?", ["−4", "4", "0"], 1, "맞아요. x−4=0을 풀면 x=4입니다.", "근호 안을 실제로 0으로 만드는 값을 대입하세요."),
  ),
  "perfect-square-points": motion(
    "근호 안 0·1·4·9에 대응하는 계산하기 쉬운 점",
    "y=√(x−2)에서 x=2·3·6·11을 점으로 찍어 부드러운 곡선 연결",
    [
      beat("choose-radicands", "group", "근호 안 완전제곱", "0,1,4,9", "y=0,1,2,3", "제곱근이 정수인 값을 골라 정확한 높이를 만듭니다."),
      beat("solve-inputs", "transform", "x−2=0,1,4,9", "x=2,3,6,11", "네 입력", "근호 안 값에 이동량 2를 다시 더해 x좌표를 찾습니다."),
      beat("connect-curve", "verify", "(2,0),(3,1),(6,2),(11,3)", "오른쪽으로 완만해짐", "근호 곡선", "점 사이를 직선처럼 꺾지 않고 증가폭이 줄어드는 곡선으로 잇습니다."),
    ],
    "근호 안이 0, 1, 4, 9가 되게 x를 고르면 y가 0, 1, 2, 3으로 쉽게 나옵니다. 정확한 점을 이어 곡선을 그리세요.",
    "perfect-square sampling gives exact lattice anchors; concavity reflects decreasing derivative 1/(2√u) for u>0.",
    check("y=√(x−2)에서 근호 안이 4가 되는 점은?", ["(4,2)", "(6,2)", "(6,4)"], 1, "맞아요. x−2=4에서 x=6, y=2입니다.", "먼저 x−2=4를 풀고 √4를 계산하세요."),
  ),
  "radical-recall": motion(
    "경계·시작점·허용 방향·완전제곱 점 네 표지",
    "근호 안 부등식에서 출발해 밖 계수 부호까지 한 줄로 연결",
    [
      beat("recall-domain", "highlight", "근호 안≥0", "허용 구간", "경계 결정", "시작점의 x는 근호 안이 0인 곳입니다."),
      beat("recall-start-direction", "transform", "안쪽 x 계수와 밖 부호", "좌우 방향 / 상하 반전", "곡선 방향", "안쪽은 정의역 방향, 바깥은 높이 방향을 정합니다."),
      beat("recall-points", "verify", "근호 안 0·1·4·9", "정확한 점", "곡선 완성", "시작점과 쉬운 점을 원래 식에 대입해 범위까지 확인합니다."),
    ],
    "근호 안이 0 이상인 구간을 찾고 경계에서 시작합니다. 안쪽 부호로 좌우, 바깥 부호로 상하를 정한 뒤 완전제곱 점을 찍습니다.",
    "domain boundary, affine orientation, outer reflection/translation, and exact samples form a complete radical-graph sketch procedure.",
    check("무리함수 그래프를 그릴 때 가장 먼저 확인할 것은?", ["근호 안의 허용 범위", "가로 점근선", "모든 x절편"], 0, "맞아요. 실수 범위에서 근호 안이 0 이상이어야 합니다.", "그래프를 그리기 전에 사용할 수 있는 x부터 정하세요."),
  ),
};

const shard = JSON.parse(fs.readFileSync(shardPath, "utf8"));
const targetStories = shard.stories.filter((story) => story.unitId === "functions-and-graphs");
const targetSceneIds = new Set(targetStories.flatMap((story) => story.scenes.map((scene) => scene.id)));
const missing = [...targetSceneIds].filter((id) => !specs[id]);
const extra = Object.keys(specs).filter((id) => !targetSceneIds.has(id));
if (missing.length || extra.length) throw new Error(`motion spec 불일치: missing=${missing.join(",")} extra=${extra.join(",")}`);
for (const story of targetStories) for (const scene of story.scenes) scene.motion = specs[scene.id];
fs.writeFileSync(shardPath, `${JSON.stringify(shard, null, 2)}\n`);
console.log(`Authored functions and graphs motion: ${targetStories.length} stories / ${targetSceneIds.size} scenes`);
