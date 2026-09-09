// @lx:namespace lxGames.ootv;
class NewGameMenuState {
    constructor(guiNode) {
        this.guiNode = guiNode;
        this._init();
    }

    initGui() {
        this._initBase();
        this._initOpen();

        _initBoardsMenu(this.guiNode);

        this._initButtons();
        this._initMatrix();
        this._initSeqButton();
    }

    _initButtons() {
        const node = this.guiNode,
            menu = node.getWidget(),
            butOk = lx(menu)>>butOk;

        butOk.setField('ready', function(val) {
            this.disabled(!val);
        });
        butOk.bind(node.model);
    }

    _initSeqButton() {
        const node = this.guiNode,
            but = lx(node.boxes.newGameMenu)>>dice;
        but.click(()=>{
            if (node.model.seqReady) return;
            let count = node._getGamersCount();
            if (count < 2) return;

            let seq = node._genSequence();
            this.guiNode._applySequence(seq);
        });
    }

    _initMatrix() {
        const node = this.guiNode,
            menu = node.boxes.newGameMenu,
            gamersListStream = lx(menu)>>gamersList;

        this._renderMatrixHeader();

        const renders = this._matrixRenders(),
            renderMap = this._getMatrixMap();

        gamersListStream.matrix({
            items: node.gamersList,
            itemRender: (row, model) => {
                row.addClass('ootv-back');
                (row.add(lx.Box, {geom:true})).fill('black').opacity(0.5);
                let grid = row.add(lx.Box, {geom:true});
                grid.gridProportional({cols: this._getMatrixRowSize()});

                grid.begin();
                renderMap.forEach(field => {
                    renders[field](node, model, row);
                });
                grid.end();

                this._initMatrixRow(row);
            }
        });

        gamersListStream.on('swapped', ()=>{
            let seq = [];
            for (let i = 0; i < node._getGamersCount(); i++)
                seq.push(i);
            node._applySequence(seq);
        });
    }

    _matrixRenders() {
        return {
            active: ()=>{
                _checkBox('active').setAttribute('title', lx.i18n(newGameMenu.activeHint));
            },
            reloc: (node, model, row)=>{
                let rel = new lx.MatrixSwapper({
                    matrixItem: row,
                    text:'&#10022;',
                    width: 1,
                    css:'ootv-relocator'
                });
                rel.align(lx.CENTER, lx.MIDDLE);
            },
            icon: ()=>{
                let colorWrapper = new lx.Box({key:'color'});
                colorWrapper.slot({cols: 1, rows: 1, indent: '10px'});
                colorWrapper.child(0).addClass('ootv-gamer-color');
                colorWrapper.child(0).setField('icon', function(val) {this.picture(val)});
            },
            name: ()=>{
                (new lx.Box({field:'name', width:3})).align(lx.CENTER, lx.MIDDLE);
            },
            seq: ()=>{
                let seq = new lx.Box({field:'seq'});
                seq.align(lx.CENTER, lx.MIDDLE);
                seq.setAttribute('title', lx.i18n(newGameMenu.seqHint));
            },
            ai: ()=>{
                _checkBox('ai').setAttribute('title', lx.i18n(newGameMenu.aiHint));
            },
            board: (node, model)=>{
                let wrapper = new lx.Box({width:3});
                let board = wrapper.add(lx.Box, {key:'boardBox', margin:'5px'});
                board.style('cursor', 'pointer');
                board.align(lx.CENTER, lx.MIDDLE);
                board.setField('board', function(val) {
                    this.clear();
                    this.add(lxGames.ootv.BoardSchema, {
                        cells: node.getGame().actions.dataProvider.getBoardMap(val)
                    });
                });
                board.click(()=>node._selectBoard(model));
            }
        };
    }

    // abstract
    changeGamerBoard(info) {}
    changeSequence(seq) {}
    _init() {}
    _initBase() {}
    _initOpen() {}
    _renderMatrixHeader() {}
    _getMatrixMap() {}
    _getMatrixRowSize() {}
    _initMatrixRow(row) {}
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function _checkBox(field) {
    let wrapper = new lx.Box({key:field+'Wrapper', width: 1});
    let cb = wrapper.add(lx.Checkbox, {field});
    wrapper.align(lx.CENTER, lx.MIDDLE);
    return wrapper;
}

function _initBoardsMenu(self) {
    const boardsMenu = self.boxes.boardsMenu;
    lx(boardsMenu)>>board.forEach(board=>board.click(function() {
        let model = boardsMenu.gamerModel;
        boardsMenu.gamerModel = null;
        boardsMenu.hide();
        _openBoardMenu(self, model, this.index);
    }));
    lx(boardsMenu)>>closeBoardsMenu.click(()=>boardsMenu.hide());

    const boardMenu = self.boxes.boardMenu;
    lx(boardMenu)>>boardOk.click(()=>_applyBoard(self));
    lx(boardMenu)>>boardClose.click(()=>boardMenu.hide());
}

function _openBoardMenu(self, gamerModel, boardIndex) {
    const boardMenu = self.boxes.boardMenu,
        boardSchemaSlot = lx(boardMenu)>>boardSchemaSlot;

    boardMenu.gamerModel = gamerModel;
    boardMenu.boardIndex = boardIndex;
    boardMenu.stationIndex = null;
    boardMenu.show();

    boardSchemaSlot.clear();
    boardMenu.boardSchema = boardSchemaSlot.add(lxGames.ootv.BoardSchema, {
        cells: self.getGame().actions.dataProvider.getBoardMap(boardIndex),
        editable: true,
    });
    boardMenu.boardSchema.on('select', event => {
        boardMenu.stationIndex = event.index;
    });
    boardMenu.stationIndex = boardMenu.boardSchema.getSelected();
}

function _applyBoard(self) {
    const boardMenu = self.boxes.boardMenu;

    self.getGame().actions.trigger(new lxGames.ootv.ActionApplyBoard({
        gamerId: boardMenu.gamerModel.id,
        gamerColor: boardMenu.gamerModel.colorId,
        board: boardMenu.boardIndex,
        station: boardMenu.stationIndex
    }));

    boardMenu.gamerModel = null;
    boardMenu.boardIndex = null;
    boardMenu.stationIndex = null;
    boardMenu.boardSchema = null;

    boardMenu.hide();
}
