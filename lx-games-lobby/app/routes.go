package app

import (
	"github.com/epicoon/lx-games-lobby/app/handlers"
	"github.com/epicoon/lx-games-lobby/cnv"
	"github.com/epicoon/lxgo/jspp"
	jsppComp "github.com/epicoon/lxgo/jspp/component"
	"github.com/epicoon/lxgo/kernel"
)

func InitRoutes(app cnv.IApp) {
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
	})
}
