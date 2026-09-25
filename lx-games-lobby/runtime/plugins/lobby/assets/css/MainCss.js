// @lx:namespace lxGames.lobby;
class MainCss extends lx.PluginCssAsset {
    init(css) {
        lx.import('-U consts');

        // --- App shell ---
        // no page scroll, three fixed-height/width panes, each scrolling
        // on its own where its content can overflow
        css.addClass('lobby-app', {
            display: 'grid',
            gridTemplateRows: `${topbarH} ${tabstripH} 1fr`,
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            fontSize: '14px',
            lineHeight: '1.4',
            color: c.text,
            background: `radial-gradient(900px 500px at 88% -10%, rgba(124,92,255,0.18), transparent 60%),
                radial-gradient(700px 400px at -10% 100%, rgba(60,90,200,0.14), transparent 60%),
                ${c.bg1}`,
        });

        // --- Topbar ---
        css.addClass('lobby-topbar', {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '0 16px',
            borderBottom: `1px solid ${c.line}`,
            background: 'rgba(10,9,32,0.35)',
            minWidth: '0',
        });
        css.addClass('lobby-brand', {
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            fontWeight: '700',
            fontSize: '15px',
            whiteSpace: 'nowrap',
        });
        css.addClass('lobby-logo', {
            width: '26px',
            height: '26px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #ffe08a, #f2a93c)',
            color: c.goldInk,
            fontWeight: '800',
            fontSize: '12px',
        });
        css.addClass('lobby-topbar-right', {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
        });
        css.addClass('lobby-user', {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        });
        css.addClass('lobby-avatar', {
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '11px',
            color: '#0d0b26',
        });
        css.addClass('lobby-user-name', {
            fontWeight: '600',
            fontSize: '13px',
        });

        // --- Buttons ---
        css.addClass('lobby-btn', {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${c.line}`,
            background: c.panel2,
            padding: '7px 13px',
            borderRadius: '8px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            color: c.text,
            fontSize: '13px',
        }, {
            hover: { background: 'rgba(255,255,255,0.13)' },
        });
        css.addClass('lobby-btn-primary', {
            background: `linear-gradient(180deg, #ffd964, ${c.goldDark})`,
            color: c.goldInk,
            borderColor: 'transparent',
            fontWeight: '700',
        }, {
            hover: { background: 'linear-gradient(180deg, #ffe07c, #f5c453)' },
        });
        css.addClass('lobby-btn-ghost', {
            background: 'transparent',
        });
        css.addClass('lobby-btn-small', {
            padding: '5px 10px',
            fontSize: '12px',
            borderRadius: '7px',
        });
        css.addClass('lobby-btn-disabled', {
            opacity: '0.45',
            cursor: 'default',
        });
        css.addClass('lobby-btn-full', {
            width: '100%',
            textAlign: 'center',
        });

        // --- Tab strip ---
        // the lobby's own permanent tab plus one per opened game (see guiNodes/GuiMain.js)
        css.addClass('lobby-tabstrip', {
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '0 12px',
            overflowX: 'auto',
            borderBottom: `1px solid ${c.line}`,
            background: 'rgba(10,9,32,0.35)',
        });
        css.addClass('lobby-tab', {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            flex: 'none',
            padding: '6px 10px',
            borderRadius: '8px 8px 0 0',
            fontSize: '12.5px',
            color: c.muted,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
        }, {
            hover: { background: c.panel2 },
        });
        css.addClass('lobby-tab-active', {
            background: c.panel2,
            color: c.text,
            fontWeight: '700',
            boxShadow: `inset 0 -2px 0 ${c.gold}`,
        });
        css.addClass('lobby-tab-close', {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            fontSize: '12px',
            opacity: '0.6',
        }, {
            hover: { background: 'rgba(255,255,255,0.15)', opacity: '1' },
        });

        // --- Workspace ---
        // one pane per tab, only the active one visible
        css.addClass('lobby-workspace', {
            display: 'flex',
            flexDirection: 'column',
            minHeight: '0',
            overflow: 'hidden',
        });
        css.addClass('lobby-game-pane', {
            position: 'relative',
            flex: '1',
            minHeight: '0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '40px',
            textAlign: 'center',
            color: '#fff',
        });
        css.addClass('lobby-game-pane-title', {
            fontSize: '22px',
            fontWeight: '700',
            textShadow: '0 2px 10px rgba(0,0,0,0.4)',
        });
        css.addClass('lobby-game-pane-note', {
            fontSize: '13px',
            opacity: '0.85',
        });

        // --- Body: rail | center | detail ---
        css.addClass('lobby-body', {
            display: 'grid',
            gridTemplateColumns: `${railW} 1fr ${detailW}`,
            flex: '1',
            minHeight: '0',
            minWidth: '0',
        });

        // --- Rail (games) ---
        css.addClass('lobby-rail', {
            display: 'flex',
            flexDirection: 'column',
            minHeight: '0',
            borderRight: `1px solid ${c.line}`,
            background: 'rgba(10,9,32,0.2)',
        });
        css.addClass('lobby-rail-list', {
            flex: '1',
            overflowY: 'auto',
            padding: '10px',
            minHeight: '0',
        });
        css.addClass('lobby-rail-head', {
            padding: '12px 14px 6px',
            fontSize: '11px',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            color: c.muted,
            fontWeight: '700',
        });
        css.addClass('lobby-rail-item', {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            minWidth: '0',
            padding: '8px 10px',
            borderRadius: '10px',
            border: '1px solid transparent',
            marginBottom: '4px',
            textAlign: 'left',
            cursor: 'pointer',
        }, {
            hover: { background: c.panel2 },
        });
        css.addClass('lobby-rail-item-selected', {
            background: c.panel2,
            borderColor: 'rgba(255,255,255,0.2)',
        });
        css.addClass('lobby-rail-chip', {
            width: '30px',
            height: '30px',
            borderRadius: '9px',
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#fff',
        });
        css.addClass('lobby-rail-chip-selected', {
            boxShadow: `0 0 0 2px ${c.gold}`,
        });
        css.addClass('lobby-ri-body', {
            display: 'flex',
            flexDirection: 'column',
            minWidth: '0',
            flex: '1',
        });
        css.addClass('lobby-ri-title', {
            display: 'block',
            fontWeight: '600',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        });
        css.addClass('lobby-ri-meta', {
            display: 'block',
            fontSize: '11px',
            color: c.muted,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        });
        css.addClass('lobby-ri-count', {
            flex: 'none',
            fontSize: '11px',
            fontWeight: '700',
            padding: '1px 7px',
            borderRadius: '999px',
            background: 'rgba(74,222,128,0.14)',
            color: c.ok,
        });
        css.addClass('lobby-ri-count-zero', {
            background: 'rgba(255,255,255,0.06)',
            color: c.muted,
        });
        css.addClass('lobby-rail-soon', {
            padding: '10px',
            marginTop: '4px',
            border: `1px dashed ${c.line}`,
            borderRadius: '10px',
            textAlign: 'center',
            color: c.muted,
            fontSize: '12px',
        });
        css.addClass('lobby-rail-footer', {
            flex: 'none',
            borderTop: `1px solid ${c.line}`,
            padding: '10px 14px',
            fontSize: '11px',
            color: c.muted,
            textAlign: 'center',
        });

        // --- Center (banner + rooms) ---
        css.addClass('lobby-center', {
            display: 'flex',
            flexDirection: 'column',
            minHeight: '0',
            minWidth: '0',
        });
        css.addClass('lobby-rooms-head', {
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 20px',
            flexWrap: 'wrap',
        });
        css.addClass('lobby-rooms-title', {
            fontSize: '13px',
            fontWeight: '700',
        });
        css.addClass('lobby-live', {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            color: c.ok,
        });
        css.addClass('lobby-chips', {
            display: 'flex',
            gap: '6px',
            marginLeft: 'auto',
        });
        css.addClass('lobby-chip', {
            border: `1px solid ${c.line}`,
            background: 'transparent',
            borderRadius: '999px',
            padding: '4px 11px',
            fontSize: '12px',
            color: c.muted,
            cursor: 'pointer',
        });
        css.addClass('lobby-chip-active', {
            background: c.panel2,
            color: c.text,
            borderColor: 'rgba(255,255,255,0.28)',
        });

        css.addClass('lobby-rooms-list', {
            flex: '1',
            overflowY: 'auto',
            minHeight: '0',
            padding: '0 20px 16px',
        });
        css.addClass('lobby-room', {
            display: 'grid',
            gridTemplateColumns: '38px minmax(0, 1fr) auto auto',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid transparent',
        }, {
            hover: { background: c.panel, borderColor: c.line },
        });
        css.addClass('lobby-room-icon', {
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        });
        css.addClass('lobby-room-name', {
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontWeight: '600',
            fontSize: '13px',
        });
        css.addClass('lobby-room-sub', {
            color: c.muted,
            fontSize: '11.5px',
        });
        css.addClass('lobby-lock', {
            opacity: '0.7',
            fontSize: '10px',
        });
        css.addClass('lobby-seats', {
            display: 'flex',
        });
        css.addClass('lobby-seat', {
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            marginLeft: '-6px',
            border: `2px solid ${c.bg1}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: '700',
            color: '#0d0b26',
        });
        css.addClass('lobby-seat-empty', {
            background: 'transparent',
            border: '1.5px dashed rgba(255,255,255,0.35)',
        });
        css.addClass('lobby-room-act', {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '4px',
        });
        css.addClass('lobby-pill', {
            fontSize: '10.5px',
            padding: '2px 8px',
            borderRadius: '999px',
            fontWeight: '600',
        });
        css.addClass('lobby-pill-waiting', {
            background: 'rgba(74,222,128,0.14)',
            color: c.ok,
        });
        css.addClass('lobby-pill-full', {
            background: 'rgba(251,191,36,0.14)',
            color: c.warn,
        });
        css.addClass('lobby-pill-playing', {
            background: 'rgba(124,92,255,0.2)',
            color: '#b9a8ff',
        });

        css.addClass('lobby-empty', {
            padding: '30px 20px',
            textAlign: 'center',
            color: c.muted,
        });
        css.addClass('lobby-empty-title', {
            display: 'block',
            color: c.text,
            fontSize: '14px',
            marginBottom: '4px',
        });

        // --- Detail (right pane) ---
        css.addClass('lobby-detail', {
            borderLeft: `1px solid ${c.line}`,
            overflowY: 'auto',
            minHeight: '0',
            background: 'rgba(10,9,32,0.2)',
        });
        css.addClass('lobby-detail-cover', {
            height: '92px',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        });
        css.addClass('lobby-detail-body', {
            padding: '14px 18px 18px',
        });
        css.addClass('lobby-detail-title', {
            margin: '0 0 6px',
            fontSize: '16px',
            fontWeight: '700',
        });
        css.addClass('lobby-tags', {
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            margin: '0 0 10px',
        });
        css.addClass('lobby-tag', {
            fontSize: '11px',
            padding: '2px 9px',
            borderRadius: '999px',
            background: c.panel2,
            color: '#d8d4f7',
        });
        css.addClass('lobby-tag-on', {
            background: 'rgba(74,222,128,0.14)',
            color: c.ok,
        });
        css.addClass('lobby-tag-off', {
            background: 'rgba(255,255,255,0.05)',
            color: c.muted,
            textDecoration: 'line-through',
        });
        css.addClass('lobby-detail-text', {
            margin: '0 0 14px',
            color: '#cfcbf0',
            fontSize: '12.5px',
        });
        css.addClass('lobby-stats', {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            marginBottom: '14px',
        });
        css.addClass('lobby-stat', {
            background: c.panel,
            border: `1px solid ${c.line}`,
            borderRadius: '9px',
            padding: '7px 8px',
        });
        css.addClass('lobby-stat-value', {
            display: 'block',
            fontSize: '14px',
            fontWeight: '700',
        });
        css.addClass('lobby-stat-label', {
            fontSize: '10.5px',
            color: c.muted,
        });
        css.addClass('lobby-actions', {
            display: 'grid',
            gap: '7px',
        });
        css.addClass('lobby-note', {
            fontSize: '11px',
            color: c.muted,
            marginTop: '10px',
            display: 'flex',
            gap: '5px',
        });

        // --- Modal ---
        css.addClass('lobby-overlay', {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(5,4,20,0.7)',
            zIndex: '50',
        });
        css.addClass('lobby-modal', {
            width: '420px',
            maxWidth: '100%',
            background: '#171442',
            border: `1px solid ${c.line}`,
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 30px 80px #000a',
        });
        css.addClass('lobby-modal-title', {
            margin: '0 0 4px',
            fontSize: '17px',
            fontWeight: '700',
        });
        css.addClass('lobby-modal-sub', {
            color: c.muted,
            margin: '0 0 14px',
            fontSize: '12.5px',
        });
        css.addClass('lobby-field', {
            marginBottom: '12px',
        });
        css.addClass('lobby-field-label', {
            display: 'block',
            fontSize: '12px',
            color: c.muted,
            marginBottom: '5px',
        });
        css.addClass('lobby-input', {
            width: '100%',
            padding: '8px 10px',
            borderRadius: '9px',
            border: `1px solid ${c.line}`,
            background: 'rgba(255,255,255,0.06)',
            color: c.text,
            fontSize: '14px',
            fontFamily: 'inherit',
        });
        css.addClass('lobby-seg', {
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
        });
        css.addClass('lobby-seg-btn', {
            padding: '7px 9px',
            borderRadius: '9px',
            border: `1px solid ${c.line}`,
            background: 'transparent',
            color: c.text,
            cursor: 'pointer',
            fontSize: '12.5px',
        });
        css.addClass('lobby-seg-btn-active', {
            background: c.panel2,
            borderColor: c.gold,
            color: c.gold,
            fontWeight: '700',
        });
        css.addClass('lobby-switch-row', {
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            fontSize: '12.5px',
        });
        css.addClass('lobby-modal-foot', {
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: '16px',
        });
        css.addClass('lobby-modal-foot-col', {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '16px',
        });
    }
}
