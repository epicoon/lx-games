// @lx:namespace lxGames.actions;
class OnlineDataProvider {
    constructor(actions) {
        this.actions = actions;
        this.game = actions.game;
        this.init();
    }

    init() {
        // abstract
    }

    onClientAction(action) {
        this.game.getEnvironment().triggerChannelEvent('action', {
            action: action.lxClassName(),
            data: action.requestData
        });
    }

    onServerAction(responseData) {
        const action = responseData.action,
            actionData = responseData.actionData,
            subActions = responseData.subActions || null;
        this.actions.actionHandler.handle(action, actionData, subActions);
    }
}
