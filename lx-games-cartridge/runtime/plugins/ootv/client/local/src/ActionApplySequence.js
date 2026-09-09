// @lx:namespace lxGames.ootv.dataProvider;
class ActionApplySequence extends lxGames.ootv.dataProvider.Action {
    run() {
        this.outputData.add('sequence', this.inputData.sequence);
    }
}
