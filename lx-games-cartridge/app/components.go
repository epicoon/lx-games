package app

import (
	"fmt"

	"github.com/epicoon/lxgo/cors"
	jsppComp "github.com/epicoon/lxgo/jspp/component"
	"github.com/epicoon/lxgo/kernel"
	wsComp "github.com/epicoon/lxgo/ws/component"
)

func setComponents(app kernel.IApp) error {
	// Set Web Socket Server
	if err := wsComp.SetAppComponent(app, "Components.WSServer"); err != nil {
		return err
	}

	// Set JS Preprocessor
	if err := jsppComp.SetAppComponent(app, "Components.JSPreprocessor"); err != nil {
		return fmt.Errorf("can not init component JSPreprocessor: %v", err)
	}

	// Set CORS - optional, see corsConfigured.
	if corsConfigured(app) {
		if err := cors.SetAppComponent(app, "Components.Cors"); err != nil {
			return fmt.Errorf("can not init component Cors: %v", err)
		}
	}

	return nil
}

func corsConfigured(app kernel.IApp) bool {
	components, ok := app.Config().Get("Components").(kernel.Dict)
	if !ok {
		return false
	}
	_, ok = components["Cors"]
	return ok
}
