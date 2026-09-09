// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv.gui;
class ScoreTable extends lx.GuiNode {
	// @lx:behavior lxGames.Tools.EnvironmentItemBehavior;

    init() {
        lx(this.getElem('title'))>text.adapt();
    }

    initHandlers() {
        this.getElem('closeBut').click(()=>_close(this));
    }

    subscribeEvents() {
        const plugin = this.getPlugin();

        plugin.on('open.scoreTable', ()=>_open(this));
    }
}

function _open(self) {
    self.getElem('body').clear();

    const game = self.getGame();
    for (let i in game.gamers)
        _addGamerInfoBox(self, game.gamers[i]);

    self.show();
}

function _close(self) {
    self.hide();
    self.getElem('body').clear();
}

function _addGamerInfoBox(self, gamer) {
    let bodyBox = self.getElem('body'),
        box = new lx.Box({parent: bodyBox});
    box.useRenderCache();
    new lx.Rect({parent:box, geom:true, fill:'black', opacity:0.6});

    let mainBox = new lx.Box({parent:box, geom:true});
    mainBox.streamProportional({indent:'10px'});

    let headerWrapper = new lx.Box({parent:mainBox, height:'50px'});
    new lx.Rect({parent:headerWrapper, geom:true, fill:'black', opacity:0.6});
    let header = new lx.Box({parent:headerWrapper, geom:true});
    new lx.Box({parent:header, size:['30px', '30px'], picture:lx>>>Const.GAMERS[gamer.colorId].color + '.jpg'});

    let body = new lx.Box({parent:mainBox});
    body.overflow('auto');
    let grid = new lx.Box({parent:body, geom:[0, 0, '100%', 'auto']});
    grid.grid({step:'10px', minHeight:'50px'});

    let points = 0;
    for (let i=0; i<gamer.pointsInfo.length; i++) {
        let info = gamer.pointsInfo[i],
            text,
            amt = info.amt;

        switch (info.code) {
            case lx>>>Const.SCORE_DRONE : {
                let arr = info.info.split('.'),
                    name = [
                        lx.i18n(scoreTable.service),
                        lx.i18n(scoreTable.scout),
                        lx.i18n(scoreTable.cargo),
                        lx.i18n(scoreTable.support)
                    ];
                text = lx.i18n(scoreTable.drones, {drone: name[arr[0]], count: arr[1]});
            } break;
            case lx>>>Const.SCORE_MINERALS : text = lx.i18n(scoreTable.minerals, {count: info.info}); break;
            case lx>>>Const.SCORE_TELESCOPE : text = lx.i18n(scoreTable.telescope); break;
            case lx>>>Const.SCORE_FILL : text = lx.i18n(scoreTable.fill, {count: info.info}); break;
            case lx>>>Const.SCORE_FILLBONUS : text = lx.i18n(scoreTable.fillBonus, {count: info.info}); break;
            case lx>>>Const.SCORE_DATA_STORAGE : text = lx.i18n(scoreTable.dataStorage, {count: info.info}); break;
            case lx>>>Const.SCORE_CREDIT : text = lx.i18n(scoreTable.credit); break;
            case lx>>>Const.SCORE_LOSTMINERALS : text = lx.i18n(scoreTable.lostMinerals); break;
            case lx>>>Const.SCORE_BONUS : text = lx.i18n(scoreTable.bonus); break;
            case lx>>>Const.SCORE_TECHNOLOGY : {
                switch (info.info) {
                    case lx>>>Const.VARIANT_TECHNOLOGY_15: text = lx.i18n(scoreTable.technology15); break;
                    case lx>>>Const.VARIANT_TECHNOLOGY_16: text = lx.i18n(scoreTable.technology16); break;
                    case lx>>>Const.VARIANT_TECHNOLOGY_17: text = lx.i18n(scoreTable.technology17); break;
                    case lx>>>Const.VARIANT_TECHNOLOGY_18: text = lx.i18n(scoreTable.technology18); break;
                    case lx>>>Const.VARIANT_TECHNOLOGY_19: text = lx.i18n(scoreTable.technology19); break;
                    case lx>>>Const.VARIANT_TECHNOLOGY_20: text = lx.i18n(scoreTable.technology20); break;
                    case lx>>>Const.VARIANT_TECHNOLOGY_21: text = lx.i18n(scoreTable.technology21); break;
                    case lx>>>Const.VARIANT_TECHNOLOGY_22: text = lx.i18n(scoreTable.technology22); break;
                    case lx>>>Const.VARIANT_TECHNOLOGY_23: text = lx.i18n(scoreTable.technology23); break;
                    case lx>>>Const.VARIANT_TECHNOLOGY_24: text = lx.i18n(scoreTable.technology24); break;
                    case lx>>>Const.VARIANT_TECHNOLOGY_25: text = lx.i18n(scoreTable.technology25); break;
                    case lx>>>Const.VARIANT_TECHNOLOGY_26: text = lx.i18n(scoreTable.technology26); break;
                }
            } break;
        }

        points += amt;
        _addBox(grid, text, 10, lx.LEFT);
        _addBox(grid, amt, 2, lx.CENTER);
    }

    header.style('color', 'white');
    header.text(gamer.getName() + ': ' + points);
    header.align({
        horizontal: lx.LEFT,
        vertical: lx.MIDDLE,
        indent: '10px'
    });

    box.applyRenderCache();
}

function _addBox(parent, text, width, hor) {
    let box = new lx.Box({parent, width});
    new lx.Rect({parent:box, geom:true, fill:'black', opacity:0.6});
    box.style('color', 'white');
    let txt = new lx.Box({parent:box, geom:true});
    txt.text(text);
    txt.align(hor, lx.MIDDLE);
}
