package app

import (
	"fmt"

	authClient "github.com/epicoon/lxgo/auth_client"
	jsppComp "github.com/epicoon/lxgo/jspp/component"
	"github.com/epicoon/lxgo/kernel"
	"github.com/epicoon/lxgo/session"
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

	// Set Session Storage
	if err := session.SetAppComponent(app, "Components.SessionStorage"); err != nil {
		return fmt.Errorf("can not init component SessionStorage: %v", err)
	}

	// Set Auth Client
	if err := authClient.SetAppComponent(app, "Components.Auth"); err != nil {
		return fmt.Errorf("can not init component Auth: %v", err)
	}

	return nil
}
