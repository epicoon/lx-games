// @lx:namespace lxGames.actions;
class ChannelEventListener extends lxGames.ChannelEventListener {
    onError(event) {
        lx.tostError(event.getData().message);
    }

    onAction(event) {
        this.getGame().actions.dataProvider.onServerAction(event.getData());
    }
}
