# Matths development workspace

Matths 웹과 iPad 앱의 공개 통합 개발 저장소입니다.

- `web/`: Node.js/EJS 웹 서버와 Cafe24 배포 소스
- `ipad/`: SwiftUI iPad 앱
- 운영 기준 origin: `https://www.matths.kr`
- 웹 소스 스냅샷: `1c2fe6ccad89557518dfc968036906ca7a11a045`
- iPhone+iPad 소스 스냅샷: `63d7f5e5a5121ebe9d79cc424885f4b2c1cae81f`

이번 스냅샷에는 13과목 220개 커리큘럼 스토리와 1,100개 장면별 교사식 모션,
순한맛·매운맛·이해 확인 분기, 근거 중심 코치, 웹·iPhone·iPad 타임라인,
Google OAuth의 `www.matths.kr` 기준 PKCE 앱 로그인, 웹·iPad 오답 풀이 플로팅,
유니버설 iPhone+iPad 레이아웃, 9개 티어 하드웨어 디코딩 rank MP4와 빌드
provenance가 포함됩니다. GOAT Arena의 경기 로직·규칙·경제·정산·난이도·티어 정의·
상점 정책은 동결이며, 별도 제품 승인 없이 변경하면 안 됩니다.

커리큘럼 시스템 TTS는 여성 `ko-KR` 음성을 우선하며, 220개 문장 chunk를 실제
Yuna 음성으로 합성한 결과 234.9~346.7초, 평균 274.6초, timeout 0을 확인했습니다.

## Source and secret policy

이 저장소는 `is4553807/Matths` 원본 저장소와 분리된 공개 통합 작업본입니다. 원본에는
push하지 않으며 검증된 tracked content만 스냅샷으로 반영합니다. 전체 Git 이력을 subtree로
가져오지 않으므로 정확한 provenance는 [`SOURCE-SNAPSHOT.json`](./SOURCE-SNAPSHOT.json)을
기준으로 확인하십시오.

운영 자격증명, `.env`, OAuth client secret, DB URI, 서명 인증서, KICE PDF,
`llama.xcframework`, 실사용자 데이터와 빌드 산출물은 공개 Git에 포함하지 않습니다.
현재 구현·운영 경계와 검증 명령은 [`HANDOFF-2026-08-15.md`](./HANDOFF-2026-08-15.md)에
정리되어 있습니다.

## Local run

```sh
cd web
npm ci
PORT=8000 npm start
```

iPhone/iPad 앱은 `ipad/Matths.xcodeproj`를 Xcode에서 엽니다. Google OAuth와 DB·결제 비밀값은
배포 환경변수 또는 Xcode build setting으로만 주입합니다. 공개 checkout에는 비재배포
리소스가 없으므로 로컬 AI 링크와 내부 KICE 검증은 별도 승인된 overlay가 필요합니다.

## Rollback

동기화 전 공개 `main`은 다음 두 원격 ref로 보존했습니다.

- branch: `rollback/pre-motion-sync-20260815-717490f`
- annotated tag: `snapshot/pre-motion-sync-20260815-717490f`
- commit: `717490fdef70586d5cd7bdb78e7875cc4590253c`
