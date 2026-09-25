// @lx:namespace lxGames.lobby;
class GuiCenter extends lx.GuiNode {
	init() {
		this._gameKey = 'all';
		this._filter = 'any';

		this.rooms = new lx.ModelCollection();
		this.rooms.setModelClass(lxGames.lobby.Room);

		_initMatrix(this);
	}

	initHandlers() {
		this.getElem('roomsEmptyCreate').click(() => this.triggerPluginEvent('lobby.openCreate', {gameKey: this._gameKey}));

		Object.keys(CHIP_KEYS).forEach(f => {
			this.getElem(CHIP_KEYS[f]).click(() => _setFilter(this, f));
		});
	}

	subscribeEvents() {
		const plugin = this.getPlugin();

		// _renderRoomRow reads core.games.byKey(...) for every row, so the
		// initial render has to wait for both games and rooms, not just rooms.
		plugin.on('lobby.Loader.dataLoaded', () => _applyFilter(this));

		plugin.on('lobby.gameSelected', e => {
			this._gameKey = e.data.gameKey;
			this._filter = 'any';

			_updateTitle(this);
			_updateChips(this);
			_applyFilter(this);
		});

		plugin.on('lobby.roomsChanged', () => _applyFilter(this));
	}
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// LXML keys of the four filter chips in _root.js, by filter value.
const CHIP_KEYS = {
	any:     'chipAny',
	waiting: 'chipWaiting',
	full:    'chipFull',
	playing: 'chipPlaying'
};

function _filterLabel(f) {
	switch (f) {
		case 'waiting': return lx.i18n(lobby.filterWaiting);
		case 'full': return lx.i18n(lobby.filterFull);
		case 'playing': return lx.i18n(lobby.filterPlaying);
		default: return lx.i18n(lobby.filterAny);
	}
}

function _setFilter(self, f) {
	self._filter = f;
	_updateChips(self);
	_applyFilter(self);
}

function _applyFilter(self) {
	const matching = [];
	self.getCore().rooms.all().forEach(r => {
		if ((self._gameKey === 'all' || r.game === self._gameKey) && (self._filter === 'any' || r.state === self._filter))
			matching.push(r);
	});
	self.rooms.reset(matching);

	// Show message if there aren't rooms
	self.getElem('roomsEmpty').style('display', matching.length === 0 ? '' : 'none');
}

function _updateTitle(self) {
	const title = self.getElem('roomsTitle');
	if (self._gameKey === 'all') {
		title.text(lx.i18n(lobby.tables));
	} else {
		const gameTitle = self.getCore().games.byKey(self._gameKey).title;
		title.text(lx.i18n(lobby.tablesFor, {game: gameTitle}));
	}
}

function _updateChips(self) {
	Object.keys(CHIP_KEYS).forEach(f => {
		self.getElem(CHIP_KEYS[f]).toggleClassOnCondition(self._filter === f, 'lobby-chip-active');
	});
}

function _initMatrix(self) {
	self.getElem('roomsStream').matrix({
		items: self.rooms,
		itemRender: (row, model) => _renderRoomRow(self, row, model),
	});
}

function _renderRoomRow(self, row, model) {
	const game = self.getCore().games.byKey(model.game);

	row.addClass('lobby-room');

	const icon = row.add(lx.Box, {css: 'lobby-room-icon'});
	icon.style('background', lxGames.lobby.UiHelpers.gameAccent(model.game));

	const info = row.add(lx.Box);
	const nameRow = info.add(lx.Box, {css: 'lobby-room-name'});
	nameRow.add(lx.Box, {text: model.name});
	if (model.locked) nameRow.add(lx.Box, {css: 'lobby-lock', text: '🔒'});
	info.add(lx.Box, {css: 'lobby-room-sub', text: game.title + ' · ' + lx.i18n(lobby.hostedBy, {host: model.host})});

	const seatsWrap = row.add(lx.Box, {css: 'lobby-seats'});
	seatsWrap.setField('seats', function(val) {
		this.clear();
		for (let i = 0; i < model.max; i++) {
			if (val[i]) {
				const seat = this.add(lx.Box, {css: 'lobby-seat', text: lxGames.lobby.UiHelpers.initial(val[i])});
				seat.style('backgroundColor', lxGames.lobby.UiHelpers.personColor(val[i]));
			} else {
				this.add(lx.Box, {css: ['lobby-seat', 'lobby-seat-empty']});
			}
		}
	});

	const act = row.add(lx.Box, {css: 'lobby-room-act'});

	const pill = act.add(lx.Box, {css: 'lobby-pill'});
	pill.setField('state', function(val) {
		this.removeClass('lobby-pill-waiting');
		this.removeClass('lobby-pill-full');
		this.removeClass('lobby-pill-playing');
		this.addClass('lobby-pill-' + val);
		this.text(_filterLabel(val));
	});

	const joinBtn = act.add(lx.Box, {css: ['lobby-btn', 'lobby-btn-primary', 'lobby-btn-small'], text: lx.i18n(lobby.join)});
	joinBtn.click(() => self.triggerPluginEvent('lobby.joinRoom', {room: model}));
	joinBtn.setField('state', function(val) {
		this.style('display', val === 'waiting' ? '' : 'none');
	});

	const fullLabel = act.add(lx.Box, {css: ['lobby-btn', 'lobby-btn-small', 'lobby-btn-disabled'], text: lx.i18n(lobby.full)});
	fullLabel.setField('state', function(val) {
		this.style('display', val === 'full' ? '' : 'none');
	});

	const watchBtn = act.add(lx.Box, {css: ['lobby-btn', 'lobby-btn-small'], text: lx.i18n(lobby.watch)});
	watchBtn.click(() => self.triggerPluginEvent('lobby.watchRoom', {room: model}));
	watchBtn.setField('state', function(val) {
		this.style('display', val === 'playing' ? '' : 'none');
	});
}
