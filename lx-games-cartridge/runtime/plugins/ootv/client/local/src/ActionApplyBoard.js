// @lx:namespace lxGames.ootv.dataProvider;
class ActionApplyBoard extends lxGames.ootv.dataProvider.Action {
    run() {
        let data = this.inputData;
        this.dataProvider.localInit.prepareGameData[data.gamerColor] = {
            board: data.board,
            station: data.station
        };
        this.outputData.add('gamerColor', data.gamerColor);
        this.outputData.add('board', data.board);
        this.outputData.add('station', data.station);
    }
}
