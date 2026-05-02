package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	automationv1beta2 "github.com/fluxcd/image-automation-controller/api/v1beta2"
	imagev1beta2 "github.com/fluxcd/image-reflector-controller/api/v1beta2"
	kustomizev1 "github.com/fluxcd/kustomize-controller/api/v1"
	notifv1 "github.com/fluxcd/notification-controller/api/v1"
	notifv1beta3 "github.com/fluxcd/notification-controller/api/v1beta3"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/omilun/xafrun/pkg/api"
	"github.com/omilun/xafrun/pkg/k8s"
	"github.com/omilun/xafrun/pkg/watcher"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/discovery"
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
	_ = imagev1beta2.AddToScheme(scheme)
	_ = automationv1beta2.AddToScheme(scheme)
	_ = notifv1.AddToScheme(scheme)
	_ = notifv1beta3.AddToScheme(scheme)
}

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: parseLogLevel(),
	})))

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	k8sClient, err := k8s.NewClient()
	if err != nil {
		slog.Error("failed to build k8s config", "err", err)
		os.Exit(1)
	}

	ctrlCache, err := cache.New(k8sClient.Config, cache.Options{Scheme: scheme})
	if err != nil {
		slog.Error("failed to create controller cache", "err", err)
		os.Exit(1)
	}

	ctrlClient, err := client.New(k8sClient.Config, client.Options{Scheme: scheme})
	if err != nil {
		slog.Error("failed to create controller client", "err", err)
		os.Exit(1)
	}

	go func() {
		if err := ctrlCache.Start(ctx); err != nil {
			slog.Error("cache stopped", "err", err)
		}
	}()

	w := watcher.New(ctrlClient, ctrlCache, scheme)
	w.SetMetrics(api.PrometheusRecorder{})

	go func() {
		if err := w.Start(ctx); err != nil {
			slog.Error("watcher stopped", "err", err)
		}
	}()

	discoveryClient, err := discovery.NewDiscoveryClientForConfig(k8sClient.Config)
	if err != nil {
		slog.Error("failed to create discovery client", "err", err)
		os.Exit(1)
	}

	handler := &api.Handler{
		Watcher:   w,
		Client:    ctrlClient,
		Clientset: k8sClient.Clientset,
		Discovery: discoveryClient,
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(cors.Default())

	r.GET("/healthz", handler.GetHealthz)
	r.GET("/readyz", handler.GetReadyz)
	r.GET("/metrics", api.MetricsHandler())

	authenticated := r.Group("/")
	authenticated.Use(api.RequestLogger(), api.HTTPMetricsMiddleware())
	{
		authenticated.GET("/api/tree", handler.GetTree)
		authenticated.GET("/api/events", handler.StreamEvents)
		authenticated.GET("/api/info", handler.GetInfo)
		authenticated.GET("/api/openapi.json", handler.GetOpenAPI)
		authenticated.GET("/api/yaml/:kind/:namespace/:name", handler.GetYAML)
		authenticated.GET("/api/k8sevents/:kind/:namespace/:name", handler.GetK8sEvents)
		authenticated.GET("/api/logs/:namespace/:name", handler.StreamLogs)
		authenticated.POST("/api/reconcile/:kind/:namespace/:name", handler.Reconcile)
		authenticated.POST("/api/suspend/:kind/:namespace/:name", handler.Suspend)
		authenticated.POST("/api/resume/:kind/:namespace/:name", handler.Resume)
	}

	addr := fmt.Sprintf(":%s", backendPort())
	srv := &http.Server{Addr: addr, Handler: r}

	slog.Info("Xafrun backend starting", "addr", addr)

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()

	slog.Info("shutting down server")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server shutdown error", "err", err)
	}
}

func backendPort() string {
	if p := os.Getenv("BACKEND_PORT"); p != "" {
		return p
	}
	return "8080"
}

func parseLogLevel() slog.Level {
	switch os.Getenv("LOG_LEVEL") {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
