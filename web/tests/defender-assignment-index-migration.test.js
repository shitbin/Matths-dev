const assert = require(
  "node:assert/strict"
);

const {
  isIndexMissing,
  planIndexMigration,
} = require(
  "../scripts/migrate-defender-assignment-index"
);

let passed = 0;

function check(name, fn) {
  try {
    fn();
    passed += 1;
    process.stdout.write(
      `  ✓ ${name}\n`
    );
  } catch (error) {
    process.stderr.write(
      `  ✗ ${name}\n`
    );
    throw error;
  }
}

check(
  "빈 컬렉션은 actor 복합 unique index만 생성",
  () => {
    assert.deepEqual(
      planIndexMigration([]),
      {
        createTarget: true,
        dropLegacy: false,
      }
    );
  }
);

check(
  "기존 전역 requestId unique는 복합 index 생성 뒤 제거",
  () => {
    assert.deepEqual(
      planIndexMigration([
        {
          name: "requestId_1",
          key: {
            requestId: 1,
          },
          unique: true,
        },
      ]),
      {
        createTarget: true,
        dropLegacy: true,
      }
    );
  }
);

check(
  "양쪽 index가 있으면 전역 unique만 제거",
  () => {
    assert.deepEqual(
      planIndexMigration([
        {
          name:
            "challenger_request_id_unique",
          key: {
            challengerUserId: 1,
            requestId: 1,
          },
          unique: true,
        },
        {
          name: "requestId_1",
          key: {
            requestId: 1,
          },
          unique: true,
        },
      ]),
      {
        createTarget: false,
        dropLegacy: true,
      }
    );
  }
);

check(
  "이미 완료된 migration은 반복 실행해도 no-op",
  () => {
    assert.deepEqual(
      planIndexMigration([
        {
          name:
            "challenger_request_id_unique",
          key: {
            challengerUserId: 1,
            requestId: 1,
          },
          unique: true,
        },
      ]),
      {
        createTarget: false,
        dropLegacy: false,
      }
    );
  }
);

check(
  "같은 이름의 잘못된 target index는 삭제하지 않고 중단",
  () => {
    assert.throws(
      () =>
        planIndexMigration([
          {
            name:
              "challenger_request_id_unique",
            key: {
              requestId: 1,
              challengerUserId: 1,
            },
            unique: true,
          },
        ]),
      /unexpected definition/
    );
  }
);

check(
  "requestId_1이 예상과 다르면 자동 제거하지 않음",
  () => {
    assert.deepEqual(
      planIndexMigration([
        {
          name: "requestId_1",
          key: {
            requestId: 1,
          },
          unique: false,
        },
      ]),
      {
        createTarget: true,
        dropLegacy: false,
      }
    );
  }
);

check(
  "동시 배포가 먼저 legacy index를 제거한 경우만 성공으로 흡수",
  () => {
    assert.equal(
      isIndexMissing({
        code: 27,
        codeName:
          "IndexNotFound",
      }),
      true
    );
    assert.equal(
      isIndexMissing({
        code: 13,
        codeName:
          "Unauthorized",
      }),
      false
    );
  }
);

process.stdout.write(
  `\n${passed}/7 defender assignment index migration checks passed.\n`
);
