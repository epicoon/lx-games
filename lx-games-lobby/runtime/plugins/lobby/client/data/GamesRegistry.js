// @lx:namespace lxGames.lobby;
class GamesRegistry {
	constructor(core) {
		this.core = core;

		this.games = new lx.ModelCollection();
		this.games.setModelClass(lxGames.lobby.Game);
	}

	isEmpty() {
		return this.games.len === 0;
	}

	// A plain array snapshot
	all() {
		return this.games.toArray();
	}

	online() {
		return this.games.toArray().filter(g => g.online);
	}

	byKey(key) {
		return this.games.toArray().find(g => g.key === key);
	}

	refresh(games) {
		this.games.reset(games);
	}
}
