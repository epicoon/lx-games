package app

import (
	"fmt"

	"github.com/epicoon/lx-games-cartridge/cnv"
	lxApp "github.com/epicoon/lxgo/kernel/app"
)

/** @interface cnv.IApp */
type App struct {
	*lxApp.App
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

	if err := InitRoutes(app); err != nil {
		return nil, err
	}

	if err := setupCartridge(app); err != nil {
		return nil, fmt.Errorf("can not set up lobby-facing endpoints: %w", err)
	}

	return app, nil
}

func (app *App) ConfigPath() string {
	return "runtime/config.yaml"
}
