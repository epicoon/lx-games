// @lx:macros Const {lxGames.ootv.Constants};
// @lx:macros aiConst {lxGames.ootv.AI.AI};

// @lx:namespace lxGames.ootv.AI;
class AI {
	// @lx:const GET_CHIP = 0;
	// @lx:const SET_CHIP = 1;
	// @lx:const GET_MINERALS = 2;
	// @lx:const SELL_MINERALS = 3;
	// @lx:const GET_DATA_STORAGE = 4;
	// @lx:const USE_DATA_STORAGE = 5;

	constructor(game) {
		this.game = game;
		this.gamer = null;
		this.conditionCounter = 0;
		this.conditionsTree = null;
		this.actions = [];
		this.active = false;
		this.planMap = [];
	}

	genConditionsTree() {
		function useBy(cond, by) {
			if (by == -1) { cond.credit -= 2; cond.creditUsed = true; }
			if (by == 0) cond.dices[0] = 0;
			if (by == 1) cond.dices[1] = 0;
			if (by == 2) cond.diceJoker.pop();
		}

		this.conditionsTree = new lxGames.ootv.AI.Condition(this);
		this.conditionsTree.initCore( this.gamer );

		this.conditionCounter = 1;

		let _ai = this;
		function rec( ctx ) {
			ctx.findActions();
			if (!ctx.actions.length) _ai.conditionsTree.ends.push( ctx );

			let amt;
			if ( ctx.immediately ) amt = ctx.actions.length;
			else amt = Math.floor( 2000 / _ai.conditionCounter );
			let indexes = lx.Math.selectRandomKeys( ctx.actions, amt );

			for (let i in indexes) {
				let act = ctx.actions[ indexes[i] ],
					knows = ctx.knows();

				// Build a new reality for each individual action
				_ai.conditionCounter++;
				let newCond = new lxGames.ootv.AI.Condition();
				newCond.setParent( ctx );
				newCond.reason = act;
				newCond.usefulActionIndex = ctx.usefulActionIndex + act.usefulIndex;

				// Apply the changes caused by the action to the new reality
				switch ( act.type ) {
					case lx>>>aiConst.GET_CHIP : {
						useBy( newCond, act.by );
						let info = _ai.game.commonBoard.tiles[act.from].chips[0].info;
						newCond.advWait[act.to] = { group : info.group, variant : info.variant };

						// console.log( newCond );
					} break;

					case lx>>>aiConst.SET_CHIP : {
						useBy( newCond, act.by );

						let group = newCond.advWait[ act.from ].group,
							variant = newCond.advWait[ act.from ].variant;
						newCond._barony[ 'b' + act.to ] = variant;
						newCond.advWait[ act.from ] = 0;

						// Drone group for scoring
						// Telescope for scoring

						switch (variant) {
							case lx>>>Const.VARIANT_PROBE : {
								let fieldMinerals = newCond.fieldMinerals(),
									find = false;
								for (let i in fieldMinerals) { find = true; break; }
								if (find) newCond.immediately = lx>>>Const.STATUS_GET_MINERAL;
							} break;
							case lx>>>Const.VARIANT_MODULE_SPLITTER : {
								if (newCond.minerals[0] != 0 || newCond.minerals[1] != 0 || newCond.minerals[2] != 0)
									newCond.immediately = lx>>>Const.STATUS_SPLIT;
							} break;
							case lx>>>Const.VARIANT_MODULE_ASSEMBLY : {
								let advDice = newCond.advDice(),
									find = false;
								for (let i in advDice)
									if ( advDice[i].group == lx>>>Const.GROUP_MODULE ) { find = true; break; }
								if (find) newCond.immediately = lx>>>Const.STATUS_GET_MODULE;
							} break;
							case lx>>>Const.VARIANT_MODULE_LAB : {
								let advDice = newCond.advDice(),
									find = false;
								for (let i in advDice)
									if ( advDice[i].group == lx>>>Const.GROUP_SOLAR_PANEL
										|| advDice[i].group == lx>>>Const.GROUP_STATION
										|| advDice[i].group == lx>>>Const.GROUP_TECHNOLOGY )
										{ find = true; break; }
								if (find) newCond.immediately = lx>>>Const.STATUS_GET_PCK;
							} break;
							case lx>>>Const.VARIANT_MODULE_DRONE_PLANT : {
								let advDice = newCond.advDice(),
									find = false;
								for (let i in advDice)
									if ( advDice[i].group == lx>>>Const.GROUP_DRONE
										|| advDice[i].group == lx>>>Const.GROUP_PROBE )
										{ find = true; break; }
								if (find) newCond.immediately = lx>>>Const.STATUS_GET_DP;
							} break;
							case lx>>>Const.VARIANT_MODULE_ROBOPORT : {
								if ( newCond.advWait[0] != 0 || newCond.advWait[1] != 0 || newCond.advWait[2] != 0 )
									newCond.immediately = lx>>>Const.STATUS_SET_CHIP;
							} break;
							case lx>>>Const.VARIANT_STATION : { newCond.diceJoker.push(7); } break;
							case lx>>>Const.VARIANT_MODULE_SUPERCOMPUTER : { newCond.dataStorages += 4; } break;
							case lx>>>Const.VARIANT_MODULE_TOKAMAK : { newCond.credit += 2; } break;
						}

						// console.log( newCond );
					} break;

					case lx>>>aiConst.GET_MINERALS : {
						// console.log( 'action GET_MINERALS' );

						let fieldMinerals = newCond.fieldMinerals(),
							fg = [];
						for (let i in fieldMinerals) {
							fg[i] = fieldMinerals[i];
							for (let j in fieldMinerals[i])
								fg[i][j] = fieldMinerals[i][j];
						}
						newCond._fieldMinerals = fg;

						let from = act.from;

						for (let i in from) {
							let name = from[i];

							let l = newCond._fieldMinerals[name].length - 1;
							for (let j=l; j>=0; j--) {
								let minerals = newCond._fieldMinerals[name][j];

								let located = false;
								for (let g in newCond.minerals) {
									if ( newCond.minerals[g] != 0 && newCond.minerals[g].dice == minerals ) {
										newCond.minerals[g].amt++;
										newCond._fieldMinerals[name].splice(j, 1);
										located = true;
									}
								}
								if (!located) for (let g in newCond.minerals) {
									if (newCond.minerals[g] == 0) {
										newCond.minerals[g] = { dice : minerals, amt : 1 };
										newCond._fieldMinerals[name].splice(j, 1);
										break;
									}
								}
							}
						}

						// console.log( newCond );
					} break;

					case lx>>>aiConst.SELL_MINERALS : {
						newCond.minerals[ act.from ] = 0;
						useBy( newCond, act.by );
						newCond.credit++;
						if ('k3' in knows) newCond.credit++;
						if ('k4' in knows) newCond.dataStorages++;

						// console.log( newCond );
					} break;

					case lx>>>aiConst.GET_DATA_STORAGE : {
						useBy( newCond, act.by );
						newCond.dataStorages += 2;
						if ('k13' in knows) newCond.credit += 1;
						if ('k14' in knows) newCond.dataStorages += 2;

						// console.log( newCond.dataStorages, newCond.dices );
					} break;

					case lx>>>aiConst.USE_DATA_STORAGE : {
						newCond.dataStorages--;
						newCond.dices[ act.dice ] += act.shift;
						if ( newCond.dices[ act.dice ] > 6 ) newCond.dices[ act.dice ] -= 6;
						if ( newCond.dices[ act.dice ] < 1 ) newCond.dices[ act.dice ] += 6;
					} break;
				}
			
				// Branch the new reality according to its possible events
				rec( newCond );


				// console.log( '---' );
				// console.log( newCond.reason );
			}
		}

		rec( this.conditionsTree );

		this.conditionsTree.ends.sort(
			function(a, b) {
				if ( a.usefulActionIndex > b.usefulActionIndex ) return -1;
				if ( a.usefulActionIndex < b.usefulActionIndex ) return 1;
				return 0;
			}
		);
	}


	delConditionsTree() {
		delete this.conditionsTree;
	}

	genPlanMap() {
		if (this.gamer.colorId in this.planMap) return;

		let arr = [];

		for (let i=0; i<37; i++) {

			let located = false;
			for (let j in arr) if ( arr[j].contains(i) ) { located = true; break; }
			if (located) continue;

			let area = new lxGames.ootv.AI.Area();
			area.cells = this.gamer.gamerBoard.getAreaNums(i);
			area.group = this.gamer.getTile('advLoc' + i).group;

			arr.push(area);
		}

		this.planMap[this.gamer.colorId] = arr;
	}

	freeNeighbors(barony) {
		let arr = [];

		for (let i=0; i<37; i++) {

			let key = 'b' + i;

			let neib = [];
			if (key in barony) neib = this.gamer.gamerBoard.getAdvTileNeiborNums(i);

			for (let j in neib)
				if ( !('b'+j in barony) ) arr['n' + neib[j]] = neib[j];
		}

		return arr;
	}

	groupFilled(barony) {
		let result = [0, 0, 0, 0, 0, 0],
			amt = [0, 0, 0, 0, 0, 0],
			fill = [0, 0, 0, 0, 0, 0],
			gamerBoard = this.gamer.gamerBoard;

		for (let i=0; i<37; i++) {
			let gr = gamerBoard.tiles['advLoc' + i].group;
			amt[gr]++;
			if ( ('b' + i) in barony ) fill[gr]++;
		}

		fill[lx>>>Const.GROUP_STATION]--;
		amt[lx>>>Const.GROUP_STATION]--;

		for (let i in result) result[i] = fill[i] / amt[i];

		return { amount : amt, filled : fill, part : result };
	}

	areasFilled(barony) {
		let map = this.planMap[this.gamer.colorId],
			result = [];

		for (let i in map) {
			let area = map[i];
			result.push(0);

			for (let j in area.cells)
				if ( 'b' + area.cells[j] in barony )
					result[i]++;

			result[i] = result[i] / area.cells.length;
		}

		return result;
	}

	areaIndex(num) {
		let map = this.planMap[this.gamer.colorId];
		for (let i in map)
			if (map[i].contains(num)) return i;
		return -1;
	}

	setGamer(gamer) {

		console.log( 'setGamer' );

		this.gamer = gamer;
		this.genPlanMap();

		// If inactive: become active, build the conditions tree, pick an event matrix, start walking it
		if (!this.active) {
			console.log('activate ==========================================');
			this.active = true;
			this.genConditionsTree();

			let end = this.conditionsTree.ends[0];

			while ( end.parent != null ) {
				this.actions.push(end);
				end = end.parent;
			}

			if (this.actions.length)
				this.actions[ this.actions.length - 1 ].parent = null;

			this.delConditionsTree();

			for (let i in this.actions)
				console.log( JSON.stringify( this.actions[i].reason ) );
		}

		// If active: if the queue has actions, run the top one and pop it. If the queue is empty, become inactive and pass the turn
		if (this.active) {

			if ( !this.actions.length ) {
				console.log('deactivate =============================================');
				this.active = false;
				this.game.actions.trigger(new lxGames.ootv.ActionEndTurn());
				return;
			}

			let action = this.actions.pop(),
				reason = action.reason;

			// console.log( action );
			console.log( reason );

			// console.log( 'reason.type ', reason.type );
			switch ( reason.type ) {
				case lx.self(GET_CHIP) : {
					if (reason.by == -1) {
						this.game.actions.trigger(new lxGames.ootv.ActionBuyChip({
							gamer: this.gamer.getToken(),
							tile: this.game.commonBoard.tiles[ reason.from ].name
						}));
					} else {
						let dice = null;
						if (reason.by != -2) {
							if (reason.by == 2) dice = this.gamer.diceJoker[0];
							else dice = this.gamer.dices[ reason.by ];
						}
						this.game.actions.trigger(new lxGames.ootv.ActionGetChip({
							gamer: this.gamer.getToken(),
							tile: this.game.commonBoard.tiles[ reason.from ].name,
							dice: dice ? dice.index : null
						}));
					}
				} break;
				
				case lx.self(SET_CHIP) : {
					let chip = this.gamer.getTileChips('advWait' + reason.from)[0],
						tile = this.gamer.getTile('advLoc' + reason.to),
						dice = null;

					if (reason.by != -2) {
						if (reason.by == 2) dice = this.gamer.diceJoker[0];
						else dice = this.gamer.dices[ reason.by ];
					}

					if (!chip) {
						console.error('Can not find a chip while AI.SET_CHIP: tile - advWait' +
							reason.from + ', reason:', reason);
						return;
					}

					this.game.actions.trigger(new lxGames.ootv.ActionApplyChip({
						gamer: this.gamer.getToken(),
						from: chip.tile.name,
						to: tile.name,
						dice: dice ? dice.index : null
					}));
				} break;
				
				case lx.self(GET_MINERALS) : {
					let from = reason.from.pop();
					if ( reason.from.length ) this.actions.push( action );

					this.game.actions.trigger(new lxGames.ootv.ActionGetMinerals({
						gamer: this.gamer.getToken(),
						tile: this.game.commonBoard.tiles[ from ].name
					}));
				} break;
				
				case lx.self(SELL_MINERALS) : {
					let dice = null;
					if (reason.by != -2) {
						if (reason.by == 2) dice = this.gamer.diceJoker[0];
						else dice = this.gamer.dices[ reason.by ];
					}

					let tile = this.gamer.getTile('minerals' + reason.from);
					this.game.actions.trigger(new lxGames.ootv.ActionSplitMinerals({
						gamer: this.gamer.getToken(),
						tile: tile.name,
						dice: dice ? dice.index : null
					}));

				} break;
				
				case lx.self(GET_DATA_STORAGE) : {
					if (reason.by == 2) this.game.activeDice = this.gamer.diceJoker[0];
					else this.game.activeDice = this.gamer.dices[ reason.by ];

					this.game.actions.trigger(new lxGames.ootv.ActionDiceToDataStorage({
						gamer: this.gamer.getToken(),
						dice: this.game.activeDice.index
					}));
				} break;
				
				case lx.self(USE_DATA_STORAGE) : {
					this.gamer.getTile('dataStorage').delChips(1);
					this.gamer.dices[ reason.dice ].incValue( reason.shift );
					this.game.status.setAI();
				} break;
			}
		}
	}
}
