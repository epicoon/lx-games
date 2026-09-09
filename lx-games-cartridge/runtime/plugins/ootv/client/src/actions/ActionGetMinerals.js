// @lx:namespace lxGames.ootv;
class ActionGetMinerals extends lxGames.ootv.Action {
    process() {
        const game = this.game,
            gamer = game.getGamer(this.responseData.gamer);
        gamer.mineralsUsed = this.responseData.mineralsUsed;
        gamer.doubleMinerals = this.responseData.doubleMinerals;
        (this.responseData.status)
            ? game.status.set(this.responseData.status)
            : game.status.setPending();
    }
}
