// @lx:namespace lxGames.ootv;
class ActionNewGame extends lxGames.ootv.Action {
    run() {
        this.game.triggerLocalEvent('ootv_game_starting', this.responseData);

        for (let i in this.responseData.chips) {
            let chipData = this.responseData.chips[i];
            this.locateChip(
                this.game.commonBoard,
                chipData.tile,
                chipData.info,
                chipData.turn
            );
        }

        /**
         * @var gamers {Array} [
         *	{id:'', colorId:'red', ai:false, board:0, chips:[]},
         *	{id:'', colorId:'green', ai:false, board:0, chips:[]}
         * ]
         */
        let gamers = this.responseData.gamers;
        for (let i = gamers.length - 1; i >= 0; i--)
            _prepareGamer(this, gamers[i], gamers.length, i);

        this.game.triggerLocalEvent('ootv_action_processed');
    }
}

function _prepareGamer(self, gamerData, gamersCount, gamerIndex) {
    const game = self.game,
        gamer = game.initGamer(gamerData);

    // Gamer chips
    game.commonBoard.locate('point0', gamer.genCounterChip());
    game.commonBoard.locate('seq0', gamer.genSequenceChip());

    // Gamer board
    const gamerBoard = gamer.genBoard(gamerData.board, gamersCount, gamerIndex);

    // Dices
    gamer.genDices();

    for (let i in gamerData.chips) {
        let chipData = gamerData.chips[i];
        self.locateChip(gamerBoard, chipData.tile, chipData.info);
    }
}
