const assert = require(
  "node:assert/strict"
);
const mongoose = require(
  "mongoose"
);
const {
  MongoMemoryServer,
} = require(
  "mongodb-memory-server"
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
const {
  GoatArenaMatchReadError,
  decodeMatchCursor,
  getParticipantMatch,
  listParticipantMatches,
  serializeParticipantMatch,
} = require(
  "../services/goatArenaMatchReadService"
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

function rawMatch({
  matchId,
  challengerUserId,
  defenderUserId,
  updatedAt,
  status = "MATCHED",
  winner = null,
}) {
  return {
    _id: new mongoose
      .Types.ObjectId(),
    version: 3,
    matchId,
    participantUserIds: [
      challengerUserId,
      defenderUserId,
    ],
    challengerUserId,
    defenderUserId,
    activeRanking: "SUB",
    matchType: "NORMAL",
    status,
    challengerPositionBefore:
      10,
    defenderPositionBefore:
      5,
    challengeCostSnapshot: {
      assetType:
        "REFUND_CHALLENGE_DAY",
      stakeDays: 1,
    },
    assignmentAudit: {
      privateCandidateSet: [
        String(
          defenderUserId
        ),
      ],
    },
    challengerResult: {
      calibratedScore: 99,
      submittedAnswer:
        "must-not-leak",
    },
    defenderResult: {
      calibratedScore: 95,
      answerKey:
        "must-not-leak",
    },
    challengerQuestionPackId:
      new mongoose.Types
        .ObjectId(),
    defenderQuestionPackId:
      new mongoose.Types
        .ObjectId(),
    integrityState: "CLEAR",
    matchedAt:
      new Date(
        updatedAt.getTime() -
          10_000
      ),
    startsBy:
      new Date(
        updatedAt.getTime() +
          60_000
      ),
    startedAt:
      new Date(
        updatedAt.getTime() +
          10_000
      ),
    challengerStartedAt:
      new Date(
        updatedAt.getTime() +
          10_000
      ),
    defenderStartedAt:
      new Date(
        updatedAt.getTime() +
          40_000
      ),
    challengerDeadlineAt:
      new Date(
        updatedAt.getTime() +
          70_000
      ),
    defenderDeadlineAt:
      new Date(
        updatedAt.getTime() +
          100_000
      ),
    timeLimitSeconds: 60,
    submitsBy:
      new Date(
        updatedAt.getTime() +
          120_000
      ),
    winner,
    settlementReason:
      status === "SETTLED"
        ? "SCORED_RESULT"
        : null,
    arenaPositionSettlement:
      status === "SETTLED"
        ? {
            outcome:
              "SWAPPED",
            referenceKey:
              `seat:${matchId}`,
            challengerPositionAfter:
              5,
            defenderPositionAfter:
              10,
          }
        : null,
    settledAt:
      status === "SETTLED"
        ? updatedAt
        : null,
    createdAt:
      new Date(
        updatedAt.getTime() -
          20_000
      ),
    updatedAt,
  };
}

(async () => {
  let mongo;
  try {
    mongo =
      await MongoMemoryServer
        .create();
    await mongoose.connect(
      mongo.getUri()
    );

    const challenger =
      new mongoose.Types
        .ObjectId();
    const defender =
      new mongoose.Types
        .ObjectId();
    const outsider =
      new mongoose.Types
        .ObjectId();
    const base =
      Date.now();
    const rows = [
      rawMatch({
        matchId: "match-new",
        challengerUserId:
          challenger,
        defenderUserId:
          defender,
        updatedAt:
          new Date(base),
      }),
      rawMatch({
        matchId:
          "match-middle",
        challengerUserId:
          challenger,
        defenderUserId:
          defender,
        updatedAt:
          new Date(
            base - 1000
          ),
        status: "SETTLED",
        winner:
          "CHALLENGER",
      }),
      rawMatch({
        matchId: "match-old",
        challengerUserId:
          challenger,
        defenderUserId:
          defender,
        updatedAt:
          new Date(
            base - 2000
          ),
      }),
      rawMatch({
        matchId:
          "outsider-only",
        challengerUserId:
          outsider,
        defenderUserId:
          new mongoose.Types
            .ObjectId(),
        updatedAt:
          new Date(
            base + 1000
          ),
      }),
    ];
    await RankTakeoverMatch
      .collection
      .insertMany(rows);
    const challengerStartedAt =
      new Date(
        base + 10_000
      );
    const defenderStartedAt =
      new Date(
        base + 40_000
      );
    await ArenaMatchAttempt
      .collection
      .insertMany([
        {
          _id:
            new mongoose.Types
              .ObjectId(),
          matchId:
            "match-new",
          participantRole:
            "CHALLENGER",
          participantUserId:
            challenger,
          status:
            "IN_PROGRESS",
          startedAt:
            challengerStartedAt,
          endsAt:
            new Date(
              base + 70_000
            ),
          submittedAt: null,
        },
        {
          _id:
            new mongoose.Types
              .ObjectId(),
          matchId:
            "match-new",
          participantRole:
            "DEFENDER",
          participantUserId:
            defender,
          status:
            "IN_PROGRESS",
          startedAt:
            defenderStartedAt,
          endsAt:
            new Date(
              base + 100_000
            ),
          submittedAt: null,
        },
      ]);

    await check(
      "본인 경기만 최신순으로 커서 페이지 처리",
      async () => {
        const first =
          await listParticipantMatches({
            userId:
              challenger,
            limit: 2,
          });
        assert.deepEqual(
          first.matches.map(
            (match) =>
              match.id
          ),
          [
            "match-new",
            "match-middle",
          ]
        );
        assert.ok(
          first.nextCursor
        );
        assert.equal(
          first.matches[0]
            .timeline
            .startedAt,
          challengerStartedAt
            .toISOString()
        );
        assert.equal(
          first.matches[0]
            .timeline
            .submitsBy,
          new Date(
            base + 70_000
          ).toISOString()
        );
        assert.equal(
          first.matches[0]
            .timeline
            .hardDeadlineAt,
          new Date(
            base + 120_000
          ).toISOString()
        );
        assert.equal(
          first.matches[0]
            .timeLimitSeconds,
          60
        );
        assert.equal(
          first.matches[0]
            .attempt
            .status,
          "IN_PROGRESS"
        );
        const decoded =
          decodeMatchCursor(
            first.nextCursor
          );
        assert.equal(
          decoded.id.toString(),
          rows[1]._id.toString()
        );

        const second =
          await listParticipantMatches({
            userId:
              challenger,
            cursor:
              first.nextCursor,
            limit: 2,
          });
        assert.deepEqual(
          second.matches.map(
            (match) =>
              match.id
          ),
          ["match-old"]
        );
        assert.equal(
          second.nextCursor,
          null
        );
      }
    );

    await check(
      "각 참가자는 상대 타이머가 아닌 자기 시도 시작·종료 시각만 조회",
      async () => {
        const challengerView =
          await getParticipantMatch({
            userId:
              challenger,
            id: "match-new",
          });
        const defenderView =
          await getParticipantMatch({
            userId:
              defender,
            id: "match-new",
          });
        assert.equal(
          challengerView
            .timeline
            .startedAt,
          challengerStartedAt
            .toISOString()
        );
        assert.equal(
          defenderView
            .timeline
            .startedAt,
          defenderStartedAt
            .toISOString()
        );
        assert.equal(
          challengerView
            .timeline
            .submitsBy,
          new Date(
            base + 70_000
          ).toISOString()
        );
        assert.equal(
          defenderView
            .timeline
            .submitsBy,
          new Date(
            base + 100_000
          ).toISOString()
        );
        assert.equal(
          challengerView
            .timeline
            .hardDeadlineAt,
          defenderView
            .timeline
            .hardDeadlineAt
        );
        assert.notEqual(
          challengerView
            .timeline
            .endsAt,
          defenderView
            .timeline
            .endsAt
        );
        assert.equal(
          JSON.stringify(
            challengerView
          ).includes(
            defenderStartedAt
              .toISOString()
          ),
          false
        );
        assert.equal(
          JSON.stringify(
            challengerView
          ).includes(
            new Date(
              base + 100_000
            ).toISOString()
          ),
          false
        );
      }
    );

    await check(
      "구버전 match는 공통 startedAt을 개인 시작으로 재사용하지 않고 안전하게 null 처리",
      async () => {
        const legacy =
          serializeParticipantMatch(
            {
              ...rows[0],
              challengerStartedAt:
                undefined,
              challengerDeadlineAt:
                undefined,
              defenderStartedAt:
                new Date(
                  base + 40_000
                ),
              defenderDeadlineAt:
                new Date(
                  base + 100_000
                ),
              timeLimitSeconds:
                undefined,
            },
            challenger,
            {
              _id:
                new mongoose.Types
                  .ObjectId(),
              matchId:
                rows[0]
                  .matchId,
              participantRole:
                "CHALLENGER",
              participantUserId:
                challenger,
              status:
                "IN_PROGRESS",
              startedAt:
                challengerStartedAt,
              endsAt:
                new Date(
                  base + 70_000
                ),
              submittedAt: null,
            }
          );
        assert.equal(
          legacy.timeline
            .startedAt,
          null
        );
        assert.equal(
          legacy.timeline
            .submitsBy,
          null
        );
        assert.equal(
          legacy.timeline
            .hardDeadlineAt,
          new Date(
            base + 120_000
          ).toISOString()
        );
        assert.equal(
          legacy.timeLimitSeconds,
          null
        );
        const json =
          JSON.stringify(legacy);
        assert.equal(
          json.includes(
            new Date(
              base + 40_000
            ).toISOString()
          ),
          false
        );
        assert.equal(
          json.includes(
            new Date(
              base + 100_000
            ).toISOString()
          ),
          false
        );
      }
    );

    await check(
      "상대에게는 역할·좌석·승패가 자기 관점으로 뒤집혀 보임",
      async () => {
        const match =
          await getParticipantMatch({
            userId:
              defender,
            id:
              "match-middle",
          });
        assert.equal(
          match.role,
          "DEFENDER"
        );
        assert.equal(
          match.myPositionBefore,
          5
        );
        assert.equal(
          match.myPositionAfter,
          10
        );
        assert.equal(
          match.outcome,
          "LOST"
        );
      }
    );

    await check(
      "정답·점수·문제팩·배정 후보 감사정보를 응답에 노출하지 않음",
      async () => {
        const match =
          serializeParticipantMatch(
            rows[0],
            challenger
          );
        const json =
          JSON.stringify(
            match
          );
        for (const forbidden of [
          "must-not-leak",
          "calibratedScore",
          "QuestionPackId",
          "privateCandidateSet",
          "assignmentAudit",
          defenderStartedAt
            .toISOString(),
          new Date(
            base + 100_000
          ).toISOString(),
        ]) {
          assert.equal(
            json.includes(
              forbidden
            ),
            false
          );
        }
        assert.deepEqual(
          match.capabilities,
          {
            mutations:
              "NOT_AVAILABLE",
            availableActions: [],
          }
        );
      }
    );

    await check(
      "참가자가 아닌 사용자는 존재 여부를 알 수 없는 404를 받음",
      async () => {
        await assert.rejects(
          getParticipantMatch({
            userId:
              outsider,
            id:
              "match-new",
          }),
          (error) =>
            error instanceof
              GoatArenaMatchReadError &&
            error.code ===
              "MATCH_NOT_FOUND" &&
            error.statusCode ===
              404
        );
      }
    );

    await check(
      "변조된 커서와 과도한 page size를 거부",
      async () => {
        await assert.rejects(
          listParticipantMatches({
            userId:
              challenger,
            cursor:
              "not-a-valid-cursor",
          }),
          (error) =>
            error.code ===
            "INVALID_MATCH_CURSOR"
        );
        await assert.rejects(
          listParticipantMatches({
            userId:
              challenger,
            limit: 51,
          }),
          (error) =>
            error.code ===
            "INVALID_MATCH_PAGE_SIZE"
        );
      }
    );
  } finally {
    await mongoose
      .disconnect()
      .catch(() => {});
    if (mongo) {
      await mongo
        .stop()
        .catch(() => {});
    }
  }

  const failed =
    checks.filter(
      (entry) =>
        !entry.passed
    );
  if (failed.length) {
    console.error(
      `\n${failed.length} GOAT Arena match read check(s) failed.`
    );
    process.exit(1);
  }
  console.log(
    `\n${checks.length}/${checks.length} GOAT Arena match read checks passed.`
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
