// Package handlers holds this app's HTTP and WS-request resources.
package handlers

import (
	"github.com/epicoon/lxgo/kernel"
	lxHttp "github.com/epicoon/lxgo/kernel/http"
)

/** @interface kernel.IHttpResource */
type PingHandler struct {
	*lxHttp.Resource
}

/** @constructor kernel.CHttpResource */
func NewPingHandler() kernel.IHttpResource {
	return &PingHandler{Resource: lxHttp.NewResource()}
}

func (h *PingHandler) Run() kernel.IHttpResponse {
	return h.JsonResponse(kernel.JsonResponseConfig{Data: map[string]any{"ok": true}})
}
