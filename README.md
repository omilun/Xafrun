# Fluxbaan ☸️

Fluxbaan is a lightweight, visual GitOps dashboard for Flux CD. It provides a real-time, interactive resource tree that maps the relationship between Flux sources and your cluster resources.

## Features
- **Visual Dependency Graph:** See how GitRepositories flow into Kustomizations and HelmReleases.
- **Real-time Health Status:** Visual indicators for Healthy, Progressing, and Unhealthy resources.
- **Inventory Mapping:** Inspect the physical objects managed by each Flux resource.
- **Lightweight:** Built with Go and Next.js, designed to run locally or as a small pod.

## Prerequisites
- A Kubernetes cluster with Flux CD v2 installed.
- Valid `kubeconfig` pointing to your cluster.
- Go 1.22+
- Node.js 18+

## Quick Start

1. **Clone the repo:**
   ```bash
   git clone git@github.com:omilun/Fluxbaan.git
   cd Fluxbaan
   ```

2. **Run the application:**
   ```bash
   make run
   ```

3. **Open the UI:**
   Navigate to [http://localhost:3000](http://localhost:3000).

## Architecture
- **Backend:** Golang service using `client-go` and `controller-runtime` to watch Flux CRDs.
- **Frontend:** Next.js application using `React Flow` for the interactive graph.

## License
MIT
