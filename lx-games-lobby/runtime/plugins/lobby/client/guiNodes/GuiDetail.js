// @lx:namespace lxGames.lobby;
class GuiDetail extends lx.GuiNode {
	// @lx:behavior lxGames.lobby.GuiNodeBehavior;

	init() {
		this._game = null;
	}

	initHandlers() {
		this.getElem('detailCreateBtn').click(() => {
			if (!this._game || !this._game.online) return;
			this.triggerPluginEvent('lobby.openCreate', {gameKey: this._game.key});
		});

		this.getElem('detailOfflineBtn').click(() => {
			if (!this._game || !this._game.offline) return;

			const gameKey = this._game.key;

			(new lx.HttpRequest('/game/get')).
				setParams({game: gameKey}).
				send().then(res => {
					const plugin = this.getPlugin();
					plugin.trigger('lobby.gameBundleReceived', {
						gameKey,
						gameBundle: res.gameBundle,
					});
				});

			this.triggerPluginEvent('lobby.playOffline', {gameKey: this._game.key});
		});
	}

	subscribeEvents() {
		const plugin = this.getPlugin();

		plugin.on('lobby.Loader.gamesLoaded', () => _selectGame(this, 'all'));
		plugin.on('lobby.gameSelected', e => _selectGame(this, e.getData().gameKey));

		plugin.on('lobby.user.changed', () => _updateNote(this));
		plugin.on('lobby.Loader.roomsLoaded', () => _updateWaitingCount(this));
		plugin.on('lobby.roomsChanged', () => _updateWaitingCount(this));
	}
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function _selectGame(self, gameKey) {
	const core = self.getCore();
	if (core.games.isEmpty())
		return;

	const game = gameKey === 'all' ? core.games.all()[0] : core.games.byKey(gameKey);

	const card = self.getWidget();
	if (self._game) card.unbind();
	self._game = game;
	card.bind(game);

	// Fields bind() can't express as a single simple [f:title] mapping.
	const cover = game.banner ? `url(${game.banner})` : lxGames.lobby.UiHelpers.gameAccent(game.key);
	self.getElem('detailCover').style('backgroundImage', cover);
	self.getElem('detailPlayers').text(game.minSlots === game.maxSlots ? String(game.minSlots) : game.minSlots + '–' + game.maxSlots);
	_setTagClass(self.getElem('detailOnlineTag'), game.online);
	_setTagClass(self.getElem('detailOfflineTag'), game.offline);
	self.getElem('detailCreateBtn').toggleClassOnCondition(!game.online, 'lobby-btn-disabled');
	self.getElem('detailOfflineBtn').toggleClassOnCondition(!game.offline, 'lobby-btn-disabled');

	_updateWaitingCount(self);
}

function _setTagClass(box, on) {
	box.removeClass('lobby-tag-on');
	box.removeClass('lobby-tag-off');
	box.addClass(on ? 'lobby-tag-on' : 'lobby-tag-off');
}

//TODO - это точно должно быть тут?
function _updateWaitingCount(self) {
	if (!self._game) return;
	self._game.waitingCount = self.getCore().rooms.waitingCount(self._game.key);
}

function _updateNote(self) {
	self.getElem('detailNote').style('display', self.getUser().isGuest() ? '' : 'none');
}
