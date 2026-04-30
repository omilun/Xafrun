package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	kustomizev1 "github.com/fluxcd/kustomize-controller/api/v1"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	"github.com/omilun/fluxbaan/pkg/api"
	"github.com/omilun/fluxbaan/pkg/k8s"
	"github.com/omilun/fluxbaan/pkg/watcher"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

var scheme = runtime.NewScheme()

func init() {
	_ = clientgoscheme.AddToScheme(scheme)
	_ = sourcev1.AddToScheme(scheme)
	_ = kustomizev1.AddToScheme(scheme)
	_ = helmv2.AddToScheme(scheme)
}

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	// Build k8s REST config (in-cluster or kubeconfig fallback).
	k8sClient, err := k8s.NewClient()
	if err != nil {
		log.Fatalf("failed to build k8s config: %v", err)
	}

	// Controller-runtime cache — this is what drives the informers.
	ctrlCache, err := cache.New(k8sClient.Config, cache.Options{Scheme: scheme})
	if err != nil {
		log.Fatalf("failed to create controller cache: %v", err)
	}

	// Controller-runtime client backed by the cache (reads are served from cache).
	ctrlClient, err := client.New(k8sClient.Config, client.Options{Scheme: scheme})
	if err != nil {
		log.Fatalf("failed to create controller client: %v", err)
	}

	// Start the cache in the background.
	go func() {
		if err := ctrlCache.Start(ctx); err != nil {
			log.Printf("cache stopped: %v", err)
		}
	}()

	// Watcher: registers informer handlers and rebuilds graph on every change.
	w := watcher.New(ctrlClient, ctrlCache, scheme)

	// Start the watcher in the background; it blocks until ctx is done.
	go func() {
		if err := w.Start(ctx); err != nil {
			log.Printf("watcher stopped: %v", err)
		}
	}()

	handler := &api.Handler{Watcher: w}

	r := gin.Default()
	r.Use(cors.Default())

	r.GET("/api/tree", handler.GetTree)
	r.GET("/api/events", handler.StreamEvents)

	log.Println("Fluxbaan backend starting on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
