# iPad 진도 초기화·막힌 지점 동기화

## 진도 초기화

서버 계정의 프로필에서 진도 초기화를 확정하면 iPad는 로컬 진도를 즉시 지우고
`progressReset`을 계정별 오프라인 큐에 넣는다. 서버 경로는 다음과 같다.

```text
POST /api/v1/learning/progress/reset
Authorization: Bearer <token>
{ clientResetId, occurredAt }
```

서버는 해당 사용자의 `ConceptProgress.updatedAt <= occurredAt`만 삭제한다. 응답 유실 뒤 같은
요청이 재전송되어도 초기화 뒤 새로 저장된 진도는 지우지 않는다. 평가 응시 기록·오답·Arena
기록은 “개념 진도 초기화” 대상이 아니므로 보존한다. 운영 DB에서 이 경로를 임의 실행하지 않는다.

## 막힌 지점

보호 화면에서 학생이 직접 “막힌 지점 저장”을 눌렀을 때만 텍스트를 로컬 슬롯에 저장한다.
서버 계정은 같은 계정별 큐로 다음 경로에 전송한다.

```text
POST /api/v1/wrong-notes/stuck-points
GET  /api/v1/wrong-notes/stuck-points
```

캡처 이미지·화면 픽셀·클립보드는 보내지 않는다. 최대 500자 텍스트, 클라이언트 UUID와 발생
시각만 저장하며 `(userId, clientStuckPointId)`로 멱등 처리한다. 서버에서 받은 기록은 UUID로
중복을 제거하고 다른 iPad의 오답노트에도 합친다. 구 버전의 `[String]` 로컬 파일은 처음 읽을
때 UUID·시각을 붙인 새 구조로 원자 변환한다.
