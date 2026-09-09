/**
 * @const {lx.Plugin} $plugin
 * @const {lx.Snippet} $snippet
 */

new lx.Box({geom:[40, 35, 20, 30], fill:'white'});
new lx.Box({key:'back', geom:true, fill:'black', opacity:0.5});

let tread = new lx.Box({key:'tread', geom:[40, 35, 20, 30]});
tread.gridProportional({indent:'10px', cols:4});
tread.begin();
	new lx.Box({width:4, key:'lbl', text:lx.i18n(dataStorageMenu.useDataStorage)});
	new lx.Box({key:'m2', text:'-2'});
	new lx.Box({key:'m1', text:'-1'});
	new lx.Box({key:'p1', text:'+1'});
	new lx.Box({key:'p2', text:'+2'});
	new lx.Box({width:4, key:'add', text:lx.i18n(dataStorageMenu.dropDice)});
tread.end();
tread.getChildren().forEach((a)=>{
	a.align(lx.CENTER, lx.MIDDLE);
	a.addClass('ootv-but');
});

$snippet.widget.hide();
