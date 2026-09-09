// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv;
class LocalGamer extends lx.Object {
	// @lx:behavior lxGames.ootv.GamerBehavior;

	constructor(game, params) {
		super();

		this.game = game;
		this.colorId = params.colorId;

		this.AI = params.ai;
		if (this.AI && !game.ai)
			game.ai = new lxGames.ootv.AI.AI(game);
	}

	onClear() {
		this.AI = false;
	}

	getGame() {
		return this.game;
	}

	getToken() {
		return this.colorId;
	}

	isLocal() {
		return true;
	}

	getName() {
		return lx>>>Const.GAMERS[ this.colorId ].name;
	}
}
