// @lx:namespace lxGames.ootv;
class LocalGuiExtender {
    constructor(game) {
        this.game = game;
    }

    apply() {
        const newGameMenu = this.game.getPlugin().getGuiNode('newGameMenu');
        newGameMenu.state = new lxGames.ootv.LocalNewGameMenuState(newGameMenu);
    }
}
