// @lx:namespace lxGames.ootv.dataProvider;
class ActionEndTurn extends lxGames.ootv.dataProvider.Action {
    run() {
        // Next gamer during the turn
        let newGamer = this.dataProvider.findNextGamer();
        if (newGamer) {
            this.outputData.add('newGamer', newGamer);
            return;
        }

        // Next turn
        if (this.game.turn < 5) {
            this.genSubAction('ActionNewTurn');
            return;
        }

        // End of the phase
        this.genSubAction('ActionEndPhase');

        // Next phase
        if (this.game.phase < 5) {
            this.genSubAction('ActionNewPhase');
            return;
        }

        // End of the game
        this.genSubAction('ActionEndGame');
    }
}
