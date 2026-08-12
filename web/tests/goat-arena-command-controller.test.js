const assert = require(
  "node:assert/strict"
);
const mongoose = require(
  "mongoose"
);

const {
  GoatArenaCommandControllerError,
  createGoatArenaCommandController,
} = require(
  "../controllers/goatArenaCommandController"
);

const checks = [];
const userId =
  new mongoose.Types
    .ObjectId();

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

function request({
  body = {},
  headers = {},
} = {}) {
  const normalizedHeaders =
    Object.fromEntries(
      Object.entries(headers)
        .map(
          ([key, value]) => [
            key.toLowerCase(),
            value,
          ]
        )
    );
  return {
    apiUser: {
      _id: userId,
    },
    params: {
      matchId:
        "match-command-1",
    },
    body,
    headers:
      normalizedHeaders,
    get(name) {
      return normalizedHeaders[
        name.toLowerCase()
      ];
    },
  };
}

function commandHeaders() {
  return {
    "Idempotency-Key":
      "request-1",
    "X-Matths-Client-Version":
      "ios-test-1",
  };
}

function response() {
  return {
    body: null,
    json(value) {
      this.body = value;
      return value;
    },
  };
}

async function invoke(
  handler,
  req
) {
  const res =
    response();
  let forwarded =
    null;
  await handler(
    req,
    res,
    (error) => {
      forwarded = error;
    }
  );
  return {
    res,
    error:
      forwarded,
  };
}

function serviceHarness() {
  const calls = [];
  const service = {
    async acceptParticipantChallenge(
      auth,
      input
    ) {
      calls.push({
        method: "accept",
        auth,
        input,
      });
      return {
        match: {
          id:
            input.matchId,
          status:
            "READY",
          integrityState:
            "CLEAR",
        },
      };
    },
    async declineParticipantChallenge(
      auth,
      input
    ) {
      calls.push({
        method: "decline",
        auth,
        input,
      });
      return {
        match: {
          id:
            input.matchId,
          status:
            "CANCELLED",
          integrityState:
            "CLEAR",
        },
      };
    },
    async startParticipantMatch(
      auth,
      input
    ) {
      calls.push({
        method: "start",
        auth,
        input,
      });
      return {
        attempt: {
          status:
            "IN_PROGRESS",
        },
        questionPack: {
          questions: [],
        },
      };
    },
    async getParticipantQuestionPack(
      auth,
      input
    ) {
      calls.push({
        method:
          "questions",
        auth,
        input,
      });
      return {
        questions: [],
      };
    },
    async recordParticipantEvent(
      auth,
      input
    ) {
      calls.push({
        method: "event",
        auth,
        input,
      });
      return {
        eventType:
          input.eventType,
      };
    },
    async submitParticipantAttempt(
      auth,
      input
    ) {
      calls.push({
        method: "submit",
        auth,
        input,
      });
      return {
        status:
          "SUBMITTED",
      };
    },
    async submitParticipantClientReview(auth, input) {
      calls.push({ method: "client-review", auth, input });
      return { reviewId: input.idempotencyKey, replayed: false, accepted: true };
    },
  };
  return {
    calls,
    controller:
      createGoatArenaCommandController({
        commandService:
          service,
      }),
  };
}

(async () => {
  await check(
    "시작은 인증 사용자·경기·멱등키·빌드만 facade에 전달",
    async () => {
      const harness =
        serviceHarness();
      const result =
        await invoke(
          harness.controller
            .startMatch,
          request({
            headers:
              commandHeaders(),
          })
        );
      assert.equal(
        result.error,
        null
      );
      assert.equal(
        result
          .res
          .body
          .attempt
          .status,
        "IN_PROGRESS"
      );
      assert.deepEqual(
        harness.calls[0],
        {
          method: "start",
          auth: {
            userId,
          },
          input: {
            matchId:
              "match-command-1",
            idempotencyKey:
              "request-1",
            clientBuildVersion:
              "ios-test-1",
          },
        }
      );
    }
  );

  await check(
    "body의 사용자·역할·팩·점수 조작은 facade 호출 전에 거부",
    async () => {
      for (const field of [
        "userId",
        "participantRole",
        "questionPackId",
        "stakeDays",
        "score",
      ]) {
        const harness =
          serviceHarness();
        const result =
          await invoke(
            harness
              .controller
              .startMatch,
            request({
              headers:
                commandHeaders(),
              body: {
                [field]:
                  "forged",
              },
            })
          );
        assert.equal(
          result.error
            instanceof
            GoatArenaCommandControllerError,
          true
        );
        assert.equal(
          result.error.code,
          "GOAT_ARENA_COMMAND_BODY_INVALID"
        );
        assert.equal(
          harness.calls.length,
          0
        );
      }
    }
  );

  await check(
    "수락은 빈 body와 명령 헤더만 받아 인증 방어자 문맥으로 전달",
    async () => {
      const harness =
        serviceHarness();
      const result =
        await invoke(
          harness.controller
            .acceptChallenge,
          request({
            headers:
              commandHeaders(),
          })
        );
      assert.equal(
        result.error,
        null
      );
      assert.deepEqual(
        harness.calls[0],
        {
          method:
            "accept",
          auth: {
            userId,
          },
          input: {
            matchId:
              "match-command-1",
            idempotencyKey:
              "request-1",
            clientBuildVersion:
              "ios-test-1",
          },
        }
      );
      assert.deepEqual(
        result.res.body,
        {
          match: {
            id:
              "match-command-1",
            status:
              "READY",
            integrityState:
              "CLEAR",
          },
        }
      );
    }
  );

  await check(
    "거절은 reasonCode 하나만 전달하고 자유 문구·서버 소유 필드를 차단",
    async () => {
      const harness =
        serviceHarness();
      const result =
        await invoke(
          harness.controller
            .declineChallenge,
          request({
            headers:
              commandHeaders(),
            body: {
              reasonCode:
                "SCHEDULE_CONFLICT",
            },
          })
        );
      assert.equal(
        result.error,
        null
      );
      assert.deepEqual(
        harness.calls[0],
        {
          method:
            "decline",
          auth: {
            userId,
          },
          input: {
            matchId:
              "match-command-1",
            idempotencyKey:
              "request-1",
            clientBuildVersion:
              "ios-test-1",
            reasonCode:
              "SCHEDULE_CONFLICT",
          },
        }
      );

      for (const body of [
        {
          reason:
            "free text",
        },
        {
          reasonCode:
            "OTHER",
          defenderUserId:
            String(userId),
        },
        {
          reasonCode:
            "OTHER",
          score: 100,
        },
      ]) {
        const blocked =
          serviceHarness();
        const blockedResult =
          await invoke(
            blocked
              .controller
              .declineChallenge,
            request({
              headers:
                commandHeaders(),
              body,
            })
          );
        assert.equal(
          blockedResult
            .error
            .code,
          "GOAT_ARENA_COMMAND_BODY_INVALID"
        );
        assert.equal(
          blocked
            .calls
            .length,
          0
        );
      }
    }
  );

  await check(
    "heartbeat·focus·답변·네트워크 이벤트는 고정 eventType과 최소 payload만 전달",
    async () => {
      const harness =
        serviceHarness();
      const cases = [
        [
          harness.controller
            .heartbeat,
          {},
          "HEARTBEAT",
          {},
        ],
        [
          harness.controller
            .recordQuestionFocus,
          {
            questionSlot: 2,
          },
          "QUESTION_FOCUS",
          {
            questionSlot: 2,
          },
        ],
        [
          harness.controller
            .saveAnswer,
          {
            questionSlot: 2,
            answer: "sqrt(2)",
          },
          "ANSWER_CHANGED",
          {
            questionSlot: 2,
            answer:
              "sqrt(2)",
          },
        ],
        [
          harness.controller
            .recordNetworkState,
          {
            networkState:
              "BACKGROUND",
          },
          "NETWORK_STATE",
          {
            networkState:
              "BACKGROUND",
          },
        ],
      ];
      for (const [
        handler,
        body,
        eventType,
        payload,
      ] of cases) {
        const result =
          await invoke(
            handler,
            request({
              body,
              headers:
                commandHeaders(),
            })
          );
        assert.equal(
          result.error,
          null
        );
        const call =
          harness.calls.at(
            -1
          );
        assert.equal(
          call.input
            .eventType,
          eventType
        );
        assert.deepEqual(
          call.input
            .payload,
          payload
        );
        assert.equal(
          "userId" in
            call.input,
          false
        );
      }
    }
  );

  await check(
    "질문 조회와 제출도 서버 소유 신원 없이 동일 명령 헤더를 사용",
    async () => {
      const harness =
        serviceHarness();
      const headers =
        commandHeaders();
      const questions =
        await invoke(
          harness.controller
            .getQuestions,
          request({
            headers,
          })
        );
      const submission =
        await invoke(
          harness.controller
            .submitAttempt,
          request({
            headers,
          })
        );
      assert.equal(
        questions.error,
        null
      );
      assert.equal(
        submission.error,
        null
      );
      assert.deepEqual(
        harness.calls.map(
          (call) =>
            call.method
        ),
        [
          "questions",
          "submit",
        ]
      );
      assert.equal(
        submission
          .res
          .body
          .attempt
          .status,
        "SUBMITTED"
      );
    }
  );

  await check(
    "로컬 비전 검토는 인증 사용자와 허용된 비확정 메타데이터만 전달",
    async () => {
      const harness = serviceHarness();
      const body = {
        evidenceId: "evidence-1",
        model: "Qwen3.5-VL-3B",
        modelVersion: "vision.gguf",
        reviewState: "suspicious",
        signals: ["answer-only"],
        completedAt: "2026-08-11T08:00:00.000Z",
      };
      const result = await invoke(
        harness.controller.submitClientReview,
        request({ body, headers: commandHeaders() })
      );
      assert.equal(result.error, null);
      assert.deepEqual(harness.calls[0], {
        method: "client-review",
        auth: { userId },
        input: {
          matchId: "match-command-1",
          idempotencyKey: "request-1",
          clientBuildVersion: "ios-test-1",
          ...body,
        },
      });
      const blocked = serviceHarness();
      const forged = await invoke(
        blocked.controller.submitClientReview,
        request({
          body: { ...body, anomalyFlags: ["CLIENT_GUILTY"] },
          headers: commandHeaders(),
        })
      );
      assert.equal(forged.error.code, "GOAT_ARENA_COMMAND_BODY_INVALID");
      assert.equal(blocked.calls.length, 0);
    }
  );

  await check(
    "명령 헤더나 인증 사용자가 없으면 서비스 호출 없이 거부",
    async () => {
      const harness =
        serviceHarness();
      const noKey =
        await invoke(
          harness.controller
            .startMatch,
          request({
            headers: {
              "X-Matths-Client-Version":
                "ios-test-1",
            },
          })
        );
      assert.equal(
        noKey.error.code,
        "GOAT_ARENA_COMMAND_HEADER_REQUIRED"
      );
      const req =
        request({
          headers:
            commandHeaders(),
        });
      req.apiUser = null;
      const noAuth =
        await invoke(
          harness.controller
            .startMatch,
          req
        );
      assert.equal(
        noAuth.error.code,
        "UNAUTHORIZED"
      );
      assert.equal(
        harness.calls.length,
        0
      );
    }
  );

  const failed =
    checks.filter(
      (entry) =>
        !entry.passed
    );
  if (failed.length) {
    console.error(
      `\n${failed.length} GOAT Arena command controller check(s) failed.`
    );
    process.exit(1);
  }
  console.log(
    `\n${checks.length}/${checks.length} GOAT Arena command controller checks passed.`
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
