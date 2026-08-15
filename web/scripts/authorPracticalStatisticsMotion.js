#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const target = path.join(root, "content_folder", "curriculum-stories", "practical-statistics.json");

const profiles = Object.freeze({
  "practical-statistics-01-01": {
    mode: "plot",
    rule: "대표값 하나가 아니라 값의 흔들림과 늦을 위험을 함께 표시해 결정을 만듭니다.",
    focuses: ["같은 노선에서 달라지는 도착 시간", "대상·변수·변이성이 있는 질문", "한 사례와 대표 자료의 차이", "평균 대기와 지각 위험", "대상→변수→수집→불확실성"],
  },
  "practical-statistics-01-02": {
    mode: "blocks",
    rule: "문제 설정에서 해석까지 이어진 근거 사슬을 그리고 결론이 다시 질문으로 돌아가게 합니다.",
    focuses: ["문제→수집→분석→해석의 순환", "잔반의 대상·변수·비교 기준", "질문보다 먼저 고른 그래프", "같은 기준의 한 주 잔반 분포", "결론에서 질문으로 역추적"],
  },
  "practical-statistics-01-03": {
    mode: "plot",
    rule: "모집단과 표집틀을 분리하고 각 집단의 선택 기회와 무응답을 표본 옆에 표시합니다.",
    focuses: ["섞인 냄비와 대표 표본", "모집단·표집틀·선택 확률", "편향된 천 명과 공정한 백 명", "지역·시간대 층화 표집", "결론의 주어와 표본 명단"],
  },
  "practical-statistics-02-01": {
    mode: "blocks",
    rule: "이름·순서·같은 간격·참된 영점의 네 칸을 통과한 만큼만 계산을 허용합니다.",
    focuses: ["번호와 수량의 역할 차이", "명목·순서·구간·비율 네 칸", "만족도 코드와 같은 간격의 부재", "변수 사전의 단위·결측·척도", "척도별 허용 연산"],
  },
  "practical-statistics-02-02": {
    mode: "blocks",
    rule: "묘사·관계·원인 중 주장할 동사를 먼저 고른 뒤 관찰·설문·실험을 연결합니다.",
    focuses: ["행동·경험·원인에 맞는 렌즈", "관계를 묻는가 원인을 묻는가", "유도 문구·회상·측정 오차", "동일 시간창과 익명 집중력 검사", "주장 동사→방법→오차·윤리"],
  },
  "practical-statistics-02-03": {
    mode: "plot",
    rule: "변수형과 목적에 맞는 그래프를 고르고 축·눈금·구간 폭이 인상을 왜곡하지 않는지 검산합니다.",
    focuses: ["비교·구성·분포·관계의 렌즈", "변수 수와 보여 줄 특징", "잘린 축이 만든 가짜 절벽", "히스토그램과 산점도의 역할 분리", "종류→목적→축→맥락"],
  },
  "practical-statistics-02-04": {
    mode: "plot",
    rule: "분포 모양을 먼저 그린 뒤 중심과 산포도를 같은 단위의 한 쌍으로 보고합니다.",
    focuses: ["같은 평균·다른 흩어짐", "평균·표준편차와 중앙값·IQR", "극단값·두 봉우리의 은폐", "다섯 수 요약과 지연 비율", "분포→중심→산포→위험"],
  },
  "practical-statistics-03-01": {
    mode: "graph",
    rule: "평균·표준편차·자유도를 조절하며 정규곡선과 t곡선의 중심과 꼬리를 겹쳐 비교합니다.",
    focuses: ["평균 주변의 종 모양과 양쪽 꼬리", "모표준편차 미상과 t의 두꺼운 꼬리", "치우침·극단값·의존성", "자유도에 따라 줄어드는 꼬리 차이", "독립성·모양·σ 정보·표본 크기"],
  },
  "practical-statistics-03-02": {
    mode: "plot",
    rule: "표본평균을 중심에 놓고 t임계값과 표준오차를 곱한 오차 한계를 양쪽에 붙입니다.",
    focuses: ["점추정 대신 흔들림을 품은 구간", "신뢰수준과 임계값의 폭", "고정된 모평균과 반복 구간", "6.8±t*·1/√25", "중심±임계값×표준오차"],
  },
  "practical-statistics-03-03": {
    mode: "plot",
    rule: "성공 수와 전체 수에서 표본비율·표준오차·오차 한계를 차례로 만들고 조사 편향은 별도 경고합니다.",
    focuses: ["표본마다 흔들리는 착용 비율", "성공·실패 수와 정규 근사 조건", "무작위 오차와 조사 편향의 분리", "0.58±1.96√(p̂(1-p̂)/400)", "성공 수·전체 수·모집단"],
  },
  "practical-statistics-03-04": {
    mode: "graph",
    rule: "귀무가설의 기준선에서 관측 통계량까지의 거리와 그보다 극단적인 꼬리 넓이를 p값으로 칠합니다.",
    focuses: ["효과 없음 세계와 관측 자료", "귀무·대립·방향·유의수준", "p값과 귀무가설 확률의 차이", "t통계량·꼬리 p값·효과 크기", "가정→거리→드묾→맥락"],
  },
  "practical-statistics-04-01": {
    mode: "blocks",
    rule: "질문·자료원·분석·비용·선택을 한 근거 사슬로 연결하고 사전 기준으로 대안을 비교합니다.",
    focuses: ["요청에서 결정까지의 근거 사슬", "성공 변수·대안·비용 한계", "찬성 비율과 실제 행동의 차이", "설문·출입·시범 운영 대시보드", "목표→설계→분석→선택→평가"],
  },
  "practical-statistics-04-02": {
    mode: "blocks",
    rule: "결론에서 질문으로 역주행하며 대표성·표현·대안 분석·재현 가능성의 약한 고리를 표시합니다.",
    focuses: ["결론에서 질문으로 되감기", "질문·대표성·표현·일반화의 네 문", "마음에 드는 결과만 남긴 선택", "정제 규칙·대안 분석·재현 절차", "아는 범위와 모르는 범위의 경계"],
  },
});

const plans = Object.freeze({
  intuition: {
    actions: ["place", "point", "verify"],
    captions: ["사례의 숫자를 바로 평균내지 않고, 먼저 값이 움직이는 범위와 자료가 생긴 과정을 펼칩니다.", "지금 판단에 필요한 대상·변수·축을 연필 포인터와 밑줄로 한 번에 하나씩 짚습니다.", "같은 결론이 다른 표본이나 극단값에서도 유지되는지 반례 위치에서 확인합니다."],
  },
  question: {
    actions: ["point", "group", "verify"],
    captions: ["질문의 주어·측정값·비교 대상을 각각 다른 칸에 놓습니다.", "자료가 답할 수 있는 범위와 답할 수 없는 인과 주장을 선으로 분리합니다.", "표본·단위·조건을 바꿔도 질문의 의미가 유지되는지 확인합니다."],
  },
  misconception: {
    actions: ["highlight", "transform", "verify"],
    captions: ["그럴듯한 오해를 노란 경고판에 그대로 올리고 어떤 정보가 생략됐는지 표시합니다.", "축·표본·분포·확률의 정확한 뜻을 대입해 잘못 넓힌 결론을 원래 범위로 되돌립니다.", "다음 자료에서도 쓸 수 있는 한 줄 경고 기준으로 바꾸어 확인합니다."],
  },
  solution: {
    actions: ["place", "transform", "verify"],
    captions: ["주어진 수·표본 크기·단위를 계산판의 정확한 자리에 먼저 놓습니다.", "중심·표준오차·임계값 또는 비교 기준을 단계별로 조립하며 중간 수치를 숨기지 않습니다.", "계산값을 원래 모집단과 의사 결정 문장으로 되돌려 범위를 검산합니다."],
  },
  recall: {
    actions: ["highlight", "group", "verify"],
    captions: ["공식 이름보다 자료가 태어난 과정과 질문의 주어를 먼저 되살립니다.", "그림에서 볼 것, 계산에서 볼 것, 결론에서 제한할 것을 한 동선으로 묶습니다.", "새 자료가 와도 그대로 쓸 수 있는 판정 순서를 입으로 다시 확인합니다."],
  },
});

function normalize(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function compact(value, maximum) {
  const text = normalize(value);
  return text.length > maximum ? `${text.slice(0, maximum - 1)}…` : text;
}

function sentences(value) {
  return normalize(value).match(/[^.!?。！？…]+(?:[.!?。！？]+|…+|$)/gu) || [];
}

function buildChoices(story, sceneIndex) {
  const correct = story.scenes[sceneIndex].subtitle;
  const distractors = [story.scenes[(sceneIndex + 2) % 5].subtitle, story.scenes[(sceneIndex + 3) % 5].subtitle];
  const answerIndex = (sceneIndex + 1) % 3;
  const choices = [...distractors];
  choices.splice(answerIndex, 0, correct);
  return { choices, answerIndex };
}

function buildMotion(story, scene, sceneIndex, profile) {
  const focus = profile.focuses[sceneIndex];
  const plan = plans[scene.kind];
  if (!focus || !plan) throw new Error(`${story.conceptId}/${scene.id} 저작 프로필이 없습니다.`);
  const narrationSentences = sentences(scene.narration);
  const expressions = [scene.title, narrationSentences[0], narrationSentences.at(-1)]
    .map((value) => compact(value || scene.subtitle, 104));
  const { choices, answerIndex } = buildChoices(story, sceneIndex);

  return {
    version: 1,
    mode: profile.mode,
    focus,
    instruction: profile.rule,
    beats: ["focus", "connect", "verify"].map((name, beatIndex) => ({
      id: `${scene.id}-${name}`,
      action: plan.actions[beatIndex],
      target: beatIndex === 1 ? compact(scene.subtitle, 58) : focus,
      expression: expressions[beatIndex],
      result: beatIndex === 0 ? compact(scene.subtitle, 104) : compact(profile.rule, 104),
      caption: plan.captions[beatIndex],
      durationMs: [1_900, 2_300, 2_300][beatIndex],
    })),
    mild: {
      explanation: `${scene.subtitle} 화면에서는 “${focus}” 하나만 먼저 찾습니다. ${profile.rule}`,
    },
    spicy: {
      explanation: `${profile.rule} 표본·축·단위·결론 범위 중 하나라도 어긋나면 계산이 맞아 보여도 판단을 확정하지 않습니다.`,
    },
    check: {
      prompt: `“${scene.title}” 장면에서 가장 먼저 확인해야 할 통계 관계는 무엇인가요?`,
      choices,
      answerIndex,
      correctFeedback: `맞습니다. 먼저 표시할 대상은 “${focus}”입니다. 이어서 ${scene.subtitle}`,
      retryFeedback: `선택한 문장은 다른 장면의 핵심입니다. 먼저 “${focus}”부터 찾으세요. 이어서 ${scene.subtitle}`,
    },
  };
}

function main() {
  const document = JSON.parse(fs.readFileSync(target, "utf8"));
  if (document.courseId !== "practical-statistics" || document.stories.length !== 13) {
    throw new Error("실용통계 13개념 정본이 아닙니다.");
  }
  document.stories = document.stories.map((story) => {
    const profile = profiles[story.conceptId];
    if (!profile || profile.focuses.length !== story.scenes.length) {
      throw new Error(`${story.conceptId}의 5장면 저작 프로필이 불완전합니다.`);
    }
    return {
      ...story,
      revision: story.revision + (story.scenes.every((scene) => scene.motion) ? 0 : 1),
      scenes: story.scenes.map((scene, sceneIndex) => ({
        id: scene.id,
        kind: scene.kind,
        title: scene.title,
        motion: buildMotion(story, scene, sceneIndex, profile),
        subtitle: scene.subtitle,
        narration: scene.narration,
        studioScript: scene.studioScript,
      })),
    };
  });
  fs.writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
  console.log("Authored practical statistics motion: 13 concepts, 65 scenes.");
}

main();
