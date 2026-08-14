# Codex 인수인계 — 감사 이후 상태

> `docs/principles-smell-audit.json`은 **역사 감사 기록이지 작업 목록이 아니다.** 원시 report와
> 원문 PDF가 저장소에 없으므로 provenance와 전체 커버리지는 독립 검증되지 않았다. finding을
> 자동 실행하지 말고 원문·현재 코드·사용자 동결 범위를 다시 확인한 뒤 별도 승인된 작업으로 만든다.

작성 2026-08-14, 정정 2026-08-15.

## 현재 기준

- 이 문서 브랜치 기준점: 웹 `32c0f8f` (`d6296bf` 포함)
- OAuth/Purge 이후 별도 웹 기능 완료: `e9eed49` — 상단 커리큘럼 스토리 타임라인
- iPad 유니버설 전환: `bcf0234`
- iPad 별도 기능 완료: `c9293bf` — compact 커리큘럼 스토리 타임라인
- 실기 iPad 설치·launch 확인: `fa46a6d`

별도 기능 SHA는 완료 현황일 뿐 이 문서 브랜치에 포함됐다는 뜻이 아니다. 적용할 때는 대상 브랜치의
조상 관계와 clean 상태를 다시 확인한다.

## 감사 원장 읽는 법

| 구분 | 전체 | P1 | P2 | INFO | iPad | 웹 | 공통 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 원시 역사 항목 | 121 | 29 | 88 | 4 | 68 | 46 | 7 |
| 현재 사실 항목 | 118 | 29 | 86 | 3 | 66 | 46 | 6 |

- 현재 사실 항목은 `retracted`·`resolved`를 제외한 수다.
- `report-only`·`frozen`도 118에 포함되므로 이 숫자는 실행 가능한 작업 수가 아니다.
- 기존 root-cause 수치와 자동 링크는 검증되지 않아 제거했다.
- JSON을 필터한 결과만으로 커밋을 만들지 않는다. 각 항목의 현행 재현과 승인이 먼저다.

## 절대 경계

- **GOAT Arena는 구현까지 동결한다.** 규칙·수치·경제·정산·난이도·티어·상점뿐 아니라 advance,
  신호 재전송, outbox, 데이터 마이그레이션, 랭킹·상점 UI와 Arena 전용 테스트도 별도 승인 전에는
  바꾸지 않는다. 원장의 관련 항목은 `frozen: true`, `status: "report-only"`다.
- 원격 push, 운영 배포, 외부 전달은 별도 승인 없이는 하지 않는다.
- 비밀·개인 식별자·로컬 절대 경로를 문서·로그·커밋 메시지에 남기지 않는다.
- 환경 장애는 `docs/LOCAL-ENV-RUNBOOK.md`로 먼저 구분한다.

## 완료된 보안 작업

### PKCE 우회와 레거시 별칭

- `9ff7765` — verifier 필수화와 challenge 정확 일치
- `a5421a7` — `/api/v1/auth/google/start` 레거시 별칭 제거
- 라우터와 Cafe24 검증기 모두 별칭 부재를 검사한다.

### D2 — 소비된 grant의 동일 응답 재생 (`d6296bf`)

완료됐다. 다시 구현하지 않는다.

- 최초 소비는 `consumedAt`, `accessTokenIssuedAt`, `resultExpiresAt`을 한 번의 원자적 갱신으로 고정한다.
- 컨트롤러의 최초 JSON 결과는 API 비밀에서 파생한 키로 AES-256-GCM 암호화한다.
- 결과 저장은 `responseCiphertext: null` 조건의 CAS라 동시 요청도 최초 결과 하나로 수렴한다.
- grant와 결과 TTL은 최초 소비 뒤 60초 창으로 수렴하며, 창 뒤에는 401을 반환한다.
- 재생 결과의 Bearer를 `verifyAccessToken`으로 검증하고 `sub`와 현재 `tokenVersion`을 다시 확인한다.
- verifier는 RFC 7636의 43~128자 unreserved 문자만 허용한다.
- 단위·HTTP/Mongo 계약이 순차 재시도, 동시 2요청, 동일 응답·동일 토큰, 보호 API 사용,
  tokenVersion 변경, 결과 변조, 창 이후 401을 검사한다.

### 운영 계정 하드코딩 제거 (`32c0f8f`)

purge 도구는 저장소 밖의 권한 제한 JSON 입력을 사용하며, 문서의 운영 주소는 자리표시자로 바뀌었다.
실행 정본은 `docs/LAUNCH_DATA_PURGE.md`다. 공개 Git 과거 이력 정리는 별도 승인 절차다.

## 완료된 iPhone·iPad 전환 (`bcf0234`)

`0132`와 `1706`은 더 이상 작업 항목이 아니다.

- `TARGETED_DEVICE_FAMILY = "1,2"`
- 세로 size class 기반 compact top/tab chrome
- iPhone 손가락 필기 기본값과 기기별 안내 문구
- iPhone portrait/landscape 및 iPad 높이 정책 계약
- 접근성 44pt 최소 높이 유지

실기 iPad 설치와 launch도 `fa46a6d`에서 확인됐다.

## 역검증 정정

### `0274` 철회

다크 모드 도구 색은 흰색으로 해석되지만 `PKDrawing.image(from:scale:)`가 내보낸 중심 획은
라이트·다크 모두 `0,0,0,255`였다. 흰 배경 합성 뒤에도 검정이라 주장했던 필기 소실은 재현되지
않았다. 원장의 반증된 `evidence`·`fixDirection`은 제거했고, 재현 소스와 명령은
`docs/PKDRAWING-DARK-MODE-REPRO.md`에 고정했다. JSON 필드는 `status: "retracted"`다.

### S-05 철회와 배포 헤더 드리프트 분리

원문 S-05는 CORS·credential·SameSite·CSRF·preflight 경계 규칙이다. 운영 보안 응답 헤더를
이 규칙으로 분류한 것은 잘못이므로 S-05 매핑은 철회했다.

별도 `DEPLOY-HEADER-DRIFT` P2는 유지한다. 2026-08-14 운영 응답에는 CSP·HSTS·
X-Frame-Options DENY·nosniff·Referrer-Policy가 있었지만 저장소에는 소유권·배포 후 계약이 없다.

안전한 처리 순서는 다음과 같다.

1. 프록시·호스팅·애플리케이션 중 각 헤더의 단일 소유자를 정한다.
2. 배포된 응답을 검사하는 계약을 먼저 둔다.
3. Helmet을 추가하면서 CSP를 나중에 다룰 경우 `contentSecurityPolicy: false`를 명시한다.
4. CSP 헤더가 여러 개면 앞단 값이 덮어쓰는 것이 아니라 정책들이 함께 적용되어 더 제한적일 수 있다.
   기존 CSP를 무작정 복제하지 않는다.
5. 새 CSP는 별도 report-only 관찰 뒤 단일 소유 계층에서 enforce한다.

## 남은 항목을 작업으로 승격하는 절차

1. JSON에서 `status`, `frozen`, `reportOnlyNote`를 확인한다.
2. `retracted`, `resolved`, `report-only`, `frozen`은 제외한다.
3. 감사 기준 SHA가 아니라 대상 브랜치 HEAD에서 현상을 다시 재현한다.
4. 원문 PDF가 제공되면 규칙 매핑을 다시 확인한다. 제공되지 않으면 매핑은 `unverified`로 남긴다.
5. 비-Arena 범위만 별도 작업으로 제안하고 사용자 승인을 받는다.
6. 한 주제씩 변경하고 관련 계약과 `npm test`를 실행한다.

## 증거와 패키지 경계

- 원시 12-agent journal과 원문 PDF는 저장소에 동봉되지 않았다.
- 외부 v9 검수 패키지도 저장소 밖의 별도 artifact이며 로컬 경로를 정본으로 삼지 않는다.
- 따라서 원장의 전체 커버리지, 누락 없음, 중복 판정과 외부 패키지 상태는 이 저장소만으로 확인할 수 없다.
- 저장소 안에서 재현 가능한 정정은 `0274` 수동 재현과 원장 contract뿐이다.

## 참고

- `docs/principles-smell-audit.json` — 121개 역사 항목과 기계 판독 필드
- `docs/principles-smell-audit.md` — 사람용 요약
- `docs/PKDRAWING-DARK-MODE-REPRO.md` — `0274` 재현
- `docs/LOCAL-ENV-RUNBOOK.md` — 로컬 환경 복구
- `docs/GOOGLE_LOGIN_WEB_IPAD.md` — Google 로그인 정본
- `docs/LAUNCH_DATA_PURGE.md` — launch 데이터 purge 정본
