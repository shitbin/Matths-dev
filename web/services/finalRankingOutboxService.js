const {
  registerArenaOutboxHandler,
} = require("./arenaOutboxService");
const {
  recalculateFinalRanking,
} = require("./finalRankingService");
const {
  ArenaOutboxEvent,
} = require("../models/goatArenaModel");

const FINAL_RANKING_TRIGGER_EVENTS = Object.freeze([
  "ArenaPlacementCompleted",
  "RenewalRankAssessmentCompleted",
]);

/*
 * 배치 결과·MMR·Arena standing/access는 제출 transaction 안에서 이미
 * 확정된다. 그 뒤 모든 사용자의 최종 종합 순위를 다시 쓰는 작업만 outbox가
 * 맡는다. 따라서 HTTP 응답은 학생의 티어 공개 화면을 즉시 열 수 있고,
 * 서버가 중간에 재시작돼도 미발행 이벤트가 다음 worker 주기에 재시도된다.
 */
async function isLatestPendingTrigger(event) {
  const latest = await ArenaOutboxEvent.findOne({
    eventType: { $in: FINAL_RANKING_TRIGGER_EVENTS },
    publishedAt: null,
  })
    .sort({ createdAt: -1, _id: -1 })
    .select("_id")
    .lean();
  return !latest || String(latest._id) === String(event?._id);
}

async function recalculateAfterPlacement(event) {
  // 짧은 시간에 여러 학생이 배치고사를 끝내면 이벤트마다 전 사용자 랭킹을
  // 다시 계산할 필요가 없다. 정렬상 마지막 미게시 trigger만 실제 계산하고,
  // 앞선 이벤트는 worker가 정상 게시 처리한다. 마지막 조회 뒤 새 이벤트가
  // 들어오는 race에서는 한 번 더 계산할 뿐 결과를 놓치지는 않는다.
  if (!(await isLatestPendingTrigger(event))) {
    return { skipped: true, reason: "NEWER_FINAL_RANKING_TRIGGER_PENDING" };
  }
  const occurredAt = event?.createdAt || new Date();
  return recalculateFinalRanking({ now: occurredAt });
}

function registerFinalRankingOutboxHandlers() {
  registerArenaOutboxHandler(
    "ArenaPlacementCompleted",
    recalculateAfterPlacement,
  );
  registerArenaOutboxHandler(
    "RenewalRankAssessmentCompleted",
    recalculateAfterPlacement,
  );
}

module.exports = {
  FINAL_RANKING_TRIGGER_EVENTS,
  isLatestPendingTrigger,
  recalculateAfterPlacement,
  registerFinalRankingOutboxHandlers,
};
