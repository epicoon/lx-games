// @lx:macros Const {lxGames.ootv.Constants};

// Building-zone layout: 37 cells shaped into a truncated rhombus
// (4-5-6-7-6-5-4). Coordinates are in the same FIELD_SIZE-normalized local
// units the board's tiles use (see lxGames.ootv.Tile), tuned to sit on the
// honeycomb baked into the planshet textures (planRaccoon.png etc.).
const ROW_LENGTHS = [4, 5, 6, 7, 6, 5, 4];
const ORIGIN_X = -0.09125;
const ORIGIN_Z = -0.1625;
const STEP_X = 0.060125;
const ROW_SHIFT_X = -0.02925;
const ROW_STEP_Z = 0.05455;

// Hexagon circumradius as a fraction of the "cells touch" size
const HEX_FILL = 0.97;
// Die-face quad side as a fraction of the hexagon's point-to-point height
const DICE_FILL = 0.5;

// Lift above the planshet surface (world units)
const OVERLAY_LIFT = 0.6;
const DICE_LIFT = 0.3;

const OVERLAY_OPACITY = 0.9;
const DICE_OPACITY = 0.5;

// @lx:namespace lxGames.ootv;
class OverlayManager {
	constructor(world) {
		this.world = world;
		this._geometry = null;
	}

	getSlotPosition(index) {
		const g = _ensureGeometry(this);
		return g.cells[index];
	}

	/**
	 * Builds the building-zone hex overlays for a gamer board and parents
	 * them to its mesh, so they track the board's position.
	 * @param {lxGames.ootv.GamerBoard} board
	 */
	buildForBoard(board) {
		const g = _ensureGeometry(this),
			map = this.world.game.actions.dataProvider.getBoardMap(board.type),
			y = board.sizes[1] * 0.5 + OVERLAY_LIFT;

		for (let i = 0; i < g.cells.length; i++) {
			const cell = map[i],
				pos = g.cells[i];

			const hex = this.world.newMesh({
				parent: board.mesh,
				geometry: g.hex,
				material: new THREE.MeshBasicMaterial({
					color: lx>>>Const.GROUP_COLOR[cell.group] || 0xffffff,
					transparent: true,
					opacity: OVERLAY_OPACITY,
					side: THREE.DoubleSide,
					depthWrite: false
				}),
				position: [pos[0], y, pos[1]]
			});

			this.world.newMesh({
				parent: hex,
				geometry: g.dice,
				material: new THREE.MeshBasicMaterial({
					map: this.world.getTexture('dice' + cell.dice + '.png'),
					transparent: true,
					opacity: DICE_OPACITY,
					side: THREE.DoubleSide,
					depthWrite: false
				}),
				position: [0, DICE_LIFT, 0]
			});
		}
	}
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// The hex and die-face geometry is identical for every cell of every
// board, so it is built once on first use and shared by all overlays.
function _ensureGeometry(self) {
	if (self._geometry) return self._geometry;

	const fs = lx>>>Const.FIELD_SIZE,
		step = STEP_X * fs,
		// Pointy-top grid: horizontal centre spacing == sqrt(3) * radius
		radius = step / Math.sqrt(3) * HEX_FILL;

	// Pointy-top hexagon lying flat in XZ, face up (+Y)
	const hex = new THREE.CircleGeometry(radius, 6, Math.PI / 2);
	hex.rotateX(-Math.PI / 2);

	const diceSide = radius * 2 * DICE_FILL;
	const dice = new THREE.PlaneGeometry(diceSide, diceSide);
	dice.rotateX(-Math.PI / 2);

	self._geometry = {hex, dice, cells: _computeCells(fs)};
	return self._geometry;
}

/**
 * @private
 * @param {Number} fs - FIELD_SIZE
 * @returns {Array<Array<Number>>} 37 [x, z] local offsets, row-major
 */
function _computeCells(fs) {
	const stepX = STEP_X * fs,
		rowShiftX = ROW_SHIFT_X * fs,
		rowStepZ = ROW_STEP_Z * fs;
	let baseX = ORIGIN_X * fs,
		baseZ = ORIGIN_Z * fs,
		dir = 1,
		cells = [];

	for (let r = 0; r < ROW_LENGTHS.length; r++) {
		for (let c = 0; c < ROW_LENGTHS[r]; c++)
			cells.push([baseX + stepX * c, baseZ]);
		if (ROW_LENGTHS[r] === 7) dir = -1;
		baseX += rowShiftX * dir;
		baseZ += rowStepZ;
	}
	return cells;
}
