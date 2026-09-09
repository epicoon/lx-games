// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv.dataProvider;
class ActionNewPhase extends lxGames.ootv.dataProvider.Action {
    run() {
        const game = this.game;
        if (game.phase === null) game.phase = 0;
        game.phase++;
        game.turn = 0;
        game.forEachGamer(gamer=>gamer.resetTurn());

        this.outputData.add('phase', game.phase);
        this.outputData.add('chips', _getChipsForPhase(this));
        this.genSubAction('ActionNewTurn');
    }
}

function _getChipsForPhase(self) {
    let game = self.game,
        phase = game.phase,
        gamersCount = self.dataProvider.localInit.gamersCount,
        chips = [],
        diceTiles = [],
        sellTiles = [];
    game.commonBoard.forEachTile(tile => {
        if (tile.isActualForGamersCount(gamersCount)) {
            if (tile.isType(lx>>>Const.TILE_ADVANTAGE_DICE)) diceTiles.push(tile);
            else if (tile.isType(lx>>>Const.TILE_ADVANTAGE_FORSALE)) sellTiles.push(tile);
        }
    });
    for (let i in diceTiles) {
        let tile = diceTiles[i],
            chipInfo,
            alt = (tile.altGroup && gamersCount >= 3 && (phase == 1 || phase == 3));
        chipInfo = self.dataProvider.packs
            .advPacks[alt ? tile.altGroup : tile.group]
            .getOne();

        chips.push({info: chipInfo, tile: tile.name});
    }
    for (let i in sellTiles) {
        let tile = sellTiles[i],
            chipInfo = self.getChipInfo('black');
        chips.push({info: chipInfo, tile: tile.name});
    }
    return chips;
}
