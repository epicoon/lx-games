// @lx:namespace lxGames.ootv.gui;
class FloatPoints extends lx.GuiNode {
	// @lx:behavior lxGames.Tools.EnvironmentItemBehavior;

    init() {
        this.w0 = 15;
        this.h0 = 3;
        this.increase = 3;
        this.x0 = 0;
        this.y0 = 0;
        this.messages = [];

        this.animator = new lx.Timer([700, 300]);
        this.animator.setAction([
            ()=>_grow(this),
            ()=>_disappear(this)
        ]);
    }

    subscribeEvents() {
        const plugin = this.getPlugin();

        plugin.on('floatPoints', (e)=>_start(this, e.data.messages));
    }
}

function _start(self, messages) {
    self.messages = messages;

    const floatPoints = self.getWidget(),
        stream = lx(floatPoints)>stream;

    stream.clear();
    for (let i=0; i<messages.length; i++) {
        let text = stream.add(lx.Box, {text: '<b>' + messages[i] + '</b>'});
        text.align(lx.CENTER, lx.MIDDLE);
        lx(text)>text.wrap('nowrap');
    }

    self.x0 = self.getGuiNode('main').getElem('canvas').width('px') * 0.5;
    self.y0 = self.getGuiNode('main').getElem('canvas').height('px') * 0.5;

    self.animator.start();
    self.show();
}

function _grow(self) {
    const floatPoints = self.getWidget();

    let k = 1 + self.animator.shift() * (self.increase - 1),
        w = self.w0 * k,
        h = self.h0 * k,
        amt = self.messages.length;

    floatPoints.resize({
        width: w + '%',
        height: h * amt + '%',
        left: self.x0 - floatPoints.width('px') * 0.5 + 'px',
        top: self.y0 - floatPoints.height('px') * 0.5 + 'px'
    });

    let text = lx(floatPoints)>>text;
    lx.TextBox.adaptTextByMin(text);
}

function _disappear(self) {
    const floatPoints = self.getWidget(),
        animator = self.animator;

    floatPoints.opacity(1 - animator.shift());

    if (animator.isCycleEnd()) {
        animator.stop();
        floatPoints.opacity(1);
        floatPoints.hide();
    }
}
