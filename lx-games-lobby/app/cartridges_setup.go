package app

import (
	"fmt"
	"time"

	"github.com/epicoon/lx-games-lobby/cartridges"
	"github.com/epicoon/lx-games-lobby/cnv"
	"github.com/epicoon/lxgo/kernel"
	"github.com/epicoon/lxgo/kernel/cast"
	"github.com/epicoon/lxgo/kernel/config"
)

// registrySettings mirrors RegistrySettings in runtime/config.yaml.
type registrySettings struct {
	RequestTimeoutMs int
	RetryIntervalMs  int
	MaxRetries       int
}

func defaultRegistrySettings() registrySettings {
	return registrySettings{
		RequestTimeoutMs: 3000,
		RetryIntervalMs:  5000,
		MaxRetries:       5,
	}
}

// readRegistrySettings reads RegistrySettings, defaulting any field not
// actually present - including every field, if the key is absent
// entirely.
func readRegistrySettings(cfg kernel.IDict) (registrySettings, error) {
	settings := defaultRegistrySettings()
	if !config.HasParam(cfg, "RegistrySettings") {
		return settings, nil
	}
	sub, err := config.GetParam[kernel.Dict](cfg, "RegistrySettings")
	if err != nil {
		return registrySettings{}, fmt.Errorf("RegistrySettings: %w", err)
	}
	if err := cast.DictToStruct(&sub, &settings); err != nil {
		return registrySettings{}, fmt.Errorf("RegistrySettings: %w", err)
	}
	return settings, nil
}

// readCartridges reads the Cartridges config list ("host:port" strings) -
// absent entirely means no cartridges configured (not an error). No slug
// lives here - each cartridge reports its own, see cartridges.Conn's
// FetchNomenclature.
func readCartridges(cfg kernel.IDict) ([]string, error) {
	if !config.HasParam(cfg, "Cartridges") {
		return nil, nil
	}
	raw, err := config.GetParam[[]any](cfg, "Cartridges")
	if err != nil {
		return nil, fmt.Errorf("Cartridges: %w", err)
	}
	addrs := make([]string, 0, len(raw))
	for _, v := range raw {
		s, err := cast.To[string](v)
		if err != nil {
			return nil, fmt.Errorf("Cartridges entry %v: %w", v, err)
		}
		addrs = append(addrs, s)
	}
	return addrs, nil
}

// buildCartridgesRegistry reads RegistrySettings/Cartridges and builds a
// cartridges.Registry wired to a real lxgo-ws-backed Dialer.
// Every key is optional; an app with none configured gets an empty,
// harmless registry (no cartridges to track).
func buildCartridgesRegistry(app kernel.IApp) (*cartridges.Registry, error) {
	settings, err := readRegistrySettings(app.Config())
	if err != nil {
		return nil, err
	}

	addrs, err := readCartridges(app.Config())
	if err != nil {
		return nil, err
	}

	registry := cartridges.NewRegistry(cartridges.Dial, cartridges.Config{
		RequestTimeout: time.Duration(settings.RequestTimeoutMs) * time.Millisecond,
		RetryInterval:  time.Duration(settings.RetryIntervalMs) * time.Millisecond,
		MaxAttempts:    settings.MaxRetries,
		OnLogError:     func(msg string) { app.LogError(msg, "Cartridges") },
	}, addrs)
	return registry, nil
}

// AddNewCartridges diffs the current Cartridges config against
// already-tracked ones and starts tracking (and immediately attempting to
// connect to) any new ones - meant to run on kernel.EVENT_CONFIG_REFRESHED
// (the manage socket's "reconf" action).
func AddNewCartridges(app cnv.IApp) {
	addrs, err := readCartridges(app.Config())
	if err != nil {
		app.LogError(fmt.Sprintf("can not read Cartridges after config reload: %v", err), "Cartridges")
		return
	}

	registry := app.CartridgesRegistry()
	for _, addr := range addrs {
		if _, known := registry.Status(addr); !known {
			registry.AddCartridge(addr)
		}
	}
}
