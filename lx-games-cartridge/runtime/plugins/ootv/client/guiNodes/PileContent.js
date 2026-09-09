// @lx:macros Const {lxGames.ootv.Constants};

lx.import(lx.Image);

// @lx:namespace lxGames.ootv.gui;
class PileContent extends lx.GuiNode {
	// @lx:behavior lxGames.Tools.EnvironmentItemBehavior;

    init() {
        this.tileName = '';

        const pileContent = this.getWidget();
        lx(pileContent)>stream.stream({
            height: (pileContent.width('px') * 0.55) + 'px',
            indent: '5px'
        });
    }

    subscribeEvents() {
        this.getPlugin().on('mouse.moveWithoutIntersects', ()=>_close(this));

        this.getPlugin().on('mouse.moveWithIntersects', (e)=>{
            const stuff = e.data.intersect;
            if (!stuff.tile) {
                _close(this);
                return;
            }

            if (this.tileName == stuff.tile.name) return;

            _close(this);

            if (stuff.info === undefined) return;
            if (stuff.isTileType(lx>>>Const.TILE_MINERALS_STAGE)) return;

            let available = [
                lx>>>Const.TILE_MINERALS_INGAME,
                lx>>>Const.TILE_MINERALS_INGAMER,
                lx>>>Const.TILE_MINERALS_SOLD,
                lx>>>Const.TILE_CREDIT,
                lx>>>Const.TILE_DATA_STORAGE,
                lx>>>Const.TILE_BONUS_INGAMER,
                lx>>>Const.TILE_COUNTER
            ];
            if (!stuff.isTileType(available)) return;

            _open(this, stuff.tile);
        });
    }
}

function _open(self, tile) {
    if (tile.isEmpty()) return;
    if (tile.chips[0].info === undefined) return;
    if (!tile.chips[0].info.lxHasMethod('getFace')) return;

    self.tileName = tile.name;

    let count = _calcCount(tile);
    if (count === false) return;

    const pileContent = self.getWidget(),
        stream = lx(pileContent)>stream;
    stream.clear();
    stream.add(lx.Box, count.total, {key: 'cell'});
    pileContent.height(stream.height('px') + 'px');

    let counter = 0,
        cells = lx.Collection.cast(lx(pileContent)>>cell);

    for (let key in count.byType) {
        let info = count.byType[key],
            cell = cells.at(counter++);

        let path = info.chip.info.getFace();
        if (!path.match(/\./)) path += '.jpg'

        let pic = cell.add(lx.Image, {path, width:75});
        pic.adapt();
        cell.align(lx.CENTER, lx.MIDDLE);

        let text = cell.add(lx.Box, {
            width: 25, right: 0,
            text: info.counter
        });
        text.align(lx.CENTER, lx.MIDDLE);
        text.fill('black');
        text.style('color', 'white');
    }

    self.show();
}

function _close(self) {
    self.tileName = '';
    self.hide();
}

function _calcCount(tile) {
    let byType = [],
        total = 0;
    for (let i=0; i<tile.chipsCount(); i++) {
        let chipI = tile.chips[i];
        if (chipI.info === undefined) return false;
        let key = 'v' + chipI.info.variant;
        if ( key in byType ) byType[key].counter++;
        else {
            byType[key] = { chip : chipI, counter : 1};
            total++;
        }
    }

    return { byType, total };
}
