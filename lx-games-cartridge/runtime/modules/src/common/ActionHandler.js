// @lx:namespace lxGames.actions;
class ActionHandler {
    constructor(actions) {
        this.actions = actions;
        this.game = actions.game;
    }

    handle(action, data, subActions = null) {
        if (data.success === false) {
            lx.tostError(data.error);
            return;
        }

        if (lx.isString(action)) {
            let className = lx.getClassConstructor( this.actions.requestActionsNamespace + '.' + action);
            action = new className();
        }

        action.setGame(this.game);
        action.setResponseData(data);
        action.run();

        if (subActions) {
            for (let actionName in subActions) {
                let data = subActions[actionName],
                    className = lx.getClassConstructor(this.actions.requestActionsNamespace + '.' + actionName),
                    subAction = new className();

                subAction.setGame(this.game);
                subAction.setResponseData(data);
                subAction.run();
            }
        }
    }
}
