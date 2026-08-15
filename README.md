# Matths development workspace

Matths 웹과 iPad 앱의 공개 통합 개발 저장소입니다.

- `web/`: Node.js/EJS 웹 서버와 Cafe24 배포 소스
- `ipad/`: SwiftUI iPad 앱
- 운영 기준 origin: `https://www.matths.kr`
- 웹 소스 스냅샷: `9e31faf3659fb588ef847300fe4758b7234c29a4`
- iPhone+iPad 소스 스냅샷: `2819dbe3fb4f09933177d42ae580fb649b407a20`

이번 스냅샷에는 13과목 220개 커리큘럼 스토리와 1,100개 장면별 교사식 모션,
순한맛·매운맛·이해 확인 분기, 근거 중심 코치, 웹·iPhone·iPad 타임라인,
Google OAuth의 `www.matths.kr` 기준 PKCE 앱 로그인, 웹·iPad 오답 풀이 플로팅,
유니버설 iPhone+iPad 레이아웃, 9개 티어 하드웨어 디코딩 rank MP4와 빌드
provenance가 포함됩니다. GOAT Arena의 경기 로직·규칙·경제·정산·난이도·티어 정의·
상점 정책은 동결이며, 별도 제품 승인 없이 변경하면 안 됩니다.

이번 스냅샷은 iPad의 이용권·상점 허브, 서버 정본 상품 카탈로그, 2분·1회용 웹
결제 handoff, entitlement 복구·새로고침을 포함합니다. Release에서는 외부 디지털
구매 링크를 숨깁니다. iPad 학습 진도는 서버 커리큘럼과 문제 생성기 allowlist,
서버 소유 완료 게이트, 미래 시각 검증을 통과한 값만 반영합니다.

이전 원칙 요약을 재사용하지 않고 `iPhone·iPad 앱 디자인 원칙 2,000` 원문 84쪽과
`바이브코딩 냄새 제거론` 원문 204쪽을 직접 다시 읽어 재판정했습니다. 결과는
[`web/docs/FINAL-PRINCIPLES-SMELL-READJUDICATION-20260815.md`](./web/docs/FINAL-PRINCIPLES-SMELL-READJUDICATION-20260815.md)에 있으며,
운영 OAuth 미배포·모션 수업 부분 완료·DRM 플랫폼 한계·Coach 효과 증거 부족을
테스트 통과와 구분해 기록합니다.

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

- branch: `rollback/pre-final-principles-sync-20260815-4ec8290`
- annotated tag: `snapshot/pre-final-principles-sync-20260815-4ec8290`
- commit: `4ec8290c2785ab0a54e72308ed3793ad2b04fde3`
