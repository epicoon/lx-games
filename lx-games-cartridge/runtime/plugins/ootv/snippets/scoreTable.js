/**
 * @const {lx.Plugin} $plugin
 * @const {lx.Box} $snippet
 */

lx.import(lx.Image);

$snippet.widget.hide();

(new lx.Rect({geom:true})).fill('black').opacity(0.5);

let main = new lx.Box({geom:true});
main.streamProportional({indent:'10px'});

let header = main.add(lx.Box);
let body = main.add(lx.Box, {key:'body', height:12});

new lx.Rect({parent:header, geom:true, fill:'black', opacity:0.6});
header.style('color', 'white');

let title = new lx.Box({
	key: 'title',
	parent: header,
	geom: true,
	text: lx.i18n(root.points)
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

body.gridProportional({cols:2, step:'10px'});
