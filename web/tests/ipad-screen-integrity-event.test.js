"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { LearningEvent } = require("../models/matthsModel");
const ipadSyncController = require("../controllers/ipadSyncController");
const storedEventTypes = new Set(
  LearningEvent.schema.path("eventType").enumValues
);

const modelSource = fs.readFileSync(
  path.join(__dirname, "../models/matthsModel.js"),
  "utf8"
);
const controllerSource = fs.readFileSync(
  path.join(__dirname, "../controllers/ipadSyncController.js"),
  "utf8"
);

for (const type of [
  "protected-screen-screenshot",
  "protected-screen-capture-started",
  "protected-screen-capture-ended",
]) {
  assert(modelSource.includes(`"${type}"`), `${type} must be a durable LearningEvent`);
  assert(controllerSource.includes(`"${type}"`), `${type} must cross the iPad API boundary`);
  assert(storedEventTypes.has(type), `${type} must validate against the stored schema`);
}

assert(controllerSource.includes("screenIntegrity"));
assert(controllerSource.includes("integritySessionCode"));
assert(controllerSource.includes("protectedSurface"));
assert(!/metadata:\s*event\.metadata/.test(controllerSource), "client metadata must not pass through unchecked");

function postEvents(req) {
  return new Promise((resolve, reject) => {
    ipadSyncController.postEvents(
      req,
      { json: resolve },
      reject,
    );
  });
}

async function main() {
  const server = await MongoMemoryServer.create();
  try {
    await mongoose.connect(server.getUri(), { dbName: "screen-integrity-event-test" });
    const userId = new mongoose.Types.ObjectId();
    const longSurface = "assessment/" + "x".repeat(180);
    const events = [
      ["protected-screen-screenshot", "screen-1"],
      ["protected-screen-capture-started", "screen-2"],
      ["protected-screen-capture-ended", "screen-3"],
    ].map(([eventType, clientEventId], index) => ({
      eventType,
      clientEventId,
      integritySessionCode: index === 1 ? "SESSION-CODE-IS-LONGER-THAN-16" : "A1B2C3D4",
      protectedSurface: index === 1 ? longSurface : "placement-exam",
      metadata: {
        forged: true,
        cycleAttendance: { candidate: true },
      },
    }));
    const first = await postEvents({
      apiUser: { _id: userId },
      body: {
        sessionId: "ipad-offline-recovery",
        events: [...events, events[0]],
      },
    });
    assert.deepEqual(first, { accepted: 3, duplicates: 1 });

    const stored = await LearningEvent.find({ userId }).sort({ clientEventId: 1 }).lean();
    assert.equal(stored.length, 3);
    for (const event of stored) {
      assert.ok(storedEventTypes.has(event.eventType));
      assert.equal(event.sessionId, "ipad-offline-recovery");
      if (event.clientEventId === "screen-2") {
        assert.equal(event.metadata.screenIntegrity.sessionCode, null);
        assert.equal(event.metadata.screenIntegrity.surface, null);
      } else {
        assert.equal(event.metadata.screenIntegrity.sessionCode, "A1B2C3D4");
        assert.equal(event.metadata.screenIntegrity.surface, "placement-exam");
      }
      assert.equal(event.metadata.forged, undefined);
      assert.equal(event.metadata.cycleAttendance, undefined);
      assert.equal(event.durationMs, null);
      assert.equal(event.correct, null);
    }

    // 오프라인 큐가 네트워크 복구 뒤 같은 clientEventId를 재전송해도 중복 저장하지 않는다.
    const replay = await postEvents({
      apiUser: { _id: userId },
      body: { sessionId: "ipad-offline-recovery", events },
    });
    assert.deepEqual(replay, { accepted: 0, duplicates: 3 });
    assert.equal(await LearningEvent.countDocuments({ userId }), 3);

    console.log("iPad protected-screen integrity events persist once after offline replay");
  } finally {
    await mongoose.disconnect();
    await server.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
