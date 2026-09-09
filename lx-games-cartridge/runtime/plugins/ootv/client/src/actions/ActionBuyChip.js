// @lx:namespace lxGames.ootv;
class ActionBuyChip extends lxGames.ootv.Action {
    process() {
        const game = this.game,
            gamer = game.getGamer(this.responseData.gamer);

        gamer.creditUsed = true;
        game.status.setPending();
    }
}
