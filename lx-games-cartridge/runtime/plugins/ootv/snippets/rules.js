/**
 * @const {lx.Plugin} $plugin
 * @const {lx.Box} $snippet
 */

lx.import(lx.Image);

$snippet.widget.hide();

(new lx.Rect({geom:true})).fill('black').opacity(0.85);

let main = new lx.Box({geom:[0, 0, 100, 100]});
main.streamProportional({indent:'10px'});

let header = main.add(lx.Box, {height:'50px'});
let wrapper = main.add(lx.Box, {key:'body'});
new lx.Rect({parent:wrapper, geom:true, fill:'black', opacity:0.85});

let screen = new lx.Box({parent:wrapper, geom: true});
screen.overflow('auto');

let body = screen.add(lx.Box, {
	key:'body',
	style: {
		position: 'relative',
		color: 'white',
		padding: '15px',
	}
});

new lx.Rect({parent:header, geom:true, fill:'black', opacity:0.85});
header.style('color', 'white');

let title = new lx.Box({
	key: 'title',
	parent: header,
	geom: true,
	style: {'font-size': '1.6em'},
	text: lx.i18n(root.rules),
});
title.align(lx.CENTER, lx.MIDDLE);

let closeBox = new lx.Box({parent: header, margin: '10px'});
let image = new lx.Image({
	parent: closeBox,
	key: 'closeBut',
	geom: [null, 0, 0, 0, 0],
	path: 'close.png'
});
image.style('cursor', 'pointer');
image.adapt();

body.html(lx.i18n(game.rules));
