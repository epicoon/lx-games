package cnv

import (
	"github.com/epicoon/lx-games-lobby/cartridges"
	"github.com/epicoon/lxgo/kernel"
)

type IApp interface {
	kernel.IApp

	// CartridgesRegistry returns the app's registry of configured
	// cartridges and its current connections to them.
	CartridgesRegistry() *cartridges.Registry
}
