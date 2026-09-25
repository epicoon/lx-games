package cnv

import (
	"github.com/epicoon/lx-games-cartridge/nomenclature"
	"github.com/epicoon/lxgo/kernel"
)

type IApp interface {
	kernel.IApp

	// NomenclatureHolder returns the app's loaded game declarations.
	NomenclatureHolder() *nomenclature.Holder

	// CartridgeSlug returns this cartridge's own slug.
	CartridgeSlug() string
}
