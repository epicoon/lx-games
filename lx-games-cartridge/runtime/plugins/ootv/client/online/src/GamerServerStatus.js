// @lx:macros C {lxGames.ootv.OnlineConstants};

// @lx:namespace lxGames.ootv;
class GamerServerStatus extends lxGames.Tools.Status {
    isPreparingNewGame() {
        return this.is(lx>>>C.GAMER_STATUS_PREPARING_NEW_GAME);
    }    
}
