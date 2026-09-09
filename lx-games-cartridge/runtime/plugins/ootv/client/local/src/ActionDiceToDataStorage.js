// @lx:namespace lxGames.ootv.dataProvider;
class ActionDiceToDataStorage extends lxGames.ootv.dataProvider.Action {
    run() {
        const game = this.game,
            gamer = game.getGamer(this.inputData.gamer),
            dice = gamer.getDice(this.inputData.dice),
            tile = dice.tile;

        this.outputData.add('gamer', gamer.colorId);
        this.outputData.add('dice', dice.index);
        
        let chips = [],
            count = gamer.knows('k14') ? 4 : 2;
        chips.push({
            type: 'dice',
            gamer: gamer.colorId,
            index: dice.index,
            to: 'diceRest'
        });
        for (let i = 0; i < count; i++)
            chips.push({
                type: 'new',
                gamer: gamer.colorId,
                info: this.getChipInfo('dataStorage'),
                from: tile.name,
                to: 'dataStorage'
            });
        if ( gamer.knows('k13') )
            chips.push({
                type: 'new',
                gamer: gamer.colorId,
                info: this.getChipInfo('credit'),
                from: tile.name,
                to: 'credit'
            });
        this.outputData.add('chips', chips);
    }
}
