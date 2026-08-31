package cartridges

import (
	"fmt"
	"sync"
	"testing"
	"time"
)

// fakeConn is a controllable Conn for tests - failNext makes the next
// FetchNomenclature/Ping call fail, closed records whether Close was
// called. onPingEnter, if set, runs synchronously at the start of Ping -
// tests use it to force two concurrent Ping calls to genuinely overlap
// (see TestRegistry_PingKnown_ConcurrentCalls_CountFailureOnlyOnce).
type fakeConn struct {
	mu           sync.Mutex
	slug         string
	nomenclature []Nomenclature
	activeRooms  []Room
	failPing     bool
	closed       bool
	onPingEnter  func()
}

func (c *fakeConn) FetchNomenclature() (string, []Nomenclature, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.slug, c.nomenclature, nil
}
func (c *fakeConn) FetchActiveRooms() ([]Room, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.activeRooms, nil
}
func (c *fakeConn) Ping() error {
	c.mu.Lock()
	onEnter := c.onPingEnter
	failPing := c.failPing
	c.mu.Unlock()

	if onEnter != nil {
		onEnter()
	}

	if failPing {
		return fmt.Errorf("ping failed")
	}
	return nil
}
func (c *fakeConn) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.closed = true
	return nil
}

// fakeDialer is a controllable Dialer - dead marks addrs that should fail
// to dial at all; calls counts Dial invocations per addr (for the
// concurrent-dial-guard test); conns holds the fakeConn handed out for
// each successfully dialed addr, and the onDeregister/onDropped callbacks
// Dial was given, so a test can invoke them directly. Pass dialer.Dial
// (a method value) wherever a Dialer is needed - Dialer is a plain func
// type, not an interface.
type fakeDialer struct {
	mu         sync.Mutex
	dead       map[string]bool
	calls      map[string]int
	conns      map[string]*fakeConn
	cbs        map[string]struct{ onDeregister, onDropped func() }
	presetSlug map[string]string
	presetNC   map[string][]Nomenclature
	// onDial, if set, runs synchronously inside Dial (after recording the
	// call) - tests use it to force a Dial call to hang until released, so
	// concurrent callers genuinely overlap instead of racing to finish.
	onDial func(addr string)
}

func newFakeDialer() *fakeDialer {
	return &fakeDialer{
		dead:       map[string]bool{},
		calls:      map[string]int{},
		conns:      map[string]*fakeConn{},
		cbs:        map[string]struct{ onDeregister, onDropped func() }{},
		presetSlug: map[string]string{},
		presetNC:   map[string][]Nomenclature{},
	}
}

func (d *fakeDialer) Dial(addr string, requestTimeout time.Duration, onDeregister, onDropped func()) (Conn, error) {
	d.mu.Lock()
	d.calls[addr]++
	dead := d.dead[addr]
	slug := d.presetSlug[addr]
	nc := d.presetNC[addr]
	onDial := d.onDial
	d.cbs[addr] = struct{ onDeregister, onDropped func() }{onDeregister, onDropped}
	d.mu.Unlock()

	if onDial != nil {
		onDial(addr)
	}

	if dead {
		return nil, fmt.Errorf("addr %s refused connection", addr)
	}
	c := &fakeConn{slug: slug, nomenclature: nc}
	d.mu.Lock()
	d.conns[addr] = c
	d.mu.Unlock()
	return c, nil
}

func (d *fakeDialer) callCount(addr string) int {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.calls[addr]
}

func (d *fakeDialer) conn(addr string) *fakeConn {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.conns[addr]
}

func (d *fakeDialer) triggerDropped(addr string) {
	d.mu.Lock()
	cb := d.cbs[addr]
	d.mu.Unlock()
	cb.onDropped()
}

func (d *fakeDialer) triggerDeregister(addr string) {
	d.mu.Lock()
	cb := d.cbs[addr]
	d.mu.Unlock()
	cb.onDeregister()
}

func testConfig() Config {
	return Config{RetryInterval: 20 * time.Millisecond, MaxAttempts: 3}
}

func TestRegistry_Start_ReachableAddrBecomesConnected(t *testing.T) {
	dialer := newFakeDialer()
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093"})

	r.Start()

	st, ok := r.Status("localhost:8093")
	if !ok {
		t.Fatalf("expected localhost:8093 to be tracked")
	}
	if st.State != StateConnected {
		t.Fatalf("expected StateConnected, got %v", st.State)
	}
}

func TestRegistry_Start_UnreachableAddrIsDeadNotQueued(t *testing.T) {
	dialer := newFakeDialer()
	dialer.dead["localhost:8093"] = true
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093"})

	r.Start()

	st, ok := r.Status("localhost:8093")
	if !ok {
		t.Fatalf("expected localhost:8093 to be tracked")
	}
	if st.State != StateDead {
		t.Fatalf("expected StateDead (no retry queue at first contact), got %v", st.State)
	}
	if st.Attempts != 0 {
		t.Fatalf("expected a first-contact failure not to count as a retry attempt, got %d", st.Attempts)
	}
}

func TestRegistry_Announce_UnknownAddrIsIgnored(t *testing.T) {
	dialer := newFakeDialer()
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093"})

	r.Announce("localhost:9999") // not in the configured addrs at all

	if _, ok := r.Status("localhost:9999"); ok {
		t.Fatalf("an announce from an untracked addr must not add it - see task 0182 answer to question 1")
	}
	if dialer.callCount("localhost:9999") != 0 {
		t.Fatalf("expected no dial attempt for an untracked addr, got %d", dialer.callCount("localhost:9999"))
	}
}

func TestRegistry_Announce_AlreadyConnectedDoesNotRedial(t *testing.T) {
	dialer := newFakeDialer()
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093"})
	r.Start()
	if calls := dialer.callCount("localhost:8093"); calls != 1 {
		t.Fatalf("setup: expected exactly one dial from Start, got %d", calls)
	}

	r.Announce("localhost:8093")

	if calls := dialer.callCount("localhost:8093"); calls != 1 {
		t.Fatalf("expected Announce on an already-Connected addr to skip re-dialing, got %d calls", calls)
	}
}

func TestRegistry_AddCartridge_TracksAndConnectsImmediately(t *testing.T) {
	dialer := newFakeDialer()
	r := NewRegistry(dialer.Dial, testConfig(), nil) // starts with nothing configured

	r.AddCartridge("localhost:8094")

	st, ok := r.Status("localhost:8094")
	if !ok {
		t.Fatalf("expected AddCartridge to start tracking the addr")
	}
	if st.State != StateConnected {
		t.Fatalf("expected an immediate connect attempt to succeed, got %v", st.State)
	}
}

func TestRegistry_PingFailureOnConnectedEntry_EntersRetryQueue(t *testing.T) {
	dialer := newFakeDialer()
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093"})
	r.Start()

	dialer.conn("localhost:8093").failPing = true
	r.PingKnown()

	st, _ := r.Status("localhost:8093")
	if st.State != StatePendingRetry {
		t.Fatalf("expected a failed ping on a previously-Connected addr to enter the retry queue, got %v", st.State)
	}
	if st.Attempts != 1 {
		t.Fatalf("expected attempts=1, got %d", st.Attempts)
	}
	if !st.NextAttempt.After(time.Now()) {
		t.Fatalf("expected NextAttempt to be scheduled in the future")
	}
}

// TestRegistry_PingKnown_ConcurrentCalls_CountFailureOnlyOnce is a
// regression test: pingEntry used to have no in-flight guard (unlike
// attemptConnect's connecting flag), so two PingKnown calls overlapping
// for the same addr - e.g. two users connecting to the lobby around the
// same moment while a cartridge is down - would each independently see it
// Connected, each get their own Ping failure, and each call
// handleAttemptFailure, double-counting one real failure against
// MaxAttempts.
func TestRegistry_PingKnown_ConcurrentCalls_CountFailureOnlyOnce(t *testing.T) {
	dialer := newFakeDialer()
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093"})
	r.Start()

	conn := dialer.conn("localhost:8093")
	conn.failPing = true

	entered := make(chan struct{})
	proceed := make(chan struct{})
	var once sync.Once
	conn.onPingEnter = func() {
		once.Do(func() { close(entered) })
		<-proceed
	}

	firstDone := make(chan struct{})
	go func() {
		r.PingKnown()
		close(firstDone)
	}()

	<-entered // the first PingKnown's Ping call is now blocked inside fakeConn

	// A second, overlapping PingKnown for the same addr - must be a no-op
	// while the first is still in flight (the connecting guard), not a
	// second independent failure.
	r.PingKnown()

	close(proceed)
	<-firstDone

	st, _ := r.Status("localhost:8093")
	if st.Attempts != 1 {
		t.Fatalf("expected exactly one counted attempt despite two overlapping PingKnown calls, got %d", st.Attempts)
	}
}

func TestRegistry_PingKnown_LeavesHealthyConnectionAlone(t *testing.T) {
	dialer := newFakeDialer()
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093"})
	r.Start()

	r.PingKnown()

	if calls := dialer.callCount("localhost:8093"); calls != 1 {
		t.Fatalf("PingKnown must not re-dial a healthy connection, got %d calls", calls)
	}
	st, _ := r.Status("localhost:8093")
	if st.State != StateConnected {
		t.Fatalf("expected the entry to remain Connected, got %v", st.State)
	}
}

func TestRegistry_RetryQueue_ExhaustsToDeadAfterMaxAttempts(t *testing.T) {
	dialer := newFakeDialer()
	cfg := Config{RetryInterval: 5 * time.Millisecond, MaxAttempts: 2}
	r := NewRegistry(dialer.Dial, cfg, []string{"localhost:8093"})
	r.Start()

	// First failure: connected -> pending-retry (attempts=1).
	dialer.conn("localhost:8093").failPing = true
	r.PingKnown()
	if st, _ := r.Status("localhost:8093"); st.State != StatePendingRetry || st.Attempts != 1 {
		t.Fatalf("setup: expected pending-retry/1, got %v/%d", st.State, st.Attempts)
	}

	// Make the retry itself fail too, then let the scheduler run it.
	dialer.dead["localhost:8093"] = true
	r.StartRetryScheduler()
	defer r.StopRetryScheduler()

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if st, _ := r.Status("localhost:8093"); st.State == StateDead {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	st, _ := r.Status("localhost:8093")
	t.Fatalf("expected the addr to end up Dead after exhausting MaxAttempts, got %v/%d", st.State, st.Attempts)
}

func TestRegistry_Deregister_GoesStraightToDeadNotRetryQueue(t *testing.T) {
	dialer := newFakeDialer()
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093"})
	r.Start()

	dialer.triggerDeregister("localhost:8093")

	st, _ := r.Status("localhost:8093")
	if st.State != StateDead {
		t.Fatalf("expected a graceful deregister to go straight to Dead, got %v", st.State)
	}
	if !dialer.conn("localhost:8093").closed {
		t.Fatalf("expected the connection to be closed on deregister")
	}
}

func TestRegistry_Dropped_EntersRetryQueueLikeAFailedPing(t *testing.T) {
	dialer := newFakeDialer()
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093"})
	r.Start()

	dialer.triggerDropped("localhost:8093")

	st, _ := r.Status("localhost:8093")
	if st.State != StatePendingRetry {
		t.Fatalf("expected an unannounced drop to enter the retry queue (same as a failed ping), got %v", st.State)
	}
}

// TestRegistry_ConcurrentAttempts_DialOnlyOncePerAddr forces genuine
// overlap (the first Dial call is held open via onDial until every other
// goroutine has already called Announce and returned) rather than just
// racing 20 goroutines and hoping - with no forced overlap, all 20 could
// just as easily run one after another well within the guard's own
// lock/unlock window, and the old "calls > 20" assertion would pass either
// way (20 is the maximum possible number of calls in the first place, so
// it could never actually fail).
func TestRegistry_ConcurrentAttempts_DialOnlyOncePerAddr(t *testing.T) {
	dialer := newFakeDialer()
	entered := make(chan struct{})
	proceed := make(chan struct{})
	var once sync.Once
	dialer.onDial = func(addr string) {
		once.Do(func() { close(entered) })
		<-proceed
	}
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093"})

	firstDone := make(chan struct{})
	go func() {
		r.Announce("localhost:8093")
		close(firstDone)
	}()

	<-entered // the first attempt is now blocked inside Dial

	var wg sync.WaitGroup
	for range 19 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r.Announce("localhost:8093") // must see connecting=true and return without dialing
		}()
	}
	wg.Wait()

	if calls := dialer.callCount("localhost:8093"); calls != 1 {
		t.Fatalf("expected exactly one dial while the first is still in flight, got %d calls from 19 concurrent Announce calls", calls)
	}

	close(proceed)
	<-firstDone

	if calls := dialer.callCount("localhost:8093"); calls != 1 {
		t.Fatalf("expected still exactly one dial total, got %d", calls)
	}
	st, _ := r.Status("localhost:8093")
	if st.State != StateConnected {
		t.Fatalf("expected the addr to end up Connected, got %v", st.State)
	}
}

func TestRegistry_Nomenclature_AggregatesOnlyConnectedEntries(t *testing.T) {
	dialer := newFakeDialer()
	dialer.dead["localhost:8094"] = true
	dialer.presetNC["localhost:8093"] = []Nomenclature{{Slug: "cofb"}}
	dialer.presetNC["localhost:8094"] = []Nomenclature{{Slug: "should-not-appear"}}
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093", "localhost:8094"})

	r.Start()

	all := r.Nomenclature()
	if len(all) != 1 || all[0].Slug != "cofb" {
		t.Fatalf("expected only the Connected addr's nomenclature, got %v", all)
	}
}

// TestRegistry_FullNomenclatureConflict_MarksCorrupted and its siblings
// below connect the two nodes one at a time (Start then AddCartridge)
// rather than both via Start's single multi-addr call, so which one
// registers its data "first" - and therefore wins a conflict - is
// deterministic instead of depending on Go's randomized map iteration
// order over Registry.entries.
func TestRegistry_FullNomenclatureConflict_MarksCorrupted(t *testing.T) {
	dialer := newFakeDialer()
	dialer.presetSlug["localhost:8093"] = "cofb"
	dialer.presetNC["localhost:8093"] = []Nomenclature{{Slug: "cofb", MinSlots: 2}}
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093"})
	r.Start()

	dialer.presetSlug["localhost:8094"] = "cofb"
	dialer.presetNC["localhost:8094"] = []Nomenclature{{Slug: "cofb", MinSlots: 4}} // same key, conflicting data
	r.AddCartridge("localhost:8094")

	st, _ := r.Status("localhost:8094")
	if st.State != StateCorrupted {
		t.Fatalf("expected the conflicting node to end up StateCorrupted, got %v", st.State)
	}
	if !dialer.conn("localhost:8094").closed {
		t.Fatalf("expected the corrupted node's connection to be closed")
	}

	all := r.Nomenclature()
	if len(all) != 1 || all[0].MinSlots != 2 {
		t.Fatalf("expected the first (already-registered) node's data to remain authoritative, got %#v", all)
	}
}

func TestRegistry_Corrupted_AnnounceAndAddCartridgeDoNotRedial(t *testing.T) {
	dialer := newFakeDialer()
	dialer.presetSlug["localhost:8093"] = "cofb"
	dialer.presetNC["localhost:8093"] = []Nomenclature{{Slug: "cofb", MinSlots: 2}}
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093"})
	r.Start()

	dialer.presetSlug["localhost:8094"] = "cofb"
	dialer.presetNC["localhost:8094"] = []Nomenclature{{Slug: "cofb", MinSlots: 4}}
	r.AddCartridge("localhost:8094")
	if st, _ := r.Status("localhost:8094"); st.State != StateCorrupted {
		t.Fatalf("setup: expected StateCorrupted, got %v", st.State)
	}
	calls := dialer.callCount("localhost:8094")

	r.Announce("localhost:8094")
	r.AddCartridge("localhost:8094")

	if got := dialer.callCount("localhost:8094"); got != calls {
		t.Fatalf("expected Announce/AddCartridge on a Corrupted addr to skip re-dialing, got %d calls (was %d)", got, calls)
	}

	// ForceConnect is the one deliberate exception - it must still redial.
	r.ForceConnect("localhost:8094")
	if got := dialer.callCount("localhost:8094"); got != calls+1 {
		t.Fatalf("expected ForceConnect to redial a Corrupted addr, got %d calls (was %d)", got, calls)
	}
}

func TestRegistry_PartialNomenclatureConflict_RejectsOnlyConflictingGame(t *testing.T) {
	var loggedErrors []string
	cfg := testConfig()
	cfg.OnLogError = func(msg string) { loggedErrors = append(loggedErrors, msg) }

	dialer := newFakeDialer()
	dialer.presetSlug["localhost:8093"] = "cofb"
	dialer.presetNC["localhost:8093"] = []Nomenclature{{Slug: "gameA", MinSlots: 2}}
	r := NewRegistry(dialer.Dial, cfg, []string{"localhost:8093"})
	r.Start()

	dialer.presetSlug["localhost:8094"] = "cofb"
	dialer.presetNC["localhost:8094"] = []Nomenclature{
		{Slug: "gameA", MinSlots: 4}, // conflicts with localhost:8093's gameA
		{Slug: "gameB", MinSlots: 2}, // new game, no conflict
	}
	r.AddCartridge("localhost:8094")

	st, _ := r.Status("localhost:8094")
	if st.State != StateConnected {
		t.Fatalf("expected a partial conflict to still leave the node Connected, got %v", st.State)
	}
	if len(loggedErrors) != 1 {
		t.Fatalf("expected exactly one logged conflict, got %d: %v", len(loggedErrors), loggedErrors)
	}

	all := r.Nomenclature()
	if len(all) != 2 {
		t.Fatalf("expected both gameA (localhost:8093's copy) and gameB, got %#v", all)
	}
	for _, ne := range all {
		if ne.Slug == "gameA" && ne.MinSlots != 2 {
			t.Fatalf("expected gameA's already-registered data to survive the rejected conflicting copy, got %#v", ne)
		}
	}
}

func TestRegistry_SameGameFromTwoNodes_SharesOneEntryAcrossEntries(t *testing.T) {
	dialer := newFakeDialer()
	dialer.presetSlug["localhost:8093"] = "cofb"
	dialer.presetNC["localhost:8093"] = []Nomenclature{{Slug: "cofb", MinSlots: 2, MaxSlots: 4}}
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093"})
	r.Start()

	dialer.presetSlug["localhost:8094"] = "cofb"
	dialer.presetNC["localhost:8094"] = []Nomenclature{{Slug: "cofb", MinSlots: 2, MaxSlots: 4}} // identical data - a load-balancing sibling, not a conflict
	r.AddCartridge("localhost:8094")

	if st, _ := r.Status("localhost:8094"); st.State != StateConnected {
		t.Fatalf("expected the identical sibling to connect normally, got %v", st.State)
	}

	all := r.Nomenclature()
	if len(all) != 1 {
		t.Fatalf("expected the two nodes' identical game to dedupe into one entry, got %#v", all)
	}
	entries := all[0].Entries
	if len(entries) != 2 {
		t.Fatalf("expected both nodes listed in Entries, got %v", entries)
	}
}

func TestRegistry_NodeDisconnect_RemovesItsSoleNomenclatureContribution(t *testing.T) {
	dialer := newFakeDialer()
	dialer.presetSlug["localhost:8093"] = "cofb"
	dialer.presetNC["localhost:8093"] = []Nomenclature{{Slug: "cofb"}}
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093"})
	r.Start()

	if len(r.Nomenclature()) != 1 {
		t.Fatalf("setup: expected the game to be registered")
	}

	dialer.triggerDeregister("localhost:8093")

	if all := r.Nomenclature(); len(all) != 0 {
		t.Fatalf("expected the game to be removed once its only node disconnects, got %#v", all)
	}
}

func TestRegistry_NodeDisconnect_SharedGameSurvivesViaOtherNode(t *testing.T) {
	dialer := newFakeDialer()
	dialer.presetSlug["localhost:8093"] = "cofb"
	dialer.presetNC["localhost:8093"] = []Nomenclature{{Slug: "cofb"}}
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093"})
	r.Start()

	dialer.presetSlug["localhost:8094"] = "cofb"
	dialer.presetNC["localhost:8094"] = []Nomenclature{{Slug: "cofb"}}
	r.AddCartridge("localhost:8094")

	dialer.triggerDeregister("localhost:8093")

	all := r.Nomenclature()
	if len(all) != 1 {
		t.Fatalf("expected the shared game to still be listed via the other node, got %#v", all)
	}
	if len(all[0].Entries) != 1 || all[0].Entries[0] != "localhost:8094" {
		t.Fatalf("expected Entries to now list only localhost:8094, got %v", all[0].Entries)
	}
}

func TestRegistry_PickNode_ReturnsLeastLoadedConnectedNode(t *testing.T) {
	dialer := newFakeDialer()
	dialer.presetSlug["localhost:8093"] = "cofb"
	dialer.presetNC["localhost:8093"] = []Nomenclature{{Slug: "cofb"}}
	r := NewRegistry(dialer.Dial, testConfig(), []string{"localhost:8093"})
	r.Start()

	dialer.presetSlug["localhost:8094"] = "cofb"
	dialer.presetNC["localhost:8094"] = []Nomenclature{{Slug: "cofb"}}
	r.AddCartridge("localhost:8094")

	dialer.conn("localhost:8093").activeRooms = []Room{{InstanceID: "a"}, {InstanceID: "b"}}
	dialer.conn("localhost:8094").activeRooms = nil // fewer rooms - less loaded

	addr, ok := r.PickNode("cofb.cofb")
	if !ok {
		t.Fatalf("expected PickNode to find a serving node")
	}
	if addr != "localhost:8094" {
		t.Fatalf("expected the least-loaded node localhost:8094, got %s", addr)
	}
}

func TestRegistry_PickNode_UnknownKey_ReturnsNotOK(t *testing.T) {
	dialer := newFakeDialer()
	r := NewRegistry(dialer.Dial, testConfig(), nil)

	if _, ok := r.PickNode("nothing.here"); ok {
		t.Fatalf("expected PickNode to report not-ok for a key no node serves")
	}
}
