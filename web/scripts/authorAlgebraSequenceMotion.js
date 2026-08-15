#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const shardPath = path.resolve(__dirname, "..", "content_folder", "curriculum-stories", "algebra.json");
const shard = JSON.parse(fs.readFileSync(shardPath, "utf8"));

const families = {
  "algebra-03-01": {
    instruction: "번호가 붙은 사물함에서 주소 n, 한 칸의 값 aₙ, 첫 칸부터의 누적 Sₙ을 서로 다른 레이어로 표시",
    mild: "아래첨자는 곱셈이 아니라 주소입니다. 먼저 몇 번째 칸인지 찾고, 그 칸의 값과 그 칸까지의 누적을 따로 읽어 보세요.",
    spicy: "수열을 자연수 정의역의 함수로 보고 point value aₙ과 prefix sum Sₙ을 분리하면 주소·값·누적 혼동이 사라집니다.",
  },
  "algebra-03-02": {
    instruction: "같은 높이의 계단과 양끝을 짝지은 합판으로 공차·n−1번 이동·등차수열의 합을 연결",
    mild: "첫째항에는 이미 서 있으므로 n번째까지 걷는 간격은 n−1개입니다. 매번 같은 수를 더하는지 계단 높이를 보세요.",
    spicy: "등차수열은 first difference가 상수인 affine sequence이며 합은 endpoint average와 term count의 곱으로 압축됩니다.",
  },
  "algebra-03-03": {
    instruction: "같은 확대 렌즈를 통과하는 카드와 Sₙ·rSₙ 두 줄을 겹쳐 공비·n−1·등비합 소거를 표시",
    mild: "첫째항은 렌즈를 아직 지나지 않았습니다. n번째 항에는 공비를 n−1번 곱하고, 합은 한 줄을 r배 밀어 빼세요.",
    spicy: "등비수열은 constant ratio를 갖고 finite geometric sum은 (1−r)Sₙ=a₁(1−rⁿ)의 경계항 소거로 얻습니다.",
  },
  "algebra-03-04": {
    instruction: "Σ 컨베이어에 시작 번호·끝 번호·대입식을 넣고 항 카드가 포함 범위만큼 출력되는 과정 표시",
    mild: "시작과 끝을 모두 포함하므로 항 수는 끝−시작+1입니다. Σ 오른쪽 식에 번호를 하나씩 넣어 실제 항을 펼쳐 보세요.",
    spicy: "summation linearity는 addition과 scalar multiplication에만 적용되며 product of terms를 product of sums로 분리하지 않습니다.",
  },
  "algebra-03-05": {
    instruction: "각 항을 두 조각의 차로 열고 이웃 조각을 지퍼처럼 소거해 처음과 마지막 경계항만 남기기",
    mild: "첫 세 항과 마지막 항을 직접 펼치세요. 가운데가 지워져도 맨 처음 조각과 맨 마지막 조각은 반드시 남습니다.",
    spicy: "telescoping은 summand를 discrete difference F(k)−F(k+1)로 바꿔 interior terms를 상쇄하고 boundary만 보존합니다.",
  },
  "algebra-03-06": {
    instruction: "초기항 씨앗을 점화 레시피 기계에 넣고 필요한 과거 항을 읽어 다음 항을 한 줄씩 생산",
    mild: "레시피만으로는 시작할 수 없습니다. 초기항을 먼저 놓고, 점화식이 앞의 한 항인지 두 항인지 무엇을 요구하는지 확인하세요.",
    spicy: "recurrence relation과 sufficient initial state가 함께 sequence를 결정하며 dependency order를 지킨 표 계산이 연쇄 오류를 막습니다.",
  },
  "algebra-03-07": {
    instruction: "P(1) 첫 도미노, 임의의 P(k), P(k)⇒P(k+1) 전달 장치를 분리해 무한 사슬의 논리를 표시",
    mild: "첫 도미노가 실제로 쓰러지는지와, 한 도미노가 쓰러졌을 때 다음 도미노로 힘이 전달되는지를 둘 다 확인하세요.",
    spicy: "induction proves a base case and a universal conditional step; the hypothesis P(k) is a local premise for the implication, not the conclusion assumed globally.",
  },
};

const configs = {
  "numbered-lockers": ["주소 n과 값 aₙ", "1→a₁, 2→a₂, 3→a₃", "순서 있는 함수", "a₃은 무엇을 뜻하나요?", ["세 번째 항의 값", "3을 곱한 값", "첫 세 항의 합"], 0],
  "term-rule-question": ["일반항 aₙ", "aₙ=n²+1", "a₁₀₀=10001", "aₙ=n²+1일 때 a₃은?", ["4 선택", "10 선택", "28 선택"], 1],
  "index-value-confusion": ["아래첨자 5", "a₅≠5a", "다섯 번째 주소", "aₙ=2n−1일 때 a₅는?", ["5 선택", "9 선택", "10 선택"], 1],
  "general-term-and-sum-solution": ["한 항 aₙ과 누적 Sₙ", "a₃=7, S₃=1+3+7", "a₃≠S₃", "a₁=1,a₂=3,a₃=7일 때 S₃은?", ["7 선택", "10 선택", "11 선택"], 2],
  "address-map-recall": ["n·aₙ·Sₙ 세 레이어", "주소→값→누적", "서로 다른 질문", "Sₙ이 나타내는 것은?", ["n번째 항만", "첫째항부터 n번째까지의 합", "항의 번호"], 1],

  "constant-step-staircase": ["공차 d", "aₙ₊₁−aₙ=d", "같은 보폭", "3,7,11의 공차는?", ["3 선택", "4 선택", "7 선택"], 1],
  "n-minus-one-steps": ["이동 간격 n−1", "aₙ=a₁+(n−1)d", "첫째항은 0번 이동", "a₁에서 a₅까지 공차를 몇 번 더하나요?", ["4번 이동", "5번 이동", "6번 이동"], 0],
  "difference-ratio-and-offbyone": ["뺄셈 차이", "aₙ₊₁−aₙ", "공차 판별", "등차수열을 판별하는 계산은?", ["이웃 항의 차", "이웃 항의 비", "모든 항의 곱"], 0],
  "paired-arithmetic-sum": ["첫항+끝항 짝", "2Sₙ=n(a₁+aₙ)", "Sₙ=n(a₁+aₙ)/2", "1부터 10까지의 합은?", ["45 선택", "50 선택", "55 선택"], 2],
  "equal-stride-recall": ["보폭·간격·양끝 평균", "d, n−1, (a₁+aₙ)/2", "등차 세 지문", "등차수열 합의 평균값은?", ["첫항만", "끝항만", "첫항과 끝항의 평균"], 2],

  "constant-zoom-lens": ["공비 r", "aₙ₊₁/aₙ=r", "같은 확대율", "2,6,18의 공비는?", ["2 선택", "3 선택", "6 선택"], 1],
  "n-minus-one-multiplications": ["렌즈 통과 n−1번", "aₙ=a₁rⁿ⁻¹", "첫째항은 0번", "a₁에서 a₄까지 공비를 몇 번 곱하나요?", ["3번 곱함", "4번 곱함", "5번 곱함"], 0],
  "geometric-middle-sign-trap": ["b²=ac", "b=±√ac", "부호는 조건 필요", "a=1,c=9일 때 가능한 b는?", ["3만 가능", "−3만 가능", "±3 가능"], 2],
  "shifted-geometric-sum": ["Sₙ과 rSₙ", "(1−r)Sₙ=a₁(1−rⁿ)", "경계항만 남음", "등비합에서 두 줄을 빼는 이유는?", ["중간 항 소거", "공비 제거", "항 수 증가"], 0],
  "constant-scale-recall": ["배율·횟수·한 칸 밀기", "r, n−1, rSₙ−Sₙ", "등비 세 지문", "등비수열에서 일정한 것은?", ["이웃 항의 차", "이웃 항의 비", "항의 합"], 1],

  "summation-conveyor": ["Σ 시작·끝·항식", "Σ(k=1→4) k", "1+2+3+4", "Σ(k=1→3) k의 값은?", ["3 선택", "6 선택", "9 선택"], 1],
  "inclusive-count-question": ["끝 번호 포함", "q−p+1", "항 수", "k=3부터 8까지 항 수는?", ["5개 항", "6개 항", "8개 항"], 1],
  "false-product-linearity": ["선형성의 경계", "Σ(ak+b)=aΣk+bΣ1", "곱은 분리 금지", "항의 곱을 두 합의 곱으로 분리해도 되나요?", ["항상 가능", "일반적으로 불가", "항이 두 개면 가능"], 1],
  "sigma-polynomial-solution": ["k²·k·상수 분해", "Σ(k²+2k+1)", "Σk²+2Σk+Σ1", "Σ의 상수 1을 n번 더하면?", ["1 선택", "n 선택", "n² 선택"], 1],
  "summation-command-recall": ["범위·항식·항 수", "시작→끝 대입", "명령 실행", "Σ를 볼 때 먼저 확인할 것은?", ["시작·끝·항식", "답의 부호만", "마지막 항만"], 0],

  "telescoping-zipper": ["이웃 조각 소거", "F(k)−F(k+1)", "가운데 사라짐", "망원합에서 주로 남는 것은?", ["모든 중간 항", "처음과 마지막 경계항", "항의 곱"], 1],
  "method-shape-question": ["합 모양 판별", "다항·분수·지수×번호", "기본합·부분분수·밀어빼기", "1÷(k(k+1))에 먼저 시도할 것은?", ["부분분수 분해", "항별 제곱", "미분"], 0],
  "vanishing-endpoint-trap": ["마지막 n+1 경계", "1−1/(n+1)", "끝항 보존", "가운데가 소거된 뒤 확인할 것은?", ["경계항과 부호", "중간 항 전부", "공비만"], 0],
  "telescoping-sum-solution": ["1÷(k(k+1)) 분해", "1/k−1/(k+1)", "1−1/(n+1)", "1÷(k(k+1))의 올바른 분해는?", ["1/k−1/(k+1)", "1/k+1/(k+1)", "1/k²"], 0],
  "cancellation-fingerprint-recall": ["첫 세 항+마지막 항", "펼치기→소거→경계", "망원 지문", "소거 확인을 위해 최소 무엇을 펼치나요?", ["첫 세 항과 마지막 항", "첫 항만", "중간 한 항만"], 0],

  "starter-and-recipe": ["초기항+점화식", "a₁ 씨앗→aₙ₊₁=f(aₙ)", "수열 생산", "점화식으로 수열을 정하려면 함께 필요한 것은?", ["초기항", "합 공식만", "마지막 항만"], 0],
  "required-history-question": ["필요한 과거 항 수", "aₙ₊₂=aₙ₊₁+aₙ", "초기항 두 개", "앞의 두 항을 쓰는 점화식에 필요한 초기항 수는?", ["1개 초기항", "2개 초기항", "필요 없음"], 1],
  "missing-initial-condition": ["같은 레시피·다른 씨앗", "aₙ₊₁=2aₙ", "서로 다른 수열", "초기항이 달라지면 같은 점화식의 결과는?", ["항상 같은 수열", "다른 수열 가능", "항이 사라짐"], 1],
  "recursive-table-solution": ["n·현재항·계산·다음항", "aₙ₊₁=2aₙ+1", "한 줄씩 기록", "점화 계산 오류를 줄이는 방법은?", ["표로 한 단계씩 기록", "중간식 생략", "마지막 값 추측"], 0],
  "recipe-chain-recall": ["씨앗과 레시피", "초기 상태+전이 규칙", "전체 수열", "점화 수열의 두 핵심은?", ["초기항과 점화식", "공차와 공비", "합과 평균"], 0],

  "domino-chain-proof": ["P(1)과 P(k)⇒P(k+1)", "첫 도미노+전달", "모든 자연수", "귀납법에 반드시 필요한 두 단계는?", ["기초와 귀납 단계", "계산과 그래프", "정의와 반례"], 0],
  "why-assume-pk": ["조건부 입력 P(k)", "P(k)가 참이면 P(k+1)", "연결고리 증명", "귀납가정은 무엇을 위한 가정인가요?", ["한 연결의 조건부 입력", "결론 전체를 미리 가정", "기초단계 생략"], 0],
  "missing-base-or-link": ["출발과 연결 둘 다", "base + step", "하나라도 없으면 실패", "P(1)만 확인하면 전체 증명이 되나요?", ["항상 됨", "귀납 단계도 필요", "P(2)만 필요"], 1],
  "odd-sum-induction-solution": ["k²+(2k+1)", "1+3+⋯+(2k−1)=k²", "(k+1)²", "k²+2k+1은 무엇과 같나요?", ["(k+1)²", "k²+1", "2(k+1)"], 0],
  "induction-chain-recall": ["시작점·가정·다음 고리", "P(1), P(k), P(k+1)", "무한 사슬", "귀납법의 올바른 순서는?", ["기초→가정→다음 고리", "결론→기초 생략", "반례→공비"], 0],
};

const targetConcepts = new Set(Object.keys(families));
const targetStories = shard.stories.filter((story) => targetConcepts.has(story.conceptId));
const targetSceneIds = new Set(targetStories.flatMap((story) => story.scenes.map((scene) => scene.id)));
const missing = [...targetSceneIds].filter((id) => !configs[id]);
const extra = Object.keys(configs).filter((id) => !targetSceneIds.has(id));
if (missing.length || extra.length) {
  throw new Error(`motion spec 불일치: missing=${missing.join(",")} extra=${extra.join(",")}`);
}

for (const story of targetStories) {
  const family = families[story.conceptId];
  for (const scene of story.scenes) {
    const [focus, expression, result, prompt, rawChoices, answerIndex] = configs[scene.id];
    const choices = rawChoices.map((choice) => choice.length >= 4 ? choice : `${choice} 선택`);
    scene.motion = {
      version: 1,
      mode: "plot",
      focus,
      instruction: family.instruction,
      beats: [
        { id: `${scene.id}-locate`, action: "highlight", target: focus, expression, result: "대상 고정", caption: `먼저 ${focus}을 화면에서 찾습니다.`, durationMs: 1_800 },
        { id: `${scene.id}-transform`, action: "transform", target: focus, expression, result, caption: scene.subtitle, durationMs: 2_000 },
        { id: `${scene.id}-verify`, action: "verify", target: result, expression: `${expression} → ${result}`, result, caption: `${result}가 문제의 주소·범위·경계 조건과 맞는지 다시 확인합니다.`, durationMs: 1_900 },
      ],
      mild: { explanation: `${scene.subtitle} ${family.mild}` },
      spicy: { explanation: `${family.spicy} 이 장면에서는 ${expression}에서 ${result}로 가는 조건을 고정합니다.` },
      check: {
        prompt,
        choices,
        answerIndex,
        correctFeedback: `맞아요. ${expression}에서 ${result}를 정확히 읽었습니다.`,
        retryFeedback: `${focus}을 먼저 가리킨 뒤 ${expression}과 ${result}의 관계를 다시 확인하세요.`,
      },
    };
  }
}

fs.writeFileSync(shardPath, `${JSON.stringify(shard, null, 2)}\n`);
console.log(`Authored algebra sequence motion: ${targetStories.length} stories / ${targetSceneIds.size} scenes`);
