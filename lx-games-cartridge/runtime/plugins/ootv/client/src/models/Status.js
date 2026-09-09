// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv;
class Status {
	constructor(game) {
		this.game = game;
		this.value = lx>>>Const.STATUS_NONE;
	}

	is(status) { return this.value == status; }
	isNone() { return this.is(lx>>>Const.STATUS_NONE); }
	isPending() { return this.is(lx>>>Const.STATUS_PENDING); }
	isOver() { return this.is(lx>>>Const.STATUS_OVER); }
	isUseDice() { return this.is(lx>>>Const.STATUS_USE_DICE); }
	isUseCredit() { return this.is(lx>>>Const.STATUS_USE_CREDIT); }
	isSplit() { return this.is(lx>>>Const.STATUS_SPLIT); }
	isGetModule() { return this.is(lx>>>Const.STATUS_GET_MODULE); }
	isGetPCK() { return this.is(lx>>>Const.STATUS_GET_PCK); }
	isGetDP() { return this.is(lx>>>Const.STATUS_GET_DP); }
	isGetMinerals() { return this.is(lx>>>Const.STATUS_GET_MINERAL); }
	isGetSecondMinerals() { return this.is(lx>>>Const.STATUS_GET_SECOND_MINERAL); }
	isSetChip() { return this.is(lx>>>Const.STATUS_SET_CHIP); }
	isAI() { return this.is(lx>>>Const.STATUS_AI); }

	set(status) {
		this.value = status;
		this.game.triggerLocalEvent('ootv_status_changed', {status: this.value});
	};
	setNone() { this.set(lx>>>Const.STATUS_NONE); }
	setOver() {
		this.set(lx>>>Const.STATUS_OVER);
		this.game.triggerLocalEvent('ootv_game_over');
	}
	setPending() { this.set(lx>>>Const.STATUS_PENDING); }
	setUseDice() { this.set(lx>>>Const.STATUS_USE_DICE); }
	setUseCredit() { this.set(lx>>>Const.STATUS_USE_CREDIT); }
	setSplit() { this.set(lx>>>Const.STATUS_SPLIT); }
	setGetModule() { this.set(lx>>>Const.STATUS_GET_MODULE); }
	setGetPCK() { this.set(lx>>>Const.STATUS_GET_PCK); }
	setGetDP() { this.set(lx>>>Const.STATUS_GET_DP); }
	setGetMinerals() { this.set(lx>>>Const.STATUS_GET_MINERAL); }
	setGetSecondMinerals() { this.set(lx>>>Const.STATUS_GET_SECOND_MINERAL); }
	setSetChip() { this.set(lx>>>Const.STATUS_SET_CHIP); }
	setAI() { this.set(lx>>>Const.STATUS_AI); }
}
