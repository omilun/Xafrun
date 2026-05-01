# Security Policy

## Supported Versions

Fluxbaan is in early development. Until v1.0.0, **only the latest minor
release receives security fixes**. Once v1.0 ships, the previous minor will
also receive critical patches for ~6 months.

| Version | Supported          |
|---------|--------------------|
| 0.x     | ✅ latest only     |

## Reporting a Vulnerability

**Please do not file public GitHub issues for security vulnerabilities.**

Instead, please use one of:

1. **GitHub private vulnerability reporting** — preferred.
   <https://github.com/omilun/Fluxbaan/security/advisories/new>
2. **Email** — `omilun@users.noreply.github.com` with subject
   `[SECURITY] Fluxbaan vulnerability report`.

Please include:

- A clear description of the issue and its impact.
- Steps to reproduce, ideally with a minimal proof of concept.
- Versions affected (Fluxbaan, Kubernetes, Flux).
- Whether the issue has been disclosed elsewhere.

### What to expect

| Stage             | Target                                    |
|-------------------|-------------------------------------------|
| Acknowledgement   | Within **3 business days**                |
| Triage & severity | Within **7 business days**                |
| Fix or mitigation | As soon as practical, depending on severity |
| Public disclosure | Coordinated; usually after a patched release |

We follow a responsible disclosure model and will credit you in the security
advisory unless you prefer to remain anonymous.

## Scope

In scope:

- The Fluxbaan backend (`backend/`)
- The Fluxbaan frontend (`frontend/`)
- The published container images on `ghcr.io/omilun/fluxbaan-*`
- The Helm chart at `charts/fluxbaan/`

Out of scope:

- Vulnerabilities in upstream dependencies — please report those upstream.
- Issues in user clusters caused by misconfiguration.
- Reports requiring physical access to the user's machine.

## Hardening defaults

Fluxbaan ships with security-conscious defaults:

- Read-only root filesystem
- `runAsNonRoot: true`, drop all capabilities, `seccompProfile: RuntimeDefault`
- Read-only Kubernetes RBAC (`get`, `list`, `watch` only)
- Container images signed with [cosign](https://github.com/sigstore/cosign)
  (keyless OIDC) and shipped with SPDX SBOMs

If you find a default that compromises security, that itself is a valid report.
