const {
  TIER_CONFIG,
} = require("./mmrService");

function tierForEntry(entry) {
  const tierValue = String(
    entry?.tier || ""
  );

  return (
    TIER_CONFIG.find(
      (tier) =>
        tier.name === tierValue ||
        tier.label === tierValue
    ) || null
  );
}

function arenaRowFromRankingEntry(
  entry,
  currentUserId
) {
  if (!entry) {
    return null;
  }

  const tier =
    tierForEntry(entry);

  return {
    userId: String(
      entry.userId
    ),
    name:
      String(
        entry.displayName ||
          "학생"
      ),
    rank:
      Number(
        entry.overallRank ??
          entry.rank
      ) || null,
    mmr:
      Number(entry.rating) ||
      0,
    tier:
      tier?.name || null,
    tierLabel:
      tier?.label ||
      String(entry.tier || "") ||
      null,
    rankPoint:
      Number(entry.rankPoint) ||
      0,
    division:
      entry.division || null,
    status:
      String(
        entry.rankingStatus ||
          "PROVISIONAL"
      ).toUpperCase(),
    isMe:
      String(entry.userId) ===
      String(currentUserId),
  };
}

function arenaBoardFromRankingData(
  rankingData,
  currentUserId
) {
  const top = (
    rankingData?.overall || []
  )
    .slice(0, 20)
    .map((entry) =>
      arenaRowFromRankingEntry(
        entry,
        currentUserId
      )
    );
  const me =
    arenaRowFromRankingEntry(
      rankingData?.current,
      currentUserId
    );

  return {
    total:
      Number(
        rankingData?.cohortSize
      ) || 0,
    top,
    me,
  };
}

module.exports = {
  arenaBoardFromRankingData,
  arenaRowFromRankingEntry,
};
