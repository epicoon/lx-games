// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv.dataProvider;
class ActionEndPhase extends lxGames.ootv.dataProvider.Action {
    run() {
        const game = this.game,
            gamers = game.gamers;

        let delChips = [];
        game.commonBoard.forEachTile(tile => {
            if (tile.isType([lx>>>Const.TILE_ADVANTAGE_DICE, lx>>>Const.TILE_ADVANTAGE_FORSALE])) {
                delChips.push({
                    tile: tile.name,
                    count: 1
                });
            }
        });
        this.outputData.add('delChips', delChips);

        let chips = [];
        for (let i in gamers) {
            let gamer = gamers[i];
            chips[i] = [];
            gamer.forEachAdvTile(tile => {
                if (tile.containsChip({group: lx>>>Const.GROUP_SOLAR_PANEL})) {
                    chips.push({
                        type: 'new',
                        info: this.getChipInfo('credit'),
                        gamer: gamer.colorId,
                        from: tile.name,
                        to: 'credit'
                    });
                    if (gamer.knows('k2')) {
                        chips.push({
                            type: 'new',
                            info: this.getChipInfo('dataStorage'),
                            gamer: gamer.colorId,
                            from: tile.name,
                            to: 'dataStorage'
                        });
                    }
                }
            });
        }
        this.outputData.add('chips', chips);
    }
}
