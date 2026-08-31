// @lx:module lxGames.OfferDialog;
// @lx:module-data: i18n = src/i18n.yaml;

lx.import(
    lx.HashMd5,
    lx.ConfirmPopup,
    'src/'
);

/*
1. Покупатель отправляет напрямую событие владельцу
    - у покупателя открывается окно ожидания, с кнопкой отмены
    - у владельца открывается окно подтверждения сделки

2.1. Владелец подтвердил
    - отправляется прямое событие покупателю
    - у покупателя окно ожидания заменяется окном окончательного подтверждения
2.2. Владелец отказал
    - отправляется прямое событие покупателю
    - у покупателя окно ожидания заменяется сообщением об отказе
    - END
2.3. Покупатель отменил в процессе ожидания
    - у владельца окно подтверждения сделки заменяется окном отмены
    - END

3. Покупатель делает окончательное подтверждение
    - отправляется событие с участием сервера
    - последующая реакция клиентов
    - закрытие попапов
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
            this.env.getSocket().onChannelEvent((e)=>__onEvent(this, e));
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

        // Отправителю повесить плашку "предложение отправлено" с кнопкой "передумал"
        let popup = __getWaitingPopup(this);
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

function __getWaitingPopup(self) {
    if (!self.waitingPopup) {
        self.waitingPopup = new lx.ConfirmPopup({
            parent: self.popupsParentBox || lx.body,
            customButtons: true
        });
    }
    return self.waitingPopup;
}

function __getConfirmPopup(self) {
    if (!self.confirmPopup) {
        self.confirmPopup = new lx.ConfirmPopup({
            parent: self.popupsParentBox || lx.body
        });
    }
    return self.confirmPopup;
}

function __getDeclinePopup(self) {
    if (!self.declinePopup) {
        self.declinePopup = new lx.ConfirmPopup({
            parent: self.popupsParentBox || lx.body,
            customButtons: true
        });
    }
    return self.declinePopup;
}

function __getFinalPopup(self) {
    if (!self.finalPopup) {
        self.finalPopup= new lx.ConfirmPopup({
            parent: self.popupsParentBox || lx.body
        });
    }
    return self.finalPopup;
}

function __onEvent(self, event) {
    const data = event.getData();
    if (!data.__offer__ || !(data.__offer__.scenario in self.scenarios)) return;

    let step = data.__offer__.step,
        key = data.__offer__.key,
        scenario = data.__offer__.scenario,
        initiator = data.__offer__.initiator;
    delete data.__offer__;

    switch (step) {
        case lxGames.OfferDialog.STEP_OFFER:
            __stepOffer(self, data, key, scenario, initiator);
            break;

        case lxGames.OfferDialog.STEP_DECLINE:
            __stepDecline(self, key);
            break;

        case lxGames.OfferDialog.STEP_CONFIRM:
            __stepConfirm(self, data, key, scenario);
            break;

        case lxGames.OfferDialog.STEP_FINAL:
            __stepFinal(self, key);
            break;
    }
}

function __stepOffer(self, data, key, scenarioName, initiator) {
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

    __getConfirmPopup(self).open(message)
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

function __stepDecline(self, key) {
    if (!(key in self.requests)) return;
    delete self.requests[key];
    __getConfirmPopup(self).close();
    __getWaitingPopup(self).close();
    __getDeclinePopup(self).open(lx.i18n(declined), {ok: lx.i18n(ok)});
}

function __stepConfirm(self, data, key, scenarioName) {
    if (!(key in self.requests)) return;
    __getWaitingPopup(self).close();
    __getFinalPopup(self).open(lx.i18n(confirmTitle))
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

function __stepFinal(self, key) {
    if (!(key in self.requests)) return;
    delete self.requests[key];
}
