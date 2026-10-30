// Command configtool flattens a YAML file (dev/defaults.yaml or
// dev/deploy_report) into shell-sourceable "export KEY=value" lines, so
// deploy.sh/clear.sh can read either one without a YAML parser of their
// own. A missing file (defaults.yaml is optional; deploy_report doesn't
// exist until a deploy has actually run) prints nothing and exits 0 -
// the caller's own `: "${VAR:=default}"` fallbacks take over from there.
//
// Nested keys flatten by joining with "_", uppercasing, and turning "-"
// into "_" too - "Paths.lxgo-auth" becomes PATHS_LXGO_AUTH,
// "Ports.LobbyApp" becomes PORTS_LOBBYAPP.
package main

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"
)

func main() {
	if len(os.Args) != 2 {
		fmt.Fprintln(os.Stderr, "usage: configtool <path-to-yaml-file>")
		os.Exit(2)
	}
	path := os.Args[1]

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return
		}
		fmt.Fprintf(os.Stderr, "configtool: can not read %q: %v\n", path, err)
		os.Exit(1)
	}

	var doc map[string]any
	if err := yaml.Unmarshal(data, &doc); err != nil {
		fmt.Fprintf(os.Stderr, "configtool: can not parse %q: %v\n", path, err)
		os.Exit(1)
	}

	flat := map[string]string{}
	flatten("", doc, flat)

	for _, key := range sortedKeys(flat) {
		fmt.Printf("export %s=%s\n", key, shellQuote(flat[key]))
	}
}

func flatten(prefix string, node any, out map[string]string) {
	switch v := node.(type) {
	case map[string]any:
		for key, val := range v {
			flatten(joinKey(prefix, key), val, out)
		}
	case nil:
		out[prefix] = ""
	case bool:
		out[prefix] = strconv.FormatBool(v)
	case int:
		out[prefix] = strconv.Itoa(v)
	default:
		out[prefix] = fmt.Sprintf("%v", v)
	}
}

func joinKey(prefix, key string) string {
	key = strings.ToUpper(strings.ReplaceAll(key, "-", "_"))
	if prefix == "" {
		return key
	}
	return prefix + "_" + key
}

func sortedKeys(m map[string]string) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	for i := 1; i < len(keys); i++ {
		for j := i; j > 0 && keys[j-1] > keys[j]; j-- {
			keys[j-1], keys[j] = keys[j], keys[j-1]
		}
	}
	return keys
}

func shellQuote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", `'\''`) + "'"
}
