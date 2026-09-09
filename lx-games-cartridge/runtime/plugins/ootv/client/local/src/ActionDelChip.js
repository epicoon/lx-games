// @lx:namespace lxGames.ootv.dataProvider;
class ActionDelChip extends lxGames.ootv.dataProvider.Action {
    run() {
        const game = this.game,
            gamer = game.getGamerByColor(this.inputData.gamer),
            tile = gamer.getTile(this.inputData.tile);

        this.outputData.add('delChips', [{
            gamer: gamer.colorId,
            tile: tile.name,
            count: 1
        }]);
    }
}
