// @lx:namespace lxGames.lobby;
class GuiTopbar extends lx.GuiNode {
	// @lx:behavior lxGames.lobby.GuiNodeBehavior;

	// Brand and language switcher are static, rendered server-side - only
	// the auth slot ever needs a re-render, see _render().
	subscribeEvents() {
		const plugin = this.getPlugin();

		plugin.on('lobby.user.authAttemptDone', e => _render(this));

		plugin.on('lobby.user.changed', e => _render(this));
	}
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function _render(self) {
	const user = self.getUser();
	const slot = self.getElem('authSlot');
	slot.clear();
	slot.begin();
	if (user.isGuest()) {
		const btn = new lx.Box({css: ['lobby-btn', 'lobby-btn-primary'], text: lx.i18n(lobby.signIn)});
		btn.click(() => self.triggerPluginEvent('lobby.openSignIn'));
	} else {
		const initial = lxGames.lobby.UiHelpers.initial(user.login);
		const view = lx.ml(`
			<lx.Box> .lobby-user
				<lx.Box> .lobby-avatar (text:'${initial}')\
					#style('backgroundColor', lxGames.lobby.UiHelpers.personColor(user.login))
				<lx.Box> .lobby-user-name (text:user.login)
				<lx.Box> @out.lobby-btn.lobby-btn-small.lobby-btn-ghost (text:lx.i18n(lobby.signOut))
		`);
		view.out.click(() => user.signOut());
	}
	slot.end();
}
