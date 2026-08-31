lx.import(
	'-U uSrc/',
	'src/'
);

// @lx:namespace lxGames.Tools;
class Environment {
	constructor(plugin, config) {
		this._plugin = plugin;
		plugin.onDestruct(()=>this.destruct());

		this.mode = config.mode || 'prod';
		this.name = config.name || 'Unknown';
		this.type = this._plugin.attributes
			? this._plugin.attributes.gameType
			: '';

		this.useScreenLock = (config.useScreenLock === undefined) ? true : config.useScreenLock;
		this.game = null;
		this.gameEventHandler = null;
		this._connector = new Connector(plugin, this, config.game);
	}

	setGame(game, isOnline) {
		this.game = game;
		this._plugin.trigger('ENV_gameCreated');
	}

	getPlugin() {
		return this._plugin;
	}

	getSocket() {
		return this._connector.socket;
	}

	getGame() {
		return this.game;
	}

	isOnline() {
		return this._connector.isOnline();
	}

	socketRequest(route, data = {}) {
		if (!this._connector.socket) return {
			then: function(callback) {
				console.error('Socket connection doesn\'t exist');
			}
		};

		return this._connector.socket.request(route, data);
	}

	commonSocketRequest(route, data = {}) {
		if (!this._plugin || !this._plugin.parent || !this._plugin.parent.core || !this._plugin.parent.core.socket) return {
			then: function(callback) {
				console.error('Socket connection doesn\'t exist');
			}
		};

		return this._plugin.parent.core.socket.request(route, data);
	}

	destruct() {
		this._connector.leave();
	}

	triggerChannelEvent(
		eventName,
		data = {},
		receivers = null,
		returnToSender = true,
		privateMode = false
	) {
		this._connector.trigger(eventName, data, receivers, returnToSender, privateMode);
	}

	lockScreen() {
		if (this.useScreenLock) {
			this.screenLock = new lx.Box({parent: this.getPlugin().root, geom: true});
			this.screenLock.add(lx.Box, {geom: true, fill:'black', opacity:0.5});
			const textWrapper = this.screenLock.add(lx.Box, {
				geom: true,
				depthCluster: lx.DepthClusterMap.CLUSTER_OVER
			});
			textWrapper.text(lx.i18n(waiting));
			textWrapper.style('color', 'white');
			lx(textWrapper)>text.style('fontSize', '2em');
			textWrapper.align(lx.CENTER, lx.MIDDLE);
		}
	}

	unlockScreen() {
		if (this.useScreenLock) {
			this.screenLock.del();
			delete this.screenLock;
			this.useScreenLock = false;
		}
	}
}

lxGames.Tools.CONDITION_STATUS_PENDING = 'pending';
lxGames.Tools.CONDITION_STATUS_PREPARING = 'preparing';
lxGames.Tools.CONDITION_STATUS_PREPARED = 'prepared';
lxGames.Tools.CONDITION_STATUS_ACTIVE = 'active';
lxGames.Tools.CONDITION_STATUS_OVER = 'over';
lxGames.Tools.CONDITION_STATUS_REVENGE = 'revenge';
