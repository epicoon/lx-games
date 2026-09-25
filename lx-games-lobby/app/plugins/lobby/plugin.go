package lobby

import (
	"github.com/epicoon/lxgo/jspp"
	"github.com/epicoon/lxgo/jspp/plugins"
	"github.com/epicoon/lxgo/kernel"
)

/** @interface jspp.IPlugin */

// LobbyPlugin is the Go-side counterpart of the LobbyPlugin jspp plugin.
type LobbyPlugin struct {
	*plugins.Plugin
}

var _ jspp.IPlugin = (*LobbyPlugin)(nil)

/** @constructor jspp.CPlugin */
func NewLobbyPlugin() jspp.IPlugin {
	return &LobbyPlugin{Plugin: plugins.NewPlugin()}
}

func (p *LobbyPlugin) AjaxHandlers() kernel.HttpResourcesList {
	return kernel.HttpResourcesList{
		"devStatus": NewDevStatusHandler,
	}
}
