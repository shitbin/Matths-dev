# 로컬 환경 복구 레시피

작업 중 반복해서 막히는 세 가지 환경 문제의 원인과 해결법이다. 증상만 보고
제품 코드를 의심하기 전에 여기부터 확인한다.

---

## 1. 서버가 안 뜬다 — `Mongod internal error (fassert() failure)`

### 증상
`npm start` 가 `Starting the MongoMemoryServer Instance failed` 로 죽는다.
로그를 파고들면 `WiredTiger error ... error: 2` 와
`Failed to start up WiredTiger under any compatibility version` 가 보인다.

### 원인
로컬 개발 DB(`.matths-dev-db/`)가 체크포인트 도중 강제 종료돼 WiredTiger
메타데이터가 깨진 것이다. **제품 코드와 무관하다.** 서버 프로세스를 `kill`
할 때 자식 mongod 가 정리되기 전에 죽으면 발생한다.

### 확인
```bash
# lock 이 0바이트고 고아 mongod 가 없는데도 안 뜨면 메타데이터 손상이다
ls -l .matths-dev-db/mongod.lock
pgrep -fl mongod
```

### 복구 — 순서를 지켜라

**① 먼저 백업한다. `--repair` 는 되돌릴 수 없다.**

```bash
MATTHS_DB_BACKUP_ROOT="$(mktemp -d /private/tmp/matths-devdb-backup.XXXXXX)"
cp -a .matths-dev-db "$MATTHS_DB_BACKUP_ROOT/original"
```

실패한 `--repair` 는 데이터 디렉토리에 *불완전 repair* 마커를 남긴다. 그러면
그 뒤로는 **올바른 버전으로도 열리지 않는다**(`An incomplete repair has been
detected!`). 백업 없이 repair 부터 돌리면 복구 가능한 상태였어도 그 길이 닫힌다.

**② 데이터를 만든 것과 같은 mongod 버전으로 시도한다.**

`mongodb-memory-server` 가 내려받은 바이너리를 쓴다. 다른 버전(예: 다른 프로젝트에
번들된 mongod)으로 열면 다운그레이드가 되어 `Failed to start up WiredTiger under
any compatibility version` 이 나는데, 이건 손상 여부와 무관하게 뜨는 메시지라
원인을 오판하게 만든다.

바이너리는 환경에 따라 두 곳에 있고 **버전이 다르다**. 아무거나 쓰면 안 된다.

```bash
# 실행 가능한 실제 mongod 바이너리만 찾는다. mongod.lock은 후보가 아니다.
find "$HOME/Library/Application Support/MatthsDev" "$HOME/.cache/mongodb-binaries" \
     -type f -name mongod -perm -111 2>/dev/null

# 디렉토리명이나 캐시 이름을 버전으로 간주하지 말고 각 실행 파일 자체를 확인한다.
while IFS= read -r candidate; do
  printf '%s: ' "$candidate"
  "$candidate" --version | sed -n '1p'
done < <(find "$HOME/Library/Application Support/MatthsDev" \
               "$HOME/.cache/mongodb-binaries" \
               -type f -name mongod -perm -111 2>/dev/null)

# 후보의 실제 버전과 경로를 기록한다.
MATTHS_MONGOD="<확인할 실행 파일의 절대 경로>"
"$MATTHS_MONGOD" --version

# 매 후보는 원백업의 새 복제본에서만 시험한다. 실패한 복제본은 재사용하지 않는다.
MATTHS_REPAIR_TRIAL="$(mktemp -d /private/tmp/matths-devdb-repair.XXXXXX)"
cp -a "$MATTHS_DB_BACKUP_ROOT/original" "$MATTHS_REPAIR_TRIAL/db"
"$MATTHS_MONGOD" --dbpath "$MATTHS_REPAIR_TRIAL/db" --repair
```

프로젝트에 설치된 `mongodb-memory-server` 패키지 버전과 내려받은 `mongod` 버전은 같은
숫자라는 보장이 없다. 생성 버전을 모르면 높은 버전이나 낮은 버전을 임의로 정답이라고 가정하지 않는다.
각 후보를 **원백업에서 새로 만든 독립 복제본**에만 적용한다. 실패한 repair 복제본에
다른 버전을 이어서 실행하면 그 다음 결과도 신뢰할 수 없다. 성공한 후보는 버전과
로그를 기록한 뒤, 기존 `.matths-dev-db`를 별도 격리하고 그 복제본으로 교체한다.

**③ 그래도 안 살면 버리고 다시 만든다.**

`2: No such file or directory` 가 계속 나오면 메타데이터가 실제로 깨진 것이다
(2026-08-14 사례에서 올바른 버전·repair 이전 백업으로도 동일하게 실패함을 확인).
**이 DB 는 테스트 계정 전용이라 버려도 된다** — 문항 카탈로그는 기동 시
자동 재생성된다.

```bash
mv .matths-dev-db /private/tmp/matths-devdb-corrupt-$(date +%H%M%S)   # 원본 보존
npm start        # 새 DB 생성 + 카탈로그 자동 재적재(수치는 환경마다 다르다)
```

### 재시드 — 순서가 중요하다
`seedFocusedLaunchTestAccounts.js` 는 **관리자 계정이 이미 있어야** 돈다
(패키지 부여 이력을 기록할 admin 을 찾는다). 관리자부터 만든다.

```bash
DB="mongodb://127.0.0.1:27018/matths_dev?replicaSet=matths-dev-rs&directConnection=true"
ADMIN_EMAIL="<로컬 관리자 이메일>"

# 1) 관리자 부트스트랩 — 비밀번호는 생성해서 안전한 곳에 두고 파일에 남기지 않는다
DB="$DB" ADMIN_EMAIL="$ADMIN_EMAIL" ADMPW="<생성한 비밀번호>" node -e "
const mongoose=require('mongoose'); const bcrypt=require('bcrypt');
const { User } = require('./models/matthsModel');
(async()=>{ await mongoose.connect(process.env.DB);
  const email=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
  if (!email || !email.includes('@')) throw new Error('ADMIN_EMAIL required');
  const hash = await bcrypt.hash(process.env.ADMPW, 12);
  await User.findOneAndUpdate({ email },
    { \$set:{ email, name:'devadmin', nameNormalized:'devadmin',
      realName:'개발 관리자', passwordHash:hash, role:'admin', isActive:true,
      accountStatus:'active', schoolGrade:15, termsAcceptedAt:new Date() } },
    { upsert:true, setDefaultsOnInsert:true });
  await mongoose.disconnect(); })();"

# 2) 런치 테스트 계정(학생 14 + 학부모 1)
DB="$DB" node scripts/seedFocusedLaunchTestAccounts.js
# 결과 계정 목록: outputs/launch-focused-test-accounts.json

# 3) 캡처용 관리자·학부모 역할 계정이 필요하면
MATTHS_CAPTURE_SEED=local-only MATTHS_CAPTURE_SEED_PASSWORD="<10자 이상>" DB="$DB" \
  node scripts/seedLocalCaptureRoles.js
```

### 예방
서버를 끌 때 포트로 `kill` 하지 말고 포그라운드 프로세스에 `Ctrl-C`(SIGINT)를
준다. `scripts/start-server.js` 의 shutdown 훅이 mongod 를 정상 종료시킨다.

---

## 2. 화면 캡처가 20초 타임아웃으로 실패한다

### 증상
`scripts/captureExactViewport.js` 가 `Page.captureScreenshot CDP 응답 시간 초과`
로 죽는다. 타임아웃을 늘려도(180초로 시험함) 똑같이 죽는다.

### 원인
문서가 아주 긴 페이지(예: `/admin/operations-guide` 는 폭 768 에서 24,000px)를
`captureBeyondViewport` 로 **한 장의 거대 래스터**로 만들려다 headless Chrome 이
멈춘다. 문서 높이 자체가 원인이 아니다 — 폭 390 에서 31,649px 인 같은 페이지는
성공한다. **폭이 768 이상일 때 단일 캡처가 실패한다.**

### 해결 — 타일로 나눠 찍고 잇는다
`clip` 을 8,000px 단위로 끊어 여러 번 캡처한 뒤 세로로 붙인다. 합성 높이가
`document.scrollingElement.scrollHeight` 와 정확히 일치하는지 반드시 확인하고,
이음새 구간을 눈으로 본다.

### 주의
타임아웃을 늘리는 방향으로 시간을 쓰지 마라. 이미 실패한 접근이다.

---

## 3. 캡처가 로그인 화면으로 새어 나온다

### 증상
인증이 필요한 경로를 찍었는데 결과 PNG 가 `/login` 이다. 스크립트가 반환한
`documentUrl` 을 보면 로그인으로 리다이렉트돼 있다.

### 원인
캡처용 Chrome 프로필(`.profiles/<역할>`)의 세션 쿠키가 만료됐거나, 서버의
세션 서명 키(`SECRET`)가 바뀌어 기존 쿠키가 무효가 된 것이다. 세션 저장소
(`webSessions`)에 문서가 남아 있어도 쿠키 서명이 안 맞으면 로그인 상태가 아니다.

### 확인
```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  "http://127.0.0.1:8000/<보호된 경로>"
```

### 해결
프로필 안에서 폼 로그인을 수행해 쿠키를 다시 심는다. 프로필 디렉토리를 지정해
headless Chrome 을 띄우고, 페이지 컨텍스트에서 `fetch("/login", {method:"POST",
credentials:"include", ...})` 를 실행한 뒤 보호된 경로가 200 으로 열리는지
확인한다. 그다음 `Browser.close` 로 정상 종료해야 쿠키가 디스크에 flush 된다.

### 반드시 지킬 것
- 세션이 풀린 상태로 찍힌 PNG 는 **증거가 아니다. 즉시 지우고 다시 찍는다.**
  로그인 화면을 해당 경로의 캡처로 남기면 안 된다.
- 테스트 계정 비밀번호는 리포지토리·문서·로그 어디에도 남기지 않는다.

---

## 4. 공통 원칙

세 문제 모두 **제품 결함이 아니라 환경 문제**다. 증상을 코드 결함으로 등록하기
전에 이 문서를 확인하고, 여기 없는 새 환경 문제를 풀었으면 같은 형식으로
추가한다. 원인·확인·해결·예방 네 가지를 다 적는다.
