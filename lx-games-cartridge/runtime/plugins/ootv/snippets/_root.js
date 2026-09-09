/**
 * @const {lx.Plugin} $plugin
 * @const {lx.Snippet} $snippet
 */

// @lx:js @app/runtime/web/lib/three.js;

lx.import(
	lx.ConfirmPopup
	// lx.LanguageSwitcher
);

const wrapper = new lx.Box({geom: true});

const main = new lx.Box({parent:wrapper, key:'main', geom:true});
main.style('overflow', 'hidden');
main.begin();

// 3D-canvas
new lx.Box({key:'canvas', geom:true, fill:'#555555'});

(new lx.Box({
	key: 'butFirst',
	css: 'ootv-but',
	geom: [1, 1, 10, 5],
})).align(lx.CENTER, lx.MIDDLE);

// Button to open the rules popup
(new lx.Box({
	key: 'butOpenRules',
	geom: [12, 1, null, 5],
	text: '?',
	css: 'ootv-help-but'
})).align(lx.CENTER, lx.MIDDLE);

//TODO do not use now
// Language switcher
// new lx.LanguageSwitcher({
// 	key: 'langSwitcher',
// 	geom: [74, 1, 13, 5],
// 	flags: {
// 		'en-EN': 'lang/en.png',
// 		'ru-RU': 'lang/ru.png'
// 	}
// });

// Button to open points table
decorateBox(new lx.Box({
	key: 'butOpenScore',
	geom: [89, 1, 10, 5],
	text: lx.i18n(root.pointsTable)
}));

// Current tip
decorateBox(new lx.Box({
	key: 'lblHint',
	geom: [0.5, 92, 18, 7],
	text: lx.i18n(root.newGameHint)
}));

// Button to end turn
decorateBox((new lx.Box({
	key: 'lblTurnEnds',
	geom: [89, 92, 10, 7],
	text: lx.i18n(root.endTurn),
	css: 'ootv-end-turn'
})).hide());

// Actual action icon
(new lx.Box({
	key: 'statusIcon',
	geom: true,
	size: ['80px', '80px']
})).hide();

// Window for chips stuck
const pileContent = new lx.Box({
	key: 'pileContent',
	geom: [89, 8, 8, 'auto']
});
pileContent.add(lx.Rect, {geom:true, fill:'black',opacity:0.7});
pileContent.add(lx.Box, {geom:true, key:'stream'});
pileContent.hide();

// Float points info
const floatPoints = new lx.Box({key:'floatPoints', geom:[0, 0, 0, 0]});
floatPoints.style('overflow', 'hidden');
floatPoints.style('color',  'white');
floatPoints.add(lx.Rect, {geom:true, fill:'black', opacity:0.7});
const stream = floatPoints.add(lx.Box, {geom: true, key:'stream'});
stream.streamProportional();
floatPoints.hide();

// Float hint
const floatHint = new lx.Box({
	key: 'floatHint',
	geom: [0, 0, 0, 0]
});
floatHint.style('color', 'white');
floatHint.style('fontSize', '20px');
(floatHint.add(lx.Box, {key: 'fon', geom:true})).fill('black').opacity(0.7);
floatHint.add(lx.Box, {key: 'val', margin:'10px'});
floatHint.hide();

main.end();

// Popups
const popupsMap = {
	// New game menu
	newGameMenu: {geom: true},

	// Menu to manage dataStorages
	dataStorageMenu: {geom: true},

	// Points table
	scoreTable: {
		depthCluster: lx.DepthClusterMap.CLUSTER_PRE_OVER,
		geom: [0, 0, 100, 100]
	},

	// Game rules
	rules: {
		depthCluster: lx.DepthClusterMap.CLUSTER_PRE_OVER,
		geom: [0, 0, 100, 100]
	},
};
for (let name in popupsMap) {
	let params = popupsMap[name];
	params.key = name;
	wrapper.add(lx.Box, params).setSnippet(name);
}

function decorateBox(box) {
	box.align(lx.CENTER, lx.MIDDLE);
	box.addClass('ootv-but');
}
