const assert = require(
  "node:assert/strict"
);

const {
  SUPPORTED_ACTIVE_SOLVE_TIME_POLICY_VERSION,
  SUPPORTED_ADVANCED_THRESHOLD_VERSION,
  SUPPORTED_ANSWER_COMPARISON_POLICY_VERSION,
  SUPPORTED_CALIBRATED_SCORE_METHOD_VERSION,
  SUPPORTED_EXTRA_TIEBREAKER_POLICY_VERSION,
  SUPPORTED_SCORING_POLICY_VERSION,
  SUPPORTED_TIE_BREAK_ORDER,
  createArenaMatchScoringService,
} = require(
  "../services/arenaMatchScoringService"
);
const {
  compareScoredResults,
} = require(
  "../services/rankTakeoverService"
);

const SERVER_CAPABILITY =
  Symbol(
    "arena-scoring-test"
  );
const BASE_TIME =
  new Date(
    "2026-07-30T09:00:00.000Z"
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

function at(
  offsetMs
) {
  return new Date(
    BASE_TIME.getTime() +
      offsetMs
  );
}

function normalizedAnswer(
  value
) {
  return {
    kind: "TEXT",
    value,
  };
}

function packProjection() {
  const questions = [
    {
      slot: 1,
      questionVersionId:
        "QUESTION_V7_1",
      scoreWeight: 4,
      advanced: false,
    },
    {
      slot: 2,
      questionVersionId:
        "QUESTION_V7_2",
      scoreWeight: 5,
      advanced: true,
    },
    {
      slot: 3,
      questionVersionId:
        "QUESTION_V7_3",
      scoreWeight: 3,
      advanced: false,
    },
  ];
  return {
    questionPackId:
      "pack-challenger-1",
    matchId: "match-1",
    participantRole:
      "CHALLENGER",
    participantUserId:
      "user-challenger-1",
    packVersion:
      "PACK_V1_SEALED",
    curriculumVersion:
      "KR_2022_MATH_V5",
    questionVersion:
      "QUESTION_BUNDLE_V7",
    questionVersionIds:
      questions.map(
        (question) =>
          question
            .questionVersionId
      ),
    answerKeyVersion:
      "ANSWER_BUNDLE_V3",
    answerVersionIds: [
      "ANSWER_V3_1",
      "ANSWER_V3_2",
      "ANSWER_V3_3",
    ],
    difficultyCalibrationVersion:
      "IRT_CALIBRATION_2026_07",
    scoringPolicyVersion:
      SUPPORTED_SCORING_POLICY_VERSION,
    questionCount: 3,
    timeLimitSeconds: 1200,
    scoringContract: {
      calibratedScoreMethodVersion:
        SUPPORTED_CALIBRATED_SCORE_METHOD_VERSION,
      advancedThresholdVersion:
        SUPPORTED_ADVANCED_THRESHOLD_VERSION,
      activeSolveTimePolicyVersion:
        SUPPORTED_ACTIVE_SOLVE_TIME_POLICY_VERSION,
      extraTieBreakerPolicyVersion:
        SUPPORTED_EXTRA_TIEBREAKER_POLICY_VERSION,
      answerComparisonPolicyVersion:
        SUPPORTED_ANSWER_COMPARISON_POLICY_VERSION,
      tieBreakOrder: [
        ...SUPPORTED_TIE_BREAK_ORDER,
      ],
    },
    equivalenceSlots:
      questions.map(
        (question) => ({
          slot: question.slot,
          scoreWeight:
            question
              .scoreWeight,
          advanced:
            question.advanced,
        })
      ),
    questions,
    answerKeys: [
      {
        questionVersionId:
          "QUESTION_V7_1",
        answerVersionId:
          "ANSWER_V3_1",
        correctAnswer:
          "1/2|0.5",
        solution:
          "PRIVATE_SOLUTION_ONE",
      },
      {
        questionVersionId:
          "QUESTION_V7_2",
        answerVersionId:
          "ANSWER_V3_2",
        correctAnswer:
          "42|6*7",
        solution:
          "PRIVATE_SOLUTION_TWO",
      },
      {
        questionVersionId:
          "QUESTION_V7_3",
        answerVersionId:
          "ANSWER_V3_3",
        correctAnswer: "9",
        solution:
          "PRIVATE_SOLUTION_THREE",
      },
    ],
    sealedContentHash:
      "a".repeat(64),
  };
}

function attemptProjection() {
  const events = [
    {
      serverSequence: 1,
      eventType:
        "QUESTION_FOCUS",
      serverOccurredAt:
        at(1000),
      questionSlot: 1,
      normalizedAnswer: null,
      networkState: null,
      recognizedActiveIntervalMs:
        0,
    },
    {
      serverSequence: 2,
      eventType:
        "ANSWER_CHANGED",
      serverOccurredAt:
        at(2000),
      questionSlot: 1,
      normalizedAnswer:
        normalizedAnswer(
          "\\frac{1}{2}"
        ),
      networkState: null,
      recognizedActiveIntervalMs:
        0,
    },
    {
      serverSequence: 3,
      eventType:
        "HEARTBEAT",
      serverOccurredAt:
        at(3000),
      questionSlot: null,
      normalizedAnswer: null,
      networkState: null,
      recognizedActiveIntervalMs:
        3000,
    },
    {
      serverSequence: 4,
      eventType:
        "QUESTION_FOCUS",
      serverOccurredAt:
        at(4000),
      questionSlot: 2,
      normalizedAnswer: null,
      networkState: null,
      recognizedActiveIntervalMs:
        0,
    },
    {
      serverSequence: 5,
      eventType:
        "HEARTBEAT",
      serverOccurredAt:
        at(5000),
      questionSlot: null,
      normalizedAnswer: null,
      networkState: null,
      recognizedActiveIntervalMs:
        2000,
    },
    {
      serverSequence: 6,
      eventType:
        "ANSWER_CHANGED",
      serverOccurredAt:
        at(6000),
      questionSlot: 2,
      normalizedAnswer:
        normalizedAnswer(
          "6*7"
        ),
      networkState: null,
      recognizedActiveIntervalMs:
        0,
    },
    {
      serverSequence: 7,
      eventType:
        "QUESTION_FOCUS",
      serverOccurredAt:
        at(7000),
      questionSlot: 3,
      normalizedAnswer: null,
      networkState: null,
      recognizedActiveIntervalMs:
        0,
    },
    {
      serverSequence: 8,
      eventType:
        "HEARTBEAT",
      serverOccurredAt:
        at(8000),
      questionSlot: null,
      normalizedAnswer: null,
      networkState: null,
      recognizedActiveIntervalMs:
        3000,
    },
    {
      serverSequence: 9,
      eventType:
        "ANSWER_CHANGED",
      serverOccurredAt:
        at(9000),
      questionSlot: 3,
      normalizedAnswer:
        normalizedAnswer("8"),
      networkState: null,
      recognizedActiveIntervalMs:
        0,
    },
  ];
  return {
    attemptId:
      "attempt-1",
    submissionRecordId:
      "submission-record-1",
    matchId: "match-1",
    participantRole:
      "CHALLENGER",
    participantUserId:
      "user-challenger-1",
    questionPackId:
      "pack-challenger-1",
    questionPackVersion:
      "PACK_V1_SEALED",
    questionPackSealHash:
      "a".repeat(64),
    policyVersionId:
      "policy-1",
    scoringPolicyVersion:
      SUPPORTED_SCORING_POLICY_VERSION,
    timingPolicySnapshot: {
      version:
        SUPPORTED_ACTIVE_SOLVE_TIME_POLICY_VERSION,
      heartbeatPolicyVersion:
        "ATTEMPT_HEARTBEAT_V1",
      maxRecognizedHeartbeatIntervalMs:
        5000,
    },
    startedAt: at(0),
    endsAt: at(60_000),
    submittedAt: at(10_000),
    effectiveSubmittedAt:
      at(10_000),
    submissionId:
      "CLIENT_REQUEST_MUST_NOT_BECOME_SCORE_ID",
    recognizedHeartbeatActiveMs:
      8000,
    finalAnswers: [
      {
        questionSlot: 1,
        normalizedAnswer:
          normalizedAnswer(
            "\\frac{1}{2}"
          ),
        sourceServerSequence:
          2,
        answerChangedAt:
          at(2000),
      },
      {
        questionSlot: 2,
        normalizedAnswer:
          normalizedAnswer(
            "6*7"
          ),
        sourceServerSequence:
          6,
        answerChangedAt:
          at(6000),
      },
      {
        questionSlot: 3,
        normalizedAnswer:
          normalizedAnswer("8"),
        sourceServerSequence:
          9,
        answerChangedAt:
          at(9000),
      },
    ],
    eventTimeline: events,
  };
}

function deepClone(
  value
) {
  return structuredClone(
    value
  );
}

function attemptFromTimeline(
  timeline,
  {
    heartbeatCapMs =
      5000,
  } = {}
) {
  const attempt =
    attemptProjection();
  const latestAnswers =
    new Map();
  attempt.eventTimeline =
    timeline.map(
      (entry, index) => {
        const event = {
          serverSequence:
            index + 1,
          eventType:
            entry.eventType,
          serverOccurredAt:
            at(
              entry.offsetMs
            ),
          questionSlot:
            entry.questionSlot ??
            null,
          normalizedAnswer:
            entry.answer ===
            undefined
              ? null
              : normalizedAnswer(
                  entry.answer
                ),
          networkState:
            entry.networkState ??
            null,
          recognizedActiveIntervalMs:
            entry
              .recognizedActiveIntervalMs ??
            0,
        };
        if (
          event.eventType ===
          "ANSWER_CHANGED"
        ) {
          latestAnswers.set(
            event.questionSlot,
            event
          );
        }
        return event;
      }
    );
  attempt.finalAnswers =
    Array.from(
      latestAnswers.values(),
      (event) => ({
        questionSlot:
          event.questionSlot,
        normalizedAnswer:
          deepClone(
            event
              .normalizedAnswer
          ),
        sourceServerSequence:
          event.serverSequence,
        answerChangedAt:
          event
            .serverOccurredAt,
      })
    );
  attempt
    .timingPolicySnapshot
    .maxRecognizedHeartbeatIntervalMs =
    heartbeatCapMs;
  attempt
    .recognizedHeartbeatActiveMs =
    attempt.eventTimeline
      .reduce(
        (total, event) =>
          total +
          event
            .recognizedActiveIntervalMs,
        0
      );
  const lastOffsetMs =
    timeline.length
      ? timeline[
          timeline.length -
            1
        ].offsetMs
      : 0;
  attempt.submittedAt =
    at(
      Math.min(
        lastOffsetMs +
          1000,
        60_000
      )
    );
  attempt.effectiveSubmittedAt =
    new Date(
      attempt
        .submittedAt
        .getTime()
    );
  return attempt;
}

function scoringInput(
  extra = {}
) {
  return {
    matchId: "match-1",
    participantRole:
      "CHALLENGER",
    participantUserId:
      "user-challenger-1",
    questionPackId:
      "pack-challenger-1",
    serverCapability:
      SERVER_CAPABILITY,
    ...extra,
  };
}

function coordinator({
  pack =
    packProjection(),
  attempt =
    attemptProjection(),
  calls = [],
} = {}) {
  return createArenaMatchScoringService({
    serverCapability:
      SERVER_CAPABILITY,
    getQuestionPackForScoring:
      async (input) => {
        calls.push({
          adapter: "pack",
          input,
        });
        return pack;
      },
    getPrivateScoringProjection:
      async (input) => {
        calls.push({
          adapter:
            "attempt",
          input,
        });
        return attempt;
      },
  });
}

(async () => {
  await check(
    "봉인 배점·고난도 플래그·서버 focus/heartbeat로만 Rank 호환 결과 계산",
    async () => {
      const calls = [];
      const subject =
        coordinator({
          calls,
        });
      const result =
        await subject
          .scoreSubmittedAttempt(
            scoringInput()
          );

      assert.equal(
        result.calibratedScore,
        9
      );
      assert.equal(
        result
          .advancedCorrectCount,
        1
      );
      assert.equal(
        result
          .correctAnswerActiveSolveTimeMs,
        6000
      );
      assert.equal(
        result.gradingAuthority,
        "SERVER"
      );
      assert.equal(
        result.submittedAt,
        at(10_000)
          .toISOString()
      );
      assert.equal(
        result.integrityState,
        "CLEAR"
      );
      assert.match(
        result.submissionId,
        /^ARENA_SCORE_V1_[a-f0-9]{64}$/
      );
      assert.notEqual(
        result.submissionId,
        attemptProjection()
          .submissionId
      );
      assert.equal(
        calls.length,
        2
      );
      assert.equal(
        calls.every(
          (call) =>
            call.input
              .serverCapability ===
            SERVER_CAPABILITY
        ),
        true
      );
      const rankCompatible = {
        submissionId:
          result.submissionId,
        calibratedScore:
          result.calibratedScore,
        advancedCorrectCount:
          result
            .advancedCorrectCount,
        correctAnswerActiveSolveTimeMs:
          result
            .correctAnswerActiveSolveTimeMs,
        integrityState:
          result.integrityState,
        questionVersion:
          result.questionVersion,
        answerKeyVersion:
          result.answerKeyVersion,
        calibrationVersion:
          result.calibrationVersion,
        submittedAt:
          result.submittedAt,
      };
      assert.doesNotThrow(
        () =>
          compareScoredResults(
            rankCompatible,
            {
              ...rankCompatible,
              submissionId:
                `${result.submissionId}-peer`,
            }
          )
      );

      const replay =
        await subject
          .scoreSubmittedAttempt(
            scoringInput()
          );
      assert.equal(
        replay.submissionId,
        result.submissionId
      );
    }
  );

  await check(
    "첫 focus 전 heartbeat 인정 시간은 어떤 문항에도 귀속하지 않음",
    async () => {
      const attempt =
        attemptFromTimeline([
          {
            eventType:
              "HEARTBEAT",
            offsetMs: 3000,
            recognizedActiveIntervalMs:
              3000,
          },
          {
            eventType:
              "QUESTION_FOCUS",
            offsetMs: 4000,
            questionSlot: 1,
          },
          {
            eventType:
              "ANSWER_CHANGED",
            offsetMs: 4500,
            questionSlot: 1,
            answer: "1/2",
          },
          {
            eventType:
              "HEARTBEAT",
            offsetMs: 5000,
            recognizedActiveIntervalMs:
              2000,
          },
        ]);
      const result =
        await coordinator({
          attempt,
        })
          .scoreSubmittedAttempt(
            scoringInput()
          );

      assert.equal(
        attempt
          .recognizedHeartbeatActiveMs,
        5000
      );
      assert.equal(
        result.calibratedScore,
        4
      );
      assert.equal(
        result
          .correctAnswerActiveSolveTimeMs,
        1000
      );
    }
  );

  await check(
    "한 heartbeat 인정 window 안의 focus 전환 시각으로 문항 시간을 분할",
    async () => {
      const attempt =
        attemptFromTimeline([
          {
            eventType:
              "QUESTION_FOCUS",
            offsetMs: 0,
            questionSlot: 1,
          },
          {
            eventType:
              "ANSWER_CHANGED",
            offsetMs: 500,
            questionSlot: 1,
            answer: "0.5",
          },
          {
            eventType:
              "HEARTBEAT",
            offsetMs: 1000,
            recognizedActiveIntervalMs:
              1000,
          },
          {
            eventType:
              "QUESTION_FOCUS",
            offsetMs: 2000,
            questionSlot: 2,
          },
          {
            eventType:
              "HEARTBEAT",
            offsetMs: 4000,
            recognizedActiveIntervalMs:
              3000,
          },
        ]);
      const result =
        await coordinator({
          attempt,
        })
          .scoreSubmittedAttempt(
            scoringInput()
          );

      assert.equal(
        result.calibratedScore,
        4
      );
      assert.equal(
        result
          .correctAnswerActiveSolveTimeMs,
        2000
      );
    }
  );

  await check(
    "heartbeat cap gap은 버리고 직전 cap window 안의 focus 구간만 귀속",
    async () => {
      const attempt =
        attemptFromTimeline(
          [
            {
              eventType:
                "QUESTION_FOCUS",
              offsetMs: 0,
              questionSlot: 1,
            },
            {
              eventType:
                "HEARTBEAT",
              offsetMs: 1000,
              recognizedActiveIntervalMs:
                1000,
            },
            {
              eventType:
                "QUESTION_FOCUS",
              offsetMs: 3000,
              questionSlot: 2,
            },
            {
              eventType:
                "ANSWER_CHANGED",
              offsetMs: 4000,
              questionSlot: 2,
              answer: "42",
            },
            {
              eventType:
                "QUESTION_FOCUS",
              offsetMs: 8500,
              questionSlot: 1,
            },
            {
              eventType:
                "HEARTBEAT",
              offsetMs: 10_000,
              recognizedActiveIntervalMs:
                2000,
            },
          ],
          {
            heartbeatCapMs:
              2000,
          }
        );
      const result =
        await coordinator({
          attempt,
        })
          .scoreSubmittedAttempt(
            scoringInput()
          );

      assert.equal(
        result.calibratedScore,
        5
      );
      assert.equal(
        result
          .advancedCorrectCount,
        1
      );
      assert.equal(
        result
          .correctAnswerActiveSolveTimeMs,
        500
      );
    }
  );

  await check(
    "겹치는 heartbeat 인정 window 위변조를 합계가 맞아도 차단",
    async () => {
      const attempt =
        attemptFromTimeline([
          {
            eventType:
              "QUESTION_FOCUS",
            offsetMs: 0,
            questionSlot: 1,
          },
          {
            eventType:
              "ANSWER_CHANGED",
            offsetMs: 500,
            questionSlot: 1,
            answer: "1/2",
          },
          {
            eventType:
              "HEARTBEAT",
            offsetMs: 4000,
            recognizedActiveIntervalMs:
              4000,
          },
          {
            eventType:
              "HEARTBEAT",
            offsetMs: 6000,
            recognizedActiveIntervalMs:
              3000,
          },
        ]);
      const error =
        await captureError(
          () =>
            coordinator({
              attempt,
            })
              .scoreSubmittedAttempt(
                scoringInput()
              )
        );

      assert.equal(
        attempt
          .recognizedHeartbeatActiveMs,
        7000
      );
      assert.equal(
        error.code,
        "ARENA_SCORING_ACTIVE_TIME_INVALID"
      );
      assert.match(
        error.message,
        /overlap/
      );
    }
  );

  await check(
    "background·offline 뒤 첫 heartbeat는 0만 허용하고 다음 구간부터 재개",
    async () => {
      const validAttempt =
        attemptFromTimeline([
          {
            eventType:
              "QUESTION_FOCUS",
            offsetMs: 0,
            questionSlot: 1,
          },
          {
            eventType:
              "ANSWER_CHANGED",
            offsetMs: 500,
            questionSlot: 1,
            answer: "1/2",
          },
          {
            eventType:
              "NETWORK_STATE",
            offsetMs: 1000,
            networkState:
              "BACKGROUND",
          },
          {
            eventType:
              "HEARTBEAT",
            offsetMs: 3000,
            recognizedActiveIntervalMs:
              0,
          },
          {
            eventType:
              "HEARTBEAT",
            offsetMs: 4000,
            recognizedActiveIntervalMs:
              1000,
          },
        ]);
      const result =
        await coordinator({
          attempt:
            validAttempt,
        })
          .scoreSubmittedAttempt(
            scoringInput()
          );
      assert.equal(
        result
          .correctAnswerActiveSolveTimeMs,
        1000
      );

      const tampered =
        deepClone(
          validAttempt
        );
      tampered
        .eventTimeline[3]
        .recognizedActiveIntervalMs =
        1000;
      tampered
        .recognizedHeartbeatActiveMs =
        2000;
      const error =
        await captureError(
          () =>
            coordinator({
              attempt:
                tampered,
            })
              .scoreSubmittedAttempt(
                scoringInput()
              )
        );
      assert.equal(
        error.code,
        "ARENA_SCORING_ACTIVE_TIME_INVALID"
      );
    }
  );

  await check(
    "수학 답 비교기와 | 대안을 사용해 분수·수치 동치 답안을 판정",
    async () => {
      const pack =
        packProjection();
      const attempt =
        attemptProjection();
      pack.answerKeys[2]
        .correctAnswer =
        "2|1+1";
      attempt
        .eventTimeline[8]
        .normalizedAnswer =
        normalizedAnswer(
          "sqrt(4)"
        );
      attempt
        .finalAnswers[2]
        .normalizedAnswer =
        normalizedAnswer(
          "sqrt(4)"
        );

      const result =
        await coordinator({
          pack,
          attempt,
        })
          .scoreSubmittedAttempt(
            scoringInput()
          );
      assert.equal(
        result.calibratedScore,
        12
      );
      assert.equal(
        result
          .advancedCorrectCount,
        1
      );
      assert.equal(
        result
          .correctAnswerActiveSolveTimeMs,
        7000
      );
    }
  );

  await check(
    "match·참가자·role·pack·seal·scoring policy identity 불일치를 모두 차단",
    async () => {
      const cases = [
        () => {
          const pack =
            packProjection();
          pack.matchId =
            "other-match";
          return {
            pack,
            attempt:
              attemptProjection(),
          };
        },
        () => {
          const attempt =
            attemptProjection();
          attempt.participantRole =
            "DEFENDER";
          return {
            pack:
              packProjection(),
            attempt,
          };
        },
        () => {
          const attempt =
            attemptProjection();
          attempt.questionPackSealHash =
            "b".repeat(64);
          return {
            pack:
              packProjection(),
            attempt,
          };
        },
        () => {
          const attempt =
            attemptProjection();
          attempt.scoringPolicyVersion =
            "OTHER_SCORING";
          return {
            pack:
              packProjection(),
            attempt,
          };
        },
      ];
      for (const build of
        cases) {
        const error =
          await captureError(
            () =>
              coordinator(
                build()
              )
                .scoreSubmittedAttempt(
                  scoringInput()
                )
          );
        assert.equal(
          error.code,
          "ARENA_SCORING_IDENTITY_MISMATCH"
        );
      }
    }
  );

  await check(
    "이벤트 sequence·활성시간 합계·최종 답 source 변조를 차단",
    async () => {
      const cases = [
        () => {
          const attempt =
            attemptProjection();
          attempt
            .eventTimeline[3]
            .serverSequence =
            99;
          return attempt;
        },
        () => {
          const attempt =
            attemptProjection();
          attempt
            .recognizedHeartbeatActiveMs =
            7999;
          return attempt;
        },
        () => {
          const attempt =
            attemptProjection();
          attempt
            .finalAnswers[0]
            .sourceServerSequence =
            3;
          return attempt;
        },
        () => {
          const attempt =
            attemptProjection();
          attempt
            .finalAnswers[1]
            .normalizedAnswer =
            normalizedAnswer(
              "tampered"
            );
          return attempt;
        },
        () => {
          const attempt =
            attemptProjection();
          attempt
            .eventTimeline[2]
            .recognizedActiveIntervalMs =
            6000;
          attempt
            .recognizedHeartbeatActiveMs =
            13_000;
          return attempt;
        },
        () => {
          const attempt =
            attemptProjection();
          attempt
            .eventTimeline[8]
            .serverOccurredAt =
            at(11_000);
          return attempt;
        },
      ];
      for (const build of
        cases) {
        const error =
          await captureError(
            () =>
              coordinator({
                attempt:
                  build(),
              })
                .scoreSubmittedAttempt(
                  scoringInput()
                )
          );
        assert.match(
          error.code,
          /^ARENA_SCORING_(EVENT_SEQUENCE_INVALID|EVENT_TIME_INVALID|ACTIVE_TIME_INVALID|ACTIVE_TIME_MISMATCH|FINAL_ANSWER_MISMATCH)$/
        );
      }
    }
  );

  await check(
    "submittedAt과 immutable effectiveSubmittedAt 불일치는 채점 전에 차단",
    async () => {
      const attempt =
        attemptProjection();
      attempt
        .effectiveSubmittedAt =
        at(10_001);
      const error =
        await captureError(
          () =>
            coordinator({
              attempt,
            })
              .scoreSubmittedAttempt(
                scoringInput()
              )
        );
      assert.equal(
        error.code,
        "ARENA_SCORING_ATTEMPT_TIME_INVALID"
      );
    }
  );

  await check(
    "submittedAt과 immutable effectiveSubmittedAt 불일치는 채점 전에 차단",
    async () => {
      const attempt =
        attemptProjection();
      attempt
        .effectiveSubmittedAt =
        at(10_001);
      const error =
        await captureError(
          () =>
            coordinator({
              attempt,
            })
              .scoreSubmittedAttempt(
                scoringInput()
              )
        );
      assert.equal(
        error.code,
        "ARENA_SCORING_ATTEMPT_TIME_INVALID"
      );
    }
  );

  await check(
    "미지원 scoring/contract/timing 버전은 임의 해석 없이 fail-closed",
    async () => {
      const unknownScoring =
        packProjection();
      const unknownAttempt =
        attemptProjection();
      unknownScoring
        .scoringPolicyVersion =
        "ARENA_SCORING_FUTURE";
      unknownAttempt
        .scoringPolicyVersion =
        "ARENA_SCORING_FUTURE";
      const scoringError =
        await captureError(
          () =>
            coordinator({
              pack:
                unknownScoring,
              attempt:
                unknownAttempt,
            })
              .scoreSubmittedAttempt(
                scoringInput()
              )
        );
      assert.equal(
        scoringError.code,
        "POLICY_PENDING"
      );
      assert.equal(
        scoringError.reasonCode,
        "SCORING_POLICY_VERSION_UNSUPPORTED"
      );

      for (const field of [
        "calibratedScoreMethodVersion",
        "advancedThresholdVersion",
        "activeSolveTimePolicyVersion",
        "extraTieBreakerPolicyVersion",
        "answerComparisonPolicyVersion",
      ]) {
        const pack =
          packProjection();
        pack.scoringContract[
          field
        ] = "FUTURE_VERSION";
        const error =
          await captureError(
            () =>
              coordinator({
                pack,
              })
                .scoreSubmittedAttempt(
                  scoringInput()
                )
          );
        assert.equal(
          error.code,
          "POLICY_PENDING"
        );
      }

      const timingAttempt =
        attemptProjection();
      timingAttempt
        .timingPolicySnapshot
        .version =
        "OTHER_ACTIVE_TIME";
      const timingError =
        await captureError(
          () =>
            coordinator({
              attempt:
                timingAttempt,
            })
              .scoreSubmittedAttempt(
                scoringInput()
              )
        );
      assert.equal(
        timingError.code,
        "ARENA_SCORING_POLICY_IDENTITY_MISMATCH"
      );
    }
  );

  await check(
    "정확한 in-process capability가 아니면 projection adapter도 호출하지 않음",
    async () => {
      const calls = [];
      const error =
        await captureError(
          () =>
            coordinator({
              calls,
            })
              .scoreSubmittedAttempt(
                scoringInput({
                  serverCapability:
                    Symbol(
                      "wrong"
                    ),
                })
              )
        );
      assert.equal(
        error.code,
        "ARENA_SCORING_SERVER_ONLY"
      );
      assert.equal(
        calls.length,
        0
      );
    }
  );

  await check(
    "클라이언트 score·정오·시간·submission 필드는 coordinator 입력에서 거부",
    async () => {
      const forbidden = [
        {
          calibratedScore:
            999,
        },
        {
          isCorrect: true,
        },
        {
          correctAnswerActiveSolveTimeMs:
            1,
        },
        {
          submissionId:
            "client-score-id",
        },
      ];
      for (const fields of
        forbidden) {
        const error =
          await captureError(
            () =>
              coordinator()
                .scoreSubmittedAttempt(
                  scoringInput(
                    fields
                  )
                )
          );
        assert.equal(
          error.code,
          "ARENA_SCORING_CLIENT_FIELD_FORBIDDEN"
        );
      }
    }
  );

  await check(
    "채점 결과 payload에 답안·정답·풀이·이벤트를 노출하지 않음",
    async () => {
      const result =
        await coordinator()
          .scoreSubmittedAttempt(
            scoringInput()
          );
      const keys =
        Object.keys(
          result
        );
      for (const forbiddenKey of [
        "answers",
        "answerKeys",
        "solutions",
        "questions",
        "events",
        "eventTimeline",
        "finalAnswers",
      ]) {
        assert.equal(
          keys.includes(
            forbiddenKey
          ),
          false
        );
      }
      const serialized =
        JSON.stringify(
          result
        );
      for (const secret of [
        "PRIVATE_SOLUTION",
        "MUST_NEVER",
        "\\\\frac",
        "6*7",
        "CLIENT_REQUEST_MUST_NOT_BECOME_SCORE_ID",
      ]) {
        assert.equal(
          serialized.includes(
            secret
          ),
          false
        );
      }
    }
  );

  await check(
    "봉인 문항·정답·equivalence 배점 정렬이 깨지면 점수를 만들지 않음",
    async () => {
      const pack =
        packProjection();
      pack
        .equivalenceSlots[1]
        .scoreWeight =
        999;
      const error =
        await captureError(
          () =>
            coordinator({
              pack,
            })
              .scoreSubmittedAttempt(
                scoringInput()
              )
        );
      assert.equal(
        error.code,
        "ARENA_SCORING_SEALED_CONTENT_MISMATCH"
      );
    }
  );

  const failed =
    checks.filter(
      (entry) =>
        !entry.passed
    );
  if (failed.length) {
    for (const entry of
      failed) {
      console.error(
        entry.error
      );
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `\n${checks.length}/${checks.length} Arena match scoring checks passed.`
  );
})();
