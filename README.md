# Matths development workspace

Matths 웹과 iPad 앱의 공개 통합 개발 저장소입니다.

- `web/`: Node.js/EJS 웹 서버와 Cafe24 배포 소스
- `ipad/`: SwiftUI iPad 앱
- 운영 기준 origin: `https://www.matths.kr`
- 웹 소스 스냅샷: `d6c62938fdd3726e0f7d052b47b57142eb42c68a`
- iPad 소스 스냅샷: `8869906fbb9a376b7015820a824506a79b7d2989`

이번 스냅샷에는 13과목 220개 커리큘럼 스토리, 웹·iPad 내레이션 타임라인,
Google OAuth의 `www.matths.kr` 기준 URL, iPad 분석 중 제출 풀이 표시, 그리고 9개 티어의
하드웨어 디코딩용 rank MP4가 포함됩니다. GOAT Arena의 경기 로직·규칙·경제·정산·난이도·
티어 정의·상점 정책은 동결이며, 별도 제품 승인 없이 변경하면 안 됩니다.

## Source and secret policy

이 저장소는 `is4553807/Matths` 원본 저장소와 분리된 공개 통합 작업본입니다. 원본에는
push하지 않으며 검증된 tracked content만 스냅샷으로 반영합니다. 전체 Git 이력을 subtree로
가져오지 않으므로 정확한 provenance는 [`SOURCE-SNAPSHOT.json`](./SOURCE-SNAPSHOT.json)을
기준으로 확인하십시오.

운영 자격증명, `.env`, OAuth client secret, DB URI, 서명 인증서, KICE PDF,
`llama.xcframework`, 실사용자 데이터와 빌드 산출물은 공개 Git에 포함하지 않습니다.
현재 구현·운영 경계와 검증 명령은 [`HANDOFF-2026-08-13.md`](./HANDOFF-2026-08-13.md)에
정리되어 있습니다.

## Local run

```sh
cd web
npm ci
PORT=8000 npm start
```

iPad 앱은 `ipad/Matths.xcodeproj`를 Xcode에서 엽니다. Google OAuth와 DB·결제 비밀값은
배포 환경변수 또는 Xcode build setting으로만 주입합니다. 공개 checkout에는 비재배포
리소스가 없으므로 로컬 AI 링크와 내부 KICE 검증은 별도 승인된 overlay가 필요합니다.

## Rollback

동기화 전 공개 `main`은 다음 두 원격 ref로 보존했습니다.

- branch: `rollback/pre-curriculum-sync-20260813-5575b8b`
- annotated tag: `snapshot/pre-curriculum-sync-20260813-5575b8b`
- commit: `5575b8b50043006bb9c2b4a6f7b8f40bbbb8a336`
