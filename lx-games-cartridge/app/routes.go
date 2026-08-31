package app

import (
	"fmt"

	"github.com/epicoon/lx-games-cartridge/app/handlers"
	"github.com/epicoon/lx-games-cartridge/cnv"
	"github.com/epicoon/lxgo/jspp"
	jsppComp "github.com/epicoon/lxgo/jspp/component"
	"github.com/epicoon/lxgo/kernel"
	wsComp "github.com/epicoon/lxgo/ws/component"
)

func InitRoutes(app cnv.IApp) error {
	// Assets
	router := app.Router()
	router.RegisterFileAssets(kernel.AssetsList{
		"/js/":  "runtime/web/build",
		"/lib/": "runtime/web/lib",
		"/web/": "runtime/web/assets",
		"/img/": "runtime/web/img",
		"/css/": "runtime/web/css",
	})

	// Cartridge endpoints
	ws, err := wsComp.AppComponent(app)
	if err != nil {
		return fmt.Errorf("WSServer component required: %w", err)
	}
	ws.Router().RegisterResources(kernel.HttpResourcesList{
		"/nomenclature": handlers.NewNomenclatureHandler,
		"/rooms":        handlers.NewActiveRoomsHandler,
		"/ping":         handlers.NewPingHandler,
	})

	// Games as local plugins
	pp, err := jsppComp.AppComponent(app)
	if err != nil {
		return fmt.Errorf("JS Preprocessor component required: %w", err)
	}
	pp.PluginManager().SetRoutes(jspp.PluginRoutesList{
		"/seabattle": "SeabattlePlugin",
	})

	return nil
}
