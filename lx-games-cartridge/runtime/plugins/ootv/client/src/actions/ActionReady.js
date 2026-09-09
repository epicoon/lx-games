// @lx:namespace lxGames.ootv;
class ActionReady extends lxGames.ootv.Action {
    run() {
        this.game.triggerLocalEvent('ootv_gamer_ready', this.responseData);
    }
}
