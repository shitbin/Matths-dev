# Google 로그인 — 웹·iPad 공통 계약

웹과 iPad 앱은 같은 Google OAuth 클라이언트와 같은 서버 callback을 사용한다.
클라이언트 비밀키는 앱에 넣지 않는다.

## 운영 환경 변수

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI=https://www.matths.kr/auth/google/callback`

## 흐름

1. 웹은 `/auth/google`, iPad는 Bearer API 경계와 분리된 공개 경로
   `/auth/google/app`에서 시작한다. PKCE 이전 별칭 `/api/v1/auth/google/start`는
   완료 가능한 로그인 경로가 아니어서 제거했으며 다시 만들지 않는다.
2. Google은 항상 `/auth/google/callback`으로 돌려보낸다.
3. iPad는 매 로그인마다 RFC 7636의 43~128자 unreserved verifier와 S256 challenge를
   만들며, 서버는 challenge를 OAuth session과 5분짜리 Matths 앱 grant에 결속해
   `matths://oauth/google`로 돌려준다. Google authorization code는 서버 밖으로 내보내지 않는다.
4. 앱은 grant code와 verifier를 `/api/v1/auth/google/exchange`에 제출하고 Bearer 토큰을
   받는다. callback URL을 다른 앱이 가로채도 verifier 없이는 교환할 수 없다. 최초 소비는
   토큰 발급 시각을 원자적으로 고정한다. 응답이 유실되면 60초 안의 동일 code+verifier
   재시도만 허용한다. 최초 JSON 응답은 서버 비밀로 AES-GCM 암호화해 짧게 저장하며,
   재시도는 새 Bearer를 발급하지 않고 그 응답을 그대로 복호화해 반환한다. 평문 Bearer와
   verifier는 저장하지 않는다. 60초 뒤에는 grant의 5분 TTL이 남아 있어도 교환하지 않는다.

iPad에서 Google 로그인 시 앱 위에 뜨는 브라우저 시트는 `ASWebAuthenticationSession`의
시스템 보안 UI다. Safari 앱으로 이탈시키거나 앱 안에 Google 비밀번호 입력 폼을 복제하지
않는다. 인증이 끝나면 검증된 `matths://oauth/google` callback으로 원래 앱에 복귀한다.

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
