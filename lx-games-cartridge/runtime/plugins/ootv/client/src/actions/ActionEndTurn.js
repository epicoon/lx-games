// @lx:namespace lxGames.ootv;
class ActionEndTurn extends lxGames.ootv.Action {
    run() {
        if (this.responseData.newGamer) {
            const game = this.game;
            game.activeGamer = this.responseData.newGamer;
            const gamer = game.getActiveGamer();
            gamer.activate();
            this.game.triggerLocalEvent('ootv_action_processed');
        }
    }
}
