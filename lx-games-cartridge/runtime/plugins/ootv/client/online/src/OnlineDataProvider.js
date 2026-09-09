// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv;
class OnlineDataProvider extends lxGames.actions.OnlineDataProvider {
    init() {
        this.colors = {};
    }

    reset() {
        //TODO
    }

    setColors(colors) {
        this.colors = colors;
    }

    getBoards() {
        return lxGames.ootv.BoardsDataProvider.getAll();
    }

    getBoardMap(index) {
        return lxGames.ootv.BoardsDataProvider.get(index);
    }
}
