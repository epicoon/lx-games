// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv.dataProvider;
class ActionSplitMinerals extends lxGames.ootv.dataProvider.Action {
    /* this.inputData:
     *    - gamer {String} (: gamer color id :)
     *    - tile {String} (: tile name :)
     *    - [dice] {Number} (: dice index :)
     */
    run() {
        const game = this.game,
            gamer = game.getGamerByColor(this.inputData.gamer),
            tile = gamer.getTile(this.inputData.tile),
            dice = gamer.getDice(this.inputData.dice);

        this.outputData.add('gamer', gamer.colorId);

        let chips = [],
            count = gamer.knows('k3') ? 2 : 1;
        if (dice) chips.push({
            type: 'dice',
            gamer: gamer.colorId,
            index: dice.index,
            to: 'diceRest'
        });
        for (let i = 0; i < count; i++)
            chips.push({
                type: 'new',
                gamer: gamer.colorId,
                info: this.getChipInfo('credit'),
                from: tile.name,
                to: 'credit'
            });
        if (gamer.knows('k4'))
            chips.push({
                type: 'new',
                gamer: gamer.colorId,
                info: this.getChipInfo('dataStorage'),
                from: tile.name,
                to: 'dataStorage'
            });
        chips.push({
            type: 'tile',
            gamer: gamer.colorId,
            from: tile.name,
            to: 'minerals',
            turn: true
        });
        this.outputData.add('chips', chips);

        let points = game.getGamersCount() * tile.chipsCount();
        this.addGamerPoints(gamer, {
            code : lx>>>Const.SCORE_MINERALS,
            info : tile.chipsCount(),
            amt : points
        });
        this.outputData.add('points', points);
    }
}
