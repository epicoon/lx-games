package handlers

import (
	"github.com/epicoon/lx-games-lobby/cnv"
	"github.com/epicoon/lxgo/kernel"
	lxHttp "github.com/epicoon/lxgo/kernel/http"
)

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * NomenclatureForm
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/** @interface kernel.IForm */
type NomenclatureForm struct {
	*lxHttp.Form
	Lang string `json:"lang"`
}

var _ kernel.IForm = (*NomenclatureForm)(nil)

/** @constructor kernel.CForm */
func NewNomenclatureForm() kernel.IForm {
	return lxHttp.PrepareForm(&NomenclatureForm{Form: lxHttp.NewForm()})
}

func (f *NomenclatureForm) Config() kernel.FormConfig {
	return kernel.FormConfig{
		"lang": kernel.FormFieldConfig{
			Description: "requested translation language, e.g. \"en-EN\" - absent/empty means each game's own untranslated info",
			Required:    false,
		},
	}
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * NomenclatureHandler
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// NomenclatureHandler is the browser-facing WS route (registered on the
// lobby's own inbound WSServer) that reports the current game nomenclature
// aggregated from every connected cartridge.
/** @interface kernel.IHttpResource */
type NomenclatureHandler struct {
	*lxHttp.Resource
}

var _ kernel.IHttpResource = (*NomenclatureHandler)(nil)

/** @constructor kernel.CHttpResource */
func NewNomenclatureHandler() kernel.IHttpResource {
	return &NomenclatureHandler{
		Resource: lxHttp.NewResource(kernel.HttpResourceConfig{CRequestForm: NewNomenclatureForm}),
	}
}

func (h *NomenclatureHandler) Run() kernel.IHttpResponse {
	req := h.RequestForm().(*NomenclatureForm)
	registry := h.App().(cnv.IApp).CartridgesRegistry()
	return h.JsonResponse(kernel.JsonResponseConfig{
		Data: map[string]any{
			"games": registry.NomenclatureForLang(req.Lang),
		},
	})
}
