// Package handlers holds this app's HTTP and WS-request resources.
package handlers

import (
	"github.com/epicoon/lx-games-cartridge/cnv"
	"github.com/epicoon/lxgo/kernel"
	lxHttp "github.com/epicoon/lxgo/kernel/http"
)

/** @interface kernel.IHttpResource */
type NomenclatureHandler struct {
	*lxHttp.Resource
}

/** @constructor kernel.CHttpResource */
func NewNomenclatureHandler() kernel.IHttpResource {
	return &NomenclatureHandler{Resource: lxHttp.NewResource()}
}

func (h *NomenclatureHandler) Run() kernel.IHttpResponse {
	app := h.App().(cnv.IApp)
	return h.JsonResponse(kernel.JsonResponseConfig{Data: map[string]any{
		"slug":  app.CartridgeSlug(),
		"games": app.NomenclatureHolder().Export(),
	}})
}
