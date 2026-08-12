const crypto = require("node:crypto");

const {
  PaymentWebhookInbox,
  SIGNATURE_VERIFICATION_STATUSES,
} = require(
  "../models/paymentWebhookInboxModel"
);

const signatureStatuses =
  new Set(
    SIGNATURE_VERIFICATION_STATUSES
  );

class PaymentWebhookInboxError
  extends Error {
  constructor(
    code,
    message,
    {
      statusCode = 400,
      inboxId = null,
    } = {}
  ) {
    super(message);
    this.name =
      "PaymentWebhookInboxError";
    this.code = code;
    this.statusCode =
      statusCode;
    this.inboxId =
      inboxId
        ? String(inboxId)
        : null;
  }
}

function requiredText(
  value,
  label,
  maxLength
) {
  const normalized =
    String(value || "").trim();
  if (!normalized) {
    throw new TypeError(
      `${label} is required`
    );
  }
  if (
    normalized.length >
    maxLength
  ) {
    throw new TypeError(
      `${label} is too long`
    );
  }
  return normalized;
}

function optionalText(
  value,
  maxLength
) {
  const normalized =
    String(value || "").trim();
  if (
    normalized.length >
    maxLength
  ) {
    throw new TypeError(
      "webhook metadata is too long"
    );
  }
  return normalized;
}

function asDate(
  value,
  label
) {
  if (
    value === null ||
    value === undefined
  ) {
    throw new TypeError(
      `${label} must be a valid date`
    );
  }
  const parsed =
    value instanceof Date
      ? new Date(
          value.getTime()
        )
      : new Date(value);
  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new TypeError(
      `${label} must be a valid date`
    );
  }
  return parsed;
}

function requireRawPayload(
  rawPayload
) {
  if (
    !Buffer.isBuffer(
      rawPayload
    )
  ) {
    throw new PaymentWebhookInboxError(
      "RAW_WEBHOOK_BODY_REQUIRED",
      "webhook body must be the original Buffer",
      {
        statusCode: 500,
      }
    );
  }
  return rawPayload;
}

function payloadFingerprint(
  rawPayload
) {
  const bytes =
    requireRawPayload(
      rawPayload
    );
  return {
    payloadHash: crypto
      .createHash("sha256")
      .update(bytes)
      .digest("hex"),
    payloadSizeBytes:
      bytes.byteLength,
  };
}

function normalizeSignatureVerification(
  value,
  receivedAt
) {
  let status;
  let reasonCode = "";
  let checkedAt =
    receivedAt;

  if (
    typeof value ===
    "boolean"
  ) {
    status =
      value
        ? "VERIFIED"
        : "INVALID";
  } else if (
    typeof value ===
      "object" &&
    value !== null
  ) {
    status = value.status;
    reasonCode =
      value.reasonCode;
    checkedAt =
      value.checkedAt ||
      checkedAt;
  } else {
    status = value;
  }

  const normalizedStatus =
    String(status || "")
      .trim()
      .toUpperCase();
  if (
    !signatureStatuses.has(
      normalizedStatus
    )
  ) {
    throw new TypeError(
      "signature verifier returned an unsupported status"
    );
  }

  return {
    status:
      normalizedStatus,
    checkedAt: asDate(
      checkedAt,
      "signature checkedAt"
    ),
    reasonCode:
      optionalText(
        reasonCode,
        120
      ),
  };
}

async function verifyRawPayload(
  rawPayload,
  verifySignature,
  receivedAt
) {
  if (
    typeof verifySignature !==
    "function"
  ) {
    throw new PaymentWebhookInboxError(
      "WEBHOOK_SIGNATURE_VERIFIER_REQUIRED",
      "verifySignature(rawPayload) is required",
      {
        statusCode: 500,
      }
    );
  }

  try {
    // 이 콜백에는 아래에서 해시를 계산하고 저장하는 것과 정확히 같은 Buffer
    // 인스턴스를 전달한다. 파싱·재직렬화한 JSON으로 검증하면 안 된다.
    const result =
      await verifySignature(
        rawPayload
      );
    return normalizeSignatureVerification(
      result,
      receivedAt
    );
  } catch (error) {
    if (
      error instanceof
      PaymentWebhookInboxError
    ) {
      throw error;
    }
    return {
      status: "ERROR",
      checkedAt:
        receivedAt,
      // 검증기 예외 메시지는 비밀값을 포함할 수 있으므로 저장하지 않는다.
      reasonCode:
        "VERIFIER_ERROR",
    };
  }
}

function isDuplicateKey(
  error
) {
  return (
    error?.code === 11000 ||
    error?.code === 11001
  );
}

function unwrapUpdateResult(
  result
) {
  if (
    result &&
    Object.prototype
      .hasOwnProperty.call(
        result,
        "value"
      )
  ) {
    return {
      inbox: result.value,
      created:
        result
          .lastErrorObject
          ?.updatedExisting ===
          false ||
        Boolean(
          result
            .lastErrorObject
            ?.upserted
        ),
    };
  }
  return {
    inbox: result,
    created: false,
  };
}

function fieldValue(
  document,
  field
) {
  if (
    document &&
    typeof document.get ===
      "function"
  ) {
    return document.get(
      field
    );
  }
  return document?.[field];
}

function inboxId(
  inbox
) {
  return fieldValue(
    inbox,
    "_id"
  );
}

async function findExisting(
  InboxModel,
  filter
) {
  return InboxModel.findOne(
    filter
  );
}

async function firstObservation(
  InboxModel,
  filter,
  insertDocument
) {
  try {
    const result =
      await InboxModel
        .findOneAndUpdate(
          filter,
          {
            $setOnInsert:
              insertDocument,
          },
          {
            upsert: true,
            returnDocument:
              "after",
            runValidators: true,
            setDefaultsOnInsert:
              true,
            includeResultMetadata:
              true,
            timestamps: false,
          }
        );
    return unwrapUpdateResult(
      result
    );
  } catch (error) {
    if (
      !isDuplicateKey(
        error
      )
    ) {
      throw error;
    }
    return {
      inbox:
        await findExisting(
          InboxModel,
          filter
        ),
      created: false,
    };
  }
}

function trustedFields(
  {
    eventType,
    fingerprint,
    verification,
    receiptTime,
  }
) {
  return {
    eventType,
    ...fingerprint,
    signatureVerification:
      verification,
    status: "RECEIVED",
    retryCount: 0,
    nextRetryAt:
      receiptTime,
    lastAttemptAt: null,
    lastError: {},
    ignoreReasonCode: "",
    // untrusted preplay가 먼저 있었다면 실제 수신 시각은 인증된 요청 기준으로 교체한다.
    receivedAt:
      receiptTime,
    processingStartedAt:
      null,
    processedAt: null,
    updatedAt:
      receiptTime,
  };
}

async function promoteUntrustedInbox(
  InboxModel,
  filter,
  fields
) {
  const result =
    await InboxModel
      .findOneAndUpdate(
        {
          ...filter,
          "signatureVerification.status":
            {
              $ne:
                "VERIFIED",
            },
        },
        {
          $set: fields,
        },
        {
          returnDocument:
            "after",
          runValidators: true,
          timestamps: false,
        }
      );
  if (
    result &&
    Object.prototype
      .hasOwnProperty.call(
        result,
        "value"
      )
  ) {
    return result.value;
  }
  return result;
}

function signatureRejection(
  verification,
  inbox
) {
  const unavailable =
    [
      "NOT_CHECKED",
      "ERROR",
    ].includes(
      verification.status
    );
  return new PaymentWebhookInboxError(
    unavailable
      ? "WEBHOOK_SIGNATURE_UNAVAILABLE"
      : "WEBHOOK_SIGNATURE_INVALID",
    unavailable
      ? "webhook signature could not be verified"
      : "webhook signature is invalid",
    {
      statusCode:
        unavailable
          ? 503
          : 401,
      inboxId:
        inboxId(inbox),
    }
  );
}

/**
 * 공개 Webhook 경로 계약:
 * - 이 함수를 호출하는 Express 경로는 `express.raw({ type: "application/json" })`
 *   같은 raw-body 미들웨어를 JSON 파서보다 먼저 적용해야 한다.
 * - `rawPayload`는 네트워크에서 받은 원본 Buffer여야 한다.
 * - `verifySignature`는 해당 Buffer와 서명 헤더를 검증하고 결과만 반환한다.
 *   원문 payload와 서명 헤더는 Inbox에 저장하거나 로그로 남기지 않는다.
 */
async function receivePaymentWebhook(
  {
    provider,
    webhookEventId,
    eventType = "",
    rawPayload,
    verifySignature,
    receivedAt =
      new Date(),
  },
  {
    InboxModel =
      PaymentWebhookInbox,
  } = {}
) {
  const body =
    requireRawPayload(
      rawPayload
    );
  const normalizedProvider =
    requiredText(
      provider,
      "provider",
      60
    ).toLowerCase();
  const normalizedEventId =
    requiredText(
      webhookEventId,
      "webhookEventId",
      200
    );
  const normalizedEventType =
    optionalText(
      eventType,
      120
    );
  const receiptTime =
    asDate(
      receivedAt,
      "receivedAt"
    );
  const fingerprint =
    payloadFingerprint(
      body
    );
  const verification =
    await verifyRawPayload(
      body,
      verifySignature,
      receiptTime
    );
  const verified =
    verification.status ===
    "VERIFIED";
  const filter = {
    provider:
      normalizedProvider,
    webhookEventId:
      normalizedEventId,
  };
  const insertDocument = {
    ...filter,
    eventType:
      normalizedEventType,
    ...fingerprint,
    signatureVerification:
      verification,
    status:
      verified
        ? "RECEIVED"
        : "IGNORED",
    retryCount: 0,
    nextRetryAt:
      verified
        ? receiptTime
        : null,
    lastAttemptAt: null,
    lastError: {},
    ignoreReasonCode:
      verified
        ? ""
        : verification
            .reasonCode ||
          `SIGNATURE_${verification.status}`,
    receivedAt:
      receiptTime,
    processingStartedAt:
      null,
    processedAt:
      verified
        ? null
        : receiptTime,
    createdAt:
      receiptTime,
    updatedAt:
      receiptTime,
  };

  let {
    inbox,
    created,
  } =
    await firstObservation(
      InboxModel,
      filter,
      insertDocument
    );

  if (!inbox) {
    throw new Error(
      "webhook inbox upsert did not return a document"
    );
  }

  let promoted = false;
  const storedVerification =
    fieldValue(
      inbox,
      "signatureVerification"
    );

  if (
    verified &&
    storedVerification
      ?.status !== "VERIFIED"
  ) {
    // 인증 전 event ID는 공격자가 선점할 수 있다. VERIFIED 요청은 같은 _id를
    // 원자적으로 승격해 INVALID/NOT_CHECKED preplay가 정상 재전송을 막지 못하게 한다.
    const promotedInbox =
      await promoteUntrustedInbox(
        InboxModel,
        filter,
        trustedFields({
          eventType:
            normalizedEventType,
          fingerprint,
          verification,
          receiptTime,
        })
      );
    if (promotedInbox) {
      inbox =
        promotedInbox;
      promoted = true;
      created = false;
    } else {
      // 다른 VERIFIED 요청이 먼저 승격한 경우 최종 상태를 다시 읽는다.
      inbox =
        await findExisting(
          InboxModel,
          filter
        );
    }
  }

  if (!verified) {
    // IGNORED 감사 레코드는 남기되 호출자가 이를 성공 이벤트로 오인하지 않도록
    // 명시적 오류를 던진다. 이후 VERIFIED 요청은 위 승격 경로로 복구된다.
    throw signatureRejection(
      verification,
      inbox
    );
  }

  const storedHash =
    fieldValue(
      inbox,
      "payloadHash"
    );
  if (
    storedHash !==
    fingerprint.payloadHash
  ) {
    // 이미 인증된 event ID의 본문이 달라지는 것은 정상 중복이 아니다.
    // 원문·해시를 오류 메시지에 노출하지 않고 명시적 충돌 코드만 반환한다.
    throw new PaymentWebhookInboxError(
      "WEBHOOK_EVENT_PAYLOAD_CONFLICT",
      "verified webhook event id was reused with a different raw payload",
      {
        statusCode: 409,
        inboxId:
          inboxId(inbox),
      }
    );
  }

  return {
    inbox,
    created,
    promoted,
    duplicate:
      !created &&
      !promoted,
    payloadHashMatches:
      true,
    signatureVerificationMatches:
      fieldValue(
        inbox,
        "signatureVerification"
      )?.status ===
      "VERIFIED",
  };
}

module.exports = {
  PaymentWebhookInboxError,
  payloadFingerprint,
  receivePaymentWebhook,
};
