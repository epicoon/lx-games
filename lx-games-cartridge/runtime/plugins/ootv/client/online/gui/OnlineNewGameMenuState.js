// @lx:macros Const {lxGames.ootv.Constants};

lx.import(lxGames.Tools.VotingMenu);

// @lx:namespace lxGames.ootv;
class OnlineNewGameMenuState extends lxGames.ootv.NewGameMenuState {
    _init() {
        this.guiInited = false;
        this.guiNode.getPlugin().on('ootv_staffed', ()=>{
            if (!this.guiInited) {
                this.initGui();
                _initColorMenu(this.guiNode);
                this.guiInited = true;
            }
        });
    }

    _initBase() {
        const node = this.guiNode,
            plugin = node.getPlugin(),
            w = node.getGuiNode('main').getWidget(),
            saveBut = lx(w)>>butFirst;
        saveBut.text(lx.i18n(newGameMenu.save));
        saveBut.click(()=>{
            let menu = new lxGames.SaveMenu();
            menu.setEnvironment(node.getEnvironment());
        });
        node.boxes.butSaveGame = saveBut;

        const revengeBut = node.getGuiNode('main').getWidget().add(lx.Box, {
            css: 'ootv-but',
            geom: [1, 1, 10, 5],
            text: lx.i18n(newGameMenu.revenge)
        });
        revengeBut.align(lx.CENTER, lx.MIDDLE);
        revengeBut.hide();
        node.boxes.butRevenge = revengeBut;

        plugin.on('ENV_gamePrepared', ()=>{
            node.boxes.butSaveGame.show();
            node.boxes.butRevenge.hide();
        });
        plugin.on('ENV_gameOver', ()=>{
            node.boxes.butSaveGame.hide();
            node.boxes.butRevenge.show();
        });
        plugin.on('ENV_revengeRequested', ()=>{
            node.getGame().reset();
        });

        node.boxes.votingMenu = new lxGames.Tools.VotingMenu({
            parent: plugin.root,
            message: lx.i18n(newGameMenu.revenge)
        });
        node.boxes.votingMenu.setEnvironment(node.getEnvironment());
        node.boxes.votingMenu.setVotingButton(node.boxes.butRevenge);
    }

    changeGamerBoard(info) {
        let model = (new lx.CollectionSelector)
            .setCollection(this.guiNode.gamersList)
            .ifPropertyIs('id', info.gamerId)
            .getOne();
        model.board = info.board;
        model.station = info.station;
    }

    changeSequence(seq) {
        seq.forEach(item => {
            let model = (new lx.CollectionSelector)
                .setCollection(this.guiNode.gamersList)
                .ifPropertyIs('id', item.gamerId)
                .getOne();
            model.seq = item.seq + 1;
        });

        this.guiNode.model.seqReady = true;
    }

    _initOpen() {
        const node = this.guiNode,
            game = node.getGame(),
            gamerDatum = lx>>>Const.GAMERS,
            gamerKeys = Object.keys(gamerDatum);
        let i = 0,
            gamersList = [];
        game.forEachGamer(gamer => {
            const gamerKey = gamerKeys[i++];
            gamersList.push({
                colorId: gamerKey,
                icon: gamerDatum[i].color + '.jpg',
                name: gamer.getName(),
                id: gamer.getId(),
                active: true
            });
        });
        node.gamersList.reset(gamersList);
    }

    _initButtons() {
        super._initButtons();

        const node = this.guiNode,
            menu = node.getWidget(),
            butsBox = lx(menu)>>buts,
            butOk = lx(menu)>>butOk;

        butOk.text(lx.i18n(newGameMenu.ready));
        butOk.click(()=>{
            const game = node.getGame();
            node.committed = true;

            let colors = {};
            node.gamersList.forEach(gamer => {
                colors[gamer.id] = gamer.colorId;
            });
            game.actions.dataProvider.setColors(colors);

            game.actions.trigger(new lxGames.ootv.ActionReady({
                gamerId: game.getLocalGamer().getId()
            }));
            butOk.disabled(true);
        });

        const readyCount = butsBox.add(lx.Box);
        readyCount.align(lx.CENTER, lx.MIDDLE);
        readyCount.setField('readyCount', function(val) {
            this.text(lx.i18n(newGameMenu.readyCount, {count: val}));
        });
        readyCount.bind(node.model);
    }

    _initSeqButton() {
        const gamer = this.guiNode.getGame().getLocalGamer();
        if (gamer.serverStatus.isPreparingNewGame())
            super._initSeqButton();
        else {
            const but = lx(this.guiNode.boxes.newGameMenu)>>dice;
            but.hide();
        }
    }

    _renderMatrixHeader() {
        const gamer = this.guiNode.getGame().getLocalGamer(),
            menu = this.guiNode.boxes.newGameMenu,
            header = lx(menu)>>header;

        let cols = gamer.serverStatus.isPreparingNewGame() ? 9 : 8,
            playersCols = gamer.serverStatus.isPreparingNewGame() ? 5 : 4;
        header.gridProportional({cols});

        header.begin();
        lx.ml(`
            <lx.Box> (width:playersCols, text:lx.i18n(newGameMenu.gamers)) #align(lx.CENTER, lx.MIDDLE)
            <lx.Box> (width:1) #overflow('visible')\
                #style('cursor', 'pointer')\
                #setAttribute('title', lx.i18n(newGameMenu.seqTitleHint))
                <lx.Box> [20:20:60:60]
                    <lx.Box> @dice.pulse [0:0:100:100] (picture:'dice.png')
            <lx.Box> (width:3, text: lx.i18n(newGameMenu.board)) #align(lx.CENTER, lx.MIDDLE)
        `);
        header.end();
    }

    _getMatrixMap() {
        const gamer = this.guiNode.getGame().getLocalGamer();

        return gamer.serverStatus.isPreparingNewGame()
            ? ['reloc', 'icon', 'name', 'seq', 'board']
            : ['icon', 'name', 'seq', 'board'];
    }

    _matrixRenders() {
        const gamer = this.guiNode.getGame().getLocalGamer();
        let renderers = super._matrixRenders();
        renderers.board = (node, model)=>{
            let board = new lx.Box({key:'boardBox', width:3});
            if (model.id === gamer.getId())
                board.style('cursor', 'pointer');
            board.align(lx.CENTER, lx.MIDDLE);
            board.setField('board', function(val) {
                this.clear();
                this.add(lxGames.ootv.BoardSchema, {
                    cells: node.getGame().actions.dataProvider.getBoardMap(val)
                });
            });
            if (model.id === gamer.getId())
                board.click(()=>node._selectBoard(model));
        };
        return renderers;
    }

    _getMatrixRowSize() {
        const gamer = this.guiNode.getGame().getLocalGamer();
        return gamer.serverStatus.isPreparingNewGame() ? 9 : 8;
    }
}

function _initColorMenu(node) {
    if (node.boxes.colorMenu) return;

    const menu = node.boxes.newGameMenu,
        colorBox = lx(menu)>>gamersList.child(0)>>color,
        size = (colorBox.width('px') * 2 + 30) + 'px';

    const colorMenu = node.getWidget().add(lx.Box, {
        geom: [0, 0, size, size]
    });

    colorMenu.add(lx.Box, {geom:true, fill:'black', opacity:0.5});
    const slots = colorMenu.add(lx.Box, {geom:true});
    slots.slot({
        indent: '10px',
        cols: 2,
        rows: 2
    });

    let colors = Object.keys(lx>>>Const.GAMERS),
        i = 0;

    slots.getChildren().forEach(slot => {
        slot.add(lx.Box, {geom:true, fill:'black', opacity:0.7});
        let color = colors[i++];
        (slot.add(lx.Box, {margin:'10px', css:'ootv-gamer-color'}))
            .picture(lx>>>Const.GAMERS[color].color + '.jpg')
            .style('cursor', 'pointer');
        slot._color = color;
        slot.click(function () {
            if (colorMenu._model.colorId == this._color) {
                colorMenu.close();
                return;
            }

            let comodel = null;
            node.gamersList.forEach(gamer => {
                if (gamer.colorId == this._color)
                    comodel = gamer;
            });

            if (comodel) {
                comodel.colorId = colorMenu._model.colorId;
                comodel.icon = colorMenu._model.icon;
            }

            colorMenu._model.colorId = this._color;
            colorMenu._model.icon = lx>>>Const.GAMERS[this._color].color + '.jpg';

            colorMenu.close();

            const game = node.getGame();
            let colors = {};
            node.gamersList.forEach(gamer => {
                colors[gamer.id] = gamer.colorId;
            });
            game.actions.dataProvider.setColors(colors);
            game.actions.trigger(new lxGames.ootv.ActionApplyColor({
                gamerId: game.getLocalGamer().getId(),
                colors
            }));
        });
    });

    colorMenu.hide();

    colorMenu.open = function(model) {
        this._model = model;
        this.left(lx.app.mouse.x + 'px');
        this.top(lx.app.mouse.y + 'px');
        this.show();
    };
    colorMenu.close = function() {
        this._model = null;
        this.hide();
    }

    lx(menu)>>color.forEach(colorI => {
        colorI.style('cursor', 'pointer');
        colorI.click(function() {
            colorMenu.open(this.parent.parent.matrixModel());
        });
    });

    node.boxes.colorMenu = colorMenu;
}
