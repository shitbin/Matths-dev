#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const shardPath = path.resolve(
  __dirname,
  "..",
  "content_folder",
  "curriculum-stories",
  "probability-statistics.json",
);
const shard = JSON.parse(fs.readFileSync(shardPath, "utf8"));

function studentText(value) {
  return String(value || "").replace(/\[/gu, "(").replace(/\]/gu, ")");
}

function choice(value) {
  const text = studentText(value);
  return text.length >= 4 ? text : `${text} 선택`;
}

const concepts = {
  "probability-statistics-01-01": {
    focus: "같은 것이 만든 중복", expression: "n! / (p!q!…)", result: "중복만큼 접어 한 배열",
    instruction: "색이 같은 카드를 같은 색 층으로 포갠 뒤 서로 바꿔도 변하지 않는 배열을 반투명 고리로 묶어 표시",
    mild: "먼저 전부 다르다고 생각해 순서를 세고, 같은 것끼리 바꿔도 새 배열이 되지 않는 만큼만 나누세요.",
    spicy: "대칭군의 stabilizer 크기 p!q!…로 n!개의 라벨 배열을 quotient해 서로 다른 orbit 수만 남깁니다.",
    check: ["A,A,B,B,C의 배열 수를 만드는 식은?", ["5!/(2!2!)", "5!/2!", "5!"], 0],
  },
  "probability-statistics-01-02": {
    focus: "구분막과 별", expression: "x₁+…+xₙ=r", result: "별 r개·막 n−1개",
    instruction: "같은 별을 일렬로 놓고 구분막을 움직여 각 상자에 들어가는 개수가 즉시 바뀌는 모습을 표시",
    mild: "같은 것을 여러 상자에 나눌 때는 물건의 순서가 아니라 구분막이 들어갈 자리만 고르면 됩니다.",
    spicy: "비음수 정수해는 stars-and-bars로 C(r+n−1,n−1), 양의 정수해는 먼저 각 변수에 1을 배정해 r을 r−n으로 이동합니다.",
    check: ["x+y+z=5의 음이 아닌 정수해 수는?", ["7C2", "5C3", "3⁵"], 0],
  },
  "probability-statistics-01-03": {
    focus: "뒤항 선택 횟수 r", expression: "C(n,r)aⁿ⁻ʳbʳ", result: "목표 차수의 한 항",
    instruction: "괄호 n개를 세로로 쌓고 뒤항을 고른 칸만 색칠해 지수와 이항계수가 동시에 결정되는 경로를 표시",
    mild: "원하는 차수가 나오려면 뒤항을 몇 번 골라야 하는지부터 찾고, 그 선택 위치의 수와 계수·부호를 함께 곱하세요.",
    spicy: "일반항의 exponent constraint를 먼저 풀어 r을 고정한 뒤 binomial coefficient와 coefficient power를 평가합니다.",
    check: ["(a+b)ⁿ에서 bʳ의 위치 선택 수는?", ["nCr", "nPr", "rⁿ"], 0],
  },
  "probability-statistics-02-01": {
    focus: "표본공간과 사건", expression: "P(A)=|A|/|S|", result: "같은 무게일 때만 개수 비",
    instruction: "가능한 기본 결과를 같은 크기의 타일로 펼치고 사건 타일만 색칠해 분자와 분모가 가리키는 영역을 표시",
    mild: "먼저 가능한 결과를 빠짐없이 쓰고, 정말 같은 가능성인지 확인한 뒤 원하는 결과를 색칠하세요.",
    spicy: "equiprobable elementary outcomes에서만 cardinality ratio가 probability measure와 일치합니다.",
    check: ["결과 개수의 비로 확률을 구하려면?", ["기본 결과가 같은 가능성", "사건 이름이 짧음", "결과가 두 개"], 0],
  },
  "probability-statistics-02-02": {
    focus: "겹친 교집합", expression: "P(A∪B)=P(A)+P(B)−P(A∩B)", result: "겹침은 한 번만",
    instruction: "두 반투명 원을 겹쳐 각각 더한 뒤 두 번 칠해진 가운데 영역을 한 번 지우는 과정을 표시",
    mild: "A와 B를 먼저 더하면 가운데가 두 번 들어갑니다. 겹친 부분 한 번을 되돌려 주세요.",
    spicy: "measure의 inclusion-exclusion로 중복 계수된 intersection mass를 한 번 제거합니다.",
    check: ["두 사건의 합집합 확률은?", ["둘을 더하고 교집합을 뺌", "둘을 곱함", "큰 확률만 선택"], 0],
  },
  "probability-statistics-02-03": {
    focus: "반대 사건", expression: "P(Aᶜ)=1−P(A)", result: "복잡한 쪽 대신 한 문",
    instruction: "전체 직사각형을 사건과 반대 사건 두 영역으로 가르고 목표보다 짧은 반대 경로를 먼저 강조",
    mild: "적어도 하나처럼 갈래가 많으면 반대인 하나도 없음을 먼저 구하고 전체 1에서 빼세요.",
    spicy: "A와 complement가 disjoint partition of Ω이므로 measure가 정확히 1로 복원됩니다.",
    check: ["적어도 한 번 성공의 반대는?", ["한 번도 성공하지 않음", "정확히 한 번 성공", "모두 성공"], 0],
  },
  "probability-statistics-02-04": {
    focus: "조건 B라는 새 울타리", expression: "P(A|B)=P(A∩B)/P(B)", result: "분모를 B로 교체",
    instruction: "전체 표본공간을 어둡게 하고 조건 B 영역만 확대해 그 안의 A 교집합을 새 분자로 표시",
    mild: "세로줄 뒤의 B가 새 전체입니다. B 안에서 A와 겹치는 부분이 얼마나 되는지만 보세요.",
    spicy: "conditioning은 probability space를 B로 restrict하고 P(B)로 renormalize합니다.",
    check: ["P(A|B)에서 새 전체는?", ["사건 B", "사건 A", "A의 여집합"], 0],
  },
  "probability-statistics-02-05": {
    focus: "정보 전후의 확률", expression: "P(A|B)=P(A)", result: "안 바뀌면 독립",
    instruction: "B를 알기 전·후의 A 확률 저울을 나란히 놓고 눈금이 움직이는지 비교",
    mild: "B라는 소식을 들었을 때 A의 가능성이 그대로인지 보세요. 그대로면 독립, 움직이면 종속입니다.",
    spicy: "positive-probability events에서 conditional invariance와 product factorization P(A∩B)=P(A)P(B)는 동치입니다.",
    check: ["독립을 가장 직접 확인하는 비교는?", ["P(A|B)와 P(A)", "P(A)와 P(B)의 크기", "A와 B의 이름"], 0],
  },
  "probability-statistics-02-06": {
    focus: "조건이 갱신되는 한 경로", expression: "P(A∩B)=P(A)P(B|A)", result: "경로 안 곱·경로 사이 합",
    instruction: "확률나무에서 지나온 가지를 굵게 만들고 다음 가지의 분모가 앞선 결과에 따라 바뀌는 모습을 표시",
    mild: "한 길을 따라갈 때는 확률을 곱하고, 같은 목표에 도착하는 서로 다른 길은 마지막에 더하세요.",
    spicy: "chain rule은 joint mass를 sequential conditional factors로 분해하며 disjoint terminal paths는 additivity로 합칩니다.",
    check: ["확률나무의 한 경로 안에서는?", ["가지 확률을 곱함", "가지 확률을 더함", "가장 큰 것만 선택"], 0],
  },
  "probability-statistics-03-01": {
    focus: "결과를 숫자로 보내는 규칙", expression: "X: Ω→ℝ", result: "같은 값끼리 확률 합산",
    instruction: "동전 결과 타일을 화살표로 숫자 막대에 보내고 같은 숫자에 도착한 화살표를 한 확률질량으로 합침",
    mild: "확률변수는 결과 자체가 아니라 결과를 관심 있는 숫자로 바꾸는 이름표입니다. 같은 숫자가 되면 확률을 합치세요.",
    spicy: "random variable의 pushforward measure가 값별 probability mass function을 만듭니다.",
    check: ["확률변수가 하는 일은?", ["결과를 숫자에 대응", "확률을 항상 평균으로 바꿈", "결과를 삭제"], 0],
  },
  "probability-statistics-03-02": {
    focus: "확률의 무게중심과 거리", expression: "E(X)=Σxp, Var(X)=Σ(x−μ)²p", result: "중심과 흔들림 분리",
    instruction: "확률질량을 추 위에 놓아 균형점 μ를 찾고 각 추의 제곱거리를 색 농도로 표시",
    mild: "기댓값은 무거운 확률 쪽으로 끌리는 중심이고, 분산은 그 중심에서 얼마나 멀리 흩어졌는지 봅니다.",
    spicy: "first moment가 location을, centered second moment가 dispersion을 요약하며 표준편차는 원래 단위로 복원합니다.",
    check: ["분산에서 거리를 제곱하는 기준점은?", ["기댓값", "최댓값", "0만"], 0],
  },
  "probability-statistics-03-03": {
    focus: "이항의 네 조건", expression: "X~B(n,p)", result: "고정·두 결과·독립·같은 p",
    instruction: "네 개의 조건 관문을 차례로 켜고 통과한 시행만 성공 횟수 막대분포로 변환",
    mild: "성공과 실패만 있다고 끝이 아닙니다. 횟수가 고정되고, 서로 독립이며, 성공 확률도 매번 같은지 확인하세요.",
    spicy: "independent identically distributed Bernoulli trials의 sum만 binomial law를 따릅니다.",
    check: ["비복원추출이 이항분포를 자주 깨는 이유는?", ["시행마다 p가 변함", "성공이 두 종류", "횟수가 정수"], 0],
  },
  "probability-statistics-03-04": {
    focus: "막대 경계의 반 칸", expression: "np, npq, x±0.5", result: "정규곡선 넓이로 근사",
    instruction: "이산 막대를 연속 종곡선 아래에 겹치고 정수 경계를 좌우 0.5만큼 넓히는 모습을 표시",
    mild: "정수 하나는 연속곡선에서 점이 아니라 폭 1인 막대입니다. 그래서 경계를 반 칸씩 넓힌 뒤 표준화하세요.",
    spicy: "local central-limit approximation requires continuity correction because point mass is represented by a unit interval under the density.",
    check: ["X=10 한 칸을 정규근사 구간으로 바꾸면?", ["9.5<X<10.5", "10<X<11", "X=10 그대로"], 0],
  },
  "probability-statistics-03-05": {
    focus: "모집단을 닮은 표집틀", expression: "모집단→표집틀→무작위 표본", result: "대표성은 구조에서",
    instruction: "모집단의 색 비율과 표본의 색 비율을 나란히 놓고 누락된 집단이 생기면 경고층을 표시",
    mild: "사람을 많이 모으는 것보다 누가 뽑힐 기회를 갖는지가 중요합니다. 빠진 집단이 없는지 먼저 보세요.",
    spicy: "coverage와 selection mechanism이 estimator bias를 결정하며 sample size 증가는 structural bias를 제거하지 못합니다.",
    check: ["큰 편의표본의 핵심 문제는?", ["선택 구조의 편향", "표본 수가 너무 큼", "평균을 계산함"], 0],
  },
  "probability-statistics-03-06": {
    focus: "반복 표본의 평균", expression: "E(X̄)=μ, SE=σ/√n", result: "중심 고정·퍼짐 축소",
    instruction: "여러 표본평균 점구름을 표본 크기별로 겹쳐 n이 커질수록 μ 주변으로 좁아지는 모습을 표시",
    mild: "표본이 달라지면 평균도 조금씩 달라집니다. 하지만 중심은 모평균에 있고 표본 수가 커질수록 흔들림이 줄어듭니다.",
    spicy: "sampling distribution의 standard error는 independent sample size의 square-root rate로 수축합니다.",
    check: ["표본 크기를 4배로 늘리면 표준오차는?", ["절반", "4배", "그대로"], 0],
  },
  "probability-statistics-03-07": {
    focus: "점추정 ± 오차한계", expression: "estimate ± critical×SE", result: "모수가 있을 법한 구간",
    instruction: "여러 표본의 신뢰구간 막대를 쌓고 참모수 선을 포함하는 구간과 놓치는 구간을 색으로 구분",
    mild: "이번 구간이 95퍼센트 확률로 맞는다는 뜻이 아닙니다. 같은 방법을 반복하면 만든 구간의 약 95퍼센트가 참값을 덮습니다.",
    spicy: "coverage probability is a repeated-sampling property of the interval procedure, not a posterior probability for a fixed parameter.",
    check: ["95% 신뢰수준이 가리키는 것은?", ["반복한 구간 절차의 포함률", "이번 모수의 확률", "표본이 정답일 확률"], 0],
  },
};

const resultByKind = {
  intuition: "눈으로 구조 찾기",
  question: "조건을 먼저 판정",
  misconception: "잘못 센 부분 차단",
  solution: "식과 그림을 연결",
  recall: "한 문장으로 회상",
};

const stories = shard.stories || [];
const configured = new Set(Object.keys(concepts));
const missing = stories.filter((story) => !configured.has(story.conceptId)).map((story) => story.conceptId);
const extra = [...configured].filter((id) => !stories.some((story) => story.conceptId === id));
if (missing.length || extra.length || stories.length !== 16) {
  throw new Error(`확률과 통계 motion spec 불일치: missing=${missing.join(",")} extra=${extra.join(",")} count=${stories.length}`);
}

for (const story of stories) {
  const concept = concepts[story.conceptId];
  if (story.scenes.length !== 5) throw new Error(`${story.conceptId}: 5개 장면이 아닙니다.`);
  for (const scene of story.scenes) {
    const focus = studentText(scene.title);
    const result = resultByKind[scene.kind];
    if (!result) throw new Error(`${story.conceptId}/${scene.id}: 알 수 없는 kind ${scene.kind}`);
    const [prompt, rawChoices, answerIndex] = concept.check;
    scene.motion = {
      version: 1,
      mode: "plot",
      focus,
      instruction: studentText(concept.instruction),
      beats: [
        {
          id: `${scene.id}-locate`, action: "highlight", target: focus,
          expression: studentText(concept.focus), result: "대상 고정",
          caption: `먼저 ${focus}을 화면에서 가리키고 나머지 정보는 잠시 흐리게 둡니다.`, durationMs: 1_800,
        },
        {
          id: `${scene.id}-transform`, action: "transform", target: studentText(concept.focus),
          expression: studentText(concept.expression), result: studentText(concept.result),
          caption: studentText(scene.subtitle), durationMs: 2_200,
        },
        {
          id: `${scene.id}-verify`, action: "verify", target: studentText(concept.result),
          expression: studentText(`${concept.expression} → ${concept.result}`), result,
          caption: `${result} 단계에서 분모·겹침·조건·표집 범위가 바뀌지 않았는지 그림을 거꾸로 따라가며 확인합니다.`, durationMs: 2_000,
        },
      ],
      mild: { explanation: studentText(`${scene.subtitle} ${concept.mild}`) },
      spicy: { explanation: studentText(`${concept.spicy} 이 장면에서는 ${concept.focus}에서 ${concept.result}로 가는 한 연결만 추적합니다.`) },
      check: {
        prompt: studentText(prompt), choices: rawChoices.map(choice), answerIndex,
        correctFeedback: `맞아요. ${concept.focus}을 기준으로 ${concept.result}까지 연결했습니다.`,
        retryFeedback: `${focus}을 먼저 가리킨 뒤 ${concept.expression}의 분모와 조건을 한 단계씩 다시 보세요.`,
      },
    };
  }
}

shard.updatedAt = new Date().toISOString();
fs.writeFileSync(shardPath, `${JSON.stringify(shard, null, 2)}\n`);
process.stdout.write(`Authored Probability & Statistics motion: ${stories.length} stories / ${stories.length * 5} scenes\n`);
