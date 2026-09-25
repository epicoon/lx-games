// @lx:module lxGames.lobby.MockData;

/**
 * Placeholder stand-in for what the lobby channel (see lx-games/README.md's
 * protocol diagram) will eventually report: game nomenclature aggregated
 * from connected cartridges, and their live rooms. Everything here is
 * hardcoded on purpose - this is the seam where real data replaces the mock.
 *
 * tag/desc are plain text, not translation keys - matching
 * cartridges.Nomenclature (lx-games-lobby's own cartridges/registry.go),
 * whose Description is a single string, not a per-locale map: a cartridge
 * reports its own game in whichever text it sends, the lobby doesn't
 * translate on its behalf.
 */
// @lx:namespace lxGames.lobby;
class MockData {
    static rooms() {
        return [
            {id: 1, game: 'lxGames.ootv', name: 'Late-night outposts', host: 'Marta', seats: ['Marta', 'Tom'], max: 4, state: 'waiting'},
            {id: 2, game: 'lxGames.ootv', name: 'Newcomers welcome', host: 'Dmitry', seats: ['Dmitry', 'Sofia', 'Ivan'], max: 4, state: 'waiting'},
            {id: 3, game: 'lxGames.seabattle', name: 'Quick duel', host: 'Ivan', seats: ['Ivan'], max: 2, state: 'waiting'},
            {id: 4, game: 'lxGames.ootv', name: 'Friends only', host: 'Alex', seats: ['Alex', 'Lena', 'Marta', 'Tom'], max: 4, state: 'full', locked: true},
            {id: 5, game: 'lxGames.ootv', name: 'Round 7 of 12', host: 'Lena', seats: ['Lena', 'Dmitry', 'Sofia'], max: 3, state: 'playing'},
        ];
    }
}
