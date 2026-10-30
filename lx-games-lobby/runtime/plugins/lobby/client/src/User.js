// @lx:namespace lxGames.lobby;
class User {
    constructor(core) {
        this.core = core;
        this.plugin = core.getPlugin();

        this.login = null;
        this.name = null;

        _authSubscribe(this);
    }

    /**
     * @returns {Boolean}
     */
    isGuest() {
        return this.login === null;
    }

    /**
     * The name to show the user as - their display name (e.g. from Google
     * sign-in) if known, their login otherwise (e.g. password sign-up,
     * where there's no separate display name at all).
     * @returns {string|null} null for a guest (see isGuest)
     */
    displayName() {
        return this.name || this.login;
    }

    /**
     * @param {string} login
     * @param {string} password
     * @returns {Promise<{success: Boolean, error: (string|undefined)}>}
     */
    async signIn(login, password) {
        return await _remoteAuth(this, '/remote/login', login, password);
    }

    /**
     * @param {string} login
     * @param {string} password
     * @param {string} [email]
     * @returns {Promise<{success: Boolean, error: (string|undefined), pending: (Boolean|undefined)}>}
     */
    async signUp(login, password, email) {
        return await _remoteAuth(this, '/remote/signup', login, password, email);
    }

    /**
     * Opens Google's sign-in in a new tab; this tab stays a guest until it
     * notices (see the focus listener below) that the new tab landed its
     * tokens in localStorage.
     *
     * @returns {Promise<{success: Boolean, error: (string|undefined)}>}
     */
    async signInWithGoogle() {
        const result = await window.lxAuth.startGoogleAuth();
        if (!result.success) {
            return { success: false, error: lx.i18n(lobby.authNetworkError) };
        }
        return { success: true };
    }

    signOut() {
        window.lxAuth.logOut();
        this.login = null;
        this.name = null;
        this.plugin.trigger('lobby.user.changed');
    }
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function _authSubscribe(self) {
    window.lxAuth.on(window.lxAuth.TOKENS_CHECKED, async()=>{
        let result = await window.lxAuth.getUserData();
        if (result.success) {
            self.login = result.userData.login;
            self.name = result.userData.name;
            self.plugin.trigger('lobby.user.changed');
        } else {
            self.plugin.trigger('lobby.user.authAttemptDone');
        }
    });

    window.lxAuth.on(window.lxAuth.TOKENS_CHECK_FAILED, ()=>{
        self.plugin.trigger('lobby.user.authAttemptDone');
    });

    const recheck = () => {
        if (document.visibilityState === 'hidden') return;
        if (self.isGuest())
            window.lxAuth.recheck();
    };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
}

/**
 * Drives the no-redirect login/signup flow: lxgo-auth's session-free
 * endpoint (POST, cross-origin) for an authorization code, then this
 * lobby's own /auth-exchange (same-origin, lxgo/auth_client's
 * TokenExchangeHandler) to turn that code into a token pair, written to
 * localStorage in the shape lxgo-auth's JS bundle (window.lxAuth) expects.
 *
 * @param {User} self
 * @param {string} path - '/remote/login' or '/remote/signup'
 * @param {string} login
 * @param {string} password
 * @param {string} [email]
 * @returns {Promise<{success: Boolean, error: (string|undefined), pending: (Boolean|undefined)}>}
 */
async function _remoteAuth(self, path, login, password, email) {
    let result = await window.lxAuth.remoteAuth(path, login, password, email);
    if (!result.success) {
        if (result.pending) {
            //TODO - error text without i18n, but now is not used
            return { success: false, pending: true, error: result.error };
        }
        return {
            success: false,
            error: result.code > 1002
                ? lx.i18n(lobby.authFailed)
                : lx.i18n(lobby.authNetworkError)
        };
    }

    self.login = result.userData.login;
    self.name = result.userData.name;
    self.plugin.trigger('lobby.user.changed');
    return { success: true };
}
