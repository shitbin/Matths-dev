const RULES = Object.freeze({
  paidPackageDays: 29,
  refundStreakDays: 30,
  refundMinimumChallengeDays: 30,
  timezone: "Asia/Seoul",
});

const DAY_MS = 86_400_000;
const KST_FORMATTER = new Intl.DateTimeFormat(
  "en-CA",
  {
    timeZone: RULES.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }
);

class AccessEconomyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AccessEconomyError";
    this.code = code;
    this.status = 409;
  }
}

function asDate(value, label = "date") {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError(
      `${label} must be a valid date`
    );
  }
  return date;
}

function nonNegativeInteger(
  value,
  fallback = 0
) {
  const number = Number(value);
  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return fallback;
  }
  return Math.floor(number);
}

function kstDayKey(value) {
  const parts =
    KST_FORMATTER.formatToParts(
      asDate(value)
    );
  const byType = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ])
  );
  return [
    byType.year,
    byType.month,
    byType.day,
  ].join("-");
}

function dayOrdinal(dayKey) {
  const match =
    String(dayKey || "").match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );
  if (!match) {
    return null;
  }
  return Math.floor(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    ) / DAY_MS
  );
}

function dayKeyFromOrdinal(ordinal) {
  return new Date(
    ordinal * DAY_MS
  )
    .toISOString()
    .slice(0, 10);
}

function addKstCalendarDays(
  dayKey,
  days
) {
  const ordinal =
    dayOrdinal(dayKey);
  if (ordinal === null) {
    throw new TypeError(
      "dayKey must be YYYY-MM-DD"
    );
  }
  return dayKeyFromOrdinal(
    ordinal + Number(days)
  );
}

function kstEndOfDay(dayKey) {
  // KST 다음 날 00:00 = 전날 UTC 15:00
  const nextDay =
    addKstCalendarDays(dayKey, 1);
  return new Date(
    new Date(
      `${nextDay}T00:00:00+09:00`
    ).getTime() - 1
  );
}

function cloneState(state) {
  return {
    ...state,
  };
}

function refundEligibility(state) {
  const completed =
    Boolean(
      state?.refundCompletedAt
    ) ||
    state?.refundStatus ===
      "COMPLETED";
  const streakReady =
    nonNegativeInteger(
      state?.streakDays
    ) >=
    RULES.refundStreakDays;
  const challengeReady =
    nonNegativeInteger(
      state?.refundChallengeDays
    ) >=
    RULES.refundMinimumChallengeDays;

  return {
    eligible:
      !completed &&
      streakReady &&
      challengeReady,
    completed,
    streakReady,
    challengeReady,
    streakDays:
      nonNegativeInteger(
        state?.streakDays
      ),
    targetStreakDays:
      RULES.refundStreakDays,
    refundChallengeDays:
      nonNegativeInteger(
        state?.refundChallengeDays
      ),
    targetChallengeDays:
      RULES.refundMinimumChallengeDays,
  };
}

function day30CompletionPassAvailable(
  state,
  now = new Date()
) {
  if (
    !state ||
    state.refundCompletedAt ||
    state.refundStatus ===
      "COMPLETED"
  ) {
    return false;
  }

  const paidEndsAt =
    state.paidAccessEndsAt
      ? asDate(
          state.paidAccessEndsAt,
          "paidAccessEndsAt"
        )
      : null;
  if (
    !paidEndsAt ||
    asDate(now).getTime() <
      paidEndsAt.getTime()
  ) {
    return false;
  }

  const streakDays =
    nonNegativeInteger(
      state.streakDays
    );
  return (
    streakDays >=
      RULES.paidPackageDays &&
    streakDays <
      RULES.refundStreakDays &&
    nonNegativeInteger(
      state.refundChallengeDays
    ) >=
      RULES.refundMinimumChallengeDays
  );
}

function packagePurchaseBlockers(
  state
) {
  if (
    !state ||
    state.activeRanking !== "MAIN"
  ) {
    return [];
  }

  const blockers = [];
  if (
    nonNegativeInteger(
      state.bonusAccessDays
    ) > 0
  ) {
    blockers.push({
      code: "BONUS_ACCESS_REMAINS",
      message:
        "보유한 추가 학습권을 모두 사용해야 새 패키지를 구매할 수 있습니다.",
    });
  }
  if (
    nonNegativeInteger(
      state.lockedDays
    ) > 0
  ) {
    blockers.push({
      code: "LOCKED_DAYS_REMAIN",
      message:
        "랭킹전에 잠긴 학습권 정산이 끝나야 새 패키지를 구매할 수 있습니다.",
    });
  }
  if (
    nonNegativeInteger(
      state.activeTakeoverCount
    ) > 0
  ) {
    blockers.push({
      code: "TAKEOVER_IN_PROGRESS",
      message:
        "진행 중인 Rank Takeover를 마쳐야 새 패키지를 구매할 수 있습니다.",
    });
  }
  return blockers;
}

function startPackageCycleState({
  state = null,
  cycleId,
  paymentReference,
  purchaseAmountKRW,
  startedAt = new Date(),
}) {
  const normalizedCycleId =
    String(cycleId || "").trim();
  const normalizedPayment =
    String(
      paymentReference || ""
    ).trim();
  const amount =
    nonNegativeInteger(
      purchaseAmountKRW,
      -1
    );
  if (
    !normalizedCycleId ||
    !normalizedPayment ||
    amount < 0
  ) {
    throw new TypeError(
      "cycleId, paymentReference and purchaseAmountKRW are required"
    );
  }

  const blockers =
    packagePurchaseBlockers(state);
  if (blockers.length) {
    throw new AccessEconomyError(
      "PACKAGE_PURCHASE_BLOCKED",
      blockers
        .map((item) => item.message)
        .join(" ")
    );
  }

  const start =
    asDate(startedAt, "startedAt");
  const startDay =
    kstDayKey(start);
  const endDay =
    addKstCalendarDays(
      startDay,
      RULES.paidPackageDays - 1
    );

  return {
    ...(state || {}),
    cycleId: normalizedCycleId,
    paymentReference:
      normalizedPayment,
    purchaseAmountKRW: amount,
    currency: "KRW",
    cycleStartedAt: start,
    paidAccessStartsAt: start,
    // 배타적 끝 시각. 7/1 구매면 7/30 00:00 KST, 즉 7/29까지 이용.
    paidAccessEndsAt:
      kstEndOfDay(endDay),
    paidAccessDays:
      RULES.paidPackageDays,
    refundChallengeDays:
      RULES.paidPackageDays,
    bonusAccessDays: 0,
    lockedDays: 0,
    streakDays: 0,
    lastQualifiedStudyDayKey:
      null,
    activeRanking: "SUB",
    mainRankingEnteredAt: null,
    rankShieldUntil: null,
    activeTakeoverCount: 0,
    refundStatus: "CHALLENGING",
    refundEligibleAt: null,
    refundCompletedAt: null,
    refundFailureReason: "",
  };
}

function recordQualifiedStudyDayState(
  state,
  {
    occurredAt = new Date(),
  } = {}
) {
  if (!state?.cycleId) {
    throw new AccessEconomyError(
      "PACKAGE_CYCLE_REQUIRED",
      "진행 중인 29일 패키지가 없습니다."
    );
  }
  if (
    state.refundStatus ===
    "COMPLETED"
  ) {
    return {
      state: cloneState(state),
      duplicate: false,
      changed: false,
    };
  }

  const currentKey =
    kstDayKey(occurredAt);
  const previousKey =
    state.lastQualifiedStudyDayKey ||
    null;
  if (previousKey === currentKey) {
    return {
      state: cloneState(state),
      duplicate: true,
      changed: false,
    };
  }

  const previousOrdinal =
    dayOrdinal(previousKey);
  const currentOrdinal =
    dayOrdinal(currentKey);
  const consecutive =
    previousOrdinal !== null &&
    currentOrdinal ===
      previousOrdinal + 1;
  const next = {
    ...state,
    streakDays: consecutive
      ? nonNegativeInteger(
          state.streakDays
        ) + 1
      : 1,
    lastQualifiedStudyDayKey:
      currentKey,
  };
  const eligibility =
    refundEligibility(next);
  if (eligibility.eligible) {
    next.refundStatus =
      "ELIGIBLE";
    next.refundEligibleAt =
      state.refundEligibleAt ||
      asDate(occurredAt);
  }

  return {
    state: next,
    duplicate: false,
    changed: true,
  };
}

function completeRefundState(
  state,
  {
    completedAt = new Date(),
  } = {}
) {
  const eligibility =
    refundEligibility(state);
  if (eligibility.completed) {
    throw new AccessEconomyError(
      "REFUND_ALREADY_COMPLETED",
      "이 결제 건의 페이백은 이미 완료되었습니다."
    );
  }
  if (!eligibility.eligible) {
    throw new AccessEconomyError(
      "REFUND_NOT_ELIGIBLE",
      "30일 연속 학습과 환불 도전 일수 30일을 모두 충족해야 합니다."
    );
  }
  if (
    nonNegativeInteger(
      state.lockedDays
    ) > 0 ||
    nonNegativeInteger(
      state.activeTakeoverCount
    ) > 0
  ) {
    throw new AccessEconomyError(
      "TAKEOVER_SETTLEMENT_PENDING",
      "진행 중인 Rank Takeover 정산을 먼저 완료해야 합니다."
    );
  }

  const date =
    asDate(
      completedAt,
      "completedAt"
    );
  const bonus =
    nonNegativeInteger(
      state.refundChallengeDays
    ) -
    RULES.paidPackageDays;

  return {
    ...state,
    // 유료 이용권은 과거 구매 권리 기록이므로 랭킹·환불 정산으로 바꾸지 않는다.
    paidAccessDays:
      nonNegativeInteger(
        state.paidAccessDays
      ),
    refundChallengeDays: 0,
    bonusAccessDays: bonus,
    activeRanking: "MAIN",
    mainRankingEnteredAt: date,
    refundStatus: "COMPLETED",
    refundCompletedAt: date,
    refundFailureReason: "",
  };
}

function buildAccessSummary({
  account = null,
  rankingProfile = null,
  now = new Date(),
} = {}) {
  if (!account) {
    return {
      state: "NO_PACKAGE",
      access: {
        paidAccessDays: 0,
        refundChallengeDays: 0,
        bonusAccessDays: 0,
        lockedDays: 0,
      },
      refund: {
        status: null,
        eligible: false,
        day30CompletionPassAvailable:
          false,
        streakDays: 0,
        targetStreakDays:
          RULES.refundStreakDays,
        targetChallengeDays:
          RULES.refundMinimumChallengeDays,
        paybackAmountKRW: 0,
        completedAt: null,
      },
      ranking: {
        activeRanking: null,
        skillMMR:
          rankingProfile?.mmr ??
          null,
        rankTier:
          rankingProfile?.tier ??
          null,
        ladderPosition:
          rankingProfile?.overallRank ??
          null,
      },
      purchase: {
        allowed: true,
        blockers: [],
      },
    };
  }

  const eligibility =
    refundEligibility(account);
  const blockers =
    packagePurchaseBlockers(
      account
    );
  const activeRanking =
    account.activeRanking ||
    "SUB";
  const state =
    activeRanking === "MAIN"
      ? "MAIN_RANKER"
      : eligibility.eligible
        ? "REFUND_READY"
        : "REFUND_CHALLENGE";

  return {
    state,
    cycleId:
      account.cycleId || null,
    access: {
      paidAccessDays:
        nonNegativeInteger(
          account.paidAccessDays
        ),
      refundChallengeDays:
        eligibility.refundChallengeDays,
      bonusAccessDays:
        nonNegativeInteger(
          account.bonusAccessDays
        ),
      lockedDays:
        nonNegativeInteger(
          account.lockedDays
        ),
      paidAccessStartsAt:
        account.paidAccessStartsAt ||
        null,
      paidAccessEndsAt:
        account.paidAccessEndsAt ||
        null,
    },
    refund: {
      status:
        account.refundStatus ||
        "CHALLENGING",
      eligible:
        eligibility.eligible,
      day30CompletionPassAvailable:
        day30CompletionPassAvailable(
          account,
          now
        ),
      streakDays:
        eligibility.streakDays,
      targetStreakDays:
        eligibility.targetStreakDays,
      targetChallengeDays:
        eligibility.targetChallengeDays,
      paybackAmountKRW:
        nonNegativeInteger(
          account.purchaseAmountKRW
        ),
      completedAt:
        account.refundCompletedAt ||
        null,
    },
    ranking: {
      activeRanking,
      skillMMR:
        rankingProfile?.mmr ??
        null,
      rankTier:
        rankingProfile?.tier ??
        null,
      ladderPosition:
        rankingProfile?.overallRank ??
        null,
      mainRankingEnteredAt:
        account.mainRankingEnteredAt ||
        null,
      rankShieldUntil:
        account.rankShieldUntil ||
        null,
    },
    purchase: {
      allowed:
        blockers.length === 0,
      blockers,
    },
  };
}

module.exports = {
  AccessEconomyError,
  RULES,
  addKstCalendarDays,
  buildAccessSummary,
  completeRefundState,
  day30CompletionPassAvailable,
  kstDayKey,
  packagePurchaseBlockers,
  recordQualifiedStudyDayState,
  refundEligibility,
  startPackageCycleState,
};
