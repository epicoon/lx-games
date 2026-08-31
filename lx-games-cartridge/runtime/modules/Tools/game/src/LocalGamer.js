// @lx:namespace lxGames.Tools;
class LocalGamer extends lx.Object {
    constructor(game, config = {}) {
        super();

        this.game = game;
        this.init(config);
    }

    init(config = {}) {
        // abstract
    }

    getGame() {
        return this.game;
    }

    isLocal() {
        return true;
    }
}
