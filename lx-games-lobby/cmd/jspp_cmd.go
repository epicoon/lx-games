package cmd

import (
	"fmt"

	pkgApp "github.com/epicoon/lx-games-lobby/app"
	"github.com/epicoon/lxgo/cmd"
	jsppCmd "github.com/epicoon/lxgo/jspp/cmd"
)

func NewJSPPCommand(_ ...cmd.ICommandOptions) cmd.ICommand {
	app, err := pkgApp.NewApp()
	if err != nil {
		fmt.Printf("Can not create application: %v\n", err)
	}

	return jsppCmd.NewCompileCommand(jsppCmd.CompileCommandOptions{
		App: app,
	})
}
