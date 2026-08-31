// Package cartridges tracks the lobby's connections to the game-application
// processes ("cartridges") configured in Cartridges, and the nomenclature/
// active-room data each one reports - the connection is always established
// by the lobby, dialing out to a host:port from that configured list; a
// cartridge merely announces its own startup over HTTP.
package cartridges

import (
	"fmt"
	"sync"
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

// Nomenclature is one game type a cartridge reports.
type Nomenclature struct {
	Name        string
	Slug        string
	Version     string
	Description string
	Image       string
	MinSlots    int
	MaxSlots    int
	Online      bool
	Offline     bool
}

// Room is one active game instance a cartridge reports.
type Room struct {
	InstanceID string
	Slug       string
}

// Conn is one live connection to a cartridge.
type Conn interface {
	// FetchNomenclature asks the cartridge for its own cartridge slug and
	// its game-type list.
	FetchNomenclature() (slug string, nomenclature []Nomenclature, err error)
	// FetchActiveRooms asks the cartridge for its currently active game instances.
	FetchActiveRooms() ([]Room, error)
	// Ping is a cheap liveness check - a nil error means the connection is
	// still usable.
	Ping() error
	// Close tears down the connection. Idempotent.
	Close() error
}

// Dialer opens a Conn to a cartridge listening at addr ("host:port"),
// waiting at most requestTimeout for the dial itself to complete - see Dial
// for the real lxgo-ws-backed implementation; tests use a fake func
// instead. onDeregister fires (from the Conn's own background goroutine,
// exactly once) if the cartridge asks to deregister; onDropped fires (also
// at most once) if the connection is lost any other way. Neither fires
// after the returned Conn's Close is called.
type Dialer func(addr string, requestTimeout time.Duration, onDeregister, onDropped func()) (Conn, error)

// Config bounds Registry's retry behavior and the Dialer it drives.
type Config struct {
	// RequestTimeout is passed to every Dialer call - see Dialer.
	RequestTimeout time.Duration
	RetryInterval  time.Duration
	MaxAttempts    int

	// OnLogError, if set, is called (synchronously, by whatever goroutine
	// detects the problem) for a condition Registry can't otherwise
	// surface as a return value - a nomenclature conflict between two
	// nodes of the same cartridge (see addNomenclature), and a node ending
	// up StateCorrupted because every game it reported conflicted (see
	// attemptConnect). A nil OnLogError is a valid, deliberate "don't log".
	OnLogError func(msg string)
}

// entry is one tracked cartridge node's state - only ever touched under
// Registry.mu.
type entry struct {
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

// Registry tracks every configured cartridge and the lobby's current
// relationship to whatever's running there.
type Registry struct {
	dialer Dialer
	config Config

	mu sync.Mutex
	// entries keyed by "host:port"
	entries map[string]*entry
	// nomenclature is the registry-wide index of every distinct game currently
	// available, keyed by "CartridgeSlug.GameSlug" - see NomenclatureEntry,
	// addNomenclature, removeNomenclature.
	nomenclature map[string]*NomenclatureEntry

	schedulerStop chan struct{}
	schedulerDone chan struct{}
}

/** @constructor */

// NewRegistry builds a Registry for addrs (each "host:port"), all starting
// Dead - call Start to make the initial attempt at each. Each entry's slug
// is unknown until its first successful connect (see Conn.FetchNomenclature).
func NewRegistry(dialer Dialer, config Config, addrs []string) *Registry {
	entries := make(map[string]*entry, len(addrs))
	for _, a := range addrs {
		entries[a] = &entry{addr: a, state: StateDead}
	}
	return &Registry{
		dialer:       dialer,
		config:       config,
		entries:      entries,
		nomenclature: make(map[string]*NomenclatureEntry),
	}
}

// Start attempts to connect to every tracked cartridge once. One that
// doesn't answer right now is simply left Dead. Its own later
// announce (Announce), a manage-socket addition (AddCartridge), or a
// manual push is what revives it.
func (r *Registry) Start() {
	r.mu.Lock()
	addrs := make([]string, 0, len(r.entries))
	for a := range r.entries {
		addrs = append(addrs, a)
	}
	r.mu.Unlock()

	for _, a := range addrs {
		r.attemptConnect(a)
	}
}

// StartRetryScheduler runs a background loop (until StopRetryScheduler is
// called) that retries every PendingRetry entry once its scheduled time
// has passed - checked once a second, so an actual retry can lag up to
// ~1s past when it was due.
func (r *Registry) StartRetryScheduler() {
	r.schedulerStop = make(chan struct{})
	r.schedulerDone = make(chan struct{})
	go func() {
		defer close(r.schedulerDone)
		ticker := time.NewTicker(time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				r.retryDueCartridges()
			case <-r.schedulerStop:
				return
			}
		}
	}()
}

// StopRetryScheduler stops the background loop started by
// StartRetryScheduler and waits for it to finish. A no-op if it was never
// started.
func (r *Registry) StopRetryScheduler() {
	if r.schedulerStop == nil {
		return
	}
	close(r.schedulerStop)
	<-r.schedulerDone
}

// Announce is the HTTP-announce entry point: addr must already be tracked
// (in Cartridges), or the announce is ignored - it does not grow the
// tracked set itself, see AddCartridge for that. A no-op if addr is
// already Connected (its data is already current) or Corrupted (an
// automatic re-announce from a still-broken cartridge shouldn't retrigger
// the same corrupted-detection cycle on its own - see StateCorrupted;
// ForceConnect is the deliberate way to give it another chance).
func (r *Registry) Announce(addr string) {
	r.mu.Lock()
	e, exists := r.entries[addr]
	if !exists {
		r.mu.Unlock()
		return
	}
	skip := e.state == StateConnected || e.state == StateCorrupted
	r.mu.Unlock()
	if skip {
		return
	}
	r.attemptConnect(addr)
}

// AddCartridge tracks a new addr (e.g. just added to Cartridges via the
// manage socket) and immediately attempts to connect to it - same
// single-shot, no-retry-queue behavior as Start. A no-op if addr is
// already tracked and Connected or Corrupted (see StateCorrupted).
func (r *Registry) AddCartridge(addr string) {
	r.mu.Lock()
	e, exists := r.entries[addr]
	if !exists {
		r.entries[addr] = &entry{addr: addr, state: StateDead}
	} else if e.state == StateConnected || e.state == StateCorrupted {
		r.mu.Unlock()
		return
	}
	r.mu.Unlock()
	r.attemptConnect(addr)
}

// ForceConnect immediately attempts to (re)connect to addr, bypassing the
// retry schedule. A no-op if addr isn't tracked or is already Connected.
func (r *Registry) ForceConnect(addr string) {
	r.mu.Lock()
	e, ok := r.entries[addr]
	if !ok || e.state == StateConnected {
		r.mu.Unlock()
		return
	}
	r.mu.Unlock()
	r.attemptConnect(addr)
}

// PingKnown re-verifies every currently Connected entry - called on each
// new user's lobby connection.
// A PendingRetry entry is already being retried by the scheduler and isn't
// duplicated here.
func (r *Registry) PingKnown() {
	r.mu.Lock()
	var toCheck []string
	for addr, e := range r.entries {
		if e.state == StateConnected {
			toCheck = append(toCheck, addr)
		}
	}
	r.mu.Unlock()

	for _, addr := range toCheck {
		r.pingEntry(addr)
	}
}

// Status returns a snapshot of addr's current state, or (Status{}, false)
// if it isn't tracked at all.
func (r *Registry) Status(addr string) (Status, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	e, ok := r.entries[addr]
	if !ok {
		return Status{}, false
	}
	return Status{
		Addr:        e.addr,
		State:       e.state,
		Attempts:    e.attempts,
		MaxAttempts: r.config.MaxAttempts,
		NextAttempt: e.nextAttempt,
	}, true
}

// NomenclatureEntry is one distinct game currently available, keyed by
// "CartridgeSlug.GameSlug" - deduplicated across every currently-connected
// node of the same cartridge that serves it, with the full list of nodes
// that do in Entries (see PickNode).
type NomenclatureEntry struct {
	Key string
	Nomenclature
	Entries []string
}

// Nomenclature returns every distinct game currently available - a
// snapshot of the registry-wide index maintained by addNomenclature/
// removeNomenclature as nodes connect and disconnect. Two nodes sharing a
// cartridge's Slug and reporting the same GameSlug show up as one
// NomenclatureEntry (its Entries lists both); if they disagree on the game's
// data (version/config skew between nodes of what's supposed to be the
// same cartridge), the node that connected first wins and the later one's
// copy is rejected (see addNomenclature), reported through Config.OnLogError.
func (r *Registry) Nomenclature() []NomenclatureEntry {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]NomenclatureEntry, 0, len(r.nomenclature))
	for _, ne := range r.nomenclature {
		out = append(out, *ne)
	}
	return out
}

// PickNode returns the least-loaded currently-connected node serving key
// ("CartridgeSlug.GameSlug", see NomenclatureEntry.Key) - "least-loaded"
// measured by that node's own live active-room count at the moment of the
// call. ok is false if no connected node currently serves key at all, or
// none of them could be reached just now.
func (r *Registry) PickNode(key string) (addr string, ok bool) {
	type candidate struct {
		addr string
		conn Conn
	}

	r.mu.Lock()
	var candidates []candidate
	for a, e := range r.entries {
		if e.state != StateConnected {
			continue
		}
		for _, ne := range e.nomenclature {
			if ne.Key == key {
				candidates = append(candidates, candidate{addr: a, conn: e.conn})
				break
			}
		}
	}
	r.mu.Unlock()

	bestAddr := ""
	bestCount := -1
	for _, c := range candidates {
		rooms, err := c.conn.FetchActiveRooms()
		if err != nil {
			continue
		}
		if bestCount == -1 || len(rooms) < bestCount {
			bestCount = len(rooms)
			bestAddr = c.addr
		}
	}
	if bestAddr == "" {
		return "", false
	}
	return bestAddr, true
}

// ActiveRooms pulls every currently Connected cartridge's active instances
// live, aggregated. A cartridge whose pull itself fails is skipped here;
// PingKnown (called alongside this for the same new-user-connect event)
// is what re-verifies and demotes its state.
func (r *Registry) ActiveRooms() []Room {
	r.mu.Lock()
	var conns []Conn
	for _, e := range r.entries {
		if e.state == StateConnected {
			conns = append(conns, e.conn)
		}
	}
	r.mu.Unlock()

	var all []Room
	for _, c := range conns {
		rooms, err := c.FetchActiveRooms()
		if err != nil {
			continue
		}
		all = append(all, rooms...)
	}
	return all
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// attemptConnect dials addr and, on success, fetches and caches its
// nomenclature. A concurrent call for the same addr (e.g. an Announce
// racing the retry scheduler) is skipped rather than opening a second
// connection.
func (r *Registry) attemptConnect(addr string) {
	r.mu.Lock()
	e := r.entries[addr]
	if e == nil || e.connecting || e.state == StateConnected {
		r.mu.Unlock()
		return
	}
	e.connecting = true
	r.mu.Unlock()

	defer func() {
		r.mu.Lock()
		if e := r.entries[addr]; e != nil {
			e.connecting = false
		}
		r.mu.Unlock()
	}()

	conn, err := r.dialer(addr, r.config.RequestTimeout,
		func() { r.handleDeregister(addr) },
		func() { r.handleDropped(addr) },
	)
	if err != nil {
		r.handleAttemptFailure(addr)
		return
	}

	slug, nomenclature, err := conn.FetchNomenclature()
	if err != nil {
		conn.Close()
		r.handleAttemptFailure(addr)
		return
	}

	r.mu.Lock()
	e = r.entries[addr]
	if e == nil {
		r.mu.Unlock()
		conn.Close()
		return
	}

	mine := r.addNomenclature(addr, slug, nomenclature)
	if len(nomenclature) > 0 && len(mine) == 0 {
		e.state = StateCorrupted
		e.conn = nil
		r.mu.Unlock()
		conn.Close()
		r.logError(fmt.Sprintf(
			"cartridges: node %s marked corrupted - all %d reported game(s) conflicted with already-registered data under the same key",
			addr, len(nomenclature),
		))
		return
	}

	e.state = StateConnected
	e.conn = conn
	e.slug = slug
	e.nomenclature = mine
	e.everConnected = true
	e.attempts = 0
	r.mu.Unlock()
}

// handleAttemptFailure routes a failed connect attempt to the right
// outcome: a cartridge with no prior successful connection goes straight
// to Dead; one that HAD a working connection before enters (or continues)
// the retry queue, until MaxAttempts is exhausted.
//
// Called both for a failed (re)connect attempt and for a live connection
// that just broke (a failed ping, or an unannounced drop) - in the latter
// case the entry is still StateConnected when this runs, since reporting
// that break is exactly this call's job; there's no separate guard against
// "already Connected" to skip here; attemptConnect's own in-flight
// (connecting) guard is what rules out a concurrent success being
// overwritten by a stale failure for the same addr.
func (r *Registry) handleAttemptFailure(addr string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	e := r.entries[addr]
	if e == nil {
		return
	}
	e.conn = nil
	r.removeNomenclature(e)

	if !e.everConnected {
		e.state = StateDead
		return
	}

	e.attempts++
	if e.attempts >= r.config.MaxAttempts {
		e.state = StateDead
		e.attempts = 0
		return
	}
	e.state = StatePendingRetry
	e.nextAttempt = time.Now().Add(r.config.RetryInterval)
}

// handleDeregister is the Dialer's onDeregister callback - a graceful
// shutdown is a known departure, not a failure, so it goes straight to
// Dead.
func (r *Registry) handleDeregister(addr string) {
	r.mu.Lock()
	e := r.entries[addr]
	if e == nil {
		r.mu.Unlock()
		return
	}
	conn := e.conn
	e.state = StateDead
	e.conn = nil
	e.attempts = 0
	r.removeNomenclature(e)
	r.mu.Unlock()

	if conn != nil {
		conn.Close()
	}
}

// handleDropped is the Dialer's onDropped callback - an unannounced loss,
// so (unlike handleDeregister) it goes through the same retry-queue path
// as any other post-connection failure.
func (r *Registry) handleDropped(addr string) {
	r.handleAttemptFailure(addr)
}

// pingEntry shares the connecting guard with attemptConnect - without it,
// two overlapping PingKnown calls for the same cartridge (e.g. two users
// connecting to the lobby around the same moment) would each independently
// see it Connected, each get their own Ping failure, and each call
// handleAttemptFailure - double-counting a single real failure against
// MaxAttempts and burning through the configured retry budget twice as
// fast as intended.
func (r *Registry) pingEntry(addr string) {
	r.mu.Lock()
	e := r.entries[addr]
	if e == nil || e.state != StateConnected || e.connecting {
		r.mu.Unlock()
		return
	}
	e.connecting = true
	conn := e.conn
	r.mu.Unlock()

	defer func() {
		r.mu.Lock()
		if e := r.entries[addr]; e != nil {
			e.connecting = false
		}
		r.mu.Unlock()
	}()

	if err := conn.Ping(); err == nil {
		return
	}
	conn.Close()
	r.handleAttemptFailure(addr)
}

// addNomenclature registers addr's freshly-fetched games into the
// registry-wide index (r.nomenclature), returning the subset addr actually
// ends up contributing to - a game whose key is already claimed by a
// different node reporting different data is rejected (logged through
// Config.OnLogError, not merged or overwritten). Must be called with r.mu
// held, and only for an addr whose prior contributions (if any) have
// already been cleared via removeNomenclature.
func (r *Registry) addNomenclature(addr, slug string, list []Nomenclature) []*NomenclatureEntry {
	var mine []*NomenclatureEntry
	for _, n := range list {
		key := slug + "." + n.Slug
		existing, ok := r.nomenclature[key]
		if !ok {
			ne := &NomenclatureEntry{Key: key, Nomenclature: n, Entries: []string{addr}}
			r.nomenclature[key] = ne
			mine = append(mine, ne)
			continue
		}
		if existing.Nomenclature != n {
			r.logError(fmt.Sprintf(
				"cartridges: node %s reports conflicting nomenclature for %q (have %+v, got %+v) - rejecting this node's copy",
				addr, key, existing.Nomenclature, n,
			))
			continue
		}
		existing.Entries = append(existing.Entries, addr)
		mine = append(mine, existing)
	}
	return mine
}

// removeNomenclature drops e.addr from every NomenclatureEntry it was
// contributing to, deleting the registry-wide entry entirely once no node
// backs it any more, and clears e.nomenclature. A no-op if e wasn't
// contributing to anything (e.g. it never successfully connected). Must be
// called with r.mu held.
func (r *Registry) removeNomenclature(e *entry) {
	for _, ne := range e.nomenclature {
		for i, a := range ne.Entries {
			if a == e.addr {
				ne.Entries = append(ne.Entries[:i], ne.Entries[i+1:]...)
				break
			}
		}
		if len(ne.Entries) == 0 {
			delete(r.nomenclature, ne.Key)
		}
	}
	e.nomenclature = nil
}

// logError reports msg through Config.OnLogError, if set - a no-op
// otherwise.
func (r *Registry) logError(msg string) {
	if r.config.OnLogError != nil {
		r.config.OnLogError(msg)
	}
}

func (r *Registry) retryDueCartridges() {
	now := time.Now()
	r.mu.Lock()
	var due []string
	for addr, e := range r.entries {
		if e.state == StatePendingRetry && !e.nextAttempt.After(now) {
			due = append(due, addr)
		}
	}
	r.mu.Unlock()

	for _, addr := range due {
		r.attemptConnect(addr)
	}
}
