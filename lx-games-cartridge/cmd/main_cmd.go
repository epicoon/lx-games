package cmd

import (
	"fmt"

	pkgApp "github.com/epicoon/lx-games-cartridge/app"
	"github.com/epicoon/lxgo/cmd"
)

type MainCommand struct {
	*cmd.Command
}

func NewMainCommand(_ ...cmd.ICommandOptions) cmd.ICommand {
	return &MainCommand{Command: cmd.NewCommand()}
}

func (c *MainCommand) Exec() error {
	app, err := pkgApp.NewApp()
	if err != nil {
		return fmt.Errorf("can not create application: %w", err)
	}

	app.Run()
	app.Final()

	return nil
}
