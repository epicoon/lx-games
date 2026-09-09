// @lx:namespace lxGames.ootv;
class ActionEndGame extends lxGames.ootv.Action {
    run() {
        const game = this.game,
            points = this.responseData.result;
        for (let colorId in points)
            game.getGamer(colorId).pointsInfo = points[colorId];
        game.status.setOver();

        game.triggerLocalEvent('ootv_action_processed');
    }
}
