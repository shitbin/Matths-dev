# Matths · Cafe24 운영 반영 가이드

현재 운영 기준 주소는 `https://matths.kr`이다. 이 문서는 코드·환경변수·DB 변경을 분리해,
한 단계가 실패해도 이전 버전으로 돌아갈 수 있게 만든 절차다. GitHub push는 디자인 승인 전까지
하지 않으며, Cafe24 반영도 승인된 로컬 커밋/아카이브만 사용한다.

로컬 미리보기는 `npm start`로 실행하며 항상 `127.0.0.1:27018`의 로컬 레플리카셋만 쓴다.
`config.env`의 Atlas 주소가 살아 있어도 자동 선택하지 않는다. 공유 Atlas를 읽어야 하는 별도
운영 점검만 `npm run start:atlas`로 명시 실행하며, 일반 UI 클릭 검증에는 사용하지 않는다.

## 0. 먼저 교체해야 하는 과거 자격증명

과거 공개 Git 기록에 Atlas 접속 문자열과 세션 키가 들어간 이력이 있다. 파일을 지운 것만으로는
무효화되지 않는다. 배포 전에 Atlas DB 사용자 비밀번호, `SECRET`, `API_TOKEN_SECRET`,
`PASSWORD_RESET_SECRET`, Arena 서버 비밀값을 새 값으로 회전하고 기존 세션을 폐기한다.
새 값은 Cafe24 환경변수에만 넣고 `config.env`나 배포 압축에 넣지 않는다.

## 1. 배포본 만들기

1. 승인할 로컬 커밋 ID를 기록한다.
2. `node scripts/run-tests.js --check`, `npm test`, `npm run ui:verify`를 통과시킨다.
3. `NODE_ENV=production npm run preflight`를 실제 Cafe24 환경변수로 실행한다.
4. `node_modules`, `config.env`, `.git`, 테스트 DB, 캡처, 모델, 임시 업로드를 제외한 배포
   아카이브와 동일 커밋의 롤백 아카이브를 만든다.
5. 적용 직전 Cafe24의 현재 코드와 환경변수 이름 목록을 백업한다. 비밀값 자체는 문서에 적지 않는다.

배포 아카이브에는 같은 커밋의 `tests/`와 규칙 정본 `docs/`도 포함한다. 새 디렉터리에
풀고 의존성을 설치한 뒤 `npm run test:deployment`과 `npm run ui:verify`를 다시 실행할 수
있어야 하며, `tests/`가 없는 아카이브는 운영 반영 대상으로 사용하지 않는다. 형제 iPad
저장소 소스를 읽는 교차계약 4개는 패키징 전 전체 `npm test`에서만 실행하며 정확한 목록을
`RELEASE-MANIFEST.json`에 기록한다.

작업 트리를 차수 커밋으로 깨끗하게 만든 뒤 다음 명령이 4번의 두 아카이브와 SHA-256 manifest를
생성한다. 기본 롤백 기준은 최신 GitHub 통합 직후 커밋 `42ae09a`이며, 실제 직전 배포 커밋을 알고
있으면 명시적으로 바꾼다.

```text
npm run release:cafe24
node scripts/buildCafe24Release.js --rollback-ref=<직전 배포 커밋>
```

## 2. Cafe24 필수 환경변수

```text
NODE_ENV=production
PUBLIC_BASE_URL=https://matths.kr
DB=<Atlas 운영 URI>
SECRET=<새 세션 키, 32바이트 이상>
API_TOKEN_SECRET=<SECRET과 다른 새 키, 32바이트 이상>
PASSWORD_RESET_SECRET=<별도 새 키>
ARENA_QUESTION_PACK_SEED_SECRET=<32바이트 이상>
ARENA_DEFENDER_ASSIGNMENT_SEED_SECRET=<32바이트 이상>

GOOGLE_OAUTH_CLIENT_ID=<웹 OAuth 클라이언트 ID>
GOOGLE_OAUTH_CLIENT_SECRET=<서버 전용 비밀키>
GOOGLE_OAUTH_REDIRECT_URI=https://matths.kr/auth/google/callback

GMAIL_USER=<발송 Gmail 계정>
GMAIL_APP_PASSWORD=<공백 제외 16자리 앱 비밀번호>
EMAIL_FROM_ADDRESS=<Gmail에서 인증된 발신 주소, 선택>
EMAIL_FROM_NAME=Matths
ADMIN_EMAIL=<운영 알림 수신 주소>

PAYMENT_CHECKOUT_ENABLED=0
TOSS_CLIENT_KEY=<결제를 열 때만>
TOSS_SECRET_KEY=<결제를 열 때만>
```

Google 비밀키·Toss secret·DB URI는 웹 브라우저나 iPad 앱에 넣지 않는다. iPad는
`https://matths.kr`의 서버 시작 경로만 호출하고, Google 인증 결과는 5분짜리 단일 사용 코드로
앱에 돌아온다.

## 3. 외부 콘솔 등록값

- Google 승인 콜백: `https://matths.kr/auth/google/callback`
- Toss 성공: `https://matths.kr/payments/toss/success`
- Toss 실패: `https://matths.kr/payments/toss/fail`
- Toss 웹훅: `https://matths.kr/webhooks/toss-payments`

처음에는 `PAYMENT_CHECKOUT_ENABLED=0`으로 배포한다. Google 신규/기존 로그인, 이메일 인증,
비밀번호 재설정, iPad OAuth 복귀를 확인한 뒤 Toss 테스트 키로 승인·실패·새로고침·웹훅 재전송을
검증한다. 운영 결제는 그 다음 별도 승인으로 연다.

## 4. DB 변경 경계

배포 코드가 뜬다는 이유로 마이그레이션을 자동 실행하지 않는다. 먼저 읽기 전용으로 다음을 확인한다.

```text
npm run db-authority-indexes:audit
node scripts/migrateAccessCycleLifecycleCollection.js
```

출력과 백업을 검토하고 변경 승인을 받은 뒤에만 `--apply`와 해당 확인 문자열을 사용한다.
결제 원장·경기 정산·학생 진도 문서는 수동 삭제하거나 임의 수정하지 않는다.

## 5. 반영 뒤 스모크 테스트

1. `/api/v1/health`가 정상이고 비밀값이 응답·로그에 없는지 확인한다.
2. 웹 이메일 로그인, Google 기존 계정, Google 신규 가입, 취소·재시도를 확인한다.
3. 같은 계정으로 iPad 로그인·토큰 갱신·로그아웃을 확인한다.
4. 커리큘럼 진도, 평가 저장, 오답노트, 주간 모의고사 저장/제출을 확인한다.
5. GOAT Arena에서 접근 조건, Unranked/Ranked 신청, 한 문제 진행, 증거 제출, 정산을 확인한다.
6. 결제가 닫힌 상태에서는 주문 intent가 만들어지지 않는지 확인한다.
7. 320/390/768/1024/1440 화면 캡처를 승인 패키지에 추가한다.

## 6. 롤백

1. 결제가 열려 있다면 먼저 `PAYMENT_CHECKOUT_ENABLED=0`으로 닫는다.
2. 직전 배포 아카이브를 복원한다. 이미 승인된 결제나 경기 정산을 삭제하지 않는다.
3. DB 마이그레이션은 각 문서의 전용 롤백 절차와 백업을 사용하며 코드 롤백과 묶어 즉흥적으로
   되돌리지 않는다.
4. 실패 시각, 적용 커밋, 영향 경로, 롤백 완료 시각을 운영 기록에 남긴다.

구형 Render 청사진 `render.yaml`은 과거 호스팅 참고 자료일 뿐 현재 Cafe24 배포 정본이 아니다.
