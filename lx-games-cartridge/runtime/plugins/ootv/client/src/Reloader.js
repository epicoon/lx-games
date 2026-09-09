// @lx:namespace lxGames.ootv;
class Reloader {
    constructor(game, condition) {
        this.game = game;
        this.condition = condition;
    }

    run() {
        this.game.activeGamer = this.condition.activeGamer;
        this.game.phase = this.condition.phase;
        this.game.turn = this.condition.turn;
        this.game.dice.applyValue(this.condition.dice);

        _loadColors(this.game, this.condition.colors);
        _loadCommonBoard(this.game, this.condition.board);
        _loadGamers(this.game, this.condition.gamers);

        this.game.status.set(this.condition.status);
    }
}

function _loadColors(game, colors) {
    for (let id in colors)
        game.getGamerById(id).colorId = colors[id];
}

function _loadCommonBoard(game, boardData) {
    for (let i in boardData.chips) {
        let data = boardData.chips[i];

        const chip = (data.gamer)
            ? game.getGamerById(data.gamer).genSequenceChip()
            : game.world.genChip(data.info);

        if (data.turn) chip.turn();
        game.commonBoard.getTile(data.tile).locate(chip);
    }
}

function _loadGamers(game, gamersData) {
    let gamerIndex = 0,
        gamersCount = Object.keys(gamersData).length;
    for (let gamerId in gamersData) {
        let gamerData = gamersData[gamerId];

        const gamer = game.getGamerById(gamerId),
            board = gamer.genBoard(gamerData.board.index, gamersCount, gamerIndex);
        for (let i in gamerData.board.chips) {
            const data = gamerData.board.chips[i],
                chip = game.world.genChip(data.info);
            if (data.tile == 'minerals') chip.turn();
            board.getTile(data.tile).locate(chip);
        }

        gamer.doubleMinerals = gamerData.doubleMinerals;
        gamer.mineralsUsed = gamerData.mineralsUsed;
        gamer.technologies = gamerData.technologies;
        gamer.turn = gamerData.turn;
        gamer.creditUsed = gamerData.creditUsed;

        gamer.pointsInfo = gamerData.pointsInfo;
        let chip100Count = Math.floor(gamerData.points / 100),
            pointsResidue = gamerData.points % 100;
        game.commonBoard.getTile('point' + pointsResidue).locate(gamer.genCounterChip());
        for (let i = 0; i < chip100Count; i++) {
            let chip100 = game.world.genChip100(gamer);
            gamer.getTile('point100').locate(chip100);
        }

        gamer.genDices();
        for (let i in gamerData.dices) {
            let diceData = gamerData.dices[i],
                dice = gamer.dices[i];
            dice.applyValue(diceData.value);
            if (!diceData.active)
                gamer.gamerBoard.getTile('diceRest').locate(dice);
        }

        for (let i in gamerData.jokers) {
            let jokerData = gamerData.jokers[i],
                joker = gamer.genJokerDice();
            if (jokerData.active)
                gamer.gamerBoard.getTile('diceJoker').locate(joker);
            else
                gamer.gamerBoard.getTile('diceRest').locate(joker);
        }

        gamerIndex++;
    }
}
