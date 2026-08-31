package cmd

import (
	"fmt"

	pkgApp "github.com/epicoon/lx-games-lobby/app"
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
		fmt.Printf("Can not create application: %v\n", err)
		return nil
	}

	app.Run()
	app.Final()

	return nil
}
