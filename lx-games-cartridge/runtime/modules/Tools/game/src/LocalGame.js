// @lx:namespace lxGames.Tools;
class LocalGame  extends lx.Object {
    constructor(env) {
        super();

        this._environment = env;
        this._plugin = env.getPlugin();
        this.gamers = {};

        if (this.constructor.lxHasMethod('getActionsDependencies') && lxGames.actions) {
            let actionsClass = this.constructor.lxHasMethod('getActionsClass')
                ? this.constructor.getActionsClass()
                : lxGames.actions.Actions;
            this.actions = new actionsClass(this);
        }

        this.init();
    }

    static getGamerClass() {
        return lxGames.Tools.LocalGamer;
    }

    init() {
        // abstract
    }

    isLocal() {
        return true;
    }
    
    getPlugin() {
        return this._plugin;
    }

    getCore() {
        return this._plugin.core;
    }

    getEnvironment() {
        return this._environment;
    }

    triggerLocalEvent(name, args = {}) {
        this.getPlugin().trigger(name, args);
    }

    subscribe(name, callback) {
        this.getPlugin().on(name, callback);
    }

    getGamers() {
        return this.gamers;
    }

    getGamersCount() {
        let counter = 0;
        for (let i in this.gamers) counter++;
        return counter;
    }

    forEachGamer(f) {
        for (let id in this.gamers)
            f(this.gamers[id]);
    }

    getGamerById(id) {
        return this.gamers[id];
    }
}
