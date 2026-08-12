const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const {
  ARENA_RESEED_STATUSES,
  ARENA_SEASON_STATUSES,
  ArenaSeason,
} = require(
  "../models/arenaSeasonModel"
);
const {
  ARENA_PROFILE_STATUSES,
  ARENA_RANKING_TYPES,
  ArenaProfile,
  SEATED_PROFILE_STATUSES,
  assertSafeArenaProfileUpdate,
} = require(
  "../models/arenaProfileModel"
);

const checks = [];

async function check(label, run) {
  try {
    await run();
    checks.push({ label, passed: true });
    console.log(`  ✓ ${label}`);
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

function objectId() {
  return new mongoose.Types.ObjectId();
}

function season(overrides = {}) {
  return {
    seasonId: "goat-2026-summer",
    title: "GOAT Arena 2026 Summer",
    startsAt: new Date(
      "2026-07-01T00:00:00+09:00"
    ),
    endsAt: new Date(
      "2026-09-01T00:00:00+09:00"
    ),
    policyVersionId: objectId(),
    ...overrides,
  };
}

function profile(overrides = {}) {
  return {
    userId: objectId(),
    seasonId: objectId(),
    activeRanking: "SUB",
    arenaPosition: 17,
    status: "ACTIVE",
    mmrAtLastSeed: 1482.5,
    seededAt: new Date(
      "2026-07-27T12:00:00.000Z"
    ),
    seedWeekKey: "policy-week-31",
    ...overrides,
  };
}

function findIndex(model, name) {
  return model.schema
    .indexes()
    .find(
      ([, options]) =>
        options.name === name
    );
}

async function run() {
  await check(
    "시즌·재시드 상태 어휘와 기간을 보존",
    async () => {
      assert.deepEqual(
        ARENA_SEASON_STATUSES,
        [
          "DRAFT",
          "SCHEDULED",
          "ACTIVE",
          "SETTLING",
          "CLOSED",
          "CANCELLED",
        ]
      );
      assert.deepEqual(
        ARENA_RESEED_STATUSES,
        [
          "NOT_STARTED",
          "RUNNING",
          "COMPLETED",
          "FAILED",
        ]
      );

      const document = new ArenaSeason(
        season({
          status: "ACTIVE",
        })
      );
      await document.validate();
      assert.equal(
        document.reseedStatus,
        "NOT_STARTED"
      );
    }
  );

  await check(
    "시즌 종료는 시작 이후여야 함",
    async () => {
      await assert.rejects(
        new ArenaSeason(
          season({
            endsAt: new Date(
              "2026-06-30T00:00:00+09:00"
            ),
          })
        ).validate(),
        /after startsAt/
      );
    }
  );

  await check(
    "완료된 재시드는 week key와 완료 시각을 함께 저장",
    async () => {
      const missing = new ArenaSeason(
        season({
          reseedStatus: "COMPLETED",
        })
      );
      await assert.rejects(
        missing.validate(),
        /week key/
      );

      const completed = new ArenaSeason(
        season({
          reseedStatus: "COMPLETED",
          currentWeekKey:
            "policy-week-31",
          lastSeededAt: new Date(
            "2026-07-27T12:00:00.000Z"
          ),
        })
      );
      await completed.validate();
    }
  );

  await check(
    "재시드 요일·시각은 시즌 모델에 하드코딩하지 않음",
    () => {
      for (const field of [
        "reseedDayOfWeek",
        "reseedHour",
        "reseedCron",
        "reseedIntervalDays",
      ]) {
        assert.equal(
          ArenaSeason.schema.path(field),
          undefined
        );
      }
    }
  );

  await check(
    "동시에 ACTIVE인 전역 ArenaSeason은 하나",
    () => {
      const [fields, options] =
        findIndex(
          ArenaSeason,
          "one_active_arena_season"
        );
      assert.deepEqual(fields, {
        status: 1,
      });
      assert.equal(options.unique, true);
      assert.deepEqual(
        options
          .partialFilterExpression,
        {
          status: "ACTIVE",
        }
      );
    }
  );

  await check(
    "ArenaProfile은 Sub/Main과 최종 상태 어휘를 사용",
    () => {
      assert.deepEqual(
        ARENA_RANKING_TYPES,
        ["SUB", "MAIN"]
      );
      assert.deepEqual(
        ARENA_PROFILE_STATUSES,
        [
          "PLACEMENT_PENDING",
          "ACTIVE",
          "HIDDEN",
          "SETTLING",
          "CLOSED",
        ]
      );
      assert.deepEqual(
        SEATED_PROFILE_STATUSES,
        [
          "ACTIVE",
          "HIDDEN",
          "SETTLING",
        ]
      );
    }
  );

  await check(
    "활성 프로필은 좌석·seed MMR snapshot·시드 시각이 필수",
    async () => {
      await new ArenaProfile(
        profile()
      ).validate();

      await assert.rejects(
        new ArenaProfile(
          profile({
            arenaPosition: null,
          })
        ).validate(),
        /requires a seat/
      );
      await assert.rejects(
        new ArenaProfile(
          profile({
            mmrAtLastSeed: null,
          })
        ).validate(),
        /seed MMR snapshot/
      );
      await assert.rejects(
        new ArenaProfile(
          profile({
            seededAt: null,
          })
        ).validate(),
        /requires seededAt/
      );
      await assert.rejects(
        new ArenaProfile(
          profile({
            seedWeekKey: null,
          })
        ).validate(),
        /seed week key/
      );
    }
  );

  await check(
    "Placement 대기·종료 프로필은 공개 좌석을 보유하지 않음",
    async () => {
      await new ArenaProfile(
        profile({
          status: "PLACEMENT_PENDING",
          arenaPosition: null,
          mmrAtLastSeed: null,
          seededAt: null,
          seedWeekKey: null,
        })
      ).validate();

      await assert.rejects(
        new ArenaProfile(
          profile({
            status: "CLOSED",
          })
        ).validate(),
        /cannot retain a seat/
      );
    }
  );

  await check(
    "숨김 프로필은 이유를 남김",
    async () => {
      await assert.rejects(
        new ArenaProfile(
          profile({
            status: "HIDDEN",
          })
        ).validate(),
        /requires a reason/
      );

      await new ArenaProfile(
        profile({
          status: "HIDDEN",
          hiddenReason:
            "INTEGRITY_REVIEW",
        })
      ).validate();
    }
  );

  await check(
    "Rank Shield는 Main에만 허용",
    async () => {
      const shieldUntil = new Date(
        "2026-08-01T00:00:00.000Z"
      );

      await assert.rejects(
        new ArenaProfile(
          profile({
            rankShieldUntil:
              shieldUntil,
          })
        ).validate(),
        /only in Main/
      );

      await new ArenaProfile(
        profile({
          activeRanking: "MAIN",
          rankShieldUntil:
            shieldUntil,
        })
      ).validate();
    }
  );

  await check(
    "쿼리·일괄 갱신도 Main 조건 없이 Shield를 넣을 수 없음",
    async () => {
      const shieldUntil = new Date(
        "2026-08-01T00:00:00.000Z"
      );
      assert.throws(
        () =>
          assertSafeArenaProfileUpdate({
            filter: {
              _id: objectId(),
            },
            update: {
              $set: {
                rankShieldUntil:
                  shieldUntil,
              },
            },
          }),
        /activeRanking MAIN condition/
      );
      assert.doesNotThrow(() =>
        assertSafeArenaProfileUpdate({
          filter: {
            _id: objectId(),
            activeRanking: "MAIN",
          },
          update: {
            $set: {
              rankShieldUntil:
                shieldUntil,
            },
          },
        })
      );
      assert.throws(
        () =>
          assertSafeArenaProfileUpdate({
            update: {
              $set: {
                activeRanking: "SUB",
              },
            },
          }),
        /clear rankShieldUntil/
      );
      assert.throws(
        () =>
          assertSafeArenaProfileUpdate({
            filter: {
              activeRanking: "MAIN",
            },
            update: {
              $set: {
                activeRanking: "SUB",
              },
              $setOnInsert: {
                rankShieldUntil:
                  null,
              },
            },
          }),
        /explicit set or unset/
      );
      assert.throws(
        () =>
          assertSafeArenaProfileUpdate({
            filter: {
              activeRanking: "MAIN",
            },
            update: {
              $currentDate: {
                rankShieldUntil: true,
              },
            },
          }),
        /explicit set or unset/
      );
      assert.throws(
        () =>
          assertSafeArenaProfileUpdate({
            filter: {
              activeRanking: "MAIN",
            },
            update: {
              $max: {
                rankShieldUntil:
                  shieldUntil,
              },
            },
          }),
        /explicit set or unset/
      );
      assert.throws(
        () =>
          assertSafeArenaProfileUpdate({
            filter: {
              activeRanking: "MAIN",
            },
            update: {
              $rename: {
                protectionUntil:
                  "rankShieldUntil",
              },
            },
          }),
        /explicit set or unset/
      );
      assert.throws(
        () =>
          assertSafeArenaProfileUpdate({
            update: {
              $set: {
                activeRanking: "SUB",
                rankShieldUntil:
                  undefined,
              },
            },
          }),
        /clear rankShieldUntil/
      );

      await assert.rejects(
        ArenaProfile.updateOne(
          {
            _id: objectId(),
          },
          {
            $set: {
              rankShieldUntil:
                shieldUntil,
            },
          }
        ),
        (error) =>
          error.code ===
          "MAIN_RANKING_CAS_REQUIRED"
      );

      await assert.rejects(
        ArenaProfile.findOneAndReplace(
          {
            _id: objectId(),
          },
          profile({
            activeRanking: "SUB",
            rankShieldUntil:
              shieldUntil,
          })
        ),
        (error) =>
          error.code ===
          "SUB_RANK_SHIELD_FORBIDDEN"
      );

      await assert.rejects(
        ArenaProfile.bulkWrite([
          {
            updateOne: {
              filter: {
                _id: objectId(),
              },
              update: {
                $set: {
                  rankShieldUntil:
                    shieldUntil,
                },
              },
            },
          },
        ]),
        /activeRanking MAIN condition/
      );
      await assert.rejects(
        ArenaProfile.bulkWrite([
          {
            updateOne: {
              filter: {
                activeRanking:
                  "MAIN",
              },
              update: {
                $currentDate: {
                  rankShieldUntil:
                    true,
                },
              },
            },
          },
        ]),
        /explicit set or unset/
      );
    }
  );

  await check(
    "MMR snapshot은 week key·시드 시각과 원자적으로 갱신",
    async () => {
      assert.throws(
        () =>
          assertSafeArenaProfileUpdate({
            filter: {
              _id: objectId(),
            },
            update: {
              $set: {
                mmrAtLastSeed: 1501,
              },
            },
          }),
        /must update atomically/
      );
      assert.throws(
        () =>
          assertSafeArenaProfileUpdate({
            filter: {
              _id: objectId(),
            },
            update: {
              $inc: {
                mmrAtLastSeed: 1,
              },
            },
          }),
        /explicit set or unset/
      );
      assert.throws(
        () =>
          assertSafeArenaProfileUpdate({
            filter: {
              status: "ACTIVE",
            },
            update: {
              $set: {
                mmrAtLastSeed:
                  1501,
              },
              $setOnInsert: {
                seededAt: new Date(
                  "2026-08-03T12:00:00.000Z"
                ),
                seedWeekKey:
                  "policy-week-32",
              },
            },
          }),
        /explicit set or unset/
      );
      assert.throws(
        () =>
          assertSafeArenaProfileUpdate({
            filter: {
              status: "ACTIVE",
            },
            update: {
              $unset: {
                mmrAtLastSeed: 1,
                seededAt: 1,
                seedWeekKey: 1,
              },
            },
          }),
        /must unseat/
      );
      assert.doesNotThrow(() =>
        assertSafeArenaProfileUpdate({
          filter: {
            _id: objectId(),
          },
          update: {
            $set: {
              mmrAtLastSeed: 1501,
              seededAt: new Date(
                "2026-08-03T12:00:00.000Z"
              ),
              seedWeekKey:
                "policy-week-32",
            },
          },
        })
      );
      assert.doesNotThrow(() =>
        assertSafeArenaProfileUpdate({
          filter: {
            _id: objectId(),
          },
          update: {
            $set: {
              status: "CLOSED",
              arenaPosition: null,
            },
            $unset: {
              mmrAtLastSeed: 1,
              seededAt: 1,
              seedWeekKey: 1,
            },
          },
        })
      );

      const hydrated =
        ArenaProfile.hydrate({
          _id: objectId(),
          ...profile(),
          version: 2,
        });
      hydrated.mmrAtLastSeed =
        hydrated.mmrAtLastSeed;
      hydrated.seededAt = new Date(
        "2026-08-03T12:00:00.000Z"
      );
      hydrated.seedWeekKey =
        "policy-week-32";
      await hydrated.validate();
    }
  );

  await check(
    "시즌·리그·좌석 조합은 숫자 좌석에 대해 유일",
    () => {
      const [fields, options] =
        findIndex(
          ArenaProfile,
          "one_arena_profile_per_seat"
        );
      assert.deepEqual(fields, {
        seasonId: 1,
        activeRanking: 1,
        arenaPosition: 1,
      });
      assert.equal(options.unique, true);
      assert.deepEqual(
        options
          .partialFilterExpression,
        {
          arenaPosition: {
            $type: "number",
          },
        }
      );
    }
  );

  await check(
    "한 시즌의 활성·숨김·정산중 프로필은 사용자당 하나",
    () => {
      const [fields, options] =
        findIndex(
          ArenaProfile,
          "one_active_arena_profile_per_user"
        );
      assert.deepEqual(fields, {
        seasonId: 1,
        userId: 1,
      });
      assert.equal(options.unique, true);
      assert.deepEqual(
        options
          .partialFilterExpression,
        {
          status: {
            $in: [
              "ACTIVE",
              "HIDDEN",
              "SETTLING",
            ],
          },
        }
      );
    }
  );

  await check(
    "Rank Takeover가 바꿀 MMR 원본 필드는 존재하지 않음",
    () => {
      assert.equal(
        ArenaProfile.schema.path("mmr"),
        undefined
      );
      assert.ok(
        ArenaProfile.schema.path(
          "mmrAtLastSeed"
        )
      );
    }
  );

  await check(
    "프로필의 일반 lost update는 version 기반 낙관적 잠금을 사용",
    () => {
      assert.equal(
        ArenaProfile.schema.options
          .versionKey,
        "version"
      );
      assert.equal(
        ArenaProfile.schema.options
          .optimisticConcurrency,
        true
      );
    }
  );

  const failed = checks.filter(
    ({ passed }) => !passed
  );
  if (failed.length > 0) {
    console.error(
      `\n${failed.length}개 검사 실패`
    );
    process.exitCode = 1;
  } else {
    console.log(
      `\n${checks.length}/${checks.length} checks passed`
    );
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
