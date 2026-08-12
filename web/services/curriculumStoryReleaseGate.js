"use strict";

const EXPECTED_RELEASE_STORY_COUNT = 220;

function assertExactCurriculumStoryReleaseCount({
  authorityCount,
  completedCount,
  completedLabel,
}) {
  if (authorityCount !== EXPECTED_RELEASE_STORY_COUNT) {
    throw new Error(
      `2022 개정 커리큘럼 정본이 ${authorityCount}/${EXPECTED_RELEASE_STORY_COUNT}개입니다.`,
    );
  }
  if (completedCount !== EXPECTED_RELEASE_STORY_COUNT) {
    throw new Error(
      `${completedLabel}가 ${completedCount}/${EXPECTED_RELEASE_STORY_COUNT}개입니다.`,
    );
  }
}

module.exports = {
  EXPECTED_RELEASE_STORY_COUNT,
  assertExactCurriculumStoryReleaseCount,
};
