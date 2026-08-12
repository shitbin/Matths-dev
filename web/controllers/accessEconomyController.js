const {
  LearningAccessAccount,
} = require(
  "../models/accessEconomyModel"
);
const {
  RankingProfile,
} = require(
  "../models/matthsModel"
);
const {
  buildAccessSummary,
} = require(
  "../services/accessEconomyService"
);
const {
  getRankingData,
} = require(
  "../services/rankingService"
);
const {
  arenaBoardFromRankingData,
} = require(
  "../services/rankingApiAdapter"
);

/*
 * GET /api/v1/access
 *
 * 화면은 네 잔액을 합쳐 계산하지 않는다. 서버가 페이백·랭킹·재결제 가능
 * 여부까지 한 번 판정해서 내려주고 iPad와 웹은 같은 결과를 그린다.
 */
exports.getAccessSummary = async (
  req,
  res,
  next
) => {
  try {
    const [account, rankingProfile] =
      await Promise.all([
        LearningAccessAccount.findOne({
          userId: req.apiUser._id,
        }).lean(),
        RankingProfile.findOne({
          userId: req.apiUser._id,
          datasetOnly: {
            $ne: true,
          },
        }).lean(),
      ]);

    return res.json({
      economy:
        buildAccessSummary({
          account,
          rankingProfile,
          now: new Date(),
        }),
    });
  } catch (error) {
    return next(error);
  }
};

/*
 * GET /api/v1/access/rankings/:ranking/leaderboard
 *
 * 기존 `/arena/leaderboard`는 모든 RankingProfile을 한 줄로 세운다. 종합
 * 기획서에서는 Sub와 Main이 서로 다른 사용자 풀이고, 한 사용자는 한쪽에만
 * 이름을 올린다. 그래서 활성 랭킹 계정부터 고른 뒤 그 안에서 MMR 순위를
 * 다시 매긴다. 학생끼리 비교하는 순서는 웹 전체 순위와 같은
 * `rankingService.getRankingData()`를 사용하되, 활성 풀의 CONFIRMED 사용자
 * ID만 넘긴다. 따라서 풀은 섞이지 않고 동점 판정 계약은 전체 순위와 같다.
 */
exports.getActiveRankingLeaderboard =
  async (req, res, next) => {
    try {
      const ranking = String(
        req.params.ranking || ""
      ).toUpperCase();
      if (
        ranking !== "SUB" &&
        ranking !== "MAIN"
      ) {
        return res.status(400).json({
          code:
            "INVALID_ACTIVE_RANKING",
          message:
            "랭킹은 SUB 또는 MAIN이어야 합니다.",
        });
      }

      const accounts =
        await LearningAccessAccount.find({
          activeRanking: ranking,
        })
          .select("userId")
          .lean();
      const activeUserIds =
        accounts.map(
          (account) =>
            account.userId
        );

      if (!activeUserIds.length) {
        return res.json({
          ranking,
          total: 0,
          top: [],
          me: null,
        });
      }

      const profiles =
        await RankingProfile.find({
          userId: {
            $in: activeUserIds,
          },
          status: "CONFIRMED",
          datasetOnly: {
            $ne: true,
          },
        })
          .select(
            "userId"
          )
          .lean();
      const rankingData =
        await getRankingData(
          req.apiUser._id,
          {
            eligibleUserIds:
              profiles.map(
                (profile) =>
                  profile.userId
              ),
          }
        );
      const board =
        arenaBoardFromRankingData(
          rankingData,
          req.apiUser._id
        );

      return res.json({
        ranking,
        ...board,
      });
    } catch (error) {
      return next(error);
    }
  };
