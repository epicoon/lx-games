// @lx:namespace lxGames.lobby;
class RoomsRegistry {
	constructor(core, rooms) {
		this.core = core;

		this.rooms = new lx.ModelCollection();
		this.rooms.setModelClass(lxGames.lobby.Room);
	}

	all() {
		return this.rooms;
	}

	openCount(gameId) {
		let n = 0;
		this.rooms.forEach(r => {
			if ((gameId === 'all' || r.game === gameId) && r.state === 'waiting') n++;
		});
		return n;
	}

	waitingCount(gameId) {
		let n = 0;
		this.rooms.forEach(r => {
			if (r.game === gameId && r.state === 'waiting') n++;
		});
		return n;
	}

	create(room) {
		this.rooms.add(_toModelData(room));
	}

	refresh(rooms) {
		for (let i in rooms)
			rooms[i] = _toModelData(rooms[i]);
		this.rooms.reset(rooms);
		this.rooms.forEach(r=>r.registry=this);
	}
}

function _toModelData(r) {
	return {
		id: r.id,
		game: r.game,
		name: r.name,
		host: r.host,
		max: r.max,
		state: r.state,
		locked: !!r.locked,
		seats: r.seats || [],
		seatCount: (r.seats || []).length,
	};
}
