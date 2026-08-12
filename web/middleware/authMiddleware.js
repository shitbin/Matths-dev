const {
    getKoreanDateKey,
    lifecycleSessionView,
    synchronizeUserLifecycle,
} = require("../services/userLifecycleService");
const {
    synchronizeAccountAccess,
} = require("../services/accountAccessService");

function isAdminSessionUser(user) {
    const adminEmail = String(
        process.env.ADMIN_EMAIL ||
            "admin@lsbproduction.com"
    )
        .trim()
        .toLowerCase();

    return (
        user?.role === "admin" ||
        String(user?.email || "")
            .trim()
            .toLowerCase() ===
            adminEmail
    );
}

exports.isLoggedIn = async (req, res, next) => {
    if (req.session?.user) {
        try {
            const access =
                await synchronizeAccountAccess(
                    req.session.user.id
                );
            const account =
                access?.user;

            if (
                !account ||
                !access.allowed ||
                (
                    req.session.user
                        .tokenVersion !==
                        undefined &&
                    Number(
                        req.session.user
                            .tokenVersion
                    ) !==
                        Number(
                            account.tokenVersion
                        )
                )
            ) {
                const state =
                    access?.status ||
                    "inactive";
                return req.session.destroy(
                    () =>
                        res.redirect(
                            `/login?account=${encodeURIComponent(state)}`
                        )
                );
            }

            Object.assign(
                req.session.user,
                {
                    name: account.name,
                    realName:
                        account.realName ||
                        "",
                    email: account.email,
                    role:
                        account.role ||
                        "student",
                    tokenVersion:
                        Number(
                            account.tokenVersion
                        ) || 0,
                    school:
                        account.school,
                    schoolGrade:
                        account.schoolGrade,
                    educationStatus:
                        account.educationStatus ||
                        ([13, 15].includes(Number(account.schoolGrade))
                            ? "graduated"
                            : "enrolled"),
                    university:
                        account.university,
                    preferences:
                        account.preferences,
                }
            );
            const todayKey =
                getKoreanDateKey();

            if (
                req.session.user
                    .lifecycleDateKey !==
                todayKey
            ) {
                const user =
                    await synchronizeUserLifecycle(
                        req.session.user.id
                    );

                Object.assign(
                    req.session.user,
                    lifecycleSessionView(user)
                );
            }

            return next();
        } catch (error) {
            return next(error);
        }
    }

    if (req.method === "GET" && req.session) {
        req.session.returnTo = req.originalUrl;
    }

    // 브라우저 fetch 경로에 로그인 HTML을 302로 돌려주면 클라이언트의
    // response.json()이 깨져 실제 원인 대신 구문 오류만 표시된다. 페이지
    // 이동은 기존 redirect를 유지하고 API 경로만 명시적인 세션 만료 JSON을
    // 반환한다.
    if (
        String(req.originalUrl || "").startsWith("/api/")
    ) {
        return res.status(401).json({
            code: "SESSION_EXPIRED",
            message:
                "로그인 세션이 만료되었습니다. 다시 로그인해주세요.",
            loginUrl: "/login",
        });
    }

    return res.redirect("/login");
};

exports.isLoggedOut = (req, res, next) => {
    if (!req.session?.user) {
        return next();
    }

    return res.redirect(
        isAdminSessionUser(
            req.session.user
        )
            ? "/admin"
            : "/main"
    );
};

// iPad의 ASWebAuthenticationSession은 Safari/웹 세션 쿠키를 재사용할 수 있다.
// 앱이 시작한 OAuth state가 맞다면 기존 웹 로그인 여부와 무관하게 callback을
// 끝까지 처리해야 matths://oauth/google 로 돌아갈 수 있다. 일반 웹 OAuth는
// 기존 isLoggedOut 계약을 그대로 유지한다.
exports.isSocialOAuthCallbackAllowed = (req, res, next) => {
    if (
        req.session
            ?.socialOAuthState
            ?.context
            ?.mobile === true ||
        req.session
            ?.socialOAuthState
            ?.context
            ?.purpose ===
            "account-deletion"
    ) {
        return next();
    }

    return exports.isLoggedOut(
        req,
        res,
        next
    );
};

exports.isAdmin = (
    req,
    res,
    next
) => {
    const user =
        req.session?.user;
    const authorized =
        isAdminSessionUser(user);

    if (authorized) {
        return next();
    }

    const error = new Error(
        "운영자만 접근할 수 있습니다."
    );
    error.status = 403;
    error.code = "ADMIN_ACCESS_REQUIRED";
    return next(error);
};
