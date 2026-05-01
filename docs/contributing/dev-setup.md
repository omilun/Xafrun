# Development Setup

Follow these steps to set up a full local development environment.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Go | ≥ 1.22 | [go.dev/dl](https://go.dev/dl/) |
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org/) |
| `kubectl` | any recent | must have a valid context pointing at a cluster with Flux |
| `make` | any | ships with most Unix/macOS systems |
| `git` | any | — |

## Clone and install

```bash
git clone https://github.com/omilun/Fluxbaan.git
cd Fluxbaan

# Install frontend dependencies
cd frontend && npm install && cd ..
```

## Running locally

```bash
make run
```

This runs the Go backend on `:8080` and the Next.js dev server on `:3000` in parallel. The frontend proxies `/api/*` to the backend.

## Running services individually

```bash
# Backend
make run-backend

# Frontend
make run-frontend
```

## Backend tests

```bash
cd backend
go test ./...
```

## Frontend tests

```bash
cd frontend
npm test
```

## Linting

=== "Go"

    ```bash
    cd backend
    go vet ./...
    # optional: golangci-lint run
    ```

=== "TypeScript / ESLint"

    ```bash
    cd frontend
    npm run lint
    ```

## Building for production

=== "Backend"

    ```bash
    cd backend
    go build -o ../bin/fluxbaan-backend .
    ```

=== "Frontend"

    ```bash
    cd frontend
    npm run build
    ```

=== "Docker (multi-stage)"

    ```bash
    docker build -t fluxbaan:local .
    ```

## Useful commands

```bash
# Check which Flux resources your current context can see
kubectl get gitrepositories,kustomizations,helmreleases -A

# Watch the SSE stream directly
curl -N http://localhost:8080/api/events

# Check cluster metadata
curl http://localhost:8080/api/info | jq .
```
