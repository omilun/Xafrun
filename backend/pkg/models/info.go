package models

// ClusterInfo holds metadata about the cluster for the status ticker.
// All fields are best-effort — empty string when not discoverable.
type ClusterInfo struct {
	ClusterName       string `json:"clusterName"`
	K8sVersion        string `json:"k8sVersion"`
	FluxVersion       string `json:"fluxVersion"`
	OsImage           string `json:"osImage"`
	CniVersion        string `json:"cniVersion"`
	IngressController string `json:"ingressController"`
}
