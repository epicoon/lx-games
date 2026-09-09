// @lx:namespace lxGames.ootv;
class ActionGetChip extends lxGames.ootv.Action {
    process() {
        const game = this.game;
        game.activeDice = null;
        game.status.setPending();
    }
}
