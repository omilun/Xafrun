package watcher

import (
	"context"
	"testing"
	"time"

	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	kustomizev1 "github.com/fluxcd/kustomize-controller/api/v1"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"
	crfake "sigs.k8s.io/controller-runtime/pkg/client/fake"
)

// ── helpers ──────────────────────────────────────────────────────────────────

func buildTestScheme(t *testing.T) *runtime.Scheme {
	t.Helper()
	s := runtime.NewScheme()
	_ = clientgoscheme.AddToScheme(s)
	_ = sourcev1.AddToScheme(s)
	_ = kustomizev1.AddToScheme(s)
	_ = helmv2.AddToScheme(s)
	return s
}

// setupWatcher builds a Watcher backed by a fake client seeded with objs.
// The cache is nil; tests must call w.rebuild(ctx) directly (same package).
func setupWatcher(t *testing.T, objs ...client.Object) (*Watcher, context.Context, context.CancelFunc) {
	t.Helper()
	s := buildTestScheme(t)
	fc := crfake.NewClientBuilder().WithScheme(s).WithObjects(objs...).Build()
	ctx, cancel := context.WithCancel(context.Background())
	return New(fc, nil, s), ctx, cancel
}

func makeGitRepo(name, namespace, uid string) *sourcev1.GitRepository {
	return &sourcev1.GitRepository{
		ObjectMeta: metav1.ObjectMeta{
			Name: name, Namespace: namespace, UID: types.UID(uid),
		},
	}
}

func makeGitRepoWithCondition(name, namespace, uid string, cond metav1.Condition) *sourcev1.GitRepository {
	r := makeGitRepo(name, namespace, uid)
	r.Status.Conditions = []metav1.Condition{cond}
	return r
}

func makeKustomization(name, namespace, uid, srcKind, srcName, srcNS string) *kustomizev1.Kustomization {
	return &kustomizev1.Kustomization{
		ObjectMeta: metav1.ObjectMeta{
			Name: name, Namespace: namespace, UID: types.UID(uid),
		},
		Spec: kustomizev1.KustomizationSpec{
			SourceRef: kustomizev1.CrossNamespaceSourceReference{
				Kind:      srcKind,
				Name:      srcName,
				Namespace: srcNS,
			},
		},
	}
}

func makeKustomizationWithCondition(name, namespace, uid string, cond metav1.Condition) *kustomizev1.Kustomization {
	ks := makeKustomization(name, namespace, uid, "GitRepository", "repo", namespace)
	ks.Status.Conditions = []metav1.Condition{cond}
	return ks
}

func makeHelmRelease(name, namespace, uid string) *helmv2.HelmRelease {
	return &helmv2.HelmRelease{
		ObjectMeta: metav1.ObjectMeta{
			Name: name, Namespace: namespace, UID: types.UID(uid),
		},
		Spec: helmv2.HelmReleaseSpec{
			Chart: &helmv2.HelmChartTemplate{
				Spec: helmv2.HelmChartTemplateSpec{
					Chart: "my-chart",
					SourceRef: helmv2.CrossNamespaceObjectReference{
						Kind: "HelmRepository",
						Name: "my-repo",
					},
				},
			},
		},
	}
}

// ── tests ────────────────────────────────────────────────────────────────────

func TestNew_InitializesEmptyGraph(t *testing.T) {
	t.Parallel()
	w, _, cancel := setupWatcher(t)
	defer cancel()

	g := w.Graph()
	if len(g.Nodes) != 0 {
		t.Errorf("expected 0 nodes, got %d", len(g.Nodes))
	}
	if len(g.Edges) != 0 {
		t.Errorf("expected 0 edges, got %d", len(g.Edges))
	}
}

func TestRebuild_SourceKustomizationHelmRelease(t *testing.T) {
	t.Parallel()

	gitRepo := makeGitRepo("my-repo", "default", "repo-uid-1")
	ks := makeKustomization("my-ks", "default", "ks-uid-1", "GitRepository", "my-repo", "")
	hr := makeHelmRelease("my-hr", "default", "hr-uid-1")

	w, ctx, cancel := setupWatcher(t, gitRepo, ks, hr)
	defer cancel()
	w.rebuild(ctx)

	g := w.Graph()
	if len(g.Nodes) != 3 {
		t.Fatalf("expected 3 nodes, got %d", len(g.Nodes))
	}

	kindSet := make(map[string]bool)
	for _, n := range g.Nodes {
		kindSet[n.Kind] = true
	}
	for _, kind := range []string{"GitRepository", "Kustomization", "HelmRelease"} {
		if !kindSet[kind] {
			t.Errorf("missing node kind %q", kind)
		}
	}

	// Verify namespace/name for each node.
	for _, n := range g.Nodes {
		if n.Namespace != "default" {
			t.Errorf("node %q has wrong namespace %q", n.Kind, n.Namespace)
		}
	}

	// Verify edge: GitRepository → Kustomization.
	if len(g.Edges) != 1 {
		t.Fatalf("expected 1 edge, got %d", len(g.Edges))
	}
	if g.Edges[0].Source != "repo-uid-1" {
		t.Errorf("edge source = %q, want repo-uid-1", g.Edges[0].Source)
	}
	if g.Edges[0].Target != "ks-uid-1" {
		t.Errorf("edge target = %q, want ks-uid-1", g.Edges[0].Target)
	}
}

func TestRebuild_StatusMapping(t *testing.T) {
	t.Parallel()

	ready := metav1.Condition{Type: "Ready", Status: metav1.ConditionTrue, Reason: "ReconcileSucceeded"}
	progressing := metav1.Condition{Type: "Ready", Status: metav1.ConditionFalse, Reason: "Progressing"}
	failed := metav1.Condition{Type: "Ready", Status: metav1.ConditionFalse, Reason: "Failed"}

	objs := []client.Object{
		makeKustomizationWithCondition("ks-healthy", "default", "uid-healthy", ready),
		makeKustomizationWithCondition("ks-progressing", "default", "uid-progressing", progressing),
		makeKustomizationWithCondition("ks-failed", "default", "uid-failed", failed),
		makeKustomization("ks-unknown", "default", "uid-unknown", "GitRepository", "repo", "default"),
	}

	w, ctx, cancel := setupWatcher(t, objs...)
	defer cancel()
	w.rebuild(ctx)

	g := w.Graph()
	statusByName := make(map[string]string)
	for _, n := range g.Nodes {
		statusByName[n.Name] = string(n.Status)
	}

	cases := map[string]string{
		"ks-healthy":     "Healthy",
		"ks-progressing": "Progressing",
		"ks-failed":      "Unhealthy",
		"ks-unknown":     "Unknown",
	}
	for name, want := range cases {
		if got := statusByName[name]; got != want {
			t.Errorf("node %q: status = %q, want %q", name, got, want)
		}
	}
}

func TestRebuild_NilArtifactSafety(t *testing.T) {
	t.Parallel()

	// GitRepository with zero-value Status (Artifact pointer is nil).
	gitRepo := makeGitRepo("no-artifact-repo", "default", "repo-no-art")

	w, ctx, cancel := setupWatcher(t, gitRepo)
	defer cancel()

	// Must not panic.
	w.rebuild(ctx)

	g := w.Graph()
	if len(g.Nodes) != 1 {
		t.Errorf("expected 1 node, got %d", len(g.Nodes))
	}
	if g.Nodes[0].Revision != "" {
		t.Errorf("expected empty revision, got %q", g.Nodes[0].Revision)
	}
}

func TestSubscribeBroadcast_DeliversCurrent(t *testing.T) {
	t.Parallel()

	gitRepo := makeGitRepo("my-repo", "default", "repo-uid-del")
	w, ctx, cancel := setupWatcher(t, gitRepo)
	defer cancel()

	ch := w.Subscribe()
	defer w.Unsubscribe(ch)

	w.rebuild(ctx)

	select {
	case g := <-ch:
		if len(g.Nodes) != 1 {
			t.Errorf("expected 1 node, got %d", len(g.Nodes))
		}
	case <-time.After(time.Second):
		t.Fatal("channel did not receive graph within 1s")
	}
}

func TestBroadcast_SlowConsumerDoesntBlock(t *testing.T) {
	t.Parallel()

	gitRepo := makeGitRepo("my-repo", "default", "repo-uid-slow")
	w, ctx, cancel := setupWatcher(t, gitRepo)
	defer cancel()

	ch := w.Subscribe()
	defer w.Unsubscribe(ch)

	// Don't drain the channel. Both rebuilds must complete promptly.
	done := make(chan struct{})
	go func() {
		w.rebuild(ctx)
		w.rebuild(ctx)
		close(done)
	}()

	select {
	case <-done:
		// both rebuilds completed without blocking — good
	case <-time.After(2 * time.Second):
		t.Fatal("rebuild calls blocked (slow consumer caused deadlock)")
	}

	// Channel should have exactly 1 item (the latest graph, old one was dropped).
	select {
	case g := <-ch:
		if len(g.Nodes) == 0 {
			t.Error("expected non-empty graph from channel")
		}
	default:
		t.Error("expected latest graph in channel after two rebuilds")
	}

	// Channel should now be empty.
	select {
	case <-ch:
		t.Error("channel should be empty after reading the latest graph")
	default:
		// correct
	}
}

func TestUnsubscribe_ClosesChannel(t *testing.T) {
	t.Parallel()

	w, _, cancel := setupWatcher(t)
	defer cancel()

	ch := w.Subscribe()
	w.Unsubscribe(ch)

	_, ok := <-ch
	if ok {
		t.Error("expected channel to be closed after unsubscribe")
	}
}

func TestEdgeDerivation_RespectsNamespace(t *testing.T) {
	t.Parallel()

	// Two GitRepositories with the same name but different namespaces.
	repoApps := makeGitRepo("foo", "apps", "repo-uid-apps")
	repoInfra := makeGitRepo("foo", "infra", "repo-uid-infra")
	// Kustomization in "apps" referencing GitRepository "foo" with no explicit namespace.
	// The watcher defaults sourceRef.namespace to ks.Namespace when empty.
	ks := makeKustomization("my-ks", "apps", "ks-uid-apps", "GitRepository", "foo", "")

	w, ctx, cancel := setupWatcher(t, repoApps, repoInfra, ks)
	defer cancel()
	w.rebuild(ctx)

	g := w.Graph()

	if len(g.Edges) != 1 {
		t.Fatalf("expected 1 edge, got %d: %+v", len(g.Edges), g.Edges)
	}
	if g.Edges[0].Source != "repo-uid-apps" {
		t.Errorf("edge should connect to apps repo (uid=repo-uid-apps), got source=%q", g.Edges[0].Source)
	}
	if g.Edges[0].Target != "ks-uid-apps" {
		t.Errorf("edge target = %q, want ks-uid-apps", g.Edges[0].Target)
	}
}
