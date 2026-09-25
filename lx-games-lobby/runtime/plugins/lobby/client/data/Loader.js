// @lx:namespace lxGames.lobby;
class Loader {
    constructor(core) {
        this.core = core;
        this.waitGroup = 2;
    }

    load() {
        if (!this.core || !this.core.games || !this.core.rooms) {
            console.error('Loader error: Core is not configured');
            return;
        }

        _loadGames(this);
        _loadRooms(this);
    }
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function _loadGames(self) {
    const core = self.core;

    core.channel.onPromisedConnection(() => {
        //TODO errors processing
        core.channel.request('/nomenclature', {lang: lx.app.lang.current()}).
        then(res => {
            core.games.refresh(res.body.games || []);
            core.getPlugin().trigger('lobby.Loader.gamesLoaded');
            _decWaitGroup(self);
        });
    });
}

function _loadRooms(self) {
    const core = self.core;

    //TODO mock
	setTimeout(()=>{
		core.rooms.refresh(lxGames.lobby.MockData.rooms());
		core.getPlugin().trigger('lobby.Loader.roomsLoaded');
		_decWaitGroup(self);
	}, 130);
}

function _decWaitGroup(self) {
    if (self.waitGroup === 0) {
        console.error('Loader error: waitGroup already is empty');
        return;
    }
    self.waitGroup--;
    if (self.waitGroup === 0) {
		self.core.getPlugin().trigger('lobby.Loader.dataLoaded');
    }
}
