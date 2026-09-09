// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv;
class LocalDataProvider extends lxGames.actions.LocalDataProvider {
    init() {
        this.localInit = {
            gamersCount: 0,
            gamerColors: [],
            firstGamer: '',
            prepareGameData: {}
        };
        this.points = {};

        const packs = lx.yaml('{plugin:OotvPlugin}/data/packs.yaml');
        this.packs = new lxGames.ootv.Packs(this.game, packs);
    }
    
    reset() {
        this.localInit = {
            gamersCount: 0,
            gamerColors: [],
            firstGamer: '',
            prepareGameData: {}
        };
        this.points = {};
    }

    findNextGamer() {
        const game = this.game;

        if (game.gamers.lxEmpty())
            return this.localInit.firstGamer;

        for (let i = 6; i >= 0; i--) {
            let tile = game.commonBoard.tiles['seq' + i];

            for (let j = tile.chipsCount() - 1; j >= 0; j--) {
                let chip = tile.chips[j],
                    colorId = chip.info.colorId,
                    gamer = game.gamers[colorId];

                if (gamer.turn < game.turn) {
                    return colorId;
                }
            }
        }
        return null;
    }

    getGamerPoints(colorId) {
        if (!(colorId in this.points))
            this.points[colorId] = [];
        return this.points[colorId];
    }

    getBoards() {
        return lxGames.ootv.BoardsDataProvider.getAll();
    }

    getBoardMap(index) {
        return lxGames.ootv.BoardsDataProvider.get(index);
    }
}
