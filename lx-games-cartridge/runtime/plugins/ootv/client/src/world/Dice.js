// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv;
class Dice extends lxGames.ootv.WorldObject {
	constructor(game, gamer, num) {
		super(game, 'dice.' + num + '.' + (gamer ? gamer.colorId : 'game'));

		this.gamerToken = gamer ? gamer.getToken() : null;
		this.colorId = gamer ? gamer.colorId : 'game';
		this.index = num;
		this.tile = null;
		this.value = 1;

		_create(this);
		this.game.world.registerStuff(this);
	}

	getGamer() {
		if (this.colorId == 'game') return null;
		return this.game.getGamer(this.gamerToken);
	}

	isChip() {
		return true;
	}

	isOwner(gamer) {
		return this.colorId === gamer.colorId;
	}

	isGroup(group) {
		return false;
	}

	isTileType(type) {
		if (!this.tile) return false;
		return this.tile.isType(type);
	}

	checkOnUseDice() {
		const game = this.game;

		if ( !this.isOwner(game.getActiveGamer()) ) return;
		if ( this.tile.name == 'diceRest' ) return;

		if ( this === game.activeDice ) {
			game.activeDice = null;
			game.status.setPending();
			return;
		}

		game.activeDice = this;
		game.status.setUseDice();
	}

	setColor(color) {
		for (let i=0; i<6; i++) {
			let mat = this.mesh.material[i];
			mat.color.r = color[0];
			mat.color.g = color[1];
			mat.color.b = color[2];
		}
	}

	applyValue(val) {
		this.value = val;

		if (val == 7) {
			for (let i=0; i<6; i++)
				this.mesh.material[i].map = this.game.world.getTexture('diceJoker.png');
			return;
		}

		for (let i=0; i<6; i++) {
			let mat = this.mesh.material[i];
			mat.map = this.game.world.getTexture('dice' + val + '.png');
			val++;
			if (val > 6) val = 1;
		}
	}

	incValue(val) {
		let newVal = this.value + val;
		if (newVal > 6) newVal -= 6;
		if (newVal < 1) newVal += 6;

		this.applyValue(newVal);
	}

	putOn(board) {
		this.mesh.position.x = board.mesh.position.x;
		this.mesh.position.z = board.mesh.position.z;
		this.mesh.position.y = board.surface() + this.sizes[1] * 0.5;
	}

	del() {
		this.game.world.removeMesh( this.mesh );

		if (this.tile !== null)
			this.tile.chips.lxRemove(this);

		this.game.world.unregisterStuff(this);
	}
}

function _create(self) {
	let material = [
		new THREE.MeshLambertMaterial({ map: self.game.world.getTexture('dice1.png') }),
		new THREE.MeshLambertMaterial({ map: self.game.world.getTexture('dice2.png') }),
		new THREE.MeshLambertMaterial({ map: self.game.world.getTexture('dice3.png') }),
		new THREE.MeshLambertMaterial({ map: self.game.world.getTexture('dice4.png') }),
		new THREE.MeshLambertMaterial({ map: self.game.world.getTexture('dice5.png') }),
		new THREE.MeshLambertMaterial({ map: self.game.world.getTexture('dice6.png') })
	];

	let w = lx>>>Const.FIELD_SIZE * 0.03,
		h = w,
		d = w,
		angles = [0, 0, 0, 0];

	self.mesh = self.game.world.newMesh({
		geometry: new lxGames.threed.GeometryCutBox(w, h, d, angles, lx>>>Const.fisSMOOTH),
		material,
		clickable: true
	});
	self.mesh.name = self.name;

	self.sizes = [w, h, d];
	if (self.colorId != 'game') self.setColor( lx>>>Const.GAMERS[self.colorId].chipColor );
}
