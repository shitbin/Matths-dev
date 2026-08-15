#!/usr/bin/env node
"use strict";

const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");

const courses=Object.freeze({
  "math-research-project":{
    file:"math-research-project.json",count:10,label:"수학과제 탐구",
    profiles:{
      "math-research-project-01-01":{mode:"blocks",rule:"생활의 불편을 대상·변수·관계·검증 방법이 있는 작은 질문으로 바꾸고 현실과 수학 모형을 왕복합니다.",focuses:["생활 장면에 씌운 수학 렌즈","답할 수 있고 측정 가능한 질문","어려운 계산과 깊은 탐구의 차이","20분 혼잡의 변수·관계 모형","현실→수학→결과→현실"]},
      "math-research-project-01-02":{mode:"blocks",rule:"수집 전 필요한 정보와 개인정보 경계를 정하고 원자료·변경·제외 이유를 시간순으로 남깁니다.",focuses:["결론 아래의 원자료·변경 기록","필요한 정보와 수집 가능한 정보","불편한 값과 오류값의 차이","익명 관찰표·버전 변경 일지","출처·원자료·사람·변경"]},
      "math-research-project-02-01":{mode:"blocks",rule:"주장별 출처를 최초 근거까지 추적하고 독립 근거·방법·적용 범위를 근거 지도에 연결합니다.",focuses:["검색 결과를 놓는 근거 지도","주장의 최초 출처와 재인용","자료 수와 독립 근거 수의 차이","닮음 유도와 규격표 교차검증","검색→선별→연결→인용"]},
      "math-research-project-02-02":{mode:"plot",rule:"사례 선정 이유와 공통 비교틀을 먼저 고정하고 사례별 맥락 차이는 결론의 경계로 남깁니다.",focuses:["한 사례 깊이와 여러 사례 비교","세 현장의 선정 기준","특이 사례의 일반화 오류","신호 여유율 공통 비교표","경계→공통틀→차이→맥락"]},
      "math-research-project-02-03":{mode:"plot",rule:"바늘 길이·선 간격·시행 방법을 고정하고 교차 횟수 비율이 반복에 따라 어떻게 안정되는지 표시합니다.",focuses:["반복 시행과 교차 비율","통제할 조건과 바꿀 조건","π 근사값과 실험 성공의 차이","물리 시행·시뮬레이션 비교","조건 고정→반복→비율→오차"]},
      "math-research-project-02-04":{mode:"blocks",rule:"퍼즐의 목표·규칙·해답 존재·난이도 기준을 정의하고 전수 검사와 사용자 막힘 기록으로 버전을 고칩니다.",focuses:["아이디어에서 사용 가능한 산출물","좋은 퍼즐의 검증 기준","첫 작동 버전과 연구 결론의 차이","해 전수검사·학생 막힘 로그","필요→설계→시험→개정"]},
      "math-research-project-03-01":{mode:"blocks",rule:"주제 후보를 가치·자료 접근·방법·시간의 네 축으로 비교해 질문과 일정이 맞는 범위로 좁힙니다.",focuses:["넓은 관심을 작은 질문으로","가치와 실행 가능성 매트릭스","최신·넓음과 좋은 주제의 차이","채광 측정표와 3주 일정","질문·근거·시간의 약속"]},
      "math-research-project-03-02":{mode:"plot",rule:"계획값·관측값·변경 이유를 같은 시간축에 남기고 중단·수정 기준을 사전에 표시합니다.",focuses:["계획과 현장 기록의 대응","중간 점검과 중단 기준","계획 수정과 불성실의 차이","배터리 조건표·변경 일지","날짜·관측·판단·변경 근거"]},
      "math-research-project-03-03":{mode:"blocks",rule:"주장마다 표·계산·출처·한계를 한 묶음으로 배치해 청중이 근거의 경로를 재현하게 합니다.",focuses:["산출물과 재현 안내서","3분 발표의 필수 근거","매끄러운 화면과 증거 강도의 차이","거리·햇빛 벌점 공개 계산","주장→근거→경계→출처"]},
      "math-research-project-03-04":{mode:"blocks",rule:"처음 계획·실제 선택·결과·한계를 증거와 연결하고 다음 실험의 한 가지 변경을 명시합니다.",focuses:["결과 뒤 선택의 흔적","잘했다는 판단의 증거","가설 일치와 좋은 탐구의 차이","하중표·수행일지→다음 실험","기록→판단→한계→다음 행동"]},
    },
  },
  "vocational-math":{
    file:"vocational-math.json",count:18,label:"직업수학",
    profiles:{
      "vocational-math-01-01":{mode:"blocks",rule:"작업지시서의 각 숫자에 역할·단위·연산 순서를 붙여 중간 잔액을 한 줄씩 검산합니다.",focuses:["숫자의 역할·단위 라벨","묻는 말이 고르는 연산","숫자 일치와 단위 오류","구매 잔액 순차 정산","역할표→연산→단위 검산"]},
      "vocational-math-01-02":{mode:"blocks",rule:"어림의 목적과 부족·초과 위험을 먼저 정해 반올림·올림·버림의 자릿수와 방향을 선택합니다.",focuses:["숫자 해상도를 낮추는 어림","부족 위험·초과 위험","오사입과 현장 안전 방향","예산표 공통 자릿수","약·최소·최대 방향표"]},
      "vocational-math-01-03":{mode:"equation",rule:"변환비를 분수로 곱해 원단위가 소거되고 목표 단위만 남도록 하며 시간의 분·소수 변환을 구분합니다.",focuses:["같은 양의 다른 단위 눈금","단위를 잇는 변환 등식","1시간30분=1.5시간","배합표 단위 통일","숫자 변화·물리량 보존"]},
      "vocational-math-02-01":{mode:"blocks",rule:"두 재료의 대응량을 같은 배수로 확대하고 부분비와 전체 대비 비율을 구분합니다.",focuses:["재료 사이 배합비","대응하는 두 양","2:3과 전체 3등분의 차이","시제품→생산배치 배수","대응량×같은 배수"]},
      "vocational-math-02-02":{mode:"blocks",rule:"무엇을 100%로 두는지 표시하고 연속 할인·세금은 원래값이 아니라 직전 금액에 차례로 적용합니다.",focuses:["서로 다른 규모의 백 칸 표","100%의 기준량","%와 %p의 차이","할인 후 세금의 순차 적용","기준량→변화율→새 기준"]},
      "vocational-math-02-03":{mode:"graph",rule:"입력·출력·시작값·구간별 변화량을 읽고 요율이 바뀌는 경계마다 식을 나눕니다.",focuses:["입력 한 칸과 계기판 반응","차 일정·비 일정 구분","구간 경계와 다른 요율","표 밖 배송요금 예측","입력·기울기·절편·구간"]},
      "vocational-math-02-04":{mode:"plot",rule:"시간축과 값축 단위를 확인하고 수준·변화속도·정체 구간을 서로 다른 표시로 읽습니다.",focuses:["교대 기록의 시간축 압축","높은 값과 빠른 변화의 차이","축척이 만든 가짜 급경사","냉장고 온도 사건 구간","상승·정체·하강의 시간"]},
      "vocational-math-02-05":{mode:"geometry",rule:"미지수의 단위를 정하고 등식은 목표선, 부등식은 허용 반평면으로 그린 뒤 현장 정수 조건을 적용합니다.",focuses:["목표점과 안전구역","미지수·제약 방향","소수 해와 발주 정수의 차이","예산 안 최대 발주량","변수→경계→허용쪽→현장화"]},
      "vocational-math-03-01":{mode:"geometry",rule:"전개도의 면·공유변·접는 방향·접착날개를 표시하고 90도 접힘을 순서대로 시뮬레이션합니다.",focuses:["입체와 평면 전개도","경첩으로 남길 공유변","면 6장과 유효 전개도의 차이","치수·접착날개 재단도","공유변→접기→겹침 검사"]},
      "vocational-math-03-02":{mode:"geometry",rule:"정면·평면·측면의 같은 위치를 높이 격자에 교차 표시하고 숨은 블록은 가능한 범위로 남깁니다.",focuses:["세 방향 투상도","평면 한 칸의 층수","윤곽과 숨은 블록의 차이","팔레트 높이 격자 복원","세 보기→좌표 맞춤→높이"]},
      "vocational-math-03-03":{mode:"geometry",rule:"합동 이동과 닮음 확대를 구분하고 축척배 k가 길이·넓이·부피에 k·k²·k³로 적용됨을 표시합니다.",focuses:["이동·회전·확대 형판","대응변 역할","길이 2배와 넓이 4배","축척 도면→실제 치수","합동 vs 닮음·차원별 배수"]},
      "vocational-math-03-04":{mode:"geometry",rule:"테두리 선재는 둘레, 바닥·벽 마감재는 넓이로 분리하고 복합도형을 겹치지 않는 조각으로 나눕니다.",focuses:["테두리 선과 바닥 면","복합 바닥 분할","창문 제외와 외곽 둘레의 차이","L자 매장 바닥재 합","선 자재 vs 면 자재"]},
      "vocational-math-03-05":{mode:"geometry",rule:"겉넓이는 노출된 바깥면의 합, 부피는 밑면 넓이×높이로 계산하고 내·외부 치수를 구분합니다.",focuses:["겉넓이 피부·부피 공간","밑면 한 층과 쌓인 높이","겉치수와 내부 용량의 차이","상자 포장재·적재량","바깥면 펼치기·안쪽 층 쌓기"]},
      "vocational-math-04-01":{mode:"blocks",rule:"선택 단계를 나무의 각 층으로 펼치고 금지 조건은 해당 가지에서 즉시 잘라 중복·누락 없이 셉니다.",focuses:["선택 단계별 갈림길","곱의 법칙과 합의 법칙","마지막 일괄 차감의 오류","판매 가능 작업복 가지","한 경로 한 번·금지 즉시 제거"]},
      "vocational-math-04-02":{mode:"plot",rule:"사건 수를 같은 조건의 전체 기록 수로 나누고 표본기간·조건과 함께 확률 범위로 해석합니다.",focuses:["빈도를 0~1 계기판으로","사건 수의 정확한 분모","관찰 비율과 미래 보장의 차이","두 라인 불량률과 표본수","사건 수/전체·조건·기간"]},
      "vocational-math-04-03":{mode:"plot",rule:"자료의 뜻·단위를 통일한 뒤 변화·비교·구성·관계 중 질문에 맞는 표와 그래프를 선택합니다.",focuses:["그래프라는 자료 작업대","변화·비교·구성·관계 목적","정제 전 표 만들기의 오류","주간 매출의 추이·구성 두 질문","질문→표 구조→그래프"]},
      "vocational-math-04-04":{mode:"plot",rule:"제목·범례·축·단위·눈금부터 읽고 수치로 확인한 관찰과 원인 추정을 분리합니다.",focuses:["그래프 읽기 순서","실제 중요한 차이·흐름","잘린 축·동시변화 과장","대기시간 그래프→운영 문장","기호→수치→관찰·원인 보류"]},
      "vocational-math-04-05":{mode:"blocks",rule:"의사결정 목표·평가지표·기준·자료기간·위험을 한 표에 놓고 조건부 결론과 재검토 시점을 남깁니다.",focuses:["자료와 결정의 역할 분리","목표를 나타내는 지표","평균·짧은 기간의 은폐","공급업체 조건부 비교표","목표·기준·근거·한계"]},
    },
  },
});

const plans={
  intuition:{actions:["place","point","verify"],captions:["현실 장면을 계산 가능한 대상·단위·조건·기록으로 펼칩니다.","지금 판단에 쓰는 값·경계·근거·도면 부위를 포인터와 강조판으로 하나씩 짚습니다.","다른 수치와 현장 조건에서도 같은 규칙이 유지되는지 확인합니다."]},
  question:{actions:["point","group","verify"],captions:["질문의 주어·측정값·목표·제약을 서로 다른 칸에 놓습니다.","어떤 자료와 계산이 질문에 답하는지 근거선을 연결합니다.","계산 결과의 단위와 적용 범위가 원래 질문에 맞는지 확인합니다."]},
  misconception:{actions:["highlight","transform","verify"],captions:["그럴듯한 지름길을 노란 경고판에 올리고 빠진 단위·분모·대표성·현장 조건을 표시합니다.","정의나 반례를 적용해 과장된 결론을 검증 가능한 범위로 되돌립니다.","다음 작업에서도 쓸 수 있는 한 줄 안전 기준으로 확인합니다."]},
  solution:{actions:["place","transform","verify"],captions:["주어진 기록·치수·수량·조건을 계산판과 도면의 정확한 자리에 놓습니다.","중간 단위와 판단 근거를 숨기지 않고 계산·비교·변환을 진행합니다.","결과를 원자료·현장 제약·재현 절차에 다시 대입해 검산합니다."]},
  recall:{actions:["highlight","group","verify"],captions:["공식 이름보다 무엇을 측정하고 어떤 조건에서 판단했는지 먼저 되살립니다.","질문·자료·계산·한계·다음 행동을 한 동선으로 묶습니다.","새 현장에서도 그대로 쓸 수 있는 점검 순서를 입으로 다시 확인합니다."]},
};
const normalize=v=>String(v||"").replace(/\s+/gu," ").trim();
const compact=(v,n)=>{const t=normalize(v);return t.length>n?`${t.slice(0,n-1)}…`:t;};
const sentences=v=>normalize(v).match(/[^.!?。！？…]+(?:[.!?。！？]+|…+|$)/gu)||[];
function buildChoices(story,index){const correct=story.scenes[index].subtitle;const choices=[story.scenes[(index+2)%5].subtitle,story.scenes[(index+3)%5].subtitle];const answerIndex=(index+2)%3;choices.splice(answerIndex,0,correct);return{choices,answerIndex};}
function buildMotion(story,scene,index,profile,label){const focus=profile.focuses[index],plan=plans[scene.kind];if(!focus||!plan)throw new Error(`${story.conceptId}/${scene.id} 프로필 누락`);const ss=sentences(scene.narration),expressions=[scene.title,ss[0],ss.at(-1)].map(v=>compact(v||scene.subtitle,104)),{choices,answerIndex}=buildChoices(story,index);return{version:1,mode:profile.mode,focus,instruction:profile.rule,beats:["focus","connect","verify"].map((name,i)=>({id:`${scene.id}-${name}`,action:plan.actions[i],target:i===1?compact(scene.subtitle,58):focus,expression:expressions[i],result:i===0?compact(scene.subtitle,104):compact(profile.rule,104),caption:plan.captions[i],durationMs:[1900,2300,2300][i]})),mild:{explanation:`${scene.subtitle} 화면에서는 “${focus}” 하나만 먼저 찾습니다. ${profile.rule}`},spicy:{explanation:`${profile.rule} 단위·근거·현장 제약·결론 범위 중 하나라도 빠지면 결과를 확정하지 않습니다.`},check:{prompt:`“${scene.title}” 장면에서 가장 먼저 확인해야 할 ${label} 관계는 무엇인가요?`,choices,answerIndex,correctFeedback:`맞습니다. 먼저 표시할 대상은 “${focus}”입니다. 이어서 ${scene.subtitle}`,retryFeedback:`선택한 문장은 다른 장면의 핵심입니다. 먼저 “${focus}”부터 찾으세요. 이어서 ${scene.subtitle}`}};}
function authorCourse(courseId,definition){const target=path.join(root,"content_folder","curriculum-stories",definition.file);const doc=JSON.parse(fs.readFileSync(target,"utf8"));if(doc.courseId!==courseId||doc.stories.length!==definition.count)throw new Error(`${definition.label} 정본 불일치`);doc.stories=doc.stories.map(story=>{const profile=definition.profiles[story.conceptId];if(!profile||profile.focuses.length!==5)throw new Error(`${story.conceptId} 프로필 불완전`);return{...story,revision:story.revision+(story.scenes.every(s=>s.motion)?0:1),scenes:story.scenes.map((scene,index)=>({id:scene.id,kind:scene.kind,title:scene.title,motion:buildMotion(story,scene,index,profile,definition.label),subtitle:scene.subtitle,narration:scene.narration,studioScript:scene.studioScript}))};});fs.writeFileSync(target,`${JSON.stringify(doc,null,2)}\n`);}
for(const[courseId,definition]of Object.entries(courses))authorCourse(courseId,definition);
console.log("Authored applied inquiry motion: 28 concepts, 140 scenes.");
