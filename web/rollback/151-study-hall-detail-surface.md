# 151차 롤백 — 수험관 상세·답안·관리자 표면

범위:

- `public/css/store.css`
- `public/css/study-hall-v2.css`
- `views/store-study.ejs`
- `tests/study-hall-design.test.js`

변경 내용:

- 수험관 상세 화면에도 목록과 같은 `study-hall-v2.css` 정본을 적용했다.
- 학습 카드·진행률·문항 번호·답 선택·제출 행동과 관리자 탭의 장식용 그라디언트를 단색 역할 색으로 교체했다.
- 카드 hover 이동 거리를 공통 `--motion-lift` 1px로 통일했다.
- 키보드 사용자가 답안을 고를 때 보이는 초점 표시와 최소 조작 영역을 보강했다.

롤백:

1. 이 차수의 로컬 커밋을 `git revert <commit>`으로 되돌린다.
2. 해당 차수 뒤 변경이 섞였으면 위 네 파일에서 이 커밋의 diff만 역적용한다.
3. `node tests/study-hall-design.test.js`, `npm run ui:verify`, `node scripts/run-tests.js --check`를 다시 실행한다.

외부 영향:

- 서버 API·DB·Cafe24·GitHub·결제 규칙은 변경하지 않았다.
