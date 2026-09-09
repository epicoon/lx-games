// @lx:namespace lxGames.ootv.gui;
class Rules extends lx.GuiNode {
	// @lx:behavior lxGames.Tools.EnvironmentItemBehavior;

    initHandlers() {
        this.getElem('closeBut').click(()=>this.hide());
    }

    subscribeEvents() {
        this.getPlugin().on('open.rules', ()=>this.show());
    }
}
