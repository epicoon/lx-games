// @lx:namespace lxGames.actions;
class RequestAction {
    constructor(requestData = {}) {
        this.game = null;
        this.type = null;
        this.requestData = requestData;
        this.responseData = {};
    }

    getGame() {
        return this.game;
    }

    getPlugin() {
        return this.game.getPlugin();
    }

    setGame(game) {
        this.game = game;
    }

    setRequestData(data) {
        this.requestData = data;
    }

    addRequestData(data) {
        this.requestData.lxMerge(data);
    }

    setResponseData(data) {
        this.responseData = data;
    }

    addResponseData(data) {
        this.responseData.lxMerge(data);
    }

    run() {
        // abstract
    }
}
