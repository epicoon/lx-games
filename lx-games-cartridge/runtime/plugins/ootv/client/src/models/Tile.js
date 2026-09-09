// @lx:macros Const {lxGames.ootv.Constants};

// Advantage chips are built at their larger "in hand" size; while sitting in
// a building-zone slot they are scaled down by this factor - the zone layout
// is calibrated for the smaller footprint.
const ADV_ZONE_CHIP_SCALE = 0.75;

// @lx:namespace lxGames.ootv;
class Tile {
	constructor(name, x, z, board) {
		this.name = name;
		this.x = x;
		this.z = z;
		this.parent = board;
		this.chips = [];
	}

	isType(type) {
		if (this.type === undefined) return false;
		if (lx.isArray(type))
			return type.includes(this.type);
		return this.type === type;
	}

	isGroup(group) {
		if (this.group === undefined) return false;
		if (lx.isArray(group))
			return group.includes(this.group);
		return this.group == group;
	}

	getGroup() {
		if (this.group === undefined) return null;
		return this.group;
	}

	/**
	 * @param [condition = null] {Object: {
	 *     [group] {Number|Array<Number>},
	 *     [variant] {Number|Array<Number>}
	 * }}
	 * @return Boolean
	 */
	containsChip(condition = null) {
		if (this.isEmpty()) return false;
		if (condition === null) return !this.isEmpty();

		if (condition.group !== undefined) {
			let chip = this.chips[0];
			if (!chip.info || !chip.info.group === undefined) return false;
			return chip.isGroup(condition.group);
		}

		if (condition.variant !== undefined) {
			let chip = this.chips[0];
			if (!chip.info || !chip.info.variant === undefined) return false;
			return chip.isVariant(condition.variant);
		}
	}

	chipsCount() {
		return this.chips.length;
	}

	isEmpty() {
		return !this.chips.length;
	}

	isActualForGamersCount(count) {
		if (this.amt === undefined) return true;
		return this.amt <= count;
	}

	forEachChip(f) {
		for (let i in this.chips) f(this.chips[i], +i);
	}

	filledHeight() {
		let h = 0;
		for (let i in this.chips) h += this.chips[i].sizes[1];
		return h;
	}

	remove(chip) {
		let index = this.chips.indexOf(chip);
		if (index == -1) return;
		this.chips.splice(index, 1);
		let h = this.parent.surface();
		for (let i in this.chips) {
			let ch = this.chips[i];
			ch.mesh.position.y = h + ch.sizes[1] * 0.5;
			h += ch.sizes[1];
		}
	}

	locate(chip) {
		if (chip.tile !== null) chip.tile.remove(chip);

		chip.tile = this;

		let x = this.x * lx>>>Const.FIELD_SIZE,
			z = this.z * lx>>>Const.FIELD_SIZE;

		// Shrink advantage chips to fit the building-zone slots. Footprint
		// only (X/Z) - thickness stays 1 so the vertical stacking math that
		// reads chip.sizes is unaffected.
		let scale = this.isType(lx>>>Const.TILE_ADVANTAGE_LOCATED) ? ADV_ZONE_CHIP_SCALE : 1;
		chip.mesh.scale.set(scale, 1, scale);

		chip.putOn( this.parent );
		chip.mesh.position.x += x;
		chip.mesh.position.z += z;
		chip.mesh.position.y += this.filledHeight();

		this.chips.push(chip);
	}

	coords() {
		let x = this.parent.mesh.position.x + this.x * lx>>>Const.FIELD_SIZE,
			y = this.parent.surface() + this.filledHeight(),
			z = this.parent.mesh.position.z + this.z * lx>>>Const.FIELD_SIZE;
		return [x, y, z];
	}

	delChips(amt) {
		if (amt === undefined) amt = this.chips.length;
		if ( amt > this.chips.length ) amt = this.chips.length;

		for (let i=0; i<amt; i++) {
			let chip = this.chips.pop();
			chip.del();
		}
	}
}
