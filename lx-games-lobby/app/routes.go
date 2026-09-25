package app

import (
	"fmt"

	"github.com/epicoon/lx-games-lobby/app/handlers"
	"github.com/epicoon/lx-games-lobby/cnv"
	"github.com/epicoon/lxgo/jspp"
	jsppComp "github.com/epicoon/lxgo/jspp/component"
	"github.com/epicoon/lxgo/kernel"
	wsComp "github.com/epicoon/lxgo/ws/component"
)

func InitRoutes(app cnv.IApp) error {
	router := app.Router()

	router.RegisterFileAssets(kernel.AssetsList{
		"/js/":  "runtime/web/build",
		"/web/": "runtime/web/assets",
		"/img/": "runtime/web/img",
		"/css/": "runtime/web/css",
	})

	pp, _ := jsppComp.AppComponent(app)
	pp.PluginManager().SetRoutes(jspp.PluginRoutesList{
		"/":      "LobbyPlugin",
		"/admin": "AdminPlugin",
	})

	router.RegisterResources(kernel.HttpResourcesList{
		"/cartridge/announce[POST]": handlers.NewCartridgeAnnounceHandler,
		"/game/get":                 handlers.NewGameGetHandler,
		handlers.GameDepsRoute:      handlers.NewGameDepsHandler(app.CartridgesRegistry()),
		handlers.GameAssetsRoute:    handlers.NewGameAssetsHandler(app.CartridgesRegistry()),
	})

	// Browser-facing lobby channel
	ws, err := wsComp.AppComponent(app)
	if err != nil {
		return fmt.Errorf("WSServer component required: %w", err)
	}
	ws.Router().RegisterResources(kernel.HttpResourcesList{
		"/nomenclature": handlers.NewNomenclatureHandler,
	})

	return nil
}
