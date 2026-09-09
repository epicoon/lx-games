// @lx:namespace lxGames.ootv;
class OnlineGuiExterder {
    constructor(game) {
        this.game = game;
    }

    apply() {
        const newGameMenu = this.game.getPlugin().getGuiNode('newGameMenu');
        newGameMenu.state = new lxGames.ootv.OnlineNewGameMenuState(newGameMenu);

        const chat = _chat(this);
        chat.on('newUnreadMessage', event=>_onChangeRead(this, event.totalUnread));
        chat.on('messageRead', event=>_onChangeRead(this, event.totalUnread));

        this.game.getPlugin().on('ENV_socketConnected', ()=>{
            const socket = this.game.getEnvironment().getSocket();
            chat.chatId = socket.getChannel();
            chat.setSocket(socket);
        });
    }
}

function _onChangeRead(self, unreadCount) {
    const main = self.game.getPlugin().getGuiNode('main'),
        root = main.getWidget();
    unreadCount
        ? lx(root)>>chatLabel.text(lx.i18n(root.chat) + '(' + unreadCount + ')')
        : lx(root)>>chatLabel.text(lx.i18n(root.chat));
}

function _chat(self) {
    const main = self.game.getPlugin().getGuiNode('main'),
        root = main.getWidget();

    lx(root)>>lblTurnEnds.left(58);

    let headerHeight = Math.round(root.height('px') * 0.07),
        headerHeightPx = headerHeight + 'px';

    root.begin();
    lx.ml(`
    <lx.Box> @chatSpot [69::30:headerHeightPx::1] (depthCluster:lx.DepthClusterMap.CLUSTER_FRONT) #overflow('hidden')
        <lx.Box> @chatCard [0:0:100:headerHeightPx]\
            #streamProportional()
            <lx.Box> @chatHeader.ootv-but (height: headerHeightPx)
                <lx.Box)> @chatLabel [_] (text:lx.i18n(root.chat)\
                    #align(lx.CENTER, lx.MIDDLE) #style('cursor', 'pointer')
                <lx.Box> @chatArrow [_] (text:'&#9650;')\
                    #align(lx.RIGHT, lx.MIDDLE) #style('cursor', 'pointer')
            <lx.Box> @chatWrapper
                <lx.Box> [_] #fill('black') #opacity(0.7)
                <lx.socket.ChatBox> @chatBox (margin:'10px')
    `);
    root.end();

    let chatSpot = lx(root)>chatSpot,
        chatCard = lx(chatSpot)>chatCard,
        chatBox = lx(root)>>chatBox,
        h = chatSpot.height('px'),
        opened = false;

    const timer = new lx.Timer({
        period: 300,
        action: function() {
            let cH = opened
                ? (h - headerHeight) * (1- this.shift()) + headerHeight
                : (h - headerHeight) * this.shift() + headerHeight;
            chatSpot.height(cH + 'px');
            if (this.isCycleEnd()) {
                this.stop();
                opened = !opened;
                lx(chatCard)>>chatArrow.text(opened ? '&#9660;' : '&#9650;');
                chatBox.checkDisplay();
            }
        }
    });
    lx(chatCard)>chatHeader.click(()=>{
        h = chatSpot.parent.height('px') * 0.8;
        chatCard.height(h + 'px');
        timer.start();
    });

    return chatBox;
}
