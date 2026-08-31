package app

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/epicoon/lxgo/kernel"
	"github.com/epicoon/lxgo/kernel/config"
	wsComp "github.com/epicoon/lxgo/ws/component"
)

const (
	announceRetryAttempts = 5
	announceRetryInterval = 500 * time.Millisecond
	announceTimeout       = 2 * time.Second

	// cartridgeAnnouncePath is the lobby-side route this app POSTs its
	// startup announce to - see lx-games-lobby's app/routes.go. LobbyURL
	// (config) only ever names the lobby itself; the specific endpoint is
	// this package's own business, so it's appended here rather than
	// baked into the configured value - there'll likely be more lobby
	// endpoints to call later, and none of them belong in config either.
	cartridgeAnnouncePath = "/cartridge/announce"
)

// deregisterPayload mirrors lx-games-lobby's gameapps.DeregisterPayload -
// duplicated (not a shared import) since the two are meant to stay
// independent Go modules.
type deregisterPayload struct {
	Kind string `json:"kind"`
}

// setupCartridge registers this app's lobby-facing WS resources,
// starts the WS listener, and (once it's up) announces this app's own
// startup to the lobby. Missing/empty LobbyURL just skips the announce
// (and the deregister broadcast on shutdown) - this app is still fully
// usable standalone (see lx-games-cartridge's own offline mode) without a
// lobby configured at all.
func setupCartridge(app kernel.IApp) error {
	ws, err := wsComp.AppComponent(app)
	if err != nil {
		return fmt.Errorf("WSServer component required: %w", err)
	}

	go ws.Start()

	lobbyURL := ""
	if config.HasParam(app.Config(), "LobbyURL") {
		u, err := config.GetParam[string](app.Config(), "LobbyURL")
		if err != nil {
			return fmt.Errorf("LobbyURL: %w", err)
		}
		lobbyURL = u
	}
	if lobbyURL == "" {
		return nil
	}
	announceURL := strings.TrimRight(lobbyURL, "/") + cartridgeAnnouncePath

	addr := advertiseAddr(app, fmt.Sprintf("%s:%d", ws.Config().Host, ws.Config().Port))
	go announceWithRetry(app, announceURL, addr)

	app.Events().Subscribe(kernel.EVENT_APP_BEFORE_FINAL, func(e kernel.IEvent) {
		broadcastDeregister(app, ws)
		ws.Stop()
	})

	return nil
}

// advertiseAddr is the addr this app announces to the lobby -
// CartridgeAdvertiseAddr if configured (non-empty), otherwise defaultAddr
// (Components.WSServer.Host:Port) unchanged. These need to differ whenever
// defaultAddr isn't itself something a peer could dial back into: its host
// is commonly a bind address like "0.0.0.0" (meaningless to a remote
// caller, not an address at all), and even when the host is fine, its port
// is the one this app listens on *internally* - behind a reverse proxy or
// Docker's own port publishing, the externally reachable port can easily
// be a different number entirely.
func advertiseAddr(app kernel.IApp, defaultAddr string) string {
	if config.HasParam(app.Config(), "CartridgeAdvertiseAddr") {
		a, err := config.GetParam[string](app.Config(), "CartridgeAdvertiseAddr")
		if err != nil {
			app.LogError(fmt.Sprintf("CartridgeAdvertiseAddr: %v", err), "GameApp")
		} else if a != "" {
			return a
		}
	}
	return defaultAddr
}

// announceWithRetry POSTs {"addr": addr} to the lobby's announce endpoint,
// retrying a few times - the WS listener started just above runs in its
// own goroutine, and there's no public way to learn from outside
// component.WSServer when its net.Listen has actually completed, so the
// very first attempt (and, if the lobby happens to not be up yet either,
// several more) can legitimately fail before succeeding.
func announceWithRetry(app kernel.IApp, url string, addr string) {
	body, err := json.Marshal(map[string]any{"addr": addr})
	if err != nil {
		app.LogError(fmt.Sprintf("can not encode announce payload: %v", err), "GameApp")
		return
	}

	client := &http.Client{Timeout: announceTimeout}
	var lastErr error
	for range announceRetryAttempts {
		resp, err := client.Post(url, "application/json", bytes.NewReader(body))
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode < 400 {
				return
			}
			lastErr = fmt.Errorf("lobby responded with status %d", resp.StatusCode)
		} else {
			lastErr = err
		}
		time.Sleep(announceRetryInterval)
	}
	app.LogError(fmt.Sprintf("could not announce to lobby at %s: %v", url, lastErr), "GameApp")
}

// broadcastDeregister tells every currently connected peer (in practice,
// just the lobby) that this app is shutting down gracefully.
func broadcastDeregister(app kernel.IApp, ws *wsComp.WSServer) {
	for _, conn := range ws.Connections().GetAll() {
		if err := conn.Send(deregisterPayload{Kind: "deregister"}, "text", false); err != nil {
			app.LogError(fmt.Sprintf("could not send deregister to %s: %v", conn.ID(), err), "GameApp")
		}
	}
}
