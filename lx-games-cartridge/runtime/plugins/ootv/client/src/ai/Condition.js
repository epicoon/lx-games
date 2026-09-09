// @lx:macros Const {lxGames.ootv.Constants};
// @lx:macros aiConst {lxGames.ootv.AI.AI};

// @lx:namespace lxGames.ootv.AI;
class Condition {
	constructor(ai = null) {
		this.ai = ai;
		this.parent = null;
		this.reason = null;
		this.actions = [];
		this.immediately = null;

		this.usefulActionIndex = 0;
		this.ends = [];

		// gamerBoard
		this.creditUsed = false;
		this.dices = [0, 0];
		this.diceJoker = [];
		this._barony = [];
		this.advWait = [0, 0, 0];  // {group, variant}
		this.dataStorages = 0;
		this.credit = 0;
		this.minerals = [0, 0, 0];  // {amt, dice}
		this._knows = [];

		// commonBoard
		this._advDice = {};  // {group, variant}
		this._advSell = {};  // {group, variant}
		this._fieldMinerals = null;  // [ variant ]
	}

	getGame() {
		return this.ai.game;
	}

	root() {
		return this.ai.conditionsTree;
	}

	initCore(gamer) {
		this.creditUsed = gamer.creditUsed;

		let tiles = gamer.gamerBoard.tiles;

		if (tiles['dice0'].containsChip()) this.dices[0] = tiles['dice0'].chips[0].value;
		if (tiles['dice1'].containsChip()) this.dices[1] = tiles['dice1'].chips[0].value;
		if (tiles['diceJoker'].containsChip())
			for (let i in tiles['diceJoker'].chips) this.diceJoker.push(7);

		gamer.forEachAdvTile((tile, i) => {
			if (tile.containsChip()) {
				this._barony['b' + i] = tile.chips[0].getVariant();
			}
		});

		for (let i=0; i<3; i++)
			if (tiles['advWait' + i].containsChip()) {
				let info = tiles['advWait' + i].chips[0].info;
				this.advWait[i] = { group : info.group, variant : info.variant };
			}

		this.dataStorages = tiles['dataStorage'].chipsCount();
		this.credit = tiles['credit'].chipsCount();

		for (let i=0; i<3; i++)
			if (tiles['minerals' + i].containsChip()) {
				this.minerals[i] = {
					amt : tiles['minerals' + i].chipsCount(),
					dice : tiles['minerals' + i].chips[0].getVariant()
				};
			}

		for (let i in gamer.technologies) this._knows[i] = gamer.technologies[i];

		this._fieldMinerals = [];
		this.getGame().commonBoard.forEachTile((tile, i) => {
			let name = tile.name,
				subname = name.substr(0, 5);

			if (tile.isEmpty()) return;

			if (subname == 'advDi') {
				this._advDice[ i ] = { group : tile.chips[0].info.group, variant : tile.chips[0].info.variant };
			} else if (subname == 'advSe') {
				this._advSell[ i ] = { group : tile.chips[0].info.group, variant : tile.chips[0].info.variant };
			} else if (subname == 'minerals') {
				this._fieldMinerals[ i ] = [];
				for (let j in tile.chips) this._fieldMinerals[ i ].push( tile.chips[j].info.variant );
			}
		});
	}

	freeSlot() {
		let result = -1;
		for (let i=0; i<3; i++) if (this.advWait[i] == 0) return i;
		return result;
	}

	findPlace(barony, knows, group, variant, nums) {
		let locs = [],
			gamerBoard = this.getGame().getActiveGamer().gamerBoard,
			baronyTiles = gamerBoard.tiles;

		for (let i=0; i<37; i++) {
			let name = 'advLoc' + i,
				key = 'b' + i;

			if ( key in barony ) continue;

			if (baronyTiles[name].group != group) continue;
			let index = nums.indexOf( baronyTiles[name].dice );
			if (index == -1) continue;

			let neib = gamerBoard.getAdvTileNeiborNums(i),
				fill = false;
			for (let j in neib) if ( 'b' + neib[j] in barony ) { fill = true; break; }
			if (!fill) continue;

			if ( group == lx>>>Const.GROUP_MODULE && !('k1' in knows) ) {
				let area = gamerBoard.getAreaNums(i);

				let match = false;
				for (let j in area) {
					if ( ('b' + area[j] in barony) && barony['b' + area[j]] == variant)
						{ match = true; break; }
				}

				if (match) continue;
			}

			locs.push(i);
		}

		return locs;
	}

	locateMinerals(minerals) {
		let map = [-1, -1, -1];
		for (let i in map) {
			if ( this.minerals[i] == 0 ) continue;
			map[i] = this.minerals[i].dice;
		}

		let sortMinerals = [[], [], []];
		for (let i in minerals) {
			let sorted = false;
			for (let j in map) {
				if (minerals[i] == map[j]) { sortMinerals[j].push(i); sorted = true; }
			}

			if (!sorted)
				for (let j in map) if (map[j] == -1) {
					map[j] = minerals[i];
					sortMinerals[j].push(i);
					break;
				}
		}
		return sortMinerals;
	}

	checkSortMineralsEmpty(minerals) {
		return ( !minerals[0].length && !minerals[1].length && !minerals[2].length );
	}

	findActions() {
		function dicePM(num) {
			let p = num + 1,
				m = num - 1;
			if (p > 6) p -= 6;
			if (m < 1) m += 6;
			return [ m, num, p ];
		} 

		let root = this.root();
		this.actions = [];

		let freeSlot = this.freeSlot(),
			advDice = this.advDice(),
			barony = this.barony(),
			knows = this.knows();

		// Fill level for each group
		let groupFill = this.ai.groupFilled(barony),
			groupAmt = groupFill.amount,
			groupFilled = groupFill.filled,
			groupPart = groupFill.part,
			areasFilled = this.ai.areasFilled(barony),
			freeNeighbors = this.ai.freeNeighbors(barony),
			map = this.ai.planMap[this.ai.gamer.colorId],
			gamerBoard = this.ai.gamer.gamerBoard;

		let groupNeibAmt = [0, 0, 0, 0, 0, 0];
		for (let i in freeNeighbors) {
			groupNeibAmt[ gamerBoard.tiles[ 'advLoc' + freeNeighbors[i] ].group ]++;
		}

		let ctx = this,
			_ai = this.ai,
			_game = this.getGame();

		// Taking a chip is judged by group: color fill ratio, neighbour count, TECHNOLOGY
		function getChipUsefulIndex(group, variant) {
			let grAmt = groupFilled[ group ];
			for (let i=0; i<3; i++)
				if ( ctx.advWait[i].group == group ) grAmt++;
			if ( grAmt == groupAmt[group] ) return -100;

			// Modules, accounting for repeats across cities
			if ( group == lx>>>Const.GROUP_MODULE && !('k1' in knows) ) {
				let free = false;
				for (let i in map) {
					let contains = false;
					for (let j in map[i].cells)
						if ( barony[ 'b' + map[i].cells[j] ] == variant )
							{ contains = true; break; }
					if (!contains) { free = true; break; }
				}

				if (!free) return -100;
			}

			// Base coefficient from color fill and the number of potential placement spots
			let k = 1 + groupPart[group] * 1.7 + groupNeibAmt[group] * 0.25;

			// Solar panels, accounting for technology
			if ( group == lx>>>Const.GROUP_SOLAR_PANEL ) {
				k += ( 5 - _game.phase ) * 0.5;
				if ('k2' in knows) k += 0.5;
			}

			// Modules, accounting for technology
			if ( group == lx>>>Const.GROUP_MODULE ) {
				if ( variant == lx>>>Const.VARIANT_MODULE_SPLITTER && ('k16' in knows) ) k += 0.5;
				else if ( variant == lx>>>Const.VARIANT_MODULE_TELESCOPE && ('k17' in knows) ) k += 0.5;
				else if ( variant == lx>>>Const.VARIANT_MODULE_ASSEMBLY && ('k18' in knows) ) k += 0.5;
				else if ( variant == lx>>>Const.VARIANT_MODULE_LAB && ('k19' in knows) ) k += 0.5;
				else if ( variant == lx>>>Const.VARIANT_MODULE_DRONE_PLANT && ('k20' in knows) ) k += 0.5;
				else if ( variant == lx>>>Const.VARIANT_MODULE_SUPERCOMPUTER && ('k21' in knows) ) k += 0.5;
				else if ( variant == lx>>>Const.VARIANT_MODULE_TOKAMAK && ('k22' in knows) ) k += 0.5;
				else if ( variant == lx>>>Const.VARIANT_MODULE_ROBOPORT && ('k23' in knows) ) k += 0.5;
			}

			// Drones, accounting for technology
			if ( group == lx>>>Const.GROUP_DRONE ) {
				let drones = [0, 0, 0, 0];

				for (let i in map) for (let j in map[i].cells) {
					let num = map[i].cells[j],
						gr = gamerBoard.tiles['advLoc' + num].group;
					if ( gr == lx>>>Const.GROUP_DRONE )
						drones[ Math.floor((barony[ 'b' + num ] - 29) / 3) ]++;
				}

				let dronesAmt = 0, dronesTotal = 0;
				for (let i in drones) if (drones[i]) {
					dronesAmt++;
					dronesTotal += drones[i];
				}

				let coGroup = drones[ Math.floor((variant - 29) / 3) ];

				if ( 'k24' in knows && coGroup == 0 ) k += 1;
				if ( 'k7' in knows ) k += 0.25;

				k += coGroup * 0.5;
			}

			// Technology
			if ( group == lx>>>Const.GROUP_TECHNOLOGY ) {
				k += 0.15;

				let modules = [0, 0, 0, 0, 0, 0, 0, 0],
					drones = [0, 0, 0, 0],
					panels = 0,
					probes = 0;

				for (let i in map) for (let j in map[i].cells) {
					let num = map[i].cells[j],
						gr = gamerBoard.tiles['advLoc' + num].group;
					if ( gr == lx>>>Const.GROUP_MODULE )
						modules[ barony[ 'b' + num ] - 41 ]++;
					else if ( gr == lx>>>Const.GROUP_DRONE )
						drones[ Math.floor((barony[ 'b' + num ] - 29) / 3) ]++;
					else if ( gr == lx>>>Const.GROUP_SOLAR_PANEL )
						panels++;
					else if ( gr == lx>>>Const.GROUP_PROBE )
						probes++;
				}

				let dronesAmt = 0, dronesTotal = 0;
				for (let i in drones) if (drones[i]) {
					dronesAmt++;
					dronesTotal += drones[i];
				}

				if ( variant === lx>>>Const.VARIANT_TECHNOLOGY_2 ) k += panels * 0.4;

				if ( variant === lx>>>Const.VARIANT_TECHNOLOGY_16 ) k += modules[ lx>>>Const.VARIANT_MODULE_SPLITTER - 41 ] * 0.4;
				if ( variant === lx>>>Const.VARIANT_TECHNOLOGY_17 ) k += modules[ lx>>>Const.VARIANT_MODULE_TELESCOPE - 41 ] * 0.4;
				if ( variant === lx>>>Const.VARIANT_TECHNOLOGY_18 ) k += modules[ lx>>>Const.VARIANT_MODULE_ASSEMBLY - 41 ] * 0.4;
				if ( variant === lx>>>Const.VARIANT_TECHNOLOGY_19 ) k += modules[ lx>>>Const.VARIANT_MODULE_LAB - 41 ] * 0.4;
				if ( variant === lx>>>Const.VARIANT_TECHNOLOGY_20 ) k += modules[ lx>>>Const.VARIANT_MODULE_DRONE_PLANT - 41 ] * 0.4;
				if ( variant === lx>>>Const.VARIANT_TECHNOLOGY_21 ) k += modules[ lx>>>Const.VARIANT_MODULE_SUPERCOMPUTER - 41 ] * 0.4;
				if ( variant === lx>>>Const.VARIANT_TECHNOLOGY_22 ) k += modules[ lx>>>Const.VARIANT_MODULE_TOKAMAK - 41 ] * 0.4;
				if ( variant === lx>>>Const.VARIANT_TECHNOLOGY_23 ) k += modules[ lx>>>Const.VARIANT_MODULE_ROBOPORT - 41 ] * 0.4;

				if ( variant === lx>>>Const.VARIANT_TECHNOLOGY_24 ) k += dronesAmt * 0.75;
				if ( variant === lx>>>Const.VARIANT_TECHNOLOGY_7 ) k += ( 3 - dronesTotal * 0.5 );

				if ( variant === lx>>>Const.VARIANT_TECHNOLOGY_3 ) k += ( 4 - probes * 0.75 );
				if ( variant === lx>>>Const.VARIANT_TECHNOLOGY_4 ) k += ( 3 - probes * 0.5 );
				if ( variant === lx>>>Const.VARIANT_TECHNOLOGY_5 ) k += ( 4 - probes * 0.75 );
				if ( variant === lx>>>Const.VARIANT_TECHNOLOGY_15 ) k += 3;
				if ( variant === lx>>>Const.VARIANT_TECHNOLOGY_25 ) k += 3;
			}

			// Probes
			if ( group === lx>>>Const.GROUP_PROBE ) {
				k += 0.25;  // For turn order

				let emptyMinerals = 0;
				for (let i in ctx.minerals) if (ctx.minerals[i] === 0) emptyMinerals++;
				if (emptyMinerals === 1) k += 0.25;
				else if (emptyMinerals === 2) k += 0.5;
				else if (emptyMinerals === 3) k += 1;

				if ('k3' in knows) k += 0.25;
				if ('k4' in knows) k += 0.1;
				if ('k5' in knows) k += 0.25;
				if ('k15' in knows) k += 0.25;
				if ('k25' in knows) k += 0.25;
			}

			return k;
		}

		// Placing a chip is judged by the area's fill ratio
		function setChipUsefulIndex(group, variant, dest) {
			let k = 1 + groupPart[group],
				index = _ai.areaIndex(dest),
				filled = areasFilled[ index ];

			k += filled + 1 / map[index].cells.length;

			if (group == lx>>>Const.GROUP_TECHNOLOGY) {
				switch (variant) {
					case lx>>>Const.VARIANT_TECHNOLOGY_25 : k += 0.25 * _game.getActiveGamer().getTileChips('minerals').length; break;
					case lx>>>Const.VARIANT_TECHNOLOGY_15 : k += 0.3 * _game.getActiveGamer().getTileChips('minerals').length; break;
				}
			}

			return k * 1.7;
		}

		if (this.immediately != null) {

			switch (this.immediately) {
				case lx>>>Const.STATUS_GET_MINERAL : {
					let fieldMinerals = this.fieldMinerals();

					let map = [0, 0, 0, 0, 0, 0];
					for (let i in fieldMinerals) map[ +i[8] - 1 ] = 1;

					for (let i=0; i<6; i++) {
						if ( map[i] == 0 ) continue;

						let minerals = [], fromArr = [ 'minerals' + (i+1) ];
						for ( let j in fieldMinerals['minerals' + (i+1)] ) {
							minerals.push( fieldMinerals['minerals' + (i+1)][j] );
						}

						if ('k5' in knows) {
							let ip = ( +i == 5 ) ? 0 : +i+1;
							if ( map[ip] != 0 ) {
								for ( let j in fieldMinerals['minerals' + (ip+1)] )
									minerals.push( fieldMinerals['minerals' + (ip+1)][j] );
							}
							fromArr.push( 'minerals' + (ip+1) );
						}

						let sortMinerals = this.locateMinerals(minerals);
						if ( !this.checkSortMineralsEmpty(sortMinerals) ) {
							let k = 1 + 0.15 * minerals.length + 0.05 * (minerals.length - 1);
							let kk = 1;
							if ('k3' in knows) kk += 0.2;
							if ('k4' in knows) kk += 0.1;
							if ('k15' in knows) kk += 0.2;
							if ('k25' in knows) kk += 0.2;
							if ('k5' in knows) kk += 0.3;
							k *= kk;
							this.actions.push({ type:lx>>>aiConst.GET_MINERALS, from: fromArr, usefulIndex : k });
						}
					}
				} break;

				case lx>>>Const.STATUS_SPLIT : {
					for (let i in this.minerals) {
						if ( this.minerals[i] == 0 ) continue;
						let k = 1 + 0.1 * this.minerals[i].amt;
						let kk = 1;
						if ('k3' in knows) kk += 0.2;
						if ('k4' in knows) kk += 0.1;
						if ('k15' in knows) kk += 0.2;
						if ('k25' in knows) kk += 0.2;
						k *= kk;
						this.actions.push({ type:lx>>>aiConst.SELL_MINERALS, by:-2, from:i, usefulIndex : k });
					}
				} break;

				case lx>>>Const.STATUS_GET_MODULE : {
					if (freeSlot != -1) for (let i in advDice) {
						if ( advDice[i].group == lx>>>Const.GROUP_MODULE ) {
							// Usefulness index calculation
							let k = getChipUsefulIndex( advDice[i].group, advDice[i].variant );

							this.actions.push({ type:lx>>>aiConst.GET_CHIP, by:-2, from:i, to:freeSlot, usefulIndex : k });
						}
					}
				} break;

				case lx>>>Const.STATUS_GET_PCK : {
					if (freeSlot != -1) for (let i in advDice) {
						let gr = advDice[i].group;
						if ( gr == lx>>>Const.GROUP_SOLAR_PANEL || gr == lx>>>Const.GROUP_STATION || gr == lx>>>Const.GROUP_TECHNOLOGY  ) {
							// Usefulness index calculation
							let k = getChipUsefulIndex( advDice[i].group, advDice[i].variant );

							this.actions.push({ type:lx>>>aiConst.GET_CHIP, by:-2, from:i, to:freeSlot, usefulIndex : k });
						}
					}
				} break;

				case lx>>>Const.STATUS_GET_DP : {
					if (freeSlot != -1) for (let i in advDice) {
						let gr = advDice[i].group;
						if ( gr == lx>>>Const.GROUP_DRONE || gr == lx>>>Const.GROUP_PROBE ) {
							// Usefulness index calculation
							let k = getChipUsefulIndex( advDice[i].group, advDice[i].variant );

							this.actions.push({ type:lx>>>aiConst.GET_CHIP, by:-2, from:i, to:freeSlot, usefulIndex : k });
						}
					}
				} break;

				case lx>>>Const.STATUS_SET_CHIP : {
					for (let i in this.advWait) {
						if ( this.advWait[i] == 0 ) continue;

						let group = this.advWait[i].group,
							variant = this.advWait[i].variant,
							nums = [1, 2, 3, 4, 5, 6];

						let locs = this.findPlace(barony, knows, group, variant, nums);
						for (let j in locs) {
							// Usefulness index calculation
							let k = getChipUsefulIndex( group, variant, locs[j] );
						
							this.actions.push({ type:lx>>>aiConst.SET_CHIP, by:-2, from:i, to:locs[j], usefulIndex : k });
						}
					}
				} break;
			}
			return;	
		}

		// Buy with credit
		if (!this.creditUsed && this.credit >= 2 && freeSlot != -1) {
			let advSell = this.advSell();

			for (let i in advSell) {
				// Usefulness index calculation
				let k = getChipUsefulIndex( advSell[i].group, advSell[i].variant );

				this.actions.push({ type:lx>>>aiConst.GET_CHIP, by:-1, from:i, to:freeSlot, usefulIndex : k });
			}

			if ('k6' in knows) for (let i in this.advDice) {
				// Usefulness index calculation
				let k = getChipUsefulIndex( advDice[i].group, advDice[i].variant );

				this.actions.push({ type:lx>>>aiConst.GET_CHIP, by:-1, from:i, to:freeSlot, usefulIndex : k });
			}
		}

		// Take a chip from the board
		if (freeSlot != -1) {
			let nums0 = [ this.dices[0] ],
				nums1 = [ this.dices[1] ];

			if ('k12' in knows) {
				nums0 = dicePM( this.dices[0] );
				nums1 = dicePM( this.dices[1] );
			}

			for (let i in advDice) {
				let dice = +i[7],
					index = nums0.indexOf( dice ),
					actions = [null, null, null];

				if (index != -1) {
					// Usefulness index calculation
					actions[0] = {
						type: lx>>>aiConst.GET_CHIP,
						by: 0,
						from: i,
						to: freeSlot,
						usefulIndex: getChipUsefulIndex( advDice[i].group, advDice[i].variant )
					};
				}

				if ( this.dices[1] != this.dices[0] ) {
					let index = nums1.indexOf( dice );
					if (index != -1) {
						// Usefulness index calculation
						actions[1] = {
							type: lx>>>aiConst.GET_CHIP,
							by: 1,
							from: i,
							to: freeSlot,
							usefulIndex: getChipUsefulIndex( advDice[i].group, advDice[i].variant )
						}
					}
				}

				if (this.diceJoker.length) {
					// Usefulness index calculation
					actions[2] = {
						type: lx>>>aiConst.GET_CHIP,
						by: 2,
						from: i,
						to: freeSlot,
						usefulIndex: getChipUsefulIndex( advDice[i].group, advDice[i].variant )
					}
				}

				let bestAction = null;
				for (let j in actions) {
					if (actions[j] === null) continue;
					if (bestAction === null) {
						bestAction = actions[j];
						continue;
					}
					if (actions[j].usefulIndex > bestAction.usefulIndex)
						bestAction = actions[j];
				}

				if (bestAction)
					this.actions.push(bestAction);
			}
		}

		// Bring a chip into the building area
		for (let i in this.advWait) {
			if ( this.advWait[i] == 0 ) continue;

			let group = this.advWait[i].group,
				variant = this.advWait[i].variant,
				nums0 = [ this.dices[0] ],
				nums1 = [ this.dices[1] ];

			if ( ('k9' in knows && group == lx>>>Const.GROUP_MODULE)
				|| ( 'k10' in knows && (group == lx>>>Const.GROUP_DRONE || group == lx>>>Const.GROUP_PROBE) )
				|| ( 'k11' in knows && (group == lx>>>Const.GROUP_SOLAR_PANEL || group == lx>>>Const.GROUP_STATION || group == lx>>>Const.GROUP_TECHNOLOGY) )
			) {
				nums0 = dicePM( this.dices[0] );
				nums1 = dicePM( this.dices[1] );
			}

			let locs = this.findPlace(barony, knows, group, variant, nums0);
			for (let j in locs) {
				// Usefulness index calculation
				let k = setChipUsefulIndex(group, variant, locs[j]);

				this.actions.push({ type:lx>>>aiConst.SET_CHIP, by:0, from:i, to:locs[j], usefulIndex : k });
			}

			if ( this.dices[1] != this.dices[0] ) {
				let locs = this.findPlace(barony, knows, group, variant, nums1);
				for (let j in locs) {
					// Usefulness index calculation
					let k = setChipUsefulIndex(group, variant, locs[j]);

					this.actions.push({ type:lx>>>aiConst.SET_CHIP, by:1, from:i, to:locs[j], usefulIndex : k });
				}
			}

			if (this.diceJoker.length) {
				let nums = [1, 2, 3, 4, 5, 6],
					locs = this.findPlace(barony, knows, group, variant, nums);
				for (let j in locs) {
					// Usefulness index calculation
					let k = setChipUsefulIndex(group, variant, locs[j]);

					this.actions.push({ type:lx>>>aiConst.SET_CHIP, by:2, from:i, to:locs[j], usefulIndex : k });
				}
			}
		}

		// Using a dataStorage
		if (this.dataStorages != 0) {
			let baseDices = root.dices,
				p0 = false,
				m0 = false,
				p1 = false,
				m1 = false;

			if ( this.parent != null ) {
				let pB = this.parent.dices[0] + 1;
				if (pB > 6) pB = 1;
				let mP = this.parent.dices[0] - 1;
				if (mP < 1) mP = 6;
				if (this.dices[0] == pB) p0 = true;
				if (this.dices[0] == mP) m0 = true;

				pB = this.parent.dices[1] + 1;
				if (pB > 6) pB = 1;
				mP = this.parent.dices[1] - 1;
				if (mP < 1) mP = 6;
				if (this.dices[1] == pB) p1 = true;
				if (this.dices[1] == mP) m1 = true;
			}

			if ( this.dices[0] != 0 && this.dices[0] + 3 != baseDices[0] && this.dices[0] - 3 != baseDices[0] ) {
				if (!p0) this.actions.push({ type:lx>>>aiConst.USE_DATA_STORAGE, dice:0, shift:-1, usefulIndex : 0 });
				if (!m0) this.actions.push({ type:lx>>>aiConst.USE_DATA_STORAGE, dice:0, shift: 1, usefulIndex : 0 });
			}
			if ( this.dices[1] && this.dices[1] + 3 != baseDices[1] && this.dices[1] - 3 != baseDices[1] ) {
				if (!p1) this.actions.push({ type:lx>>>aiConst.USE_DATA_STORAGE, dice:1, shift:-1, usefulIndex : 0 });
				if (!m1) this.actions.push({ type:lx>>>aiConst.USE_DATA_STORAGE, dice:1, shift: 1, usefulIndex : 0 });
			}

			if ('k8' in knows) {
				if ( this.dices[0] && this.dices[0] + 2 != baseDices[0] && this.dices[0] - 2 != baseDices[0] ) {
					if (!p0) this.actions.push({ type:lx>>>aiConst.USE_DATA_STORAGE, dice:0, shift:-2, usefulIndex : 0 });
					if (!m0) this.actions.push({ type:lx>>>aiConst.USE_DATA_STORAGE, dice:0, shift: 2, usefulIndex : 0 });
				}
				if ( this.dices[1] && this.dices[1] + 2 != baseDices[1] && this.dices[1] - 2 != baseDices[1] ) {
					if (!p1) this.actions.push({ type:lx>>>aiConst.USE_DATA_STORAGE, dice:1, shift:-2, usefulIndex : 0 });
					if (!m1) this.actions.push({ type:lx>>>aiConst.USE_DATA_STORAGE, dice:1, shift: 2, usefulIndex : 0 });
				}
			}
		}

		// Exchange for a dataStorage
		if (this.dices[0] != 0) this.actions.push({ type:lx>>>aiConst.GET_DATA_STORAGE, by:0, usefulIndex : 0 });
		if (this.dices[1] != 0) this.actions.push({ type:lx>>>aiConst.GET_DATA_STORAGE, by:1, usefulIndex : 0 });
		if (this.diceJoker.length) this.actions.push({ type:lx>>>aiConst.GET_DATA_STORAGE, by:2, usefulIndex : 0 });

		// Selling minerals
		for (let i in this.minerals) {
			if ( this.minerals[i] == 0 ) continue;
			let dice = this.minerals[i].dice;

			let k = 1 + 0.1 * this.minerals[i].amt,
				kk = 1;
			if ('k3' in knows) kk += 0.2;
			if ('k4' in knows) kk += 0.1;
			if ('k15' in knows) kk += 0.2;
			if ('k25' in knows) kk += 0.2;
			k *= kk;

			if ( dice == this.dices[0] ) this.actions.push({ type:lx>>>aiConst.SELL_MINERALS, by:0, from:i, usefulIndex : k });
			if ( this.dices[1] != this.dices[0] && dice == this.dices[1] ) this.actions.push({ type:lx>>>aiConst.SELL_MINERALS, by:1, from:i, usefulIndex : k });
			if (this.diceJoker.length) this.actions.push({ type:lx>>>aiConst.SELL_MINERALS, by:2, from:i, usefulIndex : k });
		}
	}

	setParent(cond) {
		this.parent = cond;
		this.ai = this.parent.ai;

		this.creditUsed = cond.creditUsed;
		this.dices = [ cond.dices[0], cond.dices[1] ];
		for (let i in cond.diceJoker) this.diceJoker[i] = cond.diceJoker[i];
		for (let i in cond.advWait) this.advWait[i] = cond.advWait[i];
		this.dataStorages = cond.dataStorages;
		this.credit = cond.credit;
		for (let i in cond.minerals) this.minerals[i] = cond.minerals[i];
	}

	barony() {
		if (this.parent == null) return this._barony;
		let b = {}, pb = this.parent.barony();
		for (let i in pb) b[i] = pb[i];
		for (let i in this._barony) b[i] = this._barony[i];
		return b;
	}

	knows() {
		if (this.parent == null) return this._knows;
		let b = {}, pb = this.parent.knows();
		for (let i in pb) b[i] = pb[i];
		for (let i in this._knows) b[i] = this._knows[i];
		return b;
	}

	advDice() {
		if (this.parent == null) return this._advDice;
		let b = {}, pb = this.parent.advDice();
		for (let i in pb) b[i] = pb[i];
		for (let i in this._advDice) delete b[i];
		return b;
	}

	advSell() {
		if (this.parent == null) return this._advSell;
		let b = {}, pb = this.parent.advSell();
		for (let i in pb) b[i] = pb[i];
		for (let i in this._advSell) delete b[i];
		return b;
	}

	fieldMinerals() {
		if ( this._fieldMinerals == null ) return this.parent.fieldMinerals();
		return this._fieldMinerals;
	}
}
