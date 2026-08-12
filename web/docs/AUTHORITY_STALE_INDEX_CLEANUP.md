# 공식 모델 컬렉션의 과거 인덱스 정리

`AccessCycleLifecycle`와 `RankTakeover*` 모델은 이제 공식 GOAT Arena 모델과
서로 다른 컬렉션을 사용한다. 과거에는 모델들이 같은 컬렉션 이름을 공유해,
현재 공식 컬렉션에 옛 스키마의 인덱스가 남아 있을 수 있다.

이 도구는 다음 공식 컬렉션만 감사한다.

- `accesscycles`
- `arenamatchattempts`
- `arenamatchattemptevents`
- `arenarevengerights`

## 1. 기본 실행은 읽기 전용

```sh
npm run db-authority-indexes:audit
```

이 명령은 인덱스와 legacy 행의 존재만 읽는다. 인덱스를 만들거나 제거하지
않는다. 출력의 `safeToApply`, `legacyBlockedCollections`,
`fingerprintMismatches`를 먼저 보관한다.

## 2. 정리 실행은 별도 유지보수 작업

서비스 쓰기를 중단하고 백업·복구 지점을 확보한 뒤에만 다음 두 인자를 모두
명시한다.

```sh
npm run db-authority-indexes:cleanup -- \
  --confirm=DROP_EXACT_STALE_AUTHORITY_INDEXES_ONLY \
  --environment=production \
  --report-output=../evidence/atlas/index-cleanup-apply.json
```

`--apply`는 package script가 붙인다. 확인 문자열이 다르거나 빠지면 DB에
연결하기 전에 중단한다. 일반 개발·검증 작업에서는 Atlas와 로컬 preview DB
어느 쪽에도 apply하지 않으며, 별도로 승인된 유지보수 작업에서만 실행한다.

## 안전 경계

- 인덱스 이름뿐 아니라 **이름 + key 순서 + semantic options**가 코드에 고정된
  allowlist와 완전히 같을 때만 제거한다.
- 같은 이름의 인덱스라도 `unique`, `sparse`, partial filter, collation 등 옵션이
  다르면 전체 apply를 시작하지 않는다.
- 옛 모델에서만 쓰는 필드가 한 행이라도 남아 있으면 해당 컬렉션의 인덱스를
  자동 제거하지 않고 전체 apply를 중단한다. 단, AccessCycle 생명주기 이전은
  provenance를 위해 원본 행을 의도적으로 보존하므로 예외다. 이 컬렉션은 모든
  후보가 `accesscyclelifecycles`에 복사되고, 원본 digest와 일치하는 migration
  marker까지 있는 경우에만 이전 완료로 인정한다. missing·conflict·unstamped가
  하나라도 있으면 동일하게 전체 apply를 중단한다.
- `userId_1`, `status_1`, `matchId_1`, `attemptId_1`, `eventType_1`,
  `sourceMatchId_1`처럼 현재 공식 모델도 쓰는 인덱스는 제거 목록에 없다.
- MongoDB의 인덱스 DDL은 트랜잭션 대상이 아니다. 도구는 제거 직전마다 행과
  fingerprint를 다시 읽지만, 운영 실행은 반드시 쓰기가 멈춘 유지보수 창에서
  수행한다.
- 반복 실행은 no-op이다. 첫 apply 이후 같은 명령을 다시 실행하면 `dropped`가
  빈 배열이어야 한다.

`accesscycles.paymentOrderId_1`은 공식 학습일수 지갑 문서 여러 개에서 누락
값을 같은 `null`로 취급해 쓰기를 막을 수 있어 `BLOCKING`으로 표시한다. 그 외
대상도 공식 모델 소유가 아닌 과거 인덱스지만, 자동 제거 조건은 동일하게
엄격하다.

production 서버는 MongoDB 연결 직후 같은 읽기 전용 감사를 실행한다.
`BLOCKING` 인덱스, allowlist 이름의 fingerprint 불일치, 이전이 증명되지 않은
legacy 행이 있으면 `AUTHORITY_INDEX_STARTUP_BLOCKED`로 시작을 중단한다. 로컬·테스트
서버는 자동 삭제하지 않고 경고만 남긴다.
