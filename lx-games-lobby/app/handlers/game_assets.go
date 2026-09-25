package handlers

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/epicoon/lx-games-lobby/cartridges"
	"github.com/epicoon/lxgo/kernel"
	lxHttp "github.com/epicoon/lxgo/kernel/http"
)

// GameAssetsPathPrefix is this relay's own path, minus the node key and the
// asset's own path - GameGetHandler rewrites a plugin descriptor's
// relative asset paths (assets.scripts/css, imagePaths) into
// GameAssetsPathPrefix+nodeKey+"/"+<original path> before handing the
// descriptor to the browser, whenever the cartridge hasn't configured its
// own absolute AssetLinksPath.Outer (see embedAssetURLs).
const GameAssetsPathPrefix = "/game/assets/"

// GameAssetsRoute is GameAssetsPathPrefix registered as a kernel.IRouter
// template route - see GameAssetsPathPrefix.
const GameAssetsRoute = GameAssetsPathPrefix + "{nodeKey}/*{path}"

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * GameAssetsHandler
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// GameAssetsHandler reverse-proxies a static asset request (image/script/
// css) to the one cartridge node named by the route's nodeKey, at the
// asset's own path (the route's trailing *{path}) - used only for a
// cartridge that hasn't configured an absolute AssetLinksPath.Outer of its
// own (see embedAssetURLs).
/** @interface kernel.IHttpResource */
type GameAssetsHandler struct {
	*lxHttp.Resource
	registry *cartridges.Registry
}

var _ kernel.IHttpResource = (*GameAssetsHandler)(nil)

/** @constructor kernel.CHttpResource */
func NewGameAssetsHandler(registry *cartridges.Registry) kernel.CHttpResource {
	return func() kernel.IHttpResource {
		return &GameAssetsHandler{
			Resource: lxHttp.NewResource(),
			registry: registry,
		}
	}
}

func (h *GameAssetsHandler) Run() kernel.IHttpResponse {
	nodeKey := h.PathSegments()["nodeKey"]
	path := h.PathSegments()["path"]

	node, ok := h.registry.Node(nodeKey)
	if !ok {
		return h.ErrorResponse(http.StatusGone, "cartridge node no longer available - pick a new one via /game/get")
	}

	target, err := url.Parse("http://" + node.Addr)
	if err != nil {
		return h.ErrorResponse(http.StatusInternalServerError, fmt.Sprintf("malformed node address: %v", err))
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.Director = func(req *http.Request) {
		req.URL.Scheme = target.Scheme
		req.URL.Host = target.Host
		req.URL.Path = "/" + path
		req.Host = target.Host
	}
	proxy.ServeHTTP(h.ResponseWriter(), h.Request())
	return nil
}
