package handlers

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/epicoon/lx-games-lobby/cnv"
	"github.com/epicoon/lxgo/kernel"
	lxHttp "github.com/epicoon/lxgo/kernel/http"
)

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * GameGetForm
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/** @interface kernel.IForm */
type GameGetForm struct {
	*lxHttp.Form
	Game string `json:"game"`
	Lang string `json:"lang"`
}

var _ kernel.IForm = (*GameGetForm)(nil)

/** @constructor kernel.CForm */
func NewGameGetForm() kernel.IForm {
	return lxHttp.PrepareForm(&GameGetForm{Form: lxHttp.NewForm()})
}

func (f *GameGetForm) Config() kernel.FormConfig {
	return kernel.FormConfig{
		"game": kernel.FormFieldConfig{
			Description: "required game key - 'CartridgeSlug.GameSlug'",
			Required:    true,
		},
		"lang": kernel.FormFieldConfig{
			Description: "requested render language, absent/empty means \"en-EN\"",
			Required:    false,
		},
	}
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * GameGetHandler
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/** @interface kernel.IHttpResource */
type GameGetHandler struct {
	*lxHttp.Resource
}

var _ kernel.IHttpResource = (*GameGetHandler)(nil)

/** @constructor kernel.CHttpResource */
func NewGameGetHandler() kernel.IHttpResource {
	return &GameGetHandler{
		Resource: lxHttp.NewResource(kernel.HttpResourceConfig{CRequestForm: NewGameGetForm}),
	}
}

func (h *GameGetHandler) Run() kernel.IHttpResponse {
	req := h.RequestForm().(*GameGetForm)
	if req.HasErrors() {
		return h.ErrorResponse(http.StatusBadRequest, "Missed required parameters: "+req.GetFirstError().Error())
	}

	registry := h.App().(cnv.IApp).CartridgesRegistry()

	nodeKey, ok := registry.PickNode(req.Game)
	if !ok {
		return h.ErrorResponse(http.StatusNotFound, fmt.Sprintf("no connected cartridge currently serves %q", req.Game))
	}

	idx := strings.Index(req.Game, ".")
	if idx < 0 {
		return h.ErrorResponse(http.StatusBadRequest, fmt.Sprintf("malformed game key %q, expected \"CartridgeSlug.GameSlug\"", req.Game))
	}
	slug := req.Game[idx+1:]

	node, ok := registry.Node(nodeKey)
	if !ok {
		return h.ErrorResponse(http.StatusNotFound, fmt.Sprintf("no connected cartridge currently serves %q", req.Game))
	}

	plugin, err := node.Conn.FetchGame(slug, req.Lang)
	if err != nil {
		return h.ErrorResponse(http.StatusBadGateway, fmt.Sprintf("cartridge did not return a plugin for %q: %v", req.Game, err))
	}

	if err := embedDepsURL(plugin, GameDepsPathPrefix+nodeKey); err != nil {
		return h.ErrorResponse(http.StatusInternalServerError, fmt.Sprintf("malformed plugin descriptor for %q: %v", req.Game, err))
	}
	if err := embedAssetURLs(plugin, nodeKey); err != nil {
		return h.ErrorResponse(http.StatusInternalServerError, fmt.Sprintf("malformed plugin descriptor for %q: %v", req.Game, err))
	}
	if err := rewriteHTMLAssetPaths(plugin, nodeKey); err != nil {
		return h.ErrorResponse(http.StatusInternalServerError, fmt.Sprintf("malformed plugin descriptor for %q: %v", req.Game, err))
	}

	return h.JsonResponse(kernel.JsonResponseConfig{Data: map[string]any{"gameBundle": plugin}})
}

// embedDepsURL sets modDepUrl on the root plugin's own conf - LoadContext.run
// (lxgo-jspp) reads it from exactly there to target promiseModules at a
// specific host/path instead of the current page's own default origin.
// plugin is jspp.PluginRenderInfo's own JSON shape, decoded generically
// (see Conn.FetchGame's doc comment for why it isn't a typed Go struct
// here).
func embedDepsURL(plugin map[string]any, url string) error {
	root, ok := plugin["root"].(string)
	if !ok {
		return fmt.Errorf("missing/non-string \"root\"")
	}
	lx, ok := plugin["lx"].(map[string]any)
	if !ok {
		return fmt.Errorf("missing/non-object \"lx\"")
	}
	rootPlugin, ok := lx[root].(map[string]any)
	if !ok {
		return fmt.Errorf("missing/non-object \"lx\"[%q]", root)
	}
	conf, ok := rootPlugin["conf"].(map[string]any)
	if !ok {
		return fmt.Errorf("missing/non-object \"lx\"[%q][\"conf\"]", root)
	}
	conf["modDepUrl"] = url
	return nil
}

// embedAssetURLs rewrites every relative asset path in plugin (the flat
// assets.scripts/css list, plus imagePaths in every nested plugin's own
// conf - see GameAssetsHandler) into a lobby-relative /game/assets/
// <nodeKey>/... URL, routed through GameAssetsHandler to the cartridge
// node that actually rendered the plugin. An already-absolute http(s)://
// path is left untouched - the cartridge configured its own
// AssetLinksPath.Outer deliberately (lxgo-jspp's asset_linker.go), nothing
// to relay for it. plugin is jspp.PluginRenderInfo's own JSON shape,
// decoded generically (see embedDepsURL).
func embedAssetURLs(plugin map[string]any, nodeKey string) error {
	assets, ok := plugin["assets"].(map[string]any)
	if !ok {
		return fmt.Errorf("missing/non-object \"assets\"")
	}
	for _, key := range []string{"scripts", "css"} {
		list, ok := assets[key].([]any)
		if !ok {
			continue
		}
		for i, v := range list {
			path, ok := v.(string)
			if !ok {
				return fmt.Errorf("non-string entry in \"assets\"[%q][%d]", key, i)
			}
			list[i] = rewriteAssetPath(path, nodeKey)
		}
	}

	lx, ok := plugin["lx"].(map[string]any)
	if !ok {
		return fmt.Errorf("missing/non-object \"lx\"")
	}
	for key, raw := range lx {
		pluginData, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		conf, ok := pluginData["conf"].(map[string]any)
		if !ok {
			continue
		}
		imagePaths, ok := conf["imagePaths"].(map[string]any)
		if !ok {
			continue
		}
		for imgKey, v := range imagePaths {
			path, ok := v.(string)
			if !ok {
				return fmt.Errorf("non-string \"lx\"[%q][\"conf\"][\"imagePaths\"][%q]", key, imgKey)
			}
			imagePaths[imgKey] = rewriteAssetPath(path, nodeKey)
		}
	}

	return nil
}

// rewriteAssetPath leaves an already-absolute http(s):// path untouched -
// see embedAssetURLs.
func rewriteAssetPath(path, nodeKey string) string {
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return path
	}
	return GameAssetsPathPrefix + nodeKey + "/" + strings.TrimPrefix(path, "/")
}

// htmlAssetSrcPattern matches an HTML src="..."/src='...' attribute whose
// value is root-relative (starts with "/") - see rewriteHTMLAssetPaths.
// An http(s):// value never starts with "/", so it's already excluded by
// construction, same as rewriteAssetPath's own check.
var htmlAssetSrcPattern = regexp.MustCompile(`(src=["'])(/[^"']*)(["'])`)

// rewriteHTMLAssetPaths rewrites plugin["html"]'s own root-relative
// src="..." attributes the same way embedAssetURLs rewrites
// assets.scripts/css and imagePaths - needed because lx.Image's "path"
// config (see lxgo-jspp's js/modules/widgets/Image.js) resolves and bakes
// the image URL directly into the rendered HTML at snippet-render time, on
// the cartridge, rather than leaving it as a separate JSON field for a
// consumer to resolve later. plugin["html"] is a single already-assembled
// string (every nested snippet's own HTML is already stitched into it by
// the cartridge, see lxgo-jspp's plugin_renderer.go) - no per-nested-plugin
// traversal needed, unlike imagePaths.
func rewriteHTMLAssetPaths(plugin map[string]any, nodeKey string) error {
	html, ok := plugin["html"].(string)
	if !ok {
		return fmt.Errorf("missing/non-string \"html\"")
	}
	plugin["html"] = htmlAssetSrcPattern.ReplaceAllStringFunc(html, func(m string) string {
		parts := htmlAssetSrcPattern.FindStringSubmatch(m)
		return parts[1] + rewriteAssetPath(parts[2], nodeKey) + parts[3]
	})
	return nil
}
