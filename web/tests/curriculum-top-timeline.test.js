"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const {
  buildLearningViewModel,
  loadCurriculum,
} = require("../services/curriculumService");
const {
  resolveStudentCurriculumStory,
} = require("../services/curriculumStoryService");
const {
  buildCurriculumTimelinePreview,
} = require("../services/curriculumTimelinePreviewService");
const matthsController = require("../controllers/matthsController");

const root = path.resolve(__dirname, "..");
const templatePath = path.join(root, "views/curriculum.ejs");
const stylesheet = fs.readFileSync(
  path.join(root, "public/css/curriculum-atlas.css"),
  "utf8"
);
const tokenStylesheet = fs.readFileSync(
  path.join(root, "public/css/matths-brand-tokens.css"),
  "utf8"
);

async function run() {
  const curriculumData = loadCurriculum();
  const freshLearningData = buildLearningViewModel(curriculumData);
  let resolverCalls = 0;
  const countingResolver = (coordinates) => {
    resolverCalls += 1;
    return resolveStudentCurriculumStory(coordinates);
  };

  const nextPreview = buildCurriculumTimelinePreview({
    curriculumData,
    learningData: freshLearningData,
    loggedIn: true,
    storyResolver: countingResolver,
  });

  assert.equal(resolverCalls, 1, "상단은 target concept 한 개만 story resolve해야 합니다.");
  assert.equal(nextPreview.state, "next");
  assert.ok(nextPreview.target.href.startsWith("/learn/"));
  assert.equal(nextPreview.story.scenes.length, 5);
  assert.equal(
    JSON.stringify(nextPreview.story).includes("narration"),
    false,
    "상단 projection에는 5분 장문 narration을 넘기면 안 됩니다."
  );

  const html = await ejs.renderFile(templatePath, {
    curriculumData,
    curriculumTimelinePreview: nextPreview,
    user: { id: "timeline-contract-user", name: "학생" },
  });
  assert.equal((html.match(/data-curriculum-top-timeline/g) || []).length, 1);
  assert.equal((html.match(/class="curriculum-top-memory-beat"/g) || []).length, 5);
  assert.doesNotMatch(html, /class="curriculum-memory-line"/);
  assert.match(html, /aria-label="[^"]+ 5단계 풀이 기억선"/);
  assert.match(html, /data-curriculum-top-state="next"/);
  assert.match(html, new RegExp(`href="${nextPreview.target.href}"`));

  const guestPreview = buildCurriculumTimelinePreview({
    curriculumData,
    loggedIn: false,
  });
  assert.equal(guestPreview.state, "locked");
  assert.equal(guestPreview.statusLabel, "로그인 필요");
  assert.equal(
    guestPreview.ctaHref,
    guestPreview.target.href,
    "게스트 CTA도 실제 대상 개념 URL을 유지해 로그인 게이트로 이어져야 합니다."
  );
  assert.match(guestPreview.lockReason, /로그인/);

  let renderedView = null;
  let renderedLocals = null;
  await matthsController.curriculumPage(
    { session: {} },
    {
      render(view, locals) {
        renderedView = view;
        renderedLocals = locals;
      },
    },
    (error) => {
      throw error;
    }
  );
  assert.equal(renderedView, "curriculum");
  assert.equal(renderedLocals.curriculumTimelinePreview.state, "locked");
  assert.ok(renderedLocals.curriculumTimelinePreview.target.href.startsWith("/learn/"));

  renderedView = null;
  renderedLocals = null;
  await matthsController.curriculumPage(
    { session: { user: { name: "식별자 없는 오래된 세션" } } },
    {
      render(view, locals) {
        renderedView = view;
        renderedLocals = locals;
      },
    },
    (error) => {
      throw error;
    }
  );
  assert.equal(renderedView, "curriculum");
  assert.equal(renderedLocals.user, null);
  assert.equal(
    renderedLocals.curriculumTimelinePreview.state,
    "locked",
    "user id 없는 오래된 세션은 로그인 진도로 오인하면 안 됩니다."
  );

  const completedPreview = buildCurriculumTimelinePreview({
    curriculumData,
    learningData: { ...freshLearningData, continueConcept: null },
    loggedIn: true,
    storyResolver() {
      throw new Error("완료 상태에서는 story resolver를 호출하면 안 됩니다.");
    },
  });
  assert.equal(completedPreview.state, "completed");
  assert.equal(completedPreview.target, null);
  assert.match(completedPreview.message, /모든 개념을 완료/);

  const missingPreview = buildCurriculumTimelinePreview({
    curriculumData,
    learningData: freshLearningData,
    loggedIn: true,
    storyResolver: () => ({ story: null, status: "missing" }),
  });
  assert.equal(missingPreview.state, "empty");
  assert.ok(missingPreview.target);
  assert.match(missingPreview.message, /프리뷰/);

  const editorialLockPreview = buildCurriculumTimelinePreview({
    curriculumData,
    learningData: freshLearningData,
    loggedIn: true,
    storyResolver: () => ({ story: null, status: "draft" }),
  });
  assert.equal(editorialLockPreview.state, "locked");
  assert.match(editorialLockPreview.lockReason, /개념 학습은 바로 시작/);
  assert.equal(editorialLockPreview.ctaHref, editorialLockPreview.target.href);

  assert.equal(curriculumData.catalogStats.totalCourses, 13);
  assert.equal(curriculumData.catalogStats.totalConcepts, 220);
  assert.match(stylesheet, /grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(stylesheet, /@media \(max-width:\s*860px\)[\s\S]*curriculum-top-memory-line[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(stylesheet, /@media \(max-width:\s*520px\)[\s\S]*curriculum-top-memory-footer a[\s\S]*width:\s*100%/);
  assert.match(stylesheet, /curriculum-top-memory-footer a[\s\S]*min-height:\s*48px/);
  assert.match(stylesheet, /overflow-wrap:\s*anywhere/);
  assert.match(tokenStylesheet, /@media \(prefers-reduced-motion:\s*reduce\)/);

  console.log("curriculum top timeline: one 5-node preview, states, responsive AX passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
