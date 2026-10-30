// @lx:namespace lxGames.lobby;
class AuthPopup extends lx.Box {
	modifyConfigBeforeApply(config) {
		config.css = config.css || 'lobby-overlay';
		return config;
	}

	render(config) {
		super.render(config);

		this.style({
			'position': 'fixed',
			'margin': 'auto',
			'width': '100%',
			'height': '100%'
		});

		this._user = config.user;
		this._onClose = config.onClose || null;
		this._mode = 'login';
		this._error = null;
		this._login = '';
		this._busy = false;
		this._gen = 0;
		_renderModal(this);
	}

	// Public: GuiMain holds onto the popup it opened and calls this itself
	// if a different tab signs the user in while this one is still open.
	close() {
		this.del();
		if (this._onClose) this._onClose();
	}
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const _EYE_ON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
	<path d="M21.87 11.5c-.64-1.11-4.16-6.68-10.14-6.5-5.53.14-8.73 5-9.6 6.5a1 1 0 0 0 0 1c.63 1.09 4 6.5 9.89 6.5h.25c5.53-.14 8.74-5 9.6-6.5a1 1 0 0 0 0-1zM12.22 17c-4.31.1-7.12-3.59-8-5 1-1.61 3.61-4.9 7.61-5 4.29-.11 7.11 3.59 8 5-1.03 1.61-3.61 4.9-7.61 5z"/>
	<path d="M12 8.5a3.5 3.5 0 1 0 3.5 3.5A3.5 3.5 0 0 0 12 8.5zm0 5a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5z"/>
</svg>`;

const _EYE_OFF_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
	<path d="M4.71 3.29a1 1 0 0 0-1.42 1.42l5.63 5.63a3.5 3.5 0 0 0 4.74 4.74l5.63 5.63a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.42zM12 13.5a1.5 1.5 0 0 1-1.5-1.5v-.07l1.56 1.56z"/>
	<path d="M12.22 17c-4.3.1-7.12-3.59-8-5a13.7 13.7 0 0 1 2.24-2.72L5 7.87a15.89 15.89 0 0 0-2.87 3.63 1 1 0 0 0 0 1c.63 1.09 4 6.5 9.89 6.5h.25a9.48 9.48 0 0 0 3.23-.67l-1.58-1.58a7.74 7.74 0 0 1-1.7.25z"/>
	<path d="M21.87 11.5c-.64-1.11-4.17-6.68-10.14-6.5a9.48 9.48 0 0 0-3.23.67l1.58 1.58a7.74 7.74 0 0 1 1.7-.25c4.29-.11 7.11 3.59 8 5a13.7 13.7 0 0 1-2.29 2.72L19 16.13a15.89 15.89 0 0 0 2.91-3.63 1 1 0 0 0-.04-1z"/>
</svg>`;

// Builds a password <lx.Input> wrapped with a click-to-reveal eye button -
// toggles the input's 'type' attribute between 'password' and none, and
// swaps which of the two icons is visible to match.
function _addPasswordInput(field, placeholder) {
	const wrap = field.add(lx.Box, {css: 'lobby-input-wrap'});
	const input = wrap.add(lx.Input, {css: ['lobby-input', 'lobby-input-pwd'], placeholder});
	input.setAttribute('type', 'password');

	const eye = wrap.add(lx.Box, {css: 'lobby-eye-btn', html: _EYE_ON_SVG});
	eye.click(() => {
		const hidden = input.getAttribute('type') === 'password';
		input.setAttribute('type', hidden ? null : 'password');
		eye.html(hidden ? _EYE_OFF_SVG : _EYE_ON_SVG);
	});

	return input;
}

async function _signInWithGoogle(self, gen) {
	if (self._busy) return;

	self._busy = true;
	const result = await self._user.signInWithGoogle();
	self._busy = false;

	if (gen !== self._gen) return;

	if (!result.success) {
		self._error = result.error;
		_renderModal(self);
	}
}

function _renderModal(self) {
	self.clear();
	const gen = self._gen;

	if (self._mode === 'pending') {
		_renderPending(self);
		return;
	}

	const isLogin = self._mode === 'login';
	const modal = self.add(lx.Box, {css: 'lobby-modal'});

	const title = isLogin ? lx.i18n(lobby.signInTitle) : lx.i18n(lobby.signUpTitle);
	modal.add(lx.Box, {css: 'lobby-modal-title', text: title});
	modal.add(lx.Box, {css: 'lobby-modal-sub', text: lx.i18n(lobby.signInText)});

	const loginField = modal.add(lx.Box, {css: 'lobby-field'});
	loginField.add(lx.Box, {css: 'lobby-field-label', text: lx.i18n(lobby.login)});
	const loginInput = loginField.add(lx.Input, {css: 'lobby-input', placeholder: lx.i18n(lobby.login), value: self._login});

	const passField = modal.add(lx.Box, {css: 'lobby-field'});
	passField.add(lx.Box, {css: 'lobby-field-label', text: lx.i18n(lobby.password)});
	if (!isLogin) {
		passField.add(lx.Box, {css: 'lobby-field-hint', text: lx.i18n(lobby.passwordHint)});
	}
	const passInput = _addPasswordInput(passField, lx.i18n(lobby.password));

	let confirmInput = null;
	let emailInput = null;
	if (!isLogin) {
		const confirmField = modal.add(lx.Box, {css: 'lobby-field'});
		confirmField.add(lx.Box, {css: 'lobby-field-label', text: lx.i18n(lobby.confirmPassword)});
		confirmInput = _addPasswordInput(confirmField, lx.i18n(lobby.confirmPassword));

		const emailField = modal.add(lx.Box, {css: 'lobby-field'});
		emailField.add(lx.Box, {css: 'lobby-field-label', text: lx.i18n(lobby.email)});
		emailField.add(lx.Box, {css: 'lobby-field-hint', text: lx.i18n(lobby.emailHint)});
		emailInput = emailField.add(lx.Input, {css: 'lobby-input', placeholder: lx.i18n(lobby.email)});
	}

	if (self._error) {
		modal.add(lx.Box, {css: 'lobby-field-error', text: self._error});
	}

	const submitText = isLogin ? lx.i18n(lobby.signIn) : lx.i18n(lobby.signUp);
	const toggleText = isLogin ? lx.i18n(lobby.noAccount) : lx.i18n(lobby.haveAccount);

	const foot = modal.add(lx.Box, {css: 'lobby-modal-foot-col'});
	const submit = foot.add(lx.Box, {css: ['lobby-btn', 'lobby-btn-primary'], text: submitText});
	submit.click(() => _submit(
		self, gen,
		loginInput.value(), passInput.value(),
		confirmInput
			? confirmInput.value()
			: null,
		emailInput ?
			emailInput.value()
			: null
		)
	);

	const google = foot.add(lx.Box, {css: 'lobby-btn', text: lx.i18n(lobby.google)});
	google.click(() => _signInWithGoogle(self, gen));

	const toggle = foot.add(lx.Box, {css: 'lobby-link', text: toggleText});
	toggle.click(() => {
		self._login = loginInput.value();
		self._mode = isLogin ? 'signup' : 'login';
		self._error = null;
		self._gen++;
		_renderModal(self);
	});

	const cancel = foot.add(lx.Box, {css: ['lobby-btn', 'lobby-btn-ghost'], text: lx.i18n(lobby.cancel)});
	cancel.click(() => {
		self._gen++;
		self.close();
	});
}

function _renderPending(self) {
	const modal = self.add(lx.Box, {css: 'lobby-modal'});
	modal.add(lx.Box, {css: 'lobby-modal-title', text: lx.i18n(lobby.signUpTitle)});
	modal.add(lx.Box, {css: 'lobby-modal-sub', text: lx.i18n(lobby.confirmPending)});

	const foot = modal.add(lx.Box, {css: 'lobby-modal-foot-col'});
	const close = foot.add(lx.Box, {css: ['lobby-btn', 'lobby-btn-ghost'], text: lx.i18n(lobby.cancel)});
	close.click(() => {
		self._gen++;
		self.close();
	});
}

async function _submit(self, gen, login, password, confirmPassword, email) {
	if (self._busy) return;

	const isLogin = self._mode === 'login';

	if (!login.trim() || !password) {
		self._login = login;
		self._error = lx.i18n(lobby.authFieldsRequired);
		_renderModal(self);
		return;
	}

	if (!isLogin) {
		if (!_validatePassword(password)) {
			self._login = login;
			self._error = lx.i18n(lobby.weakPassword);
			_renderModal(self);
			return;
		}
		if (password !== confirmPassword) {
			self._login = login;
			self._error = lx.i18n(lobby.passwordMismatch);
			_renderModal(self);
			return;
		}
	}

	self._busy = true;
	const result = isLogin
		? await self._user.signIn(login, password)
		: await self._user.signUp(login, password, email);
	self._busy = false;

	// The popup may have been cancelled, toggled or reopened while this
	// request was in flight - don't resurrect it with a stale error, or
	// close an already-closed one, on a response nobody's looking at anymore.
	if (gen !== self._gen) return;

	if (!result.success) {
		if (result.pending) {
			self._mode = 'pending';
			self._error = null;
			_renderModal(self);
			return;
		}
		self._login = login;
		self._error = result.error;
		_renderModal(self);
		return;
	}

	self.close();
}

// Mirrors lxgo-auth's own server-side check so a weak password fails fast in the browser.
function _validatePassword(password) {
	if (password.length < 8) return false;
	if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) return false;
	if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
	return true;
}
