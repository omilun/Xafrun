# High Availability

Xafrun is designed to run as a single-replica deployment by default — the
backend keeps an in-memory graph that is rebuilt from the Kubernetes informer
cache on every change, and SSE clients reconnect transparently if the backend
restarts.

For most clusters this is enough. If you do want to run multiple backend
replicas (for zero-downtime upgrades or extra resilience), here's what to
keep in mind.

## What works out of the box

- ✅ **Read-only API**: Every backend replica builds its own informer cache and
  serves identical data. There is no shared state, so additional replicas just
  work.
- ✅ **SSE behind a load balancer**: A client connection is sticky to whichever
  pod the LB routes it to. Each pod independently broadcasts updates from its
  own informer.
- ✅ **Frontend stateless**: The Next.js frontend is fully stateless and scales
  trivially.

## What to watch out for

- **Cold start latency**: Each new backend replica has to do a full informer
  list/watch on startup before its `/readyz` endpoint reports ready. On a busy
  cluster this can take 5–30 seconds. Do a rolling update with
  `maxSurge: 1, maxUnavailable: 0` to keep at least one replica serving.
- **Memory**: Each replica keeps its own copy of the cache (~tens of MB on a
  cluster with hundreds of Flux resources). Plan for `replicas × cache_size`.
- **Reconcile/suspend writes**: These endpoints write directly to the
  Kubernetes API. Multiple replicas can safely receive concurrent reconcile
  requests for the same resource — Kubernetes will serialise the patches.

## Recommended HA configuration

```yaml
backend:
  replicas: 2
  podDisruptionBudget:
    enabled: true
    minAvailable: 1
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            topologyKey: kubernetes.io/hostname
            labelSelector:
              matchLabels:
                app.kubernetes.io/component: backend
                app.kubernetes.io/name: xafrun
```

Set the same for the frontend if you put it behind an ingress with multiple
upstreams.

## Future: leader election

A future release will add **leader election** so that exactly one backend
replica writes Prometheus metrics and reconcile-button audits to a shared
backend (CNPG, see roadmap). The other replicas continue serving read traffic.
This is tracked as `track-c-ha` on the [roadmap](../roadmap.md).

## What this is NOT

- Xafrun does **not** provide HA for Flux itself. Flux comes with its own
  controller-replica story (`flux install --watch-all-namespaces` etc.).
- Xafrun does **not** persist any data today; each replica is a fresh view
  of the cluster.
