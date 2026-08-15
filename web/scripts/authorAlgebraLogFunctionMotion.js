#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const shardPath = path.resolve(__dirname, "..", "content_folder", "curriculum-stories", "algebra.json");
const beat = ([id, action, target, expression, result, caption, durationMs = 1_900]) => ({
  id, action, target, expression, result, caption, durationMs,
});
const check = (prompt, choices, answerIndex, correctFeedback, retryFeedback) => ({
  prompt: prompt.length >= 12 ? prompt : `${prompt} 무엇일까요?`,
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
  "exponent-question-language": motion(
    "밑 a·도착값 b·버튼 횟수 logₐb",
    "지수 기계 aˣ=b의 입력칸과 출력칸을 놓고, 비어 있는 지수 x를 로그값으로 되묻기",
    [
      ["run-power", "highlight", "밑 2와 지수 3", "2³", "8", "지수 문장은 버튼을 세 번 눌러 8에 도착합니다."],
      ["ask-exponent", "transform", "비어 있는 버튼 횟수", "2ˣ=8", "x=3", "결과 8에서 출발해 몇 번 눌렀는지 되묻습니다."],
      ["name-log", "verify", "log₂8", "log₂8=3", "지수의 답", "로그는 새 계산이 아니라 지수 질문의 답을 적는 언어입니다."],
    ],
    "2를 몇 제곱해야 8이 되는지 물으면 답은 3입니다. 그 문장을 log₂8=3이라고 씁니다.",
    "logarithm is the inverse question for a fixed exponential base: logₐb is the unique real exponent x satisfying aˣ=b.",
    check("log₂8의 값과 같은 버튼 횟수는?", ["2번", "3번", "8번"], 1, "맞아요. 2³=8이므로 로그값은 3입니다.", "로그 기호를 2ˣ=8로 다시 번역하세요."),
  ),
  "log-domain-gates": motion(
    "밑 a>0·a≠1과 진수 b>0",
    "로그 기계 앞에 밑 관문 두 개와 진수 관문 한 개를 두어 통과·차단 사례 비교",
    [
      ["base-positive", "group", "밑 a>0", "a=2", "통과", "양수 밑만 실수 지수에서 일관된 로그 기계를 만듭니다."],
      ["base-not-one", "group", "밑 a≠1", "1ˣ=1", "차단", "밑 1은 어떤 지수를 넣어도 1이라 역질문이 하나로 정해지지 않습니다."],
      ["argument-positive", "verify", "진수 b>0", "aˣ>0", "0·음수 차단", "양수 밑의 지수함수 출력은 언제나 양수입니다."],
    ],
    "로그에서는 밑이 양수이면서 1이 아니어야 하고, 로그 안의 진수도 양수여야 합니다.",
    "real logarithms require a positive nonunit base and a positive argument because the exponential range is exactly the positive reals.",
    check("실수 로그 logₐb의 올바른 조건은?", ["a>0, a≠1, b>0", "a≥0, b≥0", "a=1, b>0"], 0, "맞아요. 밑과 진수의 세 관문을 모두 통과했습니다.", "지수함수 aˣ의 출력 범위부터 확인하세요."),
  ),
  "log-sum-trap": motion(
    "로그의 합 ↔ 진수의 곱",
    "두 로그 카드를 지수 장부처럼 결합해 곱으로 보내고, 진수 덧셈으로 가는 잘못된 화살표 차단",
    [
      ["expand-two-logs", "group", "logₐM + logₐN", "지수 m+n", "aᵐ·aⁿ", "같은 밑의 지수 합은 원래 값의 곱에 대응합니다."],
      ["combine-product", "transform", "진수의 곱 MN", "logₐ(MN)", "한 로그", "따라서 로그의 합은 진수를 곱해 한 로그로 묶습니다."],
      ["reject-sum", "verify", "logₐ(M+N) 주장", "M+N", "연결 규칙 없음", "진수 덧셈은 지수법칙에서 나온 연산이 아니므로 합칠 수 없습니다."],
    ],
    "log M과 log N을 더하면 log(MN)입니다. 로그 안의 M+N으로 옮기면 안 됩니다.",
    "the logarithm product law is inherited from addition of exponents under multiplication; no analogous law exists for a sum of arguments.",
    check("log₂4+log₂8을 한 로그로 쓰면?", ["log₂12", "log₂32", "log₂4·8"], 1, "맞아요. 진수 4와 8을 곱해 log₂32가 됩니다.", "로그 바깥의 더하기는 진수 안에서 곱하기로 바뀝니다."),
  ),
  "log-expression-solution": motion(
    "조건 → 지수 번역 → 소인수 장부",
    "log₂32−log₂4를 정의역 검사, 곱셈·나눗셈 법칙, 지수 문장 검산의 세 레일로 풀이",
    [
      ["check-domain", "highlight", "진수 32와 4", "32>0, 4>0", "조건 통과", "계산 전에 모든 진수가 양수인지 확인합니다."],
      ["combine-quotient", "transform", "로그의 차", "log₂(32/4)", "log₂8", "로그의 차는 같은 밑의 지수 장부에서 진수의 나눗셈입니다."],
      ["translate-power", "verify", "2ˣ=8", "2³=8", "답 3", "마지막에는 지수 문장으로 되돌려 값과 조건을 함께 검산합니다."],
    ],
    "32와 4가 양수인지 보고, 로그의 차를 log₂8로 묶은 뒤 2³=8로 바꾸면 답은 3입니다.",
    "a safe logarithmic simplification checks domains first, applies exponent-derived product or quotient laws, then verifies through the equivalent power equation.",
    check("log₃81−log₃9의 값은?", ["2 선택", "3 선택", "9 선택"], 0, "맞아요. log₃(81/9)=log₃9=2입니다.", "두 로그의 차를 진수의 나눗셈으로 묶으세요."),
  ),
  "log-three-roles-recall": motion(
    "버튼 a·도착값 b·횟수 logₐb",
    "로그 카드의 아래첨자·진수·결과를 지수 기계의 밑·출력·입력 위치에 각각 연결",
    [
      ["recall-base", "highlight", "아래첨자 a", "밑 a", "고정 버튼", "밑은 반복해서 곱하는 버튼의 값입니다."],
      ["recall-argument", "transform", "진수 b", "도착값 b", "양수 출력", "진수는 지수 기계가 도착해야 하는 양수입니다."],
      ["recall-value", "verify", "로그값 x", "aˣ=b", "버튼 횟수", "로그값은 그 도착값을 만드는 지수입니다."],
    ],
    "logₐb에서 a는 버튼, b는 도착값, 전체 로그값은 필요한 버튼 횟수입니다.",
    "base, argument, and logarithmic value occupy fixed roles in the inverse relation aˣ=b and must not be interchanged.",
    check("log₅125=3에서 도착값은 무엇인가요?", ["밑 5", "진수 125", "지수 3"], 1, "맞아요. 125가 지수 기계의 도착값입니다.", "5³=125 문장에서 출력 위치를 찾으세요."),
  ),

  "powers-of-ten-elevator": motion(
    "10의 지수층과 원래 수의 크기",
    "1·10·100·1000을 층별로 쌓고 상용로그가 각 수를 0·1·2·3층으로 바꾸는 엘리베이터",
    [
      ["stack-decades", "group", "10⁰·10¹·10²·10³", "1→10→100→1000", "10배씩 상승", "한 층 올라갈 때 원래 수는 10배가 됩니다."],
      ["label-log-floor", "point", "log₁₀100", "10²=100", "2층", "상용로그는 10을 몇 제곱한 층인지 숫자로 표시합니다."],
      ["compare-gap", "verify", "로그층 차이 1", "10³/10²", "원래 값 10배", "로그 눈금의 한 칸은 원래 척도에서 10배 차이입니다."],
    ],
    "상용로그는 10의 몇 제곱 크기인지 층 번호로 보여 줍니다. 100은 2층, 1000은 3층입니다.",
    "base-ten logarithms linearize multiplicative decades: a unit step in logarithm corresponds to a tenfold ratio in the original quantity.",
    check("log₁₀1000의 층 번호는?", ["2층", "3층", "10층"], 1, "맞아요. 10³=1000이므로 3층입니다.", "1000에 들어 있는 10의 곱 개수를 세세요."),
  ),
  "digit-count-question": motion(
    "10ⁿ⁻¹ 이상·10ⁿ 미만의 n자리 구간",
    "10의 거듭제곱 경계 사이에 수 카드를 놓고 층 번호와 자릿수의 1 차이를 표시",
    [
      ["mark-boundaries", "group", "10²=100과 10³=1000", "100≤N<1000", "세 자리 구간", "세 자리 수는 100에서 시작해 1000 직전에 끝납니다."],
      ["read-floor", "point", "⌊log₁₀N⌋", "2≤log₁₀N<3", "정수 부분 2", "로그의 정수 부분은 가장 가까운 아래 10의 지수층입니다."],
      ["add-one", "verify", "자릿수", "정수 부분+1", "3자리", "층 번호가 0부터 시작하므로 자릿수에는 1을 더합니다."],
    ],
    "100 이상 1000 미만이면 로그값은 2 이상 3 미만입니다. 정수 부분 2에 1을 더해 세 자리입니다.",
    "for a positive integer N, digit count equals floor(log₁₀N)+1 because decimal intervals are [10ⁿ⁻¹,10ⁿ).",
    check("log₁₀N의 정수 부분이 4라면 N의 자릿수는?", ["4자리", "5자리", "10자리"], 1, "맞아요. 층 번호 4에 1을 더해 5자리입니다.", "자릿수 구간은 10⁴ 이상 10⁵ 미만입니다."),
  ),
  "scale-difference-trap": motion(
    "로그 차이 1 ↔ 원래 비율 10",
    "로그 눈금 2와 3을 한 칸 떨어뜨리고 원래 값 100과 1000 사이의 열 배 확대를 함께 표시",
    [
      ["show-log-gap", "highlight", "3−2=1", "로그값 차이", "한 칸", "로그 축에서는 두 값이 한 칸 떨어져 보입니다."],
      ["undo-log-gap", "transform", "원래 값의 비", "10³/10²", "10배", "차이를 지수로 되돌리면 10의 1제곱 배입니다."],
      ["reject-add-one", "verify", "원래 값도 1 차이 주장", "1000−100", "900 차이", "로그의 덧셈 간격과 원래 척도의 덧셈 간격을 섞지 않습니다."],
    ],
    "로그값이 1 커졌다는 말은 원래 값에 1을 더했다는 뜻이 아니라 10배가 됐다는 뜻입니다.",
    "differences on a logarithmic scale encode ratios, so Δlog₁₀=1 means a multiplicative factor of ten rather than an additive increment.",
    check("상용로그값이 2만큼 차이나면 원래 값의 비는?", ["2배", "20배", "100배"], 2, "맞아요. 10²=100배입니다.", "로그 차이를 10의 지수로 되돌리세요."),
  ),
  "common-log-application-route": motion(
    "정수부는 규모·소수부는 층 안 위치",
    "log₁₀320=2.505…를 2층과 그 안의 3.2 위치로 분해해 자릿수와 상대 크기 읽기",
    [
      ["split-log", "group", "2.505의 정수부와 소수부", "2 + 0.505", "층·방 위치", "정수부는 10² 규모, 소수부는 그 층 안의 위치입니다."],
      ["recover-scale", "transform", "10²·10⁰·⁵⁰⁵", "100·3.2", "320", "정수부와 소수부를 각각 지수로 되돌려 원래 수를 복원합니다."],
      ["read-digits", "verify", "정수부 2", "2+1", "세 자리", "규모층을 자릿수로 읽을 때만 1을 더합니다."],
    ],
    "log₁₀320의 정수 부분 2는 100 이상 1000 미만 규모를, 소수 부분은 그 안에서 3.2배 위치를 뜻합니다.",
    "the characteristic identifies the decade while the mantissa locates the normalized significand inside that decade.",
    check("log₁₀4500의 정수 부분이 알려 주는 것은?", ["네 자리 규모", "정확히 4배", "소수점 자리"], 0, "맞아요. 정수부 3이므로 10³ 이상 10⁴ 미만인 네 자리 규모입니다.", "정수부는 10의 몇 제곱 층인지 나타냅니다."),
  ),
  "magnitude-floor-recall": motion(
    "층 번호·자릿수·배율의 왕복",
    "상용로그 카드에서 정수부+1, 로그 차이→10의 거듭제곱, 원래 비율→로그 차이를 세 화살표로 복습",
    [
      ["recall-digits", "highlight", "⌊log₁₀N⌋+1", "층 번호+1", "자릿수", "양의 자연수의 자릿수는 층 번호보다 하나 많습니다."],
      ["recall-ratio", "transform", "로그 차이 d", "10ᵈ", "원래 값의 비", "로그의 차이는 원래 척도의 배율로 되돌립니다."],
      ["recall-direction", "verify", "10배 증가", "로그값 +1", "한 층 상승", "원래 배율과 로그 간격을 양방향으로 확인합니다."],
    ],
    "정수부에 1을 더하면 자릿수, 로그 차이를 10의 지수로 바꾸면 원래 값의 비입니다.",
    "digit count and multiplicative comparison are distinct readings of the same decade coordinate and should be converted with their own rules.",
    check("원래 값이 1000배 커지면 상용로그값은 얼마나 커지나요?", ["1만큼", "3만큼", "1000만큼"], 1, "맞아요. 1000=10³이므로 로그값은 3 커집니다.", "배율 1000을 10의 거듭제곱으로 바꾸세요."),
  ),

  "forward-and-reverse-machines": motion(
    "지수 기계 aˣ와 로그 되감기 logₐx",
    "같은 밑 a를 공유하는 정방향·역방향 기계를 놓고 입력 3과 출력 8을 왕복",
    [
      ["run-exponential", "highlight", "지수 입력 3", "2³", "8", "지수함수는 실수 지수를 양수 출력으로 보냅니다."],
      ["run-logarithm", "transform", "양수 입력 8", "log₂8", "3", "로그함수는 그 양수에서 원래 지수를 되찾습니다."],
      ["round-trip-machines", "verify", "log₂(2³)", "되감기", "3", "같은 밑을 쓰면 두 기계가 서로의 작동을 취소합니다."],
    ],
    "2의 3제곱은 8이고 log₂8은 다시 3입니다. 두 함수는 같은 길을 반대 방향으로 갑니다.",
    "for a fixed valid base, exponential and logarithmic functions are mutual inverses mapping reals and positive reals in opposite directions.",
    check("log₃(3⁴)의 값은 무엇인가요?", ["3 선택", "4 선택", "12 선택"], 1, "맞아요. 같은 밑의 로그가 지수 4를 되돌립니다.", "정방향 3⁴ 뒤에 역방향 log₃를 적용하세요."),
  ),
  "fixed-base-variable-place": motion(
    "고정 밑 a와 움직이는 입력 x",
    "밑 카드 a는 고정하고 지수 입력 슬롯과 로그 진수 슬롯만 움직여 함수와 식의 차이 표시",
    [
      ["lock-base", "group", "밑 a", "a>0, a≠1", "고정", "한 함수 그래프를 정할 때 밑은 바뀌지 않는 설정값입니다."],
      ["move-exponent", "point", "지수함수 입력 x", "x→aˣ", "양수 출력", "지수함수에서는 지수 칸이 움직이는 입력입니다."],
      ["move-argument", "verify", "로그함수 입력 x", "x→logₐx", "실수 출력", "로그함수에서는 양수 진수 칸이 움직이는 입력입니다."],
    ],
    "지수함수와 로그함수 모두 밑 a는 고정합니다. 움직이는 x의 자리가 지수인지 진수인지 구분하세요.",
    "a function family fixes the base parameter while its independent variable occupies the exponent slot for aˣ or the positive argument slot for logₐx.",
    check("y=2ˣ에서 함수의 입력 변수는 어느 자리인가요?", ["밑 2 자리", "지수 x 자리", "출력 y 자리"], 1, "맞아요. 밑 2는 고정되고 지수 x가 움직입니다.", "그래프에서 가로축에 놓는 값을 찾으세요."),
  ),
  "domain-range-swap-trap": motion(
    "지수 정의역 ℝ ↔ 로그 정의역 (0,∞)",
    "y=x 거울을 사이에 두고 지수함수의 정의역·치역 상자와 로그함수 상자를 교환",
    [
      ["show-exponential-sets", "group", "aˣ의 정의역과 치역", "ℝ → (0,∞)", "양수 출력", "지수함수는 모든 실수를 받아 양수만 출력합니다."],
      ["swap-inverse-sets", "transform", "역함수의 입출력 교환", "(0,∞) → ℝ", "로그함수", "역함수는 식뿐 아니라 정의역과 치역도 맞바꿉니다."],
      ["reject-zero-input", "verify", "logₐ0", "입력 0", "정의되지 않음", "0은 어떤 실수 지수의 양수 밑 거듭제곱으로도 나오지 않습니다."],
    ],
    "지수함수는 모든 실수를 입력받아 양수를 내보냅니다. 로그함수는 그 양수만 입력받아 실수 지수를 돌려줍니다.",
    "inverse functions exchange domain and range; because aˣ is always positive, logₐx cannot accept zero or negative inputs.",
    check("y=log₂x의 정의역은 무엇인가요?", ["모든 실수", "x>0", "x≥0"], 1, "맞아요. 로그 입력은 반드시 양수입니다.", "지수함수 2ˣ이 만들 수 있는 출력만 로그 입력이 됩니다."),
  ),
  "inverse-composition-solution": motion(
    "x·y 교환 후 지수에 대해 풀기",
    "y=3ˣ에서 x와 y 이름표를 교환하고 로그 문장으로 풀어 역함수 식을 완성",
    [
      ["start-exponential", "highlight", "원함수 y=3ˣ", "x→y", "실수→양수", "먼저 원함수의 입출력과 범위를 표시합니다."],
      ["swap-variables", "transform", "x와 y 교환", "x=3ʸ", "역방향 관계", "역함수는 입력과 출력의 역할을 바꿉니다."],
      ["solve-log", "verify", "y에 대해 풀기", "y=log₃x", "역함수 완성", "지수 문장을 로그로 번역하고 정의역 x>0을 붙입니다."],
    ],
    "y=3ˣ에서 x와 y를 바꾸면 x=3ʸ입니다. y에 대해 풀어 y=log₃x, x>0을 얻습니다.",
    "constructing the inverse requires swapping coordinates, solving the exponential relation for the new output, and carrying the exchanged domain.",
    check("y=5ˣ의 역함수는 무엇인가요?", ["y=1/5ˣ", "y=log₅x", "y=5log x"], 1, "맞아요. 같은 밑 5의 로그함수가 역함수입니다.", "x=5ʸ를 y에 대해 로그로 푸세요."),
  ),
  "two-machines-recall": motion(
    "실수↔양수 왕복과 같은 밑",
    "지수·로그 기계를 양방향 화살표로 연결하고 정의역·치역·합성 결과를 한 판에 복습",
    [
      ["recall-forward-range", "highlight", "aˣ", "ℝ→(0,∞)", "정방향", "지수함수는 실수 지수를 양수 값으로 보냅니다."],
      ["recall-reverse-range", "transform", "logₐx", "(0,∞)→ℝ", "역방향", "로그함수는 양수에서 원래 실수 지수를 찾습니다."],
      ["recall-composition", "verify", "같은 밑으로 합성", "logₐ(aˣ)=x", "왕복 완료", "밑이 같고 정의역이 맞을 때 두 작동이 취소됩니다."],
    ],
    "지수는 실수에서 양수로, 로그는 양수에서 실수로 갑니다. 같은 밑이면 왕복 뒤 원래 값으로 돌아옵니다.",
    "the inverse pair is characterized jointly by opposite domains and ranges, a shared base, and identity compositions on valid inputs.",
    check("a^(logₐ7)의 값은 무엇인가요?", ["a 선택", "7 선택", "log 7"], 1, "맞아요. 로그가 찾은 지수를 같은 밑에 넣으면 7로 돌아옵니다.", "로그 기계와 지수 기계를 같은 밑으로 왕복시키세요."),
  ),

  "graph-mirror-and-anchors": motion(
    "y=x 거울과 (0,1)↔(1,0)",
    "지수곡선과 로그곡선을 y=x 양쪽에 그리고 기준점 두 개를 대칭선으로 연결",
    [
      ["plot-exponential-anchor", "point", "지수 기준점 (0,1)", "a⁰=1", "점 표시", "밑과 무관하게 지수그래프는 (0,1)을 지납니다."],
      ["reflect-anchor", "transform", "y=x 대칭", "(0,1)↔(1,0)", "좌표 교환", "역함수 그래프는 입력과 출력 좌표를 맞바꿉니다."],
      ["plot-log-anchor", "verify", "로그 기준점 (1,0)", "logₐ1=0", "점 표시", "두 기준점과 곡선 전체가 y=x에 대칭입니다."],
    ],
    "지수그래프의 기준점 (0,1)을 y=x 거울에 비추면 좌표 순서가 바뀌어 로그그래프의 기준점 (1,0)이 됩니다.",
    "inverse-function graphs reflect across y=x, exchanging every ordered pair and in particular the anchors (0,1) and (1,0).",
    check("지수그래프의 (2,9)는 역함수 그래프에서 어떤 점인가요?", ["(2,9)", "(9,2)", "(−2,9)"], 1, "맞아요. 역함수는 좌표 순서를 바꿉니다.", "y=x 거울에서는 x와 y가 서로 바뀝니다."),
  ),
  "base-direction-switch": motion(
    "a>1 증가·0<a<1 감소",
    "밑 슬라이더를 1의 왼쪽·오른쪽으로 옮기며 지수·로그 두 곡선의 방향을 함께 뒤집기",
    [
      ["base-above-one", "group", "a>1", "2ˣ, log₂x", "둘 다 증가", "밑이 1보다 크면 입력이 커질수록 지수와 로그값도 커집니다."],
      ["cross-one", "transform", "밑 a=1", "1ˣ=1", "역함수 불가", "1에서는 출력이 한 점에 겹쳐 로그함수가 만들어지지 않습니다."],
      ["base-below-one", "verify", "0<a<1", "(1/2)ˣ", "둘 다 감소", "밑이 1보다 작으면 입력 증가가 값을 줄이는 방향으로 바뀝니다."],
    ],
    "밑이 1보다 크면 두 그래프는 증가하고, 0과 1 사이면 둘 다 감소합니다. 1은 허용되지 않습니다.",
    "the sign of ln a controls monotonicity: exponential and logarithmic inverse graphs increase for a>1 and decrease for 0<a<1.",
    check("y=log₁⧸₂x는 증가함수인가요?", ["증가함수", "감소함수", "상수함수"], 1, "맞아요. 밑이 0과 1 사이이므로 감소합니다.", "밑 1/2가 1의 어느 쪽인지 확인하세요."),
  ),
  "asymptote-not-intercept": motion(
    "지수 y=0·로그 x=0 점근선",
    "축에 가까워지는 곡선과 실제 교점 표식을 분리하고 닿지 않는 점근선에 경고 표시",
    [
      ["show-exponential-asymptote", "highlight", "지수의 y=0", "aˣ>0", "닿지 않음", "지수함수 값은 0에 가까워져도 언제나 양수입니다."],
      ["mirror-asymptote", "transform", "y=x 대칭", "y=0↔x=0", "로그 점근선", "역함수의 수평 점근선은 수직 점근선으로 바뀝니다."],
      ["reject-late-crossing", "verify", "언젠가 축과 만남 주장", "유한한 x", "교점 없음", "점근선은 늦게 만나는 선이 아니라 끝까지 닿지 않는 경계입니다."],
    ],
    "지수그래프는 y=0에, 로그그래프는 x=0에 가까워지지만 어떤 유한한 입력에서도 닿지 않습니다.",
    "an asymptote describes limiting behavior rather than a delayed intersection; positivity and domain restrictions exclude finite contact.",
    check("y=2ˣ 그래프가 x축과 만나는 점은?", ["(0,1)", "교점 없음", "(1,0)"], 1, "맞아요. 2ˣ은 항상 양수라 x축에 닿지 않습니다.", "x축 위에서는 함수값이 0이어야 합니다."),
  ),
  "graph-reconstruction-route": motion(
    "점근선 → 기준점 → 방향 → 이동",
    "y=2^(x−1)+3을 기본 곡선에서 오른쪽 1·위 3 이동하고 새 점근선·확인점 표시",
    [
      ["start-skeleton", "group", "기본 y=2ˣ", "(0,1), y=0", "뼈대", "기준점과 점근선을 먼저 그려 곡선의 뼈대를 잡습니다."],
      ["apply-translation", "transform", "x−1과 +3", "오른쪽 1·위 3", "y=3 점근선", "괄호 안 이동과 함수 밖 이동을 서로 다른 방향으로 적용합니다."],
      ["plot-checkpoint", "verify", "x=1 확인점", "2⁰+3", "(1,4)", "확인점 하나를 대입해 이동 방향과 높이를 검산합니다."],
    ],
    "기본 그래프의 점근선과 기준점을 잡고 오른쪽 1, 위 3만큼 옮긴 뒤 (1,4)를 찍습니다.",
    "stable reconstruction uses invariant skeleton features first, applies translations with correct sign, then validates one transformed point.",
    check("y=3ˣ−2의 수평 점근선은?", ["y=0", "y=−2", "x=−2"], 1, "맞아요. 기본 점근선 y=0이 아래로 2 이동합니다.", "함수 밖의 −2는 그래프 전체를 아래로 옮깁니다."),
  ),
  "graph-fingerprint-recall": motion(
    "기준점·점근선·증감 방향 세 지문",
    "지수·로그 그래프 카드에 한 점, 한 점근선, 방향 화살표를 각각 붙여 빠른 판별",
    [
      ["recall-anchors", "highlight", "(0,1)과 (1,0)", "좌표 교환", "기준점", "두 그래프의 대표점은 역함수 대칭으로 연결됩니다."],
      ["recall-asymptotes", "transform", "y=0과 x=0", "축 교환", "점근선", "수평·수직 점근선도 y=x 대칭으로 바뀝니다."],
      ["recall-direction", "verify", "밑 a와 1 비교", "a>1 / 0<a<1", "증가 / 감소", "마지막으로 밑이 정하는 방향을 확인합니다."],
    ],
    "지수·로그 그래프는 기준점 하나, 점근선 하나, 밑이 정하는 방향만 잡아도 뼈대를 복원할 수 있습니다.",
    "anchor, asymptote, and monotonic direction form a minimal but sufficient fingerprint for identifying the exponential-logarithmic inverse pair.",
    check("로그그래프를 그릴 때 가장 먼저 묶어 볼 세 정보는?", ["기준점·점근선·방향", "넓이·부피·각도", "근·계수·판별식"], 0, "맞아요. 세 지문이면 그래프 뼈대를 빠르게 잡을 수 있습니다.", "(1,0), x=0, 밑과 1의 비교를 떠올리세요."),
  ),

  "multiplicative-clock": motion(
    "초기값·반복 배수·경과 횟수",
    "일정 시간마다 같은 배수를 곱하는 시계를 놓고 선형 증가와 지수 증가를 나란히 비교",
    [
      ["set-initial", "highlight", "초기값 A₀", "t=0", "출발량", "지수 모델은 먼저 출발 시점의 양을 고정합니다."],
      ["tick-multiplier", "group", "매 주기 배수 r", "A₀→A₀r→A₀r²", "곱셈 반복", "시간 한 칸마다 같은 수를 더하지 않고 같은 비율을 곱합니다."],
      ["write-clock", "verify", "경과 횟수 t/T", "A(t)=A₀r^(t/T)", "지수 모델", "주기 T로 시간을 나눈 횟수가 지수에 들어갑니다."],
    ],
    "초기값 A₀에서 매 주기 T마다 r배가 되면 t시간 뒤 값은 A₀r^(t/T)입니다.",
    "multiplicative change is modeled by placing the number of completed periods in the exponent of a fixed growth or decay factor.",
    check("100이 매 시간 2배가 될 때 3시간 뒤 값은?", ["106 선택", "600 선택", "800 선택"], 2, "맞아요. 100×2³=800입니다.", "매 시간 2를 더하지 말고 세 번 곱하세요."),
  ),
  "inverse-time-question": motion(
    "목표량에서 지수 시간 되찾기",
    "A₀rᵗ=B의 목표 카드에서 비율 B/A₀를 만들고 로그 기계로 t를 아래로 끌어내기",
    [
      ["isolate-power", "highlight", "rᵗ=B/A₀", "목표÷초기값", "배율", "먼저 지수항만 남겨 실제로 몇 배가 되어야 하는지 구합니다."],
      ["apply-log", "transform", "미지수 t", "t=logᵣ(B/A₀)", "시간 횟수", "로그는 지수 자리에 있는 시간을 값으로 끌어내립니다."],
      ["check-unit", "verify", "주기 T", "실제 시간=T·t", "단위 복원", "지수가 주기 횟수라면 마지막에 실제 시간 단위를 되돌립니다."],
    ],
    "목표를 초기값으로 나눠 필요한 배율을 만든 뒤, 밑 r의 로그를 취하면 필요한 주기 횟수가 나옵니다.",
    "solving for time isolates the multiplicative factor, applies the inverse logarithm, and then restores the physical period unit.",
    check("200·2ᵗ=1600에서 t는?", ["3 선택", "8 선택", "1400 선택"], 0, "맞아요. 2ᵗ=8이므로 t=3입니다.", "먼저 양변을 초기값 200으로 나누세요."),
  ),
  "model-and-domain-trap": motion(
    "식의 해·로그 조건·현실 범위 세 관문",
    "계산된 시간 후보를 로그 진수 양수, t≥0, 문제의 측정 단위 관문에 차례로 통과",
    [
      ["algebra-candidate", "highlight", "대수적으로 구한 t", "로그 계산", "후보", "식에서 나온 값은 아직 상황의 최종 답이 아닙니다."],
      ["domain-gate", "group", "로그 진수와 밑 조건", "비율>0, r>0, r≠1", "수학 조건", "로그 계산이 실수에서 정의되는지 먼저 확인합니다."],
      ["context-gate", "verify", "시간·수량의 현실 범위", "t≥0·관측 간격", "최종 답", "음수 시간이나 측정되지 않는 중간 시점은 상황에 맞게 해석합니다."],
    ],
    "계산한 t가 로그 조건을 통과해도 끝이 아닙니다. 시간은 음수가 아닌지, 관측 단위가 연속인지도 확인해야 합니다.",
    "a model solution is the intersection of algebraic solutions, logarithmic domain constraints, and the physical domain and sampling rules of the context.",
    check("시간 모델의 계산값이 −2라면 가장 먼저 할 일은?", ["그대로 −2시간", "상황의 t≥0 조건 확인", "절댓값 2로 변경"], 1, "맞아요. 식의 해가 상황의 허용 범위에 있는지 확인해야 합니다.", "수학 결과와 현실의 시간 범위를 분리하세요."),
  ),
  "growth-model-solution": motion(
    "초기값 200·감쇠 0.8·4시간 주기",
    "A(t)=200·0.8^(t/4)에서 100mg 연속 임계와 4시간 관측 최초 시점을 함께 표시",
    [
      ["build-decay-model", "group", "200·0.8^(t/4)", "4시간마다 0.8배", "감쇠 모델", "시간을 4로 나눈 주기 횟수에 감쇠 배수를 적용합니다."],
      ["solve-continuous", "transform", "A(t)=100", "t≈12.43", "연속 임계", "로그로 풀면 약 12.43시간에서 정확히 100mg이 됩니다."],
      ["check-observation-ticks", "verify", "4시간 관측 시점", "A(12)=102.4, A(16)=81.92", "최초 16시간", "관측이 4시간마다라면 처음 기준 이하인 기록은 16시간입니다."],
    ],
    "연속 시간의 임계는 약 12.43시간이고, 4시간 간격으로만 보면 12시간은 102.4mg, 16시간은 81.92mg이라 최초 기록은 16시간입니다.",
    "continuous threshold time and first qualifying sampled observation are different answers and must be labeled rather than silently conflated.",
    check("4시간마다만 관측할 때 처음 100mg 이하인 시점은?", ["12시간", "약 12.43시간", "16시간"], 2, "맞아요. 관측 눈금에서는 16시간이 첫 기준 이하입니다.", "12시간과 16시간의 실제 값을 각각 비교하세요."),
  ),
  "exponential-model-recall": motion(
    "더하기 변화·곱하기 변화·로그 되찾기",
    "선형·지수 모델 카드를 변화 방식으로 분류하고 목표에서 시간을 찾을 때 로그 카드를 연결",
    [
      ["separate-change", "highlight", "일정량 더하기 vs 일정비율 곱하기", "+d / ×r", "선형 / 지수", "문장에서 반복되는 연산이 모델의 종류를 결정합니다."],
      ["recall-exponential", "transform", "초기값·배수·횟수", "A₀rⁿ", "지수 모델", "같은 비율이 반복되면 횟수를 지수에 둡니다."],
      ["recall-log-time", "verify", "목표에서 횟수 찾기", "n=logᵣ(B/A₀)", "로그", "결과량에서 반복 횟수를 되찾을 때 역기계인 로그를 씁니다."],
    ],
    "같은 양을 더하면 선형, 같은 배수를 곱하면 지수입니다. 목표량에서 횟수를 찾을 때 로그를 사용합니다.",
    "model selection follows the repeated operation, and logarithms recover the number of multiplicative periods from a target ratio.",
    check("매년 5%씩 증가하는 양에 맞는 핵심 연산은?", ["매년 같은 양 더하기", "매년 1.05배 곱하기", "매년 5로 나누기"], 1, "맞아요. 일정 비율 변화는 매년 같은 배수를 곱합니다.", "퍼센트 증가는 이전 값에 대한 비율입니다."),
  ),
};

const shard = JSON.parse(fs.readFileSync(shardPath, "utf8"));
const targetConcepts = new Set(["algebra-01-04", "algebra-01-05", "algebra-01-06", "algebra-01-07", "algebra-01-08"]);
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
console.log(`Authored algebra log/function motion: ${targetStories.length} stories / ${targetSceneIds.size} scenes`);
