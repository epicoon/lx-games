lx.import(lx.Plugin);

lx.import(
	lxGames.Tools,
	'-R data/'
);

// @lx:namespace lxGames.ootv;
class Plugin extends lx.Plugin {
	init() {
		this.environment = new lxGames.Tools.Environment(this, {
			mode: 'dev',
			name: 'Ootv',
			game: {
				local: { module: 'lxGames.ootv.LocalGame' },
				online: { module: 'lxGames.ootv.OnlineGame' }
			}
		});
	}
}
