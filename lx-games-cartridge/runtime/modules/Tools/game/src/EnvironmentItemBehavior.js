// @lx:namespace lxGames.Tools;
class EnvironmentItemBehavior extends lx.Behavior {
    getEnvironment() {
        let plugin = null;

        if (this.plugin)
            plugin = this.plugin;
        else if (this.lxHasMethod('getPlugin'))
            plugin = this.getPlugin();

        if (!plugin) {
            console.error('EnvironmentItemBehavior: can not get a plugin');
            return null;
        }

        if (!plugin.environment) {
            console.error('EnvironmentItemBehavior: the plugin does not have an environment');
            return null;
        }

        return plugin.environment;
    }

    getGame() {
        const env = this.getEnvironment();
        if (!env) return null;
        return env.getGame();
    }
}
