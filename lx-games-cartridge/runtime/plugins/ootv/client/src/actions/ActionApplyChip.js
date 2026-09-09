// @lx:namespace lxGames.ootv;
class ActionApplyChip extends lxGames.ootv.Action {
    process() {
        const game = this.game,
            data = this.responseData,
            gamer = game.getGamer(data.gamer);

        if (data.points)
            this.handlePoints(gamer, data.points, data.messages);

        if (data.technology)
            gamer.addTechnology(data.technology);

        if (game.getActiveGamer().isLocal()) {
            game.activeDice = null;
            (data.status !== null)
                ? game.status.set(data.status)
                : game.status.setPending();
        }
    }
}
