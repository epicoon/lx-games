// @lx:namespace lxGames.lobby;
class User {
    constructor(core) {
        this.core = core;
        this.plugin = core.getPlugin();

        this.login = null;

        _tryAuth(this);
    }

    /**
     * @returns {Boolean}
     */
    isGuest() {
        return this.login === null;
    }

    signIn() {
        //TODO mock
        this.login = 'Lexedo';

        this.plugin.trigger('lobby.user.changed');
    }

    signOut() {
        this.login = null;

        this.plugin.trigger('lobby.user.changed');
    }
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function _tryAuth(self) {
    //TODO mock
    setTimeout(()=>{
        self.plugin.trigger('lobby.user.authAttemptDone');
    }, 100);
}
