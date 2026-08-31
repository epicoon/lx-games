// @lx:namespace lxGames.offerDialog;
class Request {
    constructor(dialog, config) {
        this.dialog = dialog;
        this.name = config.name;
        this.data = config.data;
        this.sender = config.sender;
        this.receiver = config.receiver;
        this.localStatus = config.localStatus;
    }
}
