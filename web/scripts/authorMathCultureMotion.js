#!/usr/bin/env node
"use strict";

const fs=require("node:fs");
const path=require("node:path");
const target=path.join(path.resolve(__dirname,".."),"content_folder","curriculum-stories","math-and-culture.json");

const profiles=Object.freeze({
  "math-and-culture-01-01":{mode:"graph",rule:"현 길이의 역비와 주파수의 비를 같은 수직선에 놓고 음정은 차이가 아니라 비로 비교합니다.",focuses:["현 길이↓와 주파수↑의 역비","라 음×3/2의 완전5도","헤르츠 차이와 음정비의 차이","4:5:6 삼화음 주파수","주파수 비→음정→화음"]},
  "math-and-culture-01-02":{mode:"geometry",rule:"시점에서 화면까지의 닮은 삼각형과 꼭짓점 둘레 각의 합을 그려 원근과 타일링을 검산합니다.",focuses:["시점·화면·대상의 원근 삼각형","거리 3배와 화면 높이 역비","황금비와 미적 판단의 차이","정다각형 내각과 360°","닮음비·꼭짓점 한 바퀴"]},
  "math-and-culture-01-03":{mode:"blocks",rule:"음절·박자·반복 위치를 수열과 조합의 칸으로 세되 계산 뒤 작품의 맥락으로 돌아갑니다.",focuses:["뜻과 분리해 센 형식 단위","5박자를 채우는 조합","숫자 패턴과 작품 의미의 차이","후렴 위치 간 거리 수열","형식 계수→반복 구조→맥락"]},
  "math-and-culture-01-04":{mode:"plot",rule:"프레임 수=초×fps와 화면비=가로/세로를 분리하고 쇼트 길이는 분포로 비교합니다.",focuses:["시간축 위 프레임 기록","6.5초×24fps와 화면비","프레임률과 재생속도의 차이","쇼트 길이 히스토그램","시간은 곱하고 화면은 나누기"]},
  "math-and-culture-02-01":{mode:"graph",rule:"포물선 궤적의 꼭짓점과 기록의 성공 수/시도 수를 같은 표에서 서로 다른 지표로 읽습니다.",focuses:["공의 위치와 선수 기록 변수","10m에서 최고점인 포물선","45° 최대사거리의 조건","성공률과 표본 크기","궤적 꼭짓점·기록 분모"]},
  "math-and-culture-02-02":{mode:"blocks",rule:"무작위 결과는 확률나무와 기댓값으로, 순차 전략은 승리·패배 상태의 뒤쪽 귀납으로 풉니다.",focuses:["동전 결과 확률나무와 게임 상태","앞면 3·뒷면 -1의 기댓값","도박사의 오류와 독립 시행","돌 15개의 승리·패배 상태","우연=기댓값·전략=상태"]},
  "math-and-culture-02-03":{mode:"blocks",rule:"픽셀의 상태 수와 비트 수를 거듭제곱으로 세고 패리티는 오류 검출 규칙으로만 해석합니다.",focuses:["픽셀·채널을 0/1 스위치로","100×100×8bit 원시 크기","이진 표현과 압축의 차이","짝수 패리티의 홀짝 검사","상태 수 2^n·패리티 나머지"]},
  "math-and-culture-02-04":{mode:"blocks",rule:"같은 선호표에 다수제·점수제·결선 규칙을 각각 적용해 집계 규칙이 결과를 바꾸는 지점을 표시합니다.",focuses:["선호표와 집계 규칙","다수제 A와 결선의 역전","집계방식 중립성의 오류","목표에 맞는 대표성 기준","한 표·여러 집계 렌즈"]},
  "math-and-culture-03-01":{mode:"geometry",rule:"자리값은 밑의 거듭제곱으로, 무늬는 기본 조각의 평행이동·회전·대칭으로 해석합니다.",focuses:["생활 필요가 만든 수 체계·무늬","20진법 자리값 전개","다른 밑과 우열 판단의 차이","기본 조각과 변환 반복","밑의 거듭제곱·대칭 변환"]},
  "math-and-culture-03-02":{mode:"blocks",rule:"점 번호 조합을 6비트 상태로 바꾸고 가능한 상태 수와 실제 문자·사용성 규칙을 분리합니다.",focuses:["점자 6점의 켜짐·꺼짐","1·2·5번 점의 비트 표현","64상태와 문자수의 차이","점 패턴 표의 중복·가독성 검사","조합 수→부호 규칙→사용자 읽기"]},
  "math-and-culture-03-03":{mode:"plot",rule:"건수의 분모·표본기간·축 범위를 먼저 공개하고 단어 빈도와 의견 방향을 분리해 분포로 요약합니다.",focuses:["뉴스·댓글 자료의 수집 경계","18/40의 비율과 분모","단어 빈도와 찬반 의미의 차이","평균 대신 반응 분포","분모·축·기간·표본"]},
  "math-and-culture-03-04":{mode:"blocks",rule:"가격·내구성·환경·노동 기준을 같은 방향으로 정규화하고 가중치를 바꿔 선택의 민감도를 확인합니다.",focuses:["소비가치의 측정 기준","두 신발×네 기준 점수표","가중합과 객관적 정답의 차이","가중치 변화에 따른 순위 역전","기준 공개·민감도 검사"]},
  "math-and-culture-04-01":{mode:"blocks",rule:"총량을 사람 수·일수·끼니 수로 나누어 같은 단위로 환산하고 기준선 대비 변화를 추적합니다.",focuses:["큰 식량 총량을 한 끼 단위로","72kg→120g 환산의 분모","총량과 개인 습관의 차이","일주일 기준선과 작은 개입","kg→사람→하루→끼니"]},
  "math-and-culture-04-02":{mode:"plot",rule:"시간축의 원자료와 평균선을 함께 두고 조건별 구간을 나누어 변화와 원인 추정을 구분합니다.",focuses:["시간 위 농도 원자료","30·42·48의 평균","하루 상승과 인과 증명의 차이","통학 전후 조건별 변화","단위 통일·원자료·평균선"]},
  "math-and-culture-04-03":{mode:"graph",rule:"매년 같은 양 증가와 같은 비율 증가를 각각 일차·지수 모형으로 그리고 적용 기간을 제한합니다.",focuses:["지도 변화의 연도별 수열","1.06^5의 반복 증가","고정 증가율 무한 연장의 오류","증가율 완화 두 시나리오","차이=일차·비=거듭제곱"]},
  "math-and-culture-04-04":{mode:"plot",rule:"종수와 각 종 비율을 함께 표시하고 다양성 지수는 반복 조사 맥락 안에서만 비교합니다.",focuses:["풍부도와 균등도 두 축","네 종 비율 0.75 vs 0.48","지수와 생명가치 판단의 차이","같은 방형구 반복 조사표","종 수·비율 치우침·시간 변화"]},
});

const plans={
  intuition:{actions:["place","point","verify"],captions:["작품·놀이·사회·환경 사례를 측정 가능한 길이·비·좌표·횟수로 펼칩니다.","지금 봐야 할 비율·대칭·분모·시간축을 연필 포인터와 색판으로 하나씩 짚습니다.","형식 계산이 실제 맥락을 왜곡하지 않는지 다른 사례에서 확인합니다."]},
  question:{actions:["point","transform","verify"],captions:["질문의 문화적 대상과 수학적 단위를 서로 다른 칸에 놓습니다.","현상에서 수열·비·확률·좌표로 옮기는 중간 대응을 생략하지 않습니다.","계산 결과가 원래 작품·사용자·환경 질문에 답하는지 확인합니다."]},
  misconception:{actions:["highlight","transform","verify"],captions:["숫자로 설명할 수 있다는 말과 숫자가 의미를 대신한다는 말을 노란 판에서 분리합니다.","반례와 정의를 넣어 과장된 아름다움·공정성·인과·가치 판단을 원래 범위로 돌립니다.","수학 결과 뒤에 남겨야 할 맥락과 사람의 판단을 확인합니다."]},
  solution:{actions:["place","transform","verify"],captions:["길이·프레임·확률·비율·단위를 정확한 표와 그림 자리에 놓습니다.","중간 변환과 분모를 보이며 계산하고 결과를 시각 패턴으로 되돌립니다.","숫자의 단위·범위·문화적 해석이 함께 맞는지 검산합니다."]},
  recall:{actions:["highlight","group","verify"],captions:["공식보다 어떤 형식과 관계를 셌는지 먼저 되살립니다.","측정→계산→시각화→맥락 복귀를 한 동선으로 묶습니다.","새 사례에서도 쓸 수 있는 질문 순서를 입으로 다시 확인합니다."]},
};

const normalize=(v)=>String(v||"").replace(/\s+/gu," ").trim();
const compact=(v,n)=>{const t=normalize(v);return t.length>n?`${t.slice(0,n-1)}…`:t;};
const sentences=(v)=>normalize(v).match(/[^.!?。！？…]+(?:[.!?。！？]+|…+|$)/gu)||[];
function buildChoices(story,index){const correct=story.scenes[index].subtitle;const choices=[story.scenes[(index+2)%5].subtitle,story.scenes[(index+3)%5].subtitle];const answerIndex=(index+1)%3;choices.splice(answerIndex,0,correct);return{choices,answerIndex};}
function buildMotion(story,scene,index,profile){const focus=profile.focuses[index];const plan=plans[scene.kind];if(!focus||!plan)throw new Error(`${story.conceptId}/${scene.id} 저작 프로필이 없습니다.`);const ss=sentences(scene.narration);const expressions=[scene.title,ss[0],ss.at(-1)].map(v=>compact(v||scene.subtitle,104));const{choices,answerIndex}=buildChoices(story,index);return{version:1,mode:profile.mode,focus,instruction:profile.rule,beats:["focus","connect","verify"].map((name,i)=>({id:`${scene.id}-${name}`,action:plan.actions[i],target:i===1?compact(scene.subtitle,58):focus,expression:expressions[i],result:i===0?compact(scene.subtitle,104):compact(profile.rule,104),caption:plan.captions[i],durationMs:[1900,2300,2300][i]})),mild:{explanation:`${scene.subtitle} 화면에서는 “${focus}” 하나만 먼저 찾습니다. ${profile.rule}`},spicy:{explanation:`${profile.rule} 숫자가 설명하는 형식과 숫자 밖의 맥락을 분리하지 않으면 계산 결과를 가치 판단으로 확대하지 않습니다.`},check:{prompt:`“${scene.title}” 장면에서 가장 먼저 확인해야 할 수학·문화 관계는 무엇인가요?`,choices,answerIndex,correctFeedback:`맞습니다. 먼저 표시할 대상은 “${focus}”입니다. 이어서 ${scene.subtitle}`,retryFeedback:`선택한 문장은 다른 장면의 핵심입니다. 먼저 “${focus}”부터 찾으세요. 이어서 ${scene.subtitle}`}};}
function main(){const doc=JSON.parse(fs.readFileSync(target,"utf8"));if(doc.courseId!=="math-and-culture"||doc.stories.length!==16)throw new Error("수학과 문화 16개념 정본이 아닙니다.");doc.stories=doc.stories.map(story=>{const profile=profiles[story.conceptId];if(!profile||profile.focuses.length!==5)throw new Error(`${story.conceptId} 프로필이 불완전합니다.`);return{...story,revision:story.revision+(story.scenes.every(s=>s.motion)?0:1),scenes:story.scenes.map((scene,index)=>({id:scene.id,kind:scene.kind,title:scene.title,motion:buildMotion(story,scene,index,profile),subtitle:scene.subtitle,narration:scene.narration,studioScript:scene.studioScript}))};});fs.writeFileSync(target,`${JSON.stringify(doc,null,2)}\n`);console.log("Authored math and culture motion: 16 concepts, 80 scenes.");}
main();
