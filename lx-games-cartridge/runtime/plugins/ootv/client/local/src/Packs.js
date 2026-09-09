// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv;
class Packs {
	constructor(game, data) {
		this.game = game;
		this.data = data;
		this.list = {};
		this.forShuffle = [];
		this.advPacks = [];
	}

	clear() {
		for (let i in this.list)
			this.list[i].clear();
	}

	init() {
		for (let packName in this.data) {
			let packData = this.data[packName],
				unlimit = !!packData.infinite,
				shuffled = !!packData.shuffled,
				advantage = packData.advantage || null;
			const pack = _createPack(this, packName, unlimit);

			if (shuffled)
				this.forShuffle.push(packName);

			if (advantage !== null) {
				this.advPacks[lx>>>Const[advantage]] = pack;
			}

			if (unlimit) {
				pack.addChipInfo(lx>>>Const[packData.group], lx>>>Const[packData.variant]);
				continue;
			}

			if (packData.groups) {
				for (let group in packData.groups) {
					let count = 1,
						variants = packData.groups[group];
					for (let i in variants) {
						let variant = variants[i];
						if (lx.isObject(variant)) {
							count = +variant.count;
							continue;
						}
						for (let k = 0; k < count; k++)
							pack.addChipInfo(lx>>>Const[group], lx>>>Const[variant]);
					}
				}
			}
		}
	}

	get(name) {
		if (!(name in this.list)) {
			console.error('pack "' + name + '" does not exist');
			return null;
		}
		return this.list[name];
	}

	shuffle() {
		this.forShuffle.forEach(name=>this.list[name].shuffle());
	}
}

function _createPack(self, name, unlimit) {
	self.list[name] = new lxGames.ootv.ChipPack(name, unlimit);
	return self.list[name];
}
