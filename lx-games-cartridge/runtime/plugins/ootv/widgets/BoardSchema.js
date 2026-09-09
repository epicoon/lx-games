// @lx:macros Const {lxGames.ootv.Constants};

// @lx:module lxGames.ootv.BoardSchema;

/**
 * @widget lxGames.ootv.BoardSchema
 */
// @lx:namespace lxGames.ootv;
class BoardSchema extends lx.Box {
    static initCss(css) {
        css.addClass('ootv-hex-cell', {
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
        });
        // Round pickable markers sitting on the station cells (editable mode)
        css.addClass('ootv-station-slot', {
            borderRadius: '50%',
            border: 'solid 3px white',
            backgroundColor: 'gold',
            opacity: 0.6,
            cursor: 'pointer',
            boxSizing: 'border-box'
        });
        css.addClass('ootv-station-slot-selected', {
            backgroundColor: '#8BE0A0',
            borderWidth: '4px',
            opacity: 0.9
        });
    }

    // A bare cells array is accepted directly.
    modifyConfigBeforeApply(config) {
        if (lx.isArray(config)) config = {cells: config};
        return config;
    }

    /**
     * @widget-init
     * @param [config] {Object: {
     *     #merge(lx.Box::constructor::config),
     *     cells {Array<Dict:{dice {Number}, group {String}, [default] {Boolean}}>} (: 37 cells :)
     *     [editable = false] {Boolean} (: enables select()/"select" :)
     * }}
     */
    render(config) {
        super.render(config);
        this.isEditable = lx.getFirstDefined(config.editable, false);
        this._selectedIndex = null;
        this._stationCellIndexes = [];

        this.style('aspect-ratio', BOARD_ASPECT);
        this.style('max-width', '100%');
        this.style('max-height', '100%');
        this.style('height', '100%');

        const cells = config.cells || [];
        _buildSchema(this, cells);

        let selected = null;
        cells.forEach((cell, j) => {
            if (cell.default) selected = j;
        });
        if (selected !== null) this.select(selected, true);
    }

    /**
     * @param {Number} index
     * @param {Boolean} [silent] (: true skips the "select" event :)
     */
    select(index, silent = false) {
        if (index === this._selectedIndex) return;

        const prev = _slotAt(this, this._selectedIndex);
        if (prev) prev.removeClass('ootv-station-slot-selected');

        this._selectedIndex = index;
        const slot = _slotAt(this, index);
        if (slot) slot.addClass('ootv-station-slot-selected');

        if (!silent) this.trigger('select', this.newEvent({index}));
    }

    /**
     * @returns {Number}
     */
    getSelected() {
        return this._selectedIndex;
    }
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// Hex cells laid out in offset rows, rows shaped into a truncated
// rhombus - 4,5,6,7,6,5,4 cells. Each row is centered under the
// widest (7-cell) row.
const GAP_UNIT = 0.1;
const ROW_LENGTHS = [4, 5, 6, 7, 6, 5, 4];
const MAX_COLS = Math.max(...ROW_LENGTHS);
const STEP_X_UNIT = 1 + GAP_UNIT;
const STEP_Y_UNIT = 0.75 + GAP_UNIT;
const BOARD_W_UNITS = (MAX_COLS - 1) * STEP_X_UNIT + 1;
const BOARD_H_UNITS = (ROW_LENGTHS.length - 1) * STEP_Y_UNIT + 1;
const BOARD_ASPECT = BOARD_W_UNITS + '/' + BOARD_H_UNITS;
const HEX_W_PCT = 100 / BOARD_W_UNITS;
const HEX_H_PCT = 100 / BOARD_H_UNITS;

// Station-slot marker size as a fraction of a hex cell's bounding box
const STATION_SLOT_SCALE = 0.72;

// HEX_ROW_OF[j]/HEX_COL_OF[j]: flat cell index j (0..36, row-major) -> its
// row and column within that row.
const HEX_ROW_OF = [];
const HEX_COL_OF = [];
(function() {
    let j = 0;
    for (let r = 0; r < ROW_LENGTHS.length; r++) {
        for (let c = 0; c < ROW_LENGTHS[r]; c++) {
            HEX_ROW_OF[j] = r;
            HEX_COL_OF[j] = c;
            j++;
        }
    }
})();

function _hexLeftPct(j) {
    const row = HEX_ROW_OF[j];
    const rowOffsetUnits = (MAX_COLS - ROW_LENGTHS[row]) * STEP_X_UNIT / 2;
    return (HEX_COL_OF[j] * STEP_X_UNIT + rowOffsetUnits) / BOARD_W_UNITS * 100;
}
function _hexTopPct(j) {
    return HEX_ROW_OF[j] * STEP_Y_UNIT / BOARD_H_UNITS * 100;
}

/**
 * @private
 * @param group {Number}
 * @returns {String}
 */
function _getGroupColor(group) {
    return lx>>>Const.GROUP_COLOR[group] || 'white';
}

/**
 * @private
 * @returns {Number}
 */
function _getSelectableGroup() {
    return lx>>>Const.GROUP_STATION;
}

/**
 * @private
 * @param self {BoardSchema}
 * @param cells {Array<Dict:{dice {Number}, group {String}, [default] {Boolean}}>}
 */
function _buildSchema(self, cells) {
    self.useRenderCache();
    const wrapper = self.add(lx.Box, {
        key: 'wrapper',
        size: ['100%', '100%'],
        style: {position: 'relative',}
    });

    cells.forEach((cell, j) => {
        const hex = wrapper.add(lx.Box, {
            key: 'hex',
            css: 'ootv-hex-cell',
            geom: [_hexLeftPct(j), _hexTopPct(j), HEX_W_PCT, HEX_H_PCT]
        });
        hex.style('background-color', _getGroupColor(cell.group));

        // hex.add(lx.Box, {geom: true, text: '' + cell.dice}).align(lx.CENTER, lx.MIDDLE);

        let dice = hex.add(lx.Box, {
            geom: [25, 25, 50, 50],
        })
        dice.opacity(0.6);
        dice.picture('dice' + cell.dice + '.png')
    });

    if (self.isEditable) _buildStationSlots(self, cells, wrapper);
    self.applyRenderCache();
}

/**
 * A round marker centered on each station cell - the "pick your starting
 * station" hint.
 * @private
 * @param self {BoardSchema}
 * @param cells {Array<Dict:{dice {Number}, group {String}, [default] {Boolean}}>}
 * @param wrapper {lx.Box}
 */
function _buildStationSlots(self, cells, wrapper) {
    cells.forEach((cell, j) => {
        if (cell.group !== _getSelectableGroup()) return;
        self._stationCellIndexes.push(j);

        const w = HEX_W_PCT * STATION_SLOT_SCALE,
            h = HEX_H_PCT * STATION_SLOT_SCALE,
            left = _hexLeftPct(j) + (HEX_W_PCT - w) / 2,
            top = _hexTopPct(j) + (HEX_H_PCT - h) / 2;

        const slot = wrapper.add(lx.Box, {
            key: 'stationSlot',
            css: 'ootv-station-slot',
            geom: [left, top, w, h]
        });
        slot.click(() => self.select(j));
    });
}

/**
 * Station slots are keyed uniformly; _stationCellIndexes maps a cell index
 * to that slot's position among them.
 * @private
 * @param self {BoardSchema}
 * @param cellIndex {Number}
 * @returns {lx.Box}
 */
function _slotAt(self, cellIndex) {
    if (cellIndex === null) return null;
    const i = self._stationCellIndexes.indexOf(cellIndex);
    if (i < 0) return null;
    return self.getOne('wrapper').getAll('stationSlot').at(i);
}
