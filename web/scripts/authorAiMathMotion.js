#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const target = path.join(root, "content_folder", "curriculum-stories", "ai-math.json");

const profiles = Object.freeze({
  "ai-math-01-01": { mode: "graph", rule: "입력 특성에 가중치를 곱해 점수를 만들고 예측 오차의 방향만큼 경계를 한 걸음 갱신합니다.", focuses: ["입력→예측→정답→오차 피드백", "학습 경험의 입력·정답 쌍", "정확도와 개념 이해의 차이", "x1w1+x2w2와 한 번의 갱신", "데이터 범위와 피드백 계약"] },
  "ai-math-01-02": { mode: "blocks", rule: "시대 이름보다 문제 표현·계산 규칙·데이터·검증 방식이 어떻게 바뀌었는지 네 줄로 비교합니다.", focuses: ["현실 질문을 계산 문제로 번역", "선형 경계가 못 나누는 패턴", "한 발명 영웅서사의 오류", "규칙·특성·학습으로 본 스팸 분류", "표현·계산·데이터·검증 렌즈"] },
  "ai-math-01-03": { mode: "plot", rule: "행 수보다 모집단·수집 과정·빠진 집단·목표 누출을 먼저 표시하고 학습·검증 자료를 분리합니다.", focuses: ["기록마다 다른 시간·위치·날씨", "목표시점에 실제 쓸 수 있는 특성", "큰 표본에 남는 구조적 편향", "급식 수요 표의 누락·누출", "대표성·품질·권리·목표 적합성"] },
  "ai-math-02-01": { mode: "blocks", rule: "고정 어휘표를 좌표축으로 두고 각 문장을 같은 순서의 빈도 벡터로 바꾼 뒤 비교합니다.", focuses: ["단어 서랍과 빈도 좌표", "등장 여부와 반복 횟수", "같은 단어 수와 다른 문맥", "세 문장의 네 칸 벡터", "어휘표 순서와 벡터 좌표"] },
  "ai-math-02-02": { mode: "equation", rule: "문서 안 빈도 TF와 전체 문서에서의 희소성 IDF를 곱해 구별력 있는 단어의 무게를 만듭니다.", focuses: ["모든 문서에 흔한 단어의 낮은 구별력", "TF×log(N/df)", "희소하지만 무의미한 단어", "미분과 수업의 TF-IDF 비교", "문서 안 빈도×문서 밖 희소성"] },
  "ai-math-02-03": { mode: "geometry", rule: "두 문서 벡터를 길이로 정규화해 끼인각의 코사인을 구하고 부정어·문맥 판단은 별도로 남깁니다.", focuses: ["길이 대신 방향을 보는 코사인", "유사도와 감정 분류의 다른 목표", "단어 겹침과 의미·감정의 차이", "두 후기 벡터와 부정 표현", "코사인 수치 뒤 문맥 재검토"] },
  "ai-math-03-01": { mode: "blocks", rule: "이미지를 행·열·채널의 3차원 좌표로 펼치고 각 픽셀 값이 가리키는 위치와 색을 연결합니다.", focuses: ["사진을 이루는 작은 색 타일", "행·열 위치와 RGB 채널", "픽셀 하나와 사물 의미의 차이", "2×3 명암 행렬", "격자·값 범위·채널 순서"] },
  "ai-math-03-02": { mode: "blocks", rule: "한 픽셀 연산과 이웃 커널 연산을 구분하고 결과를 허용 범위 0~255 안으로 자릅니다.", focuses: ["모든 칸에 더하는 밝기 변환", "한 칸 연산과 이웃 필터", "255를 넘는 값의 포화", "네 픽셀+30과 clamp", "대상 칸·이웃 범위·출력 범위"] },
  "ai-math-03-03": { mode: "geometry", rule: "같은 크기·채널로 정렬한 두 이미지의 픽셀 차이를 재되, 위치 이동과 모양 의미의 한계를 따로 표시합니다.", focuses: ["새 이미지와 가까운 표본", "픽셀 거리와 지각적 닮음", "작은 거리와 같은 대상의 차이", "두 작은 행렬의 칸별 차이", "정렬→차이→거리→낯선 표본 확인"] },
  "ai-math-04-01": { mode: "plot", rule: "조건이 비슷했던 과거 사례 중 사건 횟수를 전체 횟수로 나누고 결과를 장기 빈도로 해석합니다.", focuses: ["70% 뒤의 과거 횟수", "내일과 비슷한 조건 집합", "확률과 단일 사건 확정의 차이", "결석 위험 횟수/전체와 행동 기준", "조건 아래 무엇 중 몇 번"] },
  "ai-math-04-02": { mode: "graph", rule: "산점도의 전체 방향을 직선으로 요약하고 기울기·절편·잔차·사용 범위를 함께 읽습니다.", focuses: ["점 무리의 중심 방향", "기울기와 절편의 현실 단위", "모든 점 통과와 좋은 일반화의 차이", "기온→음료수요 회귀선", "방향·잔차·보간 범위"] },
  "ai-math-04-03": { mode: "graph", rule: "각 예측의 실제값 차이를 제곱해 평균하고 같은 검증자료에서 손실을 비교합니다.", focuses: ["여러 오차를 모은 손실 점수판", "부호 상쇄를 막는 제곱", "학습손실과 새 자료 성능의 차이", "3·7에서 상수 예측의 MSE", "예측→오차→제곱→평균"] },
  "ai-math-04-04": { mode: "graph", rule: "현재 손실의 기울기를 구하고 그 반대 방향으로 학습률만큼 이동한 뒤 손실을 다시 잽니다.", focuses: ["손실 지형의 현재 위치와 경사", "방향과 보폭 학습률", "큰 학습률의 진동·발산", "w=0에서 목표 3으로 두 번 갱신", "기울기→반대 이동→재측정"] },
  "ai-math-05-01": { mode: "blocks", rule: "목표함수·제약조건·영향받는 집단을 공개하고 수학적 최적값과 책임 있는 선택을 분리합니다.", focuses: ["같은 선택지·다른 목적함수", "누구의 비용과 편익인가", "최고 점수와 책임의 차이", "냉방 에너지·불편·형평성 표", "목표→제약→집단 영향→책임"] },
  "ai-math-05-02": { mode: "blocks", rule: "답할 수 있는 질문에서 시작해 자료·기준선·평가·한계·윤리를 한 장의 탐구 설계로 연결합니다.", focuses: ["모델 이름보다 먼저 쓰는 질문", "작고 측정 가능하고 안전한 범위", "정확도 하나와 탐구 완결성의 차이", "다음 날 전력 사용 예측 설계", "질문→자료→평가→한계→공개"] },
});

const plans = Object.freeze({
  intuition: { actions: ["place", "point", "verify"], captions: ["AI라는 이름을 가리고 입력·숫자표현·계산·출력의 실제 흐름부터 펼칩니다.", "지금 변하는 특성·가중치·픽셀·확률을 연필 포인터와 색판으로 하나씩 짚습니다.", "새 자료나 극단값을 넣어 같은 해석이 유지되는지 확인합니다."] },
  question: { actions: ["point", "transform", "verify"], captions: ["질문이 요구하는 입력·목표·비교 기준을 서로 다른 칸에 놓습니다.", "문장·이미지·사례를 벡터나 행렬·확률·손실로 옮기며 좌표의 뜻을 잃지 않습니다.", "계산이 원래 질문에 답하는지와 새 자료에도 쓸 수 있는지 확인합니다."] },
  misconception: { actions: ["highlight", "transform", "verify"], captions: ["자동화에 대한 그럴듯한 오해를 노란 경고판에 그대로 올립니다.", "반례 데이터와 정의식을 넣어 정확도·유사도·확률·최적화가 말할 수 있는 범위로 되돌립니다.", "사람의 책임과 자료 한계를 포함한 한 줄 검산 기준으로 확인합니다."] },
  solution: { actions: ["place", "transform", "verify"], captions: ["특성·가중치·행렬값·실제값을 계산판의 정확한 자리에 놓습니다.", "벡터화·거리·손실·갱신을 중간 수치와 단위를 보이며 한 단계씩 진행합니다.", "출력값을 원래 사례와 검증 자료에 되돌려 의미와 오류를 확인합니다."] },
  recall: { actions: ["highlight", "group", "verify"], captions: ["도구 이름보다 입력이 어떻게 숫자가 되고 무엇과 비교되는지 먼저 되살립니다.", "표현·계산·평가·한계를 한 방향의 학습 흐름으로 묶습니다.", "새 문제에도 그대로 쓸 수 있는 질문 순서를 입으로 다시 확인합니다."] },
});

function normalize(value) { return String(value || "").replace(/\s+/gu, " ").trim(); }
function compact(value, maximum) { const text = normalize(value); return text.length > maximum ? `${text.slice(0, maximum - 1)}…` : text; }
function sentences(value) { return normalize(value).match(/[^.!?。！？…]+(?:[.!?。！？]+|…+|$)/gu) || []; }
function buildChoices(story, sceneIndex) { const correct=story.scenes[sceneIndex].subtitle; const choices=[story.scenes[(sceneIndex+2)%5].subtitle,story.scenes[(sceneIndex+4)%5].subtitle]; const answerIndex=sceneIndex%3; choices.splice(answerIndex,0,correct); return {choices,answerIndex}; }

function buildMotion(story, scene, sceneIndex, profile) {
  const focus=profile.focuses[sceneIndex]; const plan=plans[scene.kind];
  if (!focus || !plan) throw new Error(`${story.conceptId}/${scene.id} 저작 프로필이 없습니다.`);
  const narrationSentences=sentences(scene.narration);
  const expressions=[scene.title,narrationSentences[0],narrationSentences.at(-1)].map((value)=>compact(value||scene.subtitle,104));
  const {choices,answerIndex}=buildChoices(story,sceneIndex);
  return {
    version:1, mode:profile.mode, focus, instruction:profile.rule,
    beats:["focus","connect","verify"].map((name,beatIndex)=>({ id:`${scene.id}-${name}`, action:plan.actions[beatIndex], target:beatIndex===1?compact(scene.subtitle,58):focus, expression:expressions[beatIndex], result:beatIndex===0?compact(scene.subtitle,104):compact(profile.rule,104), caption:plan.captions[beatIndex], durationMs:[1900,2300,2300][beatIndex] })),
    mild:{ explanation:`${scene.subtitle} 화면에서는 “${focus}” 하나만 먼저 찾습니다. ${profile.rule}` },
    spicy:{ explanation:`${profile.rule} 표현·평가자료·오차 기준·영향받는 사람 중 하나라도 빠지면 높은 점수만으로 판단을 확정하지 않습니다.` },
    check:{ prompt:`“${scene.title}” 장면에서 가장 먼저 확인해야 할 AI수학 관계는 무엇인가요?`, choices, answerIndex, correctFeedback:`맞습니다. 먼저 표시할 대상은 “${focus}”입니다. 이어서 ${scene.subtitle}`, retryFeedback:`선택한 문장은 다른 장면의 핵심입니다. 먼저 “${focus}”부터 찾으세요. 이어서 ${scene.subtitle}` },
  };
}

function main() {
  const document=JSON.parse(fs.readFileSync(target,"utf8"));
  if (document.courseId!=="ai-math" || document.stories.length!==15) throw new Error("AI수학 15개념 정본이 아닙니다.");
  document.stories=document.stories.map((story)=>{
    const profile=profiles[story.conceptId];
    if (!profile || profile.focuses.length!==story.scenes.length) throw new Error(`${story.conceptId}의 5장면 저작 프로필이 불완전합니다.`);
    return {...story,revision:story.revision+(story.scenes.every((scene)=>scene.motion)?0:1),scenes:story.scenes.map((scene,sceneIndex)=>({id:scene.id,kind:scene.kind,title:scene.title,motion:buildMotion(story,scene,sceneIndex,profile),subtitle:scene.subtitle,narration:scene.narration,studioScript:scene.studioScript}))};
  });
  fs.writeFileSync(target,`${JSON.stringify(document,null,2)}\n`);
  console.log("Authored AI math motion: 15 concepts, 75 scenes.");
}

main();
