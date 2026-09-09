// @lx:module lxGames.OfferDialog;
// @lx:module-data: i18n = src/i18n.yaml;

lx.import(
    lx.HashMd5,
    lx.ConfirmPopup,
    'src/'
);

/*
1. The buyer sends an event directly to the owner
    - the buyer sees a waiting window with a cancel button
    - the owner sees a deal confirmation window

2.1. The owner confirmed
    - a direct event is sent to the buyer
    - the buyer's waiting window is replaced with a final confirmation window
2.2. The owner declined
    - a direct event is sent to the buyer
    - the buyer's waiting window is replaced with a decline message
    - END
2.3. The buyer cancelled while waiting
    - the owner's deal confirmation window is replaced with a cancellation window
    - END

3. The buyer makes the final confirmation
    - an event involving the server is sent
    - clients react to it
    - the popups close
 */
// @lx:namespace lxGames;
class OfferDialog {
    // @lx:const STEP_OFFER = 'offer';
    // @lx:const STEP_CONFIRM = 'confirm';
    // @lx:const STEP_DECLINE = 'decline';
    // @lx:const STEP_FINAL = 'final';
    // @lx:const STATUS_SENDER = 'sender';
    // @lx:const STATUS_RECEIVER = 'receiver';

    constructor(game) {
        this.game = game;
        this.env = game.getEnvironment();
        this.popupsParentBox = null;
        this.confirmPopup = null;
        this.waitingPopup = null;
        this.declinePopup = null;
        this.finalPopup = null;
        this.scenarios = {};
        this.requests = {};

        const plugin = this.env.getPlugin();
        plugin.on('ENV_socketConnected', ()=>{
            this.env.getSocket().onChannelEvent((e)=>_onEvent(this, e));
        });
    }

    setPopupsParent(box) {
        this.popupsParentBox = box;
        return this;
    }

    /**
     * @param config {Object {
     *     name {String},
     *     offerMessage {Function},
     *     onConfirm {Function}
     * }}
     */
    registerScenario(config) {
        let scenario = {};

        scenario.offerMessage = config.offerMessage;
        scenario.onConfirm = config.onConfirm;

        this.scenarios[config.name] = scenario;
    }

    /**
     * @param config {Object {
     *     name {String},
     *     receiver {lxGames.Gamer},
     *     data {Dict<Number|String|Boolean>}
     * }}
     */
    runScenario(config) {
        const key = lx.HashMd5.hex(config.name + '_' + Date.now() + '_' + lx.Math.randomInteger(100, 999));

        this.requests[key] = new lxGames.offerDialog.Request(this, {
            name: config.name,
            data: config.data,
            sender: this.game.getLocalGamer(),
            receiver: config.receiver,
            localStatus: lx.self(STATUS_SENDER)
        });

        const scenario = this.scenarios[config.name];

        config.data.__offer__ = {
            scenario: config.name,
            step: lx.self(STEP_OFFER),
            key,
            initiator: this.game.getLocalGamer().getId()
        };
        this.env.triggerChannelEvent(
            config.name + 'Offer',
            config.data,
            config.receiver.getChannelMateId(),
            false
        );

        // Show the sender an "offer sent" banner with a "changed my mind" button
        let popup = _getWaitingPopup(this);
        popup.open(lx.i18n(declineTitle), {decline: lx.i18n(decline)}, 1)
            .decline(()=>{
                delete this.requests[key];
                config.data.__offer__.step = lx.self(STEP_DECLINE);
                this.env.triggerChannelEvent(
                    config.name + 'Decline',
                    config.data,
                    config.receiver.getChannelMateId(),
                    false
                );
            });
    }
}

function _getWaitingPopup(self) {
    if (!self.waitingPopup) {
        self.waitingPopup = new lx.ConfirmPopup({
            parent: self.popupsParentBox || lx.body,
            customButtons: true
        });
    }
    return self.waitingPopup;
}

function _getConfirmPopup(self) {
    if (!self.confirmPopup) {
        self.confirmPopup = new lx.ConfirmPopup({
            parent: self.popupsParentBox || lx.body
        });
    }
    return self.confirmPopup;
}

function _getDeclinePopup(self) {
    if (!self.declinePopup) {
        self.declinePopup = new lx.ConfirmPopup({
            parent: self.popupsParentBox || lx.body,
            customButtons: true
        });
    }
    return self.declinePopup;
}

function _getFinalPopup(self) {
    if (!self.finalPopup) {
        self.finalPopup= new lx.ConfirmPopup({
            parent: self.popupsParentBox || lx.body
        });
    }
    return self.finalPopup;
}

function _onEvent(self, event) {
    const data = event.getData();
    if (!data.__offer__ || !(data.__offer__.scenario in self.scenarios)) return;

    let step = data.__offer__.step,
        key = data.__offer__.key,
        scenario = data.__offer__.scenario,
        initiator = data.__offer__.initiator;
    delete data.__offer__;

    switch (step) {
        case lxGames.OfferDialog.STEP_OFFER:
            _stepOffer(self, data, key, scenario, initiator);
            break;

        case lxGames.OfferDialog.STEP_DECLINE:
            _stepDecline(self, key);
            break;

        case lxGames.OfferDialog.STEP_CONFIRM:
            _stepConfirm(self, data, key, scenario);
            break;

        case lxGames.OfferDialog.STEP_FINAL:
            _stepFinal(self, key);
            break;
    }
}

function _stepOffer(self, data, key, scenarioName, initiator) {
    const request = new lxGames.offerDialog.Request(self, {
        name: scenarioName,
        data: data,
        sender: self.game.getGamerById(initiator),
        receiver: self.game.getLocalGamer(),
        localStatus: lxGames.OfferDialog.STATUS_RECEIVER
    });
    self.requests[key] = request;

    const scenario = self.scenarios[scenarioName];
    let message = scenario.offerMessage(request);

    _getConfirmPopup(self).open(message)
        .confirm(()=>{
            data.__offer__ = {
                scenario: scenarioName,
                step: lxGames.OfferDialog.STEP_CONFIRM,
                key
            };
            self.env.triggerChannelEvent(
                scenarioName + 'Confirm',
                data,
                self.requests[key].sender.getChannelMateId(),
                false
            );
        })
        .reject(()=> {
            data.__offer__ = {
                scenario: scenarioName,
                step: lxGames.OfferDialog.STEP_DECLINE,
                key
            };
            self.env.triggerChannelEvent(
                scenarioName + 'Decline',
                data,
                self.requests[key].sender.getChannelMateId(),
                false
            );
            delete self.requests[key];
        });
}

function _stepDecline(self, key) {
    if (!(key in self.requests)) return;
    delete self.requests[key];
    _getConfirmPopup(self).close();
    _getWaitingPopup(self).close();
    _getDeclinePopup(self).open(lx.i18n(declined), {ok: lx.i18n(ok)});
}

function _stepConfirm(self, data, key, scenarioName) {
    if (!(key in self.requests)) return;
    _getWaitingPopup(self).close();
    _getFinalPopup(self).open(lx.i18n(confirmTitle))
        .confirm(()=>{
            const scenario = self.scenarios[scenarioName];
            scenario.onConfirm(self.requests[key]);
            data.__offer__ = {
                scenario: scenarioName,
                step: lxGames.OfferDialog.STEP_FINAL,
                key
            };
            self.env.triggerChannelEvent(
                scenarioName + 'Final',
                data,
                self.requests[key].receiver.getChannelMateId(),
                false
            );
            delete self.requests[key];
        })
        .reject(()=> {
            data.__offer__ = {
                scenario: scenarioName,
                step: lxGames.OfferDialog.STEP_DECLINE,
                key
            };
            self.env.triggerChannelEvent(
                scenarioName + 'Decline',
                data,
                self.requests[key].receiver.getChannelMateId(),
                false
            );
            delete self.requests[key];
        });
}

function _stepFinal(self, key) {
    if (!(key in self.requests)) return;
    delete self.requests[key];
}
