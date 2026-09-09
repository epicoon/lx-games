// @lx:namespace lxGames.ootv.dataProvider;
class ActionNewTurn extends lxGames.ootv.dataProvider.Action {
    run() {
        const game = this.game;
        game.forEachGamer(gamer=>gamer.nextTurn());
        game.turn++;
        this.outputData.add('turn', game.turn);
        this.outputData.add('dices', _getDices(this.dataProvider, game));
        this.outputData.add('activeGamer', this.dataProvider.findNextGamer());
    }
}

function _getDices(dataProvider, game) {
    let dices = { game: lx.Math.randomInteger(1, 6) };

    if (game.gamers.lxEmpty()) {
        for (let i in dataProvider.localInit.gamerColors)
            dices[dataProvider.localInit.gamerColors[i]] = [
                lx.Math.randomInteger(1, 6),
                lx.Math.randomInteger(1, 6)
            ];
    } else {
        for (let colorId in game.gamers)
            dices[colorId] = [
                lx.Math.randomInteger(1, 6),
                lx.Math.randomInteger(1, 6)
            ];
    }

    return dices;
}
