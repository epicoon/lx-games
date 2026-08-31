// Package handlers holds this app's HTTP and WS-request resources.
package handlers

import (
	"github.com/epicoon/lxgo/kernel"
	lxHttp "github.com/epicoon/lxgo/kernel/http"
)

/** @interface kernel.IHttpResource */
type ActiveRoomsHandler struct {
	*lxHttp.Resource
}

/** @constructor kernel.CHttpResource */
func NewActiveRoomsHandler() kernel.IHttpResource {
	return &ActiveRoomsHandler{Resource: lxHttp.NewResource()}
}

// Run always answers with no active rooms - there's no game engine yet to
// have created any.
func (h *ActiveRoomsHandler) Run() kernel.IHttpResponse {
	return h.JsonResponse(kernel.JsonResponseConfig{Data: []map[string]any{}})
}
