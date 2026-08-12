# AccessCycle 모델·컬렉션 분리 운영 순서

## 배경

기존 코드에는 서로 다른 상태·필드를 가진 두 스키마가 모두 Mongoose 모델명
`AccessCycle`과 컬렉션 `accesscycles`를 사용했습니다. 서버에서는 결제·환불
생명주기 스키마가 먼저 로드돼 GOAT Arena 학습일수 지갑 스키마를 가로챌 수
있었습니다.

현재 정본은 다음처럼 명시적으로 분리됩니다.

- GOAT Arena 지갑: 모델 `AccessCycle`, 컬렉션 `accesscycles`
- 결제·환불 생명주기: 모델 `AccessCycleLifecycle`, 컬렉션
  `accesscyclelifecycles`

확정 경제 규칙이나 기존 문서를 자동으로 수정하지 않습니다.

## 배포 전 확인

운영 DB 환경변수를 설정한 별도 운영 셸에서 아래 명령을 먼저 실행합니다.
기본 동작은 읽기 전용 dry-run입니다.

```sh
npm run access-cycle-storage:migrate
```

출력에서 다음을 확인합니다.

- `conflictCount`가 0인지
- `pendingCopyCount`가 이전할 결제·환불 생명주기 문서 수와 맞는지
- `pendingMarkerCount`가 이미 동일하게 복사됐지만 이전 증명이 없는 문서 수와 맞는지
- GOAT Arena 지갑 문서가 후보에 포함되지 않았는지

실제 복사는 운영자가 다음 확인 문자열을 직접 지정한 경우에만 실행됩니다.

```sh
npm run access-cycle-storage:migrate -- \
  --apply \
  --confirm=MIGRATE_ACCESS_CYCLE_LIFECYCLES \
  --environment=production \
  --report-output=../evidence/atlas/migration-apply.json
```

복사는 `_id`를 보존하는 멱등 upsert이며 기존 `accesscycles` 문서를 삭제하거나
수정하지 않습니다. 한 트랜잭션 안에서 생명주기 권위 필드의 원본 digest를
`legacyAccessCycleMigration`에 기록합니다. 이미 동일하게 복사된 문서는 명시 실행
때 marker만 기록하며, 같은 명령을 다시 실행하면 건너뜁니다. 대상에 내용이 다른
동일 `_id`가 있거나 검사와 쓰기 사이에 내용이 바뀌면 덮어쓰지 않고 중단합니다.

## 서버 시작 가드

서버는 MongoDB 연결 직후 기존 `accesscycles`에서 생명주기 전용 필드가 있는
문서를 읽기 전용으로 찾습니다. 해당 `_id`가 새 컬렉션에 없거나, 이전 marker가
없거나, marker의 원본 digest와 현재 legacy 생명주기 권위 필드가 다르면
`ACCESS_CYCLE_LIFECYCLE_MIGRATION_REQUIRED`로 시작을 중단합니다. 따라서 이전을
빠뜨린 배포가 빈 새 컬렉션에 쓰기 시작하는 일은 없습니다.

digest에는 `_id`와 결제·환불 생명주기 권위 필드만 포함합니다. 과거 충돌로 한
문서에 섞일 수 있는 GOAT 지갑의 경쟁 상태·잔액·division과 MongoDB
timestamp/version은 제외합니다. `status`는 후보 탐지 단계에서는 겹치는 값만으로
판정하지 않지만, 다른 전용 필드로 생명주기 문서임이 확정된 뒤에는
`PAYBACK_COMPLETED`·`CANCELLED`를 포함한 합법 생명주기 상태를 복사하고 digest에도
포함합니다. 명시 이전 뒤 새 컬렉션에서 정상적으로 바뀐 환불 상태는 marker가 원본
복사를 증명하므로 다음 부팅을 막지 않습니다. marker는 대상 데이터 전체의 위변조
검증이 아니라 명시적 이전 provenance입니다.

생명주기 이전이 완료된 다음에만 과거 스키마의 인덱스를 별도 감사합니다.

```sh
npm run db-authority-indexes:audit
```

이 인덱스 감사는 원본 행이 남았다는 이유만으로 이전 실패로 판단하지 않는다.
대신 위와 같은 marker/digest 검사를 다시 수행하며, 복사 누락·내용 충돌·marker
누락이 하나라도 있으면 인덱스 정리를 거절한다. 실제 정리 절차와 강한 확인 문자열은
`docs/AUTHORITY_STALE_INDEX_CLEANUP.md`를 따른다.

이 가드는 `PAYBACK_COMPLETED`·`CANCELLED`처럼 두 계약에 겹치는 상태 문자열이나
GOAT 지갑에도 남을 수 있는 `paymentOrderId`를 단독 탐지 조건으로 사용하지
않습니다. `refundStatus`, `paidAccessDaysGranted` 등 생명주기 전용 필드와
`SUB_ACTIVE`, `REFUND_REVIEW` 같은 생명주기 전용 상태만 사용해 GOAT Arena
지갑을 후보로 오인하지 않습니다.
