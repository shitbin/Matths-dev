const express = require("express");
const apiController = require(
  "../controllers/apiController"
);
const matthsController = require(
  "../controllers/matthsController"
);
const {
  requireApiAuth,
} = require(
  "../middleware/apiAuthMiddleware"
);
// iPad 앱 동기화 (진도 게이트·학습 이벤트·오답노트)
const ipadSync = require(
  "../controllers/ipadSyncController"
);
const accessEconomy = require(
  "../controllers/accessEconomyController"
);
const goatArena = require(
  "../controllers/goatArenaController"
);
const goatArenaCommands = require(
  "../controllers/goatArenaCommandController"
);
const {
  arenaEvidenceUpload,
} = require(
  "../middleware/arenaEvidenceUpload"
);
const ipadWeeklyMock = require(
  "../controllers/ipadWeeklyMockController"
);
const appCommerce = require(
  "../controllers/appCommerceController"
);
const {
  userIntegrityEvidenceUpload,
} = require("../middleware/archiveUpload");

const router = express.Router();

router.get(
  "/health",
  apiController.health
);
router.get(
  "/schools",
  apiController.schools
);
router.get(
  "/universities",
  apiController.universities
);
router.post(
  "/auth/register",
  apiController.register
);
router.post(
  "/auth/login",
  apiController.login
);
router.get(
  "/auth/providers",
  apiController.socialAuthProviders
);
// `/auth/google/start`(PKCE 이전 별칭)는 제거했다. PKCE 강제 이후로는 challenge
// 없이 발급된 grant 가 교환되지 않아, 이 경로는 Google 왕복을 끝내고도 마지막
// exchange 에서 반드시 401 이 되는 죽은 길이었다. 앱은 `/auth/google/app` 만 쓴다.
router.post(
  "/auth/google/exchange",
  apiController.exchangeGoogleAuthCode
);
router.post(
  "/auth/password-reset/request",
  apiController.requestPasswordReset
);
router.post(
  "/auth/password-reset/verify",
  apiController.verifyPasswordReset
);
router.post(
  "/auth/password-reset/complete",
  apiController.resetPassword
);

router.use(requireApiAuth);

router.get(
  "/commerce/storefront",
  appCommerce.storefront
);
router.post(
  "/commerce/handoffs",
  appCommerce.createHandoff
);

// iPad 주간 공식 모의고사. 정적 경로를 :examId보다 먼저 등록해야
// integrity-cases/objections가 시험 ID로 오인되지 않는다.
router.get(
  "/weekly-mock-exams/integrity-cases",
  ipadWeeklyMock.integrityCases
);
router.get(
  "/weekly-mock-exams/integrity-cases/:caseId",
  ipadWeeklyMock.integrityCase
);
router.post(
  "/weekly-mock-exams/integrity-cases/:caseId/evidence",
  (req, _res, next) => {
    userIntegrityEvidenceUpload.array(
      "evidenceFiles",
      10
    )(req, _res, (error) => {
      if (error) {
        error.status = error.status || 400;
        return next(error);
      }
      return next();
    });
  },
  ipadWeeklyMock.submitEvidence
);
router.get(
  "/weekly-mock-exams/objections/options",
  ipadWeeklyMock.objectionOptions
);
router.get(
  "/weekly-mock-exams/objections",
  ipadWeeklyMock.objections
);
router.post(
  "/weekly-mock-exams/objections",
  ipadWeeklyMock.createObjection
);
router.post(
  "/weekly-mock-exams/weeks/:weekKey/selection",
  ipadWeeklyMock.selectRepresentative
);
router.get(
  "/weekly-mock-exams",
  ipadWeeklyMock.dashboard
);
router.get(
  "/weekly-mock-exams/:examId/paper",
  ipadWeeklyMock.paper
);
router.post(
  "/weekly-mock-exams/:examId/start",
  ipadWeeklyMock.start
);
router.patch(
  "/weekly-mock-exams/:examId/draft",
  ipadWeeklyMock.saveDraft
);
router.post(
  "/weekly-mock-exams/:examId/submit",
  ipadWeeklyMock.submit
);
router.post(
  "/weekly-mock-exams/:examId/expire",
  ipadWeeklyMock.expire
);
router.get(
  "/weekly-mock-exams/:examId",
  ipadWeeklyMock.getAttempt
);

router.get(
  "/me",
  apiController.me
);
router.get(
  "/access",
  accessEconomy.getAccessSummary
);
router.get(
  "/access/rankings/:ranking/leaderboard",
  accessEconomy.getActiveRankingLeaderboard
);
router.get(
  "/me/access-cycle",
  goatArena.getAccessCycle
);
router.get(
  "/me/payback-progress",
  goatArena.getPaybackProgress
);
router.get(
  "/goat-arena",
  goatArena.getGoatArena
);
router.get(
  "/goat-arena/rulebook",
  goatArena.getGoatArenaRulebook
);
router.get(
  "/goat-arena/matches",
  goatArena.getMatches
);
router.post(
  "/goat-arena/matches/sub",
  goatArenaCommands.createSubMatch
);
router.get(
  "/goat-arena/matches/main/options",
  goatArenaCommands.getMainOptions
);
router.post(
  "/goat-arena/matches/main/upward",
  goatArenaCommands.createMainUpwardMatch
);
router.post(
  "/goat-arena/matches/main/invitations",
  goatArenaCommands.createMainInvitation
);
router.post(
  "/goat-arena/matches/main/invitations/:invitationId/cancel",
  goatArenaCommands.cancelMainInvitation
);
router.get(
  "/goat-arena/matches/:matchId",
  goatArena.getMatch
);
router.post(
  "/goat-arena/matches/:matchId/accept",
  goatArenaCommands.acceptChallenge
);
router.post(
  "/goat-arena/matches/:matchId/decline",
  goatArenaCommands.declineChallenge
);
router.post(
  "/goat-arena/matches/:matchId/start",
  goatArenaCommands.startMatch
);
router.get(
  "/goat-arena/matches/:matchId/questions",
  goatArenaCommands.getQuestions
);
router.post(
  "/goat-arena/matches/:matchId/heartbeat",
  goatArenaCommands.heartbeat
);
router.post(
  "/goat-arena/matches/:matchId/focus",
  goatArenaCommands.recordQuestionFocus
);
router.post(
  "/goat-arena/matches/:matchId/answers",
  goatArenaCommands.saveAnswer
);
router.post(
  "/goat-arena/matches/:matchId/advance",
  goatArenaCommands.advanceQuestion
);
router.post(
  "/goat-arena/matches/:matchId/network-state",
  goatArenaCommands.recordNetworkState
);
router.post(
  "/goat-arena/matches/:matchId/submit",
  goatArenaCommands.submitAttempt
);
router.post(
  "/goat-arena/matches/:matchId/evidence",
  (req, _res, next) => {
    req.arenaEvidenceReceivedAt =
      new Date();
    next();
  },
  arenaEvidenceUpload.array(
    "evidenceFiles",
    5
  ),
  goatArenaCommands.submitEvidence
);
router.post(
  "/goat-arena/matches/:matchId/evidence/client-review",
  goatArenaCommands.submitClientReview
);
// ── Main Division Shop (docs/logic/12_SHOP.md v1.0) ─────────────
router.get(
  "/goat-arena/main/shop",
  goatArena.getArenaShop
);
router.post(
  "/goat-arena/main/shop/purchases",
  goatArena.purchaseArenaShopItem
);
router.get(
  "/goat-arena/main/shop/analyses/:effectId",
  goatArena.getArenaShopAnalysis
);
// 구형 iPad도 현재 공개 이름 정본(닉네임 전용)에 수렴시키는 호환 경로.
// 전역 requireApiAuth 뒤에 있으므로 req.apiUser 이외의 계정은 바꿀 수 없다.
router.patch(
  "/me/ranking-identity",
  apiController.updateRankingIdentity
);
router.patch(
  "/me/school",
  apiController.updateSchool
);
router.get(
  "/me/withdrawal/options",
  apiController.withdrawalOptions
);
router.post(
  "/me/withdrawal/google/start",
  apiController.startGoogleWithdrawalReauthentication
);
router.delete(
  "/me",
  apiController.withdrawMe
);
router.get(
  "/curriculum",
  apiController.curriculum
);
router.get(
  "/learning",
  apiController.learning
);
router.patch(
  "/learning/:courseId/:unitId/:conceptId/topics/:topicIndex",
  apiController.updateTopic
);

router.get(
  "/quick-practice/stats",
  apiController.quickPracticeStats
);
router.post(
  "/quick-practice/start",
  apiController.startQuickPractice
);
router.post(
  "/quick-practice/:instanceId/submit",
  apiController.submitQuickPractice
);
router.post(
  "/quick-practice/:instanceId/expire",
  apiController.expireQuickPractice
);

router.get(
  "/coach-suggestions",
  apiController.suggestionBoard
);
router.post(
  "/coach-suggestions",
  apiController.createSuggestion
);
router.patch(
  "/coach-suggestions/:suggestionId",
  apiController.moderateSuggestion
);


// ── iPad 앱 동기화 (P1) ─────────────────────────────────────────
router.patch(
  "/learning/:courseId/:unitId/:conceptId/mastery",
  requireApiAuth,
  ipadSync.patchMastery
);
router.patch(
  "/learning/:courseId/:unitId/:conceptId/snapshot",
  requireApiAuth,
  ipadSync.patchProgressSnapshot
);
// 진도 내려받기 — PATCH 로 올리기만 하던 단방향을 양방향으로 닫는다
// **경로를 분리한다.** 61행이 이미 GET "/learning" 을 등록해 두었고
// (레포와 같은 응답: {learning:<viewModel>}), Express 는 먼저 등록된 쪽이 응답한다.
// 그래서 이 핸들러는 영영 실행되지 않았고, 앱은 {progress:[…]} 를 기대하다
// 디코딩에 실패해 **진도 내려받기가 조용히 죽어 있었다.**
// 레포의 /learning 은 건드리지 않고, 앱 전용 경로를 따로 판다.
router.get("/learning/progress", ipadSync.getLearning);
router.post("/learning/progress/reset", requireApiAuth, ipadSync.resetLearningProgress);
router.get("/dashboard/activity", ipadSync.getDashboardActivity);
router.get("/arena", requireApiAuth, ipadSync.getArena);
router.get("/arena/leaderboard", requireApiAuth, ipadSync.getArenaLeaderboard);
router.post("/events", requireApiAuth, ipadSync.postEvents);
router.post("/wrong-notes/bulk", requireApiAuth, ipadSync.postWrongNotesBulk);
router.get("/wrong-notes", requireApiAuth, ipadSync.getWrongNotes);
router.post(
  "/wrong-notes/:attemptId/review-result",
  requireApiAuth,
  ipadSync.postReviewResult
);
router.post("/wrong-notes/stuck-points", requireApiAuth, ipadSync.postStuckPoint);
router.get("/wrong-notes/stuck-points", requireApiAuth, ipadSync.getStuckPoints);

// iPad 평가센터 — 웹 assessmentService/AssessmentAttempt 정본의 Bearer adapter.
const ipadAssessment = require("../controllers/ipadAssessmentController");
router.get("/assessments", requireApiAuth, ipadAssessment.list);
router.post("/assessments/start", requireApiAuth, ipadAssessment.start);
router.get("/assessments/:attemptId", requireApiAuth, ipadAssessment.get);
router.patch("/assessments/:attemptId/draft", requireApiAuth, ipadAssessment.saveDraft);
router.post("/assessments/:attemptId/submit", requireApiAuth, ipadAssessment.submit);
router.post("/assessments/:attemptId/expire", requireApiAuth, ipadAssessment.expire);

// iPad 배치고사 — 웹 placementExamService 의 Bearer 번역층.
// 앱(ServerAPI.swift)이 이 다섯 경로를 스펙 선행으로 호출하고 있었고,
// 서버 어댑터가 없어 404 로 죽어 있었다 (58차에서 해소).
const ipadPlacement = require("../controllers/ipadPlacementController");
router.get("/placement-exam/status", requireApiAuth, ipadPlacement.getStatus);
router.post("/placement-exam/start", requireApiAuth, ipadPlacement.start);
router.get("/placement-exam/:attemptId", requireApiAuth, ipadPlacement.getAttempt);
router.patch("/placement-exam/:attemptId/draft", requireApiAuth, ipadPlacement.saveDraft);
router.post("/placement-exam/:attemptId/submit", requireApiAuth, ipadPlacement.submit);
router.post("/placement-exam/:attemptId/expire", requireApiAuth, ipadPlacement.expire);

module.exports = router;
