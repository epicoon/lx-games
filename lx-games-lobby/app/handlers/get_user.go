package handlers

import (
	"fmt"
	"net/http"

	authClient "github.com/epicoon/lxgo/auth_client"
	"github.com/epicoon/lxgo/kernel"
	lxHttp "github.com/epicoon/lxgo/kernel/http"
)

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * GetUserHandler
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/** @interface kernel.IHttpResource */
type GetUserHandler struct {
	*lxHttp.Resource
}

/** @constructor kernel.CHttpResource */
func NewGetUserHandler() kernel.IHttpResource {
	return &GetUserHandler{Resource: lxHttp.NewResource()}
}

func (handler *GetUserHandler) Run() kernel.IHttpResponse {
	accessToken, err := authClient.GetBearer(handler.Context())
	if err != nil {
		return handler.JsonResponse(kernel.JsonResponseConfig{
			Code: http.StatusUnauthorized,
			Data: err,
		})
	}

	client, err := authClient.AppComponent(handler.App())
	if err != nil {
		handler.LogError("wrong application configuration: auth_client component required", "App")
		return handler.ErrorResponse(http.StatusInternalServerError, "Something went wrong")
	}

	data, err := client.GetUserData(accessToken)
	if err != nil {
		handler.LogError(fmt.Sprintf("can not get user data: %s", err), "App")
		return handler.ErrorResponse(http.StatusInternalServerError, "Something went wrong")
	}

	return handler.JsonResponse(kernel.JsonResponseConfig{
		Data: map[string]any{
			"login": data.Login,
			"name":  data.Name,
			"data":  data.Data,
		},
	})
}
