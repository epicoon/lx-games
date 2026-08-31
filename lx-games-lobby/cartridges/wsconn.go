package cartridges

import (
	"fmt"
	"time"

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
)

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
	rc, err := wsComp.Dial(addr, "/", onPush, onDropped)
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
// Registry's FetchNomenclature/FetchActiveRooms/Ping calls into requests on
// the routes the cartridge's own ws.Router answers.
type wsConn struct {
	rc             ws.IClient
	requestTimeout time.Duration
}

func (c *wsConn) FetchNomenclature() (string, []Nomenclature, error) {
	body, err := c.request(RouteNomenclature)
	if err != nil {
		return "", nil, err
	}
	return decodeNomenclature(body)
}

func (c *wsConn) FetchActiveRooms() ([]Room, error) {
	body, err := c.request(RouteActiveRooms)
	if err != nil {
		return nil, err
	}
	return decodeRooms(body)
}

func (c *wsConn) Ping() error {
	_, err := c.request(RoutePing)
	return err
}

func (c *wsConn) Close() error {
	return c.rc.Close()
}

// request sends a request for route and returns its already-decoded body -
// a >=400 response code is treated as an error here, since every route
// this package calls answers either with the requested data or a failure,
// never a body meant to be read alongside a failing code.
func (c *wsConn) request(route string) (any, error) {
	resp, err := c.rc.Request(route, nil, c.requestTimeout)
	if err != nil {
		return nil, err
	}
	if resp.Code >= 400 {
		return nil, fmt.Errorf("cartridge returned status %d", resp.Code)
	}
	return resp.Body, nil
}

// decodeNomenclature/decodeRooms defensively pull fields out of the
// map[string]any/[]any shape a Response's Body decodes into (JSON numbers
// arrive as float64) - a malformed/missing field is left at its zero value
// rather than failing the whole list.

// decodeNomenclature reads {"slug": "...", "games": [...]} - unlike
// RouteActiveRooms, the nomenclature response is an object rather than a
// bare list, since the cartridge reports its own slug once per response
// rather than once per game (see Conn.FetchNomenclature).
func decodeNomenclature(body any) (string, []Nomenclature, error) {
	obj, err := asObject(body)
	if err != nil {
		return "", nil, err
	}
	slug := stringField(obj, "slug")

	games, _ := obj["games"].([]any)
	out := make([]Nomenclature, 0, len(games))
	for _, raw := range games {
		m, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		out = append(out, Nomenclature{
			Name:        stringField(m, "name"),
			Slug:        stringField(m, "slug"),
			Description: stringField(m, "description"),
			Image:       stringField(m, "image"),
			MinSlots:    intField(m, "minSlots"),
			MaxSlots:    intField(m, "maxSlots"),
			Online:      boolField(m, "online"),
			Offline:     boolField(m, "offline"),
		})
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
		out = append(out, Room{
			InstanceID: stringField(m, "instanceId"),
			Slug:       stringField(m, "slug"),
		})
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

func stringField(m map[string]any, key string) string {
	s, _ := m[key].(string)
	return s
}

func intField(m map[string]any, key string) int {
	switch v := m[key].(type) {
	case float64:
		return int(v)
	case int:
		return v
	default:
		return 0
	}
}

func boolField(m map[string]any, key string) bool {
	b, _ := m[key].(bool)
	return b
}
