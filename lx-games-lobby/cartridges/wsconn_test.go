package cartridges

import (
	"encoding/json"
	"fmt"
	"net"
	"testing"
	"time"

	"github.com/epicoon/lxgo/kernel"
	"github.com/epicoon/lxgo/kernel/apptest"
	lxHttp "github.com/epicoon/lxgo/kernel/http"
	wsComp "github.com/epicoon/lxgo/ws/component"
)

// fakeNomenclatureHandler answers RouteNomenclature with
// {"slug": ..., "games": [...]}, exactly the shape decodeNomenclature
// expects - an object, not a bare list, since the cartridge reports its own
// slug once per response (see Conn.FetchNomenclature).
type fakeNomenclatureHandler struct {
	*lxHttp.Resource
	slug  string
	games []map[string]any
}

func newFakeNomenclatureHandler(slug string, games []map[string]any) kernel.CHttpResource {
	return func() kernel.IHttpResource {
		return &fakeNomenclatureHandler{Resource: lxHttp.NewResource(), slug: slug, games: games}
	}
}

func (h *fakeNomenclatureHandler) Run() kernel.IHttpResponse {
	return h.JsonResponse(kernel.JsonResponseConfig{Data: map[string]any{"slug": h.slug, "games": h.games}})
}

// fakeListHandler answers a WS-request route with a fixed bare list -
// RouteActiveRooms's shape (see decodeRooms's expectations).
type fakeListHandler struct {
	*lxHttp.Resource
	data []map[string]any
}

func newFakeListHandler(data []map[string]any) kernel.CHttpResource {
	return func() kernel.IHttpResource {
		return &fakeListHandler{Resource: lxHttp.NewResource(), data: data}
	}
}

func (h *fakeListHandler) Run() kernel.IHttpResponse {
	return h.JsonResponse(kernel.JsonResponseConfig{Data: h.data})
}

func newFakePingHandler() kernel.CHttpResource {
	return func() kernel.IHttpResource {
		return &fakeListHandler{Resource: lxHttp.NewResource()}
	}
}

// freePort finds a currently-unused TCP port by briefly binding to it -
// component.WSServer exposes no way to learn its bound port from outside
// its own package (no accessor for the ephemeral-port-0 case, unlike this
// package's own tests of internal/src which could just read the field
// directly), so the port is chosen here instead and handed to WSServer
// explicitly.
func freePort(t *testing.T) int {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("find a free port: %v", err)
	}
	port := ln.Addr().(*net.TCPAddr).Port
	ln.Close()
	return port
}

// newFakeCartridgeServer starts a real *component.WSServer (real TCP, real
// handshake - not net.Pipe) with RouteNomenclature/RouteActiveRooms/
// RoutePing registered, standing in for a real cartridge for Dial's own
// tests - Registry's tests use a fakeDialer instead and don't need this.
func newFakeCartridgeServer(t *testing.T, slug string, games []map[string]any) (*wsComp.WSServer, string) {
	t.Helper()
	port := freePort(t)

	app, err := apptest.New(kernel.Dict{
		"Components": kernel.Dict{
			"WSServer": kernel.Dict{"Host": "127.0.0.1", "Port": port},
		},
	})
	if err != nil {
		t.Fatalf("apptest.New: %v", err)
	}
	if err := wsComp.SetAppComponent(app, "Components.WSServer"); err != nil {
		t.Fatalf("SetAppComponent: %v", err)
	}
	s, err := wsComp.AppComponent(app)
	if err != nil {
		t.Fatalf("AppComponent: %v", err)
	}

	s.Router().RegisterResources(kernel.HttpResourcesList{
		RouteNomenclature: newFakeNomenclatureHandler(slug, games),
		RouteActiveRooms:  newFakeListHandler(nil),
		RoutePing:         newFakePingHandler(),
	})

	go s.Start()
	return s, fmt.Sprintf("127.0.0.1:%d", port)
}

// dialWithRetry retries Dial for a short while - Start() above runs in its
// own goroutine and this package has no way to observe when its
// net.Listen has actually completed (see freePort's doc comment), so the
// very first Dial attempt can legitimately lose that race.
func dialWithRetry(t *testing.T, addr string, onDeregister, onDropped func()) Conn {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	var lastErr error
	for time.Now().Before(deadline) {
		conn, err := Dial(addr, 2*time.Second, onDeregister, onDropped)
		if err == nil {
			return conn
		}
		lastErr = err
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("dial %s: timed out, last error: %v", addr, lastErr)
	return nil
}

func TestDial_RoundTrip_FetchesNomenclatureAndPingsAndFetchesRooms(t *testing.T) {
	s, addr := newFakeCartridgeServer(t, "cofb-lobby", []map[string]any{
		{"name": "Castles of Burgundy", "slug": "cofb", "minSlots": 2, "maxSlots": 4, "online": true, "offline": true},
	})
	t.Cleanup(s.Stop)

	conn := dialWithRetry(t, addr, func() {}, func() {})
	t.Cleanup(func() { conn.Close() })

	slug, nomenclature, err := conn.FetchNomenclature()
	if err != nil {
		t.Fatalf("FetchNomenclature: %v", err)
	}
	if slug != "cofb-lobby" {
		t.Fatalf("expected the reported cartridge slug %q, got %q", "cofb-lobby", slug)
	}
	if len(nomenclature) != 1 {
		t.Fatalf("expected exactly one nomenclature entry, got %d: %#v", len(nomenclature), nomenclature)
	}
	got := nomenclature[0]
	want := Nomenclature{Name: "Castles of Burgundy", Slug: "cofb", MinSlots: 2, MaxSlots: 4, Online: true, Offline: true}
	if got != want {
		t.Fatalf("nomenclature = %+v, want %+v", got, want)
	}

	if err := conn.Ping(); err != nil {
		t.Fatalf("Ping: %v", err)
	}

	rooms, err := conn.FetchActiveRooms()
	if err != nil {
		t.Fatalf("FetchActiveRooms: %v", err)
	}
	if len(rooms) != 0 {
		t.Fatalf("expected no active rooms yet (no game engine wired up), got %#v", rooms)
	}
}

func TestDial_ConcurrentRequests_DontCrossTalk(t *testing.T) {
	// Two different routes' responses must reach the caller that actually
	// asked for them, not whichever happened to be waiting first - this is
	// exactly what the request/response key correlation in ws.IClient exists
	// to guarantee.
	s, addr := newFakeCartridgeServer(t, "cofb-lobby", []map[string]any{{"slug": "cofb"}})
	t.Cleanup(s.Stop)

	conn := dialWithRetry(t, addr, func() {}, func() {})
	t.Cleanup(func() { conn.Close() })

	errs := make(chan error, 2)
	go func() {
		slug, nomenclature, err := conn.FetchNomenclature()
		if err != nil {
			errs <- err
			return
		}
		if slug != "cofb-lobby" || len(nomenclature) != 1 || nomenclature[0].Slug != "cofb" {
			errs <- fmt.Errorf("unexpected slug/nomenclature: %q, %#v", slug, nomenclature)
			return
		}
		errs <- nil
	}()
	go func() {
		rooms, err := conn.FetchActiveRooms()
		if err != nil {
			errs <- err
			return
		}
		if len(rooms) != 0 {
			errs <- fmt.Errorf("unexpected rooms: %#v", rooms)
			return
		}
		errs <- nil
	}()

	for range 2 {
		if err := <-errs; err != nil {
			t.Fatalf("%v", err)
		}
	}
}

// deregisterMessage/deregisterPayload build the fixture
// TestIsDeregister_RoundTripsThroughJSON needs - the only place in the
// package that cares about the exact Go type behind a deregister notice;
// IsDeregister itself only ever reads a generic map's "kind" field.
type deregisterMessage struct {
	Kind string `json:"kind"`
}

func deregisterPayload() any {
	return deregisterMessage{Kind: "deregister"}
}

func TestIsDeregister_RoundTripsThroughJSON(t *testing.T) {
	data, err := json.Marshal(deregisterPayload())
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var decoded any
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if !IsDeregister(decoded) {
		t.Fatalf("expected IsDeregister to recognize deregisterPayload after a JSON round-trip, got %#v", decoded)
	}
}

func TestIsDeregister_RejectsOrdinaryMessages(t *testing.T) {
	if IsDeregister(map[string]any{"__lxws_response__": true, "key": "x"}) {
		t.Fatalf("an ordinary response must not be mistaken for a deregister notice")
	}
	if IsDeregister("not even a map") {
		t.Fatalf("a non-map message must not be mistaken for a deregister notice")
	}
}

func TestAsList_NilReturnsEmptyNotError(t *testing.T) {
	list, err := asList(nil)
	if err != nil {
		t.Fatalf("asList(nil): unexpected error: %v", err)
	}
	if len(list) != 0 {
		t.Fatalf("asList(nil): expected an empty list, got %v", list)
	}
}

func TestAsList_PassesThroughAnActualList(t *testing.T) {
	in := []any{"a", "b"}
	list, err := asList(in)
	if err != nil {
		t.Fatalf("asList(%#v): unexpected error: %v", in, err)
	}
	if len(list) != 2 {
		t.Fatalf("asList(%#v) = %#v, want the same 2-element list", in, list)
	}
}

func TestAsList_NonListBody_ReturnsError(t *testing.T) {
	// A Response's Body already comes decoded from lxgo-ws's ws.IClient (see
	// Client.handleResponse) - anything that isn't a []any means the route
	// answered with the wrong shape entirely, not malformed JSON (there's no
	// JSON string left to parse at this layer any more).
	for _, body := range []any{"not a list", map[string]any{"not": "a list"}, 42} {
		if _, err := asList(body); err == nil {
			t.Fatalf("asList(%#v): expected an error for a non-list body", body)
		}
	}
}

func TestAsObject_NilReturnsEmptyNotError(t *testing.T) {
	obj, err := asObject(nil)
	if err != nil {
		t.Fatalf("asObject(nil): unexpected error: %v", err)
	}
	if len(obj) != 0 {
		t.Fatalf("asObject(nil): expected an empty object, got %v", obj)
	}
}

func TestAsObject_PassesThroughAnActualObject(t *testing.T) {
	in := map[string]any{"slug": "cofb"}
	obj, err := asObject(in)
	if err != nil {
		t.Fatalf("asObject(%#v): unexpected error: %v", in, err)
	}
	if obj["slug"] != "cofb" {
		t.Fatalf("asObject(%#v) = %#v, want the same object", in, obj)
	}
}

func TestAsObject_NonObjectBody_ReturnsError(t *testing.T) {
	for _, body := range []any{"not an object", []any{1, 2}, 42} {
		if _, err := asObject(body); err == nil {
			t.Fatalf("asObject(%#v): expected an error for a non-object body", body)
		}
	}
}

func TestDecodeNomenclature_ReadsSlugAndGames(t *testing.T) {
	body := map[string]any{
		"slug": "cofb-lobby",
		"games": []any{
			map[string]any{"name": "Castles of Burgundy", "slug": "cofb", "minSlots": float64(2), "maxSlots": float64(4), "online": true},
		},
	}
	slug, games, err := decodeNomenclature(body)
	if err != nil {
		t.Fatalf("decodeNomenclature: %v", err)
	}
	if slug != "cofb-lobby" {
		t.Fatalf("expected slug %q, got %q", "cofb-lobby", slug)
	}
	if len(games) != 1 || games[0].Name != "Castles of Burgundy" || games[0].Slug != "cofb" || games[0].MinSlots != 2 || games[0].MaxSlots != 4 || !games[0].Online {
		t.Fatalf("unexpected games: %#v", games)
	}
}

func TestDecodeNomenclature_NonObjectBody_ReturnsError(t *testing.T) {
	if _, _, err := decodeNomenclature("not an object"); err == nil {
		t.Fatalf("expected an error for a non-object nomenclature body")
	}
}

func TestDecodeRooms_NonListBody_ReturnsError(t *testing.T) {
	if _, err := decodeRooms("not a list"); err == nil {
		t.Fatalf("expected an error for a non-list rooms body")
	}
}
