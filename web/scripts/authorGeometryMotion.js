#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const target = path.join(root, "content_folder", "curriculum-stories", "geometry.json");

const profiles = Object.freeze({
  "geometry-01-01": {
    mode: "graph",
    rule: "점 P에서 초점 F까지의 거리와 준선까지의 수선 거리를 같은 화면에서 비교합니다.",
    focuses: ["초점 F·준선·점 P의 동거리", "거리식에서 y²=4px가 생기는 과정", "방향·꼭짓점·초점·준선", "p=2와 꼭짓점 O", "제곱되지 않은 변수와 열린 방향"],
  },
  "geometry-01-02": {
    mode: "graph",
    rule: "두 초점까지의 거리 합과 큰 분모가 가리키는 장축을 한 그림에서 연결합니다.",
    focuses: ["두 초점 거리의 합", "a·b·c와 장축", "c<a인 안쪽 초점", "a=5·b=3·c=4", "큰 분모→긴 축→초점"],
  },
  "geometry-01-03": {
    mode: "graph",
    rule: "거리 차의 절댓값, 양의 항의 축, 점근선을 서로 다른 표식으로 분리합니다.",
    focuses: ["두 초점 거리 차의 절댓값", "c²=a²+b²와 바깥 초점", "거리 차와 점근선", "a=3·b=4·c=5", "양의 항·두 가지·바깥 초점"],
  },
  "geometry-01-04": {
    mode: "graph",
    rule: "직선이 곡선과 만나는 두 점이 한 점으로 합쳐지는 순간을 식의 중근과 맞춥니다.",
    focuses: ["두 교점이 하나가 되는 경계", "접점과 중근 조건", "한 점 통과와 접선의 차이", "y²=8x와 y=x+2", "연립식의 판별식 D=0"],
  },
  "geometry-02-01": {
    mode: "geometry",
    rule: "공유점, 같은 방향, 공통 평면의 세 질문으로 공간의 위치 관계를 판정합니다.",
    focuses: ["교실 모서리의 공간 관계", "공유하는 점·선·평면", "원근 그림과 논리 근거", "공유점·방향·공통 평면", "점→방향→평면 판정 순서"],
  },
  "geometry-02-02": {
    mode: "geometry",
    rule: "공간의 높이 PH와 바닥 그림자 HQ를 같은 평면에 투영해 직각을 확인합니다.",
    focuses: ["높이·그림자·바닥 직선", "PH⊥평면·HQ⊥l·PQ⊥l", "높이 하나만으로 부족한 이유", "3·4·5 공간 수선", "평면의 발과 직선의 발"],
  },
  "geometry-02-03": {
    mode: "geometry",
    rule: "선분을 평면에 수직으로 내리고 원래 길이와 그림자 길이를 코사인으로 비교합니다.",
    focuses: ["수직 빛과 정사영", "정사영 길이 |v|cosθ", "평면각과 법선각", "10cos60°=5", "나란함·수직의 두 극단"],
  },
  "geometry-02-04": {
    mode: "geometry",
    rule: "x·y·z 변화량은 거리로, 두 끝점의 가중치는 내분점으로 각각 계산합니다.",
    focuses: ["x·y·z 세 방향 변화", "P=(nA+mB)/(m+n)", "제곱합 거리와 반대편 가중치", "A·B의 변화량과 2:1 내분", "거리의 차이·위치의 가중평균"],
  },
  "geometry-02-05": {
    mode: "geometry",
    rule: "중심에서 점까지의 세 좌표 차를 제곱합으로 묶고 오른쪽의 r²와 비교합니다.",
    focuses: ["중심 C와 고정 반지름 r", "x·y·z 완전제곱", "구면·구 내부·r²", "세 완전제곱과 중심 부호", "중심을 빼고 제곱한 거리"],
  },
  "geometry-03-01": {
    mode: "geometry",
    rule: "화살표를 평행이동해 길이와 방향을 보존하고, 머리와 꼬리를 이어 합을 만듭니다.",
    focuses: ["위치와 무관한 길이·방향", "머리-꼬리 벡터 합", "방향에 따라 달라지는 합의 크기", "a+b·a-b·-ka", "붙이기·뒤집기·늘이기"],
  },
  "geometry-03-02": {
    mode: "geometry",
    rule: "원점에서 각 점까지의 주소와 두 점 사이 이동 B-A를 서로 다른 화살표로 표시합니다.",
    focuses: ["원점 O를 공통 출발점으로", "AB=OB-OA", "점 좌표와 두 점 사이 벡터", "B-A와 중점", "원점 주소·도착-출발"],
  },
  "geometry-03-03": {
    mode: "geometry",
    rule: "한 벡터의 다른 방향 그림자와 성분곱의 합을 같은 내적 값으로 연결합니다.",
    focuses: ["다른 벡터 방향의 그림자", "a·b=|a||b|cosθ", "성분곱의 합은 스칼라", "성분곱의 합 0", "내적 부호와 각도"],
  },
  "geometry-03-04": {
    mode: "geometry",
    rule: "기준점 하나에 같은 매개변수 t로 방향벡터의 배수를 더해 직선 전체를 훑습니다.",
    focuses: ["기준점+방향×t", "세 좌표를 묶는 같은 t", "방향벡터와 법선벡터", "B-A=(3,2,-6)", "점·방향·이동량 t"],
  },
  "geometry-03-05": {
    mode: "geometry",
    rule: "평면은 점과 법선의 내적 0으로, 구는 중심과 고정 거리로 나누어 세웁니다.",
    focuses: ["평면을 고정하는 법선", "내적 0과 거리 제곱합", "평면 안 방향과 법선", "점·법선·중심·반지름", "평면 최소정보·구 최소정보"],
  },
});

const plans = Object.freeze({
  intuition: {
    actions: ["place", "point", "verify"],
    captions: [
      "비유의 겉모양보다 실제로 변하지 않는 조건을 먼저 화면에 놓습니다.",
      "움직이는 점·선·화살표 중 지금 판단에 쓰는 대상을 손가락으로 따라갑니다.",
      "처음 위치가 달라져도 같은 정의가 유지되는지 반례 위치에서 확인합니다.",
    ],
  },
  question: {
    actions: ["point", "transform", "verify"],
    captions: [
      "질문에 주어진 기호와 그림의 자리를 한 쌍씩 연결합니다.",
      "정의의 거리·각·방향 조건을 식으로 옮기며 중간 관계를 생략하지 않습니다.",
      "극단값이나 쉬운 좌표를 넣어 식과 그림이 같은 결론을 내는지 확인합니다.",
    ],
  },
  misconception: {
    actions: ["highlight", "transform", "verify"],
    captions: [
      "그럴듯하지만 틀린 판단을 노란 경고판에 먼저 그대로 올립니다.",
      "정의가 요구하는 거리·부호·방향을 다시 대입해 어긋나는 지점을 지웁니다.",
      "같은 함정을 피할 수 있도록 한 줄 판정 기준으로 바꾸어 확인합니다.",
    ],
  },
  solution: {
    actions: ["place", "transform", "verify"],
    captions: [
      "주어진 수와 좌표를 그림의 정확한 자리부터 표시합니다.",
      "그림의 관계를 식으로 옮기고 계산 결과를 다시 도형 위에 되돌려 놓습니다.",
      "단위·부호·위치·원래 정의를 모두 만족하는지 마지막에 역검산합니다.",
    ],
  },
  recall: {
    actions: ["highlight", "group", "verify"],
    captions: [
      "공식 이름보다 출발 조건을 먼저 한 장면으로 되살립니다.",
      "그림에서 볼 것, 식에서 볼 것, 마지막 검산을 한 동선으로 묶습니다.",
      "숫자가 바뀌어도 그대로 쓸 수 있는 판정 순서를 입으로 다시 확인합니다.",
    ],
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
  const distractors = [
    story.scenes[(sceneIndex + 2) % story.scenes.length].subtitle,
    story.scenes[(sceneIndex + 3) % story.scenes.length].subtitle,
  ];
  const answerIndex = sceneIndex % 3;
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
  const beatNames = ["focus", "connect", "verify"];

  return {
    version: 1,
    mode: profile.mode,
    focus,
    instruction: profile.rule,
    beats: beatNames.map((name, beatIndex) => ({
      id: `${scene.id}-${name}`,
      action: plan.actions[beatIndex],
      target: beatIndex === 1 ? compact(scene.subtitle, 58) : focus,
      expression: expressions[beatIndex],
      result: beatIndex === 0 ? compact(scene.subtitle, 104) : compact(profile.rule, 104),
      caption: plan.captions[beatIndex],
      durationMs: [1_800, 2_200, 2_300][beatIndex],
    })),
    mild: {
      explanation: `${scene.subtitle} 화면에서는 “${focus}” 하나만 먼저 찾고, ${profile.rule} 나머지 기호는 그다음에 연결합니다.`,
    },
    spicy: {
      explanation: `${profile.rule} 정의를 만족하지 않는 거리·부호·방향은 계산이 맞아 보여도 답에서 제외합니다.`,
    },
    check: {
      prompt: `“${scene.title}” 장면에서 가장 먼저 확인해야 할 관계는 무엇인가요?`,
      choices,
      answerIndex,
      correctFeedback: `맞습니다. 먼저 표시할 대상은 “${focus}”입니다. 이어서 ${scene.subtitle}`,
      retryFeedback: `선택한 문장은 다른 장면의 핵심입니다. 먼저 “${focus}”부터 찾으세요. 이어서 ${scene.subtitle}`,
    },
  };
}

function main() {
  const document = JSON.parse(fs.readFileSync(target, "utf8"));
  if (document.courseId !== "geometry" || document.stories.length !== 14) {
    throw new Error("기하 14개념 정본이 아닙니다.");
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
  console.log("Authored geometry motion: 14 concepts, 70 scenes.");
}

main();
