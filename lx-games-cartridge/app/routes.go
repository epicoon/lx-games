package app

import (
	"fmt"
	"maps"
	"slices"

	"github.com/epicoon/lx-games-cartridge/app/handlers"
	"github.com/epicoon/lx-games-cartridge/cnv"
	"github.com/epicoon/lxgo/cors"
	"github.com/epicoon/lxgo/jspp"
	jsppComp "github.com/epicoon/lxgo/jspp/component"
	"github.com/epicoon/lxgo/kernel"
	wsComp "github.com/epicoon/lxgo/ws/component"
)

func InitRoutes(app cnv.IApp) error {
	// gamePlugins maps each locally-installed game's slug (the same slug it
	// announces in its own nomenclature) to the jspp plugin class that
	// implements it (lx-plugin.yaml's "name", see nomenclature.Holder).
	gamePlugins := app.NomenclatureHolder().GamePlugins()

	// Assets
	router := app.Router()
	assetRoutes := kernel.AssetsList{
		"/js/":  "runtime/web/build",
		"/lib/": "runtime/web/lib",
		"/web/": "runtime/web/assets",
		"/img/": "runtime/web/img",
		"/css/": "runtime/web/css",
	}
	router.RegisterFileAssets(assetRoutes)

	// CORS - only when configured, see components.go's corsConfigured.
	if corsConfigured(app) {
		corsComponent, err := cors.AppComponent(app)
		if err != nil {
			return fmt.Errorf("Cors component required: %w", err)
		}
		corsComponent.EnableFor(slices.Collect(maps.Keys(assetRoutes)))
	}

	// Cartridge endpoints
	ws, err := wsComp.AppComponent(app)
	if err != nil {
		return fmt.Errorf("WSServer component required: %w", err)
	}
	ws.Router().RegisterResources(kernel.HttpResourcesList{
		"/nomenclature": handlers.NewNomenclatureHandler,
		"/rooms":        handlers.NewActiveRoomsHandler,
		"/ping":         handlers.NewPingHandler,
		"/game":         handlers.NewGameHandler(gamePlugins),
	})

	// Games as local plugins
	pp, err := jsppComp.AppComponent(app)
	if err != nil {
		return fmt.Errorf("JS Preprocessor component required: %w", err)
	}
	pluginRoutes := make(jspp.PluginRoutesList, len(gamePlugins))
	for slug, plugin := range gamePlugins {
		pluginRoutes["/"+slug] = plugin
	}
	pp.PluginManager().SetRoutes(pluginRoutes)

	return nil
}
