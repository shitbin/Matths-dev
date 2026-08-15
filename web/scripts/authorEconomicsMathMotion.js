#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const target = path.join(root, "content_folder", "curriculum-stories", "economics-math.json");

const profiles = Object.freeze({
  "economics-math-01-01": { mode: "plot", rule: "지표의 기준시점·수준·변화율을 분리하고 비교하려는 두 시점의 비율을 같은 축에서 계산합니다.", focuses: ["기준 100과 현재 지표의 거리", "120→126의 변화율 분모", "상승률 둔화와 수준 하락의 차이", "같은 장바구니의 두 시점 가격", "이름·기준·수준·속도"] },
  "economics-math-01-02": { mode: "equation", rule: "환율의 분자·분모 통화 단위를 화살표에 적고 목적 통화만 남도록 곱셈 방향을 고릅니다.", focuses: ["1달러당 원화 가격표", "500달러×원/달러", "숫자 크기와 통화 강도의 차이", "외화 원가→관세·비용→원화 원가", "통화 단위 소거 화살표"] },
  "economics-math-01-03": { mode: "blocks", rule: "세전 금액·과세표준·구간별 세액·세후 금액을 서로 다른 상자로 나누어 누진 규칙을 적용합니다.", focuses: ["세율 앞의 과세표준", "세금 포함 가격의 역산", "한계세율과 평균세율의 차이", "구간별 과세표준 색칠", "세전·과세·세후 세 상자"] },
  "economics-math-01-04": { mode: "graph", rule: "모든 현금흐름을 같은 시점으로 옮기고 단리·복리·기간단위가 일치할 때만 값을 비교합니다.", focuses: ["원금만 이자 vs 이자에도 이자", "미래 105만 원의 현재가치", "연이율과 월기간 단위 불일치", "두 약속의 공통 기준시점", "성장 화살표와 할인 화살표"] },
  "economics-math-01-05": { mode: "graph", rule: "각 지급액의 시점과 할인 횟수를 따로 표시한 뒤 현재시점에서만 합산합니다.", focuses: ["시간축 위 여러 지급 구슬", "선불·후불의 첫 지급 시점", "명목 합계와 현재가치의 차이", "세 지급액의 개별 할인", "지급액→할인횟수→현재가치 합"] },
  "economics-math-02-01": { mode: "blocks", rule: "경제 문장의 입력·출력·규칙·정의역을 먼저 고정하고 수입−비용으로 이윤을 연결합니다.", focuses: ["가격·수량 입력과 출력", "q=0에서도 남는 고정비", "상관관계와 함수규칙의 차이", "R(q)·C(q)·P(q)=R-C", "입력→규칙→출력→범위"] },
  "economics-math-02-02": { mode: "graph", rule: "가격축을 움직일 때 곡선 위 이동과 곡선 전체 이동을 구분하고 수요·공급의 반대 방향을 같은 좌표에 그립니다.", focuses: ["하향 수요와 상향 공급", "가격 변화에 따른 수요량 변화", "곡선 위 이동 vs 곡선 이동", "표의 점을 잇는 두 경사", "가격 슬라이더와 반대 두 화살표"] },
  "economics-math-02-03": { mode: "graph", rule: "총효용의 높이와 한계효용의 기울기를 나누어 표시하고 추가 만족이 0이 되는 지점을 찾습니다.", focuses: ["소비량과 총효용 눈금", "증가하는 총효용·감소하는 한계효용", "서로 다른 사람 효용의 비교 한계", "간식 만족 곡선의 평평한 지점", "총효용 높이와 한계효용 경사"] },
  "economics-math-02-04": { mode: "graph", rule: "수요량과 공급량이 같은 교점을 찾고 교점 좌우의 초과수요·초과공급 방향을 확인합니다.", focuses: ["수요·공급 두 계획의 교점", "Qd(P)=Qs(P)", "균형과 공정성 판단의 분리", "남음·모자람의 수량 차이", "초과공급↓가격·초과수요↑가격"] },
  "economics-math-02-05": { mode: "graph", rule: "원인이 어느 곡선을 어느 방향으로 이동시키는지 먼저 정하고 이동 후 교점을 다시 계산합니다.", focuses: ["곡선 하나의 평행 이동", "구매가격과 판매수취가격의 쐐기", "정상재·열등재와 소득 변화", "이동 전후 장보기 교점", "원인→곡선 이동→새 교점"] },
  "economics-math-02-06": { mode: "geometry", rule: "각 제약식을 경계선으로 그리고 시험점으로 허용 반평면을 고른 뒤 꼭짓점에서 목적함수를 비교합니다.", focuses: ["자원별 제약 경계", "시험점으로 고른 부등식 방향", "경계점과 최적점의 차이", "겹친 영역의 네 꼭짓점", "가능영역→꼭짓점→목적함수"] },
  "economics-math-03-01": { mode: "blocks", rule: "행·열의 경제 의미와 차원을 먼저 붙이고 덧셈은 같은 자리, 곱셈은 안쪽 차원 연결로 수행합니다.", focuses: ["행·열 이름이 붙은 자료 쟁반", "같은 차원 행렬의 덧셈", "원소별 곱과 행렬곱의 차이", "판매량 행렬×가격 열벡터", "행 의미·열 의미·차원"] },
  "economics-math-03-02": { mode: "blocks", rule: "행렬식이 0이 아닌지 확인하고 원행렬과 후보 역행렬의 곱이 단위행렬인지 검산합니다.", focuses: ["섞는 행렬과 되감는 행렬", "det A=0의 정보 겹침", "원소 역수와 역행렬의 차이", "상품 묶음에서 낱개 수량 복원", "행렬식→역행렬→단위행렬"] },
  "economics-math-03-03": { mode: "equation", rule: "경제 조건을 Ax=b로 번역하고 해를 구한 뒤 비음수·정수·용량 같은 현장 조건에 다시 대입합니다.", focuses: ["여러 문장을 Ax=b로 압축", "표 수와 총액의 두 조건", "대수적 해와 실행가능성의 차이", "생산 혼합비의 역행렬 풀이", "문장→행렬→해→현장 검산"] },
  "economics-math-04-01": { mode: "graph", rule: "총량 곡선의 한 점에서 접선 기울기를 읽고 평균량과 한계량의 분모를 구분합니다.", focuses: ["총액 곡선의 순간 경사", "50번째 근처의 추가 비용", "평균비용 C/q와 한계비용 C′", "가격 하락을 포함한 MR", "총량→미분→다음 한 단위"] },
  "economics-math-04-02": { mode: "graph", rule: "도함수의 영점을 기준으로 구간을 나누고 각 구간 부호를 원함수의 오르막·내리막으로 복원합니다.", focuses: ["도함수 부호 표지판", "비용 곡선의 방향 전환 후보", "f′=0과 극값 확정의 차이", "이윤함수의 증가·감소표", "영점→부호→증감→극값"] },
  "economics-math-04-03": { mode: "graph", rule: "기울기에 현재 가격과 수량의 비율을 곱해 단위를 없애고 탄력성 절댓값과 총수입 변화를 연결합니다.", focuses: ["퍼센트 변화로 맞춘 두 단위", "같은 곡선의 위치별 탄력성", "기울기와 탄력성의 차이", "가격대별 |E|와 총수입", "기울기×P/Q의 무단위 보정"] },
  "economics-math-04-04": { mode: "graph", rule: "MR=MC 후보를 찾고 이윤의 부호변화·경계·수요제약을 통과한 생산량만 최적점으로 확정합니다.", focuses: ["이윤 곡선의 가장 높은 지점", "한계수입과 한계비용의 교점", "일계조건과 충분조건의 차이", "가격함수→수입→비용→이윤", "후보→부호변화→현실 제약"] },
});

const plans = Object.freeze({
  intuition: { actions: ["place", "point", "verify"], captions: ["경제 문장의 숫자를 계산하기 전에 시간·단위·축·현금흐름의 자리를 먼저 펼칩니다.", "지금 판단에 쓰는 기준점·교점·경사·단위를 연필 포인터와 강조판으로 하나씩 짚습니다.", "가격·기간·생산량을 바꿔도 정의와 방향이 유지되는지 쉬운 극단값에서 확인합니다."] },
  question: { actions: ["point", "transform", "verify"], captions: ["질문의 입력·출력·기준시점과 구하려는 경제량을 각각 표시합니다.", "단위를 소거하거나 곡선을 이동시키며 문장을 식과 그림에 동시에 옮깁니다.", "답의 단위와 경제적 방향이 원래 질문에 맞는지 확인합니다."] },
  misconception: { actions: ["highlight", "transform", "verify"], captions: ["그럴듯한 오해를 노란 경고판에 올리고 빠진 기준·단위·조건을 밑줄로 표시합니다.", "정의식이나 반례 수치를 넣어 잘못 일반화한 범위를 원래 경계로 되돌립니다.", "같은 함정을 피할 수 있는 한 줄 검산 기준으로 바꾸어 확인합니다."] },
  solution: { actions: ["place", "transform", "verify"], captions: ["주어진 가격·수량·기간·제약을 식과 그림의 정확한 자리에 놓습니다.", "중간값을 생략하지 않고 단위 변환·교점·행렬·미분 계산을 한 단계씩 진행합니다.", "계산 결과를 현금흐름·시장·생산 의사결정에 다시 대입해 실행 가능한지 확인합니다."] },
  recall: { actions: ["highlight", "group", "verify"], captions: ["공식 이름보다 기준시점·단위·입력과 출력의 관계를 먼저 되살립니다.", "그림에서 볼 것, 식에서 계산할 것, 현실에서 제한할 것을 한 동선으로 묶습니다.", "새 숫자가 와도 그대로 적용할 판정 순서를 입으로 다시 확인합니다."] },
});

function normalize(value) { return String(value || "").replace(/\s+/gu, " ").trim(); }
function compact(value, maximum) { const text = normalize(value); return text.length > maximum ? `${text.slice(0, maximum - 1)}…` : text; }
function sentences(value) { return normalize(value).match(/[^.!?。！？…]+(?:[.!?。！？]+|…+|$)/gu) || []; }

function buildChoices(story, sceneIndex) {
  const correct = story.scenes[sceneIndex].subtitle;
  const choices = [story.scenes[(sceneIndex + 2) % 5].subtitle, story.scenes[(sceneIndex + 3) % 5].subtitle];
  const answerIndex = (sceneIndex + 2) % 3;
  choices.splice(answerIndex, 0, correct);
  return { choices, answerIndex };
}

function buildMotion(story, scene, sceneIndex, profile) {
  const focus = profile.focuses[sceneIndex];
  const plan = plans[scene.kind];
  if (!focus || !plan) throw new Error(`${story.conceptId}/${scene.id} 저작 프로필이 없습니다.`);
  const narrationSentences = sentences(scene.narration);
  const expressions = [scene.title, narrationSentences[0], narrationSentences.at(-1)].map((value) => compact(value || scene.subtitle, 104));
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
    mild: { explanation: `${scene.subtitle} 화면에서는 “${focus}” 하나만 먼저 찾습니다. ${profile.rule}` },
    spicy: { explanation: `${profile.rule} 기준시점·단위·정의역·현실 제약 중 하나라도 어긋나면 숫자가 맞아 보여도 결론을 확정하지 않습니다.` },
    check: {
      prompt: `“${scene.title}” 장면에서 가장 먼저 확인해야 할 경제수학 관계는 무엇인가요?`,
      choices,
      answerIndex,
      correctFeedback: `맞습니다. 먼저 표시할 대상은 “${focus}”입니다. 이어서 ${scene.subtitle}`,
      retryFeedback: `선택한 문장은 다른 장면의 핵심입니다. 먼저 “${focus}”부터 찾으세요. 이어서 ${scene.subtitle}`,
    },
  };
}

function main() {
  const document = JSON.parse(fs.readFileSync(target, "utf8"));
  if (document.courseId !== "economics-math" || document.stories.length !== 18) throw new Error("경제수학 18개념 정본이 아닙니다.");
  document.stories = document.stories.map((story) => {
    const profile = profiles[story.conceptId];
    if (!profile || profile.focuses.length !== story.scenes.length) throw new Error(`${story.conceptId}의 5장면 저작 프로필이 불완전합니다.`);
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
  console.log("Authored economics math motion: 18 concepts, 90 scenes.");
}

main();
