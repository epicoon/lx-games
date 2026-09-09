// @lx:namespace lxGames.ootv;
class OnlineGamer extends lxGames.Tools.OnlineGamer {
    // @lx:behavior lxGames.ootv.GamerBehavior;

    init() {
        this.serverStatus = new lxGames.ootv.GamerServerStatus();
        this.colorId = null;
    }

    initParams(params) {
        this.colorId = params.colorId;
    }

    getToken() {
        return this.getId();
    }

    onClear() {
        // pass
    }
}
