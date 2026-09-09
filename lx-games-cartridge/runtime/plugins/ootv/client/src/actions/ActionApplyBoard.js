// @lx:namespace lxGames.ootv;
class ActionApplyBoard extends lxGames.ootv.Action {
    run() {
        this.game.triggerLocalEvent('ootv_change_gamer_board', this.responseData);
    }
}
