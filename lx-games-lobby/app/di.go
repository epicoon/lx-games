package app

import (
	"fmt"

	"github.com/epicoon/lx-games-lobby/app/plugins/lobby"
	"github.com/epicoon/lxgo/kernel"
)

func setDI(app kernel.IApp) error {
	// Go-side plugin counterparts.
	if err := app.DIContainer().Register(kernel.CAnyList{
		"lobby.LobbyPlugin": func(...any) any { return lobby.NewLobbyPlugin() },
	}); err != nil {
		return fmt.Errorf("can not register plugin DI entries: %v", err)
	}

	return nil
}
