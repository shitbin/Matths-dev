# PencilKit 다크 모드 내보내기 재현

이 문서는 감사 항목 `0274`를 철회한 실측을 저장소 안에서 다시 실행할 수 있게 남긴다.
제품 코드를 변경하는 회귀 테스트가 아니라, iOS Simulator와 PencilKit이 필요한 수동 재현이다.

## 전제

- macOS와 Xcode
- 부팅된 iOS Simulator
- 재현 기준 환경: iPadOS 26.3, arm64

## 실행

```bash
REPRO_DIR="$(mktemp -d)"
SDK_PATH="$(xcrun --sdk iphonesimulator --show-sdk-path)"
ARCH="$(uname -m)"

xcrun swiftc \
  -sdk "$SDK_PATH" \
  -target "${ARCH}-apple-ios26.3-simulator" \
  tests/manual/pencilkit-dark-mode-export-repro.swift \
  -o "$REPRO_DIR/pencilkit-dark-mode-export-repro"

xcrun simctl spawn booted "$REPRO_DIR/pencilkit-dark-mode-export-repro"
```

Simulator runtime이 26.3이 아니면 설치된 runtime에 맞게 target 버전만 바꾼다.

## 관찰값

2026-08-14 실측 출력은 다음과 같았다.

```text
light tool=0.000,0.000,0.000,1.000 transparentCenter=0,0,0,255 whiteCenter=0,0,0,255
dark tool=1.000,1.000,1.000,1.000 transparentCenter=0,0,0,255 whiteCenter=0,0,0,255
```

`.label` 도구 색 자체는 외관에 따라 달라지지만, `PKDrawing.image(from:scale:)`가 내보낸
중심 획은 두 외관 모두 불투명 검정이었다. 흰 배경에 합성한 뒤에도 검정이므로,
`0274`가 주장했던 “다크 모드의 흰 획이 흰 채점 배경에서 사라진다”는 현상은 재현되지 않는다.

## 판정 조건

- 라이트·다크 모두 `transparentCenter=0,0,0,255`
- 라이트·다크 모두 `whiteCenter=0,0,0,255`

OS나 PencilKit 변경 뒤 값이 달라지면 새 결과·환경을 기록하고 원장 판정을 다시 검토한다.
