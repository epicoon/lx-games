------------------------------------------------------------------------------------------------------------------------
Date: 2026.10.06
Version: v0.1.0-alpha.3
Changes:
- add: `Components.Cors` (`lxgo/cors`) - opt-in per-route CORS headers for this cartridge's own static asset routes,
  needed when a browser fetches them directly cross-origin (`AssetLinksPath.Outer` configured to this cartridge's
  own absolute address) rather than through the lobby's proxy. Entirely optional - absent from config, the component
  isn't registered at all and nothing changes for the lobby-proxied (same-origin) default path
- fix: the OOTV plugin's dice-face/status-icon images, used both as a plain CSS `background-image` (board-schema
  preview, no-cors fetch) and as a WebGL texture (`crossOrigin` set, cors fetch) for the same URL, silently failed
  to load as a texture once the no-cors fetch had already happened - a browser quirk (a cors-mode fetch of a URL
  already cached no-cors is refused, never reaching the server) worked around by giving the texture fetch its own
  distinct URL (a harmless query string), rather than sharing the plain image's cache entry
- fix: `World.getTexture`'s cache lookup checked the name before appending its default `.jpg` extension, but stored
  the texture under the post-extension key - any texture requested by a name with no extension (`charRed`,
  `olha`, etc.) never hit the cache and was refetched from the network on every use
- chore: bumped lxgo deps to cors v0.1.0-alpha.1 (new), jspp v0.1.0-alpha.39, kernel v0.1.0-alpha.32, ws v0.1.0-alpha.11

------------------------------------------------------------------------------------------------------------------------
Date: 2026.09.18
Version: v0.1.0-alpha.2
Changes:
- add: `ootv` (Outposts of the Void) game plugin - a full offline game loop for 2-4 players (3D board, in-game
  rules popup, score table), served directly at `/ootv` without going through the lobby
- chore: bumped lxgo deps to cmd v0.1.0-alpha.10, jspp v0.1.0-alpha.38

------------------------------------------------------------------------------------------------------------------------
Date: 2026.09.02
Version: v0.1.0-alpha.1
Init
