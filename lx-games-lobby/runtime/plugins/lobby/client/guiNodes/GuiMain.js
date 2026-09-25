// @lx:namespace lxGames.lobby;
class GuiMain extends lx.GuiNode {
	// @lx:behavior lxGames.lobby.GuiNodeBehavior;

	init() {
		this._game = 'all';
		this._draft = null;

		// Tabs: the lobby itself is the first, permanent one; a game
		// launched from it opens as another tab
		this._tabs = [{id: 'lobby', closable: false}];
		this._activeTab = 'lobby';
		this._tabSeq = 0;
		this._waitingTabs = {};
		this._panes = {lobby: this.getElem('lobbyPane')};

		_renderTabStrip(this);
	}

	subscribeEvents() {
		const plugin = this.getPlugin();
		plugin.on('lobby.joinRoom',    e  => _joinRoom(this, e.getData().room));
		plugin.on('lobby.watchRoom',   e  => _watchRoom(this, e.getData().room));
		plugin.on('lobby.playOffline', e  => _playOffline(this, e.getData().gameKey));
		plugin.on('lobby.openCreate',  e  => _openCreate(this, e.getData().gameKey));
		plugin.on('lobby.openSignIn',  () => _openSignIn(this));

		plugin.on('lobby.gameBundleReceived', e => {
			const gameKey = e.getData().gameKey;
			const tabId = _shiftWaitingTab(this, gameKey);
			if (!tabId) return;

			const pane = this._panes[tabId];
			pane.clear();

			const bundle = e.getData().gameBundle;
			pane.setPlugin({info: bundle});
		});
	}
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* --- Actions requested by other guiNodes via plugin events --- */

function _joinRoom(self, room) {
	const user = self.getUser();
	if (user.isGuest()) { _openSignIn(self); return; }

	if (!room.join()) return;

	self.triggerPluginEvent('lobby.roomsChanged', {});
	_openGameTab(self, room.game, room.name);
}

function _watchRoom(self, r) {
	_openGameTab(self, r.game, r.name);
}

function _playOffline(self, gameKey) {
	const games = self.getCore().games;
	const gameInfo = games.byKey(gameKey);
	if (!gameInfo.offline) return;
	
	const tabId = _openGameTab(self, gameInfo.key, gameInfo.title);
	_addWaitingTab(self, tabId, gameKey);
}

/* --- Tabs --- */

function _addWaitingTab(self, tabId, gameKey) {
	self._waitingTabs[tabId] = gameKey;
}

function _shiftWaitingTab(self, gameKey) {
	let tabId = null;
	for (let iTabId in self._waitingTabs) {
		if (self._waitingTabs[iTabId] === gameKey) {
			tabId = iTabId
			break;
		}
	}

	if (tabId === null) {
		console.error('Can not find suitable waiting tab for', gameKey);
		return null;
	}

	delete self._waitingTabs[tabId];
	return tabId;
}

function _renderTabStrip(self) {
	const strip = self.getElem('tabStrip');
	strip.clear();

	self._tabs.forEach(t => {
		const css = ['lobby-tab'];
		if (t.id === self._activeTab) css.push('lobby-tab-active');
		const tab = strip.add(lx.Box, {css});
		tab.add(lx.Box, {text: t.id === 'lobby' ? lx.i18n(lobby.tabLobby) : t.label});
		tab.click(() => _switchTab(self, t.id));

		if (t.closable) {
			const close = tab.add(lx.Box, {css: 'lobby-tab-close', text: '×'});
			close.click(e => {
				if (e && e.stopPropagation) e.stopPropagation();
				_closeTab(self, t.id);
			});
		}
	});
}

function _switchTab(self, id) {
	self._activeTab = id;
	Object.keys(self._panes).forEach(paneId => {
		if (paneId === id) self._panes[paneId].style('display', null);
		else self._panes[paneId].style('display', 'none');
	});
	_renderTabStrip(self);
}

function _closeTab(self, id) {
	const idx = self._tabs.findIndex(t => t.id === id);
	if (idx === -1) return;
	self._tabs.splice(idx, 1);

	const pane = self._panes[id];
	if (pane) {
		self.getElem('workspace').remove(pane);
		delete self._panes[id];
	}

	if (self._activeTab === id) _switchTab(self, 'lobby');
	else _renderTabStrip(self);
}

// Opens a new tab showing (a mock of) the running game - every launch
// point (create/join/watch/play offline) funnels through here. Real
// gameplay doesn't exist yet, so the pane is just a placeholder; this is
// the seam where an actual embedded game replaces it.
function _openGameTab(self, gameId, label) {
	const id = 'tab' + (self._tabSeq++);
	self._tabs.push({id, label, closable: true});

	const workspace = self.getElem('workspace');
	const pane = workspace.add(lx.Box, {css: 'lobby-game-pane'});
	pane.style('background', lxGames.lobby.UiHelpers.gameAccent(gameId));
	pane.add(lx.Box, {css: 'lobby-game-pane-title', text: label});
	pane.add(lx.Box, {css: 'lobby-game-pane-note', text: lx.i18n(lobby.gamePaneNote)});
	self._panes[id] = pane;

	_switchTab(self, id);
	return id;
}


/* --- Modals --- */

function _closeModal(self) {
	self.getElem('modalRoot').clear();
}

function _openOverlay(self) {
	const root = self.getElem('modalRoot');
	root.clear();
	const overlay = root.add(lx.Box, {css: 'lobby-overlay'});
	overlay.style({
		'position': 'fixed',
		'margin': 'auto',
		'width': '100%',
		'height': '100%'
	});
	return overlay.add(lx.Box, {css: 'lobby-modal'});
}

function _openSignIn(self) {
	const modal = _openOverlay(self);

	modal.add(lx.Box, {css: 'lobby-modal-title', text: lx.i18n(lobby.signInTitle)});
	modal.add(lx.Box, {css: 'lobby-modal-sub', text: lx.i18n(lobby.signInText)});

	const foot = modal.add(lx.Box, {css: 'lobby-modal-foot-col'});
	const cont = foot.add(lx.Box, {css: ['lobby-btn', 'lobby-btn-primary'], text: lx.i18n(lobby.continue)});
	cont.click(() => {
		self.getUser().signIn();
		_closeModal(self);
	});
	foot.add(lx.Box, {css: ['lobby-btn', 'lobby-btn-disabled'], text: lx.i18n(lobby.google) + ' · ' + lx.i18n(lobby.comingSoon)});
	const cancel = foot.add(lx.Box, {css: ['lobby-btn', 'lobby-btn-ghost'], text: lx.i18n(lobby.cancel)});
	cancel.click(() => _closeModal(self));
}

function _openCreate(self, gameKey) {
	if (self.getUser().isGuest()) { _openSignIn(self); return; }

	const games = self.getCore().games;
	const onlineGames = games.online();
	const initial = (gameKey && gameKey !== 'all') ? gameKey : (self._game !== 'all' ? self._game : onlineGames[0].key);
	self._draft = {game: initial, name: undefined, seats: games.byKey(initial).maxSlots, priv: false};
	_renderCreateModal(self);
}

function _renderCreateModal(self) {
	const draft = self._draft;
	const games = self.getCore().games;
	const g = games.byKey(draft.game);
	const onlineGames = games.online();

	const modal = _openOverlay(self);
	modal.add(lx.Box, {css: 'lobby-modal-title', text: lx.i18n(lobby.newRoom)});
	modal.add(lx.Box, {css: 'lobby-modal-sub', text: lx.i18n(lobby.newRoomSub)});

	const gameField = modal.add(lx.Box, {css: 'lobby-field'});
	gameField.add(lx.Box, {css: 'lobby-field-label', text: lx.i18n(lobby.game)});
	const gameSeg = gameField.add(lx.Box, {css: 'lobby-seg'});
	onlineGames.forEach(x => {
		const css = x.key === draft.game ? ['lobby-seg-btn', 'lobby-seg-btn-active'] : 'lobby-seg-btn';
		const b = gameSeg.add(lx.Box, {css, text: x.title});
		b.click(() => {
			draft.name = nameInput.value();
			draft.game = x.key;
			draft.seats = self.getCore().games.byKey(x.key).maxSlots;
			_renderCreateModal(self);
		});
	});

	const nameField = modal.add(lx.Box, {css: 'lobby-field'});
	nameField.add(lx.Box, {css: 'lobby-field-label', text: lx.i18n(lobby.tableName)});
	const user = self.getUser();
	const nameValue = draft.name !== undefined ? draft.name : lx.i18n(lobby.defaultRoomName, {host: user.login});
	const nameInput = nameField.add(lx.Input, {css: 'lobby-input', value: nameValue});

	const seatsField = modal.add(lx.Box, {css: 'lobby-field'});
	seatsField.add(lx.Box, {css: 'lobby-field-label', text: lx.i18n(lobby.seats)});
	const seatsSeg = seatsField.add(lx.Box, {css: 'lobby-seg'});
	for (let n = g.minSlots; n <= g.maxSlots; n++) {
		const css = n === draft.seats ? ['lobby-seg-btn', 'lobby-seg-btn-active'] : 'lobby-seg-btn';
		const b = seatsSeg.add(lx.Box, {css, text: String(n)});
		b.click(() => {
			draft.name = nameInput.value();
			draft.seats = n;
			_renderCreateModal(self);
		});
	}

	const privField = modal.add(lx.Box, {css: ['lobby-field', 'lobby-switch-row']});
	const sw = privField.add(lx.Switch, {value: draft.priv});
	sw.on('change', () => { draft.priv = sw.value(); });
	privField.add(lx.Box, {text: lx.i18n(lobby.private)});

	const foot = modal.add(lx.Box, {css: 'lobby-modal-foot'});
	const cancel = foot.add(lx.Box, {css: ['lobby-btn', 'lobby-btn-ghost'], text: lx.i18n(lobby.cancel)});
	cancel.click(() => _closeModal(self));
	const create = foot.add(lx.Box, {css: ['lobby-btn', 'lobby-btn-primary'], text: lx.i18n(lobby.create)});
	create.click(() => _submitCreate(self, nameInput.value()));
}

function _submitCreate(self, name) {
	const draft = self._draft;
	const user = self.getUser();
	const finalName = (name || '').trim() || lx.i18n(lobby.defaultRoomName, {host: user.login});

	self.getCore().rooms.create({
		id: Date.now(),
		game: draft.game,
		name: finalName,
		host: user.login,
		seats: [user.login],
		max: draft.seats,
		state: 'waiting',
		locked: draft.priv,
	});
	self._draft = null;
	_closeModal(self);

	self._game = draft.game;
	self.triggerPluginEvent('lobby.gameSelected', {gameKey: draft.game});
	self.triggerPluginEvent('lobby.roomsChanged', {});
	_openGameTab(self, draft.game, finalName);
}
