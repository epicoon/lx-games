------------------------------------------------------------------------------------------------------------------------
Date: 2026.10.06
Version: v0.1.0-alpha.3
Changes:
- add: `/game/assets/{nodeKey}/*{path}` reverse-proxy route - lets a joined cartridge's static assets (images/
  scripts/css) reach the browser through the lobby even when the cartridge hasn't configured an externally-reachable
  address of its own (the default path, distinct from a cartridge exposing itself directly via an absolute
  `AssetLinksPath.Outer`)
- add: `/game/get`'s plugin descriptor has every relative asset path (`assets.scripts`/`css`, `imagePaths` on any
  nested plugin, and any path baked directly into the rendered HTML by a widget like `lx.Image`'s `path` config)
  rewritten to route through the above - an already-absolute `http(s)://` path is left untouched
- fix: a shutdown could take several seconds longer than necessary once at least one cartridge had ever connected
  and later gone stale - `Registry`'s retry-scheduler loop only checked for a stop request between ticks and
  between the individual cartridges retried within one tick (so several due nodes queued at once still added
  up), and `StopRetryScheduler`'s own wait for the scheduler goroutine to exit had no bound at all, so even a
  single genuinely-unresponsive cartridge's in-flight retry (not one that promptly refuses the connection) still
  made `Final` wait it out in full. Both are now bounded - the loop bails out of the rest of its batch as soon as
  a stop is requested, and `StopRetryScheduler` gives up waiting after a short grace period regardless
- fix: a shutdown needed a second `Ctrl+C` to actually exit whenever at least one WS client (e.g. a browser tab
  open on the lobby) was still connected - caused by `ws.WSServer.Stop()` itself waiting for every connection's
  handler to return before closing any connection, which a live, idle client's handler never does on its own;
  resolved by the `ws` dependency bump below (see its own `CHANGE_LOG.md`)
- chore: bumped lxgo deps to jspp v0.1.0-alpha.39, kernel v0.1.0-alpha.32, ws v0.1.0-alpha.11

------------------------------------------------------------------------------------------------------------------------
Date: 2026.09.18
Version: v0.1.0-alpha.2
Changes:
- chore: bumped lxgo deps to cmd v0.1.0-alpha.10, jspp v0.1.0-alpha.38

------------------------------------------------------------------------------------------------------------------------
Date: 2026.09.02
Version: v0.1.0-alpha.1
Init
