// Package watcher maintains an in-memory graph of Flux resources and notifies
// subscribers whenever the Kubernetes API reports a change.
package watcher

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	automationv1beta2 "github.com/fluxcd/image-automation-controller/api/v1beta2"
	imagev1beta2 "github.com/fluxcd/image-reflector-controller/api/v1beta2"
	kustomizev1 "github.com/fluxcd/kustomize-controller/api/v1"
	notifv1 "github.com/fluxcd/notification-controller/api/v1"
	notifv1beta3 "github.com/fluxcd/notification-controller/api/v1beta3"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	"github.com/omilun/xafrun/pkg/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	toolscache "k8s.io/client-go/tools/cache"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// Watcher keeps an in-memory graph of Flux resources and notifies subscribers
// whenever the Kubernetes API reports a change via controller-runtime informers.
type Watcher struct {
	ctrlClient client.Client
	ctrlCache  cache.Cache
	scheme     *runtime.Scheme
	metrics    MetricsRecorder

	ready atomic.Bool

	mu    sync.RWMutex
	graph models.Graph

	subMu       sync.Mutex
	subscribers map[chan models.Graph]struct{}
}

// New creates a Watcher.
func New(c client.Client, cc cache.Cache, s *runtime.Scheme) *Watcher {
	return &Watcher{
		ctrlClient:  c,
		ctrlCache:   cc,
		scheme:      s,
		subscribers: make(map[chan models.Graph]struct{}),
		graph:       models.Graph{Nodes: []models.Node{}, Edges: []models.Edge{}},
	}
}

// SetMetrics injects a MetricsRecorder. Must be called before Start.
func (w *Watcher) SetMetrics(mr MetricsRecorder) { w.metrics = mr }

// Ready returns true once WaitForCacheSync has completed successfully.
func (w *Watcher) Ready() bool { return w.ready.Load() }

// Start registers informer event handlers and begins the cache sync.
// It blocks until ctx is cancelled.
func (w *Watcher) Start(ctx context.Context) error {
	handler := toolscache.ResourceEventHandlerFuncs{
		AddFunc:    func(_ interface{}) { w.rebuild(ctx) },
		UpdateFunc: func(_, _ interface{}) { w.rebuild(ctx) },
		DeleteFunc: func(_ interface{}) { w.rebuild(ctx) },
	}

	watchTypes := []client.Object{
		&sourcev1.GitRepository{},
		&sourcev1.OCIRepository{},
		&sourcev1.Bucket{},
		&sourcev1.HelmRepository{},
		&sourcev1.HelmChart{},
		&kustomizev1.Kustomization{},
		&helmv2.HelmRelease{},
		&imagev1beta2.ImageRepository{},
		&imagev1beta2.ImagePolicy{},
		&automationv1beta2.ImageUpdateAutomation{},
		&notifv1.Receiver{},
		&notifv1beta3.Alert{},
		&notifv1beta3.Provider{},
	}

	for _, obj := range watchTypes {
		informer, err := w.ctrlCache.GetInformer(ctx, obj)
		if err != nil {
			slog.Warn("skipping watcher for resource type", "type", fmt.Sprintf("%T", obj), "err", err.Error())
			continue
		}
		if _, err := informer.AddEventHandler(handler); err != nil {
			return fmt.Errorf("adding event handler for %T: %w", obj, err)
		}
	}

	if !w.ctrlCache.WaitForCacheSync(ctx) {
		return fmt.Errorf("cache sync timed out")
	}
	w.ready.Store(true)
	slog.Info("watcher cache synced", "component", "watcher")

	w.rebuild(ctx)

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
	if w.metrics != nil {
		w.metrics.IncSSESubscribers()
	}
	return ch
}

// Unsubscribe removes a subscriber and closes its channel.
func (w *Watcher) Unsubscribe(ch chan models.Graph) {
	w.subMu.Lock()
	delete(w.subscribers, ch)
	w.subMu.Unlock()
	close(ch)
	if w.metrics != nil {
		w.metrics.DecSSESubscribers()
	}
}

// Rebuild triggers a synchronous graph rebuild. Primarily useful for testing.
func (w *Watcher) Rebuild(ctx context.Context) {
	w.rebuild(ctx)
}

// ── Internal ─────────────────────────────────────────────────────────────────

type sourceKey struct{ kind, namespace, name string }

// sourceRef is a lightweight replacement for sourcev1.CrossNamespaceSourceReference
// which was removed in source-controller API v1.8+.
type sourceRef struct {
	Kind      string
	Name      string
	Namespace string
}

func (w *Watcher) rebuild(ctx context.Context) {
	start := time.Now()

	graph := models.Graph{
		Nodes: []models.Node{},
		Edges: []models.Edge{},
	}

	sourceByRef := map[sourceKey]string{}

	addSourceNode := func(uid, name, ns, kind string, conditions []metav1.Condition, revision string, suspended bool, srcRef *sourceRef) {
		graph.Nodes = append(graph.Nodes, models.Node{
			ID:        uid,
			Type:      models.NodeSource,
			Name:      name,
			Namespace: ns,
			Kind:      kind,
			Status:    healthFromConditions(conditions),
			Sync:      syncFromConditions(conditions),
			Suspended: suspended,
			Message:   messageFromConditions(conditions),
			Revision:  revision,
		})
		sourceByRef[sourceKey{kind: kind, namespace: ns, name: name}] = uid

		// If this source has a parent source (e.g. HelmChart -> HelmRepository)
		if srcRef != nil {
			srcNS := srcRef.Namespace
			if srcNS == "" {
				srcNS = ns
			}
			parentKey := sourceKey{kind: srcRef.Kind, namespace: srcNS, name: srcRef.Name}
			if parentUID, ok := sourceByRef[parentKey]; ok {
				graph.Edges = append(graph.Edges, models.Edge{
					ID:     fmt.Sprintf("e-%s-%s", parentUID, uid),
					Source: parentUID,
					Target: uid,
				})
			}
		}
	}

	// GitRepositories
	var gitRepos sourcev1.GitRepositoryList
	if err := w.ctrlClient.List(ctx, &gitRepos); err == nil {
		for _, r := range gitRepos.Items {
			rev := ""
			if r.Status.Artifact != nil {
				rev = r.Status.Artifact.Revision
			}
			addSourceNode(string(r.UID), r.Name, r.Namespace, "GitRepository", r.Status.Conditions, rev, r.Spec.Suspend, nil)
		}
	} else {
		slog.Debug("could not list GitRepositories", "err", err.Error())
	}

	// OCIRepositories
	var ociRepos sourcev1.OCIRepositoryList
	if err := w.ctrlClient.List(ctx, &ociRepos); err == nil {
		for _, r := range ociRepos.Items {
			rev := ""
			if r.Status.Artifact != nil {
				rev = r.Status.Artifact.Revision
			}
			addSourceNode(string(r.UID), r.Name, r.Namespace, "OCIRepository", r.Status.Conditions, rev, r.Spec.Suspend, nil)
		}
	} else {
		slog.Debug("could not list OCIRepositories", "err", err.Error())
	}

	// Buckets
	var buckets sourcev1.BucketList
	if err := w.ctrlClient.List(ctx, &buckets); err == nil {
		for _, r := range buckets.Items {
			rev := ""
			if r.Status.Artifact != nil {
				rev = r.Status.Artifact.Revision
			}
			addSourceNode(string(r.UID), r.Name, r.Namespace, "Bucket", r.Status.Conditions, rev, r.Spec.Suspend, nil)
		}
	} else {
		slog.Debug("could not list Buckets", "err", err.Error())
	}

	// HelmRepositories
	var helmRepos sourcev1.HelmRepositoryList
	if err := w.ctrlClient.List(ctx, &helmRepos); err == nil {
		for _, r := range helmRepos.Items {
			rev := ""
			if r.Status.Artifact != nil {
				rev = r.Status.Artifact.Revision
			}
			addSourceNode(string(r.UID), r.Name, r.Namespace, "HelmRepository", r.Status.Conditions, rev, r.Spec.Suspend, nil)
		}
	} else {
		slog.Debug("could not list HelmRepositories", "err", err.Error())
	}

	// HelmCharts
	var helmCharts sourcev1.HelmChartList
	if err := w.ctrlClient.List(ctx, &helmCharts); err == nil {
		for _, r := range helmCharts.Items {
			rev := ""
			if r.Status.Artifact != nil {
				rev = r.Status.Artifact.Revision
			}
			
			// Convert LocalHelmChartSourceReference to sourceRef
			srcRef := &sourceRef{
				Kind:      r.Spec.SourceRef.Kind,
				Name:      r.Spec.SourceRef.Name,
				Namespace: r.Namespace,
			}
			
			addSourceNode(string(r.UID), r.Name, r.Namespace, "HelmChart", r.Status.Conditions, rev, r.Spec.Suspend, srcRef)
		}
	} else {
		slog.Debug("could not list HelmCharts", "err", err.Error())
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
				Sync:      syncFromConditions(ks.Status.Conditions),
				Suspended: ks.Spec.Suspend,
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

			srcNS := ks.Spec.SourceRef.Namespace
			if srcNS == "" {
				srcNS = ks.Namespace
			}
			key := sourceKey{kind: ks.Spec.SourceRef.Kind, namespace: srcNS, name: ks.Spec.SourceRef.Name}
			if srcUID, ok := sourceByRef[key]; ok {
				graph.Edges = append(graph.Edges, models.Edge{
					ID:     fmt.Sprintf("e-%s-%s", srcUID, ksID),
					Source: srcUID,
					Target: ksID,
				})
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
				Sync:      syncFromConditions(hr.Status.Conditions),
				Suspended: hr.Spec.Suspend,
				Message:   messageFromConditions(hr.Status.Conditions),
				Revision:  hr.Status.LastAttemptedRevision,
			}
			if hr.Spec.Chart != nil {
				node.SourceRef = fmt.Sprintf("%s/%s", hr.Spec.Chart.Spec.SourceRef.Kind, hr.Spec.Chart.Spec.SourceRef.Name)
				node.ChartName = hr.Spec.Chart.Spec.Chart
			}
			
			// Link to HelmChart or direct source
			var srcKind, srcName, srcNS string
			if hr.Spec.Chart != nil {
				srcKind = hr.Spec.Chart.Spec.SourceRef.Kind
				srcName = hr.Spec.Chart.Spec.SourceRef.Name
				srcNS   = hr.Spec.Chart.Spec.SourceRef.Namespace
			} else if hr.Spec.ChartRef != nil {
				srcKind = hr.Spec.ChartRef.Kind
				srcName = hr.Spec.ChartRef.Name
				srcNS   = hr.Spec.ChartRef.Namespace
			}
			
			if srcNS == "" {
				srcNS = hr.Namespace
			}

			if hr.Spec.Chart != nil {
				chartName := fmt.Sprintf("%s-%s", hr.Namespace, hr.Name)
				chartKey := sourceKey{kind: "HelmChart", namespace: hr.Namespace, name: chartName}
				if chartUID, ok := sourceByRef[chartKey]; ok {
					graph.Edges = append(graph.Edges, models.Edge{
						ID:     fmt.Sprintf("e-%s-%s", chartUID, hrID),
						Source: chartUID,
						Target: hrID,
					})
				} else {
					key := sourceKey{kind: srcKind, namespace: srcNS, name: srcName}
					if srcUID, ok := sourceByRef[key]; ok {
						graph.Edges = append(graph.Edges, models.Edge{
							ID:     fmt.Sprintf("e-%s-%s", srcUID, hrID),
							Source: srcUID,
							Target: hrID,
						})
					}
				}
			} else {
				key := sourceKey{kind: srcKind, namespace: srcNS, name: srcName}
				if srcUID, ok := sourceByRef[key]; ok {
					graph.Edges = append(graph.Edges, models.Edge{
						ID:     fmt.Sprintf("e-%s-%s", srcUID, hrID),
						Source: srcUID,
						Target: hrID,
					})
				}
			}

			// Populate inventory from HelmRelease status (same structure as Kustomization).
			if hr.Status.Inventory != nil {
				for _, entry := range hr.Status.Inventory.Entries {
					node.Inventory = append(node.Inventory, entry.ID)
				}
			}
			graph.Nodes = append(graph.Nodes, node)
		}
	}

	// ImageRepositories
	var imageRepos imagev1beta2.ImageRepositoryList
	if err := w.ctrlClient.List(ctx, &imageRepos); err == nil {
		for _, r := range imageRepos.Items {
			graph.Nodes = append(graph.Nodes, models.Node{
				ID:        string(r.UID),
				Type:      models.NodeImageAutomation,
				Name:      r.Name,
				Namespace: r.Namespace,
				Kind:      "ImageRepository",
				Status:    healthFromConditions(r.Status.Conditions),
				Suspended: r.Spec.Suspend,
				Message:   messageFromConditions(r.Status.Conditions),
			})
		}
	}

	// ImagePolicies
	var imagePolicies imagev1beta2.ImagePolicyList
	if err := w.ctrlClient.List(ctx, &imagePolicies); err == nil {
		for _, r := range imagePolicies.Items {
			graph.Nodes = append(graph.Nodes, models.Node{
				ID:        string(r.UID),
				Type:      models.NodeImageAutomation,
				Name:      r.Name,
				Namespace: r.Namespace,
				Kind:      "ImagePolicy",
				Status:    healthFromConditions(r.Status.Conditions),
				Message:   messageFromConditions(r.Status.Conditions),
			})
		}
	}

	// ImageUpdateAutomations
	var imageAutomations automationv1beta2.ImageUpdateAutomationList
	if err := w.ctrlClient.List(ctx, &imageAutomations); err == nil {
		for _, r := range imageAutomations.Items {
			graph.Nodes = append(graph.Nodes, models.Node{
				ID:        string(r.UID),
				Type:      models.NodeImageAutomation,
				Name:      r.Name,
				Namespace: r.Namespace,
				Kind:      "ImageUpdateAutomation",
				Status:    healthFromConditions(r.Status.Conditions),
				Suspended: r.Spec.Suspend,
				Message:   messageFromConditions(r.Status.Conditions),
				Revision:  r.Status.LastPushCommit,
			})
		}
	}

	// Receivers
	var receivers notifv1.ReceiverList
	if err := w.ctrlClient.List(ctx, &receivers); err == nil {
		for _, r := range receivers.Items {
			graph.Nodes = append(graph.Nodes, models.Node{
				ID:        string(r.UID),
				Type:      models.NodeNotification,
				Name:      r.Name,
				Namespace: r.Namespace,
				Kind:      "Receiver",
				Status:    healthFromConditions(r.Status.Conditions),
				Message:   messageFromConditions(r.Status.Conditions),
			})
		}
	} else {
		slog.Debug("could not list Receivers", "err", err.Error())
	}

	// Alerts
	var alerts notifv1beta3.AlertList
	if err := w.ctrlClient.List(ctx, &alerts); err == nil {
		for _, r := range alerts.Items {
			graph.Nodes = append(graph.Nodes, models.Node{
				ID:        string(r.UID),
				Type:      models.NodeNotification,
				Name:      r.Name,
				Namespace: r.Namespace,
				Kind:      "Alert",
				Status:    models.HealthUnknown,
			})
		}
	} else {
		slog.Debug("could not list Alerts", "err", err.Error())
	}

	// Providers
	var providers notifv1beta3.ProviderList
	if err := w.ctrlClient.List(ctx, &providers); err == nil {
		for _, r := range providers.Items {
			graph.Nodes = append(graph.Nodes, models.Node{
				ID:        string(r.UID),
				Type:      models.NodeNotification,
				Name:      r.Name,
				Namespace: r.Namespace,
				Kind:      "Provider",
				Status:    models.HealthUnknown,
			})
		}
	} else {
		slog.Debug("could not list Providers", "err", err.Error())
	}

	w.mu.Lock()
	w.graph = graph
	w.mu.Unlock()

	w.broadcast(graph)

	if w.metrics != nil {
		duration := time.Since(start).Seconds()
		nodeCounts := map[string]int{}
		unhealthyCounts := map[string]int{}
		for _, n := range graph.Nodes {
			nodeCounts[n.Kind]++
			if n.Status == models.HealthUnhealthy {
				unhealthyCounts[n.Kind]++
			}
		}
		w.metrics.IncRebuildsTotal()
		w.metrics.RecordRebuild(nodeCounts, unhealthyCounts, duration)
	}
}

func (w *Watcher) broadcast(g models.Graph) {
	w.subMu.Lock()
	defer w.subMu.Unlock()
	for ch := range w.subscribers {
		select {
		case ch <- g:
		default:
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

func syncFromConditions(conditions []metav1.Condition) models.SyncStatus {
	// For Flux, we'll consider it "Synced" if the Ready condition is True.
	// We'll consider it "OutOfSync" if there's a ReconciliationFailed reason
	// or if the Ready condition is False and not due to dependency issues.
	for _, c := range conditions {
		if c.Type == "Ready" {
			if c.Status == metav1.ConditionTrue {
				return models.SyncSynced
			}
			if c.Reason == "ReconciliationFailed" || c.Reason == "Stalled" {
				return models.SyncOutOfSync
			}
		}
	}
	// Also check for specific drift detection if enabled.
	for _, c := range conditions {
		if c.Type == "DriftDetected" && c.Status == metav1.ConditionTrue {
			return models.SyncOutOfSync
		}
	}
	return models.SyncUnknown
}

func messageFromConditions(conditions []metav1.Condition) string {
	for _, c := range conditions {
		if c.Type == "Ready" && c.Status != metav1.ConditionTrue {
			return c.Message
		}
	}
	return ""
}
