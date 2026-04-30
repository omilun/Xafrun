package watcher

import (
	"context"
	"fmt"
	"sync"

	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	kustomizev1 "github.com/fluxcd/kustomize-controller/api/v1"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	"github.com/omilun/fluxbaan/pkg/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	toolscache "k8s.io/client-go/tools/cache"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// Watcher keeps an in-memory graph of Flux resources and notifies subscribers
// whenever the Kubernetes API reports a change via controller-runtime informers.
type Watcher struct {
	ctrlClient  client.Client
	ctrlCache   cache.Cache
	scheme      *runtime.Scheme

	mu    sync.RWMutex
	graph models.Graph

	subMu       sync.Mutex
	subscribers map[chan models.Graph]struct{}
}

func New(c client.Client, cc cache.Cache, s *runtime.Scheme) *Watcher {
	return &Watcher{
		ctrlClient:  c,
		ctrlCache:   cc,
		scheme:      s,
		subscribers: make(map[chan models.Graph]struct{}),
		graph:       models.Graph{Nodes: []models.Node{}, Edges: []models.Edge{}},
	}
}

// Start registers informer event handlers and begins the cache sync.
// It blocks until ctx is cancelled.
func (w *Watcher) Start(ctx context.Context) error {
	handler := toolscache.ResourceEventHandlerFuncs{
		AddFunc:    func(_ interface{}) { w.rebuild(ctx) },
		UpdateFunc: func(_, _ interface{}) { w.rebuild(ctx) },
		DeleteFunc: func(_ interface{}) { w.rebuild(ctx) },
	}

	// Register handlers for all Flux resource types we care about.
	for _, obj := range []client.Object{
		&sourcev1.GitRepository{},
		&kustomizev1.Kustomization{},
		&helmv2.HelmRelease{},
	} {
		informer, err := w.ctrlCache.GetInformer(ctx, obj)
		if err != nil {
			return fmt.Errorf("getting informer for %T: %w", obj, err)
		}
		if _, err := informer.AddEventHandler(handler); err != nil {
			return fmt.Errorf("adding event handler for %T: %w", obj, err)
		}
	}

	// Wait for all caches to sync before serving.
	if !w.ctrlCache.WaitForCacheSync(ctx) {
		return fmt.Errorf("cache sync timed out")
	}

	// Build graph from initial state.
	w.rebuild(ctx)

	// Block until context is cancelled (the cache runs in its own goroutine).
	<-ctx.Done()
	return nil
}

// Graph returns the current snapshot (safe for concurrent reads).
func (w *Watcher) Graph() models.Graph {
	w.mu.RLock()
	defer w.mu.RUnlock()
	return w.graph
}

// Subscribe returns a channel that receives a new Graph on every change.
func (w *Watcher) Subscribe() chan models.Graph {
	ch := make(chan models.Graph, 1)
	w.subMu.Lock()
	w.subscribers[ch] = struct{}{}
	w.subMu.Unlock()
	return ch
}

// Unsubscribe removes a subscriber and closes its channel.
func (w *Watcher) Unsubscribe(ch chan models.Graph) {
	w.subMu.Lock()
	delete(w.subscribers, ch)
	w.subMu.Unlock()
	close(ch)
}

// ── Internal ─────────────────────────────────────────────────────────────────

func (w *Watcher) rebuild(ctx context.Context) {
	graph := models.Graph{
		Nodes: []models.Node{},
		Edges: []models.Edge{},
	}

	// GitRepositories
	var gitRepos sourcev1.GitRepositoryList
	if err := w.ctrlClient.List(ctx, &gitRepos); err == nil {
		for _, r := range gitRepos.Items {
			node := models.Node{
				ID:        string(r.UID),
				Type:      models.NodeSource,
				Name:      r.Name,
				Namespace: r.Namespace,
				Kind:      "GitRepository",
				Status:    healthFromConditions(r.Status.Conditions),
				Message:   messageFromConditions(r.Status.Conditions),
				Revision:  r.Status.Artifact.Revision,
			}
			if r.Spec.Reference != nil {
				node.SourceRef = fmt.Sprintf("branch/%s", r.Spec.Reference.Branch)
			}
			graph.Nodes = append(graph.Nodes, node)
		}
	}

	// Kustomizations
	var kustomizations kustomizev1.KustomizationList
	if err := w.ctrlClient.List(ctx, &kustomizations); err == nil {
		for _, ks := range kustomizations.Items {
			ksID := string(ks.UID)
			node := models.Node{
				ID:        ksID,
				Type:      models.NodeKustomization,
				Name:      ks.Name,
				Namespace: ks.Namespace,
				Kind:      "Kustomization",
				Status:    healthFromConditions(ks.Status.Conditions),
				Message:   messageFromConditions(ks.Status.Conditions),
				SourceRef: fmt.Sprintf("%s/%s", ks.Spec.SourceRef.Kind, ks.Spec.SourceRef.Name),
			}
			if ks.Status.LastAppliedRevision != "" {
				node.Revision = ks.Status.LastAppliedRevision
			}
			if ks.Status.Inventory != nil {
				for _, entry := range ks.Status.Inventory.Entries {
					node.Inventory = append(node.Inventory, entry.ID)
				}
			}
			graph.Nodes = append(graph.Nodes, node)

			// Edge: GitRepository → Kustomization
			if ks.Spec.SourceRef.Kind == "GitRepository" {
				for _, repo := range gitRepos.Items {
					ns := ks.Spec.SourceRef.Namespace
					if ns == "" {
						ns = ks.Namespace
					}
					if repo.Name == ks.Spec.SourceRef.Name && repo.Namespace == ns {
						graph.Edges = append(graph.Edges, models.Edge{
							ID:     fmt.Sprintf("e-%s-%s", repo.UID, ks.UID),
							Source: string(repo.UID),
							Target: ksID,
						})
					}
				}
			}
		}
	}

	// HelmReleases
	var helmReleases helmv2.HelmReleaseList
	if err := w.ctrlClient.List(ctx, &helmReleases); err == nil {
		for _, hr := range helmReleases.Items {
			hrID := string(hr.UID)
			node := models.Node{
				ID:        hrID,
				Type:      models.NodeHelmRelease,
				Name:      hr.Name,
				Namespace: hr.Namespace,
				Kind:      "HelmRelease",
				Status:    healthFromConditions(hr.Status.Conditions),
				Message:   messageFromConditions(hr.Status.Conditions),
				SourceRef: fmt.Sprintf("%s/%s", hr.Spec.Chart.Spec.SourceRef.Kind, hr.Spec.Chart.Spec.SourceRef.Name),
				Revision:  hr.Status.LastAttemptedRevision,
			}
			graph.Nodes = append(graph.Nodes, node)
		}
	}

	w.mu.Lock()
	w.graph = graph
	w.mu.Unlock()

	w.broadcast(graph)
}

func (w *Watcher) broadcast(g models.Graph) {
	w.subMu.Lock()
	defer w.subMu.Unlock()
	for ch := range w.subscribers {
		select {
		case ch <- g:
		default:
			// Slow consumer: drop old value and send new one.
			select {
			case <-ch:
			default:
			}
			ch <- g
		}
	}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func healthFromConditions(conditions []metav1.Condition) models.HealthStatus {
	for _, c := range conditions {
		if c.Type == "Ready" {
			if c.Status == metav1.ConditionTrue {
				return models.HealthHealthy
			}
			if c.Reason == "Progressing" || c.Reason == "Reconciling" {
				return models.HealthProgressing
			}
			return models.HealthUnhealthy
		}
	}
	return models.HealthUnknown
}

func messageFromConditions(conditions []metav1.Condition) string {
	for _, c := range conditions {
		if c.Type == "Ready" && c.Status != metav1.ConditionTrue {
			return c.Message
		}
	}
	return ""
}
