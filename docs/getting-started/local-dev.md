# Local Development

Run Xafrun locally against your current `kubectl` context.

## Required tooling

| Tool | Minimum version | Install |
|------|----------------|---------|
| Go | 1.26 | [go.dev/dl](https://go.dev/dl/) |
| Node.js | 22 | [nodejs.org](https://nodejs.org/) |
| `kubectl` | any recent | [kubernetes.io](https://kubernetes.io/docs/tasks/tools/) |
| `make` | any | system package manager |

!!! note
    The backend reads your current `kubeconfig` context (or the in-cluster service account if
    deployed as a pod). Make sure `kubectl get gitrepositories -A` works before starting.

## Running the full stack

```bash
git clone https://github.com/omilun/Xafrun.git
cd Xafrun

# Install frontend dependencies (first time only)
cd frontend && npm install && cd ..

# Start backend (port 8080) and frontend (port 3000) concurrently
make run
```

Open [http://localhost:3000](http://localhost:3000).

## Running services individually

```bash
make run-backend    # Go backend on :8080
make run-frontend   # Next.js dev server on :3000
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLUSTER_NAME` | `kubernetes` | Cluster name shown in the status ticker |
| `KUBECONFIG` | `~/.kube/config` | Path to kubeconfig |
| `BACKEND_URL` | _(auto-detected)_ | Override backend URL for the Next.js proxy |

## Hot reload

- **Frontend** — Next.js fast refresh applies `.tsx` changes instantly.
- **Backend** — does not auto-reload; restart `make run-backend` after Go changes.

## For more detail

See [Development Setup](../contributing/dev-setup.md) for linting, testing, and the full
contributor workflow.
