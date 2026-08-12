const assert = require(
  "node:assert/strict"
);
const mongoose = require(
  "mongoose"
);

const {
  ARENA_ATTEMPT_SUBMITTED_EVENT_TYPE,
  ARENA_SCORING_OUTBOX_SCHEMA_VERSION,
  createRankSubmissionVerifier,
  deliverClaimedArenaScoringIntent,
} = require(
  "../services/arenaMatchScoringOutboxService"
);
const {
  RankTakeoverError,
  createRankTakeoverService,
  shouldPersistCommandFailure,
} = require(
  "../services/rankTakeoverService"
);

const NOW =
  new Date(
    "2026-07-30T10:00:30.000Z"
  );

function objectId() {
  return new mongoose.Types
    .ObjectId();
}

function serverScore(
  submissionId
) {
  return {
    submissionId,
    calibratedScore: 97.5,
    advancedCorrectCount: 5,
    correctAnswerActiveSolveTimeMs:
      42_000,
    integrityState: "CLEAR",
    gradingAuthority: "SERVER",
    questionVersion:
      "QUESTION_V1",
    answerKeyVersion:
      "ANSWER_V1",
    calibrationVersion:
      "CALIBRATION_V1",
    questionPackVersion:
      "PACK_V1",
    scoringPolicyVersion:
      "SCORING_V1",
    submittedAt:
      "2026-07-30T10:00:20.000Z",
  };
}

async function captureError(
  work
) {
  try {
    await work();
  } catch (error) {
    return error;
  }
  throw new Error(
    "expected an error"
  );
}

async function run() {
  assert.equal(
    shouldPersistCommandFailure(
      new RankTakeoverError(
        "POLICY_PENDING",
        "policy is not published",
        {
          statusCode: 503,
        }
      )
    ),
    false
  );
  assert.equal(
    shouldPersistCommandFailure(
      new RankTakeoverError(
        "NO_SHOW_DEADLINE_NOT_REACHED",
        "no-show deadline has not elapsed",
        {
          statusCode: 409,
        }
      )
    ),
    false
  );
  assert.equal(
    shouldPersistCommandFailure(
      new RankTakeoverError(
        "MATCH_NOT_READY",
        "defender acceptance is still committing",
        {
          statusCode: 409,
        }
      )
    ),
    false
  );
  assert.equal(
    shouldPersistCommandFailure(
      new RankTakeoverError(
        "MATCH_QUESTION_PACK_NOT_READY",
        "sealed packs are not ready",
        {
          statusCode: 409,
        }
      )
    ),
    false
  );
  assert.equal(
    shouldPersistCommandFailure(
      new RankTakeoverError(
        "MATCH_START_DEADLINE_PASSED",
        "start deadline passed",
        {
          statusCode: 409,
        }
      )
    ),
    true
  );
  console.log(
    "  ✓ transient start failures are not cached as permanent command receipts"
  );

  const serverCapability =
    Symbol(
      "rank-boundary-test"
    );
  const participantUserId =
    objectId();
  const questionPackId =
    objectId();
  const submissionId =
    "ARENA_SCORE_V1_boundary";
  const rankService =
    createRankTakeoverService({
      skipCommandReceipts:
        true,
    });
  for (const untrusted of [
    {
      scoredResult:
        serverScore(
          submissionId
        ),
    },
    {
      answerReference:
        "client-answer",
    },
    {
      submittedAt: NOW,
    },
  ]) {
    const error =
      await captureError(
        () =>
          rankService
            .submitResult({
              matchId:
                "match-boundary",
              participantUserId,
              submissionId,
              ...untrusted,
            })
      );
    assert.equal(
      error.code,
      "UNTRUSTED_SUBMISSION_FIELDS"
    );
  }
  console.log(
    "  ✓ Rank public submit rejects raw scores, answer references, and client timestamps"
  );

  let verifierScoreCalls = 0;
  const verifier =
    createRankSubmissionVerifier({
      serverCapability,
      scoreSubmittedAttempt:
        async (input) => {
          verifierScoreCalls += 1;
          assert.equal(
            input.serverCapability,
            serverCapability
          );
          assert.equal(
            input.questionPackId,
            String(
              questionPackId
            )
          );
          return serverScore(
            submissionId
          );
        },
    });
  const verified =
    await verifier({
      match: {
        matchId:
          "match-boundary",
        challengerQuestionPackId:
          questionPackId,
      },
      role: "CHALLENGER",
      participantUserId,
      submissionId,
    });
  assert.equal(
    verifierScoreCalls,
    1
  );
  assert.equal(
    verified
      .submittedAt
      .toISOString(),
    "2026-07-30T10:00:20.000Z"
  );
  assert.deepEqual(
    Object.keys(verified)
      .sort(),
    [
      "advancedCorrectCount",
      "answerKeyVersion",
      "calibratedScore",
      "calibrationVersion",
      "correctAnswerActiveSolveTimeMs",
      "integrityState",
      "questionVersion",
      "submissionId",
      "submittedAt",
    ]
  );
  const mismatch =
    await captureError(
      () =>
        verifier({
          match: {
            matchId:
              "match-boundary",
            challengerQuestionPackId:
              questionPackId,
          },
          role: "CHALLENGER",
          participantUserId,
          submissionId:
            "ARENA_SCORE_V1_other",
        })
    );
  assert.equal(
    mismatch.code,
    "ARENA_SCORING_SUBMISSION_MISMATCH"
  );
  console.log(
    "  ✓ injected verifier re-fetches and returns a strict authoritative result"
  );

  const attemptId =
    objectId();
  const submissionRecordId =
    objectId();
  const event = {
    _id: objectId(),
    eventId:
      `arena-attempt-submitted:${attemptId}`,
    idempotencyKey:
      `arena-attempt-submitted:${attemptId}`,
    aggregateType:
      "ArenaMatchAttempt",
    aggregateId:
      String(attemptId),
    eventType:
      ARENA_ATTEMPT_SUBMITTED_EVENT_TYPE,
    payload: {
      attemptId:
        String(attemptId),
      schemaVersion:
        ARENA_SCORING_OUTBOX_SCHEMA_VERSION,
      submissionRecordId:
        String(
          submissionRecordId
        ),
    },
    status: "PROCESSING",
    lockedAt:
      new Date(NOW),
    lockedBy:
      "boundary-worker",
  };
  const source = {
    attemptId:
      String(attemptId),
    submissionRecordId:
      String(
        submissionRecordId
      ),
    matchId:
      "match-boundary",
    participantRole:
      "CHALLENGER",
    participantUserId:
      String(
        participantUserId
      ),
    questionPackId:
      String(
        questionPackId
      ),
    submittedAt:
      new Date(
        "2026-07-30T10:00:20.000Z"
      ),
  };
  let submittedInput = null;
  const OutboxModel = {
    exists:
      async (filter) => {
        assert.equal(
          filter.eventType,
          ARENA_ATTEMPT_SUBMITTED_EVENT_TYPE
        );
        return {
          _id: event._id,
        };
      },
    findOneAndUpdate:
      async (
        filter,
        update
      ) => ({
        ...event,
        ...update.$set,
        _id: filter._id,
      }),
  };
  const delivered =
    await deliverClaimedArenaScoringIntent(
      event,
      {
        workerId:
          "boundary-worker",
        now: NOW,
      },
      {
        OutboxModel,
        serverCapability,
        loadSubmittedAttemptSource:
          async () =>
            source,
        scoreSubmittedAttempt:
          async () =>
            serverScore(
              submissionId
            ),
        submitResult:
          async (input) => {
            submittedInput =
              input;
            return {
              status:
                "IN_PROGRESS",
            };
          },
        resolveScoredMatch:
          async () => {
            throw new Error(
              "resolve should not run"
            );
          },
        settleResolvedMatch:
          async () => {
            throw new Error(
              "settle should not run"
            );
          },
      }
    );
  assert.equal(
    delivered.status,
    "PUBLISHED"
  );
  assert.deepEqual(
    submittedInput,
    {
      matchId:
        source.matchId,
      participantUserId:
        source
          .participantUserId,
      submissionId,
    }
  );
  console.log(
    "  ✓ scoring worker sends Rank only matchId, participantUserId, and submissionId"
  );

  let rankState =
    "SUBMITTED";
  let transitionCalls = [];
  const transitionDependencies = {
    OutboxModel,
    serverCapability,
    loadSubmittedAttemptSource:
      async () =>
        source,
    scoreSubmittedAttempt:
      async () =>
        serverScore(
          submissionId
        ),
    submitResult:
      async () => {
        transitionCalls
          .push("submit");
        return {
          status:
            rankState,
        };
      },
    resolveScoredMatch:
      async () => {
        transitionCalls
          .push("resolve");
        rankState =
          "RESOLVED";
        return {
          status:
            rankState,
        };
      },
    settleResolvedMatch:
      async () => {
        transitionCalls
          .push("settle");
        rankState =
          "SETTLED";
        return {
          status:
            rankState,
        };
      },
  };
  await deliverClaimedArenaScoringIntent(
    event,
    {
      workerId:
        "boundary-worker",
      now: NOW,
    },
    transitionDependencies
  );
  assert.deepEqual(
    transitionCalls,
    [
      "submit",
      "resolve",
      "settle",
    ]
  );

  rankState = "RESOLVED";
  transitionCalls = [];
  await deliverClaimedArenaScoringIntent(
    event,
    {
      workerId:
        "boundary-worker",
      now: NOW,
    },
    transitionDependencies
  );
  assert.deepEqual(
    transitionCalls,
    [
      "submit",
      "settle",
    ]
  );

  rankState = "SETTLED";
  transitionCalls = [];
  await deliverClaimedArenaScoringIntent(
    event,
    {
      workerId:
        "boundary-worker",
      now: NOW,
    },
    transitionDependencies
  );
  assert.deepEqual(
    transitionCalls,
    ["submit"]
  );
  console.log(
    "  ✓ outbox preserves SUBMITTED→RESOLVED→SETTLED and retry-from-RESOLVED/SETTLED branches"
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
