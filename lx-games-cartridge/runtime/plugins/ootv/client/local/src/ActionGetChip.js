// @lx:namespace lxGames.ootv.dataProvider;
class ActionGetChip extends lxGames.ootv.dataProvider.Action {
    run() {
        const game = this.game,
            gamer = game.getGamerByColor(this.inputData.gamer),
            dice = gamer.getDice(this.inputData.dice);

        let chips = [];
        if (dice)
            chips.push({
                type: 'dice',
                gamer: gamer.colorId,
                index: dice.index,
                to: 'diceRest'
            });
        chips.push({
            type: 'tile',
            from: this.inputData.tile,
            toGamer: gamer.colorId,
            to: gamer.getFreeAdvKeeper().name
        });
        this.outputData.add('chips', chips);
    }
}
