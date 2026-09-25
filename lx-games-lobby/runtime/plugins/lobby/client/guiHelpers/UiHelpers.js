/**
 * Deterministic color/label helpers shared by the lobby's GuiNode classes
 */
// @lx:namespace lxGames.lobby;
class UiHelpers {
	static initial(name) {
		return name.charAt(0).toUpperCase();
	}

	static personColor(name) {
		return _colorOf(name, 65, 60).css;
	}

	static gameAccent(id) {
		const h = _colorOf(id, 60, 38).h;
		return `linear-gradient(135deg, hsl(${h},60%,38%), hsl(${(h + 40) % 360},55%,20%))`;
	}
}

// Spreads the raw hash with the golden angle so short, similar strings
// don't land on neighboring hues.
function _colorOf(str, s, l) {
	let raw = 0;
	for (let i = 0; i < str.length; i++) raw = (raw * 31 + str.charCodeAt(i)) % 360;
	const h = (raw * 137) % 360;
	return {h, css: `hsl(${h}, ${s}%, ${l}%)`};
}
