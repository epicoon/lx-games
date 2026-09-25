// @lx:namespace lxGames.lobby;
class Game extends lx.BindableModel {
	static schema() {
		return {
			key:      {type: lx.ModelTypeEnum.PK},
			title:    {type: lx.ModelTypeEnum.STRING},
			icon:     {type: lx.ModelTypeEnum.STRING},
			banner:   {type: lx.ModelTypeEnum.STRING},
			genre:    {type: lx.ModelTypeEnum.STRING},
			description: {type: lx.ModelTypeEnum.STRING},
			minSlots: {type: lx.ModelTypeEnum.NUMBER},
			maxSlots: {type: lx.ModelTypeEnum.NUMBER},
			durationMinutes: {type: lx.ModelTypeEnum.STRING},
			online:   {type: lx.ModelTypeEnum.BOOLEAN, default: false},
			offline:  {type: lx.ModelTypeEnum.BOOLEAN, default: false},
			// Derived from RoomsRegistry, refreshed by GuiDetail on
			// 'lobby.roomsChanged' for whichever game is currently bound
			waitingCount: {type: lx.ModelTypeEnum.NUMBER, default: 0},
		};
	}
}
