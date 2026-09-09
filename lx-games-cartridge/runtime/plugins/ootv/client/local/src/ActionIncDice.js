// @lx:namespace lxGames.ootv.dataProvider;
class ActionIncDice extends lxGames.ootv.dataProvider.Action {
    run() {
        const game = this.game,
            gamer = game.getGamer(this.inputData.gamer),
            dice = gamer.getDice(this.inputData.dice);

        dice.incValue(this.inputData.value);

        this.outputData.add('gamer', this.inputData.gamer);
        this.outputData.add('dice', this.inputData.dice);
        this.outputData.add('value', dice.value);

        this.outputData.add('delChips', [{
            gamer: this.inputData.gamer,
            tile: 'dataStorage',
            count: 1
        }]);
    }
}
