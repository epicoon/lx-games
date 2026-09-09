// @lx:namespace lxGames.ootv;
class ActionNewTurn extends lxGames.ootv.Action {
    run() {
        const game = this.game;
        game.forEachGamer(gamer=>gamer.nextTurn());
        game.turn = this.responseData.turn;

        const dices = [ game.dice ];
        for (let i in game.gamers) {
            dices.push( game.gamers[i].dices[0] );
            dices.push( game.gamers[i].dices[1] );
        }
        game.diceAnimator.on(dices, ()=>{
            _applyDiceValues(dices, this.responseData.dices);
            game.turn = this.responseData.turn;
            _playOffTurnMinerals(game, this.responseData.activeGamer);
        });
    }
}

function _applyDiceValues(dices, diceValues) {
    for (let i in dices) {
        let dice = dices[i];
        dice.applyValue(dice.getGamer()
            ? diceValues[dice.gamerToken][dice.index]
            : diceValues.game
        );
    }
}

function _playOffTurnMinerals(game, activeGamerToken) {
    let mover = new lxGames.ootv.ChipsRelocateBuffer(game),
        tile = game.commonBoard.getTurnTile(game.turn),
        chip = tile.chips[0],
        dest = game.commonBoard.getTile('minerals' + game.dice.value);
    mover.add(chip, null, dest)
        .flush()
        .then(()=>{
            game.activeGamer = activeGamerToken;
            const gamer = game.getActiveGamer();
            gamer.activate();

            game.triggerLocalEvent('ootv_action_processed');
        });
}
