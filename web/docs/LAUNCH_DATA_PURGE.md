# 출시 데이터 정리 실행서

`scripts/purgeLaunchUserAndArchiveData.js`는 보존 목록에 없는 사용자와 레거시
아카이브를 삭제하는 파괴적 운영 도구다. 기본 실행은 검토 모드이며, 저장소 안에는
실제 계정 식별자를 기록하지 않는다.

## 1. 보존 목록 준비

저장소 밖에 JSON 파일을 만든다. `email`은 필수이고 `role`은 `admin`, `student`,
`parent` 중 하나를 선택적으로 지정한다. 이름은 계정 식별 조건으로 쓰지 않는다.

```json
[
  { "email": "operator@example.test", "role": "admin" },
  { "email": "student@example.test" }
]
```

파일은 현재 실행 사용자만 읽을 수 있어야 한다.

```bash
chmod 600 /absolute/private/path/retained-users.json
```

심볼릭 링크, 저장소 내부 파일, 그룹·전체 공개 권한, 중복·잘못된 이메일, 알 수 없는
필드는 모두 거부된다. 실제 주소가 든 파일을 커밋·압축·메신저 첨부하지 않는다.

## 2. 검토 모드

먼저 삭제 없이 계획만 계산한다. 출력은 보존 이메일을 마스킹하고 삭제 대상은 수만
표시한다.

```bash
npm run launch-data:purge -- \
  --retained-users-file=/absolute/private/path/retained-users.json
```

보존 수, 삭제 수, 아카이브 참조 차단, R2 이관 여부를 독립적으로 대조한다.

## 3. 실제 적용

검토한 JSON 배열 길이를 `--confirm-retained-count`에 다시 입력해야 삭제가 열린다.

```bash
npm run launch-data:purge -- \
  --retained-users-file=/absolute/private/path/retained-users.json \
  --apply \
  --confirm-retained-count=<검토한 보존 계정 수> \
  --confirm-database=<연결 대상 DB 이름>
```

목록 파일 경로는 `MATTHS_RETAINED_USERS_FILE` 환경변수로 대신 지정할 수 있다.
`--apply`만 입력하거나 확인 수가 다르면 DB 연결 전에 중단한다. 연결 후 실제 DB 이름이
`--confirm-database`와 다르면 계획 조회나 삭제 전에 다시 중단한다.

## 4. 실행 전후 필수 확인

- 운영 DB 백업과 복원 리허설을 먼저 끝낸다.
- 연결 문자열이 정확한 환경인지 별도 창에서 확인한다.
- Arena 규칙·상품·정산·난이도 데이터는 이 도구의 변경 대상으로 추가하지 않는다.
- dry-run JSON과 승인자의 보존 수 확인을 남기되 계정 원문은 로그에 남기지 않는다.
- 적용 후 보존 이메일 집합, 사용자 수, 아카이브 0건, 상점 상품 보존을 검증한다.
- 공개 Git 이력에 이미 포함됐던 식별자는 새 커밋만으로 과거 이력에서 사라지지 않는다.
  이력 정리가 필요하면 별도의 승인된 비밀/개인정보 사고 절차로 처리한다.
