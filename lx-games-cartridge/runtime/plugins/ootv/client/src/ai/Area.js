// @lx:namespace lxGames.ootv.AI;
class Area {
	constructor() {
		this.cells = [];
		this.group = -1;
	}


	contains(num) {
		return ( this.cells.indexOf(num) != -1 );
	}
}
