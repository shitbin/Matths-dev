# 앱 디자인 원칙 · 바이브코딩 냄새 감사 역사 원장

> 이 문서는 **역사 감사 기록이며 작업 목록이 아니다.** 각 finding은 원문, 현재 코드,
> 사용자 동결 범위를 사람이 다시 확인하고 별도 승인을 받기 전에는 구현 지시로 사용할 수 없다.

- 생성: 2026-08-14, 정정: 2026-08-15
- 감사 기준: 웹 `d6c62938`, iPad `8869906f`
- 원시 에이전트 항목: 121건
- 현재 사실 항목: 118건
- provenance: **unverified** — 원시 report와 원문 PDF는 이 저장소에 동봉되지 않았다.

원문 PDF의 SHA-256과 외부 journal의 비식별 해시는 JSON에 남아 있지만, 저장소만으로 페이지
커버리지, 누락 없음, 중복 판정을 독립 재현할 수 없다. 숫자와 근거를 새 작업 목록처럼 소비하지 않는다.

## 건수

| 구분 | 전체 | P1 | P2 | INFO | iPad | 웹 | 공통 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 원시 역사 항목 | 121 | 29 | 88 | 4 | 68 | 46 | 7 |
| 현재 사실 항목 | 118 | 29 | 86 | 3 | 66 | 46 | 6 |

현재 사실 항목은 `status`가 `retracted` 또는 `resolved`가 아닌 항목이다. 여기에는
`report-only`·`frozen`도 포함되므로 118은 실행 가능한 작업 수가 아니다. 기존 root-cause
묶음과 그 수치는 검증되지 않아 철회했고, finding 사이의 자동 중복 링크도 제거했다.

## 정정 이력

- `0274` — **retracted**. PencilKit 실측이 정적 추론을 반증했다. 재현 소스와 명령은
  `docs/PKDRAWING-DARK-MODE-REPRO.md`에 있다. JSON의 반증된 `evidence`·`fixDirection`은 제거했다.
- 원문 `S-05` — **retracted**. 이 규칙은 CORS·credential·CSRF 경계에 관한 것이며 보안 응답
  헤더 드리프트와 동일한 원칙이 아니다.
- `DEPLOY-HEADER-DRIFT` — **active / P2**. 운영에는 헤더가 있으나 소스와 배포 계약에 소유권이
  고정되지 않은 별도 운영 위험으로 기록했다.
- `0132`, `1706` — **resolved**. iPhone·iPad 유니버설 전환 commit `bcf0234`에서 유니버설 타깃,
  compact chrome, 손가락 필기와 세로 size-class 계약을 구현했다.

## Arena 동결

GOAT Arena와 연결된 advance, 신호 재전송, outbox, 데이터 마이그레이션, 랭킹·상점·전용 계약
항목은 `frozen: true`, `status: "report-only"`로 기록한다. 현상과 위험은 보존하지만 사용자 승인
전에는 `fixDirection`으로 실행하지 않는다. 비-Arena 문제와 한 finding에 섞인 항목은 먼저 분리한다.

## 현재 P1 29건

- `0072` [iPad] — 검색 결과에서 돌아왔을 때 검색어·필터·스크롤 위치를 보존한다.
- `0402` [iPad] — 본문 텍스트와 배경은 WCAG AA 대비를 목표로 한다.
- `0712` [iPad] — 버튼의 보이는 높이와 터치 영역은 최소 44pt를 확보한다.
- `0749` [iPad] — 버튼 QA는 기본·눌림·포커스·비활성·로딩·성공·오류·큰 글자를 포함한다.
- `0862` [iPad] — 필드 종류에 맞는 키보드와 자동완성 속성을 사용한다.
- `0866` [iPad] — 일회용 인증번호는 시스템 자동완성과 붙여넣기를 지원한다.
- `0870` [iPad] — 입력 중 키보드를 닫을 수 있는 자연스러운 경로를 제공한다.
- `0918` [iPad] — 약관 제목·필수 여부·내용 보기·선택 컨트롤을 명확히 분리한다.
- `1202` [iPad] — **report-only / frozen**. 공통 터치 개선과 Arena 호출부가 섞인 제안.
- `1629` [iPad] — 권한 상태를 시스템 설정과 동기화한다.
- `1688` [iPad] — 회전·창 크기 변경 뒤에도 실행 취소 상태를 보존한다.
- `1780` [iPad] — **report-only / frozen**. GOAT 탭을 포함한 루트 화면 수명 변경.
- `1815` [iPad] — **report-only / frozen**. 공용 버튼과 ArenaShop 변경이 섞인 제안.
- `1565` [웹] — 결과가 불확실하면 실패로 단정하지 않고 조회 경로를 제공한다.
- `1566` [웹] — 결제 성공 화면에 거래 대상·금액·시간·내역 접근을 제공한다.
- `B-01/X-08` [웹] — 유효하지 않은 입력을 도메인 계층에서 다시 검증한다.
- `B-05` [웹] — 부분 실패의 최종 상태와 복구 지점을 정의한다.
- `B-09` [웹] — **report-only / frozen**. Arena outbox 재시도·중복·독성 이벤트 위험.
- `B-09 … DLQ 런북` [웹] — **report-only / frozen**. Arena outbox 백오프·격리 절차 위험.
- `C-06 / B-05-A·B-05-C` [웹] — **report-only / frozen**. Arena 데이터 마이그레이션 가역성 위험.
- `F-07/소유권` [웹] — **report-only / frozen**. Arena 죽은 코드와 테스트 소유권 위험.
- `P-09` [웹] — **report-only / frozen**. Arena gradient 가드의 구조적 오탐·누락 위험.
- `Q-04 … 신호 재전송` [웹] — **report-only / frozen**. Arena 신호 배치 중복 위험.
- `Q-04 … advance 멱등성` [웹] — **report-only / frozen**. Arena 문항 전진 재시도 위험.
- `S-03` [웹] — iPad 진도 입력을 서버 원본으로 다시 검증한다.
- `S-03 … 기기 토큰` [웹] — **report-only / frozen**. Arena 판정 입력의 클라이언트 신뢰 위험.
- `S-03-A / S-03-C` [웹] — 영향 있는 입력을 서버가 다시 계산하고 검증한다.
- `S-08` [웹] — **report-only / frozen**. Arena 비밀과 일반 키 관리가 섞인 회전·복구 위험.
- `X-01/X-04` [웹] — 영구 실패에는 재시도 대신 종료 상태와 다음 행동을 제공한다.

## 사용 방법

1. JSON에서 `status`·`frozen`·`reportOnlyNote`를 먼저 확인한다.
2. `retracted`, `resolved`, `report-only`, `frozen`은 구현 목록에 넣지 않는다.
3. 나머지도 원문과 현재 HEAD에서 근거를 다시 확인한 뒤 별도 작업으로 승인한다.
4. 원장의 `fixDirection`은 역사 제안이며 현재 코드에 그대로 적용할 명령이 아니다.

전체 121개 역사 항목과 정정 필드는 `docs/principles-smell-audit.json`이 정본이다.
