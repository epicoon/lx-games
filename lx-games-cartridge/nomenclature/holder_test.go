package nomenclature

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const noI18nGameYAML = `
info:
  slug: "seabattle"
  title: "Sea Battle"
  version: "0.1.0"
  description: "The timeless fleet duel for two."
  genre: "Classic · duel"
  icon: ""
  banner: ""
  durationMinutes: "10-15"
  minSlots: 2
  maxSlots: 2
  online: true
  offline: false
`

const i18nGameYAML = `
info:
  slug: "ootv"
  title: "Outposts of the Void"
  version: "0.1.0"
  description: "Send drones, build outposts."
  genre: "Eurogame · space"
  icon: ""
  banner: ""
  durationMinutes: "45-60"
  minSlots: 2
  maxSlots: 4
  online: true
  offline: true

i18n:
  current: en-EN
  file: game-info.yaml
  keys: [title, description, genre]
`

const i18nTranslationsYAML = `
ru-RU:
  title: "Космические Аванпосты"
  description: "Отправляйте дронов, возводите аванпосты."
  genre: "Евромеханика · космос"
`

// writeGame creates dir/lx-game.yaml, dir/lx-plugin.yaml (named after dir,
// e.g. "seabattle" -> "SeabattlePlugin") and dir/<i18n file> (if given)
// under root, for Load to pick up.
func writeGame(t *testing.T, root, dir, gameYAML string, i18nFile, i18nYAML string) {
	t.Helper()
	gameDir := filepath.Join(root, dir)
	if err := os.MkdirAll(gameDir, 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", gameDir, err)
	}
	if err := os.WriteFile(filepath.Join(gameDir, "lx-game.yaml"), []byte(gameYAML), 0o644); err != nil {
		t.Fatalf("write lx-game.yaml: %v", err)
	}
	pluginName := strings.ToUpper(dir[:1]) + dir[1:] + "Plugin"
	pluginYAML := "name: " + pluginName + "\n"
	if err := os.WriteFile(filepath.Join(gameDir, "lx-plugin.yaml"), []byte(pluginYAML), 0o644); err != nil {
		t.Fatalf("write lx-plugin.yaml: %v", err)
	}
	if i18nFile != "" {
		if err := os.WriteFile(filepath.Join(gameDir, i18nFile), []byte(i18nYAML), 0o644); err != nil {
			t.Fatalf("write %s: %v", i18nFile, err)
		}
	}
}

func TestHolder_Export_GameWithoutI18n_HasNoTranslationsField(t *testing.T) {
	root := t.TempDir()
	writeGame(t, root, "seabattle", noI18nGameYAML, "", "")

	h := NewHolder()
	if err := h.Load(root, LoadOptions{}); err != nil {
		t.Fatalf("Load: %v", err)
	}

	games := h.Export()
	if len(games) != 1 {
		t.Fatalf("expected 1 game, got %d", len(games))
	}
	if games[0]["title"] != "Sea Battle" {
		t.Fatalf("expected untranslated title, got %#v", games[0]["title"])
	}
	if _, has := games[0]["translations"]; has {
		t.Fatalf("expected no \"translations\" key for a game with no i18n section, got %#v", games[0]["translations"])
	}
}

func TestHolder_Export_GameWithI18n_IncludesTranslationsMapUnfiltered(t *testing.T) {
	root := t.TempDir()
	writeGame(t, root, "ootv", i18nGameYAML, "game-info.yaml", i18nTranslationsYAML)

	h := NewHolder()
	if err := h.Load(root, LoadOptions{}); err != nil {
		t.Fatalf("Load: %v", err)
	}

	games := h.Export()
	if len(games) != 1 {
		t.Fatalf("expected 1 game, got %d", len(games))
	}
	g := games[0]
	// Export reports info as-is, untranslated - choosing a language is the
	// caller's (the lobby's) job now, not this package's.
	if g["title"] != "Outposts of the Void" {
		t.Fatalf("expected untranslated title from Export, got %#v", g["title"])
	}

	translations, ok := g["translations"].(map[string]map[string]string)
	if !ok {
		t.Fatalf("expected a translations map, got %#v", g["translations"])
	}
	ru, ok := translations["ru-RU"]
	if !ok {
		t.Fatalf("expected a ru-RU entry, got %#v", translations)
	}
	if ru["title"] != "Космические Аванпосты" || ru["description"] != "Отправляйте дронов, возводите аванпосты." || ru["genre"] != "Евромеханика · космос" {
		t.Fatalf("unexpected ru-RU translation: %#v", ru)
	}
}

func TestHolder_GamePlugins_MapsSlugToPluginName(t *testing.T) {
	root := t.TempDir()
	writeGame(t, root, "seabattle", noI18nGameYAML, "", "")
	writeGame(t, root, "ootv", i18nGameYAML, "game-info.yaml", i18nTranslationsYAML)

	h := NewHolder()
	if err := h.Load(root, LoadOptions{}); err != nil {
		t.Fatalf("Load: %v", err)
	}

	got := h.GamePlugins()
	want := map[string]string{"seabattle": "SeabattlePlugin", "ootv": "OotvPlugin"}
	if len(got) != len(want) {
		t.Fatalf("expected %#v, got %#v", want, got)
	}
	for slug, plugin := range want {
		if got[slug] != plugin {
			t.Fatalf("expected %q -> %q, got %#v", slug, plugin, got)
		}
	}
}

func TestValidateSlug(t *testing.T) {
	if err := ValidateSlug("seabattle"); err != nil {
		t.Fatalf("expected no error for a dot-free slug, got %v", err)
	}
	if err := ValidateSlug("sea.battle"); err == nil {
		t.Fatalf("expected an error for a slug containing \".\", got nil")
	}
}

func TestHolder_Load_GameSlugWithDot_ReturnsError(t *testing.T) {
	root := t.TempDir()
	writeGame(t, root, "sea.battle", strings.Replace(noI18nGameYAML, "seabattle", "sea.battle", 1), "", "")

	h := NewHolder()
	if err := h.Load(root, LoadOptions{}); err == nil {
		t.Fatalf("expected an error for a game slug containing \".\", got nil")
	}
}

func TestHolder_Load_MissingLxPluginYaml_ReturnsError(t *testing.T) {
	root := t.TempDir()
	gameDir := filepath.Join(root, "seabattle")
	if err := os.MkdirAll(gameDir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(gameDir, "lx-game.yaml"), []byte(noI18nGameYAML), 0o644); err != nil {
		t.Fatalf("write lx-game.yaml: %v", err)
	}

	h := NewHolder()
	if err := h.Load(root, LoadOptions{}); err == nil {
		t.Fatalf("expected an error for a game directory with no lx-plugin.yaml, got nil")
	}
}

func TestHolder_Load_SkipsDirectoriesWithoutLxGameYaml(t *testing.T) {
	root := t.TempDir()
	writeGame(t, root, "seabattle", noI18nGameYAML, "", "")
	if err := os.MkdirAll(filepath.Join(root, "not-a-game"), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}

	h := NewHolder()
	if err := h.Load(root, LoadOptions{}); err != nil {
		t.Fatalf("Load: %v", err)
	}

	games := h.Export()
	if len(games) != 1 {
		t.Fatalf("expected only the real game plugin, got %d games", len(games))
	}
}

func TestHolder_Load_DuplicateSlug_ReturnsError(t *testing.T) {
	root := t.TempDir()
	// Two different plugin directories both declaring info.slug "seabattle" -
	// a misconfiguration, not a valid load-balancing case (that's two nodes
	// of the same cartridge process, not two directories in one process).
	writeGame(t, root, "seabattle", noI18nGameYAML, "", "")
	writeGame(t, root, "seabattle-copy", noI18nGameYAML, "", "")

	h := NewHolder()
	if err := h.Load(root, LoadOptions{}); err == nil {
		t.Fatalf("expected an error for a duplicate game slug, got nil")
	}
}

func slugs(games []map[string]any) []string {
	out := make([]string, len(games))
	for i, g := range games {
		out[i] = g["slug"].(string)
	}
	return out
}

func containsAll(got []string, want ...string) bool {
	if len(got) != len(want) {
		return false
	}
	for _, w := range want {
		found := false
		for _, g := range got {
			if g == w {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

func TestHolder_Load_Ignore_SkipsListedSlug(t *testing.T) {
	root := t.TempDir()
	writeGame(t, root, "seabattle", noI18nGameYAML, "", "")
	writeGame(t, root, "ootv", i18nGameYAML, "game-info.yaml", i18nTranslationsYAML)

	h := NewHolder()
	if err := h.Load(root, LoadOptions{Ignore: []string{"seabattle"}}); err != nil {
		t.Fatalf("Load: %v", err)
	}

	got := slugs(h.Export())
	if !containsAll(got, "ootv") {
		t.Fatalf("expected only [ootv], got %v", got)
	}
}

func TestHolder_Load_Allow_KeepsOnlyListedSlugs(t *testing.T) {
	root := t.TempDir()
	writeGame(t, root, "seabattle", noI18nGameYAML, "", "")
	writeGame(t, root, "ootv", i18nGameYAML, "game-info.yaml", i18nTranslationsYAML)

	h := NewHolder()
	if err := h.Load(root, LoadOptions{Allow: []string{"ootv"}}); err != nil {
		t.Fatalf("Load: %v", err)
	}

	got := slugs(h.Export())
	if !containsAll(got, "ootv") {
		t.Fatalf("expected only [ootv], got %v", got)
	}
}

func TestHolder_Load_IgnoreWinsOverAllow(t *testing.T) {
	root := t.TempDir()
	writeGame(t, root, "seabattle", noI18nGameYAML, "", "")
	writeGame(t, root, "ootv", i18nGameYAML, "game-info.yaml", i18nTranslationsYAML)

	h := NewHolder()
	// ootv is in both Ignore and Allow - Ignore must win.
	err := h.Load(root, LoadOptions{Ignore: []string{"ootv"}, Allow: []string{"ootv", "seabattle"}})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}

	got := slugs(h.Export())
	if !containsAll(got, "seabattle") {
		t.Fatalf("expected only [seabattle] (ignore wins over allow), got %v", got)
	}
}

func TestHolder_Load_UnknownSlugInFilters_IsNotAnError(t *testing.T) {
	root := t.TempDir()
	writeGame(t, root, "seabattle", noI18nGameYAML, "", "")

	h := NewHolder()
	err := h.Load(root, LoadOptions{Ignore: []string{"nonexistent"}})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}

	got := slugs(h.Export())
	if !containsAll(got, "seabattle") {
		t.Fatalf("expected [seabattle] unaffected by an unmatched Ignore entry, got %v", got)
	}
}
