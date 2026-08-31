/*
 * Game life cycle events:
 * - ENV_gameReferencesReceived
 * - ENV_gameConditionReceived
 * - ENV_gameCreated
 * - ENV_socketConnected
 * - ENV_changeGamersList
 * - ENV_localGamerConnected
 * - ENV_gamerReconnected
 * - ENV_observerConnected
 * - ENV_gameStuffed
 * - ENV_gamePrepared
 * - ENV_gameOver
 * - ENV_revengeRequested
 * - ENV_revengeVoted
 */
// @lx:namespace lxGames.Tools;
class OnlineGame extends lxGames.Tools.LocalGame {
	constructor(env) {
		super(env);

		this._stuffed = false;
		this._conditionStatus = lxGames.Tools.CONDITION_STATUS_PENDING;
	}

	static getChannelEventListenerClass() {
		return lxGames.Tools.ChannelEventListener;
	}

	static getConnectionEventListenerClass() {
		return lxGames.Tools.ConnectionEventListener;
	}

	static getGamerClass() {
		return lxGames.Tools.OnlineGamer;
	}

	isLocal() {
		return false;
	}

	isStuffed() {
		return this._stuffed;
	}

	setStuffed(value) {
		this._stuffed = value;
	}

	registerGamer(channelMate, gamerId) {
		if (gamerId in this.gamers) return;
		let gamerClass = lx.self(getGamerClass());
		const gamer = new gamerClass(this, gamerId, channelMate);
		this.gamers[gamerId] = gamer;
		if (gamer.isLocal())
			this.getPlugin().trigger('ENV_localGamerConnected');
	}

	getLocalGamer() {
		for (let id in this.gamers) {
			let gamer = this.gamers[id];
			if (gamer.isLocal()) return gamer;
		}
		return null;
	}

	getGamerByChannelMate(mate) {
		for (let id in this.gamers) {
			let gamer = this.gamers[id];
			if (gamer._connectionId == mate.getId()) return gamer;
		}
		return null;
	}

	getChannelMateByGamer(gamer) {
		return this.getEnvironment().socket.getChannelMate(gamer.getChannelMateId());
	}
}
