// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv;
class World extends lxGames.threed.World {
	constructor(config) {
		super(config);
		
		this.game = config.game;
		this.cameraSlider = null;
		this.stuffList = null;

		// Smooth camera transition timer
		_initTimer(this);
		// Game 3D-object aggregator
		_initStuffList(this);
		// Event handlers
		_defineHandlers(this);

		// Texture aggregator
		this.texturesList = [];
		// Game table
		this.table = null;
		// Board building-zone overlays
		this.overlayManager = new lxGames.ootv.OverlayManager(this);
	}

	createTable() {
		let w = lx>>>Const.FIELD_SIZE * 3,
			d = lx>>>Const.FIELD_SIZE * 2.5;

		this.table = this.newMesh({
			geometry: new lxGames.threed.GeometryCutBox(w, 40, d, [0, 0, 0, 0], lx>>>Const.fisSMOOTH),
			material: new THREE.MeshLambertMaterial({ map : this.getTexture('olha') })
		});

		this.table.position.y = -22;
	}

	genChip(info, textures = null) {
		if (!(info instanceof lxGames.ootv.ChipInfo))
			info = lxGames.ootv.ChipInfo.create(info);

		textures = textures || {
			face : info.getFace(),
			side : info.getSide(),
			back : info.getBack()
		};

		const chip = new lxGames.ootv.Chip(this.game, info);
		chip.create(textures);
		return chip;
	}

	genChip100(gamer) {
		let map = {
			yellow: lx>>>Const.VARIANT_COUNTER_100_YELLOW,
			red: lx>>>Const.VARIANT_COUNTER_100_RED,
			green: lx>>>Const.VARIANT_COUNTER_100_GREEN,
			blue: lx>>>Const.VARIANT_COUNTER_100_BLUE,
		};

		let info = new lxGames.ootv.ChipInfo('counter100', lx>>>Const.GROUP_100, map[gamer.colorId]);
		return this.game.world.genChip(info);
	}

	getTexture(name) {
		if (name in this.texturesList) return this.texturesList[name];
		if (!name.match(/\./)) name += '.jpg';

		let fileName = this.game.getPlugin().getImage(name),
			texture = (new THREE.TextureLoader).load(fileName);
		texture.minFilter = texture.magFilter = THREE.LinearFilter;
		texture.anisotropy = 4;
		this.texturesList[name] = texture;

		return texture;
	}

	registerStuff(stuff) {
		this.stuffList.add(stuff);
	}

	unregisterStuff(stuff) {
		delete this.stuffList.data[stuff.name];
	}

	createSpiritStuff(chip, locs) {
		for (let i in locs)
			this.stuffList.genSpiritChip(chip, locs[i]);
	}

	clearSpiritStuff() {
		this.stuffList.delSpirit();
	}

	getIntersectedStuff() {
		let intersects = this.intersects();
		if (!intersects.length) return null;

		let obj = intersects[0].object;
		if (obj.name && obj.name in this.stuffList.data)
			return this.stuffList.data[obj.name];

		return null;
	}
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function _initTimer(self) {
	self.cameraSlider = new lx.Timer(300);
	self.cameraSlider.moveToObject = function ( object, mode, Y ) {
		if (!object.position) object = object.mesh || object.object;
		if (!object.position) return;
		this.moveToPosition(object.position, mode, Y);
	};
	self.cameraSlider.moveToPosition = function( position, mode, Y ) {
		if (this.inAction) return;

		let camera = self.camera;
		this.mode = mode || -1;

		// Store the starting position and quaternion
		this.pos0 = camera.position.clone();
		this.q0 = camera.quaternion.clone();

		// Compute the position to move the camera to
		let pos1 = new THREE.Vector3(),
			y = Y || camera.position.y,
			vector = new THREE.Vector3(0, y, y);
		pos1.addVectors( position, vector );

		// Compute the final quaternion by placing the camera at the target and rotating it
		camera.position.copy(pos1);
		camera.lookAt(position);
		this.q1 = camera.quaternion.clone();

		// Put the camera back in place
		camera.position.copy(this.pos0);
		camera.quaternion.copy(this.q0);

		// Compute the shift vector
		this.shiftVector = new THREE.Vector3();
		this.shiftVector.subVectors( pos1, this.pos0 );
		this.shiftScalar = this.shiftVector.length();
		this.shiftVector.normalize();

		this.start();
	};

	self.cameraSlider.whileCycle(function() {
		let k = this.shift(),
			camera = self.camera;

		let q = new THREE.Quaternion();
		q.copy( this.q0 );
		q.slerp( this.q1, k );
		camera.quaternion.copy( q );

		let shift = this.shiftVector.clone();
		shift.multiplyScalar( this.shiftScalar * k );
		let pos = this.pos0.clone();
		pos.add( shift );
		camera.position.copy( pos );

		if (this.isCycleEnd()) {
			this.q0 = null;
			this.q1 = null;
			this.stop();

			if (this.mode != -1) self.game.status.set(this.mode);
		}
	});
}

function _initStuffList(self) {
	self.stuffList = {
		data : [],
		counter : 0,
		spirits : [],

		add : function(obj) {
			if (obj.name !== null) this.data[obj.name] = obj;
			else {
				let name = 's' + this.counter;
				this.counter++;
				obj.name = name;
				this.data[name] = obj;
			}
		},

		genSpiritChip : function(chip, tile) {
			let w = lx>>>Const.FIELD_SIZE * 0.0625,
				h = lx>>>Const.FIELD_SIZE * 0.00625,
				d = w,
				w2 = w * 0.5,
				w4 = w * 0.25,
				angles = [[w2, w4], [w2, w4], [w2, w4], [w2, w4]],
				material = new THREE.MeshLambertMaterial({ color : 0xffff00 });
			material.opacity = 0.8;
			material.transparent = true;

			let mesh = self.newMesh({
				geometry: new lxGames.threed.GeometryCutBox(w, h, d, angles, lx>>>Const.fisSMOOTH),
				material,
				clickable: true
			});
			mesh.position.x = tile.parent.mesh.position.x + tile.x * lx>>>Const.FIELD_SIZE;
			mesh.position.z = tile.parent.mesh.position.z + tile.z * lx>>>Const.FIELD_SIZE;
			mesh.position.y = tile.parent.surface() + h * 0.5;

			let name = 'spirit.' + tile.name;
			let spirit = new lxGames.ootv.SpiritChip(self.game, mesh, name, chip, tile);
			this.data[name] = spirit;
			this.spirits.push( spirit );
		},

		delSpirit : function() {
			for (let i in this.spirits) {
				let spirit = this.spirits[i];
				self.removeMesh(spirit.mesh);
				spirit.clear();
				delete this.data[spirit.name];
			}

			this.spirits = [];
		}
	};
}

function _defineHandlers(self) {
	self.canvas.on('mousedown', e=>{
		if (!self.game.isReady) return;
		e.preventDefault();
		self.game.triggerLocalEvent('mouse.down');
	});

	self.canvas.on('mousemove', (event)=>{
		if (!self.game.isReady) return;

		self.game.triggerLocalEvent('mouse.move');

		let intersect = self.getIntersectedStuff();
		if (intersect)
			self.game.triggerLocalEvent('mouse.moveWithIntersects', {intersect});
		else
			self.game.triggerLocalEvent('mouse.moveWithoutIntersects');
	});

	self.canvas.on('mouseup', (event)=>{
		if (!self.game.isReady) return;
		event.preventDefault();

		self.game.triggerLocalEvent('mouse.up')

		// Look for intersections
		let intersects = self.intersects();
		if (!intersects.length) return;

		// Aim the camera at the piece
		if (event.button === 2) {
			self.cameraSlider.moveToObject( intersects[0] );
			return;
		}

		if (self.game.isUntouchable()) {
			return;
		}

		// Handle a click on a chip
		if (event.button === 0) {
			let obj = intersects[0].object;
			if (obj.name && obj.name in self.stuffList.data) {
				self.game.triggerLocalEvent('mouse.chipClicked', {
					chip: self.stuffList.data[obj.name],
					mouseEvent: event,
					point: intersects[0].point
				});
			}
		}
	});

	self.game.onLocalEvent('ootv_status_changed', ()=>{
		self.clearSpiritStuff();
	});
}
