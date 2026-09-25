package app

import (
	"fmt"

	"github.com/epicoon/lx-games-cartridge/cnv"
	"github.com/epicoon/lx-games-cartridge/nomenclature"
	lxApp "github.com/epicoon/lxgo/kernel/app"
	"github.com/epicoon/lxgo/kernel/config"
)

/** @interface cnv.IApp */
type App struct {
	*lxApp.App
	nomenclatureHolder *nomenclature.Holder
	cartridgeSlug      string
}

var _ cnv.IApp = (*App)(nil)

/** @constructor */
func NewApp() (cnv.IApp, error) {
	app := &App{App: lxApp.NewApp()}

	if err := lxApp.Configure(app); err != nil {
		return nil, err
	}

	if err := setComponents(app); err != nil {
		return nil, err
	}

	cartridgeSlug, err := config.GetParam[string](app.Config(), "CartridgeSlug")
	if err != nil {
		return nil, fmt.Errorf("CartridgeSlug: %w", err)
	}
	if err := nomenclature.ValidateSlug(cartridgeSlug); err != nil {
		return nil, fmt.Errorf("CartridgeSlug: %w", err)
	}
	app.cartridgeSlug = cartridgeSlug

	gamesDir, err := config.GetParam[string](app.Config(), "GamesDir")
	if err != nil {
		return nil, fmt.Errorf("GamesDir: %w", err)
	}
	loadOpts, err := readNomenclatureLoadOptions(app.Config())
	if err != nil {
		return nil, fmt.Errorf("can not read game nomenclature filters: %w", err)
	}
	holder := nomenclature.NewHolder()
	if err := holder.Load(gamesDir, loadOpts); err != nil {
		return nil, fmt.Errorf("can not load game nomenclature: %w", err)
	}
	app.nomenclatureHolder = holder

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

// NomenclatureHolder returns the app's loaded game declarations.
func (app *App) NomenclatureHolder() *nomenclature.Holder {
	return app.nomenclatureHolder
}

// CartridgeSlug returns this cartridge's own slug (CartridgeSlug config
// param), already validated at startup (see NewApp).
func (app *App) CartridgeSlug() string {
	return app.cartridgeSlug
}
