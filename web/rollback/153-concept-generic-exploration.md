# 153차 롤백 — 전용 시각화 없는 개념의 공통 탐색판

범위:

- `views/partials/concept-secondary-playground.ejs`
- `views/partials/basic-concept-experience.ejs`
- `views/unit-learning.ejs`
- `public/css/concept-experience.css`
- `tests/concept-learning-completeness.test.js`
- `scripts/run-tests.js`

변경 내용:

- 전용 시각화 키가 없는 개념의 `놀이터 준비 중` 화면을 실제 등록된 요약·학습 단계·핵심 정리를 읽는 공통 탐색판으로 교체했다.
- 모든 개념에 반복 노출되던 `전용 애니메이션 준비`·내부 `ConceptLesson` 문구를 학습 순서 재생 행동과 성취기준 안내로 바꿨다.
- 220개 seed의 고유 ID·요약·핵심 정리·최소 3단계와 미완성 문구 부재를 테스트로 고정했다.

롤백:

1. 이 차수의 로컬 커밋을 `git revert <commit>`으로 되돌린다.
2. 이후 변경이 섞였으면 위 파일에서 이 차수 diff만 역적용한다.
3. `node tests/concept-learning-completeness.test.js`, `node tests/curriculum-editorial-quality.test.js`, `npm run ui:verify`를 실행한다.

외부 영향:

- 교육과정 원본·DB seed·학습 진도 API·운영 DB·Cafe24·GitHub에는 쓰지 않았다.
