// @lx:namespace lxGames.ootv.gui;
class StatusIcon extends lx.GuiNode {
	// @lx:behavior lxGames.Tools.EnvironmentItemBehavior;

    init() {
        this.isActive = false;
    }

    initHandlers() {
        this.getWidget().on('mousemove', ()=>this.getPlugin().trigger('mouse.move'));
    }

    subscribeEvents() {
        const plugin = this.getPlugin(),
            icon = this.getWidget();

        this.getPlugin().on('mouse.down', ()=>{
            if (this.isActive) icon.hide();
        });
        this.getPlugin().on('mouse.up', ()=>{
            if (this.isActive) icon.show();
            _locate(icon, lx.app.mouse.x, lx.app.mouse.y);
        });

        this.getPlugin().on('mouse.move', ()=>{
            const statusIcon = this.getWidget();
            if ( !statusIcon.visibility() ) return;
            _locate(statusIcon, lx.app.mouse.x, lx.app.mouse.y);
            statusIcon.returnToParentScreen();
        });

        plugin.on('ootv_active_dice_changed', (e)=>{
            const statusIcon = this.getWidget();
            statusIcon.picture('dice' + e.data.newDice.value + '.png');
            _locate(statusIcon, lx.app.mouse.x, lx.app.mouse.y);
        });

        plugin.on('ootv_status_changed', (e)=>_onChangeStatus(this));
    }
}

function _onChangeStatus(self) {
    const game = self.getGame();

    if (game.status.isPending()) {
        self.hide();
        self.isActive = false;
        return;
    }

    if (game.getActiveGamer() && game.getActiveGamer().AI) return;

    let pic = null;
    switch (true) {
        case game.status.isGetMinerals():       pic = 'getMinerals.png'; break;
        case game.status.isGetSecondMinerals(): pic = 'getMinerals2.png'; break;
        case game.status.isUseDice():
            let val = self.getGame().activeDice.value;
            pic = (val === 7) ? 'diceJoker.png' : 'dice' + val + '.png';
            break;
        case game.status.isUseCredit():   pic = 'energyCredit.png'; break;
        case game.status.isSplit():       pic = 'splitMatter.png'; break;
        case game.status.isGetModule(): pic = 'getModule.png'; break;
        case game.status.isGetPCK():      pic = 'getPCK.png'; break;
        case game.status.isGetDP():       pic = 'getDP.png'; break;
        case game.status.isSetChip():     pic = 'setChip.png'; break;
    }
    if (pic) _start(self, pic);
}

function _locate(icon, x, y) {
    icon.left(x + 5 + 'px');
    icon.top(y - icon.height('px') - 5 + 'px');
}

function _start(self, pic) {
    const icon = self.getWidget();
    icon.picture(pic);
    icon.show();
    self.isActive = true;
    _locate(icon, lx.app.mouse.x, lx.app.mouse.y);
}
