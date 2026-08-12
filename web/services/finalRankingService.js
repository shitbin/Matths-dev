const mongoose = require("mongoose");
const {
  RankingProfile,
  PrivateMockWeeklyResult,
  User,
} = require("../models/matthsModel");
const {
  AccessCycle,
  ArenaAccessState,
  ArenaMatch,
  ArenaOutboxEvent,
  ArenaStanding,
  LiveFinalRankingProfile,
} = require("../models/goatArenaModel");
const {
  arenaTierIndex,
} = require("./arenaTierPolicy");
const {
  kstSeasonKey,
} = require("./arenaStandingService");

const FINAL_RANKING_POLICY_CODE = "FINAL-RANKING-V1.4";

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function kstClockParts(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [
      part.type,
      part.type === "weekday" ? part.value : Number(part.value),
    ])
  );
}

function isSundayDisplayFrozen(value = new Date()) {
  const parts = kstClockParts(value);
  return parts.weekday === "Sun" && Number(parts.hour) >= 15;
}

function standingComparator(left, right) {
  const tierDifference =
    arenaTierIndex(right.arenaRank) - arenaTierIndex(left.arenaRank);
  if (tierDifference !== 0) return tierDifference;
  const gpDifference = Number(right.arenaGp) - Number(left.arenaGp);
  if (gpDifference !== 0) return gpDifference;
  const reachedDifference =
    new Date(left.reachedCurrentGpAt || left.createdAt || 0).getTime() -
    new Date(right.reachedCurrentGpAt || right.createdAt || 0).getTime();
  if (reachedDifference !== 0) return reachedDifference;
  return String(left.userId).localeCompare(String(right.userId));
}

function percentileMapForDivision(standings) {
  const ordered = [...standings].sort(standingComparator);
  const denominator = Math.max(1, ordered.length - 1);
  return new Map(
    ordered.map((standing, index) => [
      String(standing.userId),
      ordered.length === 1 ? 1 : 1 - index / denominator,
    ])
  );
}

function subGrowth(startPercentile, currentPercentile) {
  return clamp(
    80 * (Number(currentPercentile) - Number(startPercentile)),
    -20,
    20
  );
}

function mainGrowth(startPercentile, currentPercentile) {
  return clamp(
    80 * (Number(currentPercentile) - Number(startPercentile)),
    -20,
    20
  );
}

function calculateFinalRating({
  division,
  skillMmr,
  weeklyMockBonus,
  seasonSubStartPercentile,
  seasonSubCurrentPercentile,
  seasonSubEndPercentile,
  seasonMainStartPercentile,
  seasonMainCurrentPercentile,
  frozenSubGrowth,
  temporaryAdjustment,
}) {
  const mmr = Number(skillMmr) || 0;
  const mockBonus = Number(weeklyMockBonus) || 0;
  const adjustment = Number(temporaryAdjustment) || 0;
  if (division === "MAIN") {
    const currentMain = Number(seasonMainCurrentPercentile) || 0;
    return Math.round(
      (mmr +
        35 +
        (Number(frozenSubGrowth) || 0) +
        10 * (Number(seasonSubEndPercentile) || 0) +
        mainGrowth(
          Number(seasonMainStartPercentile) || currentMain,
          currentMain
        ) +
        20 * currentMain +
        mockBonus +
        adjustment) *
        1000
    ) / 1000;
  }
  const currentSub = Number(seasonSubCurrentPercentile) || 0;
  return Math.round(
    (mmr +
      15 +
      subGrowth(
        Number(seasonSubStartPercentile) || currentSub,
        currentSub
      ) +
      10 * currentSub +
      mockBonus +
      adjustment) *
      1000
  ) / 1000;
}

function isActiveFinalRankingAccess({ user, accessState, cycle }) {
  if (
    !user ||
    user.isActive === false ||
    user.accountStatus !== "active" ||
    user.privateMockRestriction?.active === true ||
    accessState?.state !== "PAID_ACTIVE" ||
    accessState?.currentSeasonPlacementCompleted !== true ||
    cycle?.status !== "ACTIVE"
  ) {
    return false;
  }
  if (accessState.currentCompetitiveDivision === "MAIN") {
    return (
      Number(cycle.availableLearningDays || 0) +
        Number(cycle.reservedLearningDays || 0) +
        Number(cycle.lockedLearningDays || 0) >
      0
    );
  }
  return Number(cycle.availableLearningDays || 0) > 0;
}

async function calculateFinalRankingRows({ now = new Date() } = {}) {
  const seasonId = kstSeasonKey(now);
  const [accessStates, standings, rankingProfiles, existingProfiles] =
    await Promise.all([
      ArenaAccessState.find({ currentCompetitiveDivision: { $in: ["SUB", "MAIN"] } }).lean(),
      ArenaStanding.find({ seasonKey: seasonId, status: "ACTIVE" }).lean(),
      RankingProfile.find({ datasetOnly: { $ne: true } }).lean(),
      LiveFinalRankingProfile.find({ seasonId }).lean(),
    ]);
  const userIds = accessStates.map((state) => state.userId);
  const cycleIds = accessStates.map((state) => state.accessCycleId).filter(Boolean);
  const [users, cycles, attackCounts] = await Promise.all([
    User.find({ _id: { $in: userIds } })
      .select("accountStatus isActive privateMockRestriction")
      .lean(),
    AccessCycle.find({ _id: { $in: cycleIds } }).lean(),
    ArenaMatch.aggregate([
      {
        $match: {
          seasonKey: seasonId,
          matchType: "NORMAL",
          status: "SETTLED",
        },
      },
      { $group: { _id: "$challenger.userId", count: { $sum: 1 } } },
    ]),
  ]);
  const userById = new Map(users.map((user) => [String(user._id), user]));
  const cycleById = new Map(cycles.map((cycle) => [String(cycle._id), cycle]));
  const mmrByUserId = new Map(
    rankingProfiles.map((profile) => [String(profile.userId), Number(profile.mmr) || 0])
  );
  const existingByUserId = new Map(
    existingProfiles.map((profile) => [String(profile.userId), profile])
  );
  const standingByUserDivision = new Map(
    standings.map((standing) => [
      `${standing.userId}:${standing.division}`,
      standing,
    ])
  );
  const subPercentiles = percentileMapForDivision(
    standings.filter((standing) => standing.division === "SUB")
  );
  const mainPercentiles = percentileMapForDivision(
    standings.filter((standing) => standing.division === "MAIN")
  );
  const attackCountByUserId = new Map(
    attackCounts.map((entry) => [String(entry._id), Number(entry.count) || 0])
  );

  const rows = [];
  for (const accessState of accessStates) {
    const userId = String(accessState.userId);
    const division = accessState.currentCompetitiveDivision;
    const cycle = cycleById.get(String(accessState.accessCycleId));
    const user = userById.get(userId);
    const standing = standingByUserDivision.get(`${userId}:${division}`);
    if (!standing || !isActiveFinalRankingAccess({ user, accessState, cycle })) {
      continue;
    }
    const existing = existingByUserId.get(userId);
    const currentSubPercentile = subPercentiles.get(userId);
    const currentMainPercentile = mainPercentiles.get(userId);
    const seasonSubStartPercentile =
      existing?.seasonSubStartPercentile ??
      (division === "SUB" ? currentSubPercentile : null);
    const seasonSubEndPercentile =
      division === "MAIN"
        ? existing?.seasonSubEndPercentile ??
          existing?.seasonSubCurrentPercentile ??
          currentSubPercentile ??
          0
        : existing?.seasonSubEndPercentile ?? null;
    const calculatedFrozenSubGrowth =
      division === "MAIN"
        ? existing?.frozenSubGrowth ??
          subGrowth(
            existing?.seasonSubStartPercentile ?? seasonSubEndPercentile,
            seasonSubEndPercentile
          )
        : existing?.frozenSubGrowth ?? 0;
    const seasonMainStartPercentile =
      existing?.seasonMainStartPercentile ??
      (division === "MAIN" ? currentMainPercentile : null);
    const weeklyMockBonus = Number(
      existing?.stagedWeeklyMockBonus ?? existing?.weeklyMockBonus ?? 0
    );
    const row = {
      seasonId,
      userId: accessState.userId,
      accessState: accessState.state,
      currentCompetitiveDivision: division,
      skillMmr: mmrByUserId.get(userId) || 0,
      weeklyMockBonus,
      seasonSubStartPercentile,
      seasonSubCurrentPercentile:
        division === "SUB"
          ? currentSubPercentile
          : existing?.seasonSubCurrentPercentile ?? seasonSubEndPercentile,
      seasonSubEndPercentile,
      seasonMainStartPercentile,
      seasonMainCurrentPercentile:
        division === "MAIN"
          ? currentMainPercentile
          : existing?.seasonMainCurrentPercentile ?? null,
      referenceSubPercentile:
        existing?.referenceSubPercentile ?? null,
      actualRenewalSubPercentile:
        existing?.actualRenewalSubPercentile ?? null,
      frozenSubGrowth: calculatedFrozenSubGrowth,
      seasonSettledNormalAttackCount: attackCountByUserId.get(userId) || 0,
      temporaryAdjustment: Number(existing?.temporaryAdjustment || 0),
      calculationKey: `${seasonId}:${userId}`,
    };
    row.finalRating = calculateFinalRating(row);
    rows.push(row);
  }
  rows.sort((left, right) => {
    if (right.finalRating !== left.finalRating) {
      return right.finalRating - left.finalRating;
    }
    if (
      right.seasonSettledNormalAttackCount !==
      left.seasonSettledNormalAttackCount
    ) {
      return (
        right.seasonSettledNormalAttackCount -
        left.seasonSettledNormalAttackCount
      );
    }
    if (right.skillMmr !== left.skillMmr) return right.skillMmr - left.skillMmr;
    return String(left.userId).localeCompare(String(right.userId));
  });
  return rows.map((row, index) => ({ ...row, finalRank: index + 1 }));
}

/*
 * 최종 랭킹은 한 번에 수백 명을 다시 계산한다. 예전 구현은 transaction 안에서
 * 각 학생마다 findOne → updateOne → outbox updateOne을 순서대로 실행해, 로컬
 * 347명 기준 배치고사 제출 응답을 1분 이상 붙잡았다. 계산 결과와 동결 규칙은
 * 그대로 두고 쓰기 계획만 한 번에 만들어 두 모델의 bulkWrite로 반영한다.
 */
function buildFinalRankingWritePlan({
  rows,
  existingProfiles,
  frozen,
  currentTime,
}) {
  const existingByUserId = new Map(
    (existingProfiles || []).map((profile) => [String(profile.userId), profile])
  );
  const profileOperations = [];
  const outboxOperations = [];

  for (const row of rows || []) {
    const existing = existingByUserId.get(String(row.userId));
    const common = { ...row };
    delete common.finalRank;
    delete common.finalRating;

    let profileSet;
    if (frozen) {
      profileSet = {
        ...common,
        status: "SUNDAY_DISPLAY_FROZEN",
        stagedFinalRating: row.finalRating,
        stagedFinalRank: row.finalRank,
        stagedWeeklyMockBonus: row.weeklyMockBonus,
        finalRating: existing?.finalRating ?? row.finalRating,
        finalRank: existing?.finalRank ?? row.finalRank,
        publishedFinalRating:
          existing?.publishedFinalRating ?? existing?.finalRating ?? row.finalRating,
        publishedFinalRank:
          existing?.publishedFinalRank ?? existing?.finalRank ?? row.finalRank,
      };
    } else {
      const rankingChanged =
        Number(existing?.publishedFinalRank || 0) !== Number(row.finalRank) ||
        Number(existing?.publishedFinalRating || 0) !== Number(row.finalRating);
      profileSet = {
        ...common,
        status: "ACTIVE",
        finalRating: row.finalRating,
        finalRank: row.finalRank,
        publishedFinalRating: row.finalRating,
        publishedFinalRank: row.finalRank,
        previousPublishedFinalRating: rankingChanged
          ? existing?.publishedFinalRating ?? existing?.finalRating ?? null
          : existing?.previousPublishedFinalRating ?? null,
        previousPublishedFinalRank: rankingChanged
          ? existing?.publishedFinalRank ?? existing?.finalRank ?? null
          : existing?.previousPublishedFinalRank ?? null,
        publishedWeeklyMockBonus: row.weeklyMockBonus,
        stagedFinalRating: null,
        stagedFinalRank: null,
        stagedWeeklyMockBonus: null,
        lastPublishedAt: rankingChanged
          ? currentTime
          : existing?.lastPublishedAt ?? currentTime,
      };
    }

    profileOperations.push({
      updateOne: {
        filter: { seasonId: row.seasonId, userId: row.userId },
        update: { $set: profileSet },
        upsert: true,
      },
    });

    const publicationState = frozen ? "staged" : "published";
    const idempotencyKey =
      `final-ranking:${publicationState}:${row.seasonId}:${row.userId}:${row.finalRating}:${row.finalRank}`;
    outboxOperations.push({
      updateOne: {
        filter: { idempotencyKey },
        update: {
          $setOnInsert: {
            eventType: frozen ? "FinalRankingFrozen" : "FinalRankingPublished",
            aggregateType: "LiveFinalRankingProfile",
            aggregateId: row.userId,
            idempotencyKey,
            payload: {
              seasonId: row.seasonId,
              finalRating: row.finalRating,
              finalRank: row.finalRank,
            },
          },
        },
        upsert: true,
      },
    });
  }

  return { profileOperations, outboxOperations };
}

async function recalculateFinalRanking({ now = new Date(), forcePublish = false } = {}) {
  const currentTime = new Date(now);
  const rows = await calculateFinalRankingRows({ now: currentTime });
  const frozen = !forcePublish && isSundayDisplayFrozen(currentTime);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const activeUserIds = rows.map((row) => row.userId);
      await LiveFinalRankingProfile.updateMany(
        {
          seasonId: kstSeasonKey(currentTime),
          status: { $in: ["ACTIVE", "SUNDAY_DISPLAY_FROZEN"] },
          ...(activeUserIds.length ? { userId: { $nin: activeUserIds } } : {}),
        },
        {
          $set: {
            status: "INACTIVE_ACCESS_EXPIRED",
            stagedFinalRating: null,
            stagedFinalRank: null,
            stagedWeeklyMockBonus: null,
          },
        },
        { session }
      );
      const existingProfiles = activeUserIds.length
        ? await LiveFinalRankingProfile.find({
            seasonId: kstSeasonKey(currentTime),
            userId: { $in: activeUserIds },
          }).session(session).lean()
        : [];
      const { profileOperations, outboxOperations } =
        buildFinalRankingWritePlan({
          rows,
          existingProfiles,
          frozen,
          currentTime,
        });
      if (profileOperations.length) {
        await LiveFinalRankingProfile.bulkWrite(profileOperations, { session });
        await ArenaOutboxEvent.bulkWrite(outboxOperations, { session });
      }
    });
  } finally {
    await session.endSession();
  }
  return { rows, frozen, published: !frozen };
}

async function setWeeklyMockBonus({ userId, completed, now = new Date() }) {
  const bonus = completed ? 30 : 0;
  const frozen = isSundayDisplayFrozen(now);
  const update = frozen
    ? { stagedWeeklyMockBonus: bonus }
    : { weeklyMockBonus: bonus, publishedWeeklyMockBonus: bonus };
  await LiveFinalRankingProfile.updateOne(
    { seasonId: kstSeasonKey(now), userId },
    { $set: update }
  );
  return recalculateFinalRanking({ now });
}

async function syncPublishedWeeklyMockBonuses({ weekKeys, now = new Date() }) {
  const keys = [...new Set((weekKeys || []).map(String).filter(Boolean))];
  if (!keys.length) return { completedUserCount: 0, recalculated: false };
  const latestWeekKey = [...keys].sort().at(-1);
  const completed = await PrivateMockWeeklyResult.find({
    weekKey: latestWeekKey,
    status: "published",
    representativeAttemptId: { $ne: null },
  })
    .select("userId")
    .lean();
  const completedUserIds = [...new Set(completed.map((row) => String(row.userId)))];
  const seasonId = kstSeasonKey(now);
  const frozen = isSundayDisplayFrozen(now);
  const zeroUpdate = frozen
    ? { stagedWeeklyMockBonus: 0 }
    : { weeklyMockBonus: 0, publishedWeeklyMockBonus: 0 };
  const completedUpdate = frozen
    ? { stagedWeeklyMockBonus: 30 }
    : { weeklyMockBonus: 30, publishedWeeklyMockBonus: 30 };
  await LiveFinalRankingProfile.updateMany({ seasonId }, { $set: zeroUpdate });
  if (completedUserIds.length) {
    await LiveFinalRankingProfile.updateMany(
      { seasonId, userId: { $in: completedUserIds } },
      { $set: completedUpdate }
    );
  }
  await recalculateFinalRanking({ now });
  return { completedUserCount: completedUserIds.length, recalculated: true };
}

async function publishMondayFinalRanking({ now = new Date() } = {}) {
  return recalculateFinalRanking({ now, forcePublish: true });
}

module.exports = {
  FINAL_RANKING_POLICY_CODE,
  calculateFinalRating,
  calculateFinalRankingRows,
  isSundayDisplayFrozen,
  publishMondayFinalRanking,
  recalculateFinalRanking,
  setWeeklyMockBonus,
  syncPublishedWeeklyMockBonuses,
  _testing: {
    buildFinalRankingWritePlan,
    mainGrowth,
    percentileMapForDivision,
    standingComparator,
    subGrowth,
  },
};
