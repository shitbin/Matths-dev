# 웹 리디자인 승인 스크린샷

촬영 기준은 iPad 세로 분할 검증 폭인 `768 × 1024`이다. `before/`는 작업 시작
커밋 `cb43a4a`를 임시 복제해 동일한 로컬 테스트 DB와 테스트 계정으로 렌더한
기준선이고, `after/`는 현재 로컬 작업본이다. 운영 Atlas에는 쓰지 않았다.

## 비교 가능한 페이지

| 화면 | 수정 전 | 수정 후 |
|---|---|---|
| 공개 랜딩 | `before/landing-ipad-768.png` | `after/landing-ia-ipad-768.png` |
| 서비스 소개 | `before/intro-ipad-768.png` | `after/intro-ipad-768.png` |
| FAQ | `before/faq-ipad-768.png` | `after/faq-ipad-768.png` |
| 이용약관 | `before/terms-ipad-768.png` | `after/terms-ipad-768.png` |
| 개인정보 | `before/privacy-ipad-768.png` | `after/privacy-ipad-768.png` |
| 로그인 | `before/login-ipad-768.png` | `after/login-ipad-768.png` |
| 교육과정 | `before/curriculum-ipad-768.png` | `after/curriculum-ipad-768.png` |
| 시각화 학습 | `before/visual-learning-ipad-768.png` | `after/visual-learning-ipad-768.png` |
| 학습 과정 | `before/learning-flow-ipad-768.png` | `after/learning-flow-ipad-768.png` |
| 가격 | `before/pricing-ipad-768.png` | `after/pricing-ipad-768.png` |
| 문의 | `before/contact-ipad-768.png` | `after/contact-ipad-768.png` |
| 커뮤니티 | `before/community-ipad-768.png` | `after/community-ipad-768.png` |
| 학부모 로그인 | `before/parent-login-ipad-768.png` | `after/parent-login-ipad-768.png` |
| 대시보드 | `before/main-ipad-768.png` | `after/main-ipad-768-current.png` |
| 내 학습 | `before/my-learning-ipad-768.png` | `after/my-learning-ipad-768.png` |
| 내 교육과정 | `before/log-curriculum-ipad-768.png` | `after/log-curriculum-ipad-768.png` |
| 오답노트 | `before/wrong-notes-ipad-768.png` | `after/wrong-notes-ipad-768.png` |
| 오답 복습 상세 | `before/wrong-note-review-ipad-768.png` | `after/wrong-note-review-ipad-768.png` |
| 단원·개념 학습 | `before/unit-learning-ipad-768.png` | `after/unit-learning-ipad-768.png` |
| 평가 센터 | `before/assessments-ipad-768.png` | `after/assessments-ipad-768.png` |
| 주간 공식 모의고사 | `before/private-mock-exams-ipad-768.png` | `after/private-mock-exams-ipad-768.png` |
| 공식 모의고사 이용 상태 | `before/account-restriction-ipad-768.png` | `after/account-restriction-ipad-768.png` |
| 40초 눈풀이 | `before/quick-practice-ipad-768.png` | `after/quick-practice-ipad-768.png` |
| 문구 제안소 | `before/coach-suggestions-ipad-768.png` | `after/coach-suggestions-ipad-768.png` |
| 아카이브 | `before/archive-ipad-768.png` | `after/archive-ipad-768.png` |
| 상점 | `before/store-ipad-768.png` | `after/store-ipad-768.png` |
| 알림 | `before/notifications-ipad-768.png` | `after/notifications-ipad-768.png` |
| 프로필 | `before/profile-ipad-768.png` | `after/profile-ipad-768.png` |
| GOAT Arena | `before/goat-arena-ipad-768.png` | `after/goat-arena-ipad-768.png` |
| GOAT Arena 룰북 | `before/goat-arena-rulebook-sub-ipad-768.png` | `after/goat-arena-rulebook-sub-ipad-768.png` |

모든 표 항목은 `before/after` 양쪽 파일 존재 검사를 통과했다. 대시보드처럼
고정 사이드바가 있는 화면은 브라우저의 전체 페이지 캡처 왜곡을 피하기 위해
동일한 768 × 1024 첫 화면으로 맞췄다.

오답 복습 상세 비교에는 로컬 레플리카셋의 테스트 계정에만 임시 오답 1건을
생성해 같은 ID로 기준선과 수정본을 촬영했고, 촬영 직후 해당 기록을 삭제했다.

## 2026-08-11 최신 코드 차수 주의

위 `after/` 이미지는 2026-08-09 승인 패키지 기준이다. 이후 공통 제품 마감층과
세부 화면군, 학생용 한국어 라벨이 추가로 수정됐으므로 최신 코드의 최종 승인 증거로
간주하지 않는다. 현재 샌드박스는 Atlas SRV DNS와 로컬 포트 바인딩을 차단해 최신
로컬 서버를 브라우저로 열 수 없었다. 운영 Atlas 쓰기나 Cafe24 배포로 우회하지 않았다.

다음 캡처 차수에서는 `320 / 390 / 768 / 1024 / 1440` 다섯 폭을 같은 데이터로 다시
촬영하고, 특히 알림 상세·게시글 상세·평가 응시·오답 재풀이·결제·약관·관리자 표의
가로 넘침과 44px 조작 영역을 확인한다. 새 캡처가 들어오기 전 추적표 2·3번은 완료로
올리지 않는다.

캡처 실행 경로는 `npm run evidence:web`으로 고정했다. 공개·학생·학부모·관리자 4개
역할의 고정 화면 55개를 다섯 폭으로 촬영하며, 인증 화면으로 되돌아온 결과나 생성되지
않은 PNG가 하나라도 있으면 실패한다. ID가 필요한 상세 화면은 로컬 테스트 데이터의
경로를 별도 JSON 계획으로 추가한다. 실행 준비와 승인 조건은 `CAPTURE_RUNBOOK.md`를
따른다. 현재 샌드박스에서는 Chrome 프로세스와 로컬 서버가 막혀 실제 이미지를 만들지
못했으므로 자동화 구현만 `구현`으로 기록하고 시각 승인은 여전히 보류한다.
