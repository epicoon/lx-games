// @lx:namespace lxGames.Tools;
class ChannelEventListener extends lx.socket.EventListener {
	constructor(env) {
		super();
		this._environment = env;
		this._plugin = env.getPlugin();
	}

	getPlugin() {
		return this._plugin;
	}

	getEnvironment() {
		return this._environment;
	}

	getGame() {
		return this.getEnvironment().getGame();
	}

	onError(event) {
		lx.tostError(event.getData().message);
	}

	onNewGamer(event) {__onChangeGamersList(this, event.getData())}
	onGamerReconnected(event) {__onGamerReconnected(this, event.getData())}
	onObserverConnected(event) {__onObserverConnected(this, event.getData())}
	onGameStuffed(event) {__onGameStuffed(this, event.getData())}
	onGamePrepared(event) {__onGamePrepared(this, event.getData())}
	onGameLoaded(event) {__onConditionReceived(this, event.getData().gameData)}

	onGameActivated() {
		this.getGame()._conditionStatus = lxGames.Tools.CONDITION_STATUS_ACTIVE;
	}

	onGameOver(event) {
		this.getGame()._conditionStatus = lxGames.Tools.CONDITION_STATUS_OVER;
		this.getPlugin().trigger('ENV_gameOver');
	}

	onSetGameReferences(event) {
		this.getPlugin().trigger('ENV_gameReferencesReceived', event.getData());
	}

	onAskForRevenge(event) {
		__onRevenge(this, event.getData());
	}

	onRevengeVote(event) {
		this.getPlugin().trigger('ENV_revengeVoted', event.getData());
	}
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/**
 * @private
 * @param self {lxGamers.ChannelEventListener}
 * @param data {Object}
 *
 * @trigger ENV_gameStuffed
 */
function __onGameStuffed(self, data) {
	const env = self.getEnvironment();
	env.unlockScreen();
	env.game.setStuffed(true);
	if (env.game._conditionStatus == lxGames.Tools.CONDITION_STATUS_PENDING)
		env.game._conditionStatus = lxGames.Tools.CONDITION_STATUS_PREPARING;
	self.getPlugin().trigger('ENV_gameStuffed');
}

/**
 * @private
 * @param self {lxGamers.ChannelEventListener}
 * @param data {Object}
 *
 * @trigger ENV_gamePrepared
 */
function __onGamePrepared(self, data) {
	if (data.roleAroundGame) {
		const env = self.getEnvironment();
		env.game.getLocalGamer().setType(data.roleAroundGame);
		env.game._conditionStatus = lxGames.Tools.CONDITION_STATUS_PREPARED;
		delete data.roleAroundGame;
	}
	self.getPlugin().trigger('ENV_gamePrepared', data);
}

/**
 * @private
 * @param self {lxGamers.ChannelEventListener}
 * @param list {Object}
 *
 * @trigger ENV_changeGamersList
 */
function __onChangeGamersList(self, list) {
	const game = self.getGame();
	for (let i=0; i<list.len; i++) {
		let pare = list[i];
		let mate = self.getEnvironment().getSocket().getChannelMate(pare.connectionId);
		game.registerGamer(mate, pare.gamerId);
	}
	self.getPlugin().trigger('ENV_changeGamersList');
}

/**
 * @private
 * @param self {lxGamers.ChannelEventListener}
 * @param data {Object: {
 *     reconnectionData {Object},
 *     gameData {Object},
 *     gamersData {Object}
 * }}
 *
 * @trigger ENV_gamePrepared
 * @trigger ENV_changeGamersList
 * @trigger ENV_gamerReconnected
 * @trigger ENV_gameConditionReceived
 * @trigger ENV_gameOver
 * @trigger ENV_revengeRequested
 */
function __onGamerReconnected(self, data) {
	const env = self.getEnvironment(),
		mate = env.getSocket().getChannelMate(data.reconnectionData.newConnectionId);
	if (!mate.isLocal()) {
		const game = self.getGame();
		for (let i in game.gamers) {
			let gamer = game.gamers[i];
			if (gamer._connectionId == data.reconnectionData.oldConnectionId)
				gamer.updateChannelMate(mate);
		}
		return;
	}

	env.game.setStuffed(data.reconnectionData.gameIsStuffed);
	if (env.game.isStuffed())
		env.unlockScreen();

	__onChangeGamersList(self, data.gamersData);
	self.getPlugin().trigger('ENV_gamerReconnected', data.gameData);
	__onConditionReceived(self, data.gameData);
}

/**
 * @private
 * @param self {lxGamers.ChannelEventListener}
 * @param data {Object: {
 *     observerId {String},
 *     gamersData {Object},
 *     gameData {Object},
 *     gameIsPending {Boolean}
 * }}
 *
 * @trigger ENV_gamePrepared
 * @trigger ENV_changeGamersList
 * @trigger ENV_gameConditionReceived
 * @trigger ENV_observerConnected
 * @trigger ENV_gameOver
 * @trigger ENV_revengeRequested
 */
function __onObserverConnected(self, data) {
	const env = self.getEnvironment(),
		mate = env.getSocket().getChannelMate(data.observerId);
	if (mate.isLocal()) {
		env.game.setStuffed(data.gameIsStuffed);
		if (env.game.isStuffed())
			env.unlockScreen();

		__onChangeGamersList(self, data.gamersData);
		__onConditionReceived(self, data.gameData);
	}

	self.getPlugin().trigger('ENV_observerConnected', data.gameData);
}

/**
 * @private
 * @param self {lxGamers.ChannelEventListener}
 * @param condition {Object|null}
 *
 * @trigger ENV_gamePrepared
 * @trigger ENV_gameConditionReceived
 * @trigger ENV_gameOver
 * @trigger ENV_revengeRequested
 */
function __onConditionReceived(self, condition) {
	if (condition === null) return;

	switch (condition.conditionStatus) {
		case lxGames.Tools.CONDITION_STATUS_PREPARED:
			__onGamePrepared(self, condition);
			break;
		case lxGames.Tools.CONDITION_STATUS_ACTIVE:
			self.getGame()._conditionStatus = lxGames.Tools.CONDITION_STATUS_ACTIVE;
			self.getPlugin().trigger('ENV_gameConditionReceived', condition);
			break;
		case lxGames.Tools.CONDITION_STATUS_OVER:
			self.getGame()._conditionStatus = lxGames.Tools.CONDITION_STATUS_OVER;
			self.getPlugin().trigger('ENV_gameOver', condition);
			break;
		case lxGames.Tools.CONDITION_STATUS_REVENGE:
			delete condition.conditionStatus;
			__onRevenge(self, condition);
			break;
	}
}

/**
 * @private
 * @param self {lxGamers.ChannelEventListener}
 * @param revengeData {Object}
 *
 * @trigger ENV_revengeRequested
 */
function __onRevenge(self, revengeData) {
	self.getPlugin().trigger('ENV_revengeRequested', revengeData);
}
