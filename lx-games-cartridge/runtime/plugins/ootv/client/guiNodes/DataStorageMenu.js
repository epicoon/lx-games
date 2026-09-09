// @lx:namespace lxGames.ootv.gui;
class DataStorageMenu extends lx.GuiNode {
	// @lx:behavior lxGames.Tools.EnvironmentItemBehavior;

    get butM2() { return lx(this.getWidget())>>m2; }
    get butM1() { return lx(this.getWidget())>>m1; }
    get butP2() { return lx(this.getWidget())>>p2; }
    get butP1() { return lx(this.getWidget())>>p1; }
    get butAdd() { return lx(this.getWidget())>>add; }

    init() {
        this.gamer = null;
        this.dice = null;
    }

    initHandlers() {
        lx(this.getWidget())>back.click(()=>_close(this));

        this.butM2.click(()=>_action(this, new lxGames.ootv.ActionIncDice(-2)));
        this.butM1.click(()=>_action(this, new lxGames.ootv.ActionIncDice(-1)));
        this.butP1.click(()=>_action(this, new lxGames.ootv.ActionIncDice( 1)));
        this.butP2.click(()=>_action(this, new lxGames.ootv.ActionIncDice( 2)));
        this.butAdd.click(()=>_action(this, new lxGames.ootv.ActionDiceToDataStorage()));
    }

    subscribeEvents() {
        this.getPlugin().on('open.dataStorageMenu', (e)=>_open(this, e.data.gamer, e.data.dice));
    }
}

function _open(self, gamer, dice) {
    const game = self.getGame();
    const widget = self.getWidget();

    _showBut(self.butM2, dice, -2);
    _showBut(self.butM1, dice, -1);
    _showBut(self.butP1, dice, 1);
    _showBut(self.butP2, dice, 2);

    if ( !gamer.getTileChips('dataStorage').length ) {
        self.butM2.hide();
        self.butM1.hide();
        self.butP1.hide();
        self.butP2.hide();
    }
    if ( !gamer.knows('k8') ) {
        self.butM2.hide();
        self.butP2.hide();
    }

    let bonus = '',
        text = lx.i18n(dataStorageMenu.title);
    if ( gamer.knows('k14') ) bonus = lx.i18n(dataStorageMenu.bonusDataStorage);
    if ( gamer.knows('k13') ) {
        if (bonus == '') bonus = lx.i18n(dataStorageMenu.bonusCredit);
        else bonus += ', ' + lx.i18n(dataStorageMenu.bonusCredit);
    }
    if (bonus != '') text += '. ' + lx.i18n(dataStorageMenu.bonus, {bonus});

    lx(widget)>>add.text(text);
    self.gamer = gamer;
    self.dice = dice;
    self.show();
}

function _showBut(but, dice, modif) {
    but.show();
    let value = dice.value + modif;
    if (value <= 0) value += 6;
    else if (value > 6) value -= 6;
    let text = (modif < 0) ? ('' + modif) : ('+' + modif);
    text += '<span style="font-size: medium">' + ' (' + lx.i18n(dataStorageMenu.to) + ' ' + value + ')' + '</span>';
    but.text(text);
}

function _close(self) {
    self.gamer = null;
    self.dice = null;
    self.hide();
}

function _action(self, action) {
    const plugin = self.getPlugin();
    action.addRequestData({
        gamer: self.gamer.getToken(),
        dice: self.dice.index
    });
    self.getGame().actions.trigger(action);
    self.hide();
}
