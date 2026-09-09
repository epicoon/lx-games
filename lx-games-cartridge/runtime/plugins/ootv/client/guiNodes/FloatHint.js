// @lx:macros Const {lxGames.ootv.Constants};

const _STATUS_NONE = 0;
const _STATUS_FOLLOW = 1;
const _STATUS_ACTIVE = 2;

// @lx:namespace lxGames.ootv.gui;
class FloatHint extends lx.GuiNode {
	// @lx:behavior lxGames.Tools.EnvironmentItemBehavior;

    init() {
        this._text = [
            lx.i18n('floatHint.0'),
            lx.i18n('floatHint.1'),
            lx.i18n('floatHint.2'),
            lx.i18n('floatHint.3'),
            lx.i18n('floatHint.4'),
            lx.i18n('floatHint.5'),
            lx.i18n('floatHint.6'),
            lx.i18n('floatHint.7'),
            lx.i18n('floatHint.8'),
            lx.i18n('floatHint.9'),
            lx.i18n('floatHint.10'),
            lx.i18n('floatHint.11'),
            lx.i18n('floatHint.12'),
            lx.i18n('floatHint.13'),
            lx.i18n('floatHint.14'),
            lx.i18n('floatHint.15'),
            lx.i18n('floatHint.16'),
            lx.i18n('floatHint.17'),
            lx.i18n('floatHint.18'),
            lx.i18n('floatHint.19'),
            lx.i18n('floatHint.20'),
            lx.i18n('floatHint.21'),
            lx.i18n('floatHint.22'),
            lx.i18n('floatHint.23'),
            lx.i18n('floatHint.24'),
            lx.i18n('floatHint.25'),
            lx.i18n('floatHint.26'),
            lx.i18n('floatHint.27'),
            lx.i18n('floatHint.28'),
            lx.i18n('floatHint.29'),
            lx.i18n('floatHint.30'),
            lx.i18n('floatHint.31'),
            lx.i18n('floatHint.32'),
            lx.i18n('floatHint.33'),
            lx.i18n('floatHint.34'),
            lx.i18n('floatHint.35'),
            lx.i18n('floatHint.36'),
            lx.i18n('floatHint.37'),
            lx.i18n('floatHint.38'),
            lx.i18n('floatHint.39'),
            lx.i18n('floatHint.40'),
            lx.i18n('floatHint.41'),
            lx.i18n('floatHint.42'),
            lx.i18n('floatHint.43'),
            lx.i18n('floatHint.44'),
            lx.i18n('floatHint.45'),
            lx.i18n('floatHint.46'),
            lx.i18n('floatHint.47'),
            lx.i18n('floatHint.48'),
            lx.i18n('floatHint.49'),
            lx.i18n('floatHint.50')
        ];

        this.status = _STATUS_NONE;
        this.tileName = '';

        this.timer = new lx.Timer(1000);
        this.timer.node = this;
        this.timer.on = function(chip, x, y) {
            this.chip = chip;
            this.x = x;
            this.y = y;
            this.start();
        };
        this.timer.whileCycle(function() {
            if (this.isCycleEnd()) {
                if (this.node.tileName == this.chip.tile.name)
                    _start(this.node, this.chip, this.x, this.y);
                else _finish(this.node);
                this.stop();
            }
        });
    }

    subscribeEvents() {
        this.getPlugin().on('mouse.moveWithoutIntersects', ()=>_finish(this));

        this.getPlugin().on('mouse.moveWithIntersects', (e)=>{
            const stuff = e.data.intersect;
            if (!stuff.tile) {
                _finish(this);
                return;
            }

            _follow(this, stuff, lx.app.mouse.x, lx.app.mouse.y);
        });
    }
}

function _follow(self, chip, x, y) {
    if ( chip.info === undefined && chip.value === undefined ) {
        _finish(self);
        return;
    }

    if (self.status == _STATUS_ACTIVE) {
        if (self.tileName == chip.tile.name) {
            _locate(self, x, y);
            return;
        } else _finish(self);
    }

    self.tileName = chip.tile.name;
    if (self.status == _STATUS_FOLLOW) return;

    if (self.status == _STATUS_NONE) {
        self.status = _STATUS_FOLLOW;
        self.timer.on(chip, x, y);
    }
}

function _start(self, chip, x, y) {
    self.status = _STATUS_ACTIVE;

    let index = _textIndex(self, chip),
        text = self._text[index];

    if (index == 9) {
        let arr = text.split('--');
        arr[1] = self.getGame().getGamersCount();
        text = arr.join('');
    } else if (index == 12) {
        let arr = text.split('--'),
            type = Math.floor((chip.info.variant - 29) / 3),
            droneName;
        arr[1] = 2 + ( chip.info.variant - 29 ) % 3;
        text = arr.join('');
        switch (type) {
            case 0: droneName = lx.i18n(drone.service); break;
            case 1: droneName = lx.i18n(drone.scout); break;
            case 2: droneName = lx.i18n(drone.cargo); break;
            case 3: droneName = lx.i18n(drone.support); break;
        }
        text = text.replace(lx.i18n(drone.title), droneName);
    }

    const widget = self.getWidget();
    lx(widget)>val.width('400px');
    lx(widget)>val.text(text);

    widget.width(lx(widget)>val.width('px') + 20 + 'px');
    widget.height(lx(widget)>val>text.height('px') + 20 + 'px');

    _locate(self, x, y);
    widget.show();
}

function _finish(self) {
    self.status = _STATUS_NONE;
    self.tileName = '';
    self.getWidget().hide();
}

function _textIndex(self, chip) {
    if ( chip.isTileType(lx>>>Const.TILE_GAMER_POINTS) ) return 2;
    if ( chip.isTileType(lx>>>Const.TILE_GAMER_SEQUENCE) ) return 3;
    if ( chip.isTileType(lx>>>Const.TILE_DICE_GAME) ) return 4;
    if ( chip.isTileType(lx>>>Const.TILE_DICE_GAMER) ) return 5;

    if ( chip.isTileType(lx>>>Const.TILE_MINERALS_STAGE) ) return 6;
    if ( chip.isTileType(lx>>>Const.TILE_MINERALS_TURN) ) return 7;
    if ( chip.isTileType(lx>>>Const.TILE_MINERALS_INGAME) ) return 8;
    if ( chip.isTileType(lx>>>Const.TILE_MINERALS_SOLD) ) return 10;
    if ( chip.isTileType(lx>>>Const.TILE_MINERALS_INGAMER) ) return 9;

    if ( chip.isGroup(lx>>>Const.GROUP_CREDIT) ) return 1;
    if ( chip.isGroup(lx>>>Const.GROUP_DATA_STORAGE) ) return 0;
    if ( chip.isGroup(lx>>>Const.GROUP_BONUS_MAX) ) return 23;
    if ( chip.isGroup(lx>>>Const.GROUP_BONUS_MIN) ) return 24;
    if ( chip.isGroup(lx>>>Const.GROUP_PROBE) ) return 11;
    if ( chip.isGroup(lx>>>Const.GROUP_DRONE) ) return 12;
    if ( chip.isGroup(lx>>>Const.GROUP_STATION) ) return 13;
    if ( chip.isGroup(lx>>>Const.GROUP_SOLAR_PANEL) ) return 14;

    if ( chip.isGroup(lx>>>Const.GROUP_TECHNOLOGY) ) return ( chip.getVariant() + 22 );
    if ( chip.isGroup(lx>>>Const.GROUP_MODULE) ) return ( chip.getVariant() - 26 );
}

function _locate(self, x, y) {
    const widget = self.getWidget();

    //TODO ~ returnToParent()
    const canvas = lx(self.getPlugin().root)>>canvas;
    let l = x + 20,
        t = y + 20,
        w = widget.width('px'),
        h = widget.height('px'),
        W = canvas.width('px'),
        H = canvas.height('px');

    if ( l + w > W ) l = W - w;
    if ( t + h > H ) t = H - h;

    widget.left(l + 'px');
    widget.top(t + 'px');
}
