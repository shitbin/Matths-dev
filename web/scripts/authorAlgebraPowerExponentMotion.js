#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const shardPath = path.resolve(__dirname, "..", "content_folder", "curriculum-stories", "algebra.json");
const beat = (id, action, target, expression, result, caption, durationMs = 1_900) => ({
  id, action, target, expression, result, caption, durationMs,
});
const check = (prompt, choices, answerIndex, correctFeedback, retryFeedback) => ({
  prompt: prompt.length >= 12 ? prompt : `${prompt} 무엇일까요?`,
  choices: choices.map((choice) => choice.length >= 4 ? choice : `${choice} 선택`),
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
  "power-machine-and-rewind": motion(
    "제곱 기계와 제곱근 되감기",
    "입력 3이 제곱 기계를 거쳐 9가 되고, 9에서 가능한 원래 입력 둘을 되감아 표시",
    [
      beat("run-square", "highlight", "입력 3과 제곱 기계", "3²", "9", "거듭제곱은 같은 수를 반복해서 곱하는 정방향 기계입니다."),
      beat("rewind-square", "transform", "출력 9에서 원래 입력 찾기", "x²=9", "x=3 또는 −3", "되감기에서는 같은 제곱을 만드는 양수와 음수를 모두 찾습니다."),
      beat("separate-symbol", "verify", "기호 √9", "√9", "주값 3", "방정식의 두 해와 루트 기호가 고르는 한 값을 분리합니다."),
    ],
    "3을 제곱하면 9입니다. 9를 만든 수는 3과 −3 두 개지만, √9 기호는 그중 0 이상인 3만 뜻합니다.",
    "solving x²=9 returns both square roots, while the radical symbol √9 denotes the principal nonnegative root.",
    check("x²=9의 실수 해는 무엇인가요?", ["3만", "−3만", "3과 −3"], 2, "맞아요. 두 수 모두 제곱하면 9입니다.", "제곱 기계를 3과 −3에 각각 돌려 보세요."),
  ),
  "root-count-by-parity": motion(
    "지수의 홀짝과 음수 밑의 통과 여부",
    "양수·0·음수 출발 카드를 짝수 제곱과 홀수 제곱 기계에 각각 통과",
    [
      beat("compare-even", "group", "짝수 제곱", "(−2)⁴=16, 2⁴=16", "부호가 합쳐짐", "짝수 번 곱하면 음수 부호가 짝을 이루어 양수가 됩니다."),
      beat("compare-odd", "group", "홀수 제곱", "(−2)³=−8, 2³=8", "부호가 남음", "홀수 번 곱하면 음수 부호 하나가 남아 출력 부호가 입력을 구분합니다."),
      beat("count-real-roots", "verify", "xⁿ=a의 실수 해 수", "n 짝수/홀수와 a 부호", "0·1·2개 판정", "그래프가 높이 a와 몇 번 만나는지로 해의 수를 확인합니다."),
    ],
    "짝수 제곱은 +2와 −2를 같은 양수로 보내고, 홀수 제곱은 부호를 보존합니다. 그래서 근의 개수도 지수의 홀짝에 따라 달라집니다.",
    "even powers identify opposite inputs and cannot reach negative outputs over the reals; odd powers are sign-preserving bijections.",
    check("실수에서 x⁴=−16의 해 개수는?", ["0개", "1개", "2개"], 0, "맞아요. 짝수 제곱은 음수가 될 수 없습니다.", "짝수 번 곱한 값의 부호부터 확인하세요."),
  ),
  "principal-root-trap": motion(
    "방정식의 ±와 루트 기호의 주값",
    "√ 기호 앞의 주값 카드와 x²=a를 푸는 ± 카드가 갈라지는 지점을 강조",
    [
      beat("show-radical", "highlight", "√16", "√16", "4", "루트 기호 자체는 0 이상인 주값 하나를 가리킵니다."),
      beat("show-equation", "transform", "x²=16", "x=±√16", "x=±4", "방정식을 풀 때는 같은 제곱을 만드는 두 방향을 ±로 붙입니다."),
      beat("reject-negative-radical", "verify", "√16=−4 주장", "주값 조건 ≥0", "거짓", "−4는 방정식의 해이지만 √16의 값은 아닙니다."),
    ],
    "√16은 4입니다. x²=16을 풀 때만 x=±4가 됩니다. ‘루트 값’과 ‘방정식의 해’를 한 문장에 섞지 마세요.",
    "the radical operator is single-valued by principal-root convention; the ± appears when inverting an even-power equation.",
    check("√25의 값은?", ["5", "−5", "±5"], 0, "맞아요. 루트 기호는 주값 5 하나입니다.", "±는 방정식 x²=25의 해를 쓸 때 붙습니다."),
  ),
  "root-calculation-route": motion(
    "근호 안 완전제곱 묶음과 밖으로 나오는 인수",
    "√72를 √(36·2)로 묶고 6이 근호 밖으로 이동하는 세 칸 계산",
    [
      beat("factor-radicand", "group", "72 안의 가장 큰 완전제곱", "72=36·2", "√(36·2)", "근호 안에서 제곱으로 딱 묶이는 인수를 먼저 찾습니다."),
      beat("split-product", "transform", "√36과 √2", "√36·√2", "6√2", "완전제곱 36만 제곱근을 계산해 밖으로 보냅니다."),
      beat("square-check", "verify", "6√2를 다시 제곱", "(6√2)²", "72", "결과를 제곱해 원래 근호 안 값으로 돌아오는지 확인합니다."),
    ],
    "72를 36×2로 나누면 √36은 6으로 밖에 나오고 √2만 남습니다. 그래서 √72=6√2입니다.",
    "radical simplification extracts maximal perfect-power factors and should be checked by reapplying the original power.",
    check("√72를 간단히 하면?", ["6√2", "8√1", "36√2"], 0, "맞아요. 72=36×2이고 √36=6입니다.", "72 안의 가장 큰 완전제곱을 찾으세요."),
  ),
  "rewind-question-recall": motion(
    "정방향 거듭제곱·역방향 근·주값 표지",
    "한 기계판에서 a→aⁿ, xⁿ=b의 해, ⁿ√b의 주값을 서로 다른 화살표로 복습",
    [
      beat("recall-forward", "highlight", "거듭제곱 정방향", "a→aⁿ", "출력 계산", "반복 곱셈으로 결과를 만듭니다."),
      beat("recall-equation", "transform", "xⁿ=b 되감기", "홀짝·부호 확인", "실수 해 개수", "근을 계산하기 전에 지수의 홀짝과 b의 부호를 봅니다."),
      beat("recall-principal", "verify", "근호 기호", "ⁿ√b", "약속된 주값", "짝수근 기호는 0 이상인 값 하나를 고릅니다."),
    ],
    "거듭제곱은 정방향 계산, 방정식은 가능한 입력 찾기, 근호 기호는 약속된 주값 고르기입니다. 세 질문을 분리하세요.",
    "power evaluation, equation inversion, and principal radical evaluation are related but distinct operations with different output cardinalities.",
    check("짝수근 문제에서 가장 먼저 확인할 두 가지는?", ["지수의 홀짝과 값의 부호", "소수점 자리", "계수의 합"], 0, "맞아요. 실수 해의 존재와 개수가 거기서 결정됩니다.", "음수가 짝수 제곱의 출력이 될 수 있는지 생각하세요."),
  ),

  "exponent-number-line-zoom": motion(
    "정수 지수 사이를 채우는 1/2·1/3 지수",
    "2⁰=1과 2¹=2 사이를 확대하고 √2, ∛2 위치를 지수 눈금과 연결",
    [
      beat("place-integers", "group", "지수 0과 1", "2⁰=1, 2¹=2", "양 끝 기준", "먼저 이미 아는 정수 지수 값을 놓습니다."),
      beat("insert-half", "point", "지수 1/2", "2¹ᐟ²=√2", "1과 2 사이", "제곱하면 2가 되는 양수라 두 기준값 사이에 놓입니다."),
      beat("zoom-dense", "verify", "1/3·2/3 눈금", "2ᵖᐟᑫ=ᑫ√(2ᵖ)", "빈칸 없는 지수선", "분모 q는 몇 제곱근인지, 분자 p는 몇 제곱인지 알려 줍니다."),
    ],
    "정수 지수 사이에도 값이 있습니다. 2의 1/2제곱은 √2이고, p/q제곱은 q제곱근을 취한 뒤 p제곱한 값입니다.",
    "rational exponents interpolate the exponent line by defining a^(p/q) as the principal qth root of a^p under domain constraints.",
    check("2¹ᐟ²과 같은 값은?", ["√2", "2/1", "2²"], 0, "맞아요. 1/2 지수는 제곱근입니다.", "분모 2는 두 번 제곱해 돌아오는 근을 뜻합니다."),
  ),
  "fractional-exponent-meaning": motion(
    "분모는 근의 차수, 분자는 거듭제곱 횟수",
    "8²ᐟ³을 ∛8→제곱과 8²→세제곱근 두 경로로 계산해 같은 값에 도착",
    [
      beat("read-denominator", "highlight", "지수 2/3의 분모 3", "세제곱근", "∛8=2", "분모는 되감아야 할 거듭제곱의 차수입니다."),
      beat("read-numerator", "transform", "분자 2", "(∛8)²", "2²=4", "분자는 근을 구한 값에 적용할 거듭제곱 횟수입니다."),
      beat("compare-route", "verify", "다른 계산 순서", "∛(8²)=∛64", "4 일치", "정의역이 허용되면 두 경로가 같은 값인지 검산할 수 있습니다."),
    ],
    "8의 2/3제곱에서 3은 세제곱근, 2는 제곱입니다. ∛8=2를 먼저 구해 제곱하면 4입니다.",
    "the denominator selects root degree and the numerator selects power; equivalent routes require the real-domain hypotheses to hold.",
    check("27²ᐟ³의 값은?", ["6", "9", "18"], 1, "맞아요. ∛27=3이고 3²=9입니다.", "분모 3부터 세제곱근으로 읽으세요."),
  ),
  "negative-base-extension-trap": motion(
    "음수 밑과 유리 지수 분모의 홀짝",
    "(−8)¹ᐟ³과 (−8)¹ᐟ²를 각각 세제곱근·제곱근 문으로 보내 통과 여부 비교",
    [
      beat("odd-root-door", "group", "(−8)¹ᐟ³", "∛(−8)", "−2", "홀수 제곱은 음수에 도달하므로 홀수근은 실수에서 통과합니다."),
      beat("even-root-door", "group", "(−8)¹ᐟ²", "√(−8)", "실수 아님", "짝수 제곱은 음수가 될 수 없어 실수 제곱근 문이 닫힙니다."),
      beat("reject-rule-only", "verify", "지수법칙 무조건 적용", "밑<0에서 분모 짝수", "정의역 먼저", "기호 계산 전에 해당 유리 지수가 실수로 정의되는지 확인합니다."),
    ],
    "음수의 홀수근은 실수지만 짝수근은 실수가 아닙니다. 음수 밑에서는 유리 지수의 분모가 어떤 근을 요구하는지 먼저 보세요.",
    "negative real bases admit reduced rational exponents only when the denominator is odd; formal exponent laws cannot override domain.",
    check("실수 범위에서 (−8)¹ᐟ³은?", ["−2", "2", "정의되지 않음"], 0, "맞아요. (−2)³=−8입니다.", "세제곱은 음수 출력도 만들 수 있습니다."),
  ),
  "fractional-exponent-conversion": motion(
    "근호 표현과 유리 지수 표현의 양방향 번역",
    "⁴√(x³)와 x³ᐟ⁴ 사이에서 분자·분모 이름표를 교환 없이 이동",
    [
      beat("label-radical", "highlight", "근의 차수 4와 거듭제곱 3", "⁴√(x³)", "분모 4·분자 3", "근호 왼쪽 숫자는 지수의 분모로 갑니다."),
      beat("write-exponent", "transform", "분자와 분모 자리", "x³ᐟ⁴", "같은 표현", "근호 안의 거듭제곱 3은 분자에 남습니다."),
      beat("round-trip", "verify", "x³ᐟ⁴를 근호로 복원", "⁴√(x³)", "자리 일치", "왕복 번역해 숫자 3과 4가 뒤바뀌지 않았는지 확인합니다."),
    ],
    "⁴√(x³)은 x의 3/4제곱입니다. 근의 차수 4가 분모, 안쪽 제곱 3이 분자입니다.",
    "radical-index and inner-power annotations map directly to denominator and numerator of the reduced rational exponent.",
    check("⁵√(a²)를 유리 지수로 쓰면?", ["a⁵ᐟ²", "a²ᐟ⁵", "a⁷"], 1, "맞아요. 근의 차수 5가 분모입니다.", "근호 왼쪽 숫자를 분모로 옮기세요."),
  ),
  "dense-exponent-line-recall": motion(
    "정수 사이 유리 지수·근호 번역·정의역 문",
    "지수선 위에 0, 1/3, 1/2, 2/3, 1을 놓고 각 눈금의 근호 카드 연결",
    [
      beat("recall-fractions", "group", "0과 1 사이 유리 지수", "1/3,1/2,2/3", "촘촘한 눈금", "정수 사이에도 유리 지수가 계속 들어갑니다."),
      beat("recall-translation", "transform", "p/q 눈금", "ᑫ√(aᵖ)", "근호 카드", "분모는 근의 차수, 분자는 제곱 횟수입니다."),
      beat("recall-domain", "verify", "밑의 부호와 q의 홀짝", "실수 정의 여부", "계산 전 통과 검사", "특히 음수 밑에서는 먼저 실수 범위를 확인합니다."),
    ],
    "유리 지수는 정수 사이를 채우고 근호와 같은 뜻을 가집니다. 다만 음수 밑에서는 분모의 홀짝을 확인해야 합니다.",
    "dense rational indexing extends exponentiation while preserving laws only on domains where the corresponding roots are real and coherent.",
    check("aᵖᐟᑫ에서 q가 뜻하는 것은?", ["근의 차수", "밑의 값", "결과의 부호"], 0, "맞아요. q제곱근을 뜻합니다.", "p/q를 근호 표현으로 다시 바꿔 보세요."),
  ),

  "factor-ledger": motion(
    "같은 밑의 인수 개수를 기록하는 지수 장부",
    "a³·a²의 a 인수 다섯 개를 펼친 뒤 지수 3+2로 다시 접기",
    [
      beat("expand-factors", "group", "a³와 a²의 인수", "aaa · aa", "a 다섯 개", "지수는 같은 인수가 몇 개 곱해졌는지 적은 장부입니다."),
      beat("combine-ledger", "transform", "곱셈으로 이어진 같은 밑", "3+2", "a⁵", "인수 묶음을 합치므로 개수인 지수를 더합니다."),
      beat("reject-base-add", "verify", "a³+a²", "덧셈은 인수 연결 아님", "지수 합치기 불가", "항의 덧셈과 인수의 곱셈을 연산 기호로 구분합니다."),
    ],
    "a³·a²는 a가 세 개, 두 개 이어져 모두 다섯 개이므로 a⁵입니다. 더하기 a³+a²에는 같은 규칙을 쓰지 않습니다.",
    "exponent addition records concatenation of equal-base factor multisets under multiplication, not addition of terms.",
    check("a³·a⁴는?", ["a⁷", "a¹²", "2a⁷"], 0, "맞아요. 같은 밑의 인수 개수 3과 4를 더합니다.", "실제로 a를 몇 개 곱하는지 펼쳐 보세요."),
  ),
  "operation-diagnosis": motion(
    "곱셈·나눗셈·거듭제곱마다 다른 장부 동사",
    "같은 밑 블록을 합치기·지우기·묶음 반복의 세 레일로 분리",
    [
      beat("multiply-add", "highlight", "aᵐ·aⁿ", "m+n", "인수 합치기", "곱셈은 두 인수 목록을 이어 붙입니다."),
      beat("divide-subtract", "transform", "aᵐ/aⁿ", "m−n", "공통 인수 지우기", "나눗셈은 분자와 분모의 같은 인수를 짝지어 지웁니다."),
      beat("power-multiply", "verify", "(aᵐ)ⁿ", "mn", "m개 묶음을 n번", "거듭제곱은 같은 묶음을 반복하므로 개수를 곱합니다."),
    ],
    "곱하면 지수를 더하고, 나누면 빼고, 거듭제곱을 다시 거듭제곱하면 곱합니다. 연산 기호가 장부 동사를 정합니다.",
    "equal-base multiplication concatenates, division cancels, and power iteration repeats factor blocks; their exponent operations differ accordingly.",
    check("(a³)⁴의 지수는?", ["7", "12", "1"], 1, "맞아요. a 세 개 묶음을 네 번 반복해 12개입니다.", "3개짜리 묶음이 몇 번 있는지 세어 보세요."),
  ),
  "sum-power-trap": motion(
    "(a+b)²에서 생기는 교차항 2ab",
    "a+b 두 칸을 가로·세로로 놓은 넓이판에서 a²·ab·ab·b² 네 조각 표시",
    [
      beat("build-square", "group", "한 변 a+b인 정사각형", "(a+b)(a+b)", "2×2 넓이판", "두 괄호의 모든 항이 서로 한 번씩 곱해집니다."),
      beat("highlight-cross", "highlight", "두 개의 ab 직사각형", "ab+ab", "2ab", "가운데 교차항은 같은 넓이 조각이 두 개라 사라지지 않습니다."),
      beat("compare-false-rule", "verify", "a²+b²만 쓴 식", "(a+b)²", "a²+2ab+b²", "합의 거듭제곱에는 지수법칙을 항별로 분배하지 않습니다."),
    ],
    "(a+b)²은 a²+b²가 아닙니다. 넓이판에는 a², b² 사이에 ab 조각이 두 개 있어서 2ab가 반드시 생깁니다.",
    "power does not distribute over addition; the cross terms arise from Cartesian multiplication of binomial terms.",
    check("(a+b)²의 가운데 항은?", ["ab", "2ab", "없음"], 1, "맞아요. ab 넓이 조각이 두 개입니다.", "두 괄호를 표로 펼쳐 ab가 몇 번 나오는지 세세요."),
  ),
  "exponent-law-layered-solution": motion(
    "복합 지수식의 바깥층부터 붙이는 연산 이름표",
    "(a²b⁻¹)³·a⁻⁴를 괄호 거듭제곱→같은 밑 곱셈→양의 지수 순으로 정리",
    [
      beat("apply-outer-power", "highlight", "괄호 전체의 3제곱", "a⁶b⁻³", "지수에 ×3", "괄호 안 각 인수 묶음이 세 번 반복됩니다."),
      beat("combine-a", "transform", "a⁶·a⁻⁴", "a⁶⁺⁽⁻⁴⁾", "a²", "같은 밑의 곱셈이므로 지수 장부를 더합니다."),
      beat("remove-negative", "verify", "a²b⁻³", "a²/b³", "양의 지수 표현", "음의 지수는 해당 인수를 분모로 옮긴 역수 뜻입니다."),
    ],
    "먼저 괄호의 3제곱을 각 인수에 적용하고, 같은 밑 a끼리 지수를 더합니다. 마지막에 b⁻³을 분모 b³으로 옮깁니다.",
    "layered simplification follows the expression tree: distribute outer power over products, combine equal bases, then normalize negative exponents.",
    check("(a²)³·a⁻⁴를 간단히 하면?", ["a²", "a⁶", "a⁻¹"], 0, "맞아요. 2×3−4=2입니다.", "괄호 거듭제곱을 먼저 6으로 만든 뒤 −4를 더하세요."),
  ),
  "ledger-verbs-recall": motion(
    "곱셈 더하기·나눗셈 빼기·거듭제곱 곱하기",
    "세 연산 카드를 같은 밑 인수 장부와 1:1로 연결하고 합의 제곱 함정은 별도 차단",
    [
      beat("recall-product", "highlight", "같은 밑의 곱", "aᵐaⁿ=aᵐ⁺ⁿ", "장부 합치기", "곱셈 기호일 때만 지수를 더합니다."),
      beat("recall-quotient-power", "transform", "나눗셈과 거듭제곱", "m−n / mn", "지우기 / 반복", "연산마다 인수 목록에 하는 행동을 떠올립니다."),
      beat("recall-boundaries", "verify", "밑≠0·합에 분배 금지", "a⁰, a⁻ⁿ 조건", "정의역 확인", "법칙을 적용하기 전에 밑과 연산 구조가 허용되는지 봅니다."),
    ],
    "지수법칙은 암호표가 아니라 인수 장부입니다. 곱은 합치고, 나눗셈은 지우고, 거듭제곱은 묶음을 반복합니다.",
    "remembering factor-list operations explains the exponent laws and exposes invalid transfers to sums or forbidden zero-base cases.",
    check("같은 밑의 나눗셈 aᵐ/aⁿ에서 지수는?", ["m+n", "m−n", "mn"], 1, "맞아요. 공통 인수를 n개 지우므로 m−n입니다.", "분자와 분모의 같은 a를 짝지어 지워 보세요."),
  ),
};

const shard = JSON.parse(fs.readFileSync(shardPath, "utf8"));
const targetConcepts = new Set(["algebra-01-01", "algebra-01-02", "algebra-01-03"]);
const targetStories = shard.stories.filter((story) => targetConcepts.has(story.conceptId));
const targetSceneIds = new Set(targetStories.flatMap((story) => story.scenes.map((scene) => scene.id)));
const missing = [...targetSceneIds].filter((id) => !specs[id]);
const extra = Object.keys(specs).filter((id) => !targetSceneIds.has(id));
if (missing.length || extra.length) throw new Error(`motion spec 불일치: missing=${missing.join(",")} extra=${extra.join(",")}`);
for (const story of targetStories) for (const scene of story.scenes) scene.motion = specs[scene.id];
fs.writeFileSync(shardPath, `${JSON.stringify(shard, null, 2)}\n`);
console.log(`Authored algebra power/exponent motion: ${targetStories.length} stories / ${targetSceneIds.size} scenes`);
