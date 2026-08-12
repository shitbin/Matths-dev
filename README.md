# Matths development workspace

Matths 웹과 iPad 앱의 통합 개발 저장소입니다.

- `web/`: Node.js/EJS 웹 서버와 Cafe24 배포 소스
- `ipad/`: SwiftUI iPad 앱
- `deliverables/`: Git에 포함하지 않는 로컬 전달 빌드 경로

## Source policy

이 저장소는 `is4553807/Matths` 원본 저장소와 분리되어 있습니다. 원본에는 push하지
않으며, 검증된 로컬 변경만 이 비공개 저장소에 반영합니다. 웹과 iPad 소스는 각 로컬
저장소의 전체 Git 이력을 subtree로 보존합니다.

## Local run

```sh
cd web
npm install
PORT=8000 npm start
```

iPad 앱은 `ipad/Matths.xcodeproj`를 Xcode에서 엽니다. 운영 도메인·Google OAuth·결제
비밀값은 저장소에 커밋하지 않고 배포 환경변수와 Xcode build setting으로 주입합니다.

