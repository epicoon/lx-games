// @lx:namespace lxGames.ootv;
class ChipsRelocateBuffer {
    constructor(game) {
        this.game = game;
        this.buffer = [];

        this._callback = null;
        this._animation = null;
        this.animator = new ChipMoveAnimator(this);
    }

    add(chip, from, to) {
        this.buffer.push({chip, from, to});
        return this;
    }

    /**
     * @param callback {Function} arguments: (chip, shift)
     */
    animate(callback) {
        this._animation = callback;
        return this;
    }

    flush() {
        if (!this.buffer.length) {
            setTimeout(()=>this._onFinish());
            return this;
        }

        for (let i in this.buffer) {
            let item = this.buffer[i];
            this.game.pulsator.dropChip(item.chip);
        }

        this.animator.on();
        this.buffer = [];
        return this;
    }

    then(callback) {
        this._callback = callback;
        return this;
    }

    _onFinish() {
        let f = this._callback;
        this._callback = null;
        this._animation = null;
        if (f) f(this.game);
    }
}

class ChipMoveAnimator extends lx.Timer {
    constructor(buffer) {
        super(buffer.game.options.speed);

        this.buffer = buffer;
        this.list = null;

        this.whileCycle(function() {
            let k = this.shift();

            for (let i in this.list) {
                //TODO!!!
                if (!this.list[i].to) {
                    console.log('!!!!!!!!!!!!!!!!!!!!!!!!');
                    this.stop();
                    return;
                }

                let chip = this.list[i].chip,
                    dest = this.list[i].to,
                    from = this.list[i].from,
                    crd = dest.coords(),
                    x1 = crd[0],
                    y1 = crd[1],
                    z1 = crd[2],
                    x0 = from.x,
                    y0 = from.y + chip.sizes[1] * 0.5,
                    z0 = from.z,
                    xShift = (x1 - x0) * k,
                    yShift = (y1 - y0) * k,
                    zShift = (z1 - z0) * k;

                chip.mesh.position.x = x0 + xShift;
                chip.mesh.position.y = y0 + yShift;
                chip.mesh.position.z = z0 + zShift;

                if (this.buffer._animation)
                    this.buffer._animation(chip, k);
            }

            if (this.isCycleEnd()) {
                for (let i in this.list)
                    this.list[i].to.locate(this.list[i].chip);

                this.list = null;
                this.stop();
                this.buffer._onFinish();
            }
        });
    }

    on() {
        if (this.inAction) return;

        this.list = this.buffer.buffer;

        for (let i in this.list) {
            let item = this.list[i];

            if (item.from) {
                item.from.locate(item.chip);
            }

            item.from = {
                x : item.chip.mesh.position.x,
                y : item.chip.mesh.position.y,
                z : item.chip.mesh.position.z
            };
        }

        this.syncStart();
    };
}
