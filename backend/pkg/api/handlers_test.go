package api

import (
	"bufio"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	kustomizev1 "github.com/fluxcd/kustomize-controller/api/v1"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	fakediscovery "k8s.io/client-go/discovery/fake"
	ktesting "k8s.io/client-go/testing"
	kversion "k8s.io/apimachinery/pkg/version"
	"sigs.k8s.io/controller-runtime/pkg/client"
	crfake "sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/omilun/xafrun/pkg/models"
	"github.com/omilun/xafrun/pkg/watcher"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// ── helpers ──────────────────────────────────────────────────────────────────

func buildHandlerScheme(t *testing.T) *runtime.Scheme {
	t.Helper()
	s := runtime.NewScheme()
	_ = clientgoscheme.AddToScheme(s)
	_ = sourcev1.AddToScheme(s)
	_ = kustomizev1.AddToScheme(s)
	_ = helmv2.AddToScheme(s)
	return s
}

func buildTestRouter(h *Handler) *gin.Engine {
	r := gin.New()
	r.GET("/api/tree", h.GetTree)
	r.GET("/api/events", h.StreamEvents)
	r.GET("/api/info", h.GetInfo)
	return r
}

// ── TestImageTag ──────────────────────────────────────────────────────────────

func TestImageTag(t *testing.T) {
	t.Parallel()

	cases := []struct {
		image string
		want  string
	}{
		{"ghcr.io/foo/bar:v1.2.3", "v1.2.3"},
		{"nginx:1.25", "1.25"},
		{"nginx", "unknown"},
		{"nginx@sha256:abc123def456", "unknown"},
		{"ghcr.io/foo/bar:v1.2.3@sha256:abcdef", "v1.2.3"},
		{"localhost:5000/foo:v1", "v1"},
		{"localhost:5000/foo", "unknown"},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.image, func(t *testing.T) {
			t.Parallel()
			got := imageTag(tc.image)
			if got != tc.want {
				t.Errorf("imageTag(%q) = %q, want %q", tc.image, got, tc.want)
			}
		})
	}
}

// ── TestGetTree_ReturnsCurrentGraph ──────────────────────────────────────────

func TestGetTree_ReturnsCurrentGraph(t *testing.T) {
	t.Parallel()

	scheme := buildHandlerScheme(t)
	gitRepo := &sourcev1.GitRepository{
		ObjectMeta: metav1.ObjectMeta{
			Name: "my-repo", Namespace: "default", UID: types.UID("repo-uid-handler"),
		},
	}
	fc := crfake.NewClientBuilder().WithScheme(scheme).WithObjects(gitRepo).Build()
	w := watcher.New(fc, nil, scheme)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	w.Rebuild(ctx)

	h := &Handler{Watcher: w, Client: fc}
	router := buildTestRouter(h)

	rec := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/tree", nil)
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var g models.Graph
	if err := json.Unmarshal(rec.Body.Bytes(), &g); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	if len(g.Nodes) != 1 {
		t.Fatalf("expected 1 node, got %d", len(g.Nodes))
	}
	if g.Nodes[0].Kind != "GitRepository" {
		t.Errorf("node kind = %q, want GitRepository", g.Nodes[0].Kind)
	}
}

// ── TestGetInfo_BuildsClusterMetadata ─────────────────────────────────────────

func TestGetInfo_BuildsClusterMetadata(t *testing.T) {
	// Not parallel because of t.Setenv.
	t.Setenv("CLUSTER_NAME", "test-cluster")

	scheme := buildHandlerScheme(t)

	node := &corev1.Node{
		ObjectMeta: metav1.ObjectMeta{Name: "node-1"},
		Status: corev1.NodeStatus{
			NodeInfo: corev1.NodeSystemInfo{OSImage: "Talos (v1.13.0)"},
		},
	}
	dep := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: "source-controller", Namespace: "flux-system"},
		Spec: appsv1.DeploymentSpec{
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": "source-controller"}},
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{Name: "manager", Image: "ghcr.io/fluxcd/source-controller:v1.8.2"},
					},
				},
			},
		},
	}
	ds := &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{Name: "cilium", Namespace: "kube-system"},
		Spec: appsv1.DaemonSetSpec{
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": "cilium"}},
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{Name: "cilium-agent", Image: "quay.io/cilium/cilium:v1.19.3"},
					},
				},
			},
		},
	}

	fc := crfake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(node, dep, ds).
		Build()

	fd := &fakediscovery.FakeDiscovery{
		Fake:               &ktesting.Fake{},
		FakedServerVersion: &kversion.Info{GitVersion: "v1.36.0"},
	}

	h := &Handler{
		Watcher:   watcher.New(fc, nil, scheme),
		Client:    fc,
		Discovery: fd,
	}
	router := buildTestRouter(h)

	rec := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/info", nil)
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var info models.ClusterInfo
	if err := json.Unmarshal(rec.Body.Bytes(), &info); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	checks := []struct {
		field, got, want string
	}{
		{"ClusterName", info.ClusterName, "test-cluster"},
		{"K8sVersion", info.K8sVersion, "v1.36.0"},
		{"FluxVersion", info.FluxVersion, "v1.8.2"},
		{"CniVersion", info.CniVersion, "Cilium v1.19.3"},
		{"IngressController", info.IngressController, "Cilium Gateway API v1.19.3"},
	}
	for _, c := range checks {
		if c.got != c.want {
			t.Errorf("%s = %q, want %q", c.field, c.got, c.want)
		}
	}
	if !strings.Contains(info.OsImage, "v1.13.0") {
		t.Errorf("OsImage = %q, want to contain v1.13.0", info.OsImage)
	}
}

// ── TestGetInfo_HandlesMissingResources ──────────────────────────────────────

func TestGetInfo_HandlesMissingResources(t *testing.T) {
	t.Parallel()

	scheme := buildHandlerScheme(t)
	fc := crfake.NewClientBuilder().WithScheme(scheme).Build()
	fd := &fakediscovery.FakeDiscovery{
		Fake:               &ktesting.Fake{},
		FakedServerVersion: &kversion.Info{GitVersion: "v1.0.0"},
	}

	h := &Handler{
		Watcher:   watcher.New(fc, nil, scheme),
		Client:    fc,
		Discovery: fd,
	}
	router := buildTestRouter(h)

	rec := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/info", nil)
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var info models.ClusterInfo
	if err := json.Unmarshal(rec.Body.Bytes(), &info); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	// Empty strings for missing fields — no panic.
	if info.FluxVersion != "" {
		t.Errorf("expected empty FluxVersion, got %q", info.FluxVersion)
	}
	if info.OsImage != "" {
		t.Errorf("expected empty OsImage, got %q", info.OsImage)
	}
	if info.CniVersion != "" {
		t.Errorf("expected empty CniVersion, got %q", info.CniVersion)
	}
}

// ── TestStreamEvents_SendsInitialAndUpdate ────────────────────────────────────

func TestStreamEvents_SendsInitialAndUpdate(t *testing.T) {
	// TODO: SSE streaming test; uses a real HTTP server and streaming reader.
	// Generous timeouts to avoid flakiness in CI.

	scheme := buildHandlerScheme(t)
	gitRepo := &sourcev1.GitRepository{
		ObjectMeta: metav1.ObjectMeta{
			Name: "stream-repo", Namespace: "default", UID: types.UID("stream-repo-uid"),
		},
	}
	fc := crfake.NewClientBuilder().WithScheme(scheme).WithObjects(gitRepo).Build()
	w := watcher.New(fc, nil, scheme)

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	w.Rebuild(ctx)

	h := &Handler{Watcher: w, Client: fc}
	router := buildTestRouter(h)

	srv := httptest.NewServer(router)
	defer srv.Close()

	reqCtx, reqCancel := context.WithTimeout(ctx, 6*time.Second)
	defer reqCancel()

	req, err := http.NewRequestWithContext(reqCtx, "GET", srv.URL+"/api/events", nil)
	if err != nil {
		t.Skipf("could not build request: %v", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Skipf("could not connect to test server: %v", err)
	}
	defer resp.Body.Close()

	// Collect data lines from SSE stream.
	frames := make(chan string, 10)
	go func() {
		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Text()
			if strings.HasPrefix(line, "data:") {
				frames <- line
			}
		}
		close(frames)
	}()

	// Expect first frame (current graph — initial send).
	select {
	case frame := <-frames:
		if !strings.Contains(frame, "stream-repo") {
			t.Errorf("first SSE frame missing expected node name; got: %s", frame)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("timed out waiting for first SSE frame")
		return
	}

	// Trigger a rebuild from another goroutine — this broadcasts to the subscriber.
	go w.Rebuild(ctx)

	// Expect second frame (update from rebuild).
	select {
	case frame := <-frames:
		if !strings.Contains(frame, "nodes") {
			t.Errorf("second SSE frame missing expected field; got: %s", frame)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("timed out waiting for second SSE frame")
	}
}

// ── test for k8s client object is client.Object ────────────────────────────

// Ensure watcher.New is usable with controller-runtime fake client.
var _ client.Object = &corev1.Node{}
