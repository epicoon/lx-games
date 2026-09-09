// @lx:macros Const {lxGames.ootv.Constants};

// @lx:namespace lxGames.ootv;
class GamerBehavior extends lx.Behavior {
    // abstact
    // getToken()
    // onClear()

    behaviorConstructor() {
        this.colorId = null;
        this.gamerBoard = null;
        this.counterChip = null;
        this.sequenceChip = null;
        this.dices = [null, null];
        this.technologies = [];

        this.points = 0;
        this.pointsInfo = [];
        this.turn = 0;
        this.dicesPlayed = false;
        this.creditUsed = false;

        this.diceJoker = [];
        this.doubleMinerals = 0;
        this.mineralsUsed = 0;
    }

    clear() {
        this.gamerBoard.clear();
        this.gamerBoard = null;
        this.counterChip = null;
        this.sequenceChip = null;
        this.dices = [null, null];
        this.technologies = [];

        this.points = 0;
        this.pointsInfo = [];
        this.turn = 0;
        this.dicesPlayed = false;
        this.creditUsed = false;

        this.diceJoker = [];
        this.doubleMinerals = 0;
        this.mineralsUsed = 0;

        this.onClear();
    }

    resetTurn() {
        this.turn = 0;
    }

    nextTurn() {
        this.getTile('dice0').locate( this.dices[0] );
        this.getTile('dice1').locate( this.dices[1] );
        this.getTile('diceJoker').delChips();
        this.getTile('diceRest').delChips();
        this.diceJoker = [];
        this.dicesPlayed = false;

        this.creditUsed = false;

        this.doubleMinerals = 0;
        this.mineralsUsed = 0;
    }

    getDice(index) {
        if (!lx.isNumber(index)) return null;
        if (index < 2) return this.dices[index];
        index -= 2;
        return this.diceJoker[index] || null;
    }

    getColorKey() {
        return lx>>>Const.GAMERS[this.colorId].color;
    }

    genChip() {
        let chip = new lxGames.ootv.Chip(this.getGame(), this),
            color = this.getColorKey();
        chip.create({ face : color, side : color, back: color });
        return chip;
    }

    genBoard(type, gamersCount, gamerIndex) {
        if (this.gamerBoard) this.gamerBoard.clear();
        this.gamerBoard = new lxGames.ootv.GamerBoard(this.getGame(), this, type);
        this.gamerBoard.setPosition(_calculateGamerBoardPosition(this.getGame(), gamersCount, gamerIndex));
        return this.gamerBoard;
    }

    genCounterChip() {
        this.counterChip = this.genChip();
        return this.counterChip;
    }
    
    genSequenceChip() {
        this.sequenceChip = this.genChip();
        return this.sequenceChip;
    }

    genDices() {
        this.dices[0] = new lxGames.ootv.Dice(this.getGame(), this, 0);
        this.dices[1] = new lxGames.ootv.Dice(this.getGame(), this, 1);

        this.getTile('dice0').locate(this.dices[0]);
        this.getTile('dice1').locate(this.dices[1]);
    }

    activate() {
        this.turn++;
        this.focus();
    }

    focus() {
        if (!this.AI) this.getGame().world.cameraSlider.moveToObject( this.gamerBoard, lx>>>Const.STATUS_PENDING );
        else {
            //TODO all 3D math should live in world
            let v0 = this.getGame().commonBoard.mesh.position,
                v1 = this.gamerBoard.mesh.position,
                v = new THREE.Vector3();
            v.subVectors( v1, v0 );
            v.multiplyScalar( 0.5 );
            v.addVectors( v0, v );
            this.getGame().world.cameraSlider.moveToPosition( v, lx>>>Const.STATUS_PENDING, 1500 );
        }

        this.getGame().triggerLocalEvent('ootv_gamer_activated', {gamer: this});
    }

    hasActions() {
        return this.hasTileChips('dice0')
            || this.hasTileChips('dice1')
            || this.hasTileChips('diceJoker');
    }

    getTile(key) {
        return this.gamerBoard.tiles[key];
    }

    hasTileChips(key) {
        return this.getTile(key).containsChip();
    }

    getTileChips(key) {
        return this.getTile(key).chips;
    }

    genJokerDice() {
        const dice = new lxGames.ootv.Dice(this.getGame(), this, this.diceJoker.length + 2);
        this.diceJoker.push(dice);
        dice.applyValue(7);
        return dice;
    }

    addTechnology(val) {
        this.technologies['k' + (val - 2)] = true;
    }

    knows(k) {
        return (k in this.technologies);
    }

    getFreeAdvKeeper() {
        for (let i = 0; i < 3; i++)
            if (!this.hasTileChips('advWait' + i))
                return this.gamerBoard.getTile('advWait' + i);
    }

    forEachAdvTile(f) {
        for (let i=0; i<37; i++) {
            let tile = this.getTile('advLoc' + i);
            f(tile, i);
        }
    }

    tryFindPlace(chip, diceValue = null) {
        this.getGame().world.clearSpiritStuff();

        let dice = diceValue ?? this.getGame().activeDice.value,
            availableDiceValues;

        if (dice == 7) availableDiceValues = [1, 2, 3, 4, 5, 6];
        else if (
            ( this.knows('k9') && chip.isGroup(lx>>>Const.GROUP_MODULE) )
            || ( this.knows('k10') && chip.isGroup([lx>>>Const.GROUP_PROBE, lx>>>Const.GROUP_DRONE]) )
            || ( this.knows('k11') && chip.isGroup([lx>>>Const.GROUP_STATION, lx>>>Const.GROUP_SOLAR_PANEL, lx>>>Const.GROUP_TECHNOLOGY]) )
        ) {
            let p = dice + 1,
                m = dice - 1;
            if (p > 6) p -= 6;
            if (m < 1) m += 6;
            availableDiceValues = [dice, p, m];
        } else availableDiceValues = [dice];

        let locs = _findPlace(this, chip, availableDiceValues);
        if (locs.length)
            this.getGame().world.createSpiritStuff(chip, locs);
    }
}

function _findPlace(self, chip, availableDiceValues) {
    let tiles = [];
    self.forEachAdvTile(tile => {
        if (tile.containsChip()
            || !chip.isGroup(tile.group)
            || !availableDiceValues.includes(tile.dice)
        ) return;

        //TODO switch to a tile status - blocked, candidate, filled
        let neib = self.gamerBoard.getAdvTileNeibors(tile),
            filled = false;
        for (let j in neib) if (neib[j].containsChip()) { filled = true; break; }
        if (!filled) return;

        if (chip.isGroup(lx>>>Const.GROUP_MODULE) && !self.knows('k1')) {
            let area = self.gamerBoard.getArea(tile);
            for (let j in area)
                if (area[j].containsChip({variant: chip.getVariant()}))
                    return;
        }

        tiles.push(tile);
    });
    return tiles;
}

function _calculateGamerBoardPosition(game, gamersCount, gamerIndex) {
    let indent = lx>>>Const.FIELD_SIZE * 0.02,
        planW = lx>>>Const.FIELD_SIZE * 0.7,
        planD = planW * 0.723,
        zShift = (game.commonBoard.sizes[2] + planD) * 0.5 + indent,
        xShift = (planW + indent) * 0.5;
    let positionsMap = (gamersCount == 3)
        ? [ [-xShift, 0, zShift], [xShift, 0, zShift], [0, 0, -zShift] ]
        : [ [-xShift, 0, zShift], [xShift, 0, zShift], [-xShift, 0, -zShift], [xShift, 0, -zShift] ];
    return positionsMap[gamerIndex];
}
