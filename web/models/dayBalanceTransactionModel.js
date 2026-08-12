const mongoose = require("mongoose");

const { Schema } = mongoose;

const DAY_LEDGER_ACCOUNTS =
  Object.freeze([
    "SYSTEM_ISSUE",
    "USER_REFUND_AVAILABLE",
    "USER_REFUND_LOCKED",
    "USER_BONUS_AVAILABLE",
    "USER_BONUS_LOCKED",
    "SYSTEM_BURN",
    "SYSTEM_EXPIRY",
    "SYSTEM_REFUND_CONVERSION",
    "OPERATOR_VAULT",
  ]);

const DAY_TRANSACTION_TYPES =
  Object.freeze([
    "PACKAGE_ISSUE",
    "MATCH_LOCK",
    "MATCH_UNLOCK",
    "MATCH_TRANSFER",
    "MATCH_BURN",
    "REVENGE_FEE_BURN",
    "REFUND_CONVERT",
    "DAILY_USE",
    // SHOP_VAULT_TRANSFER 는 구형(OPERATOR_VAULT 이전) 상점 설계의 유형이다.
    // 원장은 append-only 라 등록된 유형을 제거하지 않지만, docs/logic/12_SHOP.md
    // v1.0(§2.5·§18)이 확정한 새 Main Shop 은 구매 대금을 이전하지 않고
    // SHOP_ITEM_PURCHASE_BURN 으로 소각하므로 새 코드는 이 유형을 다시 쓰지 않는다.
    "SHOP_VAULT_TRANSFER",
    "EXPIRY_BURN",
    "ADMIN_ADJUST",
    "REVERSAL",
    // docs/logic/12_SHOP.md §12 — Main Division Shop v1.0 원장 거래 유형.
    // EFFECT_APPLIED/EXPIRED/CANCELLED 는 감사 마커 유형으로 등록만 해 둔다:
    // 이 원장은 0일 금액 행을 거부(차변=대변>0 강제)하므로 금액 이동이 없는
    // 효과 상태 변화는 ArenaShopEffect 문서에만 기록한다.
    "SHOP_ITEM_PURCHASE_BURN",
    "SHOP_ITEM_PURCHASE_REVERSAL",
    "SHOP_ITEM_EFFECT_APPLIED",
    "SHOP_ITEM_EFFECT_EXPIRED",
    "SHOP_ITEM_EFFECT_CANCELLED",
    "DEFENSE_SCHEDULE_PROTECTION_COMPENSATION_TRANSFER",
    "DEFENSE_SCHEDULE_PROTECTION_BURN",
    "DEFENSE_SCHEDULE_PROTECTION_DEPOSIT_RELEASE",
  ]);

const userLedgerAccounts =
  new Set([
    "USER_REFUND_AVAILABLE",
    "USER_REFUND_LOCKED",
    "USER_BONUS_AVAILABLE",
    "USER_BONUS_LOCKED",
  ]);

const dayBalanceEntrySchema =
  new Schema(
    {
      account: {
        type: String,
        enum:
          DAY_LEDGER_ACCOUNTS,
        required: true,
      },
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      cycleId: {
        type: Schema.Types.ObjectId,
        ref: "AccessCycleLifecycle",
        default: null,
      },
      debitDays: {
        type: Number,
        min: 0,
        default: 0,
      },
      creditDays: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
    {
      _id: false,
    }
  );

dayBalanceEntrySchema.pre(
  "validate",
  function validateLedgerEntry() {
    if (
      !Number.isSafeInteger(
        this.debitDays
      ) ||
      !Number.isSafeInteger(
        this.creditDays
      )
    ) {
      this.invalidate(
        "debitDays",
        "ledger days must be integers"
      );
    }
    const hasDebit =
      this.debitDays > 0;
    const hasCredit =
      this.creditDays > 0;
    if (hasDebit === hasCredit) {
      this.invalidate(
        "creditDays",
        "entry must contain exactly one positive debit or credit"
      );
    }
    if (
      userLedgerAccounts.has(
        this.account
      ) &&
      (!this.userId ||
        !this.cycleId)
    ) {
      this.invalidate(
        "account",
        "user ledger accounts require userId and cycleId"
      );
    }
  }
);

const dayBalanceTransactionSchema =
  new Schema(
    {
      transactionId: {
        type: String,
        trim: true,
        maxlength: 160,
        required: true,
        unique: true,
      },
      idempotencyKey: {
        type: String,
        trim: true,
        maxlength: 240,
        required: true,
        unique: true,
      },
      cycleId: {
        type: Schema.Types.ObjectId,
        ref: "AccessCycleLifecycle",
        required: true,
        index: true,
      },
      matchId: {
        type: Schema.Types.ObjectId,
        ref: "RankTakeoverMatch",
        default: null,
        index: true,
      },
      orderId: {
        type: Schema.Types.ObjectId,
        ref: "PaymentOrder",
        default: null,
        index: true,
      },
      type: {
        type: String,
        enum:
          DAY_TRANSACTION_TYPES,
        required: true,
        index: true,
      },
      status: {
        type: String,
        enum: ["POSTED"],
        default: "POSTED",
        index: true,
      },
      entries: {
        type: [
          dayBalanceEntrySchema,
        ],
        validate: {
          validator: (entries) =>
            Array.isArray(entries) &&
            entries.length >= 2,
          message:
            "balanced transaction needs at least two entries",
        },
        required: true,
      },
      reasonCode: {
        type: String,
        trim: true,
        maxlength: 120,
        required: true,
      },
      actorType: {
        type: String,
        enum: [
          "SYSTEM",
          "USER",
          "ADMIN",
          "WEBHOOK",
          "JOB",
        ],
        required: true,
      },
      actorId: {
        type: String,
        trim: true,
        maxlength: 160,
        default: null,
      },
      reversalOf: {
        type: Schema.Types.ObjectId,
        ref: "DayBalanceTransaction",
        default: null,
      },
      metadata: {
        type: Schema.Types.Mixed,
        default: {},
      },
      occurredAt: {
        type: Date,
        default: Date.now,
        index: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

dayBalanceTransactionSchema.index({
  cycleId: 1,
  occurredAt: 1,
});
// `cycleId` at the transaction root identifies the initiating/audit cycle.
// Match transfers can credit a defender who owns a different cycle, so balance
// reconciliation must also be able to find transactions by the entry owner.
dayBalanceTransactionSchema.index({
  "entries.cycleId": 1,
  "entries.userId": 1,
  occurredAt: 1,
});
dayBalanceTransactionSchema.index(
  {
    reversalOf: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      reversalOf: {
        $type: "objectId",
      },
    },
    name:
      "one_reversal_per_posted_transaction",
  }
);
dayBalanceTransactionSchema.index(
  {
    matchId: 1,
    type: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      matchId: {
        $type: "objectId",
      },
      type: {
        $in: [
          "MATCH_TRANSFER",
          "MATCH_BURN",
          "REVENGE_FEE_BURN",
          "MATCH_UNLOCK",
        ],
      },
    },
    name:
      "one_match_settlement_per_type",
  }
);

dayBalanceTransactionSchema.pre(
  "validate",
  function validateBalancedTransaction() {
    const entries =
      Array.isArray(this.entries)
        ? this.entries
        : [];
    const debitTotal =
      entries.reduce(
        (total, entry) =>
          total +
          Number(
            entry.debitDays || 0
          ),
        0
      );
    const creditTotal =
      entries.reduce(
        (total, entry) =>
          total +
          Number(
            entry.creditDays || 0
          ),
        0
      );
    if (
      debitTotal <= 0 ||
      debitTotal !== creditTotal
    ) {
      this.invalidate(
        "entries",
        "ledger transaction debits and credits must be equal and positive"
      );
    }
    if (
      this.type === "REVERSAL" &&
      !this.reversalOf
    ) {
      this.invalidate(
        "reversalOf",
        "reversal transaction requires reversalOf"
      );
    }
    if (
      this.type !== "REVERSAL" &&
      this.reversalOf
    ) {
      this.invalidate(
        "reversalOf",
        "only a reversal transaction can reference reversalOf"
      );
    }
  }
);

function immutableLedgerError() {
  const error =
    new Error(
      "posted ledger transactions are append-only"
    );
  error.code =
    "IMMUTABLE_LEDGER_TRANSACTION";
  return error;
}

dayBalanceTransactionSchema.pre(
  "save",
  function rejectPostedDocumentMutation() {
    if (
      !this.isNew &&
      this.modifiedPaths()
        .length > 0
    ) {
      throw immutableLedgerError();
    }
  }
);

dayBalanceTransactionSchema.pre(
  [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "findOneAndReplace",
    "replaceOne",
  ],
  function rejectPostedQueryMutation() {
    throw immutableLedgerError();
  }
);

dayBalanceTransactionSchema.pre(
  [
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
    "findOneAndRemove",
  ],
  function rejectPostedQueryDeletion() {
    throw immutableLedgerError();
  }
);

dayBalanceTransactionSchema.pre(
  "deleteOne",
  {
    document: true,
    query: false,
  },
  function rejectPostedDocumentDeletion() {
    throw immutableLedgerError();
  }
);

dayBalanceTransactionSchema.pre(
  [
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
    "findOneAndRemove",
  ],
  function rejectPostedQueryDeletion() {
    throw immutableLedgerError();
  }
);

dayBalanceTransactionSchema.pre(
  "deleteOne",
  {
    document: true,
    query: false,
  },
  function rejectPostedDocumentDeletion() {
    throw immutableLedgerError();
  }
);

const DayBalanceTransaction =
  mongoose.models
    .DayBalanceTransaction ||
  mongoose.model(
    "DayBalanceTransaction",
    dayBalanceTransactionSchema
  );

const unguardedBulkWrite =
  DayBalanceTransaction
    .bulkWrite
    .bind(
      DayBalanceTransaction
    );
DayBalanceTransaction.bulkWrite =
  async function appendOnlyBulkWrite(
    operations,
    options
  ) {
    if (
      (operations || []).some(
        (operation) =>
          operation.updateOne ||
          operation.updateMany ||
          operation.replaceOne ||
          operation.deleteOne ||
          operation.deleteMany
      )
    ) {
      throw immutableLedgerError();
    }
    return unguardedBulkWrite(
      operations,
      options
    );
  };

module.exports = {
  DAY_LEDGER_ACCOUNTS,
  DAY_TRANSACTION_TYPES,
  DayBalanceTransaction,
};
