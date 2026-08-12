# Toss Payments · Cafe24 적용 안내

## 현재 상태

- 결제 코드는 기본적으로 닫혀 있다.
- 아래 네 환경변수가 모두 올바른 경우에만 본인·학부모 카드 결제가 열린다.
- 운영 키가 없거나 운영 주소가 HTTPS가 아니면 CheckoutIntent도 생성하지 않는다.
- 카드번호와 인증정보는 Toss Payments 화면에서만 입력하며 Matths 서버에 저장하지 않는다.

## Cafe24 환경변수

```text
PAYMENT_CHECKOUT_ENABLED=false
TOSS_CLIENT_KEY=<Toss 운영 클라이언트 키>
TOSS_SECRET_KEY=<Toss 운영 시크릿 키>
PUBLIC_BASE_URL=https://matths.kr
```

처음 배포할 때는 반드시 `PAYMENT_CHECKOUT_ENABLED=false`로 둔다. Toss 개발자센터의 테스트 키로 운영 복제 환경에서 승인·취소·중복 웹훅을 검증한 뒤에만 운영 키를 넣고 `true`로 바꾼다.

## Toss 개발자센터 등록값

- 성공 주소: `https://matths.kr/payments/toss/success`
- 실패 주소: `https://matths.kr/payments/toss/fail`
- 결제 상태 웹훅: `https://matths.kr/webhooks/toss-payments`
- 웹훅 이벤트: `PAYMENT_STATUS_CHANGED`

Toss 카드 결제 웹훅은 일반 서명 헤더에 의존하지 않는다. Matths는 웹훅의 `orderId`로 Toss 서버 API를 다시 조회하고, 서버가 보관한 주문 ID·금액·통화·`DONE` 상태·payment key가 모두 일치할 때만 이용권을 지급한다.

## 배포 전 필수 확인

1. `npm test` 전체 통과.
2. 테스트 키로 5,000원 모의고사 이용권 1건 승인 후 30일 권한 확인.
3. 테스트 키로 29,000원 학습권 1건 승인 후 새 AccessCycle·배치 상태 확인.
4. 성공 주소 새로고침과 같은 웹훅 재전송에서 이용권이 한 번만 생기는지 확인.
5. 브라우저 금액을 변조하면 Toss 승인 API를 호출하기 전에 거절되는지 확인.
6. 취소·실패 결제에서 어떤 권한도 생기지 않는지 확인.
7. Cafe24 로그에 client key 외 secret key, payment key, 카드번호, 웹훅 본문이 남지 않는지 확인.

## 운영 증거 세션

테스트 통과와 실제 운영 동작은 별개다. 운영 거래를 수행할 권한과 환불 절차가 준비된 뒤 아래
템플릿을 먼저 만든다. 이 명령은 결제하거나 DB를 수정하지 않는다.

```sh
npm run payment:evidence -- --write-template ../evidence/payment/session.json
```

`session.json`에는 거래 식별자·주문 ID·payment key·카드번호·이메일·이름을 적지 않는다.
영수증과 영상도 해당 값이 보이지 않게 가린 사본만 증거 폴더에 둔다. 각 파일의 SHA-256을
기록한 뒤 검증한다.

```sh
npm run payment:evidence -- \
  ../evidence/payment/session.json \
  --output ../evidence/payment/payment-production-evidence.json
```

운영 증거는 `https://matths.kr`과 Toss `live` 환경만 인정한다. 테스트 키 결과를 운영 거래로
표시하면 실패한다. 다음 11개가 모두 필요하다.

1. 미성년 학생에게 법정대리인 고지가 먼저 표시됨
2. 학생의 고지 확인 기록이 한 번 저장됨
3. 보호자 주문이 선택한 자녀 계정과 연결됨
4. 보호자의 법정대리인 동의가 결제 전에 기록됨
5. Toss 승인 금액과 서버 주문 금액이 정확히 일치함
6. 취소·실패 거래에서 권한이 생기지 않음
7. 브라우저 금액 변조가 Toss API 호출 전에 거절됨
8. 웹훅 수신 후 Toss 서버 재조회로 상태를 확인함
9. 같은 웹훅을 재전송해도 결과가 한 번만 반영됨
10. 학습권 또는 모의고사 권한이 정확히 한 번 지급됨
11. 결제 스위치를 끄면 새 학생·보호자 주문이 모두 닫힘

출력은 `MATTHS_PAYMENT_PRODUCTION_EVIDENCE_V1`이며 최종 출시 게이트의 Toss·학부모 동의
두 항목이 직접 읽는다. 실제 운영 결제와 취소는 명시적 승인 없이 실행하지 않는다.

## 기존 CheckoutIntent TTL 인덱스

구버전 DB에는 `checkoutintents.expiresAt_1` TTL 인덱스가 남아 있을 수 있다. 새 코드는 승인 가능 시간 `expiresAt`과 감사 보존 시간 `recordRetainUntil`을 분리한다. 운영 적용 전 읽기 전용 인덱스 감사로 `expiresAt_1` 존재 여부를 확인하고, 백업·변경 승인 후에만 구 TTL 인덱스를 제거한다. 이 저장소 작업에서는 운영 DB를 수정하지 않는다.

## 롤백

1. Cafe24에서 `PAYMENT_CHECKOUT_ENABLED=false`로 변경한다. 이 한 단계로 새 결제 요청과 학부모 결제 요청이 즉시 닫힌다.
2. 이미 Toss에서 승인된 거래는 삭제하거나 임의 환불하지 않는다. 결제사 콘솔과 Matths 승인 원장을 대조한 뒤 정식 취소 절차를 사용한다.
3. 코드 롤백은 `git revert`로 수행하고 운영 DB 문서는 별도 승인 없이 삭제하지 않는다.

## 공식 참고

- https://docs.tosspayments.com/sdk/v2/js
- https://docs.tosspayments.com/reference/using-api/authorization
- https://docs.tosspayments.com/reference/using-api/webhook-events
- https://docs.tosspayments.com/en/webhooks
