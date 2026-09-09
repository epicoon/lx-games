// @lx:namespace lxGames.ootv;
class MainCss extends lx.PluginCssAsset {
    init(css) {
        css.addClass('ootv-relocator', {
            fontSize: '1.5em',
            cursor: 'move'
        });
        css.addClass('ootv-back', {
            color: 'white'
        });
        css.addClass('ootv-gamer-color', {
            borderRadius: '50%',
        });
        css.addClass('ootv-but', {
            backgroundColor: 'black',
            color: 'white',
            cursor: 'pointer',
            opacity: 0.7
        }, {
            hover: {
                opacity: 1
            }
        });
        css.addClass('ootv-help-but', {
            backgroundColor: '#2D6CDF',
            aspectRatio: '1 / 1',
            borderRadius: '50%',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            opacity: 0.7
        }, {
            hover: {
                opacity: 1
            }
        });

        // Tables inside markdown-rendered i18n text (e.g. the rules popup)
        css.addClass('lx-md-table', {
            borderCollapse: 'collapse',
            width: '100%',
            marginTop: '8px',
            marginBottom: '8px'
        });
        css.addClass('lx-md-table-header', {
            border: '1px solid rgba(255,255,255,0.35)',
            padding: '4px 10px',
            backgroundColor: 'rgba(255,255,255,0.12)',
            fontWeight: 'bold'
        });
        css.addClass('lx-md-table-cell', {
            border: '1px solid rgba(255,255,255,0.35)',
            padding: '4px 10px'
        });

        css.addClass('pulse', {
            animationName: 'dice-pulse',
            animationDuration: '0.8s',
            animationIterationCount: 'infinite'
        });
        css.addStyle('@keyframes dice-pulse', {
            from: {
                left: '0px',
                top: '0px',
                width: '100%',
                height: '100%'
            },
            '50%': {
                left: '-8px',
                top: '-8px',
                width: 'calc(100% + 16px)',
                height: 'calc(100% + 16px)'
            },
            to: {
                left: '0px',
                top: '0px',
                width: '100%',
                height: '100%'
            }
        });

        css.addClass('ootv-end-turn', {
            animationName: 'ootv-end-turn-pulse',
            animationDuration: '2s',
            animationIterationCount: 'infinite'
        });
        css.addStyle('@keyframes ootv-end-turn-pulse', {
            from: {
                backgroundColor: 'black'
            },
            '50%': {
                backgroundColor: css.presetValue('neutralDeepColor', '#E6D540'),
                color: 'black'
            },
            to: {
                backgroundColor: 'black'
            }
        });
    }
}
