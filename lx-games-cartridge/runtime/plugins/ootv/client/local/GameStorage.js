// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv;
class GameStorage {
	static get key() {
		return 'ootv_local_save';
	}

	static save(game) {
		try {
			const dataProvider = game.actions.dataProvider,
				snapshot = {
					phase: game.phase,
					turn: game.turn,
					activeGamer: game.activeGamer,
					status: game.status.value,
					dice: game.dice.value,
					localInit: {
						gamersCount: dataProvider.localInit.gamersCount,
						gamerColors: dataProvider.localInit.gamerColors,
						firstGamer: dataProvider.localInit.firstGamer
					},
					packs: _capturePacks(dataProvider.packs),
					colors: {},
					board: _captureBoard(game.commonBoard, [
						lx>>>Const.TILE_GAMER_POINTS,
						lx>>>Const.TILE_DICE_GAME
					]),
					gamers: {}
				};

			_orderedGamers(game).forEach(gamer => {
				snapshot.colors[gamer.colorId] = gamer.colorId;
				snapshot.gamers[gamer.colorId] = {
					ai: gamer.AI,
					board: {
						index: gamer.gamerBoard.type,
						chips: _captureBoard(gamer.gamerBoard, [
							lx>>>Const.TILE_DICE_GAMER,
							lx>>>Const.TILE_COUNTER
						]).chips
					},
					doubleMinerals: gamer.doubleMinerals,
					mineralsUsed: gamer.mineralsUsed,
					technologies: Object.assign({}, gamer.technologies),
					turn: gamer.turn,
					creditUsed: gamer.creditUsed,
					pointsInfo: gamer.pointsInfo,
					points: gamer.points,
					dices: gamer.dices.map(dice => ({
						value: dice.value,
						active: dice.tile.name !== 'diceRest'
					})),
					jokers: gamer.diceJoker.map(joker => ({
						active: joker.tile.name === 'diceJoker'
					}))
				};
			});

			localStorage.setItem(GameStorage.key, JSON.stringify(snapshot));
		} catch (e) {
			// Storage full/unavailable (private mode, quota, ...), or an
			// unexpected game state failed to serialize - losing the
			// autosave isn't fatal, just carry on.
		}
	}

	static clear() {
		try {
			localStorage.removeItem(GameStorage.key);
		} catch (e) {
			// Ignore - see save().
		}
	}

	static load() {
		let raw;
		try {
			raw = localStorage.getItem(GameStorage.key);
		} catch (e) {
			return null;
		}
		if (!raw) return null;
		try {
			return JSON.parse(raw);
		} catch (e) {
			return null;
		}
	}

	// Rebuilds the gamer roster fresh (no ActionNewGame - that reshuffles
	// the packs, which would no longer match the saved draw state) and
	// hands the rest off to Reloader, same as an online reconnect.
	static restore(game, snapshot) {
		const dataProvider = game.actions.dataProvider;
		dataProvider.localInit.gamersCount = snapshot.localInit.gamersCount;
		dataProvider.localInit.gamerColors = snapshot.localInit.gamerColors;
		dataProvider.localInit.firstGamer = snapshot.localInit.firstGamer;

		dataProvider.packs.init();
		for (let name in snapshot.packs) {
			let pack = dataProvider.packs.get(name);
			if (!pack) continue;
			pack.sequence = snapshot.packs[name].sequence;
			pack.inGame = snapshot.packs[name].inGame;
		}

		for (let colorId in snapshot.gamers)
			game.initGamer({ colorId, ai: snapshot.gamers[colorId].ai });

		new lxGames.ootv.Reloader(game, snapshot).run();
		if (game.activeGamer) game.getActiveGamer().focus();
	}
}

function _orderedGamers(game) {
	let gamers = [];
	game.forEachGamer(gamer => gamers.push(gamer));
	gamers.sort((a, b) => {
		const pa = a.gamerBoard.mesh.position,
			pb = b.gamerBoard.mesh.position;
		return (pb.z - pa.z) || (pa.x - pb.x);
	});
	return gamers;
}

function _captureBoard(board, excludeTypes) {
	let chips = [];
	for (let name in board.tiles) {
		let tile = board.tiles[name];
		if (tile.isType(excludeTypes)) continue;
		tile.forEachChip(chip => {
			let entry = { tile: name, turn: chip.mesh.rotation.z !== 0 };
			if (chip.info && chip.info.colorId !== undefined)
				entry.gamer = chip.info.colorId;
			else
				entry.info = {
					packName: chip.info.packName,
					group: chip.info.group,
					variant: chip.info.variant
				};
			chips.push(entry);
		});
	}
	return { chips };
}

function _capturePacks(packs) {
	let result = {};
	for (let name in packs.list) {
		let pack = packs.list[name];
		result[name] = { sequence: pack.sequence, inGame: pack.inGame };
	}
	return result;
}
