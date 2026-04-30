package api

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/omilun/fluxbaan/pkg/models"
	
	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	kustomizev1 "github.com/fluxcd/kustomize-controller/api/v1"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type Handler struct {
	K8sClient client.Client
}

func (h *Handler) GetTree(c *gin.Context) {
	ctx := context.Background()
	graph := models.Graph{
		Nodes: []models.Node{},
		Edges: []models.Edge{},
	}

	// 1. Fetch Sources (GitRepositories)
	var gitRepos sourcev1.GitRepositoryList
	if err := h.K8sClient.List(ctx, &gitRepos); err == nil {
		for _, repo := range gitRepos.Items {
			node := models.Node{
				ID:        string(repo.UID),
				Type:      models.NodeSource,
				Name:      repo.Name,
				Namespace: repo.Namespace,
				Kind:      "GitRepository",
				Status:    determineHealth(repo.Status.Conditions),
			}
			graph.Nodes = append(graph.Nodes, node)
		}
	}

	// 2. Fetch Kustomizations
	var kustomizations kustomizev1.KustomizationList
	if err := h.K8sClient.List(ctx, &kustomizations); err == nil {
		for _, ks := range kustomizations.Items {
			ksID := string(ks.UID)
			node := models.Node{
				ID:        ksID,
				Type:      models.NodeKustomization,
				Name:      ks.Name,
				Namespace: ks.Namespace,
				Kind:      "Kustomization",
				Status:    determineHealth(ks.Status.Conditions),
			}
			if ks.Status.Inventory != nil {
				for _, entry := range ks.Status.Inventory.Entries {
					node.Inventory = append(node.Inventory, entry.ID)
				}
			}
			graph.Nodes = append(graph.Nodes, node)

			// Edge from Source to Kustomization
			if ks.Spec.SourceRef.Kind == "GitRepository" {
				for _, repo := range gitRepos.Items {
					if repo.Name == ks.Spec.SourceRef.Name && repo.Namespace == ks.Namespace {
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

	// 3. Fetch HelmReleases
	var helmReleases helmv2.HelmReleaseList
	if err := h.K8sClient.List(ctx, &helmReleases); err == nil {
		for _, hr := range helmReleases.Items {
			hrID := string(hr.UID)
			node := models.Node{
				ID:        hrID,
				Type:      models.NodeHelmRelease,
				Name:      hr.Name,
				Namespace: hr.Namespace,
				Kind:      "HelmRelease",
				Status:    determineHealth(hr.Status.Conditions),
			}
			graph.Nodes = append(graph.Nodes, node)
		}
	}

	c.JSON(http.StatusOK, graph)
}

func determineHealth(conditions []metav1.Condition) models.HealthStatus {
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
