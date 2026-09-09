// @lx:namespace lxGames.ootv;
class ActionApplySequence extends lxGames.ootv.Action {
    run() {
        this.game.triggerLocalEvent('ootv_change_sequence', this.responseData.sequence);
    }
}
