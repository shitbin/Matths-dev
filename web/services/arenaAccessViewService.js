"use strict";

function requirement({ key, label, completed, detail, actionLabel, actionHref }) {
  return {
    key,
    label,
    completed: Boolean(completed),
    detail,
    actionLabel,
    actionHref,
  };
}

function buildDivisionAccessView({
  division,
  userAccountStatus,
  accessStatus,
  currentSeasonPlacementCompleted,
  activeDivision,
  availableDays,
  reservedDays = 0,
  lockedDays = 0,
  studyDays = 0,
  studyGoal = 29,
  paybackScore = 0,
  paybackGoal = 30,
  mainAchievementStatus,
  isAdminPreview = false,
}) {
  const normalizedDivision = division === "MAIN" ? "MAIN" : "SUB";
  const totalMainDays =
    Number(availableDays || 0) +
    Number(reservedDays || 0) +
    Number(lockedDays || 0);
  const hasBalance =
    normalizedDivision === "MAIN"
      ? totalMainDays > 0
      : Number(availableDays || 0) > 0;
  const requirements = [
    requirement({
      key: "account",
      label: "계정 상태",
      completed: isAdminPreview || userAccountStatus === "active",
      detail:
        userAccountStatus === "active"
          ? "정상"
          : "계정 상태 확인이 필요합니다.",
      actionLabel: "계정 상태 확인",
      actionHref: "/profile",
    }),
    requirement({
      key: "learning-access",
      label: "활성 학습권",
      completed: isAdminPreview || accessStatus === "PAID_ACTIVE",
      detail:
        accessStatus === "PAID_ACTIVE"
          ? "활성"
          : "경기에 사용할 학습권이 필요합니다.",
      actionLabel: "이용권 확인",
      actionHref: "/store",
    }),
    requirement({
      key: "placement",
      label: "배치 완료",
      completed: isAdminPreview || currentSeasonPlacementCompleted,
      detail: currentSeasonPlacementCompleted ? "완료" : "배치고사가 필요합니다.",
      actionLabel: "배치고사 확인",
      actionHref: "/war-of-masters",
    }),
    requirement({
      key: "learning-days",
      label: "사용 가능한 학습일",
      completed: isAdminPreview || hasBalance,
      detail: hasBalance
        ? normalizedDivision === "MAIN"
          ? `${totalMainDays}일`
          : `${Number(availableDays || 0)}일`
        : "경기에 사용할 학습일이 없습니다.",
      actionLabel: "학습권 확인",
      actionHref: "/store",
    }),
  ];

  if (normalizedDivision === "MAIN") {
    requirements.push(
      requirement({
        key: "study-streak",
        label: "연속 학습",
        completed: isAdminPreview || Number(studyDays) >= Number(studyGoal),
        detail: `${Number(studyDays)} / ${Number(studyGoal)}일`,
        actionLabel: "학습 계속하기",
        actionHref: "/main",
      }),
      requirement({
        key: "payback",
        label: "페이백 조건",
        completed: isAdminPreview || Number(paybackScore) >= Number(paybackGoal),
        detail: `${Number(paybackScore)} / ${Number(paybackGoal)}점`,
        actionLabel: "Unranked 계속하기",
        actionHref: "/goat-arena/sub",
      }),
      requirement({
        key: "cycle-review",
        label: "Ranked 진입 심사",
        completed: isAdminPreview || mainAchievementStatus === "ACHIEVED",
        detail:
          mainAchievementStatus === "ACHIEVED"
            ? "완료"
            : "사이클 종료 후 진입 여부를 확정합니다.",
        actionLabel: "Unranked 계속하기",
        actionHref: "/goat-arena/sub",
      }),
    );
  }

  requirements.push(
    requirement({
      key: "active-mode",
      label: "현재 경쟁 모드",
      completed: isAdminPreview || activeDivision === normalizedDivision,
      detail:
        activeDivision === normalizedDivision
          ? normalizedDivision === "MAIN"
            ? "Ranked"
            : "Unranked"
          : activeDivision === "MAIN"
            ? "현재 Ranked에서 경기 중입니다."
            : activeDivision === "SUB"
              ? "현재 Unranked에서 경기 중입니다."
              : "경쟁 모드가 아직 확정되지 않았습니다.",
      actionLabel:
        activeDivision === "MAIN"
          ? "Ranked로 이동"
          : activeDivision === "SUB"
            ? "Unranked로 이동"
            : "Arena 상태 확인",
      actionHref:
        activeDivision === "MAIN"
          ? "/goat-arena/main"
          : activeDivision === "SUB"
            ? "/goat-arena/sub"
            : "/goat-arena",
    }),
  );

  const firstUnmetRequirement = requirements.find((item) => !item.completed) || null;

  return {
    requirements,
    firstUnmetRequirement,
  };
}

module.exports = {
  buildDivisionAccessView,
};
