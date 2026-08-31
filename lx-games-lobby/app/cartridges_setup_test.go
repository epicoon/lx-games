package app

import (
	"testing"

	"github.com/epicoon/lxgo/kernel"
	"github.com/epicoon/lxgo/kernel/apptest"
)

func TestBuildCartridgesRegistry_DefaultsWhenConfigAbsent(t *testing.T) {
	app, err := apptest.New()
	if err != nil {
		t.Fatalf("apptest.New: %v", err)
	}

	registry, err := buildCartridgesRegistry(app)
	if err != nil {
		t.Fatalf("buildCartridgesRegistry: %v", err)
	}
	if registry == nil {
		t.Fatalf("expected a non-nil registry even with no RegistrySettings/Cartridges config at all")
	}
	if _, known := registry.Status("localhost:8093"); known {
		t.Fatalf("expected no cartridges tracked when Cartridges is absent")
	}
}

// TestBuildCartridgesRegistry_ReadsConfiguredValues is a regression test for
// the cast.DictToStruct rewrite: a hand-rolled per-field
// config.HasParam/GetParam sequence used to read these same keys - this
// pins down that the struct-based read still actually picks up configured
// values, not just falls back to defaults for everything.
func TestBuildCartridgesRegistry_ReadsConfiguredValues(t *testing.T) {
	app, err := apptest.New(kernel.Dict{
		"RegistrySettings": kernel.Dict{
			"RequestTimeoutMs": 1234,
			"RetryIntervalMs":  5678,
			"MaxRetries":       7,
		},
		"Cartridges": []any{"example.com:8093", "example.com:8094"},
	})
	if err != nil {
		t.Fatalf("apptest.New: %v", err)
	}

	registry, err := buildCartridgesRegistry(app)
	if err != nil {
		t.Fatalf("buildCartridgesRegistry: %v", err)
	}

	for _, addr := range []string{"example.com:8093", "example.com:8094"} {
		st, known := registry.Status(addr)
		if !known {
			t.Fatalf("expected addr %s to be tracked", addr)
		}
		if st.MaxAttempts != 7 {
			t.Fatalf("expected MaxRetries=7 to reach Registry.Config, got MaxAttempts=%d", st.MaxAttempts)
		}
	}
	if _, known := registry.Status("example.com:9999"); known {
		t.Fatalf("expected an unconfigured addr not to be tracked")
	}
}
