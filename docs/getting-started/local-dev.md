# Local Development

Run Xafrun locally against your current `kubectl` context.

## Required tooling

| Tool | Minimum version | Install |
|------|----------------|---------|
| Go | 1.22 | [go.dev/dl](https://go.dev/dl/) |
| Node.js | 18 | [nodejs.org](https://nodejs.org/) |
| `kubectl` | any recent | [kubernetes.io](https://kubernetes.io/docs/tasks/tools/) |
| `make` | any | system package manager |

!!! note
    The backend reads your current `kubeconfig` context (or the in-cluster service account if deployed as a pod). Make sure `kubectl get gitrepositories -A` works before starting.

## Running the full stack

```bash
git clone https://github.com/omilun/Xafrun.git
cd Xafrun

# Install frontend dependencies (first time only)
cd frontend && npm install && cd ..

# Start backend (port 8080) and frontend (port 3000) concurrently
make run
```

`make run` runs `go run main.go` and `npm run dev` in parallel. The frontend dev server proxies `/api/*` requests to `localhost:8080`.

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Running services individually

```bash
# Backend only
make run-backend

# Frontend only
make run-frontend
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLUSTER_NAME` | `talos-tart-ha` | Name shown in the status ticker |
| `KUBECONFIG` | `~/.kube/config` | Path to kubeconfig (standard) |

## Hot reload

The frontend (`npm run dev`) supports Next.js fast refresh — changes to `.tsx` files apply without restarting. The backend does not auto-reload; restart `make run-backend` after Go changes.

## For more detail

See the [Development setup](../contributing/dev-setup.md) page in the Contributing section, which covers linting, testing, and the full contributor workflow.
