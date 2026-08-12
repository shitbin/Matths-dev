#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  listStuckPoints,
  resetLearningProgress,
  saveStuckPoint,
  serializeStuckPoint,
} = require("../services/ipadLearningStateService");

(async () => {
  const deleteCalls = [];
  const reset = await resetLearningProgress({
    userId: "user-1",
    clientResetId: "reset-1",
    occurredAt: "2026-08-11T09:00:00.000Z",
    now: new Date("2026-08-11T09:00:01.000Z"),
    ConceptProgressModel: {
      async deleteMany(query) { deleteCalls.push(query); return { deletedCount: 4 }; },
    },
  });
  assert.equal(reset.deletedCount, 4);
  assert.equal(deleteCalls[0].userId, "user-1");
  assert.equal(deleteCalls[0].updatedAt.$lte.toISOString(), "2026-08-11T09:00:00.000Z");

  await assert.rejects(
    () => resetLearningProgress({
      userId: "user-1",
      clientResetId: "reset-future",
      occurredAt: "2026-08-11T09:06:00.000Z",
      now: new Date("2026-08-11T09:00:00.000Z"),
      ConceptProgressModel: { deleteMany: async () => ({ deletedCount: 0 }) },
    }),
    /현재보다 지나치게 앞서/,
  );

  let upsert;
  const pointModel = {
    findOneAndUpdate(query, update, options) {
      upsert = { query, update, options };
      return { lean: async () => ({ ...update.$setOnInsert }) };
    },
  };
  const point = await saveStuckPoint({
    userId: "user-1",
    clientStuckPointId: "point-1",
    text: "  두 번째 식에서 부호가 바뀌는 이유  ",
    occurredAt: "2026-08-11T09:00:00.000Z",
    now: new Date("2026-08-11T09:00:01.000Z"),
    StuckPointModel: pointModel,
  });
  assert.equal(upsert.query.clientStuckPointId, "point-1");
  assert.equal(upsert.options.upsert, true);
  assert.equal(point.text, "두 번째 식에서 부호가 바뀌는 이유");
  assert.deepEqual(serializeStuckPoint(point), {
    id: "point-1",
    text: "두 번째 식에서 부호가 바뀌는 이유",
    createdAt: "2026-08-11T09:00:00.000Z",
  });

  await assert.rejects(
    () => saveStuckPoint({
      userId: "user-1",
      clientStuckPointId: "point-2",
      text: " ",
      StuckPointModel: pointModel,
    }),
    /막힌 지점이 없습니다/,
  );
  await assert.rejects(
    () => saveStuckPoint({
      userId: "user-1",
      clientStuckPointId: "point-3",
      text: "식 전개가 이해되지 않음",
      StuckPointModel: pointModel,
    }),
    /기록 시각이 없습니다/,
  );

  const queryCalls = [];
  const rows = [{ clientStuckPointId: "point-1" }];
  const listModel = {
    find(query) {
      queryCalls.push(query);
      return {
        sort() { return this; },
        limit(limit) { queryCalls.push({ limit }); return this; },
        async lean() { return rows; },
      };
    },
  };
  assert.equal((await listStuckPoints({ userId: "user-1", limit: 999, StuckPointModel: listModel })).length, 1);
  assert.deepEqual(queryCalls, [{ userId: "user-1" }, { limit: 200 }]);

  const routes = fs.readFileSync(path.join(__dirname, "../routes/api-routes.js"), "utf8");
  for (const fragment of [
    'router.post("/learning/progress/reset", requireApiAuth, ipadSync.resetLearningProgress)',
    'router.post("/wrong-notes/stuck-points", requireApiAuth, ipadSync.postStuckPoint)',
    'router.get("/wrong-notes/stuck-points", requireApiAuth, ipadSync.getStuckPoints)',
  ]) {
    assert.ok(routes.includes(fragment), `Bearer auth route missing: ${fragment}`);
  }

  console.log("iPad learning state service test passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
