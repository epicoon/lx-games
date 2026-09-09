// @lx:macros Const {lxGames.ootv.Constants};

let _boards = null;

// @lx:namespace lxGames.ootv;
class BoardsDataProvider {
    static getAll() {
        _loadBoards();
        return _boards;
    }

    static get(index) {
        _loadBoards();
        return _boards[index];
    }
}

function _loadBoards() {
    if (_boards !== null) return;

    const raw = lx.yaml('{plugin:OotvPlugin}/data/boards.yaml');
    _boards = [];
    let counter = 0;
    while (counter in raw) {
        const board = raw[counter]
        board.forEach(data => data.group = lx>>>Const[data.group]);
        _boards.push(board);
        counter++;
    }
}
