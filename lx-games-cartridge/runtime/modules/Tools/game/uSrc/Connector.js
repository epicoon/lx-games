class Connector {
	constructor(plugin, env, gameConfig) {
		this._plugin = plugin;
		this._environment = env;
		this._gameConfig = gameConfig;

		this._isOnlineMode = !!(this._plugin.attributes && this._plugin.attributes.connectData);
		this._connectData = (this._isOnlineMode)
			? this._plugin.attributes.connectData
			: {};

		this.socket = null;

		this.run();
	}

	isOnline() {
		return this._isOnlineMode;
	}

	run() {
		if (lx.isString(this._gameConfig)) {
			this.initGame(this._gameConfig);
			return;
		}

		if (!lx.isObject(this._gameConfig)) {
			console.error('Wrong game configuration');
			return;
		}

		let className = this._gameConfig.class || null;

		if (this.isOnline() && this._gameConfig.online) {
			if (this._gameConfig.online.class) {
				this._gameConfig.class = this._gameConfig.online.class;
				className = this._gameConfig.class;
			}
			className = className || this._gameConfig.online.module;

			if (this._gameConfig.online.module) {
				this._plugin.useModule(
					this._gameConfig.online.module,
					()=>{
						let constructor = lx.getClassConstructor(className);
						this._gameConfig.channelEventListener = constructor.getChannelEventListenerClass();
						this._gameConfig.connectionEventListener = constructor.getConnectionEventListenerClass();
						this.initGame(className);
					}
				);
				return;
			}
		}

		if (!this.isOnline() && this._gameConfig.local) {
			if (this._gameConfig.local.class) {
				this._gameConfig.class = this._gameConfig.local.class;
				className = this._gameConfig.class;
			}
			className = className || this._gameConfig.local.module;

			this._plugin.useModule(
				this._gameConfig.local.module,
				()=>this.initGame(className)
			);
			return;
		}

		let constructor = lx.getClassConstructor(className);
		if (constructor) {
			if (constructor.getChannelEventListenerClass)
				this._gameConfig.channelEventListener = constructor.getChannelEventListenerClass();
			if (constructor.getConnectionEventListenerClass)
				this._gameConfig.connectionEventListener = constructor.getConnectionEventListenerClass();
		}
		this.initGame(className);
	}

	connect() {
		this.socket = new WebSocketClient({
			protocol: this._connectData.protocol,
			port: this._connectData.port,
			url: this._connectData.url,
			channel: this._connectData.channelKey,
			env: this._environment,
			connectionEventListener: this._gameConfig.connectionEventListener,
			channelEventListener: this._gameConfig.channelEventListener
		});
		this.socket.connect(this._connectData.userChannelData || {}, {
			token: this._connectData.token,
			password: this._connectData.password
		});
	}

	leave() {
		if (this.socket)
			this.socket.close();
	}

	trigger(eventName, data, receivers = null, returnToSender = true, privateMode = false) {
		if (this.socket)
			this.socket.trigger(eventName, data, receivers, returnToSender, privateMode);
		else
			console.error('Socket is undefined');
	}

	initGame(className) {
		this._environment.setGame(lx.createObject(className, [this._environment]), this.isOnline());

		if (this.isOnline()) {
			this._environment.lockScreen();
			this.connect();
		}
	}
}
