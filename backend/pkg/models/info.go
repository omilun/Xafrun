package models

// ClusterInfo holds metadata about the cluster for the status ticker.
type ClusterInfo struct {
	ClusterName       string `json:"clusterName"`
	K8sVersion        string `json:"k8sVersion"`
	FluxVersion       string `json:"fluxVersion"`
	TalosVersion      string `json:"talosVersion"`
	CiliumVersion     string `json:"ciliumVersion"`
	IngressController string `json:"ingressController"`
}
