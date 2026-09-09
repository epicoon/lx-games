// @lx:macros Const {lxGames.ootv.Constants};

lx.import(
    lx.Checkbox,
    lx.Image,
    lx.MatrixSwapper,
    lxGames.SaveMenu,
    lxGames.ootv.BoardSchema
);

// @lx:namespace lxGames.ootv.gui;
class NewGameMenu extends lx.GuiNode {
	// @lx:behavior lxGames.Tools.EnvironmentItemBehavior;

    init() {
        this.boxes = {
            back: this.getElem('back'),
            newGameMenu: this.getElem('menu'),
            boardsMenu: this.getElem('boardsMenu'),
            boardMenu: this.getElem('boardMenu')
        };

        _prepareBoardsMenu(this);

        this.model = lx.BindableModel.create({
            seqReady: {default: false},
            readyCount: {default: 0},
            ready: {ref: '_ready()'},
        });
        const self = this;
        this.model._ready = function() {
            let count = self._getGamersCount();
            if (count < 2)
                return false;
            return this.seqReady;
        }
        this.model.afterSet(function() {
            this.pushBind();
        });

        this.gamersList = lx.ModelCollection.create({
            schema: {
                active: {default: false},
                colorId: {},
                icon: {},
                name: {},
                id: {},
                seq: {default: '?'},
                ai: {default: false},
                board: {default: 0},
                station: {default: 18}
            }
        });

        this.state = null;
        this.committed = false;
    }

    subscribeEvents() {
        const plugin = this.getPlugin();

        plugin.on('ootv_change_gamer_board', event => {
            this.state.changeGamerBoard(event.getData());
        });

        plugin.on('ootv_change_sequence', event => {
            this.state.changeSequence(event.getData());
        });

        plugin.on('ootv_gamer_ready', event => {
            this.model.readyCount = event.getData().readyCount;
        });

        plugin.on('ootv_game_starting', event => {
            this.hide();
            this.committed = false;
            this._resetSequence();
        });
    }

    _getGamersCount() {
        if (!this.gamersList) return 0;
        let count = 0;
        this.gamersList.forEach(gamer => {
            if (gamer.active) count++;
        });
        return count;
    }

    _selectBoard(model) {
        const boardsMenu = this.boxes.boardsMenu;
        boardsMenu.show();
        boardsMenu.gamerModel = model;
    }

    _genSequence() {
        let rand = [];

        function checkSame(val) {
            let match = false;
            rand.forEach(item => {
                if (item == val) match = true;
            });
            return match;
        }

        let count = this._getGamersCount();
        for (let i = 0; i < count; i++) {
            let randI = lx.Math.randomInteger(0, count - 1);
            if (checkSame(randI)) {
                let direction = lx.Math.randomInteger(1, 2) == 1 ? -1 : 1;
                while (checkSame(randI)) {
                    randI += direction;
                    if (randI == count) randI = 0;
                    else if (randI < 0) randI = count - 1;
                }
            }
            rand.push(randI);
        }
        return rand;
    }

    _resetSequence() {
        this.gamersList.forEach(gamer=>gamer.seq = '?');
        this.model.seqReady = false;
        lx(this.boxes.newGameMenu)>>dice.addClass('pulse');
    }

    _applySequence(seq) {
        lx(this.boxes.newGameMenu)>>dice.removeClass('pulse');
        this.model.seqReady = true;

        let data = [],
            i = 0;
        this.gamersList.forEach(gamer => {
            if (gamer.active)
                data.push({
                    gamerId: gamer.id,
                    gamerColor: gamer.colorId,
                    seq: seq[i++]
                });
        });
        this.getGame().actions.trigger(new lxGames.ootv.ActionApplySequence({sequence: data}));
    }
}

function _prepareBoardsMenu(self) {
    self.getPlugin().on('ENV_gameCreated', ()=>{
        const boardsMenu = self.boxes.boardsMenu,
            slots = lx(boardsMenu)>>board,
            boards = self.getGame().actions.dataProvider.getBoards();

        slots.forEach((slot, i)=>{
            const back = slot.add(lx.Box, {
                size: ['100%', '100%'],
                style: {position: 'absolute'}
            });
            back.style('opacity', '0.6');
            back.fill('black');

            slot.add(lxGames.ootv.BoardSchema, {
                cells: boards[i]
            });
        });
    });
}
