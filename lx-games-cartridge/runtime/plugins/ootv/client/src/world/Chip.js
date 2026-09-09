// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv;
class Chip extends lxGames.ootv.WorldObject {
	constructor(game, info) {
		super(game);

		this.info = info;
		this.tile = null;
		this.game.world.registerStuff(this);
	}

	isChip() {
		return true;
	}

	isGroup(group) {
		if (this.info.group === undefined) return false;
		if (lx.isArray(group))
			return group.includes(this.info.group);
		return this.info.group === group;
	}

	isVariant(value) {
		if (this.info.variant === undefined) return false;
		if (lx.isArray(value))
			return value.includes(this.info.variant);
		return this.info.variant === value;
	}

	isTileType(type) {
		if (!this.tile) return false;
		return this.tile.isType(type);
	}

	setVariant(value) {
		this.info.variant = value;
		const material = this.mesh.material[0];
		material.map = this.game.world.getTexture(this.info.getFace());
		material.needsUpdate = true;
	}

	getGroup() {
		if (this.info.group === undefined) return null;
		return this.info.group;
	}

	getVariant() {
		if (this.info.variant === undefined) return null;
		return this.info.variant;
	}

	getOwner() {
		return this.tile.parent.gamer || null;
	}

	isOwner(gamer) {
		if (this.info.colorId !== undefined)
			return this.info.colorId === gamer.colorId;

		if (!this.tile) return false;
		return this.tile.parent.gamer
			? (this.tile.parent.gamer === gamer)
			: false;
	}

	checkOnUseDice() {
		const game = this.game,
			gamer = game.getActiveGamer();

		// Take chip from the common board
		if ( this.isTileType(lx>>>Const.TILE_ADVANTAGE_DICE) ) {
			if (!gamer.getFreeAdvKeeper()) return;

			let arr = [];
			if (game.activeDice.value == 7)
				arr = [1, 2, 3, 4, 5, 6];
			else if ( gamer.knows('k12') ) {
				let p = game.activeDice.value + 1,
					m = game.activeDice.value - 1;
				if (p > 6) p -= 6;
				if (m < 1) m += 6;
				arr = [ game.activeDice.value, p, m ];
			} else arr = [ game.activeDice.value ];

			if (!arr.includes(this.tile.dice))
				return;

			game.actions.trigger(new lxGames.ootv.ActionGetChip({
				gamer: gamer.getToken(),
				tile: this.tile.name,
				dice: game.activeDice.index
			}));
			return;
		}

		if (!this.isOwner(gamer)) return;

		if (this.isGroup(lx>>>Const.GROUP_DATA_STORAGE)) {
			game.triggerLocalEvent('open.dataStorageMenu', {gamer, dice: game.activeDice});
			return;
		}

		// Sell minerals
		if (this.isTileType(lx>>>Const.TILE_MINERALS_INGAMER)) {
			if ( game.activeDice.value != 7 && game.activeDice.value != this.info.variant ) return;

			if (game.isSplittingMinerals) return;
			game.isSplittingMinerals = true;

			game.actions.trigger(new lxGames.ootv.ActionSplitMinerals({
				gamer: gamer.getToken(),
				tile: this.tile.name,
				dice: game.activeDice.index
			}));
			return;
		}

		// Find opportunity to move chip to the gamers board
		if (this.isTileType(lx>>>Const.TILE_ADVANTAGE_WAITING)) {
			gamer.tryFindPlace(this);
		}
	}

	genGeometry() {
		let w, h, d, angles;

		switch (true) {
			case (this.info.colorId !== undefined): {
				w = lx>>>Const.FIELD_SIZE * 0.0375;
				h = lx>>>Const.FIELD_SIZE * 0.03125;
				let w2 = w * 0.5;
				d = w;
				angles = [w2, w2, w2, w2];
			} break;
			case (this.isGroup([
				lx>>>Const.GROUP_MODULE,
				lx>>>Const.GROUP_PROBE,
				lx>>>Const.GROUP_STATION,
				lx>>>Const.GROUP_SOLAR_PANEL,
				lx>>>Const.GROUP_TECHNOLOGY,
				lx>>>Const.GROUP_DRONE,
				lx>>>Const.GROUP_100
			])): {
				w = lx>>>Const.FIELD_SIZE * 0.08;
				h = lx>>>Const.FIELD_SIZE * 0.00625;
				d = w;
				let w2 = w * 0.5,
					w4 = w * 0.25;
				angles = [[w2, w4], [w2, w4], [w2, w4], [w2, w4]];
			} break;
			case (this.isGroup([
				lx>>>Const.GROUP_MINERALS,
				lx>>>Const.GROUP_DATA_STORAGE,
				lx>>>Const.GROUP_CREDIT]
			)): {
				w = lx>>>Const.FIELD_SIZE * 0.0525;
				h = lx>>>Const.FIELD_SIZE * 0.00625;
				d = w;
				angles = [0, 0, 0, 0];
			} break;
			case (this.isGroup([lx>>>Const.GROUP_BONUS_MAX, lx>>>Const.GROUP_BONUS_MIN])): {
				w = lx>>>Const.FIELD_SIZE * 0.0225;
				h = lx>>>Const.FIELD_SIZE * 0.00625;
				d = 2*w;
				angles = [0, 0, 0, 0];
			} break;
		}

		let geom = new lxGames.threed.GeometryCutBox(w, h, d, angles, lx>>>Const.fisSMOOTH);
		return { geometry : geom, sizes : [w, h, d] };
	}

	create(textures) {
		let t1 = this.game.world.getTexture(textures.face),
			t2 = this.game.world.getTexture(textures.back),
			t3 = this.game.world.getTexture(textures.side);

		let tt = [t1, t2, t3, t3, t3, t3];
		let material = [];
		for (let i=0; i<6; i++)
			material.push(new THREE.MeshBasicMaterial({
				map: tt[i],
			}));

		let geom = this.genGeometry();

		this.mesh = this.game.world.newMesh({
			geometry: geom.geometry,
			material,
			clickable: true
		});
		this.mesh.name = this.name;

		this.sizes = geom.sizes;
	}

	putOn(board) {
		this.mesh.position.x = board.mesh.position.x;
		this.mesh.position.z = board.mesh.position.z;
		this.mesh.position.y = board.surface() + this.sizes[1] * 0.5;
	}

	turn() {
		if ( this.mesh.rotation.z != 0 ) this.mesh.rotation.z = 0;
		else this.mesh.rotation.z = Math.PI;
	}

	setColor(color) {
		for (let i=0; i<6; i++) {
			let mat = this.mesh.material[i];
			mat.color.r = color[0];
			mat.color.g = color[1];
			mat.color.b = color[2];
		}
	}

	del() {
		this.game.world.removeMesh( this.mesh );
		this.info.chip = null;
		if (this.tile !== null) this.tile.remove(this);
		this.game.world.unregisterStuff(this);
	}
}
