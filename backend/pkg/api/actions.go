package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	automationv1beta2 "github.com/fluxcd/image-automation-controller/api/v1beta2"
	imagev1beta2 "github.com/fluxcd/image-reflector-controller/api/v1beta2"
	kustomizev1 "github.com/fluxcd/kustomize-controller/api/v1"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	"github.com/gin-gonic/gin"
	"github.com/omilun/xafrun/pkg/models"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// kindToObject maps lowercase kind name → a zero-value client.Object for that kind.
func kindToObject(kind string) (client.Object, bool) {
	switch strings.ToLower(kind) {
	case "gitrepository":
		return &sourcev1.GitRepository{}, true
	case "ocirepository":
		return &sourcev1.OCIRepository{}, true
	case "bucket":
		return &sourcev1.Bucket{}, true
	case "helmrepository":
		return &sourcev1.HelmRepository{}, true
	case "helmchart":
		return &sourcev1.HelmChart{}, true
	case "kustomization":
		return &kustomizev1.Kustomization{}, true
	case "helmrelease":
		return &helmv2.HelmRelease{}, true
	case "imagerepository":
		return &imagev1beta2.ImageRepository{}, true
	case "imageupdateautomation":
		return &automationv1beta2.ImageUpdateAutomation{}, true
	default:
		return nil, false
	}
}

func requestID(c *gin.Context) string {
	return c.GetHeader("X-Request-ID")
}

func writeError(c *gin.Context, status int, msg string) {
	c.JSON(status, models.ErrorResponse{Error: msg, RequestID: requestID(c)})
}

// resolveObject fetches the named Flux resource into a typed client.Object.
func resolveObject(c *gin.Context, cl client.Client) (client.Object, bool) {
	kind := c.Param("kind")
	namespace := c.Param("namespace")
	name := c.Param("name")

	obj, ok := kindToObject(kind)
	if !ok {
		writeError(c, http.StatusBadRequest, fmt.Sprintf("unsupported kind: %s", kind))
		return nil, false
	}

	if err := cl.Get(c.Request.Context(), types.NamespacedName{Namespace: namespace, Name: name}, obj); err != nil {
		writeError(c, http.StatusNotFound, fmt.Sprintf("%s/%s not found in %s", kind, name, namespace))
		return nil, false
	}
	return obj, true
}

// Reconcile triggers a Flux reconciliation by setting the requestedAt annotation.
func (h *Handler) Reconcile(c *gin.Context) {
	obj, ok := resolveObject(c, h.Client)
	if !ok {
		return
	}

	patch := client.MergeFrom(obj.DeepCopyObject().(client.Object))

	annotations := obj.GetAnnotations()
	if annotations == nil {
		annotations = make(map[string]string)
	}
	annotations["reconcile.fluxcd.io/requestedAt"] = time.Now().Format(time.RFC3339Nano)
	obj.SetAnnotations(annotations)

	if err := h.Client.Patch(c.Request.Context(), obj, patch); err != nil {
		writeError(c, http.StatusInternalServerError, err.Error())
		return
	}
	c.Status(http.StatusNoContent)
}

// Suspend pauses reconciliation for a Flux resource.
func (h *Handler) Suspend(c *gin.Context) {
	patchSuspend(c, h.Client, true)
}

// Resume re-enables reconciliation for a previously suspended Flux resource.
func (h *Handler) Resume(c *gin.Context) {
	patchSuspend(c, h.Client, false)
}

func patchSuspend(c *gin.Context, cl client.Client, suspend bool) {
	obj, ok := resolveObject(c, cl)
	if !ok {
		return
	}

	patch := client.MergeFrom(obj.DeepCopyObject().(client.Object))

	switch o := obj.(type) {
	case *kustomizev1.Kustomization:
		o.Spec.Suspend = suspend
	case *helmv2.HelmRelease:
		o.Spec.Suspend = suspend
	case *sourcev1.GitRepository:
		o.Spec.Suspend = suspend
	case *sourcev1.OCIRepository:
		o.Spec.Suspend = suspend
	case *sourcev1.Bucket:
		o.Spec.Suspend = suspend
	case *sourcev1.HelmRepository:
		o.Spec.Suspend = suspend
	case *sourcev1.HelmChart:
		o.Spec.Suspend = suspend
	case *imagev1beta2.ImageRepository:
		o.Spec.Suspend = suspend
	case *automationv1beta2.ImageUpdateAutomation:
		o.Spec.Suspend = suspend
	default:
		writeError(c, http.StatusBadRequest, "kind does not support suspension")
		return
	}

	if err := cl.Patch(c.Request.Context(), obj, patch); err != nil {
		writeError(c, http.StatusInternalServerError, err.Error())
		return
	}
	c.Status(http.StatusNoContent)
}
