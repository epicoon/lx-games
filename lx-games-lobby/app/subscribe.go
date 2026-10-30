package app

import (
	"github.com/epicoon/lx-games-lobby/cnv"
	authClient "github.com/epicoon/lxgo/auth_client"
	"github.com/epicoon/lxgo/kernel"
)

// subscribeEvents wires the lobby's own page layout (runtime/templates/
// layout.html) to the Auth Client component's browser settings - the
// inline <script> that sets window._lxauth_settings for lxgo-auth's JS
// bundle to read.
func subscribeEvents(app cnv.IApp) error {
	client, err := authClient.AppComponent(app)
	if err != nil {
		return err
	}

	app.Events().Subscribe(kernel.EVENT_RENDERER_BEFORE_RENDER, func(e kernel.IEvent) {
		renderer := e.Payload().Get("renderer").(kernel.ITemplateRenderer)
		if renderer.Namespace() != "" {
			return
		}
		renderer.AddParam("Auth", client.PrepareClientSettings())
		renderer.AddParam("AuthServer", client.Config().Server)
	})

	return nil
}
