# 앱스토어 제출 자산

## 스크린샷 (`screenshots-13inch/`)

**2064 × 2752 · RGB(알파 없음)** — App Store Connect 의 13인치 iPad 세로 규격 그대로다.
이 규격 하나면 iPad 전 기종에 쓰인다(작은 화면은 Apple 이 자동으로 축소해 쓴다).

| 파일 | 화면 | 무엇을 보여 주나 |
|---|---|---|
| `01-home.png` | 홈 | 오늘의 학습 계획, 이어서 학습, 주간 통계 |
| `02-curriculum.png` | 커리큘럼 | 2022 개정 교육과정 전 과목·성취기준 진도 |
| `03-wrongnotes.png` | 오답노트 | 간격 반복 복습 대기열 |
| `04-rank.png` | 랭킹전 | 고수의 전쟁 티어·레이팅 |
| `05-grader-pro.png` | 채점 Pro | 시험지 사진 채점 진입 |
| `06-assessment.png` | 평가센터 | 단원·과목 평가 |

**반드시 Release 빌드로 찍는다.** Debug 로 찍으면 화면에 디버그 전용 UI 가
그대로 들어간다 — 채점 Pro 의 "분석 모델 (디버그)" 티어 선택기와 "기록 보기 (디버그)"
가 그렇다. 실제로 첫 판을 Debug 로 찍어 그게 들어갔다(2026-07-29).
```bash
xcodebuild -project Matths.xcodeproj -scheme Matths -configuration Release \
  -destination 'platform=iOS Simulator,name=Matths-iPad' -derivedDataPath /tmp/relsim build
xcrun simctl install booted /tmp/relsim/Build/Products/Release-iphonesimulator/Matths.app
```

**뽑는 법** (시뮬레이터가 13인치 iPad 로 부팅돼 있어야 한다):
```bash
xcrun simctl io booted screenshot /tmp/shot.png    # 2064×2752 로 나온다
```
알파 채널이 붙어 나오므로 **반드시 평탄화**한다. App Store Connect 는 알파가 있는
이미지를 거부한다(앱 아이콘과 같은 규칙이며, 실제로 이 저장소 아이콘이 그래서 걸렸다).
```python
from PIL import Image
im = Image.open(src).convert("RGBA")
flat = Image.new("RGB", im.size, (255, 255, 255))
flat.paste(im, mask=im.getchannel("A"))
flat.save(dst, "PNG", optimize=True)
```

**순서·구성은 마케팅 판단이다.** 여기 있는 6장은 "앱을 처음 보는 사람이 무엇을 하는
앱인지 알 수 있는가" 만 기준으로 고른 기본 세트다. 문구 오버레이(캡션 이미지)는
넣지 않았다 — 넣으려면 디자인 소스가 따로 필요하다.

**주의**: 스크린샷에 데모/가짜 데이터가 보이면 심사 지침 2.1 로 반려된다.
랭킹전의 "김○○ (예시)" 가짜 행은 제거됐다(서버 순위 API 로 대체).

### 아직 제출용으로는 부족하다 — 무엇이 남았나

지금 세트는 **규격은 맞지만 내용이 비어 있다.** 서버가 아직 안 떠 있어(L-3)
로그인 상태가 아니고, 그래서 이렇게 나온다:
 · 랭킹전 → "로그인하면 티어가 보입니다" / "순위를 불러오지 못했습니다"
 · 홈·커리큘럼 → 로컬 게스트 계정의 얕은 기록

제출 전에 **배포된 서버에 로그인한 상태로 다시 찍어야 한다.** 순서는 이렇다:
1. L-3 배포 → `set-server-url.sh` 로 앱 주소 교체
2. 실제 계정으로 로그인하고 평가 몇 개를 풀어 기록을 만든다
3. Release 빌드로 이 6장을 다시 찍는다

지금 파일들은 **규격·절차가 맞는지 확인된 참조본**이지 최종본이 아니다.

## 앱 아이콘

`Matths/Assets.xcassets/AppIcon.appiconset/` 에 1024×1024 라이트·다크 두 장.
**알파 채널이 있으면 업로드가 거부된다** — `verify-release.sh` 의 [4/4] 가 막는다.

## 남은 것 (사람이 정해야 하는 것)

- 앱 이름·부제·키워드·설명 문안
- 연령 등급 설문 (AI 챗이 있으므로 관련 항목 확인 필요)
- 개인정보 처리방침 URL → 서버 `/privacy` 가 이미 있다. 배포(L-3) 후 그 도메인으로 제출.
