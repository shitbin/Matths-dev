const assert = require(
  "node:assert/strict"
);

const {
  PaymentWebhookInbox,
} = require(
  "../models/paymentWebhookInboxModel"
);
const {
  payloadFingerprint,
  receivePaymentWebhook,
} = require(
  "../services/paymentWebhookInboxService"
);

const checks = [];

async function check(
  label,
  run
) {
  try {
    await run();
    checks.push({
      label,
      passed: true,
    });
    console.log(
      `  ✓ ${label}`
    );
  } catch (error) {
    checks.push({
      label,
      passed: false,
      error,
    });
    console.log(
      `  ✗ ${label} — ${error.message}`
    );
  }
}

async function captureError(
  run
) {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error(
    "expected an error"
  );
}

function waitTurn() {
  return new Promise(
    (resolve) =>
      setImmediate(resolve)
  );
}

function clone(value) {
  return structuredClone(
    value
  );
}

function matches(
  record,
  filter
) {
  for (const [
    field,
    expected,
  ] of Object.entries(
    filter
  )) {
    const actual =
      field ===
      "signatureVerification.status"
        ? record
            .signatureVerification
            ?.status
        : record[field];
    if (
      expected &&
      typeof expected ===
        "object" &&
      Object.prototype
        .hasOwnProperty.call(
          expected,
          "$ne"
        )
    ) {
      if (
        actual ===
        expected.$ne
      ) {
        return false;
      }
      continue;
    }
    if (
      actual !== expected
    ) {
      return false;
    }
  }
  return true;
}

function createInboxModelDouble() {
  const records =
    new Map();
  let nextId = 1;

  const keyOf = ({
    provider,
    webhookEventId,
  }) =>
    `${provider}\u0000${webhookEventId}`;

  return {
    records,

    async findOneAndUpdate(
      filter,
      update,
      options = {}
    ) {
      const key =
        keyOf(filter);
      const existing =
        records.get(key);
      if (existing) {
        if (
          !matches(
            existing,
            filter
          )
        ) {
          return options
            .includeResultMetadata
            ? {
                value: null,
                lastErrorObject: {
                  updatedExisting:
                    false,
                },
              }
            : null;
        }
        if (update.$set) {
          Object.assign(
            existing,
            clone(update.$set)
          );
        }
        return options
          .includeResultMetadata
          ? {
              value: existing,
              lastErrorObject: {
                updatedExisting:
                  true,
              },
            }
          : existing;
      }

      if (!options.upsert) {
        return options
          .includeResultMetadata
          ? {
              value: null,
              lastErrorObject: {
                updatedExisting:
                  false,
              },
            }
          : null;
      }

      // 모든 요청이 "없음"을 본 뒤 쓰도록 양보해 실제 unique-index 경합을 만든다.
      await waitTurn();
      if (
        records.has(key)
      ) {
        const error =
          new Error(
            "duplicate key"
          );
        error.code = 11000;
        throw error;
      }

      const inserted = {
        _id:
          `inbox-${nextId}`,
        ...clone(
          update.$setOnInsert
        ),
      };
      nextId += 1;
      records.set(
        key,
        inserted
      );
      return options
        .includeResultMetadata
        ? {
            value: inserted,
            lastErrorObject: {
              updatedExisting:
                false,
              upserted:
                inserted._id,
            },
          }
        : inserted;
    },

    async findOne(filter) {
      const record =
        records.get(
          keyOf(filter)
        );
      return record &&
        matches(
          record,
          filter
        )
        ? record
        : null;
    },
  };
}

function verified() {
  return {
    status: "VERIFIED",
  };
}

async function run() {
  await check(
    "provider와 webhookEventId 복합 unique 인덱스를 가짐",
    () => {
      const uniqueIndex =
        PaymentWebhookInbox
          .schema
          .indexes()
          .find(
            ([fields]) =>
              fields.provider ===
                1 &&
              fields
                .webhookEventId ===
                1
          );
      assert.equal(
        uniqueIndex?.[1]
          ?.unique,
        true
      );
    }
  );

  await check(
    "수신 모델은 원문 payload·서명 필드를 정의하지 않음",
    () => {
      const paths =
        PaymentWebhookInbox
          .schema.paths;
      assert.equal(
        paths.rawPayload,
        undefined
      );
      assert.equal(
        paths.payload,
        undefined
      );
      assert.equal(
        paths.signature,
        undefined
      );
      assert.ok(
        paths.payloadHash
      );
      assert.ok(
        paths
          .signatureVerification
      );
    }
  );

  await check(
    "payload hash는 파싱 JSON이 아니라 원본 Buffer 바이트를 기준으로 함",
    () => {
      const compact =
        payloadFingerprint(
          Buffer.from(
            '{"a":1}'
          )
        );
      const spaced =
        payloadFingerprint(
          Buffer.from(
            '{ "a": 1 }'
          )
        );
      assert.notEqual(
        compact.payloadHash,
        spaced.payloadHash
      );
      assert.equal(
        compact
          .payloadSizeBytes,
        7
      );
    }
  );

  await check(
    "파싱 객체나 문자열 body는 수신 전에 명시적으로 거부함",
    async () => {
      const InboxModel =
        createInboxModelDouble();
      let verifierCalled =
        false;
      const error =
        await captureError(
          () =>
            receivePaymentWebhook(
              {
                provider:
                  "tosspayments",
                webhookEventId:
                  "evt-object",
                rawPayload: {
                  amount: 39000,
                },
                verifySignature:
                  () => {
                    verifierCalled =
                      true;
                    return verified();
                  },
              },
              {
                InboxModel,
              }
            )
        );

      assert.equal(
        error.code,
        "RAW_WEBHOOK_BODY_REQUIRED"
      );
      assert.equal(
        verifierCalled,
        false
      );
      assert.equal(
        InboxModel
          .records.size,
        0
      );
    }
  );

  await check(
    "서명 검증기는 저장 해시와 동일한 Buffer 인스턴스를 받음",
    async () => {
      const InboxModel =
        createInboxModelDouble();
      const rawPayload =
        Buffer.from(
          '{"paymentKey":"live-secret-payment-key","cardNumber":"4111111111111111"}'
        );
      let verifiedBody =
        null;
      const result =
        await receivePaymentWebhook(
          {
            provider:
              " TossPayments ",
            webhookEventId:
              "evt-001",
            eventType:
              "PAYMENT_CAPTURED",
            rawPayload,
            verifySignature:
              (body) => {
                verifiedBody =
                  body;
                return verified();
              },
            receivedAt:
              "2026-07-30T01:00:00.000Z",
          },
          {
            InboxModel,
          }
        );

      assert.equal(
        verifiedBody,
        rawPayload
      );
      assert.equal(
        Buffer.isBuffer(
          verifiedBody
        ),
        true
      );
      assert.equal(
        result.inbox.status,
        "RECEIVED"
      );
      assert.equal(
        result.inbox
          .signatureVerification
          .status,
        "VERIFIED"
      );
      assert.equal(
        JSON.stringify(
          result.inbox
        ).includes(
          "live-secret"
        ),
        false
      );
    }
  );

  await check(
    "검증기 누락은 Inbox를 만들지 않고 설정 오류로 거부함",
    async () => {
      const InboxModel =
        createInboxModelDouble();
      const error =
        await captureError(
          () =>
            receivePaymentWebhook(
              {
                provider:
                  "tosspayments",
                webhookEventId:
                  "evt-no-verifier",
                rawPayload:
                  Buffer.from(
                    "{}"
                  ),
              },
              {
                InboxModel,
              }
            )
        );
      assert.equal(
        error.code,
        "WEBHOOK_SIGNATURE_VERIFIER_REQUIRED"
      );
      assert.equal(
        InboxModel
          .records.size,
        0
      );
    }
  );

  await check(
    "INVALID와 NOT_CHECKED preplay는 이후 VERIFIED 수신을 차단하지 못함",
    async () => {
      const InboxModel =
        createInboxModelDouble();
      for (const status of [
        "INVALID",
        "NOT_CHECKED",
      ]) {
        const eventId =
          `evt-preplay-${status.toLowerCase()}`;
        const firstTime =
          "2026-07-30T02:00:00.000Z";
        const verifiedTime =
          "2026-07-30T02:05:00.000Z";
        const rejection =
          await captureError(
            () =>
              receivePaymentWebhook(
                {
                  provider:
                    "tosspayments",
                  webhookEventId:
                    eventId,
                  rawPayload:
                    Buffer.from(
                      '{"amount":1}'
                    ),
                  verifySignature:
                    () => ({
                      status,
                      reasonCode:
                        status ===
                        "INVALID"
                          ? "HMAC_MISMATCH"
                          : "KEY_UNAVAILABLE",
                    }),
                  receivedAt:
                    firstTime,
                },
                {
                  InboxModel,
                }
              )
          );
        assert.equal(
          rejection.code,
          status ===
            "INVALID"
            ? "WEBHOOK_SIGNATURE_INVALID"
            : "WEBHOOK_SIGNATURE_UNAVAILABLE"
        );

        const key =
          `tosspayments\u0000${eventId}`;
        const ignored =
          InboxModel
            .records
            .get(key);
        const ignoredId =
          ignored._id;
        assert.equal(
          ignored.status,
          "IGNORED"
        );

        const accepted =
          await receivePaymentWebhook(
            {
              provider:
                "tosspayments",
              webhookEventId:
                eventId,
              rawPayload:
                Buffer.from(
                  '{"amount":39000}'
                ),
              verifySignature:
                verified,
              receivedAt:
                verifiedTime,
            },
            {
              InboxModel,
            }
          );

        assert.equal(
          accepted.promoted,
          true
        );
        assert.equal(
          accepted.inbox._id,
          ignoredId
        );
        assert.equal(
          accepted
            .inbox.status,
          "RECEIVED"
        );
        assert.equal(
          accepted
            .inbox
            .signatureVerification
            .status,
          "VERIFIED"
        );
        assert.deepEqual(
          accepted
            .inbox.receivedAt,
          new Date(
            verifiedTime
          )
        );
      }
      assert.equal(
        InboxModel
          .records.size,
        2
      );
    }
  );

  await check(
    "동시에 온 같은 VERIFIED 이벤트는 하나의 inbox로 수렴함",
    async () => {
      const InboxModel =
        createInboxModelDouble();
      const rawPayload =
        Buffer.from(
          '{"orderId":"order-race","amount":39000}'
        );
      const input = {
        provider:
          "tosspayments",
        webhookEventId:
          "evt-race",
        eventType:
          "PAYMENT_CAPTURED",
        rawPayload,
        verifySignature:
          (body) => {
            assert.equal(
              body,
              rawPayload
            );
            return verified();
          },
        receivedAt:
          "2026-07-30T03:00:00.000Z",
      };

      const results =
        await Promise.all(
          Array.from(
            {
              length: 8,
            },
            () =>
              receivePaymentWebhook(
                input,
                {
                  InboxModel,
                }
              )
          )
        );
      const ids =
        new Set(
          results.map(
            (result) =>
              result.inbox._id
          )
        );

      assert.equal(
        InboxModel
          .records.size,
        1
      );
      assert.equal(
        ids.size,
        1
      );
      assert.equal(
        results.filter(
          (result) =>
            result.created
        ).length,
        1
      );
      assert.equal(
        results.filter(
          (result) =>
            result.duplicate
        ).length,
        7
      );
    }
  );

  await check(
    "VERIFIED 중복 ID의 다른 본문은 명시적 conflict 오류를 던짐",
    async () => {
      const InboxModel =
        createInboxModelDouble();
      const base = {
        provider:
          "tosspayments",
        webhookEventId:
          "evt-conflict",
        verifySignature:
          verified,
        receivedAt:
          "2026-07-30T04:00:00.000Z",
      };
      const first =
        await receivePaymentWebhook(
          {
            ...base,
            rawPayload:
              Buffer.from(
                '{"amount":39000}'
              ),
          },
          {
            InboxModel,
          }
        );
      const conflict =
        await captureError(
          () =>
            receivePaymentWebhook(
              {
                ...base,
                rawPayload:
                  Buffer.from(
                    '{"amount":1}'
                  ),
              },
              {
                InboxModel,
              }
            )
        );

      assert.equal(
        conflict.code,
        "WEBHOOK_EVENT_PAYLOAD_CONFLICT"
      );
      assert.equal(
        conflict.statusCode,
        409
      );
      assert.equal(
        conflict.inboxId,
        first.inbox._id
      );
      assert.equal(
        InboxModel
          .records.size,
        1
      );
      assert.equal(
        first.inbox
          .payloadHash,
        payloadFingerprint(
          Buffer.from(
            '{"amount":39000}'
          )
        ).payloadHash
      );
    }
  );

  await check(
    "Inbox 상태·재시도·오류·처리 시각 필드가 모델 검증을 통과함",
    async () => {
      const document =
        new PaymentWebhookInbox({
          provider:
            "tosspayments",
          webhookEventId:
            "evt-model",
          payloadHash:
            "a".repeat(64),
          payloadSizeBytes:
            25,
          signatureVerification:
            {
              status:
                "VERIFIED",
              checkedAt:
                new Date(),
            },
          status:
            "FAILED",
          retryCount: 2,
          nextRetryAt:
            new Date(),
          lastAttemptAt:
            new Date(),
          lastError: {
            code:
              "PROVIDER_TIMEOUT",
            message:
              "temporary provider timeout",
            occurredAt:
              new Date(),
          },
          receivedAt:
            new Date(),
        });
      await document.validate();

      assert.equal(
        document.retryCount,
        2
      );
      assert.equal(
        document
          .lastError.code,
        "PROVIDER_TIMEOUT"
      );
    }
  );

  await check(
    "미검증 Inbox는 처리 상태로 직접 전환할 수 없음",
    async () => {
      const document =
        new PaymentWebhookInbox({
          provider:
            "tosspayments",
          webhookEventId:
            "evt-untrusted-state",
          payloadHash:
            "b".repeat(64),
          payloadSizeBytes:
            2,
          signatureVerification:
            {
              status:
                "INVALID",
              checkedAt:
                new Date(),
            },
          status:
            "RECEIVED",
          receivedAt:
            new Date(),
        });
      const error =
        await document
          .validate()
          .then(
            () => null,
            (validationError) =>
              validationError
          );
      assert.ok(error);
      assert.match(
        error.message,
        /only verified webhooks/
      );
    }
  );

  const failed =
    checks.filter(
      (item) =>
        !item.passed
    );
  if (failed.length) {
    process.exitCode = 1;
    return;
  }
  console.log(
    `\n${checks.length}개 결제 Webhook Inbox 검사 통과`
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
