// @lx:module lxGames.VotingMenu;
// @lx:module-data: i18n = i18n.yaml;

lx.import(
    lx.ActiveBox,
    lx.Button,
    lx.Scroll
);

// @lx:namespace lxGames;
class VotingMenu extends lx.Box {
    modifyConfigBeforeApply(config) {
        let parent = null;
        if (config.parent) {
            parent = config.parent;
            delete config.parent;
        }
        if (config.message) {
            this._message = config.message;
            delete config.message;
        }
        config.geom = config.geom || [30, 20, 40, 50];
        config.header = config.header || lx.i18n(title);
        config = {
            geom: true,
            depthCluster: lx.DepthClusterMap.CLUSTER_FRONT,
            formConfig: config
        };
        if (parent) config.parent = parent;
        return config;
    }

    static initCss(css) {
        css.inheritClass('lg-VotingMenu-Box', 'AbstractBox');
    }

    getBasicCss() {
        return {
            box: 'lg-VotingMenu-Box'
        };
    }

    // @lx:<context CLIENT:
    clientRender(config) {
        super.clientRender(config);

        this._env = null;
        this._onAppove = null;
        this._onDecline = null;
        this.gamersList = lx.ModelCollection.create({
            schema: {
                id: {},
                name: {},
                vote: {},
            }
        });

        this.add(lx.Box, {
            geom: true,
            opacity: 0.5,
            fill: 'black'
        });
        const form = this.add(lx.ActiveBox, config.formConfig);
        form.streamProportional({indent: '10px'});
        form.begin();
        lx.ml(`
        #lx:tpl-begin;
            <lx.Box> @message (height:'auto')\
                #style('min-height', '10px')\
                #overflow('hidden')
            <lx.Box> #addContainer() #addStructure(lx.Scroll, {type: lx.VERTICAL})
                <lx.Box> @matrix\
                    #stream()
            <lx.Box> (height:'50px')\
                #gridProportional()
                <lx.Button> @butAccept [2:0:3:1] (text:lx.i18n(accept))
                <lx.Button> @butReject [7:0:3:1] (text:lx.i18n(reject)
        `);
        form.end();

        lx(form)>>matrix.matrix({
            items: this.gamersList,
            itemBox: [lx.Box, {gridProportional: {indent:'10px'}}],
            itemRender: (box, model)=>{
                box.height('fit-content');
                (box.add(lx.Box, {
                    field: 'name',
                    width: 8,
                    css: this.basicCss.box
                })).align(lx.CENTER, lx.MIDDLE);
                (box.add(lx.Box, {
                    field: 'vote',
                    width: 4,
                    css: this.basicCss.box
                })).align(lx.CENTER, lx.MIDDLE);
            }
        });

        lx(form)>>butAccept.click(()=>{
            this._env.triggerChannelEvent('revenge-vote', {
                gamerId: this._env.getGame().getLocalGamer().getId(),
                vote: true
            });
        });

        lx(form)>>butReject.click(()=>{
            this._env.triggerChannelEvent('revenge-vote', {
                gamerId: this._env.getGame().getLocalGamer().getId(),
                vote: false
            });
        });

        this.hide();
    }

    setEnvironment(env) {
        this._env = env;

        const plugin = env.getPlugin();

        plugin.on('ENV_revengeRequested', event => {
            this.open();
            this.setVotes(event.getData().revengeApprovements);
        });

        plugin.on('ENV_revengeVoted', event => {
            const data = event.getData();
            this.setVote(data.gamerId, data.vote);
        });
    }

    setVotingButton(button) {
        this._button = button;
        button.click(()=>{
            if (this.visibility()) return;
            this._env.triggerChannelEvent('ask-for-revenge', {
                gamerId: this._env.getGame().getLocalGamer().getId()
            });
        });
    }

    onApprove(callback) {
        this._onAppove = callback;
    }

    onDecline(callback) {
        this._onDecline = callback;
    }

    open(message = null) {
        this.show();

        lx(this)>>butAccept.disabled(false);
        lx(this)>>butReject.disabled(false);
        this.gamersList.reset();
        this._env.getGame().forEachGamer(gamer => {
            this.gamersList.add({
                id: gamer.getId(),
                name: gamer.getName(),
                vote: 'waiting'
            });
        });

        message = message || this._message || 'Voting';
        lx(this)>>message.text(message);
    }

    setVote(gamerId, vote, check = true) {
        this.gamersList.forEach(gamer => {
            if (gamer.id != gamerId) return;
            gamer.vote = vote ? 'approved' : 'declined';
            if (this._env.getGame().getLocalGamer().getId() == gamerId) {
                lx(this)>>butAccept.disabled(true);
                lx(this)>>butReject.disabled(true);
            }
        });

        if (check) __checkVotingEnd(this);
    }

    setVotes(votes) {
        for (let id in votes)
            this.setVote(id, votes[id], false);
        __checkVotingEnd(this);
    }
    // @lx:context>
}

function __checkVotingEnd(self) {
    let allVoted = true,
        approved = true;
    self.gamersList.forEach(gamer => {
        if (gamer.vote == 'waiting')
            allVoted = false;
        if (gamer.vote != 'approved')
            approved = false;
    });

    if (!allVoted) return;

    self.hide();
    if (approved) {
        if (self._onAppove) self._onAppove();
    } else {
        if (self._onDecline) self._onDecline();
    }
}
