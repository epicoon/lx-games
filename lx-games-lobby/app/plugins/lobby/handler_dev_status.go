package lobby

import (
	"net/http"

	"github.com/epicoon/lx-games-lobby/cnv"
	jsppComp "github.com/epicoon/lxgo/jspp/component"
	"github.com/epicoon/lxgo/kernel"
	lxHttp "github.com/epicoon/lxgo/kernel/http"
)

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * DevStatusHandler
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// DevStatusHandler reports the lobby's live view of every configured
// cartridge's connection state - a debugging aid for LobbyPlugin.js's dev
// monitor, not part of the lobby<->cartridge protocol itself. Answered only
// when JSPreprocessor.Mode is "DEV", so a production deployment never
// exposes it.
/** @interface kernel.IHttpResource */
type DevStatusHandler struct {
	*lxHttp.Resource
}

var _ kernel.IHttpResource = (*DevStatusHandler)(nil)

/** @constructor kernel.CHttpResource */
func NewDevStatusHandler() kernel.IHttpResource {
	return &DevStatusHandler{Resource: lxHttp.NewResource()}
}

func (h *DevStatusHandler) Run() kernel.IHttpResponse {
	pp, err := jsppComp.AppComponent(h.App())
	if err != nil {
		return h.ErrorResponse(http.StatusInternalServerError, "jspp is not plugged")
	}
	if pp.Config().Mode != "DEV" {
		return h.ErrorResponse(http.StatusNotFound, "not found")
	}

	registry := h.App().(cnv.IApp).CartridgesRegistry()
	statuses := registry.AllStatuses()

	servers := make([]map[string]any, 0, len(statuses))
	for _, st := range statuses {
		servers = append(servers, map[string]any{
			"addr":        st.Addr,
			"state":       st.State.String(),
			"attempts":    st.Attempts,
			"maxAttempts": st.MaxAttempts,
		})
	}

	return h.JsonResponse(kernel.JsonResponseConfig{Data: map[string]any{"servers": servers}})
}
