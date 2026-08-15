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
  return {
    prompt: prompt.length >= 12 ? prompt : `${prompt} 다음 중 고르세요.`,
    choices: choices.map((choice) => String(choice).length >= 4 ? choice : `${choice}입니다`),
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
  "objective-guest-list": motion(
    "입장 기준 문을 통과하는 대상과 통과하지 못하는 대상",
    "‘짝수인 자연수’라는 판정문을 세우고 2·3·4 카드를 한 장씩 통과시키기",
    [
      beat("show-rule-door", "highlight", "짝수인 자연수라는 입장 기준", "x는 2의 배수", "예/아니오 판정 가능", "누가 판정해도 같은 답이 나오는 문만 집합의 입구가 됩니다."),
      beat("sort-members", "group", "2·3·4 카드", "2∈A, 3∉A, 4∈A", "A={2,4,…}", "각 대상은 입구를 통과하거나 밖에 남는 두 상태 중 하나입니다."),
      beat("reject-vague-rule", "verify", "‘멋진 수’라는 흐린 기준", "사람마다 결과가 다름", "집합 판정 불가", "좋다·예쁘다처럼 판단자가 바뀌면 달라지는 말은 기준이 될 수 없습니다."),
    ],
    "집합은 여러 대상을 그냥 모은 것이 아니라, 들어오는 기준이 분명한 모임입니다. 대상 하나를 보여 줬을 때 누구나 예 또는 아니오로 답할 수 있어야 합니다.",
    "membership predicate가 well-defined여야 characteristic function이 0 또는 1을 유일하게 냅니다. 표기보다 판정 함수가 먼저입니다.",
    check("다음 중 집합을 만드는 분명한 기준은 무엇인가요?", ["키가 큰 학생", "우리 반 학생", "예쁜 숫자"], 1, "맞아요. 명단이 정해져 있어 누구나 같은 판정을 합니다.", "‘크다’와 ‘예쁘다’는 기준이 더 필요합니다. 소속이 객관적으로 정해지는 말을 고르세요."),
  ),
  "membership-question": motion(
    "원소나열법과 조건제시법 사이의 양방향 변환",
    "U={1,2,3,4,5,6}에서 짝수 카드를 골라 두 표현을 같은 상자에 겹치기",
    [
      beat("filter-universe", "group", "전체집합 U의 여섯 카드", "x∈U, x는 짝수", "2·4·6 선택", "조건은 전체 범위 안에서 통과할 원소를 고르는 필터입니다."),
      beat("write-roster", "transform", "통과한 카드", "{x∈U | x는 짝수}", "{2,4,6}", "조건을 실제 명단으로 펼치면 빠진 카드와 잘못 든 카드가 보입니다."),
      beat("round-trip", "verify", "명단에서 조건으로 돌아가는 화살표", "{2,4,6}→짝수", "두 표현 동일", "명단의 모든 원소가 조건을 만족하고 조건을 만족하는 모든 대상이 명단에 있어야 합니다."),
    ],
    "전체 범위를 먼저 놓고 조건을 통과한 카드만 모으세요. 모인 카드를 중괄호에 적으면 원소나열법이고, 통과 규칙을 적으면 조건제시법입니다.",
    "set-builder와 roster 표현의 동치는 양방향 포함입니다. domain을 생략하면 같은 predicate라도 집합이 달라질 수 있습니다.",
    check("U={1,2,3,4,5,6}에서 짝수의 집합은?", ["{1,3,5}", "{2,4,6}", "{2,3,6}"], 1, "맞아요. 조건을 통과하는 카드는 2, 4, 6입니다.", "각 카드를 2로 나누어 나머지가 0인지 확인하세요."),
  ),
  "braces-do-not-decide": motion(
    "중괄호 모양과 실제 판정 기준의 분리",
    "{맛있는 음식} 표지에서 중괄호를 떼고 사람마다 달라지는 카드 배치를 보여 주기",
    [
      beat("show-braces", "highlight", "{맛있는 음식}이라는 표지", "중괄호 존재", "집합 보장 아님", "기호를 붙였다는 사실은 원소 판정을 객관적으로 만들지 못합니다."),
      beat("compare-judges", "group", "두 사람이 고른 음식 카드", "A는 김치 포함 / B는 제외", "판정 불일치", "같은 대상이 사람에 따라 들어갔다 나가면 하나의 집합이 아닙니다."),
      beat("repair-rule", "transform", "‘매점에서 오늘 판매하는 음식’", "판매 목록 확인", "객관적 집합", "확인 가능한 조건으로 바꾸면 중괄호 안의 모임이 분명해집니다."),
    ],
    "중괄호는 이미 정해진 집합을 적는 표지일 뿐입니다. 먼저 대상이 들어가는지 누구나 같은 답을 하는지 확인하세요.",
    "syntax does not create extensional identity. A vague predicate must be operationalized before set notation has mathematical meaning.",
    check("{좋은 책}이 바로 집합이라고 할 수 없는 이유는?", ["중괄호가 작아서", "좋다는 판정이 사람마다 달라서", "책이 너무 많아서"], 1, "맞아요. 원소 여부가 객관적으로 정해지지 않습니다.", "모임의 크기가 아니라 원소 판정이 한 가지인지 보세요."),
  ),
  "representation-check": motion(
    "조건·범위·명단을 차례로 검산하는 체크 레일",
    "10 이하 자연수 중 3의 배수를 조건에서 명단으로 펼친 뒤 다시 조건에 넣기",
    [
      beat("lock-domain", "highlight", "10 이하 자연수라는 범위", "U={1,…,10}", "후보 10개", "범위를 먼저 잠가야 0이나 음수 같은 다른 대상을 잘못 넣지 않습니다."),
      beat("apply-condition", "group", "3으로 나누어떨어지는 카드", "3·6·9", "A={3,6,9}", "후보를 한 장씩 검사해 통과한 카드만 남깁니다."),
      beat("audit-both-ways", "verify", "조건과 명단 양쪽 화살표", "명단⊆조건 / 조건⊆명단", "누락·초과 없음", "적힌 카드는 모두 조건을 만족하고, 만족하는 카드는 하나도 빠지지 않아야 합니다."),
    ],
    "범위를 정하고, 조건으로 카드를 걸러 명단을 적습니다. 마지막에는 적힌 카드가 모두 맞는지와 빠진 카드가 없는지를 따로 확인하세요.",
    "representation equality is proved by two inclusions: soundness of listed elements and completeness against the predicate domain.",
    check("10 이하 자연수 중 3의 배수 집합은?", ["{0,3,6,9}", "{3,6,9}", "{3,6,9,12}"], 1, "맞아요. 범위가 자연수 1부터 10까지이므로 3, 6, 9입니다.", "조건뿐 아니라 ‘10 이하 자연수’ 범위도 함께 확인하세요."),
  ),
  "set-recall": motion(
    "기준 문·원소 기호·두 표현의 한 화면 회상",
    "예/아니오 문에서 ∈·∉을 붙이고 조건 표현과 명단 표현을 왕복시키기",
    [
      beat("recall-predicate", "highlight", "객관적 판정문", "대상→예/아니오", "집합의 입구", "집합인지 판단할 때 표기보다 기준을 먼저 봅니다."),
      beat("recall-membership", "point", "통과·탈락 카드", "a∈A / b∉A", "원소 관계", "카드 하나와 집합 사이에는 원소 기호를 사용합니다."),
      beat("recall-representation", "verify", "조건↔명단 왕복", "{x|P(x)}↔{a,b,…}", "범위·누락 검산", "두 표현이 같은 원소를 빠짐없이 가리키는지 확인합니다."),
    ],
    "집합은 객관적인 입장 기준에서 시작합니다. 카드 하나가 들어가면 ∈, 들어가지 않으면 ∉입니다. 조건과 명단은 같은 카드를 가리켜야 합니다.",
    "predicate, membership relation, and extensional representation form one contract: a set is determined solely by its elements.",
    check("집합 A에 원소 3이 들어간다는 표기는?", ["3∈A", "3⊂A", "A∈3"], 0, "맞아요. 원소 하나와 집합 사이에는 ∈를 씁니다.", "⊂는 집합과 집합 사이의 포함 관계입니다."),
  ),

  "nested-boxes": motion(
    "작은 집합 A가 큰 집합 B 안에 완전히 들어간 모습",
    "A={1,2} 상자를 B={1,2,3} 안에 넣고 모든 카드의 대응 위치를 켜기",
    [
      beat("place-small-box", "group", "A의 1·2 카드", "A={1,2}", "두 카드 모두 B에도 있음", "부분집합은 작은 상자의 카드가 하나도 밖으로 새지 않는 관계입니다."),
      beat("draw-inclusion", "point", "A에서 B로 향하는 포함 화살표", "A⊆B", "A는 B의 부분집합", "집합 전체가 들어가는 관계라 원소 기호와 다른 포함 기호를 씁니다."),
      beat("show-equal-allowed", "verify", "A와 같은 상자 A", "A⊆A", "자기 자신도 부분집합", "부분집합은 반드시 더 작아야 하는 관계가 아닙니다."),
    ],
    "A의 원소를 하나씩 꺼내 B에서 찾았을 때 모두 있으면 A는 B의 부분집합입니다. 같은 집합도 자기 자신의 부분집합입니다.",
    "A⊆B means ∀x(x∈A⇒x∈B). Proper size is not part of subsethood; equality is permitted.",
    check("A={1,2}, B={1,2,3}일 때 옳은 관계는?", ["A⊆B", "3∈A", "B⊆A"], 0, "맞아요. A의 모든 원소가 B 안에 있습니다.", "A의 1과 2를 B에서 하나씩 찾아보세요."),
  ),
  "divisor-box-question": motion(
    "4의 약수 상자와 8의 약수 상자의 포함 방향",
    "{1,2,4} 카드를 {1,2,4,8} 위에 겹쳐 작은 상자의 누락 여부를 검사",
    [
      beat("build-divisor-four", "group", "4의 양의 약수", "A={1,2,4}", "카드 3장", "약수 조건을 실제 카드로 펼칩니다."),
      beat("build-divisor-eight", "group", "8의 양의 약수", "B={1,2,4,8}", "A 카드 전부 포함", "B에는 A의 카드와 추가 카드 8이 있습니다."),
      beat("decide-direction", "verify", "작은 상자 A에서 큰 상자 B", "A⊆B, A≠B", "진부분집합", "반대 방향은 8이 A에 없어 즉시 깨집니다."),
    ],
    "4의 약수는 1, 2, 4이고 8의 약수는 1, 2, 4, 8입니다. A의 카드는 전부 B에서 찾지만 B의 8은 A에 없습니다.",
    "counterexample 8 disproves B⊆A, while exhaustive membership verifies A⊆B. Thus A is a proper subset of B.",
    check("4의 약수 집합 A와 8의 약수 집합 B의 관계는?", ["A⊆B", "B⊆A", "A=B"], 0, "맞아요. 1, 2, 4가 모두 B에 있고 B에만 8이 더 있습니다.", "두 약수 명단을 직접 나란히 적어 포함 방향을 확인하세요."),
  ),
  "element-versus-subset": motion(
    "숫자 카드 하나와 작은 카드 상자의 서로 다른 입장 방식",
    "2는 A의 안쪽 점에 놓고 {2}는 A 안의 작은 원으로 놓아 기호를 분리",
    [
      beat("place-element", "point", "숫자 2 카드", "2∈A", "원소 관계", "대상 하나가 집합 안에 들어가면 ∈를 씁니다."),
      beat("place-singleton", "group", "집합 {2} 상자", "{2}⊆A", "부분집합 관계", "원소 하나를 담은 집합은 집합 전체로 A 안에 포개집니다."),
      beat("block-symbol-swap", "verify", "2⊆A와 {2}∈A", "관계 종류 불일치", "일반적으로 거짓", "카드인지 상자인지 먼저 확인하면 기호를 바꾸는 실수를 막습니다."),
    ],
    "숫자 2는 카드 하나라 2∈A입니다. {2}는 상자라 {2}⊆A입니다. 중괄호 하나가 관계의 종류를 바꿉니다.",
    "membership relates an object to a set; inclusion relates two sets. Singleton formation lifts an element into the power-set level.",
    check("A={1,2,3}일 때 옳은 표기는?", ["2⊆A", "{2}⊆A", "{2}∈A"], 1, "맞아요. {2}는 집합이고 그 원소 2가 A에 들어 있습니다.", "2와 {2}를 구분하세요. 중괄호가 있으면 작은 집합입니다."),
  ),
  "two-way-equality": motion(
    "A⊆B와 B⊆A 두 화살표가 만나 등호가 되는 흐름",
    "임의의 원소 x를 양쪽 방향으로 옮기고 남는 카드가 없는지 확인",
    [
      beat("prove-a-to-b", "highlight", "x∈A인 임의의 카드", "x∈A⇒x∈B", "A⊆B", "A에서 어떤 카드를 집어도 B에서 찾을 수 있음을 보입니다."),
      beat("prove-b-to-a", "highlight", "y∈B인 임의의 카드", "y∈B⇒y∈A", "B⊆A", "반대 방향도 따로 증명해야 B에 추가 카드가 없음을 알 수 있습니다."),
      beat("merge-arrows", "verify", "서로 마주 보는 두 포함 화살표", "A⊆B and B⊆A", "A=B", "두 집합이 정확히 같은 원소만 가지므로 하나의 상자로 겹칩니다."),
    ],
    "집합이 같다는 말은 양쪽에서 빠지거나 더한 원소가 없다는 뜻입니다. A의 원소를 B로, B의 원소를 A로 각각 옮기는 두 증명이 필요합니다.",
    "extensional equality is antisymmetry of inclusion. Each inclusion is a universally quantified implication and cannot replace the other.",
    check("두 집합 A와 B가 같음을 증명하는 조건은?", ["A⊆B만 확인", "B⊆A만 확인", "A⊆B와 B⊆A 모두 확인"], 2, "맞아요. 두 방향의 포함이 모두 성립해야 합니다.", "한 방향만으로는 큰 집합에 추가 원소가 있는지 알 수 없습니다."),
  ),
  "inclusion-recall": motion(
    "임의 원소 이동과 반례 카드 한 장의 빠른 판정",
    "A의 카드를 B에서 찾고 실패 카드가 나오면 포함 화살표를 즉시 끊기",
    [
      beat("recall-all-members", "group", "A의 모든 원소", "x∈A⇒x∈B", "모두 찾으면 A⊆B", "부분집합은 A의 전체 카드를 검사하는 주장입니다."),
      beat("recall-counterexample", "point", "A에는 있지만 B에는 없는 카드", "x∈A and x∉B", "A⊆B 거짓", "카드 하나만 밖에 나와도 전체 포함 관계가 깨집니다."),
      beat("recall-equality", "verify", "반대 포함 화살표", "A⊆B, B⊆A", "A=B", "같음을 말하려면 두 화살표를 모두 닫습니다."),
    ],
    "A의 모든 카드를 B에서 찾으면 A⊆B입니다. 하나라도 못 찾으면 그 카드가 반례입니다. 같은 집합은 이 검사를 양쪽으로 통과합니다.",
    "universal inclusion is certified exhaustively or deductively; a single witness to A∖B refutes it. Equality adds the reverse inclusion.",
    check("A⊆B를 가장 빠르게 깨는 것은?", ["A와 B의 공통 원소", "A에만 있는 원소 하나", "B에만 있는 원소 하나"], 1, "맞아요. A의 원소가 B에 없으면 포함은 즉시 거짓입니다.", "포함 화살표는 A에서 B 방향입니다. 출발 집합에서 빠져나온 카드를 찾으세요."),
  ),

  "overlapping-spotlights": motion(
    "두 원 A·B가 만드는 왼쪽·겹침·오른쪽 영역",
    "합집합은 두 원 전체, 교집합은 가운데 렌즈만 차례로 색칠",
    [
      beat("shade-union", "group", "A 또는 B에 속하는 모든 영역", "A∪B", "두 원 전체", "‘또는’은 어느 한 조명이라도 닿는 곳을 모두 켭니다."),
      beat("shade-intersection", "highlight", "A와 B가 동시에 닿는 렌즈", "A∩B", "가운데 겹침", "‘그리고’는 두 조건을 동시에 통과한 좁은 영역만 남깁니다."),
      beat("compare-width", "verify", "교집합과 합집합의 포함", "A∩B⊆A∪B", "겹침은 항상 전체 조명 안", "색칠 범위를 비교해 기호를 뒤바꾼 실수를 확인합니다."),
    ],
    "합집합은 A 또는 B 중 하나라도 들어가는 두 원 전체입니다. 교집합은 A와 B를 동시에 만족하는 가운데 겹침입니다.",
    "union implements logical disjunction and intersection conjunction. Their Venn regions expose the lattice order A∩B⊆A⊆A∪B.",
    check("A와 B에 동시에 속하는 영역은?", ["A∪B", "A∩B", "A의 여집합"], 1, "맞아요. 두 조건을 동시에 만족하는 교집합입니다.", "‘동시에’는 그리고에 해당하므로 겹친 가운데만 보세요."),
  ),
  "numbers-under-ten": motion(
    "10 이하 자연수 카드의 짝수·3의 배수 이중 필터",
    "2·4·6·8·10과 3·6·9를 서로 다른 색으로 걸러 결과 영역에 배치",
    [
      beat("filter-even", "group", "짝수 카드", "A={2,4,6,8,10}", "파란 원", "2로 나누어떨어지는 수를 첫 조명에 넣습니다."),
      beat("filter-multiple-three", "group", "3의 배수 카드", "B={3,6,9}", "주황 원", "3으로 나누어떨어지는 수를 둘째 조명에 넣습니다."),
      beat("read-results", "verify", "두 필터의 겹침과 전체", "A∩B={6}, A∪B={2,3,4,6,8,9,10}", "교집합 1개", "6은 두 필터를 모두 통과하므로 가운데에 한 번만 적습니다."),
    ],
    "10 이하 카드에서 짝수와 3의 배수를 따로 고릅니다. 6은 두 조건을 모두 만족해 가운데에 놓이고, 합집합에는 중복 없이 한 번만 들어갑니다.",
    "finite-set operations are predicate filters. Intersection applies both divisibility predicates; union deduplicates elements satisfying either.",
    check("10 이하 자연수에서 짝수이면서 3의 배수인 수는?", ["3", "6", "9"], 1, "맞아요. 6은 2와 3으로 모두 나누어떨어집니다.", "‘이면서’이므로 두 필터를 동시에 통과하는 수를 찾으세요."),
  ),
  "demorgan-switch": motion(
    "합집합 바깥과 두 여집합의 겹침을 같은 색으로 포개기",
    "괄호 밖 부정을 안으로 보내며 ∪를 ∩로 뒤집고 각 집합에 부정 표시",
    [
      beat("shade-outside-union", "highlight", "A∪B의 바깥", "(A∪B)ᶜ", "두 원 모두 아닌 곳", "두 조명 중 어느 것도 닿지 않는 바깥만 남깁니다."),
      beat("negate-each-set", "group", "A가 아닌 곳과 B가 아닌 곳", "Aᶜ and Bᶜ", "두 바깥의 겹침", "둘 다 아닌 곳이어야 하므로 안쪽 연결은 교집합입니다."),
      beat("match-regions", "verify", "두 색칠 결과", "(A∪B)ᶜ=Aᶜ∩Bᶜ", "영역 완전 일치", "부정이 괄호를 통과할 때 각 조건을 뒤집고 문도 바뀝니다."),
    ],
    "A 또는 B의 부정은 A도 아니고 B도 아닌 곳입니다. 그래서 합집합 기호는 교집합으로 바뀌고 두 집합 모두 여집합이 됩니다.",
    "De Morgan duality follows ¬(P∨Q)=¬P∧¬Q and ¬(P∧Q)=¬P∨¬Q. Complement reverses inclusion and swaps lattice operations.",
    check("(A∪B)ᶜ와 같은 것은?", ["Aᶜ∪Bᶜ", "Aᶜ∩Bᶜ", "A∩B"], 1, "맞아요. 둘 다 아닌 곳이므로 두 여집합의 교집합입니다.", "‘A 또는 B가 아니다’를 ‘A도 아니고 B도 아니다’로 말해 보세요."),
  ),
  "shade-from-outside": motion(
    "복합식의 바깥 연산부터 안쪽으로 들어가는 색칠 순서",
    "(A∪Bᶜ)∩C를 B 여집합→합집합→C와 겹침 세 층으로 색칠",
    [
      beat("shade-inner-complement", "highlight", "B 바깥", "Bᶜ", "전체에서 B만 제외", "가장 안쪽의 부정을 먼저 눈에 보이는 영역으로 바꿉니다."),
      beat("combine-with-a", "group", "A와 Bᶜ", "A∪Bᶜ", "둘 중 하나인 넓은 영역", "괄호 안의 또는를 두 영역 전체로 합칩니다."),
      beat("clip-with-c", "verify", "앞 결과와 C의 겹침", "(A∪Bᶜ)∩C", "C 안의 해당 부분만", "마지막 교집합은 이미 칠한 결과를 C라는 틀로 잘라냅니다."),
    ],
    "복잡한 식은 한 번에 칠하지 않습니다. 가장 안쪽 여집합을 만들고, 괄호의 합집합을 합친 뒤, 마지막에 C와 겹치는 부분만 남기세요.",
    "evaluate set expressions as an abstract syntax tree. Each complement/union/intersection produces an intermediate region, preventing precedence errors.",
    check("복합 집합 영역을 안전하게 색칠하는 순서는?", ["바깥 기호를 무시", "안쪽 연산부터 중간 영역을 만들기", "아무 영역부터 칠하기"], 1, "맞아요. 안쪽 결과를 만든 뒤 바깥 연산을 적용합니다.", "괄호가 계산 순서를 정한다는 점을 집합 색칠에도 그대로 적용하세요."),
  ),
  "logic-lights-recall": motion(
    "또는·그리고·아닌 세 스위치와 벤다이어그램",
    "∪는 두 원을 켜고 ∩는 가운데만 켜고 ᶜ는 색을 반전",
    [
      beat("recall-or", "group", "또는 스위치", "A∪B", "두 원 전체", "한 조건이라도 맞으면 켜집니다."),
      beat("recall-and", "highlight", "그리고 스위치", "A∩B", "겹친 가운데", "두 조건이 동시에 맞는 곳만 켜집니다."),
      beat("recall-not", "transform", "아닌 스위치", "Aᶜ", "A 안팎 반전", "부정이 괄호 안으로 들어가면 각 색이 뒤집히고 ∪와 ∩도 서로 바뀝니다."),
    ],
    "또는은 넓히고, 그리고는 겹치고, 아닌은 안과 밖을 뒤집습니다. 문장을 이 세 단어로 번역한 뒤 색칠하면 기호를 외우지 않아도 됩니다.",
    "Boolean operations and set operations are isomorphic under truth sets. Venn shading is a spatial truth table.",
    check("집합 연산에서 ‘또는’에 해당하는 기호는?", ["∪ 합집합", "∩ 교집합", "ᶜ 여집합"], 0, "맞아요. 둘 중 하나라도 속하면 합집합입니다.", "‘또는’은 영역을 넓혀 두 원 전체를 켭니다."),
  ),

  "truth-switchboard": motion(
    "참·거짓 두 칸만 가진 판정판과 판정 불가능 문장",
    "‘2+3=5’와 ‘x+1=3’을 맥락 없이 넣어 스위치 상태를 비교",
    [
      beat("judge-closed-sentence", "highlight", "2+3=5", "계산 가능", "참", "대상과 의미가 정해진 문장은 한 칸에 확실히 놓입니다."),
      beat("show-open-condition", "point", "x+1=3", "x가 정해지지 않음", "조건", "x에 따라 참과 거짓이 바뀌어 아직 하나의 명제가 아닙니다."),
      beat("bind-variable", "transform", "x=2를 대입", "2+1=3", "참으로 판정", "대상을 정하거나 양화하면 조건이 판정 가능한 명제가 됩니다."),
    ],
    "명제는 참 또는 거짓을 한 가지로 판정할 수 있는 문장입니다. x가 정해지지 않은 식은 조건이고, x의 범위나 값을 정해야 판정할 수 있습니다.",
    "a proposition has a context-fixed truth value. An open formula becomes a proposition only after assignment or quantification over a domain.",
    check("x의 값이 정해지지 않은 ‘x+1=3’은 무엇인가요?", ["항상 참인 명제", "조건", "항상 거짓인 명제"], 1, "맞아요. x에 따라 판정이 달라지는 조건입니다.", "x=2와 x=1을 각각 넣어 결과가 달라지는지 보세요."),
  ),
  "all-or-some-question": motion(
    "‘모든’ 카드 줄과 ‘어떤’ 카드 줄의 서로 다른 증거 크기",
    "모든 자연수에 대한 주장에 반례 0을 넣고 존재 주장에는 증인 2를 켜기",
    [
      beat("test-universal", "group", "모든 x에 대한 카드 줄", "∀x P(x)", "전부 통과해야 참", "전체 주장은 후보 하나도 실패하면 안 됩니다."),
      beat("drop-counterexample", "point", "실패 카드 x=0", "P(0)=거짓", "전체 명제 거짓", "반례 하나가 긴 ‘모든’ 줄 전체를 끕니다."),
      beat("show-existence-witness", "highlight", "성립 카드 x=2", "∃x P(x)", "존재 명제 참", "‘어떤’은 조건을 만족하는 증인 하나만 있으면 켜집니다."),
    ],
    "‘모든’은 전부 확인해야 하지만 반례 하나로 깨집니다. ‘어떤’은 조건을 만족하는 예 하나를 찾으면 참입니다.",
    "universal claims require no counterexample; existential claims require one witness. Their proof and refutation burdens are dual.",
    check("‘모든 x에서 P(x)’를 거짓으로 만드는 데 필요한 것은?", ["반례 하나", "성립 예 하나", "모든 값의 계산"], 0, "맞아요. P(x)가 거짓인 x 하나면 충분합니다.", "‘모든’이라는 문에서 한 카드라도 탈락하면 전체가 꺼집니다."),
  ),
  "quantifier-negation": motion(
    "∀ 문을 ∃ 문으로 바꾸고 조건에 부정을 붙이는 변환",
    "‘모든 학생이 제출했다’에서 미제출 학생 카드 한 장을 찾아 부정문 완성",
    [
      beat("show-universal", "group", "모든 학생의 제출 스위치", "∀x 제출(x)", "전부 켜짐 요구", "원래 문장은 한 명도 빠지지 않아야 참입니다."),
      beat("negate-quantifier", "transform", "부정이 ∀를 통과", "¬∀x P(x)=∃x ¬P(x)", "적어도 한 명 미제출", "‘모두 아니다’가 아니라 실패한 대상이 하나 이상 있다는 뜻입니다."),
      beat("identify-witness", "point", "미제출 학생 한 명", "¬P(a)", "부정문 증인", "구체적인 카드 하나가 부정된 존재 명제를 참으로 만듭니다."),
    ],
    "‘모든 학생이 제출했다’의 부정은 ‘모든 학생이 제출하지 않았다’가 아닙니다. 제출하지 않은 학생이 적어도 한 명 있다는 뜻입니다.",
    "quantifier negation swaps ∀ and ∃ while negating the predicate: ¬∀P≡∃¬P and ¬∃P≡∀¬P.",
    check("‘모든 학생이 합격했다’의 부정은?", ["모든 학생이 불합격했다", "불합격한 학생이 적어도 한 명 있다", "합격한 학생이 한 명 있다"], 1, "맞아요. 전체 주장을 깨는 반례가 적어도 한 명 있다는 뜻입니다.", "‘모든’의 부정은 ‘적어도 하나는 아니다’로 바뀝니다."),
  ),
  "truth-set-solution": motion(
    "조건을 만족하는 수직선 영역과 전체집합의 비교",
    "U={−2,−1,0,1,2}에서 x²=1을 만족하는 카드만 진리집합에 넣기",
    [
      beat("evaluate-condition", "group", "U의 다섯 수 카드", "x²=1", "−1·1 통과", "조건을 만족하는 값을 실제로 걸러냅니다."),
      beat("build-truth-set", "highlight", "통과 카드 모임", "T={−1,1}", "진리집합", "조건이 참이 되는 값만 모으면 조건을 집합으로 볼 수 있습니다."),
      beat("judge-quantifiers", "verify", "T와 U의 크기·공집합 여부", "T≠U, T≠∅", "∀는 거짓, ∃는 참", "전체 명제는 T=U인지, 존재 명제는 T가 비었는지로 판정합니다."),
    ],
    "조건을 만족하는 값을 모은 것이 진리집합입니다. 진리집합이 전체집합과 같으면 ‘모든’이 참이고, 비어 있지 않으면 ‘어떤’이 참입니다.",
    "truth-set semantics maps predicates to subsets. Universal truth is T=U; existential truth is T≠∅; implication becomes inclusion.",
    check("U={−2,−1,0,1,2}, x²=1의 진리집합은?", ["{−1,1}", "{0,1}", "U 전체"], 0, "맞아요. 제곱이 1인 값은 −1과 1입니다.", "각 수를 제곱해 1이 되는 카드만 남기세요."),
  ),
  "verdict-recall": motion(
    "명제·조건·모든·어떤을 한 판정판에 연결",
    "열린 조건을 진리집합으로 만들고 반례와 증인 슬롯을 번갈아 켜기",
    [
      beat("recall-proposition", "highlight", "한 가지 진릿값을 가진 문장", "참 또는 거짓", "명제", "대상과 맥락이 고정되어야 판정판에 들어갑니다."),
      beat("recall-universal", "point", "모든 주장과 반례 슬롯", "∀xP(x)", "반례 하나면 거짓", "전체 줄에서 탈락 카드 하나를 찾습니다."),
      beat("recall-existential", "point", "어떤 주장과 증인 슬롯", "∃xP(x)", "증인 하나면 참", "진리집합이 비어 있지 않은지 확인합니다."),
    ],
    "조건은 값을 정하거나 양화해야 명제가 됩니다. 모든 주장은 반례 하나로 깨지고, 어떤 주장은 증인 하나로 살아납니다.",
    "assignment/quantification closes formulas; counterexample and witness are the minimal certificates for universal falsity and existential truth.",
    check("존재 명제가 참임을 보이는 가장 작은 증거는?", ["성립하는 예 하나", "반례 하나", "전체집합과 같음"], 0, "맞아요. 조건을 만족하는 증인 하나면 충분합니다.", "‘어떤’은 적어도 하나가 있다는 주장입니다."),
  ),

  "one-way-arrow": motion(
    "p에서 q로만 열린 일방통행 화살표",
    "‘4의 배수→짝수’ 카드를 보내고 반대편 ‘짝수→4의 배수’에서 6 카드를 막기",
    [
      beat("send-forward", "highlight", "4의 배수 카드", "p⇒q", "항상 짝수", "4k는 2(2k)이므로 앞 방향은 모두 통과합니다."),
      beat("try-return", "point", "짝수 카드 6", "q⇒p?", "6은 4의 배수 아님", "돌아오는 화살표는 새 명제라 별도로 검사해야 합니다."),
      beat("label-directions", "verify", "원래 명제와 역", "p→q / q→p", "진릿값 독립", "한 화살표가 열렸다고 반대 화살표가 자동으로 열리지는 않습니다."),
    ],
    "4의 배수는 항상 짝수지만 짝수가 모두 4의 배수는 아닙니다. 명제의 화살표는 일방통행입니다.",
    "implication is directional inclusion of truth sets P⊆Q. Its converse Q⊆P is an independent claim and may fail.",
    check("‘4의 배수이면 짝수’의 역은?", ["짝수이면 4의 배수", "4의 배수가 아니면 짝수가 아님", "홀수이면 4의 배수가 아님"], 0, "맞아요. 가정과 결론의 방향만 바꾼 문장입니다.", "역은 부정하지 않고 p와 q의 자리만 바꿉니다."),
  ),
  "multiple-of-four": motion(
    "4의 배수·짝수 집합과 원래·역·대우 세 화살표",
    "작은 4의 배수 원을 큰 짝수 원 안에 넣고 화살표마다 반례 여부 표시",
    [
      beat("judge-original", "highlight", "4의 배수 집합⊆짝수 집합", "p⇒q", "참", "작은 원의 모든 수가 큰 원 안에 있습니다."),
      beat("judge-converse", "point", "짝수 6 카드", "q⇒p", "거짓", "6이 큰 원에는 있지만 작은 원에는 없어 역의 반례가 됩니다."),
      beat("judge-contrapositive", "verify", "짝수가 아닌 수→4의 배수가 아님", "¬q⇒¬p", "참", "원래 화살표의 바깥 영역을 뒤집어 걸으면 참이 보존됩니다."),
    ],
    "원래 명제는 참이고, 역은 6 때문에 거짓입니다. 대우는 ‘짝수가 아니면 4의 배수가 아니다’로 원래 명제와 같은 진릿값입니다.",
    "P⊆Q is equivalent to Qᶜ⊆Pᶜ. Converse inclusion is not implied, while contraposition reverses inclusion under complement.",
    check("‘4의 배수이면 짝수’의 대우는?", ["짝수이면 4의 배수", "짝수가 아니면 4의 배수가 아니다", "4의 배수가 아니면 짝수가 아니다"], 1, "맞아요. 방향과 두 조건의 부정을 모두 바꿉니다.", "대우는 q가 아님에서 p가 아님으로 갑니다."),
  ),
  "converse-is-not-equivalent": motion(
    "원래 화살표와 역 화살표 사이의 끊어진 등호",
    "p→q만 증명된 상태에서 q→p에 반례 카드를 넣어 별도 문임을 고정",
    [
      beat("show-proved-arrow", "highlight", "p→q 화살표", "원래 명제 참", "앞 방향만 보장", "증명은 표시된 방향의 통행만 허용합니다."),
      beat("detach-converse", "transform", "q→p 화살표", "방향만 반전", "새로운 명제", "역은 원래 명제와 논리적으로 같은 문장이 아닙니다."),
      beat("counterexample-test", "point", "q이지만 p가 아닌 카드", "q∧¬p", "역 거짓", "큰 진리집합의 바깥 고리에서 역의 반례를 찾습니다."),
    ],
    "역은 원래 문장을 뒤집어 만든 새 문제입니다. 원래 명제를 증명한 내용은 역의 증거가 되지 않습니다.",
    "equivalence requires both P⊆Q and Q⊆P. A witness in Q∖P refutes the converse without affecting the original implication.",
    check("원래 명제가 참일 때 역에 대해 확실히 말할 수 있는 것은?", ["항상 참", "항상 거짓", "별도로 판정해야 함"], 2, "맞아요. 역은 새로운 명제라 반례나 증명이 따로 필요합니다.", "방향만 바뀐 화살표가 자동으로 열리는지 다시 생각하세요."),
  ),
  "label-and-turn": motion(
    "긴 문장에서 가정 p와 결론 q를 분리한 뒤 변환하는 조립판",
    "p·q 이름표를 붙이고 역·이·대우 카드를 방향과 부정 스위치로 만들기",
    [
      beat("label-pq", "group", "가정과 결론", "p: x>2 / q: x²>4", "p→q", "문장을 짧은 두 블록으로 나눠 화살표 방향을 분명히 합니다."),
      beat("build-converse-inverse", "transform", "방향·부정 스위치", "역 q→p / 이 ¬p→¬q", "서로 다른 두 문장", "한 번에 하나의 변화만 적용해 문장을 섞지 않습니다."),
      beat("build-contrapositive", "verify", "방향과 부정 모두", "¬q→¬p", "원래와 동치", "p와 q의 자리와 부정을 모두 바꿨는지 두 체크를 통과시킵니다."),
    ],
    "긴 문장에 p와 q 이름표를 먼저 붙이세요. 역은 자리만, 이는 부정만, 대우는 자리와 부정을 모두 바꿉니다.",
    "syntactic transformation is safest as two independent operations: swap endpoints and negate predicates. Contrapositive applies both.",
    check("p→q의 대우는 무엇인가요?", ["q→p", "¬p→¬q", "¬q→¬p"], 2, "맞아요. 방향을 바꾸고 두 조건을 모두 부정합니다.", "대우는 결론의 부정에서 가정의 부정으로 갑니다."),
  ),
  "arrow-recall": motion(
    "원래·역·대우 화살표의 최소 회상 카드",
    "p→q를 기준으로 q→p와 ¬q→¬p를 겹치고 동치 배지만 남기기",
    [
      beat("recall-original", "highlight", "원래 화살표", "p→q", "기준", "가정에서 결론으로 가는 방향을 먼저 고정합니다."),
      beat("recall-converse", "transform", "역 화살표", "q→p", "별도 판정", "방향만 바뀌므로 원래와 진릿값이 다를 수 있습니다."),
      beat("recall-contrapositive", "verify", "대우 화살표", "¬q→¬p", "원래와 동치", "방향과 부정을 모두 바꾼 대우만 원래와 참·거짓이 같습니다."),
    ],
    "역은 방향만 바꿔 별도 판정하고, 대우는 방향과 부정을 모두 바꿔 원래 명제와 같은 진릿값을 가집니다.",
    "contraposition preserves the implication truth table; converse merely exchanges antecedent and consequent.",
    check("원래 명제와 항상 같은 진릿값을 갖는 것은?", ["역", "대우", "부정하지 않은 결론"], 1, "맞아요. 대우는 원래 명제와 논리적으로 동치입니다.", "방향과 부정을 모두 바꾼 화살표를 찾으세요."),
  ),

  "gate-and-requirement": motion(
    "p 출발표와 q 도착문에 붙은 충분·필요 이름표",
    "p→q 화살표 위에서 꼬리에는 충분, 머리에는 필요 배지를 고정",
    [
      beat("show-guarantee", "highlight", "p 조건", "p이면 q 보장", "p는 q의 충분조건", "p 하나를 만족하면 q에 도착하기에 충분합니다."),
      beat("show-requirement", "point", "q 조건", "p가 성립하려면 q 필요", "q는 p의 필요조건", "p에서 출발한 모든 경우가 q 문을 반드시 지나갑니다."),
      beat("attach-labels", "verify", "화살표 꼬리와 머리", "p --충분→ q / q는 필요", "두 이름 한 화살표", "일상어 느낌보다 화살표의 출발과 도착으로 이름을 정합니다."),
    ],
    "p가 q를 보장하면 p는 충분조건이고 q는 필요조건입니다. 화살표 꼬리에 충분, 머리에 필요를 붙이세요.",
    "P⊆Q makes P sufficient for Q and Q necessary for P. The two labels describe the same inclusion from opposite roles.",
    check("p→q일 때 q는 p의 어떤 조건인가요?", ["필요조건", "충분조건", "관련 없는 조건"], 0, "맞아요. p가 성립하면 q를 반드시 거쳐야 합니다.", "화살표 머리에 도착하는 조건이 필요조건입니다."),
  ),
  "square-rectangle-question": motion(
    "정사각형 집합이 직사각형 집합 안에 들어간 도형 상자",
    "정사각형 카드를 직사각형 상자 안에 넣고 충분·필요 배지를 양쪽에 배치",
    [
      beat("nest-shapes", "group", "정사각형과 직사각형 집합", "Square⊆Rectangle", "정사각형→직사각형", "모든 정사각형은 네 각이 직각인 직사각형입니다."),
      beat("label-sufficient", "highlight", "정사각형 조건", "정사각형이면 직사각형", "충분조건", "정사각형이라는 강한 조건만으로 직사각형을 보장합니다."),
      beat("label-necessary", "point", "직사각형 조건", "정사각형이려면 직사각형이어야 함", "필요조건", "하지만 일반 직사각형이 정사각형일 필요는 없어 역은 성립하지 않습니다."),
    ],
    "정사각형이면 직사각형이므로 정사각형은 충분조건입니다. 정사각형이 되려면 직사각형이어야 하므로 직사각형은 필요조건입니다.",
    "the stronger property has the smaller truth set. Sufficient conditions sit inside necessary conditions under set inclusion.",
    check("정사각형은 직사각형이기 위한 어떤 조건인가요?", ["충분조건", "필요조건만", "필요충분조건"], 0, "맞아요. 정사각형이면 반드시 직사각형입니다.", "작은 정사각형 집합에서 큰 직사각형 집합으로 화살표를 그리세요."),
  ),
  "language-reversal": motion(
    "‘이기 위한’ 문장을 p→q로 번역하는 방향 레일",
    "일상어 문장을 먼저 화살표로 바꾼 뒤 충분·필요 이름을 붙이기",
    [
      beat("erase-intuition", "highlight", "‘반드시’라는 일상어 느낌", "이름 먼저 금지", "화살표부터", "말의 강한 느낌만으로 충분과 필요를 고르면 방향이 뒤집힙니다."),
      beat("write-implication", "transform", "‘p이면 q이다’", "p→q", "논리 방향 고정", "가정과 결론을 찾아 한 방향 화살표로 적습니다."),
      beat("name-endpoints", "verify", "꼬리 p·머리 q", "p 충분 / q 필요", "이름 확정", "이름은 화살표가 완성된 뒤 기계적으로 붙입니다."),
    ],
    "필요와 충분을 바로 고르지 마세요. 먼저 ‘p이면 q’ 화살표를 그리고, 출발에 충분, 도착에 필요를 붙이면 됩니다.",
    "semantic parsing precedes terminology. Converting language to implication eliminates lexical ambiguity in ‘requires’ and ‘guarantees’.",
    check("충분·필요조건을 안전하게 판정하는 첫 단계는?", ["단어 느낌으로 선택", "p→q 화살표 쓰기", "두 조건을 더하기"], 1, "맞아요. 논리 방향을 먼저 고정해야 이름이 뒤집히지 않습니다.", "충분과 필요는 화살표의 꼬리와 머리 이름입니다."),
  ),
  "interval-condition": motion(
    "두 조건의 진리집합을 수직선 안쪽·바깥쪽으로 포개기",
    "p:x>3과 q:x>1 영역을 색칠해 포함 방향과 조건 이름 연결",
    [
      beat("shade-p", "highlight", "x>3 영역", "P=(3,∞)", "안쪽 짙은 선", "더 강한 조건은 만족하는 값이 적어 작은 영역을 만듭니다."),
      beat("shade-q", "group", "x>1 영역", "Q=(1,∞)", "P를 포함하는 큰 선", "x>3인 값은 모두 x>1이므로 P⊆Q입니다."),
      beat("read-conditions", "verify", "P에서 Q로 향하는 포함 화살표", "p→q", "p 충분, q 필요", "수직선의 안쪽 조건이 충분, 바깥 조건이 필요입니다."),
    ],
    "x>3의 영역은 x>1의 영역 안에 들어갑니다. 따라서 x>3은 충분조건이고 x>1은 필요조건입니다.",
    "truth-set inclusion provides a geometric test: stronger/sufficient predicates have smaller sets; weaker/necessary predicates have larger sets.",
    check("p:x>3, q:x>1일 때 옳은 것은?", ["p는 q의 충분조건", "q는 p의 충분조건", "두 조건은 동치"], 0, "맞아요. x>3이면 항상 x>1입니다.", "수직선에서 (3,∞)가 (1,∞) 안에 들어가는지 보세요."),
  ),
  "tail-head-recall": motion(
    "화살표 꼬리·머리와 작은·큰 진리집합의 대응",
    "p→q 위에 충분·필요를 붙이고 P⊆Q 벤다이어그램을 아래에 정렬",
    [
      beat("recall-tail", "highlight", "화살표 꼬리 p", "p→q", "p 충분", "출발 조건만으로 도착을 보장합니다."),
      beat("recall-head", "point", "화살표 머리 q", "p가 성립하려면 q 필요", "q 필요", "출발한 모든 경우가 도착 조건을 반드시 거칩니다."),
      beat("recall-set-size", "verify", "P⊆Q", "충분 집합은 안쪽", "필요 집합은 바깥쪽", "강한 조건일수록 진리집합이 작다는 방향까지 함께 확인합니다."),
    ],
    "p→q에서 p는 충분, q는 필요입니다. 진리집합으로 보면 충분조건의 영역이 필요조건의 영역 안에 들어갑니다.",
    "arrow endpoints and truth-set nesting are equivalent mnemonics for sufficiency and necessity.",
    check("p→q에서 충분조건이 놓이는 곳은?", ["화살표 꼬리 p", "화살표 머리 q", "화살표 밖"], 0, "맞아요. 출발 조건 p가 q에 도착하기에 충분합니다.", "‘p이면 q’에서 먼저 만족하는 조건을 보세요."),
  ),

  "two-detours": motion(
    "직접증명·대우·귀류 세 경로 중 두 우회로",
    "막힌 p→q 정문 옆에 ¬q→¬p 대우길과 p∧¬q→모순 막다른 길을 표시",
    [
      beat("show-direct-route", "highlight", "p→q 정면 화살표", "가정에서 결론", "직접증명", "정면 계산이 길거나 결론을 바로 만들기 어려울 수 있습니다."),
      beat("open-contrapositive", "transform", "¬q→¬p 뒤편 화살표", "대우", "같은 명제의 다른 길", "결론의 부정에서 출발해 가정의 부정을 보이면 원래를 증명합니다."),
      beat("open-contradiction", "point", "p와 ¬q를 함께 둔 길", "p∧¬q⇒⊥", "귀류법", "원래가 거짓이라고 가정한 상태를 이미 아는 사실과 충돌시킵니다."),
    ],
    "직접 길이 막히면 대우로 뒤에서 가거나, 결론이 거짓이라고 가정해 모순까지 몰고 갈 수 있습니다.",
    "contraposition proves an equivalent implication; contradiction proves that P∧¬Q is unsatisfiable. Both avoid constructing Q directly.",
    check("p→q를 대우로 증명할 때 시작하는 문장은?", ["q→p", "¬q→¬p", "¬p→¬q"], 1, "맞아요. 결론 q의 부정에서 가정 p의 부정으로 갑니다.", "대우는 방향과 부정을 모두 바꿉니다."),
  ),
  "even-square-question": motion(
    "홀수 2k+1을 제곱해 홀수 2m+1로 남기는 대우 흐름",
    "‘n² 짝수→n 짝수’를 ‘n 홀수→n² 홀수’로 뒤집고 항을 묶기",
    [
      beat("write-contrapositive", "transform", "원래 명제의 대우", "n 홀수⇒n² 홀수", "증명 목표", "제곱의 짝수성을 직접 거슬러 올라가기보다 홀수 꼴을 계산합니다."),
      beat("square-odd", "highlight", "n=2k+1", "n²=4k²+4k+1", "=2(2k²+2k)+1", "짝수 부분과 마지막 1을 분리하면 홀수 꼴이 보입니다."),
      beat("return-original", "verify", "대우 증명 완료", "¬q→¬p 참", "p→q 참", "대우와 원래 명제의 동치로 원래 결론을 회수합니다."),
    ],
    "n이 홀수라고 두면 n=2k+1입니다. 제곱하면 짝수 덩어리+1이 남아 다시 홀수입니다. 대우가 참이므로 원래 명제도 참입니다.",
    "parity is preserved under squaring for odd integers: (2k+1)²=2(2k²+2k)+1. Contrapositive equivalence transfers the result.",
    check("‘n²이 짝수이면 n이 짝수’의 대우는?", ["n이 홀수이면 n²이 홀수", "n이 짝수이면 n²이 짝수", "n²이 홀수이면 n이 짝수"], 0, "맞아요. 결론과 가정을 모두 부정하고 방향을 바꿉니다.", "짝수의 부정은 홀수라는 정수 범위 조건을 사용하세요."),
  ),
  "fake-contradiction": motion(
    "낯선 결과와 실제 논리 충돌을 구분하는 경고판",
    "x=−3 같은 예상 밖 결과와 x가 동시에 짝수·홀수인 충돌을 나란히 비교",
    [
      beat("show-surprise", "point", "예상과 다른 x=−3", "낯섦", "모순 아님", "결과가 이상해 보인다는 느낌만으로는 논리적 충돌이 아닙니다."),
      beat("show-logical-clash", "highlight", "n=2a와 n=2b+1 동시 성립", "짝수 and 홀수", "동시에 불가능", "정의상 함께 참일 수 없는 두 문장이 만나야 모순입니다."),
      beat("name-source", "verify", "가정에서 나온 충돌과 주어진 사실", "가정⇒R and ¬R", "가정 거짓", "어떤 가정 때문에 충돌이 생겼는지 되짚어야 귀류가 완성됩니다."),
    ],
    "모순은 ‘이상하다’가 아니라 한 대상이 동시에 짝수이면서 홀수처럼, 함께 참일 수 없는 두 사실의 충돌입니다.",
    "a contradiction is formal inconsistency R∧¬R relative to accepted premises. Psychological surprise has no proof force.",
    check("귀류법에서 실제 모순에 해당하는 것은?", ["답이 음수로 나옴", "한 수가 동시에 짝수와 홀수", "계산이 길어짐"], 1, "맞아요. 정의상 동시에 성립할 수 없는 두 사실입니다.", "낯선 결과가 아니라 R과 R이 아님이 함께 나온 경우를 고르세요."),
  ),
  "irrational-root-two": motion(
    "서로소 분수 a/b가 둘 다 짝수가 되어 무너지는 귀류 흐름",
    "√2=a/b 가정에서 a²=2b²→a 짝수→b 짝수로 화살표를 연결",
    [
      beat("assume-rational", "highlight", "√2=a/b, gcd(a,b)=1", "서로소 분수 가정", "귀류 시작", "유리수라면 공약수 없는 가장 간단한 분수로 쓸 수 있습니다."),
      beat("force-a-even", "transform", "a²=2b²", "a² 짝수", "a=2k", "제곱이 짝수이면 원래 수도 짝수라는 앞 결과를 사용합니다."),
      beat("force-b-even", "verify", "4k²=2b²", "b²=2k²", "b도 짝수→서로소와 충돌", "a와 b가 모두 2를 공약수로 가져 처음 가정이 무너집니다."),
    ],
    "√2가 유리수라고 가정해 서로소 a/b로 둡니다. 식을 제곱하면 a와 b가 차례로 모두 짝수가 되어 서로소라는 약속과 충돌합니다.",
    "the parity descent derives 2|a and 2|b, contradicting gcd(a,b)=1. The contradiction targets the rational representation assumption.",
    check("√2 귀류증명에서 마지막 충돌은 무엇인가요?", ["a와 b가 모두 짝수", "a와 b가 모두 홀수", "a=b"], 0, "맞아요. 둘 다 2를 공약수로 가져 서로소 가정과 충돌합니다.", "처음에 a/b를 가장 간단한 분수로 두었다는 약속을 되보세요."),
  ),
  "proof-route-recall": motion(
    "대우길과 모순 막다른 길의 출발·도착 표지",
    "¬q→¬p와 p∧¬q→⊥ 두 레일을 번갈아 켜 구분",
    [
      beat("recall-contrapositive", "highlight", "대우 레일", "¬q→¬p", "동치 명제 증명", "결론의 부정에서 가정의 부정까지 정상 화살표를 완성합니다."),
      beat("recall-contradiction", "point", "귀류 레일", "p∧¬q⇒⊥", "거짓 가정 제거", "원래가 거짓인 상황을 받아들였다가 명확한 충돌로 막습니다."),
      beat("choose-route", "verify", "목표와 계산 구조", "홀수꼴→대우 / 서로소 충돌→귀류", "적합한 우회 선택", "어떤 부정이 계산하기 쉬운지와 어떤 불변식이 충돌하는지 봅니다."),
    ],
    "대우는 같은 명제의 뒤편 화살표를 증명하고, 귀류는 원래가 거짓이라고 가정해 모순을 만듭니다. 둘 다 결론의 부정을 다루지만 끝나는 방식이 다릅니다.",
    "contraposition constructs ¬Q⇒¬P; contradiction establishes unsatisfiability of P∧¬Q. Route selection is a proof-design choice.",
    check("가정과 결론의 부정을 함께 놓고 모순을 만드는 방법은?", ["직접증명", "귀류법", "역의 증명"], 1, "맞아요. 원래가 거짓이라고 가정한 상태를 모순으로 몰아갑니다.", "⊥라는 막다른 표지가 있는 증명 길을 찾으세요."),
  ),

  "square-floor": motion(
    "항상 0 이상인 제곱 블록과 부등식의 바닥선",
    "a−b 길이를 제곱한 정사각형을 0 바닥 위에 놓아 a²+b²≥2ab를 만들기",
    [
      beat("build-difference", "group", "좌변−우변", "a²+b²−2ab", "(a−b)²", "부등식 양쪽의 차를 한 덩어리로 모읍니다."),
      beat("place-on-floor", "highlight", "제곱 정사각형", "(a−b)²≥0", "항상 0 이상", "실수의 제곱은 0 바닥 아래로 내려갈 수 없습니다."),
      beat("read-equality", "verify", "정사각형 넓이 0", "a−b=0", "a=b에서 등호", "바닥에 닿는 순간을 찾아 등호 조건까지 함께 기록합니다."),
    ],
    "a²+b²와 2ab의 차를 만들면 (a−b)²입니다. 제곱은 항상 0 이상이므로 부등식이 성립하고, a=b일 때만 등호입니다.",
    "nonnegative quadratic forms certify universal inequalities. Equality is the kernel of the square term, here a−b=0.",
    check("a²+b²≥2ab의 등호가 성립하는 때는?", ["a=b", "a=−b", "a와 b가 모두 양수일 때"], 0, "맞아요. 차 (a−b)²가 0이 되는 때입니다.", "부등식의 차를 완전제곱으로 만든 뒤 0 조건을 보세요."),
  ),
  "two-numbers-question": motion(
    "두 막대 a·b의 차이가 커질수록 늘어나는 제곱 면적",
    "a=5,b=3과 a=b=4를 비교해 차 제곱과 등호 상태 표시",
    [
      beat("test-unequal", "group", "a=5,b=3", "a²+b²−2ab=25+9−30", "4=(5−3)²", "서로 다르면 양의 여유가 남습니다."),
      beat("test-equal", "group", "a=b=4", "16+16−32", "0", "두 수가 같으면 차가 사라져 두 식이 정확히 같습니다."),
      beat("generalize-gap", "verify", "두 수 사이 거리", "부등식 여유=(a−b)²", "거리의 제곱", "부등식이 얼마나 엄격한지가 두 수의 차이로 보입니다."),
    ],
    "a=5, b=3이면 왼쪽이 오른쪽보다 4 큽니다. 그 4는 두 수 차이 2의 제곱입니다. 두 수가 같아지면 여유가 0이 됩니다.",
    "the inequality gap is exactly squared Euclidean distance between a and b. This quantifies both validity and equality.",
    check("a=5,b=3일 때 a²+b²−2ab는?", ["2", "4", "8"], 1, "맞아요. (5−3)²=4입니다.", "전개보다 차의 제곱으로 바로 계산하세요."),
  ),
  "unsafe-division": motion(
    "양수·음수·0 세 갈래로 갈라지는 문자 나눗셈 경고",
    "ax>ay를 a로 나눌 때 a의 부호에 따라 화살표 방향을 따로 표시",
    [
      beat("branch-positive", "highlight", "a>0 가지", "ax>ay⇒x>y", "방향 유지", "양수로 나눌 때만 부등호 방향이 그대로입니다."),
      beat("branch-negative", "transform", "a<0 가지", "ax>ay⇒x<y", "방향 반전", "음수로 나누면 수직선 방향이 뒤집힙니다."),
      beat("block-zero", "point", "a=0 가지", "0>0 불가 / 나눗셈 불가", "별도 처리", "부호를 모르는 문자를 무조건 약분하면 두 가지와 0을 모두 잃습니다."),
    ],
    "문자 a로 나누기 전에는 a가 양수인지 음수인지 0인지 확인해야 합니다. 부호가 없으면 경우를 나누거나 다른 증명 방법을 쓰세요.",
    "division by an unknown scalar is order-sensitive and may be undefined. Sign conditions are proof obligations, not decorative assumptions.",
    check("음수로 부등식 양변을 나누면 어떻게 되나요?", ["부등호 방향 유지", "부등호 방향 반전", "항상 등호"], 1, "맞아요. 수직선의 대소 방향이 뒤집힙니다.", "−1을 곱해 2>1이 −2<−1로 바뀌는 예를 떠올리세요."),
  ),
  "difference-to-square": motion(
    "좌변−우변을 모아 완전제곱으로 접는 세 단계",
    "x²−6x+9 조각을 x²·−6x·9에서 (x−3)² 정사각형으로 재배치",
    [
      beat("move-to-one-side", "group", "부등식의 모든 항", "좌변−우변", "한 식과 0 비교", "항을 한쪽에 모아 항상성의 근거를 찾을 준비를 합니다."),
      beat("complete-square", "transform", "x²−6x+9", "(x−3)²", "제곱 구조", "가운데 항 −6x의 절반 −3을 제곱해 괄호를 복원합니다."),
      beat("record-equality", "verify", "(x−3)²=0", "x=3", "등호 조건", "제곱이 0이 되는 유일한 점을 원래 부등식의 등호 조건으로 적습니다."),
    ],
    "항을 한쪽에 모으고 가운데 항의 절반을 이용해 완전제곱을 찾습니다. 제곱은 항상 0 이상이고, 괄호가 0일 때 등호입니다.",
    "completing the square diagonalizes a quadratic expression. Positivity and equality follow from its squared coordinate.",
    check("x²−6x+9를 완전제곱으로 쓰면?", ["(x−3)²", "(x+3)²", "(x−9)²"], 0, "맞아요. 가운데 항은 2·x·(−3)=−6x입니다.", "상수항 9의 제곱근과 가운데 항의 부호를 함께 보세요."),
  ),
  "inequality-recall": motion(
    "차 만들기·제곱 찾기·바닥 확인·등호 기록 네 표지",
    "왼쪽 위에서 오른쪽 아래로 증명 흐름을 한 줄씩 켜기",
    [
      beat("recall-difference", "highlight", "좌변−우변", "L−R", "0과 비교", "두 식의 차를 한쪽에 모읍니다."),
      beat("recall-square", "transform", "완전제곱 구조", "L−R=(…)²", "항상 ≥0", "실수 제곱의 0 바닥이 모든 값에서 성립하는 이유입니다."),
      beat("recall-equality", "verify", "괄호=0", "(…)=0", "등호 조건", "마지막에는 언제 바닥에 닿는지 반드시 기록합니다."),
    ],
    "항상 성립하는 부등식은 두 식의 차를 만들고 제곱 모양을 찾으세요. 제곱이 0이 되는 순간이 등호 조건입니다.",
    "a sum-of-squares certificate proves global nonnegativity; its zero set precisely characterizes equality when no other assumptions intervene.",
    check("항상 성립하는 부등식 증명의 마지막 확인은?", ["등호 성립 조건", "문자를 무조건 나누기", "부등호를 지우기"], 0, "맞아요. 제곱이 0이 되는 조건까지 적어야 완성됩니다.", "0 바닥에 언제 닿는지 확인하세요."),
  ),
};

const shard = JSON.parse(fs.readFileSync(shardPath, "utf8"));
const targetStories = shard.stories.filter((story) => story.unitId === "sets-and-propositions");
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
console.log(`Authored sets and propositions motion: ${targetStories.length} stories / ${targetSceneIds.size} scenes`);
