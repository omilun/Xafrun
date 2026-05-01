package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	kustomizev1 "github.com/fluxcd/kustomize-controller/api/v1"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	"github.com/gin-gonic/gin"
	"github.com/omilun/xafrun/pkg/watcher"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	crfake "sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func buildHealthScheme(t *testing.T) *runtime.Scheme {
	t.Helper()
	s := runtime.NewScheme()
	_ = clientgoscheme.AddToScheme(s)
	_ = sourcev1.AddToScheme(s)
	_ = kustomizev1.AddToScheme(s)
	_ = helmv2.AddToScheme(s)
	return s
}

func TestGetHealthz_AlwaysOK(t *testing.T) {
	t.Parallel()
	s := buildHealthScheme(t)
	fc := crfake.NewClientBuilder().WithScheme(s).Build()
	w := watcher.New(fc, nil, s)
	h := &Handler{Watcher: w}

	r := gin.New()
	r.GET("/healthz", h.GetHealthz)

	rec := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/healthz", nil)
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["status"] != "ok" {
		t.Errorf("want status=ok, got %q", body["status"])
	}
}

func TestGetReadyz_NotReadyBeforeSync(t *testing.T) {
	t.Parallel()
	s := buildHealthScheme(t)
	fc := crfake.NewClientBuilder().WithScheme(s).Build()
	w := watcher.New(fc, nil, s)
	h := &Handler{Watcher: w}

	r := gin.New()
	r.GET("/readyz", h.GetReadyz)

	rec := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/readyz", nil)
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 before sync, got %d", rec.Code)
	}
}
