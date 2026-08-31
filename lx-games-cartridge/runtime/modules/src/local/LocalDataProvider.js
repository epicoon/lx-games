// @lx:namespace lxGames.actions;
class LocalDataProvider {
    constructor(actions) {
        this.actions = actions;
        this.game = actions.game;
        this.init();
    }

    init() {
        // abstract
    }

    onClientAction(action) {
        let actionName = this.actions.responseActionsNamespace + '.' + action.lxClassName(),
            actionClass = lx.getClassConstructor(actionName),
            result;
        if (!actionClass) result = {actionData: {}, subActions: null}
        else {
            const responseAction = new actionClass(this, action.requestData);
            responseAction.run();
            result = responseAction.outputData;
        }
        this.actions.actionHandler.handle(action, result.actionData, result.subActions);
    }
}
