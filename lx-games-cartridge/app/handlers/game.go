package handlers

import (
	"fmt"
	"net/http"

	jsppComp "github.com/epicoon/lxgo/jspp/component"
	"github.com/epicoon/lxgo/kernel"
	lxHttp "github.com/epicoon/lxgo/kernel/http"
)

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * GameForm
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/** @interface kernel.IForm */
type GameForm struct {
	*lxHttp.Form
	Slug string `json:"slug"`
	Lang string `json:"lang"`
}

var _ kernel.IForm = (*GameForm)(nil)

/** @constructor kernel.CForm */
func NewGameForm() kernel.IForm {
	return lxHttp.PrepareForm(&GameForm{Form: lxHttp.NewForm()})
}

func (f *GameForm) Config() kernel.FormConfig {
	return kernel.FormConfig{
		"slug": kernel.FormFieldConfig{
			Description: "this cartridge's own slug for the requested game (not the lobby's compound \"CartridgeSlug.GameSlug\" key)",
			Required:    true,
		},
		"lang": kernel.FormFieldConfig{
			Description: "requested render language, e.g. \"ru-RU\" - absent/empty means \"en-EN\"",
			Required:    false,
		},
	}
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * GameHandler
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/** @interface kernel.IHttpResource */
type GameHandler struct {
	*lxHttp.Resource
	// gamePlugins maps a game slug to the jspp plugin class that
	// implements it - see app/routes.go's gamePlugins, the single source
	// this is built from.
	gamePlugins map[string]string
}

var _ kernel.IHttpResource = (*GameHandler)(nil)

/** @constructor kernel.CHttpResource */
func NewGameHandler(gamePlugins map[string]string) kernel.CHttpResource {
	return func() kernel.IHttpResource {
		return &GameHandler{
			Resource:    lxHttp.NewResource(kernel.HttpResourceConfig{CRequestForm: NewGameForm}),
			gamePlugins: gamePlugins,
		}
	}
}

func (h *GameHandler) Run() kernel.IHttpResponse {
	req := h.RequestForm().(*GameForm)
	if req.HasErrors() {
		return h.ErrorResponse(http.StatusBadRequest, "Missed required parameters: "+req.GetFirstError().Error())
	}

	pluginName, ok := h.gamePlugins[req.Slug]
	if !ok {
		return h.ErrorResponse(http.StatusNotFound, fmt.Sprintf("game %q not found", req.Slug))
	}

	lang := req.Lang
	if lang == "" {
		lang = "en-EN"
	}

	pp, err := jsppComp.AppComponent(h.App())
	if err != nil {
		return h.ErrorResponse(http.StatusInternalServerError, "JS Preprocessor component required")
	}

	plugin := pp.PluginManager().Get(pluginName)
	if plugin == nil {
		return h.ErrorResponse(http.StatusInternalServerError, fmt.Sprintf("game %q's plugin %q not found", req.Slug, pluginName))
	}

	rendered, err := pp.PluginManager().Render(plugin, lang)
	if err != nil {
		return h.ErrorResponse(http.StatusInternalServerError, fmt.Sprintf("render game %q: %v", req.Slug, err))
	}

	return h.JsonResponse(kernel.JsonResponseConfig{Data: map[string]any{"plugin": rendered}})
}
