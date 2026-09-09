// @lx:namespace lxGames.ootv;
class ActionSplitMinerals extends lxGames.ootv.Action {
    process() {
        const game = this.game,
            gamer = game.getGamer(this.responseData.gamer),
            points = this.responseData.points;

        game.activeDice = null;
        game.isSplittingMinerals = false;
        game.status.setPending();

        this.handlePoints(gamer, points, [
            lx.i18n(splitMinerals.points, {points})
        ]);
    }
}
