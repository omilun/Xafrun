package main

import (
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	kustomizev1 "github.com/fluxcd/kustomize-controller/api/v1"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	"github.com/omilun/fluxbaan/pkg/api"
	"github.com/omilun/fluxbaan/pkg/k8s"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

var (
	scheme = runtime.NewScheme()
)

func init() {
	_ = clientgoscheme.AddToScheme(scheme)
	_ = sourcev1.AddToScheme(scheme)
	_ = kustomizev1.AddToScheme(scheme)
	_ = helmv2.AddToScheme(scheme)
}

func main() {
	// Initialize K8s Client
	k8sClient, err := k8s.NewClient()
	if err != nil {
		log.Fatalf("Error creating k8s client: %v", err)
	}

	// Create Controller-Runtime Client
	ctrlClient, err := client.New(k8sClient.Config, client.Options{Scheme: scheme})
	if err != nil {
		log.Fatalf("Error creating controller-runtime client: %v", err)
	}

	handler := &api.Handler{
		K8sClient: ctrlClient,
	}

	// Setup Web Server
	r := gin.Default()
	r.Use(cors.Default())

	r.GET("/api/tree", handler.GetTree)

	log.Println("Fluxbaan backend starting on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Error running server: %v", err)
	}
}
