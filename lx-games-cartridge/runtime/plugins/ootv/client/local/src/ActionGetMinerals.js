// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv.dataProvider;
class ActionGetMinerals extends lxGames.ootv.dataProvider.Action {
    run() {
        const game = this.game,
            gamer = game.getGamer(this.inputData.gamer),
            tile = game.commonBoard.getTile(this.inputData.tile),
            minerals = tile.chips;

        let map = [-1, -1, -1];
        for (let i = 0; i < 3; i++) {
            let tile = gamer.getTile('minerals' + i);
            if (tile.isEmpty()) continue;
            map[i] = tile.chips[0].getVariant();
        }

        let sortMinerals = [[], [], []];
        for (let i in minerals) {
            let sorted = false;
            for (let j in map) {
                if (minerals[i].isVariant(map[j])) {
                    sortMinerals[j].push(+i);
                    sorted = true;
                }
            }

            if (!sorted)
                for (let j in map) if (map[j] == -1) {
                    map[j] = minerals[i].getVariant();
                    sortMinerals[j].push(+i);
                    break;
                }
        }

        gamer.mineralsUsed = +tile.name[8];

        let chips = [];
        for (let i in sortMinerals)
            for (let j in sortMinerals[i]) {
                chips.push({
                    type: 'tile',
                    toGamer: gamer.colorId,
                    from: tile.name,
                    index: sortMinerals[i][j],
                    to: 'minerals' + i
                });
            }
        this.outputData.add('chips', chips);

        // Check double minerals
        if (!gamer.knows('k5') || gamer.doubleMinerals == 1) {
            gamer.doubleMinerals = 0;
            gamer.mineralsUsed = 0;
        } else {
            let p = gamer.mineralsUsed + 1,
                m = gamer.mineralsUsed - 1;
            if (p > 6) p = 1;
            if (m < 1) m = 6;

            if (game.commonBoard.getTile('minerals' + p).isEmpty()
                && game.commonBoard.getTile('minerals' + m).isEmpty()
            ) {
                gamer.doubleMinerals = 0;
                gamer.mineralsUsed = 0;
            } else {
                gamer.doubleMinerals = 1;
                this.outputData.add('status', lx>>>Const.STATUS_GET_SECOND_MINERAL);
            }
        }
        this.outputData.add('gamer', gamer.colorId);
        this.outputData.add('mineralsUsed', gamer.mineralsUsed);
        this.outputData.add('doubleMinerals', gamer.doubleMinerals);
    }
}
