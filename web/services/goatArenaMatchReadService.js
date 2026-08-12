const mongoose = require(
  "mongoose"
);

const {
  RankTakeoverMatch,
} = require(
  "../models/rankTakeoverMatchModel"
);
const {
  RankTakeoverAttempt:
    ArenaMatchAttempt,
} = require(
  "../models/arenaMatchAttemptModel"
);

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const MATCH_READ_PROJECTION =
  Object.freeze({
    _id: 1,
    version: 1,
    matchId: 1,
    participantUserIds: 1,
    challengerUserId: 1,
    defenderUserId: 1,
    activeRanking: 1,
    matchType: 1,
    status: 1,
    challengerPositionBefore: 1,
    defenderPositionBefore: 1,
    challengeCostSnapshot: 1,
    integrityState: 1,
    matchedAt: 1,
    startsBy: 1,
    challengerStartedAt: 1,
    defenderStartedAt: 1,
    challengerDeadlineAt: 1,
    defenderDeadlineAt: 1,
    timeLimitSeconds: 1,
    submitsBy: 1,
    resolvedAt: 1,
    settledAt: 1,
    winner: 1,
    settlementReason: 1,
    arenaPositionSettlement: 1,
    createdAt: 1,
    updatedAt: 1,
  });

const ATTEMPT_READ_PROJECTION =
  Object.freeze({
    _id: 1,
    matchId: 1,
    participantRole: 1,
    participantUserId: 1,
    status: 1,
    startedAt: 1,
    endsAt: 1,
    submittedAt: 1,
  });

class GoatArenaMatchReadError
  extends Error {
  constructor(
    code,
    message,
    statusCode = 400
  ) {
    super(message);
    this.name =
      "GoatArenaMatchReadError";
    this.code = code;
    this.status =
      statusCode;
    this.statusCode =
      statusCode;
  }
}

function fail(
  code,
  message,
  statusCode
) {
  throw new GoatArenaMatchReadError(
    code,
    message,
    statusCode
  );
}

function objectId(
  value,
  label
) {
  const normalized =
    String(value || "")
      .trim();
  if (
    !mongoose.Types
      .ObjectId
      .isValid(normalized)
  ) {
    fail(
      "INVALID_MATCH_QUERY",
      `${label} is invalid`,
      400
    );
  }
  return new mongoose
    .Types.ObjectId(
      normalized
    );
}

function pageSize(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return DEFAULT_PAGE_SIZE;
  }
  const parsed =
    Number(value);
  if (
    !Number.isSafeInteger(
      parsed
    ) ||
    parsed < 1 ||
    parsed > MAX_PAGE_SIZE
  ) {
    fail(
      "INVALID_MATCH_PAGE_SIZE",
      `limit must be between 1 and ${MAX_PAGE_SIZE}`,
      400
    );
  }
  return parsed;
}

function matchId(value) {
  const normalized =
    String(value || "")
      .trim();
  if (
    !normalized ||
    normalized.length > 160
  ) {
    fail(
      "INVALID_MATCH_ID",
      "match id is invalid",
      400
    );
  }
  return normalized;
}

function isoString(value) {
  if (!value) {
    return null;
  }
  const date =
    new Date(value);
  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date.toISOString();
}

function encodeMatchCursor(
  match
) {
  const updatedAt =
    isoString(
      match?.updatedAt
    );
  const id =
    String(match?._id || "");
  if (
    !updatedAt ||
    !mongoose.Types
      .ObjectId
      .isValid(id)
  ) {
    fail(
      "INVALID_MATCH_CURSOR_SOURCE",
      "match cursor source is invalid",
      500
    );
  }
  return Buffer
    .from(
      JSON.stringify({
        updatedAt,
        id,
      }),
      "utf8"
    )
    .toString("base64url");
}

function decodeMatchCursor(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }
  const encoded =
    String(value).trim();
  if (
    !encoded ||
    encoded.length > 300 ||
    !/^[A-Za-z0-9_-]+$/.test(
      encoded
    )
  ) {
    fail(
      "INVALID_MATCH_CURSOR",
      "match cursor is invalid",
      400
    );
  }

  let parsed;
  try {
    parsed =
      JSON.parse(
        Buffer
          .from(
            encoded,
            "base64url"
          )
          .toString("utf8")
      );
  } catch {
    fail(
      "INVALID_MATCH_CURSOR",
      "match cursor is invalid",
      400
    );
  }

  const updatedAt =
    new Date(
      parsed?.updatedAt
    );
  if (
    Number.isNaN(
      updatedAt.getTime()
    ) ||
    !mongoose.Types
      .ObjectId
      .isValid(
        String(
          parsed?.id || ""
        )
      )
  ) {
    fail(
      "INVALID_MATCH_CURSOR",
      "match cursor is invalid",
      400
    );
  }
  return {
    updatedAt,
    id: new mongoose
      .Types.ObjectId(
        parsed.id
      ),
  };
}

function asPlain(value) {
  return value &&
    typeof value.toObject ===
      "function"
    ? value.toObject()
    : value;
}

function participantRole(
  match,
  userId
) {
  const normalized =
    String(userId);
  if (
    String(
      match
        .challengerUserId
    ) === normalized
  ) {
    return "CHALLENGER";
  }
  if (
    String(
      match
        .defenderUserId
    ) === normalized
  ) {
    return "DEFENDER";
  }
  fail(
    "MATCH_NOT_FOUND",
    "GOAT Arena match was not found",
    404
  );
}

function positiveIntegerOrNull(
  value
) {
  return Number.isSafeInteger(
    value
  ) && value > 0
    ? value
    : null;
}

function participantTiming(
  match,
  role
) {
  const isChallenger =
    role === "CHALLENGER";
  const roleStartedAt =
    isChallenger
      ? match
          .challengerStartedAt
      : match.defenderStartedAt;
  const roleDeadlineAt =
    isChallenger
      ? match
          .challengerDeadlineAt
      : match.defenderDeadlineAt;
  return {
    startedAt:
      isoString(
        roleStartedAt
      ),
    submitsBy:
      isoString(
        roleDeadlineAt
      ),
    hardDeadlineAt:
      isoString(
        match.submitsBy
      ),
    timeLimitSeconds:
      positiveIntegerOrNull(
        match.timeLimitSeconds
      ),
  };
}

function serializeParticipantMatch(
  source,
  userId,
  participantAttempt = null
) {
  const match =
    asPlain(source);
  if (!match) {
    return null;
  }
  const role =
    participantRole(
      match,
      userId
    );
  const isChallenger =
    role === "CHALLENGER";
  const cost =
    match
      .challengeCostSnapshot ||
    {};
  const settlement =
    match
      .arenaPositionSettlement ||
    {};
  const winner =
    match.winner || null;
  const attempt =
    asPlain(
      participantAttempt
    );
  if (
    attempt &&
    (attempt.matchId !==
      match.matchId ||
      String(
        attempt
          .participantUserId
      ) !== String(userId) ||
      attempt
        .participantRole !==
        role)
  ) {
    fail(
      "MATCH_ATTEMPT_READ_CONFLICT",
      "participant attempt does not match the requested Arena match",
      500
    );
  }
  const timing =
    participantTiming(
      match,
      role
    );

  return {
    id:
      match.matchId ||
      String(match._id),
    revision:
      Number.isSafeInteger(
        match.version
      )
        ? match.version
        : 0,
    status:
      match.status,
    role,
    activeRanking:
      match.activeRanking,
    matchType:
      match.matchType,
    myPositionBefore:
      isChallenger
        ? match
            .challengerPositionBefore
        : match
            .defenderPositionBefore,
    opponentPositionBefore:
      isChallenger
        ? match
            .defenderPositionBefore
        : match
            .challengerPositionBefore,
    myPositionAfter:
      isChallenger
        ? settlement
            .challengerPositionAfter ??
          null
        : settlement
            .defenderPositionAfter ??
          null,
    opponentPositionAfter:
      isChallenger
        ? settlement
            .defenderPositionAfter ??
          null
        : settlement
            .challengerPositionAfter ??
          null,
    stake: {
      assetType:
        cost.assetType ||
        null,
      days:
        Number.isSafeInteger(
          cost.stakeDays
        )
          ? cost.stakeDays
          : null,
    },
    outcome: winner
      ? winner === role
        ? "WON"
        : "LOST"
      : null,
    settlementReason:
      match
        .settlementReason ||
      null,
    positionOutcome:
      settlement.outcome ||
      null,
    integrityState:
      match.integrityState ||
      "CLEAR",
    timeLimitSeconds:
      timing.timeLimitSeconds,
    timeline: {
      matchedAt:
        isoString(
          match.matchedAt
        ),
      startsBy:
        isoString(
          match.startsBy
        ),
      startedAt:
        timing.startedAt,
      endsAt:
        isoString(
          attempt?.endsAt
        ),
      submittedAt:
        isoString(
          attempt
            ?.submittedAt
        ),
      submitsBy:
        timing.submitsBy,
      hardDeadlineAt:
        timing.hardDeadlineAt,
      resolvedAt:
        isoString(
          match.resolvedAt
        ),
      settledAt:
        isoString(
          match.settledAt
        ),
      updatedAt:
        isoString(
          match.updatedAt
        ),
    },
    attempt: attempt
      ? {
          id:
            String(
              attempt._id
            ),
          status:
            attempt.status,
          startedAt:
            isoString(
              attempt
                .startedAt
            ),
          endsAt:
            isoString(
              attempt.endsAt
            ),
          submittedAt:
            isoString(
              attempt
                .submittedAt
            ),
        }
      : null,
    capabilities: {
      mutations:
        "NOT_AVAILABLE",
      availableActions: [],
    },
  };
}

async function listParticipantMatches(
  {
    userId,
    cursor = null,
    limit = null,
  },
  {
    MatchModel =
      RankTakeoverMatch,
    AttemptModel =
      ArenaMatchAttempt,
  } = {}
) {
  const participantUserId =
    objectId(
      userId,
      "user id"
    );
  const resolvedLimit =
    pageSize(limit);
  const decodedCursor =
    decodeMatchCursor(
      cursor
    );
  const query = {
    participantUserIds:
      participantUserId,
  };
  if (decodedCursor) {
    query.$or = [
      {
        updatedAt: {
          $lt:
            decodedCursor
              .updatedAt,
        },
      },
      {
        updatedAt:
          decodedCursor
            .updatedAt,
        _id: {
          $lt:
            decodedCursor.id,
        },
      },
    ];
  }

  const rows =
    await MatchModel
      .find(
        query,
        MATCH_READ_PROJECTION
      )
      .sort({
        updatedAt: -1,
        _id: -1,
      })
      .limit(
        resolvedLimit + 1
      )
      .lean();
  const hasMore =
    rows.length >
    resolvedLimit;
  const page =
    hasMore
      ? rows.slice(
          0,
          resolvedLimit
        )
      : rows;
  const attempts =
    page.length
      ? await AttemptModel
          .find(
            {
              matchId: {
                $in:
                  page.map(
                    (row) =>
                      row
                        .matchId
                  ),
              },
              participantUserId:
                participantUserId,
            },
            ATTEMPT_READ_PROJECTION
          )
          .lean()
      : [];
  const attemptByMatchId =
    new Map(
      attempts.map(
        (attempt) => [
          attempt.matchId,
          attempt,
        ]
      )
    );
  return {
    matches:
      page.map((row) =>
        serializeParticipantMatch(
          row,
          participantUserId,
          attemptByMatchId.get(
            row.matchId
          ) || null
        )
      ),
    nextCursor:
      hasMore &&
      page.length
        ? encodeMatchCursor(
            page[
              page.length - 1
            ]
          )
        : null,
  };
}

async function getParticipantMatch(
  {
    userId,
    id,
  },
  {
    MatchModel =
      RankTakeoverMatch,
    AttemptModel =
      ArenaMatchAttempt,
  } = {}
) {
  const participantUserId =
    objectId(
      userId,
      "user id"
    );
  const row =
    await MatchModel
      .findOne(
        {
          matchId:
            matchId(id),
          participantUserIds:
            participantUserId,
        },
        MATCH_READ_PROJECTION
      )
      .lean();
  if (!row) {
    fail(
      "MATCH_NOT_FOUND",
      "GOAT Arena match was not found",
      404
    );
  }
  const attempt =
    await AttemptModel
      .findOne(
        {
          matchId:
            row.matchId,
          participantUserId:
            participantUserId,
        },
        ATTEMPT_READ_PROJECTION
      )
      .lean();
  return serializeParticipantMatch(
    row,
    participantUserId,
    attempt
  );
}

module.exports = {
  DEFAULT_PAGE_SIZE,
  GoatArenaMatchReadError,
  ATTEMPT_READ_PROJECTION,
  MATCH_READ_PROJECTION,
  MAX_PAGE_SIZE,
  decodeMatchCursor,
  encodeMatchCursor,
  getParticipantMatch,
  listParticipantMatches,
  serializeParticipantMatch,
};
