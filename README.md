# Matths development workspace

Matths 웹과 iPad 앱의 통합 개발 저장소입니다.

- `web/`: Node.js/EJS 웹 서버와 Cafe24 배포 소스
- `ipad/`: SwiftUI iPad 앱
- `deliverables/`: Git에 포함하지 않는 로컬 전달 빌드 경로

## Source policy

이 저장소는 `is4553807/Matths` 원본 저장소와 분리된 공개 통합 작업본입니다. 원본에는
push하지 않으며, 검증된 웹·iPad 소스를 내용 스냅샷으로 반영합니다. 각 원본 저장소의
전체 Git 이력을 subtree로 가져오는 방식이 아니므로 정확한 provenance는
`SOURCE-SNAPSHOT.json`의 커밋 SHA와 원본 저장소에서 확인해야 합니다.

운영 자격증명, `.env`, OAuth client secret, DB URI, 서명 인증서와 실사용자 데이터는
절대 커밋하지 않습니다. 현재 후속 작업 경계와 검증 명령은
[`HANDOFF-2026-08-13.md`](./HANDOFF-2026-08-13.md)를 먼저 읽으십시오.

## Local run

```sh
cd web
npm install
PORT=8000 npm start
```

iPad 앱은 `ipad/Matths.xcodeproj`를 Xcode에서 엽니다. 운영 도메인·Google OAuth·결제
비밀값은 저장소에 커밋하지 않고 배포 환경변수와 Xcode build setting으로 주입합니다.
