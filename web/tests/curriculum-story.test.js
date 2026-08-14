#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const ejs = require("ejs");
const { loadCurriculum } = require("../services/curriculumService");
const {
  buildCurriculumStoryEditorialQueue,
  compileStudioScript,
  getCurriculumStoryCatalog,
  splitNarrationIntoChunks,
  stripStudioTags,
  toStudentCurriculumStory,
  validateStory,
  validateStoryCurriculumAuthority,
} = require("../services/curriculumStoryService");
const narration = require("../public/js/curriculum-narration.js");

const root = path.resolve(__dirname, "..");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
}

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

class FakeSpeechProvider {
  constructor() {
    this.isAvailable = true;
    this.paused = false;
    this.pending = null;
    this.spoken = [];
    this.stopped = false;
  }
  speak(text, callbacks) {
    this.spoken.push(text);
    this.pending = callbacks;
    this.paused = false;
  }
  pause() {
    this.paused = true;
    return true;
  }
  resume() {
    if (!this.paused) return false;
    this.paused = false;
    return true;
  }
  stop() {
    this.stopped = true;
    this.pending = null;
    this.paused = false;
  }
  finish() {
    const callback = this.pending?.onEnd;
    this.pending = null;
    callback?.();
  }
}

(async () => {
  run(process.execPath, ["scripts/buildCurriculumStoryIndex.js", "--check"]);

  const curriculum = loadCurriculum();
  const catalog = getCurriculumStoryCatalog({ reload: true });
  assert.equal(curriculum.catalogStats.totalConcepts, 220);
  assert.equal(catalog.index.shards.length, 13);
  const indexedStoryCount = catalog.index.shards.reduce(
    (sum, shard) => sum + shard.storyCount,
    0,
  );
  assert.equal(catalog.publishedStoryByKey.size, indexedStoryCount);
  assert.deepEqual(catalog.catalogIssues, []);
  assert.equal(catalog.issuesByKey.size, 0);

  const expectedConceptIds = new Set([
    "quadratic-discriminant",
    "calculus-1-01-01",
    "probability-statistics-02-04",
  ]);
  const publishedConceptIds = new Set(
    [...catalog.publishedStoryByKey.values()].map((story) => story.conceptId),
  );
  for (const conceptId of expectedConceptIds) {
    assert.ok(publishedConceptIds.has(conceptId), `foundation story missing: ${conceptId}`);
  }

  for (const story of catalog.publishedStoryByKey.values()) {
    assert.equal(story.scenes.length, 5);
    assert.deepEqual(
      new Set(story.scenes.map((scene) => scene.kind)),
      new Set(["intuition", "question", "misconception", "solution", "recall"]),
    );
    const narrationLength = story.scenes.reduce((sum, scene) => sum + scene.narration.length, 0);
    assert.ok(narrationLength >= 1400 && narrationLength <= 2600);
    for (const scene of story.scenes) {
      assert.equal(stripStudioTags(scene.studioScript), scene.narration);
      const compiledStudioScript = compileStudioScript(scene.studioScript);
      assert.match(compiledStudioScript, /^\[(?:warmly|curious|excited|whispers|sighs)\]/u);
      assert.equal(stripStudioTags(compiledStudioScript), scene.narration);
      assert.ok(!/\[[^\]]+\]/u.test(scene.narration));
      assert.ok(!/\[[^\]]+\]/u.test(scene.subtitle));
      const chunks = splitNarrationIntoChunks(scene.narration);
      assert.ok(chunks.length >= 2);
      assert.ok(chunks.every((chunk) => chunk.length <= 180));
    }
    const studentStory = toStudentCurriculumStory(story);
    assert.equal(studentStory.revision, story.revision);
    const studentJson = JSON.stringify(studentStory);
    assert.ok(!studentJson.includes("studioScript"));
    assert.ok(!/\[(?:침착하게|따뜻하게|궁금한 듯|강조해서|낮은 목소리로|아쉬운 듯)\]/u.test(studentJson));
  }

  const editorial = buildCurriculumStoryEditorialQueue(curriculum);
  assert.equal(editorial.queue.length, 220 - indexedStoryCount);
  assert.equal(editorial.orphanedStories.length, 0);
  assert.deepEqual(editorial.catalogIssues, []);

  const authorityStory = [...catalog.publishedStoryByKey.values()][0];
  const authorityCourse = curriculum.courses.find((course) => course.id === authorityStory.courseId);
  const authorityUnit = authorityCourse.units.find((unit) => unit.id === authorityStory.unitId);
  const authorityConcept = authorityUnit.concepts.find(
    (concept) => concept.id === authorityStory.conceptId,
  );
  assert.deepEqual(validateStoryCurriculumAuthority(authorityStory, authorityConcept), []);
  assert.match(
    validateStoryCurriculumAuthority(
      { ...authorityStory, source: { ...authorityStory.source, standardCode: "WRONG" } },
      authorityConcept,
    ).join("\n"),
    /커리큘럼 정본과 다릅니다/u,
  );
  assert.match(
    validateStoryCurriculumAuthority(authorityStory, null).join("\n"),
    /없는 course\/unit\/concept/u,
  );

  const lowQualityStory = structuredClone([...catalog.publishedStoryByKey.values()][0]);
  lowQualityStory.title = "1단계 핵심 개념";
  lowQualityStory.scenes[0].subtitle = "그림과 수식을 연결해 핵심 원리를 확인합니다.";
  const lowQualityIssues = validateStory(
    lowQualityStory,
    lowQualityStory.courseId,
    catalog.policy,
  ).issues.join("\n");
  assert.match(lowQualityIssues, /교과서식 번호 나열/u);
  assert.match(lowQualityIssues, /상투적인 자동 문구/u);

  for (const mutation of [
    (story) => { story.title = `[침착하게] ${story.title}`; },
    (story) => { story.openingQuestion = `[침착하게] ${story.openingQuestion}`; },
    (story) => { story.scenes[0].title = `[침착하게] ${story.scenes[0].title}`; },
    (story) => { story.scenes[0].subtitle = `[침착하게] ${story.scenes[0].subtitle}`; },
    (story) => { story.scenes[0].narration = `[침착하게] ${story.scenes[0].narration}`; },
  ]) {
    const leakedStory = structuredClone(authorityStory);
    mutation(leakedStory);
    assert.match(
      validateStory(leakedStory, leakedStory.courseId, catalog.policy).issues.join("\n"),
      /학생 (?:projection 상단|화면) 문구에 studio 태그/u,
    );
  }

  const representativeStory = toStudentCurriculumStory(
    [...catalog.publishedStoryByKey.values()][0],
  );
  const partialPath = path.join(root, "views", "partials", "curriculum-story-timeline.ejs");
  const html = await ejs.renderFile(partialPath, {
    curriculumStory: { story: representativeStory, status: "published" },
    curriculumNarrationScope: "0123456789abcdef",
  });
  assert.match(html, /풀이 기억선/u);
  assert.match(html, /data-memory-kind="misconception"/u);
  assert.match(html, /해설 원문 읽기/u);
  assert.doesNotMatch(html, /studioScript/u);
  assert.doesNotMatch(html, /\[(?:침착하게|따뜻하게|궁금한 듯|강조해서|낮은 목소리로|아쉬운 듯)\]/u);
  assert.doesNotMatch(html, /(?:1단계|2단계|STEP\s*0?1)/iu);
  assert.match(html, /data-checkpoint-scope="0123456789abcdef"/u);
  assert.ok(
    [...catalog.rawStoryByKey.values()].some((story) =>
      story.scenes.some((scene) => scene.studioScript.startsWith("[침착하게]")),
    ),
    "사용자가 요청한 [침착하게] 편집 alias가 실제 원고에 있어야 합니다.",
  );

  const missingHtml = await ejs.renderFile(partialPath, {
    curriculumStory: { story: null, status: "missing" },
  });
  assert.match(missingHtml, /자동으로 만든 해설을 보여주지 않습니다/u);
  assert.match(missingHtml, /기존 개념 학습은 그대로 이어갈 수 있습니다/u);

  const chunks = narration.buildNarrationChunks(representativeStory);
  assert.ok(chunks.length >= 15);
  assert.ok(chunks.every((chunk) => chunk.text.length <= 180));
  assert.equal(
    narration.curriculumNarrationCheckpointKey(representativeStory, "0123456789abcdef"),
    `matths.curriculumNarration.0123456789abcdef.${representativeStory.id}.r${representativeStory.revision}`,
  );
  assert.notEqual(
    narration.curriculumNarrationCheckpointKey(representativeStory, "0123456789abcdef"),
    narration.curriculumNarrationCheckpointKey(representativeStory, "fedcba9876543210"),
  );
  assert.notEqual(
    narration.curriculumNarrationCheckpointKey(representativeStory, "0123456789abcdef"),
    narration.curriculumNarrationCheckpointKey(
      { ...representativeStory, revision: representativeStory.revision + 1 },
      "0123456789abcdef",
    ),
  );

  const storage = new MemoryStorage();
  const firstProvider = new FakeSpeechProvider();
  const store = new narration.NarrationCheckpointStore(storage, "checkpoint");
  const firstSession = new narration.CurriculumNarrationSession({
    story: representativeStory,
    provider: firstProvider,
    checkpointStore: store,
  });
  firstSession.start();
  assert.equal(firstSession.snapshot().state, "playing");
  assert.equal(firstSession.snapshot().index, 0);
  firstProvider.finish();
  assert.equal(firstSession.snapshot().index, 1);
  firstSession.pause();
  assert.equal(firstSession.snapshot().state, "paused");

  // 새 페이지/세션은 완료한 문장 다음 경계부터 재개한다.
  const secondProvider = new FakeSpeechProvider();
  const secondSession = new narration.CurriculumNarrationSession({
    story: representativeStory,
    provider: secondProvider,
    checkpointStore: store,
  });
  assert.equal(secondSession.snapshot().index, 1);
  secondSession.start();
  assert.equal(secondProvider.spoken[0], chunks[1].text);
  secondSession.dispose();

  // stop/restart 뒤 provider가 예전 callback을 늦게 보내도 새 재생을 건너뛰면 안 된다.
  // server-backed audio adapter는 네트워크/AVPlayer 종료 callback을 완전히 취소하지
  // 못할 수 있으므로 session이 재생 세대를 직접 판별해야 한다.
  const lateProvider = new FakeSpeechProvider();
  const lateSession = new narration.CurriculumNarrationSession({
    story: representativeStory,
    provider: lateProvider,
    checkpointStore: new narration.NarrationCheckpointStore(
      new MemoryStorage(),
      "late-callback",
    ),
  });
  lateSession.start();
  const staleCallbacks = lateProvider.pending;
  lateSession.restart();
  const restartedCallbacks = lateProvider.pending;
  assert.notEqual(staleCallbacks, restartedCallbacks);
  staleCallbacks.onEnd();
  assert.equal(lateSession.snapshot().index, 0);
  assert.equal(lateSession.snapshot().chunk.text, chunks[0].text);
  restartedCallbacks.onEnd();
  assert.equal(lateSession.snapshot().index, 1);
  lateSession.dispose();

  // 브라우저가 native pause를 받아들이면 같은 utterance callback을 유지해 이어 간다.
  const resumableProvider = new FakeSpeechProvider();
  const resumableSession = new narration.CurriculumNarrationSession({
    story: representativeStory,
    provider: resumableProvider,
  });
  resumableSession.start();
  const resumedCallbacks = resumableProvider.pending;
  resumableSession.pause();
  resumableSession.start();
  assert.equal(resumableProvider.spoken.length, 1);
  assert.equal(resumableProvider.pending, resumedCallbacks);
  resumedCallbacks.onEnd();
  assert.equal(resumableSession.snapshot().index, 1);
  resumableSession.dispose();

  // pause를 지원하지 않는 provider는 예전 재생을 폐기하고 같은 문장을 새 요청으로 연다.
  const nonPausingProvider = new FakeSpeechProvider();
  nonPausingProvider.pause = () => false;
  const nonPausingSession = new narration.CurriculumNarrationSession({
    story: representativeStory,
    provider: nonPausingProvider,
  });
  nonPausingSession.start();
  const prePauseCallbacks = nonPausingProvider.pending;
  nonPausingSession.pause();
  nonPausingSession.start();
  const postPauseCallbacks = nonPausingProvider.pending;
  assert.equal(nonPausingProvider.spoken.length, 2);
  prePauseCallbacks.onEnd();
  assert.equal(nonPausingSession.snapshot().index, 0);
  postPauseCallbacks.onEnd();
  assert.equal(nonPausingSession.snapshot().index, 1);
  nonPausingSession.dispose();

  // provider factory는 UI를 바꾸지 않고 향후 server-backed ElevenLabs adapter를 주입한다.
  assert.equal(
    narration.createCurriculumSpeechProvider({
      kind: "elevenlabs-v3",
      providers: { "elevenlabs-v3": secondProvider },
    }),
    secondProvider,
  );

  // 브라우저의 음성 목록이 늦게 도착해도 voiceschanged 뒤 한국어 여성 음성을 고른다.
  let availableVoices = [];
  let voicesChanged;
  const utterances = [];
  const fakeSynthesis = {
    speaking: false,
    paused: false,
    getVoices: () => availableVoices,
    addEventListener: (_name, callback) => { voicesChanged = callback; },
    removeEventListener: () => {},
    cancel: () => {},
    speak: (utterance) => { utterances.push(utterance); },
    pause: () => {},
    resume: () => {},
  };
  class FakeUtterance {
    constructor(text) { this.text = text; }
  }
  const delayedSystemProvider = new narration.SystemSpeechProvider({
    speechSynthesis: fakeSynthesis,
    SpeechSynthesisUtterance: FakeUtterance,
  });
  const delayedSpeak = delayedSystemProvider.speak("안녕하세요.");
  assert.equal(utterances.length, 0);
  availableVoices = [
    { lang: "ko-KR", name: "Korean default", default: true },
    { lang: "ko-KR", name: "Yuna", default: false },
  ];
  voicesChanged();
  await delayedSpeak;
  assert.equal(utterances[0].voice.name, "Yuna");
  assert.equal(utterances[0].rate, narration.CALM_LECTURE_RATE);
  assert.equal(narration.CALM_LECTURE_RATE, 0.68);

  // 엔진이 종료 callback 없이 멈추면 현재 문장 checkpoint를 보존하고 재개 상태로 닫는다.
  let watchdogCallback;
  const stalledProvider = new FakeSpeechProvider();
  const stalledStore = new narration.NarrationCheckpointStore(new MemoryStorage(), "stall");
  const stalledSession = new narration.CurriculumNarrationSession({
    story: representativeStory,
    provider: stalledProvider,
    checkpointStore: stalledStore,
    setTimer(callback) { watchdogCallback = callback; return 1; },
    clearTimer() {},
  });
  stalledSession.start();
  watchdogCallback();
  assert.equal(stalledSession.snapshot().state, "paused");
  assert.match(stalledSession.snapshot().error, /현재 문장을 보존/u);
  assert.equal(stalledProvider.stopped, true);
  assert.equal(stalledStore.load(chunks.length), 0);

  const unitView = fs.readFileSync(path.join(root, "views", "unit-learning.ejs"), "utf8");
  const controller = fs.readFileSync(path.join(root, "controllers", "matthsController.js"), "utf8");
  assert.match(unitView, /partials\/curriculum-story-timeline/u);
  assert.match(unitView, /curriculum-narration\.js/u);
  assert.match(controller, /resolveStudentCurriculumStory/u);

  run(process.execPath, ["scripts/auditCurriculumStories.js", "--check"]);
  const releaseGate = spawnSync(
    process.execPath,
    ["scripts/auditCurriculumStories.js", "--require-complete"],
    { cwd: root, encoding: "utf8" },
  );
  if (indexedStoryCount === 220) {
    assert.equal(releaseGate.status, 0, `${releaseGate.stdout}\n${releaseGate.stderr}`);
    assert.match(releaseGate.stdout, /220\/220 published/u);
  } else {
    assert.equal(releaseGate.status, 1);
    assert.match(releaseGate.stderr, /release gate CLOSED/u);
  }
  console.log(
    `Curriculum story contract OK: ${indexedStoryCount} published, ${220 - indexedStoryCount} fail-closed editorial items.`,
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
