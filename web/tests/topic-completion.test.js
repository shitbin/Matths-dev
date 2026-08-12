// 실행: node webrepo-applied/tests/topic-completion.test.js
//
// iPad 토픽 PATCH의 전체 경로(apiController → learningProgressService → schema hook)와
// 게스트 진도 snapshot의 무이벤트 단조 병합을 실제 DB 없이 검증한다.
const path = require("node:path");

const REPO = path.resolve(__dirname, "..");
const modelPath = require.resolve(
  path.join(REPO, "models/matthsModel.js")
);
const realModels = require(modelPath);
const mongoose = require(
  path.join(REPO, "node_modules/mongoose")
);
const curriculumService = require(
  path.join(
    REPO,
    "services/curriculumService.js"
  )
);

const curriculum =
  curriculumService.loadCurriculum();
let location = null;
for (const course of curriculum.courses || []) {
  for (const unit of course.units || []) {
    for (const concept of unit.concepts || []) {
      if ((concept.topics || []).length >= 2) {
        location = { course, unit, concept };
        break;
      }
    }
    if (location) break;
  }
  if (location) break;
}
if (!location) {
  throw new Error(
    "테스트할 토픽 2개 이상 개념이 없습니다."
  );
}

const userId =
  new mongoose.Types.ObjectId();
let currentDocument = null;
let saveCount = 0;
const storedEvents = new Map();

function attachSave(document) {
  document.save = async function save() {
    await this.validate();
    saveCount += 1;
    currentDocument = this;
    return this;
  };
  return document;
}

function ConceptProgressFacade(input) {
  return attachSave(
    new realModels.ConceptProgress(input)
  );
}
ConceptProgressFacade.findOne =
  async () => currentDocument;
ConceptProgressFacade.find = () => ({
  lean: async () =>
    currentDocument
      ? [currentDocument.toObject()]
      : [],
});

const LearningEventFacade = {
  async create(event) {
    const key =
      `${event.userId}:${event.clientEventId}`;
    if (storedEvents.has(key)) {
      const error =
        new Error("duplicate key");
      error.code = 11000;
      throw error;
    }
    storedEvents.set(key, event);
    return event;
  },
};

const AssessmentAttemptFacade = {
  find: () => ({
    select: () => ({
      lean: async () => [],
    }),
  }),
};

require.cache[modelPath].exports = {
  ...realModels,
  ConceptProgress:
    ConceptProgressFacade,
  LearningEvent:
    LearningEventFacade,
  AssessmentAttempt:
    AssessmentAttemptFacade,
};

const apiController = require(
  path.join(
    REPO,
    "controllers/apiController.js"
  )
);
const ipadSyncController = require(
  path.join(
    REPO,
    "controllers/ipadSyncController.js"
  )
);

const failures = [];
const check = (
  condition,
  label,
  got
) => {
  if (condition) {
    console.log(`  ✓ ${label}`);
    return;
  }
  failures.push(label);
  console.log(
    `  ✗ ${label} — 실제: ${JSON.stringify(got)}`
  );
};
const response = {
  body: null,
  json(body) {
    this.body = body;
    return this;
  },
};
const baseRequest = {
  apiUser: { _id: userId },
  params: {
    courseId: location.course.id,
    unitId: location.unit.id,
    conceptId: location.concept.id,
    topicIndex: "0",
  },
};
const callTopic = async (body) => {
  let forwardedError = null;
  await apiController.updateTopic(
    { ...baseRequest, body },
    response,
    (error) => {
      forwardedError = error;
    }
  );
  return forwardedError;
};

(async () => {
  const occurredAt =
    "2026-07-28T03:04:05.000Z";
  let error = await callTopic({
    completed: true,
    clientEventId: "topic-op-1",
    occurredAt,
  });
  const expectedOneTopicPercent =
    Math.round(
      30 /
      location.concept.topics.length
    );
  check(!error, "첫 토픽 PATCH 성공", error);
  check(
    JSON.stringify(
      currentDocument.completedTopicIndexes
    ) === "[0]",
    "완료 토픽 인덱스 저장",
    currentDocument.completedTopicIndexes
  );
  check(
    currentDocument.completionPercent ===
      expectedOneTopicPercent,
    "토픽 비율을 스키마 훅으로 재계산",
    currentDocument.completionPercent
  );
  const firstEvent =
    [...storedEvents.values()][0];
  check(
    firstEvent.clientEventId ===
      "topic-op-1",
    "클라이언트 이벤트 ID 보존",
    firstEvent
  );
  check(
    firstEvent.occurredAt.toISOString() ===
      occurredAt,
    "오프라인 실제 학습 시각 보존",
    firstEvent.occurredAt
  );
  check(
    firstEvent.topicIndex === 0 &&
      firstEvent.metadata
        .completionPercent ===
        expectedOneTopicPercent,
    "토픽 이벤트 메타데이터 저장",
    firstEvent
  );

  error = await callTopic({
    completed: true,
    clientEventId: "topic-op-1",
    occurredAt,
  });
  check(
    !error &&
      storedEvents.size === 1 &&
      currentDocument
        .completedTopicIndexes.length === 1,
    "같은 오프라인 작업 재전송은 상태·이벤트 멱등",
    {
      error,
      events: storedEvents.size,
      indexes:
        currentDocument
          .completedTopicIndexes,
    }
  );

  error = await callTopic({
    completed: false,
    clientEventId: "topic-op-2",
    occurredAt:
      "2026-07-28T03:05:00.000Z",
  });
  const events =
    [...storedEvents.values()];
  check(
    !error &&
      currentDocument
        .completedTopicIndexes.length === 0 &&
      currentDocument
        .completionPercent === 0,
    "토픽 해제도 진도에서 제거",
    currentDocument.toObject()
  );
  check(
    events[1]?.eventType ===
      "topic-uncompleted",
    "해제 이벤트 어휘 보존",
    events[1]
  );

  const savesBeforeInvalid =
    saveCount;
  let invalidError = null;
  await apiController.updateTopic(
    {
      ...baseRequest,
      params: {
        ...baseRequest.params,
        topicIndex: "999",
      },
      body: {
        completed: true,
        clientEventId:
          "topic-op-invalid",
      },
    },
    response,
    (forwarded) => {
      invalidError = forwarded;
    }
  );
  check(
    invalidError?.status === 400 &&
      saveCount === savesBeforeInvalid,
    "범위 밖 토픽은 저장 전에 400",
    {
      status: invalidError?.status,
      saves: saveCount,
    }
  );

  // 과거 게스트 기록은 이벤트 없이 한 문서로 병합한다.
  currentDocument = null;
  const eventsBeforeSnapshot =
    storedEvents.size;
  const snapshotTime =
    "2026-07-20T01:02:03.000Z";
  const snapshotBody = {
    completedTopicIndexes: [0, 1],
    correctTypeIds: [
      "t1", "t2", "t3", "t4", "t5",
    ],
    userCompleted: true,
    lastStudiedAt: snapshotTime,
  };
  let snapshotError = null;
  await ipadSyncController
    .patchProgressSnapshot(
      {
        ...baseRequest,
        body: snapshotBody,
      },
      response,
      (forwarded) => {
        snapshotError = forwarded;
      }
    );
  check(
    !snapshotError &&
      currentDocument
        .completedTopicIndexes
        .join(",") === "0,1" &&
      currentDocument.masteryGate
        .correctTypeIds.length === 5 &&
      currentDocument
        .completionPercent === 100,
    "게스트 토픽·유형·완료를 원자적으로 병합",
    currentDocument?.toObject()
  );
  check(
    storedEvents.size ===
      eventsBeforeSnapshot,
    "snapshot은 과거 활동 이벤트를 새로 만들지 않음",
    storedEvents.size
  );
  check(
    currentDocument.lastStudiedAt
      .toISOString() === snapshotTime,
    "게스트의 실제 마지막 학습 시각 보존",
    currentDocument.lastStudiedAt
  );
  const completedAt =
    currentDocument.masteryGate
      .completedAt.getTime();
  await new Promise(
    (resolve) => setTimeout(resolve, 5)
  );
  await ipadSyncController
    .patchProgressSnapshot(
      {
        ...baseRequest,
        body: snapshotBody,
      },
      response,
      (forwarded) => {
        snapshotError = forwarded;
      }
    );
  check(
    currentDocument.masteryGate
      .completedAt.getTime() ===
      completedAt &&
      storedEvents.size ===
        eventsBeforeSnapshot,
    "snapshot 재전송도 완료 시각·이벤트 불변",
    currentDocument.masteryGate
      .completedAt
  );

  console.log(
    failures.length
      ? `\n실패 ${failures.length}건`
      : "\n전부 통과"
  );
  process.exit(
    failures.length ? 1 : 0
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
