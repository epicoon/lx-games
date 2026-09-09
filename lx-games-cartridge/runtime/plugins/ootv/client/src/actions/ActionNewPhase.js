// @lx:namespace lxGames.ootv;
class ActionNewPhase extends lxGames.ootv.Action {
    run() {
        const game = this.game;

        for (let i in this.responseData.chips) {
            let chipData = this.responseData.chips[i];
            this.locateChip(
                game.commonBoard,
                chipData.tile,
                chipData.info
            );
        }

        game.world.cameraSlider.moveToObject(game.commonBoard);

        let minerals = this.responseData.minerals;
        game.phase = this.responseData.phase;
        let mover = new lxGames.ootv.ChipsRelocateBuffer(this.game),
            tile = game.commonBoard.getPhaseTile(game.phase);
        tile.forEachChip((iChip, i) => {
            if (minerals) iChip.setVariant(minerals[i]);
            mover.add(iChip, null, game.commonBoard.getTurnTile(i + 1));
        });
        mover.animate((iChip, shift) => iChip.mesh.rotation.z = -Math.PI * (1 - shift))
            .flush();

        game.triggerLocalEvent('ootv_action_processed');
    }
}
