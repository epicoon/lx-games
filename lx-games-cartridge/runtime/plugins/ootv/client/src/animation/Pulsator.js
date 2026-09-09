// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv;
class Pulsator {
	constructor(game) {
		this.game = game;

		this.animator = new lx.Timer(500);
		this.animator.chips = [];
		this.animator.ignoreChips = [];
		this.animator.k = 0.2;
		this.animator.extand = true;

		this.animator.on = function( mode ) {
			this.extand = mode;
			this.start();
		};

		this.animator.whileCycle(function() {
			let shift = this.shift(),
				k, blue;
			if ( this.extand ) {
				k = 1 + this.k * shift;
				blue = 1 - shift;
			} else {
				k = 1 + this.k - this.k * shift;
				blue = shift;
			}

			if (this.ignoreChips.length) {
				for (let i in this.ignoreChips) {
					let chip = this.ignoreChips[i];
					_restoreChip(chip);
					this.chips.lxRemove(chip);
				}
			}
			this.ignoreChips = [];

			for (let i in this.chips) {
				let chip = this.chips[i];

				let currentMinY = Infinity;
				for (let j in chip.mesh.geometry.vertices) {
					chip.mesh.geometry.vertices[j].copy( chip.__puls.baseVectors[j] );
					chip.mesh.geometry.vertices[j].multiplyScalar(k);
					if (chip.mesh.geometry.vertices[j].y < currentMinY)
						currentMinY = chip.mesh.geometry.vertices[j].y;
				}
				chip.mesh.geometry.verticesNeedUpdate = true;

				let delta = chip.__puls.minY - currentMinY;
				chip.mesh.position.y = chip.__puls.baseY + delta;

				if (chip.value === undefined) chip.setColor([1, 1, blue]);
			}

			if ( this.isCycleEnd() ) {
				this.on( !this.extand );
			}
		});

		this.animator.off = function() {
			for (let i in this.chips) {
				let chip = this.chips[i];
				_restoreChip(chip);
			}

			this.chips = [];
			this.ignoreChips = [];
			this.stop();
		};

		_subscribeEvents(this);
	}

	start(chips) {
		this.animator.off();

		for (let i in chips) {
			let c = chips[i];
			c.__puls = {
				baseVectors: [],
				baseY: c.mesh.position.y,
				minY: Infinity
			};
			for (let j in c.mesh.geometry.vertices) {
				let origV = c.mesh.geometry.vertices[j],
					v = new THREE.Vector3();
				v.copy(origV);
				c.__puls.baseVectors.push(v);
				if (origV.y < c.__puls.minY) c.__puls.minY = origV.y;
			}
		}

		this.animator.chips = chips;
		this.animator.on(true);
	}

	stop() {
		this.animator.off();
	}

	dropChip(chip) {
		if (this.animator.chips.includes(chip))
			this.animator.ignoreChips.push(chip);
	}

	dicePM(num) {
		let p = num + 1,
			m = num - 1;

		if ( p == 7 ) p = 1;
		if ( m == 0 ) m = 6;

		return [ m, num, p ];
	}

	on() {
		this.stop();

		if (this.game.isUntouchable()) {
			return;
		}

		const game = this.game;
		const gamer = game.getActiveGamer();
		let chips = [];
		switch (true) {
			case game.status.isPending():
				for (let i in gamer.getTileChips('dice0')) chips.push( gamer.getTileChips('dice0')[i] );
				for (let i in gamer.getTileChips('dice1')) chips.push( gamer.getTileChips('dice1')[i] );
				for (let i in gamer.getTileChips('diceJoker')) chips.push( gamer.getTileChips('diceJoker')[i] );
				if ( !gamer.creditUsed && gamer.getTileChips('credit').length > 1 )
					for (let i in gamer.getTileChips('credit')) chips.push( gamer.getTileChips('credit')[i] );
			break;

			case game.status.isUseDice():
				let num = game.activeDice.value,
					nums;

				if (num == 7) nums = [1, 2, 3, 4, 5, 6];
				else if ( gamer.knows('k12') ) nums = this.dicePM( num );
				else nums = [ num ];

				game.commonBoard.forEachTile(tile => {
					if (!tile.isType(lx>>>Const.TILE_ADVANTAGE_DICE)) return;
					if (!nums.includes(tile.dice)) return;;

					for (let j in tile.chips)
						chips.push( tile.chips[j] );
				});

				for (let i in gamer.getTileChips('dataStorage'))
					chips.push( gamer.getTileChips('dataStorage')[i] );

				for (let i=0; i<3; i++) {
					if ( gamer.getTileChips('minerals' + i).length
						&& (num == 7 || gamer.getTileChips('minerals' + i)[0].info.variant == num)
					)
						for (let j in gamer.getTileChips('minerals' + i))
							chips.push( gamer.getTileChips('minerals' + i)[j] );

					if ( gamer.getTileChips('advWait' + i).length )
						for (let j in gamer.getTileChips('advWait' + i))
							chips.push( gamer.getTileChips('advWait' + i)[j] );
				}
			break;

			case game.status.isUseCredit():
				game.commonBoard.forEachTile(tile => {
					if (tile.isEmpty()) return;

					if (tile.isType([lx>>>Const.TILE_ADVANTAGE_FORSALE]))
						chips.push(tile.chips[0]);

					if (tile.isType([lx>>>Const.TILE_ADVANTAGE_DICE]) && gamer.knows('k6'))
						chips.push(tile.chips[0]);
				});
			break;

			case game.status.isSplit():
				let tiles = gamer.gamerBoard.tiles;
				for (let i=0; i<3; i++)
					if ( tiles['minerals' + i].containsChip() )
						for (let j in tiles['minerals' + i].chips)
							chips.push( tiles['minerals' + i].chips[j] );
			break;

			case game.status.isGetModule():
				game.commonBoard.forEachTile(tile => {
					if (tile.isEmpty() || !tile.isGroup(lx>>>Const.GROUP_MODULE)) return;
					chips.push(tile.chips[0]);
				});
			break;

			case game.status.isGetPCK():
				for (let i in game.commonBoard.tiles) {
					let loc = game.commonBoard.tiles[i];
					if ( loc.isEmpty() ) continue;
					if ( i.substr(0, 7) != 'advDice' ) continue;
					if ( loc.group != lx>>>Const.GROUP_SOLAR_PANEL && loc.group != lx>>>Const.GROUP_STATION && loc.group != lx>>>Const.GROUP_TECHNOLOGY ) continue;

					chips.push( loc.chips[0] );
				}
			break;

			case game.status.isGetDP():
				for (let i in game.commonBoard.tiles) {
					let loc = game.commonBoard.tiles[i];
					if ( loc.isEmpty() ) continue;
					if ( i.substr(0, 7) != 'advDice' ) continue;
					if ( loc.group != lx>>>Const.GROUP_DRONE && loc.group != lx>>>Const.GROUP_PROBE ) continue;

					chips.push( loc.chips[0] );
				}
			break;

			case game.status.isSetChip(): {
				let tiles = gamer.gamerBoard.tiles;
				for (let i=0; i<3; i++)
					if ( tiles['advWait' + i].containsChip() )
						for (let j in tiles['advWait' + i].chips)
							chips.push( tiles['advWait' + i].chips[j] );
			} break;

			case game.status.isGetMinerals():
			case game.status.isGetSecondMinerals(): {
				let tiles = game.commonBoard.tiles;

				if ( gamer.knows('k5') && gamer.doubleMinerals == 1 ) {
					let nums = this.dicePM( gamer.mineralsUsed );

					for (let i in tiles['minerals' + nums[0]].chips)
						chips.push( tiles['minerals' + nums[0]].chips[i] );
					for (let i in tiles['minerals' + nums[2]].chips)
						chips.push( tiles['minerals' + nums[2]].chips[i] );
				} else {
					for (let j=1; j<7; j++) {
						for (let i in tiles['minerals' + j].chips)
							chips.push( tiles['minerals' + j].chips[i] );
					}
				}
			} break;

			default : this.stop();
		}

		if (chips.length) this.start(chips);
	}
}

function _subscribeEvents(self) {
	self.game.onLocalEvent('ootv_status_changed', ()=>self.on());
	self.game.onLocalEvent('ootv_active_dice_changed', ()=>self.on());
	self.game.onLocalEvent('ootv_gamer_move_ends', ()=>self.on());
}

function _restoreChip(chip) {
	if (!chip.__puls) return;

	for (let j in chip.__puls.baseVectors) {
		chip.mesh.geometry.vertices[j].copy( chip.__puls.baseVectors[j] );
	}
	chip.mesh.geometry.verticesNeedUpdate = true;
	chip.mesh.position.y = chip.__puls.baseY;
	if (chip.value === undefined) chip.setColor([1, 1, 1]);
	delete chip.__puls;
}
