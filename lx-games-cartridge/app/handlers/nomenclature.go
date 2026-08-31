// Package handlers holds this app's HTTP and WS-request resources.
package handlers

import (
	"fmt"

	"github.com/epicoon/lxgo/kernel"
	"github.com/epicoon/lxgo/kernel/config"
	lxHttp "github.com/epicoon/lxgo/kernel/http"
)

// Nomenclature is this game-app's reported game-type list - hardcoded for
// now, standing in for task 0175's eventual "scan the installed game
// plugins" step. Field names match what lx-games-lobby's
// cartridges.decodeNomenclature expects.
var Nomenclature = []map[string]any{
	{
		"name":        "Sea Battle",
		"slug":        "seabattle",
		"version":     "0.1.0",
		"description": "",
		"image":       "",
		"minSlots":    2,
		"maxSlots":    2,
		"online":      true,
		"offline":     true,
	},
}

/** @interface kernel.IHttpResource */
type NomenclatureHandler struct {
	*lxHttp.Resource
}

/** @constructor kernel.CHttpResource */
func NewNomenclatureHandler() kernel.IHttpResource {
	return &NomenclatureHandler{Resource: lxHttp.NewResource()}
}

// Run reports this app's own CartridgeSlug alongside its game-type list -
// lx-games-lobby's cartridges.Registry takes the cartridge's own word for
// its slug rather than assigning one via its own config.
func (h *NomenclatureHandler) Run() kernel.IHttpResponse {
	slug, err := config.GetParam[string](h.App().Config(), "CartridgeSlug")
	if err != nil {
		h.App().LogError(fmt.Sprintf("CartridgeSlug: %v", err), "GameApp")
	}
	return h.JsonResponse(kernel.JsonResponseConfig{Data: map[string]any{
		"slug":  slug,
		"games": Nomenclature,
	}})
}
