const {
  loadCurriculum,
} = require("../curriculumService");

const lessonSeeds = [
  ...require("../../scripts/seeds/ipadGenerated"),
  ...require("../../scripts/seeds/algebra"),
  ...require("../../scripts/seeds/calculus1"),
  ...require("../../scripts/seeds/probabilityStatistics"),
];

const TYPE_IDS = Object.freeze([
  "curriculum-summary",
  "curriculum-key-takeaway",
  "curriculum-step-purpose",
  "curriculum-achievement-standard",
  "curriculum-step-sequence",
]);

let contentIndex = null;

function normalizedText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function lessonContent(seed) {
  return seed?.content || seed?.lesson || null;
}

function buildContentIndex() {
  if (contentIndex) return contentIndex;

  const lessonsByConcept = new Map();
  for (const seed of lessonSeeds) {
    const content = lessonContent(seed);
    if (seed?.conceptId && content) {
      lessonsByConcept.set(String(seed.conceptId), content);
    }
  }

  const curriculum = loadCurriculum();
  const records = [];
  const byKey = new Map();

  for (const course of curriculum.courses) {
    for (const unit of course.units) {
      for (const concept of unit.concepts) {
        const record = {
          course,
          unit,
          concept,
          lesson: lessonsByConcept.get(concept.id) || null,
        };
        records.push(record);
        byKey.set(
          [course.id, unit.id, concept.id].join("/"),
          record
        );
      }
    }
  }

  contentIndex = { records, byKey };
  return contentIndex;
}

function shuffled(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function distinct(values) {
  const seen = new Set();
  const result = [];
  for (const value of values.map(normalizedText)) {
    const key = value.replace(/\s+/g, "");
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function peerRecords(target) {
  const { records } = buildContentIndex();
  return [
    ...records.filter(
      (record) =>
        record.concept.id !== target.concept.id &&
        record.course.id === target.course.id &&
        record.unit.id === target.unit.id
    ),
    ...records.filter(
      (record) =>
        record.concept.id !== target.concept.id &&
        record.course.id === target.course.id &&
        record.unit.id !== target.unit.id
    ),
    ...records.filter(
      (record) =>
        record.concept.id !== target.concept.id &&
        record.course.id !== target.course.id
    ),
  ];
}

function makeChoices(correctText, distractorTexts) {
  const correct = normalizedText(correctText);
  const distractors = distinct(distractorTexts)
    .filter(
      (candidate) =>
        candidate.replace(/\s+/g, "") !==
        correct.replace(/\s+/g, "")
    )
    .slice(0, 3);

  if (!correct || distractors.length < 3) {
    throw new Error("개념 확인 문제의 고유 보기를 만들 수 없습니다.");
  }

  const ordered = shuffled([
    { correct: true, text: correct },
    ...distractors.map((text) => ({ correct: false, text })),
  ]);
  const keys = ["a", "b", "c", "d"];
  const choices = ordered.map((choice, index) => ({
    key: keys[index],
    text: choice.text,
  }));
  const answer = keys[ordered.findIndex((choice) => choice.correct)];

  return { choices, answer };
}

function multipleChoiceProblem({
  prompt,
  correct,
  distractors,
  solution,
  hintText,
}) {
  const { choices, answer } = makeChoices(correct, distractors);
  return {
    prompt: normalizedText(prompt),
    inputMode: "multiple-choice",
    choices,
    answer,
    solution: normalizedText(solution),
    hintText: normalizedText(hintText),
    calculatorFree: true,
    validation: { calculatorFree: true },
  };
}

function stepPool(records, field) {
  return records.flatMap((record) =>
    (record.lesson?.steps || []).map((step) => step?.[field])
  );
}

function buildProblemTypes(target) {
  const peers = peerRecords(target);
  const lesson = target.lesson;
  const steps = Array.isArray(lesson.steps) ? lesson.steps : [];
  const firstStep = steps[0];

  return [
    {
      id: TYPE_IDS[0],
      label: "개념 확인 1 · 설명과 개념 연결",
      difficulty: 1,
      calculatorFree: true,
      generate() {
        return multipleChoiceProblem({
          prompt:
            `다음 설명이 가리키는 수학 개념을 고르세요. ` +
            `“${lesson.summary}”`,
          correct: target.concept.title,
          distractors: peers.map((record) => record.concept.title),
          solution:
            `이 설명은 ${target.concept.title}의 핵심 맥락을 요약합니다. ` +
            `${lesson.summary}`,
          hintText: "설명에서 반복되는 대상과 수학적 행동을 먼저 찾으세요.",
        });
      },
    },
    {
      id: TYPE_IDS[1],
      label: "개념 확인 2 · 핵심 원리",
      difficulty: 1,
      calculatorFree: true,
      generate() {
        return multipleChoiceProblem({
          prompt: `${target.concept.title}의 핵심 원리로 가장 알맞은 것을 고르세요.`,
          correct: lesson.keyTakeaway,
          distractors: peers.map((record) => record.lesson?.keyTakeaway),
          solution:
            `${target.concept.title}에서는 다음 원리를 기준으로 판단합니다. ` +
            `${lesson.keyTakeaway}`,
          hintText: "강의의 핵심 정리에서 조건과 결론을 함께 확인하세요.",
        });
      },
    },
    {
      id: TYPE_IDS[2],
      label: "개념 확인 3 · 단계의 목적",
      difficulty: 1,
      calculatorFree: true,
      generate() {
        return multipleChoiceProblem({
          prompt:
            `${target.concept.title} 학습의 ‘${firstStep.title}’ 단계에서 ` +
            `해야 할 일로 가장 알맞은 것을 고르세요.`,
          correct: firstStep.description,
          distractors: [
            ...steps.slice(1).map((step) => step.description),
            ...stepPool(peers, "description"),
          ],
          solution:
            `‘${firstStep.title}’ 단계의 목적은 다음과 같습니다. ` +
            `${firstStep.description}`,
          hintText: "단계 이름이 요구하는 첫 행동이 무엇인지 생각하세요.",
        });
      },
    },
    {
      id: TYPE_IDS[3],
      label: "개념 확인 4 · 성취기준",
      difficulty: 1,
      calculatorFree: true,
      generate() {
        return multipleChoiceProblem({
          prompt: `${target.concept.title}을 학습한 뒤 할 수 있어야 하는 일은 무엇인가요?`,
          correct: target.concept.achievementStandard,
          distractors: peers.map(
            (record) => record.concept.achievementStandard
          ),
          solution:
            `이 개념의 성취기준은 “${target.concept.achievementStandard}”입니다.`,
          hintText: "개념의 정의만이 아니라 실제로 설명하거나 해결해야 하는 일을 고르세요.",
        });
      },
    },
    {
      id: TYPE_IDS[4],
      label: "개념 확인 5 · 학습 순서",
      difficulty: 1,
      calculatorFree: true,
      generate() {
        return multipleChoiceProblem({
          prompt: `${target.concept.title}의 학습 흐름에서 가장 먼저 확인할 단계를 고르세요.`,
          correct: firstStep.title,
          distractors: [
            ...steps.slice(1).map((step) => step.title),
            ...stepPool(peers, "title"),
          ],
          solution:
            `첫 단계는 ‘${firstStep.title}’입니다. ` +
            `그 다음 단계로 넘어가기 전에 ${firstStep.description}`,
          hintText: "계산이나 적용보다 먼저 정해야 하는 기준·대상·조건을 찾으세요.",
        });
      },
    },
  ];
}

function getCurriculumConceptCheckGenerator({
  courseId,
  unitId,
  conceptId,
}) {
  const target = buildContentIndex().byKey.get(
    [courseId, unitId, conceptId].join("/")
  );

  if (
    !target?.lesson?.summary ||
    !target.lesson.keyTakeaway ||
    !Array.isArray(target.lesson.steps) ||
    !target.lesson.steps.length ||
    !target.concept.achievementStandard
  ) {
    return null;
  }

  return {
    source: "authored-curriculum-check",
    requiredDistinctTypes: TYPE_IDS.length,
    problemTypes: buildProblemTypes(target),
  };
}

function getAuthoredConceptLesson({
  courseId,
  unitId,
  conceptId,
}) {
  const target = buildContentIndex().byKey.get(
    [courseId, unitId, conceptId].join("/")
  );
  if (!target?.lesson) return null;

  return {
    ...target.lesson,
    steps: (target.lesson.steps || []).map(
      (step) => ({ ...step })
    ),
    motion: target.lesson.motion || {
      assetUrl: null,
      posterUrl: null,
      durationSeconds: null,
    },
    playgroundKey:
      target.lesson.playgroundKey || null,
    practice: target.lesson.practice || {
      generatorKey:
        "authored-curriculum-check",
      requiredDistinctTypes:
        TYPE_IDS.length,
    },
    isPublished: true,
  };
}

module.exports = {
  TYPE_IDS,
  getAuthoredConceptLesson,
  getCurriculumConceptCheckGenerator,
};
