#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TIMELINE="$ROOT/Matths/CurriculumStoryTimeline.swift"
MOTION="$ROOT/Matths/CurriculumMotionLessonView.swift"
STORY="$ROOT/Matths/CurriculumStory.swift"
STORY_DATA="$ROOT/Matths/curriculum-stories/common-math-1.json"
STORY_DATA_2="$ROOT/Matths/curriculum-stories/common-math-2.json"
STORY_DATA_3="$ROOT/Matths/curriculum-stories/algebra.json"
STORY_DATA_4="$ROOT/Matths/curriculum-stories/calculus-1.json"
STORY_DATA_5="$ROOT/Matths/curriculum-stories/probability-statistics.json"
STORY_DATA_6="$ROOT/Matths/curriculum-stories/calculus-2.json"
GEOMETRY_DATA="$ROOT/Matths/curriculum-stories/geometry.json"
PRACTICAL_DATA="$ROOT/Matths/curriculum-stories/practical-statistics.json"
ECONOMICS_DATA="$ROOT/Matths/curriculum-stories/economics-math.json"
AI_DATA="$ROOT/Matths/curriculum-stories/ai-math.json"
CULTURE_DATA="$ROOT/Matths/curriculum-stories/math-and-culture.json"
RESEARCH_DATA="$ROOT/Matths/curriculum-stories/math-research-project.json"
VOCATIONAL_DATA="$ROOT/Matths/curriculum-stories/vocational-math.json"
CONCEPT="$ROOT/Matths/ConceptScreenV2.swift"
COACH="$ROOT/Matths/CoachEngine.swift"
APP="$ROOT/Matths/MatthsApp.swift"
SCREENS="$ROOT/Matths/Screens.swift"

grep -Fq 'concept: concept' "$CONCEPT"
grep -Fq 'CurriculumMotionLessonView(' "$TIMELINE"
grep -Fq 'visualizationIdeas: concept.visualizationIdeas' "$TIMELINE"
if grep -Fq 'DisclosureGroup(' "$TIMELINE"; then
  echo "full curriculum story timeline must not expose five textbook accordions" >&2
  exit 1
fi

grep -Fq '지금 볼 곳' "$MOTION"
grep -Fq 'pencil.tip' "$MOTION"
grep -Fq 'Color(red: 1, green: 0.89, blue: 0.48)' "$MOTION"
grep -Fq '순한맛으로 다시' "$MOTION"
grep -Fq '매운맛 핵심' "$MOTION"
grep -Fq 'misses >= 2' "$MOTION"
grep -Fq '지금 장면에서 가장 먼저 확인할 것은 무엇인가요?' "$MOTION"
grep -Fq 'CurriculumMotionCanvas' "$MOTION"
grep -Fq 'scene.motion' "$MOTION"
grep -Fq 'current.beats' "$MOTION"
grep -Fq 'Task.sleep(for: .milliseconds(currentBeat.durationMs))' "$MOTION"
grep -Fq 'guided-connect' "$MOTION"
grep -Fq 'guided-verify' "$MOTION"
grep -Fq '초점·준선' "$MOTION"
grep -Fq 'stripParticle' "$MOTION"
grep -Fq 'quoteWithParticle' "$MOTION"
if grep -Fq "‘\(focus)’과 연결된" "$MOTION"; then
  echo "guided motion must select Korean particles from the actual focus token" >&2
  exit 1
fi
grep -Fq 'guard !reduceMotion, beatIndex < current.beats.count - 1' "$MOTION"
if grep -Fq 'guard current.authored, !reduceMotion' "$MOTION"; then
  echo "generic curriculum scenes must animate three guided beats" >&2
  exit 1
fi
grep -Fq 'drawBeatCopy' "$MOTION"
grep -Fq 'sceneID: current.source.id' "$MOTION"
grep -Fq 'drawComplexPlane' "$MOTION"
grep -Fq 'drawIntersectionPlot' "$MOTION"
grep -Fq 'drawNumberLine' "$MOTION"
grep -Fq 'drawCountingTree' "$MOTION"
grep -Fq 'drawPermutationSlots' "$MOTION"
grep -Fq 'drawCombinationGroups' "$MOTION"
grep -Fq 'drawMatrixGrid' "$MOTION"
grep -Fq 'drawCoordinateGeometryScene' "$MOTION"
grep -Fq 'coordinateGeometrySceneIDs' "$MOTION"
grep -Fq 'drawSetsPropositionsScene' "$MOTION"
grep -Fq 'setsPropositionsSceneIDs' "$MOTION"
grep -Fq 'drawFunctionsGraphsScene' "$MOTION"
grep -Fq 'functionsGraphsSceneIDs' "$MOTION"
grep -Fq 'drawAlgebraPowerExponentScene' "$MOTION"
grep -Fq 'algebraPowerExponentSceneIDs' "$MOTION"
grep -Fq 'drawAlgebraLogFunctionScene' "$MOTION"
grep -Fq 'algebraLogFunctionSceneIDs' "$MOTION"
grep -Fq 'drawAlgebraTrigonometryScene' "$MOTION"
grep -Fq 'algebraTrigonometrySceneIDs' "$MOTION"
grep -Fq 'drawAlgebraSequenceScene' "$MOTION"
grep -Fq 'algebraSequenceSceneIDs' "$MOTION"
grep -Fq 'drawCalculusOneScene' "$MOTION"
grep -Fq 'calculusOneSceneIDs' "$MOTION"
grep -Fq 'drawCalculusLimitApproach' "$MOTION"
grep -Fq 'drawCalculusDerivativeDefinition' "$MOTION"
grep -Fq 'drawCalculusDerivativeGraph' "$MOTION"
grep -Fq 'drawCalculusAntiderivative' "$MOTION"
grep -Fq 'drawCalculusAccumulation' "$MOTION"
grep -Fq 'drawCalculusAreaMotion' "$MOTION"
grep -Fq 'drawProbabilityStatisticsScene' "$MOTION"
grep -Fq 'probabilityStatisticsSceneIDs' "$MOTION"
grep -Fq 'drawProbabilityCounting' "$MOTION"
grep -Fq 'drawProbabilitySets' "$MOTION"
grep -Fq 'drawProbabilityConditional' "$MOTION"
grep -Fq 'drawProbabilityDistribution' "$MOTION"
grep -Fq 'drawProbabilityNormal' "$MOTION"
grep -Fq 'drawProbabilityInference' "$MOTION"
grep -Fq 'drawGeometryCourseConic' "$MOTION"
grep -Fq 'drawGeometryCourseSpace' "$MOTION"
grep -Fq 'drawGeometryCourseVector' "$MOTION"
grep -Fq 'geometryCourseSceneIDs.contains(sceneID)' "$MOTION"
grep -Fq 'drawPracticalStatisticsScene' "$MOTION"
grep -Fq 'drawPracticalInquiry' "$MOTION"
grep -Fq 'drawPracticalDataDesign' "$MOTION"
grep -Fq 'drawPracticalDescriptive' "$MOTION"
grep -Fq 'drawPracticalDistribution' "$MOTION"
grep -Fq 'drawPracticalInterval' "$MOTION"
grep -Fq 'drawPracticalHypothesis' "$MOTION"
grep -Fq 'practicalStatisticsSceneIDs.contains(sceneID)' "$MOTION"
grep -Fq 'drawEconomicsMathScene' "$MOTION"
grep -Fq 'drawEconomicsFinance' "$MOTION"
grep -Fq 'drawEconomicsMarket' "$MOTION"
grep -Fq 'drawEconomicsLinearMatrix' "$MOTION"
grep -Fq 'drawEconomicsMarginal' "$MOTION"
grep -Fq 'economicsMathSceneIDs.contains(sceneID)' "$MOTION"
grep -Fq 'drawAiMathScene' "$MOTION"
grep -Fq 'drawAiLearning' "$MOTION"
grep -Fq 'drawAiText' "$MOTION"
grep -Fq 'drawAiImage' "$MOTION"
grep -Fq 'drawAiPrediction' "$MOTION"
grep -Fq 'drawAiInquiry' "$MOTION"
grep -Fq 'aiMathSceneIDs.contains(sceneID)' "$MOTION"
grep -Fq 'drawMathCultureScene' "$MOTION"
grep -Fq 'drawCultureArt' "$MOTION"
grep -Fq 'drawCultureLeisure' "$MOTION"
grep -Fq 'drawCultureSociety' "$MOTION"
grep -Fq 'drawCultureEnvironment' "$MOTION"
grep -Fq 'mathCultureSceneIDs.contains(sceneID)' "$MOTION"
grep -Fq 'drawMathResearchScene' "$MOTION"
grep -Fq 'drawResearchFoundation' "$MOTION"
grep -Fq 'drawResearchMethod' "$MOTION"
grep -Fq 'drawResearchExecution' "$MOTION"
grep -Fq 'mathResearchSceneIDs.contains(sceneID)' "$MOTION"
grep -Fq 'drawVocationalMathScene' "$MOTION"
grep -Fq 'drawVocationalNumber' "$MOTION"
grep -Fq 'drawVocationalRelation' "$MOTION"
grep -Fq 'drawVocationalGeometry' "$MOTION"
grep -Fq 'drawVocationalData' "$MOTION"
grep -Fq 'vocationalMathSceneIDs.contains(sceneID)' "$MOTION"
grep -Fq 'sceneID.hasPrefix("complex-")' "$MOTION"
grep -Fq 'sceneID.hasPrefix("simlinear-")' "$MOTION"
grep -Fq 'sceneID.hasPrefix("counting-")' "$MOTION"
grep -Fq 'sceneID.hasPrefix("permutation-")' "$MOTION"
grep -Fq 'sceneID.hasPrefix("combination-")' "$MOTION"
grep -Fq 'sceneID.hasPrefix("matrix-")' "$MOTION"
grep -Fq 'current.checkPrompt' "$MOTION"
grep -Fq 'case equation, blocks, graph, geometry, plot' "$MOTION"
grep -Fq '@Environment(\.accessibilityReduceMotion)' "$MOTION"
grep -Fq 'frame(maxWidth: .infinity, minHeight: 48)' "$MOTION"

grep -Fq 'struct CurriculumMotionDirective: Codable, Equatable' "$STORY"
grep -Fq 'issues.append(contentsOf: validateMotion(scene.motion))' "$STORY"
grep -Fq 'motion: scene.motion' "$STORY"
node - "$STORY_DATA" "$STORY_DATA_2" "$STORY_DATA_3" "$STORY_DATA_4" "$STORY_DATA_5" "$STORY_DATA_6" "$GEOMETRY_DATA" "$PRACTICAL_DATA" "$ECONOMICS_DATA" "$AI_DATA" "$CULTURE_DATA" "$RESEARCH_DATA" "$VOCATIONAL_DATA" "$MOTION" <<'NODE'
const assert = require("node:assert/strict");
const fs = require("node:fs");
const allStories = [
  ...require(process.argv[2]).stories,
  ...require(process.argv[3]).stories,
  ...require(process.argv[4]).stories,
  ...require(process.argv[5]).stories,
  ...require(process.argv[6]).stories,
  ...require(process.argv[7]).stories,
];
const geometryStories = require(process.argv[8]).stories;
const practicalStories = require(process.argv[9]).stories;
const economicsStories = require(process.argv[10]).stories;
const aiStories = require(process.argv[11]).stories;
const cultureStories = require(process.argv[12]).stories;
const researchStories = require(process.argv[13]).stories;
const vocationalStories = require(process.argv[14]).stories;
const motionSource = fs.readFileSync(process.argv[15], "utf8");
const geometrySceneIDs = geometryStories.flatMap((story) => story.scenes.map((scene) => scene.id));
assert.equal(geometryStories.length, 14);
assert.equal(geometrySceneIDs.length, 70);
for (const sceneID of geometrySceneIDs) {
  assert.ok(motionSource.includes(`"${sceneID}"`), `missing native geometry scene route: ${sceneID}`);
}
const practicalSceneIDs = practicalStories.flatMap((story) => story.scenes.map((scene) => scene.id));
assert.equal(practicalStories.length, 13);
assert.equal(practicalSceneIDs.length, 65);
for (const sceneID of practicalSceneIDs) {
  assert.ok(motionSource.includes(`"${sceneID}"`), `missing native practical statistics scene route: ${sceneID}`);
}
const economicsSceneIDs = economicsStories.flatMap((story) => story.scenes.map((scene) => scene.id));
assert.equal(economicsStories.length, 18);
assert.equal(economicsSceneIDs.length, 90);
for (const sceneID of economicsSceneIDs) {
  assert.ok(motionSource.includes(`"${sceneID}"`), `missing native economics math scene route: ${sceneID}`);
}
const aiSceneIDs = aiStories.flatMap((story) => story.scenes.map((scene) => scene.id));
assert.equal(aiStories.length, 15);
assert.equal(aiSceneIDs.length, 75);
for (const sceneID of aiSceneIDs) {
  assert.ok(motionSource.includes(`"${sceneID}"`), `missing native AI math scene route: ${sceneID}`);
}
const cultureSceneIDs = cultureStories.flatMap((story) => story.scenes.map((scene) => scene.id));
assert.equal(cultureStories.length, 16);
assert.equal(cultureSceneIDs.length, 80);
for (const sceneID of cultureSceneIDs) {
  assert.ok(motionSource.includes(`"${sceneID}"`), `missing native math-and-culture scene route: ${sceneID}`);
}
const researchSceneIDs = researchStories.flatMap((story) => story.scenes.map((scene) => scene.id));
assert.equal(researchStories.length, 10);
assert.equal(researchSceneIDs.length, 50);
for (const sceneID of researchSceneIDs) {
  assert.ok(motionSource.includes(`"${sceneID}"`), `missing native math-research scene route: ${sceneID}`);
}
const vocationalSceneIDs = vocationalStories.flatMap((story) => story.scenes.map((scene) => scene.id));
assert.equal(vocationalStories.length, 18);
assert.equal(vocationalSceneIDs.length, 90);
for (const sceneID of vocationalSceneIDs) {
  assert.ok(motionSource.includes(`"${sceneID}"`), `missing native vocational-math scene route: ${sceneID}`);
}
const algebraConcepts = new Set([
  "algebra-01-01", "algebra-01-02", "algebra-01-03", "algebra-01-04",
  "algebra-01-05", "algebra-01-06", "algebra-01-07", "algebra-01-08",
  "algebra-02-01", "algebra-02-02", "algebra-02-03",
  "algebra-03-01", "algebra-03-02", "algebra-03-03", "algebra-03-04",
  "algebra-03-05", "algebra-03-06", "algebra-03-07",
]);
const stories = allStories.filter((story) => [
  "polynomials",
  "equations-and-inequalities",
  "counting",
  "matrices",
  "coordinate-geometry",
  "sets-and-propositions",
  "functions-and-graphs",
].includes(story.unitId) || algebraConcepts.has(story.conceptId) || ["calculus-1", "calculus-2", "probability-statistics"].includes(story.courseId));
assert.deepEqual(stories.slice(0, 3).map((story) => story.conceptId), [
  "polynomial-arithmetic",
  "identity-remainder-theorem",
  "polynomial-factorization",
]);
assert.equal(stories.filter((story) => story.unitId === "polynomials").length, 3);
assert.equal(stories.filter((story) => story.unitId === "equations-and-inequalities").length, 11);
assert.equal(stories.filter((story) => story.courseId === "common-math-1" && story.unitId === "counting").length, 3);
assert.equal(stories.filter((story) => story.unitId === "matrices").length, 2);
assert.equal(stories.filter((story) => story.unitId === "coordinate-geometry").length, 7);
assert.equal(stories.filter((story) => story.unitId === "sets-and-propositions").length, 8);
assert.equal(stories.filter((story) => story.unitId === "functions-and-graphs").length, 5);
assert.equal(stories.filter((story) => algebraConcepts.has(story.conceptId)).length, 18);
assert.equal(stories.filter((story) => story.courseId === "calculus-1").length, 20);
assert.equal(stories.filter((story) => story.courseId === "calculus-2").length, 23);
assert.equal(stories.filter((story) => story.courseId === "probability-statistics").length, 16);
assert.equal(stories.length, 116);
assert.equal(stories.flatMap((story) => story.scenes).length, 580);
const authoredStories = [...stories, ...geometryStories, ...practicalStories, ...economicsStories, ...aiStories, ...cultureStories, ...researchStories, ...vocationalStories];
assert.equal(authoredStories.length, 220);
assert.equal(authoredStories.flatMap((story) => story.scenes).length, 1100);
for (const story of authoredStories) {
  for (const scene of story.scenes) {
    assert.equal(scene.motion.version, 1);
    assert.ok(scene.motion.beats.length >= 3);
    assert.equal(scene.motion.check.choices.length, 3);
    assert.ok(scene.motion.check.answerIndex >= 0 && scene.motion.check.answerIndex < 3);
  }
}
NODE

grep -Fq 'struct CoachGuidance: Equatable' "$COACH"
grep -Fq '관찰 ·' "$COACH"
grep -Fq '점검 순서 ·' "$COACH"
grep -Fq '다음 행동 ·' "$COACH"
grep -Fq 'diagnosticPlan' "$COACH"
grep -Fq 'submissionShape' "$COACH"
grep -Fq '분모를 전체가 아니라 조건이 주어진 표본공간' "$COACH"
grep -Fq '표준오차에서 표본크기의 제곱근' "$COACH"
grep -Fq '0/0 꼴이라 변형이 필요한지' "$COACH"
grep -Fq '위 함수 − 아래 함수' "$COACH"
grep -Fq '학생의 실제 사고 원인을 단정하지 않는다' "$COACH"
grep -Fq 'coachGuidance = coach.guidance' "$APP"
grep -Fq 'CoachGuidanceRow' "$SCREENS"
if grep -Eq 'CoachBubble\(line:' "$SCREENS"; then
  echo "result screen must not center a random coach line" >&2
  exit 1
fi

for arena_file in \
  "$ROOT/Matths/ArenaMatchView.swift" \
  "$ROOT/Matths/ArenaShopScreen.swift"; do
  if [[ -f "$arena_file" ]] && ! git -C "$ROOT" diff --quiet -- "$arena_file"; then
    echo "Arena product file changed: $arena_file" >&2
    exit 1
  fi
done

echo "Curriculum motion lesson and diagnostic coach contract passed."
