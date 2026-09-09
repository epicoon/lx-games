// @lx:namespace lxGames.ootv;
class Action extends lxGames.actions.RequestAction {
    run() {
        this.applyGamerPoints();

        if (this.responseData.delChips) {
            let delList = this.responseData.delChips;
            if (delList.tile) delList = [delList];
            for (let i in delList) {
                let delInfo = delList[i],
                    board = delInfo.gamer
                        ? this.game.getGamer(delInfo.gamer).gamerBoard
                        : this.game.commonBoard;
                board.getTile(delInfo.tile).delChips(delInfo.count);
            }
        }

        if (!this.responseData.chips) {
            this.process();
            this.game.triggerLocalEvent('ootv_action_processed');
        } else this.moveChips(this.responseData.chips, ()=>{
            this.process();
            this.game.triggerLocalEvent('ootv_action_processed');
        });
    }

    process() {
        // pass
    }

    locateChip(board, tile, info, turn) {
        const chip = board.game.world.genChip(info);
        if (turn) chip.turn();
        board.getTile(tile).locate(chip);
    }

    moveChips(chips, callback = null) {
        if (!chips.length) {
            if (callback) callback();
            return;
        }

        if (!lx.isArray(chips[0]))
            chips = [chips];
        let list = [];
        for (let i in chips)
            if (chips[i].length) list.push(chips[i]);

        if (!list.length) {
            if (callback) callback();
            return;
        }

        const game = this.game;

        for (let i in list) {
            let chips = list[i],
                mover = new lxGames.ootv.ChipsRelocateBuffer(game);
            for (let j in chips) {
                let chipData = chips[j],
                    fromGamerColor = chipData.fromGamer || chipData.gamer || null,
                    toGamerColor = chipData.toGamer || chipData.gamer || null,
                    fromGamer = fromGamerColor ? game.getGamer(fromGamerColor) : null,
                    toGamer = toGamerColor ? game.getGamer(toGamerColor) : null;

                switch (chipData.type) {
                    case 'new': {
                        let gamer = game.getGamer(chipData.gamer),
                            from = gamer.getTile(chipData.from),
                            to = gamer.getTile(chipData.to),
                            chip;
                        if (chipData.info == 'joker') {
                            chip = gamer.genJokerDice();
                        } else {
                            let info = (chipData.info instanceof lxGames.ootv.ChipInfo)
                                ? chipData.info
                                : lxGames.ootv.ChipInfo.create(chipData.info);
                            chip = game.world.genChip(info);
                        }
                        mover.add(chip, from, to);
                    } break;
                    case 'dice': {
                        let dice = fromGamer.getDice(chipData.index);
                        mover.add(dice, null, toGamer.getTile(chipData.to));
                    } break;
                    case 'tile': {
                        let fromTile = fromGamer
                            ? fromGamer.getTile(chipData.from)
                            : game.commonBoard.getTile(chipData.from);
                        let toTile = toGamer
                            ? toGamer.getTile(chipData.to)
                            : game.commonBoard.getTile(chipData.to);
                        let chips = (chipData.index !== undefined)
                            ? [fromTile.chips[chipData.index]]
                            : fromTile.chips;
                        for (let i in fromTile.chips) {
                            let chip = fromTile.chips[i];
                            game.pulsator.dropChip(chip);
                        }
                        chips.forEach(chip=>{
                            if (chipData.turn) chip.turn();
                            mover.add(chip, null, toTile);
                        });
                    } break;
                    case 'sequenceChip': {
                        let gamer = game.getGamer(chipData.gamer),
                            chip = gamer.sequenceChip;
                        mover.add(
                            chip,
                            null,
                            game.commonBoard.getSequenceTile(chip.tile.pos + 1)
                        );
                    } break;
                }
            }

            (i == list.length - 1)
                ? mover.flush().then(callback)
                : mover.flush();
        }
    }

    applyGamerPoints() {
        if (!this.responseData.pointDetails) return;
        for (let token in this.responseData.pointDetails) {
            let list = this.responseData.pointDetails[token],
                gamer = this.game.getGamer(token);
            gamer.pointsInfo.lxMerge(list);
        }
    }

    handlePoints(gamer, points, messages) {
        const game = this.game;
        gamer.points += points;
        let mover = new lxGames.ootv.ChipsRelocateBuffer(game),
            pos = gamer.counterChip.tile.pos,
            newPos = pos + points,
            edge = 100;
        if (newPos >= edge) {
            newPos -= edge;
            let chip100 = game.world.genChip100(gamer);
            gamer.counterChip.tile.locate(chip100);
            mover.add(chip100, null, gamer.getTile('point100'));
        }
        mover.add(gamer.counterChip, null, game.commonBoard.getTile('point' + newPos));
        mover.flush().then(()=>{
            game.triggerLocalEvent('floatPoints', {messages});
        });
    }
}
