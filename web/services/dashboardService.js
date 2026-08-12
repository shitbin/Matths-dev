const {
    User,
    ConceptProgress,
    ConceptLesson,
    DailyPlan,
    ProblemAttempt,
    AssessmentAttempt,
    Announcement,
    UserNotification,
} = require("../models/matthsModel");
const {
    AccessCycle,
    ArenaAccessState,
    MainToSubConversionResult,
    MockExamSubscription,
} = require("../models/goatArenaModel");
const {
    ARENA_TIER_CONFIG,
    arenaTierByValue,
    arenaTierIndex,
} = require("./arenaTierPolicy");

const {
    loadCurriculum,
    buildLearningViewModel,
} = require("./curriculumService");
const {
    formatDashboardFormula,
} = require("./mathTextService");
const {
    getKoreanDateKey,
    getEffectiveStreak,
} = require("./userLifecycleService");
const {
    applyAssessmentGatesToLearningData,
} = require("./assessmentService");
const {
    getCoachView,
    MODES: COACH_MODES,
} = require("./coachMessageService");
const {
    getDashboardActivitySnapshot,
} = require("./dashboardActivityService");
const {
    canonicalProgressView,
} = require("./progressTypeIdService");

const ERROR_LABELS = {
    "calculation-error": "계산 과정에서 실수",
    "formula-confusion": "공식 적용에서 막힘",
    "missing-condition": "문제 조건을 놓침",
    "sign-error": "부호 계산에서 실수",
    "concept-not-understood": "핵심 개념 이해가 부족함",
    "prerequisite-missing": "선행 개념 복습이 필요함",
    unknown: "풀이 과정을 다시 확인해야 함",
};

function createCurriculumIndex(curriculumData) {
    const index = new Map();

    for (const course of curriculumData.courses || []) {
        for (const unit of course.units || []) {
            for (const concept of unit.concepts || []) {
                const key = [
                    course.id,
                    unit.id,
                    concept.id,
                ].join("/");

                index.set(key, {
                    course,
                    unit,
                    concept,
                });
            }
        }
    }

    return index;
}

function createProgressMap(progressDocuments) {
    const concepts = {};

    for (const progress of progressDocuments) {
        const normalized = canonicalProgressView(progress);
        const key = [
            progress.courseId,
            progress.unitId,
            progress.conceptId,
        ].join("/");

        concepts[key] = {
            percent: normalized.completionPercent,
            completedTopics: normalized.completedTopics,
        };
    }

    return { concepts };
}

function serializeDailyPlan(plan) {
    if (!plan) {
        return {
            id: null,
            tasks: [],
            completedCount: 0,
            totalCount: 0,
            progress: 0,
            message: "오늘의 학습 계획이 아직 없습니다.",
        };
    }

    const tasks = (plan.tasks || []).map((task) => ({
        id: String(task._id),
        kind: task.kind,
        title: task.title,
        description: task.description,
        href: task.href,
        estimatedMinutes: task.estimatedMinutes,
        status: task.status,
    }));

    const completedCount = tasks.filter(
        (task) => task.status === "completed"
    ).length;

    const totalCount = tasks.length;

    const progress = totalCount
        ? Math.round(
              (completedCount / totalCount) * 100
          )
        : 0;

    let message = plan.messages?.empty || "";

    if (
        completedCount > 0 &&
        completedCount < totalCount
    ) {
        message = plan.messages?.partial || "";
    }

    if (
        totalCount > 0 &&
        completedCount === totalCount
    ) {
        message = plan.messages?.complete || "";
    }

    return {
        id: String(plan._id),
        tasks,
        completedCount,
        totalCount,
        progress,
        message,
    };
}

async function getDashboardData(userId) {
    const user = await User.findById(userId).lean();

    if (!user) {
        const error = new Error(
            "사용자 정보를 찾을 수 없습니다."
        );

        error.status = 404;
        throw error;
    }

    const curriculumData = loadCurriculum();
    const curriculumIndex =
        createCurriculumIndex(curriculumData);

    // 계획과 활동 집계가 자정 경계에서 서로 다른 날을 보지 않게 한 시각을 쓴다.
    const dashboardNow = new Date();
    const todayKey =
        getKoreanDateKey(
            dashboardNow
        );

    const [
        progressDocuments,
        lessons,
        dailyPlan,
        dashboardActivitySnapshot,
        pendingReviewCount,
        recentWrongAttempts,
        assessmentAttempts,
        directNotifications,
        dashboardUrgentNotifications,
        announcements,
        dismissedAnnouncements,
        activeAccessCycle,
        arenaAccessState,
        latestMainToSubReference,
        activeMockExamSubscription,
    ] = await Promise.all([
        ConceptProgress.find({
            userId: user._id,
            curriculumId:
                curriculumData.curriculum?.id ||
                "kr-2022",
        })
            .sort({ lastStudiedAt: -1 })
            .lean(),

        ConceptLesson.find({
            curriculumId:
                curriculumData.curriculum?.id ||
                "kr-2022",
            isPublished: true,
        }).lean(),

        DailyPlan.findOne({
            userId: user._id,
            dateKey: todayKey,
        }).lean(),

        getDashboardActivitySnapshot(
            user._id,
            {
                now: dashboardNow,
            }
        ),

        ProblemAttempt.countDocuments({
            userId: user._id,
            isCorrect: false,
            "review.status": {
                $in: ["pending", "scheduled"],
            },
        }),

        ProblemAttempt.find({
            userId: user._id,
            isCorrect: false,
        })
            .sort({ submittedAt: -1 })
            .limit(3)
            .populate({
                path: "problemId",
                select: "stem score",
            })
            .lean(),

        AssessmentAttempt.find({
            userId: user._id,
            status: "submitted",
            passed: true,
        })
            .select(
                "scopeType courseId unitId subunitId passed scorePercent"
            )
            .lean(),

        UserNotification.find({
            userId: user._id,
            readAt: null,
        })
            .sort({ createdAt: -1 })
            .limit(8)
            .lean(),

        UserNotification.find({
            userId: user._id,
            kind: {
                $in: [
                    "warning",
                    "account",
                    "nickname",
                    "integrity",
                ],
            },
            dashboardDismissedAt: null,
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),

        Announcement.find({
            isPublished: true,
            publishedAt: {
                $ne: null,
            },
            $or: [
                {
                    dashboardEndsAt: null,
                },
                {
                    dashboardEndsAt: {
                        $gte: new Date(),
                    },
                },
            ],
        })
            .sort({ publishedAt: -1 })
            .limit(3)
            .lean(),

        UserNotification.find({
            userId: user._id,
            announcementId: {
                $ne: null,
            },
        })
            .select(
                "announcementId dashboardDismissedAt"
            )
            .lean(),

        AccessCycle.findOne({
            userId: user._id,
            status: "ACTIVE",
        }).lean(),

        ArenaAccessState.findOne({
            userId: user._id,
        }).lean(),

        MainToSubConversionResult.findOne({
            userId: user._id,
            snapshotValid: true,
            integrityStatus: "CLEAR",
        })
            .sort({ createdAt: -1 })
            .lean(),

        MockExamSubscription.findOne({
            userId: user._id,
            status: "ACTIVE",
            endsAt: { $gt: new Date() },
        })
            .sort({ endsAt: -1 })
            .lean(),
    ]);

    const lessonMap = new Map(
        lessons.map((lesson) => [
            [
                lesson.courseId,
                lesson.unitId,
                lesson.conceptId,
            ].join("/"),
            lesson,
        ])
    );

    const progressMap =
        createProgressMap(progressDocuments);

    const learningData =
        applyAssessmentGatesToLearningData(
            buildLearningViewModel(
                curriculumData,
                progressMap
            ),
            assessmentAttempts
        );

    const currentProgress =
        progressDocuments.find(
            (progress) =>
                progress.status === "in-progress"
        ) ||
        progressDocuments.find(
            (progress) =>
                progress.status !== "completed"
        ) ||
        progressDocuments[0];

    let currentKey = currentProgress
        ? [
              currentProgress.courseId,
              currentProgress.unitId,
              currentProgress.conceptId,
          ].join("/")
        : null;

    if (!currentKey && lessons.length) {
        currentKey = [
            lessons[0].courseId,
            lessons[0].unitId,
            lessons[0].conceptId,
        ].join("/");
    }

    const currentMetadata = currentKey
        ? curriculumIndex.get(currentKey)
        : null;

    const currentLesson = currentKey
        ? lessonMap.get(currentKey)
        : null;

    const lessonSteps =
        currentLesson?.steps || [];

    const selectedStepIndex = Math.min(
        Math.max(
            0,
            Number(currentProgress?.completedTopics) || 0
        ),
        Math.max(lessonSteps.length - 1, 0)
    );

    const selectedStep =
        lessonSteps[selectedStepIndex] || null;

    const currentLearning = currentMetadata
        ? {
              courseTitle:
                  currentMetadata.course.officialTitle,

              unitTitle:
                  currentMetadata.unit.title,

              conceptTitle:
                  currentMetadata.concept.title,

              standardCode:
                  currentMetadata.concept.standardCode,

              progress:
                  currentProgress?.completionPercent ||
                  0,

              href: `/learn/${currentMetadata.course.id}/${currentMetadata.unit.id}/${currentMetadata.concept.id}`,

              estimatedMinutes:
                  currentLesson?.estimatedMinutes ||
                  null,

              stepTitle:
                  selectedStep?.title || null,

              stepLabel: lessonSteps.length
                  ? `STEP ${selectedStepIndex + 1} / ${lessonSteps.length}`
                  : null,

              preview:
                  currentLesson?.dashboardPreview
                      ? {
                            ...currentLesson.dashboardPreview,
                            formula:
                                formatDashboardFormula(
                                    currentLesson
                                        .dashboardPreview
                                        .formula
                                ),
                        }
                      : null,
          }
        : null;

    const dashboardActivity =
        dashboardActivitySnapshot.activity;
    const webCorrectRateDetail =
        dashboardActivity.stats.correctRateDetail.replace(
            /%$/,
            "%p"
        );

    const weakConcepts = progressDocuments
        .filter(
            (progress) =>
                progress.signals?.totalAttempts > 0
        )
        .map((progress) => {
            const key = [
                progress.courseId,
                progress.unitId,
                progress.conceptId,
            ].join("/");

            const metadata =
                curriculumIndex.get(key);

            const totalAttempts =
                progress.signals.totalAttempts;

            const correctAttempts =
                progress.signals.correctAttempts || 0;

            const accuracy = totalAttempts
                ? Math.round(
                      (correctAttempts /
                          totalAttempts) *
                          100
                  )
                : Math.round(
                      (progress.masteryProbability ||
                          0) * 100
                  );

            return {
                title:
                    metadata?.concept.title ||
                    progress.conceptId,

                unitTitle:
                    metadata?.unit.title ||
                    progress.unitId,

                accuracy,

                href: `/learn/${progress.courseId}/${progress.unitId}/${progress.conceptId}`,
            };
        })
        .sort(
            (left, right) =>
                left.accuracy - right.accuracy
        )
        .slice(0, 3)
        .map((concept, index) => ({
            ...concept,
            rank: index + 1,

            urgency:
                concept.accuracy < 50
                    ? "urgent"
                    : "normal",

            statusText:
                concept.accuracy < 50
                    ? "집중 복습"
                    : concept.accuracy < 70
                        ? "복습 필요"
                        : "한 번 더",
        }));

    const recentWrongAnswers =
        recentWrongAttempts.map((attempt) => ({
            id: String(attempt._id),

            score:
                attempt.maxScore ||
                attempt.problemId?.score ||
                0,

            stem:
                attempt.problemId?.stem ||
                "삭제된 문제",

            reason:
                ERROR_LABELS[
                    attempt.errorAnalysis
                        ?.errorType
                ] || ERROR_LABELS.unknown,

            href: `/learn/${attempt.courseId}/${attempt.unitId}/${attempt.conceptId}`,
        }));

    const curriculumCourses =
        learningData.courses.map((course) => ({
            id: course.id,
            title: course.officialTitle,
            semester: course.defaultSemester,
            completedConcepts:
                course.completedConcepts,
            totalConcepts:
                course.totalConcepts,
            progress: course.progress,
        }));

    const todayPlan =
        serializeDailyPlan(dailyPlan);

    const coachMode =
        user.preferences?.coachMode ||
        "spicy";

    const coachSituation =
        pendingReviewCount > 0
            ? "incorrect"
            : currentLearning
                ? "unanswered"
                : "correct";
    const coach = getCoachView({
        mode: coachMode,
        situation: coachSituation,
        seed: [
            userId,
            getKoreanDateKey(),
            coachSituation,
        ].join(":"),
    });

    const notifications = [
        ...directNotifications.map(
            (notification) => ({
                title: notification.title,
                description:
                    String(
                        notification.message ||
                            ""
                    ).slice(0, 160),
                href:
                    `/notifications/${notification._id}`,
                kind:
                    notification.kind ||
                    "admin",
                urgent:
                    [
                        "warning",
                        "account",
                        "nickname",
                        "integrity",
                    ].includes(
                        notification.kind
                ),
            })
        ),
    ];

    const activePlan = (() => {
        if (user?.role === "admin") {
            return {
                code: "SUPER_ADMIN",
                name: "관리자 무제한 플랜",
                division: "Unranked · Ranked",
                remainingLearningDays: null,
                availableLearningDays: null,
                reservedLearningDays: 0,
                lockedLearningDays: 0,
                expiresAt: null,
                unlimited: true,
                statusLabel: "무제한 · 만료 없음",
            };
        }
        if (activeAccessCycle) {
            const availableDays = Math.max(
                0,
                Number(activeAccessCycle.availableLearningDays) || 0
            );
            const reservedDays = Math.max(
                0,
                Number(activeAccessCycle.reservedLearningDays) || 0
            );
            const lockedDays = Math.max(
                0,
                Number(activeAccessCycle.lockedLearningDays) || 0
            );
            return {
                code: "LEARNING_PACKAGE",
                name: "29일 학습권 패키지",
                division:
                    arenaAccessState?.currentCompetitiveDivision === "MAIN"
                        ? "Ranked"
                        : "Unranked",
                remainingLearningDays:
                    availableDays + reservedDays + lockedDays,
                availableLearningDays: availableDays,
                reservedLearningDays: reservedDays,
                lockedLearningDays: lockedDays,
                expiresAt: activeAccessCycle.expiresAt,
                statusLabel: "이용 중",
            };
        }
        if (activeMockExamSubscription) {
            return {
                code: "MOCK_EXAM_ONLY",
                name: "Matths 주간 공식 모의고사 이용권",
                division: null,
                remainingLearningDays: 0,
                availableLearningDays: 0,
                reservedLearningDays: 0,
                lockedLearningDays: 0,
                expiresAt: activeMockExamSubscription.endsAt,
                statusLabel: "이용 중",
            };
        }
        return {
            code: "FREE",
            name: "무료 플랜",
            division: null,
            remainingLearningDays: 0,
            availableLearningDays: 0,
            reservedLearningDays: 0,
            lockedLearningDays: 0,
            expiresAt: null,
            statusLabel: "무료 이용",
        };
    })();

    const accessRenewalNotice = (() => {
        if (
            !["MAIN_DEMOTED_TO_SUB", "SUB_ACCESS_EXPIRED_LOCKED"].includes(
                arenaAccessState?.state
            )
        ) {
            return null;
        }
        const reference = latestMainToSubReference;
        const graceDeadline = reference?.renewalGraceDeadline ||
            arenaAccessState?.renewalGraceDeadline ||
            null;
        const withinGrace = Boolean(
            graceDeadline && new Date(graceDeadline).getTime() >= Date.now()
        );
        const hasMainReference = Boolean(
            arenaAccessState?.state === "MAIN_DEMOTED_TO_SUB" &&
            arenaAccessState?.lastMainSnapshotId &&
            reference
        );
        const referenceTier = hasMainReference
            ? arenaTierByValue(reference.referenceSubRank).label
            : null;
        const referenceTierIndex = hasMainReference
            ? arenaTierIndex(reference.referenceSubRank)
            : 0;
        const lateTier = hasMainReference
            ? ARENA_TIER_CONFIG[Math.max(0, referenceTierIndex - 1)].label
            : null;

        return {
            kind: hasMainReference ? "MAIN_DEMOTION" : "SUB_EXPIRED",
            graceDeadline,
            withinGrace,
            referenceTier,
            referenceGp: hasMainReference
                ? Number(reference.referenceSubGp) || 0
                : null,
            referenceOverallPosition: hasMainReference
                ? Number(reference.referenceSubOverallPosition) || null
                : null,
            lateTier,
            lateGp: hasMainReference
                ? Number(reference.referenceSubGp) || 0
                : null,
        };
    })();

    return {
        user: {
            id: String(user._id),
            name: user.name,
            realName:
                user.realName || "",
            schoolGrade: user.schoolGrade,
            school: user.school,
            currentStreak:
                getEffectiveStreak(user),
        },

        currentLearning,
        todayPlan,
        coach,
        notifications,
        activeDashboardNotices: [
            ...dashboardUrgentNotifications.map(
                (notification) => ({
                    id: String(
                        notification._id
                    ),
                    title:
                        notification.title,
                    content:
                        notification.message,
                    href:
                        `/notifications/${notification._id}/open`,
                    kind:
                        notification.kind ||
                        "admin",
                    dismissUrl:
                        `/notifications/${notification._id}/dashboard-dismiss`,
                    publishedAt:
                        notification.createdAt,
                })
            ),
            ...announcements
                .filter(
                    (announcement) =>
                        !new Set(
                            dismissedAnnouncements.map(
                                (notification) =>
                                    notification.dashboardDismissedAt
                                        ? String(notification.announcementId)
                                        : ""
                            )
                        ).has(
                            String(
                                announcement._id
                            )
                        )
                )
                .map(
                    (announcement) => ({
                        id: String(
                            announcement._id
                        ),
                        title:
                            announcement.title,
                        content:
                            announcement.content,
                        href:
                            (() => {
                                const inboxNotice =
                                    dismissedAnnouncements.find(
                                        (notification) =>
                                            String(notification.announcementId) ===
                                            String(announcement._id)
                                    );
                                return inboxNotice
                                    ? `/notifications/${inboxNotice._id}/open`
                                    : announcement.href || "/main";
                            })(),
                        kind:
                            "announcement",
                        dismissUrl:
                            `/announcements/${announcement._id}/dismiss`,
                        publishedAt:
                            announcement.publishedAt,
                    })
                ),
        ],
        hasUrgentNotification:
            notifications.some(
                (notification) =>
                    notification.urgent
            ),

        activePlan,
        accessRenewalNotice,

        // 웹과 iPad가 같은 공통 모집단과 날짜별 반올림을 쓴다.
        // 웹의 기존 비교 단위 표기(%p)와 오늘 풀이 필드는 그대로 유지한다.
        stats: {
            ...dashboardActivity.stats,
            correctRateDetail:
                webCorrectRateDetail,
            todaySolvedProblems:
                dashboardActivitySnapshot
                    .todaySolvedProblems,
            pendingReviewCount,
        },

        weeklyActivity:
            dashboardActivity.weeklyActivity,

        weakConcepts,
        recentWrongAnswers,
        curriculumCourses,

        completedConcepts:
            learningData.completedConcepts,

        totalConcepts:
            learningData.totalConcepts,
    };
}

async function toggleDailyPlanTask(
    userId,
    taskId
) {
    const dateKey = getKoreanDateKey();

    const plan = await DailyPlan.findOne({
        userId,
        dateKey,
    });

    if (!plan) {
        return null;
    }

    const task = plan.tasks.find(
        (item) =>
            String(item._id) === String(taskId)
    );

    if (!task) {
        return null;
    }

    task.status =
        task.status === "completed"
            ? "pending"
            : "completed";

    await plan.save();

    return serializeDailyPlan(plan);
}

async function updateCoachMode(
    userId,
    mode,
    situation = "unanswered"
) {
    if (
        !COACH_MODES.includes(mode)
    ) {
        return null;
    }

    const user =
        await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    "preferences.coachMode": mode,
                },
            },
            {
                returnDocument: "after",
            }
        ).lean();

    if (!user) {
        return null;
    }

    return getCoachView({
        mode,
        situation,
        seed: [
            userId,
            getKoreanDateKey(),
            situation,
        ].join(":"),
    });
}

module.exports = {
    getDashboardData,
    toggleDailyPlanTask,
    updateCoachMode,
};
