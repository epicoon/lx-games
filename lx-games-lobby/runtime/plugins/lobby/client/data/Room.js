// @lx:namespace lxGames.lobby;
class Room extends lx.BindableModel {
	static schema() {
		return {
			id:        {type: lx.ModelTypeEnum.PK},
			game:      {type: lx.ModelTypeEnum.STRING},
			name:      {type: lx.ModelTypeEnum.STRING},
			host:      {type: lx.ModelTypeEnum.STRING},
			max:       {type: lx.ModelTypeEnum.NUMBER},
			seatCount: {type: lx.ModelTypeEnum.NUMBER},
			state:     {type: lx.ModelTypeEnum.STRING},
			locked:    {type: lx.ModelTypeEnum.BOOLEAN, default: false},
			seats:     {},
		};
	}

    init() {
        this.registry = null;
    }

	// Seats a player if there's room; reports whether it happened so the
	// caller knows whether to announce the change.
	join() {
		const user = this.registry.core.user;
		if (this.seats.length >= this.max || this.seats.includes(user.login)) return false;
		this.seats = [...this.seats, user.login];
		this.seatCount = this.seats.length;
		if (this.seatCount >= this.max) this.state = 'full';
		return true;
	}
}
