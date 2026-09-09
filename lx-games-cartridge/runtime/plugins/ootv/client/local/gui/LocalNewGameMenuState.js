// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv;
class LocalNewGameMenuState extends lxGames.ootv.NewGameMenuState {
    _init() {
        this.initGui();
    }

    changeGamerBoard(info) {
        let model = (new lx.CollectionSelector)
            .setCollection(this.guiNode.gamersList)
            .ifPropertyIs('colorId', info.gamerColor)
            .getOne();
        model.board = info.board;
        model.station = info.station;
    }

    changeSequence(seq) {
        seq.forEach(item => {
            let model = (new lx.CollectionSelector)
                .setCollection(this.guiNode.gamersList)
                .ifPropertyIs('colorId', item.gamerColor)
                .getOne();
            model.seq = item.seq + 1;
        });
    }

    _initBase() {
        const node = this.guiNode,
            w = node.getGuiNode('main').getWidget(),
            but = lx(w)>>butFirst;

        but.text(lx.i18n(newGameMenu.but));

        node.boxes.butNewGame = but;
    }

    _initOpen() {
        const node = this.guiNode;

        node.boxes.back.click(()=>node.hide());

        node.boxes.butNewGame.click(()=>{
            let data = [];
            Object.keys(lx>>>Const.GAMERS).forEach(color=>{
                data.push({
                    colorId: color,
                    icon: lx>>>Const.GAMERS[color].color + '.jpg',
                    name: lx>>>Const.GAMERS[color].name
                });
            });
            node.gamersList.reset(data);
            node.gamersList.at(0).active = true;
            node.gamersList.at(1).active = true;

            let game = node.getGame();
            if (!game.status.isNone() && !game.status.isOver())
                lx.ConfirmPopup.
                    open(lx.i18n(newGameMenu.confirm)).
                    confirm(()=>{
                        game.reset();
                        node.getPlugin().trigger('ootv_game_reset');
                        node.show();
                    });
            else node.show();
        });
    }

    _initButtons() {
        super._initButtons();

        const node = this.guiNode,
            menu = node.getWidget(),
            butsBox = lx(menu)>>buts,
            butOk = lx(menu)>>butOk;

        butOk.click(()=>this._startGame());

        const butClose = butsBox.add(lx.Button, {text: lx.i18n(newGameMenu.close)});
        butClose.click(()=>{
            menu.hide();
            node._resetSequence();
        });
    }

    _renderMatrixHeader() {
        const menu = this.guiNode.boxes.newGameMenu,
            header = lx(menu)>>header;
        header.gridProportional({cols: 11});

        header.begin();
        lx.ml(`
            <lx.Box> (width:6, text:lx.i18n(newGameMenu.gamers)) #align(lx.CENTER, lx.MIDDLE)
            <lx.Box> (width:1) #overflow('visible')\
                #style('cursor', 'pointer')\
                #setAttribute('title', lx.i18n(newGameMenu.seqTitleHint))
                <lx.Box> [20:25:60:50]
                    <lx.Box> @dice [0:0:100:100] (picture:'dice.png')
            <lx.Box> (width:1)\
                #setAttribute('title', lx.i18n(newGameMenu.aiHint))
                <lx.Box> [20:20:60:60] (picture:'comp.png')
            <lx.Box> (width:3, text: lx.i18n(newGameMenu.board)) #align(lx.CENTER, lx.MIDDLE)
        `);
        header.end();
    }

    _getMatrixMap() {
        return ['reloc', 'active', 'icon', 'name', 'seq', 'ai', 'board'];
    }

    _getMatrixRowSize() {
        return 11;
    }

    _initMatrixRow(row) {
        const node = this.guiNode;
        row.setField('active', function(val) {
            if (val) {
                lx(this)>>seq.show();
                lx(this)>>aiWrapper.show();
                lx(this)>>boardBox.show();
            } else {
                lx(this)>>seq.hide();
                lx(this)>>aiWrapper.hide();
                lx(this)>>boardBox.hide();
            }
            node._resetSequence();
        });
    }

    _startGame() {
        const node = this.guiNode;
        let list = [0, 0, 0, 0];
        node.gamersList.forEach(gamer => {
            if (gamer.active)
                list[gamer.seq - 1] = {
                    id: gamer.id,
                    colorId: gamer.colorId,
                    ai: gamer.ai
                };
        });

        let sequence = [];
        list.forEach(item=>{
            if (item) sequence.push(item);
        });

        node.getGame().actions.trigger(new lxGames.ootv.ActionNewGame(sequence));
    }
}
