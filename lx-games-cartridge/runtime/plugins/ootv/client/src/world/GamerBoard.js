// @lx:macros Const {lxGames.ootv.Constants};

const PLAN_MAP = {
	yellow: 'boardRaccoon.png',
	red: 'boardHamster.png',
	green: 'boardBeaver.png',
	blue: 'boardHedgehog.png',
};

// @lx:namespace lxGames.ootv;
class GamerBoard extends lxGames.ootv.WorldObject {
	constructor(game, gamer, type) {
		super(game, 'gamerBoard.' + gamer.colorId + '.' + type);

		this.gamer = gamer;
		this.type = type;
		this.tiles = [];
		_create(this);
	}

	clear() {
		for (let i in this.tiles)
			this.tiles[i].delChips();
		this.getGame().world.removeMesh(this.mesh);
		this.getGame().world.unregisterStuff(this);
	}
	
	getGame() {
		return this.game;
	}

	getTile(key) {
		return this.tiles[key];
	}

	checkOnUseDice(intersectPoint) {
		const gamer = this.game.getActiveGamer();

		if ( this !== gamer.gamerBoard ) return;
		if ( this.tiles['dataStorage'].containsChip() ) return;

		let x = gamer.gamerBoard.mesh.position.x + gamer.getTile('dataStorage').x * lx>>>Const.FIELD_SIZE,
			z = gamer.gamerBoard.mesh.position.z + gamer.getTile('dataStorage').z * lx>>>Const.FIELD_SIZE,
			delta = 0.0625 * lx>>>Const.FIELD_SIZE;

		if ( intersectPoint.x > x + delta || intersectPoint.x < x - delta
			|| intersectPoint.z > z + delta || intersectPoint.z < z - delta
		) return;

		this.game.triggerLocalEvent('open.dataStorageMenu', {gamer, dice: this.game.activeDice});
	}
	
	setPosition(x, y, z) {
		if (y === undefined) { y = x[1]; z = x[2]; x = x[0]; }

		let newPos = new THREE.Vector3(x, y, z),
			shift = new THREE.Vector3();

		shift.subVectors(newPos, this.mesh.position);

		this.mesh.position.copy(newPos);

		for (let i in this.tiles) {
			let l = this.tiles[i];
			for (let j in l.chips) {
				let ch = l.chips[j];
				ch.mesh.position.add(shift);
			}
		}
	}

	surface() {
		return this.mesh.position.y + this.sizes[1] * 0.5;
	}

	getAdvTileNeiborNums(num) {
		num = +num;
		let map = [4, 5, 6, 7, 6, 5, 4],
			edges = [ [0, 3], [4, 8], [9, 14], [15, 21], [22, 27], [28, 32], [33, 36] ],
			row, test,
			arr = [];

		for (let i in edges)
			if ( num >= edges[i][0] && num <= edges[i][1] ) { row = +i; break; }

		test = num - 1;
		if ( test >= edges[row][0] && test <= edges[row][1] ) arr.push( test );

		test = num + 1;
		if ( test >= edges[row][0] && test <= edges[row][1] ) arr.push( test );

		if (row > 0) {
			test = num - map[row];
			if ( test >= edges[row - 1][0] && test <= edges[row - 1][1] ) arr.push( test );
			test = num - map[row - 1];
			if ( test >= edges[row - 1][0] && test <= edges[row - 1][1] ) arr.push( test );
		}

		if (row < 6) {
			test = num + map[row];
			if ( test >= edges[row + 1][0] && test <= edges[row + 1][1] ) arr.push( test );
			test = num + map[row + 1];
			if ( test >= edges[row + 1][0] && test <= edges[row + 1][1] ) arr.push( test );
		}

		return arr;
	}

	getAdvTileNeibors(loc) {
		let num, tile;
		if (lx.isNumber(loc)) {
			num = +loc;
			tile = this.tiles['advLoc' + num];
		} else if ( loc.substr !== undefined && loc.substr(0, 6) == 'advLoc' ) {
			num = +loc.split('c')[1];
			tile = this.tiles[loc];
		} else if ( loc.filledHeight !== undefined && loc.name.substr(0, 6) == 'advLoc' ) {
			tile = loc;
			num = +loc.name.split('c')[1];
		} else return [];

		let nums = this.getAdvTileNeiborNums(num),
			arr = [];

		for (let i in nums) {
			arr.push( this.tiles['advLoc' + nums[i]] );
		}

		return arr;
	}

	getAreaNums(num) {
		num = +num;
		let arr = [],
			ctx = this;

		function rec(num) {
			if (arr.includes(num)) return;

			arr.push(num);

			let neibors = ctx.getAdvTileNeiborNums(num);
			for (let i in neibors) {
				let neib = neibors[i];
				if ( ctx.tiles['advLoc' + neib].group == ctx.tiles['advLoc' + num].group )
					rec(neib);
			}
		}
		rec(num);

		return arr;		
	}

	getArea(tile) {
		let num = +tile.name.split('c')[1],
			nums = this.getAreaNums(num),
			arr = [];

		for (let i in nums)
			arr.push( this.tiles['advLoc' + nums[i]] );

		return arr;
	}
}

function _create(self) {
	let t1 = self.getGame().world.getTexture( PLAN_MAP[self.gamer.colorId] ),
		t2 = self.getGame().world.getTexture( lx>>>Const.GAMERS[ self.gamer.colorId ].color );
	let material = [
		new THREE.MeshLambertMaterial({ map: t1 }),
		new THREE.MeshLambertMaterial({ map: t2 }),
		new THREE.MeshLambertMaterial({ map: t2 }),
		new THREE.MeshLambertMaterial({ map: t2 }),
		new THREE.MeshLambertMaterial({ map: t2 }),
		new THREE.MeshLambertMaterial({ map: t2 })
	];
	let w = lx>>>Const.FIELD_SIZE * 0.7, h = 5, d = w * 0.723;
	self.mesh = self.getGame().world.newMesh({
		geometry: new lxGames.threed.GeometryCutBox(w, h, d, [0, 0, 0, 0], lx>>>Const.fisSMOOTH),
		material,
		clickable: true
	});
	self.mesh.name = self.name;
	self.sizes = [w, h, d];
	self.getGame().world.registerStuff(self);

	// Advantages awaiting placement
	_addTile(self, 'advWait0', -0.2813, 0.0, { type : lx>>>Const.TILE_ADVANTAGE_WAITING });
	_addTile(self, 'advWait1', -0.2813, 0.088, { type : lx>>>Const.TILE_ADVANTAGE_WAITING });
	_addTile(self, 'advWait2', -0.2813, 0.1755, { type : lx>>>Const.TILE_ADVANTAGE_WAITING });

	// Placed advantages (building-zone slots)
	const om = self.getGame().world.overlayManager,
		map = self.game.actions.dataProvider.getBoardMap(self.type);
	let counter = 0;
	for (let i=0, l=map.length; i<l; i++) {
		let pos = om.getSlotPosition(i),
			x = pos[0]/lx>>>Const.FIELD_SIZE,
			y = pos[1]/lx>>>Const.FIELD_SIZE;
		_addTile(self, 'advLoc' + counter, x, y, {
			type : lx>>>Const.TILE_ADVANTAGE_LOCATED,
			dice : map[counter].dice,
			group : map[counter].group
		});
		counter++;
	}

	// Minerals for sale
	_addTile(self, 'minerals0', 0.2795, 0.0, { type : lx>>>Const.TILE_MINERALS_INGAMER, dice : 0 });
	_addTile(self, 'minerals1', 0.2795, 0.088, { type : lx>>>Const.TILE_MINERALS_INGAMER, dice : 0 });
	_addTile(self, 'minerals2', 0.2795, 0.1755, { type : lx>>>Const.TILE_MINERALS_INGAMER, dice : 0 });

	// Sold minerals
	_addTile(self, 'minerals', 0.2795, -0.088, { type : lx>>>Const.TILE_MINERALS_SOLD });

	// Credit
	_addTile(self, 'credit', -0.2813, -0.1755, { type : lx>>>Const.TILE_CREDIT });

	// DataStorages
	_addTile(self, 'dataStorage', -0.2813, -0.088, { type : lx>>>Const.TILE_DATA_STORAGE });

	// Dice
	_addTile(self, 'dice0', -0.215, -0.225, { type : lx>>>Const.TILE_DICE_GAMER });
	_addTile(self, 'dice1', -0.175, -0.225, { type : lx>>>Const.TILE_DICE_GAMER });
	_addTile(self, 'diceJoker', -0.135, -0.225, { type : lx>>>Const.TILE_DICE_GAMER });
	_addTile(self, 'diceRest', 0.2795, -0.1755, { type : lx>>>Const.TILE_DICE_GAMER });

	// Bonus
	_addTile(self, 'bonus', 0.19, 0.1855, { type : lx>>>Const.TILE_BONUS_INGAMER });

	// +100 counters
	_addTile(self, 'point100', -0.19, 0.1855, { type : lx>>>Const.TILE_COUNTER });

	// Building-zone overlays
	self.getGame().world.overlayManager.buildForBoard(self);
}

function _addTile(self, name, x, y, info) {
	let tile = new lxGames.ootv.Tile(name, x, y, self);
	self.tiles[name] = tile;
	for (let i in info) tile[i] = info[i];
}
