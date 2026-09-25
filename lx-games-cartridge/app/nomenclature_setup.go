package app

import (
	"fmt"

	"github.com/epicoon/lx-games-cartridge/nomenclature"
	"github.com/epicoon/lxgo/kernel"
	"github.com/epicoon/lxgo/kernel/config"
)

// readGameSlugs reads an optional list-of-strings config param - absent
// entirely means no slugs listed (not an error), matching
// nomenclature.LoadOptions.Ignore/Allow's own "empty/nil means no filter"
// convention.
func readGameSlugs(cfg kernel.IDict, key string) ([]string, error) {
	if !config.HasParam(cfg, key) {
		return nil, nil
	}
	slugs, err := config.GetParam[[]string](cfg, key)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", key, err)
	}
	return slugs, nil
}

// readNomenclatureLoadOptions reads GamesIgnore/GamesAllow from cfg - see
// nomenclature.LoadOptions for what each does.
func readNomenclatureLoadOptions(cfg kernel.IDict) (nomenclature.LoadOptions, error) {
	ignore, err := readGameSlugs(cfg, "GamesIgnore")
	if err != nil {
		return nomenclature.LoadOptions{}, err
	}
	allow, err := readGameSlugs(cfg, "GamesAllow")
	if err != nil {
		return nomenclature.LoadOptions{}, err
	}
	return nomenclature.LoadOptions{Ignore: ignore, Allow: allow}, nil
}
