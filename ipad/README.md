# Matths iPad 앱

SwiftUI로 만든 iPad 전용 Matths 클라이언트입니다. 현재 프로젝트는 iPadOS 17 이상,
Swift 5, 번들 ID `kr.matths.app`, 마케팅 버전 `0.1`/빌드 `1`을 기준으로 합니다.

전체 현황과 다음 작업은 먼저 아래 문서를 읽으세요.

- `00_먼저_읽기.md`
- `docs/CLAUDE_인수인계_2026-08-11.md`

## 바로 열기

1. Xcode에서 `Matths.xcodeproj`를 엽니다.
2. `Matths` 타깃의 Signing Team을 작업자 계정으로 선택합니다.
3. iPadOS 17 이상 iPad 또는 iPad 시뮬레이터를 선택합니다.
4. Debug 구성으로 실행합니다.

`Frameworks/llama.xcframework`가 프로젝트에 포함돼 있어야 로컬 AI 코드가 링크됩니다.
GGUF 모델 가중치는 ZIP에 포함하지 않으며 앱이 필요할 때 Hugging Face에서 내려받습니다.

## 중요한 출시 차단 항목

- `Matths/ServerAPI.swift`의 기본 주소는 현재 임시 Cloudflare 터널입니다. 정식 도메인을
  연결하기 전에는 Release 빌드 게이트가 의도적으로 실패합니다.
- KICE 기출 PDF는 내부 Debug 검증용입니다. 사용 허락이 확인되지 않은 원문은 Release
  번들에 포함되지 않도록 프로젝트 빌드 단계가 막습니다.
- 실제 iPad 설치에는 Apple Developer 서명 팀과 기기 개발자 모드가 필요합니다.

정식 서버 주소가 준비되면 다음 스크립트로 교체합니다.

```bash
./set-server-url.sh https://정식-도메인.example
```

## 계약 검사

```bash
for test in tests/run-*.sh; do bash "$test"; done
```

마지막 패키징 직전 확인 기록은 인수인계서에 적혀 있습니다. 빌드 산출물과 개인 Xcode
상태는 전달 ZIP에서 제외했습니다.
