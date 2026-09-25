// Package nomenclature loads this cartridge's game declarations (one
// lx-game.yaml per game plugin directory) and exports them, translations
// included - choosing a language for a given request is the caller's job.
package nomenclature

import (
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"gopkg.in/yaml.v3"
)

// ValidateSlug reports an error if slug can't be used as this cartridge's
// own slug (CartridgeSlug) or a game's slug (gameInfo.Slug) - specifically,
// it must not contain ".". "cartridgeSlug.gameSlug" concatenates  into a
// single lookup key; a dot inside either half would make that key ambiguous
// (two different (cartridge, game) pairs could produce the same string).
func ValidateSlug(slug string) error {
	if strings.Contains(slug, ".") {
		return fmt.Errorf("slug %q must not contain \".\"", slug)
	}
	return nil
}

// gameInfo is one game's static declaration, the "info" section of its own
// lx-game.yaml - field names match what lx-games-lobby's
// cartridges.decodeNomenclature expects on the wire.
type gameInfo struct {
	// Slug must not contain "." - see ValidateSlug, checked by loadGame.
	Slug            string `yaml:"slug"`
	Title           string `yaml:"title"`
	Version         string `yaml:"version"`
	Description     string `yaml:"description"`
	Genre           string `yaml:"genre"`
	Icon            string `yaml:"icon"`
	Banner          string `yaml:"banner"`
	DurationMinutes string `yaml:"durationMinutes"`
	MinSlots        int    `yaml:"minSlots"`
	MaxSlots        int    `yaml:"maxSlots"`
	Online          bool   `yaml:"online"`
	Offline         bool   `yaml:"offline"`
}

// gameI18n is a game's optional "i18n" section - absent entirely means the
// game has no translations at all, info's own values are reported.
type gameI18n struct {
	// Current is the language info's own values are already written in.
	Current string `yaml:"current"`
	// File is a translations YAML path, relative to the directory
	// lx-game.yaml itself lives in.
	File string `yaml:"file"`
	// Keys lists which info fields are translatable - only these are
	// looked up in File's per-language sections; anything else in info
	// stays as declared regardless of language.
	Keys []string `yaml:"keys"`
}

// gameFile is one lx-game.yaml's whole shape.
type gameFile struct {
	Info gameInfo  `yaml:"info"`
	I18n *gameI18n `yaml:"i18n"`
}

// pluginFile is the subset of lx-plugin.yaml this package reads - just the
// jspp plugin class name, the rest of that file belongs to jspp's own
// plugin config (see lxgo-jspp/plugins.Config).
type pluginFile struct {
	Name string `yaml:"name"`
}

// loadedGame is one game's fully-loaded declaration.
type loadedGame struct {
	info gameInfo
	// dir is the plugin directory this game was loaded from - only kept
	// for the duplicate-slug error message (see Load).
	dir        string
	pluginName string
	i18n       *gameI18n
	// translations[lang][key], only for languages/keys the i18n file
	// actually defines - nil entirely for a game with no i18n section.
	translations map[string]map[string]string
}

// Holder loads this cartridge's game declarations once at startup, and
// exports them (see Export) - untranslated info plus every language it
// has translations for.
type Holder struct {
	games map[string]*loadedGame
}

/** @constructor */

// NewHolder constructs an empty Holder - call Load to populate it.
func NewHolder() *Holder {
	return &Holder{}
}

// LoadOptions filters which found games Load actually keeps. Ignore always
// wins over Allow when a slug is listed in both.
type LoadOptions struct {
	// Ignore lists game slugs to skip publishing. A slug here that no
	// loaded game actually has is simply never matched, not an error.
	// Empty/nil means nothing is explicitly ignored.
	Ignore []string
	// Allow, if non-empty, is the only game slugs published - any other
	// loaded game is skipped. Empty/nil means every loaded game is
	// eligible (except whatever Ignore excludes).
	Allow []string
}

func (opts LoadOptions) excludes(slug string) bool {
	if slices.Contains(opts.Ignore, slug) {
		return true
	}
	return len(opts.Allow) > 0 && !slices.Contains(opts.Allow, slug)
}

// Load scans pluginsDir (e.g. "runtime/plugins") for every immediate
// subdirectory's lx-game.yaml and parses each one - a subdirectory without
// one just isn't a game plugin, skipped silently. A game opts excludes
// (see LoadOptions) is parsed but not kept - it doesn't count toward the
// duplicate-slug check either. Replaces any previously-loaded games.
func (h *Holder) Load(pluginsDir string, opts LoadOptions) error {
	entries, err := os.ReadDir(pluginsDir)
	if err != nil {
		return fmt.Errorf("read plugins dir %q: %w", pluginsDir, err)
	}

	games := make(map[string]*loadedGame, len(entries))
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		dir := filepath.Join(pluginsDir, e.Name())
		path := filepath.Join(dir, "lx-game.yaml")
		if _, err := os.Stat(path); err != nil {
			continue
		}

		g, err := loadGame(dir, path)
		if err != nil {
			return fmt.Errorf("load %s: %w", path, err)
		}

		if opts.excludes(g.info.Slug) {
			continue
		}

		if existing, exists := games[g.info.Slug]; exists {
			return fmt.Errorf("duplicate game slug %q: declared in both %s and %s", g.info.Slug, existing.dir, dir)
		}

		games[g.info.Slug] = g
	}

	h.games = games
	return nil
}

// Export returns every loaded game's nomenclature as the map shape
// lx-games-lobby's cartridges.decodeNomenclature expects - info's own
// (untranslated) values, plus, for a game with an i18n section, every
// language its translations file actually defines.
func (h *Holder) Export() []map[string]any {
	out := make([]map[string]any, 0, len(h.games))
	for _, g := range h.games {
		out = append(out, g.toMap())
	}
	return out
}

// GamePlugins returns every loaded game's slug mapped to the jspp plugin
// class that implements it (lx-plugin.yaml's own "name", sitting next to
// that game's lx-game.yaml).
func (h *Holder) GamePlugins() map[string]string {
	out := make(map[string]string, len(h.games))
	for slug, g := range h.games {
		out[slug] = g.pluginName
	}
	return out
}

func loadGame(dir, path string) (*loadedGame, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var gf gameFile
	if err := yaml.Unmarshal(data, &gf); err != nil {
		return nil, err
	}
	if err := ValidateSlug(gf.Info.Slug); err != nil {
		return nil, fmt.Errorf("invalid game slug: %w", err)
	}

	pluginPath := filepath.Join(dir, "lx-plugin.yaml")
	pluginData, err := os.ReadFile(pluginPath)
	if err != nil {
		return nil, fmt.Errorf("read plugin file %s: %w", pluginPath, err)
	}
	var pf pluginFile
	if err := yaml.Unmarshal(pluginData, &pf); err != nil {
		return nil, fmt.Errorf("parse plugin file %s: %w", pluginPath, err)
	}
	if pf.Name == "" {
		return nil, fmt.Errorf("plugin file %s has no \"name\"", pluginPath)
	}

	g := &loadedGame{info: gf.Info, dir: dir, pluginName: pf.Name, i18n: gf.I18n}
	if gf.I18n == nil || gf.I18n.File == "" {
		return g, nil
	}

	transPath := filepath.Join(dir, gf.I18n.File)
	transData, err := os.ReadFile(transPath)
	if err != nil {
		return nil, fmt.Errorf("read i18n file %s: %w", transPath, err)
	}
	var translations map[string]map[string]string
	if err := yaml.Unmarshal(transData, &translations); err != nil {
		return nil, fmt.Errorf("parse i18n file %s: %w", transPath, err)
	}
	g.translations = translations

	return g, nil
}

func (g *loadedGame) toMap() map[string]any {
	m := map[string]any{
		"title":           g.info.Title,
		"slug":            g.info.Slug,
		"version":         g.info.Version,
		"description":     g.info.Description,
		"genre":           g.info.Genre,
		"icon":            g.info.Icon,
		"banner":          g.info.Banner,
		"durationMinutes": g.info.DurationMinutes,
		"minSlots":        g.info.MinSlots,
		"maxSlots":        g.info.MaxSlots,
		"online":          g.info.Online,
		"offline":         g.info.Offline,
	}
	if translations := g.exportableTranslations(); len(translations) > 0 {
		m["translations"] = translations
	}
	return m
}

func (g *loadedGame) exportableTranslations() map[string]map[string]string {
	if g.i18n == nil {
		return nil
	}
	out := make(map[string]map[string]string, len(g.translations))
	for lang, perKey := range g.translations {
		filtered := make(map[string]string, len(g.i18n.Keys))
		for _, key := range g.i18n.Keys {
			if val, ok := perKey[key]; ok {
				filtered[key] = val
			}
		}
		if len(filtered) > 0 {
			out[lang] = filtered
		}
	}
	return out
}
