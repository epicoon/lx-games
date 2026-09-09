// @lx:namespace lxGames.ootv.dataProvider;
class Action extends lxGames.actions.ResponseAction {
    getChipInfo(packName) {
        return this.dataProvider.packs.get(packName).getOne();
    }

    addGamerPoints(gamer, pointsInfo) {
        let token = gamer.getToken();
        this.dataProvider.getGamerPoints(token).push(pointsInfo);
        let points = this.outputData.get('pointDetails');
        if (!(token in points))
            points[token] = [];
        points[token].push(pointsInfo);
    }
}
