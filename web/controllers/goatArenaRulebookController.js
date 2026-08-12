const { getRulebook } = require("../content_folder/goat-arena-rulebook");

function renderRulebook(division) {
  return (req, res, next) => {
    try {
      res.set("Cache-Control", "private, no-store");
      return res.render("goat-arena-rulebook", {
        rulebook: getRulebook(division)
      });
    } catch (error) {
      return next(error);
    }
  };
}

exports.subRulebookPage = renderRulebook("sub");
exports.mainRulebookPage = renderRulebook("main");
