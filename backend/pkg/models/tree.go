package models

type NodeType string

const (
	NodeSource          NodeType = "Source"
	NodeKustomization   NodeType = "Kustomization"
	NodeHelmRelease     NodeType = "HelmRelease"
	NodeImageAutomation NodeType = "ImageAutomation"
	NodeNotification    NodeType = "Notification"
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
	Message   string       `json:"message,omitempty"`
	// Flux-specific details
	SourceRef  string   `json:"sourceRef,omitempty"`  // e.g. "GitRepository/flux-system"
	Revision   string   `json:"revision,omitempty"`   // last applied revision / commit
	Inventory  []string `json:"inventory,omitempty"`  // managed object IDs
	ChartName  string   `json:"chartName,omitempty"`  // HelmRelease chart name
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

type ErrorResponse struct {
	Error     string `json:"error"`
	RequestID string `json:"request_id,omitempty"`
}
