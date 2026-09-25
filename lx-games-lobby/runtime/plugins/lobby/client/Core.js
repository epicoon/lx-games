lx.import(lxGames.lobby.MockData);
lx.import(lx.socket.WebSocketClient);

// @lx:namespace lxGames.lobby;
class Core extends lx.PluginCore {
    init() {
        this.user = new lxGames.lobby.User(this);

		this.games = new lxGames.lobby.GamesRegistry(this);
		this.rooms = new lxGames.lobby.RoomsRegistry(this);
        this.loader = new lxGames.lobby.Loader(this);

        this.channel = new lx.socket.WebSocketClient({port: lx.app.params.wsPort, route: 'ws'});
        this.channel.connect();
    }

    loadReferences() {
        this.loader.load();
    }

    initHandlers() {
        //TODO
    }

    subscribeEvents() {
        //TODO
    }
}
