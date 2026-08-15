# Matths 최종 원칙·냄새 재판정 — 2026-08-15

이 문서는 과거 요약본을 재인용한 결과가 아니다. 아래 원문 PDF 두 개를 직접
텍스트 추출해 전체 번호와 장·패턴·체크리스트 구조를 확인하고, 현행 Web/iPad
소스에 다시 대입한 최종 재판정이다.

## 1. 원문과 기준선

| 원문 | 직접 확인 | SHA-256 |
|---|---:|---|
| `iPhone·iPad 앱 디자인 원칙 2,000.pdf` | 84쪽, 번호 0001–2000 | `7461bd6a870ff49e01ae23f8d3fd37fd5151b564cb4f91dd84368f91ecee464b` |
| `바이브코딩_냄새_제거론_완성본_204쪽.pdf` | 204쪽, 72 bad/72 good, 8개 도메인, 288개 출시 체크 | `6acd16ec4a5f3368304ed5e8a206707c33f102357b0686d35ed51f30d092290c` |

제품 코드 기준선은 Web `3fe6350fd1dc9113939949ac4bccfb3ee7782b7c`,
iPad `2819dbe3fb4f09933177d42ae580fb649b407a20`이다. Web 기준선은 아래
신뢰 경계 수정을 포함하고, 이 문서 자체의 후속 커밋은 제품 동작을 바꾸지 않는다.
Arena의 규칙·경제·정산·난이도·매칭·티어 정책은 이번 범위에서 동결했으며
순변경은 0이다.

## 2. 재검수 방법

- 2,000개 원칙을 정보 위계, iPhone/iPad 적응형 레이아웃, 입력·Pencil,
  접근성, 결제, 오류·복구, 모션, 보안·개인정보, 실기 QA 묶음으로 재분류했다.
- 냄새 제거론의 72개 bad/good 패턴을 프롬프트·시각·UX·프런트·백엔드·보안·
  테스트·소유권 8개 경계에 맞춰 현행 코드와 테스트에 대조했다.
- 추론만으로 결함을 확정하지 않았다. 과거 `0274` PencilKit 다크 모드 필기
  소실 주장은 실제 픽셀 재현에서 반증됐으므로 계속 `retracted`로 유지했다.
- 역사 원장 121건과 현재 사실 118건은 작업목록이 아니다. 현행 SHA에서 다시
  재현되거나 정적·동적 경계가 확인된 항목만 아래 판정에 포함했다.

## 3. 현행 판정

### 해결 확인

- iPhone+iPad 유니버설 레이아웃, compact/regular 분기, 44pt 입력, Dynamic Type,
  VoiceOver, 키보드·Pencil 기본 정책이 코드·계약·시뮬레이터 빌드에 연결돼 있다.
- 화면당 주행동과 좌상단→우하단 스캔 흐름을 우선하도록 상점 허브를 1열 구조로
  제한했고, entitlement·구매 상태·복구를 상점 한 화면에 모았다.
- iPad 외부 디지털 결제 handoff는 Debug에서만 노출되고 Release에는 나타나지
  않는다. 서버는 목적지를 allowlist로 고정하고 2분·1회용·해시 토큰으로만 웹
  세션을 승계한다.
- 커리큘럼 220개는 Web/iPad byte parity와 출시 게이트에 연결돼 있고, 학생
  projection에서 studio tag가 노출되지 않는다. 다만 ‘220개 텍스트+TTS’가
  ‘220개 모션 그래픽 수업’과 같다는 주장은 하지 않는다.
- OAuth 앱 경로는 `ASWebAuthenticationSession` + 서버 grant PKCE를 사용하고,
  죽은 legacy 별칭과 다회 Bearer 발급 경로를 제거·원자화했다.
- 결제 결과·영수증·철회 재개·평가 만료 재시도는 불확실 상태와 복구 행동을
  구분한다.
- disabled 버튼, 의미색 대비, 주간 모의 OMR 44pt, 인증 자동완성, 키보드 종료,
  알림 상태 갱신, 오답 필터 상태, 풀이 도구 소유권은 과거 원장 이후 해결됐다.

### 이번 재검수에서 확정·수정

`PATCH /api/v1/learning/.../mastery|snapshot`이 앱이 보낸 개념 ID·문제 유형·
완료 플래그·시각을 충분히 검증하지 않아 임의 유형 다섯 개로 완료 게이트를
열 수 있었다. 이는 원칙의 “서버가 최종 권한을 가진다”와 냄새 제거론의
trust-boundary/runtime-validation 규칙을 동시에 위반했다.

Web `3fe6350`에서 다음을 적용했다.

- 서버 커리큘럼에 없는 개념은 404로 저장 전 거부한다.
- 서버 문제 생성기 allowlist에 없는 유형은 400으로 저장 전 거부한다.
- 생성기가 정한 서로 다른 유형 수를 충족하지 않은 완료 요청은 409로 거부한다.
- snapshot의 무효·과도한 미래 시각은 저장 전에 거부한다.
- 과거에 저장된 유형도 현재 allowlist와 교집합만 진도에 반영한다.
- 정상 오프라인 재전송, 단조 병합, 최초 완료 시각, 무이벤트 snapshot 동작은
  회귀 테스트로 유지한다.

### 완료로 주장하지 않는 항목

- 운영 `www.matths.kr`에 최신 OAuth/Web 빌드가 배포됐다는 증거는 없다. GitHub
  병합은 배포와 다르므로 운영 로그인은 별도 배포·환경변수·Google Console
  callback·실계정 왕복 검증 전까지 `NOT_DEPLOYED`다.
- iOS 공개 API만으로 Netflix식 DRM(갤러리에 저장된 모든 screenshot/recording을
  사후 검정 화면으로 강제)을 보장할 수 없다. 현재 보호는 캡처 상태 cover,
  app-switch cover, 제한된 watermark, 경고·증거 경계이며 DRM 완료로 표기하지 않는다.
- 커리큘럼은 220개 5분 narration/TTS와 기억선까지 구현됐지만, 사용자가 요청한
  220개 전수 모션 그래픽·강조 도형·분기형 이해 확인·순한맛/매운맛 재설명은 아직
  전수 완성 증거가 없다. 텍스트 목차+TTS를 모션 수업으로 과장하지 않는다.
- Maths Coach 문구의 실제 학습효과는 텍스트 존재만으로 승인하지 않는다. 학생
  행동·오답 근거와 연결된 추천 정확도 및 사용자 시험 증거가 더 필요하다.
- rank MP4 9개의 앱 번들/성능 provenance는 고정됐지만 외부 원본 승인 provenance는
  `unknown`; 별도 권리·출처 attestation 전 App Store 적격으로 주장하지 않는다.
- 실제 iPhone 노치·회전·카메라·Google 세션, iPad Pencil 압력·팜리젝션·VoiceOver
  직접 필기는 최종 실기 행렬에서 별도 증거가 필요하다.

## 4. 출시 전 최종 게이트

1. Web 전체 테스트·EJS·JS 문법·커리큘럼 220·음성 220·iPad parity를 통과한다.
2. iPad 전체 계약·Debug/Release 빌드와 번들 검증을 통과한다.
3. 공개 통합 저장소는 비밀·개인 경로·금지 산출물 없이 exact source snapshot으로
   PR 병합하고 rollback branch/tag를 먼저 보존한다.
4. 병합된 iPad source와 동일한 signed build를 실제 iPad에 설치·실행한다.
5. 재검토 패키지는 browser profile, cookie, token, env, 인증서, provisioning,
   IPA, KICE PDF, llama framework, 사용자 DB를 포함하지 않는다.
6. 패키지는 manifest와 SHA256SUMS를 만든 뒤 새 임시 폴더에서 독립 추출·검증한다.

## 5. 판정

확정된 비Arena 서버 신뢰 경계 결함은 수정됐다. 하지만 운영 OAuth 미배포,
모션 그래픽 수업 전수 미완성, Coach 효과 증거 부족, DRM 한계, 일부 실기·권리
증거는 남아 있다. 그러므로 최종 패키지는 이를 숨기지 않고 각각
`NOT_DEPLOYED`, `PARTIAL`, `EVIDENCE_REQUIRED`, `PLATFORM_LIMITATION`으로 분리해야
한다. 테스트 통과를 제품 경험·운영 배포·법무 승인과 바꿔 쓰지 않는다.
