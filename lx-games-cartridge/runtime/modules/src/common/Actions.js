// @lx:namespace lxGames.actions;
class Actions {
    constructor(game) {
        this.game = game;

        let dep = this.game.constructor.getActionsDependencies(),
            dataProviderClass = dep.dataProviderClass
                || (game.isLocal() ? lxGames.actions.LocalDataProvider : lxGames.actions.OnlineDataProvider),
            actionHandlerClass = dep.actionHandlerClass || lxGames.actions.ActionHandler;

        this.dataProvider = new dataProviderClass(this);
        this.actionHandler = new actionHandlerClass(this);
    }

    get requestActionsNamespace() {
        return this.game.constructor.getActionsDependencies().requestActionsNamespace;
    }

    get responseActionsNamespace() {
        return this.game.constructor.getActionsDependencies().responseActionsNamespace;
    }

    trigger(action) {
        this.dataProvider.onClientAction(action);
    }
}
