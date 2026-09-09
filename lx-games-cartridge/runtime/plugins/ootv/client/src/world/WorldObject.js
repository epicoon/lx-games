// @lx:namespace lxGames.ootv;
class WorldObject {
    constructor(game, name = null, mesh = null) {
        this.game = game;
        this.name = name;
        this.mesh = mesh;
    }

    isChip() {
        return false;
    }
}
