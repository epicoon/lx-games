package app

import (
	"fmt"

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

	return nil
}
