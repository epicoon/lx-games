// @lx:namespace lxGames.actions;
class ActionData {
    constructor(dataProvider) {
        this.dataProvider = dataProvider;
        this.game = dataProvider.game;
        this.actionData = {};
        this.subActions = {};
    }

    add(key, value) {
        this.actionData[key] = value;
    }

    get(key, _default = {}) {
        if (!(key in this.actionData))
            this.add(key, _default);
        return this.actionData[key];
    }
    
    merge(actionName, actionData) {
        this.subActions[actionName] = actionData.actionData;
        for (let i in actionData.subActions)
            this.subActions[i] = actionData.subActions[i];
    }
}
