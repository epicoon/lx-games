package main

import (
	lxCmd "github.com/epicoon/lxgo/cmd"

	"github.com/epicoon/lx-games-lobby/cmd"
)

func main() {
	lxCmd.Init(lxCmd.CommandsList{
		"":     cmd.NewMainCommand,
		"jspp": cmd.NewJSPPCommand,
	})
	lxCmd.Run()
}
