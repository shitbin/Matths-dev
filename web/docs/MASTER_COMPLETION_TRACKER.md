# Matths 전체 완성 추적표

기준일: 2026-08-12

기준 브랜치: `codex/cafe24-integration-20260811`

운영 원칙: GitHub push·운영 Atlas 쓰기·Cafe24 직접 배포는 승인 전 금지. 모든 구현 차수는 독립 로컬 커밋으로 남긴다.

상태 정의:

- `완료`: 코드·자동 검증·필요한 실화면 증거까지 닫힘
- `구현`: 코드는 들어갔으나 실기·운영 경계 검증이 남음
- `진행`: 현재 차수에서 수정 중
- `대기`: 선행 구현 또는 외부 권한 필요

| # | 항목 | 상태 | 완료 조건 |
|---:|---|---|---|
| 1 | 웹 전체 리디자인 | 구현 | 공개·학생·Arena·학부모·관리자 전 페이지군 공통 셸과 핵심 행동을 정비했다. 190~191차에는 현재 코드 실화면으로 네이비 사이드바 CI 대비, 모바일 상단 말줄임, 학생 화면 장식용 영문, 교육과정·공개 푸터·관리자 문제 데이터 overflow, Arena 배치 전 임시 휘장을 추가로 해소했다. 최신 270장을 직접 대조하고 118개 EJS·104개 전체 회귀를 통과했으며, 외부 독립 디자인 승인 판정만 남아 있다. |
| 2 | 5개 폭 반응형 전수 검증 | 완료 | 커밋 `2e94417` 기준 공개 13면·학생 20면·학부모 3면·관리자 18면, 총 54개 실제 GET 화면을 320·390·768·1024·1440px로 다시 촬영했다. 270장 모두 viewport 일치·페이지 실패 0·인증 이탈 0이며 공개·학부모·관리자 raw overflow 0, 학생 콘텐츠 overflow 0이다. 학생 raw 진단에는 닫힌 off-canvas sidebar만 화면 밖 대기 요소로 남고 페이지 scrollWidth에는 영향이 없다. |
| 3 | 전·후 승인 패키지 | 완료 | 270장·before 33장·현재 전체 Git 코드·캡처 행렬·독립 심사 요청서·파일 SHA-256을 한 아카이브로 만든다. 캡처 기준 커밋 뒤 현재 검토 커밋까지의 파일을 전부 기록하고, EJS·CSS·public client·route/controller·화면 데이터 service가 하나라도 바뀌면 재촬영 없이는 패키징을 거절한다. 현재 iPad 커밋 `08eadb4`의 정상 19장과 실패 증거 1장을 추가하고 배치고사 시작·응시·결과, 공통수학Ⅰ 10문항 평가, 실제 다음 개념 시작 화면, compact Pencil 도구막대, 온디바이스 AI 튜터 설치 온보딩을 분리했다. 최종 파일명과 해시는 `dist/design-review/*.sha256`을 정본으로 삼는다. |
| 4 | Cafe24 반영 | 구현 | 2026-08-12 읽기 전용 운영 대조에서 health fingerprint 부재·앱용 `/api/v1/auth/google/start` 401·구형 조합 로고를 재확인해 배포본이 현재 로컬 정본보다 뒤처졌음을 확정했다. 현재 HEAD의 배포본과 `42ae09a63ee3` 롤백본을 `dist/cafe24/RELEASE-MANIFEST.json`으로 생성하며, 배포본에는 Git이 없어도 commit/tree를 검증하는 `RELEASE-SOURCE.json`을 포함한다. 깨끗한 추출본에서 `npm ci`, 배포용 100/100, 패키징 전 iPad 교차계약 5/5, EJS 118개, 감사 0, 일회성 운영 환경변수와 로컬 복제셋을 사용한 production 실제 부팅, health/home 200, Google 시작 302까지 통과했다. 정확한 최종 커밋·파일명·SHA-256은 자기 참조 문제를 피하기 위해 manifest를 단일 정본으로 삼는다. 외부 Cafe24 적용·실운영 PASS 증거는 남아 있다. |
| 5 | Cafe24 Google 환경변수 | 구현 | Gmail·Google·조건부 Toss production preflight와 변수 정본 완료, 비밀값 주입 대기 |
| 6 | Google Console 콜백 | 구현 | 운영 URI·웹/iPad 9개 왕복·비밀정보 금지·파일 SHA 증거 검증 구현, Console 등록과 실제 왕복 대기 |
| 7 | iPad Google 로그인 실기 | 구현 | 웹 OAuth는 운영 Google 계정 화면과 `https://matths.kr/auth/google/callback`으로 정상 연결되지만, 구형 Cafe24 운영본의 iPad `/api/v1/auth/google/start`가 401을 반환함을 실측했다. 최신 후보는 공개 start/exchange를 Bearer 미들웨어 앞에 두고 동일 서버 OAuth·단일 사용 코드·callback 검증·공식 4색 마크를 구현했다. Cafe24 후보 반영 후 기존·신규 계정·취소·재시도·앱 복귀 실기 통과가 남아 있다. |
| 8 | 최신 iPad 실기 설치 | 완료 | iPad Pro 11형 4세대에서 `kr.matths.app` Debug 자동 서명·설치·SpringBoard 활성 실행·14초 후 프로세스 생존 증거를 기록했다. 215차에는 compact Pencil 도구막대와 AI 튜터 설치 온보딩을 포함한 iPad 커밋 `08eadb4`의 Apple Development 서명 Debug를 같은 iPad14,3에 다시 덮어 설치했다. 설치는 PASS이며 기기가 잠긴 상태라 이 설치본 실행은 잠금 해제 후 대기다. 증거는 `evidence/ipad-install-215/device-install.json`이다. |
| 9 | 공개 API 범위 화면 보호 | 구현 | GOAT 경기·배치·평가·주간 모의고사·기출에 녹화·미러링·앱 전환 보호를 적용했다. 실제 iPad arm64 Debug에서 서버 동기화를 차단한 상태 전이 자가진단으로 워터마크·스크린샷 안내·캡처 시작/종료 커버·백그라운드/복귀 커버·이벤트 순서를 PASS했다. 물리 버튼 스크린샷·제어센터 녹화·AirPlay 미러링의 직접 조작 영상과 일반 캡처 한계 최종 확인은 남아 있다. |
| 10 | 캡처 사후 무결성 | 구현 | 보호 화면 워터마크·사후 이벤트·사용자 고지와 스크린샷/녹화 시작/종료를 계정별 내구성 큐→서버 LearningEvent의 격리된 `screenIntegrity`로 연결했다. 실제 iPadOS 26.6 기기에서 제품 JSONL codec의 persist→재로드→payload 보존→성공 후 제거 4단계를 PASS했고, 로컬 서버 Mongo에서 동일 clientEventId 오프라인 replay가 3종 이벤트 각각 1건으로 수렴하며 위조 metadata·출석 KPI를 제거함을 PASS했다. 한 번의 실제 네트워크 단절→복구로 기기와 서버를 잇는 연속 영상은 대기 |
| 11 | Arena 웹 전면 재작업 | 구현 | 첫 행동·현재 상태·랭킹·룰북·상점 공통 IA에 더해 세부 기록 화면의 내부 영어·원시 장부 코드·오작동 빈 상태·장식용 그라디언트를 제거하고 5문항 경기 상태 레일·문맥별 빈 상태·실행 행동으로 통일하며, 화면 전체를 막던 복수전 오버레이를 비차단 상태 카드로 교체하고 옛 `War of GOAT` 사용자 명칭을 GOAT Arena로 전수 수렴했다. iPad 게스트·사이클 시작 전 보조 행동도 공식 `/goat-arena` 경로만 사용한다. Arena 일반 카드·CTA·상태 배경 43개 그라디언트를 단색 역할 색으로 교체하고 압축 legacy 2개도 최종 단색 정본으로 덮어 재유입을 봉인, 최신 5폭 실화면 승인 대기 |
| 12 | Arena iPad 신청 흐름 | 구현 | Unranked 자동 배정, Ranked 티어·예치 선택, 하위 초대·취소·수락·거절·재개 구현, 실기 왕복 대기 |
| 13 | 웹·iPad 경기 정본 검증 | 구현 | ArenaMatch 단일 정본·순차 5문항·정산 계약 구현, iPad가 선언한 71개 API 호출과 서버 method/path·Bearer 경계 전수 대조 완료, 동일 계정 실서버 결과 diff 대기 |
| 14 | 배치고사→휘장 실기 | 구현 | 로컬 Mongo 복제셋에서 실제 완료 `AssessmentAttempt`→`RankingProfile(DIAMOND/MMR 1320)`→`ArenaStanding`·`ArenaAccessState`·outbox 트랜잭션 및 replay 1건 수렴 PASS. Bearer HTTP 제출에서 인증 차단과 서버 확정 tier/MMR/RP→`placement-<attemptId>` 직렬화 PASS, 실제 iPad14,3의 9티어 모션·사운드 성능 9/9 PASS. 209차에는 운영 쓰기 없는 DEBUG 검수 상태로 시작·30문항 응시·DIAMOND 결과를 현재 커밋에서 추가 촬영했으며 자동 저장 오류도 차단했다. 실제 학생 30문항 종료부터 결과·모션·효과음까지 한 번에 찍은 수동 실기 영상은 대기 |
| 15 | 9티어 모션 성능·웹 포팅 | 완료 | iPad14,3 120Hz 9티어×7.4초 CADisplayLink 전수 PASS(p95 8.34ms, 최대 77.81ms). 웹은 9 MP4 전부 readyState 4/error 0/1080×1920 실재생, 320·390·768·1024·1440 viewport 일치·overflow 0·contain 렌더 캡처 PASS. 9티어 media·responsive·Reduce Motion 계약을 102-file manifest에 추가 |
| 16 | 커리큘럼 지도 개선 | 구현 | 웹 13과목·46대단원·220개념을 과목군 지도와 개념별 시간·앞서 볼 개념으로 재설계하고 소개·FAQ·가입·내 학습의 공개 범위를 같은 정본으로 수렴해 모바일 설명을 보존하며, 공통수학1·2·대수·미적분Ⅰ·확률과 통계·기하의 실제 선후 흐름 6개 추천 코스를 웹/iPad에 연결했다. 전용 시각화 분기가 없는 개념도 준비 중 화면 대신 등록된 요약·4단계·핵심 판단을 쓰는 반응형 탐색판으로 연결하고, iPad에서도 전문 모듈이 없는 151개 개념에 교육과정 정본의 시각화 아이디어를 단계별로 탐색하는 02·03 네이티브 화면을 추가했다. 개념을 선택하지 않은 첫 진입도 빈 화면 대신 실제 다음 과목·단원·개념·예상 시간·핵심 판단과 시작 행동을 제공한다. 긴 제목·잠금 이유·시간과 AX 큰 글자에서 과목 진도/다음 개념/단원/개념 상태를 명시적으로 세로 재배치, 실제 Split View·AX5 검증 대기 |
| 17 | 220개념 편집 품질 | 구현 | 13과목·46대단원·220개념의 요약·핵심 정리·성취기준·3~6단계·토픽·시각화 제안·복붙·임시 문구를 전수 감사하고 모든 개념 seed의 고유 ID·요약·핵심 정리·최소 3단계와 학생 화면의 준비 중/내부 모델 문구 부재를 실행 계약으로 고정했다. 93개 계산형·127개 저술형 연습 정합 보고 완료. 평가센터는 웹 정본의 5과목(공통수학Ⅰ·Ⅱ 포함)으로 수렴하고 서버 계산형 생성기를 재현 가능한 iPad 번들로 동기화해 모든 평가 개념의 10개 후보 생성과 10·20·40문항 계약을 고정했다. 수학 전문가의 참·난이도 검수 대기 |
| 18 | Pencil 도구막대 | 구현 | 펜·지우개·선택·이동·undo/redo·전체 지우기·3단계 굵기·100~300% 확대·선택 상태와 모든 도구 44pt 조작 영역 구현. 320pt compact에서는 가로 스크롤 뒤에 기록·삭제·배율 도구가 숨지 않도록 기능군별 3줄로 재배치하고 Simulator 실화면을 확인했다. 실제 Pencil 입력 실기 대기 |
| 19 | 수학식 조판 | 구현 | 강의·문항·채점·튜터·GOAT 상점 경기 분석의 문제·답·정답·해설·풀이 단계까지 조건부 KaTeX/평문 조판 적용, 12개 실제 수식·ASCII 감지·9 WebView 접근성 계약 통과, Dynamic Type·VoiceOver 실기 읽기 검증 대기 |
| 20 | 8GB iPad 로컬 비전 성능 | 부분완료 | Qwen2.5-VL 3B는 64.4초에도 `x²+x+x+1`의 반복 `+x`를 누락했고, DeepSeek 7B Q3는 다국어 혼합·판정 모순·반복 퇴행이 재현됐다. 출력은 한국어 JSON 교정 1회 뒤 실패 시 학생 노출을 막도록 fail-closed 처리했다. 대안 Qwen3.5 9B IQ3를 프로젝터 없이 실측해 iPad14,3에서 로드 6.0초·추론 68.9초·첫 출력 21.6초·3.03 tok/s·최대 상주 3.49GiB로 생존했고, 대입 계산·부호 오류·한국어 JSON을 정확히 통과했다. revision/byte/SHA를 고정하고 사용자가 켜는 9B 실험 모드에만 연결했다. 기본 승격 전 실제 100/200/100 이중 라벨 정확도 게이트는 여전히 필수다. 증거: `evidence/local-ai-output-quality-187-device/`, `evidence/local-ai-9b-lite-text-188-device/`, `evidence/local-ai-9b-iq3-text-189-device/`. |
| 21 | 손글씨 판독 정확도 | 구현 | 익명 100장·문항/답/단계/판독불가 파일럿 게이트에 원본별 SHA-256, 중복 sampleId 거절, 독립 2인 라벨, 불일치 조정 기록, 평가 JSONL 실파일 해시 결속을 추가했다. 메타데이터 자기보고 정확도나 `fixtures/`·`DEMO-*` 표본으로는 통과하지 못한다. 실제 학생 100장 수집·이중 검수는 대기 |
| 22 | 부정행위 오탐·미탐 | 구현 | 200건 precision≥95%·recall≥80%·정상 오탐≤2%·보류≤20% 게이트에 원본 해시·독립 2인 라벨·불일치 조정·실파일 결속을 강제했다. GOAT 풀이 사진은 60초 서버 접수 뒤 온디바이스 비전 큐로 사진별 검토하고 강한 시각 근거만 멱등 후속 전송·관리자 비확정 참고 신호로 표시한다. 모델 자유 서술은 학생 화면에서 차단하고 검증된 근거 종류별 고정 한국어 설명만 사용하며, 개인정보 처리방침·약관에 서버 제출 예외와 자동 판정 금지를 명시했다. 실제 200건 이중 라벨·실기 왕복은 대기 |
| 23 | 채점·튜터 정확도 | 구현 | 100건 정오/답≥95%·개념≥90%·허위/위험 0건 게이트가 평가 원본 SHA-256·중복 거절·독립 2인 라벨·불일치 조정·실파일 해시를 함께 요구한다. iPad 앱의 서버 미지원 `지옥맛`과 모욕성 대사 풀을 제거해 웹·서버와 같은 순한맛·매운맛·무음 3모드 및 미성년자 안전 문구로 수렴했고 첫 질문도 실제 수학 질문으로 정리했다. 모델 미설치 상태는 모델명·5.7GB·Wi-Fi·이어받기·온디바이스 분석을 한 화면에서 설명하는 온보딩과 320pt 대응으로 교체했다. 실제 100건 이중 라벨 검수는 대기 |
| 24 | 백그라운드·메모리 복구 | 완료 | 계정별 원본·단계 복구와 안전한 처음부터 재실행, 짧은 iPadOS background 유예, 중단 안내, GOAT 후속 전송 보호 outbox를 구현했다. iPad14,3에서 512KB 원본과 `손글씨 풀이 전사` 단계를 저장하고 정상 종료 정리 없이 프로세스를 외부 종료한 뒤 동일 SHA-256·단계를 복원하고 민감 묶음을 삭제했다. 별도 실기에서 활성 작업을 둔 Matths 위로 Safari를 실제 전면 실행했으며 1초 후 scene background·active work 1·background task active·남은 유예 29.16초를 PASS했다. jetsam은 앱 관점에서 동일한 무정리 프로세스 단절을 사용하므로 기기를 인위적으로 메모리 고갈시키지 않고 외부 종료 복구 증거로 대체했다. |
| 25 | 모델 다운로드·저장공간 UX | 완료 | 8GB용 Qwen2.5-VL 3B·DeepSeek 7B와 12GB용 Qwen3.5 9B·2비트 실험판의 revision·byte·공개 SHA-256을 고정하고, 기존 설치본 해시 영수증·중단 재개·원자 교체·공간 부족을 구현했다. iPad14,3에서 정상 원자 교체·영수증·손상 GGUF 및 SHA 불일치 거절·실패 후 기존 파일 보존·15% staging 여유 차단을 PASS했다. 64MB 로컬 Range 서버를 실제 background URLSession으로 받다가 취소해 iOS resumeData 영속화→재사용→67,108,864바이트 완료까지 PASS했으며, delegate 반환 뒤 임시파일이 삭제돼 완료 이동이 실패하던 실기 결함도 콜백 내 동기 이동으로 수정했다. 텍스트 전용 모델의 가짜 사진 모듈과 불완전 VLM 쌍도 다운로드 전에 차단한다. |
| 26 | 접근성 실기 | 구현 | 네이티브 조작 이름·AX 분기·9 WebView 확대/모션 계약과 웹 전체 템플릿의 alt·입력명·live region·본문 바로가기 회귀 검증을 유지한다. 194차에 AX5 2.1배 computed font, WKWebView scroll/pinch, 4배 zoom 상한, 시스템 Reduce Motion과 앱 모션 OFF를 실제 iPad WebKit JS 계산값으로 기록하는 DEBUG 자가진단을 추가했고 33/33 셸 계약·arm64 빌드·실기 설치를 통과했다. 기기 잠금 때문에 실행을 못 했으므로 새 자가진단 PASS, VoiceOver 순서, 실제 200% pinch 영상은 대기다. |
| 27 | 창·키보드·팝오버 실기 | 구현 | Split View·Stage Manager·키보드·Pencil·막힌 지점 두 기기·계정 진도 초기화 포함 22개 실기 시나리오의 영상/로그 종류·SHA 검증 구현, 실제 촬영 대기 |
| 28 | PG 결제 | 구현 | Toss 승인·실패·서버 재확인·webhook·멱등 지급 구현, live 운영 7개 결제 시나리오·비식별 파일 magic/SHA 증거 검증 구현, 승인된 Cafe24 실거래 대기 |
| 29 | 학부모·미성년 결제 | 구현 | 법정대리인 고지·학생 확인·보호자-자녀 연결·보호자 동의 4개 운영 시나리오와 DB audit 증거 검증 구현, 승인된 실운영 왕복 대기 |
| 30 | KICE 권리 경계 | 구현 | 허락 전 Release 원문 0건·평가센터 섹션 자체 비노출, 내부 Debug에서만 소유권과 ‘사용 허락 확인 전 내부 검증 전용’ 고지, 허락 후 원격 제공·출처 고지·실권리 문서 대기 |
| 31 | Atlas 이전·인덱스 | 구현 | AccessCycle lifecycle 이전과 26개 stale authority index 정리의 dry-run·충돌 차단·멱등 apply·startup fail-closed를 구현했다. production apply는 MongoDB Atlas 공식 SRV 대상·깨끗한 source commit·덮어쓰기 없는 원본 보고서를 강제한다. 최종 증거는 같은 DB fingerprint의 migration apply, index cleanup apply, Atlas 백업, 격리 복구 리허설 네 원본의 시간 순서·SHA를 다시 계산할 때만 생성된다. 승인된 운영 백업·유지보수 창·격리 복구 실행은 대기다. |
| 32 | App Store Release | 구현 | 최신 iPad 커밋 `08eadb4`을 자산 카탈로그 포함 unsigned generic iOS Release arm64로 다시 빌드해 성공했다. 번들은 운영 서버 `https://matths.kr`만 포함하고 임시 URL 0건, KICE PDF/index 0건이며 실행 파일 SHA-256과 한계는 `evidence/ipad-release-215/release-build.json`에 고정했다. Release 감사기는 embedded profile을 해독해 development·ad-hoc·enterprise·App Store 배포 서명을 구분하고, App Store 가능 판정에는 실제 IPA의 `Payload/*.app`·Info.plist·프로비저닝 파일과 IPA SHA-256까지 요구한다. 현재 증거는 unsigned라 App Store 배포 프로파일 export·실제 IPA·Connect 제출은 대기다. |
| 33 | 최종 통합 승인 | 구현 | 20개 외부 검증별 증거 종류·iPad/Google 세부 시나리오·파일 magic/SHA·2개 로컬 AI tier·Cafe24/iPad HEAD를 강제한다. Cafe24 영수증은 운영 도메인·최종 웹 커밋, App Store 영수증은 Connect·최종 iPad 커밋·upload ID, Atlas는 production apply·이전 건수·rollback, 디자인은 독립 검수자·양쪽 최종 커밋과 결합해야 한다. 빈 JSON·임의 Markdown·다른 IPA로 PASS할 수 없으며 실제 외부 증거 수집은 대기다. |

## 현재 롤백 지점

- iPad 로컬 작업 복사본 `08eadb4`: 현재 iPad 소스·테스트·제품 에셋 전체 기준점. 원격 미연결,
  빌드·llama framework·캡처·KICE PDF는 추적 제외.
- `42ae09a`: 최신 GitHub + 기존 iPad API/v6 통합
- `6e60436`: 공개·대시보드 내비게이션 개선
- `08acae6`: Google 우선 인증 화면 개선
- `9f0aafc`: 랜딩의 실제 Arena 규칙·220개념 정합
- `8edcb88`: 수험관 내부·영문 문구를 학생 언어로 교체
- `f7315ee`: Arena 구형 JPEG 장식과 가짜 문자를 공식 Matths 셸로 교체
- `58b8a89`: Arena 내비게이션·보조 글자 최소 크기 상향
- `fcb736b`: Ranked·Unranked 경기 신청 화면을 조건·예치 중심으로 재구성
- `7e70c80`: 상점 내부 ID 제거와 실전 경기 화면 사용자 언어 정비
- `d342d53`: 핵심 8개 웹 화면군의 공통 제품 표면·한국어 계층 정비
- `00de63c`: 공개 학습 소개·자료 상세·학습 상세 화면 공통 마감 확장
- `b6327d5`: Toss 결제 승인·웹훅·학습권/모의고사 권한 지급과 Cafe24 적용 안내
- `35fb32f`: 세부·작업 화면 공통 제품 마감과 장식용 영문 라벨 제거
- `rollback/84-screen-protection.reverse.patch`: iPad 84차 화면 보호 보강 역변경 기록
- `rollback/86-curriculum-before/`: iPad 커리큘럼 시간·선수 과목 정보 보강 전 원본
- `rollback/89-math-typesetting-before/`: ASCII 수식 자동 조판 보강 전 원본
- `rollback/90-local-ai-benchmark-before/`: 로컬 비전 상세 성능 계측 추가 전 원본
- `rollback/92-model-download-before/`: 백그라운드 재개형 모델 다운로드 전 원본
- `rollback/97-local-ai-job-recovery.md`: 로컬 AI 강제 종료 복구 차수 제거·복원 절차
- `rollback/98-vision-benchmark-account-scope.md`: 비전 실기 계측의 계정 슬롯 수렴 롤백 절차
- `rollback/99-cafe24-preflight.md`: Cafe24 운영 점검·배포 문서 차수 롤백 기준
- `rollback/100-device-qa-evidence.md`: 실기 설치·비식별 성능 수집 경로 롤백 절차
- `rollback/102-native-accessibility-labels.md`: 프로필·인증·튜터 접근성 이름 롤백 절차
- `rollback/119-public-curriculum-atlas.md`: 공개 교육과정 학습 지도 리디자인 롤백 절차
- `rollback/120-assessment-command-center.md`: 평가센터 다음 응시 행동 리디자인 롤백 절차
- `rollback/121-wrong-notes-review-command.md`: 오답노트 오늘 복습 행동 리디자인 롤백 절차
- `rollback/122-study-hall-brand-surface.md`: 수험관 공식 CI·학습 행동 표면 롤백 절차
- `rollback/123-community-access-surface.md`: 커뮤니티 접근 권한·목록 표면 롤백 절차
- `rollback/124-profile-settings-hierarchy.md`: 프로필 일반 설정·보안·탈퇴 위험 계층 롤백 절차
- `rollback/125-parent-learning-payment-hierarchy.md`: 학부모 학습·알림·결제 계층 롤백 절차
- `rollback/126-admin-operation-surface.md`: 관리자 24면 운영 작업 표면 롤백 절차
- `rollback/127-admin-language-boundary.md`: 관리자 내부 영문 라벨 사용자 언어 치환 롤백 절차
- `rollback/128-placement-promotion-contract.md`: 배치 결과 전체 화면 휘장·9티어 효과음 계약 롤백 절차
- `rollback/131-api-deployment-parity.md`: iPad API 전수 대조·Cafe24 배포 fingerprint·휘장 백그라운드 안전성 롤백 절차
- `rollback/132-public-curriculum-scope.md`: 공개 화면의 구형 39개·고1 한정 범위 카피 롤백 절차
- `rollback/133-google-official-mark.md`: iPad Google 공식 벡터 마크·접근성 라벨 롤백 절차
- `rollback/134-curriculum-editorial-audit.md`: 220개념 편집 품질 자동 감사 롤백 절차
- `rollback/135-pencil-touch-targets.md`: Pencil 도구막대 44pt 조작 영역 롤백 절차
- `rollback/136-arena-analysis-math-render.md`: Arena 상점 경기 분석 수식 조판 롤백 절차
- `rollback/137-screen-integrity-sync.md`: 보호 화면 캡처 이벤트의 계정별 서버 무결성 동기화 롤백 절차
- `rollback/138-curriculum-ax-layout.md`: iPad 커리큘럼 긴 제목·진도·예상 시간 AX 세로 배치 롤백 절차
- `rollback/139-release-placeholder-boundary.md`: KICE 권리 문구·죽은 샘플·채점 골든 예시 Release 격리 롤백 절차
- `rollback/140-goat-local-review-pipeline.md`: GOAT 풀이 사진 접수 후 온디바이스 비전 검토·비확정 서버 신호 파이프라인 롤백 절차
- `rollback/141-web-minimum-type-scale.md`: 웹 34개 스타일시트의 12px 미만 고정 글자 전수 상향 롤백 절차
- `rollback/142-arena-local-review-disclosure.md`: GOAT 증거 사진·기기 비전 검토 개인정보 고지와 회귀 계약 롤백 절차
- `rollback/143-web-interaction-size-floor.md`: 웹 버튼·입력·선택·접기 조작의 44px 최소 영역 계약 롤백 절차
- `rollback/144-arena-feature-state-rail.md`: GOAT 세부 기록 화면의 5문항 상태 레일·문맥 빈 상태 디자인 롤백 절차
- `rollback/145-curriculum-learning-tracks.md`: 웹·iPad 6개 추천 학습 코스 데이터·화면 연결 롤백 절차
- `rollback/146-web-accessibility-contract.md`: 웹 117개 템플릿의 접근 가능한 이름·상태 알림 계약 롤백 절차
- `rollback/147-web-skip-navigation.md`: 웹 전체 문서의 내비게이션 건너뛰기 경로 롤백 절차
- `rollback/148-arena-revenge-nonblocking-card.md`: Arena 강제 복수전 오버레이를 비차단 상태 카드로 바꾼 차수 롤백 절차
- `rollback/149-goat-arena-name-authority.md`: 폐기된 War of GOAT 명칭의 GOAT Arena 전수 수렴 롤백 절차
- `rollback/150-arena-solid-surface-discipline.md`: Arena 일반 표면·CTA 그라디언트 제거 롤백 절차
- `rollback/151-study-hall-detail-surface.md`: 수험관 상세·답안·관리자 표면 단색 수렴 롤백 절차
- `rollback/152-store-product-trust-surface.md`: 교재 상품 상세의 공식 CI·구매 상태 표면 롤백 절차
- `rollback/153-concept-generic-exploration.md`: 220개념 준비 중 화면을 등록 콘텐츠 탐색판으로 교체한 차수 롤백 절차
- `../rollback/154-ipad-coach-safety.md`: iPad 코치 3모드 정본·미성년자 안전 문구 롤백 절차
- `../rollback/155-ipad-generic-concept-explorer.md`: iPad 220개념 공통 02·03 탐색 단계 롤백 절차
- `../rollback/156-ipad-goat-arena-public-route.md`: iPad GOAT Arena 공개 명칭·웹 경로 정본 롤백 절차
- `../rollback/157-ipad-test-shell-portability.md`: iPad 핵심 검증 스크립트의 호출 셸 독립성 롤백 절차
- `../rollback/158-local-ai-projector-type-boundary.md`: 로컬 AI 텍스트·비전 모델 프로젝터 타입 경계 롤백 절차
- `../rollback/159-web-visual-learning-controls.md`: 웹 시각화 학습의 모션·제어·모바일 제목 정비 롤백 절차
- `../rollback/160-web-learning-flow-controls.md`: 웹 학습 흐름의 네이티브 조작·코치 정본 롤백 절차
- `../rollback/161-web-exact-viewport-capture.md`: 웹 승인 캡처의 실제 CSS viewport 강제·V2 manifest 롤백 절차
- `../rollback/162-web-intro-controls-language.md`: 웹 서비스 소개의 시각화 제어·코치·Arena 언어 롤백 절차
- `../rollback/163-ipad-device-install.md`: iPad 실기 설치 산출물·이전 앱 복구 안내
- `../rollback/164-web-public-responsive-evidence.md`: 공개 13면 5폭 캡처·커뮤니티 푸터·overflow 진단 도구 롤백 절차
- `../rollback/165-web-student-responsive-evidence.md`: 학생 20면 5폭 캡처·로컬 세션 주입·빠른 연습 모바일 수정 롤백 절차
- `../rollback/174-ipad-cheating-reason-boundary.md`: 부정행위 판정의 모델 자유 서술 차단 롤백 절차
- `../rollback/175-ipad-release-signing-audit.md`: Release archive의 실제 서명 종류 판별·증거 감사 롤백 절차
- `../rollback/176-ipad-local-git-baseline.md`: iPad 작업 복사본의 로컬 Git 기준점 제거·복원 절차

이 문서는 각 차수의 코드·테스트·캡처가 끝날 때 상태와 증거를 함께 갱신한다.
