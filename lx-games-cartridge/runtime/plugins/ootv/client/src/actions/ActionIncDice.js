// @lx:namespace lxGames.ootv;
class ActionIncDice extends lxGames.ootv.Action {
    constructor(value) {
        super();
        this.requestData.value = value;
    }

    process() {
        const game = this.game,
            data = this.responseData,
            gamer = game.getGamer(data.gamer),
            dice = gamer.getDice(data.dice);

        dice.applyValue(data.value);

        game.world.clearSpiritStuff();
        game.triggerLocalEvent('ootv_active_dice_changed', {newDice: dice});
    }
}
