const express = require('express');
const server = express();
const path = require('path');
const session = require('express-session');
const {
    MongoSessionStore,
} = require("./services/mongoSessionStore");
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
// config.env 는 **로컬 전용**이다. 배포 서버에는 그 파일이 없고, 값은 호스팅
// 대시보드의 환경변수로 들어온다. 예전처럼 무조건 읽으면 파일이 없을 때
// dotenv 가 조용히 아무것도 안 하고, 왜 값이 비었는지 원격에서 찾게 된다.
// 있으면 읽고, 없으면 실제 환경변수를 그대로 쓴다 — 둘 다 정상 경로다.
const envPath = path.join(__dirname, 'config.env');
if (fs.existsSync(envPath)) {
    dotenv.config({path: envPath});
}
const isProduction = process.env.NODE_ENV === 'production';
const {
    getCoachView,
} = require("./services/coachMessageService");
const {
    startCycleAttendanceOutboxWorker,
} = require("./services/cycleAttendanceOutboxService");
const {
    startArenaTakeoverOutboxWorker,
} = require("./services/arenaTakeoverOutboxService");
const {
    startArenaMatchScoringOutboxWorker,
} = require("./services/arenaMatchScoringOutboxService");
const {
    startArenaAttemptDeadlineWorker,
} = require("./services/arenaAttemptDeadlineService");
const {
    errorHandler,
    notFoundHandler,
} = require("./middleware/errorMiddleware");
const {
    arenaPublicText,
} = require("./services/arenaPublicTerminologyService");

let cycleAttendanceOutboxWorker = null;
let arenaTakeoverOutboxWorker = null;
let arenaMatchScoringOutboxWorker = null;
let arenaAttemptDeadlineWorker = null;

server.use(express.static("public"));
server.set('view engine', 'ejs');
// Toss 웹훅은 원문 Buffer를 provider API 재확인 기록에 사용하므로 전역 JSON
// 파서보다 반드시 먼저 받는다. 이 경로 밖의 요청에는 raw parser가 적용되지 않는다.
server.use(require("./routes/toss-payments-routes"));
server.use(express.urlencoded({extended:true}));
server.use(express.json());

// 실기 연결 확인용 개발 로그다. 쿼리·본문·인증값은 남기지 않고
// 메서드, 경로, 상태, 접속 주소, 처리 시간만 기록한다.
if (
    !isProduction &&
    process.env.LOG_API_REQUESTS === '1'
) {
    server.use((req, res, next) => {
        const startedAt =
            process.hrtime.bigint();

        res.once('finish', () => {
            if (
                !req.originalUrl.startsWith('/api/')
            ) {
                return;
            }

            const elapsedMilliseconds =
                Number(
                    process.hrtime.bigint() -
                    startedAt
                ) / 1_000_000;
            const remoteAddress =
                req.socket.remoteAddress ||
                'unknown';

            console.log(
                `[api] ${req.method} ${req.path} ` +
                `${res.statusCode} ${remoteAddress} ` +
                `${elapsedMilliseconds.toFixed(1)}ms`
            );
        });

        next();
    });
}

const secret = process.env.SECRET;
// Render·Fly 같은 곳은 TLS 를 앞단에서 끊고 평문으로 넘긴다. 이걸 안 알려주면
// express 가 요청을 http 로 보고 secure 쿠키를 **아예 내려보내지 않아**
// 로그인이 되는데 세션이 안 붙는 상태가 된다 — 원격에서 잡기 고약한 증상이다.
if (isProduction) {
    server.set("trust proxy", 1);
}
const sessionTtlSeconds = Math.max(
    300,
    Number(process.env.SESSION_TTL_SECONDS) || 7 * 24 * 60 * 60
);
server.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: false,
    store: new MongoSessionStore({
        ttlSeconds: sessionTtlSeconds,
    }),
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        maxAge: sessionTtlSeconds * 1000,
    },
}));
server.use((req, res, next) => {
    res.locals.user = req.session?.user || null;
    res.locals.arenaPublicText = arenaPublicText;
    res.locals.coach = getCoachView({
        mode:
            req.session?.user?.preferences
                ?.coachMode,
        situation: "unanswered",
        seed:
            req.session?.user?.id ||
            req.sessionID,
    });
    next();
});

const maathsRoutes = require('./routes/matths-routes');
const goatArenaRoutes = require("./routes/goat-arena-routes");
const apiRoutes = require("./routes/api-routes");
const parentRoutes = require("./routes/parent-routes");

server.use("/api/v1", apiRoutes);
server.use("/", parentRoutes);
server.use("/", goatArenaRoutes);
server.use("/", maathsRoutes);
server.use(notFoundHandler);
server.use(errorHandler);

async function connectDB() {
    try {
        await mongoose.connect(process.env.DB);
        console.log("MongoDB Connected Successfully");

        // 과거에는 서로 다른 두 AccessCycle 스키마가 같은 모델·컬렉션을
        // require 순서대로 가로챘다. 생명주기 문서를 별도 컬렉션으로 복사하지
        // 않은 운영 DB라면 조용히 빈 저장소로 시작하지 않고 읽기 전용 검사에서
        // 중단한다. 이전은 전용 dry-run 스크립트를 운영자가 명시 실행한다.
        const {
            assertAccessCycleLifecycleMigrationReady,
        } = require("./services/accessCycleModelAuthorityService");
        await assertAccessCycleLifecycleMigrationReady({
            db: mongoose.connection.db,
        });

        // 과거 중복 모델이 남긴 exact stale index 중 paymentOrderId_1은
        // 공식 지갑 문서의 missing 값을 같은 null로 취급해 production 쓰기를
        // 막을 수 있다. 운영은 fail-closed하고, 로컬 개발은 감사 결과만 경고해
        // 정리 도구를 명시 실행하기 전에도 UI 검증을 계속할 수 있게 한다.
        const {
            assertAuthorityIndexStartupReady,
        } = require("./services/authorityIndexCleanupService");
        const authorityIndexReport =
            await assertAuthorityIndexStartupReady({
                db: mongoose.connection.db,
                isProduction,
            });
        if (
            !isProduction &&
            (
                authorityIndexReport.blockingIndexCount > 0 ||
                !authorityIndexReport.safeToApply
            )
        ) {
            console.warn(
                "개발 DB에 공식 모델 authority index 정리가 필요합니다. " +
                "npm run db-authority-indexes:audit 결과를 확인하세요."
            );
        }

        const {
            ensureMatchmakingControl,
        } = require("./services/arenaMatchmakingControlService");
        await ensureMatchmakingControl();

        const {
            ensureDefaultMockExamPackagePolicy,
        } = require("./services/mockExamPackageService");
        await ensureDefaultMockExamPackagePolicy();

        const {
            ensureDefaultLearningPackagePolicy,
            ensureFullAttendanceLearningPackagePolicy,
        } = require("./services/arenaPolicyService");
        await ensureDefaultLearningPackagePolicy();
        await ensureFullAttendanceLearningPackagePolicy();

        const {
            ensureDefaultArenaProblemDataVersion,
            ensureArenaProblemDataIndexes,
            startArenaProblemDataVersionWatcher,
        } = require("./services/arenaProblemDataService");
        await ensureArenaProblemDataIndexes();
        await ensureDefaultArenaProblemDataVersion();
        startArenaProblemDataVersionWatcher();

        const {
            syncProblemTypeRegistry,
        } = require("./services/problemTypeCatalogService");
        const problemTypeSync = await syncProblemTypeRegistry();
        console.log(
            `Problem type catalog ready: ${problemTypeSync.total} types (${problemTypeSync.inserted.length} new)`
        );

        const {
            ensureArenaTierCatalogIndexes,
            startArenaTierCatalogWatcher,
        } = require("./services/arenaTierQuestionCatalogService");
        await ensureArenaTierCatalogIndexes();
        startArenaTierCatalogWatcher();

        const {
            refreshCommunityCoachMessages,
        } = require("./services/coachSuggestionService");
        await refreshCommunityCoachMessages();

        const {
            startPrivateMockExamScheduler,
        } = require("./services/privateMockExamService");
        startPrivateMockExamScheduler();

        const {
            startAccessCycleScheduler,
        } = require("./services/accessCycleService");
        startAccessCycleScheduler();

        const {
            startDailyAccessCycleScheduler,
        } = require("./services/accessCycleDailyService");
        startDailyAccessCycleScheduler();

        const {
            startAccessCycleExpiryReminderScheduler,
        } = require("./services/accessCycleExpiryReminderService");
        startAccessCycleExpiryReminderScheduler();

        const {
            registerPolicyChangeOutboxHandler,
            startPolicyChangeNotificationScheduler,
        } = require("./services/policyChangeNotificationService");
        registerPolicyChangeOutboxHandler();
        startPolicyChangeNotificationScheduler();

        const {
            startArenaMatchAttemptScheduler,
        } = require("./services/arenaMatchAttemptService");
        startArenaMatchAttemptScheduler();

        const {
            startArenaEvidenceRetentionScheduler,
        } = require("./services/arenaMatchEvidenceService");
        startArenaEvidenceRetentionScheduler();

        const {
            startUserCloudUploadTempCleanupScheduler,
        } = require("./middleware/userCloudUploadStorage");
        startUserCloudUploadTempCleanupScheduler();

        const {
            cleanupStalePdfTemporaryFiles,
        } = require("./services/pdfWatermarkService");
        const pdfTempCleanup = await cleanupStalePdfTemporaryFiles();
        if (pdfTempCleanup.removedCount) {
            console.log(`Removed ${pdfTempCleanup.removedCount} stale PDF temporary files.`);
        }

        const {
            startArchiveTrashPurgeScheduler,
        } = require("./services/archiveService");
        startArchiveTrashPurgeScheduler();

        const {
            startDataAnalysisScheduler,
        } = require("./services/dataAnalysisAggregationService");
        startDataAnalysisScheduler();

        const {
            startArenaIntegrityRiskScheduler,
        } = require("./services/arenaIntegrityRiskService");
        startArenaIntegrityRiskScheduler();

        const {
            startArenaOutboxScheduler,
        } = require("./services/arenaOutboxService");
        const {
            registerArenaNotificationOutboxHandlers,
        } = require("./services/arenaNotificationService");
        const {
            registerFinalRankingOutboxHandlers,
        } = require("./services/finalRankingOutboxService");
        registerArenaNotificationOutboxHandlers();
        registerFinalRankingOutboxHandlers();
        startArenaOutboxScheduler();

        const {
            startParentAlertScheduler,
        } = require("./services/parentAlertService");
        startParentAlertScheduler();

        // iPad 동기화용 아웃박스/마감 워커 (우리 포크 신설 서비스 — 반드시 유지)
        cycleAttendanceOutboxWorker ||= startCycleAttendanceOutboxWorker();
        arenaTakeoverOutboxWorker ||= startArenaTakeoverOutboxWorker();
        arenaMatchScoringOutboxWorker ||= startArenaMatchScoringOutboxWorker();
        arenaAttemptDeadlineWorker ||= startArenaAttemptDeadlineWorker();
    } catch (error) {
        console.error("MongoDB Connection Failed:", error);
        process.exit(1);
    }
};

function startServer() {
    const port =
        Number(process.env.PORT) || 8000;
    const hostname =
        process.env.BIND_HOST || "0.0.0.0";

    server.listen(port, hostname, () => {
        console.log(
            `Server running at http://${hostname}:${port}/`
        );
    })
}

connectDB().then(startServer);
