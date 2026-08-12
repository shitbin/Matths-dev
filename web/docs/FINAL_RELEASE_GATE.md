# Matths 최종 출시 게이트

`npm run release:gate`는 자동 테스트 통과와 실제 출시 완료를 구분한다. 외부 증거가 하나라도
없거나, 파일이 바뀌었거나, 웹 HEAD와 Cafe24 배포본이 다르면 실패한다.

## 증거 템플릿 만들기

```sh
npm run release:gate -- --write-template ../evidence/final/manifest.json
npm run release:gate -- --write-structured-templates ../evidence/final/structured
```

템플릿의 `PENDING`을 임의로 `PASS`로 바꾸는 것은 검증이 아니다. 각 항목은 실제 수행 시각,
검증자와 독립 증거 파일의 상대 경로·SHA-256을 함께 기록한다. 증거 폴더 밖 파일은 받지 않는다.

항목 이름에 맞는 증거 종류도 고정된다. 웹 5폭에는 screenshot manifest, 독립 디자인 승인에는
review report, iPad 실기에는 `MATTHS_IPAD_DEVICE_QA_EVIDENCE_V1`과 해당 시나리오, Google에는
운영 OAuth 보고서와 영상, KICE에는 PDF 권리 문서, Atlas에는 DB audit, App Store에는 ZIP/IPA
signed archive와 제출 영수증이 필요하다. JSON을 영상으로 이름만 바꾸거나 텍스트를 IPA로
표시해도 파일 헤더 검사에서 실패한다.

구조화 템플릿 네 개는 빈 파일을 PASS로 꾸미지 못하게 모두 `PENDING`으로 생성된다.
독립 디자인 검수는 `MATTHS_DESIGN_INDEPENDENT_REVIEW_V1`과 최종 웹/iPad 커밋,
Cafe24는 `MATTHS_CAFE24_DEPLOYMENT_RECEIPT_V1`과 운영 도메인·배포 커밋, Atlas는
`MATTHS_ATLAS_MIGRATION_EVIDENCE_V1`의 production apply·이전 건수·롤백 확인,
App Store는 `MATTHS_APP_STORE_SUBMISSION_RECEIPT_V1`의 Connect upload ID·최종 iPad
커밋을 요구한다. 실제 수행 전에는 `PASS`로 바꾸지 않는다.

Atlas 최종 증거는 사람이 PASS JSON을 직접 작성하지 않는다. 승인된 유지보수 창에서
생성한 migration apply 보고서, 권위 인덱스 cleanup apply 보고서, Atlas 백업 영수증,
격리 복구 리허설 영수증을 다음 명령으로 결합한다. 네 파일의 DB 대상 fingerprint와
두 apply 파일의 소스 커밋이 다르면 생성은 중단되며 기존 출력도 덮어쓰지 않는다.

```sh
npm run atlas:evidence -- \
  --migration-run evidence/atlas/migration-apply.json \
  --index-run evidence/atlas/index-cleanup-apply.json \
  --backup-receipt evidence/atlas/backup-receipt.json \
  --rollback-drill evidence/atlas/rollback-drill.json \
  --output evidence/atlas/atlas-migration-evidence.json
```

Cafe24 반영 뒤에는 후보 소스 또는 추출한 release 아카이브에서 아래 명령을 실행한다.
원격 fingerprint·홈 표식·공식 로고 SHA·공개 Google 시작 경로가 모두 맞을 때만 검증
보고서와 최종 게이트용 영수증이 함께 만들어진다.

```sh
npm run release:cafe24:verify -- \
  --base-url=https://matths.kr \
  --output=../evidence/final/cafe24-verification.json \
  --receipt-output=../evidence/final/cafe24-deployment-receipt.json
```

Toss와 학부모 동의에는 `MATTHS_PAYMENT_PRODUCTION_EVIDENCE_V1`이 필요하다. 운영 live 환경의
승인·취소·금액 변조 거절·웹훅 재조회/재전송·한 번만 지급·결제 닫힘과 미성년 고지·학생 확인·
보호자-자녀 연결·법정대리인 동의 시나리오를 각각 확인한다. 테스트 키 결과나 일부 시나리오만
있는 보고서는 PASS로 인정하지 않는다.

## 필요한 외부 증거

- 웹 4역할·54화면·5폭 캡처와 독립 디자인 승인
- Cafe24 배포 결과, 웹·iPad Google 로그인 왕복
- 서명된 iPad 설치, 평가 화면 보호, 배치고사·휘장, 9티어 성능
- 동일 계정 Arena 웹·iPad 경기, 커리큘럼·Pencil·수식·복구 실기
- VoiceOver·AX5·200% 확대·Reduce Motion, Split View·Stage Manager·키보드
- Toss 실제 거래, 법정대리인 동의, KICE 사용권, Atlas 적용·롤백, App Store 제출
- `vision3B` 비전 실기와 `deepseek7B` 추론 실기의 서로 다른 스키마·원본 JSONL,
  실측 데이터 기반 로컬 AI 파일럿 PASS

최종 manifest의 `candidate.webCommit`과 `candidate.ipadCommit`은 각각 현재 웹·iPad의
깨끗한 로컬 Git HEAD와 같아야 한다. App Store 감사 보고서는 같은 iPad commit에서 만든
`MATTHS_IPAD_RELEASE_AUDIT_V1`, `appStoreEligible:true`,
`app-store-distribution` 서명을 증명해야 한다. 감사 보고서의 `signedArchive.sha256`과
최종 manifest의 IPA SHA-256도 정확히 같아야 한다.

실행:

```sh
npm run release:gate -- \
  --evidence ../evidence/final/manifest.json \
  --output ../evidence/final/final-readiness.json
```

결과가 `MATTHS_FINAL_RELEASE_READINESS_V1 / PASS`일 때만 전체 완료로 판정한다. 이 도구는
Cafe24 업로드, 운영 DB 변경, App Store 제출을 수행하지 않는다.
