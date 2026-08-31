package app

import (
	"fmt"

	"github.com/epicoon/lx-games-lobby/cartridges"
	"github.com/epicoon/lx-games-lobby/cnv"
	"github.com/epicoon/lxgo/kernel"
	lxApp "github.com/epicoon/lxgo/kernel/app"
)

/** @interface cnv.IApp */
type App struct {
	*lxApp.App
	cartridgesRegistry *cartridges.Registry
}

/** @constructor */
func NewApp() (cnv.IApp, error) {
	app := &App{App: lxApp.NewApp()}

	if err := lxApp.Configure(app); err != nil {
		return nil, err
	}

	if err := setComponents(app); err != nil {
		return nil, err
	}

	registry, err := buildCartridgesRegistry(app)
	if err != nil {
		return nil, fmt.Errorf("can not build cartridges registry: %w", err)
	}
	app.cartridgesRegistry = registry
	registry.Start()
	registry.StartRetryScheduler()

	app.Events().Subscribe(kernel.EVENT_CONFIG_REFRESHED, func(e kernel.IEvent) {
		AddNewCartridges(app)
	})
	app.Events().Subscribe(kernel.EVENT_APP_BEFORE_FINAL, func(e kernel.IEvent) {
		registry.StopRetryScheduler()
	})

	InitRoutes(app)

	return app, nil
}

func (app *App) ConfigPath() string {
	return "runtime/config.yaml"
}

// CartridgesRegistry returns the app's registry of configured cartridges
// and its current connections to them.
func (app *App) CartridgesRegistry() *cartridges.Registry {
	return app.cartridgesRegistry
}
