// @lx:namespace lxGames.ootv.dataProvider;
class ActionNewGame extends lxGames.ootv.dataProvider.Action {
    run() {
        this.dataProvider.packs.clear();
        this.dataProvider.packs.init();
        this.dataProvider.packs.shuffle();

        let chips = [];
        for (let i = 0; i < 25; i++) {
            let minerals = this.getChipInfo('minerals');
            chips.push({
                info: minerals,
                tile: 'st' + (Math.floor(i / 5) + 1),
                turn: true
            });
        }
        for (let i = 0; i < 6; i++) {
            let bmax = this.getChipInfo('bonusMax'),
                bmin = this.getChipInfo('bonusMin');
            chips.push({ info: bmax, tile: 'bmax' + i });
            chips.push({ info: bmin, tile: 'bmin' + i });
        }
        this.outputData.add('chips', chips);

        /**
         * [
         *	{colorId:'red', ai:false},
         *	{colorId:'green', ai:false}
         * ]
         */
        let gamers = this.inputData;
        this.dataProvider.localInit.gamersCount = gamers.length;
        this.dataProvider.localInit.gamerColors = [];
        this.dataProvider.localInit.firstGamer = gamers[0].colorId;
        for (let i = 0; i < gamers.length; i++) {
            let startOptions = this.dataProvider.localInit.prepareGameData[gamers[i].colorId],
                chips = [];
            if (!startOptions) startOptions = {
                board: 0,
                station: 18
            };

            // Central station
            chips.push({
                info: this.getChipInfo('green'),
                tile: 'advLoc' + startOptions.station
            });

            // Start minerals
            let mineralsTiles = { minerals0: null, minerals1: null, minerals2: null };
            for (let i = 0; i < 3; i++) {
                let info = this.getChipInfo('minerals');
                for (let j in mineralsTiles) {
                    if (mineralsTiles[j] === null || mineralsTiles[j] == info.variant) {
                        mineralsTiles[j] = info.variant;
                        chips.push({ info, tile: j });
                        break;
                    }
                }
            }

            // Start credit
            chips.push({
                info: this.getChipInfo('credit'),
                tile: 'credit'
            });

            // Start dataStorages
            let dataStoragesCount = i + 1;
            for (let j = 0; j < dataStoragesCount; j++) {
                chips.push({
                    info: this.getChipInfo('dataStorage'),
                    tile: 'dataStorage'
                });
            }

            gamers[i].board = startOptions.board;
            gamers[i].chips = chips;
            this.dataProvider.localInit.gamerColors.push(gamers[i].colorId);
        }
        this.outputData.add('gamers', gamers);

        this.genSubAction('ActionNewPhase');
    }
}
