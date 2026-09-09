// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv.dataProvider;
class ActionEndGame extends lxGames.ootv.dataProvider.Action {
    run() {
        this.outputData.add('result', _calcFinalScore(this));
    }
}

function _calcFinalScore(self) {
    const game = self.game;
    let pointsInfo = {};

    for (let i in game.gamers) {
        let g = game.gamers[i],
            gPoints = self.dataProvider.getGamerPoints(g.colorId);

        let dataStorages = g.getTileChips('dataStorage').length,
            credit = g.getTileChips('credit').length;
        // Credit and dataStorages are counted by chips, but the final chips will be sent after this counting.
        // So I need to consider the solar panels count.
        g.forEachAdvTile(tile => {
            if (tile.containsChip({group: lx>>>Const.GROUP_SOLAR_PANEL})) {
                credit++;
                if (g.knows('k2'))
                    dataStorages++;
            }
        });
        if (credit)
            gPoints.push({ code : lx>>>Const.SCORE_CREDIT, info : 0, amt : credit });
        dataStorages = Math.floor(dataStorages * 0.5);
        if (dataStorages)
            gPoints.push({ code : lx>>>Const.SCORE_DATA_STORAGE, info : g.getTileChips('dataStorage').length, amt : dataStorages });

        let minerals = g.getTileChips('minerals0').length +
            g.getTileChips('minerals1').length +
            g.getTileChips('minerals2').length;
        if (minerals)
            gPoints.push({ code : lx>>>Const.SCORE_LOSTMINERALS, info : 0, amt : minerals });

        for (let j=0; j<g.getTileChips('bonus').length; j++) {
            let chip = g.getTileChips('bonus')[j],
                points = (chip.isGroup(lx>>>Const.GROUP_BONUS_MIN)) ? 0 : 3;
            points += game.getGamersCount();
            gPoints.push({ code : lx>>>Const.SCORE_BONUS, info : chip.info.variant, amt : points });
        }

        if (g.knows('k26')) {
            let bonus = g.getTileChips('bonus').length;
            if (bonus)
                gPoints.push({ code : lx>>>Const.SCORE_TECHNOLOGY, info : lx>>>Const.VARIANT_TECHNOLOGY_26, amt : bonus * 2 });
        }

        if (g.knows('k15')) {
            let mineralsTypes = [0, 0, 0, 0, 0, 0];
            for (let j in g.getTileChips('minerals')) {
                let chip = g.getTileChips('minerals')[j];
                mineralsTypes[ chip.info.variant - 1 ] = 1;
            }
            let total = 0;
            for (let j in mineralsTypes) total += mineralsTypes[j];
            if (total)
                gPoints.push({ code : lx>>>Const.SCORE_TECHNOLOGY, info : lx>>>Const.VARIANT_TECHNOLOGY_15, amt : total * 3 });
        }

        if (g.knows('k25')) {
            let minerals = g.getTileChips('minerals').length;
            if (minerals)
                gPoints.push({ code : lx>>>Const.SCORE_TECHNOLOGY, info : lx>>>Const.VARIANT_TECHNOLOGY_25, amt : minerals });
        }

        let splitter = 0,
            telescope = 0,
            assembly = 0,
            lab = 0,
            dronePlant = 0,
            supercomputer = 0,
            tokamak = 0,
            roboport = 0,
            drone = [0, 0, 0, 0];
        g.forEachAdvTile(tile => {
            if (tile.isEmpty()) return;

            let chip = tile.chips[0];
            if ( chip.isGroup(lx>>>Const.GROUP_MODULE) ) {
                switch (chip.getVariant()) {
                    case lx>>>Const.VARIANT_MODULE_ASSEMBLY : assembly++; break;
                    case lx>>>Const.VARIANT_MODULE_SPLITTER : splitter++; break;
                    case lx>>>Const.VARIANT_MODULE_TELESCOPE : telescope++; break;
                    case lx>>>Const.VARIANT_MODULE_LAB : lab++; break;
                    case lx>>>Const.VARIANT_MODULE_DRONE_PLANT : dronePlant++; break;
                    case lx>>>Const.VARIANT_MODULE_SUPERCOMPUTER : supercomputer++; break;
                    case lx>>>Const.VARIANT_MODULE_TOKAMAK : tokamak++; break;
                    case lx>>>Const.VARIANT_MODULE_ROBOPORT : roboport++; break;
                }
                return;
            }

            if ( !chip.isGroup(lx>>>Const.GROUP_DRONE) ) return;
            let gr = Math.floor( (chip.getVariant() - 29) / 3 );
            drone[gr] = 1;
        });

        let drones = 0;
        for (let j in drone) drones += drone[j];

        if (g.knows('k16')) gPoints.push({ code : lx>>>Const.SCORE_TECHNOLOGY, info : lx>>>Const.VARIANT_TECHNOLOGY_16, amt : splitter * 4 });
        if (g.knows('k17')) gPoints.push({ code : lx>>>Const.SCORE_TECHNOLOGY, info : lx>>>Const.VARIANT_TECHNOLOGY_17, amt : telescope * 4 });
        if (g.knows('k18')) gPoints.push({ code : lx>>>Const.SCORE_TECHNOLOGY, info : lx>>>Const.VARIANT_TECHNOLOGY_18, amt : assembly * 4 });
        if (g.knows('k19')) gPoints.push({ code : lx>>>Const.SCORE_TECHNOLOGY, info : lx>>>Const.VARIANT_TECHNOLOGY_19, amt : lab * 4 });
        if (g.knows('k20')) gPoints.push({ code : lx>>>Const.SCORE_TECHNOLOGY, info : lx>>>Const.VARIANT_TECHNOLOGY_20, amt : dronePlant * 4 });
        if (g.knows('k21')) gPoints.push({ code : lx>>>Const.SCORE_TECHNOLOGY, info : lx>>>Const.VARIANT_TECHNOLOGY_21, amt : supercomputer * 4 });
        if (g.knows('k22')) gPoints.push({ code : lx>>>Const.SCORE_TECHNOLOGY, info : lx>>>Const.VARIANT_TECHNOLOGY_22, amt : tokamak * 4 });
        if (g.knows('k23')) gPoints.push({ code : lx>>>Const.SCORE_TECHNOLOGY, info : lx>>>Const.VARIANT_TECHNOLOGY_23, amt : roboport * 4 });
        if (g.knows('k24')) gPoints.push({ code : lx>>>Const.SCORE_TECHNOLOGY, info : lx>>>Const.VARIANT_TECHNOLOGY_24, amt : drones * 4 });

        pointsInfo[i] = gPoints;
    }

    return pointsInfo;
}
