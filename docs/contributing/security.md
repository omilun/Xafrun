# Security Policy

## Reporting a vulnerability

**Please do not open public GitHub issues for security vulnerabilities.**

If you discover a security issue in Fluxbaan, please report it responsibly:

1. Go to the [Security tab](https://github.com/omilun/Fluxbaan/security) on GitHub.
2. Click **"Report a vulnerability"** to open a private advisory.
3. Describe the issue, steps to reproduce, and potential impact.

The maintainers will acknowledge your report within 72 hours and work with you on a fix and disclosure timeline.

## Supported versions

| Version | Supported |
|---------|-----------|
| latest (`master`) | ✅ |
| older releases | ❌ (please upgrade) |

## Scope

Fluxbaan is a **read-only** dashboard. It never writes to the Kubernetes API. However, it does require a ClusterRole with broad `get/list/watch` permissions, so:

- Exposure of the dashboard to untrusted users could leak cluster topology and resource status.
- If you deploy Fluxbaan in a shared environment, restrict access with an authentication proxy (ingress auth, OAuth2-proxy, etc.).

!!! warning "No built-in authentication"
    Fluxbaan does not currently include authentication or authorisation. Do not expose it publicly without an auth layer in front of it. See the [Roadmap](../roadmap.md) for planned auth support.
