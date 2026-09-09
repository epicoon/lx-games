// @lx:namespace lxGames.ootv;
class SpiritChip extends lxGames.ootv.WorldObject {
    constructor(game, mesh, name, initiator, tile) {
        super(game, name, mesh);

        this.mesh.name = name;
        this.initiator = initiator;
        this.tile = tile;
    }

    clear() {
        this.mesh = null;
        this.initiator = null;
        this.tile = null;
    }

    checkOnUseDice() {
        this.apply();
    }

    apply() {
        const game = this.game;
        let tile = this.tile,
            originChip = this.initiator;

        game.world.clearSpiritStuff();

        game.actions.trigger(new lxGames.ootv.ActionApplyChip({
            gamer: game.getActiveGamer().getToken(),
            from: originChip.tile.name,
            to: tile.name,
            dice: game.activeDice ? game.activeDice.index : null
        }));
    }
}
