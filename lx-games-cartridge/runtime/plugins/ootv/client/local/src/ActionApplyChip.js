// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv.dataProvider;
class ActionApplyChip extends lxGames.ootv.dataProvider.Action {
    /* this.inputData:
     *    - gamer {String} (: gamer color id :)
     *    - from {String} (: waiting tile name :)
     *    - to {String} (: barony tile name :)
     *    - [dice] {Number} (: dice index :)
     */
    run() {
        const game = this.game,
            gamer = game.getGamerByColor(this.inputData.gamer),
            chip = gamer.getTile(this.inputData.from).chips[0],
            tile = gamer.getTile(this.inputData.to),
            dice = gamer.getDice(this.inputData.dice);

        let data = {
            gamer: gamer.colorId,
            chips: [ [], [] ],
            points: 0,
            messages: [],
            technology: null,
            status: null
        };

        if (dice) data.chips[0].push({
            type: 'dice',
            gamer: gamer.colorId,
            index: dice.index,
            to: 'diceRest'
        });
        data.chips[0].push({
            type: 'tile',
            gamer: gamer.colorId,
            from: chip.tile.name,
            to: tile.name
        });

        _applyResult(this, gamer, chip, tile, data);

        for (let i in data)
            this.outputData.add(i, data[i]);
    }
}

function _applyResult(self, gamer, chip, tile, data) {
    const game = gamer.getGame();

    switch (true) {
        case chip.isGroup(lx>>>Const.GROUP_PROBE): _onProbe(data, game, gamer); break;
        case chip.isGroup(lx>>>Const.GROUP_DRONE): _onDrone(self, data, gamer, chip, tile); break;
        case chip.isGroup(lx>>>Const.GROUP_STATION): _onStation(data, gamer, tile); break;
        case chip.isVariant(lx>>>Const.VARIANT_MODULE_SUPERCOMPUTER): _onSupercomputer(self, data, gamer, tile); break;
        case chip.isVariant(lx>>>Const.VARIANT_MODULE_TOKAMAK): _onTokamak(self, data, gamer, tile); break;
        case chip.isVariant(lx>>>Const.VARIANT_MODULE_TELESCOPE): _onTelescope(self, data, gamer); break;
        case chip.isVariant(lx>>>Const.VARIANT_MODULE_SPLITTER): _onSplitter(data, gamer); break;
        case chip.isVariant(lx>>>Const.VARIANT_MODULE_ASSEMBLY): _onAssembly(data, game); break;
        case chip.isVariant(lx>>>Const.VARIANT_MODULE_LAB): _onLab(data, game); break;
        case chip.isVariant(lx>>>Const.VARIANT_MODULE_DRONE_PLANT): _onDronePlant(data, game); break;
        case chip.isVariant(lx>>>Const.VARIANT_MODULE_ROBOPORT): _onRoboport(data, gamer, chip); break;
    }

    // By filling the area -> points
    let area = gamer.gamerBoard.getArea(tile),
        filled = true;
    for (let i in area)
        if (area[i] != tile && area[i].isEmpty()) { filled = false; break; }
    if (filled) {
        let tab = [1, 3, 6, 10, 15, 21, 28, 36],
            fillPoints = tab[ area.length - 1 ],
            phaseBonus = 12 - game.phase * 2;
        data.points += fillPoints + phaseBonus;
        self.addGamerPoints(gamer, {
            code : lx>>>Const.SCORE_FILL,
            info : area.length,
            amt : fillPoints
        });
        self.addGamerPoints(gamer, {
            code : lx>>>Const.SCORE_FILLBONUS,
            info : game.phase,
            amt : phaseBonus
        });
        let totalPoints = fillPoints + phaseBonus;
        data.messages.push(lx.i18n(applyChip.fill, {points: totalPoints}));
    }

    // By filling the whole group -> get a bonus
    let fullGroup = [];
    gamer.forEachAdvTile(iTile => {
        if (iTile.isGroup(tile.getGroup())) fullGroup.push(iTile);
    });
    filled = true;
    for (let i in fullGroup) {
        let l = fullGroup[i];
        if (l != tile && l.isEmpty()) { filled = false; break; }
    }
    if (filled) {
        let bMax = game.commonBoard.getTile('bmax' + chip.getGroup()),
            bMin = game.commonBoard.getTile('bmin' + chip.getGroup());
        if (bMax.containsChip())
            data.chips[1].push({
                type: 'tile',
                from: 'bmax' + chip.getGroup(),
                toGamer: gamer.colorId,
                to: 'bonus'
            });
        else if (bMin.containsChip())
            data.chips[1].push({
                type: 'tile',
                from: 'bmin' + chip.getGroup(),
                toGamer: gamer.colorId,
                to: 'bonus'
            });
    }

    // Note the technology
    if (chip.isGroup(lx>>>Const.GROUP_TECHNOLOGY))
        data.technology = chip.getVariant();
}

function _onProbe(data, game, gamer) {
    // Change move sequence
    data.chips[1].push({
        type: 'sequenceChip',
        gamer: gamer.colorId
    });

    // Opportunity to get minerals
    let minerals = false;
    for (let i=1; i<7; i++)
        if (game.commonBoard.getTile('minerals' + i).containsChip()) { minerals = true; break; }
    if (minerals)
        data.status = lx>>>Const.STATUS_GET_MINERAL;
}

function _onDrone(self, data, gamer, chip, tile) {
    let count = 0,
        droneGr = Math.floor( (chip.getVariant() - 29) / 3 ),
        area = gamer.gamerBoard.getArea(tile);
    area.push(chip.tile);

    for (let i in area) {
        let l = area[i];
        if (l.isEmpty()) continue;

        let val = l.chips[0].getVariant() - 29,
            gr = Math.floor( val / 3 ),
            tp = val % 3,
            bonus = (gamer.knows('k7')) ? 1 : 0;
        if (gr == droneGr) count += (2 + tp + bonus);
    }

    data.points += count;
    self.addGamerPoints(gamer, {
        code : lx>>>Const.SCORE_DRONE,
        info : droneGr + '.' + ((chip.getVariant() - 29) % 3 + 2),
        amt : count
    });
    data.messages.push(lx.i18n(applyChip.drones, {points: count}));
}

function _onStation(data, gamer, tile) {
    data.chips[1].push({
        type: 'new',
        gamer: gamer.colorId,
        info: 'joker',
        from: tile.name,
        to: 'diceJoker'
    });
}

function _onSupercomputer(self, data, gamer, tile) {
    for (let i=0; i<4; i++) {
        data.chips[1].push({
            type: 'new',
            gamer: gamer.colorId,
            info: self.getChipInfo('dataStorage'),
            from: tile.name,
            to: 'dataStorage'
        });
    }
}

function _onTokamak(self, data, gamer, tile) {
    for (let i=0; i<2; i++) {
        data.chips[1].push({
            type: 'new',
            gamer: gamer.colorId,
            info: self.getChipInfo('credit'),
            from: tile.name,
            to: 'credit'
        });
    }
}

function _onTelescope(self, data, gamer) {
    data.points += 4;
    self.addGamerPoints(gamer, {
        code : lx>>>Const.SCORE_TELESCOPE,
        info : 0,
        amt : 4
    });
    data.messages.push(lx.i18n(applyChip.telescope));
}

function _onSplitter(data, gamer) {
    let minerals = false;
    for (let i = 0; i < 3; i++)
        if (gamer.getTile('minerals' + i).containsChip()) { minerals = true; break; }
    if (minerals)
        data.status = lx>>>Const.STATUS_SPLIT;
}

function _onAssembly(data, game) {
    let chipExists = game.commonBoard.checkEachAdvTile(
        tile => tile.containsChip({group: lx>>>Const.GROUP_MODULE})
    );
    if (chipExists)
        data.status = lx>>>Const.STATUS_GET_MODULE;
}

function _onLab(data, game) {
    let chipExists = game.commonBoard.checkEachAdvTile(
        tile => tile.containsChip({group: [
            lx>>>Const.GROUP_SOLAR_PANEL,
            lx>>>Const.GROUP_STATION,
            lx>>>Const.GROUP_TECHNOLOGY
        ]})
    );
    if (chipExists)
        data.status = lx>>>Const.STATUS_GET_PCK;
}

function _onDronePlant(data, game) {
    let chipExists = game.commonBoard.checkEachAdvTile(
        tile => tile.containsChip({group: [
            lx>>>Const.GROUP_DRONE,
            lx>>>Const.GROUP_PROBE
        ]})
    );
    if (chipExists)
        data.status = lx>>>Const.STATUS_GET_DP;
}

function _onRoboport(data, gamer, chip) {
    let chipExist = false;
    for (let i = 0; i < 3; i++) {
        let tile = gamer.getTile('advWait' + i);
        if (tile.containsChip() && tile.chips[0] !== chip) { chipExist = true; break; }
    }
    //TODO - check set chip opportunity
    if (chipExist)
        data.status = lx>>>Const.STATUS_SET_CHIP;
}
