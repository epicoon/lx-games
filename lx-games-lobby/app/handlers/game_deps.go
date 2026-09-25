package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/epicoon/lx-games-lobby/cartridges"
	"github.com/epicoon/lxgo/kernel"
	lxHttp "github.com/epicoon/lxgo/kernel/http"
)

const gameDepsRequestTimeout = 5 * time.Second

// GameDepsPathPrefix is this relay's own path, minus the node key -
// GameGetHandler embeds GameDepsPathPrefix+nodeKey into a game's plugin
// config before handing the descriptor to the browser (see its own doc
// comment).
const GameDepsPathPrefix = "/game/deps/"

// GameDepsRoute is GameDepsPathPrefix registered as a kernel.IRouter
// template route - see GameDepsPathPrefix.
const GameDepsRoute = GameDepsPathPrefix + "{nodeKey}"

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * GameDepsHandler
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// GameDepsHandler relays a get-modules request - what promiseModules sends
// when given an explicit url, a flat {have, need} POST body (see
// lxgo-jspp's Dependencies.js) - to the one cartridge node named by the
// route's nodeKey, wrapping it into the {action, params} shape the
// cartridge's own standard /lx/service expects (see lxgo-jspp's
// ServiceRequest). The cartridge answers exactly as it would a request
// from a real browser.
/** @interface kernel.IHttpResource */
type GameDepsHandler struct {
	*lxHttp.Resource
	registry *cartridges.Registry
	client   *http.Client
}

var _ kernel.IHttpResource = (*GameDepsHandler)(nil)

/** @constructor kernel.CHttpResource */
func NewGameDepsHandler(registry *cartridges.Registry) kernel.CHttpResource {
	client := &http.Client{Timeout: gameDepsRequestTimeout}
	return func() kernel.IHttpResource {
		return &GameDepsHandler{
			Resource: lxHttp.NewResource(),
			registry: registry,
			client:   client,
		}
	}
}

func (h *GameDepsHandler) Run() kernel.IHttpResponse {
	nodeKey := h.PathSegments()["nodeKey"]
	if nodeKey == "" {
		return h.ErrorResponse(http.StatusBadRequest, "missing node key")
	}

	node, ok := h.registry.Node(nodeKey)
	if !ok {
		return h.ErrorResponse(http.StatusGone, "cartridge node no longer available - pick a new one via /game/get")
	}

	var params map[string]any
	if err := json.NewDecoder(h.Request().Body).Decode(&params); err != nil {
		return h.ErrorResponse(http.StatusBadRequest, "invalid request body")
	}

	body, err := json.Marshal(map[string]any{"action": "get-modules", "params": params})
	if err != nil {
		return h.ErrorResponse(http.StatusInternalServerError, "can not encode relayed request")
	}

	req, err := http.NewRequest(http.MethodPost, "http://"+node.Addr+"/lx/service", bytes.NewReader(body))
	if err != nil {
		return h.ErrorResponse(http.StatusInternalServerError, "can not build relayed request")
	}
	req.Header.Set("Content-Type", "application/json")
	// lx.app.lang's current language is a real browser cookie on this same
	// origin (see lxgo-jspp's Language.js) - imitate a direct browser
	// request to the cartridge by forwarding it unchanged; the cartridge's
	// own h.Lang() reads it exactly the same way either way.
	if cookie, err := h.Request().Cookie("lxlang"); err == nil {
		req.AddCookie(cookie)
	}

	resp, err := h.client.Do(req)
	if err != nil {
		return h.ErrorResponse(http.StatusBadGateway, fmt.Sprintf("cartridge unreachable: %v", err))
	}
	defer resp.Body.Close()

	var relayed any
	if err := json.NewDecoder(resp.Body).Decode(&relayed); err != nil {
		return h.ErrorResponse(http.StatusBadGateway, fmt.Sprintf("cartridge returned malformed JSON: %v", err))
	}

	return h.JsonResponse(kernel.JsonResponseConfig{Code: resp.StatusCode, Data: relayed})
}
