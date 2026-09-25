package handlers

import "testing"

func TestEmbedAssetURLs_RewritesRelativeScriptsAndCss(t *testing.T) {
	plugin := map[string]any{
		"root": "Game",
		"assets": map[string]any{
			"scripts": []any{"core.js", "mods/foo.js"},
			"css":     []any{"style.css"},
		},
		"lx": map[string]any{
			"Game": map[string]any{"conf": map[string]any{}},
		},
	}

	if err := embedAssetURLs(plugin, "nk1"); err != nil {
		t.Fatalf("embedAssetURLs: %v", err)
	}

	scripts := plugin["assets"].(map[string]any)["scripts"].([]any)
	if scripts[0] != "/game/assets/nk1/core.js" {
		t.Fatalf("scripts[0] = %q, want %q", scripts[0], "/game/assets/nk1/core.js")
	}
	if scripts[1] != "/game/assets/nk1/mods/foo.js" {
		t.Fatalf("scripts[1] = %q, want %q", scripts[1], "/game/assets/nk1/mods/foo.js")
	}

	css := plugin["assets"].(map[string]any)["css"].([]any)
	if css[0] != "/game/assets/nk1/style.css" {
		t.Fatalf("css[0] = %q, want %q", css[0], "/game/assets/nk1/style.css")
	}
}

func TestEmbedAssetURLs_LeavesAbsoluteURLsUntouched(t *testing.T) {
	plugin := map[string]any{
		"root": "Game",
		"assets": map[string]any{
			"scripts": []any{"https://cdn.example.com/core.js"},
			"css":     []any{"http://cdn.example.com/style.css"},
		},
		"lx": map[string]any{
			"Game": map[string]any{"conf": map[string]any{}},
		},
	}

	if err := embedAssetURLs(plugin, "nk1"); err != nil {
		t.Fatalf("embedAssetURLs: %v", err)
	}

	scripts := plugin["assets"].(map[string]any)["scripts"].([]any)
	if scripts[0] != "https://cdn.example.com/core.js" {
		t.Fatalf("absolute script path was rewritten: %q", scripts[0])
	}
	css := plugin["assets"].(map[string]any)["css"].([]any)
	if css[0] != "http://cdn.example.com/style.css" {
		t.Fatalf("absolute css path was rewritten: %q", css[0])
	}
}

func TestEmbedAssetURLs_RewritesImagePathsOnEveryNestedPlugin(t *testing.T) {
	plugin := map[string]any{
		"root": "Game",
		"assets": map[string]any{
			"scripts": []any{},
			"css":     []any{},
		},
		"lx": map[string]any{
			"Game": map[string]any{
				"conf": map[string]any{
					"imagePaths": map[string]any{"default": "assets/images"},
				},
			},
			"Game.subWidget": map[string]any{
				"conf": map[string]any{
					"imagePaths": map[string]any{
						"default": "widgets/sub/images",
						"icons":   "https://cdn.example.com/icons",
					},
				},
			},
			"Game.noConf": map[string]any{},
		},
	}

	if err := embedAssetURLs(plugin, "nk1"); err != nil {
		t.Fatalf("embedAssetURLs: %v", err)
	}

	lx := plugin["lx"].(map[string]any)

	rootImgs := lx["Game"].(map[string]any)["conf"].(map[string]any)["imagePaths"].(map[string]any)
	if rootImgs["default"] != "/game/assets/nk1/assets/images" {
		t.Fatalf("root imagePaths[default] = %q", rootImgs["default"])
	}

	subImgs := lx["Game.subWidget"].(map[string]any)["conf"].(map[string]any)["imagePaths"].(map[string]any)
	if subImgs["default"] != "/game/assets/nk1/widgets/sub/images" {
		t.Fatalf("nested imagePaths[default] = %q", subImgs["default"])
	}
	if subImgs["icons"] != "https://cdn.example.com/icons" {
		t.Fatalf("nested absolute imagePaths[icons] was rewritten: %q", subImgs["icons"])
	}
}

func TestEmbedAssetURLs_MissingAssets_Errors(t *testing.T) {
	plugin := map[string]any{"root": "Game", "lx": map[string]any{}}

	if err := embedAssetURLs(plugin, "nk1"); err == nil {
		t.Fatal("expected an error for missing \"assets\", got nil")
	}
}

func TestEmbedAssetURLs_MissingLx_Errors(t *testing.T) {
	plugin := map[string]any{
		"root":   "Game",
		"assets": map[string]any{"scripts": []any{}, "css": []any{}},
	}

	if err := embedAssetURLs(plugin, "nk1"); err == nil {
		t.Fatal("expected an error for missing \"lx\", got nil")
	}
}

func TestRewriteAssetPath_LeadingSlashNotDoubled(t *testing.T) {
	got := rewriteAssetPath("/core.js", "nk1")
	want := "/game/assets/nk1/core.js"
	if got != want {
		t.Fatalf("rewriteAssetPath(%q) = %q, want %q", "/core.js", got, want)
	}
}

func TestRewriteHTMLAssetPaths_RewritesRootRelativeSrc(t *testing.T) {
	plugin := map[string]any{
		"html": `<div><img src="/web/abc123/close.png" class="x"></div>`,
	}

	if err := rewriteHTMLAssetPaths(plugin, "nk1"); err != nil {
		t.Fatalf("rewriteHTMLAssetPaths: %v", err)
	}

	want := `<div><img src="/game/assets/nk1/web/abc123/close.png" class="x"></div>`
	if plugin["html"] != want {
		t.Fatalf("html = %q, want %q", plugin["html"], want)
	}
}

func TestRewriteHTMLAssetPaths_LeavesAbsoluteAndSingleQuoted(t *testing.T) {
	plugin := map[string]any{
		"html": `<img src="https://cdn.example.com/a.png"><img src='/web/x/b.png'>`,
	}

	if err := rewriteHTMLAssetPaths(plugin, "nk1"); err != nil {
		t.Fatalf("rewriteHTMLAssetPaths: %v", err)
	}

	want := `<img src="https://cdn.example.com/a.png"><img src='/game/assets/nk1/web/x/b.png'>`
	if plugin["html"] != want {
		t.Fatalf("html = %q, want %q", plugin["html"], want)
	}
}

func TestRewriteHTMLAssetPaths_MissingHtml_Errors(t *testing.T) {
	plugin := map[string]any{}

	if err := rewriteHTMLAssetPaths(plugin, "nk1"); err == nil {
		t.Fatal("expected an error for missing \"html\", got nil")
	}
}
