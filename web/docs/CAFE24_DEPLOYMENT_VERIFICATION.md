# Cafe24 배포 뒤 확인

이 검사는 `matths.kr`을 읽기만 한다. 파일 업로드, DB 변경, 로그인, 결제 요청은 하지 않는다.

```sh
npm run release:cafe24:verify -- \
  --base-url=https://matths.kr \
  --output=../evidence/cafe24/deployment-verification.json
```

다음 네 항목이 모두 맞아야 `PASS`다.

1. `/api/v1/health`가 Matths API 정상 상태를 반환한다.
2. 배포 서버의 핵심 파일 fingerprint가 현재 로컬 후보와 같다.
3. 홈에 공식 SVG 로고, `220개념`, `13과목 학습 경로`가 있고 구형 `39개` 표식이 없다.
4. 운영 서버의 공식 로고 파일 SHA-256이 로컬 CI 원본과 같다.

fingerprint는 `views/index.ejs`, 공식 로고, 브랜드 토큰, 앱 API 라우트, 잠금된 의존성 파일을
경로 순서까지 포함해 계산한다. 비밀값, DB 내용, 사용자 정보는 포함하지 않는다.

실패하면 Cafe24 파일을 추가로 덮어쓰기 전에 `dist/cafe24/RELEASE-MANIFEST.json`의 release
commit·archive SHA-256을 다시 확인한다. 복구가 필요하면 같은 manifest의 rollback archive를
사용한다. 이 문서는 사람 승인 없이 업로드하라는 권한을 부여하지 않는다.
