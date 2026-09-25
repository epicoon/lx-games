// @lx:namespace lxGames.lobby;
class GuiRail extends lx.GuiNode {
	init() {
		this._games = lx.ModelCollection.create({
			schema: {
				gameKey:   {type: lx.ModelTypeEnum.STRING},
				selected:  {type: lx.ModelTypeEnum.BOOLEAN},
				count:     {type: lx.ModelTypeEnum.NUMBER},
				title:     {type: lx.ModelTypeEnum.STRING},
				meta:      {type: lx.ModelTypeEnum.STRING},
				// icon (a URL the cartridge reports) takes priority; chipText
				// is only a fallback symbol for the synthetic "all games" row,
				// which isn't a real game and has no cartridge to ask.
				icon:      {type: lx.ModelTypeEnum.STRING, default: ''},
				chipText:  {type: lx.ModelTypeEnum.STRING, default: ''},
				chipStyle: {default: {background: 'linear-gradient(135deg,#2a2470,#14103a)'}},
			}
		});

		_initStream(this);
	}

	subscribeEvents() {
		const plugin = this.getPlugin();

		// _setGames reads core.rooms.openCount(...) for every item, so the
		// initial render has to wait for both games and rooms, not just games.
		plugin.on('lobby.Loader.dataLoaded', () => _setGames(this));

		plugin.on('lobby.roomsChanged', () => {
			this._games.reset();
			_setGames(this);
		});
	}
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function _setGames(self) {
	const core = self.getCore(),
		registry = self.getCore().games;

	self._games.add({
		gameKey:   'all',
		count:     core.rooms.openCount('all'),
		title:     lx.i18n(lobby.allGames),
		meta:      core.games.all().length + ' ' + lx.i18n(lobby.games).toLowerCase(),
		chipText:  '▦',
	});

	const list = registry.all();
	list.forEach(game => {
		self._games.add({
			gameKey:   game.key,
			count:     core.rooms.openCount(game.key),
			title:     game.title,
			//TODO i18n
			meta:      game.minSlots === game.maxSlots ? `${game.minSlots} players` : `${game.minSlots}–${game.maxSlots} players`,
			icon:      game.icon,
			chipStyle: {background: lxGames.lobby.UiHelpers.gameAccent(game.key)},
		});
	});

	self._games.at(0).selected = true;
}

function _initStream(self) {
	const stream = self.getElem('railStream');
	stream.stream({height:'auto'});
	stream.matrix({
		items: self._games,
		itemRender: (row, model) => {
			row.addClass('lobby-rail-item');
			row.setField('selected', function(val) {
				this.toggleClassOnCondition(val, 'lobby-rail-item-selected');
			});

			const chip = new lx.Box({css: 'lobby-rail-chip'});
			chip.style(model.chipStyle);
			if (model.icon) chip.add(lx.Image, {src: model.icon, size: ['100%', '100%'], style: {objectFit: 'cover', borderRadius: 'inherit'}});
			else if (model.chipText) chip.text(model.chipText);
			chip.setField('selected', function(val) {
				this.toggleClassOnCondition(val, 'lobby-rail-chip-selected');
			});

			const body = new lx.Box({css: 'lobby-ri-body'});
			body.add(lx.Box, {css: 'lobby-ri-title', text: model.title});
			body.add(lx.Box, {css: 'lobby-ri-meta', text: model.meta});

			new lx.Box({
				css: ['lobby-ri-count', model.count ? null : 'lobby-ri-count-zero'].filter(Boolean),
				text: String(model.count)
			});

			row.click(() => {
				let changed = true;
				self._games.forEach(g => {
					if (g === model && g.selected) {
						changed = false;
						return;
					}
					g.selected = (g.gameKey === model.gameKey);
				});
				self.triggerPluginEvent('lobby.gameSelected', {gameKey: model.gameKey})
			});
		}
	});
}
