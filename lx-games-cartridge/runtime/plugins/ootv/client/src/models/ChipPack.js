// @lx:namespace lxGames.ootv;
class ChipPack {
	constructor(name, unlimit) {
		this.name = name;
		this.unlimit = unlimit;
		this.cart = [];
		this.sequence = [];
		this.inGame = 0;
	}

	addChipInfo(group, variant) {
		let chipInfo = new lxGames.ootv.ChipInfo(this.name, group, variant);
		this.cart.push( chipInfo );
		return chipInfo;
	}

	shuffle() {
		if (this.unlimit) return;

		this.sequence = [];
		for (let i=0; i<this.cart.length; i++) this.sequence.push(i);
		for (let i = this.sequence.length - 1; i > 0; i--) {
			let num = Math.floor(Math.random() * (i + 1)),
				d = this.sequence[num];
			this.sequence[num] = this.sequence[i];
			this.sequence[i] = d;
		}
		return this;
	}

	getOne() {
		if (this.unlimit) return this.cart[0];

		let num = this.inGame;
		this.inGame++;
		if ( this.sequence.length ) return this.cart[ this.sequence[num] ];

		return this.cart[num];
	}

	clear() {
		for (let i in this.cart) {
			let cart = this.cart[i];
			if ( cart.chip != null ) {
				cart.chip.del();
				cart.chip = null;
			}
		}	

		this.cart = [];
		this.sequence = [];
		this.inGame = 0;
	}
}
