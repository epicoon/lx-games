// @lx:module lxGames.ootv.OnlineGame;
// @lx:module-data: i18n = {plugin:OotvPlugin}/assets/i18n/main.yaml;

lx.import(
	lxGames.Online,
	'-R src/',
	'../GameBehavior',
	'-R gui/',
	'OnlineGamer'
);

// @lx:namespace lxGames.ootv;
class OnlineGame extends lxGames.Tools.OnlineGame {
	// @lx:behavior lxGames.ootv.GameBehavior;

	static getGamerClass() {
		return lxGames.ootv.OnlineGamer;
	}

	static getChannelEventListenerClass() {
		return lxGames.ootv.ChannelEventListener;
	}

	static getActionsDependencies() {
		return {
			dataProviderClass: lxGames.ootv.OnlineDataProvider,
			requestActionsNamespace: 'lxGames.ootv',
			responseActionsNamespace: 'lxGames.ootv.dataProvider'
		};
	}

	init() {
		this.serverStatus = new lxGames.ootv.GamerServerStatus();
		this.guiExtender = new lxGames.ootv.OnlineGuiExterder(this);
		_subscribeEvents(this);
		this.construct();
	}

	reset() {
		this.activeDice = null;
		this.phase = null;
		this.turn = 0;
		this.activeGamer = null;

		for (let i in this.gamers) {
			this.gamers[i].clear();
		}

		this.commonBoard.clear();
		this.actions.dataProvider.reset();
	}

	getGuiExtender() {
		if (this.guiExtender === null) {
			this.guiExtender = new lxGames.ootv.OnlineGuiExterder(this);
		}
		return this.guiExtender;
	}

	isUntouchable() {
		if (!this.activeGamer) return true;
		if (!this.getActiveGamer().isLocal()) return true;
		return false;
	}

	initGamer(params) {
		const gamer = this.getGamerById(params.id);
		gamer.initParams({
			colorId: this.actions.dataProvider.colors[params.id]
		});
		return gamer;
	}

	getGamer(token) {
		return this.getGamerById(token);
	}
}

function _subscribeEvents(self) {
	const plugin = self.getPlugin();

	plugin.on('ENV_gamePrepared', event => {
		self.serverStatus.set(event.data.gameStatus);
		self.getLocalGamer().serverStatus.set(event.data.gamerStatus);

		plugin.getGuiNode('newGameMenu').show();
		plugin.trigger('ootv_staffed');
	});

	plugin.on('ENV_gameConditionReceived', event => {
		const condition = event.getData();
		(new lxGames.ootv.Reloader(self, condition)).run();
	});
}
