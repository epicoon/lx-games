// @lx:module lxGames.ootv.LocalGame;
// @lx:module-data: i18n = {plugin:OotvPlugin}/assets/i18n/main.yaml;

lx.import(
	lxGames.Local,
	'-R src/',
	'../GameBehavior',
	'-R gui/',
	'LocalGamer',
	'GameStorage'
);

// @lx:namespace lxGames.ootv;
class LocalGame extends lxGames.Tools.LocalGame {
	// @lx:behavior lxGames.ootv.GameBehavior;

	static getActionsDependencies() {
		return {
			dataProviderClass: lxGames.ootv.LocalDataProvider,
			requestActionsNamespace: 'lxGames.ootv',
			responseActionsNamespace: 'lxGames.ootv.dataProvider'
		};
	}

	init(env) {
		this.ai = null;
		this.guiExtender = new lxGames.ootv.LocalGuiExtender(this);
		this.construct();

		this.getPlugin().on('ootv_game_reset', ()=>{
			lxGames.ootv.GameStorage.clear();
		});

		this.onLocalEvent('ootv_action_processed', ()=>{
			if (this.status.isOver()) lxGames.ootv.GameStorage.clear();
			else lxGames.ootv.GameStorage.save(this);
		});

		const saved = lxGames.ootv.GameStorage.load();
		if (saved)
			this.getPlugin().on('ENV_gameCreated', ()=>lxGames.ootv.GameStorage.restore(this, saved));
	}

	reset() {
		this.activeDice = null;
		this.phase = null;
		this.turn = 0;
		this.activeGamer = null;

		for (let i in this.gamers) {
			this.gamers[i].clear();
		}
		this.gamers = [];

		this.commonBoard.clear();
		this.actions.dataProvider.reset();
	}

	isLocal() {
		return true;
	}

	getGuiExtender() {
		if (this.guiExtender === null) {
			this.guiExtender = new lxGames.ootv.LocalGuiExtender(this);
		}
		return this.guiExtender;
	}

	isUntouchable() {
		if (!this.activeGamer) return true;
		if (this.getActiveGamer().AI) return true;
		return false;
	}

	initGamer(params) {
		const existing = this.gamers[params.colorId];
		if (existing && existing.gamerBoard) existing.clear();

		const gamer = new lxGames.ootv.LocalGamer(this, params);
		this.gamers[gamer.colorId] = gamer;
		return gamer;
	}

	getGamer(token) {
		return this.getGamerByColor(token);
	}

	getGamerByColor(color) {
		return this.gamers[color];
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
}
