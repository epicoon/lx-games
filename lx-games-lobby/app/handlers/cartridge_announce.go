package handlers

import (
	"net/http"

	"github.com/epicoon/lx-games-lobby/cnv"
	"github.com/epicoon/lxgo/kernel"
	lxHttp "github.com/epicoon/lxgo/kernel/http"
)

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * AnnounceForm
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/** @interface kernel.IForm */
type AnnounceForm struct {
	*lxHttp.Form
	Addr string `json:"addr"`
}

var _ kernel.IForm = (*AnnounceForm)(nil)

/** @constructor kernel.CForm */
func NewAnnounceForm() kernel.IForm {
	return lxHttp.PrepareForm(&AnnounceForm{Form: lxHttp.NewForm()})
}

func (f *AnnounceForm) Config() kernel.FormConfig {
	return kernel.FormConfig{
		"addr": kernel.FormFieldConfig{
			Description: "the announcing cartridge's own WS \"host:port\"",
			Required:    true,
		},
	}
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * CartridgeAnnounceHandler
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// CartridgeAnnounceHandler is the HTTP endpoint a cartridge calls on its
// own startup to tell the lobby it's up. The lobby is what actually
// establishes the WS connection back to it; this call is just the trigger
// to do that sooner than the next scheduled check, and only for an addr
// already listed in Cartridges - anything else is silently ignored, not
// an error, so an unconfigured caller can't make the lobby dial out to
// an arbitrary address.
/** @interface kernel.IHttpResource */
type CartridgeAnnounceHandler struct {
	*lxHttp.Resource
}

func NewCartridgeAnnounceHandler() kernel.IHttpResource {
	return &CartridgeAnnounceHandler{
		Resource: lxHttp.NewResource(kernel.HttpResourceConfig{CRequestForm: NewAnnounceForm}),
	}
}

func (h *CartridgeAnnounceHandler) Run() kernel.IHttpResponse {
	req := h.RequestForm().(*AnnounceForm)
	if req.HasErrors() {
		return h.ErrorResponse(http.StatusBadRequest, "Missed required parameters: "+req.GetFirstError().Error())
	}

	registry := h.App().(cnv.IApp).CartridgesRegistry()
	if _, known := registry.Status(req.Addr); !known {
		return h.ErrorResponse(http.StatusForbidden, "addr is not configured in Cartridges")
	}

	// Fire-and-forget: the actual dial+handshake can take as long as
	// RegistrySettings.RequestTimeoutMs, and the announcing cartridge
	// doesn't need to block on that - it only needs to know the announce
	// itself was accepted (the addr is one the lobby is willing to talk to
	// at all).
	go registry.Announce(req.Addr)

	return h.JsonResponse(kernel.JsonResponseConfig{Data: map[string]any{"ok": true}})
}
