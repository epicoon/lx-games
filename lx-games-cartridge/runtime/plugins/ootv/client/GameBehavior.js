// @lx:macros Const {lxGames.ootv.Constants};

lx.import(
    lxGames.Tools,
    lxGames.threed.World,
    lxGames.threed.GeometryCutBox,
    'NewGameMenuState',
    '-R src/'
);

// @lx:namespace lxGames.ootv;
class GameBehavior extends lx.Behavior {
    // abstract
    // reset()
    // isLocal() {}
    // getGuiExtender()
    // isUntouchable() {}
    // initGamer(params) {}
    // getGamer(token) {}

    construct() {
        this.isReady = false;
        this.options = {
            speed: 300
        };

        this.commonBoard = null;
        this.dice = null;
        this.phase = null;
        this.turn = 0;

        this.status = new lxGames.ootv.Status(this);
        this.isSplittingMinerals = false;
        this.activeGamer = null;
        this.activeDice = null;

        this.diceAnimator = new lxGames.ootv.DiceAnimator(this);
        this.pulsator = new lxGames.ootv.Pulsator(this);

        _subscribeEvents(this);

        this.world = new lxGames.ootv.World({
            game : this,
            canvas : lx(this.getPlugin())>>canvas,
            lights : [ 0x000000, 0x777777, 0xffffff ],
            cameraPosition : {x:0, y:1033, z:1033},
            cameraConfig: {
                watchForObjects: false,
                followMouse: false,
                speed: 0.5,
                scrollSpeed: 10,
                limits: {
                    x: [-700, 700],
                    y: [200, 4000],
                    z: [500, 4000]
                }
            }
        });
        this.world.createTable();

        _prepareField(this);
        this.isReady = true;
    }

    getActiveGamer() {
        if (!this.activeGamer) return null;
        return this.gamers[this.activeGamer];
    }

    onLocalEvent(eventName, callback) {
        this.getPlugin().on(eventName, callback);
    }

    onStatusChange() {
        if (this.status.isOver()) return;

        if (this.status.isAI()) {
            this.ai.setGamer( this.getActiveGamer() );
            return;
        }
        if (this.getActiveGamer() && this.getActiveGamer().AI) {
            this.status.setAI();
            return;
        }

        if (this.activeGamer && this.status.isPending()) {
            const gamer = this.getActiveGamer();
            if (gamer.isLocal() && !gamer.hasActions())
                this.triggerLocalEvent('ootv_gamer_move_ends');
        }
    }

    checkChipClick(e) {
        if ( this.activeGamer && this.getActiveGamer().AI ) return;

        let chip = e.data.chip,
            intersectPoint = e.data.point;

        switch (true) {
            case this.status.isPending(): this.checkChipWhilePending(chip); break;
            case this.status.isUseCredit(): this.checkChipOnUseCredit(chip); break;
            case this.status.isUseDice(): this.checkChipOnUseDice(chip, intersectPoint); break;

            case this.status.isGetMinerals():
            case this.status.isGetSecondMinerals(): this.checkGetMinerals(chip); break;
            case this.status.isSplit(): this.checkSplit(chip); break;

            case this.status.isGetModule(): this.checkGetChip(chip, [
                lx>>>Const.GROUP_MODULE
            ]); break;
            case this.status.isGetPCK(): this.checkGetChip(chip, [
                lx>>>Const.GROUP_SOLAR_PANEL,
                lx>>>Const.GROUP_STATION,
                lx>>>Const.GROUP_TECHNOLOGY
            ]); break;
            case this.status.isGetDP(): this.checkGetChip(chip, [
                lx>>>Const.GROUP_DRONE,
                lx>>>Const.GROUP_PROBE
            ]); break;

            case this.status.isSetChip(): this.checkSetChip(chip); break
        }
    }

    checkChipWhilePending(chip) {
        if (!chip.isChip()) return;

        if ( chip.isTileType(lx>>>Const.TILE_DICE_GAMER) ) {
            if ( !chip.isOwner(this.getActiveGamer()) ) return;
            if ( chip.tile.name == 'diceRest' ) return;

            this.activeDice = chip;
            this.status.setUseDice();
            return;
        }

        if ( chip.isGroup(lx>>>Const.GROUP_CREDIT) ) {
            if ( !chip.isOwner(this.getActiveGamer()) ) return;
            if ( chip.tile.chipsCount() < 2 ) return;
            if ( this.getActiveGamer().creditUsed ) return;

            this.status.setUseCredit();
            return;
        }

        if ( chip.isTileType(lx>>>Const.TILE_ADVANTAGE_WAITING) && chip.isOwner(this.getActiveGamer()) ) {
            lx.ConfirmPopup.open(lx.i18n(common.DropChipConfirm))
                .confirm(()=>{
                    this.actions.trigger(new lxGames.ootv.ActionDelChip({
                        gamer: this.getActiveGamer().getToken(),
                        tile: chip.tile.name
                    }));
                });
        }
    }

    checkChipOnUseCredit(chip) {
        if (!chip.isChip()) return;

        const gamer = this.getActiveGamer();

        if (chip.isGroup(lx>>>Const.GROUP_CREDIT) && chip.isOwner(gamer)) {
            this.status.setPending();
            return;
        }

        if ( gamer.creditUsed ) return;
        if ( gamer.getFreeAdvKeeper() == null ) return;

        if (chip.isTileType(lx>>>Const.TILE_ADVANTAGE_FORSALE)
            || (gamer.knows('k6') && chip.isTileType(lx>>>Const.TILE_ADVANTAGE_DICE))
    ) {
            this.actions.trigger(new lxGames.ootv.ActionBuyChip({
                gamer: gamer.getToken(),
                tile: chip.tile.name
            }));
        }
    }

    checkChipOnUseDice(chip, intersectPoint) {
        if (chip.lxHasMethod('checkOnUseDice')) {
            chip.checkOnUseDice(intersectPoint);
        }
    }

    checkGetMinerals(chip) {
        if (!chip.isChip()) return;
        if (!chip.isTileType(lx>>>Const.TILE_MINERALS_INGAME)) return;

        const gamer = this.getActiveGamer();

        if ( gamer.doubleMinerals == 1 ) {
            let old = +gamer.mineralsUsed,
                now = +chip.tile.name[8],
                m = old - 1,
                p = old + 1;
            if (m < 1) m += 6;
            if (p > 6) p -= 6;

            if ( now != p && now != m ) return;
        }

        this.actions.trigger(new lxGames.ootv.ActionGetMinerals({
            gamer: gamer.getToken(),
            tile: chip.tile.name
        }));
    }

    checkSplit(chip) {
        if (!chip.isChip()) return;
        if (!chip.isTileType(lx>>>Const.TILE_MINERALS_INGAMER)) return;

        const gamer = this.getActiveGamer();
        if ( chip.getOwner() !== gamer ) return;

        this.actions.trigger(new lxGames.ootv.ActionSplitMinerals({
            gamer: gamer.getToken(),
            tile: chip.tile.name
        }));
    }

    checkGetChip(chip, availableGroups) {
        if (!chip.isChip()) return;

        const gamer = this.getActiveGamer();
        if (!chip.isTileType(lx>>>Const.TILE_ADVANTAGE_DICE)) return;
        if (!chip.isGroup(availableGroups)) return;
        if (!gamer.getFreeAdvKeeper()) return;

        this.actions.trigger(new lxGames.ootv.ActionGetChip({
            gamer: gamer.getToken(),
            tile: chip.tile.name,
            dice: null
        }));
    }

    checkSetChip(chip) {
        const gamer = this.getActiveGamer();

        if (chip instanceof lxGames.ootv.SpiritChip) {
            chip.apply();
            return;
        }

        if (!chip.isChip()) return;
        if (chip.isTileType(lx>>>Const.TILE_ADVANTAGE_WAITING) && chip.isOwner(gamer))
        gamer.tryFindPlace(chip, 7);
    }
}

function _subscribeEvents(self) {
    /*
    Events:
        - ootv_status_changed
        - ootv_gamer_activated
        - mouse.chipClicked
        - ootv_active_dice_changed
        - ootv_gamer_move_ends
        - ootv_game_over
    */

    const plugin = self.getPlugin();
    plugin.on('ootv_status_changed', [self, self.onStatusChange]);
    plugin.on('mouse.chipClicked', [self, self.checkChipClick]);
    plugin.on('ENV_gameCreated', ()=>{
        self.guiExtender.apply();
    });
}

function _prepareField(self) {
    self.commonBoard = new lxGames.ootv.CommonBoard(self);
    self.dice = new lxGames.ootv.Dice(self, null, 0);
    self.commonBoard.locate('dice', self.dice);
}
