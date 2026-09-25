// Package cartridges tracks the lobby's connections to the game-application
// processes ("cartridges") configured in Cartridges, and the nomenclature/
// active-room data each one reports - the connection is always established
// by the lobby, dialing out to a host:port from that configured list; a
// cartridge merely announces its own startup over HTTP.
package cartridges

import (
	"errors"
	"fmt"
	"reflect"
	"strings"
	"sync"
	"time"

	"github.com/epicoon/lxgo/kernel/utils"
)

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

// Registry tracks every configured cartridge and the lobby's current
// relationship to whatever's running there.
type Registry struct {
	dialer Dialer
	config Config

	mu sync.Mutex

	// cartridgeNodes keyed by random string
	cartridgeNodes map[string]*cartridgeNode
	// cartridgeNodesMap - map[cartridgeNodeAddr]cartridgeNodeKey, where
	// cartridgeNodeAddr - "host:port"
	cartridgeNodesMap map[string]string

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
func NewRegistry(dialer Dialer, config Config, addrs []string) (*Registry, error) {
	r := Registry{
		dialer:       dialer,
		config:       config,
		nomenclature: make(map[string]*NomenclatureEntry),
	}

	r.cartridgeNodesMap = make(map[string]string, len(addrs))
	r.cartridgeNodes = make(map[string]*cartridgeNode, len(addrs))

	for _, a := range addrs {
		key, err := r.genNewCartridgeKey()
		if err != nil {
			return nil, err
		}

		r.cartridgeNodesMap[a] = key
		r.cartridgeNodes[key] = &cartridgeNode{addr: a, state: StateDead}
	}

	return &r, nil
}

// Start attempts to connect to every tracked cartridge once. One that
// doesn't answer right now is simply left Dead. Its own later
// announce (Announce), a manage-socket addition (AddCartridge), or a
// manual push is what revives it.
func (r *Registry) Start() {
	r.mu.Lock()
	addrs := make([]string, 0, len(r.cartridgeNodes))
	for _, node := range r.cartridgeNodes {
		addrs = append(addrs, node.addr)
	}
	r.mu.Unlock()

	for _, addr := range addrs {
		r.attemptConnect(addr)
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

// stopRetrySchedulerGrace bounds how long StopRetryScheduler waits for the
// scheduler goroutine to actually exit - see its own doc comment for why
// this can't just be an unbounded wait.
const stopRetrySchedulerGrace = 500 * time.Millisecond

// StopRetryScheduler stops the background loop started by
// StartRetryScheduler and gives it stopRetrySchedulerGrace to finish. A
// no-op if it was never started. Deliberately bounded, not an unbounded
// <-r.schedulerDone wait: retryDueCartridges only checks r.schedulerStop
// between due nodes (see its own doc comment), not while one is actually
// in flight - a single due node whose attemptConnect is genuinely stuck
// (dialing/fetching a dead cartridge, each step up to its own
// Config.RequestTimeout) would otherwise make every app shutdown visibly
// hang for however long that in-flight call takes, every time one happens
// to be running at the moment Final is called. Giving up after a short
// grace period instead costs nothing - the goroutine still exits on its
// own once that call returns, there's just nothing left to coordinate
// with it for by then.
func (r *Registry) StopRetryScheduler() {
	if r.schedulerStop == nil {
		return
	}
	close(r.schedulerStop)
	select {
	case <-r.schedulerDone:
	case <-time.After(stopRetrySchedulerGrace):
	}
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
	key, exists := r.cartridgeNodesMap[addr]
	if !exists {
		r.mu.Unlock()
		return
	}
	node := r.cartridgeNodes[key]
	skip := node.state == StateConnected || node.state == StateCorrupted
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
func (r *Registry) AddCartridge(addr string) error {
	r.mu.Lock()
	key, exists := r.cartridgeNodesMap[addr]
	if !exists {
		key, err := r.genNewCartridgeKey()
		if err != nil {
			return err
		}
		r.cartridgeNodesMap[addr] = key
		r.cartridgeNodes[key] = &cartridgeNode{addr: addr, state: StateDead}
	} else {
		node := r.cartridgeNodes[key]
		if node.state == StateConnected || node.state == StateCorrupted {
			r.mu.Unlock()
			return nil
		}
	}
	r.mu.Unlock()
	r.attemptConnect(addr)
	return nil
}

// ForceConnect immediately attempts to (re)connect to addr, bypassing the
// retry schedule. A no-op if addr isn't tracked or is already Connected.
func (r *Registry) ForceConnect(addr string) {
	r.mu.Lock()
	key, ok := r.cartridgeNodesMap[addr]
	if !ok {
		r.mu.Unlock()
		return
	}
	node := r.cartridgeNodes[key]
	if node.state == StateConnected {
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
	for _, node := range r.cartridgeNodes {
		if node.state == StateConnected {
			toCheck = append(toCheck, node.addr)
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
	key, ok := r.cartridgeNodesMap[addr]
	if !ok {
		return Status{}, false
	}
	node := r.cartridgeNodes[key]
	return Status{
		Addr:        node.addr,
		State:       node.state,
		Attempts:    node.attempts,
		MaxAttempts: r.config.MaxAttempts,
		NextAttempt: node.nextAttempt,
	}, true
}

// AllStatuses returns a snapshot of every tracked cartridge, in no
// particular order.
func (r *Registry) AllStatuses() []Status {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]Status, 0, len(r.cartridgeNodes))
	for _, node := range r.cartridgeNodes {
		out = append(out, Status{
			Addr:        node.addr,
			State:       node.state,
			Attempts:    node.attempts,
			MaxAttempts: r.config.MaxAttempts,
			NextAttempt: node.nextAttempt,
		})
	}
	return out
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

// NomenclatureForLang returns every distinct game's
// internationalized snapshot
func (r *Registry) NomenclatureForLang(lang string) []map[string]any {
	entries := r.Nomenclature()
	games := make([]map[string]any, 0, len(entries))
	for _, e := range entries {
		info := map[string]any{
			"key":             e.Key,
			"title":           e.Title,
			"slug":            e.Slug,
			"version":         e.Version,
			"description":     e.Description,
			"genre":           e.Genre,
			"icon":            e.Icon,
			"banner":          e.Banner,
			"durationMinutes": e.DurationMinutes,
			"minSlots":        e.MinSlots,
			"maxSlots":        e.MaxSlots,
			"online":          e.Online,
			"offline":         e.Offline,
		}
		if perKey, ok := e.Translations[lang]; ok {
			for key, tr := range perKey {
				if _, has := info[key]; has {
					info[key] = tr
				}
			}
		}
		games = append(games, info)
	}
	return games
}

// PickNode returns the least-loaded currently-connected node serving key
// ("CartridgeSlug.GameSlug", see NomenclatureEntry.Key) - "least-loaded"
// measured by that node's own live active-room count at the moment of the
// call. ok is false if no connected node currently serves key at all, or
// none of them could be reached just now.
func (r *Registry) PickNode(gameKey string) (cartridgeNodeKey string, ok bool) {
	type candidate struct {
		key  string
		conn Conn
	}

	r.mu.Lock()
	var candidates []candidate
	for key, node := range r.cartridgeNodes {
		if node.state != StateConnected {
			continue
		}
		for _, ne := range node.nomenclature {
			if ne.Key == gameKey {
				candidates = append(candidates, candidate{key: key, conn: node.conn})
				break
			}
		}
	}
	r.mu.Unlock()

	bestKey := ""
	bestCount := -1
	for _, c := range candidates {
		rooms, err := c.conn.FetchActiveRooms()
		if err != nil {
			continue
		}
		if bestCount == -1 || len(rooms) < bestCount {
			bestCount = len(rooms)
			bestKey = c.key
		}
	}
	if bestKey == "" {
		return "", false
	}
	return bestKey, true
}

// NodeInfo is what a caller needs to act on one specific, already-chosen
// cartridge node - returned by Node, below.
type NodeInfo struct {
	// Addr is the node's address - both WS (what Registry itself already
	// dials) and HTTP (every cartridge now mounts both on the one port,
	// see lxgo-ws's HTTP-mounted WSServer mode), there's only the one.
	Addr string
	// Conn is the node's live connection - the same one Registry itself
	// uses for FetchNomenclature/FetchActiveRooms/Ping.
	Conn Conn
}

// Node returns nodeKey's live address and connection, if it's still
// tracked as Connected - (NodeInfo{}, false) otherwise. Unlike PickNode
// (which chooses among candidates serving a game key), this looks up one
// specific, already-chosen node by the key PickNode returned earlier -
// e.g. to relay a follow-up request to the exact node a game session was
// pinned to.
func (r *Registry) Node(nodeKey string) (NodeInfo, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	node, exists := r.cartridgeNodes[nodeKey]
	if !exists || node.state != StateConnected {
		return NodeInfo{}, false
	}
	return NodeInfo{Addr: node.addr, Conn: node.conn}, true
}

// ActiveRooms pulls every currently Connected cartridge's active instances
// live, aggregated. A cartridge whose pull itself fails is skipped here;
// PingKnown (called alongside this for the same new-user-connect event)
// is what re-verifies and demotes its state.
func (r *Registry) ActiveRooms() []Room {
	r.mu.Lock()
	var conns []Conn
	for _, node := range r.cartridgeNodes {
		if node.state == StateConnected {
			conns = append(conns, node.conn)
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
	key, ok := r.cartridgeNodesMap[addr]
	if !ok {
		r.mu.Unlock()
		return
	}
	node := r.cartridgeNodes[key]
	if node.connecting || node.state == StateConnected {
		r.mu.Unlock()
		return
	}
	node.connecting = true
	r.mu.Unlock()

	defer func() {
		r.mu.Lock()
		if node := r.cartridgeNodes[key]; node != nil {
			node.connecting = false
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
	key, ok = r.cartridgeNodesMap[addr]
	if !ok {
		r.mu.Unlock()
		conn.Close()
		return
	}
	node = r.cartridgeNodes[key]
	if node == nil {
		r.mu.Unlock()
		conn.Close()
		return
	}

	mine := r.addNomenclature(addr, slug, nomenclature)
	if len(nomenclature) > 0 && len(mine) == 0 {
		node.state = StateCorrupted
		node.conn = nil
		r.mu.Unlock()
		conn.Close()
		r.logError(fmt.Sprintf(
			"cartridges: node %s marked corrupted - all %d reported game(s) were rejected (see the error(s) just above for why each one was)",
			addr, len(nomenclature),
		))
		return
	}

	node.state = StateConnected
	node.conn = conn
	node.slug = slug
	node.nomenclature = mine
	node.everConnected = true
	node.attempts = 0
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
	key, ok := r.cartridgeNodesMap[addr]
	if !ok {
		return
	}
	node := r.cartridgeNodes[key]
	node.conn = nil
	r.removeNomenclature(node)

	if !node.everConnected {
		node.state = StateDead
		return
	}

	node.attempts++
	if node.attempts >= r.config.MaxAttempts {
		node.state = StateDead
		node.attempts = 0
		return
	}
	node.state = StatePendingRetry
	node.nextAttempt = time.Now().Add(r.config.RetryInterval)
}

// handleDeregister is the Dialer's onDeregister callback - a graceful
// shutdown is a known departure, not a failure, so it goes straight to
// Dead.
func (r *Registry) handleDeregister(addr string) {
	r.mu.Lock()
	key, ok := r.cartridgeNodesMap[addr]
	if !ok {
		r.mu.Unlock()
		return
	}
	node := r.cartridgeNodes[key]
	conn := node.conn
	node.state = StateDead
	node.conn = nil
	node.attempts = 0
	r.removeNomenclature(node)
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
	key, ok := r.cartridgeNodesMap[addr]
	if !ok {
		r.mu.Unlock()
		return
	}
	node := r.cartridgeNodes[key]
	if node.state != StateConnected || node.connecting {
		r.mu.Unlock()
		return
	}
	node.connecting = true
	conn := node.conn
	r.mu.Unlock()

	defer func() {
		r.mu.Lock()
		key, ok := r.cartridgeNodesMap[addr]
		if ok {
			node := r.cartridgeNodes[key]
			if node != nil {
				node.connecting = false
			}
		}
		r.mu.Unlock()
	}()

	if err := conn.Ping(); err == nil {
		return
	}
	conn.Close()
	r.handleAttemptFailure(addr)
}

// invalidSlug reports whether s can't be used as a cartridge's own slug or
// a game's slug - a "." would make NomenclatureEntry.Key ("cartridgeSlug" +
// "." + "gameSlug") ambiguous between two different (cartridge, game)
// pairs.
func invalidSlug(s string) bool {
	return strings.Contains(s, ".")
}

// addNomenclature registers addr's freshly-fetched games into the
// registry-wide index (r.nomenclature), returning the subset addr actually
// ends up contributing to - a game whose key is already claimed by a
// different node reporting different data is rejected (logged through
// Config.OnLogError, not merged or overwritten), and so is a game (or every
// game, if slug itself is the problem) whose slug contains "." (see
// invalidSlug). Must be called with r.mu held, and only for an addr whose
// prior contributions (if any) have already been cleared via
// removeNomenclature.
func (r *Registry) addNomenclature(addr, slug string, list []Nomenclature) []*NomenclatureEntry {
	if invalidSlug(slug) {
		r.logError(fmt.Sprintf(
			"cartridges: node %s reports an invalid cartridge slug %q (contains \".\") - rejecting all its games",
			addr, slug,
		))
		return nil
	}

	var mine []*NomenclatureEntry
	for _, n := range list {
		if invalidSlug(n.Slug) {
			r.logError(fmt.Sprintf(
				"cartridges: node %s reports an invalid game slug %q (contains \".\") - rejecting this game",
				addr, n.Slug,
			))
			continue
		}
		key := slug + "." + n.Slug
		existing, ok := r.nomenclature[key]
		if !ok {
			ne := &NomenclatureEntry{Key: key, Nomenclature: n, Entries: []string{addr}}
			r.nomenclature[key] = ne
			mine = append(mine, ne)
			continue
		}
		if !reflect.DeepEqual(existing.Nomenclature, n) {
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
func (r *Registry) removeNomenclature(node *cartridgeNode) {
	for _, ne := range node.nomenclature {
		for i, a := range ne.Entries {
			if a == node.addr {
				ne.Entries = append(ne.Entries[:i], ne.Entries[i+1:]...)
				break
			}
		}
		if len(ne.Entries) == 0 {
			delete(r.nomenclature, ne.Key)
		}
	}
	node.nomenclature = nil
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
	for _, node := range r.cartridgeNodes {
		if node.state == StatePendingRetry && !node.nextAttempt.After(now) {
			due = append(due, node.addr)
		}
	}
	r.mu.Unlock()

	for _, addr := range due {
		select {
		case <-r.schedulerStop:
			return
		default:
		}
		r.attemptConnect(addr)
	}
}

func (r *Registry) genNewCartridgeKey() (string, error) {
	attemptsLim := 100
	attempts := 0
	for {
		key := utils.GenRandomHash(16)
		if _, exists := r.cartridgeNodes[key]; !exists {
			return key, nil
		}
		attempts++
		if attempts >= attemptsLim {
			return "", errors.New("cartridge key generation failed")
		}
	}
}
