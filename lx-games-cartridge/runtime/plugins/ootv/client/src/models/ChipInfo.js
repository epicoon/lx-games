// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv;
class ChipInfo {
	constructor(packName, group, variant) {
		this.packName = packName;
		this.group = group;
		this.variant = lx.getFirstDefined(variant, null);
	}

	static create(config) {
		return new this(config.packName, config.group, config.variant);
	}

	getFace() {
		if (this.group == lx>>>Const.GROUP_MINERALS) {
			if (this.variant === null)
				return this.getBack();

			return 'minerals' + this.variant;
		}

		return lx>>>Const.CHIP_IMG_NAMES[this.variant];
	}

	getSide() {
		return lx>>>Const.CHIP_COLOR[this.packName];
	}

	getBack() {
		return lx>>>Const.CHIP_BACK;
	}
}
