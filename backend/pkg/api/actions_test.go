package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	kustomizev1 "github.com/fluxcd/kustomize-controller/api/v1"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	"github.com/gin-gonic/gin"
	"github.com/omilun/xafrun/pkg/watcher"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	crfake "sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func buildActionsScheme(t *testing.T) *runtime.Scheme {
	t.Helper()
	s := runtime.NewScheme()
	_ = clientgoscheme.AddToScheme(s)
	_ = sourcev1.AddToScheme(s)
	_ = kustomizev1.AddToScheme(s)
	_ = helmv2.AddToScheme(s)
	return s
}

func TestKindToObject(t *testing.T) {
	t.Parallel()
	supported := []string{"gitrepository", "ocirepository", "bucket", "helmrepository", "helmchart", "kustomization", "helmrelease", "imagerepository", "imageupdateautomation"}
	for _, k := range supported {
		obj, ok := kindToObject(k)
		if !ok {
			t.Errorf("kindToObject(%q) returned ok=false", k)
		}
		if obj == nil {
			t.Errorf("kindToObject(%q) returned nil object", k)
		}
	}
	if _, ok := kindToObject("unknown"); ok {
		t.Error("kindToObject(unknown) should return ok=false")
	}
}

func TestReconcile_404WhenNotFound(t *testing.T) {
	t.Parallel()
	s := buildActionsScheme(t)
	fc := crfake.NewClientBuilder().WithScheme(s).Build()
	w := watcher.New(fc, nil, s)
	h := &Handler{Watcher: w, Client: fc}

	r := gin.New()
	r.POST("/api/reconcile/:kind/:namespace/:name", h.Reconcile)

	rec := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/reconcile/gitrepository/default/missing", nil)
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestReconcile_204WhenFound(t *testing.T) {
	t.Parallel()
	s := buildActionsScheme(t)
	gitRepo := &sourcev1.GitRepository{
		ObjectMeta: metav1.ObjectMeta{
			Name: "my-repo", Namespace: "default", UID: types.UID("test-uid"),
		},
	}
	fc := crfake.NewClientBuilder().WithScheme(s).WithObjects(gitRepo).Build()
	w := watcher.New(fc, nil, s)
	h := &Handler{Watcher: w, Client: fc}

	r := gin.New()
	r.POST("/api/reconcile/:kind/:namespace/:name", h.Reconcile)

	rec := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/reconcile/gitrepository/default/my-repo", nil)
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", rec.Code, rec.Body.String())
	}
}
