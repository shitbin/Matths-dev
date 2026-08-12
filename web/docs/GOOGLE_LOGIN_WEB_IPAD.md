# Google 로그인 — 웹·iPad 공통 계약

웹과 iPad 앱은 같은 Google OAuth 클라이언트와 같은 서버 callback을 사용한다.
클라이언트 비밀키는 앱에 넣지 않는다.

## 운영 환경 변수

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI=https://www.matths.kr/auth/google/callback`

## 흐름

1. 웹은 `/auth/google`, iPad는 Bearer API 경계와 분리된 공개 경로
   `/auth/google/app`에서 시작한다. `/api/v1/auth/google/start`는 구버전 앱
   호환 별칭으로 같은 controller를 사용한다.
2. Google은 항상 `/auth/google/callback`으로 돌려보낸다.
3. iPad는 매 로그인마다 PKCE verifier/challenge를 만들며, 서버는 challenge를 OAuth
   session과 5분짜리 단일 사용 코드에 결속해 `matths://oauth/google`로 돌려준다.
4. 앱은 코드와 verifier를 `/api/v1/auth/google/exchange`에 한 번만 제출하고 기존
   Bearer 토큰을 받는다. callback URL을 다른 앱이 가로채도 verifier 없이는 교환할 수 없다.
   서버가 코드를 소비한 직후 응답만 유실된 경우에는 같은 코드+verifier 재시도가
   5분 만료 전 같은 계정 응답으로 수렴한다. verifier 없는 구버전 교환은 계속 1회용이다.

ASWebAuthenticationSession에 기존 Matths 웹 로그인 쿠키가 남아 있어도, 서버 세션에 저장된
`mobile: true` OAuth state가 맞으면 callback을 `/main`으로 가로채지 않고 앱으로 돌려보낸다.
일반 웹 로그인 callback은 기존처럼 로그인 중인 웹 세션에서 다시 시작하지 않는다.

앱은 callback의 scheme·host·path가 정확히 `matths://oauth/google`인지 확인하며 `code` 또는
`error` query가 중복되면 실패로 처리한다.

## 운영 증거 만들기

```sh
npm run google-oauth:evidence -- --write-template ../evidence/google/session.json
```

Google Console의 운영 redirect URI 화면과 웹·iPad의 기존 계정, 신규 가입, 취소, 재시도,
앱 복귀 영상을 비식별 상태로 기록한다. 각 파일의 SHA-256을 채운 뒤 실행한다.

```sh
npm run google-oauth:evidence -- \
  ../evidence/google/session.json \
  --output ../evidence/google/google-oauth-evidence.json
```

비밀키·토큰·인증 코드·쿠키·이메일 필드가 JSON에 있거나, 9개 왕복 중 하나라도 영상이 없으면
통과하지 않는다. 출력에는 client ID 원문 대신 SHA-256만 남는다.

Bearer 토큰이나 Google access token을 URL에 싣지 않는다. 신규 회원은 같은 웹 가입 폼에서
실명·생년월일·학년·학교·약관을 완료한 뒤 앱으로 돌아간다.

웹과 iPad 버튼은 같은 공식 4색 Google `G` 벡터를 사용한다. 단색 글자 `G`, 임의 원형 타일,
Matths 색으로 바꾼 Google 마크를 사용하지 않는다. iPad 자산은
`Assets.xcassets/GoogleGMark.imageset`, 웹 자산은 `views/partials/google-g-mark.ejs`가 정본이다.
