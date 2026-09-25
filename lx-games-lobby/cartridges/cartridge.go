package cartridges

import (
	"fmt"
	"time"
)

// State is one tracked cartridge's current connection state.
type State int

const (
	// StateDead means the last contact attempt failed and nothing further
	// is scheduled - only a fresh HTTP announce from that cartridge
	// (Announce), or a manual push, revives it. Every cartridge starts here.
	StateDead State = iota
	// StatePendingRetry means the cartridge was Connected at some point, an
	// interaction with it just failed, and a retry is scheduled.
	StatePendingRetry
	// StateConnected means there's a live connection and cached
	// nomenclature data.
	StateConnected
	// StateCorrupted means the node connected fine at the transport level,
	// but every game it reported conflicted with an already-registered
	// node's data under the same key (see attemptConnect) - a
	// version/config mismatch, not a connectivity problem. Terminal: unlike
	// StateDead it's never picked up by the retry scheduler
	// (retryDueCartridges only looks at StatePendingRetry) and Announce
	// won't revive it either (see Announce, AddCartridge) - only a
	// deliberate ForceConnect gives it another chance.
	StateCorrupted
)

func (s State) String() string {
	switch s {
	case StateDead:
		return "dead"
	case StatePendingRetry:
		return "pending-retry"
	case StateConnected:
		return "connected"
	case StateCorrupted:
		return "corrupted"
	default:
		return fmt.Sprintf("unknown(%d)", int(s))
	}
}

// Conn is one live connection to a cartridge.
type Conn interface {
	// FetchNomenclature asks the cartridge for its own cartridge slug and
	// its game-type list.
	FetchNomenclature() (slug string, nomenclature []Nomenclature, err error)
	// FetchActiveRooms asks the cartridge for its currently active game instances.
	FetchActiveRooms() ([]Room, error)
	// FetchGame asks the cartridge to render the game identified by slug
	// for lang.
	FetchGame(slug, lang string) (map[string]any, error)
	// Ping is a cheap liveness check - a nil error means the connection is
	// still usable.
	Ping() error
	// Close tears down the connection. Idempotent.
	Close() error
}

// entry is one tracked cartridge node's state - only ever touched under
// Registry.mu.
type cartridgeNode struct {
	addr string
	// slug is the cartridge's own reported slug - see
	// Conn.FetchNomenclature. Empty until the first successful connect;
	// several entries can end up with the same slug (several nodes of the
	// same cartridge, for load-balancing).
	slug string
	// nomenclature is the subset of Registry.nomenclature this node
	// currently contributes to - shared *NomenclatureEntry pointers, not
	// this node's own private copy (see addNomenclature/removeNomenclature).
	// Empty whenever the entry isn't StateConnected.
	nomenclature  []*NomenclatureEntry
	state         State
	conn          Conn
	everConnected bool
	connecting    bool
	attempts      int
	nextAttempt   time.Time
}

// Status is a point-in-time, safe-to-share snapshot of one cartridge
// node's state.
type Status struct {
	Addr        string
	State       State
	Attempts    int
	MaxAttempts int
	NextAttempt time.Time
}

// Nomenclature is one game type a cartridge reports.
// Field tags are what decodeNomenclature (wsconn.go) matches the
// cartridge's JSON response against via cast.MapToStruct - keep them in
// sync with whatever a cartridge actually sends.
type Nomenclature struct {
	// Slug must not contain "." - see Registry's invalidSlug, checked
	// (and rejected, if violated) in addNomenclature.
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	Version     string `json:"version"`
	Description string `json:"description"`
	Genre       string `json:"genre"`
	// Icon is a small square asset for a compact list/chip display.
	Icon string `json:"icon"`
	// Banner is a wide asset for a game's detail view.
	Banner string `json:"banner"`
	// DurationMinutes is a free-form estimate of how long one round takes
	// (e.g. "45-60") - the cartridge's own words, not a structured range.
	DurationMinutes string `json:"durationMinutes"`
	MinSlots        int    `json:"minSlots"`
	MaxSlots        int    `json:"maxSlots"`
	Online          bool   `json:"online"`
	Offline         bool   `json:"offline"`
	// Translations[lang][field] - only for a game the cartridge has
	// translations for at all. Empty/nil means the cartridge reports
	// no translations for this game.
	Translations map[string]map[string]string `json:"translations"`
}

// NomenclatureEntry is one distinct game currently available, keyed by
// "CartridgeSlug.GameSlug" - deduplicated across every currently-connected
// node of the same cartridge that serves it, with the full list of nodes
// that do in Entries (see PickNode). Both halves of Key are required to be
// "."-free (see Registry's invalidSlug) - a dot in either would make two
// different (cartridge, game) pairs collide into the same Key string.
type NomenclatureEntry struct {
	Nomenclature
	Key     string
	Entries []string
}

// Room is one active game instance a cartridge reports.
type Room struct {
	InstanceID string `json:"instanceId"`
	Slug       string `json:"slug"`
}
