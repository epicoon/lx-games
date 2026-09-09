// @lx:namespace lxGames.ootv;
class DiceAnimator extends lx.Timer {
	constructor(game) {
		super(game.options.speed);

		this.game = game;
		this.dice = null;
		this.way = 0;
		this.y0 = 0;
		this.callback = null;

		this.whileCycle(function() {
			let k = this.shift(),
				shift;

			if ( k < 0.5 ) shift = this.way * k * 2;
			else shift = this.way * (1 - k) * 2;

			let x = lx.Math.randomInteger(0, 360) * Math.PI / 180,
				y = lx.Math.randomInteger(0, 360) * Math.PI / 180,
				z = lx.Math.randomInteger(0, 360) * Math.PI / 180;

			for (let i in this.dice) {
				let dice = this.dice[i];
				dice.mesh.rotation.x = x;
				dice.mesh.rotation.y = y;
				dice.mesh.rotation.z = z;
				dice.mesh.position.y = this.y0 + shift;
			}

			if (this.isCycleEnd()) {
				for (let i in this.dice) {
					let dice = this.dice[i];
					dice.mesh.rotation.x = 0;
					dice.mesh.rotation.y = 0;
					dice.mesh.rotation.z = 0;
				}

				this.dice = null;
				this.stop();
				if (this.callback)
					this.callback();
				this.callback = null;
			}
		});
	}

	on(dices, callback = null) {
		if (this.inAction) return;

		this.dice = dices;
		if (!lx.isArray(dices))
			this.dice = [this.dice];
		this.way = 100;
		this.y0 = this.dice[0].mesh.position.y;
		this.callback = callback;
		this.game.pulsator.stop();
		this.syncStart();
	}
}
