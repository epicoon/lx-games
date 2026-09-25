lx.import(
	lx.Plugin,
	lx.LanguageSwitcher,
	lx.Switch,
	lx.Input,

	'client/data/',
	'-R client/src/',
);

// @lx:<mode DEV:
lx.import('client/dev/');
// @lx:mode>

// @lx:namespace lxGames.lobby;
class Plugin extends lx.Plugin {
	run() {
		// @lx:<mode DEV:
        lx.app.dependencies.promiseModules({
            modules: ['lx.EggMenu'],
            callback: ()=>{
				const menu = new lx.EggMenu({
						left: '15%',
						top: '2%',
						menuConfig: {size: ['260px', '180px']}
					}),
					monitor = new lxGames.lobby.DevMonitor(this, menu);
			}
        });
		// @lx:mode>
	}
}
