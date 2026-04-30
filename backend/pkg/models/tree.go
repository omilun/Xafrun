package models

type NodeType string

const (
	NodeSource         NodeType = "Source"
	NodeKustomization  NodeType = "Kustomization"
	NodeHelmRelease    NodeType = "HelmRelease"
	NodeK8sResource    NodeType = "K8sResource"
)

type HealthStatus string

const (
	HealthHealthy     HealthStatus = "Healthy"
	HealthUnhealthy   HealthStatus = "Unhealthy"
	HealthProgressing HealthStatus = "Progressing"
	HealthUnknown     HealthStatus = "Unknown"
)

type Node struct {
	ID        string       `json:"id"`
	Type      NodeType     `json:"type"`
	Name      string       `json:"name"`
	Namespace string       `json:"namespace"`
	Kind      string       `json:"kind"`
	Status    HealthStatus `json:"status"`
	Message   string       `json:"message"`
	Inventory []string     `json:"inventory,omitempty"`
}

type Edge struct {
	ID     string `json:"id"`
	Source string `json:"source"`
	Target string `json:"target"`
}

type Graph struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}
