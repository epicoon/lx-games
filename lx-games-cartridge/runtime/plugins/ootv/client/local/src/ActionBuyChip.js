// @lx:namespace lxGames.ootv.dataProvider;
class ActionBuyChip extends lxGames.ootv.dataProvider.Action {
    run() {
        const game = this.game,
            gamer = game.getGamerByColor(this.inputData.gamer),
            from = game.commonBoard.getTile(this.inputData.tile),
            to = gamer.getFreeAdvKeeper();

        this.outputData.add('gamer', gamer.colorId);
        this.outputData.add('delChips', [{
            gamer: gamer.colorId,
            tile: 'credit',
            count: 2
        }]);

        let chips = [];
        chips.push({
            type: 'tile',
            from: from.name,
            toGamer: gamer.colorId,
            to: to.name
        });
        this.outputData.add('chips', chips);

        gamer.creditUsed = true;
    }
}
