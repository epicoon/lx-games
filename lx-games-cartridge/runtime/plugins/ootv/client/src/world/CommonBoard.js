// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv;
class CommonBoard extends lxGames.ootv.WorldObject {
	constructor(game) {
		super(game, 'commonBoard');

		this.tiles = [];
		_create(this);
	}

	surface() {
		return this.mesh.position.y + this.sizes[1] * 0.5;
	}

	clear() {
		for (let i in this.tiles) {
			if (i == 'dice') continue;
			this.tiles[i].delChips();
		}
	}

	locate(tile, chip) {
		if (!(tile in this.tiles)) return;
		this.tiles[tile].locate(chip);
	}

	getTile(key) {
		return this.tiles[key];
	}

	getPhaseTile(i) {
		return this.getTile('st' + i);
	}

	getTurnTile(i) {
		return this.getTile('tn' + i);
	}

	getSequenceTile(i) {
		return this.getTile('seq' + i);
	}

	forEachTile(f) {
		for (let i in this.tiles)
			f(this.tiles[i], i);
	}
	
	checkEachAdvTile(f) {
		const map = [ 125, 120, 133, 144, 223, 221, 235, 245, 324, 325, 330, 343,
			420, 425, 434, 442, 522, 523, 535, 545, 625, 624, 631, 640 ];
		for (let i in map) {
			let tile = this.getTile('advDice' + map[i]),
				res = f(tile);
			if (res === true) return true;
		}
		return false;
	}
}

function _create(self) {
	let t1 = self.game.world.getTexture( 'field.png' ),
		t2 = self.game.world.getTexture( 'commonSide' ),
		material = [
			new THREE.MeshLambertMaterial({ map: t1 }),
			new THREE.MeshLambertMaterial({ map: t2 }),
			new THREE.MeshLambertMaterial({ map: t2 }),
			new THREE.MeshLambertMaterial({ map: t2 }),
			new THREE.MeshLambertMaterial({ map: t2 }),
			new THREE.MeshLambertMaterial({ map: t2 })
		],
		half = lx>>>Const.FIELD_SIZE / 2,
		w = lx>>>Const.FIELD_SIZE,
		h = 5,
		d = lx>>>Const.FIELD_SIZE;

	self.mesh = self.game.world.newMesh({
		geometry: new lxGames.threed.GeometryCutBox(w, h, d, [half, half, half, half], lx>>>Const.fisSMOOTH),
		material,
		clickable: true
	});
	self.mesh.name = 'commonBoard';

	self.sizes = [w, h, d];

	self.game.world.registerStuff(self);

	// Slots for minerals by game stage
	_addTile(self, 'st1', -0.1107, -0.055, { type : lx>>>Const.TILE_MINERALS_STAGE });
	_addTile(self, 'st2', -0.05515, -0.055, { type : lx>>>Const.TILE_MINERALS_STAGE });
	_addTile(self, 'st3', 0.0005, -0.055, { type : lx>>>Const.TILE_MINERALS_STAGE });
	_addTile(self, 'st4', 0.056, -0.055, { type : lx>>>Const.TILE_MINERALS_STAGE });
	_addTile(self, 'st5', 0.1119, -0.055, { type : lx>>>Const.TILE_MINERALS_STAGE });

	// Slots for minerals by stage round
	_addTile(self, 'tn1', -0.1107, 0.055, { type : lx>>>Const.TILE_MINERALS_TURN });
	_addTile(self, 'tn2', -0.05515, 0.056, { type : lx>>>Const.TILE_MINERALS_TURN });
	_addTile(self, 'tn3', 0.0005, 0.056, { type : lx>>>Const.TILE_MINERALS_TURN });
	_addTile(self, 'tn4', 0.056, 0.056, { type : lx>>>Const.TILE_MINERALS_TURN });
	_addTile(self, 'tn5', 0.1119, 0.056, { type : lx>>>Const.TILE_MINERALS_TURN });

	// Slots for minerals on hold
	_addTile(self, 'minerals1', -0.274, -0.158, { type : lx>>>Const.TILE_MINERALS_INGAME, dice : 1 });
	_addTile(self, 'minerals2', 0.0005, -0.316, { type : lx>>>Const.TILE_MINERALS_INGAME, dice : 2 });
	_addTile(self, 'minerals3', 0.274, -0.158, { type : lx>>>Const.TILE_MINERALS_INGAME, dice : 3 });
	_addTile(self, 'minerals4', 0.274, 0.158, { type : lx>>>Const.TILE_MINERALS_INGAME, dice : 4 });
	_addTile(self, 'minerals5', 0.0005, 0.316, { type : lx>>>Const.TILE_MINERALS_INGAME, dice : 5 });
	_addTile(self, 'minerals6', -0.274, 0.158, { type : lx>>>Const.TILE_MINERALS_INGAME, dice : 6 });

	// Advantages on dice
	_addTile(self, 'advDice12' + lx>>>Const.GROUP_MODULE, -0.4125, -0.055, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 1, amt : 2, group : lx>>>Const.GROUP_MODULE });
	_addTile(self, 'advDice12' + lx>>>Const.GROUP_PROBE, -0.33, -0.2533, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 1, amt : 2, group : lx>>>Const.GROUP_PROBE });
	_addTile(self, 'advDice13' + lx>>>Const.GROUP_TECHNOLOGY, -0.3845, -0.15925, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 1, amt : 3, group : lx>>>Const.GROUP_TECHNOLOGY });
	_addTile(self, 'advDice14' + lx>>>Const.GROUP_DRONE, -0.2533, -0.33, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 1, amt : 4, group : lx>>>Const.GROUP_DRONE });

	_addTile(self, 'advDice22' + lx>>>Const.GROUP_TECHNOLOGY, -0.15925, -0.3845, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 2, amt : 2, group : lx>>>Const.GROUP_TECHNOLOGY });
	_addTile(self, 'advDice22' + lx>>>Const.GROUP_STATION, 0.05432, -0.4126, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 2, amt : 2, group : lx>>>Const.GROUP_STATION });
	_addTile(self, 'advDice23' + lx>>>Const.GROUP_MODULE, -0.05432, -0.4126, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 2, amt : 3, group : lx>>>Const.GROUP_MODULE });
	_addTile(self, 'advDice24' + lx>>>Const.GROUP_MODULE, 0.15925, -0.3845, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 2, amt : 4, group : lx>>>Const.GROUP_MODULE });

	_addTile(self, 'advDice32' + lx>>>Const.GROUP_DRONE, 0.2533, -0.33, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 3, amt : 2, group : lx>>>Const.GROUP_DRONE });
	_addTile(self, 'advDice32' + lx>>>Const.GROUP_MODULE, 0.3845, -0.15925, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 3, amt : 2, group : lx>>>Const.GROUP_MODULE });
	_addTile(self, 'advDice33' + lx>>>Const.GROUP_PROBE, 0.33, -0.2533, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 3, amt : 3, group : lx>>>Const.GROUP_PROBE });
	_addTile(self, 'advDice34' + lx>>>Const.GROUP_TECHNOLOGY, 0.4126, -0.05432, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 3, amt : 4, group : lx>>>Const.GROUP_TECHNOLOGY });

	_addTile(self, 'advDice42' + lx>>>Const.GROUP_PROBE, 0.4126, 0.05432, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 4, amt : 2, group : lx>>>Const.GROUP_PROBE });
	_addTile(self, 'advDice42' + lx>>>Const.GROUP_MODULE, 0.33, 0.2533, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 4, amt : 2, group : lx>>>Const.GROUP_MODULE });
	_addTile(self, 'advDice43' + lx>>>Const.GROUP_DRONE, 0.3845, 0.15925, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 4, amt : 3, group : lx>>>Const.GROUP_DRONE });
	_addTile(self, 'advDice44' + lx>>>Const.GROUP_SOLAR_PANEL, 0.2533, 0.33, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 4, amt : 4, group : lx>>>Const.GROUP_SOLAR_PANEL });

	_addTile(self, 'advDice52' + lx>>>Const.GROUP_SOLAR_PANEL, 0.15925, 0.3845, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 5, amt : 2, group : lx>>>Const.GROUP_SOLAR_PANEL });
	_addTile(self, 'advDice52' + lx>>>Const.GROUP_TECHNOLOGY, -0.05432, 0.4126, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 5, amt : 2, group : lx>>>Const.GROUP_TECHNOLOGY });
	_addTile(self, 'advDice53' + lx>>>Const.GROUP_MODULE, 0.05432, 0.4126, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 5, amt : 3, group : lx>>>Const.GROUP_MODULE });
	_addTile(self, 'advDice54' + lx>>>Const.GROUP_MODULE, -0.15925, 0.3845, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 5, amt : 4, group : lx>>>Const.GROUP_MODULE });

	_addTile(self, 'advDice62' + lx>>>Const.GROUP_MODULE, -0.2533, 0.33, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 6, amt : 2, group : lx>>>Const.GROUP_MODULE });
	_addTile(self, 'advDice62' + lx>>>Const.GROUP_DRONE, -0.3845, 0.15925, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 6, amt : 2, group : lx>>>Const.GROUP_DRONE });
	_addTile(self, 'advDice63' + lx>>>Const.GROUP_STATION, -0.33, 0.2533, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 6, amt : 3, group : lx>>>Const.GROUP_STATION, altGroup : lx>>>Const.GROUP_SOLAR_PANEL });
	_addTile(self, 'advDice64' + lx>>>Const.GROUP_PROBE, -0.4125, 0.055, { type : lx>>>Const.TILE_ADVANTAGE_DICE, dice : 6, amt : 4, group : lx>>>Const.GROUP_PROBE });

	// Advantages for sale
	_addTile(self, 'advSell12', -0.215, 0.0, { type : lx>>>Const.TILE_ADVANTAGE_FORSALE, amt : 2 });
	_addTile(self, 'advSell22', 0.0, 0.215, { type : lx>>>Const.TILE_ADVANTAGE_FORSALE, amt : 2 });
	_addTile(self, 'advSell32', 0.215, 0.0, { type : lx>>>Const.TILE_ADVANTAGE_FORSALE, amt : 2 });
	_addTile(self, 'advSell42', 0.0, -0.215, { type : lx>>>Const.TILE_ADVANTAGE_FORSALE, amt : 2 });
	_addTile(self, 'advSell53', -0.1525, -0.1525, { type : lx>>>Const.TILE_ADVANTAGE_FORSALE, amt : 3 });
	_addTile(self, 'advSell63', 0.1525, 0.1525, { type : lx>>>Const.TILE_ADVANTAGE_FORSALE, amt : 3 });
	_addTile(self, 'advSell74', 0.1525, -0.1525, { type : lx>>>Const.TILE_ADVANTAGE_FORSALE, amt : 4 });
	_addTile(self, 'advSell84', -0.1525, 0.1525, { type : lx>>>Const.TILE_ADVANTAGE_FORSALE, amt : 4 });

	// First bonuses
	_addTile(self, 'bmax0', -0.069, -0.111, { type : lx>>>Const.TILE_BONUS_INGAME });
	_addTile(self, 'bmax1', -0.04125, -0.111, { type : lx>>>Const.TILE_BONUS_INGAME });
	_addTile(self, 'bmax2', -0.0135, -0.111, { type : lx>>>Const.TILE_BONUS_INGAME });
	_addTile(self, 'bmax3', 0.0145, -0.111, { type : lx>>>Const.TILE_BONUS_INGAME });
	_addTile(self, 'bmax4', 0.04225, -0.111, { type : lx>>>Const.TILE_BONUS_INGAME });
	_addTile(self, 'bmax5', 0.07, -0.111, { type : lx>>>Const.TILE_BONUS_INGAME });

	// Second bonuses
	_addTile(self, 'bmin0', -0.069, 0.111, { type : lx>>>Const.TILE_BONUS_INGAME });
	_addTile(self, 'bmin1', -0.04125, 0.111, { type : lx>>>Const.TILE_BONUS_INGAME });
	_addTile(self, 'bmin2', -0.0135, 0.111, { type : lx>>>Const.TILE_BONUS_INGAME });
	_addTile(self, 'bmin3', 0.0145, 0.111, { type : lx>>>Const.TILE_BONUS_INGAME });
	_addTile(self, 'bmin4', 0.04225, 0.111, { type : lx>>>Const.TILE_BONUS_INGAME });
	_addTile(self, 'bmin5', 0.07, 0.111, { type : lx>>>Const.TILE_BONUS_INGAME });

	// Turn order
	_addTile(self, 'seq0', -0.125, 0.0, { type : lx>>>Const.TILE_GAMER_SEQUENCE, pos : 0 });
	_addTile(self, 'seq1', -0.08305, 0.0, { type : lx>>>Const.TILE_GAMER_SEQUENCE, pos : 1 });
	_addTile(self, 'seq2', -0.0411, 0.0, { type : lx>>>Const.TILE_GAMER_SEQUENCE, pos : 2 });
	_addTile(self, 'seq3', 0.0, 0.0, { type : lx>>>Const.TILE_GAMER_SEQUENCE, pos : 3 });
	_addTile(self, 'seq4', 0.042, 0.0, { type : lx>>>Const.TILE_GAMER_SEQUENCE, pos : 4 });
	_addTile(self, 'seq5', 0.08305, 0.0, { type : lx>>>Const.TILE_GAMER_SEQUENCE, pos : 5 });
	_addTile(self, 'seq6', 0.125, 0.0, { type : lx>>>Const.TILE_GAMER_SEQUENCE, pos : 6 });

	// Score track: 100 slots evenly around a circle centred at (0, 0)
	const POINTS_COUNT = 100,
		POINTS_RADIUS = 0.48423,
		POINTS_ANGLE_STEP = 2 * Math.PI / POINTS_COUNT;
	for (let i = 0; i < POINTS_COUNT; i++) {
		const a = Math.PI + (i + 0.5) * POINTS_ANGLE_STEP;
		_addTile(self, 'point' + i,
			POINTS_RADIUS * Math.cos(a),
			POINTS_RADIUS * Math.sin(a),
			{ type : lx>>>Const.TILE_GAMER_POINTS, pos : i });
	}

	// Die
	_addTile(self, 'dice', -0.47, 0.31, { type : lx>>>Const.TILE_DICE_GAME });
}

function _addTile(self, name, x, y, info) {
	const tile = new lxGames.ootv.Tile(name, x, y, self);
	self.tiles[name] = tile;
	tile.lxMerge(info);
}
