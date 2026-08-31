class WebSocketClient extends lx.socket.WebSocketClient {
	constructor(config) {
		let env = config.env,
			handlers = {};
		if (config.channelEventListener)
			handlers.onChannelEvent = lx.isString(config.channelEventListener)
				? lx.createObject(config.channelEventListener, [env])
				: new config.channelEventListener(env);

		if (!config.connectionEventListener)
			config.connectionEventListener = lxGames.Tools.ConnectionEventListener;

		var listener = lx.isString(config.connectionEventListener)
			? lx.createObject(config.connectionEventListener, [env])
			: new config.connectionEventListener(env);

		if (listener.onConnected)
			handlers.onConnected = listener.onConnected;
		if (listener.onMessage)
			handlers.onMessage = listener.onMessage;
		if (listener.onClientJoin)
			handlers.onClientJoin = listener.onClientJoin;
		if (listener.onClientLeave)
			handlers.onClientLeave = listener.onClientLeave;
		if (listener.onClientDisconnected)
			handlers.onClientDisconnected = listener.onClientDisconnected;
		if (listener.onClientReconnected)
			handlers.onClientReconnected = listener.onClientReconnected;
		if (listener.onClose)
			handlers.onClose = listener.onClose;
		if (listener.onError)
			handlers.onError = listener.onError;

		super({
			protocol: config.protocol,
			port: config.port,
			url: config.url,
			channel: config.channel,
			handlers
		});

		this._environment = env;
	}

	getEnvironment() {
		return this._environment;
	}
}
