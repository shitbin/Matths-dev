"use strict";

const templates = require("../services/assessmentTemplates");
const {
  getProblemGenerator,
} = require("../services/problemGenerators");

function pickStageGenerate(template, learnedSet) {
  let generate = null;
  for (const stage of template.stages || []) {
    if ((stage.requiredConceptIds || []).every((id) => learnedSet.has(id))) {
      generate = stage.generate;
    }
  }
  return generate || template.generate;
}

function tryGenerate(generate, retries) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const problem = generate();
      if (
        problem?.prompt &&
        problem.answer !== undefined &&
        problem.answer !== null &&
        String(problem.answer).length > 0
      ) {
        return problem;
      }
    } catch (_error) {
      // 일부 무작위 조합이 생성기 조건을 만족하지 못하면 다음 조합을 시도한다.
    }
  }
  return null;
}

globalThis.MatthsWebGen = {
  drawAdvanced(courseId, unitId, learned, count) {
    const config = (templates.unitConfigs || []).find(
      (unit) => unit.courseId === courseId && unit.unitId === unitId,
    );
    if (!config) return [];

    const learnedSet = new Set(learned || []);
    const eligible = learnedSet.size
      ? config.advancedTemplates.filter(
        (template) =>
          (template.stages || []).some(
            (stage) => (stage.requiredConceptIds || []).every(
              (id) => learnedSet.has(id),
            ),
          ) ||
          (template.requiredConceptIds || []).every((id) => learnedSet.has(id)),
      )
      : config.advancedTemplates;
    const pool = eligible.length ? eligible : config.advancedTemplates;
    const output = [];
    const used = new Set();
    let guard = 0;

    while (output.length < count && guard < count * 8) {
      guard += 1;
      const template = pool[Math.floor(Math.random() * pool.length)];
      if (used.has(template.id) && used.size < pool.length) continue;
      const problem = tryGenerate(pickStageGenerate(template, learnedSet), 40);
      if (!problem) continue;
      used.add(template.id);
      output.push({
        templateId: template.id,
        title: template.title || "",
        estimatedMinutes: template.estimatedMinutes || 8,
        sourcePattern: template.sourcePattern || "",
        prompt: problem.prompt,
        choices: Array.isArray(problem.choices) && problem.choices.length
          ? problem.choices
          : null,
        answer: String(problem.answer),
        solution: problem.solution || "",
        hintText: problem.hintText || "",
      });
    }
    return output;
  },

  conceptGeneratorInfo(courseId, unitId, conceptId) {
    const generator = getProblemGenerator({ courseId, unitId, conceptId });
    if (!generator) return null;
    return {
      key: generator.key,
      requiredDistinctTypes: generator.requiredDistinctTypes || 5,
      types: (generator.problemTypes || []).map((type) => ({
        id: type.id,
        label: type.label || "",
        difficulty: type.difficulty || 1,
      })),
    };
  },

  generateLocal(courseId, unitId, conceptId, typeId, count) {
    const generator = getProblemGenerator({ courseId, unitId, conceptId });
    if (!generator) return [];
    const types = (generator.problemTypes || []).filter(
      (type) => !typeId || type.id === typeId,
    );
    if (!types.length) return [];

    const output = [];
    let guard = 0;
    while (output.length < count && guard < count * 6) {
      guard += 1;
      const type = types[Math.floor(Math.random() * types.length)];
      const problem = tryGenerate(type.generate, 40);
      if (!problem) continue;
      output.push({
        typeId: type.id,
        label: type.label || "",
        difficulty: type.difficulty || 1,
        prompt: problem.prompt,
        choices: Array.isArray(problem.choices) && problem.choices.length
          ? problem.choices
          : null,
        answer: String(problem.answer),
        solution: problem.solution || "",
        hintText: problem.hintText || "",
        visualization: problem.visualization || null,
      });
    }
    return output;
  },
};
