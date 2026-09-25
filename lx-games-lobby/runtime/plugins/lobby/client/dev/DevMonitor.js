/**
 * Dev-only connection-status monitor, rendered inside an lx.EggMenu popup
 * (see Plugin.js's "@lx:<mode DEV:" block - this whole directory is only
 * ever bundled for a DEV build in the first place). Polls the plugin's own
 * "devStatus" ajax endpoint - answered server-side only when the app itself
 * is running in DEV mode too, see app/handlers/dev_status.go - and shows
 * one row per configured cartridge.
 */
// @lx:namespace lxGames.lobby;
class DevMonitor {
	constructor(plugin, menu) {
		this._plugin = plugin;
		this._box = menu.getOne('menuBox');
		this._box.addClass('lobby-dev-panel');

        _css();
		this.refresh();
		this._timer = setInterval(() => this.refresh(), 5000);
	}

	refresh() {
		this._plugin.ajax('devStatus').send()
			.then(res => _render(this, res.servers || []))
			.catch(() => _renderUnavailable(this));
	}
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function _css() {
    lx.import('-UF ../../assets/css/consts');

    let css = new lx.CssContext();

    css.addClass('lobby-dev-panel', {
        padding: '10px 14px',
        fontSize: '11px',
        color: c.muted,
        background: '#171442',
        border: `1px solid ${c.line}`,
        borderRadius: '10px',
        overflowY: 'auto',
    });
    css.addClass('lobby-rs-label', {
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: '700',
        color: c.text,
        fontSize: '10px',
        marginBottom: '6px',
    });
    css.addClass('lobby-rs-row', {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '2px 0',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    });
    css.addClass('lobby-dot', {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: c.ok,
        flex: 'none',
    });
    css.addClass('lobby-dot-retry', {
        background: c.warn,
    });

    let tag = new lx.CssTag({id: 'dev'});
    tag.setCss(css.toString());
    tag.commit();
}

function _render(self, servers) {
    const box = self._box;
    box.clear();
    box.add(lx.Box, {css: 'lobby-rs-label', text: 'Cartridges'});

    if (!servers.length) {
        box.add(lx.Box, {css: 'lobby-rs-row', text: 'none configured'});
        return;
    }

    servers.forEach(s => {
        const row = box.add(lx.Box, {css: 'lobby-rs-row'});
        row.add(lx.Box, {css: ['lobby-dot', s.state === 'connected' ? null : 'lobby-dot-retry'].filter(Boolean)});
        const meta = s.state === 'connected' ? s.state : `${s.state} (${s.attempts}/${s.maxAttempts})`;
        row.add(lx.Box, {text: `${s.addr} · ${meta}`});
    });
}

function _renderUnavailable(self) {
    const box = self._box;
    box.clear();
    box.add(lx.Box, {css: 'lobby-rs-label', text: 'Cartridges'});
    box.add(lx.Box, {css: 'lobby-rs-row', text: 'dev status unavailable'});
}
