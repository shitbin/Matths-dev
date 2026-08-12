const assert = require("node:assert/strict");
const path = require("node:path");
const ejs = require("ejs");
const fs = require("node:fs");

const templatePath = path.join(
    __dirname,
    "..",
    "views",
    "main.ejs"
);

const fixture = {
    user: {
        name: "테스트",
        realName: "테스트 학생",
        schoolGrade: 11,
        currentStreak: 4,
        role: "student",
    },
    dashboardData: {
        notifications: [],
        hasUrgentNotification: false,
        activeDashboardNotices: [],
        completedConcepts: 8,
        resume: {
            conceptTitle: "다항식의 연산",
            courseTitle: "공통수학1",
            unitTitle: "다항식",
            progress: 40,
            href: "/learn/common-math-1/polynomials/operations",
        },
        wrongNoteDue: {
            due: 3,
            total: 12,
        },
        arena: {
            available: true,
            placed: true,
            tierLabel: "골드",
            rankPoint: 41,
            overallRank: 128,
        },
        stats: {
            weeklyStudyMinutes: 145,
            todayStudyMinutes: 45,
            activeStudyDays: 5,
            averageStudyMinutes: 29,
            weeklySolvedProblems: 27,
            correctRate: 81,
            pendingReviewCount: 3,
            weeklyStudyDetail:
                "지난주보다 20분 증가",
            correctRateDetail:
                "지난주보다 4%p 증가",
        },
        weeklyActivity: {
            maxMinutes: 45,
            days: [
                {
                    label: "목",
                    minutes: 10,
                    isToday: false,
                },
                {
                    label: "금",
                    minutes: 0,
                    isToday: false,
                },
                {
                    label: "토",
                    minutes: 25,
                    isToday: false,
                },
                {
                    label: "일",
                    minutes: 15,
                    isToday: false,
                },
                {
                    label: "월",
                    minutes: 30,
                    isToday: false,
                },
                {
                    label: "화",
                    minutes: 20,
                    isToday: false,
                },
                {
                    label: "수",
                    minutes: 45,
                    isToday: true,
                },
            ],
        },
    },
};

async function run() {
    const mainCss = fs.readFileSync(
        path.join(__dirname, "..", "public", "css", "main.css"),
        "utf8"
    );
    assert.match(
        mainCss,
        /@media \(max-width: 560px\)[\s\S]*?\.arena-strip-copy h2,[\s\S]*?\.arena-strip-copy span\s*\{[\s\S]*?text-overflow:\s*clip;[\s\S]*?white-space:\s*normal;/,
        "모바일 Arena 핵심 제목과 설명은 말줄임 없이 줄바꿈한다"
    );

    const html = await ejs.renderFile(
        templatePath,
        fixture
    );

    // (1) 최상단 히어로 — 이어 학습할 개념 + 주 CTA + 오답 due 보조 링크
    assert.match(
        html,
        /오늘의 다음 행동/,
        "다음 행동 히어로를 렌더한다"
    );
    assert.match(
        html,
        /다항식의 연산/,
        "이어 학습할 개념 제목을 렌더한다"
    );
    assert.match(
        html,
        /이어 학습하기/,
        "진행 중 개념이면 이어 학습 CTA 를 렌더한다"
    );
    assert.match(
        html,
        /복습할 오답 3문제/,
        "오답 due 가 있으면 복습 보조 링크를 렌더한다"
    );

    // (2) GOAT Arena 현황 스트립 — 티어·GP·순위 (mmrService 뷰 소비)
    assert.match(
        html,
        /arena-strip/,
        "아레나 현황 스트립을 렌더한다"
    );
    assert.match(
        html,
        /골드/,
        "프로필이 있으면 티어를 렌더한다"
    );
    assert.match(
        html,
        /41 GP/,
        "프로필이 있으면 GP 를 렌더한다"
    );
    assert.match(
        html,
        /전체 128위/,
        "프로필이 있으면 전체 순위를 렌더한다"
    );

    // (3) 주간 기록 — 핵심 KPI 4 + 캡션 2 (4+2 구조)
    assert.match(
        html,
        /이번 주 학습 기록/,
        "주간 학습 기록 제목을 렌더한다"
    );
    for (const label of [
        "최근 7일 학습",
        "오늘 학습",
        "최근 7일 풀이",
        "최근 7일 정답률",
    ]) {
        assert.match(
            html,
            new RegExp(`<dt>${label}</dt>`),
            `주간 핵심 지표 "${label}" 를 렌더한다`
        );
    }
    // 보조 2지표는 KPI 타일이 아니라 차트 하단 캡션으로 강등된다.
    for (const demoted of ["학습한 날", "학습일 평균"]) {
        assert.doesNotMatch(
            html,
            new RegExp(`<dt>${demoted}</dt>`),
            `강등 지표 "${demoted}" 를 KPI 타일로 렌더하지 않는다`
        );
    }
    assert.match(
        html,
        /chart-footnote[^<]*>최근 7일 중 학습한 날 5일 · 학습일 평균 29분/,
        "강등된 보조 지표 2종을 차트 하단 캡션으로 렌더한다"
    );
    assert.match(
        html,
        /class="weekly-chart"/,
        "주간 기록이 있으면 요일 차트를 렌더한다"
    );

    // (4) 플랜 — 거대 카드 대신 콤팩트 스트립
    assert.match(
        html,
        /plan-strip/,
        "플랜 콤팩트 스트립을 렌더한다"
    );
    assert.doesNotMatch(
        html,
        /usage-plan-card/,
        "플랜 거대 카드를 다시 노출하지 않는다"
    );

    // (5) 상태 기반 서브카피 — 오늘 학습이 있으면 격려 문구
    assert.match(
        html,
        /greeting-subcopy/,
        "인사말 아래 상태 기반 서브카피를 렌더한다"
    );

    assert.match(
        html,
        /GOAT Arena/,   // 폐기된 구 이름 대신 현재 서비스 이름을 사용한다.
        "공통 대시보드 내비게이션을 렌더한다"
    );
    assert.match(
        html,
        /\/css\/matths-theme\.css/,
        "공통 Matths 테마를 연결한다"
    );
    assert.doesNotMatch(
        html,
        /오늘 할 학습/,
        "삭제한 오늘의 계획 카드를 다시 노출하지 않는다"
    );
    assert.doesNotMatch(
        html,
        /취약 개념/,
        "홈의 단일 목적을 흐리는 취약 개념 카드를 노출하지 않는다"
    );

    /*
     * 섹션 독립 폴백 — resume·wrongNoteDue 가 null 이고 arena 가
     * available:false 여도 홈은 뜬다(하나 죽어도 홈은 뜬다).
     */
    const fallbackHtml = await ejs.renderFile(templatePath, {
        user: fixture.user,
        dashboardData: {
            ...fixture.dashboardData,
            resume: null,
            wrongNoteDue: null,
            arena: { available: false, placed: false },
            stats: {
                ...fixture.dashboardData.stats,
                todayStudyMinutes: 0,
            },
        },
    });

    assert.match(
        fallbackHtml,
        /학습 시작하기/,
        "이어 학습 대상이 없으면 시작 CTA 로 폴백한다"
    );
    assert.doesNotMatch(
        fallbackHtml,
        /복습할 오답/,
        "오답 due 조회 실패 시 잘못된 수치를 노출하지 않는다"
    );
    assert.match(
        fallbackHtml,
        /아레나 현황을 불러오지 못했습니다/,
        "아레나 집계 실패도 사용자 언어의 상태 문구로 렌더한다"
    );
    assert.match(
        fallbackHtml,
        /학습 기능은 정상입니다/,
        "아레나 집계 실패 시 사용 가능한 학습 기능을 함께 안내한다"
    );

    const emptyWeekHtml = await ejs.renderFile(templatePath, {
        user: fixture.user,
        dashboardData: {
            ...fixture.dashboardData,
            stats: {
                ...fixture.dashboardData.stats,
                weeklyStudyMinutes: 0,
                todayStudyMinutes: 0,
                weeklySolvedProblems: 30,
                correctRate: 0,
                activeStudyDays: 0,
                averageStudyMinutes: 0,
            },
            weeklyActivity: {
                maxMinutes: 0,
                days: fixture.dashboardData.weeklyActivity.days.map((day) => ({
                    ...day,
                    minutes: 0,
                })),
            },
        },
    });

    assert.doesNotMatch(
        emptyWeekHtml,
        /class="weekly-chart"/,
        "기록이 모두 0이면 빈 차트 면적을 만들지 않는다"
    );
    assert.match(
        emptyWeekHtml,
        /첫 학습 기록을 만들어보세요/,
        "0주 기록에는 다음 행동이 있는 짧은 빈 상태를 렌더한다"
    );

    console.log(
        "dashboard home render tests passed"
    );
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
