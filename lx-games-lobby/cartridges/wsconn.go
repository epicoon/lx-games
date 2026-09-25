package cartridges

import (
	"fmt"
	"time"

	"github.com/epicoon/lxgo/kernel/cast"
	"github.com/epicoon/lxgo/ws"
	wsComp "github.com/epicoon/lxgo/ws/component"
)

// Route names the cartridge is expected to register on its own ws.Router
// (the same lxgo-ws request/response mechanism a browser client uses, see
// "Using the existing API" in lxgo-ws's README).
const (
	RouteNomenclature = "/nomenclature"
	RouteActiveRooms  = "/rooms"
	RoutePing         = "/ping"
	RouteGame         = "/game"
)

// cartridgeWSPath is the path a cartridge's WS endpoint is mounted on -
// every cartridge runs Components.WSServer with no Port configured, so it
// shares its one HTTP port with WS (see component.WSServer.Start's doc
// comment in lxgo-ws) at this fixed path.
const cartridgeWSPath = "/ws"

// Dial connects to the cartridge at addr, backed by lxgo-ws's outbound WS
// client (component.Dial). The cartridge plays the server role for the
// resulting connection and answers RouteNomenclature/RouteActiveRooms/
// RoutePing via its own ws.Router. It's the real Dialer (see registry.go) -
// callers that need a specific requestTimeout wrap it in a closure matching
// Dialer's signature.
func Dial(addr string, requestTimeout time.Duration, onDeregister, onDropped func()) (Conn, error) {
	onPush := func(msg any) {
		if IsDeregister(msg) {
			onDeregister()
		}
	}
	rc, err := wsComp.Dial(addr, cartridgeWSPath, onPush, onDropped)
	if err != nil {
		return nil, fmt.Errorf("dial cartridge at %s: %w", addr, err)
	}

	return &wsConn{rc: rc, requestTimeout: requestTimeout}, nil
}

// IsDeregister reports whether msg (as passed to the onPush callback given
// to component.Dial) is what a cartridge sends over its already-established
// connection to announce a graceful shutdown - a message shaped
// {"kind": "deregister"}. Deregistration rides the WS channel.
func IsDeregister(msg any) bool {
	m, ok := msg.(map[string]any)
	if !ok {
		return false
	}
	kind, _ := m["kind"].(string)
	return kind == "deregister"
}

/** @interface */
var _ Conn = (*wsConn)(nil)

// wsConn is the real Conn - a thin adapter over ws.IClient, translating
// Registry's FetchNomenclature/FetchActiveRooms/FetchGame/Ping calls into
// requests on the routes the cartridge's own ws.Router answers.
type wsConn struct {
	rc             ws.IClient
	requestTimeout time.Duration
}

func (c *wsConn) FetchNomenclature() (string, []Nomenclature, error) {
	body, err := c.request(RouteNomenclature, nil)
	if err != nil {
		return "", nil, err
	}
	return decodeNomenclature(body)
}

func (c *wsConn) FetchActiveRooms() ([]Room, error) {
	body, err := c.request(RouteActiveRooms, nil)
	if err != nil {
		return nil, err
	}
	return decodeRooms(body)
}

func (c *wsConn) FetchGame(slug, lang string) (map[string]any, error) {
	params := map[string]any{"slug": slug}
	if lang != "" {
		params["lang"] = lang
	}
	body, err := c.request(RouteGame, params)
	if err != nil {
		return nil, err
	}
	obj, err := asObject(body)
	if err != nil {
		return nil, err
	}
	plugin, ok := obj["plugin"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("expected an object \"plugin\" field, got %#v", obj["plugin"])
	}
	return plugin, nil
}

func (c *wsConn) Ping() error {
	_, err := c.request(RoutePing, nil)
	return err
}

func (c *wsConn) Close() error {
	return c.rc.Close()
}

func (c *wsConn) request(route string, params map[string]any) (any, error) {
	resp, err := c.rc.Request(route, params, c.requestTimeout)
	if err != nil {
		return nil, err
	}
	if resp.Code >= 400 {
		return nil, fmt.Errorf("cartridge returned status %d", resp.Code)
	}
	return resp.Body, nil
}

// decodeNomenclature reads {"slug": "...", "games": [...]}
func decodeNomenclature(body any) (string, []Nomenclature, error) {
	obj, err := asObject(body)
	if err != nil {
		return "", nil, err
	}
	slug, _ := obj["slug"].(string)

	games, _ := obj["games"].([]any)
	out := make([]Nomenclature, 0, len(games))
	for _, raw := range games {
		m, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		var n Nomenclature
		if err := cast.MapToStruct(m, &n); err != nil {
			continue
		}
		out = append(out, n)
	}
	return slug, out, nil
}

func decodeRooms(body any) ([]Room, error) {
	list, err := asList(body)
	if err != nil {
		return nil, err
	}
	out := make([]Room, 0, len(list))
	for _, raw := range list {
		m, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		var r Room
		if err := cast.MapToStruct(m, &r); err != nil {
			continue
		}
		out = append(out, r)
	}
	return out, nil
}

// asList reads body as a []any.
func asList(body any) ([]any, error) {
	if body == nil {
		return nil, nil
	}
	list, ok := body.([]any)
	if !ok {
		return nil, fmt.Errorf("expected a list response body, got %T", body)
	}
	return list, nil
}

// asObject is asList's counterpart for a response whose body is an object
// rather than a list (see decodeNomenclature).
func asObject(body any) (map[string]any, error) {
	if body == nil {
		return map[string]any{}, nil
	}
	obj, ok := body.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("expected an object response body, got %T", body)
	}
	return obj, nil
}
