"use strict";

const assert = require(
  "node:assert/strict"
);

const {
  createArenaAttemptDeadlineService,
} = require(
  "../services/arenaAttemptDeadlineService"
);

function fakeAttemptModel(
  candidates,
  observation
) {
  return {
    find(filter) {
      observation.filter =
        filter;
      return {
        select(selection) {
          observation.selection =
            selection;
          return this;
        },
        sort(order) {
          observation.order =
            order;
          return this;
        },
        limit(value) {
          observation.limit =
            value;
          return this;
        },
        lean() {
          return Promise.resolve(
            candidates
          );
        },
      };
    },
  };
}

(async () => {
  const fixedNow =
    new Date(
      "2031-04-05T06:07:08.009Z"
    );
  const clock =
    () =>
      new Date(
        fixedNow
      );
  const capability =
    Symbol(
      "deadline-unit"
    );

  let factoryOptions;
  const emptyObservation = {};
  const emptyService =
    createArenaAttemptDeadlineService({
      now: clock,
      AttemptModel:
        fakeAttemptModel(
          [],
          emptyObservation
        ),
      deadlineCapability:
        capability,
      attemptServiceFactory:
        (options) => {
          factoryOptions =
            options;
          return {
            async submitExpiredAttempt() {
              throw new Error(
                "no candidate expected"
              );
            },
          };
        },
    });
  assert.equal(
    factoryOptions.now,
    clock
  );
  assert.equal(
    factoryOptions
      .deadlineCapability,
    capability
  );
  assert.equal(
    factoryOptions
      .serverCapability,
    capability
  );
  const emptyResult =
    await emptyService
      .runOnce();
  assert.equal(
    emptyResult.scannedCount,
    0
  );
  assert.equal(
    emptyResult
      .observedAt
      .getTime(),
    fixedNow.getTime()
  );
  assert.equal(
    emptyObservation
      .filter
      .endsAt
      .$lt
      .getTime(),
    fixedNow.getTime()
  );

  const candidates = [
    {
      _id: "attempt-ok",
      matchId: "match-ok",
      participantRole:
        "CHALLENGER",
      participantUserId:
        "user-ok",
      questionPackId:
        "pack-ok",
    },
    {
      _id: "attempt-failed",
      matchId:
        "match-failed",
      participantRole:
        "DEFENDER",
      participantUserId:
        "user-failed",
      questionPackId:
        "pack-failed",
    },
  ];
  const observation = {};
  const submissions = [];
  const errors = [];
  const service =
    createArenaAttemptDeadlineService({
      now: clock,
      AttemptModel:
        fakeAttemptModel(
          candidates,
          observation
        ),
      batchSize: 7,
      deadlineCapability:
        capability,
      onError: (error) =>
        errors.push(error),
      attemptService: {
        async submitExpiredAttempt(
          input
        ) {
          submissions.push(
            input
          );
          if (
            input.attemptId ===
            "attempt-failed"
          ) {
            const error =
              new Error(
                "candidate failed"
              );
            error.code =
              "CANDIDATE_FAILED";
            throw error;
          }
          return {
            submissionRecordId:
              "submission-ok",
          };
        },
      },
    });
  const result =
    await service.runOnce();

  assert.deepEqual(
    observation.filter,
    {
      status: "IN_PROGRESS",
      submissionRecordId:
        null,
      endsAt: {
        $lt: fixedNow,
      },
    }
  );
  assert.deepEqual(
    observation.order,
    {
      endsAt: 1,
      _id: 1,
    }
  );
  assert.equal(
    observation.limit,
    7
  );
  assert.equal(
    result.scannedCount,
    2
  );
  assert.equal(
    result.submittedCount,
    1
  );
  assert.equal(
    result.failedCount,
    1
  );
  assert.deepEqual(
    result.failures,
    [
      {
        attemptId:
          "attempt-failed",
        code:
          "CANDIDATE_FAILED",
      },
    ]
  );
  assert.equal(
    errors.length,
    1
  );
  assert.deepEqual(
    Object.keys(
      submissions[0]
    ).sort(),
    [
      "attemptId",
      "deadlineCapability",
      "matchId",
      "participantRole",
      "participantUserId",
      "questionPackId",
    ]
  );
  assert.equal(
    submissions.every(
      (input) =>
        input
          .deadlineCapability ===
        capability
    ),
    true
  );
  assert.equal(
    submissions.some(
      (input) =>
        "observedAt" in
        input
    ),
    false
  );

  const cursorEndsAt =
    new Date(
      fixedNow.getTime() -
        10_000
    );
  const cursorFilters = [];
  const pagedModel = {
    find(filter) {
      cursorFilters.push(
        filter
      );
      const page =
        filter.$or
          ? [
              {
                _id:
                  "attempt-later-ok",
                matchId:
                  "match-later-ok",
                participantRole:
                  "CHALLENGER",
                participantUserId:
                  "user-later-ok",
                questionPackId:
                  "pack-later-ok",
                endsAt:
                  new Date(
                    cursorEndsAt
                      .getTime() +
                      1
                  ),
              },
            ]
          : [
              "a",
              "b",
            ].map(
              (suffix) => ({
                _id:
                  `attempt-broken-${suffix}`,
                matchId:
                  `match-broken-${suffix}`,
                participantRole:
                  "DEFENDER",
                participantUserId:
                  `user-broken-${suffix}`,
                questionPackId:
                  `pack-broken-${suffix}`,
                endsAt:
                  cursorEndsAt,
              })
            );
      return {
        select() {
          return this;
        },
        sort() {
          return this;
        },
        limit() {
          return this;
        },
        lean() {
          return Promise.resolve(
            page
          );
        },
      };
    },
  };
  const pagedSubmissions = [];
  const pagedService =
    createArenaAttemptDeadlineService({
      now: clock,
      AttemptModel:
        pagedModel,
      batchSize: 2,
      deadlineCapability:
        capability,
      onError: () => {},
      attemptService: {
        async submitExpiredAttempt(
          input
        ) {
          if (
            input.attemptId
              .startsWith(
                "attempt-broken"
              )
          ) {
            throw new Error(
              "permanent broken attempt"
            );
          }
          pagedSubmissions.push(
            input.attemptId
          );
          return {
            submissionRecordId:
              "later-submission",
          };
        },
      },
    });
  const blockedPage =
    await pagedService
      .runOnce();
  const laterPage =
    await pagedService
      .runOnce();
  assert.equal(
    blockedPage.failedCount,
    2
  );
  assert.equal(
    laterPage.submittedCount,
    1
  );
  assert.deepEqual(
    pagedSubmissions,
    [
      "attempt-later-ok",
    ]
  );
  assert.ok(
    Array.isArray(
      cursorFilters[1].$or
    )
  );

  let releaseDeadlineSubmission;
  const delayedSubmission =
    new Promise(
      (resolve) => {
        releaseDeadlineSubmission =
          resolve;
      }
    );
  let delayedStartedResolve;
  const delayedStarted =
    new Promise(
      (resolve) => {
        delayedStartedResolve =
          resolve;
      }
    );
  const drainingService =
    createArenaAttemptDeadlineService({
      now: clock,
      AttemptModel:
        fakeAttemptModel(
          [
            {
              _id:
                "attempt-drain",
              matchId:
                "match-drain",
              participantRole:
                "CHALLENGER",
              participantUserId:
                "user-drain",
              questionPackId:
                "pack-drain",
              endsAt:
                cursorEndsAt,
            },
          ],
          {}
        ),
      workerIntervalMs:
        60_000,
      deadlineCapability:
        capability,
      attemptService: {
        async submitExpiredAttempt() {
          delayedStartedResolve();
          await delayedSubmission;
          return {
            submissionRecordId:
              "submission-drained",
          };
        },
      },
    });
  const worker =
    drainingService
      .startArenaAttemptDeadlineWorker();
  await delayedStarted;
  let drainCompleted =
    false;
  const draining =
    worker
      .stopAndDrain()
      .then(() => {
        drainCompleted =
          true;
      });
  await Promise.resolve();
  assert.equal(
    drainCompleted,
    false
  );
  releaseDeadlineSubmission();
  await draining;
  assert.equal(
    drainCompleted,
    true
  );

  console.log(
    "4/4 Arena attempt deadline unit checks passed."
  );
})().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  }
);
