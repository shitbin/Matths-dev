# 152차 롤백 — 교재 상품 상세 신뢰 표면

범위:

- `views/store-product.ejs`
- `views/pricing.ejs`
- `views/admin-store.ejs`
- `public/css/store.css`
- `tests/store-product-design.test.js`
- `scripts/run-tests.js`

변경 내용:

- 상품 표지가 없을 때 검은 면의 typed `MATTHS` 대신 밝은 면의 공식 Primary Identity를 표시한다.
- 과도하게 큰 상품 제목·검은 임시 표지를 일반 상품 정보 카드와 읽을 수 있는 설명 계층으로 바꾼다.
- 유료 구매가 닫힌 상품에서 고장 난 것처럼 보이는 비활성 버튼을 없애고 결제·주문이 발생하지 않는다는 상태와 안전한 다음 행동을 제공한다.
- 이용권·관리자 수험관의 장식용 영문 eyebrow를 사용자 한국어로 정리한다.

롤백:

1. 이 차수의 로컬 커밋을 `git revert <commit>`으로 되돌린다.
2. 이후 변경이 섞였으면 위 파일에서 이 차수 diff만 역적용한다.
3. `node tests/store-product-design.test.js`, `node tests/public-language-contract.test.js`, `npm run ui:verify`를 실행한다.

외부 영향:

- 상품·가격·결제·주문 서버 규칙과 DB, Cafe24, GitHub에는 쓰지 않았다.
