// @lx:namespace lxGames.ootv;
class ActionDiceToDataStorage extends lxGames.ootv.Action {
    process() {
        const game = this.game,
            gamer = game.getGamer(this.responseData.gamer),
            dice = gamer.getDice(this.responseData.dice);

        if (game.activeDice === dice)
            game.activeDice = null;
        game.status.setPending();
    }
}
