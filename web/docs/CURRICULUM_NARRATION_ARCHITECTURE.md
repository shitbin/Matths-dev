# 커리큘럼 기억선·음성 해설 아키텍처

## 결정

기존 220개 lesson의 짧은 요약과 단계 목록은 그대로 둔다. 5분 해설은 별도 `MATTHS_CURRICULUM_STORY_V1` 정본에서만 제공하며, 검수 기준을 통과한 `published` concept만 학생 UI에 연다. 누락·draft·invalid concept는 자동 문장으로 채우지 않고 편집 대기열에 남긴다.

학생이 보는 한 story는 다음 다섯 장면을 하나의 ‘풀이 기억선’으로 잇는다.

- 직관: 문제를 수식보다 먼저 떠올릴 장면
- 질문: 판단을 시작하게 하는 질문
- 오개념: 자주 틀리는 갈림길과 이유
- 풀이 리듬: 계산 순서가 아니라 판단과 검산의 흐름
- 회상: 다음 문제에서 스스로 꺼낼 짧은 질문

화면에는 `title`, `openingQuestion`, 장면별 `subtitle`과 `narration`만 전달한다. `studioScript`, 편집 근거, provider 정책은 학생 DOM과 앱 뷰 모델에서 제거한다.

## 콘텐츠 경계

- `content_folder/curriculum-story-policy.json`: 과목, 음성 provider, 편집 품질 계약
- `content_folder/curriculum-stories/<courseId>.json`: 과목별 집필 shard. 서로 다른 과목을 병렬 집필해도 같은 파일을 건드리지 않는다.
- `content_folder/curriculum-stories-index.json`: shard SHA-256·concept ID·건수를 기록한 generated index
- `docs/CURRICULUM_STORY_EDITORIAL_QUEUE.md`: 220개 기준의 누락·invalid 편집 대기열

`scripts/printCurriculumStoryTemplate.js`는 성취기준·기존 요약·시각화 아이디어를 집필 근거로 묶은 빈 틀만 출력한다. narration을 자동 작성하지 않는다. `scripts/buildCurriculumStoryIndex.js`와 `scripts/auditCurriculumStories.js`가 중복 ID, 상투 문구, 단계 번호형 화면 카피, 분량, 장면 누락, 태그 누출, stale index를 차단한다.

## 음성 provider 경계

기본 provider는 기기의 시스템 TTS다. 웹은 Web Speech API에서 한국어 여성 음성 이름을 우선 선택하고, 브라우저가 gender 메타데이터를 제공하지 않으면 기본 한국어 음성으로 후퇴한다. iPad는 `AVSpeechSynthesisVoice.gender == .female`인 `ko-KR` 음성을 우선 선택한다.

재생기는 provider가 문장을 읽는 방법을 알지 못한다. 정규화된 문장 chunk, 완료·오류 callback, pause·resume·stop만 주고받는다. 현재 문장 시작점을 concept별 checkpoint로 저장해 앱이나 페이지가 중단되면 해당 문장 경계부터 이어간다. 학생용 시스템 TTS에는 태그 없는 `narration`만 넣는다.

향후 ElevenLabs로 교체할 때는 클라이언트에 API 키를 넣지 않는다. first-party 서버에서 `studioScript`를 읽어 사전 생성한 오디오 또는 짧은 수명의 서명 URL을 provider adapter로 전달한다. UI와 playback session은 그대로 유지한다.

Eleven v3는 감정·전달 방식을 대괄호 audio tag로 제어하지만, 선택한 voice에 따라 효과가 달라진다. v3는 SSML break를 지원하지 않으므로 pause는 문장부호와 텍스트 구조로 조정한다. 편집자는 `[침착하게]`, `[따뜻하게]`, `[궁금한 듯]`, `[강조해서]`, `[낮은 목소리로]`, `[아쉬운 듯]`처럼 한국어 alias만 쓴다. compiler가 provider 전송 직전에 공식 예시의 `[warmly]`, `[curious]`, `[excited]`, `[whispers]`, `[sighs]`로 바꾼다. 태그를 제거한 studioScript는 narration과 정확히 같아야 한다. 근거: [ElevenLabs Text to Speech best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices).

## 실패 방식

한 concept의 story가 누락되거나 검수에 실패해도 기존 개념 설명·시각 학습·연습 문제는 계속 제공한다. 해당 기억선만 ‘편집 중’으로 닫는다. index 전체를 읽지 못한 경우에도 임의 fallback narration을 만들지 않는다. 이 범위는 읽기 전용 콘텐츠와 기기 음성 재생이며 운영 DB write를 추가하지 않는다.

## 출시 게이트

대표 concept 3개의 기반 구현은 전체 완료가 아니다. 전체 완료는 다음 조건을 모두 만족할 때만 선언한다.

- 13과목 220개 concept가 모두 published
- 편집 대기·orphan·invalid·shard/index 오류 0
- student DOM과 iPad UI의 studio tag 노출 0
- 모든 narration이 문장 chunk 상한과 5분 분량 계약 통과
- 시스템 TTS 중단·재개와 provider 교체 계약 통과
- 수학 편집 검수 완료

`npm run curriculum:story:release-gate`는 위 조건을 기계적으로 확인한다. foundation 단계인 현재는 의도적으로 실패한다.
