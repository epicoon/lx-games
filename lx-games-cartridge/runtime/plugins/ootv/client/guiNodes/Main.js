// @lx:namespace lxGames.ootv.gui;
class Main extends lx.GuiNode {
	// @lx:behavior lxGames.Tools.EnvironmentItemBehavior;

    initHandlers() {
        const plugin = this.getPlugin();

        this.getElem('butOpenScore').click(()=>plugin.trigger('open.scoreTable'));
        this.getElem('butOpenRules').click(()=>plugin.trigger('open.rules'));

        // End of turn button
        this.getElem('lblTurnEnds').click(()=>{
            this.getElem('lblTurnEnds').hide();
            this.getGame().actions.trigger(new lxGames.ootv.ActionEndTurn());
        });
    }

    subscribeEvents() {
        const plugin = this.getPlugin();

        // End of turn button
        const lblTurnEnds = this.getElem('lblTurnEnds');
        plugin.on('ootv_gamer_move_ends', ()=>lblTurnEnds.show());
        plugin.on('ootv_game_reset', ()=>lblTurnEnds.hide());

        // Hint for the expected action
        plugin.on('ootv_gamer_activated', (e)=>{
            const g = e.data.gamer;
            this.getElem('lblHint').text(lx.i18n(main.move, {gamer: g.getName()}));
        });

        plugin.on('ootv_game_over', ()=>{
            this.getElem('lblHint').text(lx.i18n(main.gameOver));
            lx.ConfirmPopup.open(lx.i18n(main.gameOverQ))
                .confirm(()=>plugin.trigger('open.scoreTable'));
        });
    }
}
