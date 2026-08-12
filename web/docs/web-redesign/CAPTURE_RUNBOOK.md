# 최신 웹 5폭 캡처 실행서

이 절차는 현재 코드의 공개·학생·학부모·관리자 화면을 `320 / 390 / 768 / 1024 /
1440px`에서 동일하게 촬영한다. 운영 DB에 쓰기 실험을 하지 않는다. 로그인 화면으로
리다이렉트된 결과를 정상 캡처로 세지 않으며, 한 장이라도 실패하면 종료 코드 1을
반환한다.

## 1. 전용 로그인 프로필 준비

일상적으로 쓰는 Chrome 프로필을 재사용하지 않는다. 학생·학부모·관리자용 빈 폴더를
각각 만든 뒤 Chrome을 해당 `--user-data-dir`로 한 번 열어 로컬 테스트 계정으로
로그인한다. 캡처 전에 해당 Chrome 창을 완전히 종료한다.

```sh
export MATTHS_CAPTURE_STUDENT_PROFILE="$PWD/tmp/capture-profile-student"
export MATTHS_CAPTURE_PARENT_PROFILE="$PWD/tmp/capture-profile-parent"
export MATTHS_CAPTURE_ADMIN_PROFILE="$PWD/tmp/capture-profile-admin"
```

자동화된 로컬 검증에서는 별도 Chrome 프로필 대신 로그인 응답의 `connect.sid` 값만
역할별 환경변수로 전달할 수도 있다. 값은 manifest나 캡처 HTML에 저장하지 않는다.

```sh
export MATTHS_CAPTURE_STUDENT_COOKIE="<local connect.sid value>"
export MATTHS_CAPTURE_PARENT_COOKIE="<local connect.sid value>"
export MATTHS_CAPTURE_ADMIN_COOKIE="<local connect.sid value>"
```

테스트 계정과 로컬 레플리카셋은 웹 리디자인 인수인계서의 로컬 검증 절차를 사용한다.
Atlas 실데이터에는 테스트 문항·오답·결제·게시물을 만들지 않는다.

학부모·관리자 역할 계정이 없는 로컬 DB에는 다음 명령으로 캡처 전용 계정만 멱등 생성한다.
스크립트는 localhost 주소와 test/dev/local/preview 이름을 모두 확인하고, `config.env`를 읽지
않으며, 확인값이 없으면 연결 전에 실패한다.

```sh
DB="mongodb://127.0.0.1:27018/matths-mergetest?replicaSet=rs0&directConnection=true" \
MATTHS_CAPTURE_SEED=local-only \
MATTHS_CAPTURE_SEED_PASSWORD="<local test password>" \
npm run evidence:seed-local-roles
```

## 2. 서버와 캡처 실행

첫 터미널에서 로컬 서버를 시작하고 두 번째 터미널에서 캡처한다.

```sh
PORT=8000 node server.js
npm run evidence:web
```

공개 화면만 먼저 확인하려면 다음처럼 실행한다.

```sh
npm run evidence:web -- --roles public
```

결과는 `evidence/web-<시각>/`에 저장되며 Git에 포함되지 않는다. `manifest.json`의
`failureCount`가 0이고 모든 항목의 `ok`가 `true`여야 승인 자료로 사용할 수 있다.

## 3. ID가 필요한 상세 화면

오답 복습·평가 응시·게시글 상세·알림 상세·결제 상세처럼 ID가 필요한 화면은 별도 JSON
배열로 추가한다. 값은 로컬 테스트 DB에서 만든 데이터만 사용한다.

```json
[
  {
    "slug": "wrong-note-review",
    "route": "/wrong-notes/LOCAL_ATTEMPT_ID/review",
    "role": "student"
  },
  {
    "slug": "community-detail",
    "route": "/community/LOCAL_POST_ID",
    "role": "student"
  }
]
```

```sh
npm run evidence:web -- --extra-plan ./tmp/capture-extra.json
```

## 4. 승인 확인

- 모든 폭에서 가로 스크롤과 잘린 고정 요소가 없어야 한다.
- 메뉴·탭·버튼의 최소 조작 영역은 44px이어야 한다.
- 하단 고정 내비가 마지막 콘텐츠와 겹치지 않아야 한다.
- 키보드·dialog·popover는 브라우저 캡처로 대신하지 않고 실제 iPad Split View에서
  별도 촬영한다.
- 전·후 비교는 같은 계정·같은 데이터·같은 폭으로만 판정한다.

모든 캡처가 통과한 뒤 전체 Git 코드, 최신 다섯 폭 PNG, 과거 768px 기준선, 독립 심사
요청서, SHA-256 목록을 하나로 묶는다.

```sh
npm run review:package -- --evidence ./evidence/web-<시각>
```

패키지는 `dist/design-review/`에 생성된다. 캡처가 하나라도 실패했거나 실제 PNG 폭이
manifest와 다르거나 작업 폴더가 커밋되지 않은 상태면 패키지를 만들지 않는다. Chrome
프로필은 포함하지 않고 manifest가 가리키는 PNG만 복사한다.

## DB 없는 핵심 EJS 미리보기

전체 4역할 증거 전 단계에서 Arena·평가·관리자 핵심 22면을 로컬 fixture로 먼저 확인할 수 있다.

```sh
MATTHS_PREVIEW_PORT=8011 node scripts/previewLocalUi.js
node scripts/captureResponsiveEvidence.js \
  --base-url http://127.0.0.1:8011 \
  --roles public \
  --extra-plan docs/web-redesign/preview-evidence-plan.json \
  --only-extra \
  --output evidence/preview-core
```

기본 캡처 드라이버는 Chrome DevTools Protocol이다. 각 PNG를 만들기 전에 요청 폭을 CSS
viewport에 강제하고 `window.innerWidth/innerHeight`와 스크롤 원점이 정확히 일치하는지
검증한다. Chrome CLI의 `--window-size`만 사용하는 `--driver cli`는 가짜 Chrome을 쓰는
계약 테스트나 문제 진단에만 허용하며 디자인 승인 증거로 사용하지 않는다. manifest의
`captureDriver`는 `cdp`, 각 캡처의 `viewportVerified`는 `true`여야 한다.

이 결과는 22면×5폭의 빠른 디자인 회귀 자료이며, 로그인된 4역할 54면×5폭 최종 승인을
대체하지 않는다. 존재하지 않는 route의 `Cannot GET` DOM도 성공 캡처로 인정하지 않는다.

## v8 S142/S143 결제·오류 18상태 증거

결제 5면, 공통 `error.ejs`의 12개 상태 카피, `goat-arena-error.ejs` 1면은 운영 DB나
운영 라우트를 만들지 않는 전용 fixture 서버로 촬영한다. 아래 명령은 fixture 서버를
loopback 임시 포트로만 열고, CDP 캡처가 끝나면 종료한다. `NODE_ENV=production`에서는
fixture 서버와 실행기가 모두 시작 전에 실패한다.

```sh
npm run evidence:web:v8-gaps -- \
  --output evidence/web-v8-gaps-final
```

Chrome을 자동으로 찾지 못하는 환경에서는 경로만 추가한다.

```sh
npm run evidence:web:v8-gaps -- \
  --chrome "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --output evidence/web-v8-gaps-final
```

정본 계획은 `docs/web-redesign/v8-evidence-gap-plan.json`이다. 실행기는 다음 조건을 모두
확인하고 하나라도 다르면 종료 코드 1을 반환한다.

- Git 추적 작업본이 깨끗하고 manifest의 `sourceCommit`이 실행 커밋과 같음
- CDP driver, 정확한 viewport, HTTP 문서 상태, viewport·full-page PNG가 모두 유효함
- 18상태×5폭=90장이고 실패 수가 0임
- 가로·요소 내부 overflow가 없음
- 각 상태의 `expectedText`가 실제 렌더 DOM에 모두 존재함
- extra plan SHA-256과 18면 수가 manifest에 기록됨

fixture EJS는 실제 `views/`와 공통 오류 view model을 사용하지만, production `server.js`에는
`/__evidence__` 경로나 fixture 모듈을 mount하지 않는다. 따라서 이 90장은 상태별 반응형
증거이며, 운영 결제사 round-trip·실계정 권한·운영 DB 검증을 대체하지 않는다.
